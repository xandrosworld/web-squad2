const crypto = require("crypto");

const baseUrl = process.env.SMOKE_URL || "http://localhost:3000";
const password = process.env.SMOKE_PASSWORD || "";
const adminIdentifier = process.env.SMOKE_ADMIN || process.env.SMOKE_USER || "thanhmt@bidv.com.vn";
const assigneeIdentifier = process.env.SMOKE_WORK_ASSIGNEE || "tuantd3@bidv.com.vn";

if (!password) {
  throw new Error("Set SMOKE_PASSWORD before running the work plan smoke.");
}

(async () => {
  const admin = await login(adminIdentifier);
  const assignee = await login(assigneeIdentifier);
  const stamp = Date.now();
  const categoryId = crypto.randomUUID();
  const itemId = crypto.randomUUID();
  const selfItemId = crypto.randomUUID();
  const blankStartItemId = crypto.randomUUID();
  const category = {
    id: categoryId,
    sortOrder: 9901,
    name: `Smoke nhóm kế hoạch ${stamp}`,
    description: "Created by automated smoke test",
    owner: admin.user.name || admin.user.email,
    targetDate: "2026-07-30",
    status: "Đang theo dõi",
    note: ""
  };
  const item = {
    id: itemId,
    sortOrder: 9901,
    categoryId,
    title: `Smoke đầu việc ${stamp}`,
    description: "Created by automated smoke test",
    assignee: assignee.user.name || assignee.user.email,
    assigneeEmail: assignee.user.email || assignee.user.username,
    collaborators: "",
    assignees: [
      { name: assignee.user.name || assignee.user.email, email: assignee.user.email || assignee.user.username },
      { name: admin.user.name || admin.user.email, email: admin.user.email || admin.user.username }
    ],
    businessContacts: [],
    status: "Chưa bắt đầu",
    progress: 0,
    priority: "Cao",
    startDate: "2026-07-04",
    dueDate: "2026-07-30",
    completedDate: "",
    documentUrl: "",
    note: ""
  };

  try {
    await expectStatus("admin create work category", request("/api/records/workCategories", {
      method: "POST",
      cookie: admin.cookie,
      body: { record: category }
    }), 201);

    const invalidCreateCases = [
      { label: "zero progress cannot be in progress", status: "Đang thực hiện", progress: 0 },
      { label: "partial progress cannot be not started", status: "Chưa bắt đầu", progress: 50 },
      { label: "full progress cannot be in progress", status: "Đang thực hiện", progress: 100 },
      { label: "removed approval status is rejected", status: "Chờ phê duyệt", progress: 50 },
      { label: "overdue cannot be persisted as status", status: "Quá hạn", progress: 50 }
    ];
    for (const testCase of invalidCreateCases) {
      await expectStatus(testCase.label, request("/api/records/workItems", {
        method: "POST",
        cookie: admin.cookie,
        body: {
          record: {
            ...item,
            id: crypto.randomUUID(),
            title: `Smoke invalid ${testCase.label} ${stamp}`,
            status: testCase.status,
            progress: testCase.progress
          }
        }
      }), 400);
    }

    const itemCreated = await expectStatus("admin create work item", request("/api/records/workItems", {
      method: "POST",
      cookie: admin.cookie,
      body: { record: item }
    }), 201);
    const createdItem = findRecord(itemCreated.data.state || {}, "workItems", itemId);
    if (!createdItem || Number(createdItem.sortOrder) !== 1) {
      throw new Error(`Work item đầu tiên trong nhóm phải có STT 1, nhận ${createdItem?.sortOrder ?? "trống"}.`);
    }
    if (createdItem.assignees?.length !== 2) {
      throw new Error("Backend chưa lưu đủ nhiều người thực hiện.");
    }

    await expectStatus("admin cannot change locked start date", request(`/api/records/workItems/${itemId}`, {
      method: "PUT",
      cookie: admin.cookie,
      body: { record: { ...createdItem, startDate: "2026-07-06" } }
    }), 409);

    await expectStatus("mismatched status and progress update is rejected", request(`/api/records/workItems/${itemId}`, {
      method: "PUT",
      cookie: admin.cookie,
      body: { record: { ...createdItem, status: "Hoàn thành", progress: 75 } }
    }), 400);

    const blankStartCreated = await expectStatus("admin creates item without start date", request("/api/records/workItems", {
      method: "POST",
      cookie: admin.cookie,
      body: { record: { ...item, id: blankStartItemId, title: `Smoke blank start date ${stamp}`, startDate: "" } }
    }), 201);
    const blankStartItem = findRecord(blankStartCreated.data.state || {}, "workItems", blankStartItemId);
    if (!blankStartItem || blankStartItem._canBackfillStartDate) {
      throw new Error("New work item without start date must be locked, not marked as legacy backfill.");
    }
    await expectStatus("new blank start date is locked after create", request(`/api/records/workItems/${blankStartItemId}`, {
      method: "PUT",
      cookie: admin.cookie,
      body: { record: { ...blankStartItem, startDate: "2026-07-06" } }
    }), 409);

    await expectStatus("category with linked work item cannot be deleted", request(`/api/records/workCategories/${categoryId}`, {
      method: "DELETE",
      cookie: admin.cookie
    }), 409);

    await expectStatus("system T01 category cannot be deleted", request("/api/records/workCategories/pilot-t01", {
      method: "DELETE",
      cookie: admin.cookie
    }), 409);

    const kpiConfig = itemCreated.data.state?.kpiConfig?.[0];
    if (!kpiConfig) throw new Error("Default work KPI config is missing from state.");
    await expectStatus("invalid KPI weight total is rejected", request(`/api/records/kpiConfig/${kpiConfig.id}`, {
      method: "PUT",
      cookie: admin.cookie,
      body: { record: { ...kpiConfig, disciplineWeight: Number(kpiConfig.disciplineWeight || 0) - 1 } }
    }), 400);

    await expectStatus("regular user cannot create category", request("/api/records/workCategories", {
      method: "POST",
      cookie: assignee.cookie,
      body: { record: { ...category, id: crypto.randomUUID(), name: "Unauthorized category" } }
    }), 403);

    const selfCreated = await expectStatus("regular user creates self-assigned item", request("/api/records/workItems", {
      method: "POST",
      cookie: assignee.cookie,
      body: {
        record: {
          ...item,
          id: selfItemId,
          title: `Smoke self-assigned ${stamp}`,
          assignee: admin.user.name,
          assigneeEmail: admin.user.email
        }
      }
    }), 201);
    const selfItem = findRecord(selfCreated.data.state || {}, "workItems", selfItemId);
    if (!selfItem || String(selfItem.assigneeEmail || "").toLowerCase() !== String(assignee.user.email || assignee.user.username).toLowerCase()) {
      throw new Error("Regular user's new item was not self-assigned by the backend.");
    }
    if (selfItem.assignees?.length !== 1) {
      throw new Error("Backend phải chặn tài khoản thường tự phân công thêm người khác.");
    }

    const attemptedOverreach = {
      ...item,
      title: "Unauthorized title change",
      dueDate: "2026-08-31",
      status: "Đang thực hiện",
      progress: 55,
      documentUrl: "https://example.com/work-plan-smoke",
      note: "Assignee progress update"
    };
    const assigneeUpdate = await expectStatus("assignee updates progress only", request(`/api/records/workItems/${itemId}`, {
      method: "PUT",
      cookie: assignee.cookie,
      body: { record: attemptedOverreach }
    }), 200);
    const updatedForAssignee = findRecord(assigneeUpdate.data.state || {}, "workItems", itemId);
    assertWorkItemRestrictedUpdate(updatedForAssignee, item);

    await expectStatus("assignee cannot delete work item", request(`/api/records/workItems/${itemId}`, {
      method: "DELETE",
      cookie: assignee.cookie
    }), 403);

    const adminUpdate = await expectStatus("admin can fully update work item", request(`/api/records/workItems/${itemId}`, {
      method: "PUT",
      cookie: admin.cookie,
      body: { record: { ...item, title: `Smoke đầu việc admin sửa ${stamp}`, status: "Hoàn thành", progress: 100, completedDate: "2026-07-05" } }
    }), 200);
    const updatedForAdmin = findRecord(adminUpdate.data.state || {}, "workItems", itemId);
    if (!updatedForAdmin || updatedForAdmin.title !== `Smoke đầu việc admin sửa ${stamp}` || updatedForAdmin.progress !== 100) {
      throw new Error("Admin full update did not persist expected fields.");
    }
    if (Number(updatedForAdmin.sortOrder) !== 1) {
      throw new Error(`Backend không bảo vệ STT theo nhóm; nhận ${updatedForAdmin.sortOrder}.`);
    }

    await expectStatus("admin delete work item", request(`/api/records/workItems/${itemId}`, {
      method: "DELETE",
      cookie: admin.cookie
    }), 200);

    await expectStatus("admin cleanup self-assigned item", request(`/api/records/workItems/${selfItemId}`, {
      method: "DELETE",
      cookie: admin.cookie
    }), 200);

    await expectStatus("admin cleanup blank-start item", request(`/api/records/workItems/${blankStartItemId}`, {
      method: "DELETE",
      cookie: admin.cookie
    }), 200);

    await expectStatus("admin delete work category", request(`/api/records/workCategories/${categoryId}`, {
      method: "DELETE",
      cookie: admin.cookie
    }), 200);

    console.log(`Work plan smoke passed: ${baseUrl}`);
  } finally {
    await request(`/api/records/workItems/${itemId}`, { method: "DELETE", cookie: admin.cookie });
    await request(`/api/records/workItems/${selfItemId}`, { method: "DELETE", cookie: admin.cookie });
    await request(`/api/records/workItems/${blankStartItemId}`, { method: "DELETE", cookie: admin.cookie });
    await request(`/api/records/workCategories/${categoryId}`, { method: "DELETE", cookie: admin.cookie });
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

function findRecord(state, collection, id) {
  return (state[collection] || []).find((record) => record.id === id);
}

function assertWorkItemRestrictedUpdate(updated, original) {
  if (!updated) throw new Error("Updated work item was not returned.");
  if (updated.title !== original.title) {
    throw new Error("Assignee was able to change the protected title field.");
  }
  if (updated.dueDate !== original.dueDate) {
    throw new Error("Assignee was able to change the protected dueDate field.");
  }
  if (updated.status !== "Đang thực hiện" || Number(updated.progress) !== 55) {
    throw new Error("Assignee progress fields were not saved.");
  }
  if (updated.note !== "Assignee progress update") {
    throw new Error("Assignee note was not saved.");
  }
  if (updated.assignees?.length !== original.assignees?.length) {
    throw new Error("Cập nhật tiến độ đã làm mất danh sách người thực hiện.");
  }
}
