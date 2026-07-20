const fs = require("fs");
const os = require("os");
const path = require("path");

const ExcelJS = require("exceljs");

const {
  canonicalTesterDirectory,
  parseWorkbookImportState
} = require("../server");

const Q2_START = "2026-04-01";
const Q2_END = "2026-06-30";
const REPORT_PERIOD = "01/04/2026 - 30/06/2026";
const COLORS = {
  navy: "FF0F2747",
  teal: "FF007A73",
  tealDark: "FF005B57",
  tealLight: "FFE8F6F4",
  blue: "FF2563EB",
  blueLight: "FFEAF2FF",
  green: "FF14804A",
  greenLight: "FFE9F8F0",
  amber: "FFB86600",
  amberLight: "FFFFF4D8",
  red: "FFD92D38",
  redLight: "FFFFECEE",
  gray900: "FF172033",
  gray700: "FF4B5568",
  gray500: "FF7B8495",
  gray300: "FFD5DAE3",
  gray200: "FFE8EBF0",
  gray100: "FFF5F7FA",
  white: "FFFFFFFF"
};

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});

async function main() {
  const args = readArgs(process.argv.slice(2));
  const sourcePath = path.resolve(args.source || process.env.REPORT_SOURCE_WORKBOOK || "");
  const outputPath = path.resolve(args.output || process.env.REPORT_OUTPUT || path.join(os.homedir(), "Downloads", "Bao_cao_danh_gia_cong_viec_Quy_2_2026_Squad_2_DASHBOARD.xlsx"));
  const apiBase = String(args.api || process.env.REPORT_API_BASE || "https://squad2-dashboard-qlcv.up.railway.app").replace(/\/$/, "");
  const identifier = process.env.REPORT_IDENTIFIER || "";
  const password = process.env.REPORT_PASSWORD || "";

  if (!sourcePath || !fs.existsSync(sourcePath)) throw new Error(`Không tìm thấy file dữ liệu nguồn: ${sourcePath || "(trống)"}`);
  if (!identifier || !password) throw new Error("Cần REPORT_IDENTIFIER và REPORT_PASSWORD để đọc Task_Master từ web.");

  const [remoteState, workbookState] = await Promise.all([
    fetchRemoteState(apiBase, identifier, password),
    parseWorkbookImportState(fs.readFileSync(sourcePath))
  ]);
  const state = {
    ...remoteState,
    personnel: workbookState.personnel,
    plans: workbookState.plans,
    daily: workbookState.daily,
    defects: workbookState.defects
  };

  const model = buildReportModel(state, { apiBase, sourcePath });
  validateReportModel(model);
  const workbook = buildWorkbook(model);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await workbook.xlsx.writeFile(outputPath);

  console.log(JSON.stringify({
    ok: true,
    outputPath,
    sourceWorkbook: path.basename(sourcePath),
    people: model.people.length,
    activities: model.entries.length,
    selectedTaskMasterRows: model.audit.selectedTasks.length,
    q2DailyRows: model.audit.dailyRows.length,
    q2Defects: model.audit.defects.length,
    planAllocation: Object.fromEntries(model.people.map((person) => [person.name, person.metrics.allocatedCases])),
    dataWarnings: model.audit.warnings
  }, null, 2));
}

function readArgs(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = String(args[index] || "");
    if (!key.startsWith("--")) continue;
    result[key.slice(2)] = args[index + 1];
    index += 1;
  }
  return result;
}

async function fetchRemoteState(apiBase, identifier, password) {
  const login = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password })
  });
  if (!login.ok) throw new Error(`Đăng nhập web thất bại (${login.status}).`);
  const setCookie = login.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";")[0];
  if (!cookie) throw new Error("Web không trả session cookie.");
  const response = await fetch(`${apiBase}/api/state`, { headers: { cookie } });
  if (!response.ok) throw new Error(`Không đọc được dữ liệu web (${response.status}).`);
  const payload = await response.json();
  return payload.state || {};
}

