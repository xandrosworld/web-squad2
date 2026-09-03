require("dotenv").config();

const baseUrl = String(process.env.SMOKE_URL || process.env.APP_BASE_URL || "https://squad2-dashboard-qlcv.up.railway.app").replace(/\/+$/, "");
const identifier = String(process.env.SMOKE_USER || "").trim();
const password = String(process.env.SMOKE_PASSWORD || "");
const token = String(process.env.JIRA_API_TOKEN || "").trim();

if (!identifier || !password) throw new Error("Cần SMOKE_USER và SMOKE_PASSWORD để cấu hình production.");
if (!token) throw new Error("JIRA_API_TOKEN chưa có trong .env local.");

(async () => {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password })
  });
  if (!login.ok) throw new Error(`Đăng nhập production thất bại (${login.status}).`);
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Production không trả về session cookie.");

  const response = await fetch(`${baseUrl}/api/jira/connection`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      baseUrl: process.env.JIRA_BASE_URL,
      email: process.env.JIRA_EMAIL,
      token,
      projectKey: process.env.JIRA_PROJECT_KEY,
      label: process.env.JIRA_BUG_LABEL
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Cấu hình Jira thất bại (${response.status}).`);
  console.log(`Đã cấu hình Jira production và đồng bộ ${Number(data.result?.total || 0)} bug TESTLUONG.`);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
