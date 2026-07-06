const fs = require("fs");
const path = require("path");

const {
  parseWorkbookImportState,
  applyWorkbookRules,
  loginIdentifierCandidates,
  buildExcelWorkbook
} = require("../server");

const workbookPath = path.resolve(process.argv[2] || "SQ02_UAT_Squad2_QuanLy_US_Date-2.7.xlsx");

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

async function main() {
  if (!fs.existsSync(workbookPath)) throw new Error(`Workbook not found: ${workbookPath}`);
  const baseState = await parseWorkbookImportState(fs.readFileSync(workbookPath));

  testPlanMutation(baseState);
  testDailyMutation(baseState);
  testDefectMutation(baseState);
  testHandoffMutation(baseState);
  testBugSourceMutation(baseState);
  testComputedOverwrite(baseState);
  testDefectTesterLookup(baseState);
  testShortBidvLoginIdentifier();

  console.log(JSON.stringify({
    ok: true,
    workbook: path.basename(workbookPath),
    mutationTests: 8
  }, null, 2));
}

function testPlanMutation(baseState) {
  const state = clone(baseState);
  const plan = state.plans.find((row) => Number(row.t1 || 0) > 0);
  assert(plan, "No PhanCong_UAT row with T1 value.");
  const beforePlanTotal = Number(plan.totalCases || 0);
  const beforeDashboardTotal = dashboardCell(state, "B8");
  plan.t1 = Number(plan.t1 || 0) + 5;

  applyWorkbookRules(state);
  const afterPlan = state.plans.find((row) => row.id === plan.id);
  assertEqual("PhanCong_UAT totalCases recompute", beforePlanTotal + 5, Number(afterPlan.totalCases || 0));
  assertEqual("Dashboard_UAT total testcase recompute", beforeDashboardTotal + 5, dashboardCell(state, "B8"));
}

function testDailyMutation(baseState) {
  const state = clone(baseState);
  const daily = state.daily.find((row) => row.jiraCode && state.features.some((feature) => same(feature.jiraCode, row.jiraCode)));
  assert(daily, "No DieuHanh_Ngay row linked to DM_ChucNang.");
  const feature = state.features.find((row) => same(row.jiraCode, daily.jiraCode));
  const readiness = state.readiness.find((row) => sameSprint(row.sprint, feature.sprint));
  const beforeFeatureTotal = Number(feature.totalCases || 0);
  const beforeFeaturePassed = Number(feature.passedCases || 0);
  const beforeReadinessTotal = Number(readiness?.totalCases || 0);
  const beforeReadinessPassed = Number(readiness?.passedCases || 0);

  daily.totalCases = Number(daily.totalCases || 0) + 7;
  daily.passedCases = Number(daily.passedCases || 0) + 4;
  daily.failedCases = Number(daily.failedCases || 0) + 3;

  applyWorkbookRules(state);
  const afterFeature = state.features.find((row) => row.id === feature.id);
  const afterReadiness = state.readiness.find((row) => sameSprint(row.sprint, feature.sprint));
  assertEqual("DM_ChucNang totalCases recompute from DieuHanh_Ngay", beforeFeatureTotal + 7, Number(afterFeature.totalCases || 0));
  assertEqual("DM_ChucNang passedCases recompute from DieuHanh_Ngay", beforeFeaturePassed + 4, Number(afterFeature.passedCases || 0));
  assertEqual("TongKet_Sprint totalCases recompute from DM_ChucNang", beforeReadinessTotal + 7, Number(afterReadiness.totalCases || 0));
  assertEqual("TongKet_Sprint passedCases recompute from DM_ChucNang", beforeReadinessPassed + 4, Number(afterReadiness.passedCases || 0));
}

function testDefectMutation(baseState) {
  const state = clone(baseState);
  const feature = state.features.find((row) => row.jiraCode && row.sprint);
  assert(feature, "No feature with Jira and sprint for defect mutation.");
  const readiness = state.readiness.find((row) => sameSprint(row.sprint, feature.sprint));
  const beforeCritical = Number(feature.criticalOpen || 0);
  const beforeOpen = Number(feature.defectOpen || 0);
  const beforeReadinessCritical = Number(readiness?.openCriticalBugs || 0);

  state.defects.push({
    id: "automation-critical-defect",
    bugId: "AUTO-CRITICAL",
    linkedUsKey: feature.jiraCode,
    storyName: feature.name,
    sprint: "",
    severity: "Critical",
    status: "Open",
    foundDate: "2026-07-05",
    tester: "Mai Tấn Thành",
    owner: feature.owner || "",
    resolvedDate: "",
    aging: 0,
    note: "automation mutation"
  });

  applyWorkbookRules(state);
  const afterFeature = state.features.find((row) => row.id === feature.id);
  const afterReadiness = state.readiness.find((row) => sameSprint(row.sprint, feature.sprint));
  assertEqual("DM_ChucNang defectOpen recompute from DEFECT_LOG", beforeOpen + 1, Number(afterFeature.defectOpen || 0));
  assertEqual("DM_ChucNang criticalOpen recompute from DEFECT_LOG", beforeCritical + 1, Number(afterFeature.criticalOpen || 0));
  assertEqual("TongKet_Sprint critical open recompute from DEFECT_LOG", beforeReadinessCritical + 1, Number(afterReadiness.openCriticalBugs || 0));
}