function buildReportModel(state, context) {
  const personnel = (state.personnel || []).map((person) => ({ ...person }));
  const peopleByName = new Map(personnel.map((person) => [identityKey(person.name), person]));
  const testerByNumber = new Map(canonicalTesterDirectory.map((tester, index) => [String(index + 1), tester]));
  const testerByName = new Map(canonicalTesterDirectory.map((tester) => [identityKey(tester.name), tester]));

  const selectedTasks = (state.workItems || []).filter(isSelectedQ2Task).map((row) => ({ ...row }));
  const excludedTasks = (state.workItems || []).filter((row) => inQ2(row.startDate) && !isSelectedQ2Task(row)).map((row) => ({ ...row }));
  const q2Plans = (state.plans || []).filter((row) => inQ2(row.uatHandoff));
  const q2Daily = (state.daily || []).filter((row) => inQ2(row.date));
  const q2Defects = (state.defects || []).filter((row) => inQ2(row.foundDate));

  const planByPerson = new Map(canonicalTesterDirectory.map((tester) => [identityKey(tester.name), {
    tester,
    cases: 0,
    rows: [],
    jiraCodes: new Set(),
    dates: new Set()
  }]));
  q2Plans.forEach((plan) => {
    canonicalTesterDirectory.forEach((tester) => {
      const amount = number(plan[tester.key]);
      if (!amount) return;
      const bucket = planByPerson.get(identityKey(tester.name));
      bucket.cases += amount;
      bucket.rows.push({ id: plan.id, jiraCode: plan.jiraCode, date: plan.uatHandoff, cases: amount, key: tester.key });
      if (plan.jiraCode) bucket.jiraCodes.add(plan.jiraCode);
      if (plan.uatHandoff) bucket.dates.add(plan.uatHandoff);
    });
  });

  const dailyByPerson = new Map();
  const dailyRows = [];
  const warnings = [];
  q2Daily.forEach((row) => {
    const tester = testerByNumber.get(String(row.tester || "").trim());
    const personName = clean(row.handler) || tester?.name || "Không xác định";
    const total = number(row.totalCases);
    const passed = number(row.passedCases);
    const failed = number(row.failedCases);
    const executed = passed + failed;
    const normalized = { ...row, personName, total, passed, failed, executed };
    dailyRows.push(normalized);
    const key = identityKey(personName);
    if (!dailyByPerson.has(key)) dailyByPerson.set(key, {
      name: personName,
      rows: [],
      total: 0,
      executed: 0,
      passed: 0,
      failed: 0,
      jiraCodes: new Set(),
      dates: new Set()
    });
    const bucket = dailyByPerson.get(key);
    bucket.rows.push(normalized);
    bucket.total += total;
    bucket.executed += executed;
    bucket.passed += passed;
    bucket.failed += failed;
    if (row.jiraCode) bucket.jiraCodes.add(row.jiraCode);
    if (row.date) bucket.dates.add(row.date);
    if (total !== executed) warnings.push(`Kết quả kiểm thử ngày ${displayDate(row.date) || "-"} của ${personName}: tổng số testcase là ${total}, nhưng mới có kết quả Đạt/Không đạt cho ${executed} testcase.`);
    if (clean(row.handler) && tester && identityKey(row.handler) !== identityKey(tester.name)) {
      warnings.push(`Kết quả kiểm thử ngày ${displayDate(row.date) || "-"}: mã người kiểm thử ${row.tester} tương ứng ${tester.name}, nhưng người thực hiện được ghi là ${row.handler}. Báo cáo tạm tính cho người thực hiện được ghi trực tiếp là ${row.handler}.`);
    }
  });

  const entries = [];
  selectedTasks.forEach((task) => {
    reportTaskAssignees(task).forEach((person) => entries.push(buildTaskEntry(task, context.apiBase, person)));
  });

  const defectByPerson = groupBy(q2Defects, (row) => clean(row.tester) || ownerName(row.owner) || "Không xác định");
  defectByPerson.forEach((rows, name) => {
    if (identityKey(name) === identityKey("Không xác định")) {
      warnings.push(`${rows.length} lỗi UAT trong quý II chưa xác định được người phát hiện.`);
      return;
    }
    entries.push(buildDefectEntry(name, rows));
  });

  dailyByPerson.forEach((daily, key) => {
    if (!daily.executed) {
      warnings.push(`Chưa tính kết quả kiểm thử cho ${daily.name}: có ${daily.total} testcase được ghi nhận nhưng chưa có kết quả Đạt/Không đạt.`);
      return;
    }
    const plan = planByPerson.get(key) || { cases: 0, rows: [], jiraCodes: new Set(), dates: new Set() };
    entries.push(buildDailyEntry(daily, plan));
  });

  const entryNames = new Set(entries.map((entry) => identityKey(entry.personName)));
  const people = personnel
    .filter((person) => entryNames.has(identityKey(person.name)))
    .map((person, index) => ({
      ...person,
      index: index + 1,
      group: "Squad 2",
      entries: entries.filter((entry) => identityKey(entry.personName) === identityKey(person.name))
    }));

  // Keep a person present even if the source personnel sheet is incomplete.
  entries.forEach((entry) => {
    if (people.some((person) => identityKey(person.name) === identityKey(entry.personName))) return;
    people.push({
      index: people.length + 1,
      name: entry.personName,
      unit: "-",
      role: "Thành viên Squad 2",
      group: "Squad 2",
      entries: entries.filter((candidate) => identityKey(candidate.personName) === identityKey(entry.personName))
    });
  });

  people.forEach((person) => {
    assignWeights(person.entries);
    const tester = testerByName.get(identityKey(person.name));
    const plan = planByPerson.get(identityKey(person.name));
    const daily = dailyByPerson.get(identityKey(person.name));
    const workEntries = person.entries.filter((entry) => entry.source === "Task_Master");
    person.metrics = {
      activities: person.entries.length,
      score: round2(person.entries.reduce((sum, entry) => sum + entry.weight * entry.completion * 100, 0)),
      workTotal: workEntries.length,
      workCompleted: workEntries.filter((entry) => entry.completion >= 1).length,
      allocatedCases: tester ? number(plan?.cases) : 0,
      dailyTotalCases: number(daily?.total),
      executedCases: number(daily?.executed),
      passedCases: number(daily?.passed),
      failedCases: number(daily?.failed),
      defects: person.entries.filter((entry) => entry.source === "DEFECT_LOG").reduce((sum, entry) => sum + number(entry.sourceCount), 0),
      executionRate: tester && number(plan?.cases) ? number(daily?.executed) / number(plan.cases) : 0,
      passRate: number(daily?.executed) ? number(daily?.passed) / number(daily.executed) : 0
    };
  });

  const orderedEntries = people.flatMap((person) => person.entries);
  return {
    generatedAt: new Date(),
    sourceWorkbook: path.basename(context.sourcePath),
    people,
    entries: orderedEntries,
    audit: {
      selectedTasks,
      excludedTasks,
      dailyRows,
      defects: q2Defects,
      plans: q2Plans,
      planByPerson,
      warnings: [...new Set(warnings)]
    }
  };
}

function isSelectedQ2Task(task) {
  if (!inQ2(task.startDate)) return false;
  if (inQ2(task.completedDate)) return true;
  return inQ2(task.deadline) && !clean(task.completedDate) && number(task.progress) < 100;
}

