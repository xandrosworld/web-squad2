const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright-core");

let baseUrl = process.env.SMOKE_URL || "";
let staticServer = null;
const browserPath = process.env.SMOKE_BROWSER || [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
].find(fs.existsSync);
if (!browserPath) throw new Error("Không tìm thấy Chrome/Edge để kiểm tra giao diện.");

const emptyState = {
  features: [], personnel: [], schedule: [], handoffs: [], plans: [], daily: [], defects: [],
  userStories: [], bugSources: [], defectSummary: [], weekly: [], readiness: [], matrix: [], guide: [],
  workCategories: [{ id: "pilot-t01", name: "Kiểm thử chức năng", taskPrefix: "SQ2-UAT" }], workItems: [], kpiConfig: [], memberKpiInputs: [], memberKpiResults: [],
  unmappedPlanBugGroups: [], updatedAt: new Date().toISOString()
};

const issue = (key, status, priority = "Major") => ({
  key,
  summary: `Bug kiểm thử ${key}`,
  status,
  createdAt: "2026-08-14T02:00:00.000Z",
  updatedAt: "2026-09-03T02:00:00.000Z",
  priority,
  components: ["SQ02"],
  parentKey: "PS0142025-5",
  parentSummary: "[SQ2] Thẩm định và phê duyệt tín dụng"
});

const dashboard = {
  configured: true,
  browseBaseUrl: "https://bidv-vn.atlassian.net/browse/",
  projectKey: "PS0142025",
  label: "TESTLUONG",
  cutoffDescription: "Thứ Năm hằng tuần lúc 15:00",
  handledStatuses: ["Closed"],
  syncedAt: "2026-09-03T08:05:00.000Z",
  total: 3,
  blockerPivot: {
    total: 2,
    rows: [{
      groupKey: "PS0142025-5",
      parentKey: "PS0142025-5",
      groupName: "[SQ2] Thẩm định và phê duyệt tín dụng",
      components: ["SQ02"],
      total: 2,
      counts: { "2": 2 },
      issues: { "2": [issue("PS0142025-12563", "SIT Pass", "Blocker"), issue("PS0142025-12564", "Cancelled", "Blocker")] }
    }]
  },
  weeks: [1, 2, 3].map((weekNumber) => ({
    weekNumber,
    startAt: ["2026-08-13T00:00:00.000Z", "2026-08-20T08:00:00.000Z", "2026-08-27T08:00:00.000Z"][weekNumber - 1],
    cutoffAt: ["2026-08-20T08:00:00.000Z", "2026-08-27T08:00:00.000Z", "2026-09-03T08:00:00.000Z"][weekNumber - 1],
    finalized: weekNumber < 3,
    created: 1,
    handled: 1,
    remaining: weekNumber === 3 ? 0 : 1,
    total: weekNumber === 3 ? 1 : 2,
    handledRate: weekNumber === 3 ? 100 : 50,
    issues: {
      created: [issue(`PS0142025-${12000 + weekNumber}`, "Open", weekNumber === 2 ? "Blocker" : "Major")],
      handled: [issue(`PS0142025-${12100 + weekNumber}`, "Closed")],
      remaining: weekNumber === 3 ? [] : [issue(`PS0142025-${12200 + weekNumber}`, "Open")]
    },
    priorityBreakdown: {
      Blocker: { created: weekNumber === 2 ? 1 : 0, handled: 0, remaining: 0 },
      Major: { created: weekNumber === 2 ? 0 : 1, handled: 1, remaining: weekNumber === 3 ? 0 : 1 },
      Minor: { created: 0, handled: 0, remaining: 0 }
    }
  }))
};

