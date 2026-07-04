const fs = require("fs");
const path = require("path");

const ExcelJS = require("exceljs");
const { buildExcelWorkbook, parseWorkbookImportState } = require("../server");

const workbookPath = path.resolve(process.argv[2] || "SQ02_UAT_Squad2_QuanLy_US_Date-2.7.xlsx");

const expectedHeaders = {
  NhanSu_UAT: ["Mã nhân sự", "Họ tên", "Vai trò", "Phạm vi chính", "Trạng thái", "Năm sinh", "SĐT", "Email", "Đơn vị"],
  HD_UAT: ["STT", "Nội dung", "Cách sử dụng"],
  Lich_UAT: ["Sprint", "Bắt đầu DEV", "Kết thúc DEV", "Bàn giao UAT", "Bắt đầu UAT", "Kết thúc UAT", "Ghi chú"],
  DM_ChucNang: ["STT", "Mã CN", "Mã Story", "Mã Jira", "Nhóm chức năng", "Tên chức năng", "Sprint", "Đầu mối nghiệp vụ", "Ngày BG UAT", "Trạng thái BG", "Tổng TC", "Passed", "Failed", "Blocked", "Defect Open", "Blocker Open", "Critical Open", "Kết quả UAT", "Trạng thái UAT", "% Hoàn thành TC"],
  Lich_BG_US: ["Mã Jira", "Mã CN", "Mã Story", "Tên chức năng", "Sprint", "BG UAT", "Bắt đầu UAT", "Kết thúc UAT", "Trạng thái BG", "Trạng thái UAT"],
  PhanCong_UAT: ["Mã CN", "Mã Jira", "Nhóm chức năng", "Tên chức năng", "Sprint", "Bàn giao UAT", "Đầu mối nghiệp vụ", "NV", "T1", "T2", "T3", "T4", "T5", "T6", "Tổng Testcase", "Trạng thái kiểm thử", "% hoàn thành", "Trạng thái UAT", "Trạng thái DEV", "Mức độ ưu tiên", "Ghi chú"],
  DieuHanh_Ngay: ["Ngày", "Mã Jira", "Tên chức năng", "Sprint", "Tester", "Tổng TC", "TC Passed", "TC Failed", "Trạng thái lỗi", "Mức độ lỗi", "Chi tiết lỗi", "Vướng mắc/Blocker", "Người xử lý", "Thời hạn xử lý"],
  DEFECT_LOG: ["STT", "Bug ID", "Mã US liên kết", "Tên Story", "Sprint", "Severity", "Status", "Ngày phát hiện", "Tester", "Owner", "Ngày xử lý", "Aging", "Ghi chú"],
  DS_US: ["", "Issue Type", "Issue key", "Issue id", "Summary", "Assignee", "Assignee Id", "Reporter", "Reporter Id", "Priority", "Status", "Resolution", "Created", "Updated", "Due date", "SQ2_Summary"],
  "DS.Loi": ["", "", "Issue Type", "Issue key", "Issue id", "Summary", "Assignee", "Assignee Id", "Reporter", "Reporter Id", "Priority", "Status", "Resolution", "Created", "Updated", "Due date", "Custom field (Actual end)", "Time Spent", "Inward issue link (Blocks)", "Inward issue link (Parent of)"],
  "Tong hop loi": ["STT", "Mã CN", "Mã Story", "Mã Jira", "Mã US", "Nhóm chức năng", "Tên chức năng", "Sprint", "Đầu mối nghiệp vụ", "Ngày BG UAT", "Trạng thái BG", "Assignee", "Trạng thái US", "Tổng TC", "Passed", "Failed", "Blocked", "Defect Open", "Blocker Open", "Critical Open", "Tổng lỗi", "Open", "In Progress", "Pending", "Resolved", "SIT Pass", "Khác", "Đang mở", "Đã xử lý", "% xử lý", "Lỗi nghiêm trọng", "Kết quả UAT", "Trạng thái UAT", "% Hoàn thành TC"],
  ChatLuong_Tuan: ["Tuần", "Sprint", "Tổng Story", "Story đã test", "Coverage %", "Pass Rate %", "Blocker Open", "Critical Open", "Reopen Rate", "Đánh giá"],
  TongKet_Sprint: ["Sprint", "Tổng Story", "Story đã bàn giao", "Tỷ lệ bao phủ", "Pass Rate %", "Blocker Open", "Critical Open", "Major Open", "Reopen Rate", "Quyết định"],
  NangSuat_Tester: ["Nhóm chức năng", "T1", "T2", "T3", "T4", "T5", "T6", "Tổng lượt tham gia", "Mục tiêu", "Cảnh báo"]
};

