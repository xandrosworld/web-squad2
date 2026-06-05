const { chromium } = require("playwright-core");

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

const moduleTabs = ["features", "plans", "matrix", "daily", "weekly", "readiness"];
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
    if (!requireDb && url.endsWith("/api/state") && status === 503) {
      warnings.push("DB check skipped: /api/state returned 503 in local/offline mode.");
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

  for (const tab of moduleTabs) {
    await page.locator(`.tabbar button[data-tab="${tab}"]`).click();
    await page.waitForSelector(".content-grid-single .panel", { timeout: 5000 });
    assertReadableText(await page.locator("#app").innerText(), tab);

    const rowsOrEmpty = await page.locator(".data-table tbody tr, .empty-state").count();
    if (rowsOrEmpty < 1) {
      throw new Error(`Module ${tab} did not render rows or empty state.`);
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
  await page.waitForSelector(".kpi-grid", { timeout: 5000 });

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
