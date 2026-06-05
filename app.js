const STORAGE_KEY = "squad2_uat_command_center_v1";

const e = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

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

const statusOptions = [
    "Chưa bắt đầu",
    "Đang kiểm thử",
    "Chờ fix",
    "Retest",
    "Hoàn thành",
    "Tạm hoãn"
];

const priorityOptions = ["Critical", "Cao", "Trung bình", "Thấp"];
const decisionOptions = ["Chưa quyết định", "Sẵn sàng", "Có điều kiện", "Chưa sẵn sàng"];
const assessmentOptions = ["Tốt", "Cần theo dõi", "Rủi ro", "Blocker"];

const modules = {
    features: {
        label: "Danh mục chức năng",
        shortLabel: "Chức năng",
        icon: "fa-layer-group",
        collection: "features",
        description: "Quản lý phạm vi UAT, chủ quản nghiệp vụ, ưu tiên và tester.",
        emptyIcon: "fa-list-check",
        emptyTitle: "Chưa có chức năng UAT",
        emptyText: "Danh mục sẽ hiển thị tại đây sau khi có bản ghi.",
        fields: [
            { key: "code", label: "Mã chức năng", type: "text", required: true },
            { key: "sprint", label: "Sprint", type: "text" },
            { key: "name", label: "Tên chức năng", type: "text", required: true, full: true },
            { key: "group", label: "Nhóm chức năng", type: "select", options: functionGroups },
            { key: "owner", label: "Chủ quản NV", type: "text" },
            { key: "handoffDate", label: "Ngày bàn giao UAT", type: "date" },
            { key: "priority", label: "Mức độ ưu tiên", type: "select", options: priorityOptions },
            { key: "status", label: "Trạng thái", type: "select", options: statusOptions },
            { key: "testerMain", label: "Tester chính", type: "text" },
            { key: "testerSupport", label: "Tester hỗ trợ", type: "text" }
        ],
        filters: [
            { key: "sprint", label: "Sprint" },
            { key: "group", label: "Nhóm" },
            { key: "status", label: "Trạng thái" }
        ],
        columns: [
            { key: "code", label: "Mã", width: "110px", render: (row) => tag(row.code, "teal") },
            { key: "name", label: "Tên chức năng", width: "240px", render: (row) => strongText(row.name, row.group) },
            { key: "sprint", label: "Sprint", width: "110px" },
            { key: "owner", label: "Chủ quản", width: "140px" },
            { key: "handoffDate", label: "Bàn giao", width: "120px", render: (row) => formatDate(row.handoffDate) },
            { key: "priority", label: "Ưu tiên", width: "110px", render: (row) => renderPriority(row.priority) },
            { key: "status", label: "Trạng thái", width: "140px", render: (row) => renderStatus(row.status) },
            { key: "testerMain", label: "Tester", width: "130px" }
        ]
    },
    plans: {
        label: "Kế hoạch Sprint",
        shortLabel: "Sprint Plan",
        icon: "fa-calendar-days",
        collection: "plans",
        description: "Lịch kiểm thử theo sprint, chức năng, chủ quản và mốc T1-T6.",
        emptyIcon: "fa-calendar-plus",
        emptyTitle: "Chưa có kế hoạch Sprint",
        emptyText: "Kế hoạch sẽ hiển thị tại đây sau khi có bản ghi.",
        fields: [
            { key: "sprint", label: "Sprint", type: "text", required: true },
            { key: "feature", label: "Chức năng", type: "text", required: true, full: true },
            { key: "owner", label: "Chủ quản", type: "text" },
            { key: "t1", label: "T1", type: "date" },
            { key: "t2", label: "T2", type: "date" },
            { key: "t3", label: "T3", type: "date" },
            { key: "t4", label: "T4", type: "date" },
            { key: "t5", label: "T5", type: "date" },
            { key: "t6", label: "T6", type: "date" },
            { key: "note", label: "Ghi chú", type: "textarea", full: true }
        ],
        filters: [
            { key: "sprint", label: "Sprint" },
            { key: "owner", label: "Chủ quản" }
        ],
        columns: [
            { key: "sprint", label: "Sprint", width: "110px", render: (row) => tag(row.sprint, "teal") },
            { key: "feature", label: "Chức năng", width: "260px", render: (row) => strongText(row.feature, row.note) },
            { key: "owner", label: "Chủ quản", width: "140px" },
            { key: "t1", label: "T1", width: "104px", render: (row) => formatDate(row.t1) },
            { key: "t2", label: "T2", width: "104px", render: (row) => formatDate(row.t2) },
            { key: "t3", label: "T3", width: "104px", render: (row) => formatDate(row.t3) },
            { key: "t4", label: "T4", width: "104px", render: (row) => formatDate(row.t4) },
            { key: "t5", label: "T5", width: "104px", render: (row) => formatDate(row.t5) },
            { key: "t6", label: "T6", width: "104px", render: (row) => formatDate(row.t6) }
        ]
    },
    matrix: {
        label: "Ma trận phân công",
        shortLabel: "Ma trận",
        icon: "fa-table-cells-large",
        collection: "matrix",
        description: "Phân bổ nhóm chức năng theo các mốc T1-T6.",
        emptyIcon: "fa-grip",
        emptyTitle: "Chưa có ma trận phân công",
        emptyText: "Ma trận sẽ hiển thị tại đây sau khi có bản ghi.",
        fields: [
            { key: "group", label: "Nhóm chức năng", type: "select", options: functionGroups, required: true },
            { key: "t1", label: "T1", type: "text" },
            { key: "t2", label: "T2", type: "text" },
            { key: "t3", label: "T3", type: "text" },
            { key: "t4", label: "T4", type: "text" },
            { key: "t5", label: "T5", type: "text" },
            { key: "t6", label: "T6", type: "text" }
        ],
        filters: [
            { key: "group", label: "Nhóm" }
        ],
        columns: [
            { key: "group", label: "Nhóm chức năng", width: "190px", render: (row) => tag(row.group, "teal") },
            { key: "t1", label: "T1", width: "120px" },
            { key: "t2", label: "T2", width: "120px" },
            { key: "t3", label: "T3", width: "120px" },
            { key: "t4", label: "T4", width: "120px" },
            { key: "t5", label: "T5", width: "120px" },
            { key: "t6", label: "T6", width: "120px" }
        ]
    },
    daily: {
        label: "Theo dõi Daily UAT",
        shortLabel: "Daily UAT",
        icon: "fa-clipboard-check",
        collection: "daily",
        description: "Ghi nhận testcase, tiến độ, lỗi nghiêm trọng và vướng mắc theo ngày.",
        emptyIcon: "fa-clipboard-list",
        emptyTitle: "Chưa có nhật ký UAT",
        emptyText: "Daily tracking sẽ hiển thị tại đây sau khi có bản ghi.",
        fields: [
            { key: "date", label: "Ngày", type: "date", required: true },
            { key: "feature", label: "Chức năng", type: "text", required: true, full: true },
            { key: "owner", label: "Chủ quản", type: "text" },
            { key: "tester", label: "Tester", type: "text" },
            { key: "totalCases", label: "Tổng testcase", type: "number" },
            { key: "executedCases", label: "Đã thực hiện", type: "number" },
            { key: "criticalBugs", label: "Lỗi nghiêm trọng", type: "number" },
            { key: "highBugs", label: "Lỗi mức cao", type: "number" },
            { key: "blocker", label: "Vướng mắc", type: "textarea", full: true }
        ],
        filters: [
            { key: "owner", label: "Chủ quản" },
            { key: "tester", label: "Tester" }
        ],
        columns: [
            { key: "date", label: "Ngày", width: "118px", render: (row) => formatDate(row.date) },
            { key: "feature", label: "Chức năng", width: "230px", render: (row) => strongText(row.feature, row.blocker) },
            { key: "owner", label: "Chủ quản", width: "130px" },
            { key: "tester", label: "Tester", width: "120px" },
            { key: "totalCases", label: "TC", width: "90px", render: (row) => numberText(row.totalCases) },
            { key: "executedCases", label: "Done", width: "90px", render: (row) => numberText(row.executedCases) },
            { key: "progress", label: "% HT", width: "150px", render: (row) => progressCell(percent(row.executedCases, row.totalCases)) },
            { key: "criticalBugs", label: "Sev 1", width: "90px", render: (row) => bugTag(row.criticalBugs) },
            { key: "highBugs", label: "High", width: "90px", render: (row) => bugTag(row.highBugs, "yellow") }
        ]
    },
    weekly: {
        label: "Báo cáo tuần",
        shortLabel: "Weekly",
        icon: "fa-chart-line",
        collection: "weekly",
        description: "Tổng hợp chất lượng kiểm thử theo tuần và nhóm chức năng.",
        emptyIcon: "fa-chart-column",
        emptyTitle: "Chưa có báo cáo tuần",
        emptyText: "Weekly report sẽ hiển thị tại đây sau khi có bản ghi.",
        fields: [
            { key: "week", label: "Tuần", type: "text", required: true },
            { key: "group", label: "Nhóm chức năng", type: "select", options: functionGroups, required: true },
            { key: "totalCases", label: "Tổng testcase", type: "number" },
            { key: "executedCases", label: "Đã thực hiện", type: "number" },
            { key: "coverageRate", label: "Tỷ lệ bao phủ (%)", type: "percent" },
            { key: "successRate", label: "Tỷ lệ thành công (%)", type: "percent" },
            { key: "criticalBugs", label: "Lỗi nghiêm trọng", type: "number" },
            { key: "reopenedBugs", label: "Lỗi mở lại", type: "number" },
            { key: "assessment", label: "Đánh giá", type: "select", options: assessmentOptions },
            { key: "note", label: "Ghi chú", type: "textarea", full: true }
        ],
        filters: [
            { key: "week", label: "Tuần" },
            { key: "group", label: "Nhóm" },
            { key: "assessment", label: "Đánh giá" }
        ],
        columns: [
            { key: "week", label: "Tuần", width: "110px", render: (row) => tag(row.week, "teal") },
            { key: "group", label: "Nhóm chức năng", width: "190px" },
            { key: "totalCases", label: "TC", width: "90px", render: (row) => numberText(row.totalCases) },
            { key: "executedCases", label: "Done", width: "90px", render: (row) => numberText(row.executedCases) },
            { key: "coverageRate", label: "Bao phủ", width: "150px", render: (row) => progressCell(resolveRate(row.coverageRate, row.executedCases, row.totalCases)) },
            { key: "successRate", label: "Thành công", width: "150px", render: (row) => progressCell(row.successRate) },
            { key: "criticalBugs", label: "Sev 1", width: "90px", render: (row) => bugTag(row.criticalBugs) },
            { key: "reopenedBugs", label: "Reopen", width: "90px", render: (row) => bugTag(row.reopenedBugs, "blue") },
            { key: "assessment", label: "Đánh giá", width: "128px", render: (row) => renderAssessment(row.assessment) }
        ]
    },
    readiness: {
        label: "Readiness Sprint",
        shortLabel: "Readiness",
        icon: "fa-flag-checkered",
        collection: "readiness",
        description: "Đánh giá mức độ sẵn sàng cho đào tạo, Pilot và Go-live.",
        emptyIcon: "fa-flag",
        emptyTitle: "Chưa có đánh giá readiness",
        emptyText: "Kết quả readiness sẽ hiển thị tại đây sau khi có bản ghi.",
        fields: [
            { key: "sprint", label: "Sprint", type: "text", required: true },
            { key: "coverageRate", label: "Tỷ lệ bao phủ (%)", type: "percent" },
            { key: "successRate", label: "Tỷ lệ thành công (%)", type: "percent" },
            { key: "openCriticalBugs", label: "Lỗi nghiêm trọng tồn đọng", type: "number" },
            { key: "readinessLevel", label: "Mức độ sẵn sàng (%)", type: "percent" },
            { key: "trainingReadiness", label: "Sẵn sàng đào tạo (%)", type: "percent" },
            { key: "pilotReadiness", label: "Sẵn sàng Pilot/Go-live (%)", type: "percent" },
            { key: "decision", label: "Quyết định", type: "select", options: decisionOptions },
            { key: "note", label: "Ghi chú", type: "textarea", full: true }
        ],
        filters: [
            { key: "sprint", label: "Sprint" },
            { key: "decision", label: "Quyết định" }
        ],
        columns: [
            { key: "sprint", label: "Sprint", width: "110px", render: (row) => tag(row.sprint, "teal") },
            { key: "coverageRate", label: "Bao phủ", width: "150px", render: (row) => progressCell(row.coverageRate) },
            { key: "successRate", label: "Thành công", width: "150px", render: (row) => progressCell(row.successRate) },
            { key: "openCriticalBugs", label: "Sev 1 tồn", width: "100px", render: (row) => bugTag(row.openCriticalBugs) },
            { key: "readinessLevel", label: "Sẵn sàng", width: "150px", render: (row) => progressCell(row.readinessLevel) },
            { key: "trainingReadiness", label: "Đào tạo", width: "150px", render: (row) => progressCell(row.trainingReadiness) },
            { key: "pilotReadiness", label: "Pilot", width: "150px", render: (row) => progressCell(row.pilotReadiness) },
            { key: "decision", label: "Quyết định", width: "140px", render: (row) => renderDecision(row.decision) }
        ]
    }
};