function reportTaskAssignees(task) {
  const source = Array.isArray(task.assignees) && task.assignees.length
    ? task.assignees
    : [{ name: task.assignee || "", email: task.assigneeEmail || "" }];
  const seen = new Set();
  return source.map((person) => ({
    name: clean(person?.name || person?.label),
    email: clean(person?.email).toLowerCase()
  })).filter((person) => {
    const key = person.email || identityKey(person.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildTaskEntry(task, apiBase, person = null) {
  const completion = Math.max(0, Math.min(1, number(task.progress) / 100));
  const completed = completion >= 1 || /hoàn thành/i.test(clean(task.status));
  const taskCode = task.taskId || task.id;
  const description = clean(task.description);
  const assignmentDate = clean(task.startDate) ? displayDate(task.startDate) : "chưa ghi ngày giao";
  const deadline = clean(task.deadline) ? displayDate(task.deadline) : "không có deadline";
  const evidenceText = clean(task.documentLink)
    ? `Mở tài liệu minh chứng · ${taskCode}`
    : `Xem công việc ${taskCode} trên hệ thống`;
  return {
    source: "Task_Master",
    sourceId: task.id,
    sourceCode: task.taskId || task.id,
    sourceCount: 1,
    personName: clean(person?.name) || clean(person?.email) || clean(task.assignee) || clean(task.assigneeEmail) || "Không xác định",
    activity: clean(task.title) || description || taskCode || "Công việc quý II",
    basis: `Công việc ${taskCode} được giao ngày ${assignmentDate}; ${deadline}. Trạng thái tại kỳ báo cáo: ${clean(task.status) || "chưa cập nhật"}; tiến độ ${round2(completion * 100)}%${description ? `. Nội dung: ${description}` : "."}`,
    quality: completed
      ? `Đã hoàn thành 100%${clean(task.completedDate) ? ` ngày ${displayDate(task.completedDate)}` : " theo trạng thái trên hệ thống"}.`
      : `Chưa hoàn thành tại 30/06/2026; khối lượng hoàn thành được ghi nhận là ${round2(completion * 100)}%.`,
    timeline: taskTimeline(task, completed),
    evidenceText,
    evidenceUrl: clean(task.documentLink) || `${apiBase}/#workItems`,
    completion,
    startDate: clean(task.startDate),
    endDate: clean(task.completedDate) || clean(task.deadline),
    warning: clean(task.completedDate) && !/hoàn thành/i.test(clean(task.status))
      ? `Trạng thái '${task.status || "trống"}' không đồng nhất với ngày hoàn thành.`
      : ""
  };
}

function buildDefectEntry(name, rows) {
  const handledStatuses = new Set(["cancelled", "closed", "resolved", "sit pass"]);
  const handled = rows.filter((row) => handledStatuses.has(identityKey(row.status))).length;
  const bugIds = rows.map((row) => row.bugId).filter(Boolean);
  const dates = rows.map((row) => row.foundDate).filter(Boolean).sort();
  const completion = rows.length ? handled / rows.length : 0;
  return {
    source: "DEFECT_LOG",
    sourceId: `defects:${identityKey(name)}`,
    sourceCode: bugIds.join(", "),
    sourceCount: rows.length,
    personName: name,
    activity: "Phát hiện và theo dõi lỗi UAT quý II/2026",
    basis: `${name} ghi nhận ${rows.length} lỗi UAT trong quý II; ${handled} lỗi đã xử lý, ${rows.length - handled} lỗi còn mở. Mã lỗi: ${bugIds.join(", ") || "chưa có mã"}.`,
    quality: `Đã xử lý ${handled}/${rows.length} lỗi, tương đương ${formatPercent(completion)}; còn ${rows.length - handled} lỗi cần tiếp tục theo dõi.`,
    timeline: dates.length ? `Ghi nhận từ ${displayDate(dates[0])} đến ${displayDate(dates.at(-1))}.` : "Không có ngày phát hiện.",
    evidenceText: `${rows.length} lỗi UAT · ${handled} đã xử lý · ${rows.length - handled} còn mở`,
    evidenceUrl: bugIds[0] ? `https://bidv-vn.atlassian.net/browse/${bugIds[0]}` : "",
    completion,
    startDate: dates[0] || "",
    endDate: dates.at(-1) || "",
    warning: rows.some((row) => !row.resolvedDate && handledStatuses.has(identityKey(row.status)))
      ? "Một số lỗi có trạng thái đã xử lý nhưng nguồn chưa ghi ngày xử lý."
      : ""
  };
}

function buildDailyEntry(daily, plan) {
  const denominator = number(plan.cases) || number(daily.total) || number(daily.executed);
  const completion = denominator ? Math.min(1, daily.executed / denominator) : 0;
  const dates = [...daily.dates].sort();
  const jiras = [...daily.jiraCodes].filter(Boolean);
  const planJiras = [...plan.jiraCodes].filter(Boolean);
  const passRate = daily.executed ? daily.passed / daily.executed : 0;
  const remaining = Math.max(0, denominator - daily.executed);
  return {
    source: "DieuHanh_Ngay",
    sourceId: `daily:${identityKey(daily.name)}`,
    sourceCode: jiras.join(", "),
    sourceCount: daily.rows.length,
    personName: daily.name,
    activity: "Thực hiện kiểm thử UAT quý II/2026",
    basis: `${daily.name} được phân giao ${number(plan.cases)} testcase trong quý II${planJiras.length ? ` thuộc các mã ${planJiras.join(", ")}` : ""}. Kết quả đến 30/06/2026: đã chạy ${daily.executed} testcase; ${daily.passed} đạt, ${daily.failed} không đạt; còn ${remaining} testcase chưa có kết quả.`,
    quality: `Hoàn thành kiểm thử ${daily.executed}/${denominator} testcase (${formatPercent(completion)}). Trong số đã chạy, tỷ lệ đạt là ${formatPercent(passRate)}; có ${daily.failed} testcase không đạt.`,
    timeline: dates.length ? `Kết quả kiểm thử được cập nhật từ ${displayDate(dates[0])} đến ${displayDate(dates.at(-1))}.` : "Chưa có ngày thực hiện.",
    evidenceText: `Kết quả kiểm thử: ${daily.executed}/${denominator} testcase đã chạy · ${daily.passed} đạt · ${daily.failed} không đạt`,
    evidenceUrl: "",
    completion,
    startDate: dates[0] || "",
    endDate: dates.at(-1) || "",
    warning: daily.total !== daily.executed
      ? `${daily.total - daily.executed} testcase đã được ghi tổng số nhưng chưa có kết quả Đạt/Không đạt; cần kiểm tra lại dữ liệu đầu vào.`
      : ""
  };
}

function taskTimeline(task, completed) {
  const deadline = clean(task.deadline);
  const completedDate = clean(task.completedDate);
  if (completedDate && deadline) return completedDate <= deadline ? "Đúng hạn" : `Hoàn thành sau deadline ${displayDate(deadline)}`;
  if (completedDate) return "Hoàn thành trong quý II (không có deadline)";
  if (!completed && deadline) return `Chưa hoàn thành tại 30/06/2026; deadline ${displayDate(deadline)}`;
  return completed ? "Đã hoàn thành theo trạng thái được cập nhật" : "Chưa có deadline hoặc ngày hoàn thành";
}

function assignWeights(entries) {
  if (!entries.length) return;
  const basisPoints = Math.floor(10000 / entries.length);
  entries.forEach((entry, index) => {
    entry.weight = index === entries.length - 1
      ? (10000 - basisPoints * (entries.length - 1)) / 10000
      : basisPoints / 10000;
  });
}

function validateReportModel(model) {
  if (model.people.length !== 10) throw new Error(`Báo cáo phải có 10 nhân sự, hiện có ${model.people.length}.`);
  if (model.audit.selectedTasks.length !== 22) throw new Error(`Quy tắc quý II phải chọn 22 Task_Master, hiện có ${model.audit.selectedTasks.length}.`);
  const mai = model.people.find((person) => identityKey(person.name) === identityKey("Mai Tấn Thành"));
  const tuan = model.people.find((person) => identityKey(person.name) === identityKey("Trần Đình Tuấn"));
  if (!mai || mai.metrics.allocatedCases !== 0 || mai.metrics.executedCases !== 0) {
    throw new Error(`Mai Tấn Thành phải có 0 TC phân giao/0 TC thực thi, hiện có ${JSON.stringify(mai?.metrics || {})}.`);
  }
  if (!tuan || tuan.metrics.allocatedCases !== 271) {
    throw new Error(`Trần Đình Tuấn phải có 271 TC phân giao theo file mới, hiện có ${tuan?.metrics?.allocatedCases}.`);
  }
  model.people.forEach((person) => {
    const weight = round2(person.entries.reduce((sum, entry) => sum + entry.weight, 0) * 100);
    if (weight !== 100) throw new Error(`Trọng số của ${person.name} không bằng 100%: ${weight}%.`);
  });
}

function buildWorkbook(model) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Squad 2 UAT Dashboard";
  workbook.lastModifiedBy = "Squad 2 UAT Dashboard";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  workbook.calcProperties.forceFullCalc = true;

  const dashboard = workbook.addWorksheet("Dashboard_NhanSu", { views: [{ state: "frozen", ySplit: 5, showGridLines: false }] });
  const report = workbook.addWorksheet("MaubieuDA", { views: [{ state: "frozen", ySplit: 5, showGridLines: false }] });
  const audit = workbook.addWorksheet("Doi_chieu_du_lieu", { views: [{ state: "frozen", ySplit: 5, showGridLines: false }] });
  const data = workbook.addWorksheet("Du_lieu_Dashboard", { state: "veryHidden" });

  buildDashboardDataSheet(data, model);
  buildDashboardSheet(dashboard, model);
  buildReportSheet(report, model);
  buildAuditSheet(audit, model);
  return workbook;
}

function buildReportSheet(ws, model) {
  const widths = [8, 24, 18, 12, 25, 24, 42, 12, 48, 35, 31, 34, 14, 12];
  widths.forEach((width, index) => { ws.getColumn(index + 1).width = width; });
  ws.mergeCells("A1:N1");
  ws.getCell("A1").value = "BAN QUẢN LÝ DỰ ÁN LENDING HUB";
  ws.getCell("A1").font = { name: "Aptos Display", size: 14, bold: true, color: { argb: COLORS.navy } };
  ws.getCell("A1").alignment = { vertical: "middle" };
  ws.getRow(1).height = 25;
  ws.mergeCells("A2:N2");
  ws.getCell("A2").value = "SQUAD 2 · Tổng hợp công việc trên hệ thống, kế hoạch phân công, kết quả kiểm thử và danh sách lỗi UAT · Chốt số liệu đến 30/06/2026";
  ws.getCell("A2").font = { name: "Aptos", size: 9, color: { argb: COLORS.gray500 } };
  ws.mergeCells("A3:N3");
  ws.getCell("A3").value = "BẢNG NỘI DUNG CÔNG VIỆC THỰC HIỆN VÀ ĐÁNH GIÁ KẾT QUẢ THỰC HIỆN CÔNG VIỆC QUÝ II/2026";
  ws.getCell("A3").font = { name: "Aptos Display", size: 15, bold: true, color: { argb: COLORS.white } };
  ws.getCell("A3").fill = solid(COLORS.tealDark);
  ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  ws.getRow(3).height = 36;
  ws.mergeCells("A4:N4");
  ws.getCell("A4").value = "Phạm vi: công việc được giao trong quý II và đã hoàn thành trong quý II; hoặc được giao trong quý II, có hạn hoàn thành trong quý II nhưng vẫn chưa hoàn thành tại 30/06/2026. Testcase được tính cho đúng người có tên trong kế hoạch phân công.";
  ws.getCell("A4").font = { name: "Aptos", size: 9, italic: true, color: { argb: COLORS.tealDark } };
  ws.getCell("A4").fill = solid(COLORS.tealLight);
  ws.getCell("A4").alignment = { vertical: "middle", wrapText: true };
  ws.getRow(4).height = 30;

  const headers = ["STT", "Họ và tên", "Đơn vị", "Nhóm", "Vai trò trong Ban QLDA", "Thời gian chuyên trách dự án", "Công việc phân giao cho cán bộ", "Trọng số", "Mô tả căn cứ đo lường", "Chất lượng công việc thực hiện", "Tiến độ thực hiện", "Kết quả ghi nhận (link/tài liệu/văn bản chứng minh)", "% Hoàn thành", "Điểm"];
  ws.getRow(5).values = headers;
  styleHeader(ws.getRow(5));
  ws.getRow(5).height = 46;

  let rowNumber = 6;
  model.people.forEach((person, personIndex) => {
    const firstRow = rowNumber;
    person.entries.forEach((entry, entryIndex) => {
      const row = ws.getRow(rowNumber);
      row.values = [
        person.index,
        person.name,
        person.unit || "-",
        person.group,
        person.role || "Thành viên Squad 2",
        REPORT_PERIOD,
        entry.activity,
        entry.weight,
        entry.basis,
        entry.quality,
        entry.timeline,
        entry.evidenceUrl ? { text: entry.evidenceText, hyperlink: entry.evidenceUrl } : entry.evidenceText,
        entry.completion,
        { formula: `H${rowNumber}*M${rowNumber}*100`, result: round2(entry.weight * entry.completion * 100) }
      ];
      styleReportDataRow(row, personIndex, entryIndex);
      row.height = Math.max(44, Math.min(88, 34 + Math.ceil(Math.max(entry.basis.length, entry.quality.length) / 90) * 10));
      entry.reportRow = rowNumber;
      rowNumber += 1;
    });
    const lastRow = rowNumber - 1;
    if (lastRow > firstRow) {
      for (const column of ["A", "B", "C", "D", "E", "F"]) ws.mergeCells(`${column}${firstRow}:${column}${lastRow}`);
    }
    for (const column of ["A", "B", "C", "D", "E", "F"]) {
      ws.getCell(`${column}${firstRow}`).alignment = { horizontal: column === "B" || column === "E" ? "left" : "center", vertical: "middle", wrapText: true };
    }
  });

  const footerStart = rowNumber + 1;
  ws.mergeCells(`A${footerStart}:N${footerStart}`);
  ws.getCell(`A${footerStart}`).value = "Cách đọc và kiểm tra số liệu";
  ws.getCell(`A${footerStart}`).font = { name: "Aptos Display", bold: true, size: 11, color: { argb: COLORS.tealDark } };
  ws.getCell(`A${footerStart}`).fill = solid(COLORS.tealLight);
  const notes = [
    "Số testcase phân giao được tính cho đúng người có tên trong kế hoạch; không tự suy đoán từ mã nhân sự vì danh sách mã cũ từng bị lệch.",
    "Kết quả kiểm thử được tính cho người thực hiện được ghi trực tiếp. Testcase chưa có kết quả Đạt/Không đạt sẽ không được tính là đã chạy.",
    "Điểm mỗi hoạt động = Trọng số × % Hoàn thành × 100; tổng trọng số của mỗi người bằng 100%.",
    `Báo cáo tạo lúc ${model.generatedAt.toLocaleString("vi-VN")}. Xem sheet Doi_chieu_du_lieu để biết từng nội dung được đưa vào, loại ra hoặc cần kiểm tra lại.`
  ];
  notes.forEach((note, index) => {
    const row = footerStart + 1 + index;
    ws.mergeCells(`A${row}:N${row}`);
    ws.getCell(`A${row}`).value = `• ${note}`;
    ws.getCell(`A${row}`).font = { name: "Aptos", size: 9, color: { argb: COLORS.gray700 } };
    ws.getCell(`A${row}`).alignment = { wrapText: true, vertical: "middle" };
    ws.getRow(row).height = 22;
  });
  const signRow = footerStart + notes.length + 3;
  ws.mergeCells(`J${signRow}:N${signRow}`);
  ws.getCell(`J${signRow}`).value = "TRƯỞNG NHÓM NGHIỆP VỤ – SQUAD 2";
  ws.getCell(`J${signRow}`).font = { name: "Aptos", bold: true, size: 10, color: { argb: COLORS.navy } };
  ws.getCell(`J${signRow}`).alignment = { horizontal: "center" };

  ws.autoFilter = { from: "G5", to: "N5" };
  ws.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 },
    printTitlesRow: "1:5",
    printArea: `A1:N${signRow + 5}`
  };
  ws.headerFooter.oddFooter = "&LTrang &P / &N&CQuý II/2026&R&D";
}

function buildDashboardDataSheet(ws, model) {
  const headers = ["Họ và tên", "Đơn vị", "Vai trò", "Số hoạt động", "Điểm tổng", "CV Task_Master", "CV hoàn thành", "TC phân giao", "Tổng TC điều hành", "TC đã chạy", "Passed", "Failed", "Defect", "Tỷ lệ thực thi", "Pass rate", "STT"];
  ws.addRow(headers);
  model.people.forEach((person) => {
    const m = person.metrics;
    ws.addRow([person.name, person.unit || "-", person.role || "-", m.activities, m.score, m.workTotal, m.workCompleted, m.allocatedCases, m.dailyTotalCases, m.executedCases, m.passedCases, m.failedCases, m.defects, m.executionRate, m.passRate, person.index]);
  });
  const entryStart = 15;
  const entryHeaders = ["Họ và tên", "Công việc/hoạt động", "Nguồn", "Trọng số", "% Hoàn thành", "Điểm", "Tiến độ", "Kết quả ghi nhận"];
  entryHeaders.forEach((header, index) => { ws.getCell(entryStart, 18 + index).value = header; });
  model.entries.forEach((entry, index) => {
    const row = entryStart + 1 + index;
    [entry.personName, entry.activity, entry.source, entry.weight, entry.completion, round2(entry.weight * entry.completion * 100), entry.timeline, entry.evidenceText].forEach((value, offset) => {
      ws.getCell(row, 18 + offset).value = value;
    });
  });
}

function buildDashboardSheet(ws, model) {
  const widths = [7, 25, 19, 25, 12, 12, 12, 12, 13, 15, 13, 12, 12, 14, 13, 11];
  widths.forEach((width, index) => { ws.getColumn(index + 1).width = width; });
  ws.mergeCells("A1:P1");
  ws.getCell("A1").value = "DASHBOARD THEO DÕI KẾT QUẢ CÔNG VIỆC QUÝ II/2026";
  ws.getCell("A1").font = { name: "Aptos Display", size: 20, bold: true, color: { argb: COLORS.white } };
  ws.getCell("A1").fill = solid(COLORS.tealDark);
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 38;
  ws.mergeCells("A2:P2");
  ws.getCell("A2").value = "Tổng hợp toàn bộ thành viên · Công việc được giao · Kết quả kiểm thử · Lỗi UAT trong quý II";
  ws.getCell("A2").font = { name: "Aptos", size: 10, color: { argb: COLORS.gray700 } };
  ws.getCell("A2").alignment = { horizontal: "center" };
  ws.mergeCells("A4:H4");
  ws.getCell("A4").value = `TỔNG HỢP 10 THÀNH VIÊN · KỲ BÁO CÁO 01/04/2026 - 30/06/2026`;
  sectionTitle(ws.getCell("A4"));
  ws.mergeCells("I4:P4");
  ws.getCell("I4").value = `Cập nhật ${model.generatedAt.toLocaleString("vi-VN")}`;
  ws.getCell("I4").font = { name: "Aptos", size: 9, italic: true, color: { argb: COLORS.gray500 } };
  ws.getCell("I4").fill = solid(COLORS.tealLight);
  ws.getCell("I4").alignment = { horizontal: "right", vertical: "middle" };
  ws.getRow(4).height = 26;

  const summaryHeaders = ["STT", "Họ và tên", "Đơn vị", "Vai trò", "Nội dung đánh giá", "Điểm đánh giá", "Công việc được giao", "Công việc hoàn thành", "Testcase được giao", "Testcase được ghi nhận", "Testcase đã chạy", "Đạt", "Không đạt", "Tỷ lệ hoàn thành kiểm thử", "Tỷ lệ đạt", "Lỗi UAT"];
  summaryHeaders.forEach((header, index) => { ws.getCell(5, index + 1).value = header; });
  styleHeader(ws.getRow(5), 1, summaryHeaders.length);
  ws.getRow(5).height = 40;
  model.people.forEach((person, index) => {
    const row = 6 + index;
    const m = person.metrics;
    ws.getRow(row).values = [person.index, person.name, person.unit || "-", person.role || "-", m.activities, m.score, m.workTotal, m.workCompleted, m.allocatedCases, m.dailyTotalCases, m.executedCases, m.passedCases, m.failedCases, m.executionRate, m.passRate, m.defects];
    ws.getCell(row, 6).numFmt = "0.00";
    ws.getCell(row, 14).numFmt = "0.00%";
    ws.getCell(row, 15).numFmt = "0.00%";
    for (let column = 1; column <= summaryHeaders.length; column += 1) {
      const cell = ws.getCell(row, column);
      cell.font = { name: "Aptos", size: 9, color: { argb: COLORS.gray900 }, bold: column === 2 };
      cell.fill = solid(index % 2 ? COLORS.tealLight : COLORS.white);
      cell.border = thinBorder(COLORS.teal);
      cell.alignment = { vertical: "middle", horizontal: [2, 3, 4].includes(column) ? "left" : "center", wrapText: true };
    }
    ws.getRow(row).height = 38;
  });
  ws.addConditionalFormatting({
    ref: "F6:F15",
    rules: [{ type: "colorScale", cfvo: [{ type: "min" }, { type: "percentile", value: 50 }, { type: "max" }], color: [{ argb: COLORS.redLight }, { argb: COLORS.amberLight }, { argb: COLORS.greenLight }] }]
  });
  ws.addConditionalFormatting({
    ref: "N6:N15",
    rules: [{ type: "dataBar", color: { argb: COLORS.teal }, showValue: true, gradient: true, cfvo: [{ type: "num", value: 0 }, { type: "num", value: 1 }] }]
  });
  ws.addConditionalFormatting({
    ref: "O6:O15",
    rules: [{ type: "dataBar", color: { argb: COLORS.green }, showValue: true, gradient: true, cfvo: [{ type: "num", value: 0 }, { type: "num", value: 1 }] }]
  });

  ws.mergeCells("A17:P17");
  ws.getCell("A17").value = "CÁCH ĐỌC SỐ LIỆU";
  sectionTitle(ws.getCell("A17"));
  const notes = [
    "Testcase được giao được tính theo đúng tên người trong kế hoạch phân công; không suy đoán từ mã nhân sự cũ.",
    "Testcase được ghi nhận là tổng số testcase trong các lần cập nhật kết quả; testcase đã chạy chỉ gồm các trường hợp đã có kết quả Đạt hoặc Không đạt.",
    "Testcase đã chạy = số Đạt + số Không đạt. Những testcase chưa có kết quả không được tính là đã chạy.",
    "Điểm đánh giá là tổng điểm theo trọng số của toàn bộ nội dung công việc quý II; xem chi tiết tại sheet MaubieuDA."
  ];
  notes.forEach((note, index) => {
    const row = 18 + index;
    ws.mergeCells(`A${row}:P${row}`);
    ws.getCell(`A${row}`).value = `• ${note}`;
    ws.getCell(`A${row}`).font = { name: "Aptos", size: 9, color: { argb: COLORS.gray700 } };
    ws.getCell(`A${row}`).alignment = { vertical: "middle", wrapText: true };
    ws.getRow(row).height = 22;
  });

  ws.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    margins: { left: 0.25, right: 0.25, top: 0.3, bottom: 0.3, header: 0.1, footer: 0.1 },
    printArea: "A1:P35"
  };
  ws.headerFooter.oddFooter = "&LDashboard nhân sự&CTrang &P / &N&RQuý II/2026";
}

