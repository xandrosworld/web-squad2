const crypto = require("crypto");
const path = require("path");

require("dotenv").config();

const express = require("express");
const ExcelJS = require("exceljs");
const { Pool } = require("pg");

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDir = __dirname;
const databaseUrl = process.env.DATABASE_URL;
const authUser = process.env.APP_USER;
const authPassword = process.env.APP_PASSWORD;
const authEnabled = Boolean(authUser && authPassword);
const authMisconfigured = Boolean(authUser || authPassword) && !authEnabled;
const sessionCookieName = "squad2_session";
const sessionTtlMs = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 8);
const sessionSecret = process.env.SESSION_SECRET || crypto
  .createHash("sha256")
  .update(`${databaseUrl || "local"}:${authPassword || "squad2-session"}`)
  .digest("hex");
const maxAvatarFileSizeMb = Number(process.env.MAX_AVATAR_FILE_SIZE_MB || 6);
const maxAvatarDataLength = Number(process.env.MAX_AVATAR_DATA_LENGTH || Math.ceil(maxAvatarFileSizeMb * 1024 * 1024 * 4 / 3) + 512);
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || "10mb";
const defaultUsers = [
  { username: "yenuth@bidv.com.vn", email: "yenuth@bidv.com.vn", name: "yenuth", password: "123456" },
  { username: "thanhmt@bidv.com.vn", email: "thanhmt@bidv.com.vn", name: "thanhmt", password: "123456" },
  { username: "tuanpa13@bidv.com.vn", email: "tuanpa13@bidv.com.vn", name: "tuanpa13", password: "123456" },
  { username: "giangnc2@bidv.com.vn", email: "giangnc2@bidv.com.vn", name: "giangnc2", password: "123456" }
];
const adminIdentities = ["yenuth@bidv.com.vn", "thanhmt@bidv.com.vn"];

const collections = ["features", "plans", "matrix", "daily", "weekly", "readiness"];
const collectionSet = new Set(collections);
const functionGroups = [
  "Luồng xử lý",
  "Thông tin KH",
  "Phương án CTD",
  "Khoản CTD",
  "Biện pháp bảo đảm",
  "Luồng Hội đồng",
  "Văn bản tín dụng",
  "Ký số"
];
const featureStatusOptions = ["Done RSD", "Done DEV", "Done SIT", "Done UAT"];
const legacyFeatureStatusOptions = ["Chưa bắt đầu", "Đang kiểm thử", "Chờ fix", "Retest", "Hoàn thành", "Tạm hoãn"];
const ownerOptions = [
  "NV1 - Bùi Thị Mai Phương",
  "NV2 - Nguyễn Châu Giang",
  "NV3 - Phạm Anh Tuấn",
  "ALL",
  "BA"
];
const collectionRules = {
  features: {
    required: ["code", "name"],
    numbers: [],
    percents: [],
    enums: {
      group: functionGroups,
      priority: ["Critical", "Cao", "Trung bình", "Thấp"],
      status: [...featureStatusOptions, ...legacyFeatureStatusOptions],
      owner: ownerOptions
    }
  },
  plans: {
    required: ["sprint", "feature"],
    numbers: [],
    percents: [],
    enums: {}
  },
  matrix: {
    required: ["group"],
    numbers: [],
    percents: [],
    enums: { group: functionGroups }
  },
  daily: {
    required: ["date", "feature"],
    numbers: ["totalCases", "executedCases", "criticalBugs", "highBugs"],
    percents: [],
    enums: {}
  },
  weekly: {
    required: ["week", "group"],
    numbers: ["totalCases", "executedCases", "criticalBugs", "reopenedBugs"],
    percents: ["coverageRate", "successRate"],
    enums: {
      group: functionGroups,
      assessment: ["Tốt", "Cần theo dõi", "Rủi ro", "Blocker"]
    }
  },
  readiness: {
    required: ["sprint"],
    numbers: ["openCriticalBugs"],
    percents: ["coverageRate", "successRate", "readinessLevel", "trainingReadiness", "pilotReadiness"],
    enums: {
      decision: ["Chưa quyết định", "Sẵn sàng", "Có điều kiện", "Chưa sẵn sàng"]
    }
  }
};
const excelSheets = [
  {
    collection: "features",
    name: "01_DanhMuc_UAT",
    freezeColumns: 7,
    sectionKey: "sectionTitle",
    sectionColumnKey: "name",
    columns: [
      ["stt", "STT", 8, "number"],
      ["code", "Mã chức năng", 18],
      ["storyCode", "Mã Story", 18],
      ["jiraCode", "Mã Jira", 20],
      ["jiraName", "Tên Jira", 34],
      ["name", "Tên chức năng", 34],
      ["sprint", "Sprint", 14],
      ["status", "Trạng thái", 16],
      ["owner", "Nghiệp vụ", 28],
      ["uatStatus", "Trạng thái UAT", 18],
      ["uatHandoff", "Bàn giao UAT", 18, "date"],
      ["uatDone", "Hoàn thành UAT", 18, "date"]
    ]
  },
  {
    collection: "plans",
    name: "02_PhanCong_Sprint",
    columns: [
      ["sprint", "Sprint", 14],
      ["feature", "Chức năng", 34],
      ["owner", "Chủ quản", 20],
      ["t1", "T1", 14, "date"],
      ["t2", "T2", 14, "date"],
      ["t3", "T3", 14, "date"],
      ["t4", "T4", 14, "date"],
      ["t5", "T5", 14, "date"],
      ["t6", "T6", 14, "date"],
      ["note", "Ghi chú", 36]
    ]
  },
  {
    collection: "matrix",
    name: "03_MaTran_NangLuc",
    columns: [
      ["group", "Nhóm chức năng", 28],
      ["t1", "T1", 20],
      ["t2", "T2", 20],
      ["t3", "T3", 20],
      ["t4", "T4", 20],
      ["t5", "T5", 20],
      ["t6", "T6", 20]
    ]
  },
  {
    collection: "daily",
    name: "04_DieuHanh_HangNgay",
    columns: [
      ["date", "Ngày", 14, "date"],
      ["feature", "Chức năng", 34],
      ["owner", "Chủ quản", 20],
      ["tester", "Tester", 20],
      ["totalCases", "Tổng testcase", 16, "number"],
      ["executedCases", "Đã thực hiện", 16, "number"],
      ["progress", "% hoàn thành", 16, "number"],
      ["criticalBugs", "Lỗi nghiêm trọng", 18, "number"],
      ["highBugs", "Lỗi mức cao", 16, "number"],
      ["blocker", "Vướng mắc", 36]
    ]
  },
  {
    collection: "weekly",
    name: "05_ChatLuong_Tuan",
    columns: [
      ["week", "Tuần", 14],
      ["group", "Nhóm chức năng", 28],
      ["totalCases", "Tổng testcase", 16, "number"],
      ["executedCases", "Đã thực hiện", 16, "number"],
      ["coverageRate", "Tỷ lệ bao phủ", 18, "number"],
      ["successRate", "Tỷ lệ thành công", 20, "number"],
      ["criticalBugs", "Lỗi nghiêm trọng", 18, "number"],
      ["reopenedBugs", "Lỗi mở lại", 16, "number"],
      ["assessment", "Đánh giá", 18]
    ]
  },
  {
    collection: "readiness",
    name: "06_KetThuc_Sprint",
    columns: [
      ["sprint", "Sprint", 14],
      ["coverageRate", "Tỷ lệ bao phủ", 18, "number"],
      ["successRate", "Tỷ lệ thành công", 20, "number"],
      ["openCriticalBugs", "Lỗi nghiêm trọng tồn đọng", 24, "number"],
      ["readinessLevel", "Mức độ sẵn sàng", 22, "number"],
      ["decision", "Quyết định", 20]
    ]
  }
];