function testHandoffMutation(baseState) {
  const state = clone(baseState);
  const handoff = state.handoffs.find((row) => row.jiraCode && state.features.some((feature) => same(feature.jiraCode, row.jiraCode)));
  assert(handoff, "No Lich_BG_US row linked to feature.");
  const feature = state.features.find((row) => same(row.jiraCode, handoff.jiraCode));

  handoff.uatHandoff = "2026-12-24";
  applyWorkbookRules(state);

  const afterHandoff = state.handoffs.find((row) => row.id === handoff.id);
  const afterFeature = state.features.find((row) => row.id === feature.id);
  assertEqual("Lich_BG_US uatStart follows BG UAT", "2026-12-24", afterHandoff.uatStart);
  assertEqual("Lich_BG_US uatEnd follows BG UAT + 4 days", "2026-12-28", afterHandoff.uatEnd);
  assertEqual("DM_ChucNang uatHandoff follows Lich_BG_US", "2026-12-24", afterFeature.uatHandoff);
}

function testBugSourceMutation(baseState) {
  const state = clone(baseState);
  const feature = state.features.find((row) => state.userStories.some((story) => same(story.jiraCode, row.jiraCode)));
  assert(feature, "No DS_US story mapped to a feature.");
  const story = state.userStories.find((row) => same(row.jiraCode, feature.jiraCode));
  const beforeSummary = state.defectSummary.find((row) => same(row.jiraCode, feature.jiraCode));
  const beforeTotal = Number(beforeSummary?.totalBugs || 0);
  const beforeOpen = Number(beforeSummary?.openBugs || 0);

  state.bugSources.push({
    id: "automation-bug-source",
    issueType: "Bug",
    issueKey: "AUTO-BUG-SOURCE",
    summary: "automation mutation",
    reporter: "Mai Tấn Thành",
    priority: "Major",
    status: "Open",
    linkedUsKey: story.issueKey
  });

  applyWorkbookRules(state);
  const afterSummary = state.defectSummary.find((row) => same(row.jiraCode, feature.jiraCode));
  assertEqual("Tong hop loi totalBugs recompute from DS.Loi", beforeTotal + 1, Number(afterSummary.totalBugs || 0));
  assertEqual("Tong hop loi openBugs recompute from DS.Loi", beforeOpen + 1, Number(afterSummary.openBugs || 0));
}

function testComputedOverwrite(baseState) {
  const state = clone(baseState);
  const feature = state.features.find((row) => row.jiraCode);
  const plan = state.plans.find((row) => row.jiraCode);
  const defect = state.defects.find((row) => row.foundDate);
  assert(feature && plan && defect, "Missing source rows for computed overwrite test.");

  feature.totalCases = 9999;
  plan.totalCases = 9999;
  defect.aging = 9999;
  applyWorkbookRules(state);

  const afterFeature = state.features.find((row) => row.id === feature.id);
  const afterPlan = state.plans.find((row) => row.id === plan.id);
  const afterDefect = state.defects.find((row) => row.id === defect.id);
  assert(Number(afterFeature.totalCases || 0) !== 9999, "Feature computed totalCases was not overwritten.");
  assert(Number(afterPlan.totalCases || 0) !== 9999, "Plan computed totalCases was not overwritten.");
  assert(Number(afterDefect.aging || 0) !== 9999, "Defect computed aging was not overwritten.");
}

function testDefectTesterLookup(baseState) {
  const firstDefect = baseState.defects.find((row) => row.bugId === "PS0142025-10272");
  assert(firstDefect, "Missing PS0142025-10272 defect.");
  assertEqual("DEFECT_LOG tester from DS.Loi", "Nguyễn Gia Huy", firstDefect.tester);

  const state = clone(baseState);
  const defect = state.defects.find((row) => row.bugId === "PS0142025-10272");
  const sourceBug = state.bugSources.find((row) => row.issueKey === "PS0142025-10272");
  assert(defect && sourceBug, "Missing source rows for tester lookup mutation.");
  defect.tester = "";
  sourceBug.tester = "Mai Tấn Thành";
  applyWorkbookRules(state);
  assertEqual("DEFECT_LOG blank tester refills from DS.Loi", "Mai Tấn Thành", defect.tester);
}

function testShortBidvLoginIdentifier() {
  const candidates = loginIdentifierCandidates("huyng");
  assert(candidates.includes("huyng"), "Short login candidate should keep raw username.");
  assert(candidates.includes("huyng@bidv.com.vn"), "Short login candidate should include BIDV email.");
  const emailCandidates = loginIdentifierCandidates("thanhmt@bidv.com.vn");
  assert(emailCandidates.includes("thanhmt@bidv.com.vn"), "Email login candidate should keep full email.");
  assert(emailCandidates.includes("thanhmt"), "Email login candidate should include short username.");
}

function dashboardCell(state, address) {
  return buildExcelWorkbook(state).getWorksheet("Dashboard_UAT").getCell(address).value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(label, expected, actual) {
  if (expected !== actual) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function same(left, right) {
  return normalize(left) === normalize(right);
}

function sameSprint(left, right) {
  if (same(left, right)) return true;
  const leftNumber = singleSprintNumber(left);
  const rightNumber = singleSprintNumber(right);
  return leftNumber !== null && leftNumber === rightNumber;
}

function singleSprintNumber(value) {
  const numbers = [...String(value || "").matchAll(/\d+/g)].map((match) => Number(match[0]));
  return numbers.length === 1 ? numbers[0] : null;
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("vi")
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