const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "fa-gauge-high" },
    { id: "features", label: "Chức năng", icon: modules.features.icon },
    { id: "plans", label: "Sprint Plan", icon: modules.plans.icon },
    { id: "matrix", label: "Ma trận", icon: modules.matrix.icon },
    { id: "daily", label: "Daily UAT", icon: modules.daily.icon },
    { id: "weekly", label: "Weekly", icon: modules.weekly.icon },
    { id: "readiness", label: "Readiness", icon: modules.readiness.icon }
];

function getInitialTab() {
    const id = (window.location.hash || "").replace("#", "");
    return tabs.some((tab) => tab.id === id) ? id : "dashboard";
}

const emptyState = () => ({
    features: [],
    plans: [],
    matrix: [],
    daily: [],
    weekly: [],
    readiness: [],
    updatedAt: null
});

let appState = loadState();
let ui = {
    activeTab: getInitialTab(),
    query: "",
    filters: {},
    columnFilters: {},
    modal: null,
    toast: null
};

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return emptyState();
        const parsed = JSON.parse(raw);
        return { ...emptyState(), ...parsed };
    } catch {
        return emptyState();
    }
}

function saveState() {
    appState.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function render() {
    const active = document.activeElement;
    const focus = active ? {
        id: active.id,
        start: active.selectionStart,
        end: active.selectionEnd
    } : null;

    document.getElementById("app").innerHTML = `
        <div class="app-shell">
            ${renderSidebar()}
            <main class="main">
                ${renderTopbar()}
                <section class="workspace">
                    ${renderCommandBand()}
                    ${renderKpis()}
                    ${renderTabs()}
                    ${ui.activeTab === "dashboard" ? renderDashboard() : renderModule(modules[ui.activeTab])}
                </section>
            </main>
        </div>
        ${renderModal()}
        <div class="toast ${ui.toast ? "show" : ""}">${e(ui.toast || "")}</div>
        <input id="importDataInput" class="hidden-input" type="file" accept="application/json,.json">
    `;

    bindEvents();

    if (focus?.id) {
        const restored = document.getElementById(focus.id);
        if (restored) {
            restored.focus();
            if (typeof focus.start === "number" && typeof restored.setSelectionRange === "function") {
                restored.setSelectionRange(focus.start, focus.end);
            }
        }
    }
}

function renderSidebar() {
    return `
        <aside class="sidebar" aria-label="Điều hướng">
            <div class="sidebar-logo"><i class="fa-solid fa-bars"></i></div>
            <nav class="sidebar-menu">
                ${tabs.map((tab) => `
                    <button class="side-btn ${ui.activeTab === tab.id ? "active" : ""}" data-tab="${tab.id}" title="${e(tab.label)}" aria-label="${e(tab.label)}">
                        <i class="fa-solid ${tab.icon}"></i>
                    </button>
                `).join("")}
            </nav>
            <div class="sidebar-bottom">
                <button class="side-btn" data-action="export-json" title="Xuất dữ liệu" aria-label="Xuất dữ liệu"><i class="fa-solid fa-download"></i></button>
                <button class="side-btn" data-action="import-json" title="Nhập dữ liệu" aria-label="Nhập dữ liệu"><i class="fa-solid fa-upload"></i></button>
            </div>
        </aside>
    `;
}

function renderTopbar() {
    return `
        <header class="topbar">
            <div class="brand-lockup">
                <img class="brand-logo" src="assets/logo-bidv.jpg" alt="BIDV">
                <div class="brand-divider"></div>
                <div class="brand-title">
                    <strong>Squad 2 UAT Command Center</strong>
                    <span>Agile Management Workspace</span>
                </div>
            </div>
            <div class="top-actions">
                <button class="text-btn" data-action="export-csv" title="Xuất CSV tab hiện tại">
                    <i class="fa-solid fa-file-csv"></i><span>CSV</span>
                </button>
                <button class="text-btn" data-action="export-json" title="Xuất JSON">
                    <i class="fa-solid fa-download"></i><span>Xuất</span>
                </button>
                <button class="text-btn" data-action="import-json" title="Nhập JSON">
                    <i class="fa-solid fa-upload"></i><span>Nhập</span>
                </button>
                <button class="danger-btn" data-action="clear-data" title="Xóa dữ liệu local">
                    <i class="fa-solid fa-trash"></i><span>Xóa</span>
                </button>
                ${ui.activeTab !== "dashboard" ? `
                    <button class="primary-btn" data-action="open-create" title="Thêm bản ghi">
                        <i class="fa-solid fa-plus"></i><span>Thêm</span>
                    </button>
                ` : ""}
            </div>
        </header>
    `;
}

function renderCommandBand() {
    const activeModule = modules[ui.activeTab];
    const title = activeModule ? activeModule.label : "Bảng điều hành tổng hợp Squad 2";
    const subtitle = activeModule ? activeModule.description : "Theo dõi tiến độ UAT, chất lượng kiểm thử, lỗi nghiêm trọng và readiness.";
    const totalRecords = Object.keys(modules).reduce((sum, id) => sum + appState[modules[id].collection].length, 0);
    return `
        <div class="command-band">
            <div>
                <div class="screen-kicker">BIDV · Squad 2</div>
                <h1 class="screen-title">${e(title)}</h1>
                <p class="screen-subtitle">${e(subtitle)}</p>
            </div>
            <div class="command-meta">
                ${renderDataHealthPill(totalRecords)}
                <span class="pill"><i class="fa-regular fa-clock"></i>${e(formatUpdatedAt())}</span>
            </div>
        </div>
    `;
}

function renderKpis() {
    const metrics = calculateMetrics();
    const cards = [
        { label: "Chức năng UAT", value: metrics.features, foot: "Trong danh mục", icon: "fa-layer-group" },
        { label: "Tiến độ thực hiện", value: `${metrics.coverage}%`, foot: "Theo testcase", icon: "fa-chart-simple" },
        { label: "Tỷ lệ thành công", value: `${metrics.successRate}%`, foot: "Theo weekly/readiness", icon: "fa-circle-check" },
        { label: "Lỗi Sev 1 tồn", value: metrics.criticalBugs, foot: "Theo daily/readiness", icon: "fa-triangle-exclamation" },
        { label: "Sẵn sàng đào tạo", value: `${metrics.trainingReadiness}%`, foot: "Theo readiness", icon: "fa-graduation-cap" },
        { label: "Pilot/Go-live", value: `${metrics.pilotReadiness}%`, foot: "Theo readiness", icon: "fa-rocket" }
    ];
    return `
        <div class="kpi-grid">
            ${cards.map((card) => `
                <article class="kpi-card">
                    <div class="kpi-head">
                        <div class="kpi-label">${e(card.label)}</div>
                        <div class="kpi-icon"><i class="fa-solid ${card.icon}"></i></div>
                    </div>
                    <div>
                        <div class="kpi-value">${e(card.value)}</div>
                        <div class="kpi-foot">${e(card.foot)}</div>
                    </div>
                </article>
            `).join("")}
        </div>
    `;
}

function renderTabs() {
    return `
        <nav class="tabbar" aria-label="Module">
            ${tabs.map((tab) => `
                <button class="tab-btn ${ui.activeTab === tab.id ? "active" : ""}" data-tab="${tab.id}">
                    <i class="fa-solid ${tab.icon}"></i>${e(tab.label)}
                </button>
            `).join("")}
        </nav>
    `;
}

function renderDashboard() {
    const metrics = calculateMetrics();
    const hasAnyData = Object.keys(modules).some((id) => appState[modules[id].collection].length);
    return `
        <div class="content-grid content-grid-single">
            <section class="panel">
                <div class="panel-head">
                    <div class="panel-title">
                        <i class="fa-solid fa-chart-pie"></i>
                        <div>
                            <h2>Tiến độ UAT toàn Squad</h2>
                            <span>Tiến độ, chất lượng kiểm thử và readiness tổng hợp</span>
                        </div>
                    </div>
                </div>
                <div class="panel-body">
                    ${hasAnyData ? renderMainDashboard(metrics) : renderKickoffPanel()}
                </div>
            </section>
        </div>
    `;
}

function renderKickoffPanel() {
    return `
        <div class="kickoff">
            <div class="kickoff-hero">
                <div class="kickoff-icon"><i class="fa-solid fa-rocket"></i></div>
                <div>
                    <h3>Workspace UAT đã sẵn sàng</h3>
                    <p>Khởi tạo dữ liệu UAT theo 6 phân hệ vận hành của Squad 2.</p>
                </div>
            </div>
            <div class="module-launch-grid">
                ${Object.keys(modules).map((id) => {
                    const mod = modules[id];
                    return `
                        <button class="module-launch-card" data-tab="${id}">
                            <span><i class="fa-solid ${mod.icon}"></i></span>
                            <strong>${e(mod.label)}</strong>
                            <small>${e(mod.description)}</small>
                        </button>
                    `;
                }).join("")}
            </div>
        </div>
    `;
}

function renderMainDashboard(metrics) {
    return `
        <div class="summary-grid">
            <div class="mini-stat"><span>Tổng bản ghi nghiệp vụ</span><strong>${e(metrics.totalRecords)}</strong></div>
            <div class="mini-stat"><span>Bản ghi Daily UAT</span><strong>${e(appState.daily.length)}</strong></div>
            <div class="mini-stat"><span>Báo cáo tuần</span><strong>${e(appState.weekly.length)}</strong></div>
            <div class="mini-stat"><span>Readiness Sprint</span><strong>${e(appState.readiness.length)}</strong></div>
        </div>
        <div style="height:16px"></div>
        ${renderCoveragePanel(metrics)}
        <div style="height:16px"></div>
        ${renderGroupDistribution()}
    `;
}

function renderCoveragePanel(metrics) {
    return `
        <div class="chart-stack">
            ${[
                ["Tỷ lệ bao phủ", metrics.coverage, "teal"],
                ["Tỷ lệ thành công", metrics.successRate, "green"],
                ["Sẵn sàng đào tạo", metrics.trainingReadiness, "yellow"],
                ["Sẵn sàng Pilot/Go-live", metrics.pilotReadiness, "blue"]
            ].map(([label, value]) => `
                <div class="bar-item">
                    <strong>${e(label)}</strong>
                    <div class="progress"><span style="width:${clamp(value)}%"></span></div>
                    <span>${e(clamp(value))}%</span>
                </div>
            `).join("")}
        </div>
    `;
}

function renderGroupDistribution() {
    const counts = countBy(appState.features, "group");
    const entries = Object.entries(counts).filter(([, value]) => value > 0);
    if (!entries.length) {
        return renderEmpty("fa-layer-group", "Chưa có phân bổ nhóm", "Nhóm chức năng sẽ xuất hiện sau khi danh mục được nhập.", true);
    }
    const max = Math.max(...entries.map(([, value]) => value));
    return `
        <div class="chart-stack">
            ${entries.map(([label, value]) => `
                <div class="bar-item">
                    <strong>${e(label || "Chưa phân nhóm")}</strong>
                    <div class="progress"><span style="width:${Math.round((value / max) * 100)}%"></span></div>
                    <span>${e(value)}</span>
                </div>
            `).join("")}
        </div>
    `;
}

function renderModule(mod) {
    const rows = getFilteredRows(mod);
    const total = appState[mod.collection].length;
    return `
        <div class="content-grid content-grid-single">
            <section class="panel">
                <div class="panel-head">
                    <div class="panel-title">
                        <i class="fa-solid ${mod.icon}"></i>
                        <div>
                            <h2>${e(mod.label)}</h2>
                            <span>${e(total)} bản ghi · ${e(rows.length)} đang hiển thị</span>
                        </div>
                    </div>
                    <button class="primary-btn" data-action="open-create">
                        <i class="fa-solid fa-plus"></i><span>Thêm bản ghi</span>
                    </button>
                </div>
                <div class="panel-body">
                    ${renderToolbar(mod, rows.length, total)}
                    ${renderTable(mod, rows)}
                </div>
            </section>
        </div>
    `;
}

function renderToolbar(mod, visibleCount, totalCount) {
    const activeFilters = countActiveFilters(mod);
    return `
        <div class="toolbar">
            <div class="input-wrap">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input id="searchInput" class="search-input" value="${e(ui.query)}" placeholder="Tìm kiếm" autocomplete="off">
            </div>
            <div class="toolbar-status">
                <span class="pill"><i class="fa-solid fa-table-list"></i>${e(visibleCount)}/${e(totalCount)} bản ghi</span>
                ${activeFilters ? `<span class="pill warn"><i class="fa-solid fa-filter"></i>${e(activeFilters)} lọc</span>` : ""}
            </div>
            <button class="ghost-btn" data-action="reset-filters" title="Xóa lọc">
                <i class="fa-solid fa-rotate-left"></i><span>Xóa lọc</span>
            </button>
        </div>
    `;
}

function renderTable(mod, rows) {
    const colgroup = mod.columns.map((col) => `<col style="width:${e(col.width || "140px")}">`).join("") + `<col style="width:104px">`;
    return `
        <div class="table-wrap">
            <table class="data-table">
                <colgroup>${colgroup}</colgroup>
                <thead>
                    <tr>
                        ${mod.columns.map((col) => `<th><span class="th-label">${e(col.label)}</span></th>`).join("")}
                        <th class="col-actions">Thao tác</th>
                    </tr>
                    <tr class="filter-row">
                        ${mod.columns.map((col) => `<th>${renderColumnFilter(mod, col)}</th>`).join("")}
                        <th class="col-actions"></th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.length ? rows.map((row) => `
                        <tr>
                            ${mod.columns.map((col) => `<td>${renderCell(row, col)}</td>`).join("")}
                            <td>
                                <div class="row-actions">
                                    <button class="icon-btn" data-action="open-edit" data-id="${e(row.id)}" title="Sửa" aria-label="Sửa">
                                        <i class="fa-solid fa-pen"></i>
                                    </button>
                                    <button class="icon-btn" data-action="delete-row" data-id="${e(row.id)}" title="Xóa" aria-label="Xóa">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join("") : `
                        <tr>
                            <td colspan="${mod.columns.length + 1}">
                                ${renderEmpty(mod.emptyIcon, mod.emptyTitle, mod.emptyText, true, mod)}
                            </td>
                        </tr>
                    `}
                </tbody>
            </table>
        </div>
    `;
}

function renderColumnFilter(mod, col) {
    const key = columnFilterKey(mod, col);
    const inputId = `colFilter_${mod.collection}_${col.key}`;
    const value = ui.columnFilters[key] || "";
    const field = getFieldForColumn(mod, col);
    const options = getColumnFilterOptions(mod, col, field);
    if (options.length) {
        return `
            <select id="${e(inputId)}" class="column-filter" data-column-filter="${e(col.key)}" aria-label="Lọc ${e(col.label)}">
                <option value="">Tất cả</option>
                ${options.map((option) => `<option value="${e(option)}" ${String(option) === String(value) ? "selected" : ""}>${e(option)}</option>`).join("")}
            </select>
        `;
    }
    return `
        <input id="${e(inputId)}" class="column-filter" data-column-filter="${e(col.key)}" value="${e(value)}" placeholder="Lọc" aria-label="Lọc ${e(col.label)}">
    `;
}

function renderModal() {
    if (!ui.modal) return `<div class="modal-backdrop" id="recordModal"></div>`;
    const mod = modules[ui.modal.tab];
    const row = ui.modal.id
        ? appState[mod.collection].find((item) => item.id === ui.modal.id)
        : null;
    const title = row ? `Sửa ${mod.shortLabel}` : `Thêm ${mod.shortLabel}`;
    const requiredFields = mod.fields.filter((field) => field.required);
    return `
        <div class="modal-backdrop open" id="recordModal" role="dialog" aria-modal="true">
            <form class="modal" id="recordForm">
                <div class="modal-head">
                    <div class="modal-title">
                        <span><i class="fa-solid ${mod.icon}"></i></span>
                        <div>
                            <h2>${e(title)}</h2>
                            <p>${e(mod.description)}</p>
                        </div>
                    </div>
                    <button class="icon-btn" type="button" data-action="close-modal" title="Đóng" aria-label="Đóng">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="record-form-layout">
                        <div class="form-grid">
                            ${mod.fields.map((field) => renderField(field, row)).join("")}
                        </div>
                        <aside class="record-rail">
                            <div class="rail-card">
                                <span>Phân hệ</span>
                                <strong>${e(mod.label)}</strong>
                            </div>
                            <div class="rail-card">
                                <span>Trường bắt buộc</span>
                                <strong>${e(requiredFields.length)}</strong>
                                <small>${requiredFields.map((field) => e(field.label)).join(", ") || "Không có"}</small>
                            </div>
                            ${row ? `
                                <div class="rail-card">
                                    <span>Cập nhật</span>
                                    <strong>${e(formatShortDateTime(row.updatedAt || row.createdAt))}</strong>
                                    <small>${e(recordTitle(row, mod))}</small>
                                </div>
                            ` : `
                                <div class="rail-card is-new">
                                    <span>Trạng thái</span>
                                    <strong>Bản ghi mới</strong>
                                    <small>Sẽ lưu vào trình duyệt sau khi xác nhận.</small>
                                </div>
                            `}
                        </aside>
                    </div>
                </div>
                <div class="modal-foot">
                    <button class="ghost-btn" type="button" data-action="close-modal">Hủy</button>
                    ${!row ? `<button class="text-btn" type="submit" data-save-mode="add-more"><i class="fa-solid fa-plus"></i><span>Lưu & thêm tiếp</span></button>` : ""}
                    <button class="primary-btn" type="submit" data-save-mode="close"><i class="fa-solid fa-floppy-disk"></i><span>Lưu</span></button>
                </div>
            </form>
        </div>
    `;
}

function renderField(field, row) {
    const value = row?.[field.key] ?? "";
    const required = field.required ? "required" : "";
    const label = e(field.label);
    const wrapper = `field ${field.full ? "full" : ""}`;
    let control = "";
    if (field.type === "select") {
        control = `
            <select class="field-select" name="${e(field.key)}" ${required}>
                <option value=""></option>
                ${(field.options || []).map((option) => `
                    <option value="${e(option)}" ${option === value ? "selected" : ""}>${e(option)}</option>
                `).join("")}
            </select>
        `;
    } else if (field.type === "textarea") {
        control = `<textarea class="field-textarea" name="${e(field.key)}" ${required}>${e(value)}</textarea>`;
    } else {
        const type = field.type === "percent" ? "number" : field.type;
        const attrs = field.type === "number" || field.type === "percent" ? `min="0" step="${field.type === "percent" ? "0.1" : "1"}"` : "";
        control = `<input class="field-input" name="${e(field.key)}" type="${e(type)}" value="${e(value)}" ${attrs} ${required}>`;
    }
    return `
        <div class="${wrapper}">
            <label>${label}${field.required ? `<span class="required-chip">Bắt buộc</span>` : ""}</label>
            ${control}
        </div>
    `;
}

function renderEmpty(icon, title, text, compact = false, mod = null) {
    return `
        <div class="empty-state ${compact ? "compact" : ""}">
            <div>
                <i class="empty-icon fa-solid ${icon}"></i>
                <h3>${e(title)}</h3>
                <p>${e(text)}</p>
                ${mod ? `
                    <button class="primary-btn empty-action" data-action="open-create">
                        <i class="fa-solid fa-plus"></i><span>Thêm bản ghi</span>
                    </button>
                ` : ""}
            </div>
        </div>
    `;
}

function bindEvents() {
    document.querySelectorAll("[data-tab]").forEach((button) => {
        button.addEventListener("click", () => {
            ui.activeTab = button.dataset.tab;
            ui.query = "";
            history.replaceState(null, "", `#${ui.activeTab}`);
            render();
        });
    });

    document.querySelectorAll("[data-action]").forEach((button) => {
        button.addEventListener("click", handleAction);
    });

    const search = document.getElementById("searchInput");
    if (search) {
        search.addEventListener("input", (event) => {
            ui.query = event.target.value;
            render();
        });
    }

    document.querySelectorAll("[data-filter-key]").forEach((select) => {
        select.addEventListener("change", (event) => {
            const mod = modules[ui.activeTab];
            const key = `${mod.collection}:${event.target.dataset.filterKey}`;
            ui.filters[key] = event.target.value;
            render();
        });
    });

    document.querySelectorAll("[data-column-filter]").forEach((input) => {
        const updateColumnFilter = (event) => {
            const mod = modules[ui.activeTab];
            if (!mod) return;
            ui.columnFilters[columnFilterKey(mod, { key: event.target.dataset.columnFilter })] = event.target.value;
            render();
        };
        input.addEventListener(input.tagName === "SELECT" ? "change" : "input", updateColumnFilter);
    });

    const form = document.getElementById("recordForm");
    if (form) form.addEventListener("submit", handleSubmit);

    const modal = document.getElementById("recordModal");
    if (modal) {
        modal.addEventListener("click", (event) => {
            if (event.target === modal) closeModal();
        });
    }

    const importInput = document.getElementById("importDataInput");
    if (importInput) importInput.addEventListener("change", handleImport);
}