function buildAuditSheet(ws, model) {
  ws.mergeCells("A1:N1");
  ws.getCell("A1").value = "ĐỐI CHIẾU DỮ LIỆU BÁO CÁO QUÝ II/2026";
  ws.getCell("A1").font = { name: "Aptos Display", size: 17, bold: true, color: { argb: COLORS.white } };
  ws.getCell("A1").fill = solid(COLORS.tealDark);
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 34;
  ws.mergeCells("A2:N2");
  ws.getCell("A2").value = "Sheet này giúp kiểm tra từng số liệu: nội dung nào đã được đưa vào báo cáo, nội dung nào không thuộc phạm vi quý II và điểm nào cần xác minh thêm.";
  ws.getCell("A2").font = { name: "Aptos", size: 10, color: { argb: COLORS.gray700 } };
  ws.getCell("A2").fill = solid(COLORS.tealLight);
  ws.getCell("A2").alignment = { vertical: "middle", wrapText: true };
  ws.getRow(2).height = 28;
  ws.mergeCells("A3:N3");
  ws.getCell("A3").value = "Cách đọc: ĐƯA VÀO BÁO CÁO = đã tính điểm; KHÔNG ĐƯA VÀO = không đáp ứng điều kiện quý II; CẦN KIỂM TRA = dữ liệu còn thiếu hoặc chưa thống nhất; ĐỐI CHIẾU PHÂN CÔNG = tổng testcase được giao cho từng người.";
  ws.getCell("A3").font = { name: "Aptos", size: 9, italic: true, color: { argb: COLORS.tealDark } };
  ws.getCell("A3").alignment = { vertical: "middle", wrapText: true };
  ws.getRow(3).height = 30;
  ws.mergeCells("A4:N4");
  ws.getCell("A4").value = `File dữ liệu dùng để lập báo cáo: ${model.sourceWorkbook} · Dữ liệu công việc được đối chiếu với hệ thống tại thời điểm xuất báo cáo.`;
  ws.getCell("A4").font = { name: "Aptos", size: 9, color: { argb: COLORS.gray500 } };
  ws.getCell("A4").alignment = { vertical: "middle" };
  ws.getRow(4).height = 22;

  const headers = ["Kết luận", "Loại dữ liệu", "Mã dữ liệu", "Mã công việc/Jira", "Họ và tên", "Công việc/hoạt động", "Từ ngày", "Đến ngày", "Số mục đối chiếu", "Trọng số", "% Hoàn thành", "Dòng trong báo cáo", "Nội dung cần lưu ý", "Căn cứ/Kết quả đối chiếu"];
  ws.getRow(5).values = headers;
  styleHeader(ws.getRow(5));
  ws.getRow(5).height = 42;
  model.entries.forEach((entry) => {
    ws.addRow(["ĐƯA VÀO BÁO CÁO", friendlySourceName(entry.source), entry.sourceId, entry.sourceCode, entry.personName, entry.activity, entry.startDate, entry.endDate, entry.sourceCount, entry.weight, entry.completion, entry.reportRow, entry.warning, entry.basis]);
  });
  model.audit.excludedTasks.forEach((task) => {
    ws.addRow(["KHÔNG ĐƯA VÀO", friendlySourceName("Task_Master"), task.id, task.taskId, task.assignee, task.title, task.startDate, task.completedDate || task.deadline, 1, "", number(task.progress) / 100, "", exclusionReason(task), clean(task.description) || "Không có mô tả bổ sung."]);
  });
  model.audit.dailyRows.filter((row) => !row.executed).forEach((row) => {
    ws.addRow(["CẦN KIỂM TRA", friendlySourceName("DieuHanh_Ngay"), row.id, row.jiraCode, row.personName, row.feature, row.date, row.date, 1, "", 0, "", `Có ${row.total} testcase nhưng chưa có kết quả Đạt/Không đạt nên chưa được tính điểm.`, clean(row.blocker) || clean(row.bugDetail) || "Chưa có nội dung giải thích."]);
  });
  model.audit.planByPerson.forEach((plan, key) => {
    ws.addRow(["ĐỐI CHIẾU PHÂN CÔNG", friendlySourceName("PhanCong_UAT"), `plan:${key}`, [...plan.jiraCodes].join(", "), plan.tester.name, "Tổng testcase được giao trong quý II", [...plan.dates].sort()[0] || "", [...plan.dates].sort().at(-1) || "", plan.rows.length, "", "", "", "Tính theo đúng tên người được ghi trong kế hoạch phân công; không suy đoán từ mã nhân sự cũ.", `${plan.tester.name} được giao ${plan.cases} testcase trong quý II/2026.`]);
  });
  model.audit.warnings.forEach((warning) => ws.addRow(["CẦN KIỂM TRA", "Kiểm tra tự động", "", "", "", "", "", "", "", "", "", "", warning, "Đề nghị đối chiếu lại với người cập nhật dữ liệu trước khi dùng làm căn cứ chính thức."]));
  ws.columns.forEach((column, index) => { column.width = [14, 18, 28, 32, 24, 42, 14, 14, 14, 12, 15, 14, 48, 56][index] || 18; });
  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= 5) return;
    row.eachCell((cell) => {
      cell.font = { name: "Aptos", size: 9, color: { argb: COLORS.gray900 } };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = thinBorder(COLORS.gray200);
    });
    const status = String(row.getCell(1).value || "");
    row.getCell(1).font = { name: "Aptos", size: 9, bold: true, color: { argb: status === "CẦN KIỂM TRA" ? COLORS.red : status === "KHÔNG ĐƯA VÀO" ? COLORS.gray700 : COLORS.tealDark } };
    row.getCell(1).fill = solid(status === "CẦN KIỂM TRA" ? COLORS.redLight : status === "KHÔNG ĐƯA VÀO" ? COLORS.gray100 : COLORS.tealLight);
    row.height = 34;
  });
  ws.getColumn(10).numFmt = "0.00%";
  ws.getColumn(11).numFmt = "0.00%";
  ws.autoFilter = { from: "A5", to: `N${ws.rowCount}` };
  ws.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.1, footer: 0.1 },
    printTitlesRow: "1:5",
    printArea: `A1:N${ws.rowCount}`
  };
}

