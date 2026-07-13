const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright-core");
const {
  parseWorkbookImportState,
  applyWorkbookRules,
  __testApplyWorkKpiRules: applyWorkKpiRules,
  __testDefaultWorkKpiConfig: defaultKpiConfig,
  __testBuildPilotWorkPlanSeedRecords: buildPilotWorkPlanSeedRecords
} = require("../server");

const baseUrl = process.env.SMOKE_URL || "http://localhost:3100";
const workbookPath = path.join(__dirname, "..", "SQ02_UAT_Squad2_QuanLy_US_Date-2.7.xlsx");
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
    await page.screenshot({ path: dashboardShot, fullPage: true });
    await assertRoute(page, "work/task-master", ".standalone-work-items");
    await page.screenshot({ path: taskMasterShot, fullPage: true });
    await page.locator('[data-action="open-create"]').first().click();
    await page.waitForSelector("#recordForm");
    await assertOptionCount(page, "categoryId", 11);
    await assertOptionCount(page, "status", 6);
    await assertOptionCount(page, "priority", 4);
    await assertOptionCount(page, "assignee", 11);
    if (await page.locator('[name="assigneeEmail"]').count()) {
      throw new Error("Email phụ trách là field kỹ thuật và không được hiện trong form người dùng.");
    }
    await page.locator('[data-action="close-modal"]').first().click();
    await assertRoute(page, "work/inputs", ".input-catalog-grid");
    await page.screenshot({ path: inputsShot, fullPage: true });
    await assertRoute(page, "common/personnel/list", "[data-resizable-table=personnel]");
    await assertRoute(page, "common/personnel/map", ".personnel-map");
    await assertRoute(page, "common/personnel/kpi", ".kpi-config-grid");
    await assertRoute(page, "work/member-kpi", ".member-kpi-table");
    await page.screenshot({ path: memberKpiShot, fullPage: true });
    await assertRoute(page, "common/guide", ".guide-page");
    await assertRoute(page, "work/group/pilot-t01/dashboard", ".t01-module-tabs");
    await page.waitForSelector(".sheet-dashboard");
    await assertRoute(page, "work/group/pilot-t01/defects", ".secondary-tabs");
    await assertRoute(page, "work/group/pilot-t01/defectSummary", ".secondary-tabs .active");
    await assertRoute(page, "work/group/pilot-t02", ".standalone-work-items");
    await page.screenshot({ path: groupShot, fullPage: true });

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
  const state = await parseWorkbookImportState(await fs.promises.readFile(workbookPath));
  state.workCategories = [];
  state.workItems = [];
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

async function assertNoPageOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  if (dimensions.width > dimensions.viewport + 1) {
    throw new Error(`${label} tràn ngang trang: ${dimensions.width}px > ${dimensions.viewport}px.`);
  }
}