function handleAction(event) {
    const action = event.currentTarget.dataset.action;
    const id = event.currentTarget.dataset.id;
    if (action === "open-create") return openCreate();
    if (action === "open-edit") return openEdit(id);
    if (action === "delete-row") return deleteRow(id);
    if (action === "close-modal") return closeModal();
    if (action === "reset-filters") return resetFilters();
    if (action === "export-json") return exportJson();
    if (action === "import-json") return document.getElementById("importDataInput")?.click();
    if (action === "clear-data") return clearData();
    if (action === "export-csv") return exportCsv();
}

function openCreate() {
    if (ui.activeTab === "dashboard") return;
    ui.modal = { tab: ui.activeTab, id: null };
    render();
}

function openEdit(id) {
    if (!id) return;
    ui.modal = { tab: ui.activeTab, id };
    render();
}

function closeModal() {
    ui.modal = null;
    render();
}

function handleSubmit(event) {
    event.preventDefault();
    const mod = modules[ui.modal.tab];
    const form = event.currentTarget;
    const saveMode = event.submitter?.dataset.saveMode || "close";
    const payload = {};
    for (const field of mod.fields) {
        const input = form.elements[field.key];
        let value = input?.value ?? "";
        if (typeof value === "string") value = value.trim();
        if ((field.type === "number" || field.type === "percent") && value !== "") {
            value = Number(value);
        }
        payload[field.key] = value;
    }

    const validationErrors = validateRecord(mod, payload);
    if (validationErrors.length) {
        showToast(validationErrors[0]);
        return;
    }

    const now = new Date().toISOString();
    if (ui.modal.id) {
        appState[mod.collection] = appState[mod.collection].map((row) => {
            if (row.id !== ui.modal.id) return row;
            return { ...row, ...payload, updatedAt: now };
        });
        showToast("Đã cập nhật bản ghi.");
    } else {
        appState[mod.collection].unshift({
            id: createId(),
            ...payload,
            createdAt: now,
            updatedAt: now
        });
        showToast("Đã thêm bản ghi.");
    }

    saveState();
    ui.modal = saveMode === "add-more" ? { tab: mod.collection, id: null } : null;
    render();
}

