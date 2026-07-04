const fs = require("fs");
const { chromium } = require("playwright-core");

const defaultChromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];

const baseUrl = process.env.SMOKE_URL || "https://squad2-dashboard-qlcv.up.railway.app";
const smokeUser = process.env.SMOKE_USER || process.env.APP_USER || "";
const smokePassword = process.env.SMOKE_PASSWORD || process.env.APP_PASSWORD || "";
const executablePath = process.env.SMOKE_BROWSER || defaultChromePaths.find((candidate) => fs.existsSync(candidate));

if (!smokeUser || !smokePassword) {
  throw new Error("SMOKE_USER and SMOKE_PASSWORD are required.");
}
if (!executablePath) {
  throw new Error("No Chrome or Edge executable found. Set SMOKE_BROWSER to a local browser path.");
}

let cookieHeader = "";
let createdDefectId = "";
let createdPlanId = "";

(async () => {
  await login();
  const beforeState = await apiGet("/api/state");
  const beforeBlockers = countOpenSeverity(beforeState.state.defects, "Blocker");
  const feature = beforeState.state.features.find((row) => row.jiraCode) || {};
  if (!feature.jiraCode) throw new Error("No feature with Jira code found for dashboard smoke.");

  const defectRecord = {
    id: `dashboard-smoke-${Date.now()}`,
    jiraCode: feature.jiraCode,
    storyName: feature.name || feature.group || "",
    sprint: feature.sprint || "",
    severity: "Blocker",
    status: "Open",
    foundDate: new Date().toISOString().slice(0, 10),
    tester: "Mai Tấn Thành",
    owner: "NV1 - Bùi Thị Mai Phương",
    resolvedDate: "",
    aging: 1,
    note: "Dashboard smoke auto cleanup"
  };

  try {
    const created = await apiJson("/api/records/defects", {
      method: "POST",
      body: JSON.stringify({ record: defectRecord })
    });
    createdDefectId = created.record?.id || defectRecord.id;
    const afterCreateBlockers = countOpenSeverity(created.state.defects, "Blocker");
    if (afterCreateBlockers !== beforeBlockers + 1) {
      throw new Error(`API dashboard blocker count did not update: before ${beforeBlockers}, after ${afterCreateBlockers}`);
    }

    await assertDashboardMetric("defectDashboard", "Blocker Open", afterCreateBlockers);
  } finally {
    if (createdDefectId) {
      await apiJson(`/api/records/defects/${encodeURIComponent(createdDefectId)}`, { method: "DELETE" });
      const afterDelete = await apiGet("/api/state");
      const finalBlockers = countOpenSeverity(afterDelete.state.defects, "Blocker");
      if (finalBlockers !== beforeBlockers) {
        throw new Error(`Dashboard smoke cleanup did not restore blocker count: before ${beforeBlockers}, after ${finalBlockers}`);
      }
    }
  }

  await assertPlanDashboardRecomputes(await apiGet("/api/state"));

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

async function assertDashboardMetric(tabId, label, expectedValue) {
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
    await page.waitForSelector("[data-tab=\"dashboard\"]", { timeout: 15000 });
    if (tabId && tabId !== "dashboard") {
      await page.locator(`.tabbar [data-tab="${tabId}"]`).click();
    }
    const expectedHeading = tabId === "defectDashboard" ? "DEFECT_Dashboard" : "Dashboard_UAT";
    await page.locator(".sheet-dashboard-head", { hasText: expectedHeading }).waitFor({ timeout: 15000 });
    await page.waitForSelector(".sheet-dashboard-table", { timeout: 15000 });
    let actualValue = "";
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const row = page.locator(".sheet-dashboard-table tbody tr", { hasText: label }).first();
      await row.waitFor({ timeout: 10000 });
      const cells = await row.locator("td").allInnerTexts();
      actualValue = cells[cells.length - 1] || "";
      if (Number(actualValue.replace(/\D+/g, "")) === expectedValue) return;
      await page.waitForTimeout(500);
    }
    throw new Error(`Dashboard metric ${label} expected ${expectedValue}, got ${actualValue}`);
  } finally {
    await browser.close();
  }
}

async function assertPlanDashboardRecomputes(payload) {
  const state = payload.state || payload;
  const beforeTotalCases = sumRows(state.plans || [], "totalCases");
  const testCases = 7;
  const stamp = Date.now();
  const planRecord = {
    id: `dashboard-plan-smoke-${stamp}`,
    code: "SMOKE",
    jiraCode: `SMOKE_DASHBOARD_${stamp}`,
    group: "Dashboard smoke",
    feature: `Dashboard plan smoke ${stamp}`,
    nv: 0,
    t1: testCases,
    t2: 0,
    t3: 0,
    t4: 0,
    t5: 0,
    t6: 0
  };

  try {
    const created = await apiJson("/api/records/plans", {
      method: "POST",
      body: JSON.stringify({ record: planRecord })
    });
    createdPlanId = created.record?.id || planRecord.id;
    const expectedTotalCases = beforeTotalCases + testCases;
    const afterTotalCases = sumRows(created.state.plans || [], "totalCases");
    if (afterTotalCases !== expectedTotalCases) {
      throw new Error(`Dashboard plan total did not recompute from PhanCong_UAT: expected ${expectedTotalCases}, got ${afterTotalCases}`);
    }
    await assertDashboardMetric("dashboard", "Testcase", expectedTotalCases);
  } finally {
    if (createdPlanId) {
      await apiJson(`/api/records/plans/${encodeURIComponent(createdPlanId)}`, { method: "DELETE" });
      createdPlanId = "";
      const afterDelete = await apiGet("/api/state");
      const restoredTotalCases = sumRows(afterDelete.state.plans || [], "totalCases");
      if (restoredTotalCases !== beforeTotalCases) {
        throw new Error(`Dashboard plan cleanup did not restore total cases: expected ${beforeTotalCases}, got ${restoredTotalCases}`);
      }
    }
  }
}

async function assertSprintSummaryRecomputes(payload) {
  const state = payload.state || payload;
  const targetSprint = (state.readiness || []).find((row) => /^sprint\s+\d+/i.test(row.sprint || ""))?.sprint;
  if (!targetSprint) throw new Error("No readiness sprint found for sprint mapping smoke.");
  const beforeRow = findReadinessRow(state, targetSprint);
  const beforeStories = Number(beforeRow?.totalStories || 0);
  const beforeCases = Number(beforeRow?.totalCases || 0);
  const beforeTotalCases = sumRows(state.plans || [], "totalCases");
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
    const expectedStories = beforeStories;
    const expectedCases = beforeCases + testCases;
    const expectedTotalCases = beforeTotalCases + testCases;
    if (Number(afterCreate?.totalStories || 0) !== expectedStories || Number(afterCreate?.totalCases || 0) !== expectedCases) {
      throw new Error(`Sprint summary did not recompute from PhanCong_UAT: expected ${expectedStories} story/${expectedCases} TC, got ${afterCreate?.totalStories}/${afterCreate?.totalCases}`);
    }
    await assertDashboardMetric("dashboard", "Tổng Testcase", expectedTotalCases);
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

function findReadinessRow(state, sprint) {
  return (state.readiness || []).find((row) => normalize(row.sprint) === normalize(sprint));
}

function sumRows(rows, key) {
  return (rows || []).reduce((total, row) => total + Number(row?.[key] || 0), 0);
}

function countOpenSeverity(rows, severity) {
  return (rows || []).filter((row) => (
    normalize(row.severity) === normalize(severity)
    && isOpenBugStatus(row.status)
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
