const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ExcelJS = require("exceljs");
const {
  formulaColumnsBySheet,
  computedFieldsByCollection
} = require("../excel-formula-contract");

const workbookPath = path.resolve(process.argv[2] || "SQ02_UAT_Squad2_QuanLy_US_Date-2.7.xlsx");
const appPath = path.resolve("app.js");

const forbiddenDashboardCopy = [
  "Tiến độ UAT toàn Squad",
  "Tỷ lệ bao phủ kiểm thử",
  "Tỷ lệ thành công",
  "Lỗi nghiêm trọng tồn đọng",
  "Mức độ sẵn sàng đào tạo",
  "Mức độ sẵn sàng Pilot/Go-live"
];

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

async function main() {
  if (!fs.existsSync(workbookPath)) throw new Error(`Workbook not found: ${workbookPath}`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);

  const actualFormulaColumns = extractFormulaColumns(workbook);
  assertSameFormulaColumns(formulaColumnsBySheet, actualFormulaColumns);

  const appSource = fs.readFileSync(appPath, "utf8");
  assertDeepEqual(
    "app computedFieldsByCollection vs contract",
    computedFieldsByCollection,
    readConst(appSource, "computedFieldsByCollection")
  );
  forbiddenDashboardCopy.forEach((text) => {
    if (appSource.includes(text)) {
      throw new Error(`Dashboard contains non-Excel KPI copy: ${text}`);
    }
  });

  const validationAddresses = extractValidationAddresses(workbook);
  if (validationAddresses.length < 9) {
    throw new Error(`Expected workbook dropdown validations, found only ${validationAddresses.length}.`);
  }

  console.log(JSON.stringify({
    ok: true,
    workbook: path.basename(workbookPath),
    formulas: Object.fromEntries(Object.entries(actualFormulaColumns).map(([sheet, columns]) => [sheet, columns.length])),
    dropdownValidations: validationAddresses.length,
    computedCollections: Object.keys(computedFieldsByCollection).length
  }, null, 2));
}

function extractFormulaColumns(workbook) {
  const result = {};
  workbook.worksheets.forEach((worksheet) => {
    const columns = new Set();
    worksheet.eachRow((row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (!hasFormula(cell)) return;
        columns.add(columnLetters(cell.col));
      });
    });
    if (columns.size) {
      result[worksheet.name] = [...columns].sort(compareColumns);
    }
  });
  return result;
}

function hasFormula(cell) {
  const value = cell.value;
  return Boolean(value && typeof value === "object" && (value.formula || value.sharedFormula));
}

function columnLetters(columnNumber) {
  let number = columnNumber;
  let letters = "";
  while (number > 0) {
    const remainder = (number - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    number = Math.floor((number - 1) / 26);
  }
  return letters;
}

function compareColumns(left, right) {
  return columnNumber(left) - columnNumber(right);
}

function columnNumber(letters) {
  return String(letters).split("").reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0);
}

function extractValidationAddresses(workbook) {
  const addresses = [];
  workbook.worksheets.forEach((worksheet) => {
    Object.entries(worksheet.dataValidations.model || {}).forEach(([address, rule]) => {
      if (rule?.type === "list") addresses.push(`${worksheet.name}!${address}`);
    });
  });
  return addresses;
}

function readConst(source, name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*(\\{[\\s\\S]*?\\n\\});`));
  if (!match) throw new Error(`Cannot find const ${name}`);
  return vm.runInNewContext(`(${match[1]})`);
}

function assertSameFormulaColumns(expected, actual) {
  const expectedSheets = Object.keys(expected).sort();
  const actualSheets = Object.keys(actual).sort();
  assertDeepEqual("formula sheets", expectedSheets, actualSheets);
  expectedSheets.forEach((sheet) => {
    assertDeepEqual(`${sheet} formula columns`, expected[sheet], actual[sheet]);
  });
}

function assertDeepEqual(label, expected, actual) {
  const expectedText = JSON.stringify(expected);
  const actualText = JSON.stringify(actual);
  if (expectedText !== actualText) {
    throw new Error(`${label} mismatch.\nExpected: ${expectedText}\nActual:   ${actualText}`);
  }
}