function deleteRow(id) {
    const mod = modules[ui.activeTab];
    if (!mod || !id) return;
    const row = appState[mod.collection].find((item) => item.id === id);
    if (!row) return;
    if (!confirm(`Xóa "${recordTitle(row, mod)}"?`)) return;
    appState[mod.collection] = appState[mod.collection].filter((item) => item.id !== id);
    saveState();
    showToast("Đã xóa bản ghi.");
    render();
}

function resetFilters() {
    const mod = modules[ui.activeTab];
    ui.query = "";
    if (mod) {
        Object.keys(ui.filters)
            .filter((key) => key.startsWith(`${mod.collection}:`))
            .forEach((key) => delete ui.filters[key]);
        Object.keys(ui.columnFilters)
            .filter((key) => key.startsWith(`${mod.collection}:`))
            .forEach((key) => delete ui.columnFilters[key]);
    }
    render();
}

function exportJson() {
    const blob = new Blob([JSON.stringify(appState, null, 2)], { type: "application/json" });
    downloadBlob(blob, `squad2-uat-data-${todayStamp()}.json`);
    showToast("Đã xuất dữ liệu JSON.");
}

function exportCsv() {
    if (ui.activeTab === "dashboard") {
        showToast("Chọn một tab dữ liệu để xuất CSV.");
        return;
    }
    const mod = modules[ui.activeTab];
    const rows = getFilteredRows(mod);
    const headers = mod.fields.map((field) => field.label);
    const keys = mod.fields.map((field) => field.key);
    const csv = [
        headers.map(csvEscape).join(","),
        ...rows.map((row) => keys.map((key) => csvEscape(row[key])).join(","))
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `${mod.collection}-${todayStamp()}.csv`);
    showToast("Đã xuất CSV.");
}

