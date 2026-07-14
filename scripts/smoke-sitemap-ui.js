const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright-core");
const {
  applyWorkbookRules,
  __testApplyWorkKpiRules: applyWorkKpiRules,
  __testDefaultWorkKpiConfig: defaultKpiConfig,
  __testBuildPilotWorkPlanSeedRecords: buildPilotWorkPlanSeedRecords,
  __testEmptyState: emptyState
} = require("../server");

const baseUrl = process.env.SMOKE_URL || "http://localhost:3100";
const chromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];
const executablePath = process.env.SMOKE_BROWSER || chromePaths.find(fs.existsSync);

if (!executablePath) throw new Error("Không tìm thấy Chrome/Edge để chạy sitemap UI smoke.");

(async () => {
  const state = await buildFixtureState();
  const browser = await chromium.launch({ executablePath, headless: true });
  const desktopShot = path.join(os.tmpdir(), "squad2-sitemap-desktop.png");
  const collapsedSidebarShot = path.join(os.tmpdir(), "squad2-sidebar-collapsed.png");
  const dashboardShot = path.join(os.tmpdir(), "squad2-work-dashboard.png");
  const taskMasterShot = path.join(os.tmpdir(), "squad2-task-master.png");
  const inputsShot = path.join(os.tmpdir(), "squad2-work-inputs.png");
  const personnelMapShot = path.join(os.tmpdir(), "squad2-personnel-map.png");
  const memberKpiShot = path.join(os.tmpdir(), "squad2-member-kpi.png");
  const groupShot = path.join(os.tmpdir(), "squad2-group-t02.png");
  const mobileShot = path.join(os.tmpdir(), "squad2-sitemap-mobile.png");
  try {
    const desktop = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await mockApi(desktop, state);
    const page = await desktop.newPage();
    const errors = collectErrors(page);
    await page.goto(`${baseUrl}/#work/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".navigation-tree .tree-link", { timeout: 15000 });

    const sidebarToggle = page.locator('[data-action="toggle-sidebar-collapse"]');
    if (!await sidebarToggle.isVisible() || await sidebarToggle.locator("svg").count() !== 1) {
      throw new Error("Desktop sidebar is missing the visible panel toggle.");
    }
    if (await sidebarToggle.getAttribute("aria-expanded") !== "true") {
      throw new Error("Expanded desktop sidebar toggle has incorrect accessibility state.");
    }
    const expandedLayout = await page.evaluate(() => ({
      sidebar: document.querySelector(".navigation-tree")?.getBoundingClientRect().width || 0,
      main: document.querySelector(".main")?.getBoundingClientRect().width || 0
    }));
    await sidebarToggle.click();
    await page.waitForFunction(() => Math.abs((document.querySelector(".navigation-tree")?.getBoundingClientRect().width || 0) - 64) < 1);
    const collapsedLayout = await page.evaluate(() => ({
      sidebar: document.querySelector(".navigation-tree")?.getBoundingClientRect().width || 0,
      main: document.querySelector(".main")?.getBoundingClientRect().width || 0,
      stored: localStorage.getItem("squad2-sidebar-collapsed")
    }));
    if (collapsedLayout.sidebar !== 64 || collapsedLayout.main <= expandedLayout.main || collapsedLayout.stored !== "true") {
      throw new Error(`Desktop sidebar collapse layout is incorrect: ${JSON.stringify({ expandedLayout, collapsedLayout })}`);
    }
    if (!await sidebarToggle.isVisible() || await sidebarToggle.getAttribute("aria-expanded") !== "false") {
      throw new Error("Collapsed desktop rail does not keep an accessible expand button visible.");
    }
    await page.screenshot({ path: collapsedSidebarShot, fullPage: true });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".navigation-tree.collapsed");
    const persistedToggle = page.locator('[data-action="toggle-sidebar-collapse"]');
    if (!await persistedToggle.isVisible()) throw new Error("Persisted collapsed rail lost its expand button.");
    await persistedToggle.click();
    await page.waitForFunction(() => Math.abs((document.querySelector(".navigation-tree")?.getBoundingClientRect().width || 0) - 258) < 1);
    if (await page.evaluate(() => localStorage.getItem("squad2-sidebar-collapsed")) !== "false") {
      throw new Error("Desktop sidebar expanded state was not persisted.");
    }
    await page.setViewportSize({ width: 1024, height: 768 });
    await assertNoPageOverflow(page, "expanded sidebar laptop");
    await page.locator('[data-action="toggle-sidebar-collapse"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => Math.abs((document.querySelector(".navigation-tree")?.getBoundingClientRect().width || 0) - 64) < 1);
    if (await page.locator(':focus').getAttribute("data-action") !== "toggle-sidebar-collapse") {
      throw new Error("Desktop sidebar toggle lost keyboard focus after collapsing.");
    }
    await assertNoPageOverflow(page, "collapsed sidebar laptop");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => Math.abs((document.querySelector(".navigation-tree")?.getBoundingClientRect().width || 0) - 258) < 1);
    await page.setViewportSize({ width: 1600, height: 1000 });

    await assertRoute(page, "work/dashboard", ".work-dashboard-grid");
    await assertNoPageOverflow(page, "dashboard desktop");
    const metricLabels = await page.locator(".work-plan-summary .work-metric span").allTextContents();
    for (const expectedLabel of ["Tổng công việc", "Chưa bắt đầu", "Đang thực hiện", "Chờ phê duyệt", "Quá hạn", "Hoàn thành"]) {
      if (!metricLabels.includes(expectedLabel)) throw new Error(`Thiếu KPI ${expectedLabel}.`);
    }
    await page.screenshot({ path: dashboardShot, fullPage: true });
    await page.locator('[data-action="set-work-metric"][data-work-view="notStarted"]').click();
    await page.waitForSelector('.work-view-tab.active[data-work-view="notStarted"]');
    if (new URL(page.url()).hash !== "#work/task-master") throw new Error("KPI Dashboard không mở Task_Master.");
    await assertRoute(page, "work/task-master", ".standalone-work-items");
    await page.locator('[data-page-size="workItems"]').selectOption("50");
    const visibleWorkOrders = await page.locator('[data-resizable-table="workItems"] tbody tr').evaluateAll((rows) => rows.map((row) => ({
      order: row.cells[0]?.textContent?.trim() || "",
      category: row.cells[2]?.textContent?.trim() || ""
    })));
    const firstOrderByCategory = new Map();
    visibleWorkOrders.forEach((row) => {
      if (row.category && !firstOrderByCategory.has(row.category)) firstOrderByCategory.set(row.category, row.order);
    });
    if (firstOrderByCategory.size < 2 || [...firstOrderByCategory.values()].some((order) => order !== "1")) {
      throw new Error(`STT chưa reset từ 1 theo từng nhóm: ${JSON.stringify([...firstOrderByCategory.entries()])}`);
    }
    await page.screenshot({ path: taskMasterShot, fullPage: true });
    await page.locator('[data-action="open-create"]').first().click();
    await page.waitForSelector("#recordForm");
    await assertOptionCount(page, "categoryId", 11);
    await assertOptionCount(page, "status", 6);
    await assertOptionCount(page, "priority", 4);
    await assertOptionCount(page, "assignee", 11);
    await assertOptionCount(page, "collaborators", 11);
    await assertFieldLabel(page, "assignee", "Người thực hiện");
    await assertFieldLabel(page, "collaborators", "Đầu mối nghiệp vụ");
    await assertFieldLabel(page, "startDate", "Ngày giao việc");
    if (await page.locator('[name="assigneeEmail"]').count()) {
      throw new Error("Email người thực hiện là field kỹ thuật và không được hiện trong form người dùng.");
    }
    await page.locator('[data-action="close-modal"]').first().click();
    await assertRoute(page, "work/inputs", ".input-catalog-grid");
    await page.screenshot({ path: inputsShot, fullPage: true });
    await assertRoute(page, "common/personnel/list", "[data-resizable-table=personnel]");
    await assertRoute(page, "common/personnel/map", ".personnel-map");
    if (await page.locator(".personnel-map .member-avatar img").count() !== 1) {
      throw new Error("Sơ đồ nhân sự không hiển thị avatar tài khoản đã được cấu hình.");
    }
    if (await page.locator(".personnel-map .member-avatar:not(.has-image)").count() < 1) {
      throw new Error("Sơ đồ nhân sự thiếu fallback chữ viết tắt cho tài khoản chưa có avatar.");
    }
    await page.screenshot({ path: personnelMapShot, fullPage: true });
    await assertRoute(page, "common/personnel/kpi", ".kpi-config-grid");
    await assertRoute(page, "work/member-kpi", ".member-kpi-table");
    await page.screenshot({ path: memberKpiShot, fullPage: true });
    await assertRoute(page, "common/guide", ".guide-page");
    await assertRoute(page, "work/group/pilot-t01/dashboard", ".t01-module-tabs");
    await page.waitForSelector(".sheet-dashboard");
    const t01MetricSignatures = [];
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Tổng chức năng", "Tổng testcase", "TC Passed", "TC Failed", "Đang xử lý", "Hoàn thành UAT"]));
    await assertRoute(page, "work/group/pilot-t01/defectDashboard", ".defect-dashboard-panel");
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Tổng defect", "Đang mở", "Đã xử lý", "Tỷ lệ xử lý", "Blocker/Critical", "Reopen"]));
    await assertRoute(page, "work/group/pilot-t01/features", '[data-resizable-table="features"]');
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Tổng chức năng", "Chưa bắt đầu", "Đang thực hiện", "Chưa bàn giao", "Quá hạn", "Hoàn thành"]));
    const inProgressValue = Number((await page.locator('[data-action="set-t01-metric"][data-t01-view="inProgress"] strong').textContent() || "").trim());
    if (inProgressValue !== 3) throw new Error(`KPI DM_ChucNang Đang thực hiện cần 3, nhận ${inProgressValue}.`);
    await page.locator('[data-action="set-t01-metric"][data-t01-view="inProgress"]').click();
    const t01FilteredRows = await page.locator('[data-resizable-table="features"] tbody tr').count();
    if (t01FilteredRows !== 3) throw new Error(`KPI T01 Đang thực hiện cần lọc 3 chức năng, nhận ${t01FilteredRows}.`);
    await assertFeatureTableHorizontalAccess(page, "desktop");
    await assertRoute(page, "work/group/pilot-t01/handoffs", '[data-resizable-table="handoffs"]');
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Tổng User Story", "Đã bàn giao", "Chưa bàn giao", "Chưa bắt đầu UAT", "Đang UAT", "Hoàn thành UAT"]));
    await page.locator('[data-action="set-t01-metric"][data-t01-view="notHandedOff"]').click();
    if (await page.locator('[data-resizable-table="handoffs"] tbody tr').count() !== 1) throw new Error("KPI Lich_BG_US Chưa bàn giao lọc sai dữ liệu.");
    await assertRoute(page, "work/group/pilot-t01/plans", '[data-resizable-table="plans"]');
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Tổng chức năng", "Tổng testcase", "Đã phân công", "Chưa phân công", "Đang kiểm thử", "Hoàn thành"]));
    await assertT01MetricRowFilter(page, "plans", "unassigned", 1);
    await assertRoute(page, "work/group/pilot-t01/daily", '[data-resizable-table="daily"]');
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Lượt cập nhật", "Tổng testcase", "TC Passed", "TC Failed", "Dòng có lỗi mở", "Có blocker"]));
    await assertT01MetricRowFilter(page, "daily", "blocker", 1);
    await assertRoute(page, "work/group/pilot-t01/defects", ".secondary-tabs");
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Tổng defect", "Open", "In Progress", "Pending/Reopen", "Resolved/SIT Pass", "Closed/Cancelled"]));
    await assertT01MetricRowFilter(page, "defects", "pendingOrReopen", 1);
    await assertRoute(page, "work/group/pilot-t01/defectSummary", ".secondary-tabs .active");
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Tổng User Story", "US có lỗi", "Tổng lỗi", "Lỗi đang mở", "Lỗi đã xử lý", "Lỗi nghiêm trọng"]));
    await assertT01MetricRowFilter(page, "defectSummary", "hasBugs", 5);
    await assertRoute(page, "work/group/pilot-t01/weekly", '[data-resizable-table="weekly"]');
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Số tuần", "Coverage TB", "Pass Rate TB", "Blocker Open", "Critical Open", "Tuần chưa đạt"]));
    await assertT01MetricRowFilter(page, "weekly", "notMet", 1);
    await assertRoute(page, "work/group/pilot-t01/readiness", '[data-resizable-table="readiness"]');
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Tổng Sprint", "Coverage TB", "Pass Rate TB", "Có thể GO", "NO GO", "Sprint còn lỗi nặng"]));
    await assertT01MetricRowFilter(page, "readiness", "noGo", 1);
    await assertRoute(page, "work/group/pilot-t01/matrix", '[data-resizable-table="matrix"]');
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Nhóm chức năng", "Tổng lượt tham gia", "Tổng mục tiêu", "Tester có tham gia", "Nhóm đạt", "Thiếu luân chuyển"]));
    await assertT01MetricRowFilter(page, "matrix", "insufficient", 1);
    if (new Set(t01MetricSignatures).size !== t01MetricSignatures.length) throw new Error("Các sheet T01 còn dùng trùng bộ dashboard KPI.");
    await assertRoute(page, "work/group/pilot-t03", ".standalone-work-items");
    const firstLocalOrder = (await page.locator('[data-resizable-table="workItems"] tbody tr').first().locator("td").first().textContent() || "").trim();
    if (firstLocalOrder !== "1") throw new Error(`STT đầu nhóm T03 phải là 1, nhận ${firstLocalOrder || "trống"}.`);
    await page.screenshot({ path: groupShot, fullPage: true });

    const sidebarScrollBefore = await page.locator(".sidebar-menu").evaluate((sidebar) => {
      sidebar.scrollTop = sidebar.scrollHeight;
      return sidebar.scrollTop;
    });
    await page.locator('[data-route="work/group/pilot-t09"]').click();
    await page.waitForSelector(".standalone-work-items");
    const sidebarScrollAfter = await page.locator(".sidebar-menu").evaluate((sidebar) => sidebar.scrollTop);
    if (sidebarScrollBefore > 0 && sidebarScrollAfter < Math.max(1, sidebarScrollBefore - 4)) {
      throw new Error(`Sidebar bị nhảy lên trên: ${sidebarScrollBefore} -> ${sidebarScrollAfter}.`);
    }

    const categoryLinks = await page.locator(".tree-category-list .tree-link").count();
    if (categoryLinks !== 10) throw new Error(`Sidebar cần đúng 10 nhóm seed, nhận ${categoryLinks}.`);
    if (await page.locator('[data-route*="DS_US"], [data-route*="DS.Loi"]').count()) {
      throw new Error("DS_US/DS.Loi không được hiện trong navigation.");
    }
    await page.goto(`${baseUrl}/#work/group/pilot-t01/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".sheet-dashboard");
    await page.screenshot({ path: desktopShot, fullPage: true });
    if (errors.length) throw new Error(`Lỗi trình duyệt desktop: ${errors.join(" | ")}`);
    await desktop.close();

    const scopedEditor = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await mockScopedEditorApi(scopedEditor, state);
    const scopedEditorPage = await scopedEditor.newPage();
    const scopedEditorErrors = collectErrors(scopedEditorPage);
    await scopedEditorPage.goto(`${baseUrl}/#work/group/pilot-t07`, { waitUntil: "domcontentloaded" });
    await scopedEditorPage.waitForSelector('[data-resizable-table="workItems"] tbody tr', { timeout: 15000 });
    const t07Rows = await scopedEditorPage.locator('[data-resizable-table="workItems"] tbody tr').count();
    const expectedT07Rows = state.workItems.filter((row) => row.categoryId === "pilot-t07").length;
    if (t07Rows !== expectedT07Rows) throw new Error(`T07 scoped editor expected ${expectedT07Rows} rows, received ${t07Rows}.`);
    if (await scopedEditorPage.locator('[data-action="open-edit"]').count() !== t07Rows) {
      throw new Error("T07 scoped editor cannot fully edit every T07 work item.");
    }
    if (await scopedEditorPage.locator('[data-action="open-work-progress"]').count() !== t07Rows) {
      throw new Error("T07 scoped editor cannot update progress for every T07 work item.");
    }
    if (await scopedEditorPage.locator('[data-action="delete-row"], .permission-lock').count()) {
      throw new Error("T07 scoped editor unexpectedly received delete access or a locked row.");
    }
    await scopedEditorPage.goto(`${baseUrl}/#work/group/pilot-t08`, { waitUntil: "domcontentloaded" });
    await scopedEditorPage.waitForSelector('[data-resizable-table="workItems"] tbody tr', { timeout: 15000 });
    const t08Rows = await scopedEditorPage.locator('[data-resizable-table="workItems"] tbody tr').count();
    if (!t08Rows || await scopedEditorPage.locator('.permission-lock').count() !== t08Rows) {
      throw new Error("T07 scoped editor has unexpected edit access outside T07.");
    }
    if (await scopedEditorPage.locator('[data-action="open-edit"], [data-action="open-work-progress"], [data-action="delete-row"]').count()) {
      throw new Error("T07 scoped editor action buttons leaked into T08.");
    }
    if (scopedEditorErrors.length) throw new Error(`Scoped editor browser errors: ${scopedEditorErrors.join(" | ")}`);
    await scopedEditor.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await mobile.addInitScript(() => localStorage.setItem("squad2-sidebar-collapsed", "true"));
    await mockApi(mobile, state);
    const mobilePage = await mobile.newPage();
    const mobileErrors = collectErrors(mobilePage);
    await mobilePage.goto(`${baseUrl}/#work/dashboard`, { waitUntil: "domcontentloaded" });
    await mobilePage.waitForSelector(".mobile-menu-btn", { timeout: 15000 });
    await mobilePage.locator(".mobile-menu-btn").click();
    await mobilePage.waitForSelector(".navigation-tree.mobile-open");
    if (!await mobilePage.locator(".sidebar-brand strong").isVisible()) {
      throw new Error("Mobile drawer inherited the desktop collapsed labels.");
    }
    if (!await mobilePage.locator(".sidebar-mobile-close").isVisible() || await mobilePage.locator(".sidebar-collapse-toggle").isVisible()) {
      throw new Error("Mobile drawer does not expose the dedicated close control.");
    }
    const mobileDrawerWidth = await mobilePage.locator(".navigation-tree").evaluate((sidebar) => sidebar.getBoundingClientRect().width);
    if (mobileDrawerWidth < 250) throw new Error(`Mobile drawer remained collapsed at ${mobileDrawerWidth}px.`);
    await mobilePage.screenshot({ path: mobileShot, fullPage: true });
    await mobilePage.locator(".sidebar-mobile-close").click();
    await mobilePage.waitForSelector(".navigation-tree:not(.mobile-open)", { state: "attached" });
    if (await mobilePage.locator(".navigation-tree").isVisible()) throw new Error("Mobile drawer remained visible after using its close button.");
    await mobilePage.locator(".mobile-menu-btn").click();
    await mobilePage.waitForSelector(".navigation-tree.mobile-open");
    await mobilePage.keyboard.press("Escape");
    await mobilePage.waitForSelector(".navigation-tree:not(.mobile-open)", { state: "attached" });
    if (await mobilePage.locator(".navigation-tree").isVisible()) throw new Error("Mobile drawer remained visible after pressing Escape.");
    if (!await mobilePage.locator(".mobile-menu-btn").evaluate((button) => button === document.activeElement)) {
      throw new Error("Escape did not return focus to the mobile sidebar opener.");
    }
    await mobilePage.locator(".mobile-menu-btn").click();
    await mobilePage.waitForSelector(".navigation-tree.mobile-open");
    await mobilePage.locator('[data-route="work/task-master"]').click();
    await mobilePage.waitForSelector(".standalone-work-items");
    if (await mobilePage.locator(".navigation-tree.mobile-open").count()) throw new Error("Mobile drawer không đóng sau khi chọn màn.");
    await assertNoPageOverflow(mobilePage, "Task_Master mobile");
    await mobilePage.goto(`${baseUrl}/#work/group/pilot-t01/features`, { waitUntil: "domcontentloaded" });
    await mobilePage.waitForSelector('[data-resizable-table="features"]');
    await assertFeatureTableHorizontalAccess(mobilePage, "mobile");
    await assertNoPageOverflow(mobilePage, "DM_ChucNang mobile");
    if (mobileErrors.length) throw new Error(`Lỗi trình duyệt mobile: ${mobileErrors.join(" | ")}`);
    await mobile.close();

    console.log(JSON.stringify({
      ok: true,
      routes: 12,
      categories: categoryLinks,
      desktopScreenshot: desktopShot,
      collapsedSidebarScreenshot: collapsedSidebarShot,
      dashboardScreenshot: dashboardShot,
      taskMasterScreenshot: taskMasterShot,
      inputsScreenshot: inputsShot,
      personnelMapScreenshot: personnelMapShot,
      memberKpiScreenshot: memberKpiShot,
      groupScreenshot: groupShot,
      mobileScreenshot: mobileShot
    }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});

async function buildFixtureState() {
  const state = emptyState();
  state.personnel = [
    { id: "person-thanh", staffCode: "NV01", name: "Mai Tấn Thành", email: "thanhmt@bidv.com.vn", role: "Điều phối", status: "Hoạt động" },
    { id: "person-huy", staffCode: "NV02", name: "Nguyễn Gia Huy", email: "huyng@bidv.com.vn", role: "Tester", status: "Hoạt động" }
  ];
  state.features = [
    { id: "feature-1", stt: 1, jiraCode: "SQ2-F01", name: "Chức năng chưa bắt đầu", sprint: "Sprint 1", status: "", handoffStatus: "⏯️Chưa bàn giao", totalCases: 10, passedCases: 0, failedCases: 0, completionRate: 0 },
    { id: "feature-2", stt: 2, jiraCode: "SQ2-F02", name: "Chức năng Done RSD", sprint: "Sprint 1", status: "Done RSD", handoffStatus: "⏯️Chưa bàn giao", totalCases: 10, passedCases: 2, failedCases: 1, completionRate: 20 },
    { id: "feature-3", stt: 3, jiraCode: "SQ2-F03", name: "Chức năng Done DEV", sprint: "Sprint 1", status: "Done DEV", handoffStatus: "✅ Đã bàn giao", totalCases: 10, passedCases: 5, failedCases: 1, completionRate: 40 },
    { id: "feature-4", stt: 4, jiraCode: "SQ2-F04", name: "Chức năng Done SIT", sprint: "Sprint 1", status: "Done SIT", handoffStatus: "✅ Đã bàn giao", totalCases: 10, passedCases: 8, failedCases: 2, completionRate: 70 },
    { id: "feature-5", stt: 5, jiraCode: "SQ2-F05", name: "Chức năng Done UAT", sprint: "Sprint 1", status: "Done UAT", handoffStatus: "✅ Đã bàn giao", totalCases: 10, passedCases: 10, failedCases: 0, completionRate: 100 }
  ];
  state.handoffs = [
    { id: "handoff-1", jiraCode: "SQ2-F01", name: "Chức năng chưa bắt đầu", sprint: "Sprint 1", handoffStatus: "⏯️Chưa bàn giao", uatStatus: "Done RSD" },
    { id: "handoff-2", jiraCode: "SQ2-F03", name: "Chức năng Done DEV", sprint: "Sprint 1", uatHandoff: "2026-07-10", handoffStatus: "✅ Đã bàn giao", uatStatus: "Done DEV" },
    { id: "handoff-3", jiraCode: "SQ2-F05", name: "Chức năng Done UAT", sprint: "Sprint 1", uatHandoff: "2026-07-08", handoffStatus: "✅ Đã bàn giao", uatStatus: "Done UAT" }
  ];
  state.plans = [
    { id: "plan-1", code: "SQ2-F01", jiraCode: "SQ2-F01", feature: "Chức năng chưa bắt đầu", uatStatus: "Chưa bắt đầu" },
    { id: "plan-2", code: "SQ2-F03", jiraCode: "SQ2-F03", feature: "Chức năng Done DEV", t1: 20, uatStatus: "Đang kiểm thử", progress: 50 },
    { id: "plan-3", code: "SQ2-F05", jiraCode: "SQ2-F05", feature: "Chức năng Done UAT", t2: 30, uatStatus: "Hoàn thành", progress: 100 }
  ];
  state.daily = [
    { id: "daily-1", date: "2026-07-13", jiraCode: "SQ2-F03", feature: "Chức năng Done DEV", sprint: "Sprint 1", tester: "T1", totalCases: 10, passedCases: 8, failedCases: 2, bugStatus: "Open", maxBugSeverity: "Critical", blocker: "Chờ xử lý lỗi" },
    { id: "daily-2", date: "2026-07-14", jiraCode: "SQ2-F05", feature: "Chức năng Done UAT", sprint: "Sprint 1", tester: "T2", totalCases: 5, passedCases: 5, failedCases: 0, bugStatus: "Resolved", maxBugSeverity: "Minor", blocker: "" }
  ];
  state.defects = [
    { id: "defect-1", stt: 1, bugId: "BUG-1", featureJiraCode: "SQ2-F01", sprint: "Sprint 1", severity: "Critical", status: "Open" },
    { id: "defect-2", stt: 2, bugId: "BUG-2", featureJiraCode: "SQ2-F02", sprint: "Sprint 1", severity: "Major", status: "In Progress" },
    { id: "defect-3", stt: 3, bugId: "BUG-3", featureJiraCode: "SQ2-F03", sprint: "Sprint 1", severity: "Major", status: "Reopen" },
    { id: "defect-4", stt: 4, bugId: "BUG-4", featureJiraCode: "SQ2-F03", sprint: "Sprint 1", severity: "Minor", status: "Resolved" },
    { id: "defect-5", stt: 5, bugId: "BUG-5", featureJiraCode: "SQ2-F04", sprint: "Sprint 1", severity: "Minor", status: "SIT Pass" },
    { id: "defect-6", stt: 6, bugId: "BUG-6", featureJiraCode: "SQ2-F05", sprint: "Sprint 1", severity: "Minor", status: "Closed" }
  ];
  state.weekly = [
    { id: "weekly-1", week: "Tuần 1", sprint: "Sprint 1", assessment: "Đạt có điều kiện" },
    { id: "weekly-2", week: "Tuần 2", sprint: "Sprint 2", assessment: "Chưa đạt" }
  ];
  state.readiness = [
    { id: "readiness-1", sprint: "Sprint 1", decision: "CONDITIONAL GO" },
    { id: "readiness-2", sprint: "Sprint 2", decision: "NO GO" }
  ];
  state.matrix = [
    { id: "matrix-1", group: "Luồng xử lý", t1: 2, t2: 1, target: 3 },
    { id: "matrix-2", group: "Thông tin KH", t1: 1, target: 3 }
  ];
  const now = new Date().toISOString();
  for (const row of buildPilotWorkPlanSeedRecords(now)) state[row.collection].push(row.data);
  state.kpiConfig = [{ ...defaultKpiConfig }];
  state.memberKpiInputs = [];
  applyWorkbookRules(state);
  applyWorkKpiRules(state);
  state.updatedAt = now;
  return state;
}

async function mockApi(context, state) {
  await context.route("**/api/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ authenticated: true, user: { id: "smoke-admin", username: "thanhmt", email: "thanhmt@bidv.com.vn", name: "Mai Tấn Thành", role: "admin" } })
  }));
  await context.route("**/api/state", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state }) }));
  await context.route("**/api/directory/users", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ users: [{
      id: "smoke-admin",
      username: "thanhmt",
      email: "thanhmt@bidv.com.vn",
      name: "Mai Tấn Thành",
      role: "admin",
      avatarData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    }] })
  }));
}