let pool;
let schemaPromise;

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: requestBodyLimit }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

app.get("/api/health", async (req, res) => {
  const baseHealth = {
    ok: true,
    service: "squad2-uat-command-center",
    timestamp: new Date().toISOString()
  };
  try {
    await ensureSchema();
    await getPool().query("select 1");
    res.json({
      ...baseHealth,
      db: "online",
      ready: true
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.json({
      ...baseHealth,
      db: "offline",
      error: publicError(error),
      ready: false
    });
  }
});

app.get("/api/auth/me", asyncHandler(async (req, res) => {
  await ensureSchema();
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, user });
}));

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  await ensureSchema();
  const identifier = String(req.body.identifier || req.body.email || req.body.username || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!identifier || !password) {
    throw httpError(400, "Vui lòng nhập tài khoản và mật khẩu.");
  }

  const result = await getPool().query(`
    select id, username, email, name, role, password_hash, active, avatar_data
    from app_users
    where lower(username) = $1 or lower(coalesce(email, '')) = $1
    limit 1
  `, [identifier]);
  const user = result.rows[0];
  if (!user || !user.active || !(await verifyPassword(password, user.password_hash))) {
    throw httpError(401, "Tài khoản hoặc mật khẩu không đúng.");
  }

  const publicUser = toPublicUser(user);
  setSessionCookie(req, res, signSession(publicUser));
  res.json({ authenticated: true, user: publicUser });
}));

app.post("/api/auth/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.use("/api", requireApiAuth);

app.patch("/api/auth/profile", asyncHandler(async (req, res) => {
  await ensureSchema();
  const name = normalizeDisplayName(req.body.name, req.user.name || req.user.username);
  const avatarData = Object.prototype.hasOwnProperty.call(req.body, "avatarData")
    ? normalizeAvatarData(req.body.avatarData)
    : req.user.avatarData || "";
  const result = await getPool().query(`
    update app_users
    set name = $1,
        avatar_data = $2,
        updated_at = now()
    where id = $3 and active = true
    returning id, username, email, name, role, active, avatar_data, created_at, updated_at
  `, [name, avatarData || null, req.user.id]);

  if (!result.rows[0]) throw httpError(404, "Không tìm thấy tài khoản.");
  const user = toPublicUser(result.rows[0]);
  setSessionCookie(req, res, signSession(user));
  res.json({ user });
}));

app.post("/api/auth/change-password", asyncHandler(async (req, res) => {
  await ensureSchema();
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  validatePassword(newPassword);
  if (!currentPassword) throw httpError(400, "Vui lòng nhập mật khẩu hiện tại.");

  const result = await getPool().query(`
    select id, password_hash
    from app_users
    where id = $1 and active = true
    limit 1
  `, [req.user.id]);
  const user = result.rows[0];
  if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
    throw httpError(401, "Mật khẩu hiện tại không đúng.");
  }

  const passwordHash = await hashPassword(newPassword);
  await getPool().query(`
    update app_users
    set password_hash = $1,
        password_changed_at = now(),
        updated_at = now()
    where id = $2
  `, [passwordHash, req.user.id]);
  res.json({ ok: true });
}));

app.get("/api/auth/users", requireAdmin, asyncHandler(async (req, res) => {
  await ensureSchema();
  const result = await getPool().query(`
    select id, username, email, name, role, active, avatar_data, created_at, updated_at
    from app_users
    order by created_at asc
  `);
  res.json({ users: result.rows.map(toPublicUser) });
}));

app.post("/api/auth/users", requireAdmin, asyncHandler(async (req, res) => {
  await ensureSchema();
  const username = String(req.body.username || "").trim().toLowerCase();
  const email = String(req.body.email || "").trim().toLowerCase() || null;
  const name = String(req.body.name || username || email || "").trim();
  const role = roleForIdentity(username, email);
  const password = String(req.body.password || "");
  validateNewUser({ username, email, name, password });
  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();
  const result = await getPool().query(`
    insert into app_users (id, username, email, name, role, password_hash, active)
    values ($1, $2, $3, $4, $5, $6, true)
    returning id, username, email, name, role, active, avatar_data, created_at, updated_at
  `, [id, username, email, name, role, passwordHash]);
  res.status(201).json({ user: toPublicUser(result.rows[0]) });
}));

