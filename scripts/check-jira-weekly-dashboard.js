const assert = require("assert");
require("dotenv").config();

const {
  createJiraWeeklyDashboardService,
  isHandledStatus,
  statusAt,
  buildWeekPeriods,
  calculateWeek
} = require("../jira-weekly-dashboard");

function fixtureIssue(overrides = {}) {
  return {
    key: "PS0142025-1",
    summary: "Bug kiểm thử",
    status: "Open",
    createdAt: "2026-08-14T02:00:00.000Z",
    updatedAt: "2026-08-18T02:00:00.000Z",
    histories: [],
    ...overrides
  };
}

async function runUnitChecks() {
  ["Closed", "Resolved", "SIT Pass", "Cancelled", "Canceled"].forEach((status) => assert.equal(isHandledStatus(status), true));
  ["Open", "Pending", "In Progress", "Reopen"].forEach((status) => assert.equal(isHandledStatus(status), false));

  const transitioned = fixtureIssue({
    status: "Resolved",
    histories: [{ changedAt: "2026-08-18T02:00:00.000Z", from: "Open", to: "Resolved" }]
  });
  assert.equal(statusAt(transitioned, "2026-08-17T00:00:00.000Z"), "Open");
  assert.equal(statusAt(transitioned, "2026-08-19T00:00:00.000Z"), "Resolved");

  const periods = buildWeekPeriods(new Date("2026-09-03T09:30:00.000Z"));
  assert.equal(periods.length, 3, "Ngày chốt 03/09 vẫn phải hiển thị đến Tuần 3");
  assert.equal(periods[2].finalized, true);
  const week = calculateWeek(periods[0], [
    transitioned,
    fixtureIssue({ key: "PS0142025-2", createdAt: "2026-08-15T02:00:00.000Z", status: "Open" }),
    fixtureIssue({ key: "PS0142025-3", createdAt: "2026-08-21T02:00:00.000Z", status: "Open" })
  ]);
  assert.equal(week.created, 2);
  assert.equal(week.handled, 1);
  assert.equal(week.remaining, 1);
  assert.equal(week.total, week.handled + week.remaining);
  assert.equal(week.handledRate, 50);

  const storedConfigService = createJiraWeeklyDashboardService({
    env: {
      JIRA_BASE_URL: "https://jira.example.test",
      JIRA_EMAIL: "admin@example.test",
      JIRA_API_TOKEN: "",
      JIRA_PROJECT_KEY: "TEST",
      JIRA_BUG_LABEL: "TESTLUONG"
    },
    encryptionSecret: "unit-test-secret",
    fetchImpl: async () => new Response(JSON.stringify({ accountId: "test-user" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  });
  const configDb = createMemoryDb();
  await storedConfigService.saveConnection(configDb, { token: "unit-test-token" });
  const storedDashboard = await storedConfigService.getDashboard(configDb);
  assert.equal(storedDashboard.configured, true, "Token mã hóa trong DB phải cấu hình được Jira");
}

function createMemoryDb() {
  const meta = new Map();
  return {
    async query(sql, params = []) {
      const normalized = String(sql).replace(/\s+/g, " ").trim().toLowerCase();
      if (normalized.startsWith("select pg_try_advisory_lock")) return { rows: [{ locked: true }] };
      if (normalized.startsWith("select pg_advisory_unlock")) return { rows: [{ pg_advisory_unlock: true }] };
      if (normalized.startsWith("select value from app_meta")) return { rows: meta.has(params[0]) ? [{ value: meta.get(params[0]) }] : [] };
      if (normalized.startsWith("insert into app_meta")) {
        meta.set(params[0], JSON.parse(params[1]));
        return { rows: [] };
      }
      throw new Error(`Unexpected test query: ${normalized.slice(0, 100)}`);
    }
  };
}

async function runLiveCheck() {
  const service = createJiraWeeklyDashboardService();
  if (!service.config.configured) {
    console.log("Jira live check skipped: local Jira variables are not configured.");
    return;
  }
  const db = createMemoryDb();
  const result = await service.sync(db);
  const dashboard = await service.getDashboard(db, new Date());
  assert(result.total > 0, "Jira phải trả về ít nhất một bug TESTLUONG");
  assert.equal(dashboard.total, result.total);
  assert(dashboard.weeks.length >= 3, "Dashboard phải có đủ các tuần từ 13/08/2026");
  dashboard.weeks.forEach((week) => {
    assert.equal(week.total, week.handled + week.remaining, `Tuần ${week.weekNumber} sai phép đối chiếu`);
    assert.equal(week.created, week.issues.created.length);
    assert.equal(week.handled, week.issues.handled.length);
    assert.equal(week.remaining, week.issues.remaining.length);
  });
  console.log(`Jira live check passed: ${dashboard.total} TESTLUONG bugs, ${dashboard.weeks.length} weekly periods.`);
}

(async () => {
  await runUnitChecks();
  if (process.argv.includes("--live")) await runLiveCheck();
  console.log("Jira weekly dashboard checks passed.");
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
