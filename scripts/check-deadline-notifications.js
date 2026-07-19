const assert = require("assert");
const {
  createDeadlineNotificationService,
  buildNotificationPlan,
  classifyDeadlineReminder,
  dayDifference,
  shiftDateKey,
  isFridayDateKey,
  nextDailyRunAt,
  hasGmailSendScope,
  buildAssigneeSubject,
  renderAssigneeDigest,
  renderManagerDigest,
  renderOperationalPreview,
  buildMimeMessage,
  encryptValue,
  decryptValue,
  signOAuthState,
  verifyOAuthState
} = require("../deadline-notifications");

const baseItem = {
  id: "task-1",
  taskId: "SQ2-T03-001",
  categoryId: "pilot-t03",
  title: "Hoàn thiện tài liệu",
  assignee: "Mai Tấn Thành",
  assigneeEmail: "thanhmt@bidv.com.vn",
  status: "Đang thực hiện",
  progress: 50
};

assert.strictEqual(dayDifference("2026-07-15", "2026-07-20"), 5);
assert.strictEqual(dayDifference("2026-07-20", "2026-07-17"), -3);
assert.strictEqual(shiftDateKey("2026-07-17", -6), "2026-07-11");
assert.strictEqual(isFridayDateKey("2026-07-17"), true);
assert.strictEqual(isFridayDateKey("2026-07-18"), false);
assert.strictEqual(hasGmailSendScope("openid email https://www.googleapis.com/auth/gmail.send"), true);
assert.strictEqual(hasGmailSendScope("openid email"), false);
assert.strictEqual(
  nextDailyRunAt(new Date("2026-07-18T00:30:00.000Z"), 1).toISOString(),
  "2026-07-18T01:00:00.000Z",
  "Trước giờ chạy phải lên lịch trong cùng ngày"
);
assert.strictEqual(
  nextDailyRunAt(new Date("2026-07-18T01:00:00.000Z"), 1).toISOString(),
  "2026-07-19T01:00:00.000Z",
  "Đúng hoặc sau giờ chạy phải lên lịch sang ngày tiếp theo"
);

assert.strictEqual(classifyDeadlineReminder({ ...baseItem, dueDate: "2026-07-21" }, "2026-07-15"), null, "D-6 chưa được nhắc");
for (let remainingDays = 5; remainingDays >= 0; remainingDays -= 1) {
  const day = String(20 - remainingDays).padStart(2, "0");
  const reminder = classifyDeadlineReminder({ ...baseItem, dueDate: "2026-07-20" }, `2026-07-${day}`);
  assert.strictEqual(reminder?.phase, "upcoming", `D-${remainingDays} phải được nhắc`);
  assert.strictEqual(reminder?.remainingDays, remainingDays);
}
for (const overdueDays of [1, 2, 3, 4, 30, 365]) {
  const day = String(20 + overdueDays).padStart(2, "0");
  const todayKey = overdueDays <= 11 ? `2026-07-${day}` : shiftDateKey("2026-07-20", overdueDays);
  const reminder = classifyDeadlineReminder({ ...baseItem, dueDate: "2026-07-20" }, todayKey);
  assert.strictEqual(reminder?.phase, "overdue", `D+${overdueDays} phải được nhắc`);
  assert.strictEqual(reminder?.overdueDays, overdueDays);
}
assert.strictEqual(classifyDeadlineReminder({ ...baseItem, dueDate: "2026-07-20", status: "Hoàn thành", progress: 100 }, "2026-07-20"), null, "Việc hoàn thành không được nhắc");

const categories = new Map([["pilot-t03", { name: "HDSD Lending Hub" }]]);
const fridayPlan = buildNotificationPlan([
  { ...baseItem, id: "near-1", dueDate: "2026-07-18" },
  { ...baseItem, id: "near-2", taskId: "SQ2-T03-002", dueDate: "2026-07-19" },
  { ...baseItem, id: "old-overdue", taskId: "SQ2-T03-003", dueDate: "2026-07-10" },
  { ...baseItem, id: "completed-late", taskId: "SQ2-T03-004", dueDate: "2026-07-10", completedDate: "2026-07-13", status: "Hoàn thành", progress: 100 },
  { ...baseItem, id: "completed-before-period", taskId: "SQ2-T03-006", dueDate: "2026-07-01", completedDate: "2026-07-10", status: "Hoàn thành", progress: 100 },
  { ...baseItem, id: "completed-on-time", taskId: "SQ2-T03-007", dueDate: "2026-07-15", completedDate: "2026-07-15", status: "Hoàn thành", progress: 100 },
  { ...baseItem, id: "completed-without-date", taskId: "SQ2-T03-008", dueDate: "2026-07-10", completedDate: "", status: "Hoàn thành", progress: 100 },
  { ...baseItem, id: "missing-email", taskId: "SQ2-T03-005", dueDate: "2026-07-18", assigneeEmail: "" }
], {
  todayKey: "2026-07-17",
  managerEmails: ["yenuth@bidv.com.vn"],
  categories
});

assert.strictEqual(fridayPlan.assigneeDigests.length, 1, "Mỗi người chỉ nhận một digest/ngày");
assert.strictEqual(fridayPlan.assigneeDigests[0].items.length, 3, "Digest phải gộp việc từ D-5 và mọi việc còn quá hạn");
assert.strictEqual(fridayPlan.missingAssigneeEmails.length, 1, "Task thiếu email phải được báo trong preview");
assert.ok(fridayPlan.managerDigest, "Thứ Sáu phải có mail quản lý");
assert.strictEqual(fridayPlan.managerDigest.overdueItems.length, 1, "Mail quản lý phải giữ mọi việc đang quá hạn");
assert.strictEqual(fridayPlan.managerDigest.completedLateItems.length, 1, "Mail quản lý phải giữ việc hoàn thành trễ trong kỳ");
assert.strictEqual(fridayPlan.managerDigest.completedLateItems[0].completedLateDays, 3);
assert.strictEqual(fridayPlan.managerDigest.reportStartKey, "2026-07-11", "Kỳ thứ Sáu phải bao phủ bảy ngày từ thứ Bảy");
assert.strictEqual(fridayPlan.managerCompletedLateTaskCount, 1);

