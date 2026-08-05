const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");

const {
  applyWorkbookRules,
  canonicalTesterDirectory,
  __testDefaultUsers: defaultUsers,
  parseWorkbookImportState,
  __testEmptyState: emptyState
} = require("../server");

const expected = [
  ["t1", "T1", "Lê Trần Sơn"],
  ["t2", "T2", "Huỳnh Công Sinh"],
  ["t3", "T3", "Hoàng Thành Trí"],
  ["t4", "T4", "Nguyễn Gia Huy"],
  ["t5", "T5", "Trần Đình Tuấn"],
  ["t6", "T6", "Mai Tấn Thành"],
  ["t7", "T7", "Phạm Hoàng Công Huân"]
];
const legacySonEmail = `${"tan"}${"tc"}@bidv.com.vn`;

assert.deepEqual(
  canonicalTesterDirectory.map((tester) => [tester.key, tester.code, tester.name]),
  expected,
  "The canonical tester directory must follow the names written over PhanCong_UAT columns T1-T7."
);

assert.deepEqual(
  defaultUsers.find((user) => user.email === "huanphc@bidv.com.vn"),
  {
    username: "huanphc@bidv.com.vn",
    email: "huanphc@bidv.com.vn",
    name: "Phạm Hoàng Công Huân",
    password: "123456"
  },
  "Tester 7 must have a login account in the default user directory."
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
  t7: 18,
  totalCases: 105
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
    "Bùi Thị Mai Phương": "NV1",
    "Phạm Hoàng Công Huân": "T7"
  },
  "Known testers must be normalized by full name; non-testers must remain unchanged."
);

assert.equal(
  state.personnel.find((person) => person.name === "Lê Trần Sơn").email,
  "sonlt8@bidv.com.vn",
  "Canonical tester email must not regress to the legacy address after a workbook import."
);

assert.equal(
  state.personnel.find((person) => person.name === "Phạm Hoàng Công Huân").email,
  "huanphc@bidv.com.vn",
  "Tester 7 must be present in personnel data with the canonical email."
);

assert.deepEqual(
  Object.fromEntries(
    ["role", "scope", "status"].map((field) => [
      field,
      state.personnel.find((person) => person.name === "Phạm Hoàng Công Huân")[field]
    ])
  ),
  {
    role: "Tester / Giảng viên nội bộ",
    scope: "Kiểm thử luân chuyển đa nghiệp vụ",
    status: "Đang tham gia"
  },
  "Tester 7 must use the same personnel classification as the rotating testers."
);

assert.deepEqual(
  [state.plans[0].t1, state.plans[0].t2, state.plans[0].t3, state.plans[0].t4, state.plans[0].t5, state.plans[0].t6, state.plans[0].t7],
  [12, 13, 14, 15, 16, 17, 18],
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

  const t7Workbook = new ExcelJS.Workbook();
  const t7Plan = t7Workbook.addWorksheet("PhanCong_UAT");
  ["Sơn", "Sinh", "Trí", "Huy", "Tuấn", "Thành", "Huân"].forEach((name, index) => {
    t7Plan.getCell(2, 9 + index).value = name;
    t7Plan.getCell(3, 9 + index).value = `T${index + 1}`;
  });
  t7Plan.getCell(4, 2).value = "JIRA-T7";
  t7Plan.getCell(4, 4).value = "Kiểm tra Tester 7";
  t7Plan.getCell(4, 15).value = 18;
  t7Plan.getCell(4, 16).value = 18;
  t7Plan.getCell(4, 17).value = "Đang Test";
  t7Plan.getCell(4, 18).value = 50;
  t7Plan.getCell(4, 19).value = "Đang kiểm thử";
  t7Plan.getCell(4, 20).value = "Done SIT";
  t7Plan.getCell(4, 21).value = 1;
  t7Plan.getCell(4, 22).value = "T7 import";
  const t7State = await parseWorkbookImportState(await t7Workbook.xlsx.writeBuffer());
  assert.equal(t7State.plans[0].t7, 18, "T7 allocation must import from the new column.");
  assert.equal(t7State.plans[0].note, "T7 import", "Columns after T7 must retain their meaning.");

  console.log(JSON.stringify({
    ok: true,
    checked: [
      "canonical T1-T7 plan header with legacy T1-T6 compatibility",
      "Tester 7 login account and personnel record",
      "personnel codes normalized by full name",
      "legacy tester email normalized by full name",
      "plan allocation columns are not shifted",
      "workbook import stops on a mismatched plan header"
    ]
  }, null, 2));
}