const expectedWorkbookSheets = [
  "Dashboard_UAT",
  "DEFECT_Dashboard",
  "NhanSu_UAT",
  "HD_UAT",
  "DM_ChucNang",
  "Lich_UAT",
  "Lich_BG_US",
  "PhanCong_UAT",
  "DieuHanh_Ngay",
  "DEFECT_LOG",
  "ChatLuong_Tuan",
  "TongKet_Sprint",
  "NangSuat_Tester",
  "Tong hop loi",
  "DS_US",
  "DS.Loi"
];
const expectedExportSheets = [...expectedWorkbookSheets, "KeHoach_CongViec"];

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

async function main() {
  if (!fs.existsSync(workbookPath)) throw new Error(`Workbook not found: ${workbookPath}`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  assertSameList("source workbook sheets", expectedWorkbookSheets, workbook.worksheets.map((sheet) => sheet.name));
  if (workbook.getWorksheet("Lich_UAT").state !== "hidden") throw new Error("Expected source Lich_UAT sheet to be hidden.");
  for (const redSheetName of ["DS_US", "DS.Loi"]) {
    const tabColor = workbook.getWorksheet(redSheetName).properties?.tabColor?.argb;
    if (tabColor !== "FFFF0000") throw new Error(`Expected source ${redSheetName} tab color FFFF0000, got ${tabColor || "none"}.`);
  }

  for (const [sheetName, expected] of Object.entries(expectedHeaders)) {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) throw new Error(`Missing sheet ${sheetName}`);
    const headerRow = sheetName === "DM_ChucNang" || sheetName === "DEFECT_LOG" || sheetName === "ChatLuong_Tuan" || sheetName === "TongKet_Sprint" || sheetName === "DS_US" || sheetName === "DS.Loi" || sheetName === "Tong hop loi"
      ? 1
      : 3;
    const actual = readHeader(worksheet, sheetName === "Lich_BG_US" ? 5 : headerRow, expected.length);
    assertSameList(sheetName, expected, actual);
  }

  const state = await parseWorkbookImportState(fs.readFileSync(workbookPath));
  const totalCases = sum(state.plans, "totalCases");
  const featureTotalCases = sum(state.features, "totalCases");
  const deliveredStories = state.handoffs.filter((row) => row.uatHandoff).length;
  if (state.personnel.length !== 10) throw new Error(`Expected 10 NhanSu_UAT rows, got ${state.personnel.length}`);
  if (state.schedule.length !== 17) throw new Error(`Expected 17 Lich_UAT rows, got ${state.schedule.length}`);
  if (state.features.length !== 77) throw new Error(`Expected 77 DM_ChucNang source rows, got ${state.features.length}`);
  if (state.handoffs.length !== 77) throw new Error(`Expected 77 Lich_BG_US source rows, got ${state.handoffs.length}`);
  if (state.plans.length !== 77) throw new Error(`Expected 77 PhanCong_UAT source rows, got ${state.plans.length}`);
  if (state.daily.length !== 26) throw new Error(`Expected 26 DieuHanh_Ngay rows, got ${state.daily.length}`);
  if (state.defects.length !== 64) throw new Error(`Expected 64 DEFECT_LOG rows, got ${state.defects.length}`);
  if (state.userStories.length !== 84) throw new Error(`Expected 84 DS_US rows, got ${state.userStories.length}`);
  if (state.bugSources.length !== 64) throw new Error(`Expected 64 DS.Loi rows, got ${state.bugSources.length}`);
  if (state.defectSummary.length !== 77) throw new Error(`Expected 77 Tong hop loi rows, got ${state.defectSummary.length}`);
  if (state.weekly.length !== 16) throw new Error(`Expected 16 ChatLuong_Tuan rows, got ${state.weekly.length}`);
  if (state.readiness.length !== 16) throw new Error(`Expected 16 TongKet_Sprint rows, got ${state.readiness.length}`);
  if (state.matrix.length !== 12) throw new Error(`Expected 12 NangSuat_Tester rows, got ${state.matrix.length}`);
  if (state.guide.length !== 34) throw new Error(`Expected 34 HD_UAT guide rows, got ${state.guide.length}`);
  if (!state.guide.some((row) => row.category === "Blocker" && row.note)) throw new Error("HD_UAT priority convention column was not imported.");
  if (!state.daily.some((row) => Array.isArray(row.blockerLinks) && row.blockerLinks.length)) throw new Error("DieuHanh_Ngay blocker hyperlinks were not imported.");
  if (deliveredStories !== 47) throw new Error(`Expected 47 delivered stories, got ${deliveredStories}`);
  if (totalCases !== 2704) {
    throw new Error(`Expected PhanCong_UAT total testcase 2704, got plans=${totalCases}`);
  }
  if (featureTotalCases !== 186) {
    throw new Error(`Expected DM_ChucNang daily-driven total testcase 186, got features=${featureTotalCases}`);
  }
  assertUpdatedWorkbookCalculations(state);
  assertHandoffSections(state.handoffs);

  const exportedWorkbook = buildExcelWorkbook(state);
  const actualExportSheets = exportedWorkbook.worksheets.map((sheet) => sheet.name);
  assertSameList("exported workbook sheets", expectedExportSheets, actualExportSheets);
  if (exportedWorkbook.getWorksheet("Lich_UAT").state !== "hidden") throw new Error("Expected exported Lich_UAT sheet to be hidden.");
  for (const redSheetName of ["DS_US", "DS.Loi"]) {
    const tabColor = exportedWorkbook.getWorksheet(redSheetName).properties?.tabColor?.argb;
    if (tabColor !== "FFFF0000") throw new Error(`Expected exported ${redSheetName} tab color FFFF0000, got ${tabColor || "none"}.`);
  }
  for (const sheetName of Object.keys(expectedHeaders)) {
    if (!exportedWorkbook.getWorksheet(sheetName)) throw new Error(`Export missing sheet ${sheetName}`);
  }
  const workPlanSheet = exportedWorkbook.getWorksheet("KeHoach_CongViec");
  if (!workPlanSheet) throw new Error("Export missing sheet KeHoach_CongViec");
  assertSameList(
    "KeHoach_CongViec headers",
    ["Loại dòng", "STT", "Nhóm công việc", "Tên công việc", "Mô tả", "Người phụ trách", "Email phụ trách", "Người phối hợp", "Trạng thái", "% hoàn thành", "Ưu tiên", "Ngày bắt đầu", "Deadline", "Ngày hoàn thành", "Cảnh báo", "Link tài liệu", "Vướng mắc/Ghi chú", "Cập nhật"],
    readHeader(workPlanSheet, 12, 18)
  );
  assertExportCell(exportedWorkbook, "Dashboard_UAT", "B4", 77);
  assertExportCell(exportedWorkbook, "Dashboard_UAT", "B5", 47);
  assertExportCell(exportedWorkbook, "Dashboard_UAT", "B7", "61%");
  assertExportCell(exportedWorkbook, "Dashboard_UAT", "B14", "31%");
  assertExportCell(exportedWorkbook, "DEFECT_Dashboard", "B4", 64);
  assertExportCell(exportedWorkbook, "DEFECT_Dashboard", "B12", "0.10%");
  assertExportCell(exportedWorkbook, "DEFECT_Dashboard", "B22", 49);
  assertExportCell(exportedWorkbook, "DEFECT_Dashboard", "B26", "69.39%");

  console.log(JSON.stringify({
    ok: true,
    workbook: path.basename(workbookPath),
    imported: {
      features: state.features.length,
      personnel: state.personnel.length,
      schedule: state.schedule.length,
      handoffs: state.handoffs.length,
      plans: state.plans.length,
      daily: state.daily.length,
      defects: state.defects.length,
      userStories: state.userStories.length,
      bugSources: state.bugSources.length,
      defectSummary: state.defectSummary.length,
      weekly: state.weekly.length,
      readiness: state.readiness.length,
      matrix: state.matrix.length,
      guide: state.guide.length,
      deliveredStories,
      totalCases
    }
  }, null, 2));
}

