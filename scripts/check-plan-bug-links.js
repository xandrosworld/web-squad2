const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  __testApplyPlanOpenBugRules: applyPlanOpenBugRules,
  __testIsClosedBugStatus: isClosedBugStatus,
  __testJiraBugUrl: jiraBugUrl
} = require("../server");

const state = {
  plans: [
    { id: "plan-1", code: "CN001", jiraCode: "SQ02_CN001_001", feature: "Phê duyệt hồ sơ" },
    { id: "plan-2", code: "CN002", jiraCode: "SQ02_CN002_001", feature: "Tra cứu hồ sơ" }
  ],
  userStories: [
    { id: "story-1", issueKey: "PS0142025-1001", jiraCode: "SQ02_CN001_001" },
    { id: "story-2", issueKey: "PS0142025-2001", squadSummary: "SQ02_CN002_001" }
  ],
  defects: [
    { id: "defect-1", bugId: "PS0142025-7001", linkedUsKey: "PS0142025-1001", status: "Open", severity: "Major" },
    { id: "defect-2", bugId: "PS0142025-7002", linkedUsKey: "PS0142025-1001", status: "Resolved", severity: "Minor" },
    { id: "defect-3", bugId: "PS0142025-7003", linkedUsKey: "PS0142025-1001", status: "Closed" },
    { id: "defect-4", bugId: "PS0142025-7004", linkedUsKey: "PS0142025-1001", status: "Đã đóng" },
    { id: "defect-5", bugId: "PS0142025-7005", linkedUsKey: "PS0142025-1001", status: "Cancelled" },
    { id: "defect-1-duplicate", bugId: "PS0142025-7001", linkedUsKey: "PS0142025-1001", status: "Open" },
    { id: "defect-6", bugId: "PS0142025-7006", linkedUsKey: "PS0142025-9999", status: "Open" },
    { id: "defect-7", bugId: "PS0142025-7007", featureJiraCode: "SQ02_CN002_001", status: "Pending" }
  ],
  bugSources: [
    { issueKey: "PS0142025-7001", summary: "Lỗi hiển thị sai luồng", jiraUrl: "https://jira.example/browse/PS0142025-7001" },
    { issueKey: "PS0142025-7002", summary: "Lỗi trình duyệt hồ sơ" },
    { issueKey: "PS0142025-7005", summary: "Lỗi đã hủy nhưng chưa Closed" },
    { issueKey: "PS0142025-7007", summary: "Lỗi ghép trực tiếp theo mã chức năng", jiraUrl: "javascript:alert(1)" }
  ]
};

applyPlanOpenBugRules(state);

assert.deepEqual(
  state.plans[0].openBugLinks.map((bug) => bug.bugId),
  ["PS0142025-7001", "PS0142025-7002", "PS0142025-7005"],
  "A plan must include every non-Closed bug once, including Resolved and Cancelled."
);
assert.equal(state.plans[0].openBugLinks[0].title, "Lỗi hiển thị sai luồng");
assert.equal(state.plans[0].openBugLinks[0].label, "PS0142025-7001 - Lỗi hiển thị sai luồng");
assert.equal(state.plans[0].openBugLinks[0].url, "https://jira.example/browse/PS0142025-7001");
assert.equal(
  state.plans[0].openBugLinks[1].url,
  "https://bidv-vn.atlassian.net/browse/PS0142025-7002",
  "A missing source hyperlink must fall back to the canonical Jira browse URL."
);
assert.deepEqual(
  state.plans[1].openBugLinks.map((bug) => bug.bugId),
  ["PS0142025-7007"],
  "The derived feature code must provide a safe fallback when Child Of is unavailable."
);
assert.equal(
  state.plans[1].openBugLinks[0].url,
  "https://bidv-vn.atlassian.net/browse/PS0142025-7007",
  "A non-HTTP source link must never reach the client."
);

assert.equal(isClosedBugStatus("Closed"), true);
assert.equal(isClosedBugStatus("  CLOSED  "), true);
assert.equal(isClosedBugStatus("Đã đóng"), true);
assert.equal(isClosedBugStatus("Resolved"), false);
assert.equal(isClosedBugStatus("Cancelled"), false);
assert.equal(jiraBugUrl("PS0142025-9999", "javascript:alert(1)"), "https://bidv-vn.atlassian.net/browse/PS0142025-9999");
assert.equal(jiraBugUrl("không có mã", "javascript:alert(1)"), "");

const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
assert.match(appSource, /label:\s*"Bugs chưa Closed"/);
assert.match(appSource, /render:\s*\(row\)\s*=>\s*renderPlanBugLinks\(row\)/);
assert.match(appSource, /renderExternalLink\(bug\?\.url, label\)/);
assert.match(appSource, /target="_blank" rel="noopener noreferrer"/);

console.log(JSON.stringify({
  ok: true,
  checked: {
    childOfMapping: true,
    multipleBugsPerUs: true,
    closedExcluded: true,
    resolvedIncluded: true,
    cancelledIncludedByExplicitRule: true,
    duplicateRemoved: true,
    titleAndSafeHyperlink: true,
    directFeatureFallback: true
  }
}, null, 2));
