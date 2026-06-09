const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ExcelJS = require("exceljs");
const { buildExcelWorkbook, parseWorkbookImportState } = require("../server");

const workbookPath = path.resolve(process.argv[2] || "SQ02_UAT_Squad2_QuanLy_HoanChinh_US_Date.xlsm");

const sheetConfig = {
  personnel: ["NhanSu_UAT", 3],
  schedule: ["Lich_UAT", 3],
  handoffs: ["Lich_BG_US", 5],
  features: ["DM_ChucNang", 4],
  plans: ["PhanCong_UAT", 3],
  daily: ["DieuHanh_Ngay", 3],
  weekly: ["ChatLuong_Tuan", 3],
  readiness: ["TongKet_Sprint", 3],
  matrix: ["MaTran_NangLuc", 3]
};

const formulaColumnConfig = {
  Dashboard_UAT: ["B", "C", "D", "E", "F"],
  Lich_UAT: ["B", "C", "D", "E", "F"],
  Lich_BG_US: ["F", "H", "I"],
  DM_ChucNang: ["M", "P", "Q", "R", "U", "V", "W", "X"],
  PhanCong_UAT: ["E", "F", "O", "Q", "S"],
  DieuHanh_Ngay: ["B", "E"],
  ChatLuong_Tuan: ["E", "F", "G", "H", "I", "J", "K", "L", "M", "N"],
  TongKet_Sprint: ["B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"],
  MaTran_NangLuc: ["B", "C", "D", "E", "F", "G", "H", "J"]
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

async function main() {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`Workbook not found: ${workbookPath}`);
  }

  const modules = loadAppModules();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);

  for (const [moduleId, [sheetName, headerRow]] of Object.entries(sheetConfig)) {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) throw new Error(`Missing sheet ${sheetName}`);
    const expected = readHeader(worksheet, headerRow);
    const actual = modules[moduleId].columns.map((column) => column.label);
    assertSameList(`${moduleId}/${sheetName}`, expected, actual);
  }

  for (const [sheetName, expectedColumns] of Object.entries(formulaColumnConfig)) {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) throw new Error(`Missing sheet ${sheetName}`);
    assertSameList(`formulas/${sheetName}`, expectedColumns, readFormulaColumns(worksheet));
  }

  const state = await parseWorkbookImportState(fs.readFileSync(workbookPath));
  const exportedWorkbook = buildExcelWorkbook(state);
  const exportedFeatureSheet = exportedWorkbook.getWorksheet("01_DanhMuc_UAT");
  assertSameList(
    "export/01_DanhMuc_UAT",
    readHeader(workbook.getWorksheet("DM_ChucNang"), 4),
    readHeader(exportedFeatureSheet, 1)
  );

  const firstFeature = state.features[0] || {};
  const requiredFeatureKeys = [
    "stt",
    "code",
    "storyCode",
    "jiraCode",
    "group",
    "name",
    "jiraName",
    "jiraLink",
    "rsdLink",
    "sprintBA",
    "sprintDev",
    "sprintQC",
    "businessSprint",
    "status",
    "owner",
    "uatHandoff",
    "uatStart",
    "uatEnd",
    "uatDone",
    "uatSigned",
    "handoffStatus",
    "completionRate",
    "openBugs",
    "uatWarning"
  ];
  for (const key of requiredFeatureKeys) {
    if (!Object.prototype.hasOwnProperty.call(firstFeature, key)) {
      throw new Error(`DM_ChucNang import is missing key ${key}`);
    }
  }
  if (!firstFeature.group) throw new Error("DM_ChucNang first row imported blank Nhóm chức năng.");
  if (!firstFeature.businessSprint) throw new Error("DM_ChucNang first row imported blank Sprint Nghiệp vụ.");
  if (!firstFeature.handoffStatus) throw new Error("DM_ChucNang first row imported blank Tình trạng bàn giao.");

  console.log(JSON.stringify({
    ok: true,
    workbook: path.basename(workbookPath),
    checkedModules: Object.keys(sheetConfig).length,
    imported: {
      features: state.features.length,
      personnel: state.personnel.length,
      schedule: state.schedule.length,
      handoffs: state.handoffs.length,
      plans: state.plans.length,
      daily: state.daily.length,
      weekly: state.weekly.length,
      readiness: state.readiness.length,
      matrix: state.matrix.length,
      guide: state.guide.length
    }
  }, null, 2));
}

function loadAppModules() {
  const source = fs.readFileSync(path.resolve("app.js"), "utf8");
  const end = source.indexOf("const tabs =");
  if (end < 0) throw new Error("Cannot find module configuration in app.js");
  const context = {
    console,
    window: { location: { hash: "" } },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
  };
  vm.createContext(context);
  vm.runInContext(`function getNextFeatureStt(){return 1}\n${source.slice(0, end)}\nthis.modules = modules;`, context);
  return context.modules;
}

function readHeader(worksheet, rowNumber) {
  const row = worksheet.getRow(rowNumber);
  const headers = [];
  for (let column = 1; column <= worksheet.columnCount; column += 1) {
    const text = cellText(row.getCell(column).value || row.getCell(column).text);
    if (text) headers.push(text);
  }
  return headers;
}

function readFormulaColumns(worksheet) {
  const columns = new Set();
  worksheet.eachRow((row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value;
      if (!value || typeof value !== "object" || (!value.formula && !value.sharedFormula)) return;
      columns.add(cell.address.replace(/\d+/g, ""));
    });
  });
  return [...columns].sort(compareExcelColumns);
}

function compareExcelColumns(left, right) {
  return columnNumber(left) - columnNumber(right);
}

function columnNumber(column) {
  return column.split("").reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0);
}

function assertSameList(label, expected, actual) {
  const missing = expected.filter((item) => !actual.includes(item));
  const extra = actual.filter((item) => !expected.includes(item));
  const orderMismatch = expected.some((item, index) => actual[index] !== item);
  if (missing.length || extra.length || orderMismatch || expected.length !== actual.length) {
    throw new Error([
      `${label} columns do not match workbook.`,
      `Expected: ${expected.join(" | ")}`,
      `Actual:   ${actual.join(" | ")}`,
      `Missing:  ${missing.join(" | ") || "-"}`,
      `Extra:    ${extra.join(" | ") || "-"}`
    ].join("\n"));
  }
}

function cellText(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value !== "object") return String(value).replace(/\s+/g, " ").trim();
  if (Object.prototype.hasOwnProperty.call(value, "result")) return cellText(value.result);
  if (typeof value.text === "string") return value.text.replace(/\s+/g, " ").trim();
  if (Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text || "").join("").replace(/\s+/g, " ").trim();
  }
  return "";
}