function friendlySourceName(source) {
  return ({
    Task_Master: "Công việc trên hệ thống",
    PhanCong_UAT: "Kế hoạch phân công kiểm thử",
    DieuHanh_Ngay: "Kết quả kiểm thử hằng ngày",
    DEFECT_LOG: "Danh sách lỗi UAT",
    NhanSu_UAT: "Danh sách nhân sự"
  })[source] || source || "Dữ liệu tổng hợp";
}

function exclusionReason(task) {
  if (!inQ2(task.startDate)) return "Ngày giao việc không thuộc quý II/2026";
  if (clean(task.completedDate) && !inQ2(task.completedDate)) return "Ngày hoàn thành không thuộc quý II/2026";
  if (!clean(task.completedDate) && !inQ2(task.deadline)) return "Chưa hoàn thành và deadline không thuộc quý II/2026";
  return "Không đáp ứng quy tắc chọn báo cáo quý II";
}

function styleHeader(row, firstColumn = 1, lastColumn = row.cellCount || 14) {
  for (let column = firstColumn; column <= lastColumn; column += 1) {
    const cell = row.getCell(column);
    cell.font = { name: "Aptos", size: 9, bold: true, color: { argb: COLORS.white } };
    cell.fill = solid(COLORS.teal);
    cell.border = thinBorder(COLORS.white);
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  }
}

