const crypto = require("crypto");

const SETTINGS_META_KEY = "deadline_email_settings";
const GMAIL_CONNECTION_META_KEY = "gmail_oauth_connection";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const GMAIL_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.send"
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
      connected: Boolean(connection?.refreshToken),
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
    await sendGmailMessage(connection, {
      to: [target],
      subject: "[Squad 2 UAT] Kiểm tra kết nối Gmail",
      html: renderTestEmail({ senderEmail: connection.accountEmail, settings })
    });
    return { recipient: target, sentAt: new Date().toISOString() };
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
          subject: `[Squad 2 UAT] Nhắc deadline công việc - ${formatViDate(todayKey)}`,
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
          itemCount: plan.managerDigest.items.length,
          subject: `[Squad 2 UAT] Tổng kết công việc quá hạn - ${formatViDate(todayKey)}`,
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
  const managerDigest = shouldBuildManagerDigest && managerEmails.length
    ? { recipients: managerEmails, items: overdueItems }
    : null;

  return {
    todayKey,
    assigneeDigests,
    managerDigest,
    managerOverdueTaskCount: overdueItems.length,
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
  if (remainingDays < 0 && remainingDays >= -3) {
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

function summarizePlan(plan, settings = {}) {
  return {
    todayKey: plan.todayKey,
    enabled: settings.enabled !== false,
    assigneeDigestCount: plan.assigneeDigests.length,
    assigneeTaskCount: plan.assigneeDigests.reduce((total, digest) => total + digest.items.length, 0),
    managerDigest: Boolean(plan.managerDigest),
    managerOverdueTaskCount: Number(plan.managerOverdueTaskCount || 0),
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

function renderAssigneeDigest(digest, settings, todayKey) {
  const overdueCount = digest.items.filter((item) => item.daysOverdue > 0).length;
  const intro = overdueCount
    ? `Bạn có ${overdueCount} công việc quá hạn và ${digest.items.length - overdueCount} công việc sắp đến hạn.`
    : `Bạn có ${digest.items.length} công việc sắp đến hạn.`;
  return renderEmailShell({
    eyebrow: "NHẮC DEADLINE CÔNG VIỆC",
    title: `Xin chào ${digest.assignee || "bạn"},`,
    intro,
    body: renderTaskTable(digest.items, { showAssignee: false }),
    actionUrl: settings.appBaseUrl ? `${settings.appBaseUrl}/#work/task-master` : "",
    actionLabel: "Mở danh sách công việc",
    footer: `Thông báo tự động ngày ${formatViDate(todayKey)}. Công việc hoàn thành sẽ dừng nhận nhắc.`
  });
}

function renderManagerDigest(digest, settings, todayKey) {
  const grouped = new Map();
  for (const item of digest.items) {
    const key = item.assignee || item.assigneeEmail || "Chưa phân công";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  const body = digest.items.length
    ? `${renderManagerSummary(grouped)}${renderTaskTable(digest.items, { showAssignee: true })}`
    : `<div style="padding:24px;border:1px solid #d8e4e7;background:#f4fbf9;color:#075f58;font-weight:700;text-align:center;">Tuần này không có công việc quá hạn.</div>`;
  return renderEmailShell({
    eyebrow: "TỔNG KẾT THỨ SÁU",
    title: "Báo cáo công việc quá hạn",
    intro: digest.items.length
      ? `Hiện có ${digest.items.length} công việc quá hạn từ một ngày trở lên, thuộc ${grouped.size} người phụ trách.`
      : "Không có thành viên nào có công việc quá hạn tại thời điểm tổng kết.",
    body,
    actionUrl: settings.appBaseUrl ? `${settings.appBaseUrl}/#work/task-master` : "",
    actionLabel: "Xem Task Master",
    footer: `Báo cáo tự động tuần, chốt ngày ${formatViDate(todayKey)}.`
  });
}

function renderManagerSummary(grouped) {
  const rows = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "vi"))
    .map(([name, items]) => `<tr><td style="padding:8px 10px;border-bottom:1px solid #e4eaee;">${escapeHtml(name)}</td><td style="padding:8px 10px;border-bottom:1px solid #e4eaee;text-align:right;font-weight:700;">${items.length}</td></tr>`)
    .join("");
  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 18px;"><thead><tr><th style="padding:9px 10px;background:#087f78;color:#fff;text-align:left;">Người phụ trách</th><th style="padding:9px 10px;background:#087f78;color:#fff;text-align:right;">Việc quá hạn</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderTaskTable(items, options = {}) {
  const assigneeHeader = options.showAssignee ? `<th style="padding:9px 8px;background:#087f78;color:#fff;text-align:left;">Phụ trách</th>` : "";
  const rows = items.map((item) => {
    const timing = item.daysOverdue > 0
      ? `<strong style="color:#c62828;">Quá hạn ${item.daysOverdue} ngày</strong>`
      : item.remainingDays === 0
        ? `<strong style="color:#b26a00;">Đến hạn hôm nay</strong>`
        : `<span style="color:#875700;">Còn ${item.remainingDays} ngày</span>`;
    return `<tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e4eaee;white-space:nowrap;font-weight:700;">${escapeHtml(item.taskId || "-")}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e4eaee;"><strong>${escapeHtml(item.title || "-")}</strong>${item.categoryName ? `<br><span style="color:#6c7785;font-size:12px;">${escapeHtml(item.categoryName)}</span>` : ""}</td>
      ${options.showAssignee ? `<td style="padding:10px 8px;border-bottom:1px solid #e4eaee;">${escapeHtml(item.assignee || item.assigneeEmail || "Chưa phân công")}</td>` : ""}
      <td style="padding:10px 8px;border-bottom:1px solid #e4eaee;white-space:nowrap;">${escapeHtml(formatViDate(item.dueDate))}<br>${timing}</td>
    </tr>`;
  }).join("");
  return `<div style="overflow-x:auto;"><table role="presentation" style="width:100%;border-collapse:collapse;min-width:620px;"><thead><tr><th style="padding:9px 8px;background:#087f78;color:#fff;text-align:left;">Task ID</th><th style="padding:9px 8px;background:#087f78;color:#fff;text-align:left;">Công việc</th>${assigneeHeader}<th style="padding:9px 8px;background:#087f78;color:#fff;text-align:left;">Deadline</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderEmailShell({ eyebrow, title, intro, body, actionUrl, actionLabel, footer }) {
  const action = actionUrl
    ? `<div style="margin:24px 0 8px;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:11px 18px;background:#007a73;color:#fff;text-decoration:none;font-weight:700;border-radius:6px;">${escapeHtml(actionLabel)}</a></div>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#eef3f5;font-family:Arial,sans-serif;color:#172033;"><div style="max-width:820px;margin:0 auto;padding:24px 12px;"><div style="background:#fff;border:1px solid #dce4e8;"><div style="padding:18px 24px;background:#006b64;color:#fff;"><div style="font-size:11px;font-weight:700;letter-spacing:.08em;">${escapeHtml(eyebrow)}</div><div style="margin-top:6px;font-size:24px;font-weight:700;">${escapeHtml(title)}</div></div><div style="padding:24px;"><p style="margin:0 0 18px;line-height:1.6;">${escapeHtml(intro)}</p>${body}${action}<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e5eaed;color:#667281;font-size:12px;line-height:1.5;">${escapeHtml(footer)}</p></div></div></div></body></html>`;
}

function renderTestEmail({ senderEmail, settings }) {
  return renderEmailShell({
    eyebrow: "KIỂM TRA KẾT NỐI",
    title: "Gmail đã sẵn sàng",
    intro: `Hệ thống đã gửi thành công từ ${senderEmail}.`,
    body: `<div style="padding:16px;background:#f1f8f7;border-left:4px solid #00867e;">Thông báo deadline đang ${settings.enabled ? "bật" : "tắt"}. Múi giờ: ${escapeHtml(settings.timeZone)}.</div>`,
    actionUrl: settings.appBaseUrl,
    actionLabel: "Mở Squad 2 UAT",
    footer: "Đây là thư kiểm tra, không phải cảnh báo deadline."
  });
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

function isFridayDateKey(dateKey) {
  const normalized = normalizeDateKey(dateKey);
  return Boolean(normalized) && new Date(`${normalized}T12:00:00Z`).getUTCDay() === 5;
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
  isFridayDateKey,
  normalizeDateKey,
  normalizeEmailList,
  buildMimeMessage,
  encryptValue,
  decryptValue,
  signOAuthState,
  verifyOAuthState
};