(async () => {
  if (!baseUrl) {
    staticServer = http.createServer((request, response) => {
      const pathname = new URL(request.url, "http://localhost").pathname;
      const filename = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
      const allowed = new Set(["index.html", "app.js", "styles.css"]);
      if (!allowed.has(filename)) {
        response.writeHead(404).end("Not found");
        return;
      }
      const contentType = filename.endsWith(".js") ? "text/javascript" : filename.endsWith(".css") ? "text/css" : "text/html";
      response.writeHead(200, { "Content-Type": `${contentType}; charset=utf-8` });
      fs.createReadStream(path.join(__dirname, "..", filename)).pipe(response);
    });
    await new Promise((resolve) => staticServer.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${staticServer.address().port}`;
  }
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.route("**/api/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      let body = {};
      if (pathname === "/api/auth/me") body = { authenticated: true, user: { id: "admin", name: "Mai Tấn Thành", email: "thanhmt@bidv.com.vn", username: "thanhmt", role: "admin" } };
      else if (pathname === "/api/state") body = { state: emptyState };
      else if (pathname === "/api/directory/users") body = { users: [] };
      else if (pathname === "/api/jira/weekly-dashboard") body = { dashboard };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto(`${baseUrl}/#work/group/pilot-t01/defectDashboard`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Đối chiếu theo tuần" }).click();
    await page.locator(".jira-weekly-panel").waitFor();
    await page.locator(".jira-week-card").first().waitFor();
    if (await page.locator(".jira-week-card").count() !== 3) throw new Error("Giao diện không hiển thị đủ 3 tuần.");
    const railLayout = await page.locator(".jira-weekly-scroll").evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollLeft: element.scrollLeft
    }));
    if (railLayout.scrollWidth <= railLayout.clientWidth) throw new Error("Các tuần chưa được đặt trong vùng cuộn ngang.");
    if (railLayout.scrollLeft <= 0) throw new Error("Giao diện chưa tự đưa tuần mới nhất vào vùng nhìn thấy.");
    if (await page.locator(".jira-week-card").nth(1).getByText("Blocker", { exact: true }).count() !== 1) throw new Error("Thiếu phân rã Priority trong tuần.");
    if (process.env.SMOKE_WEEKLY_SCREENSHOT) await page.screenshot({ path: process.env.SMOKE_WEEKLY_SCREENSHOT, fullPage: true });
    for (const metric of ["created", "handled", "remaining"]) {
      await page.locator(`.jira-week-card:nth-child(2) .jira-week-metric[data-week-metric="${metric}"]`).click();
      await page.locator(".jira-week-metric-dialog .jira-week-detail").waitFor();
      const displayedCount = Number(await page.locator(`.jira-week-card:nth-child(2) .jira-week-metric[data-week-metric="${metric}"] strong`).innerText());
      const listedCount = await page.locator(".jira-week-metric-dialog a.jira-week-issue").count();
      if (displayedCount !== listedCount) throw new Error(`Popup ${metric} có ${listedCount} bug nhưng thẻ hiển thị ${displayedCount}.`);
      await page.locator('.jira-week-metric-dialog .icon-btn[data-action="close-jira-week-detail"]').click();
    }
    await page.locator(".jira-week-card").nth(1).locator('[data-week-priority="Blocker"][data-week-metric="created"]').click();
    await page.locator(".jira-week-metric-dialog .jira-week-detail").waitFor();
    if (await page.locator(".jira-week-metric-dialog").getAttribute("role") !== "presentation") throw new Error("Danh sách bug chưa hiển thị trong popup.");
    if (await page.locator(".jira-week-metric-dialog a.jira-week-issue").count() !== 1) throw new Error("Popup Priority không hiển thị đúng danh sách bug.");
    if (process.env.SMOKE_WEEKLY_POPUP_SCREENSHOT) await page.screenshot({ path: process.env.SMOKE_WEEKLY_POPUP_SCREENSHOT, fullPage: true });
    const priorityDetailText = await page.locator(".jira-week-detail-head").innerText();
    if (!priorityDetailText.toLowerCase().includes("blocker")) throw new Error(`Drill-down chưa lọc đúng Priority: ${priorityDetailText}`);
    await page.locator('.jira-week-metric-dialog .icon-btn[data-action="close-jira-week-detail"]').click();
    await page.locator(".jira-week-card").nth(2).getByRole("button", { name: /Bug đã xử lý/ }).click();
    await page.locator(".jira-week-metric-dialog .jira-week-detail").waitFor();
    const href = await page.locator(".jira-week-metric-dialog .jira-week-detail a").first().getAttribute("href");
    if (!href?.includes("https://bidv-vn.atlassian.net/browse/PS0142025-")) throw new Error(`Link Jira không đúng: ${href}`);
    await page.locator('.jira-week-metric-dialog .icon-btn[data-action="close-jira-week-detail"]').click();
    const bodyText = await page.locator(".jira-weekly-panel").innerText();
    for (const text of ["Bug phát sinh", "Bug đã xử lý", "Bug còn tồn", "Tỷ lệ xử lý lũy kế", "Tạm tính", "Đã chốt", "Blocker TESTLUONG phát sinh theo tuần", "Tổng Blocker", "PS0142025-12563", "PHÁT SINH TẠI"]) {
      if (!bodyText.includes(text)) throw new Error(`Thiếu nội dung dashboard: ${text}`);
    }
    await page.locator('.jira-blocker-table .jira-blocker-bug[data-blocker-issue="PS0142025-12563"]').click();
    await page.locator(".jira-week-detail.blocker-detail").waitFor();
    if (await page.locator(".jira-week-detail.blocker-detail a.jira-week-issue").count() !== 1) throw new Error("Drill-down phải hiển thị đúng bug đã chọn.");
    const dialogRect = await page.locator(".jira-week-detail.blocker-detail").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    });
    if (dialogRect.top < 0 || dialogRect.bottom > 900) throw new Error("Hộp chi tiết Blocker nằm ngoài màn hình.");
    if (process.env.SMOKE_SCREENSHOT) await page.screenshot({ path: process.env.SMOKE_SCREENSHOT, fullPage: true });
    console.log("Jira weekly dashboard UI check passed.");
  } finally {
    await browser.close();
    if (staticServer) await new Promise((resolve) => staticServer.close(resolve));
  }
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