const managerEmail = renderManagerDigest(fridayPlan.managerDigest, { appBaseUrl: "https://example.test" }, "2026-07-17");
assert.match(managerEmail, /Đang quá hạn/);
assert.match(managerEmail, /Đã hoàn thành trễ trong kỳ/);
assert.match(managerEmail, /Hoàn thành trễ 3 ngày/);
assert.match(managerEmail, /13\/07\/2026/);
assert.doesNotMatch(managerEmail, /undefined|NaN/);

const emptyFridayPlan = buildNotificationPlan([], {
  todayKey: "2026-07-17",
  managerEmails: "yenuth@bidv.com.vn"
});
assert.ok(emptyFridayPlan.managerDigest, "Thứ Sáu vẫn gửi tổng kết khi không có ai quá hạn");
assert.strictEqual(emptyFridayPlan.managerDigest.items.length, 0);
assert.strictEqual(emptyFridayPlan.managerDigest.completedLateItems.length, 0);

const saturdayPlan = buildNotificationPlan([], {
  todayKey: "2026-07-18",
  managerEmails: "yenuth@bidv.com.vn"
});
assert.strictEqual(saturdayPlan.managerDigest, null, "Ngoài thứ Sáu không gửi mail quản lý");

const saturdayOverduePlan = buildNotificationPlan([
  { ...baseItem, dueDate: "2026-07-10" }
], {
  todayKey: "2026-07-18",
  managerEmails: "yenuth@bidv.com.vn"
});
assert.strictEqual(saturdayOverduePlan.managerDigest, null, "Saturday must not create the manager email");
assert.strictEqual(saturdayOverduePlan.managerOverdueTaskCount, 1, "Preview must still count overdue tasks outside Friday");

const digestForEmail = {
  recipient: "sinhhc@bidv.com.vn",
  assignee: "Huỳnh Công Sinh",
  items: [{
    ...baseItem,
    taskId: "SQ2-URD-008",
    title: "Bổ sung chức năng AI hỗ trợ phân tích BCTC",
    assignee: "Huỳnh Công Sinh",
    assigneeEmail: "sinhhc@bidv.com.vn",
    status: "Chưa bắt đầu",
    progress: 0,
    categoryName: "URD",
    dueDate: "2026-07-19",
    remainingDays: 1,
    daysOverdue: 0
  }]
};
const friendlyEmail = renderAssigneeDigest(digestForEmail, { appBaseUrl: "https://example.test" }, "2026-07-18");
assert.match(buildAssigneeSubject(digestForEmail, "2026-07-18"), /1 công việc/);
assert.match(friendlyEmail, /Chào Sinh/);
assert.match(friendlyEmail, /SQ2-URD-008/);
assert.match(friendlyEmail, /Chưa bắt đầu/);
assert.match(friendlyEmail, /Còn 1 ngày/);

const operationalPreview = renderOperationalPreview({
  target: "maitanthanh1998@gmail.com",
  plan: { assigneeDigests: [digestForEmail] },
  settings: { appBaseUrl: "https://example.test" },
  todayKey: "2026-07-18"
});
assert.match(operationalPreview, /DỮ LIỆU THỰC TẾ HÔM NAY/);
assert.match(operationalPreview, /Huỳnh Công Sinh/);

const secret = "unit-test-secret";
const encrypted = encryptValue("refresh-token", secret);
assert.notStrictEqual(encrypted.data, "refresh-token");
assert.strictEqual(decryptValue(encrypted, secret), "refresh-token");

const oauthState = signOAuthState({ userId: "admin", exp: Date.now() + 60000 }, secret);
assert.strictEqual(verifyOAuthState(oauthState, secret)?.userId, "admin");
assert.strictEqual(verifyOAuthState(`${oauthState}x`, secret), null, "State bị sửa phải bị từ chối");
assert.strictEqual(verifyOAuthState(signOAuthState({ userId: "admin", exp: Date.now() - 1 }, secret), secret), null, "State hết hạn phải bị từ chối");

const raw = buildMimeMessage({
  from: "maitanthanh1998@gmail.com",
  to: ["thanhmt@bidv.com.vn"],
  subject: "Nhắc deadline",
  html: "<strong>Kiểm tra</strong>"
});
const mime = Buffer.from(raw, "base64url").toString("utf8");
assert.match(mime, /From: Squad 2 UAT <maitanthanh1998@gmail.com>/);
assert.match(mime, /To: thanhmt@bidv.com.vn/);
assert.match(mime, /Content-Type: text\/html; charset=UTF-8/);

async function checkFreshDatabaseDefaults() {
  const service = createDeadlineNotificationService({
    expectedSenderEmail: "maitanthanh1998@gmail.com",
    defaultManagerEmails: "yenuth@bidv.com.vn",
    encryptionSecret: secret
  });
  const settings = await service.readSettings({
    query: async () => ({ rows: [] })
  });
  assert.strictEqual(settings.enabled, true, "A fresh database must receive enabled default settings");
  assert.deepStrictEqual(settings.managerEmails, ["yenuth@bidv.com.vn"]);
}

checkFreshDatabaseDefaults()
  .then(() => console.log("Deadline notification checks passed: daily schedule, D-5 until completion, Friday active/late-completed digest, fresh DB defaults, encryption, OAuth state and MIME."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