function styleReportDataRow(row, personIndex) {
  row.eachCell({ includeEmpty: true }, (cell, column) => {
    cell.font = { name: "Aptos", size: 9, color: { argb: COLORS.gray900 }, bold: [1, 2, 7].includes(column) };
    cell.fill = solid(personIndex % 2 ? COLORS.gray100 : COLORS.white);
    cell.border = thinBorder(COLORS.gray300);
    cell.alignment = { vertical: "top", horizontal: [1, 8, 13, 14].includes(column) ? "center" : "left", wrapText: true };
  });
  row.getCell(8).numFmt = "0.00%";
  row.getCell(13).numFmt = "0.00%";
  row.getCell(14).numFmt = "0.00";
  row.getCell(12).font = { name: "Aptos", size: 9, color: { argb: COLORS.blue }, underline: row.getCell(12).value?.hyperlink ? true : false };
}

function sectionTitle(cell) {
  cell.font = { name: "Aptos Display", size: 11, bold: true, color: { argb: COLORS.tealDark } };
  cell.fill = solid(COLORS.tealLight);
  cell.alignment = { vertical: "middle" };
}

function solid(argb) {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function thinBorder(argb) {
  const side = { style: "thin", color: { argb } };
  return { top: side, left: side, bottom: side, right: side };
}

function outlineBorder(argb) {
  const side = { style: "medium", color: { argb } };
  return { top: side, left: side, bottom: side, right: side };
}

function groupBy(rows, keySelector) {
  const map = new Map();
  rows.forEach((row) => {
    const key = keySelector(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });
  return map;
}

function ownerName(owner) {
  return clean(owner).replace(/^NV\d+\s*-\s*/i, "");
}

function identityKey(value) {
  return clean(value).normalize("NFC").toLocaleLowerCase("vi");
}

function clean(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function number(value) {
  const result = Number(value || 0);
  return Number.isFinite(result) ? result : 0;
}

function inQ2(value) {
  const text = clean(value).slice(0, 10);
  return text >= Q2_START && text <= Q2_END;
}

function displayDate(value) {
  const text = clean(value).slice(0, 10);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : text || "-";
}

function formatPercent(value) {
  return `${round2(number(value) * 100).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function round2(value) {
  return Math.round((number(value) + Number.EPSILON) * 100) / 100;
}
