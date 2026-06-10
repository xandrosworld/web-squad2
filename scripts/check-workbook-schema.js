const fs = require("fs");
const path = require("path");

const ExcelJS = require("exceljs");
const { buildExcelWorkbook, parseWorkbookImportState } = require("../server");

const workbookPath = path.resolve(process.argv[2] || "SQ02_UAT_Squad2_QuanLy_HoanChinh_US_Date (1).xlsm");

const expectedHeaders = {
  DM_ChucNang: ["STT", "Mã CN", "Mã Story", "Mã Jira", "Nhóm chức năng", "Tên chức năng", "Sprint", "Đầu mối nghiệp vụ", "Ngày BG UAT", "Trạng thái BG", "Tổng TC", "Passed", "Failed", "Blocked", "Defect Open", "Blocker Open", "Critical Open", "Kết quả UAT", "Trạng thái UAT", "% Hoàn thành TC"],
  Lich_BG_US: ["Mã Jira", "Mã CN", "Mã Story", "Tên chức năng", "Sprint", "BG UAT", "Bắt đầu UAT", "Kết thúc UAT", "Trạng thái BG", "Trạng thái UAT"],
  PhanCong_UAT: ["Mã CN", "Mã Jira", "Nhóm chức năng", "Tên chức năng", "Sprint", "Bàn giao UAT", "Đầu mối nghiệp vụ", "NV", "T1", "T2", "T3", "T4", "T5", "T6", "Tổng Testcase", "Trạng thái kiểm thử", "% hoàn thành", "Trạng thái UAT", "Trạng thái DEV", "Mức độ ưu tiên"],
  DieuHanh_Ngay: ["Ngày", "Mã Jira", "Tên chức năng", "Sprint", "Tester", "Tổng TC", "TC Passed", "TC Failed", "Trạng thái lỗi", "Mức độ lỗi", "Vướng mắc/Blocker", "Người xử lý", "Thời hạn xử lý"],
  DEFECT_LOG: ["Bug ID", "Mã Jira", "Tên Story", "Sprint", "Severity", "Status", "Ngày phát hiện", "Tester", "Owner", "Ngày xử lý", "Aging", "Ghi chú"],
  ChatLuong_Tuan: ["Tuần", "Sprint", "Tổng Story", "Story đã test", "Coverage %", "Pass Rate %", "Blocker Open", "Critical Open", "Reopen Rate", "Đánh giá"],
  TongKet_Sprint: ["Sprint", "Tổng Story", "Story đã bàn giao", "Tỷ lệ bao phủ", "Pass Rate %", "Blocker Open", "Critical Open", "Major Open", "Reopen Rate", "Quyết định"],
  NangSuat_Tester: ["Nhóm chức năng", "T1", "T2", "T3", "T4", "T5", "T6", "Tổng lượt tham gia", "Mục tiêu", "Cảnh báo"]
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

async function main() {
  if (!fs.existsSync(workbookPath)) throw new Error(`Workbook not found: ${workbookPath}`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);

  for (const [sheetName, expected] of Object.entries(expectedHeaders)) {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) throw new Error(`Missing sheet ${sheetName}`);
    const headerRow = sheetName === "DM_ChucNang" || sheetName === "DEFECT_LOG" || sheetName === "ChatLuong_Tuan" || sheetName === "TongKet_Sprint"
      ? 1
      : 3;
    const actual = readHeader(worksheet, sheetName === "Lich_BG_US" ? 5 : headerRow, expected.length);
    assertSameList(sheetName, expected, actual);
  }

  const state = await parseWorkbookImportState(fs.readFileSync(workbookPath));
  const totalCases = sum(state.plans, "totalCases");
  const featureTotalCases = sum(state.features, "totalCases");
  const deliveredStories = state.handoffs.filter((row) => row.uatHandoff).length;
  if (state.features.length !== 77) throw new Error(`Expected 77 DM_ChucNang rows, got ${state.features.length}`);
  if (state.handoffs.length !== 77) throw new Error(`Expected 77 Lich_BG_US rows, got ${state.handoffs.length}`);
  if (state.plans.length !== 77) throw new Error(`Expected 77 PhanCong_UAT rows, got ${state.plans.length}`);
  if (state.weekly.length !== 17) throw new Error(`Expected 17 ChatLuong_Tuan rows, got ${state.weekly.length}`);
  if (state.readiness.length !== 17) throw new Error(`Expected 17 TongKet_Sprint rows, got ${state.readiness.length}`);
  if (state.matrix.length !== 12) throw new Error(`Expected 12 NangSuat_Tester rows, got ${state.matrix.length}`);
  if (deliveredStories !== 37) throw new Error(`Expected 37 delivered stories, got ${deliveredStories}`);
  if (totalCases !== 2414 || featureTotalCases !== 2414) {
    throw new Error(`Expected total testcase 2414, got plans=${totalCases}, features=${featureTotalCases}`);
  }
  assertHandoffSections(state.handoffs);

  const exportedWorkbook = buildExcelWorkbook(state);
  for (const sheetName of Object.keys(expectedHeaders)) {
    if (!exportedWorkbook.getWorksheet(sheetName)) throw new Error(`Export missing sheet ${sheetName}`);
  }

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

function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}
