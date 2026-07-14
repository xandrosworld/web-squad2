const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");

const {
  applyWorkbookRules,
  canonicalTesterDirectory,
  parseWorkbookImportState,
  __testEmptyState: emptyState
} = require("../server");

const expected = [
  ["t1", "T1", "Lê Trần Sơn"],
  ["t2", "T2", "Huỳnh Công Sinh"],
  ["t3", "T3", "Hoàng Thành Trí"],
  ["t4", "T4", "Nguyễn Gia Huy"],
  ["t5", "T5", "Trần Đình Tuấn"],
  ["t6", "T6", "Mai Tấn Thành"]
];
const legacySonEmail = `${"tan"}${"tc"}@bidv.com.vn`;

assert.deepEqual(
  canonicalTesterDirectory.map((tester) => [tester.key, tester.code, tester.name]),
  expected,
  "The canonical tester directory must follow the names written over PhanCong_UAT columns T1-T6."
);

const state = emptyState();
state.personnel = [
  { id: "thanh", staffCode: "T1", name: "Mai Tấn Thành", email: "thanhmt@bidv.com.vn" },
  { id: "son", staffCode: "T2", name: "Lê Trần Sơn", email: legacySonEmail },
  { id: "sinh", staffCode: "T3", name: "Huỳnh Công Sinh" },
  { id: "tri", staffCode: "T4", name: "Hoàng Thành Trí" },
  { id: "huy", staffCode: "T5", name: "Nguyễn Gia Huy" },
  { id: "tuan", staffCode: "T6", name: "Trần Đình Tuấn" },
  { id: "owner", staffCode: "NV1", name: "Bùi Thị Mai Phương" }
];
state.plans = [{
  id: "plan",
  feature: "Kiểm tra ánh xạ",
  t1: 12,
  t2: 13,
  t3: 14,
  t4: 15,
  t5: 16,
  t6: 17,
  totalCases: 87
}];

applyWorkbookRules(state);

assert.deepEqual(
  Object.fromEntries(state.personnel.map((person) => [person.name, person.staffCode])),
  {
    "Mai Tấn Thành": "T6",
    "Lê Trần Sơn": "T1",
    "Huỳnh Công Sinh": "T2",
    "Hoàng Thành Trí": "T3",
    "Nguyễn Gia Huy": "T4",
    "Trần Đình Tuấn": "T5",
    "Bùi Thị Mai Phương": "NV1"
  },
  "Known testers must be normalized by full name; non-testers must remain unchanged."
);

assert.equal(
  state.personnel.find((person) => person.name === "Lê Trần Sơn").email,
  "sonlt8@bidv.com.vn",
  "Canonical tester email must not regress to the legacy address after a workbook import."
);

assert.deepEqual(
  [state.plans[0].t1, state.plans[0].t2, state.plans[0].t3, state.plans[0].t4, state.plans[0].t5, state.plans[0].t6],
  [12, 13, 14, 15, 16, 17],
  "Personnel normalization must never shift actual PhanCong_UAT allocation columns."
);

checkImportHeaderGuard().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});

async function checkImportHeaderGuard() {
  const workbook = new ExcelJS.Workbook();
  const plan = workbook.addWorksheet("PhanCong_UAT");
  ["Sơn", "Sinh", "Trí", "Huy", "Tuấn", "Sai người"].forEach((name, index) => {
    plan.getCell(2, 9 + index).value = name;
  });
  const buffer = await workbook.xlsx.writeBuffer();
  await assert.rejects(
    () => parseWorkbookImportState(buffer),
    /Dừng import để tránh gán nhầm testcase cho người khác/,
    "Workbook import must stop when the actual names over T1-T6 no longer match the web mapping."
  );

  console.log(JSON.stringify({
    ok: true,
    checked: [
      "canonical T1-T6 plan header",
      "personnel codes normalized by full name",
      "legacy tester email normalized by full name",
      "plan allocation columns are not shifted",
      "workbook import stops on a mismatched plan header"
    ]
  }, null, 2));
}
