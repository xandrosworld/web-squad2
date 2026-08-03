const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");

const baseUrl = String(process.env.APP_URL || "https://squad2-dashboard-qlcv.up.railway.app").replace(/\/$/, "");
const ownerIdentifier = process.env.TEST_IDENTIFIER || "thanhmt@bidv.com.vn";
const ownerPassword = process.env.TEST_PASSWORD || "123456";
const otherIdentifier = process.env.TEST_OTHER_IDENTIFIER || "tuantd3@bidv.com.vn";
const otherPassword = process.env.TEST_OTHER_PASSWORD || "123456";

async function login(identifier, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password })
  });
  const body = await response.json().catch(() => ({}));
  assert.equal(response.status, 200, `Login failed for ${identifier}: ${body.error || response.status}`);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, `No session cookie for ${identifier}`);
  return cookie;
}

async function request(path, cookie, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Cookie: cookie,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
}

async function main() {
  const ownerCookie = await login(ownerIdentifier, ownerPassword);
  let createdId = "";
  const marker = `SMOKE liên Squad ${Date.now()}`;
  try {
    let response = await request("/api/personal-workspace", ownerCookie);
    assert.equal(response.status, 200, "Owner cannot read personal workspace");

    response = await request("/api/personal-workspace/tasks", ownerCookie, {
      method: "POST",
      body: JSON.stringify({
        squad: "7",
        title: marker,
        assigner: "Kiểm thử tự động",
        assignedDate: "2026-08-03",
        dueDate: "2026-08-06",
        status: "Đang thực hiện",
        note: "Bản ghi sẽ được tự động dọn"
      })
    });
    const created = await response.json();
    assert.equal(response.status, 201, created.error || "Create failed");
    createdId = created.task.id;

    response = await request(`/api/personal-workspace/tasks/${encodeURIComponent(createdId)}`, ownerCookie, {
      method: "PUT",
      body: JSON.stringify({ ...created.task, status: "Hoàn thành" })
    });
    const updated = await response.json();
    assert.equal(response.status, 200, updated.error || "Update failed");
    assert.equal(updated.task.status, "Hoàn thành");
    assert.match(updated.task.completedDate, /^\d{4}-\d{2}-\d{2}$/);

    response = await request("/api/personal-workspace/export", ownerCookie);
    assert.equal(response.status, 200, "Export failed");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()));
    assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Squad 1", "Squad 7", "Squad 11"]);
    const exportedTitles = workbook.getWorksheet("Squad 7").getColumn(2).values.map(String);
    assert.ok(exportedTitles.includes(marker), "Created task is missing from export");

    const otherCookie = await login(otherIdentifier, otherPassword);
    response = await request("/api/personal-workspace", otherCookie);
    assert.equal(response.status, 403, "Another user can read the private workspace");
    response = await request("/api/personal-workspace/export", otherCookie);
    assert.equal(response.status, 403, "Another user can export the private workspace");
  } finally {
    if (createdId) {
      const cleanup = await request(`/api/personal-workspace/tasks/${encodeURIComponent(createdId)}`, ownerCookie, { method: "DELETE" });
      assert.equal(cleanup.status, 200, "Smoke task cleanup failed");
    }
  }
  console.log(`Personal workspace production smoke: OK (${baseUrl})`);
}

module.exports = { main };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
