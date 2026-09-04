const crypto = require("crypto");

const DEFAULT_TIME_ZONE = "Asia/Ho_Chi_Minh";
const VIETNAM_OFFSET = "+07:00";
const FIRST_WEEK_START = "2026-08-13T00:00:00+07:00";
const FIRST_CUTOFF = "2026-08-20T15:00:00+07:00";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_META_KEY = "jira_testluong_cache_v1";
const SNAPSHOT_META_KEY = "jira_testluong_weekly_snapshots_v4";
const SYNC_LOCK_KEY = "jira_testluong_weekly_sync_v1";
const CONNECTION_META_KEY = "jira_testluong_connection_v1";
const HANDLED_STATUSES = new Set(["closed"]);
const CANCELLED_STATUSES = new Set(["cancelled", "canceled"]);
const PRIORITY_ORDER = ["Blocker", "Critical", "Major", "Minor", "Trivial"];

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("en")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function isHandledStatus(value) {
  return HANDLED_STATUSES.has(normalizeStatus(value));
}

function isCancelledStatus(value) {
  return CANCELLED_STATUSES.has(normalizeStatus(value));
}

function asIso(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function toIssue(fields, key, histories = []) {
  return {
    key: String(key || "").trim(),
    summary: String(fields?.summary || "").trim(),
    status: String(fields?.status?.name || "").trim(),
    createdAt: asIso(fields?.created),
    updatedAt: asIso(fields?.updated),
    resolutionAt: asIso(fields?.resolutiondate),
    priority: String(fields?.priority?.name || "").trim(),
    components: Array.isArray(fields?.components) ? fields.components.map((item) => String(item?.name || "").trim()).filter(Boolean) : [],
    parentKey: String(fields?.parent?.key || "").trim(),
    parentSummary: String(fields?.parent?.fields?.summary || "").trim(),
    labels: Array.isArray(fields?.labels) ? fields.labels.map(String) : [],
    histories: normalizeStatusHistories(histories)
  };
}

function normalizeStatusHistories(histories) {
  return (Array.isArray(histories) ? histories : [])
    .flatMap((history) => {
      const changedAt = asIso(history?.created || history?.changedAt);
      if (!changedAt) return [];
      const items = Array.isArray(history?.items) ? history.items : [history];
      return items
        .filter((item) => String(item?.field || "").toLowerCase() === "status")
        .map((item) => ({
          changedAt,
          from: String(item?.fromString ?? item?.from ?? "").trim(),
          to: String(item?.toString ?? item?.to ?? "").trim()
        }));
    })
    .filter((item) => item.to)
    .sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));
}

function statusAt(issue, timestamp) {
  const cutoff = new Date(timestamp).getTime();
  const histories = Array.isArray(issue?.histories) ? issue.histories : [];
  if (!histories.length) return issue?.status || "";
  let status = histories[0].from || issue?.status || "";
  histories.forEach((change) => {
    if (new Date(change.changedAt).getTime() <= cutoff) status = change.to || status;
  });
  return status;
}

function localDateKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function formatDateTimeVi(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: DEFAULT_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function firstCutoffForSchedule(options = {}) {
  const cutoffWeekday = Math.max(0, Math.min(6, Number(options.cutoffWeekday ?? 4)));
  const cutoffHour = Math.max(0, Math.min(23, Number(options.cutoffHour ?? 15)));
  const anchorLocal = new Date("2026-08-13T00:00:00+07:00");
  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const anchorWeekdayName = new Intl.DateTimeFormat("en-US", { timeZone: DEFAULT_TIME_ZONE, weekday: "short" }).format(anchorLocal);
  const anchorWeekday = Math.max(0, weekdayNames.indexOf(anchorWeekdayName));
  let dayDelta = (cutoffWeekday - anchorWeekday + 7) % 7;
  if (dayDelta === 0) dayDelta = 7;
  const cutoffDate = new Date(anchorLocal.getTime() + dayDelta * 24 * 60 * 60 * 1000);
  const dateKey = localDateKey(cutoffDate);
  return new Date(`${dateKey}T${String(cutoffHour).padStart(2, "0")}:00:00${VIETNAM_OFFSET}`);
}

function buildWeekPeriods(now = new Date(), options = {}) {
  const current = new Date(now);
  const anchorStart = new Date(FIRST_WEEK_START);
  const firstCutoff = firstCutoffForSchedule(options);
  if (current < anchorStart) return [];

  // On cutoff Thursday, keep the just-closed week visible as the current reporting
  // week for the remainder of the day. The next week appears from Friday onward.
  const currentDateKey = localDateKey(current);
  let lastWeek = 1;
  while (lastWeek < 520) {
    const cutoff = new Date(firstCutoff.getTime() + (lastWeek - 1) * WEEK_MS);
    if (current < cutoff || localDateKey(cutoff) === currentDateKey) break;
    lastWeek += 1;
  }

  return Array.from({ length: lastWeek }, (_, index) => {
    const weekNumber = index + 1;
    const start = weekNumber === 1
      ? anchorStart
      : new Date(firstCutoff.getTime() + (weekNumber - 2) * WEEK_MS);
    const cutoff = new Date(firstCutoff.getTime() + (weekNumber - 1) * WEEK_MS);
    const finalized = current >= cutoff;
    return {
      weekNumber,
      startAt: start.toISOString(),
      cutoffAt: cutoff.toISOString(),
      evaluatedAt: (finalized ? cutoff : current).toISOString(),
      finalized,
      periodLabel: `${formatDateTimeVi(start)} – ${formatDateTimeVi(cutoff)}`
    };
  });
}

function publicIssue(issue, status) {
  return {
    key: issue.key,
    summary: issue.summary,
    status: status || issue.status || "",
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    priority: issue.priority || "",
    components: issue.components || [],
    parentKey: issue.parentKey || "",
    parentSummary: issue.parentSummary || ""
  };
}

function calculateWeek(period, issues) {
  const startMs = new Date(period.startAt).getTime();
  const endMs = new Date(period.evaluatedAt).getTime();
  const available = (Array.isArray(issues) ? issues : [])
    .filter((issue) => issue.key && issue.createdAt && new Date(issue.createdAt).getTime() <= endMs);
  const created = available.filter((issue) => {
    const createdMs = new Date(issue.createdAt).getTime();
    return period.weekNumber === 1 ? createdMs >= startMs : createdMs > startMs;
  });
  const handled = [];
  const remaining = [];
  const cancelled = [];
  available.forEach((issue) => {
    const status = statusAt(issue, period.evaluatedAt);
    const publicRow = publicIssue(issue, status);
    if (isHandledStatus(status)) handled.push(publicRow);
    else if (isCancelledStatus(status)) cancelled.push(publicRow);
    else remaining.push(publicRow);
  });
  const total = available.length;
  const actionableTotal = handled.length + remaining.length;
  const handledRate = actionableTotal ? Math.round((handled.length / actionableTotal) * 1000) / 10 : 0;
  const byStatus = [...handled, ...remaining, ...cancelled].reduce((result, issue) => {
    const key = issue.status || "Chưa xác định";
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
  const sortIssues = (rows) => rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || a.key.localeCompare(b.key));
  return withPriorityBreakdown({
    ...period,
    total,
    created: created.length,
    handled: handled.length,
    remaining: remaining.length,
    cancelled: cancelled.length,
    handledRate,
    byStatus,
    issues: {
      created: sortIssues(created.map((issue) => publicIssue(issue, statusAt(issue, period.evaluatedAt)))),
      handled: sortIssues(handled),
      remaining: sortIssues(remaining),
      cancelled: sortIssues(cancelled)
    }
  });
}

function withPriorityBreakdown(week) {
  const issueGroups = week?.issues || {};
  const metricKeys = ["created", "handled", "remaining", "cancelled"];
  const discovered = new Set(PRIORITY_ORDER);
  metricKeys.forEach((metric) => {
    (Array.isArray(issueGroups[metric]) ? issueGroups[metric] : []).forEach((issue) => {
      discovered.add(String(issue?.priority || "Chưa xác định").trim() || "Chưa xác định");
    });
  });
  const priorities = [...discovered].sort((a, b) => {
    const aIndex = PRIORITY_ORDER.indexOf(a);
    const bIndex = PRIORITY_ORDER.indexOf(b);
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }
    return a.localeCompare(b, "vi");
  });
  const priorityBreakdown = Object.fromEntries(priorities.map((priority) => [
    priority,
    Object.fromEntries(metricKeys.map((metric) => [
      metric,
      (Array.isArray(issueGroups[metric]) ? issueGroups[metric] : [])
        .filter((issue) => (String(issue?.priority || "Chưa xác định").trim() || "Chưa xác định") === priority)
        .length
    ]))
  ]));
  return { ...week, priorityBreakdown };
}

function buildBlockerPivot(weeks) {
  const reportingWeeks = Array.isArray(weeks) ? weeks : [];
  const latestWeek = reportingWeeks.at(-1);
  const latestStatusByKey = new Map(
    ["handled", "remaining", "cancelled"]
      .flatMap((metric) => Array.isArray(latestWeek?.issues?.[metric]) ? latestWeek.issues[metric] : [])
      .filter((issue) => issue?.key)
      .map((issue) => [issue.key, issue.status || ""])
  );
  const rowsByGroup = new Map();
  reportingWeeks.forEach((week) => {
    const blockers = (Array.isArray(week?.issues?.created) ? week.issues.created : [])
      .filter((issue) => normalizeStatus(issue.priority) === "blocker")
      .map((issue) => ({ ...issue, status: latestStatusByKey.get(issue.key) || issue.status || "" }))
      .filter((issue) => !isCancelledStatus(issue.status));
    blockers.forEach((issue) => {
      const components = Array.isArray(issue.components) ? issue.components.filter(Boolean) : [];
      const groupKey = issue.parentKey || components.join("|") || "unmapped";
      if (!rowsByGroup.has(groupKey)) {
        rowsByGroup.set(groupKey, {
          groupKey,
          parentKey: issue.parentKey || "",
          groupName: issue.parentSummary || components.join(", ") || "Chưa xác định nguồn phát sinh",
          components,
          total: 0,
          counts: {},
          issues: {}
        });
      }
      const row = rowsByGroup.get(groupKey);
      const weekKey = String(week.weekNumber);
      row.total += 1;
      row.counts[weekKey] = (row.counts[weekKey] || 0) + 1;
      row.issues[weekKey] = [...(row.issues[weekKey] || []), issue];
    });
  });
  const rows = [...rowsByGroup.values()].sort((a, b) => b.total - a.total || a.groupName.localeCompare(b.groupName, "vi"));
  return {
    total: rows.reduce((total, row) => total + row.total, 0),
    rows
  };
}

function normalizeConfig(env = process.env) {
  const baseUrl = String(env.JIRA_BASE_URL || "").trim().replace(/\/+$/, "");
  const email = String(env.JIRA_EMAIL || "").trim();
  const token = String(env.JIRA_API_TOKEN || "").trim();
  return {
    baseUrl,
    email,
    token,
    projectKey: String(env.JIRA_PROJECT_KEY || "PS0142025").trim(),
    label: String(env.JIRA_BUG_LABEL || "TESTLUONG").trim(),
    intervalMinutes: Math.max(1, Math.min(60, Number(env.JIRA_SYNC_INTERVAL_MINUTES || 5))),
    cutoffWeekday: Math.max(0, Math.min(6, Number(env.JIRA_WEEKLY_CUTOFF_WEEKDAY || 4))),
    cutoffHour: Math.max(0, Math.min(23, Number(env.JIRA_WEEKLY_CUTOFF_HOUR || 15))),
    timeZone: String(env.JIRA_TIMEZONE || DEFAULT_TIME_ZONE).trim() || DEFAULT_TIME_ZONE,
    configured: Boolean(baseUrl && email && token)
  };
}

function createJiraWeeklyDashboardService(options = {}) {
  const config = normalizeConfig(options.env || process.env);
  const fetchImpl = options.fetchImpl || global.fetch;
  const encryptionSecret = String(options.encryptionSecret || "");
  if (typeof fetchImpl !== "function") throw new Error("Jira sync requires the Fetch API.");
  let activeSync = null;

  async function jiraJson(runtimeConfig, pathname, searchParams = {}) {
    if (!runtimeConfig.configured) throw serviceError(503, "Jira chưa được cấu hình trên máy chủ.");
    const url = new URL(`${runtimeConfig.baseUrl}${pathname}`);
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    });
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${runtimeConfig.email}:${runtimeConfig.token}`).toString("base64")}`
      },
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const message = response.status === 401 || response.status === 403
        ? "Jira từ chối tài khoản hoặc API token."
        : `Jira API lỗi ${response.status}${body ? `: ${body.slice(0, 180)}` : ""}`;
      throw serviceError(response.status >= 500 ? 502 : response.status, message);
    }
    return response.json();
  }

  async function fetchAllIssues(runtimeConfig) {
    const jql = `project = ${runtimeConfig.projectKey} AND issuetype = Bug AND labels = \"${runtimeConfig.label.replace(/"/g, "\\\"")}\" ORDER BY created ASC`;
    const issues = [];
    let nextPageToken = "";
    do {
      const data = await jiraJson(runtimeConfig, "/rest/api/3/search/jql", {
        jql,
        maxResults: 100,
        nextPageToken,
        fields: "summary,status,created,updated,resolutiondate,priority,components,labels,parent"
      });
      issues.push(...(Array.isArray(data.issues) ? data.issues : []));
      nextPageToken = String(data.nextPageToken || "");
    } while (nextPageToken);
    return issues;
  }

  async function fetchStatusHistories(runtimeConfig, issueKey) {
    const histories = [];
    let startAt = 0;
    do {
      const data = await jiraJson(runtimeConfig, `/rest/api/3/issue/${encodeURIComponent(issueKey)}/changelog`, {
        startAt,
        maxResults: 100
      });
      const values = Array.isArray(data.values) ? data.values : [];
      histories.push(...values);
      startAt += values.length;
      if (!values.length || startAt >= Number(data.total || 0)) break;
    } while (true);
    return histories;
  }

  async function readMeta(db, key, fallback) {
    const result = await db.query("select value from app_meta where key = $1 limit 1", [key]);
    return result.rows[0]?.value ?? fallback;
  }

  async function writeMeta(db, key, value) {
    await db.query(`
      insert into app_meta (key, value, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (key) do update
      set value = excluded.value,
          updated_at = now()
    `, [key, JSON.stringify(value)]);
  }

  async function resolveConfig(db) {
    if (config.configured) return config;
    if (!encryptionSecret) return config;
    const stored = await readMeta(db, CONNECTION_META_KEY, null);
    if (!stored?.encryptedToken) return config;
    try {
      const token = decryptValue(stored.encryptedToken, encryptionSecret);
      const resolved = normalizeConfig({
        JIRA_BASE_URL: stored.baseUrl || config.baseUrl,
        JIRA_EMAIL: stored.email || config.email,
        JIRA_API_TOKEN: token,
        JIRA_PROJECT_KEY: stored.projectKey || config.projectKey,
        JIRA_BUG_LABEL: stored.label || config.label,
        JIRA_SYNC_INTERVAL_MINUTES: config.intervalMinutes,
        JIRA_WEEKLY_CUTOFF_WEEKDAY: config.cutoffWeekday,
        JIRA_WEEKLY_CUTOFF_HOUR: config.cutoffHour,
        JIRA_TIMEZONE: config.timeZone
      });
      return resolved;
    } catch {
      return config;
    }
  }

  async function saveConnection(db, input = {}) {
    if (!encryptionSecret) throw serviceError(500, "Máy chủ chưa có khóa mã hóa token Jira.");
    const next = normalizeConfig({
      JIRA_BASE_URL: input.baseUrl || config.baseUrl,
      JIRA_EMAIL: input.email || config.email,
      JIRA_API_TOKEN: input.token,
      JIRA_PROJECT_KEY: input.projectKey || config.projectKey,
      JIRA_BUG_LABEL: input.label || config.label,
      JIRA_SYNC_INTERVAL_MINUTES: config.intervalMinutes,
      JIRA_WEEKLY_CUTOFF_WEEKDAY: config.cutoffWeekday,
      JIRA_WEEKLY_CUTOFF_HOUR: config.cutoffHour,
      JIRA_TIMEZONE: config.timeZone
    });
    if (!next.configured) throw serviceError(400, "Thiếu URL, email hoặc API token Jira.");
    await jiraJson(next, "/rest/api/3/myself");
    await writeMeta(db, CONNECTION_META_KEY, {
      baseUrl: next.baseUrl,
      email: next.email,
      projectKey: next.projectKey,
      label: next.label,
      encryptedToken: encryptValue(next.token, encryptionSecret),
      savedAt: new Date().toISOString()
    });
    return { configured: true, baseUrl: next.baseUrl, email: next.email, projectKey: next.projectKey, label: next.label };
  }

  async function doSync(db) {
    const lockDb = typeof db.connect === "function" ? await db.connect() : db;
    const lock = await lockDb.query("select pg_try_advisory_lock(hashtext($1)) as locked", [SYNC_LOCK_KEY]);
    if (!lock.rows[0]?.locked) {
      lockDb.release?.();
      return { skipped: true, reason: "Một tiến trình Jira khác đang đồng bộ." };
    }
    try {
      const runtimeConfig = await resolveConfig(lockDb);
      if (!runtimeConfig.configured) throw serviceError(503, "Jira chưa được cấu hình trên máy chủ.");
      const startedAt = new Date().toISOString();
      const previous = await readMeta(lockDb, CACHE_META_KEY, { issues: [] });
      const previousByKey = new Map((Array.isArray(previous?.issues) ? previous.issues : []).map((issue) => [issue.key, issue]));
      const jiraIssues = await fetchAllIssues(runtimeConfig);
      const issues = [];
      for (const jiraIssue of jiraIssues) {
        const previousIssue = previousByKey.get(jiraIssue.key);
        const jiraUpdatedAt = asIso(jiraIssue.fields?.updated);
        const histories = previousIssue && previousIssue.updatedAt === jiraUpdatedAt
          ? previousIssue.histories
          : await fetchStatusHistories(runtimeConfig, jiraIssue.key);
        issues.push(toIssue(jiraIssue.fields, jiraIssue.key, histories));
      }

      const now = new Date();
      const existingSnapshots = await readMeta(lockDb, SNAPSHOT_META_KEY, []);
      const snapshotByWeek = new Map((Array.isArray(existingSnapshots) ? existingSnapshots : []).map((week) => [week.weekNumber, week]));
      buildWeekPeriods(now, runtimeConfig).forEach((period) => {
        if (period.finalized && !snapshotByWeek.has(period.weekNumber)) {
          snapshotByWeek.set(period.weekNumber, { ...calculateWeek(period, issues), finalizedAt: now.toISOString() });
        }
      });
      const snapshots = [...snapshotByWeek.values()].sort((a, b) => a.weekNumber - b.weekNumber);
      const cache = {
        projectKey: runtimeConfig.projectKey,
        label: runtimeConfig.label,
        syncedAt: new Date().toISOString(),
        startedAt,
        total: issues.length,
        issues
      };
      await writeMeta(lockDb, CACHE_META_KEY, cache);
      await writeMeta(lockDb, SNAPSHOT_META_KEY, snapshots);
      return { ok: true, total: issues.length, syncedAt: cache.syncedAt, finalizedWeeks: snapshots.length };
    } finally {
      await lockDb.query("select pg_advisory_unlock(hashtext($1))", [SYNC_LOCK_KEY]).catch(() => {});
      lockDb.release?.();
    }
  }

  async function sync(db) {
    if (activeSync) return activeSync;
    activeSync = doSync(db).finally(() => { activeSync = null; });
    return activeSync;
  }

  async function getDashboard(db, now = new Date()) {
    const runtimeConfig = await resolveConfig(db);
    const cache = await readMeta(db, CACHE_META_KEY, null);
    const snapshots = await readMeta(db, SNAPSHOT_META_KEY, []);
    const snapshotByWeek = new Map((Array.isArray(snapshots) ? snapshots : []).map((week) => [week.weekNumber, week]));
    const issues = Array.isArray(cache?.issues) ? cache.issues : [];
    const weeks = buildWeekPeriods(now, runtimeConfig).map((period) => {
      const week = period.finalized && snapshotByWeek.has(period.weekNumber)
        ? snapshotByWeek.get(period.weekNumber)
        : calculateWeek(period, issues);
      return withPriorityBreakdown(week);
    });
    const blockerPivot = buildBlockerPivot(weeks);
    return {
      configured: runtimeConfig.configured,
      browseBaseUrl: runtimeConfig.baseUrl ? `${runtimeConfig.baseUrl}/browse/` : "",
      projectKey: runtimeConfig.projectKey,
      label: runtimeConfig.label,
      timeZone: runtimeConfig.timeZone,
      cutoffDescription: "Thứ Năm hằng tuần lúc 15:00",
      handledStatuses: ["Closed"],
      cancelledStatuses: ["Cancelled", "Canceled"],
      syncedAt: cache?.syncedAt || null,
      total: Number(cache?.total || issues.length || 0),
      weeks,
      blockerPivot
    };
  }

  return { config, sync, getDashboard, saveConnection };
}

function encryptValue(value, secret) {
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return { iv: iv.toString("base64url"), tag: cipher.getAuthTag().toString("base64url"), data: encrypted.toString("base64url") };
}

function decryptValue(payload, secret) {
  const key = crypto.createHash("sha256").update(secret).digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(payload.data, "base64url")), decipher.final()]).toString("utf8");
}

function serviceError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  createJiraWeeklyDashboardService,
  normalizeConfig,
  normalizeStatus,
  isHandledStatus,
  isCancelledStatus,
  normalizeStatusHistories,
  statusAt,
  buildWeekPeriods,
  calculateWeek,
  withPriorityBreakdown,
  buildBlockerPivot,
  FIRST_WEEK_START,
  FIRST_CUTOFF
};
