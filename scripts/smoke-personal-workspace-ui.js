const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright-core");

const baseUrl = String(process.env.APP_URL || "https://squad2-dashboard-qlcv.up.railway.app").replace(/\/$/, "");
const ownerIdentifier = process.env.TEST_IDENTIFIER || "thanhmt@bidv.com.vn";
const password = process.env.TEST_PASSWORD || "123456";
const otherIdentifier = process.env.TEST_OTHER_IDENTIFIER || "tuantd3@bidv.com.vn";
const browserPaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];
const executablePath = process.env.SMOKE_BROWSER || browserPaths.find(fs.existsSync);
if (!executablePath) throw new Error("Không tìm thấy Chrome hoặc Edge để kiểm tra giao diện.");

async function login(page, identifier) {
  await page.goto(`${baseUrl}/#personal/cross-squad`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".app-shell, #loginForm", { timeout: 20000 });
  if (!await page.locator("#loginForm").count()) return;
  await page.locator("#loginIdentifier").fill(identifier);
  await page.locator("#loginPassword").fill(password);
  await page.locator('#loginForm button[type="submit"]').click();
  await page.waitForSelector(".app-shell", { timeout: 20000 });
}

function collectErrors(page, errors) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error"
      && !message.text().includes("favicon")
      && !message.text().includes("Failed to load resource")) errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    if (url.endsWith("/api/auth/me") && response.status() === 401) return;
    if (url.endsWith("/favicon.ico")) return;
    errors.push(`${response.status()} ${url}`);
  });
}

async function assertNoPageOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  if (dimensions.width > dimensions.viewport + 1) throw new Error(`${label} tràn ngang: ${JSON.stringify(dimensions)}`);
}

async function main() {
  const browser = await chromium.launch({ executablePath, headless: true });
  const desktopShot = path.join(os.tmpdir(), "personal-cross-squad-desktop.png");
  const mobileShot = path.join(os.tmpdir(), "personal-cross-squad-mobile.png");
  const errors = [];
  try {
    const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const ownerPage = await ownerContext.newPage();
    collectErrors(ownerPage, errors);
    await login(ownerPage, ownerIdentifier);
    await ownerPage.waitForSelector(".personal-workspace-panel", { timeout: 20000 });
    if (new URL(ownerPage.url()).hash !== "#personal/cross-squad") throw new Error("Owner bị điều hướng khỏi màn cá nhân.");
    if (await ownerPage.locator('[data-route="personal/cross-squad"]').count() !== 1) throw new Error("Thiếu nút Việc liên Squad của owner.");
    if (await ownerPage.locator(".personal-squad-tab").count() !== 3) throw new Error("Màn cá nhân không có đúng 3 tab Squad.");
    if (await ownerPage.locator('.topbar [data-action="export-excel"], .topbar [data-action="import-data"]').count()) {
      throw new Error("Màn cá nhân còn hiển thị nút nhập/xuất dữ liệu Squad 2.");
    }
    await assertNoPageOverflow(ownerPage, "desktop");
    for (const squad of ["1", "7", "11"]) {
      await ownerPage.locator(`[data-action="set-personal-squad"][data-squad="${squad}"]`).click();
      if (await ownerPage.locator(`.personal-squad-tab.active[data-squad="${squad}"]`).count() !== 1) throw new Error(`Tab Squad ${squad} không active.`);
    }
    await ownerPage.locator('[data-action="open-personal-task"]').click();
    await ownerPage.waitForSelector("#personalTaskForm");
    for (const field of ["squad", "status", "title", "assigner", "assignedDate", "dueDate", "note"]) {
      if (await ownerPage.locator(`#personalTaskForm [name="${field}"]`).count() !== 1) throw new Error(`Form thiếu trường ${field}.`);
    }
    await ownerPage.locator('#personalTaskForm [data-action="close-modal"]').first().click();
    await ownerPage.screenshot({ path: desktopShot, fullPage: true });

    await ownerPage.setViewportSize({ width: 390, height: 844 });
    await ownerPage.reload({ waitUntil: "domcontentloaded" });
    await ownerPage.waitForSelector(".personal-workspace-panel", { timeout: 20000 });
    await ownerPage.waitForFunction(() => !document.querySelector(".personal-empty .fa-spinner"), null, { timeout: 20000 });
    await assertNoPageOverflow(ownerPage, "mobile");
    await ownerPage.screenshot({ path: mobileShot, fullPage: true });
    await ownerContext.close();

    const otherContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const otherPage = await otherContext.newPage();
    collectErrors(otherPage, errors);
    await login(otherPage, otherIdentifier);
    await otherPage.waitForSelector('[data-route="work/dashboard"][aria-current="page"]', { timeout: 20000 });
    if (await otherPage.locator('[data-route="personal/cross-squad"]').count()) throw new Error("Tài khoản khác vẫn thấy nút màn cá nhân.");
    if (new URL(otherPage.url()).hash === "#personal/cross-squad") throw new Error("Tài khoản khác vẫn đứng được ở route cá nhân.");
    await otherContext.close();

    if (errors.length) throw new Error(`Lỗi trình duyệt: ${errors.join(" | ")}`);
    console.log(`Personal workspace UI smoke: OK\nDesktop: ${desktopShot}\nMobile: ${mobileShot}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
