const crypto = require("crypto");

const baseUrl = process.env.SMOKE_URL || "https://squad2-dashboard-qlcv.up.railway.app";
const password = process.env.SMOKE_PASSWORD || "";
const accounts = {
  adminOne: process.env.SMOKE_ADMIN_ONE || "yenuth@bidv.com.vn",
  adminTwo: process.env.SMOKE_ADMIN_TWO || "thanhmt@bidv.com.vn",
  userOne: process.env.SMOKE_USER_ONE || "tuanpa13@bidv.com.vn",
  userTwo: process.env.SMOKE_USER_TWO || "giangnc2@bidv.com.vn",
  ownerNv1: process.env.SMOKE_OWNER_NV1 || "phuongbtm@bidv.com.vn",
  ownerNv3: process.env.SMOKE_OWNER_NV3 || "tuanpa13@bidv.com.vn"
};

if (!password) {
  throw new Error("Set SMOKE_PASSWORD before running the RBAC production smoke.");
}

(async () => {
  const sessions = {};
  const createdIds = [];

  for (const [key, identifier] of Object.entries(accounts)) {
    sessions[key] = await login(identifier);
  }

  assertRole(sessions.adminOne.user, "admin");
  assertRole(sessions.adminTwo.user, "admin");
  assertRole(sessions.userOne.user, "user");
  assertRole(sessions.userTwo.user, "user");
  assertRole(sessions.ownerNv1.user, "user");
  assertRole(sessions.ownerNv3.user, "user");

  const linkedOwnerRecord = { ...featureRecord("RBAC-NV1"), owner: "NV1 - Bùi Thị Mai Phương" };
  const recordOne = featureRecord("RBAC-OWNER-A");
  const recordTwo = featureRecord("RBAC-OWNER-B");

  try {
    await expectStatus("admin create linked owner record", request("/api/records/features", {
      method: "POST",
      cookie: sessions.adminOne.cookie,
      body: { record: linkedOwnerRecord }
    }), 201);
    createdIds.push(linkedOwnerRecord.id);

    await assertOwnership(linkedOwnerRecord.id, sessions.ownerNv1.cookie, { canEdit: true, canDelete: false });
    await assertOwnership(linkedOwnerRecord.id, sessions.userTwo.cookie, { canEdit: false, canDelete: false });
    await assertOwnership(linkedOwnerRecord.id, sessions.adminOne.cookie, { canEdit: true, canDelete: true });

    await expectStatus("linked owner update admin-created record", request(`/api/records/features/${linkedOwnerRecord.id}`, {
      method: "PUT",
      cookie: sessions.ownerNv1.cookie,
      body: { record: { ...linkedOwnerRecord, name: "Linked owner updated" } }
    }), 200);

    await expectStatus("non-linked user update linked owner record", request(`/api/records/features/${linkedOwnerRecord.id}`, {
      method: "PUT",
      cookie: sessions.userTwo.cookie,
      body: { record: { ...linkedOwnerRecord, name: "Unauthorized linked owner update" } }
    }), 403);

    await expectStatus("linked owner delete admin-created record", request(`/api/records/features/${linkedOwnerRecord.id}`, {
      method: "DELETE",
      cookie: sessions.ownerNv1.cookie
    }), 403);

    await expectStatus("admin delete linked owner record", request(`/api/records/features/${linkedOwnerRecord.id}`, {
      method: "DELETE",
      cookie: sessions.adminOne.cookie
    }), 200);
    createdIds.splice(createdIds.indexOf(linkedOwnerRecord.id), 1);

    await expectStatus("user one create", request("/api/records/features", {
      method: "POST",
      cookie: sessions.userOne.cookie,
      body: { record: recordOne }
    }), 201);
    createdIds.push(recordOne.id);

    await assertOwnership(recordOne.id, sessions.userOne.cookie, { canEdit: true, canDelete: true });
    await assertOwnership(recordOne.id, sessions.userTwo.cookie, { canEdit: false, canDelete: false });
    await assertOwnership(recordOne.id, sessions.adminOne.cookie, { canEdit: true, canDelete: true });
    await assertOwnership(recordOne.id, sessions.adminTwo.cookie, { canEdit: true, canDelete: true });

    await expectStatus("user one update own record", request(`/api/records/features/${recordOne.id}`, {
      method: "PUT",
      cookie: sessions.userOne.cookie,
      body: { record: { ...recordOne, name: "Owner updated" } }
    }), 200);

    await expectStatus("user two update another user's record", request(`/api/records/features/${recordOne.id}`, {
      method: "PUT",
      cookie: sessions.userTwo.cookie,
      body: { record: { ...recordOne, name: "Unauthorized update" } }
    }), 403);

    await expectStatus("user two delete another user's record", request(`/api/records/features/${recordOne.id}`, {
      method: "DELETE",
      cookie: sessions.userTwo.cookie
    }), 403);

    await expectStatus("admin one update user record", request(`/api/records/features/${recordOne.id}`, {
      method: "PUT",
      cookie: sessions.adminOne.cookie,
      body: { record: { ...recordOne, name: "Admin one updated" } }
    }), 200);

    await expectStatus("admin two delete user record", request(`/api/records/features/${recordOne.id}`, {
      method: "DELETE",
      cookie: sessions.adminTwo.cookie
    }), 200);
    createdIds.splice(createdIds.indexOf(recordOne.id), 1);

    await expectStatus("user two create", request("/api/records/features", {
      method: "POST",
      cookie: sessions.userTwo.cookie,
      body: { record: recordTwo }
    }), 201);
    createdIds.push(recordTwo.id);

    await expectStatus("user two update own record", request(`/api/records/features/${recordTwo.id}`, {
      method: "PUT",
      cookie: sessions.userTwo.cookie,
      body: { record: { ...recordTwo, name: "Owner two updated" } }
    }), 200);

    await expectStatus("regular user replace full state", request("/api/state", {
      method: "PUT",
      cookie: sessions.userTwo.cookie,
      body: { state: emptyState() }
    }), 403);

    await expectStatus("user two delete own record", request(`/api/records/features/${recordTwo.id}`, {
      method: "DELETE",
      cookie: sessions.userTwo.cookie
    }), 200);
    createdIds.splice(createdIds.indexOf(recordTwo.id), 1);

    console.log("RBAC smoke passed.");
  } finally {
    for (const id of createdIds) {
      await request(`/api/records/features/${id}`, {
        method: "DELETE",
        cookie: sessions.adminOne?.cookie || ""
      });
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function login(identifier) {
  const result = await request("/api/auth/login", {
    method: "POST",
    body: { identifier, password }
  });
  if (result.status !== 200 || !result.data.authenticated || !result.cookie) {
    throw new Error(`Login failed for ${identifier}: ${result.status} ${result.data.error || ""}`);
  }
  return { cookie: result.cookie, user: result.data.user };
}

async function request(path, { method = "GET", cookie = "", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  const setCookie = response.headers.get("set-cookie") || "";
  return {
    status: response.status,
    data,
    cookie: setCookie ? setCookie.split(";")[0] : cookie
  };
}

async function expectStatus(label, promise, expectedStatus) {
  const result = await promise;
  if (result.status !== expectedStatus) {
    throw new Error(`${label}: expected ${expectedStatus}, got ${result.status} ${result.data.error || ""}`);
  }
  return result;
}

async function assertOwnership(id, cookie, expected) {
  const result = await expectStatus("read ownership", request("/api/state", { cookie }), 200);
  const record = result.data.state.features.find((item) => item.id === id);
  if (!record) throw new Error(`Ownership check could not find record ${id}.`);
  if (record._ownership?.canEdit !== expected.canEdit) {
    throw new Error(`Ownership check for ${id}: expected canEdit=${expected.canEdit}.`);
  }
  if (record._ownership?.canDelete !== expected.canDelete) {
    throw new Error(`Ownership check for ${id}: expected canDelete=${expected.canDelete}.`);
  }
}

function assertRole(user, expectedRole) {
  if (user.role !== expectedRole) {
    throw new Error(`${user.email || user.username}: expected role ${expectedRole}, got ${user.role}.`);
  }
}

function featureRecord(prefix) {
  const id = crypto.randomUUID();
  const timestamp = Date.now();
  return {
    id,
    code: `${prefix}-${timestamp}`,
    sprint: "RBAC-SMOKE",
    name: `RBAC smoke ${timestamp}`,
    group: "",
    owner: "BA",
    handoffDate: "",
    priority: "",
    status: "",
    testerMain: "",
    testerSupport: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function emptyState() {
  return {
    features: [],
    personnel: [],
    schedule: [],
    handoffs: [],
    plans: [],
    daily: [],
    defects: [],
    userStories: [],
    bugSources: [],
    defectSummary: [],
    weekly: [],
    readiness: [],
    matrix: [],
    guide: [],
    workCategories: [],
    workItems: []
  };
}