app.get("/api/state", asyncHandler(async (req, res) => {
  await ensureSchema();
  const state = await readState(getPool(), req.user);
  res.json({ state });
}));

app.get("/api/export/excel", asyncHandler(async (req, res) => {
  await ensureSchema();
  const state = await readState(getPool());
  const workbook = buildExcelWorkbook(state);
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `squad2-uat-${new Date().toISOString().slice(0, 10)}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");
  res.send(Buffer.from(buffer));
}));

app.post("/api/import/excel", requireAdmin, express.raw({
  type: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream"
  ],
  limit: requestBodyLimit
}), asyncHandler(async (req, res) => {
  await ensureSchema();
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw httpError(400, "File Excel không hợp lệ.");
  }

  const records = await parseFeatureImportWorkbook(req.body);
  if (!records.length) {
    throw httpError(400, "Không tìm thấy dòng danh mục UAT hợp lệ trong file Excel.");
  }
  records.forEach((record) => validateRecordForCollection("features", record));

  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("delete from uat_records where collection = $1", ["features"]);
    for (const record of records) {
      await createRecord(client, "features", record, req.user);
    }
    await touchMeta(client);
    const state = await readState(client, req.user);
    await client.query("commit");
    res.json({ state, imported: records.length });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}));

app.get("/api/chat/group", asyncHandler(async (req, res) => {
  await ensureSchema();
  const limit = Math.max(10, Math.min(100, Number(req.query.limit || 50)));
  const result = await getPool().query(`
    select messages.id,
           messages.body,
           messages.created_at,
           users.id as user_id,
           users.name as user_name,
           users.email as user_email,
           users.username as username,
           users.avatar_data as user_avatar_data
    from group_chat_messages messages
    left join app_users users on users.id = messages.created_by
    order by messages.created_at desc
    limit $1
  `, [limit]);
  res.json({ messages: result.rows.reverse().map(toGroupChatMessage) });
}));

app.post("/api/chat/group", asyncHandler(async (req, res) => {
  await ensureSchema();
  const body = normalizeChatMessage(req.body.message || req.body.body);
  const id = crypto.randomUUID();
  const result = await getPool().query(`
    with inserted as (
      insert into group_chat_messages (id, body, created_by)
      values ($1, $2, $3)
      returning id, body, created_by, created_at
    )
    select inserted.id,
           inserted.body,
           inserted.created_at,
           users.id as user_id,
           users.name as user_name,
           users.email as user_email,
           users.username as username,
           users.avatar_data as user_avatar_data
    from inserted
    left join app_users users on users.id = inserted.created_by
  `, [id, body, req.user.id]);
  res.status(201).json({ message: toGroupChatMessage(result.rows[0]) });
}));

app.put("/api/state", requireAdmin, asyncHandler(async (req, res) => {
  const state = normalizeState(req.body.state || req.body);
  for (const collection of collections) {
    state[collection].forEach((record) => validateRecordForCollection(collection, record));
  }
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("delete from uat_records");
    for (const collection of collections) {
      for (const inputRecord of state[collection]) {
        const record = normalizeRecord(inputRecord);
        await createRecord(client, collection, record, req.user);
      }
    }
    await touchMeta(client);
    const nextState = await readState(client, req.user);
    await client.query("commit");
    res.json({ state: nextState });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}));

app.post("/api/records/:collection", asyncHandler(async (req, res) => {
  const collection = requireCollection(req.params.collection);
  const record = normalizeRecord(req.body.record || req.body);
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await applyRecordDefaults(client, collection, record);
    validateRecordForCollection(collection, record);
    const saved = await createRecord(client, collection, record, req.user);
    const updatedAt = await touchMeta(client);
    await client.query("commit");
    res.status(201).json({ record: decorateRecord(saved, req.user), updatedAt });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}));

app.put("/api/records/:collection/:id", asyncHandler(async (req, res) => {
  const collection = requireCollection(req.params.collection);
  const record = normalizeRecord({ ...(req.body.record || req.body), id: req.params.id }, req.params.id);
  validateRecordForCollection(collection, record);
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const current = await getRecordForUpdate(client, collection, req.params.id);
    assertCanModifyRecord(req.user, current);
    record.createdAt = current.data?.createdAt || current.created_at?.toISOString?.() || record.createdAt;
    record.updatedAt = new Date().toISOString();
    const saved = await updateRecord(client, collection, record, req.user.id, current);
    const updatedAt = await touchMeta(client);
    await client.query("commit");
    res.json({ record: decorateRecord(saved, req.user), updatedAt });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}));

app.delete("/api/records/:collection/:id", asyncHandler(async (req, res) => {
  const collection = requireCollection(req.params.collection);
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const current = await getRecordForUpdate(client, collection, req.params.id);
    assertCanModifyRecord(req.user, current);
    await client.query("delete from uat_records where collection = $1 and id = $2", [collection, req.params.id]);
    const updatedAt = await touchMeta(client);
    await client.query("commit");
    res.json({ ok: true, updatedAt });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}));

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint không tồn tại.", status: 404 });
});

app.use("/assets", express.static(path.join(publicDir, "assets")));
app.get(["/", "/index.html"], (req, res) => {
  setNoStore(res);
  res.sendFile(path.join(publicDir, "index.html"));
});
app.get("/app.js", (req, res) => {
  setNoStore(res);
  res.sendFile(path.join(publicDir, "app.js"));
});
app.get("/styles.css", (req, res) => {
  setNoStore(res);
  res.sendFile(path.join(publicDir, "styles.css"));
});
app.get(/^\/.*\.[^/]+$/, (req, res) => {
  res.status(404).send("Not found");
});
app.get("*", (req, res) => {
  setNoStore(res);
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = Number(error.status || 500);
  if (status >= 500) {
    console.error(`${req.method} ${req.originalUrl} failed:`, error);
  }
  res.status(status).json({
    error: publicError(error),
    status
  });
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Squad2 UAT Dashboard listening on port ${port}`);
  if (!databaseUrl) {
    console.warn("DATABASE_URL is not configured. API writes will fail until it is set.");
  }
  if (authMisconfigured) {
    console.warn("APP_USER and APP_PASSWORD must be configured together to enable basic auth.");
  }
});

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

