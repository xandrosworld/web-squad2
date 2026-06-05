const STORAGE_KEY = "squad2_uat_command_center_v1";
const MIGRATION_FLAG_KEY = `${STORAGE_KEY}_remote_migration_checked`;
const LEGACY_BACKUP_KEY = `${STORAGE_KEY}_legacy_backup`;
const API_BASE = "/api";
const SYNC_INTERVAL_MS = 30000;
const GROUP_CHAT_POLL_INTERVAL_MS = 15000;
const GROUP_CHAT_LIMIT = 50;
const MAX_AVATAR_FILE_SIZE_MB = 6;
const MAX_AVATAR_FILE_SIZE_BYTES = MAX_AVATAR_FILE_SIZE_MB * 1024 * 1024;

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

let appState = loadCachedState();
let authState = {
    status: "checking",
    user: null,
    error: null
};
let ui = {
    activeTab: getInitialTab(),
    query: "",
    filters: {},
    columnFilters: {},
    modal: null,
    profileOpen: false,
    groupChatOpen: false,
    groupChatDraft: "",
    profileAvatarDraft: null,
    profileSaving: false,
    passwordSaving: false,
    toast: null,
    saving: false
};
let dataStatus = {
    mode: "loading",
    message: "Đang kết nối Railway DB",
    lastSyncAt: null
};
let groupChatState = {
    messages: [],
    loading: false,
    sending: false,
    error: null,
    lastFetchedAt: null
};

function normalizeState(raw) {
    const nextState = emptyState();
    const source = raw && typeof raw === "object" ? raw : {};
    Object.keys(modules).forEach((id) => {
        const collection = modules[id].collection;
        nextState[collection] = Array.isArray(source[collection]) ? source[collection] : [];
    });
    nextState.updatedAt = typeof source.updatedAt === "string" ? source.updatedAt : null;
    return nextState;
}

function loadCachedState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return emptyState();
        return normalizeState(JSON.parse(raw));
    } catch {
        return emptyState();
    }
}

function cacheState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function setDataStatus(mode, message) {
    dataStatus = {
        mode,
        message,
        lastSyncAt: mode === "online" ? new Date().toISOString() : dataStatus.lastSyncAt
    };
}

async function hydrateState(showNotice = false) {
    try {
        const data = await requestJson("/state");
        const remoteState = normalizeState(data.state || data);
        const cachedState = loadCachedState();
        if (authState.user?.role === "admin" && stateRecordCount(remoteState) === 0 && stateRecordCount(cachedState) > 0 && !localStorage.getItem(MIGRATION_FLAG_KEY)) {
            localStorage.setItem(LEGACY_BACKUP_KEY, JSON.stringify(cachedState));
            const shouldMigrate = confirm("Phát hiện dữ liệu cũ đang lưu trên trình duyệt. Đưa dữ liệu này lên Railway DB ngay bây giờ?");
            localStorage.setItem(MIGRATION_FLAG_KEY, shouldMigrate ? "uploaded" : "skipped");
            if (shouldMigrate) {
                const result = await replaceRemoteState(cachedState);
                appState = normalizeState(result.state || cachedState);
                setDataStatus("online", "Railway Postgres đang hoạt động");
                cacheState();
                render();
                showToast("Đã chuyển dữ liệu local lên Railway DB.");
                return;
            }
        }
        appState = remoteState;
        setDataStatus("online", "Railway Postgres đang hoạt động");
        cacheState();
        render();
        if (showNotice) showToast("Đã kết nối Railway DB.");
    } catch (error) {
        if (error.status === 401) return;
        setDataStatus("offline", error.message || "Không kết nối được Railway DB");
        render();
    }
}

function stateRecordCount(state) {
    return Object.keys(modules).reduce((total, id) => {
        const collection = modules[id].collection;
        return total + (Array.isArray(state?.[collection]) ? state[collection].length : 0);
    }, 0);
}

async function requestJson(path, options = {}) {
    const { skipAuthRedirect, ...fetchOptions } = options;
    const response = await fetch(`${API_BASE}${path}`, {
        ...fetchOptions,
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            ...(fetchOptions.headers || {})
        }
    });
    const text = await response.text();
    let data = {};
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { error: text || "API không trả về JSON hợp lệ" };
    }
    if (!response.ok) {
        if (response.status === 401 && !skipAuthRedirect && authState.status === "authenticated") {
            authState = { status: "guest", user: null, error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
            appState = emptyState();
            ui.groupChatOpen = false;
            ui.groupChatDraft = "";
            resetGroupChatState();
            localStorage.removeItem(STORAGE_KEY);
            render();
        }
        const error = new Error(data.error || `API lỗi ${response.status}`);
        error.status = response.status;
        throw error;
    }
    return data;
}

function ensureDbReady() {
    if (dataStatus.mode === "online") return true;
    showToast("Chưa kết nối Railway DB, không thể lưu dữ liệu.");
    return false;
}

async function createRemoteRecord(collection, record) {
    return requestJson(`/records/${encodeURIComponent(collection)}`, {
        method: "POST",
        body: JSON.stringify({ record })
    });
}

