const assert = require("node:assert/strict");

const {
  prepareWorkbookImportState,
  isWorkbookManagedRecord,
  __testToImportCellDate: toImportCellDate,
  __testValidateRecordForCollection: validateRecordForCollection
} = require("../server");

const legacyId = "a".repeat(40);
const manualId = "147d4aa6-b329-4b3f-8a1a-9aed2b8b0209";

assert.equal(
  toImportCellDate({ value: new Date(Date.UTC(2026, 2, 7)), numFmt: "mm/dd/yyyy" }),
  "2026-07-03",
  "A month-first Excel cell must follow its displayed 03/07 value and import as 3 July."
);
assert.equal(
  toImportCellDate({ value: new Date(Date.UTC(2026, 2, 7)), numFmt: "dd/mm/yyyy" }),
  "2026-03-07",
  "A day-first Excel cell must retain 7 March."
);

assert.throws(
  () => validateRecordForCollection("daily", { date: "", tester: "" }),
  /date là trường bắt buộc/
);
assert.throws(
  () => validateRecordForCollection("daily", { date: "2026-07-14", tester: "" }),
  /tester là trường bắt buộc/
);
assert.doesNotThrow(() => validateRecordForCollection("daily", { date: "2026-07-14", tester: "5" }));

assert.equal(isWorkbookManagedRecord({ id: legacyId, data: {} }), true);
assert.equal(isWorkbookManagedRecord({ id: manualId, data: {} }), false);
assert.equal(isWorkbookManagedRecord({ id: manualId, data: { _import: { source: "workbook" } } }), true);

const state = { daily: [{ id: legacyId, date: "2026-07-14", tester: "1" }] };
prepareWorkbookImportState(state, "2026-07-14T10:00:00.000Z");
assert.deepEqual(state.daily[0]._import, {
  source: "workbook",
  sheet: "DieuHanh_Ngay",
  importedAt: "2026-07-14T10:00:00.000Z"
});

console.log(JSON.stringify({
  ok: true,
  checked: ["mixed Excel date format", "daily required fields", "workbook/manual record classification"]
}, null, 2));