function getPool() {
  if (!databaseUrl) {
    throw httpError(503, "DATABASE_URL chưa được cấu hình.");
  }
  if (!pool) {
    const useSsl = process.env.PGSSLMODE === "require" || /sslmode=require/i.test(databaseUrl);
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.PG_POOL_MAX || 10),
      idleTimeoutMillis: 30000
    });
  }
  return pool;
}

function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await getPool().query(`
      create table if not exists uat_records (
        collection text not null,
        id text not null,
        data jsonb not null,
        created_by text,
        updated_by text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        primary key (collection, id)
      );

      create index if not exists idx_uat_records_collection_updated
        on uat_records (collection, updated_at desc);

      create table if not exists app_meta (
        key text primary key,
        value jsonb not null,
        updated_at timestamptz not null default now()
      );

      create table if not exists app_users (
        id text primary key,
        username text not null unique,
        email text unique,
        name text not null,
        role text not null default 'user',
        password_hash text not null,
        avatar_data text,
        password_changed_at timestamptz,
        active boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      alter table app_users
        add column if not exists avatar_data text;

      alter table app_users
        add column if not exists password_changed_at timestamptz;

      alter table uat_records
        add column if not exists created_by text;

      alter table uat_records
        add column if not exists updated_by text;

      create index if not exists idx_uat_records_created_by
        on uat_records (created_by);

      create table if not exists group_chat_messages (
        id text primary key,
        body text not null,
        created_by text,
        created_at timestamptz not null default now()
      );

      create index if not exists idx_group_chat_messages_created
        on group_chat_messages (created_at desc);
    `);
      await ensureSeedAdmin();
      await ensureDefaultUsers();
      await ensureExclusiveAdminRoles();
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function parseFeatureImportWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = findFeatureImportWorksheet(workbook);
  const header = worksheet ? findFeatureImportHeader(worksheet) : null;
  if (!worksheet || !header) {
    throw httpError(400, "Không tìm thấy header danh mục UAT trong file Excel.");
  }

  const records = [];
  let currentSection = "";
  for (let rowNumber = header.rowNumber + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values = readFeatureImportRow(row, header.map);
    if (isFeatureImportHeaderLike(values)) continue;
    if (isFeatureSectionRow(values)) {
      currentSection = normalizeImportedText(values.name);
      continue;
    }
    if (isBlank(values.code)) continue;

    const record = {
      id: crypto.randomUUID(),
      stt: normalizeImportedNumber(values.stt) || records.length + 1,
      code: normalizeImportedText(values.code),
      storyCode: normalizeImportedText(values.storyCode),
      jiraCode: normalizeImportedText(values.jiraCode),
      jiraName: normalizeImportedText(values.jiraName),
      name: normalizeImportedText(values.name || values.jiraName),
      sprint: normalizeImportedText(values.sprint),
      status: normalizeImportedFeatureStatus(values.status),
      owner: normalizeImportedOwner(values.owner),
      uatStatus: normalizeImportedText(values.uatStatus),
      uatHandoff: normalizeImportedDate(values.uatHandoff),
      uatDone: normalizeImportedDate(values.uatDone),
      sectionTitle: currentSection
    };
    records.push(record);
  }
  return records;
}

function findFeatureImportWorksheet(workbook) {
  const named = workbook.getWorksheet("01_DanhMuc_UAT");
  if (named && findFeatureImportHeader(named)) return named;
  return workbook.worksheets.find((worksheet) => findFeatureImportHeader(worksheet)) || null;
}

function findFeatureImportHeader(worksheet) {
  const maxRows = Math.min(worksheet.rowCount, 80);
  for (let rowNumber = 1; rowNumber <= maxRows; rowNumber += 1) {
    const map = buildFeatureImportHeaderMap(worksheet.getRow(rowNumber));
    if (map.code && map.name && (map.storyCode || map.jiraCode || map.sprint || map.status)) {
      return { rowNumber, map };
    }
  }
  return null;
}

const featureImportHeaderAliases = {
  stt: ["stt", "so thu tu"],
  code: ["ma chuc nang"],
  storyCode: ["ma story"],
  jiraCode: ["ma jira"],
  jiraName: ["ten jira"],
  name: ["ten chuc nang"],
  sprint: ["sprint"],
  status: ["trang thai"],
  owner: ["nghiep vu", "chu quan", "chu quan nv"],
  uatStatus: ["trang thai uat"],
  uatHandoff: ["ban giao uat", "ngay ban giao uat"],
  uatDone: ["hoan thanh uat"]
};

function buildFeatureImportHeaderMap(row) {
  const map = {};
  for (let column = 1; column <= row.cellCount; column += 1) {
    const label = normalizeImportHeader(row.getCell(column).value);
    if (!label) continue;
    for (const [key, aliases] of Object.entries(featureImportHeaderAliases)) {
      if (!map[key] && aliases.includes(label)) {
        map[key] = column;
      }
    }
  }
  return map;
}

function readFeatureImportRow(row, map) {
  const values = {};
  for (const key of Object.keys(featureImportHeaderAliases)) {
    values[key] = map[key] ? unwrapExcelCellValue(row.getCell(map[key]).value) : "";
  }
  return values;
}

function isFeatureImportHeaderLike(values) {
  return normalizeImportHeader(values.code) === "ma chuc nang"
    || normalizeImportHeader(values.name) === "ten chuc nang";
}