async function updateRemoteRecord(collection, id, record) {
    return requestJson(`/records/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ record })
    });
}

async function deleteRemoteRecord(collection, id) {
    return requestJson(`/records/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`, {
        method: "DELETE"
    });
}

async function replaceRemoteState(state) {
    return requestJson("/state", {
        method: "PUT",
        body: JSON.stringify({ state })
    });
}

function render() {
    if (authState.status === "checking") {
        document.getElementById("app").innerHTML = `
            ${renderAuthLoading()}
            <div class="toast ${ui.toast ? "show" : ""}">${e(ui.toast || "")}</div>
        `;
        return;
    }

    if (authState.status !== "authenticated") {
        document.getElementById("app").innerHTML = `
            ${renderLoginPage()}
            <div class="toast ${ui.toast ? "show" : ""}">${e(ui.toast || "")}</div>
        `;
        bindAuthEvents();
        return;
    }

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
        ${renderProfileModal()}
        ${renderFloatingGroupChat()}
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

function renderAuthLoading() {
    return `
        <div class="login-page">
            <div class="login-bg" aria-hidden="true">
                <div class="login-bg-base"></div>
                <div class="login-bg-dots"></div>
                <div class="login-glow login-glow-one"></div>
                <div class="login-glow login-glow-two"></div>
            </div>
            <div class="login-loading">
                <img src="assets/bidv-logo-animated.svg" alt="BIDV">
                <strong>Squad 2 UAT Command Center</strong>
                <span>Đang kiểm tra phiên đăng nhập...</span>
            </div>
        </div>
    `;
}

function renderLoginPage() {
    return `
        <div class="login-page">
            <div class="login-bg" aria-hidden="true">
                <div class="login-bg-base"></div>
                <div class="login-bg-dots"></div>
                <div class="login-glow login-glow-one"></div>
                <div class="login-glow login-glow-two"></div>
            </div>

            <div class="login-wrap">
                <section class="login-brand" aria-label="Squad 2 UAT">
                    <div class="login-brand-inner">
                        <div class="login-brand-logo">
                            <img src="assets/bidv-logo-animated.svg" alt="BIDV">
                            <div class="login-logo-text">
                                <span>Squad 2</span>
                                <small>UAT Command Center</small>
                            </div>
                        </div>

                        <h1>Dashboard vận hành<br>UAT Squad 2</h1>
                        <p>Theo dõi phạm vi UAT, kế hoạch Sprint, daily progress, chất lượng kiểm thử và readiness trước Pilot/Go-live.</p>

                        <div class="login-stats">
                            <div><strong>6</strong><span>Phân hệ quản trị</span></div>
                            <div><strong>24/7</strong><span>Dữ liệu tập trung</span></div>
                            <div><strong>DB</strong><span>Railway Postgres</span></div>
                        </div>
                    </div>
                </section>

                <section class="login-form-side">
                    <div class="login-card">
                        <div class="login-mobile-logo">
                            <img src="assets/bidv-logo-animated.svg" alt="BIDV">
                        </div>

                        <div class="login-card-head">
                            <h2>Đăng nhập</h2>
                            <p>Truy cập Squad 2 UAT Dashboard</p>
                        </div>

                        <form id="loginForm" class="login-form">
                            <div class="login-field">
                                <label for="loginIdentifier">Email / Username</label>
                                <div class="login-input-wrap">
                                    <i class="fa-regular fa-user"></i>
                                    <input id="loginIdentifier" name="identifier" type="text" autocomplete="username" placeholder="Nhập email hoặc username" required>
                                </div>
                            </div>

                            <div class="login-field">
                                <label for="loginPassword">Mật khẩu</label>
                                <div class="login-input-wrap">
                                    <i class="fa-solid fa-lock"></i>
                                    <input id="loginPassword" name="password" type="password" autocomplete="current-password" placeholder="Nhập mật khẩu" required>
                                </div>
                            </div>

                            <button class="login-submit" type="submit">
                                <span>Đăng nhập</span>
                            </button>

                            ${authState.error ? `<div class="login-error">${e(authState.error)}</div>` : ""}
                        </form>

                        <div class="login-divider"><span>Tài khoản hệ thống</span></div>
                        <div class="login-account-note">
                            <i class="fa-solid fa-shield-halved"></i>
                            <span>Tài khoản được cấp bởi quản trị viên. Dữ liệu vận hành được lưu tập trung trên hệ thống.</span>
                        </div>

                        <div class="login-foot">
                            <span>Chưa có tài khoản?</span>
                            <strong>Liên hệ quản trị viên Squad 2</strong>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    `;
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
                <button class="user-chip" type="button" data-auth-action="open-profile" title="Hồ sơ ${e(authState.user?.username || "")}">
                    ${renderUserAvatar(authState.user, "small")}
                    <span>${e(authState.user?.name || authState.user?.username || "User")}</span>
                </button>
                <button class="text-btn" data-auth-action="logout" title="Đăng xuất">
                    <i class="fa-solid fa-right-from-bracket"></i><span>Đăng xuất</span>
                </button>
                <button class="text-btn" data-action="export-excel" title="Xuất Excel gồm toàn bộ 6 sheet dữ liệu">
                    <i class="fa-solid fa-file-excel"></i><span>Xuất Excel</span>
                </button>
                ${authState.user?.role === "admin" ? `
                    <button class="text-btn" data-action="import-json" title="Nhập JSON">
                        <i class="fa-solid fa-upload"></i><span>Nhập</span>
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
                ${renderDbStatusPill()}
                ${renderDataHealthPill(totalRecords)}
                ${renderDbSyncPill()}
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
        <div class="dashboard-shell">
            ${hasAnyData ? renderMainDashboard(metrics) : renderKickoffPanel()}
        </div>
    `;
}

function renderKickoffPanel() {
    return `
        <section class="panel dashboard-empty-panel">
            <div class="kickoff">
                <div class="kickoff-hero">
                    <div class="kickoff-icon"><i class="fa-solid fa-gauge-high"></i></div>
                    <div>
                        <h3>Chưa có dữ liệu UAT để phân tích</h3>
                        <p>Dashboard sẽ tự chuyển thành command center khi có dữ liệu phạm vi, sprint plan, daily UAT hoặc readiness.</p>
                    </div>
                </div>
                <div class="kickoff-actions">
                    <button class="text-btn" data-tab="features"><i class="fa-solid fa-layer-group"></i><span>Nhập danh mục</span></button>
                    <button class="text-btn" data-tab="plans"><i class="fa-solid fa-calendar-days"></i><span>Lập Sprint Plan</span></button>
                    <button class="text-btn" data-tab="daily"><i class="fa-solid fa-clipboard-check"></i><span>Cập nhật Daily</span></button>
                </div>
            </div>
        </section>
    `;
}

function renderMainDashboard(metrics) {
    return `
        <div class="dashboard-grid">
            ${renderModuleProgressPanel()}
            ${renderReadinessHealthPanel(metrics)}
            ${renderRiskPanel(metrics)}
        </div>
        <div class="dashboard-bottom-grid">
            ${renderTimelinePanel()}
            ${renderActivityPanel()}
        </div>
    `;
}

function renderModuleProgressPanel() {
    const rows = getGroupOverviewRows();
    return `
        <section class="panel dashboard-panel dashboard-panel-wide">
            <div class="panel-head">
                <div class="panel-title">
                    <i class="fa-solid fa-chart-simple"></i>
                    <div>
                        <h2>Tiến độ theo nhóm chức năng</h2>
                        <span>Coverage, testcase và trạng thái UAT theo từng nhóm</span>
                    </div>
                </div>
            </div>
            <div class="panel-body">
                ${rows.length ? `
                    <div class="module-progress-list">
                        ${rows.map((row) => `
                            <div class="module-progress-row ${e(row.tone)}">
                                <div class="module-progress-main">
                                    <div class="module-progress-head">
                                        <strong>${e(row.group)}</strong>
                                        ${tag(row.statusLabel, row.tone)}
                                    </div>
                                    <div class="module-progress-meta">
                                        <span>${e(row.featureCount)} chức năng</span>
                                        <span>${row.totalCases ? `${e(row.executedCases)}/${e(row.totalCases)} testcase` : "Chưa có testcase"}</span>
                                        <span>Pass ${row.successRate ? `${e(row.successRate)}%` : "-"}</span>
                                    </div>
                                    <div class="module-progress-line">
                                        <div class="progress progress-${e(row.tone)}"><span style="width:${clamp(row.coverage)}%"></span></div>
                                        <span>${e(clamp(row.coverage))}%</span>
                                    </div>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                ` : renderEmpty("fa-layer-group", "Chưa có dữ liệu nhóm chức năng", "Nhập danh mục chức năng hoặc weekly report để xem tiến độ theo nhóm.", true)}
            </div>
        </section>
    `;
}

function renderReadinessHealthPanel(metrics) {
    const latestReadiness = getLatest(appState.readiness);
    const readinessLevel = round(latestReadiness?.readinessLevel || average([
        metrics.coverage,
        metrics.successRate,
        metrics.trainingReadiness,
        metrics.pilotReadiness
    ]));
    const recommendation = getReadinessRecommendation(metrics, latestReadiness, readinessLevel);
    const healthItems = [
        { label: "Coverage", value: metrics.coverage },
        { label: "Success rate", value: metrics.successRate },
        { label: "Training", value: metrics.trainingReadiness },
        { label: "Pilot/Go-live", value: metrics.pilotReadiness }
    ];
    return `
        <section class="panel dashboard-panel">
            <div class="panel-head">
                <div class="panel-title">
                    <i class="fa-solid fa-flag-checkered"></i>
                    <div>
                        <h2>Readiness health</h2>
                        <span>${latestReadiness ? `Bản gần nhất: ${e(latestReadiness.sprint || "Readiness")}` : "Chưa có bản readiness"}</span>
                    </div>
                </div>
            </div>
            <div class="panel-body">
                <div class="readiness-score ${e(recommendation.tone)}">
                    <div>
                        <span>Go-live recommendation</span>
                        <strong>${e(recommendation.label)}</strong>
                    </div>
                    <b>${e(clamp(readinessLevel))}%</b>
                </div>
                <div class="health-list">
                    ${healthItems.map((item) => {
                        const tone = getProgressTone(item.value);
                        return `
                            <div class="health-row">
                                <span>${e(item.label)}</span>
                                <div class="progress progress-${e(tone)}"><span style="width:${clamp(item.value)}%"></span></div>
                                <strong>${e(clamp(item.value))}%</strong>
                            </div>
                        `;
                    }).join("")}
                </div>
                <div class="readiness-decision">
                    <span>Quyết định gần nhất</span>
                    ${renderDecision(latestReadiness?.decision || "Chưa quyết định")}
                </div>
            </div>
        </section>
    `;
}

function renderRiskPanel(metrics) {
    const risks = getDashboardRisks(metrics);
    return `
        <section class="panel dashboard-panel">
            <div class="panel-head">
                <div class="panel-title">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <div>
                        <h2>Cần xử lý</h2>
                        <span>Top rủi ro ảnh hưởng tới UAT readiness</span>
                    </div>
                </div>
            </div>
            <div class="panel-body">
                <div class="risk-list">
                    ${risks.map((risk) => `
                        <div class="risk-item ${e(risk.tone)}">
                            <span><i class="fa-solid ${e(risk.icon)}"></i></span>
                            <div>
                                <strong>${e(risk.title)}</strong>
                                <small>${e(risk.detail)}</small>
                            </div>
                        </div>
                    `).join("")}
                </div>
            </div>
        </section>
    `;
}

function renderTimelinePanel() {
    const milestones = getUpcomingMilestones(7);
    return `
        <section class="panel dashboard-panel">
            <div class="panel-head">
                <div class="panel-title">
                    <i class="fa-solid fa-timeline"></i>
                    <div>
                        <h2>Timeline T1-T6</h2>
                        <span>Mốc sprint gần nhất và trạng thái lịch</span>
                    </div>
                </div>
            </div>
            <div class="panel-body">
                ${milestones.length ? `
                    <div class="uat-timeline">
                        ${milestones.map((item) => `
                            <div class="uat-timeline-item ${e(item.tone)}">
                                <div class="uat-timeline-marker">${e(item.milestone)}</div>
                                <div class="uat-timeline-card">
                                    <strong>${e(item.feature || item.sprint || item.milestone)}</strong>
                                    <span>${e(item.dateLabel)} · ${e(item.sprint || "Chưa có sprint")} · ${e(item.owner || "Chưa gán owner")}</span>
                                    <small>${e(item.statusText)}</small>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                ` : renderEmpty("fa-calendar-days", "Chưa có timeline Sprint", "Nhập Sprint Plan để dashboard hiển thị các mốc T1-T6 gần nhất.", true)}
            </div>
        </section>
    `;
}

function renderActivityPanel() {
    const activities = getRecentActivities(8);
    return `
        <section class="panel dashboard-panel">
            <div class="panel-head">
                <div class="panel-title">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                    <div>
                        <h2>Hoạt động gần đây</h2>
                        <span>Bản ghi mới cập nhật trong workspace</span>
                    </div>
                </div>
            </div>
            <div class="panel-body">
                ${activities.length ? `
                    <div class="activity-list">
                        ${activities.map((item) => `
                            <div class="activity-item">
                                <span class="activity-icon"><i class="fa-solid ${e(item.icon)}"></i></span>
                                <div>
                                    <strong>${e(item.title)}</strong>
                                    <small>${e(item.moduleLabel)} · ${e(item.owner)} · ${e(item.timeLabel)}</small>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                ` : renderEmpty("fa-clock-rotate-left", "Chưa có hoạt động", "Các cập nhật mới nhất sẽ xuất hiện tại đây sau khi có bản ghi.", true)}
            </div>
        </section>
    `;
}

function getGroupOverviewRows() {
    const buckets = new Map();
    const featureGroupByKey = new Map();
    const ensureBucket = (group) => {
        const label = String(group || "").trim() || "Chưa phân nhóm";
        if (!buckets.has(label)) {
            buckets.set(label, {
                group: label,
                featureCount: 0,
                completedFeatures: 0,
                blockedFeatures: 0,
                weeklyCount: 0,
                dailyCount: 0,
                matrixAssignments: 0,
                totalCases: 0,
                executedCases: 0,
                dailyTotal: 0,
                dailyDone: 0,
                coverageRates: [],
                successRates: [],
                criticalBugs: 0,
                highBugs: 0,
                reopenedBugs: 0,
                blockers: 0,
                riskyReports: 0
            });
        }
        return buckets.get(label);
    };

    appState.features.forEach((row) => {
        const bucket = ensureBucket(row.group);
        bucket.featureCount += 1;
        if (row.status === "Hoàn thành") bucket.completedFeatures += 1;
        if (row.status === "Chờ fix" || row.status === "Tạm hoãn") bucket.blockedFeatures += 1;
        [row.name, row.code].forEach((value) => {
            const key = normalizeLookupKey(value);
            if (key) featureGroupByKey.set(key, bucket.group);
        });
    });

    appState.weekly.forEach((row) => {
        const bucket = ensureBucket(row.group);
        bucket.weeklyCount += 1;
        bucket.totalCases += Number(row.totalCases || 0);
        bucket.executedCases += Number(row.executedCases || 0);
        bucket.coverageRates.push(resolveRate(row.coverageRate, row.executedCases, row.totalCases));
        bucket.successRates.push(row.successRate);
        bucket.criticalBugs += Number(row.criticalBugs || 0);
        bucket.reopenedBugs += Number(row.reopenedBugs || 0);
        if (row.assessment === "Rủi ro" || row.assessment === "Blocker") bucket.riskyReports += 1;
    });

    appState.daily.forEach((row) => {
        const group = featureGroupByKey.get(normalizeLookupKey(row.feature)) || "Chưa phân nhóm";
        const bucket = ensureBucket(group);
        bucket.dailyCount += 1;
        bucket.dailyTotal += Number(row.totalCases || 0);
        bucket.dailyDone += Number(row.executedCases || 0);
        bucket.criticalBugs += Number(row.criticalBugs || 0);
        bucket.highBugs += Number(row.highBugs || 0);
        if (isFilled(row.blocker)) bucket.blockers += 1;
    });

    appState.matrix.forEach((row) => {
        const bucket = ensureBucket(row.group);
        bucket.matrixAssignments += ["t1", "t2", "t3", "t4", "t5", "t6"].filter((key) => isFilled(row[key])).length;
    });

    const rows = [...buckets.values()].map((bucket) => {
        const totalCases = bucket.totalCases || bucket.dailyTotal;
        const executedCases = bucket.executedCases || bucket.dailyDone;
        const caseCoverage = totalCases ? percent(executedCases, totalCases) : 0;
        const explicitCoverage = round(average(bucket.coverageRates));
        const featureCoverage = bucket.featureCount ? percent(bucket.completedFeatures, bucket.featureCount) : 0;
        const coverage = caseCoverage || explicitCoverage || featureCoverage;
        const successRate = round(average(bucket.successRates));
        const issueCount = bucket.criticalBugs + bucket.highBugs + bucket.reopenedBugs + bucket.blockers + bucket.riskyReports + bucket.blockedFeatures;
        let tone = getProgressTone(coverage);
        let statusLabel = "Đang chạy";

        if (bucket.criticalBugs > 0) {
            tone = "red";
            statusLabel = `${bucket.criticalBugs} Sev 1`;
        } else if (issueCount > 0) {
            tone = "yellow";
            statusLabel = "Cần xử lý";
        } else if (!totalCases && !bucket.weeklyCount && !bucket.dailyCount) {
            tone = "gray";
            statusLabel = "Thiếu dữ liệu";
        } else if (coverage >= 90 && (!successRate || successRate >= 90)) {
            tone = "green";
            statusLabel = "Ổn định";
        } else if (coverage < 70) {
            tone = "yellow";
            statusLabel = "Thiếu coverage";
        } else if (successRate && successRate < 85) {
            tone = "yellow";
            statusLabel = "Pass thấp";
        }

        return {
            group: bucket.group,
            featureCount: bucket.featureCount,
            totalCases,
            executedCases,
            coverage,
            successRate,
            statusLabel,
            tone
        };
    });

    const severity = { red: 0, yellow: 1, gray: 2, blue: 3, green: 4 };
    return rows
        .sort((a, b) => (severity[a.tone] ?? 9) - (severity[b.tone] ?? 9)
            || b.featureCount - a.featureCount
            || a.group.localeCompare(b.group, "vi"))
        .slice(0, 8);
}

function getReadinessRecommendation(metrics, latestReadiness, readinessLevel) {
    const decision = latestReadiness?.decision || "";
    if (!latestReadiness) {
        return { tone: "yellow", label: "Cần đánh giá" };
    }
    if (decision === "Chưa sẵn sàng" || metrics.criticalBugs > 0 || readinessLevel < 70 || (metrics.pilotReadiness > 0 && metrics.pilotReadiness < 70)) {
        return { tone: "red", label: "Chưa sẵn sàng" };
    }
    if (decision === "Sẵn sàng" && metrics.criticalBugs === 0 && readinessLevel >= 85 && metrics.pilotReadiness >= 85) {
        return { tone: "green", label: "Sẵn sàng" };
    }
    if (decision === "Có điều kiện" || readinessLevel < 85 || metrics.coverage < 80 || metrics.successRate < 85 || metrics.trainingReadiness < 80 || metrics.pilotReadiness < 80) {
        return { tone: "yellow", label: "Cần theo dõi" };
    }
    return { tone: "green", label: "On track" };
}

function getDashboardRisks(metrics) {
    const risks = [];
    const addRisk = (tone, icon, title, detail) => risks.push({ tone, icon, title, detail });
    const waitingFeatures = appState.features.filter((row) => row.status === "Chờ fix" || row.status === "Tạm hoãn");
    const blockerRows = appState.daily.filter((row) => isFilled(row.blocker));
    const riskyWeekly = appState.weekly.filter((row) => row.assessment === "Rủi ro" || row.assessment === "Blocker");
    const highIssues = sum(appState.daily, "highBugs") + sum(appState.weekly, "reopenedBugs");
    const hasCoverageEvidence = sum(appState.daily, "totalCases") > 0
        || appState.weekly.some((row) => isFilled(row.coverageRate) || Number(row.totalCases || 0) > 0)
        || appState.readiness.some((row) => isFilled(row.coverageRate));
    const hasSuccessEvidence = appState.weekly.some((row) => isFilled(row.successRate))
        || appState.readiness.some((row) => isFilled(row.successRate));
    const latestReadiness = getLatest(appState.readiness);

    if (metrics.criticalBugs > 0) {
        addRisk("red", "fa-fire", `${metrics.criticalBugs} lỗi Sev 1 còn tồn`, "Ưu tiên owner và retest trước khi chốt readiness.");
    }
    if (waitingFeatures.length) {
        addRisk("yellow", "fa-screwdriver-wrench", `${waitingFeatures.length} chức năng chờ xử lý`, "Có trạng thái Chờ fix hoặc Tạm hoãn trong danh mục.");
    }
    if (riskyWeekly.length) {
        addRisk("red", "fa-chart-line", `${riskyWeekly.length} báo cáo tuần có rủi ro`, "Weekly assessment đang ở mức Rủi ro hoặc Blocker.");
    }
    if (blockerRows.length) {
        addRisk("yellow", "fa-ban", `${blockerRows.length} vướng mắc Daily UAT`, "Daily log còn ghi nhận blocker cần làm rõ.");
    }
    if (highIssues > 0) {
        addRisk("yellow", "fa-bug", `${highIssues} lỗi high/reopen`, "Theo dõi lỗi mức cao và lỗi mở lại để tránh trễ retest.");
    }
    if (hasCoverageEvidence && metrics.coverage < 80) {
        addRisk(metrics.coverage < 60 ? "red" : "yellow", "fa-chart-pie", `Coverage mới đạt ${metrics.coverage}%`, "Cần bổ sung testcase hoặc cập nhật kết quả chạy.");
    }
    if (hasSuccessEvidence && metrics.successRate < 85) {
        addRisk("yellow", "fa-circle-half-stroke", `Success rate ${metrics.successRate}%`, "Tỷ lệ pass chưa đủ chắc để khuyến nghị go-live.");
    }
    if (latestReadiness?.decision === "Chưa sẵn sàng" || latestReadiness?.decision === "Có điều kiện") {
        addRisk(latestReadiness.decision === "Chưa sẵn sàng" ? "red" : "yellow", "fa-flag", latestReadiness.decision, latestReadiness.note || "Cập nhật điều kiện readiness trước mốc Pilot/Go-live.");
    }
    if (latestReadiness && metrics.pilotReadiness > 0 && metrics.pilotReadiness < 80) {
        addRisk("yellow", "fa-rocket", `Pilot readiness ${metrics.pilotReadiness}%`, "Chưa đạt ngưỡng khuyến nghị 80% cho Pilot/Go-live.");
    }

    if (!risks.length) {
        addRisk("green", "fa-circle-check", "Không có rủi ro đỏ", "Tiếp tục cập nhật Daily, Weekly và Readiness để giữ dashboard phản ánh đúng thực tế.");
    }
    return risks.slice(0, 5);
}

function getUpcomingMilestones(limit = 7) {
    const today = getTodayDateOnly();
    const milestoneKeys = ["t1", "t2", "t3", "t4", "t5", "t6"];
    const items = [];

    appState.plans.forEach((row) => {
        milestoneKeys.forEach((key) => {
            const date = parseDateOnly(row[key]);
            if (!date) return;
            items.push({
                milestone: key.toUpperCase(),
                value: row[key],
                date,
                timestamp: date.getTime(),
                feature: row.feature,
                sprint: row.sprint,
                owner: row.owner
            });
        });
    });

    const future = items.filter((item) => item.date >= today).sort((a, b) => a.timestamp - b.timestamp);
    const past = items.filter((item) => item.date < today).sort((a, b) => b.timestamp - a.timestamp);
    const selected = [...future.slice(0, limit)];
    if (selected.length < limit) selected.push(...past.slice(0, limit - selected.length));

    return selected.map((item) => {
        const diff = daysBetween(today, item.date);
        let tone = "green";
        let statusText = `Còn ${diff} ngày`;
        if (diff < 0) {
            tone = "gray";
            statusText = `Đã qua ${Math.abs(diff)} ngày`;
        } else if (diff === 0) {
            tone = "yellow";
            statusText = "Đến hạn hôm nay";
        } else if (diff <= 7) {
            tone = "blue";
        }
        return {
            ...item,
            tone,
            statusText,
            dateLabel: formatPlainDate(item.value)
        };
    });
}

function getRecentActivities(limit = 8) {
    const items = [];
    Object.keys(modules).forEach((id) => {
        const mod = modules[id];
        appState[mod.collection].forEach((row) => {
            const stamp = row.updatedAt || row.createdAt || appState.updatedAt;
            const time = new Date(stamp || 0).getTime();
            items.push({
                title: recordTitle(row, mod),
                moduleLabel: mod.shortLabel,
                icon: mod.icon,
                owner: recordOwnerLabel(row),
                time,
                timeLabel: stamp ? formatShortDateTime(stamp) : "Chưa có thời gian"
            });
        });
    });
    return items
        .sort((a, b) => b.time - a.time)
        .slice(0, limit);
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
                    ${rows.length ? rows.map((row) => {
                        const canEdit = canModifyRecord(row);
                        const owner = recordOwnerLabel(row);
                        return `
                            <tr>
                                ${mod.columns.map((col) => `<td>${renderCell(row, col)}</td>`).join("")}
                                <td>
                                    <div class="row-actions">
                                        ${canEdit ? `
                                            <button class="icon-btn" data-action="open-edit" data-id="${e(row.id)}" title="Sửa" aria-label="Sửa">
                                                <i class="fa-solid fa-pen"></i>
                                            </button>
                                            <button class="icon-btn" data-action="delete-row" data-id="${e(row.id)}" title="Xóa" aria-label="Xóa">
                                                <i class="fa-solid fa-trash"></i>
                                            </button>
                                        ` : `
                                            <span class="permission-lock" title="Bản ghi do ${e(owner)} tạo. Chỉ người tạo hoặc admin được sửa.">
                                                <i class="fa-solid fa-lock"></i>
                                            </span>
                                        `}
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join("") : `
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
                                    <small>Sẽ lưu vào Railway DB sau khi xác nhận.</small>
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

function renderProfileModal() {
    if (!ui.profileOpen) return `<div class="modal-backdrop" id="profileModal"></div>`;
    const user = authState.user || {};
    const avatarData = ui.profileAvatarDraft !== null ? ui.profileAvatarDraft : user.avatarData || "";
    const displayUser = { ...user, avatarData };
    return `
        <div class="modal-backdrop open" id="profileModal" role="dialog" aria-modal="true">
            <div class="modal profile-modal">
                <div class="modal-head">
                    <div class="modal-title">
                        <span><i class="fa-solid fa-user-gear"></i></span>
                        <div>
                            <h2>Hồ sơ người dùng</h2>
                            <p>Cập nhật thông tin cá nhân và bảo mật tài khoản.</p>
                        </div>
                    </div>
                    <button class="icon-btn" type="button" data-auth-action="close-profile" title="Đóng" aria-label="Đóng">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="modal-body profile-body">
                    <aside class="profile-summary">
                        ${renderUserAvatar(displayUser, "large")}
                        <div>
                            <strong>${e(user.name || user.username || "User")}</strong>
                            <span>${e(user.email || user.username || "")}</span>
                            <small>${e(roleLabel(user.role))}</small>
                        </div>
                    </aside>
                    <div class="profile-forms">
                        <form id="profileForm" class="profile-card">
                            <div class="profile-card-head">
                                <i class="fa-solid fa-id-card"></i>
                                <div>
                                    <h3>Thông tin hiển thị</h3>
                                    <p>Avatar và tên sẽ hiển thị trên thanh điều hướng.</p>
                                </div>
                            </div>
                            <div class="field">
                                <label for="profileName">Tên hiển thị</label>
                                <input id="profileName" class="field-input" name="profileName" type="text" value="${e(user.name || "")}" maxlength="80" autocomplete="name" required>
                            </div>
                            <div class="profile-avatar-row">
                                ${renderUserAvatar(displayUser, "medium")}
                                <div class="profile-avatar-actions">
                                    <button class="text-btn" type="button" data-auth-action="choose-avatar">
                                        <i class="fa-solid fa-image"></i><span>Chọn ảnh</span>
                                    </button>
                                    <button class="ghost-btn" type="button" data-auth-action="clear-avatar">
                                        <i class="fa-solid fa-eraser"></i><span>Xóa ảnh</span>
                                    </button>
                                    <small>PNG, JPG, WEBP hoặc GIF. Khuyến nghị dưới ${MAX_AVATAR_FILE_SIZE_MB}MB.</small>
                                </div>
                            </div>
                            <input id="avatarInput" class="hidden-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
                            <div class="profile-card-foot">
                                <button class="primary-btn" type="submit" ${ui.profileSaving ? "disabled" : ""}>
                                    <i class="fa-solid fa-floppy-disk"></i><span>${ui.profileSaving ? "Đang lưu" : "Lưu hồ sơ"}</span>
                                </button>
                            </div>
                        </form>

                        <form id="passwordForm" class="profile-card">
                            <div class="profile-card-head">
                                <i class="fa-solid fa-key"></i>
                                <div>
                                    <h3>Đổi mật khẩu</h3>
                                    <p>Mật khẩu mới cần có ít nhất 6 ký tự.</p>
                                </div>
                            </div>
                            <div class="profile-password-grid">
                                <div class="field">
                                    <label for="currentPassword">Mật khẩu hiện tại</label>
                                    <input id="currentPassword" class="field-input" name="currentPassword" type="password" autocomplete="current-password" required>
                                </div>
                                <div class="field">
                                    <label for="newPassword">Mật khẩu mới</label>
                                    <input id="newPassword" class="field-input" name="newPassword" type="password" autocomplete="new-password" minlength="6" required>
                                </div>
                                <div class="field">
                                    <label for="confirmPassword">Nhập lại mật khẩu mới</label>
                                    <input id="confirmPassword" class="field-input" name="confirmPassword" type="password" autocomplete="new-password" minlength="6" required>
                                </div>
                            </div>
                            <div class="profile-card-foot">
                                <button class="primary-btn" type="submit" ${ui.passwordSaving ? "disabled" : ""}>
                                    <i class="fa-solid fa-lock"></i><span>${ui.passwordSaving ? "Đang đổi" : "Đổi mật khẩu"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderFloatingGroupChat() {
    const unreadClass = groupChatState.error ? "warn" : "";
    if (!ui.groupChatOpen) {
        return `
            <div class="floating-hub">
                <button class="chat-fab ${unreadClass}" type="button" data-chat-action="open" title="Chat nhóm" aria-label="Chat nhóm">
                    <i class="fa-solid fa-comments"></i>
                </button>
            </div>
        `;
    }

    return `
        <div class="floating-hub chat-open">
            <section class="group-chat-panel" aria-label="Chat nhóm">
                <div class="group-chat-head">
                    <div>
                        <h2><i class="fa-solid fa-comments"></i> Chat nhóm</h2>
                        <span>${groupChatState.lastFetchedAt ? `Cập nhật ${e(formatShortDateTime(groupChatState.lastFetchedAt))}` : "Tất cả người dùng trong hệ thống"}</span>
                    </div>
                    <div class="group-chat-actions">
                        <button class="icon-btn" type="button" data-chat-action="refresh" title="Tải lại" aria-label="Tải lại">
                            <i class="fa-solid fa-rotate-right ${groupChatState.loading ? "fa-spin" : ""}"></i>
                        </button>
                        <button class="icon-btn" type="button" data-chat-action="close" title="Đóng" aria-label="Đóng">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
                <div class="group-chat-body" id="groupChatBody">
                    ${renderGroupChatMessages()}
                </div>
                <form class="group-chat-compose" id="groupChatForm">
                    <textarea id="groupChatInput" class="group-chat-input" name="message" maxlength="1000" rows="2" placeholder="Nhập tin nhắn nhóm..." ${groupChatState.sending ? "disabled" : ""}>${e(ui.groupChatDraft)}</textarea>
                    <button class="primary-btn group-chat-send" type="submit" ${groupChatState.sending ? "disabled" : ""} title="Gửi">
                        <i class="fa-solid fa-paper-plane"></i><span>${groupChatState.sending ? "Đang gửi" : "Gửi"}</span>
                    </button>
                </form>
            </section>
        </div>
    `;
}

function renderGroupChatMessages() {
    if (groupChatState.loading && !groupChatState.messages.length) {
        return `
            <div class="group-chat-empty">
                <i class="fa-solid fa-rotate fa-spin"></i>
                <span>Đang tải tin nhắn...</span>
            </div>
        `;
    }
    if (groupChatState.error && !groupChatState.messages.length) {
        return `
            <div class="group-chat-empty">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>${e(groupChatState.error)}</span>
            </div>
        `;
    }
    if (!groupChatState.messages.length) {
        return `
            <div class="group-chat-empty">
                <i class="fa-solid fa-comments"></i>
                <span>Chưa có tin nhắn nhóm.</span>
            </div>
        `;
    }
    return groupChatState.messages.map((message) => {
        const isOwn = message.user?.id && message.user.id === authState.user?.id;
        const sender = message.user?.name || message.user?.username || "Người dùng";
        return `
            <article class="group-chat-message ${isOwn ? "own" : ""}">
                ${renderGroupChatAvatar(message.user)}
                <div class="group-chat-bubble">
                    <div class="group-chat-meta">
                        <strong>${e(isOwn ? "Bạn" : sender)}</strong>
                        <span>${e(formatShortDateTime(message.createdAt))}</span>
                    </div>
                    <p>${e(message.body)}</p>
                </div>
            </article>
        `;
    }).join("");
}

function renderGroupChatAvatar(user) {
    const avatarData = user?.avatarData || "";
    const label = e(user?.name || user?.username || "Người dùng");
    if (avatarData) {
        return `<div class="group-chat-avatar"><img src="${e(avatarData)}" alt="Avatar ${label}"></div>`;
    }
    return `<div class="group-chat-avatar">${e(userInitials(user))}</div>`;
}

function renderUserAvatar(user, size = "small") {
    const avatarData = user?.avatarData || "";
    const className = `avatar avatar-${size}`;
    if (avatarData) {
        return `<span class="${className}"><img src="${e(avatarData)}" alt="Avatar ${e(user?.name || user?.username || "")}"></span>`;
    }
    return `<span class="${className}">${e(userInitials(user))}</span>`;
}

function userInitials(user) {
    const source = String(user?.name || user?.email || user?.username || "U").trim();
    const words = source.includes("@") ? [source.split("@")[0]] : source.split(/\s+/);
    const initials = words.slice(0, 2).map((word) => word[0]).join("");
    return initials.toUpperCase() || "U";
}

function roleLabel(role) {
    const labels = {
        admin: "Quản trị viên",
        manager: "Quản lý",
        user: "Người dùng",
        viewer: "Người xem"
    };
    return labels[role] || labels.user;
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
    bindAuthEvents();

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

    document.querySelectorAll("[data-chat-action]").forEach((button) => {
        button.addEventListener("click", handleChatAction);
    });

    const groupChatForm = document.getElementById("groupChatForm");
    if (groupChatForm) groupChatForm.addEventListener("submit", handleGroupChatSubmit);

    const groupChatInput = document.getElementById("groupChatInput");
    if (groupChatInput) {
        groupChatInput.addEventListener("input", (event) => {
            ui.groupChatDraft = event.target.value;
        });
        groupChatInput.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" || event.shiftKey) return;
            event.preventDefault();
            groupChatForm?.requestSubmit();
        });
    }
    const groupChatBody = document.getElementById("groupChatBody");
    if (groupChatBody) groupChatBody.scrollTop = groupChatBody.scrollHeight;

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

function bindAuthEvents() {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) loginForm.addEventListener("submit", handleLogin);
    document.querySelectorAll("[data-auth-action]").forEach((button) => {
        button.addEventListener("click", handleAuthAction);
    });
    const profileForm = document.getElementById("profileForm");
    if (profileForm) profileForm.addEventListener("submit", handleProfileSubmit);
    const passwordForm = document.getElementById("passwordForm");
    if (passwordForm) passwordForm.addEventListener("submit", handlePasswordSubmit);
    const avatarInput = document.getElementById("avatarInput");
    if (avatarInput) avatarInput.addEventListener("change", handleAvatarInput);
    const profileModal = document.getElementById("profileModal");
    if (profileModal) {
        profileModal.addEventListener("click", (event) => {
            if (event.target === profileModal) closeProfile();
        });
    }
}

async function initAuth() {
    authState = { status: "checking", user: null, error: null };
    render();
    try {
        const data = await requestJson("/auth/me", { skipAuthRedirect: true });
        authState = { status: "authenticated", user: data.user, error: null };
        render();
        await hydrateState(true);
    } catch {
        authState = { status: "guest", user: null, error: null };
        appState = emptyState();
        ui.groupChatOpen = false;
        ui.groupChatDraft = "";
        resetGroupChatState();
        render();
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const identifier = form.elements.identifier.value.trim();
    const password = form.elements.password.value;
    if (!identifier || !password) {
        authState = { status: "guest", user: null, error: "Vui lòng nhập tài khoản và mật khẩu." };
        render();
        return;
    }

    authState = { status: "checking", user: null, error: null };
    render();
    try {
        const data = await requestJson("/auth/login", {
            method: "POST",
            body: JSON.stringify({ identifier, password }),
            skipAuthRedirect: true
        });
        authState = { status: "authenticated", user: data.user, error: null };
        render();
        await hydrateState(true);
    } catch (error) {
        authState = { status: "guest", user: null, error: error.message || "Không đăng nhập được." };
        appState = emptyState();
        ui.groupChatOpen = false;
        ui.groupChatDraft = "";
        resetGroupChatState();
        render();
    }
}

async function handleAuthAction(event) {
    const action = event.currentTarget.dataset.authAction;
    if (action === "open-profile") {
        ui.profileOpen = true;
        ui.profileAvatarDraft = null;
        render();
        return;
    }
    if (action === "close-profile") {
        closeProfile();
        return;
    }
    if (action === "choose-avatar") {
        document.getElementById("avatarInput")?.click();
        return;
    }
    if (action === "clear-avatar") {
        ui.profileAvatarDraft = "";
        render();
        return;
    }
    if (action !== "logout") return;
    try {
        await requestJson("/auth/logout", { method: "POST", skipAuthRedirect: true });
    } catch {
        // Clearing local state is still correct if the server session already expired.
    }
    authState = { status: "guest", user: null, error: null };
    appState = emptyState();
    localStorage.removeItem(STORAGE_KEY);
    ui.modal = null;
    ui.profileOpen = false;
    ui.groupChatOpen = false;
    ui.groupChatDraft = "";
    ui.profileAvatarDraft = null;
    ui.query = "";
    ui.filters = {};
    ui.columnFilters = {};
    resetGroupChatState();
    render();
}

async function handleChatAction(event) {
    const action = event.currentTarget.dataset.chatAction;
    if (action === "open") {
        ui.groupChatOpen = true;
        render();
        await fetchGroupChat();
        return;
    }
    if (action === "close") {
        ui.groupChatOpen = false;
        render();
        return;
    }
    if (action === "refresh") {
        await fetchGroupChat();
    }
}

async function fetchGroupChat({ silent = false } = {}) {
    if (authState.status !== "authenticated") return;
    if (!silent) {
        groupChatState.loading = true;
        groupChatState.error = null;
        if (ui.groupChatOpen) render();
    }
    try {
        const data = await requestJson(`/chat/group?limit=${GROUP_CHAT_LIMIT}`);
        groupChatState.messages = Array.isArray(data.messages) ? data.messages : [];
        groupChatState.error = null;
        groupChatState.lastFetchedAt = new Date().toISOString();
    } catch (error) {
        groupChatState.error = error.message || "Không tải được chat nhóm.";
        if (!silent) showToast(groupChatState.error);
    } finally {
        groupChatState.loading = false;
        if (ui.groupChatOpen) render();
    }
}

async function handleGroupChatSubmit(event) {
    event.preventDefault();
    if (groupChatState.sending) return;
    const form = event.currentTarget;
    const message = (form.elements.message?.value || "").trim();
    ui.groupChatDraft = message;
    if (!message) {
        showToast("Vui lòng nhập tin nhắn.");
        return;
    }
    groupChatState.sending = true;
    render();
    try {
        const data = await requestJson("/chat/group", {
            method: "POST",
            body: JSON.stringify({ message })
        });
        groupChatState.messages = [...groupChatState.messages, data.message].slice(-GROUP_CHAT_LIMIT);
        groupChatState.error = null;
        groupChatState.lastFetchedAt = new Date().toISOString();
        ui.groupChatDraft = "";
    } catch (error) {
        showToast(error.message || "Không gửi được tin nhắn.");
    } finally {
        groupChatState.sending = false;
        render();
    }
}

function resetGroupChatState() {
    groupChatState = {
        messages: [],
        loading: false,
        sending: false,
        error: null,
        lastFetchedAt: null
    };
}

function syncCurrentUserInGroupChat(user) {
    if (!user?.id || !groupChatState.messages.length) return;
    groupChatState.messages = groupChatState.messages.map((message) => {
        if (message.user?.id !== user.id) return message;
        return {
            ...message,
            user: {
                ...(message.user || {}),
                id: user.id,
                name: user.name,
                email: user.email,
                username: user.username,
                avatarData: user.avatarData || ""
            }
        };
    });
}

function closeProfile() {
    ui.profileOpen = false;
    ui.profileAvatarDraft = null;
    ui.profileSaving = false;
    ui.passwordSaving = false;
    render();
}

async function handleProfileSubmit(event) {
    event.preventDefault();
    if (ui.profileSaving) return;
    const form = event.currentTarget;
    const name = form.elements.profileName.value.trim();
    if (!name) {
        showToast("Vui lòng nhập tên hiển thị.");
        return;
    }

    ui.profileSaving = true;
    try {
        const avatarData = ui.profileAvatarDraft !== null ? ui.profileAvatarDraft : authState.user?.avatarData || "";
        const data = await requestJson("/auth/profile", {
            method: "PATCH",
            body: JSON.stringify({ name, avatarData })
        });
        authState = { ...authState, user: data.user };
        syncCurrentUserInGroupChat(data.user);
        ui.profileAvatarDraft = null;
        showToast("Đã cập nhật hồ sơ.");
        if (ui.groupChatOpen) fetchGroupChat({ silent: true });
    } catch (error) {
        showToast(error.message || "Không cập nhật được hồ sơ.");
    } finally {
        ui.profileSaving = false;
        render();
    }
}

async function handlePasswordSubmit(event) {
    event.preventDefault();
    if (ui.passwordSaving) return;
    const form = event.currentTarget;
    const currentPassword = form.elements.currentPassword.value;
    const newPassword = form.elements.newPassword.value;
    const confirmPassword = form.elements.confirmPassword.value;
    if (newPassword.length < 6) {
        showToast("Mật khẩu mới phải có ít nhất 6 ký tự.");
        return;
    }
    if (newPassword !== confirmPassword) {
        showToast("Mật khẩu mới nhập lại chưa khớp.");
        return;
    }

    ui.passwordSaving = true;
    try {
        await requestJson("/auth/change-password", {
            method: "POST",
            body: JSON.stringify({ currentPassword, newPassword })
        });
        form.reset();
        showToast("Đã đổi mật khẩu.");
    } catch (error) {
        showToast(error.message || "Không đổi được mật khẩu.");
    } finally {
        ui.passwordSaving = false;
        render();
    }
}

async function handleAvatarInput(event) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
        showToast("Vui lòng chọn file ảnh.");
        event.currentTarget.value = "";
        return;
    }
    if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
        showToast(`Ảnh đại diện nên dưới ${MAX_AVATAR_FILE_SIZE_MB}MB.`);
        event.currentTarget.value = "";
        return;
    }
    try {
        ui.profileAvatarDraft = await readFileAsDataUrl(file);
        render();
    } catch {
        showToast("Không đọc được file ảnh.");
    }
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function handleAction(event) {
    const action = event.currentTarget.dataset.action;
    const id = event.currentTarget.dataset.id;
    if (action === "open-create") return openCreate();
    if (action === "open-edit") return openEdit(id);
    if (action === "delete-row") return deleteRow(id);
    if (action === "close-modal") return closeModal();
    if (action === "reset-filters") return resetFilters();
    if (action === "export-excel") return exportExcel();
    if (action === "import-json") {
        if (authState.user?.role !== "admin") return showToast("Chỉ admin được nhập dữ liệu.");
        return document.getElementById("importDataInput")?.click();
    }
}

function openCreate() {
    if (ui.activeTab === "dashboard") return;
    ui.modal = { tab: ui.activeTab, id: null };
    render();
}

function openEdit(id) {
    if (!id) return;
    const mod = modules[ui.activeTab];
    const row = mod ? appState[mod.collection].find((item) => item.id === id) : null;
    if (!row || !canModifyRecord(row)) {
        showToast("Bạn chỉ có thể sửa bản ghi do chính mình tạo.");
        return;
    }
    ui.modal = { tab: ui.activeTab, id };
    render();
}

function closeModal() {
    ui.modal = null;
    render();
}

async function handleSubmit(event) {
    event.preventDefault();
    if (!ensureDbReady() || ui.saving) return;
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
    ui.saving = true;
    try {
        if (ui.modal.id) {
            const current = appState[mod.collection].find((row) => row.id === ui.modal.id);
            if (!current || !canModifyRecord(current)) {
                showToast("Bạn chỉ có thể sửa bản ghi do chính mình tạo.");
                return;
            }
            const record = {
                ...(current || {}),
                ...payload,
                id: ui.modal.id,
                createdAt: current?.createdAt || now,
                updatedAt: now
            };
            const result = await updateRemoteRecord(mod.collection, ui.modal.id, record);
            appState[mod.collection] = appState[mod.collection].map((row) => row.id === ui.modal.id ? result.record : row);
            appState.updatedAt = result.updatedAt || now;
            showToast("Đã cập nhật bản ghi vào Railway DB.");
        } else {
            const record = {
                id: createId(),
                ...payload,
                createdAt: now,
                updatedAt: now
            };
            const result = await createRemoteRecord(mod.collection, record);
            appState[mod.collection].unshift(result.record);
            appState.updatedAt = result.updatedAt || now;
            showToast("Đã thêm bản ghi vào Railway DB.");
        }
        setDataStatus("online", "Railway Postgres đang hoạt động");
        localStorage.setItem(MIGRATION_FLAG_KEY, "active");
        cacheState();
        ui.modal = saveMode === "add-more" ? { tab: mod.collection, id: null } : null;
    } catch (error) {
        setDataStatus("offline", error.message || "Không lưu được vào Railway DB");
        showToast(`Không lưu được vào DB: ${error.message}`);
    } finally {
        ui.saving = false;
        render();
    }
}

async function deleteRow(id) {
    const mod = modules[ui.activeTab];
    if (!mod || !id || !ensureDbReady() || ui.saving) return;
    const row = appState[mod.collection].find((item) => item.id === id);
    if (!row) return;
    if (!canModifyRecord(row)) {
        showToast("Bạn chỉ có thể xóa bản ghi do chính mình tạo.");
        return;
    }
    if (!confirm(`Xóa "${recordTitle(row, mod)}"?`)) return;
    ui.saving = true;
    try {
        const result = await deleteRemoteRecord(mod.collection, id);
        appState[mod.collection] = appState[mod.collection].filter((item) => item.id !== id);
        appState.updatedAt = result.updatedAt || new Date().toISOString();
        setDataStatus("online", "Railway Postgres đang hoạt động");
        localStorage.setItem(MIGRATION_FLAG_KEY, "active");
        cacheState();
        showToast("Đã xóa bản ghi khỏi Railway DB.");
    } catch (error) {
        setDataStatus("offline", error.message || "Không xóa được dữ liệu");
        showToast(`Không xóa được: ${error.message}`);
    } finally {
        ui.saving = false;
        render();
    }
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

async function exportExcel() {
    if (ui.saving) return;
    ui.saving = true;
    showToast("Đang tạo file Excel từ Railway DB...");
    try {
        const response = await fetch(`${API_BASE}/export/excel`, {
            credentials: "same-origin"
        });
        if (!response.ok) {
            let message = `Không xuất được Excel (${response.status}).`;
            try {
                const data = await response.json();
                message = data.error || message;
            } catch {
                // Keep the HTTP status message when the response is not JSON.
            }
            throw new Error(message);
        }
        const disposition = response.headers.get("Content-Disposition") || "";
        const filename = disposition.match(/filename="([^"]+)"/i)?.[1] || `squad2-uat-${todayStamp()}.xlsx`;
        downloadBlob(await response.blob(), filename);
        showToast("Đã xuất file Excel gồm 6 sheet dữ liệu.");
    } catch (error) {
        showToast(error.message || "Không xuất được file Excel.");
    } finally {
        ui.saving = false;
    }
}

function handleImport(event) {
    if (authState.user?.role !== "admin") {
        showToast("Chỉ admin được nhập và thay thế toàn bộ dữ liệu.");
        event.target.value = "";
        return;
    }
    if (!ensureDbReady() || ui.saving) {
        event.target.value = "";
        return;
    }
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
        let parsed;
        try {
            parsed = JSON.parse(reader.result);
        } catch {
            showToast("File JSON không hợp lệ.");
            event.target.value = "";
            return;
        }
        try {
            const nextState = emptyState();
            Object.keys(modules).forEach((id) => {
                const collection = modules[id].collection;
                nextState[collection] = Array.isArray(parsed[collection]) ? parsed[collection] : [];
            });
            nextState.updatedAt = new Date().toISOString();
            if (!confirm("Nhập JSON sẽ thay thế toàn bộ dữ liệu hiện có trên Railway DB. Tiếp tục?")) {
                event.target.value = "";
                return;
            }
            ui.saving = true;
            const result = await replaceRemoteState(nextState);
            appState = normalizeState(result.state || nextState);
            setDataStatus("online", "Railway Postgres đang hoạt động");
            localStorage.setItem(MIGRATION_FLAG_KEY, "uploaded");
            cacheState();
            showToast("Đã nhập dữ liệu JSON vào Railway DB.");
            render();
        } catch (error) {
            setDataStatus("offline", error.message || "Không nhập được dữ liệu");
            showToast(error.message ? `Không nhập được: ${error.message}` : "File JSON không hợp lệ.");
        } finally {
            ui.saving = false;
            event.target.value = "";
        }
    };
    reader.readAsText(file, "utf-8");
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

function normalizeLookupKey(value) {
    return String(value || "").trim().toLocaleLowerCase("vi");
}

function isFilled(value) {
    return value !== "" && value != null && String(value).trim() !== "";
}

function getProgressTone(value) {
    const safeValue = clamp(value);
    if (!safeValue) return "gray";
    if (safeValue >= 90) return "green";
    if (safeValue >= 75) return "blue";
    if (safeValue >= 55) return "yellow";
    return "red";
}

function parseDateOnly(value) {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
}

function getTodayDateOnly() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

function daysBetween(fromDate, toDate) {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((toDate.getTime() - fromDate.getTime()) / msPerDay);
}

function formatPlainDate(value) {
    const date = parseDateOnly(value);
    if (!date) return String(value || "-");
    return new Intl.DateTimeFormat("vi-VN").format(date);
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

function renderDbStatusPill() {
    if (dataStatus.mode === "online") {
        return `<span class="pill good" title="${e(dataStatus.message)}"><i class="fa-solid fa-database"></i>DB online</span>`;
    }
    if (dataStatus.mode === "loading") {
        return `<span class="pill warn" title="${e(dataStatus.message)}"><i class="fa-solid fa-rotate fa-spin"></i>Đang nối DB</span>`;
    }
    return `<span class="pill bad" title="${e(dataStatus.message)}"><i class="fa-solid fa-triangle-exclamation"></i>DB offline</span>`;
}

function renderDataHealthPill(totalRecords) {
    if (totalRecords === 0) return `<span class="pill warn"><i class="fa-solid fa-database"></i>0 bản ghi</span>`;
    return `<span class="pill good"><i class="fa-solid fa-database"></i>${e(totalRecords)} bản ghi</span>`;
}

function renderDbSyncPill() {
    return `
        <span class="pill" title="Thời điểm trình duyệt lấy dữ liệu mới nhất từ DB.">
            <i class="fa-regular fa-clock"></i>${e(formatLastSyncAt())}
        </span>
    `;
}

function canModifyRecord(row) {
    if (authState.user?.role === "admin") return true;
    return row?._ownership?.canEdit === true;
}

function recordOwnerLabel(row) {
    return row?._ownership?.createdByName || row?._ownership?.createdByEmail || "admin";
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
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh"
    }).format(date);
}

function formatLastSyncAt() {
    if (!dataStatus.lastSyncAt) return "Chưa đồng bộ";
    const date = new Date(dataStatus.lastSyncAt);
    if (Number.isNaN(date.getTime())) return "Chưa đồng bộ";
    return `Đồng bộ ${new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh"
    }).format(date)}`;
}

document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (ui.groupChatOpen) {
        ui.groupChatOpen = false;
        render();
        return;
    }
    if (ui.profileOpen) {
        closeProfile();
        return;
    }
    if (ui.modal) closeModal();
});

window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    appState = loadCachedState();
    ui.modal = null;
    render();
});

window.addEventListener("hashchange", () => {
    ui.activeTab = getInitialTab();
    ui.query = "";
    render();
});

function refreshFromDbIfIdle() {
    if (authState.status !== "authenticated") return;
    if (ui.modal || ui.profileOpen || ui.saving || document.hidden) return;
    hydrateState(false);
}

function refreshGroupChatIfOpen() {
    if (!ui.groupChatOpen || authState.status !== "authenticated" || document.hidden || groupChatState.sending) return;
    fetchGroupChat({ silent: true });
}

window.addEventListener("focus", refreshFromDbIfIdle);
window.setInterval(refreshFromDbIfIdle, SYNC_INTERVAL_MS);
window.setInterval(refreshGroupChatIfOpen, GROUP_CHAT_POLL_INTERVAL_MS);

render();
initAuth();