function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const parsed = JSON.parse(reader.result);
            const nextState = emptyState();
            Object.keys(modules).forEach((id) => {
                const collection = modules[id].collection;
                nextState[collection] = Array.isArray(parsed[collection]) ? parsed[collection] : [];
            });
            nextState.updatedAt = new Date().toISOString();
            appState = nextState;
            saveState();
            showToast("Đã nhập dữ liệu JSON.");
            render();
        } catch {
            showToast("File JSON không hợp lệ.");
        }
        event.target.value = "";
    };
    reader.readAsText(file, "utf-8");
}

function clearData() {
    const hasData = Object.keys(modules).some((id) => appState[modules[id].collection].length);
    if (!hasData) {
        showToast("Hiện chưa có dữ liệu để xóa.");
        return;
    }
    if (!confirm("Xóa toàn bộ dữ liệu đang lưu trên trình duyệt này?")) return;
    appState = emptyState();
    localStorage.removeItem(STORAGE_KEY);
    ui.query = "";
    ui.filters = {};
    ui.columnFilters = {};
    showToast("Đã xóa dữ liệu local.");
    render();
}

function getFilteredRows(mod) {
    const rows = appState[mod.collection] || [];
    const query = ui.query.trim().toLowerCase();
    return rows.filter((row) => {
        const matchQuery = !query || Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(query));
        if (!matchQuery) return false;
        const matchLegacyFilters = (mod.filters || []).every((filter) => {
            const selected = ui.filters[`${mod.collection}:${filter.key}`];
            return !selected || row[filter.key] === selected;
        });
        if (!matchLegacyFilters) return false;
        return mod.columns.every((col) => {
            const selected = ui.columnFilters[columnFilterKey(mod, col)];
            if (!selected) return true;
            return String(getColumnRawValue(row, col) ?? "").toLowerCase().includes(String(selected).toLowerCase());
        });
    });
}

