const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ExcelJS = require("exceljs");

const workbookPath = path.resolve(process.argv[2] || "SQ02_UAT_Squad2_QuanLy_US_Date-2.7.xlsx");
const appPath = path.resolve("app.js");
const serverPath = path.resolve("server.js");
const cssPath = path.resolve("styles.css");

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

async function main() {
  if (!fs.existsSync(workbookPath)) throw new Error(`Workbook not found: ${workbookPath}`);

  const appSource = fs.readFileSync(appPath, "utf8");
  const serverSource = fs.readFileSync(serverPath, "utf8");
  const cssSource = fs.readFileSync(cssPath, "utf8");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);

  const ownerFromExcel = validationList(workbook, "DM_ChucNang", "H2");
  const statusFromFeature = validationList(workbook, "DM_ChucNang", "S2");
  const handoffFromExcel = validationList(workbook, "Lich_BG_US", "I8");
  const planTestFromExcel = validationList(workbook, "PhanCong_UAT", "P4");
  const planStatusFromExcel = validationList(workbook, "PhanCong_UAT", "R4");
  const dailyStatusFromExcel = validationList(workbook, "DieuHanh_Ngay", "I4");
  const severityFromExcel = validationList(workbook, "DieuHanh_Ngay", "J4");
  const personnelFromExcel = validationList(workbook, "DieuHanh_Ngay", "M4");
  const defectStatusFromExcel = validationList(workbook, "DEFECT_LOG", "G2");

  assertSameList("statusOptions vs DM_ChucNang!S2", statusFromFeature, readArray(appSource, "statusOptions"));
  assertSameList("handoffStatusOptions vs Lich_BG_US!I8", handoffFromExcel, readArray(appSource, "handoffStatusOptions"));
  assertSameList("testStatusOptions vs PhanCong_UAT!P4", planTestFromExcel, readArray(appSource, "testStatusOptions"));
  assertSameList("planStatusOptions vs PhanCong_UAT!R4", planStatusFromExcel, readArray(appSource, "planStatusOptions"));
  assertSameList("dailyBugStatusOptions vs DieuHanh_Ngay!I4", dailyStatusFromExcel, readArray(appSource, "dailyBugStatusOptions"));
  assertSameList("bugStatusOptions vs DEFECT_LOG!G2", defectStatusFromExcel, readArray(appSource, "bugStatusOptions"));
  assertSameList("bugSeverityOptions vs DieuHanh_Ngay!J4", severityFromExcel, readArray(appSource, "bugSeverityOptions"));
  assertSameList("personnelNameOptions vs DieuHanh_Ngay!M4", personnelFromExcel, readArray(appSource, "personnelNameOptions"));
  assertSameList("ownerOptions minus ALL vs DM_ChucNang!H2", ownerFromExcel, readArray(appSource, "ownerOptions").filter((value) => value !== "ALL"));
  if (!readArray(appSource, "ownerOptions").includes("ALL")) {
    throw new Error("ownerOptions must keep ALL until business confirms removal.");
  }
  for (const name of [
    "statusOptions",
    "ownerOptions",
    "personnelNameOptions",
    "handoffStatusOptions",
    "handoffNoteOptions",
    "planStatusOptions",
    "testStatusOptions",
    "bugStatusOptions",
    "dailyBugStatusOptions",
    "bugSeverityOptions"
  ]) {
    const serverName = name === "statusOptions" ? "featureStatusOptions" : name;
    assertSameList(`app ${name} vs server ${serverName}`, readArray(appSource, name), readArray(serverSource, serverName));
  }

  const renderStatus = readRenderStatus(appSource);
  const expectedTones = {
    Blocker: "red-dark",
    Critical: "red",
    Major: "orange",
    Minor: "yellow",
    Trivial: "blue",
    Open: "red",
    "In Progress": "orange",
    Reopened: "purple",
    Resolved: "blue",
    Closed: "green",
    Cancelled: "gray-dark",
    Pending: "yellow",
    "SIT Fail": "red-dark",
    "Done RSD": "yellow",
    "Done DEV": "blue",
    "Done SIT": "purple",
    "Done UAT": "green"
  };
  for (const [status, expectedTone] of Object.entries(expectedTones)) {
    const actualTone = renderStatus(status);
    if (actualTone !== expectedTone) {
      throw new Error(`renderStatus(${status}) expected ${expectedTone}, got ${actualTone}`);
    }
  }

  for (const className of [".tag.orange", ".tag.red-dark", ".tag.gray-dark"]) {
    if (!cssSource.includes(className)) throw new Error(`Missing CSS class ${className}`);
  }
  assertSourceIncludes(appSource, 'daily bugStatus field', '{ key: "bugStatus", label: "Trạng thái lỗi", type: "select", options: dailyBugStatusOptions }');
  assertSourceIncludes(appSource, 'daily handler field', '{ key: "handler", label: "Người xử lý", type: "select", options: personnelNameOptions }');
  assertSourceIncludes(appSource, 'defect tester field', '{ key: "tester", label: "Tester", type: "select", options: personnelNameOptions }');
  assertSourceIncludes(serverSource, 'daily bugStatus enum', 'bugStatus: dailyBugStatusOptions');
  assertSourceIncludes(serverSource, 'daily handler enum', 'handler: personnelNameOptions');
  assertSourceIncludes(serverSource, 'defect tester enum', 'tester: personnelNameOptions');
  assertSourceIncludes(serverSource, 'defect owner enum', 'owner: ownerOptions');

  console.log(JSON.stringify({
    ok: true,
    workbook: path.basename(workbookPath),
    checked: {
      dropdowns: 9,
      appServerLists: 10,
      tones: Object.keys(expectedTones).length,
      ownerException: "ALL"
    }
  }, null, 2));
}

function validationList(workbook, sheetName, cellAddress) {
  const worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) throw new Error(`Missing worksheet ${sheetName}`);
  const rule = worksheet.dataValidations.model[cellAddress];
  if (!rule || rule.type !== "list" || !rule.formulae?.[0]) {
    throw new Error(`Missing list validation at ${sheetName}!${cellAddress}`);
  }
  return splitValidationFormula(rule.formulae[0]);
}

function splitValidationFormula(formula) {
  const text = String(formula || "").trim().replace(/^"|"$/g, "");
  return text.split(",").map((value) => value.trim()).filter(Boolean);
}

function readArray(source, name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*(\\[[\\s\\S]*?\\]);`));
  if (!match) throw new Error(`Cannot find array ${name}`);
  return vm.runInNewContext(match[1]);
}

function readRenderStatus(source) {
  const match = source.match(/function renderStatus\(value\) \{[\s\S]*?\n\}/);
  if (!match) throw new Error("Cannot find renderStatus");
  return vm.runInNewContext(`${match[0]}; renderStatus`, {
    tag: (_value, tone) => tone
  });
}

function assertSameList(label, expected, actual) {
  if (expected.length !== actual.length || expected.some((item, index) => item !== actual[index])) {
    throw new Error(`${label} mismatch.\nExpected: ${JSON.stringify(expected)}\nActual:   ${JSON.stringify(actual)}`);
  }
}

function assertSourceIncludes(source, label, text) {
  if (!source.includes(text)) throw new Error(`Missing ${label}: ${text}`);
}