function isFeatureSectionRow(values) {
  return isBlank(values.code)
    && isBlank(values.storyCode)
    && isBlank(values.jiraCode)
    && !isBlank(values.name);
}

function normalizeImportHeader(value) {
  return normalizeImportedText(unwrapExcelCellValue(value))
    .toLocaleLowerCase("vi")
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unwrapExcelCellValue(value) {
  if (value == null) return "";
  if (value instanceof Date) return value;
  if (typeof value !== "object") return value;
  if (Object.prototype.hasOwnProperty.call(value, "result")) return unwrapExcelCellValue(value.result);
  if (typeof value.text === "string") return value.text;
  if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("");
  return "";
}

function normalizeImportedText(value) {
  if (value == null) return "";
  if (value instanceof Date) return formatDateForInput(value);
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeImportedNumber(value) {
  if (isBlank(value)) return "";
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : normalizeImportedText(value);
}

function normalizeImportedFeatureStatus(value) {
  const text = normalizeImportedText(value);
  if (!text) return "";
  const normalized = normalizeImportHeader(text);
  const match = [...featureStatusOptions, ...legacyFeatureStatusOptions]
    .find((option) => normalizeImportHeader(option) === normalized);
  return match || text;
}

function normalizeImportedOwner(value) {
  const text = normalizeImportedText(value);
  if (!text) return "";
  if (text.toLocaleLowerCase("vi") === "all") return "ALL";
  if (text.toLocaleLowerCase("vi") === "ba") return "BA";
  return text;
}

function normalizeImportedDate(value) {
  if (isBlank(value)) return "";
  if (value instanceof Date) return formatDateForInput(value);
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return formatDateForInput(new Date(excelEpoch + value * 24 * 60 * 60 * 1000));
  }
  const text = normalizeImportedText(value);
  if (!text) return "";
  const slashDate = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (slashDate) {
    const day = Number(slashDate[1]);
    const month = Number(slashDate[2]);
    const year = Number(slashDate[3].length === 2 ? `20${slashDate[3]}` : slashDate[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(parsed.getTime())) return formatDateForInput(parsed);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : formatDateForInput(parsed);
}

function formatDateForInput(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function buildExcelWorkbook(state) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Squad 2 UAT Dashboard";
  workbook.created = new Date();
  workbook.modified = new Date();

  for (const sheetConfig of excelSheets) {
    const worksheet = workbook.addWorksheet(sheetConfig.name, {
      views: [{ state: "frozen", ySplit: 1, xSplit: sheetConfig.freezeColumns || 0 }]
    });
    worksheet.columns = sheetConfig.columns.map(([key, header, width]) => ({ key, header, width }));
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheetConfig.columns.length }
    };
    worksheet.getRow(1).height = 24;
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF006B68" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FF004D4A" } }
      };
    });

    let currentSection = "";
    for (const record of state[sheetConfig.collection] || []) {
      const section = sheetConfig.sectionKey ? String(record[sheetConfig.sectionKey] || "").trim() : "";
      if (section && section !== currentSection) {
        addExcelSectionRow(worksheet, sheetConfig, section);
        currentSection = section;
      }
      const rowData = {};
      for (const [key, , , type] of sheetConfig.columns) {
        rowData[key] = excelCellValue(excelRecordValue(record, key), type);
      }
      const row = worksheet.addRow(rowData);
      row.alignment = { vertical: "top", wrapText: true };
      for (const [key, , , type] of sheetConfig.columns) {
        if (type === "date") row.getCell(key).numFmt = "dd/mm/yyyy";
        if (type === "number") row.getCell(key).numFmt = "0.##";
      }
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (rowNumber % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F8F7" } };
        });
      }
    });
  }
  addDashboardWorksheet(workbook, state);
  return workbook;
}

function addExcelSectionRow(worksheet, sheetConfig, section) {
  const rowData = {};
  const sectionKey = sheetConfig.sectionColumnKey || sheetConfig.columns[0][0];
  for (const [key] of sheetConfig.columns) {
    rowData[key] = key === sectionKey ? section : "";
  }
  const row = worksheet.addRow(rowData);
  row.height = 20;
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF12BDB8" } };
    cell.alignment = { vertical: "middle", wrapText: false };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF0EA5A0" } }
    };
  });
}

function addDashboardWorksheet(workbook, state) {
  const worksheet = workbook.addWorksheet("07_Dashboard");
  const metrics = calculateWorkbookMetrics(state);
  const rows = [
    ["Tiến độ UAT toàn Squad", `${metrics.squadProgress}%`, "Sheet 01_DanhMuc_UAT"],
    ["Tỷ lệ bao phủ kiểm thử", `${metrics.coverage}%`, "Sheet 04-06"],
    ["Tỷ lệ thành công", `${metrics.successRate}%`, "Sheet 05-06"],
    ["Lỗi nghiêm trọng tồn đọng", metrics.criticalBugs, "Sheet 04-06"],
    ["Mức độ sẵn sàng đào tạo", `${metrics.trainingReadiness}%`, "Sheet 06_KetThuc_Sprint"],
    ["Mức độ sẵn sàng Pilot/Go-live", `${metrics.pilotReadiness}%`, "Sheet 06_KetThuc_Sprint"]
  ];

  worksheet.columns = [
    { key: "metric", width: 34 },
    { key: "value", width: 18 },
    { key: "source", width: 28 }
  ];
  worksheet.mergeCells("A1:C1");
  worksheet.getCell("A1").value = "BẢNG ĐIỀU HÀNH TỔNG HỢP SQUAD 2";
  worksheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF111827" } };
  worksheet.getCell("A1").alignment = { vertical: "middle" };
  worksheet.getRow(1).height = 26;

  worksheet.getRow(2).values = ["Chỉ số", "Giá trị", "Nguồn"];
  worksheet.getRow(2).height = 22;
  worksheet.getRow(2).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF006B68" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });

  rows.forEach(([metric, value, source]) => {
    const row = worksheet.addRow({ metric, value, source });
    row.alignment = { vertical: "middle", wrapText: true };
  });

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } }
      };
      if (rowNumber > 2 && rowNumber % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F8F7" } };
      }
    });
  });
}

