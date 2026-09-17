const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");
const { buildJiraTestluongWorkbook } = require("../jira-testluong-report");

const base = {
  projectKey: "PS0142025",
  label: "TESTLUONG",
  syncedAt: "2026-09-17T07:00:00.000Z",
  browseBaseUrl: "https://bidv-vn.atlassian.net/browse/"
};
const issue = (key, overrides = {}) => ({
  key,
  summary: `Bug ${key}`,
  status: "Open",
  priority: "Major",
  createdAt: "2026-09-16T03:00:00.000Z",
  updatedAt: "2026-09-17T02:00:00.000Z",
  components: ["SQ01"],
  labels: ["TESTLUONG"],
  parentKey: "PS0142025-4",
  childOf: ["PS0142025-100"],
  assignee: "Người xử lý",
  reporter: "Người tạo",
  resolution: "",
  ...overrides
});

(async () => {
  const report = {
    ...base,
    issues: [
      issue("PS0142025-101", { components: ["SQ01", "SQ02"], priority: "Blocker" }),
      issue("PS0142025-102", { status: "Closed", createdAt: "2026-09-09T03:00:00.000Z" }),
      issue("PS0142025-103", { status: "Cancelled", components: ["SQ02"], createdAt: "2026-09-08T03:00:00.000Z" })
    ]
  };
  const { workbook, filename, total, squadAllocations } = buildJiraTestluongWorkbook(report, new Date("2026-09-17T07:00:00.000Z"));
  assert.equal(filename, "Bao_cao_bug_TESTLUONG_theo_Squad_2026-09-17.xlsx");
  assert.equal(total, 3);
  assert.equal(squadAllocations, 4);
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await workbook.xlsx.writeBuffer());
  assert.deepEqual(loaded.worksheets.map((sheet) => sheet.name), ["TONG_HOP", "KIEM_TOAN", "TAT_CA_BUG", "BUG_TUAN_NAY", "SQ01", "SQ02"]);
  assert.deepEqual(loaded.getWorksheet("TONG_HOP").getRow(6).values.slice(1), [3, 1, 1, 1, 2, 1]);
  assert.equal(loaded.getWorksheet("BUG_TUAN_NAY").rowCount, 4);
  assert.equal(loaded.getWorksheet("SQ01").rowCount, 5);
  assert.equal(loaded.getWorksheet("SQ02").rowCount, 5);
  const all = loaded.getWorksheet("TAT_CA_BUG");
  assert.equal(all.rowCount, 6);
  assert.equal(all.getCell("C4").value.hyperlink, "https://bidv-vn.atlassian.net/browse/PS0142025-101");
  assert.equal(all.getCell("L4").value, "PS0142025-100");
  assert.equal(all.getCell("P4").value.hyperlink, "https://bidv-vn.atlassian.net/browse/PS0142025-101");
  assert(loaded.getWorksheet("KIEM_TOAN").getColumn(4).values.slice(4, 12).every((value) => value === "ĐẠT"));
  assert.throws(() => buildJiraTestluongWorkbook({ ...report, issues: [...report.issues, report.issues[0]] }), /trùng/);
  console.log("Jira TESTLUONG Excel report checks passed.");
})().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
