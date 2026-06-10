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
let createdPlanId = "";

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

  await assertSprintSummaryRecomputes(await apiGet("/api/state"));

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

async function assertSprintSummaryRecomputes(payload) {
  const state = payload.state || payload;
  const targetSprint = (state.readiness || []).find((row) => /^sprint\s+\d+/i.test(row.sprint || ""))?.sprint;
  if (!targetSprint) throw new Error("No readiness sprint found for sprint mapping smoke.");
  const beforeRow = findReadinessRow(state, targetSprint);
  const beforeStories = Number(beforeRow?.totalStories || 0);
  const beforeCases = Number(beforeRow?.totalCases || 0);
  const testCases = 7;
  const stamp = Date.now();
  const planRecord = {
    id: `dashboard-sprint-smoke-${stamp}`,
    code: "SMOKE",
    jiraCode: `SMOKE_DASHBOARD_${stamp}`,
    group: "Dashboard smoke",
    feature: `Dashboard sprint mapping smoke ${stamp}`,
    sprint: targetSprint,
    uatHandoff: "",
    owner: "BA",
    nv: 0,
    t1: testCases,
    t2: 0,
    t3: 0,
    t4: 0,
    t5: 0,
    t6: 0,
    totalCases: testCases,
    testStatus: "Chưa Test",
    progress: 0,
    uatStatus: "Chưa bắt đầu",
    devStatus: "Done RSD",
    priority: 1
  };

  try {
    const created = await apiJson("/api/records/plans", {
      method: "POST",
      body: JSON.stringify({ record: planRecord })
    });
    createdPlanId = created.record?.id || planRecord.id;
    const afterCreate = findReadinessRow(created.state, targetSprint);
    const expectedStories = beforeStories + 1;
    const expectedCases = beforeCases + testCases;
    if (Number(afterCreate?.totalStories || 0) !== expectedStories || Number(afterCreate?.totalCases || 0) !== expectedCases) {
      throw new Error(`Sprint summary did not recompute from PhanCong_UAT: expected ${expectedStories} story/${expectedCases} TC, got ${afterCreate?.totalStories}/${afterCreate?.totalCases}`);
    }
    await assertDashboardSprintRow(targetSprint, expectedStories, expectedCases);
  } finally {
    if (createdPlanId) {
      await apiJson(`/api/records/plans/${encodeURIComponent(createdPlanId)}`, { method: "DELETE" });
      createdPlanId = "";
      const afterDelete = await apiGet("/api/state");
      const restored = findReadinessRow(afterDelete.state, targetSprint);
      if (Number(restored?.totalStories || 0) !== beforeStories || Number(restored?.totalCases || 0) !== beforeCases) {
        throw new Error(`Sprint summary cleanup did not restore values: expected ${beforeStories} story/${beforeCases} TC, got ${restored?.totalStories}/${restored?.totalCases}`);
      }
    }
  }
}

async function assertDashboardSprintRow(sprint, expectedStories, expectedCases) {
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
    const row = page.locator(".uat-sprint-table tbody tr", { hasText: sprint }).first();
    await row.waitFor({ timeout: 10000 });
    const cells = await row.locator("td").allInnerTexts();
    const actualStories = Number((cells[1] || "").replace(/\D+/g, ""));
    const actualCases = Number((cells[2] || "").replace(/\D+/g, ""));
    if (actualStories !== expectedStories || actualCases !== expectedCases) {
      throw new Error(`Dashboard sprint row ${sprint} expected ${expectedStories} story/${expectedCases} TC, got ${cells[1]}/${cells[2]}`);
    }
  } finally {
    await browser.close();
  }
}

function findReadinessRow(state, sprint) {
  return (state.readiness || []).find((row) => normalize(row.sprint) === normalize(sprint));
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
