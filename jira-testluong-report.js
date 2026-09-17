const ExcelJS = require("exceljs");
const { buildWeekPeriods } = require("./jira-weekly-dashboard");

const ZONE = "Asia/Ho_Chi_Minh";
const HEADER = "086765";
const PALE = "EDF8F7";
const TEXT = "253247";
const JIRA_KEY = /^[A-Z][A-Z0-9]+-\d+$/;

function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE, day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).format(date).replace(",", "");
}

function localDateKey(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit"
  }).format(value);
}

function issueSquads(issue) {
  return [...new Set((issue.components || []).flatMap((component) =>
    [...String(component).matchAll(/\bSQ\s*0*(\d{1,2})\b/gi)].map((match) => `SQ${match[1].padStart(2, "0")}`)
  ))].sort();
}

function formatIssue(issue) {
  return {
    ...issue,
    squads: issueSquads(issue),
    childOf: Array.isArray(issue.childOf) ? issue.childOf.join(", ") : String(issue.childOf || "")
  };
}

function title(sheet, heading, subtitle, width) {
  sheet.mergeCells(1, 1, 1, width);
  sheet.getCell("A1").value = heading;
  sheet.getCell("A1").font = { name: "Aptos Display", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${HEADER}` } };
  sheet.getRow(1).height = 35;
  sheet.mergeCells(2, 1, 2, width);
  sheet.getCell("A2").value = subtitle;
  sheet.getCell("A2").font = { name: "Aptos", size: 10, color: { argb: "FF5E6C7C" } };
  sheet.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PALE}` } };
  sheet.getRow(2).height = 25;
}

