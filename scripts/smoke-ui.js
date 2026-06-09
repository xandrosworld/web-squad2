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
const smokeUser = process.env.SMOKE_USER || "";
const smokePassword = process.env.SMOKE_PASSWORD || "";

if (!executablePath) {
  throw new Error("No Chrome or Edge executable found. Set SMOKE_BROWSER to a local browser path.");
}

const moduleTabs = ["features", "personnel", "schedule", "handoffs", "plans", "daily", "weekly", "readiness", "matrix", "guide"];
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
    "01_DanhMuc_UAT",
    "02_PhanCong_Sprint",
    "03_MaTran_NangLuc",
    "04_DieuHanh_HangNgay",
    "05_ChatLuong_Tuan",
    "06_KetThuc_Sprint",
    "07_Dashboard"
  ];
  const actualSheets = workbook.worksheets.map((sheet) => sheet.name);
  if (JSON.stringify(actualSheets) !== JSON.stringify(expectedSheets)) {
    throw new Error(`Unexpected Excel sheets: ${actualSheets.join(", ")}`);
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

  for (const tab of moduleTabs) {
    await page.locator(`.tabbar button[data-tab="${tab}"]`).click();
    assertReadableText(await page.locator("#app").innerText(), tab);
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

  await page.locator(".tabbar button[data-tab=\"dashboard\"]").click();
  await page.waitForSelector(".dashboard-shell .uat-dashboard, .dashboard-shell .dashboard-empty-panel", { timeout: 5000 });

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
