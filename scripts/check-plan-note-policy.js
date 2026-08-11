const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  __testCanManagePlanRecords: canManagePlanRecords,
  __testCanUpdatePlanNote: canUpdatePlanNote,
  __testNormalizePlanNote: normalizePlanNote,
  __testMergePlanNoteUpdate: mergePlanNoteUpdate,
  mergeWorkbookSourceState,
  auditMergePreservation
} = require("../server");

const admin = { id: "admin-1", role: "admin", active: true };
const member = { id: "member-1", role: "user", active: true };

assert.equal(canManagePlanRecords(admin), true, "Admin must retain full PhanCong_UAT management rights.");
assert.equal(canManagePlanRecords(member), false, "Members must not edit assignment or testcase fields.");
assert.equal(canUpdatePlanNote(admin), true, "Admin can update plan notes.");
assert.equal(canUpdatePlanNote(member), true, "Every active authenticated member can update plan notes.");
assert.equal(canUpdatePlanNote({ ...member, active: false }), false, "Inactive users cannot update plan notes.");
assert.equal(canUpdatePlanNote(null), false, "Anonymous users cannot update plan notes.");

assert.equal(normalizePlanNote("  Đang chờ xử lý\nhttps://jira.example/browse/BUG-1  "), "Đang chờ xử lý\nhttps://jira.example/browse/BUG-1");
assert.equal(normalizePlanNote(null), "");
assert.throws(
  () => normalizePlanNote("x".repeat(5001)),
  /5\.000 ký tự/,
  "Oversized notes must be rejected by the backend."
);

const current = {
  id: "plan-1",
  feature: "US kiểm thử",
  jiraCode: "SQ02_CN001_001",
  t1: 12,
  t2: 8,
  totalCases: 20,
  progress: 50,
  note: "Ghi chú cũ",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-10T00:00:00.000Z"
};
const updated = mergePlanNoteUpdate(
  current,
  "Bug còn tồn: https://jira.example/browse/BUG-2",
  "2026-08-11T00:00:00.000Z"
);
assert.deepEqual(
  { ...updated, note: undefined, updatedAt: undefined },
  { ...current, note: undefined, updatedAt: undefined },
  "A note update must preserve every assignment and testcase field."
);
assert.equal(updated.note, "Bug còn tồn: https://jira.example/browse/BUG-2");
assert.equal(updated.updatedAt, "2026-08-11T00:00:00.000Z");

const existingState = {
  plans: [current],
  daily: [],
  defects: [],
  userStories: [],
  bugSources: [],
  defectSummary: [],
  personnel: [],
  schedule: [],
  handoffs: [],
  guide: [],
  workCategories: [],
  workItems: [],
  kpiConfig: [],
  memberKpiInputs: []
};
const importedState = {
  ...existingState,
  plans: [{ ...current, note: "Google Sheet không được ghi đè ghi chú này" }]
};
const mergedSource = mergeWorkbookSourceState(existingState, importedState, {
  importedAt: "2026-08-11T01:00:00.000Z",
  source: "google-sheet"
});
assert.deepEqual(
  mergedSource.state.plans,
  existingState.plans,
  "Google Sheet synchronization must preserve the web-owned PhanCong_UAT collection."
);
assert.equal(
  auditMergePreservation(existingState, mergedSource.state).ok,
  true,
  "The preservation audit must include PhanCong_UAT."
);

const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
assert.match(
  appSource,
  /key:\s*"note",\s*label:\s*"Ghi chú"[^\n]+render:\s*\(row\)\s*=>\s*renderLinkedText\(row\.note\)/,
  "The PhanCong_UAT note column must use safe hyperlink rendering."
);
assert.match(appSource, /target="_blank" rel="noopener noreferrer"/, "External note links must open safely.");
assert.ok(
  appSource.includes("if (!/^https?:\\/\\//i.test(safeUrl)) return e(label);"),
  "Only HTTP(S) note links may be clickable."
);

console.log(JSON.stringify({
  ok: true,
  checked: {
    memberNotePermission: true,
    adminOnlyPlanManagement: true,
    noteOnlyMerge: true,
    noteLengthLimit: 5000,
    safeHttpLinks: true,
    googleSyncPreservesPlans: true
  }
}, null, 2));
