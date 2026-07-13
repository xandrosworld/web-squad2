const assert = require("node:assert/strict");
const {
  __testApplyWorkKpiRules: applyWorkKpiRules,
  __testDefaultWorkKpiConfig: defaultConfig,
  __testValidateRecordForCollection: validateRecord
} = require("../server");

const state = {
  personnel: [
    { id: "p1", name: "Nguyễn Gia Huy", email: "huyng@bidv.com.vn", role: "Tester", scope: "Kiểm thử" },
    { id: "p2", name: "Mai Tấn Thành", email: "thanhmt@bidv.com.vn", role: "Tester", scope: "Điều phối" }
  ],
  workItems: [
    { id: "w1", assigneeEmail: "huyng@bidv.com.vn", status: "Hoàn thành", progress: 100, dueDate: "2026-07-10", completedDate: "2026-07-09" },
    { id: "w2", assigneeEmail: "huyng@bidv.com.vn", status: "Đang thực hiện", progress: 50, dueDate: "2020-01-01" },
    { id: "w3", assignee: "Nguyễn Gia Huy", status: "Hoàn thành", progress: 100 }
  ],
  kpiConfig: [{ ...defaultConfig }],
  memberKpiInputs: [{
    id: "i1",
    memberEmail: "huyng@bidv.com.vn",
    role: "Tester",
    module: "Kiểm thử",
    capacity: 5,
    qualityScore: 90,
    contributionScore: 90,
    disciplineScore: 95
  }]
};

applyWorkKpiRules(state);

const huy = state.memberKpiResults.find((row) => row.memberEmail === "huyng@bidv.com.vn");
assert.ok(huy, "KPI của Huy phải được tạo");
assert.equal(huy.totalTasks, 3);
assert.equal(huy.completed, 2);
assert.equal(huy.inProgress, 1);
assert.equal(huy.overdue, 1);
assert.equal(huy.progress, 83);
assert.equal(huy.onTimeRate, 100);
assert.equal(huy.workload, 0.6);
assert.equal(huy.kpiTotal, 94.1);
assert.equal(huy.rank, "Xuất sắc");
assert.equal(huy.scored, true);

const thanh = state.memberKpiResults.find((row) => row.memberEmail === "thanhmt@bidv.com.vn");
assert.ok(thanh, "Thành viên không có task vẫn phải hiện trong bảng KPI");
assert.equal(thanh.progress, null);
assert.equal(thanh.onTimeRate, null);
assert.equal(thanh.kpiTotal, null);
assert.equal(thanh.scored, false);

assert.throws(() => validateRecord("kpiConfig", {
  ...defaultConfig,
  disciplineWeight: 9
}), /100%/);

console.log(JSON.stringify({
  ok: true,
  checked: {
    members: state.memberKpiResults.length,
    totalTasks: huy.totalTasks,
    kpiTotal: huy.kpiTotal,
    missingDataState: "Chưa chấm",
    weightValidation: "100%"
  }
}, null, 2));