function readHeader(worksheet, rowNumber, maxColumns) {
  const row = worksheet.getRow(rowNumber);
  const headers = [];
  for (let column = 1; column <= maxColumns; column += 1) {
    headers.push(cellText(row.getCell(column).value || row.getCell(column).text));
  }
  return headers;
}

function assertHandoffSections(handoffs) {
  const first = handoffs[0] || {};
  if (first.sectionLevel1 !== "Luồng quy trình") {
    throw new Error(`Lich_BG_US first data row has wrong level 1 section: ${first.sectionLevel1 || "-"}`);
  }
  if (first.sectionLevel2 !== "Tính năng gợi ý và lựa chọn cấp trình") {
    throw new Error(`Lich_BG_US first data row has wrong level 2 section: ${first.sectionLevel2 || "-"}`);
  }
  const hasNested = handoffs.some((row) => (
    row.sectionLevel1 === "Màn hình thẩm định"
    && row.sectionLevel2 === "Màn hình thẩm định - Khoản cấp tín dụng"
  ));
  if (!hasNested) throw new Error("Lich_BG_US missing nested section mapping.");
}

function assertUpdatedWorkbookCalculations(state) {
  const firstWeekly = state.weekly[0] || {};
  if (firstWeekly.sprint !== "Sprint 1&2" || firstWeekly.totalStories !== 1) {
    throw new Error(`ChatLuong_Tuan first row mismatch: ${JSON.stringify(firstWeekly)}`);
  }
  const firstReadiness = state.readiness[0] || {};
  if (firstReadiness.sprint !== "Sprint 1&2" || firstReadiness.deliveredStories !== 1) {
    throw new Error(`TongKet_Sprint first row mismatch: ${JSON.stringify(firstReadiness)}`);
  }
  const firstDefect = state.defects[0] || {};
  if (firstDefect.bugId !== "PS0142025-10272" || firstDefect.linkedUsKey !== "PS0142025-5937") {
    throw new Error(`DEFECT_LOG first row mismatch: ${JSON.stringify(firstDefect)}`);
  }
  const defectStatusCounts = countBy(state.defects, "status");
  if (defectStatusCounts.Open !== 15 || defectStatusCounts.Closed !== 17 || defectStatusCounts["SIT Pass"] !== 14) {
    throw new Error(`DEFECT_LOG status counts mismatch: ${JSON.stringify(defectStatusCounts)}`);
  }
  const sourceStatusCounts = countBy(state.bugSources, "status");
  if (sourceStatusCounts.Open !== 16 || sourceStatusCounts.Closed !== 17 || sourceStatusCounts["SIT Pass"] !== 14) {
    throw new Error(`DS.Loi status counts mismatch: ${JSON.stringify(sourceStatusCounts)}`);
  }
  const matrixParticipation = sum(state.matrix, "totalParticipation");
  if (matrixParticipation !== 162) {
    throw new Error(`NangSuat_Tester formula results were overwritten: totalParticipation=${matrixParticipation}`);
  }
  const cn001Summary = state.defectSummary.find((row) => row.jiraCode === "SQ02_CN001_001");
  if (!cn001Summary || cn001Summary.usKey !== "PS0142025-253") {
    throw new Error(`Tong hop loi linkage mismatch: ${JSON.stringify(cn001Summary)}`);
  }
}

function cellText(value) {
  if (value == null) return "";
  if (typeof value !== "object") return String(value).replace(/\s+/g, " ").trim();
  if (Object.prototype.hasOwnProperty.call(value, "result")) return cellText(value.result);
  if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("").replace(/\s+/g, " ").trim();
  if (typeof value.text === "string") return value.text.replace(/\s+/g, " ").trim();
  return "";
}

function assertSameList(label, expected, actual) {
  if (expected.length !== actual.length || expected.some((item, index) => item !== actual[index])) {
    throw new Error(`${label} mismatch.\nExpected: ${JSON.stringify(expected)}\nActual:   ${JSON.stringify(actual)}`);
  }
}

function assertExportCell(workbook, sheetName, address, expected) {
  const worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) throw new Error(`Export missing sheet ${sheetName}`);
  const actual = worksheet.getCell(address).value;
  if (actual !== expected) {
    throw new Error(`Export ${sheetName}!${address} expected ${expected}, got ${actual}`);
  }
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || "";
    if (value) acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}