function header(row) {
  row.height = 28;
  row.eachCell((cell) => {
    cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${HEADER}` } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
}

function detailSheet(workbook, name, issues, report) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 3, xSplit: 3 }] });
  [7, 18, 23, 70, 18, 13, 33, 33, 19, 20, 20, 20, 22, 22, 19, 22]
    .forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  const heading = name === "TAT_CA_BUG" ? "TOÀN BỘ BUG TESTLUONG"
    : name === "BUG_TUAN_NAY" ? "BUG TESTLUONG PHÁT SINH TRONG TUẦN" : `BUG TESTLUONG · ${name}`;
  title(sheet, heading, `Nguồn Jira · ${issues.length} bug · Đồng bộ ${localDateTime(report.syncedAt)} · Bao gồm mọi trạng thái`, 16);
  sheet.addRow(["STT", "Squad", "Bug ID", "Tên Bug", "Trạng thái", "Mức độ", "Người xử lý", "Người tạo", "Component", "Labels", "Epic/Parent", "Child Of", "Ngày tạo", "Ngày cập nhật", "Resolution", "Link Jira"]);
  header(sheet.getRow(3));
  issues.forEach((issue, index) => {
    const link = `${report.browseBaseUrl}${encodeURIComponent(issue.key)}`;
    const row = sheet.addRow([
      index + 1, issue.squads.join(", ") || "Chưa phân loại",
      { text: issue.key, hyperlink: link }, issue.summary || "", issue.status || "",
      issue.priority || "", issue.assignee || "", issue.reporter || "",
      (issue.components || []).join(", "), (issue.labels || []).join(", "),
      issue.parentKey || "", issue.childOf || "", localDateTime(issue.createdAt),
      localDateTime(issue.updatedAt), issue.resolution || "",
      { text: "Mở trên Jira", hyperlink: link }
    ]);
    row.height = 36;
    row.eachCell((cell) => {
      cell.font = { name: "Aptos", size: 10, color: { argb: `FF${TEXT}` } };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 ? "FFF6F8FA" : "FFFFFFFF" } };
      cell.border = { bottom: { style: "hair", color: { argb: "FFE3E9ED" } } };
    });
    [3, 16].forEach((column) => { row.getCell(column).font = { name: "Aptos", size: 10, underline: true, bold: true, color: { argb: "FF086895" } }; });
    if (issue.priority === "Blocker") row.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE9E9" } };
  });
  sheet.autoFilter = { from: "A3", to: `P${Math.max(3, issues.length + 3)}` };
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return sheet;
}

function buildJiraTestluongWorkbook(report, now = new Date()) {
  if (!report?.syncedAt || !Array.isArray(report.issues) || !report.browseBaseUrl) {
    throw new Error("Thiếu dữ liệu Jira đã đồng bộ để xuất báo cáo.");
  }
  const issues = report.issues.map(formatIssue).sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt) || String(a.key).localeCompare(String(b.key))
  );
  const keys = issues.map((issue) => issue.key);
  if (new Set(keys).size !== issues.length || keys.some((key) => !JIRA_KEY.test(key))) {
    throw new Error("Dữ liệu Jira có mã bug trùng hoặc không hợp lệ.");
  }
  if (issues.some((issue) => !(issue.labels || []).some((label) => String(label).toLowerCase() === String(report.label).toLowerCase()))) {
    throw new Error("Dữ liệu Jira có bug không mang label TESTLUONG.");
  }
  const squads = [...new Set(issues.flatMap((issue) => issue.squads))].sort();
  const multi = issues.filter((issue) => issue.squads.length > 1);
  const unmapped = issues.filter((issue) => !issue.squads.length);
  const statuses = Object.entries(issues.reduce((result, issue) => {
    const status = issue.status || "Chưa xác định";
    result[status] = (result[status] || 0) + 1;
    return result;
  }, {})).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const closed = issues.filter((issue) => String(issue.status).toLowerCase() === "closed").length;
  const cancelled = issues.filter((issue) => ["cancelled", "canceled"].includes(String(issue.status).toLowerCase())).length;
  const reportingWeek = buildWeekPeriods(new Date(report.syncedAt)).at(-1);
  const weekIssues = reportingWeek ? issues.filter((issue) =>
    new Date(issue.createdAt) > new Date(reportingWeek.startAt) &&
    new Date(issue.createdAt) <= new Date(reportingWeek.evaluatedAt)
  ) : [];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Squad 2 UAT Dashboard";
  workbook.created = now;

  const summary = workbook.addWorksheet("TONG_HOP", { views: [{ state: "frozen", ySplit: 3 }] });
  [36, 19, 62, 18, 18, 18].forEach((width, index) => { summary.getColumn(index + 1).width = width; });
  title(summary, "BÁO CÁO BUG CÓ LABEL TESTLUONG", `Dữ liệu Jira đã đồng bộ ${localDateTime(report.syncedAt)} · Bao gồm mọi trạng thái`, 6);
  const jql = `project = ${report.projectKey} AND issuetype = Bug AND labels = ${report.label} ORDER BY created DESC`;
  summary.getCell("A3").value = { text: "Mở truy vấn nguồn trên Jira", hyperlink: `${report.browseBaseUrl.replace(/\/browse\/$/, "/issues/")}?jql=${encodeURIComponent(jql)}` };
  summary.getCell("A3").font = { underline: true, bold: true, color: { argb: "FF086895" } };
  summary.addRow([]);
  summary.addRow(["Tổng bug", "Còn tồn", "Closed", "Cancelled", "Số Squad", "Bug đa Squad"]); header(summary.getRow(5));
  summary.addRow([issues.length, issues.length - closed - cancelled, closed, cancelled, squads.length, multi.length]);
  summary.getRow(6).font = { size: 15, bold: true, color: { argb: `FF${HEADER}` } };
  summary.addRow([]);
  summary.addRow(["KỲ BÁO CÁO TUẦN NÀY"]); header(summary.getRow(8));
  summary.addRow(["Bắt đầu", reportingWeek ? localDateTime(reportingWeek.startAt) : ""]);
  summary.addRow(["Chốt tuần", reportingWeek ? localDateTime(reportingWeek.cutoffAt) : "", reportingWeek?.finalized ? "Đã chốt" : "Tạm tính theo lần đồng bộ gần nhất"]);
  summary.addRow(["Bug mới log trong tuần", weekIssues.length, "Xem sheet BUG_TUAN_NAY"]);
  summary.addRow([]);
  summary.addRow(["PHÂN BỔ THEO SQUAD"]); header(summary.getRow(13));
  summary.addRow(["Squad", "Số bug", "Tỷ lệ trên tổng"]); header(summary.getRow(14));
  let rowNumber = 15;
  squads.forEach((squad) => {
    const count = issues.filter((issue) => issue.squads.includes(squad)).length;
    summary.addRow([squad, count, issues.length ? count / issues.length : 0]);
    summary.getCell(`C${rowNumber}`).numFmt = "0.0%";
    rowNumber += 1;
  });
  rowNumber += 1;
  summary.getCell(`A${rowNumber}`).value = "PHÂN BỔ THEO TRẠNG THÁI"; header(summary.getRow(rowNumber));
  rowNumber += 1;
  summary.getRow(rowNumber).values = ["Trạng thái", "Số bug", "Ghi chú"]; header(summary.getRow(rowNumber));
  statuses.forEach(([status, count]) => {
    rowNumber += 1;
    summary.getRow(rowNumber).values = [status, count,
      ["closed", "cancelled", "canceled"].includes(status.toLowerCase()) ? "Không tính vào Còn tồn" : "Đang theo dõi"];
  });

  const audit = workbook.addWorksheet("KIEM_TOAN");
  [36, 45, 28, 17, 95].forEach((width, index) => { audit.getColumn(index + 1).width = width; });
  title(audit, "KIỂM TOÁN DỮ LIỆU", `${report.projectKey} · ${report.label} · Đồng bộ ${localDateTime(report.syncedAt)}`, 5);
  audit.addRow(["Hạng mục kiểm tra", "Kỳ vọng", "Kết quả", "Đánh giá", "Chi tiết"]); header(audit.getRow(3));
  const allocations = issues.reduce((sum, issue) => sum + issue.squads.length, 0);
  [
    ["Tổng bug từ cache Jira", issues.length, issues.length, "ĐẠT", "Xuất trực tiếp từ dữ liệu đã đồng bộ; không chờ Jira khi tải"],
    ["Mã bug duy nhất", issues.length, new Set(keys).size, "ĐẠT", ""],
    ["Đúng label TESTLUONG", issues.length, issues.filter((issue) => (issue.labels || []).some((label) => String(label).toLowerCase() === String(report.label).toLowerCase())).length, "ĐẠT", ""],
    ["Có ít nhất một Squad", issues.length, issues.length - unmapped.length, unmapped.length ? "LƯU Ý" : "ĐẠT", unmapped.map((issue) => issue.key).join(", ")],
    ["Link Jira hợp lệ", issues.length, issues.filter((issue) => JIRA_KEY.test(issue.key)).length, "ĐẠT", ""],
    ["Tổng lượt phân bổ Squad", allocations, squads.reduce((sum, squad) => sum + issues.filter((issue) => issue.squads.includes(squad)).length, 0), "ĐẠT", "Bug đa Squad xuất hiện ở từng sheet liên quan"],
    ["Bug đa Squad", multi.length, multi.length, "ĐẠT", multi.map((issue) => `${issue.key}: ${issue.squads.join(", ")}`).join("; ")],
    ["Tổng trạng thái", issues.length, statuses.reduce((sum, [, count]) => sum + count, 0), "ĐẠT", ""]
  ].forEach((row) => audit.addRow(row));
  audit.addRow([]);
  audit.addRow(["Điều kiện nguồn", jql]);
  audit.addRow(["Thời điểm đồng bộ", localDateTime(report.syncedAt)]);
  audit.addRow(["Quy ước", "Giữ mọi trạng thái. Closed và Cancelled tách riêng khỏi Còn tồn. Bug đa Squad chỉ có một dòng ở TAT_CA_BUG."]);
  audit.getColumn(5).alignment = { wrapText: true, vertical: "middle" };

  detailSheet(workbook, "TAT_CA_BUG", issues, report);
  detailSheet(workbook, "BUG_TUAN_NAY", weekIssues, report);
  squads.forEach((squad) => detailSheet(workbook, squad, issues.filter((issue) => issue.squads.includes(squad)), report));
  return {
    workbook,
    filename: `Bao_cao_bug_TESTLUONG_theo_Squad_${localDateKey(now)}.xlsx`,
    total: issues.length,
    squadAllocations: allocations
  };
}

module.exports = { buildJiraTestluongWorkbook, issueSquads, localDateTime };
