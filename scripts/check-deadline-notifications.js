const assert = require("assert");
const {
  createDeadlineNotificationService,
  buildNotificationPlan,
  classifyDeadlineReminder,
  dayDifference,
  isFridayDateKey,
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
assert.strictEqual(isFridayDateKey("2026-07-17"), true);
assert.strictEqual(isFridayDateKey("2026-07-18"), false);

assert.strictEqual(classifyDeadlineReminder({ ...baseItem, dueDate: "2026-07-21" }, "2026-07-15"), null, "D-6 chưa được nhắc");
for (let remainingDays = 5; remainingDays >= 0; remainingDays -= 1) {
  const day = String(20 - remainingDays).padStart(2, "0");
  const reminder = classifyDeadlineReminder({ ...baseItem, dueDate: "2026-07-20" }, `2026-07-${day}`);
  assert.strictEqual(reminder?.phase, "upcoming", `D-${remainingDays} phải được nhắc`);
  assert.strictEqual(reminder?.remainingDays, remainingDays);
}
for (let overdueDays = 1; overdueDays <= 3; overdueDays += 1) {
  const day = String(20 + overdueDays).padStart(2, "0");
  const reminder = classifyDeadlineReminder({ ...baseItem, dueDate: "2026-07-20" }, `2026-07-${day}`);
  assert.strictEqual(reminder?.phase, "overdue", `D+${overdueDays} phải được nhắc`);
  assert.strictEqual(reminder?.overdueDays, overdueDays);
}
assert.strictEqual(classifyDeadlineReminder({ ...baseItem, dueDate: "2026-07-20" }, "2026-07-24"), null, "D+4 phải dừng nhắc cá nhân");
assert.strictEqual(classifyDeadlineReminder({ ...baseItem, dueDate: "2026-07-20", status: "Hoàn thành", progress: 100 }, "2026-07-20"), null, "Việc hoàn thành không được nhắc");

const categories = new Map([["pilot-t03", { name: "HDSD Lending Hub" }]]);
const fridayPlan = buildNotificationPlan([
  { ...baseItem, id: "near-1", dueDate: "2026-07-18" },
  { ...baseItem, id: "near-2", taskId: "SQ2-T03-002", dueDate: "2026-07-19" },
  { ...baseItem, id: "old-overdue", taskId: "SQ2-T03-003", dueDate: "2026-07-10" },
  { ...baseItem, id: "completed", taskId: "SQ2-T03-004", dueDate: "2026-07-10", status: "Hoàn thành", progress: 100 },
  { ...baseItem, id: "missing-email", taskId: "SQ2-T03-005", dueDate: "2026-07-18", assigneeEmail: "" }
], {
  todayKey: "2026-07-17",
  managerEmails: ["yenuth@bidv.com.vn"],
  categories
});

assert.strictEqual(fridayPlan.assigneeDigests.length, 1, "Mỗi người chỉ nhận một digest/ngày");
assert.strictEqual(fridayPlan.assigneeDigests[0].items.length, 2, "Digest phải gộp hai việc trong D-5 đến D+3");
assert.strictEqual(fridayPlan.missingAssigneeEmails.length, 1, "Task thiếu email phải được báo trong preview");
assert.ok(fridayPlan.managerDigest, "Thứ Sáu phải có mail quản lý");
assert.strictEqual(fridayPlan.managerDigest.items.length, 1, "Mail quản lý phải giữ việc quá hạn lâu hơn D+3");

const emptyFridayPlan = buildNotificationPlan([], {
  todayKey: "2026-07-17",
  managerEmails: "yenuth@bidv.com.vn"
});
assert.ok(emptyFridayPlan.managerDigest, "Thứ Sáu vẫn gửi tổng kết khi không có ai quá hạn");
assert.strictEqual(emptyFridayPlan.managerDigest.items.length, 0);

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
  .then(() => console.log("Deadline notification checks passed: D-5..D+3, Friday digest, fresh DB defaults, encryption, OAuth state and MIME."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
