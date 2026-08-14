const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  __testApplyPlanOpenBugRules: applyPlanOpenBugRules,
  __testBuildUnmappedPlanBugGroups: buildUnmappedPlanBugGroups,
  __testDeriveSquadSummaryFromUserStorySummary: deriveSquadSummaryFromUserStorySummary,
  __testIsClosedBugStatus: isClosedBugStatus,
  __testIsPlanTrackableBugStatus: isPlanTrackableBugStatus,
  __testPlanBugRecencyBucket: planBugRecencyBucket,
  __testJiraBugUrl: jiraBugUrl
} = require("../server");

const state = {
  plans: [
    { id: "plan-1", code: "CN001", jiraCode: "SQ02_CN001_001", feature: "Phê duyệt hồ sơ" },
    { id: "plan-2", code: "CN002", jiraCode: "SQ02_CN002_001", feature: "Tra cứu hồ sơ" },
    { id: "plan-3", code: "CN006", jiraCode: "SQ02_CN006_002", feature: "Nguyên tắc chung" },
    { id: "plan-4", code: "CN003", jiraCode: "SQ02_CN003_010", feature: "Tài sản bảo đảm" },
    { id: "plan-5", code: "CN001", jiraCode: "SQ02_CN001_015", feature: "Màn hình phê duyệt" }
  ],
  userStories: [
    { id: "story-1", issueKey: "PS0142025-1001", jiraCode: "SQ02_CN001_001" },
    { id: "story-2", issueKey: "PS0142025-2001", squadSummary: "SQ02_CN002_001" },
    { id: "story-3", issueKey: "PS0142025-8078", jiraCode: "SQ02_SQ02_CN00", squadSummary: "SQ02_SQ02_CN00", summary: "SQ02_CN006_002_ Nguyên tắc chung" },
    { id: "story-4", issueKey: "PS0142025-2095", jiraCode: "SQ02_CN003_010", squadSummary: "SQ02_CN003_010", summary: "CN001_015_Màn hình và xử lý logic phê duyệt" }
  ],
  defects: [
    { id: "defect-1", bugId: "PS0142025-7001", linkedUsKey: "PS0142025-1001", status: "Open", severity: "Major", foundDate: "2026-08-11" },
    { id: "defect-2", bugId: "PS0142025-7002", linkedUsKey: "PS0142025-1001", status: "Resolved", severity: "Minor", foundDate: "2026-07-20" },
    { id: "defect-3", bugId: "PS0142025-7003", linkedUsKey: "PS0142025-1001", status: "Closed" },
    { id: "defect-4", bugId: "PS0142025-7004", linkedUsKey: "PS0142025-1001", status: "Đã đóng" },
    { id: "defect-5", bugId: "PS0142025-7005", linkedUsKey: "PS0142025-1001", status: "Cancelled" },
    { id: "defect-1-duplicate", bugId: "PS0142025-7001", linkedUsKey: "PS0142025-1001", status: "Open" },
    { id: "defect-6", bugId: "PS0142025-7006", linkedUsKey: "PS0142025-9999", status: "Open" },
    { id: "defect-7", bugId: "PS0142025-7007", featureJiraCode: "SQ02_CN002_001", status: "Pending" },
    { id: "defect-8", bugId: "PS0142025-7008", linkedUsKey: "PS0142025-8078", status: "Open", foundDate: "2026-08-12" },
    { id: "defect-9", bugId: "PS0142025-7009", status: "Open", foundDate: "2026-08-13" },
    { id: "defect-10", bugId: "PS0142025-11862", linkedUsKey: "PS0142025-2095", status: "Open", foundDate: "2026-08-11" }
  ],
  bugSources: [
    { issueKey: "PS0142025-7001", summary: "Lỗi hiển thị sai luồng", jiraUrl: "https://jira.example/browse/PS0142025-7001" },
    { issueKey: "PS0142025-7002", summary: "Lỗi trình duyệt hồ sơ" },
    { issueKey: "PS0142025-7005", summary: "Lỗi đã hủy nhưng chưa Closed" },
    { issueKey: "PS0142025-7007", summary: "Lỗi ghép trực tiếp theo mã chức năng", jiraUrl: "javascript:alert(1)", created: "2026-08-10" }
  ]
};

applyPlanOpenBugRules(state);
const unmappedGroups = buildUnmappedPlanBugGroups(state);

