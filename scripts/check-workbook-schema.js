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

const dropdownConfig = [
  ["features", "status", "DM_ChucNang", "N"],
  ["features", "owner", "DM_ChucNang", "O"],
  ["features", "handoffStatus", "Lich_BG_US", "J"],
  ["handoffs", "handoffStatus", "Lich_BG_US", "J"],
  ["handoffs", "note", "Lich_BG_US", "K"],
  ["plans", "owner", "PhanCong_UAT", "G"],
  ["plans", "uatStatus", "PhanCong_UAT", "R"],
  ["daily", "bugStatus", "DieuHanh_Ngay", "K"],
  ["daily", "maxBugSeverity", "DieuHanh_Ngay", "L"]
];

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
    const expected = moduleId === "plans"
      ? readPlanHeader(worksheet, headerRow)
      : readHeader(worksheet, headerRow);
    const actual = modules[moduleId].columns.map((column) => column.label);
    assertSameList(`${moduleId}/${sheetName}`, expected, actual);
  }

  for (const [sheetName, expectedColumns] of Object.entries(formulaColumnConfig)) {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) throw new Error(`Missing sheet ${sheetName}`);
    assertSameList(`formulas/${sheetName}`, expectedColumns, readFormulaColumns(worksheet));
  }

  for (const [moduleId, fieldKey, sheetName, columnLetter] of dropdownConfig) {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) throw new Error(`Missing sheet ${sheetName}`);
    const expectedOptions = readListValidationOptions(worksheet, columnLetter);
    if (!expectedOptions.length) {
      throw new Error(`${sheetName}!${columnLetter} does not have workbook list validation.`);
    }
    assertFieldOptions(modules, moduleId, fieldKey, expectedOptions);
  }

  assertSameList(
    "PhanCong_UAT tester headers",
    readPlanTesterLabels(workbook.getWorksheet("PhanCong_UAT")),
    modules.plans.columns
      .filter((column) => ["nv", "t1", "t2", "t3", "t4", "t5", "t6"].includes(column.key))
      .map((column) => column.label)
  );

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

function readPlanHeader(worksheet, rowNumber) {
  const headers = readHeader(worksheet, rowNumber);
  const testerLabels = readPlanTesterLabels(worksheet);
  const startIndex = headers.indexOf("NV");
  if (startIndex >= 0 && testerLabels.length) {
    headers.splice(startIndex, testerLabels.length, ...testerLabels);
  }
  return headers;
}

function readPlanTesterLabels(worksheet) {
  const peopleRow = worksheet.getRow(2);
  const codeRow = worksheet.getRow(3);
  const labels = [];
  for (let column = 8; column <= 14; column += 1) {
    const person = cellText(peopleRow.getCell(column).value || peopleRow.getCell(column).text);
    const code = cellText(codeRow.getCell(column).value || codeRow.getCell(column).text);
    if (!code) continue;
    labels.push(person && person !== code ? `${person} ${code}` : code);
  }
  return labels;
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

function readListValidationOptions(worksheet, columnLetter) {
  const model = worksheet.dataValidations?.model || {};
  for (const [address, rule] of Object.entries(model)) {
    if (!address.replace(/\d+/g, "").split(":")[0].startsWith(columnLetter)) continue;
    if (rule?.type !== "list" || !rule.formulae?.length) continue;
    return parseListFormula(rule.formulae[0]);
  }
  return [];
}

function parseListFormula(formula) {
  const text = String(formula || "").trim().replace(/^"|"$/g, "");
  if (!text || text.includes("!")) return [];
  return text.split(",").map((item) => item.trim()).filter(Boolean);
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

function assertFieldOptions(modules, moduleId, fieldKey, expectedOptions) {
  const field = modules[moduleId]?.fields?.find((item) => item.key === fieldKey);
  if (!field) throw new Error(`${moduleId}.${fieldKey} field is missing from app.js`);
  if (field.type !== "select") {
    throw new Error(`${moduleId}.${fieldKey} must be a select field because the workbook has a dropdown.`);
  }
  assertSameList(`${moduleId}.${fieldKey} dropdown`, expectedOptions, field.options || []);
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
