const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");
const {
  buildPersonalWorkspaceWorkbook,
  __testNormalizePersonalWorkspaceTask: normalizeTask,
  __testIsPersonalWorkspaceOwner: isOwner,
  closeDatabase
} = require("../server");

async function main() {
  assert.equal(isOwner({ email: "thanhmt@bidv.com.vn" }), true);
  assert.equal(isOwner({ username: "THANHMT@BIDV.COM.VN" }), true);
  assert.equal(isOwner({ email: "huyng@bidv.com.vn" }), false);

  const created = normalizeTask({
    squad: "7",
    title: "  Hoàn thiện tài liệu  ",
    assigner: " Nguyễn Gia Huy ",
    assignedDate: "2026-08-01",
    dueDate: "2026-08-05",
    status: "Đang thực hiện",
    note: "Theo dõi bản cuối"
  });
  assert.deepEqual(created, {
    squad: "7",
    title: "Hoàn thiện tài liệu",
    assigner: "Nguyễn Gia Huy",
    assignedDate: "2026-08-01",
    dueDate: "2026-08-05",
    status: "Đang thực hiện",
    note: "Theo dõi bản cuối",
    completedDate: ""
  });

  const completed = normalizeTask({ ...created, status: "Hoàn thành" });
  assert.match(completed.completedDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.throws(() => normalizeTask({ ...created, squad: "2" }), /Squad/);
  assert.throws(() => normalizeTask({ ...created, dueDate: "2026-07-31" }), /Deadline/);
  assert.throws(() => normalizeTask({ ...created, title: "" }), /Tên công việc/);

  const workbook = buildPersonalWorkspaceWorkbook([
    { id: "a", squad: "1", title: "Việc S1", assigner: "Chị Yến", assignedDate: "2026-08-01", dueDate: "2026-08-04", status: "Chưa bắt đầu", note: "" },
    { id: "b", squad: "11", title: "Việc S11", assigner: "Anh Huy", assignedDate: "2026-08-02", dueDate: "", status: "Hoàn thành", note: "Đã bàn giao" }
  ]);
  const buffer = await workbook.xlsx.writeBuffer();
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(buffer);
  assert.deepEqual(loaded.worksheets.map((sheet) => sheet.name), ["Squad 1", "Squad 7", "Squad 11"]);
  assert.equal(loaded.getWorksheet("Squad 1").getCell("B3").value, "Việc S1");
  assert.equal(loaded.getWorksheet("Squad 7").rowCount, 2);
  assert.equal(loaded.getWorksheet("Squad 11").getCell("G3").value, "Đã bàn giao");
  assert.equal(loaded.getWorksheet("Squad 1").views[0].ySplit, 2);
  console.log("Personal workspace contract: OK");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
