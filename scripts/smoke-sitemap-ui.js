const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright-core");
const {
  applyWorkbookRules,
  __testApplyWorkKpiRules: applyWorkKpiRules,
  __testDefaultWorkKpiConfig: defaultKpiConfig,
  __testBuildPilotWorkPlanSeedRecords: buildPilotWorkPlanSeedRecords,
  __testEmptyState: emptyState
} = require("../server");

const baseUrl = process.env.SMOKE_URL || "http://localhost:3100";
const chromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];
const executablePath = process.env.SMOKE_BROWSER || chromePaths.find(fs.existsSync);

if (!executablePath) throw new Error("Không tìm thấy Chrome/Edge để chạy sitemap UI smoke.");

(async () => {
  const state = await buildFixtureState();
  const browser = await chromium.launch({ executablePath, headless: true });
  const desktopShot = path.join(os.tmpdir(), "squad2-sitemap-desktop.png");
  const collapsedSidebarShot = path.join(os.tmpdir(), "squad2-sidebar-collapsed.png");
  const dashboardShot = path.join(os.tmpdir(), "squad2-work-dashboard.png");
  const taskMasterShot = path.join(os.tmpdir(), "squad2-task-master.png");
  const multiSelectShot = path.join(os.tmpdir(), "squad2-work-people-multiselect.png");
  const inputsShot = path.join(os.tmpdir(), "squad2-work-inputs.png");
  const personnelMapShot = path.join(os.tmpdir(), "squad2-personnel-map.png");
  const memberKpiShot = path.join(os.tmpdir(), "squad2-member-kpi.png");
  const groupShot = path.join(os.tmpdir(), "squad2-group-t02.png");
  const dailyShot = path.join(os.tmpdir(), "squad2-daily-control.png");
  const mobileShot = path.join(os.tmpdir(), "squad2-sitemap-mobile.png");
  const mobileInputsShot = path.join(os.tmpdir(), "squad2-work-inputs-mobile.png");
  try {
    const desktop = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await mockApi(desktop, state);
    const page = await desktop.newPage();
    const errors = collectErrors(page);
    await page.goto(`${baseUrl}/#work/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('.navigation-tree [data-route="work/dashboard"]', { state: "visible", timeout: 15000 });

    const sidebarToggle = page.locator('[data-action="toggle-sidebar-collapse"]');
    if (!await sidebarToggle.isVisible() || await sidebarToggle.locator("svg").count() !== 1) {
      throw new Error("Desktop sidebar is missing the visible panel toggle.");
    }
    if (await sidebarToggle.getAttribute("aria-expanded") !== "true") {
      throw new Error("Expanded desktop sidebar toggle has incorrect accessibility state.");
    }
    const expandedLayout = await page.evaluate(() => ({
      sidebar: document.querySelector(".navigation-tree")?.getBoundingClientRect().width || 0,
      main: document.querySelector(".main")?.getBoundingClientRect().width || 0
    }));
    await sidebarToggle.click();
    await page.waitForFunction(() => Math.abs((document.querySelector(".navigation-tree")?.getBoundingClientRect().width || 0) - 64) < 1);
    const collapsedLayout = await page.evaluate(() => ({
      sidebar: document.querySelector(".navigation-tree")?.getBoundingClientRect().width || 0,
      main: document.querySelector(".main")?.getBoundingClientRect().width || 0,
      stored: localStorage.getItem("squad2-sidebar-collapsed")
    }));
    if (collapsedLayout.sidebar !== 64 || collapsedLayout.main <= expandedLayout.main || collapsedLayout.stored !== "true") {
      throw new Error(`Desktop sidebar collapse layout is incorrect: ${JSON.stringify({ expandedLayout, collapsedLayout })}`);
    }
    if (!await sidebarToggle.isVisible() || await sidebarToggle.getAttribute("aria-expanded") !== "false") {
      throw new Error("Collapsed desktop rail does not keep an accessible expand button visible.");
    }
    await page.screenshot({ path: collapsedSidebarShot, fullPage: true });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".navigation-tree.collapsed");
    const persistedToggle = page.locator('[data-action="toggle-sidebar-collapse"]');
    if (!await persistedToggle.isVisible()) throw new Error("Persisted collapsed rail lost its expand button.");
    await persistedToggle.click();
    await page.waitForFunction(() => Math.abs((document.querySelector(".navigation-tree")?.getBoundingClientRect().width || 0) - 258) < 1);
    if (await page.evaluate(() => localStorage.getItem("squad2-sidebar-collapsed")) !== "false") {
      throw new Error("Desktop sidebar expanded state was not persisted.");
    }
    await page.setViewportSize({ width: 1024, height: 768 });
    await assertNoPageOverflow(page, "expanded sidebar laptop");
    await page.locator('[data-action="toggle-sidebar-collapse"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => Math.abs((document.querySelector(".navigation-tree")?.getBoundingClientRect().width || 0) - 64) < 1);
    if (await page.locator(':focus').getAttribute("data-action") !== "toggle-sidebar-collapse") {
      throw new Error("Desktop sidebar toggle lost keyboard focus after collapsing.");
    }
    await assertNoPageOverflow(page, "collapsed sidebar laptop");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => Math.abs((document.querySelector(".navigation-tree")?.getBoundingClientRect().width || 0) - 258) < 1);
    await page.setViewportSize({ width: 1600, height: 1000 });

    const commonSectionToggle = page.locator('[data-sidebar-section="common"]');
    const workSectionToggle = page.locator('[data-sidebar-section="work"]');
    const workGroupToggle = page.locator('[data-sidebar-group="workGroups"]');
    if (await commonSectionToggle.getAttribute("aria-expanded") !== "false"
      || await workSectionToggle.getAttribute("aria-expanded") !== "true"
      || await workGroupToggle.getAttribute("aria-expanded") !== "false") {
      throw new Error("Sidebar không tự mở đúng nhánh của Dashboard công việc.");
    }
    if (await page.locator('.tree-link[aria-current="page"]').count() !== 1
      || !await page.locator('[data-route="work/dashboard"][aria-current="page"]').isVisible()) {
      throw new Error("Sidebar phải chỉ đánh dấu mạnh đúng một màn hình hiện tại.");
    }
    await workGroupToggle.click();
    await page.waitForFunction(() => document.querySelector('[data-sidebar-group="workGroups"]')?.getAttribute("aria-expanded") === "true");
    const stageRoutes = (await page.locator(".tree-stage-route").allTextContents()).map((value) => value.trim());
    if (JSON.stringify(stageRoutes) !== JSON.stringify(["URD", "RSD"])) {
      throw new Error(`Sidebar cần hai màn URD/RSD, nhận ${JSON.stringify(stageRoutes)}.`);
    }
    const uatToggle = page.locator('[data-sidebar-group="uat"]');
    const prePilotToggle = page.locator('[data-sidebar-group="prePilot"]');
    if (await uatToggle.getAttribute("aria-expanded") !== "false"
      || await prePilotToggle.getAttribute("aria-expanded") !== "false") {
      throw new Error("UAT và Pre-Pilot phải thu gọn khi chưa được chọn.");
    }
    await uatToggle.click();
    const uatLabels = (await page.locator("#sidebar-group-uat .tree-link").allTextContents()).map((value) => value.trim());
    if (JSON.stringify(uatLabels) !== JSON.stringify(["1. Kiểm thử chức năng", "2. Kiểm thử luồng"])) {
      throw new Error(`Nhánh UAT chưa đúng cấu trúc: ${JSON.stringify(uatLabels)}.`);
    }
    await prePilotToggle.click();
    if (await uatToggle.getAttribute("aria-expanded") !== "false"
      || await prePilotToggle.getAttribute("aria-expanded") !== "true") {
      throw new Error("UAT/Pre-Pilot chưa hoạt động theo accordion một nhánh mở.");
    }
    const prePilotLabels = (await page.locator("#sidebar-group-prePilot .tree-link").allTextContents()).map((value) => value.trim());
    const expectedPrePilotLabels = [
      "1. HDSD Lending Hub",
      "2. Quy trình tác nghiệp",
      "3. HDSD vận hành",
      "4. Quy định vận hành",
      "5. Tài liệu đào tạo"
    ];
    if (JSON.stringify(prePilotLabels) !== JSON.stringify(expectedPrePilotLabels)) {
      throw new Error(`Nhánh Pre-Pilot chưa đúng cấu trúc: ${JSON.stringify(prePilotLabels)}.`);
    }
    const standaloneLabels = (await page.locator("#sidebar-group-workGroups > .tree-accordion-inner > .tree-link.level-2:not(.tree-stage-route)").allTextContents()).map((value) => value.trim());
    if (JSON.stringify(standaloneLabels) !== JSON.stringify(["Tham gia ý kiến", "Công tác Báo cáo", "Công việc khác"])) {
      throw new Error(`Ba nhóm độc lập chưa đúng cấu trúc: ${JSON.stringify(standaloneLabels)}.`);
    }
    const storedAccordion = await page.evaluate(() => JSON.parse(localStorage.getItem("squad2-sidebar-accordion") || "null"));
    if (storedAccordion?.openSection !== "work"
      || storedAccordion?.openGroups?.workGroups !== true
      || storedAccordion?.openGroups?.uat !== false
      || storedAccordion?.openGroups?.prePilot !== true) {
      throw new Error(`Sidebar chưa ghi nhớ trạng thái accordion: ${JSON.stringify(storedAccordion)}`);
    }
    await workGroupToggle.click();
    await commonSectionToggle.focus();
    await page.keyboard.press("Enter");
    if (await commonSectionToggle.getAttribute("aria-expanded") !== "true"
      || await workSectionToggle.getAttribute("aria-expanded") !== "false") {
      throw new Error("Các khu vực sidebar cùng cấp chưa hoạt động theo accordion.");
    }
    await workSectionToggle.click();

    await assertRoute(page, "work/dashboard", ".work-dashboard-grid");
    await assertNoPageOverflow(page, "dashboard desktop");
    const metricLabels = await page.locator(".work-plan-summary .work-metric span").allTextContents();
    for (const expectedLabel of ["Tổng công việc", "Chưa bắt đầu", "Đang thực hiện", "Quá hạn", "Hoàn thành"]) {
      if (!metricLabels.includes(expectedLabel)) throw new Error(`Thiếu KPI ${expectedLabel}.`);
    }
    if (metricLabels.includes("Chờ phê duyệt")) throw new Error("Dashboard vẫn còn KPI Chờ phê duyệt.");
    await page.screenshot({ path: dashboardShot, fullPage: true });
    await page.locator('[data-action="set-work-metric"][data-work-view="notStarted"]').click();
    await page.waitForSelector('.work-view-tab.active[data-work-view="notStarted"]');
    if (new URL(page.url()).hash !== "#work/task-master") throw new Error("KPI Dashboard không mở Task_Master.");
    await assertRoute(page, "work/task-master", ".standalone-work-items");
    await page.locator('[data-page-size="workItems"]').selectOption("50");
    const visibleWorkOrders = await page.locator('[data-resizable-table="workItems"] tbody tr').evaluateAll((rows) => rows.map((row) => ({
      order: row.cells[0]?.textContent?.trim() || "",
      category: row.cells[2]?.textContent?.trim() || ""
    })));
    const ordersByCategory = new Map();
    visibleWorkOrders.forEach((row) => {
      if (!row.category || !/^\d+$/.test(row.order)) return;
      if (!ordersByCategory.has(row.category)) ordersByCategory.set(row.category, []);
      ordersByCategory.get(row.category).push(Number(row.order));
    });
    const invalidOrder = [...ordersByCategory.values()].some((orders) => orders.some((order, index) => index > 0 && order > orders[index - 1]));
    if (ordersByCategory.size < 2 || invalidOrder || ![...ordersByCategory.values()].some((orders) => orders[0] > 1)) {
      throw new Error(`Công việc chưa xếp mới → cũ và giữ STT gốc: ${JSON.stringify([...ordersByCategory.entries()])}`);
    }
    await page.screenshot({ path: taskMasterShot, fullPage: true });
    await page.locator('[data-action="open-create"]').first().click();
    await page.waitForSelector("#recordForm");
    await assertOptionCount(page, "categoryId", 13);
    await assertOptionCount(page, "status", 4);
    await assertOptionCount(page, "priority", 4);
    await assertFieldLabel(page, "assignees", "Người thực hiện");
    await assertFieldLabel(page, "businessContacts", "Đầu mối nghiệp vụ");
    const assigneeMulti = page.locator('[data-people-key="assignees"]');
    const contactMulti = page.locator('[data-people-key="businessContacts"]');
    if (await assigneeMulti.locator('[data-people-option]').count() < 10
      || await contactMulti.locator('[data-people-option]').count() < 10) {
      throw new Error("Multi-select chưa nạp đủ danh sách thành viên.");
    }
    await assigneeMulti.locator('[data-people-toggle]').click();
    await assigneeMulti.locator('[data-people-option][data-person-email="huyng@bidv.com.vn"]').check();
    await assigneeMulti.locator('[data-people-option][data-person-email="sinhhc@bidv.com.vn"]').check();
    const selectedAssignees = JSON.parse(await page.locator('[name="assignees"]').inputValue());
    if (selectedAssignees.length !== 2) throw new Error("Người thực hiện chưa chọn được nhiều người.");
    await assigneeMulti.locator('[data-people-toggle]').click();
    await contactMulti.locator('[data-people-toggle]').click();
    await contactMulti.locator('[data-people-option][data-person-email="giangnc2@bidv.com.vn"]').check();
    const selectedContacts = JSON.parse(await page.locator('[name="businessContacts"]').inputValue());
    if (selectedContacts.length !== 1) throw new Error("Đầu mối nghiệp vụ chưa lưu được lựa chọn.");
    await page.screenshot({ path: multiSelectShot, fullPage: false });
    await assertFieldLabel(page, "startDate", "Ngày giao việc");
    if (await page.locator('[name="status"] option[value="Chờ phê duyệt"], [name="status"] option[value="Quá hạn"]').count()) {
      throw new Error("Form tạo công việc vẫn cho phép trạng thái đã bị loại bỏ.");
    }
    if (await page.locator('[name="startDate"]').getAttribute("readonly") !== null) {
      throw new Error("Ngày giao việc phải được nhập bình thường khi tạo công việc.");
    }
    await page.locator('[name="status"]').selectOption("Đang thực hiện");
    await page.locator('[name="progress"]').fill("0");
    const invalidSaveStates = await page.locator('#recordForm button[type="submit"]').evaluateAll((buttons) => buttons.map((button) => button.disabled));
    if (!await page.locator("[data-work-status-warning]").isVisible()
      || invalidSaveStates.length !== 2
      || invalidSaveStates.some((disabled) => !disabled)) {
      throw new Error("Form đầy đủ chưa cảnh báo và khóa Lưu khi trạng thái không khớp tiến độ.");
    }
    await page.locator('[name="progress"]').fill("50");
    const validSaveStates = await page.locator('#recordForm button[type="submit"]').evaluateAll((buttons) => buttons.map((button) => button.disabled));
    if (await page.locator("[data-work-status-warning]").isVisible()
      || validSaveStates.some(Boolean)) {
      throw new Error("Form đầy đủ chưa mở lại nút Lưu sau khi trạng thái và tiến độ hợp lệ.");
    }
    if (await page.locator('[name="assigneeEmail"], [name="collaborators"]').count()) {
      throw new Error("Email người thực hiện là field kỹ thuật và không được hiện trong form người dùng.");
    }
    await page.locator('[data-action="close-modal"]').first().click();
    const editWorkItem = page.locator('[data-action="open-edit"]').first();
    if (!await editWorkItem.count()) throw new Error("Task_Master thiếu thao tác sửa để kiểm tra khóa Ngày giao việc.");
    await editWorkItem.click();
    await page.waitForSelector('#recordForm [name="startDate"]');
    if (await page.locator('#recordForm [name="startDate"]').getAttribute("readonly") === null
      || !await page.locator(".field-lock-note").isVisible()) {
      throw new Error("Form sửa chưa khóa và giải thích trường Ngày giao việc.");
    }
    await page.locator('[data-action="close-modal"]').first().click();
    const progressAction = page.locator('[data-action="open-work-progress"]').first();
    if (!await progressAction.count()) throw new Error("Task_Master thiếu form cập nhật tiến độ.");
    await progressAction.click();
    await page.waitForSelector(".work-progress-modal");
    await page.locator('[name="status"]').selectOption("Đang thực hiện");
    await page.locator('[name="progress"]').fill("0");
    if (!await page.locator("[data-work-status-warning]").isVisible()
      || !await page.locator('.work-progress-modal button[type="submit"]').isDisabled()) {
      throw new Error("Form cập nhật tiến độ chưa chặn cặp trạng thái và phần trăm sai.");
    }
    await page.locator('[name="progress"]').fill("25");
    if (await page.locator("[data-work-status-warning]").isVisible()
      || await page.locator('.work-progress-modal button[type="submit"]').isDisabled()) {
      throw new Error("Form cập nhật tiến độ chưa mở lại Lưu sau khi dữ liệu hợp lệ.");
    }
    await page.locator('[data-action="close-modal"]').first().click();
    await assertRoute(page, "work/inputs", ".input-catalog-grid");
    if (!await page.locator(".deadline-email-panel").isVisible()) {
      throw new Error("Thông tin đầu vào thiếu khu quản trị nhắc deadline qua Gmail.");
    }
    if (await page.locator(".email-rule-strip > span").count() !== 3
      || await page.locator('#deadlineEmailSettingsForm input[readonly]').inputValue() !== "maitanthanh1998@gmail.com") {
      throw new Error("Khu nhắc deadline chưa hiển thị đúng tài khoản gửi và ba quy tắc lịch.");
    }
    await page.locator('[data-action="preview-deadline-email"]').click();
    await page.waitForSelector(".email-preview-summary");
    if ((await page.locator(".email-preview-summary strong").allTextContents()).join("|") !== "2|3|1|0") {
      throw new Error("Preview email deadline không hiển thị đúng số người/việc.");
    }
    await page.screenshot({ path: inputsShot, fullPage: true });
    await assertRoute(page, "common/personnel/list", "[data-resizable-table=personnel]");
    await assertRoute(page, "common/personnel/map", ".personnel-map");
    if (await page.locator(".personnel-map .member-avatar img").count() !== 1) {
      throw new Error("Sơ đồ nhân sự không hiển thị avatar tài khoản đã được cấu hình.");
    }
    if (await page.locator(".personnel-map .member-avatar:not(.has-image)").count() < 1) {
      throw new Error("Sơ đồ nhân sự thiếu fallback chữ viết tắt cho tài khoản chưa có avatar.");
    }
    const huyCard = page.locator(".personnel-map .member-card", { hasText: "Nguyễn Gia Huy" });
    if ((await huyCard.locator(".member-avatar").textContent() || "").trim() !== "GH") {
      throw new Error("Avatar chữ phải lấy hai thành phần cuối của họ tên: Nguyễn Gia Huy cần hiển thị GH.");
    }
    const thanhCard = page.locator(".personnel-map .member-card", { hasText: "Mai Tấn Thành" });
    if (await thanhCard.locator(".member-avatar.has-image img").count() !== 1
      || (await thanhCard.locator(".member-avatar").textContent() || "").trim()) {
      throw new Error("Người đã có ảnh đại diện phải tiếp tục dùng ảnh, không thay bằng chữ viết tắt.");
    }
    const avatarAlignment = await page.locator(".personnel-map .member-avatar:not(.has-image)").evaluateAll((avatars) => avatars.map((avatar) => {
      const style = getComputedStyle(avatar);
      const avatarRect = avatar.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(avatar);
      const textRect = range.getBoundingClientRect();
      return {
        text: avatar.textContent?.trim() || "",
        display: style.display,
        alignItems: style.alignItems,
        justifyContent: style.justifyContent,
        offsetX: Math.abs((avatarRect.left + avatarRect.width / 2) - (textRect.left + textRect.width / 2)),
        offsetY: Math.abs((avatarRect.top + avatarRect.height / 2) - (textRect.top + textRect.height / 2))
      };
    }));
    const misalignedAvatar = avatarAlignment.find((avatar) => !["flex", "inline-flex"].includes(avatar.display)
      || avatar.alignItems !== "center"
      || avatar.justifyContent !== "center"
      || avatar.offsetX > 2
      || avatar.offsetY > 2);
    if (misalignedAvatar) {
      throw new Error(`Chữ viết tắt trong avatar chưa căn giữa: ${JSON.stringify(misalignedAvatar)}`);
    }
    await page.screenshot({ path: personnelMapShot, fullPage: true });
    await assertRoute(page, "common/personnel/kpi", ".kpi-config-grid");
    await assertRoute(page, "work/member-kpi", ".member-kpi-table");
    await page.screenshot({ path: memberKpiShot, fullPage: true });
    await assertRoute(page, "common/guide", ".guide-page");
    await assertRoute(page, "work/group/pilot-t01/dashboard", ".t01-module-tabs");
    await page.waitForSelector(".sheet-dashboard");
    const t01MetricSignatures = [];
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Tổng chức năng", "Tổng testcase", "TC Passed", "TC Failed", "Đang xử lý", "Hoàn thành UAT"]));
    await assertRoute(page, "work/group/pilot-t01/defectDashboard", ".defect-dashboard-panel");
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Tổng defect", "Đang mở", "Đã xử lý", "Tỷ lệ xử lý", "Blocker/Critical", "Reopen"]));
    await assertRoute(page, "work/group/pilot-t01/features", '[data-resizable-table="features"]');
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Tổng chức năng", "Chưa bắt đầu", "Đang thực hiện", "Chưa bàn giao", "Quá hạn", "Hoàn thành"]));
    const inProgressValue = Number((await page.locator('[data-action="set-t01-metric"][data-t01-view="inProgress"] strong').textContent() || "").trim());
    if (inProgressValue !== 3) throw new Error(`KPI DM_ChucNang Đang thực hiện cần 3, nhận ${inProgressValue}.`);
    await page.locator('[data-action="set-t01-metric"][data-t01-view="inProgress"]').click();
    const t01FilteredRows = await page.locator('[data-resizable-table="features"] tbody tr').count();
    if (t01FilteredRows !== 3) throw new Error(`KPI T01 Đang thực hiện cần lọc 3 chức năng, nhận ${t01FilteredRows}.`);
    await assertFeatureTableHorizontalAccess(page, "desktop");
    await assertRoute(page, "work/group/pilot-t01/handoffs", '[data-resizable-table="handoffs"]');
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Tổng User Story", "Đã bàn giao", "Chưa bàn giao", "Chưa bắt đầu UAT", "Đang UAT", "Hoàn thành UAT"]));
    await page.locator('[data-action="set-t01-metric"][data-t01-view="notHandedOff"]').click();
    if (await page.locator('[data-resizable-table="handoffs"] tbody tr').count() !== 1) throw new Error("KPI Lich_BG_US Chưa bàn giao lọc sai dữ liệu.");
    await assertRoute(page, "work/group/pilot-t01/plans", '[data-resizable-table="plans"]');
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Tổng chức năng", "Tổng testcase", "Đã phân công", "Chưa phân công", "Đang kiểm thử", "Hoàn thành"]));
    await assertT01MetricRowFilter(page, "plans", "unassigned", 1);
    await assertRoute(page, "work/group/pilot-t01/daily", '[data-resizable-table="daily"]');
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Lượt cập nhật", "Tổng testcase", "TC Passed", "TC Failed", "Dòng có lỗi mở", "Có blocker"]));
    if (!await page.locator(".module-data-tools").isVisible()) {
      throw new Error("Điều hành hằng ngày thiếu thanh tìm kiếm/lọc chuyên dụng.");
    }
    const initialDailyDates = await page.locator('[data-resizable-table="daily"] tbody tr td:first-child').allTextContents();
    if (!initialDailyDates[0]?.includes("14/7/2026")) {
      throw new Error(`Điều hành hằng ngày chưa sắp xếp ngày mới nhất trước: ${JSON.stringify(initialDailyDates)}`);
    }
    const firstDailyTester = (await page.locator('[data-resizable-table="daily"] tbody tr').first().locator("td").nth(4).textContent() || "").trim();
    if (firstDailyTester !== "T2 – Huỳnh Công Sinh") {
      throw new Error(`Tester chưa hiển thị mã kèm họ tên: ${firstDailyTester || "trống"}.`);
    }
    const testerFilterLabel = await page.locator('[data-filter-key="tester"] option[value="5"]').textContent();
    if ((testerFilterLabel || "").trim() !== "T5 – Trần Đình Tuấn") {
      throw new Error("Bộ lọc Tester chưa hiển thị danh tính T5 – Trần Đình Tuấn.");
    }
    await page.locator("#searchInput").fill("Huỳnh Công Sinh");
    if (await page.locator('[data-resizable-table="daily"] tbody tr').count() !== 1) {
      throw new Error("Tìm Điều hành hằng ngày theo tên Tester trả sai kết quả.");
    }
    await page.locator('[data-action="reset-filters"]').click();
    await page.locator('[data-filter-key="date"]').fill("2026-07-13");
    await page.locator('[data-filter-key="date"]').press("Tab");
    if (await page.locator('[data-resizable-table="daily"] tbody tr').count() !== 1) {
      throw new Error("Lọc Điều hành hằng ngày theo ngày trả sai kết quả.");
    }
    await page.locator('[data-action="reset-filters"]').click();
    await page.locator('[data-action="open-create"]').first().click();
    await page.waitForSelector("#recordForm");
    const dailyRequiredFields = await page.locator('[name="date"], [name="tester"]').evaluateAll((fields) => fields.map((field) => field.required));
    if (dailyRequiredFields.length !== 2 || dailyRequiredFields.some((required) => !required)) {
      throw new Error("Form Điều hành hằng ngày chưa bắt buộc Ngày và Tester.");
    }
    if ((await page.locator('[name="tester"] option[value="5"]').textContent() || "").trim() !== "T5 – Trần Đình Tuấn") {
      throw new Error("Form Điều hành hằng ngày chưa dùng dropdown Tester có họ tên.");
    }
    await page.locator('[data-action="close-modal"]').first().click();
    await assertNoPageOverflow(page, "Điều hành hằng ngày desktop");
    await page.screenshot({ path: dailyShot, fullPage: true });
    await assertT01MetricRowFilter(page, "daily", "blocker", 1);
    await assertRoute(page, "work/group/pilot-t01/defects", ".secondary-tabs");
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Tổng defect", "Open", "In Progress", "Pending/Reopen", "Resolved/SIT Pass", "Closed/Cancelled"]));
    await assertT01MetricRowFilter(page, "defects", "pendingOrReopen", 1);
    await assertRoute(page, "work/group/pilot-t01/defectSummary", ".secondary-tabs .active");
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Tổng User Story", "US có lỗi", "Tổng lỗi", "Lỗi đang mở", "Lỗi đã xử lý", "Lỗi nghiêm trọng"]));
    await assertT01MetricRowFilter(page, "defectSummary", "hasBugs", 5);
    await assertRoute(page, "work/group/pilot-t01/weekly", '[data-resizable-table="weekly"]');
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Số tuần", "Coverage TB", "Pass Rate TB", "Blocker Open", "Critical Open", "Tuần chưa đạt"]));
    await assertT01MetricRowFilter(page, "weekly", "notMet", 1);
    await assertRoute(page, "work/group/pilot-t01/readiness", '[data-resizable-table="readiness"]');
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Tổng Sprint", "Coverage TB", "Pass Rate TB", "Có thể GO", "NO GO", "Sprint còn lỗi nặng"]));
    await assertT01MetricRowFilter(page, "readiness", "noGo", 1);
    await assertRoute(page, "work/group/pilot-t01/matrix", '[data-resizable-table="matrix"]');
    t01MetricSignatures.push(await assertT01MetricLabels(page, ["Nhóm chức năng", "Tổng lượt tham gia", "Tổng mục tiêu", "Tester có tham gia", "Nhóm đạt", "Thiếu luân chuyển"]));
    await assertT01MetricRowFilter(page, "matrix", "insufficient", 1);
    if (new Set(t01MetricSignatures).size !== t01MetricSignatures.length) throw new Error("Các sheet T01 còn dùng trùng bộ dashboard KPI.");
    await assertRoute(page, "work/group/pilot-t03", ".standalone-work-items");
    if (await page.locator('[data-sidebar-group="prePilot"]').getAttribute("aria-expanded") !== "true"
      || await page.locator('[data-sidebar-group="uat"]').getAttribute("aria-expanded") !== "false") {
      throw new Error("Route T03 chưa tự mở đúng nhánh Pre-Pilot.");
    }
    const firstLocalOrder = (await page.locator('[data-resizable-table="workItems"] tbody tr').first().locator("td").first().textContent() || "").trim();
    if (firstLocalOrder !== "22") throw new Error(`Công việc mới nhất của T03 phải nằm trên cùng với STT 22, nhận ${firstLocalOrder || "trống"}.`);
    const firstWorkTitle = page.locator('.work-title-link[data-action="open-edit"]').first();
    if (!await firstWorkTitle.isVisible()) throw new Error("Tên công việc chưa hiển thị thành liên kết sửa kế hoạch.");
    await firstWorkTitle.click();
    if ((await page.locator("#recordModal .modal-head h2").textContent() || "").trim() !== "Sửa Kế hoạch") {
      throw new Error("Liên kết Tên công việc chưa mở đúng màn Sửa Kế hoạch.");
    }
    await page.locator('[data-action="close-modal"]').first().click();

    await page.locator('[data-action="open-work-export"]').click();
    await page.locator('#workExportForm [name="dateField"]').selectOption("dueDate");
    await page.locator('#workExportForm [name="fromDate"]').fill("2026-07-01");
    await page.locator('#workExportForm [name="toDate"]').fill("2026-07-31");
    const exportCount = Number((await page.locator("[data-work-export-count]").textContent() || "0").trim());
    if (exportCount !== 22) throw new Error(`Xuất Excel T03 cần lọc 22 việc theo Deadline tháng 7, nhận ${exportCount}.`);
    await page.locator('#workExportForm button[type="submit"]').click();
    await page.waitForSelector("#workExportForm", { state: "detached" });
    if (!String(state.__lastWorkExportUrl || "").includes("categoryId=pilot-t03")
      || !String(state.__lastWorkExportUrl || "").includes("dateField=dueDate")
      || !String(state.__lastWorkExportUrl || "").includes("fromDate=2026-07-01")
      || !String(state.__lastWorkExportUrl || "").includes("toDate=2026-07-31")) {
      throw new Error(`Xuất Excel chưa gửi đúng phạm vi: ${state.__lastWorkExportUrl || "trống"}.`);
    }
    await page.screenshot({ path: groupShot, fullPage: true });

    await assertRoute(page, "work/group/delivery-urd", ".standalone-work-items");
    if (!(await page.locator(".screen-title").textContent() || "").includes("SQ2-URD · URD")) {
      throw new Error("Màn URD chưa dùng đầy đủ bố cục nhóm công việc.");
    }
    if (!await page.locator('[data-action="open-work-export"]').isVisible()) throw new Error("Màn URD thiếu chức năng xuất Excel.");
    await assertRoute(page, "work/group/delivery-rsd", ".standalone-work-items");
    if (!(await page.locator(".screen-title").textContent() || "").includes("SQ2-RSD · RSD")) {
      throw new Error("Màn RSD chưa dùng đầy đủ bố cục nhóm công việc.");
    }

    const sidebarScrollBefore = await page.locator(".sidebar-menu").evaluate((sidebar) => {
      sidebar.scrollTop = sidebar.scrollHeight;
      return sidebar.scrollTop;
    });
    await page.locator('[data-route="work/group/pilot-t09"]').click();
    await page.waitForSelector(".standalone-work-items");
    const sidebarScrollAfter = await page.locator(".sidebar-menu").evaluate((sidebar) => sidebar.scrollTop);
    if (sidebarScrollBefore > 0 && sidebarScrollAfter < Math.max(1, sidebarScrollBefore - 4)) {
      throw new Error(`Sidebar bị nhảy lên trên: ${sidebarScrollBefore} -> ${sidebarScrollAfter}.`);
    }

    const categoryLinks = await page.locator(".tree-category-list .tree-link").count();
    if (categoryLinks !== 12) throw new Error(`Sidebar cần đúng 12 nhóm hệ thống, nhận ${categoryLinks}.`);
    if (await page.locator('[data-route*="DS_US"], [data-route*="DS.Loi"]').count()) {
      throw new Error("DS_US/DS.Loi không được hiện trong navigation.");
    }
    await page.goto(`${baseUrl}/#work/group/pilot-t01/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".sheet-dashboard");
    if (await page.locator('[data-sidebar-group="uat"]').getAttribute("aria-expanded") !== "true"
      || await page.locator('[data-sidebar-group="prePilot"]').getAttribute("aria-expanded") !== "false") {
      throw new Error("Tải trực tiếp route T01 chưa tự mở duy nhất nhánh UAT.");
    }
    await page.screenshot({ path: desktopShot, fullPage: true });
    if (errors.length) throw new Error(`Lỗi trình duyệt desktop: ${errors.join(" | ")}`);
    await desktop.close();

    const scopedEditor = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await mockScopedEditorApi(scopedEditor, state);
    const scopedEditorPage = await scopedEditor.newPage();
    const scopedEditorErrors = collectErrors(scopedEditorPage);
    await scopedEditorPage.goto(`${baseUrl}/#work/group/pilot-t07`, { waitUntil: "domcontentloaded" });
    await scopedEditorPage.waitForSelector('[data-resizable-table="workItems"] tbody tr', { timeout: 15000 });
    const t07Rows = await scopedEditorPage.locator('[data-resizable-table="workItems"] tbody tr').count();
    const expectedT07Rows = state.workItems.filter((row) => row.categoryId === "pilot-t07").length;
    if (t07Rows !== expectedT07Rows) throw new Error(`T07 scoped editor expected ${expectedT07Rows} rows, received ${t07Rows}.`);
    if (await scopedEditorPage.locator('.row-actions [data-action="open-edit"]').count() !== t07Rows) {
      throw new Error("T07 scoped editor cannot fully edit every T07 work item.");
    }
    if (await scopedEditorPage.locator('.work-title-link[data-action="open-edit"]').count() !== t07Rows) {
      throw new Error("T07 scoped editor is missing work-title edit links.");
    }
    if (await scopedEditorPage.locator('[data-action="open-work-progress"]').count() !== t07Rows) {
      throw new Error("T07 scoped editor cannot update progress for every T07 work item.");
    }
    if (await scopedEditorPage.locator('[data-action="delete-row"], .permission-lock').count()) {
      throw new Error("T07 scoped editor unexpectedly received delete access or a locked row.");
    }
    await scopedEditorPage.goto(`${baseUrl}/#work/group/pilot-t08`, { waitUntil: "domcontentloaded" });
    await scopedEditorPage.waitForSelector('[data-resizable-table="workItems"] tbody tr', { timeout: 15000 });
    const t08Rows = await scopedEditorPage.locator('[data-resizable-table="workItems"] tbody tr').count();
    if (!t08Rows || await scopedEditorPage.locator('.permission-lock').count() !== t08Rows) {
      throw new Error("T07 scoped editor has unexpected edit access outside T07.");
    }
    if (await scopedEditorPage.locator('[data-action="open-edit"], [data-action="open-work-progress"], [data-action="delete-row"]').count()) {
      throw new Error("T07 scoped editor action buttons leaked into T08.");
    }
    if (scopedEditorErrors.length) throw new Error(`Scoped editor browser errors: ${scopedEditorErrors.join(" | ")}`);
    await scopedEditor.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await mobile.addInitScript(() => localStorage.setItem("squad2-sidebar-collapsed", "true"));
    await mockApi(mobile, state);
    const mobilePage = await mobile.newPage();
    const mobileErrors = collectErrors(mobilePage);
    await mobilePage.goto(`${baseUrl}/#work/dashboard`, { waitUntil: "domcontentloaded" });
    await mobilePage.waitForSelector(".mobile-menu-btn", { timeout: 15000 });
    await mobilePage.locator(".mobile-menu-btn").click();
    await mobilePage.waitForSelector(".navigation-tree.mobile-open");
    if (!await mobilePage.locator(".sidebar-brand strong").isVisible()) {
      throw new Error("Mobile drawer inherited the desktop collapsed labels.");
    }
    if (!await mobilePage.locator(".sidebar-mobile-close").isVisible() || await mobilePage.locator(".sidebar-collapse-toggle").isVisible()) {
      throw new Error("Mobile drawer does not expose the dedicated close control.");
    }
    const mobileDrawerWidth = await mobilePage.locator(".navigation-tree").evaluate((sidebar) => sidebar.getBoundingClientRect().width);
    if (mobileDrawerWidth < 250) throw new Error(`Mobile drawer remained collapsed at ${mobileDrawerWidth}px.`);
    await mobilePage.locator('[data-sidebar-group="workGroups"]').click();
    await mobilePage.locator('[data-sidebar-group="prePilot"]').click();
    if (!await mobilePage.locator('#sidebar-group-prePilot .tree-link[data-route="work/group/pilot-t03"]').isVisible()) {
      throw new Error("Mobile drawer không mở được nhóm con Pre-Pilot.");
    }
    await mobilePage.waitForTimeout(300);
    await mobilePage.screenshot({ path: mobileShot, fullPage: true });
    await mobilePage.locator(".sidebar-mobile-close").click();
    await mobilePage.waitForSelector(".navigation-tree:not(.mobile-open)", { state: "attached" });
    if (await mobilePage.locator(".navigation-tree").isVisible()) throw new Error("Mobile drawer remained visible after using its close button.");
    await mobilePage.locator(".mobile-menu-btn").click();
    await mobilePage.waitForSelector(".navigation-tree.mobile-open");
    await mobilePage.keyboard.press("Escape");
    await mobilePage.waitForSelector(".navigation-tree:not(.mobile-open)", { state: "attached" });
    if (await mobilePage.locator(".navigation-tree").isVisible()) throw new Error("Mobile drawer remained visible after pressing Escape.");
    await mobilePage.waitForFunction(() => document.querySelector(".mobile-menu-btn") === document.activeElement).catch(() => {});
    if (!await mobilePage.locator(".mobile-menu-btn").evaluate((button) => button === document.activeElement)) {
      throw new Error("Escape did not return focus to the mobile sidebar opener.");
    }
    await mobilePage.locator(".mobile-menu-btn").click();
    await mobilePage.waitForSelector(".navigation-tree.mobile-open");
    await mobilePage.locator('[data-route="work/task-master"]').click();
    await mobilePage.waitForSelector(".standalone-work-items");
    if (await mobilePage.locator(".navigation-tree.mobile-open").count()) throw new Error("Mobile drawer không đóng sau khi chọn màn.");
    await assertNoPageOverflow(mobilePage, "Task_Master mobile");
    await mobilePage.goto(`${baseUrl}/#work/group/pilot-t01/features`, { waitUntil: "domcontentloaded" });
    await mobilePage.waitForSelector('[data-resizable-table="features"]');
    await assertFeatureTableHorizontalAccess(mobilePage, "mobile");
    await assertNoPageOverflow(mobilePage, "DM_ChucNang mobile");
    await mobilePage.goto(`${baseUrl}/#work/inputs`, { waitUntil: "domcontentloaded" });
    await mobilePage.waitForSelector(".deadline-email-panel");
    await assertNoPageOverflow(mobilePage, "Nhac deadline mobile");
    if (!await mobilePage.locator(".email-rule-strip").isVisible()
      || !await mobilePage.locator('[data-action="preview-deadline-email"]').isVisible()) {
      throw new Error("Mobile deadline panel is missing its rules or preview action.");
    }
    await mobilePage.screenshot({ path: mobileInputsShot, fullPage: true });
    if (mobileErrors.length) throw new Error(`Lỗi trình duyệt mobile: ${mobileErrors.join(" | ")}`);
    await mobile.close();

    console.log(JSON.stringify({
      ok: true,
      routes: 14,
      categories: categoryLinks,
      desktopScreenshot: desktopShot,
      collapsedSidebarScreenshot: collapsedSidebarShot,
      dashboardScreenshot: dashboardShot,
      taskMasterScreenshot: taskMasterShot,
      multiSelectScreenshot: multiSelectShot,
      inputsScreenshot: inputsShot,
      personnelMapScreenshot: personnelMapShot,
      memberKpiScreenshot: memberKpiShot,
      groupScreenshot: groupShot,
      dailyScreenshot: dailyShot,
      mobileScreenshot: mobileShot,
      mobileInputsScreenshot: mobileInputsShot
    }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});

async function buildFixtureState() {
  const state = emptyState();
  state.personnel = [
    { id: "person-thanh", staffCode: "NV01", name: "Mai Tấn Thành", email: "thanhmt@bidv.com.vn", role: "Điều phối", status: "Hoạt động" },
    { id: "person-huy", staffCode: "NV02", name: "Nguyễn Gia Huy", email: "huyng@bidv.com.vn", role: "Tester", status: "Hoạt động" }
  ];
  state.features = [
    { id: "feature-1", stt: 1, jiraCode: "SQ2-F01", name: "Chức năng chưa bắt đầu", sprint: "Sprint 1", status: "", handoffStatus: "⏯️Chưa bàn giao", totalCases: 10, passedCases: 0, failedCases: 0, completionRate: 0 },
    { id: "feature-2", stt: 2, jiraCode: "SQ2-F02", name: "Chức năng Done RSD", sprint: "Sprint 1", status: "Done RSD", handoffStatus: "⏯️Chưa bàn giao", totalCases: 10, passedCases: 2, failedCases: 1, completionRate: 20 },
    { id: "feature-3", stt: 3, jiraCode: "SQ2-F03", name: "Chức năng Done DEV", sprint: "Sprint 1", status: "Done DEV", handoffStatus: "✅ Đã bàn giao", totalCases: 10, passedCases: 5, failedCases: 1, completionRate: 40 },
    { id: "feature-4", stt: 4, jiraCode: "SQ2-F04", name: "Chức năng Done SIT", sprint: "Sprint 1", status: "Done SIT", handoffStatus: "✅ Đã bàn giao", totalCases: 10, passedCases: 8, failedCases: 2, completionRate: 70 },
    { id: "feature-5", stt: 5, jiraCode: "SQ2-F05", name: "Chức năng Done UAT", sprint: "Sprint 1", status: "Done UAT", handoffStatus: "✅ Đã bàn giao", totalCases: 10, passedCases: 10, failedCases: 0, completionRate: 100 }
  ];
  state.handoffs = [
    { id: "handoff-1", jiraCode: "SQ2-F01", name: "Chức năng chưa bắt đầu", sprint: "Sprint 1", handoffStatus: "⏯️Chưa bàn giao", uatStatus: "Done RSD" },
    { id: "handoff-2", jiraCode: "SQ2-F03", name: "Chức năng Done DEV", sprint: "Sprint 1", uatHandoff: "2026-07-10", handoffStatus: "✅ Đã bàn giao", uatStatus: "Done DEV" },
    { id: "handoff-3", jiraCode: "SQ2-F05", name: "Chức năng Done UAT", sprint: "Sprint 1", uatHandoff: "2026-07-08", handoffStatus: "✅ Đã bàn giao", uatStatus: "Done UAT" }
  ];
  state.plans = [
    { id: "plan-1", code: "SQ2-F01", jiraCode: "SQ2-F01", feature: "Chức năng chưa bắt đầu", uatStatus: "Chưa bắt đầu" },
    { id: "plan-2", code: "SQ2-F03", jiraCode: "SQ2-F03", feature: "Chức năng Done DEV", t1: 20, uatStatus: "Đang kiểm thử", progress: 50 },
    { id: "plan-3", code: "SQ2-F05", jiraCode: "SQ2-F05", feature: "Chức năng Done UAT", t2: 30, uatStatus: "Hoàn thành", progress: 100 }
  ];
  state.daily = [
    { id: "daily-1", date: "2026-07-13", jiraCode: "SQ2-F03", feature: "Chức năng Done DEV", sprint: "Sprint 1", tester: "T1", totalCases: 10, passedCases: 8, failedCases: 2, bugStatus: "Open", maxBugSeverity: "Critical", blocker: "Chờ xử lý lỗi" },
    { id: "daily-2", date: "2026-07-14", jiraCode: "SQ2-F05", feature: "Chức năng Done UAT", sprint: "Sprint 1", tester: "T2", totalCases: 5, passedCases: 5, failedCases: 0, bugStatus: "Resolved", maxBugSeverity: "Minor", blocker: "" }
  ];
  state.defects = [
    { id: "defect-1", stt: 1, bugId: "BUG-1", featureJiraCode: "SQ2-F01", sprint: "Sprint 1", severity: "Critical", status: "Open" },
    { id: "defect-2", stt: 2, bugId: "BUG-2", featureJiraCode: "SQ2-F02", sprint: "Sprint 1", severity: "Major", status: "In Progress" },
    { id: "defect-3", stt: 3, bugId: "BUG-3", featureJiraCode: "SQ2-F03", sprint: "Sprint 1", severity: "Major", status: "Reopen" },
    { id: "defect-4", stt: 4, bugId: "BUG-4", featureJiraCode: "SQ2-F03", sprint: "Sprint 1", severity: "Minor", status: "Resolved" },
    { id: "defect-5", stt: 5, bugId: "BUG-5", featureJiraCode: "SQ2-F04", sprint: "Sprint 1", severity: "Minor", status: "SIT Pass" },
    { id: "defect-6", stt: 6, bugId: "BUG-6", featureJiraCode: "SQ2-F05", sprint: "Sprint 1", severity: "Minor", status: "Closed" }
  ];
  state.weekly = [
    { id: "weekly-1", week: "Tuần 1", sprint: "Sprint 1", assessment: "Đạt có điều kiện" },
    { id: "weekly-2", week: "Tuần 2", sprint: "Sprint 2", assessment: "Chưa đạt" }
  ];
  state.readiness = [
    { id: "readiness-1", sprint: "Sprint 1", decision: "CONDITIONAL GO" },
    { id: "readiness-2", sprint: "Sprint 2", decision: "NO GO" }
  ];
  state.matrix = [
    { id: "matrix-1", group: "Luồng xử lý", t1: 2, t2: 1, target: 3 },
    { id: "matrix-2", group: "Thông tin KH", t1: 1, target: 3 }
  ];
  const now = new Date().toISOString();
  for (const row of buildPilotWorkPlanSeedRecords(now)) state[row.collection].push(row.data);
  if (state.workItems[0]) state.workItems[0].startDate = "2026-07-01";
  state.kpiConfig = [{ ...defaultKpiConfig }];
  state.memberKpiInputs = [];
  applyWorkbookRules(state);
  applyWorkKpiRules(state);
  state.updatedAt = now;
  return state;
}

async function mockApi(context, state) {
  await context.route("**/api/export/work-items?**", (route) => {
    state.__lastWorkExportUrl = route.request().url();
    return route.fulfill({
      status: 200,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      headers: { "Content-Disposition": 'attachment; filename="smoke-work-items.xlsx"' },
      body: Buffer.from("smoke-xlsx")
    });
  });
  await context.route("**/api/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ authenticated: true, user: { id: "smoke-admin", username: "thanhmt", email: "thanhmt@bidv.com.vn", name: "Mai Tấn Thành", role: "admin" } })
  }));
  await context.route("**/api/email-notifications/settings", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      configured: true,
      connected: true,
      accountEmail: "maitanthanh1998@gmail.com",
      expectedSenderEmail: "maitanthanh1998@gmail.com",
      callbackUrl: "http://localhost:3100/api/email-notifications/oauth/callback",
      settings: {
        enabled: true,
        senderEmail: "maitanthanh1998@gmail.com",
        managerEmails: ["yenuth@bidv.com.vn"],
        timeZone: "Asia/Ho_Chi_Minh",
        appBaseUrl: "http://localhost:3100"
      },
      recentLogs: []
    })
  }));
  await context.route("**/api/email-notifications/preview", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      preview: {
        assigneeDigestCount: 2,
        assigneeTaskCount: 3,
        managerOverdueTaskCount: 1,
        missingAssigneeEmailCount: 0
      }
    })
  }));
  await context.route("**/api/state", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state }) }));
  await context.route("**/api/directory/users", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ users: [{
      id: "smoke-admin",
      username: "thanhmt",
      email: "thanhmt@bidv.com.vn",
      name: "Mai Tấn Thành",
      role: "admin",
      avatarData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    }] })
  }));
}

