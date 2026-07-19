const crypto = require("crypto");

const SETTINGS_META_KEY = "deadline_email_settings";
const GMAIL_CONNECTION_META_KEY = "gmail_oauth_connection";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const GMAIL_SCOPES = [
  "openid",
  "email",
  GMAIL_SEND_SCOPE
];
const DEFAULT_TIME_ZONE = "Asia/Ho_Chi_Minh";

function createDeadlineNotificationService(options = {}) {
  const oauthClientId = String(options.oauthClientId || "").trim();
  const oauthClientSecret = String(options.oauthClientSecret || "").trim();
  const expectedSenderEmail = normalizeEmail(options.expectedSenderEmail || "");
  const defaultManagerEmails = normalizeEmailList(options.defaultManagerEmails || []);
  const defaultAppBaseUrl = normalizeBaseUrl(options.appBaseUrl || "");
  const encryptionSecret = String(options.encryptionSecret || "");
  const fetchImpl = options.fetchImpl || globalThis.fetch;

  if (typeof fetchImpl !== "function") throw new Error("Môi trường Node chưa hỗ trợ fetch.");

  async function getPublicStatus(pool, context = {}) {
    const settings = await readSettings(pool);
    const connection = await readConnection(pool);
    const recentLogs = await pool.query(`
      select notification_key, kind, recipient, scheduled_date, status,
             item_count, attempt_count, error_message, sent_at, updated_at
      from email_notification_log
      order by updated_at desc
      limit 12
    `);
    return {
      configured: Boolean(oauthClientId && oauthClientSecret),
      connected: Boolean(connection?.refreshToken && hasGmailSendScope(connection.scope)),
      missingSendScope: Boolean(connection?.refreshToken && !hasGmailSendScope(connection.scope)),
      accountEmail: connection?.accountEmail || "",
      expectedSenderEmail,
      callbackUrl: String(context.callbackUrl || ""),
      settings,
      recentLogs: recentLogs.rows.map(mapNotificationLog)
    };
  }

  async function readSettings(pool) {
    const stored = await readMeta(pool, SETTINGS_META_KEY);
    return normalizeSettings(stored);
  }

  async function saveSettings(pool, input, actor = {}) {
    const current = await readSettings(pool);
    const settings = normalizeSettings({
      ...current,
      enabled: input.enabled,
      managerEmails: input.managerEmails,
      timeZone: input.timeZone || current.timeZone,
      appBaseUrl: input.appBaseUrl || current.appBaseUrl,
      updatedAt: new Date().toISOString(),
      updatedBy: actor.id || ""
    });
    if (!settings.managerEmails.length) {
      throw createPublicError(400, "Cần ít nhất một email quản lý để gửi tổng kết thứ Sáu.");
    }
    await writeMeta(pool, SETTINGS_META_KEY, settings);
    return settings;
  }

  function buildAuthorizationUrl({ redirectUri, state }) {
    assertOAuthConfigured();
    const params = new URLSearchParams({
      client_id: oauthClientId,
      redirect_uri: String(redirectUri || ""),
      response_type: "code",
      scope: GMAIL_SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state: String(state || "")
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async function connectFromAuthorizationCode(pool, { code, redirectUri }) {
    assertOAuthConfigured();
    if (!code) throw createPublicError(400, "Google không trả về mã xác thực Gmail.");
    const token = await requestForm(fetchImpl, GOOGLE_TOKEN_URL, {
      code,
      client_id: oauthClientId,
      client_secret: oauthClientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    });
    const existing = await readConnection(pool);
    const refreshToken = token.refresh_token || existing?.refreshToken;
    if (!refreshToken) {
      throw createPublicError(409, "Google chưa cấp refresh token. Hãy ngắt kết nối rồi cấp quyền lại.");
    }
    const profile = await requestJson(fetchImpl, GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    if (!hasGmailSendScope(token.scope)) {
      throw createPublicError(409, "Chưa cấp quyền Send email on your behalf. Hãy kết nối lại và tích quyền gửi Gmail.");
    }
    const accountEmail = normalizeEmail(profile.email || "");
    if (!accountEmail) throw createPublicError(502, "Không đọc được địa chỉ Gmail đã cấp quyền.");
    if (expectedSenderEmail && accountEmail !== expectedSenderEmail) {
      throw createPublicError(409, `Cần kết nối đúng Gmail ${expectedSenderEmail}, tài khoản vừa chọn là ${accountEmail}.`);
    }
    const connection = {
      version: 1,
      accountEmail,
      refreshToken,
      scope: String(token.scope || GMAIL_SCOPES.join(" ")),
      connectedAt: new Date().toISOString()
    };
    await writeEncryptedConnection(pool, connection);
    return { accountEmail, connectedAt: connection.connectedAt };
  }

  async function disconnect(pool) {
    await pool.query("delete from app_meta where key = $1", [GMAIL_CONNECTION_META_KEY]);
  }

  async function preview(pool, input = {}) {
    const settings = await readSettings(pool);
    const notificationData = await readNotificationData(pool);
    const todayKey = normalizeDateKey(input.todayKey) || dateKeyInTimeZone(input.now || new Date(), settings.timeZone);
    const plan = buildNotificationPlan(notificationData.workItems, {
      todayKey,
      managerEmails: settings.managerEmails,
      categories: notificationData.categories,
      forceManagerDigest: input.forceManagerDigest
    });
    return summarizePlan(plan, settings);
  }

  async function sendTest(pool, recipient) {
    const settings = await readSettings(pool);
    const connection = await requireConnection(pool);
    const target = normalizeEmail(recipient || connection.accountEmail);
    if (!target) throw createPublicError(400, "Email nhận thử không hợp lệ.");
    const notificationData = await readNotificationData(pool);
    const todayKey = dateKeyInTimeZone(new Date(), settings.timeZone);
    const plan = buildNotificationPlan(notificationData.workItems, {
      todayKey,
      managerEmails: settings.managerEmails,
      categories: notificationData.categories
    });
    const previewItems = plan.assigneeDigests.flatMap((digest) => digest.items);
    await sendGmailMessage(connection, {
      to: [target],
      subject: `[Bản gửi thử] [Squad 2 UAT] ${previewItems.length} công việc cần theo dõi - ${formatViDate(todayKey)}`,
      html: renderOperationalPreview({
        target,
        plan,
        settings,
        todayKey
      })
    });
    return {
      recipient: target,
      sentAt: new Date().toISOString(),
      taskCount: previewItems.length,
      assigneeDigestCount: plan.assigneeDigests.length
    };
  }

  async function sendManagerStatus(pool, input = {}) {
    const settings = await readSettings(pool);
    const connection = await requireConnection(pool);
    const recipients = normalizeEmailList(input.recipients?.length ? input.recipients : settings.managerEmails);
    if (!recipients.length) throw createPublicError(400, "Chưa cấu hình email quản lý nhận thông báo.");
    const todayKey = normalizeDateKey(input.todayKey) || dateKeyInTimeZone(input.now || new Date(), settings.timeZone);
    const logResult = await pool.query(`
      select recipient, status, item_count, sent_at, error_message
      from email_notification_log
      where scheduled_date = $1::date
        and kind = 'assignee-daily'
      order by recipient asc
    `, [todayKey]);
    const notificationData = await readNotificationData(pool);
    const assigneeByEmail = new Map(notificationData.workItems
      .filter((item) => normalizeEmail(item.assigneeEmail))
      .map((item) => [normalizeEmail(item.assigneeEmail), item.assignee || item.assigneeEmail]));
    const deliveries = logResult.rows.map((row) => ({
      recipient: normalizeEmail(row.recipient),
      assignee: assigneeByEmail.get(normalizeEmail(row.recipient)) || row.recipient,
      status: String(row.status || ""),
      itemCount: Number(row.item_count || 0),
      sentAt: row.sent_at ? new Date(row.sent_at).toISOString() : "",
      error: String(row.error_message || "")
    }));
    const report = {
      sentCount: deliveries.filter((item) => item.status === "sent").length,
      failedCount: deliveries.filter((item) => item.status === "failed").length,
      taskCount: deliveries.filter((item) => item.status === "sent").reduce((total, item) => total + item.itemCount, 0),
      deliveries
    };
    const outcome = await sendLoggedNotification(pool, connection, {
      notificationKey: `manager-status:${recipients.join(",")}:${todayKey}`,
      kind: "manager-status",
      recipient: recipients.join(","),
      recipients,
      scheduledDate: todayKey,
      itemCount: report.taskCount,
      subject: `[Squad 2 UAT] Xác nhận hệ thống đã gửi nhắc deadline - ${formatViDate(todayKey)}`,
      html: renderManagerStatusEmail(report, settings, todayKey)
    });
    return { todayKey, recipients, ...report, status: outcome.status, error: outcome.error || "" };
  }

  async function run(pool, input = {}) {
    const lockClient = await pool.connect();
    const lockName = "squad2-deadline-email-job";
    let locked = false;
    try {
      const lockResult = await lockClient.query("select pg_try_advisory_lock(hashtext($1)) as locked", [lockName]);
      locked = Boolean(lockResult.rows[0]?.locked);
      if (!locked) return { skipped: true, reason: "job-already-running", sent: 0, failed: 0 };

      const settings = await readSettings(lockClient);
      if (!settings.enabled && !input.force) {
        return { skipped: true, reason: "notifications-disabled", sent: 0, failed: 0 };
      }
      const connection = await requireConnection(lockClient);
      const notificationData = await readNotificationData(lockClient);
      const todayKey = normalizeDateKey(input.todayKey) || dateKeyInTimeZone(input.now || new Date(), settings.timeZone);
      const plan = buildNotificationPlan(notificationData.workItems, {
        todayKey,
        managerEmails: settings.managerEmails,
        categories: notificationData.categories,
        forceManagerDigest: input.forceManagerDigest
      });
      const result = {
        skipped: false,
        todayKey,
        sent: 0,
        failed: 0,
        duplicate: 0,
        assigneeDigests: plan.assigneeDigests.length,
        managerDigest: Boolean(plan.managerDigest),
        missingAssigneeEmails: plan.missingAssigneeEmails,
        errors: []
      };

      for (const digest of plan.assigneeDigests) {
        const notificationKey = `assignee:${digest.recipient}:${todayKey}`;
        const outcome = await sendLoggedNotification(lockClient, connection, {
          notificationKey,
          kind: "assignee-daily",
          recipient: digest.recipient,
          scheduledDate: todayKey,
          itemCount: digest.items.length,
          subject: buildAssigneeSubject(digest, todayKey),
          html: renderAssigneeDigest(digest, settings, todayKey)
        });
        collectOutcome(result, outcome);
      }

      if (plan.managerDigest) {
        const managerKey = `manager:${plan.managerDigest.recipients.join(",")}:${todayKey}`;
        const outcome = await sendLoggedNotification(lockClient, connection, {
          notificationKey: managerKey,
          kind: "manager-weekly",
          recipient: plan.managerDigest.recipients.join(","),
          recipients: plan.managerDigest.recipients,
          scheduledDate: todayKey,
          itemCount: plan.managerDigest.overdueItems.length + plan.managerDigest.completedLateItems.length,
          subject: `[Squad 2 UAT] Tổng kết tuân thủ deadline tuần - ${formatViDate(todayKey)}`,
          html: renderManagerDigest(plan.managerDigest, settings, todayKey)
        });
        collectOutcome(result, outcome);
      }
      return result;
    } finally {
      if (locked) await lockClient.query("select pg_advisory_unlock(hashtext($1))", [lockName]).catch(() => {});
      lockClient.release();
    }
  }

  async function sendLoggedNotification(client, connection, notification) {
    const reserved = await reserveNotification(client, notification);
    if (!reserved) return { status: "duplicate" };
    try {
      await sendGmailMessage(connection, {
        to: notification.recipients || [notification.recipient],
        subject: notification.subject,
        html: notification.html
      });
      await client.query(`
        update email_notification_log
        set status = 'sent', error_message = null, sent_at = now(), updated_at = now()
        where notification_key = $1
      `, [notification.notificationKey]);
      return { status: "sent" };
    } catch (error) {
      const message = publicMessage(error);
      await client.query(`
        update email_notification_log
        set status = 'failed', error_message = $2, updated_at = now()
        where notification_key = $1
      `, [notification.notificationKey, message.slice(0, 2000)]);
      return { status: "failed", error: message };
    }
  }

  async function sendGmailMessage(connection, message) {
    const accessToken = await refreshAccessToken(connection.refreshToken);
    const raw = buildMimeMessage({
      from: connection.accountEmail,
      to: normalizeEmailList(message.to),
      subject: message.subject,
      html: message.html
    });
    await requestJson(fetchImpl, GMAIL_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ raw })
    });
  }

  async function refreshAccessToken(refreshToken) {
    assertOAuthConfigured();
    const token = await requestForm(fetchImpl, GOOGLE_TOKEN_URL, {
      client_id: oauthClientId,
      client_secret: oauthClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    });
    if (!token.access_token) throw createPublicError(502, "Google không trả về access token Gmail.");
    return token.access_token;
  }

  async function readConnection(pool) {
    const stored = await readMeta(pool, GMAIL_CONNECTION_META_KEY);
    if (!stored?.encryptedRefreshToken) return null;
    try {
      return {
        ...stored,
        refreshToken: decryptValue(stored.encryptedRefreshToken, encryptionSecret)
      };
    } catch {
      throw createPublicError(500, "Không giải mã được kết nối Gmail. Hãy kết nối lại tài khoản gửi.");
    }
  }

  async function requireConnection(pool) {
    assertOAuthConfigured();
    const connection = await readConnection(pool);
    if (!connection?.refreshToken) throw createPublicError(409, "Chưa kết nối tài khoản Gmail gửi thông báo.");
    if (!hasGmailSendScope(connection.scope)) {
      throw createPublicError(409, "Kết nối Gmail chưa có quyền gửi thư. Hãy kết nối lại và tích quyền Send email on your behalf.");
    }
    return connection;
  }

  async function writeEncryptedConnection(pool, connection) {
    if (!encryptionSecret) throw createPublicError(500, "Chưa cấu hình khóa mã hóa token Gmail.");
    const stored = {
      version: 1,
      accountEmail: connection.accountEmail,
      encryptedRefreshToken: encryptValue(connection.refreshToken, encryptionSecret),
      scope: connection.scope,
      connectedAt: connection.connectedAt
    };
    await writeMeta(pool, GMAIL_CONNECTION_META_KEY, stored);
  }

  function normalizeSettings(value = {}) {
    value = value || {};
    return {
      enabled: value.enabled !== false,
      senderEmail: expectedSenderEmail,
      managerEmails: normalizeEmailList(value.managerEmails?.length ? value.managerEmails : defaultManagerEmails),
      timeZone: isValidTimeZone(value.timeZone) ? value.timeZone : DEFAULT_TIME_ZONE,
      appBaseUrl: normalizeBaseUrl(value.appBaseUrl || defaultAppBaseUrl),
      updatedAt: String(value.updatedAt || ""),
      updatedBy: String(value.updatedBy || "")
    };
  }

  function assertOAuthConfigured() {
    if (!oauthClientId || !oauthClientSecret) {
      throw createPublicError(503, "Chưa cấu hình GMAIL_OAUTH_CLIENT_ID và GMAIL_OAUTH_CLIENT_SECRET trên Railway.");
    }
  }

  return {
    getPublicStatus,
    readSettings,
    saveSettings,
    buildAuthorizationUrl,
    connectFromAuthorizationCode,
    disconnect,
    preview,
    sendTest,
    sendManagerStatus,
    run
  };
}

function buildNotificationPlan(workItems, options = {}) {
  const todayKey = normalizeDateKey(options.todayKey);
  if (!todayKey) throw new Error("todayKey phải có định dạng YYYY-MM-DD.");
  const categories = options.categories instanceof Map
    ? options.categories
    : new Map(Object.entries(options.categories || {}));
  const groups = new Map();
  const missingAssigneeEmails = [];
  const activeItems = (workItems || []).filter((item) => !isCompletedWorkItem(item));

  for (const item of activeItems) {
    const reminder = classifyDeadlineReminder(item, todayKey);
    if (!reminder) continue;
    const recipient = normalizeEmail(item.assigneeEmail || "");
    const normalizedItem = decorateDeadlineItem(item, todayKey, categories);
    if (!recipient) {
      missingAssigneeEmails.push({ id: item.id || "", taskId: item.taskId || "", title: item.title || "" });
      continue;
    }
    if (!groups.has(recipient)) groups.set(recipient, []);
    groups.get(recipient).push({ ...normalizedItem, reminder });
  }

  const assigneeDigests = [...groups.entries()]
    .map(([recipient, items]) => ({
      recipient,
      assignee: items.find((item) => item.assignee)?.assignee || recipient,
      items: items.sort(compareDeadlineItems)
    }))
    .sort((a, b) => a.assignee.localeCompare(b.assignee, "vi"));

  const shouldBuildManagerDigest = options.forceManagerDigest === true || isFridayDateKey(todayKey);
  const managerEmails = normalizeEmailList(options.managerEmails || []);
  const overdueItems = activeItems
    .map((item) => decorateDeadlineItem(item, todayKey, categories))
    .filter((item) => item.daysOverdue >= 1)
    .sort(compareDeadlineItems);
  const reportStartKey = shiftDateKey(todayKey, -6);
  const completedLateItems = (workItems || [])
    .filter(isCompletedWorkItem)
    .map((item) => decorateCompletedLateItem(item, categories))
    .filter((item) => item.completedLateDays >= 1
      && item.completedDate >= reportStartKey
      && item.completedDate <= todayKey)
    .sort(compareCompletedLateItems);
  const managerDigest = shouldBuildManagerDigest && managerEmails.length
    ? {
      recipients: managerEmails,
      items: overdueItems,
      overdueItems,
      completedLateItems,
      reportStartKey,
      reportEndKey: todayKey
    }
    : null;

  return {
    todayKey,
    assigneeDigests,
    managerDigest,
    managerOverdueTaskCount: overdueItems.length,
    managerCompletedLateTaskCount: completedLateItems.length,
    missingAssigneeEmails
  };
}

function classifyDeadlineReminder(item, todayKey) {
  if (isCompletedWorkItem(item)) return null;
  const dueDate = normalizeDateKey(item?.dueDate);
  if (!dueDate) return null;
  const remainingDays = dayDifference(todayKey, dueDate);
  if (remainingDays >= 0 && remainingDays <= 5) {
    return { phase: "upcoming", remainingDays, overdueDays: 0 };
  }
  if (remainingDays < 0) {
    return { phase: "overdue", remainingDays, overdueDays: Math.abs(remainingDays) };
  }
  return null;
}

function decorateDeadlineItem(item, todayKey, categories) {
  const dueDate = normalizeDateKey(item?.dueDate);
  const remainingDays = dueDate ? dayDifference(todayKey, dueDate) : null;
  return {
    ...item,
    categoryName: categories.get(String(item?.categoryId || ""))?.name
      || categories.get(String(item?.categoryId || ""))
      || "",
    dueDate,
    remainingDays,
    daysOverdue: Number.isFinite(remainingDays) && remainingDays < 0 ? Math.abs(remainingDays) : 0
  };
}

function decorateCompletedLateItem(item, categories) {
  const dueDate = normalizeDateKey(item?.dueDate);
  const completedDate = normalizeDateKey(item?.completedDate);
  const completedLateDays = dueDate && completedDate ? dayDifference(dueDate, completedDate) : 0;
  return {
    ...item,
    categoryName: categories.get(String(item?.categoryId || ""))?.name
      || categories.get(String(item?.categoryId || ""))
      || "",
    dueDate,
    completedDate,
    completedLateDays: Math.max(0, Number(completedLateDays) || 0),
    remainingDays: 0,
    daysOverdue: 0
  };
}

function summarizePlan(plan, settings = {}) {
  return {
    todayKey: plan.todayKey,
    enabled: settings.enabled !== false,
    assigneeDigestCount: plan.assigneeDigests.length,
    assigneeTaskCount: plan.assigneeDigests.reduce((total, digest) => total + digest.items.length, 0),
    managerDigest: Boolean(plan.managerDigest),
    managerOverdueTaskCount: Number(plan.managerOverdueTaskCount || 0),
    managerCompletedLateTaskCount: Number(plan.managerCompletedLateTaskCount || 0),
    missingAssigneeEmailCount: plan.missingAssigneeEmails.length,
    recipients: plan.assigneeDigests.map((digest) => ({
      email: digest.recipient,
      name: digest.assignee,
      itemCount: digest.items.length
    }))
  };
}

function isCompletedWorkItem(item) {
  return normalizeLookup(item?.status) === normalizeLookup("Hoàn thành") || Number(item?.progress) >= 100;
}

function compareDeadlineItems(a, b) {
  const due = String(a.dueDate || "9999-12-31").localeCompare(String(b.dueDate || "9999-12-31"));
  if (due) return due;
  return String(a.taskId || a.title || "").localeCompare(String(b.taskId || b.title || ""), "vi");
}

function compareCompletedLateItems(a, b) {
  const completed = String(b.completedDate || "").localeCompare(String(a.completedDate || ""));
  if (completed) return completed;
  return compareDeadlineItems(a, b);
}

function renderAssigneeDigest(digest, settings, todayKey) {
  const overdueCount = digest.items.filter((item) => item.daysOverdue > 0).length;
  const dueTodayCount = digest.items.filter((item) => item.remainingDays === 0).length;
  const upcomingCount = digest.items.length - overdueCount - dueTodayCount;
  return renderEmailShell({
    eyebrow: "SQUAD 2 UAT • NHẮC DEADLINE",
    title: `Chào ${displayFirstName(digest.assignee) || "bạn"}, bạn có ${digest.items.length} công việc cần theo dõi`,
    intro: "Hệ thống đã rà soát toàn bộ danh sách công việc và tổng hợp các hạng mục đang gần hạn hoặc quá hạn của bạn dưới đây.",
    body: `${renderDeadlineSummary({ upcomingCount, dueTodayCount, overdueCount })}${renderTaskCards(digest.items, { showAssignee: false })}`,
    actionUrl: settings.appBaseUrl ? `${settings.appBaseUrl}/#work/task-master` : "",
    actionLabel: "Xem và cập nhật công việc",
    footer: `Thông báo tự động ngày ${formatViDate(todayKey)}, được gửi theo dữ liệu trên toàn bộ Task Master. Khi công việc được cập nhật Hoàn thành, hệ thống sẽ tự dừng nhắc. Bạn không cần trả lời email này.`
  });
}

function buildAssigneeSubject(digest, todayKey) {
  const overdueCount = digest.items.filter((item) => item.daysOverdue > 0).length;
  const prefix = overdueCount > 0 ? "Cần cập nhật" : "Nhắc deadline";
  return `[Squad 2 UAT] ${prefix}: ${digest.items.length} công việc - ${formatViDate(todayKey)}`;
}

function renderManagerDigest(digest, settings, todayKey) {
  const overdueItems = digest.overdueItems || digest.items || [];
  const completedLateItems = digest.completedLateItems || [];
  const allItems = [...overdueItems, ...completedLateItems];
  const assigneeCount = new Set(allItems.map((item) => item.assignee || item.assigneeEmail || "Chưa phân công")).size;
  const body = allItems.length
    ? `${renderManagerSummary(overdueItems, completedLateItems)}
      ${renderManagerSection("Đang quá hạn", `${overdueItems.length} công việc chưa hoàn thành`, overdueItems, "Không còn công việc nào đang quá hạn.")}
      ${renderManagerSection("Đã hoàn thành trễ trong kỳ", `${completedLateItems.length} công việc đã hoàn thành sau deadline`, completedLateItems, "Không có công việc nào hoàn thành trễ trong kỳ báo cáo.")}`
    : `<div style="padding:24px;border:1px solid #d8e4e7;background:#f4fbf9;color:#075f58;font-weight:700;text-align:center;">Kỳ này không có công việc đang quá hạn hoặc hoàn thành trễ.</div>`;
  return renderEmailShell({
    eyebrow: "TỔNG KẾT TUÂN THỦ DEADLINE • THỨ SÁU",
    title: "Báo cáo deadline công việc tuần",
    intro: allItems.length
      ? `Kỳ ${formatViDate(digest.reportStartKey)} - ${formatViDate(digest.reportEndKey || todayKey)} ghi nhận ${overdueItems.length} công việc đang quá hạn và ${completedLateItems.length} công việc đã hoàn thành trễ, liên quan ${assigneeCount} người phụ trách.`
      : `Kỳ ${formatViDate(digest.reportStartKey)} - ${formatViDate(digest.reportEndKey || todayKey)} không ghi nhận công việc đang quá hạn hoặc hoàn thành trễ.`,
    body,
    actionUrl: settings.appBaseUrl ? `${settings.appBaseUrl}/#work/task-master` : "",
    actionLabel: "Xem Task Master",
    footer: `Báo cáo tự động chốt ngày ${formatViDate(todayKey)}. Công việc hoàn thành trễ vẫn được giữ trong báo cáo của kỳ tương ứng theo Ngày hoàn thành thực tế.`
  });
}

function renderManagerSection(title, subtitle, items, emptyText) {
  const content = items.length
    ? renderTaskCards(items, { showAssignee: true })
    : `<div style="padding:16px;background:#f5f8fa;color:#657282;border:1px solid #e1e8eb;text-align:center;">${escapeHtml(emptyText)}</div>`;
  return `<div style="margin:22px 0 10px;"><div style="font-size:17px;font-weight:700;color:#172033;">${escapeHtml(title)}</div><div style="margin-top:3px;font-size:12px;color:#6c7785;">${escapeHtml(subtitle)}</div></div>${content}`;
}

function renderManagerStatusEmail(report, settings, todayKey) {
  const sentDeliveries = report.deliveries.filter((item) => item.status === "sent");
  const rows = sentDeliveries.length
    ? sentDeliveries.map((item) => `<tr><td style="padding:10px;border-bottom:1px solid #e4eaee;"><strong>${escapeHtml(item.assignee)}</strong><br><span style="font-size:12px;color:#6c7785;">${escapeHtml(item.recipient)}</span></td><td style="padding:10px;border-bottom:1px solid #e4eaee;text-align:center;font-weight:700;">${item.itemCount}</td><td style="padding:10px;border-bottom:1px solid #e4eaee;color:#087f45;font-weight:700;">Đã gửi</td></tr>`).join("")
    : `<tr><td colspan="3" style="padding:18px;text-align:center;color:#6c7785;">Hôm nay chưa có email nhắc deadline nào được gửi.</td></tr>`;
  const body = `${renderOperationSummary(report)}<table role="presentation" style="width:100%;border-collapse:collapse;margin-top:18px;"><thead><tr><th style="padding:10px;background:#087f78;color:#fff;text-align:left;">Người nhận</th><th style="padding:10px;background:#087f78;color:#fff;text-align:center;">Công việc</th><th style="padding:10px;background:#087f78;color:#fff;text-align:left;">Kết quả</th></tr></thead><tbody>${rows}</tbody></table>`;
  return renderEmailShell({
    eyebrow: "SQUAD 2 UAT • XÁC NHẬN VẬN HÀNH",
    title: report.failedCount > 0 ? "Kết quả gửi nhắc deadline hôm nay" : "Hệ thống đã gửi nhắc deadline thành công",
    intro: `Chào chị Yến, hệ thống xin thông báo lượt nhắc deadline ngày ${formatViDate(todayKey)} đã hoàn tất. Kết quả dưới đây được lấy trực tiếp từ nhật ký gửi mail thực tế.`,
    body,
    actionUrl: settings.appBaseUrl ? `${settings.appBaseUrl}/#work/inputs` : "",
    actionLabel: "Xem cấu hình và lịch sử gửi",
    footer: "Hệ thống tự động rà soát toàn bộ Task Master lúc 08:00 mỗi ngày, kể cả cuối tuần và ngày ngoài giờ làm việc. Đây là email xác nhận vận hành, bạn không cần trả lời."
  });
}

function renderOperationSummary(report) {
  const cells = [
    { label: "Email đã gửi", value: report.sentCount, color: "#087f45", background: "#eaf8f0" },
    { label: "Công việc đã nhắc", value: report.taskCount, color: "#087f78", background: "#e9f7f5" },
    { label: "Gửi lỗi", value: report.failedCount, color: report.failedCount ? "#bd2525" : "#52616f", background: report.failedCount ? "#fff0f0" : "#f2f5f7" }
  ];
  return `<table role="presentation" style="width:100%;border-collapse:separate;border-spacing:8px 0;margin:0 -8px;"><tr>${cells.map((cell) => `<td style="width:33.33%;padding:12px;background:${cell.background};border-radius:6px;color:${cell.color};"><div style="font-size:22px;font-weight:700;">${cell.value}</div><div style="margin-top:3px;font-size:12px;font-weight:700;">${cell.label}</div></td>`).join("")}</tr></table>`;
}

function renderManagerSummary(overdueItems, completedLateItems) {
  const grouped = new Map();
  const add = (item, field) => {
    const name = item.assignee || item.assigneeEmail || "Chưa phân công";
    if (!grouped.has(name)) grouped.set(name, { overdue: 0, completedLate: 0 });
    grouped.get(name)[field] += 1;
  };
  overdueItems.forEach((item) => add(item, "overdue"));
  completedLateItems.forEach((item) => add(item, "completedLate"));
  const rows = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "vi"))
    .map(([name, counts]) => `<tr><td style="padding:8px 10px;border-bottom:1px solid #e4eaee;">${escapeHtml(name)}</td><td style="padding:8px 10px;border-bottom:1px solid #e4eaee;text-align:center;font-weight:700;color:#bd2525;">${counts.overdue}</td><td style="padding:8px 10px;border-bottom:1px solid #e4eaee;text-align:center;font-weight:700;color:#9a6200;">${counts.completedLate}</td></tr>`)
    .join("");
  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 18px;"><thead><tr><th style="padding:9px 10px;background:#087f78;color:#fff;text-align:left;">Người phụ trách</th><th style="padding:9px 10px;background:#087f78;color:#fff;text-align:center;">Đang quá hạn</th><th style="padding:9px 10px;background:#087f78;color:#fff;text-align:center;">Hoàn thành trễ</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderDeadlineSummary({ upcomingCount = 0, dueTodayCount = 0, overdueCount = 0 }) {
  const cells = [
    { label: "Sắp đến hạn", value: upcomingCount, color: "#087f78", background: "#e9f7f5" },
    { label: "Đến hạn hôm nay", value: dueTodayCount, color: "#9a6200", background: "#fff7df" },
    { label: "Quá hạn", value: overdueCount, color: "#bd2525", background: "#fff0f0" }
  ];
  return `<table role="presentation" style="width:100%;border-collapse:separate;border-spacing:8px 0;margin:0 -8px 18px;"><tr>${cells.map((cell) => `<td style="width:33.33%;padding:12px;background:${cell.background};border-radius:6px;color:${cell.color};"><div style="font-size:22px;font-weight:700;">${cell.value}</div><div style="margin-top:3px;font-size:12px;font-weight:700;">${cell.label}</div></td>`).join("")}</tr></table>`;
}

