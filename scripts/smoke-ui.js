const { chromium } = require("playwright-core");
const ExcelJS = require("exceljs");

const defaultChromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];

const fs = require("fs");

const baseUrl = process.env.SMOKE_URL || "http://localhost:3000";
const executablePath = process.env.SMOKE_BROWSER || defaultChromePaths.find((candidate) => fs.existsSync(candidate));
const requireDb = process.env.SMOKE_REQUIRE_DB === "1";
const smokeUser = process.env.SMOKE_USER || process.env.APP_USER || "";
const smokePassword = process.env.SMOKE_PASSWORD || process.env.APP_PASSWORD || "";

if (!executablePath) {
  throw new Error("No Chrome or Edge executable found. Set SMOKE_BROWSER to a local browser path.");
}

const moduleTabs = [
  "workItems",
  "personnel",
  "guide",
  "features",
  "handoffs",
  "plans",
  "daily",
  "defects",
  "weekly",
  "readiness",
  "matrix",
  "defectSummary"
];
const readOnlyTabs = new Set(["defectSummary"]);
const mojibakePattern = /\u00c3[\u0080-\u00bf]|\u00c2[\u0080-\u00bf]|\u00e1\u00bb|\u00c4\u2018|\u00c6[\u00a0-\u00bf]/;

