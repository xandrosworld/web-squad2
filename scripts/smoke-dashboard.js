const fs = require("fs");
const { chromium } = require("playwright-core");

const defaultChromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];

const baseUrl = process.env.SMOKE_URL || "https://squad2-dashboard-qlcv.up.railway.app";
const smokeUser = process.env.SMOKE_USER || "";
const smokePassword = process.env.SMOKE_PASSWORD || "";
const executablePath = process.env.SMOKE_BROWSER || defaultChromePaths.find((candidate) => fs.existsSync(candidate));

if (!smokeUser || !smokePassword) {
  throw new Error("SMOKE_USER and SMOKE_PASSWORD are required.");
}
if (!executablePath) {
  throw new Error("No Chrome or Edge executable found. Set SMOKE_BROWSER to a local browser path.");
}

let cookieHeader = "";
let createdDailyId = "";

(async () => {
  await login();
  const beforeState = await apiGet("/api/state");
  const beforeBlockers = countOpenSeverity(beforeState.state.daily, "Blocker");
  const feature = beforeState.state.features.find((row) => row.jiraCode) || {};
  if (!feature.jiraCode) throw new Error("No feature with Jira code found for dashboard smoke.");

  const dailyRecord = {
    id: `dashboard-smoke-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    sprint: "",
    code: feature.code || "",
    jiraCode: feature.jiraCode,
    feature: feature.group || feature.name || "",
    tester: "Dashboard smoke",
    totalCases: 1,
    executedCases: 0,
    passedCases: 0,
    failedCases: 1,
    bugStatus: "Open",
    maxBugSeverity: "Blocker",
    blocker: "Dashboard smoke auto cleanup",
    handler: "Dashboard smoke",
    dueDate: new Date().toISOString().slice(0, 10)
  };

  try {
    const created = await apiJson("/api/records/daily", {
      method: "POST",
      body: JSON.stringify({ record: dailyRecord })
    });
    createdDailyId = created.record?.id || dailyRecord.id;
    const afterCreateBlockers = countOpenSeverity(created.state.daily, "Blocker");
    if (afterCreateBlockers !== beforeBlockers + 1) {
      throw new Error(`API dashboard blocker count did not update: before ${beforeBlockers}, after ${afterCreateBlockers}`);
    }

    await assertDashboardCard("Lỗi Blocker", afterCreateBlockers);
  } finally {
    if (createdDailyId) {
      await apiJson(`/api/records/daily/${encodeURIComponent(createdDailyId)}`, { method: "DELETE" });
      const afterDelete = await apiGet("/api/state");
      const finalBlockers = countOpenSeverity(afterDelete.state.daily, "Blocker");
      if (finalBlockers !== beforeBlockers) {
        throw new Error(`Dashboard smoke cleanup did not restore blocker count: before ${beforeBlockers}, after ${finalBlockers}`);
      }
    }
  }

  console.log(`Dashboard smoke passed: ${baseUrl}`);
})().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: smokeUser, password: smokePassword })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Login failed ${response.status}: ${text}`);
  cookieHeader = response.headers.get("set-cookie")?.split(";")[0] || "";
  if (!cookieHeader) throw new Error("Login did not return a session cookie.");
}

async function apiGet(path) {
  return apiJson(path, { method: "GET" });
}

async function apiJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Cookie: cookieHeader,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} failed ${response.status}: ${data.error || text}`);
  }
  return data;
}

async function assertDashboardCard(label, expectedValue) {
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const session = cookieHeader.split("=");
    await context.addCookies([{
      name: session[0],
      value: session.slice(1).join("="),
      domain: new URL(baseUrl).hostname,
      path: "/",
      httpOnly: true,
      secure: baseUrl.startsWith("https://"),
      sameSite: "Lax"
    }]);
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".uat-dashboard", { timeout: 15000 });
    const actualValue = await page.locator(".uat-metric-card", { hasText: label }).first().locator("strong").innerText();
    if (Number(actualValue.replace(/\D+/g, "")) !== expectedValue) {
      throw new Error(`Dashboard card ${label} expected ${expectedValue}, got ${actualValue}`);
    }
  } finally {
    await browser.close();
  }
}

function countOpenSeverity(rows, severity) {
  return (rows || []).filter((row) => (
    normalize(row.maxBugSeverity) === normalize(severity)
    && isOpenBugStatus(row.bugStatus)
  )).length;
}

function isOpenBugStatus(status) {
  const normalized = normalize(status);
  if (!normalized) return false;
  return !["da dong", "closed", "cancelled", "canceled"].includes(normalized);
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("vi")
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