function countActiveFilters(mod) {
    const legacyCount = Object.keys(ui.filters)
        .filter((key) => key.startsWith(`${mod.collection}:`) && ui.filters[key])
        .length;
    const columnCount = Object.keys(ui.columnFilters)
        .filter((key) => key.startsWith(`${mod.collection}:`) && ui.columnFilters[key])
        .length;
    return legacyCount + columnCount + (ui.query.trim() ? 1 : 0);
}

function columnFilterKey(mod, col) {
    return `${mod.collection}:${col.key}`;
}

function getFieldForColumn(mod, col) {
    return mod.fields.find((field) => field.key === col.key);
}

function getColumnFilterOptions(mod, col, field) {
    if (field?.type === "select" && field.options?.length) return field.options;
    const values = uniqueValues(appState[mod.collection], col.key);
    if (values.length > 0 && values.length <= 8) return values;
    return [];
}

function getColumnRawValue(row, col) {
    if (col.key === "progress") return percent(row.executedCases, row.totalCases);
    return row[col.key];
}

function validateRecord(mod, payload) {
    const errors = [];
    const percentFields = mod.fields.filter((field) => field.type === "percent");
    percentFields.forEach((field) => {
        const value = payload[field.key];
        if (value !== "" && (Number(value) < 0 || Number(value) > 100)) {
            errors.push(`${field.label} phải nằm trong khoảng 0-100%.`);
        }
    });
    if (payload.totalCases !== "" && payload.executedCases !== "" && Number(payload.executedCases) > Number(payload.totalCases)) {
        errors.push("Số testcase đã thực hiện không được lớn hơn tổng testcase.");
    }
    return errors;
}

