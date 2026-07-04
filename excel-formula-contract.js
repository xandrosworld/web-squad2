const formulaColumnsBySheet = {
  Dashboard_UAT: ["B", "E", "F", "G", "H", "I", "L", "M", "N", "O"],
  DEFECT_Dashboard: ["B", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"],
  DM_ChucNang: ["G", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "T"],
  Lich_UAT: ["B", "C", "D", "E", "F"],
  Lich_BG_US: ["G", "H", "I", "J", "K"],
  PhanCong_UAT: ["E", "F", "G", "O", "Q", "S", "T"],
  DieuHanh_Ngay: ["B"],
  DEFECT_LOG: ["B", "C", "D", "E", "F", "G", "H", "I", "L"],
  ChatLuong_Tuan: ["C", "D", "E", "F", "G", "H", "I", "J"],
  TongKet_Sprint: ["B", "C", "D", "E", "F", "G", "H", "I", "J"],
  NangSuat_Tester: ["B", "C", "D", "E", "F", "G", "H", "J"],
  "Tong hop loi": ["H", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "AA", "AB", "AC", "AD", "AE", "AF", "AH"],
  DS_US: ["P"]
};

const computedFieldsByCollection = {
  features: [
    "sprint",
    "uatHandoff",
    "handoffStatus",
    "totalCases",
    "passedCases",
    "failedCases",
    "blockedCases",
    "defectOpen",
    "blockerOpen",
    "criticalOpen",
    "uatResult",
    "openBugs",
    "completionRate",
    "uatWarning"
  ],
  schedule: ["devEnd", "handoffDate", "startDate", "endDate"],
  handoffs: ["uatStart", "uatEnd", "uatStatus"],
  plans: ["sprint", "uatHandoff", "owner", "totalCases", "progress", "devStatus", "priority"],
  daily: ["jiraCode", "executedCases", "criticalBugs", "highBugs"],
  defects: ["featureJiraCode", "sprint", "aging"],
  userStories: ["squadSummary", "jiraCode"],
  bugSources: ["tester", "featureJiraCode", "jiraCode", "featureName"],
  defectSummary: ["*"],
  weekly: ["totalStories", "storyTested", "coverageRate", "successRate", "blockerBugs", "criticalBugs", "reopenRate", "assessment", "gateResult"],
  readiness: ["totalStories", "deliveredStories", "coverageRate", "successRate", "openBlockerBugs", "openCriticalBugs", "openMajorBugs", "openHighBugs", "reopenRate", "readinessLevel", "decision", "handoffDate"],
  matrix: ["totalParticipation", "warning"]
};

const formulaSourceNotes = {
  features: {
    sprint: "DM_ChucNang!G = VLOOKUP(Ten chuc nang, Lich_BG_US!D:E)",
    uatHandoff: "DM_ChucNang!I = XLOOKUP(Ma Jira, Lich_BG_US!A:F)",
    handoffStatus: "DM_ChucNang!J = VLOOKUP(Ma Jira, Lich_BG_US!A:I)",
    totalCases: "DM_ChucNang!K = SUMIFS(DieuHanh_Ngay!F, DieuHanh_Ngay!B, Ma Jira)",
    passedCases: "DM_ChucNang!L = SUMIFS(DieuHanh_Ngay!G, DieuHanh_Ngay!B, Ma Jira)",
    failedCases: "DM_ChucNang!M = SUMIFS(DieuHanh_Ngay!H, DieuHanh_Ngay!B, Ma Jira)",
    blockedCases: "DM_ChucNang!N = SUMIFS(DieuHanh_Ngay!I, DieuHanh_Ngay!B, Ma Jira)",
    defectOpen: "DM_ChucNang!O = COUNTIFS(DEFECT_LOG linked key/status)",
    blockerOpen: "DM_ChucNang!P = COUNTIFS(DEFECT_LOG linked key/Blocker/open)",
    criticalOpen: "DM_ChucNang!Q = COUNTIFS(DEFECT_LOG linked key/Critical/open)",
    uatResult: "DM_ChucNang!R = GO/NO GO formula",
    completionRate: "DM_ChucNang!T = SUMIF(PhanCong_UAT by Ma Jira)"
  },
  plans: {
    sprint: "PhanCong_UAT!E = VLOOKUP(Ten chuc nang, DM_ChucNang)",
    uatHandoff: "PhanCong_UAT!F = VLOOKUP(Ten chuc nang, Lich_BG_US)",
    owner: "PhanCong_UAT!G = VLOOKUP(Ma Jira, DM_ChucNang)",
    totalCases: "PhanCong_UAT!O = SUM(H:N)",
    progress: "PhanCong_UAT!Q = IFERROR(SUMIFS(DieuHanh_Ngay) / SUMIFS(DieuHanh_Ngay), 0)",
    devStatus: "PhanCong_UAT!S = VLOOKUP(Ma Jira, DM_ChucNang!S)",
    priority: "PhanCong_UAT!T = IFS(devStatus)"
  },
  matrix: {
    t1ToT6: "NangSuat_Tester!B:G are preserved from workbook cached values because the source formulas are row-aligned to PhanCong_UAT!I and not reliable after web sorting.",
    totalParticipation: "NangSuat_Tester!H = SUM(B:G)",
    warning: "NangSuat_Tester!J = IF(H<I, ...)"
  }
};

module.exports = {
  formulaColumnsBySheet,
  computedFieldsByCollection,
  formulaSourceNotes
};