function excelRecordValue(record, key) {
  if (key === "progress") return percent(record.executedCases, record.totalCases);
  if (key === "uatHandoff") return record.uatHandoff || record.handoffDate;
  return record[key];
}

function excelCellValue(value, type) {
  if (value == null || value === "") return "";
  if (type === "number") {
    const number = Number(value);
    return Number.isFinite(number) ? number : String(value);
  }
  if (type === "date") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date;
  }
  return String(value);
}

function calculateWorkbookMetrics(state) {
  const features = Array.isArray(state.features) ? state.features : [];
  const daily = Array.isArray(state.daily) ? state.daily : [];
  const weekly = Array.isArray(state.weekly) ? state.weekly : [];
  const readiness = Array.isArray(state.readiness) ? state.readiness : [];
  const completedFeatures = features.filter((row) => isCompletedFeatureStatus(row.status)).length;
  const statusDrivenProgress = features.length ? percent(completedFeatures, features.length) : 0;
  const dailyTotal = sumBy(daily, "totalCases");
  const dailyDone = sumBy(daily, "executedCases");
  const weeklyCoverage = average(weekly.map((row) => resolveRate(row.coverageRate, row.executedCases, row.totalCases)));
  const readinessCoverage = average(readiness.map((row) => row.coverageRate));
  const coverage = dailyTotal ? percent(dailyDone, dailyTotal) : round(weeklyCoverage || readinessCoverage || 0);
  const successRate = round(average([
    ...weekly.map((row) => row.successRate),
    ...readiness.map((row) => row.successRate)
  ]) || 0);
  const latestReadiness = getLatestRecord(readiness);
  const readinessCritical = sumBy(readiness, "openCriticalBugs");
  const dailyCritical = sumBy(daily, "criticalBugs");
  const readinessFallback = round(latestReadiness?.readinessLevel || average([coverage, successRate]));

  return {
    squadProgress: statusDrivenProgress || coverage,
    coverage,
    successRate,
    criticalBugs: readinessCritical || dailyCritical,
    trainingReadiness: round(latestReadiness?.trainingReadiness || readinessFallback || 0),
    pilotReadiness: round(latestReadiness?.pilotReadiness || readinessFallback || 0)
  };
}

function isCompletedFeatureStatus(status) {
  return status === "Done UAT" || status === "Hoàn thành";
}

function sumBy(rows, key) {
  return rows.reduce((total, row) => total + Number(row?.[key] || 0), 0);
}

function average(values) {
  const numeric = values.map(Number).filter((value) => Number.isFinite(value) && value > 0);
  if (!numeric.length) return 0;
  return numeric.reduce((total, value) => total + value, 0) / numeric.length;
}

function percent(done, total) {
  const totalNumber = Number(total || 0);
  if (!totalNumber) return 0;
  return round((Number(done || 0) / totalNumber) * 100);
}

function resolveRate(value, done, total) {
  if (value !== undefined && value !== null && value !== "") return Number(value) || 0;
  return percent(done, total);
}

function round(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number);
}

function getLatestRecord(rows) {
  return [...rows].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0] || null;
}

async function readState(db, viewer = null) {
  const state = emptyState();
  const [recordResult, metaResult] = await Promise.all([
    db.query(`
      select records.collection,
             records.data,
             records.created_by,
             records.updated_by,
             records.created_at,
             records.updated_at,
             creator.name as creator_name,
             creator.email as creator_email,
             creator.username as creator_username
      from uat_records records
      left join app_users creator on creator.id = records.created_by
      order by records.collection asc, records.updated_at desc
    `),
    db.query("select value from app_meta where key = 'state'")
  ]);

  for (const row of recordResult.rows) {
    if (collectionSet.has(row.collection)) {
      state[row.collection].push(viewer ? decorateRecord(row, viewer) : row.data);
    }
  }

  const metaUpdatedAt = metaResult.rows[0]?.value?.updatedAt;
  state.updatedAt = typeof metaUpdatedAt === "string" ? metaUpdatedAt : latestUpdatedAt(recordResult.rows);
  return state;
}

async function createRecord(client, collection, record, actor) {
  const now = new Date();
  record.createdAt = now.toISOString();
  record.updatedAt = now.toISOString();
  const result = await client.query(`
    insert into uat_records (collection, id, data, created_by, updated_by, created_at, updated_at)
    values ($1, $2, $3::jsonb, $4, $4, $5, $5)
    on conflict (collection, id) do nothing
    returning data, created_by, updated_by, created_at, updated_at
  `, [collection, record.id, JSON.stringify(record), actor.id, now]);
  if (!result.rows[0]) throw httpError(409, "Bản ghi đã tồn tại.");
  return {
    ...result.rows[0],
    creator_name: actor.name,
    creator_email: actor.email,
    creator_username: actor.username
  };
}

async function updateRecord(client, collection, record, actorId, current) {
  const updatedAt = toDate(record.updatedAt);
  const result = await client.query(`
    update uat_records
    set data = $1::jsonb,
        updated_by = $2,
        updated_at = $3
    where collection = $4 and id = $5
    returning data, created_by, updated_by, created_at, updated_at
  `, [JSON.stringify(record), actorId, updatedAt, collection, record.id]);
  if (!result.rows[0]) throw httpError(404, "Không tìm thấy bản ghi.");
  return {
    ...result.rows[0],
    creator_name: current.creator_name,
    creator_email: current.creator_email,
    creator_username: current.creator_username
  };
}