async function mockScopedEditorApi(context, state) {
  const scopedState = JSON.parse(JSON.stringify(state));
  scopedState.workItems = scopedState.workItems.map((row) => {
    const isGroupEditor = row.categoryId === "pilot-t07";
    return {
      ...row,
      _ownership: {
        isOwner: false,
        isLinkedOwner: false,
        isGroupEditor,
        canManage: isGroupEditor,
        canEdit: isGroupEditor,
        canDelete: false
      }
    };
  });
  const user = {
    id: "smoke-phuongbtm",
    username: "phuongbtm",
    email: "phuongbtm@bidv.com.vn",
    name: "Bui Thi Mai Phuong",
    role: "user"
  };
  await context.route("**/api/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ authenticated: true, user })
  }));
  await context.route("**/api/state", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ state: scopedState })
  }));
  await context.route("**/api/directory/users", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ users: [user] })
  }));
}

function collectErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.error(`PAGEERROR: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("favicon")) {
      errors.push(message.text());
      console.error(`CONSOLE: ${message.text()}`);
    }
  });
  return errors;
}

async function assertRoute(page, route, selector) {
  await revealSidebarRoute(page, route);
  await page.locator(`[data-route="${route}"]`).first().click();
  try {
    await page.waitForSelector(selector, { timeout: 10000 });
  } catch (error) {
    const title = await page.locator(".screen-title").textContent().catch(() => "");
    throw new Error(`Route ${route} không hiện ${selector}; URL=${page.url()}; title=${title || "-"}; ${error.message}`);
  }
  const hash = new URL(page.url()).hash.replace(/^#/, "");
  if (hash !== route) throw new Error(`Route ${route} mở sai hash ${hash}.`);
}

async function revealSidebarRoute(page, route) {
  const target = page.locator(`[data-route="${route}"]`).first();
  if (await target.isVisible().catch(() => false)) return;
  const section = route.startsWith("common/") ? "common" : "work";
  const sectionToggle = page.locator(`[data-sidebar-section="${section}"]`);
  if (await sectionToggle.getAttribute("aria-expanded") !== "true") await sectionToggle.click();
  const group = route.startsWith("common/personnel/")
    ? "personnel"
    : route.startsWith("work/group/") ? "workGroups" : null;
  if (group) {
    const groupToggle = page.locator(`[data-sidebar-group="${group}"]`);
    if (await groupToggle.getAttribute("aria-expanded") !== "true") await groupToggle.click();
  }
  const workStage = /^work\/group\/pilot-t0[12](?:\/|$)/.test(route)
    ? "uat"
    : /^work\/group\/pilot-t0[3-7](?:\/|$)/.test(route) ? "prePilot" : null;
  if (workStage) {
    const stageToggle = page.locator(`[data-sidebar-group="${workStage}"]`);
    if (await stageToggle.getAttribute("aria-expanded") !== "true") await stageToggle.click();
  }
}

async function assertOptionCount(page, name, expected) {
  const count = await page.locator(`select[name="${name}"] option`).count();
  if (count !== expected) throw new Error(`Dropdown ${name} cần ${expected} lựa chọn (gồm lựa chọn trống), nhận ${count}.`);
}

async function assertFieldLabel(page, name, expected) {
  const label = (await page.locator(`.field:has([name="${name}"]) > label`).textContent() || "").trim();
  if (label !== expected) throw new Error(`Field ${name} cần nhãn "${expected}", nhận "${label}".`);
}

async function assertT01MetricLabels(page, expected) {
  const labels = (await page.locator(".t01-context-summary .work-metric span").allTextContents()).map((label) => label.trim());
  if (JSON.stringify(labels) !== JSON.stringify(expected)) {
    throw new Error(`Dashboard KPI không đúng ngữ cảnh: cần ${JSON.stringify(expected)}, nhận ${JSON.stringify(labels)}.`);
  }
  return labels.join("|");
}

async function assertT01MetricRowFilter(page, collection, view, expectedRows) {
  const metric = page.locator(`[data-action="set-t01-metric"][data-t01-view="${view}"]`);
  await metric.click();
  if (!(await metric.getAttribute("class")).includes("active")) {
    throw new Error(`KPI ${collection}:${view} không được đánh dấu đang lọc.`);
  }
  const rowCount = await page.locator(`[data-resizable-table="${collection}"] tbody tr`).count();
  if (rowCount !== expectedRows) {
    throw new Error(`KPI ${collection}:${view} cần lọc ${expectedRows} dòng, nhận ${rowCount}.`);
  }
}

async function assertFeatureTableHorizontalAccess(page, label) {
  const tableSelector = '[data-resizable-table="features"]';
  const metrics = await page.locator(tableSelector).evaluate((table) => {
    const viewport = table.closest('[data-table-scrollbar="main"]');
    const headers = [...table.querySelectorAll('thead th[data-column-index]')];
    const stickyHeaders = headers.filter((header) => header.classList.contains("sticky-col"));
    return {
      columnCount: headers.length,
      stickyCount: stickyHeaders.length,
      stickyWidth: stickyHeaders.reduce((total, header) => total + header.getBoundingClientRect().width, 0),
      viewportWidth: viewport?.clientWidth || 0,
      maxScrollLeft: viewport ? viewport.scrollWidth - viewport.clientWidth : 0
    };
  });

  if (metrics.columnCount !== 21) {
    throw new Error(`DM_ChucNang ${label} expected 21 columns, received ${metrics.columnCount}.`);
  }
  if (metrics.stickyCount > 4 || metrics.stickyWidth > metrics.viewportWidth * 0.5 + 2) {
    throw new Error(`DM_ChucNang ${label} sticky columns hide the table: ${JSON.stringify(metrics)}.`);
  }
  if (metrics.maxScrollLeft <= 0) {
    throw new Error(`DM_ChucNang ${label} has no horizontal scroll range.`);
  }

  const lateColumnVisible = await page.locator(tableSelector).evaluate(async (table) => {
    const viewport = table.closest('[data-table-scrollbar="main"]');
    const lateHeader = table.querySelector('thead th[data-column-key="uatWarning"]');
    if (!viewport || !lateHeader) return false;
    viewport.scrollLeft = viewport.scrollWidth;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const viewportRect = viewport.getBoundingClientRect();
    const headerRect = lateHeader.getBoundingClientRect();
    return headerRect.left < viewportRect.right && headerRect.right > viewportRect.left;
  });
  if (!lateColumnVisible) {
    throw new Error(`DM_ChucNang ${label} cannot scroll to the UAT warning column.`);
  }
}

async function assertNoPageOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  if (dimensions.width > dimensions.viewport + 1) {
    throw new Error(`${label} tràn ngang trang: ${dimensions.width}px > ${dimensions.viewport}px.`);
  }
}