(async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  const warnings = [];

  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();
    if (status < 400) return;
    if (url.endsWith("/favicon.ico")) return;
    if (url.endsWith("/api/auth/me") && status === 401) return;
    if (!requireDb && (url.endsWith("/api/state") || url.endsWith("/api/auth/me")) && status === 503) {
      warnings.push(`DB check skipped: ${new URL(url).pathname} returned 503 in local/offline mode.`);
      return;
    }
    errors.push(`${status} ${url}`);
  });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#app", { timeout: 10000 });
  await page.waitForSelector(".app-shell, #loginForm", { timeout: 10000 });

  if (await page.locator("#loginForm").count()) {
    assertReadableText(await page.locator("#app").innerText(), "login");
    if (!smokeUser || !smokePassword) {
      if (requireDb) throw new Error("Login credentials are required for production smoke.");
      await browser.close();
      console.log(`Login smoke passed: ${baseUrl}`);
      return;
    }
    await page.locator("#loginIdentifier").fill(smokeUser);
    await page.locator("#loginPassword").fill(smokePassword);
    await page.locator("#loginForm button[type=\"submit\"]").click();
    await page.waitForSelector("#app .app-shell", { timeout: 15000 });
  }

  assertReadableText(await page.locator("#app").innerText(), "dashboard");

  const title = await page.title();
  if (!title.includes("Squad 2 UAT")) {
    throw new Error(`Unexpected page title: ${title}`);
  }

  for (const hiddenTab of ["userStories", "bugSources"]) {
    if (await page.locator(`.tabbar [data-tab="${hiddenTab}"], .sidebar [data-tab="${hiddenTab}"]`).count()) {
      throw new Error(`Source-only tab should be hidden from navigation: ${hiddenTab}`);
    }
  }

  for (const removedSelector of [
    ".sidebar-bottom",
    ".topbar [data-action=\"export-csv\"]",
    ".topbar [data-action=\"clear-data\"]",
    ".topbar [data-action=\"open-create\"]"
  ]) {
    if (await page.locator(removedSelector).count()) {
      throw new Error(`Removed control is still visible: ${removedSelector}`);
    }
  }

  const excelButton = page.locator(".topbar [data-action=\"export-excel\"]");
  if (await excelButton.count() !== 1) {
    throw new Error("Topbar did not render exactly one Excel export button.");
  }
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    excelButton.click()
  ]);
  if (!download.suggestedFilename().endsWith(".xlsx")) {
    throw new Error(`Excel export returned unexpected filename: ${download.suggestedFilename()}`);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(await download.path());
  const expectedSheets = [
    "Dashboard_UAT",
    "DEFECT_Dashboard",
    "NhanSu_UAT",
    "HD_UAT",
    "DM_ChucNang",
    "Lich_UAT",
    "Lich_BG_US",
    "PhanCong_UAT",
    "DieuHanh_Ngay",
    "DEFECT_LOG",
    "ChatLuong_Tuan",
    "TongKet_Sprint",
    "NangSuat_Tester",
    "Tong hop loi",
    "DS_US",
    "DS.Loi",
    "KeHoach_CongViec"
  ];
  const actualSheets = workbook.worksheets.map((sheet) => sheet.name);
  if (JSON.stringify(actualSheets) !== JSON.stringify(expectedSheets)) {
    throw new Error(`Unexpected Excel sheets: ${actualSheets.join(", ")}`);
  }
  if (workbook.getWorksheet("Lich_UAT").state !== "hidden") {
    throw new Error("Exported Lich_UAT sheet should stay hidden like the source workbook.");
  }
  for (const redSheetName of ["DS_US", "DS.Loi"]) {
    const tabColor = workbook.getWorksheet(redSheetName).properties?.tabColor?.argb;
    if (tabColor !== "FFFF0000") {
      throw new Error(`Exported ${redSheetName} should keep red tab color, got ${tabColor || "none"}.`);
    }
  }
  for (const sheet of workbook.worksheets) {
    if (sheet.rowCount < 1 || sheet.columnCount < 1) {
      throw new Error(`Excel sheet ${sheet.name} is missing headers.`);
    }
  }

  await page.locator("[data-auth-action=\"open-profile\"]").click();
  await page.waitForSelector("#profileForm", { timeout: 5000 });
  await page.waitForSelector("#passwordForm", { timeout: 5000 });
  assertReadableText(await page.locator("#profileModal").innerText(), "profile modal");
  if (await page.locator("#avatarInput").count() !== 1) {
    throw new Error("Profile modal did not render avatar upload input.");
  }
  for (const field of ["#profileName", "#currentPassword", "#newPassword", "#confirmPassword"]) {
    if (await page.locator(field).count() !== 1) {
      throw new Error(`Profile modal missing ${field}.`);
    }
  }
  await page.locator("[data-auth-action=\"close-profile\"]").click();
  await page.waitForSelector("#profileForm", { state: "detached", timeout: 5000 });

  if (await page.locator("[data-ai-action=\"open\"]").count() !== 1) {
    throw new Error("AI assistant floating button is missing.");
  }
  await page.locator("[data-ai-action=\"open\"]").click();
  await page.waitForSelector("#aiChatForm", { timeout: 5000 });
  assertReadableText(await page.locator(".ai-chat-panel").innerText(), "AI assistant panel");
  if (await page.locator("#aiChatInput").count() !== 1) {
    throw new Error("AI assistant input is missing.");
  }
  await page.locator("[data-ai-action=\"close\"]").click();
  await page.waitForSelector("#aiChatForm", { state: "detached", timeout: 5000 });

  await page.locator(".tabbar button[data-tab=\"defectDashboard\"]").click();
  await page.waitForSelector(".defect-dashboard-panel", { timeout: 5000 });
  assertReadableText(await page.locator(".defect-dashboard-panel").innerText(), "defect dashboard");

  for (const tab of moduleTabs) {
    await page.locator(`.tabbar button[data-tab="${tab}"]`).click();
    assertReadableText(await page.locator("#app").innerText(), tab);
    if (tab === "workItems") {
      await page.waitForSelector(".work-plan-page", { timeout: 5000 });
      if (await page.locator(".work-category-panel").count() !== 1) {
        throw new Error("Work plan tab did not render the category panel.");
      }
      if (await page.locator('[data-action="open-category-create"]').count() < 1) {
        throw new Error("Work plan tab is missing category create action.");
      }
      await page.locator('[data-action="open-category-create"]').first().click();
      await page.waitForSelector("#recordForm", { timeout: 5000 });
      assertReadableText(await page.locator("#recordForm").innerText(), "work category form");
      await page.locator("#recordModal .modal-head button[data-action=\"close-modal\"]").click();
      await page.waitForSelector("#recordForm", { state: "detached", timeout: 5000 });
      const addTaskButton = page.locator(".work-items-panel .panel-head button[data-action=\"open-create\"]");
      if (await addTaskButton.count()) {
        await addTaskButton.click();
        await page.waitForSelector("#recordForm", { timeout: 5000 });
        assertReadableText(await page.locator("#recordForm").innerText(), "work plan form");
        await page.locator("#recordModal .modal-head button[data-action=\"close-modal\"]").click();
        await page.waitForSelector("#recordForm", { state: "detached", timeout: 5000 });
      } else if (await page.locator(".work-task-empty, .work-onboarding").count() < 1) {
        throw new Error("Work plan tab has no task create action and no onboarding state.");
      }
      continue;
    }
    if (tab === "guide") {
      await page.waitForSelector(".guide-page", { timeout: 5000 });
      if (await page.locator(".guide-section").count() < 1) {
        throw new Error("Guide tab did not render guide sections.");
      }
      continue;
    }

    await page.waitForSelector(".content-grid-single .panel", { timeout: 5000 });

    const rowsOrEmpty = await page.locator(".data-table tbody tr, .empty-state").count();
    if (rowsOrEmpty < 1) {
      throw new Error(`Module ${tab} did not render rows or empty state.`);
    }
    if (await page.locator(".data-table .filter-row").count()) {
      throw new Error(`Module ${tab} still renders the large filter row.`);
    }
    if (await page.locator(".data-table .th-filter-btn").count() < 1) {
      throw new Error(`Module ${tab} did not render compact column filters.`);
    }
    if (tab === "defects") {
      const firstTester = (await page.locator('[data-resizable-table="defects"] tbody tr td:nth-child(10)').first().innerText()).trim();
      if (!firstTester || firstTester === "-") {
        throw new Error("DEFECT_LOG tester column is blank after DS.Loi lookup.");
      }
      const pageSize = page.locator('[data-page-size="defects"]');
      if (await pageSize.count() !== 1) {
        throw new Error("DEFECT_LOG did not render rows-per-page selector.");
      }
      await pageSize.selectOption("10");
      await page.waitForFunction(() => document.querySelectorAll('[data-resizable-table="defects"] tbody tr').length <= 10, null, { timeout: 5000 });
    }

    if (readOnlyTabs.has(tab)) {
      if (await page.locator(".content-grid-single .panel-head button[data-action=\"open-create\"]").count()) {
        throw new Error(`Read-only module ${tab} still renders create button.`);
      }
      continue;
    }

    await page.locator(".content-grid-single .panel-head button[data-action=\"open-create\"]").click();
    await page.waitForSelector("#recordForm", { timeout: 5000 });
    assertReadableText(await page.locator("#recordForm").innerText(), `${tab} form`);
    const fields = await page.locator("#recordForm input, #recordForm select, #recordForm textarea").count();
    if (fields < 1) {
      throw new Error(`Module ${tab} opened an empty form.`);
    }

    await page.locator("#recordModal .modal-head button[data-action=\"close-modal\"]").click();
    await page.waitForSelector("#recordForm", { state: "detached", timeout: 5000 });
  }

  if (requireDb) {
    await assertPageScrollPersistsAfterRefresh(page);
    await assertTableScrollPersistsAfterRefresh(page);
  }

  await page.locator(".tabbar button[data-tab=\"dashboard\"]").click();
  await page.waitForSelector(".dashboard-shell .sheet-dashboard, .dashboard-shell .dashboard-empty-panel", { timeout: 5000 });

  if (errors.length) {
    throw new Error(`Browser errors detected:\n${errors.join("\n")}`);
  }

  await browser.close();
  warnings.forEach((warning) => console.warn(warning));
  console.log(`UI smoke passed: ${baseUrl}`);
})().catch(async (error) => {
  console.error(error);
  process.exit(1);
});