function renderTaskCards(items, options = {}) {
  return items.map((item) => {
    const timing = item.completedLateDays > 0
      ? `<strong style="color:#9a6200;">Hoàn thành trễ ${item.completedLateDays} ngày</strong>`
      : item.daysOverdue > 0
      ? `<strong style="color:#c62828;">Quá hạn ${item.daysOverdue} ngày</strong>`
      : item.remainingDays === 0
        ? `<strong style="color:#b26a00;">Đến hạn hôm nay</strong>`
        : `<span style="color:#875700;">Còn ${item.remainingDays} ngày</span>`;
    const urgencyColor = item.completedLateDays > 0 ? "#d28a00" : item.daysOverdue > 0 ? "#d43b3b" : item.remainingDays === 0 ? "#d28a00" : "#00867e";
    const progress = Math.max(0, Math.min(100, Number(item.progress) || 0));
    const completedCell = item.completedDate
      ? `<td style="padding:8px 10px;background:#f5f8fa;color:#344255;"><span style="font-size:11px;color:#758190;">HOÀN THÀNH THỰC TẾ</span><br><strong>${escapeHtml(formatViDate(item.completedDate))}</strong></td>`
      : "";
    return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 12px;border:1px solid #dfe7ea;border-left:5px solid ${urgencyColor};background:#fff;"><tr><td style="padding:16px;">
      <div style="font-size:12px;color:#607080;font-weight:700;">${escapeHtml(item.taskId || "-")}${item.categoryName ? ` • ${escapeHtml(item.categoryName)}` : ""}</div>
      <div style="margin-top:6px;font-size:16px;line-height:1.45;font-weight:700;color:#172033;">${escapeHtml(item.title || "-")}</div>
      ${options.showAssignee ? `<div style="margin-top:8px;color:#344255;"><strong>Phụ trách:</strong> ${escapeHtml(item.assignee || item.assigneeEmail || "Chưa phân công")}</div>` : ""}
      <table role="presentation" style="width:100%;margin-top:12px;border-collapse:collapse;"><tr>
        <td style="padding:8px 10px;background:#f5f8fa;color:#344255;"><span style="font-size:11px;color:#758190;">TRẠNG THÁI</span><br><strong>${escapeHtml(item.status || "Chưa bắt đầu")}</strong></td>
        <td style="padding:8px 10px;background:#f5f8fa;color:#344255;"><span style="font-size:11px;color:#758190;">TIẾN ĐỘ</span><br><strong>${progress}%</strong></td>
        <td style="padding:8px 10px;background:#f5f8fa;color:#344255;"><span style="font-size:11px;color:#758190;">DEADLINE</span><br><strong>${escapeHtml(formatViDate(item.dueDate))}</strong> • ${timing}</td>
        ${completedCell}
      </tr></table>
    </td></tr></table>`;
  }).join("");
}

function renderEmailShell({ eyebrow, title, intro, body, actionUrl, actionLabel, footer }) {
  const action = actionUrl
    ? `<div style="margin:24px 0 8px;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:11px 18px;background:#007a73;color:#fff;text-decoration:none;font-weight:700;border-radius:6px;">${escapeHtml(actionLabel)}</a></div>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#eef3f5;font-family:Arial,sans-serif;color:#172033;"><div style="max-width:820px;margin:0 auto;padding:24px 12px;"><div style="background:#fff;border:1px solid #dce4e8;"><div style="padding:18px 24px;background:#006b64;color:#fff;"><div style="font-size:11px;font-weight:700;letter-spacing:.08em;">${escapeHtml(eyebrow)}</div><div style="margin-top:6px;font-size:24px;font-weight:700;">${escapeHtml(title)}</div></div><div style="padding:24px;"><p style="margin:0 0 18px;line-height:1.6;">${escapeHtml(intro)}</p>${body}${action}<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e5eaed;color:#667281;font-size:12px;line-height:1.5;">${escapeHtml(footer)}</p></div></div></div></body></html>`;
}

function renderOperationalPreview({ target, plan, settings, todayKey }) {
  const previewItems = plan.assigneeDigests.flatMap((digest) => digest.items);
  const overdueCount = previewItems.filter((item) => item.daysOverdue > 0).length;
  const dueTodayCount = previewItems.filter((item) => item.remainingDays === 0).length;
  const upcomingCount = previewItems.length - overdueCount - dueTodayCount;
  const body = previewItems.length
    ? `${renderDeadlineSummary({ upcomingCount, dueTodayCount, overdueCount })}${renderTaskCards(previewItems, { showAssignee: true })}`
    : `<div style="padding:22px;background:#f1f8f7;border-left:4px solid #00867e;color:#075f58;font-weight:700;">Hôm nay không có công việc nào thuộc diện nhắc từ D-5 đến khi hoàn thành.</div>`;
  return renderEmailShell({
    eyebrow: "BẢN GỬI THỬ • DỮ LIỆU THỰC TẾ HÔM NAY",
    title: `${previewItems.length} công việc đang thuộc diện nhắc deadline`,
    intro: `Đây là bản xem trước được tổng hợp từ toàn bộ Task Master. Nếu chạy lịch hôm nay, hệ thống sẽ gửi ${plan.assigneeDigests.length} email cá nhân cho ${previewItems.length} công việc.`,
    body,
    actionUrl: settings.appBaseUrl ? `${settings.appBaseUrl}/#work/task-master` : "",
    actionLabel: "Mở danh sách công việc",
    footer: `Bản gửi thử chỉ được gửi tới ${target}. Lịch thật vẫn chạy độc lập theo ngày ${formatViDate(todayKey)}, kể cả cuối tuần và ngoài giờ hành chính.`
  });
}

function displayFirstName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return parts.at(-1) || "";
}

async function reserveNotification(client, notification) {
  const result = await client.query(`
    insert into email_notification_log (
      notification_key, kind, recipient, scheduled_date, status,
      item_count, attempt_count, created_at, updated_at
    ) values ($1, $2, $3, $4::date, 'pending', $5, 1, now(), now())
    on conflict (notification_key) do update
      set status = 'pending',
          recipient = excluded.recipient,
          item_count = excluded.item_count,
          attempt_count = email_notification_log.attempt_count + 1,
          error_message = null,
          updated_at = now()
      where email_notification_log.status = 'failed'
         or (email_notification_log.status = 'pending' and email_notification_log.updated_at < now() - interval '30 minutes')
    returning notification_key
  `, [
    notification.notificationKey,
    notification.kind,
    notification.recipient,
    notification.scheduledDate,
    notification.itemCount || 0
  ]);
  return Boolean(result.rows[0]);
}

async function readNotificationData(pool) {
  const result = await pool.query(`
    select collection, id, data
    from uat_records
    where collection in ('workItems', 'workCategories')
  `);
  const workItems = [];
  const categories = new Map();
  for (const row of result.rows) {
    const data = { ...(row.data || {}), id: row.id };
    if (row.collection === "workItems") workItems.push(data);
    if (row.collection === "workCategories") categories.set(String(row.id), data);
  }
  return { workItems, categories };
}

async function readMeta(pool, key) {
  const result = await pool.query("select value from app_meta where key = $1 limit 1", [key]);
  return result.rows[0]?.value || null;
}

async function writeMeta(pool, key, value) {
  await pool.query(`
    insert into app_meta (key, value, updated_at)
    values ($1, $2::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at
  `, [key, JSON.stringify(value)]);
}

async function requestForm(fetchImpl, url, values) {
  return requestJson(fetchImpl, url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(values).toString()
  });
}