function calculateMetrics() {
    const features = appState.features.length;
    const dailyTotal = sum(appState.daily, "totalCases");
    const dailyDone = sum(appState.daily, "executedCases");
    const weeklyCoverage = average(appState.weekly.map((row) => resolveRate(row.coverageRate, row.executedCases, row.totalCases)));
    const readinessCoverage = average(appState.readiness.map((row) => row.coverageRate));
    const coverage = dailyTotal ? percent(dailyDone, dailyTotal) : round(weeklyCoverage || readinessCoverage || 0);
    const successRate = round(average([
        ...appState.weekly.map((row) => row.successRate),
        ...appState.readiness.map((row) => row.successRate)
    ]));
    const latestReadiness = getLatest(appState.readiness);
    const readinessCritical = sum(appState.readiness, "openCriticalBugs");
    const dailyCritical = sum(appState.daily, "criticalBugs");
    return {
        features,
        totalRecords: Object.keys(modules).reduce((total, id) => total + appState[modules[id].collection].length, 0),
        coverage,
        successRate,
        criticalBugs: readinessCritical || dailyCritical,
        trainingReadiness: round(latestReadiness?.trainingReadiness || 0),
        pilotReadiness: round(latestReadiness?.pilotReadiness || 0)
    };
}

function renderCell(row, col) {
    if (col.render) return col.render(row);
    const value = row[col.key];
    if (value === "" || value == null) return `<span style="color:#9ca3af">-</span>`;
    return e(value);
}