assert.deepEqual(
  state.plans[0].openBugLinks.map((bug) => bug.bugId),
  ["PS0142025-7001", "PS0142025-7002"],
  "A plan must include each active bug once while excluding Closed and Cancelled statuses."
);
assert.equal(state.plans[0].openBugLinks[0].title, "Lỗi hiển thị sai luồng");
assert.equal(state.plans[0].openBugLinks[0].label, "PS0142025-7001 - Lỗi hiển thị sai luồng");
assert.equal(state.plans[0].openBugLinks[0].url, "https://jira.example/browse/PS0142025-7001");
assert.equal(state.plans[0].openBugLinks[0].logDate, "2026-08-11");
assert.equal(state.plans[0].openBugLinks[0].recencyBucket, planBugRecencyBucket("2026-08-11"));
assert.equal(state.plans[0].openBugLinks[1].logDate, "2026-07-20");
assert.equal(state.plans[0].openBugLinks[1].recencyBucket, "old");
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
assert.equal(state.plans[1].openBugLinks[0].logDate, "2026-08-10", "DS.Loi Created must be the fallback log date.");
assert.deepEqual(
  state.plans[2].openBugLinks.map((bug) => bug.bugId),
  ["PS0142025-7008"],
  "A broken generated SQ02_SQ02 code must recover from the prefixed DS_US summary."
);
assert.deepEqual(
  state.plans[3].openBugLinks.map((bug) => bug.bugId),
  [],
  "A stale SQ2_Summary code must not duplicate a bug into the wrong PhanCong_UAT row."
);
assert.deepEqual(
  state.plans[4].openBugLinks.map((bug) => bug.bugId),
  ["PS0142025-11862"],
  "The explicit feature code in the Jira Story summary must win when it matches PhanCong_UAT."
);
assert.deepEqual(
  unmappedGroups.find((group) => group.linkedUsKey === "PS0142025-9999")?.openBugLinks.map((bug) => bug.bugId),
  ["PS0142025-7006"],
  "A trackable bug whose Child Of is absent from PhanCong_UAT must remain visible in an exception US group."
);
assert.deepEqual(
  unmappedGroups.find((group) => group.missingChildOf)?.openBugLinks.map((bug) => bug.bugId),
  ["PS0142025-7009"],
  "A trackable bug without Child Of must remain visible in a dedicated exception group."
);

assert.equal(isClosedBugStatus("Closed"), true);
assert.equal(isClosedBugStatus("  CLOSED  "), true);
assert.equal(isClosedBugStatus("Đã đóng"), true);
assert.equal(isClosedBugStatus("Resolved"), false);
assert.equal(isClosedBugStatus("Cancelled"), false);
assert.equal(isPlanTrackableBugStatus("Open"), true);
assert.equal(isPlanTrackableBugStatus("Resolved"), true);
assert.equal(isPlanTrackableBugStatus("Closed"), false);
assert.equal(isPlanTrackableBugStatus("Đã đóng"), false);
assert.equal(isPlanTrackableBugStatus("Cancelled"), false);
assert.equal(isPlanTrackableBugStatus("Canceled"), false);
assert.equal(deriveSquadSummaryFromUserStorySummary("CN001_012_Màn hình"), "SQ02_CN001_012");
assert.equal(deriveSquadSummaryFromUserStorySummary("SQ02_CN006_002_ Nguyên tắc chung"), "SQ02_CN006_002");
assert.equal(
  deriveSquadSummaryFromUserStorySummary("SQ02_CN003_0111_ Thông tin Quan hệ TCTD"),
  "SQ02_CN003_0111",
  "A four-digit story suffix must never be silently truncated to a different plan code."
);
const reference = new Date("2026-08-13T13:30:00.000Z");
assert.equal(planBugRecencyBucket("2026-08-13", reference), "new");
assert.equal(planBugRecencyBucket("2026-08-06", reference), "new", "The exact today - 7 boundary must be new.");
assert.equal(planBugRecencyBucket("2026-08-05", reference), "old");
assert.equal(planBugRecencyBucket("", reference), "unknown");
assert.equal(planBugRecencyBucket("2026-08-14", reference), "unknown", "Future log dates must be flagged for review.");
assert.equal(jiraBugUrl("PS0142025-9999", "javascript:alert(1)"), "https://bidv-vn.atlassian.net/browse/PS0142025-9999");
assert.equal(jiraBugUrl("không có mã", "javascript:alert(1)"), "");

const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
assert.match(appSource, /label:\s*"Bugs đang theo dõi"/);
assert.match(appSource, /chia bug mới trong 7 ngày gần nhất và bug cũ, đồng thời loại Closed\/Cancelled/);
assert.match(appSource, /data-plan-bug-group=/);
assert.match(appSource, /Bug mới/);
assert.match(appSource, /Bug cũ/);
assert.match(appSource, /render:\s*\(row\)\s*=>\s*renderPlanBugLinks\(row\)/);
assert.match(appSource, /renderExternalLink\(bug\?\.url, label\)/);
assert.match(appSource, /renderUnmappedPlanBugGroups\(\)/);
assert.match(appSource, /Bug chưa có dòng Phân công UAT tương ứng/);
assert.match(appSource, /target="_blank" rel="noopener noreferrer"/);

console.log(JSON.stringify({
  ok: true,
  checked: {
    childOfMapping: true,
    prefixedStoryCodeNormalization: true,
    noStoryCodeTruncation: true,
    multipleBugsPerUs: true,
    closedExcluded: true,
    resolvedIncluded: true,
    cancelledExcluded: true,
    sevenDayRecencyGrouping: true,
    sourceCreatedDateFallback: true,
    duplicateRemoved: true,
    titleAndSafeHyperlink: true,
    directFeatureFallback: true,
    conflictingStoryCodeUsesSummary: true,
    unmappedUsFallback: true,
    missingChildOfFallback: true
  }
}, null, 2));