async function getRecordForUpdate(client, collection, id) {
  const result = await client.query(`
    select records.data,
           records.created_by,
           records.updated_by,
           records.created_at,
           records.updated_at,
           creator.name as creator_name,
           creator.email as creator_email,
           creator.username as creator_username
    from uat_records records
    left join app_users creator on creator.id = records.created_by
    where records.collection = $1 and records.id = $2
    for update of records
  `, [collection, id]);
  if (!result.rows[0]) throw httpError(404, "Không tìm thấy bản ghi.");
  return result.rows[0];
}

function assertCanModifyRecord(user, record) {
  if (user?.role === "admin" || (record.created_by && record.created_by === user?.id)) return;
  throw httpError(403, "Bạn chỉ có thể sửa hoặc xóa bản ghi do chính mình tạo.");
}

function decorateRecord(row, viewer) {
  const isOwner = Boolean(row.created_by && row.created_by === viewer?.id);
  const canEdit = Boolean(viewer && (viewer.role === "admin" || isOwner));
  return {
    ...(row.data || {}),
    _ownership: {
      createdByName: row.creator_name || row.creator_username || "Không xác định",
      createdByEmail: row.creator_email || "",
      isOwner,
      canEdit,
      canDelete: canEdit
    }
  };
}

async function touchMeta(client) {
  const updatedAt = new Date().toISOString();
  await client.query(`
    insert into app_meta (key, value, updated_at)
    values ('state', $1::jsonb, now())
    on conflict (key) do update
      set value = excluded.value,
          updated_at = excluded.updated_at
  `, [JSON.stringify({ updatedAt })]);
  return updatedAt;
}

function emptyState() {
  return {
    features: [],
    plans: [],
    matrix: [],
    daily: [],
    weekly: [],
    readiness: [],
    updatedAt: null
  };
}

function normalizeState(input) {
  const state = emptyState();
  const source = input && typeof input === "object" ? input : {};
  for (const collection of collections) {
    state[collection] = Array.isArray(source[collection])
      ? source[collection].map((record) => normalizeRecord(record))
      : [];
  }
  state.updatedAt = typeof source.updatedAt === "string" ? source.updatedAt : new Date().toISOString();
  return state;
}

function normalizeRecord(input, forcedId) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw httpError(400, "Record không hợp lệ.");
  }
  const { _ownership, ...recordData } = input;
  const now = new Date().toISOString();
  const id = forcedId || recordData.id || crypto.randomUUID();
  return {
    ...recordData,
    id: String(id),
    createdAt: isValidDateString(recordData.createdAt) ? recordData.createdAt : now,
    updatedAt: isValidDateString(recordData.updatedAt) ? recordData.updatedAt : now
  };
}

async function applyRecordDefaults(client, collection, record) {
  if (collection === "features" && isBlank(record.stt)) {
    record.stt = await getNextFeatureStt(client);
  }
}

async function getNextFeatureStt(client) {
  const result = await client.query(`
    select coalesce(max((data->>'stt')::integer), 0) as max_stt
    from uat_records
    where collection = $1
      and (data->>'stt') ~ '^[0-9]+$'
  `, ["features"]);
  return Number(result.rows[0]?.max_stt || 0) + 1;
}

function requireCollection(collection) {
  if (!collectionSet.has(collection)) {
    throw httpError(404, "Phân hệ dữ liệu không hợp lệ.");
  }
  return collection;
}

function validateRecordForCollection(collection, record) {
  const rules = collectionRules[collection];
  if (!rules) throw httpError(404, "Phân hệ dữ liệu không hợp lệ.");

  for (const field of rules.required) {
    if (isBlank(record[field])) {
      throw httpError(400, `${field} là trường bắt buộc.`);
    }
  }

  for (const field of rules.numbers) {
    if (isBlank(record[field])) continue;
    const value = Number(record[field]);
    if (!Number.isFinite(value) || value < 0) {
      throw httpError(400, `${field} phải là số không âm.`);
    }
  }

  for (const field of rules.percents) {
    if (isBlank(record[field])) continue;
    const value = Number(record[field]);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw httpError(400, `${field} phải nằm trong khoảng 0-100%.`);
    }
  }

  for (const [field, allowedValues] of Object.entries(rules.enums || {})) {
    if (isBlank(record[field])) continue;
    if (!allowedValues.includes(record[field])) {
      throw httpError(400, `${field} không nằm trong danh mục hợp lệ.`);
    }
  }

  if (!isBlank(record.totalCases) && !isBlank(record.executedCases)) {
    const totalCases = Number(record.totalCases);
    const executedCases = Number(record.executedCases);
    if (Number.isFinite(totalCases) && Number.isFinite(executedCases) && executedCases > totalCases) {
      throw httpError(400, "executedCases không được lớn hơn totalCases.");
    }
  }
}

function isBlank(value) {
  return value === "" || value == null;
}

async function ensureSeedAdmin() {
  if (authMisconfigured) {
    console.warn("APP_USER and APP_PASSWORD must be configured together to seed the admin account.");
    return;
  }
  if (!authEnabled) return;
  const username = String(authUser).trim().toLowerCase();
  if (!username) return;
  const email = username.includes("@") ? username : null;
  const name = process.env.APP_ADMIN_NAME || "Squad 2 Administrator";
  const role = roleForIdentity(username, email);
  const passwordHash = await hashPassword(String(authPassword));
  await getPool().query(`
    insert into app_users (id, username, email, name, role, password_hash, active)
    values ($1, $2, $3, $4, $5, $6, true)
    on conflict (username) do update
      set email = coalesce(app_users.email, excluded.email),
          role = excluded.role,
          active = true,
          updated_at = now()
  `, [crypto.randomUUID(), username, email, name, role, passwordHash]);
}