async function requestJson(fetchImpl, url, options = {}) {
  const response = await fetchImpl(url, { ...options, signal: options.signal || AbortSignal.timeout(30000) });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || `HTTP ${response.status}` };
  }
  if (!response.ok) {
    const message = data.error_description || data.error?.message || data.error || `Google API lỗi ${response.status}`;
    throw createPublicError(502, String(message));
  }
  return data;
}

function buildMimeMessage({ from, to, subject, html }) {
  const recipients = normalizeEmailList(to);
  if (!normalizeEmail(from) || !recipients.length) throw createPublicError(400, "Địa chỉ gửi hoặc nhận email không hợp lệ.");
  const safeSubject = Buffer.from(String(subject || ""), "utf8").toString("base64");
  const lines = [
    `From: Squad 2 UAT <${from}>`,
    `To: ${recipients.join(", ")}`,
    `Subject: =?UTF-8?B?${safeSubject}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    String(html || "")
  ];
  return Buffer.from(lines.join("\r\n"), "utf8").toString("base64url");
}

function encryptValue(value, secret) {
  if (!secret) throw new Error("Thiếu khóa mã hóa.");
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return {
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    data: encrypted.toString("base64url")
  };
}

function decryptValue(payload, secret) {
  const key = crypto.createHash("sha256").update(secret).digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function signOAuthState(payload, secret) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", String(secret || "")).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyOAuthState(token, secret) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac("sha256", String(secret || "")).update(encoded).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload?.exp || Number(payload.exp) < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function dateKeyInTimeZone(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function normalizeDateKey(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value || "").trim();
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    const vi = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (vi) match = [vi[0], vi[3], String(vi[2]).padStart(2, "0"), String(vi[1]).padStart(2, "0")];
  }
  if (!match) return "";
  const key = `${match[1]}-${match[2]}-${match[3]}`;
  const date = new Date(`${key}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== key ? "" : key;
}

function dayDifference(fromDateKey, toDateKey) {
  const from = normalizeDateKey(fromDateKey);
  const to = normalizeDateKey(toDateKey);
  if (!from || !to) return NaN;
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

function shiftDateKey(dateKey, days) {
  const normalized = normalizeDateKey(dateKey);
  if (!normalized) return "";
  const date = new Date(`${normalized}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function isFridayDateKey(dateKey) {
  const normalized = normalizeDateKey(dateKey);
  return Boolean(normalized) && new Date(`${normalized}T12:00:00Z`).getUTCDay() === 5;
}

function nextDailyRunAt(now = new Date(), utcHour = 1) {
  const current = now instanceof Date ? new Date(now.getTime()) : new Date(now);
  if (Number.isNaN(current.getTime())) throw new Error("Invalid scheduler date.");
  const hour = Math.max(0, Math.min(23, Number(utcHour) || 0));
  const next = new Date(current.getTime());
  next.setUTCHours(hour, 0, 0, 0);
  if (next.getTime() <= current.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function formatViDate(dateKey) {
  const normalized = normalizeDateKey(dateKey);
  if (!normalized) return "-";
  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizeEmailList(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(/[;,\s]+/);
  return [...new Set(source.map(normalizeEmail).filter(Boolean))];
}

function hasGmailSendScope(value) {
  return String(value || "").split(/\s+/).includes(GMAIL_SEND_SCOPE);
}

function normalizeBaseUrl(value) {
  const text = String(value || "").trim().replace(/\/+$/, "");
  if (!text) return "";
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.toString().replace(/\/$/, "") : "";
  } catch {
    return "";
  }
}

function normalizeLookup(value) {
  return String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function isValidTimeZone(value) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: String(value || "") }).format();
    return Boolean(value);
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function collectOutcome(result, outcome) {
  if (outcome.status === "sent") result.sent += 1;
  if (outcome.status === "duplicate") result.duplicate += 1;
  if (outcome.status === "failed") {
    result.failed += 1;
    result.errors.push(outcome.error);
  }
}

function mapNotificationLog(row) {
  return {
    key: row.notification_key,
    kind: row.kind,
    recipient: row.recipient,
    scheduledDate: row.scheduled_date instanceof Date ? row.scheduled_date.toISOString().slice(0, 10) : String(row.scheduled_date || "").slice(0, 10),
    status: row.status,
    itemCount: Number(row.item_count || 0),
    attemptCount: Number(row.attempt_count || 0),
    error: row.error_message || "",
    sentAt: row.sent_at ? new Date(row.sent_at).toISOString() : "",
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : ""
  };
}

function createPublicError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function publicMessage(error) {
  return String(error?.message || error || "Không gửi được email.");
}

module.exports = {
  createDeadlineNotificationService,
  buildNotificationPlan,
  classifyDeadlineReminder,
  dateKeyInTimeZone,
  dayDifference,
  shiftDateKey,
  isFridayDateKey,
  nextDailyRunAt,
  normalizeDateKey,
  normalizeEmailList,
  hasGmailSendScope,
  buildAssigneeSubject,
  renderAssigneeDigest,
  renderManagerDigest,
  renderOperationalPreview,
  buildMimeMessage,
  encryptValue,
  decryptValue,
  signOAuthState,
  verifyOAuthState
};