function assertReadableText(text, area) {
  if (mojibakePattern.test(text)) {
    throw new Error(`Detected mojibake text in ${area}.`);
  }
}

async function assertTableScrollPersistsAfterRefresh(page) {
  await page.locator(".tabbar button[data-tab=\"plans\"]").click();
  await page.waitForSelector('[data-resizable-table="plans"]', { timeout: 5000 });
  const mainScroll = page.locator('[data-table-scrollbar="main"]').first();
  const before = await mainScroll.evaluate((element) => {
    element.scrollLeft = Math.min(720, element.scrollWidth - element.clientWidth);
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
    return element.scrollLeft;
  });
  if (before <= 0) {
    throw new Error("Plans table is not horizontally scrollable for persistence smoke.");
  }
  await page.waitForFunction((expected) => {
    try {
      const stored = JSON.parse(sessionStorage.getItem("squad2_uat_command_center_v1_table_scroll_lefts_v1") || "{}");
      return Math.abs(Number(stored.plans || 0) - expected) <= 2;
    } catch {
      return false;
    }
  }, before, { timeout: 5000 });

  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.waitForSelector('[data-resizable-table="plans"]', { timeout: 5000 });
  await page.waitForTimeout(100);

  const after = await page.locator('[data-table-scrollbar="main"]').first().evaluate((element) => element.scrollLeft);
  if (Math.abs(after - before) > 2) {
    throw new Error(`Plans table horizontal scroll was not preserved after refresh: before ${before}, after ${after}.`);
  }
}

async function assertPageScrollPersistsAfterRefresh(page) {
  const originalViewport = page.viewportSize() || { width: 1440, height: 900 };
  await page.setViewportSize({ width: originalViewport.width, height: Math.min(originalViewport.height, 620) });
  try {
    await page.locator(".tabbar button[data-tab=\"plans\"]").click();
    await page.waitForSelector('[data-resizable-table="plans"]', { timeout: 5000 });
    const before = await page.evaluate(() => {
      const workspace = document.querySelector(".workspace");
      if (!workspace) return 0;
      const maxTop = Math.max(0, workspace.scrollHeight - workspace.clientHeight);
      workspace.scrollTop = Math.min(760, maxTop);
      return workspace.scrollTop;
    });
    if (before < 40) {
      throw new Error("Plans page is not vertically scrollable for focus persistence smoke.");
    }

    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.waitForSelector('[data-resizable-table="plans"]', { timeout: 5000 });
    await page.waitForTimeout(100);

    const after = await page.evaluate(() => document.querySelector(".workspace")?.scrollTop || 0);
    if (Math.abs(after - before) > 4) {
      throw new Error(`Page vertical scroll was not preserved after focus refresh: before ${before}, after ${after}.`);
    }
  } finally {
    await page.setViewportSize(originalViewport);
  }
}
