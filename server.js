const crypto = require("crypto");
const path = require("path");

require("dotenv").config();

const express = require("express");
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
const maxAvatarDataLength = Number(process.env.MAX_AVATAR_DATA_LENGTH || 350000);
const defaultUsers = [
  { username: "yenuth@bidv.com.vn", email: "yenuth@bidv.com.vn", name: "yenuth", password: "123456" },
  { username: "thanhmt@bidv.com.vn", email: "thanhmt@bidv.com.vn", name: "thanhmt", password: "123456" },
  { username: "tuanpa13@bidv.com.vn", email: "tuanpa13@bidv.com.vn", name: "tuanpa13", password: "123456" },
  { username: "giangnc2@bidv.com.vn", email: "giangnc2@bidv.com.vn", name: "giangnc2", password: "123456" }
];

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
const collectionRules = {
  features: {
    required: ["code", "name"],
    numbers: [],
    percents: [],
    enums: {
      group: functionGroups,
      priority: ["Critical", "Cao", "Trung bình", "Thấp"],
      status: ["Chưa bắt đầu", "Đang kiểm thử", "Chờ fix", "Retest", "Hoàn thành", "Tạm hoãn"]
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

let pool;
let schemaPromise;

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "5mb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

app.get("/api/health", async (req, res) => {
  try {
    await ensureSchema();
    await getPool().query("select 1");
    res.json({
      ok: true,
      service: "squad2-uat-command-center",
      db: "online",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({
      ok: false,
      service: "squad2-uat-command-center",
      db: "offline",
      error: publicError(error),
      timestamp: new Date().toISOString()
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
  const role = normalizeRole(req.body.role || "user");
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
  const state = await readState(getPool());
  res.json({ state });
}));

app.put("/api/state", asyncHandler(async (req, res) => {
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
        await upsertRecord(client, collection, record);
      }
    }
    await touchMeta(client);
    const nextState = await readState(client);
    await client.query("commit");
    res.json({ state: nextState });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}));

app.delete("/api/state", asyncHandler(async (req, res) => {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("delete from uat_records");
    await touchMeta(client);
    const state = await readState(client);
    await client.query("commit");
    res.json({ state });
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
  validateRecordForCollection(collection, record);
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const saved = await upsertRecord(client, collection, record);
    const updatedAt = await touchMeta(client);
    await client.query("commit");
    res.status(201).json({ record: saved, updatedAt });
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
    const saved = await upsertRecord(client, collection, record);
    const updatedAt = await touchMeta(client);
    await client.query("commit");
    res.json({ record: saved, updatedAt });
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
  console.log(`Squad2 UAT Command Center listening on port ${port}`);
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
    `);
      await ensureSeedAdmin();
      await ensureDefaultUsers();
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function readState(db) {
  const state = emptyState();
  const [recordResult, metaResult] = await Promise.all([
    db.query("select collection, data from uat_records order by collection asc, updated_at desc"),
    db.query("select value from app_meta where key = 'state'")
  ]);

  for (const row of recordResult.rows) {
    if (collectionSet.has(row.collection)) {
      state[row.collection].push(row.data);
    }
  }

  const metaUpdatedAt = metaResult.rows[0]?.value?.updatedAt;
  state.updatedAt = typeof metaUpdatedAt === "string" ? metaUpdatedAt : latestUpdatedAt(recordResult.rows);
  return state;
}

async function upsertRecord(client, collection, record) {
  const createdAt = toDate(record.createdAt);
  const updatedAt = toDate(record.updatedAt);
  const result = await client.query(`
    insert into uat_records (collection, id, data, created_at, updated_at)
    values ($1, $2, $3::jsonb, $4, $5)
    on conflict (collection, id) do update
      set data = excluded.data,
          updated_at = excluded.updated_at
    returning data
  `, [collection, record.id, JSON.stringify(record), createdAt, updatedAt]);
  return result.rows[0].data;
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
  const now = new Date().toISOString();
  const id = forcedId || input.id || crypto.randomUUID();
  return {
    ...input,
    id: String(id),
    createdAt: isValidDateString(input.createdAt) ? input.createdAt : now,
    updatedAt: isValidDateString(input.updatedAt) ? input.updatedAt : now
  };
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
  const passwordHash = await hashPassword(String(authPassword));
  await getPool().query(`
    insert into app_users (id, username, email, name, role, password_hash, active)
    values ($1, $2, $3, $4, 'admin', $5, true)
    on conflict (username) do update
      set email = coalesce(app_users.email, excluded.email),
          name = excluded.name,
          role = 'admin',
          password_hash = excluded.password_hash,
          active = true,
          updated_at = now()
  `, [crypto.randomUUID(), username, email, name, passwordHash]);
}

async function ensureDefaultUsers() {
  for (const user of defaultUsers) {
    const username = String(user.username).trim().toLowerCase();
    const email = String(user.email || username).trim().toLowerCase();
    const name = String(user.name || username.split("@")[0]).trim();
    const passwordHash = await hashPassword(String(user.password));
    await getPool().query(`
      insert into app_users (id, username, email, name, role, password_hash, active)
      values ($1, $2, $3, $4, 'user', $5, true)
      on conflict (username) do nothing
    `, [crypto.randomUUID(), username, email, name, passwordHash]);
  }
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
    throw httpError(400, "Ảnh đại diện quá lớn. Vui lòng chọn ảnh dưới 250KB.");
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