async function mockScopedEditorApi(context, state) {
  const scopedState = JSON.parse(JSON.stringify(state));
  scopedState.workItems = scopedState.workItems.map((row) => {
    const isGroupEditor = row.categoryId === "pilot-t07";
    return {
      ...row,
      _ownership: {
        isOwner: false,
        isLinkedOwner: false,
        isGroupEditor,
        canManage: isGroupEditor,
        canEdit: isGroupEditor,
        canDelete: false
      }
    };
  });
  const user = {
    id: "smoke-phuongbtm",
    username: "phuongbtm",
    email: "phuongbtm@bidv.com.vn",
    name: "Bui Thi Mai Phuong",
    role: "user"
  };
  await context.route("**/api/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ authenticated: true, user })
  }));
  await context.route("**/api/state", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ state: scopedState })
  }));
  await context.route("**/api/directory/users", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ users: [user] })
  }));
}

function collectErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.error(`PAGEERROR: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("favicon")) {
      errors.push(message.text());
      console.error(`CONSOLE: ${message.text()}`);
    }
  });
  return errors;
}

async function assertRoute(page, route, selector) {
  await page.locator(`[data-route="${route}"]`).first().click();
  try {
    await page.waitForSelector(selector, { timeout: 10000 });
  } catch (error) {
    const title = await page.locator(".screen-title").textContent().catch(() => "");
    throw new Error(`Route ${route} không hiện ${selector}; URL=${page.url()}; title=${title || "-"}; ${error.message}`);
  }
  const hash = new URL(page.url()).hash.replace(/^#/, "");
  if (hash !== route) throw new Error(`Route ${route} mở sai hash ${hash}.`);
}

async function assertOptionCount(page, name, expected) {
  const count = await page.locator(`select[name="${name}"] option`).count();
  if (count !== expected) throw new Error(`Dropdown ${name} cần ${expected} lựa chọn (gồm lựa chọn trống), nhận ${count}.`);
}

async function assertFieldLabel(page, name, expected) {
  const label = (await page.locator(`.field:has([name="${name}"]) > label`).textContent() || "").trim();
  if (label !== expected) throw new Error(`Field ${name} cần nhãn "${expected}", nhận "${label}".`);
}

async function assertT01MetricLabels(page, expected) {
  const labels = (await page.locator(".t01-context-summary .work-metric span").allTextContents()).map((label) => label.trim());
  if (JSON.stringify(labels) !== JSON.stringify(expected)) {
    throw new Error(`Dashboard KPI không đúng ngữ cảnh: cần ${JSON.stringify(expected)}, nhận ${JSON.stringify(labels)}.`);
  }
  return labels.join("|");
}

async function assertT01MetricRowFilter(page, collection, view, expectedRows) {
  const metric = page.locator(`[data-action="set-t01-metric"][data-t01-view="${view}"]`);
  await metric.click();
  if (!(await metric.getAttribute("class")).includes("active")) {
    throw new Error(`KPI ${collection}:${view} không được đánh dấu đang lọc.`);
  }
  const rowCount = await page.locator(`[data-resizable-table="${collection}"] tbody tr`).count();
  if (rowCount !== expectedRows) {
    throw new Error(`KPI ${collection}:${view} cần lọc ${expectedRows} dòng, nhận ${rowCount}.`);
  }
}

async function assertFeatureTableHorizontalAccess(page, label) {
  const tableSelector = '[data-resizable-table="features"]';
  const metrics = await page.locator(tableSelector).evaluate((table) => {
    const viewport = table.closest('[data-table-scrollbar="main"]');
    const headers = [...table.querySelectorAll('thead th[data-column-index]')];
    const stickyHeaders = headers.filter((header) => header.classList.contains("sticky-col"));
    return {
      columnCount: headers.length,
      stickyCount: stickyHeaders.length,
      stickyWidth: stickyHeaders.reduce((total, header) => total + header.getBoundingClientRect().width, 0),
      viewportWidth: viewport?.clientWidth || 0,
      maxScrollLeft: viewport ? viewport.scrollWidth - viewport.clientWidth : 0
    };
  });

  if (metrics.columnCount !== 21) {
    throw new Error(`DM_ChucNang ${label} expected 21 columns, received ${metrics.columnCount}.`);
  }
  if (metrics.stickyCount > 4 || metrics.stickyWidth > metrics.viewportWidth * 0.5 + 2) {
    throw new Error(`DM_ChucNang ${label} sticky columns hide the table: ${JSON.stringify(metrics)}.`);
  }
  if (metrics.maxScrollLeft <= 0) {
    throw new Error(`DM_ChucNang ${label} has no horizontal scroll range.`);
  }

  const lateColumnVisible = await page.locator(tableSelector).evaluate(async (table) => {
    const viewport = table.closest('[data-table-scrollbar="main"]');
    const lateHeader = table.querySelector('thead th[data-column-key="uatWarning"]');
    if (!viewport || !lateHeader) return false;
    viewport.scrollLeft = viewport.scrollWidth;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const viewportRect = viewport.getBoundingClientRect();
    const headerRect = lateHeader.getBoundingClientRect();
    return headerRect.left < viewportRect.right && headerRect.right > viewportRect.left;
  });
  if (!lateColumnVisible) {
    throw new Error(`DM_ChucNang ${label} cannot scroll to the UAT warning column.`);
  }
}

async function assertNoPageOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  if (dimensions.width > dimensions.viewport + 1) {
    throw new Error(`${label} tràn ngang trang: ${dimensions.width}px > ${dimensions.viewport}px.`);
  }
}