async function ensureDefaultUsers() {
  for (const user of defaultUsers) {
    const username = String(user.username).trim().toLowerCase();
    const email = String(user.email || username).trim().toLowerCase();
    const name = String(user.name || username.split("@")[0]).trim();
    const role = roleForIdentity(username, email);
    const passwordHash = await hashPassword(String(user.password));
    await getPool().query(`
      insert into app_users (id, username, email, name, role, password_hash, active)
      values ($1, $2, $3, $4, $5, $6, true)
      on conflict (username) do update
        set email = excluded.email,
            role = excluded.role,
            active = true,
            updated_at = now()
    `, [crypto.randomUUID(), username, email, name, role, passwordHash]);
  }
}

async function ensureExclusiveAdminRoles() {
  await getPool().query(`
    update app_users
    set role = case
          when lower(username) = any($1::text[])
            or lower(coalesce(email, '')) = any($1::text[])
          then 'admin'
          else 'user'
        end,
        updated_at = now()
  `, [adminIdentities]);
}

async function requireApiAuth(req, res, next) {
  try {
    await ensureSchema();
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Vui lòng đăng nhập.", status: 401 });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Bạn không có quyền quản trị tài khoản.", status: 403 });
    return;
  }
  next();
}

async function getUserFromRequest(req) {
  const token = parseCookies(req.headers.cookie || "")[sessionCookieName];
  const session = verifySession(token);
  if (!session) return null;
  const result = await getPool().query(`
    select id, username, email, name, role, active, avatar_data
    from app_users
    where id = $1 and active = true
    limit 1
  `, [session.id]);
  if (!result.rows[0]) return null;
  return toPublicUser(result.rows[0]);
}

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email || "",
    name: user.name || user.username,
    role: normalizeRole(user.role || "user"),
    avatarData: user.avatar_data || user.avatarData || "",
    active: user.active !== false
  };
}

function toGroupChatMessage(row) {
  return {
    id: row.id,
    body: row.body || "",
    createdAt: row.created_at?.toISOString?.() || new Date().toISOString(),
    user: {
      id: row.user_id || "",
      name: row.user_name || row.username || "Người dùng",
      email: row.user_email || "",
      username: row.username || "",
      avatarData: row.user_avatar_data || ""
    }
  };
}

function normalizeChatMessage(value) {
  const body = String(value || "").trim();
  if (!body) throw httpError(400, "Tin nhắn không được để trống.");
  if (body.length > 1000) throw httpError(400, "Tin nhắn tối đa 1000 ký tự.");
  return body;
}

function validateNewUser({ username, email, name, password }) {
  if (!username || username.length < 3) throw httpError(400, "Username phải có ít nhất 3 ký tự.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, "Email không hợp lệ.");
  if (!name) throw httpError(400, "Tên hiển thị là bắt buộc.");
  validatePassword(password);
}

function validatePassword(password) {
  if (!password || String(password).length < 6) {
    throw httpError(400, "Mật khẩu phải có ít nhất 6 ký tự.");
  }
}

function normalizeDisplayName(name, fallback) {
  const value = String(name || "").trim();
  if (!value) throw httpError(400, "Tên hiển thị là bắt buộc.");
  if (value.length > 80) throw httpError(400, "Tên hiển thị tối đa 80 ký tự.");
  return value || fallback;
}

function normalizeAvatarData(value) {
  const avatarData = String(value || "").trim();
  if (!avatarData) return "";
  if (avatarData.length > maxAvatarDataLength) {
    throw httpError(400, `Ảnh đại diện quá lớn. Vui lòng chọn ảnh dưới ${maxAvatarFileSizeMb}MB.`);
  }
  if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(avatarData)) {
    throw httpError(400, "Ảnh đại diện phải là PNG, JPG, WEBP hoặc GIF.");
  }
  return avatarData;
}

function normalizeRole(role) {
  const value = String(role || "user").toLowerCase();
  return ["admin", "manager", "user", "viewer"].includes(value) ? value : "user";
}

function roleForIdentity(username, email) {
  const identities = [username, email].map((value) => String(value || "").trim().toLowerCase());
  return identities.some((identity) => adminIdentities.includes(identity)) ? "admin" : "user";
}

function signSession(user) {
  const payload = {
    id: user.id,
    role: user.role,
    exp: Date.now() + sessionTtlMs
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = createSignature(body);
  return `${body}.${signature}`;
}

function verifySession(token) {
  if (!token || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  if (!safeEqual(signature, createSignature(body))) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(body));
    if (!payload.id || Number(payload.exp) < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function setSessionCookie(req, res, token) {
  res.setHeader("Set-Cookie", serializeCookie(sessionCookieName, token, {
    httpOnly: true,
    secure: req.secure || req.get("x-forwarded-proto") === "https" || process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: Math.floor(sessionTtlMs / 1000)
  }));
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", serializeCookie(sessionCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: 0
  }));
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge != null) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join("; ");
}

function parseCookies(header) {
  return header.split(";").reduce((cookies, item) => {
    const separator = item.indexOf("=");
    if (separator < 0) return cookies;
    const key = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function createSignature(value) {
  return crypto.createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt);
  return `scrypt$${salt}$${hash}`;
}

async function verifyPassword(password, storedHash) {
  const [scheme, salt, hash] = String(storedHash || "").split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const attempted = await scrypt(password, salt);
  return safeEqual(attempted, hash);
}

function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey.toString("hex"));
    });
  });
}

function safeEqual(actual, expected) {
  const left = Buffer.from(String(actual));
  const right = Buffer.from(String(expected));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function latestUpdatedAt(rows) {
  const dates = rows
    .map((row) => row.data?.updatedAt || row.data?.createdAt)
    .filter(isValidDateString)
    .sort((a, b) => new Date(b) - new Date(a));
  return dates[0] || null;
}

function toDate(value) {
  return isValidDateString(value) ? new Date(value) : new Date();
}

function isValidDateString(value) {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function publicError(error) {
  if (error.status && error.message) return error.message;
  return "Không kết nối được hệ thống dữ liệu.";
}

function setNoStore(res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

async function shutdown() {
  server.close(async () => {
    if (pool) await pool.end();
    process.exit(0);
  });
}
