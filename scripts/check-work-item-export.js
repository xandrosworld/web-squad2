const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");
const {
  buildWorkItemsExportWorkbook,
  filterWorkItemsForExport,
  parseWorkItemExportFilters,
  __testEmptyState: emptyState
} = require("../server");

(async () => {
  const state = emptyState();
  state.workCategories = [
    { id: "delivery-urd", sortOrder: 11, taskPrefix: "SQ2-URD", name: "URD" },
    { id: "pilot-t10", sortOrder: 10, taskPrefix: "SQ2-T10", name: "Công việc khác" }
  ];
  state.workItems = [
    item("urd-1", "delivery-urd", "2026-07-01", "2026-07-10", "2026-07-05"),
    item("urd-2", "delivery-urd", "2026-07-15", "2026-08-01", ""),
    item("urd-3", "delivery-urd", "", "2026-07-20", ""),
    item("other-1", "pilot-t10", "2026-07-12", "2026-07-25", "")
  ];

  assert.deepEqual(parseWorkItemExportFilters({ categoryId: "delivery-urd" }), {
    categoryId: "delivery-urd",
    dateField: "startDate",
    fromDate: "",
    toDate: ""
  });
  assert.throws(
    () => parseWorkItemExportFilters({ categoryId: "delivery-urd", dateField: "createdAt" }),
    /Mốc thời gian không hợp lệ/
  );
  assert.throws(
    () => parseWorkItemExportFilters({ categoryId: "delivery-urd", fromDate: "2026-07-31", toDate: "2026-07-01" }),
    /Từ ngày không được sau Đến ngày/
  );

  const assignedInRange = filterWorkItemsForExport(state, {
    categoryId: "delivery-urd",
    dateField: "startDate",
    fromDate: "2026-07-01",
    toDate: "2026-07-10"
  });
  assert.deepEqual(assignedInRange.map((row) => row.id), ["urd-1"]);

  const deadlinesInJuly = filterWorkItemsForExport(state, {
    categoryId: "delivery-urd",
    dateField: "dueDate",
    fromDate: "2026-07-01",
    toDate: "2026-07-31"
  });
  assert.deepEqual(deadlinesInJuly.map((row) => row.id), ["urd-1", "urd-3"]);

  const workbook = buildWorkItemsExportWorkbook(state, {
    categoryId: "delivery-urd",
    dateField: "dueDate",
    fromDate: "2026-07-01",
    toDate: "2026-07-31"
  });
  const worksheet = workbook.getWorksheet("KeHoach_CongViec");
  assert.ok(worksheet, "Focused export must contain KeHoach_CongViec.");
  assert.match(String(worksheet.getCell("A2").value || ""), /Deadline: 01\/07\/2026 - 31\/07\/2026 \| 2 công việc/);
  assert.equal(worksheet.getCell("F14").value, "Công việc urd-1");
  assert.equal(worksheet.getCell("F15").value, "Công việc urd-3");
  assert.equal(worksheet.getCell("F16").value, null);

  const buffer = await workbook.xlsx.writeBuffer();
  const readBack = new ExcelJS.Workbook();
  await readBack.xlsx.load(buffer);
  assert.equal(readBack.getWorksheet("KeHoach_CongViec").getCell("F15").value, "Công việc urd-3");
  console.log("Work item date-range export check passed.");
})().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});

function item(id, categoryId, startDate, dueDate, completedDate) {
  return {
    id,
    categoryId,
    sortOrder: Number(id.match(/\d+$/)?.[0] || 1),
    taskId: `SQ2-${categoryId === "delivery-urd" ? "URD" : "T10"}-${String(Number(id.match(/\d+$/)?.[0] || 1)).padStart(3, "0")}`,
    title: `Công việc ${id}`,
    status: completedDate ? "Hoàn thành" : "Chưa bắt đầu",
    progress: completedDate ? 100 : 0,
    startDate,
    dueDate,
    completedDate
  };
}
