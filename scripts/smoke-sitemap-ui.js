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
    const t01Expected = { all: 5, notStarted: 1, inProgress: 3, approval: 0, overdue: 0, done: 1 };
    for (const [view, expected] of Object.entries(t01Expected)) {
      const value = Number((await page.locator(`[data-action="set-work-metric"][data-work-view="${view}"] strong`).textContent() || "").trim());
      if (value !== expected) throw new Error(`KPI T01 ${view} cần ${expected}, nhận ${value}.`);
    }
    await page.locator('[data-action="set-work-metric"][data-work-view="inProgress"]').click();
    await page.waitForSelector('[data-resizable-table="features"]');
    if (new URL(page.url()).hash !== "#work/group/pilot-t01/features") throw new Error("KPI T01 không mở DM_ChucNang.");
    const t01FilteredRows = await page.locator('[data-resizable-table="features"] tbody tr').count();
    if (t01FilteredRows !== 3) throw new Error(`KPI T01 Đang thực hiện cần lọc 3 chức năng, nhận ${t01FilteredRows}.`);
    await assertFeatureTableHorizontalAccess(page, "desktop");
    await assertRoute(page, "work/group/pilot-t01/defects", ".secondary-tabs");
    await assertRoute(page, "work/group/pilot-t01/defectSummary", ".secondary-tabs .active");
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

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await mockApi(mobile, state);
    const mobilePage = await mobile.newPage();
    const mobileErrors = collectErrors(mobilePage);
    await mobilePage.goto(`${baseUrl}/#work/dashboard`, { waitUntil: "domcontentloaded" });
    await mobilePage.waitForSelector(".mobile-menu-btn", { timeout: 15000 });
    await mobilePage.locator(".mobile-menu-btn").click();
    await mobilePage.waitForSelector(".navigation-tree.mobile-open");
    await mobilePage.screenshot({ path: mobileShot, fullPage: true });
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
    { id: "feature-1", stt: 1, jiraCode: "SQ2-F01", name: "Chức năng chưa bắt đầu", status: "", completionRate: 0 },
    { id: "feature-2", stt: 2, jiraCode: "SQ2-F02", name: "Chức năng Done RSD", status: "Done RSD", completionRate: 20 },
    { id: "feature-3", stt: 3, jiraCode: "SQ2-F03", name: "Chức năng Done DEV", status: "Done DEV", completionRate: 40 },
    { id: "feature-4", stt: 4, jiraCode: "SQ2-F04", name: "Chức năng Done SIT", status: "Done SIT", completionRate: 70 },
    { id: "feature-5", stt: 5, jiraCode: "SQ2-F05", name: "Chức năng Done UAT", status: "Done UAT", completionRate: 100 }
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