function tag(value, tone = "gray") {
    if (!value) return `<span style="color:#9ca3af">-</span>`;
    return `<span class="tag ${tone}">${e(value)}</span>`;
}

function strongText(title, sub) {
    return `
        <div>
            <strong>${e(title || "-")}</strong>
            ${sub ? `<div style="color:#6b7280;margin-top:3px">${e(sub)}</div>` : ""}
        </div>
    `;
}

function renderPriority(value) {
    const tone = value === "Critical" ? "red" : value === "Cao" ? "yellow" : value === "Trung bình" ? "blue" : "gray";
    return tag(value, tone);
}

function renderStatus(value) {
    const tone = value === "Hoàn thành" ? "green"
        : value === "Chờ fix" || value === "Tạm hoãn" ? "red"
            : value === "Retest" ? "yellow"
                : value === "Đang kiểm thử" ? "blue"
                    : "gray";
    return tag(value, tone);
}

function renderAssessment(value) {
    const tone = value === "Tốt" ? "green" : value === "Blocker" || value === "Rủi ro" ? "red" : value === "Cần theo dõi" ? "yellow" : "gray";
    return tag(value, tone);
}

function renderDecision(value) {
    const tone = value === "Sẵn sàng" ? "green" : value === "Chưa sẵn sàng" ? "red" : value === "Có điều kiện" ? "yellow" : "gray";
    return tag(value, tone);
}

function bugTag(value, tone = "red") {
    const num = Number(value || 0);
    if (!num) return tag("0", "gray");
    return tag(num, tone);
}

function numberText(value) {
    if (value === "" || value == null) return `<span style="color:#9ca3af">-</span>`;
    return e(Number(value || 0).toLocaleString("vi-VN"));
}

function progressCell(value) {
    const safeValue = clamp(value);
    return `
        <div class="progress-row">
            <div class="progress"><span style="width:${safeValue}%"></span></div>
            <span>${safeValue}%</span>
        </div>
    `;
}

function renderDataHealthPill(totalRecords) {
    if (totalRecords === 0) return `<span class="pill warn"><i class="fa-solid fa-database"></i>0 bản ghi</span>`;
    return `<span class="pill good"><i class="fa-solid fa-database"></i>${e(totalRecords)} bản ghi</span>`;
}

function recordTitle(row, mod) {
    if (mod.collection === "features") return row.name || row.code || mod.shortLabel;
    if (mod.collection === "plans") return row.feature || row.sprint || mod.shortLabel;
    if (mod.collection === "matrix") return row.group || mod.shortLabel;
    if (mod.collection === "daily") return row.feature || row.date || mod.shortLabel;
    if (mod.collection === "weekly") return `${row.week || ""} ${row.group || ""}`.trim() || mod.shortLabel;
    if (mod.collection === "readiness") return row.sprint || mod.shortLabel;
    return mod.shortLabel;
}

function createId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function showToast(message) {
    ui.toast = message;
    const toast = document.querySelector(".toast");
    if (toast) {
        toast.textContent = message;
        toast.classList.add("show");
    }
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
        ui.toast = null;
        const currentToast = document.querySelector(".toast");
        if (currentToast) currentToast.classList.remove("show");
    }, 2200);
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function csvEscape(value) {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
}

function todayStamp() {
    return new Date().toISOString().slice(0, 10);
}

function uniqueValues(rows, key) {
    return [...new Set(rows.map((row) => row[key]).filter((value) => value !== "" && value != null))]
        .sort((a, b) => String(a).localeCompare(String(b), "vi"));
}

function countBy(rows, key) {
    return rows.reduce((acc, row) => {
        const value = row[key] || "";
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});
}

function sum(rows, key) {
    return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

function average(values) {
    const clean = values.map(Number).filter((value) => Number.isFinite(value) && value > 0);
    if (!clean.length) return 0;
    return clean.reduce((total, value) => total + value, 0) / clean.length;
}

function percent(done, total) {
    const denominator = Number(total || 0);
    if (!denominator) return 0;
    return clamp(Math.round((Number(done || 0) / denominator) * 100));
}

function resolveRate(rate, done, total) {
    if (rate !== "" && rate != null && Number.isFinite(Number(rate))) return Number(rate);
    return percent(done, total);
}

function clamp(value) {
    const num = Number(value || 0);
    return Math.max(0, Math.min(100, round(num)));
}

function round(value) {
    return Math.round(Number(value || 0));
}

function getLatest(rows) {
    return [...rows].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0];
}

function formatDate(value) {
    if (!value) return `<span style="color:#9ca3af">-</span>`;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return e(value);
    return e(new Intl.DateTimeFormat("vi-VN").format(date));
}

function formatShortDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function formatUpdatedAt() {
    if (!appState.updatedAt) return "Chưa cập nhật";
    const date = new Date(appState.updatedAt);
    if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
    return `Cập nhật ${new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date)}`;
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && ui.modal) closeModal();
});

window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    appState = loadState();
    ui.modal = null;
    render();
});

window.addEventListener("hashchange", () => {
    ui.activeTab = getInitialTab();
    ui.query = "";
    render();
});

render();
