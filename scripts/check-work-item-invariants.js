const assert = require("assert/strict");

const {
  __testValidateRecordForCollection: validateRecord,
  __testExpectedWorkStatusForProgress: expectedStatus,
  __testAssertAndPreserveWorkItemStartDate: assertStartDate,
  __testLegacyStartDateBackfillField: backfillField
} = require("../server");

const validCases = [
  { progress: "", status: "Chưa bắt đầu" },
  { progress: null, status: "Chưa bắt đầu" },
  { progress: 0, status: "Chưa bắt đầu" },
  { progress: "0", status: "Chưa bắt đầu" },
  { progress: 1, status: "Đang thực hiện" },
  { progress: 50, status: "Đang thực hiện" },
  { progress: 99.9, status: "Đang thực hiện" },
  { progress: 100, status: "Hoàn thành" }
];

for (const testCase of validCases) {
  assert.equal(expectedStatus(testCase.progress), testCase.status);
  assert.doesNotThrow(() => validateRecord("workItems", record(testCase)));
}

const invalidCases = [
  { progress: -1, status: "Chưa bắt đầu" },
  { progress: 101, status: "Hoàn thành" },
  { progress: "abc", status: "Đang thực hiện" },
  { progress: 0, status: "Đang thực hiện" },
  { progress: 1, status: "Chưa bắt đầu" },
  { progress: 99, status: "Hoàn thành" },
  { progress: 100, status: "Đang thực hiện" },
  { progress: 50, status: "Chờ phê duyệt" },
  { progress: 50, status: "Quá hạn" }
];

for (const testCase of invalidCases) {
  assert.throws(
    () => validateRecord("workItems", record(testCase)),
    (error) => error?.status === 400,
    `Expected rejection for ${JSON.stringify(testCase)}`
  );
}

const locked = { startDate: "2026-07-15" };
assert.deepEqual(assertStartDate(locked, {}), { startDate: "2026-07-15" });
assert.deepEqual(assertStartDate(locked, { startDate: "2026-07-15" }), { startDate: "2026-07-15" });
assert.throws(
  () => assertStartDate(locked, { startDate: "2026-07-16" }),
  (error) => error?.status === 409
);

const legacyBlank = { startDate: "", [backfillField]: true };
const stillBlank = assertStartDate(legacyBlank, { startDate: "" });
assert.equal(stillBlank[backfillField], true);
const backfilled = assertStartDate(legacyBlank, { startDate: "2026-07-15" });
assert.equal(backfilled.startDate, "2026-07-15");
assert.equal(Object.prototype.hasOwnProperty.call(backfilled, backfillField), false);
assert.throws(
  () => assertStartDate({ startDate: "" }, { startDate: "2026-07-15" }),
  (error) => error?.status === 409
);

console.log(JSON.stringify({
  ok: true,
  validStatusProgressCases: validCases.length,
  invalidStatusProgressCases: invalidCases.length,
  startDateLockCases: 6
}, null, 2));

function record(values) {
  return {
    id: "test-work-item",
    title: "Invariant test",
    categoryId: "test-category",
    priority: "Trung bình",
    ...values
  };
}
