const STORAGE_KEY = "squad2_uat_command_center_v1";
const MIGRATION_FLAG_KEY = `${STORAGE_KEY}_remote_migration_checked`;
const LEGACY_BACKUP_KEY = `${STORAGE_KEY}_legacy_backup`;
const COLUMN_WIDTHS_KEY = `${STORAGE_KEY}_column_widths_v3`;
const API_BASE = "/api";
const SYNC_INTERVAL_MS = 30000;
const GROUP_CHAT_POLL_INTERVAL_MS = 15000;
const GROUP_CHAT_LIMIT = 50;
const MAX_AVATAR_FILE_SIZE_MB = 6;
const MAX_AVATAR_FILE_SIZE_BYTES = MAX_AVATAR_FILE_SIZE_MB * 1024 * 1024;
const ACTION_COLUMN_KEY = "__actions";
const ACTION_COLUMN_DEFAULT_WIDTH = 104;
const COLUMN_RESIZE_MIN_WIDTH = 48;
const COLUMN_DEFAULT_SAMPLE_SIZE = 80;
const TABLE_TARGET_MIN_WIDTH = 980;
const TABLE_VIEWPORT_GUTTER = 104;
const COLUMN_HEADER_CONTROL_WIDTH = 58;
const COLUMN_HEADER_FIT_BUFFER = 8;

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
    "Done RSD",
    "Done DEV",
    "Done SIT",
    "Done UAT"
];
const ownerOptions = [
    "NV1 - Bùi Thị Mai Phương",
    "NV2 - Nguyễn Châu Giang",
    "NV3 - Phạm Anh Tuấn",
    "ALL",
    "BA"
];
const legacyStatusOptions = [
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
        label: "Danh mục UAT",
        shortLabel: "Danh mục",
        icon: "fa-layer-group",
        collection: "features",
        stickyColumns: 4,
        compactTable: true,
        description: "Quản lý danh mục chức năng theo Story, Jira, Sprint, nghiệp vụ và trạng thái UAT.",
        emptyIcon: "fa-list-check",
        emptyTitle: "Chưa có danh mục UAT",
        emptyText: "Danh mục sẽ hiển thị tại đây sau khi có bản ghi.",
        fields: [
            { key: "stt", label: "STT", type: "number", defaultValue: getNextFeatureStt },
            { key: "code", label: "Mã CN", type: "text", required: true },
            { key: "storyCode", label: "Mã Story", type: "text" },
            { key: "jiraCode", label: "Mã Jira", type: "text" },
            { key: "group", label: "Nhóm chức năng", type: "text", full: true },
            { key: "jiraName", label: "Tên Jira", type: "text", full: true },
            { key: "name", label: "Tên chức năng", type: "text", required: true, full: true },
            { key: "jiraLink", label: "Link Jira", type: "text" },
            { key: "rsdLink", label: "Link RSD", type: "text" },
            { key: "sprintBA", label: "Sprint BA", type: "text" },
            { key: "sprintDev", label: "Sprint DEV", type: "text" },
            { key: "sprintQC", label: "Sprint QC", type: "text" },
            { key: "businessSprint", label: "Sprint Nghiệp vụ", type: "text" },
            { key: "sprint", label: "Sprint", type: "text" },
            { key: "status", label: "Trạng thái", type: "select", options: statusOptions },
            { key: "owner", label: "Đầu mối nghiệp vụ", type: "text" },
            { key: "uatHandoff", label: "Ngày bàn giao UAT", type: "date" },
            { key: "uatStart", label: "Ngày bắt đầu UAT", type: "date" },
            { key: "uatEnd", label: "Ngày kết thúc UAT", type: "date" },
            { key: "uatDone", label: "Ngày hoàn thành UAT", type: "date" },
            { key: "uatSigned", label: "Ngày ký UAT", type: "date" },
            { key: "handoffStatus", label: "Tình trạng bàn giao", type: "text" },
            { key: "completionRate", label: "% Hoàn thành TC", type: "percent" },
            { key: "openBugs", label: "Số lỗi mở", type: "number" },
            { key: "uatWarning", label: "Cảnh báo UAT", type: "text" }
        ],
        filters: [
            { key: "sprint", label: "Sprint" },
            { key: "owner", label: "Nghiệp vụ" },
            { key: "status", label: "Trạng thái" }
        ],
        columns: [
            { key: "stt", label: "STT", width: "56px" },
            { key: "code", label: "Mã CN", width: "104px", render: (row) => tag(row.code, "teal") },
            { key: "storyCode", label: "Mã Story", width: "100px", render: (row) => tag(row.storyCode, "gray") },
            { key: "jiraCode", label: "Mã Jira", width: "132px" },
            { key: "group", label: "Nhóm chức năng", width: "220px" },
            { key: "name", label: "Tên chức năng", width: "250px", render: (row) => strongText(row.name) },
            { key: "jiraName", label: "Tên Jira", width: "220px" },
            { key: "jiraLink", label: "Link Jira", width: "160px" },
            { key: "rsdLink", label: "Link RSD", width: "160px" },
            { key: "sprintBA", label: "Sprint BA", width: "108px" },
            { key: "sprintDev", label: "Sprint DEV", width: "108px" },
            { key: "sprintQC", label: "Sprint QC", width: "108px" },
            { key: "businessSprint", label: "Sprint Nghiệp vụ", width: "150px" },
            { key: "status", label: "Trạng thái", width: "112px", render: (row) => renderStatus(row.status) },
            { key: "owner", label: "Đầu mối nghiệp vụ", width: "188px" },
            { key: "uatHandoff", label: "Ngày bàn giao UAT", width: "160px", render: (row) => formatDate(row.uatHandoff || row.handoffDate) },
            { key: "uatStart", label: "Ngày bắt đầu UAT", width: "160px", render: (row) => formatDate(row.uatStart) },
            { key: "uatEnd", label: "Ngày kết thúc UAT", width: "160px", render: (row) => formatDate(row.uatEnd) },
            { key: "uatDone", label: "Ngày hoàn thành UAT", width: "176px", render: (row) => formatDate(row.uatDone) },
            { key: "uatSigned", label: "Ngày ký UAT", width: "140px", render: (row) => formatDate(row.uatSigned) },
            { key: "handoffStatus", label: "Tình trạng bàn giao", width: "170px", render: (row) => renderStatus(row.handoffStatus) },
            { key: "completionRate", label: "% Hoàn thành TC", width: "150px", render: (row) => progressCell(row.completionRate) },
            { key: "openBugs", label: "Số lỗi mở", width: "110px", render: (row) => bugTag(row.openBugs) },
            { key: "uatWarning", label: "Cảnh báo UAT", width: "150px", render: (row) => renderStatus(row.uatWarning) }
        ]
    },
    personnel: {
        label: "Nhân sự UAT",
        shortLabel: "Nhân sự",
        icon: "fa-users",
        collection: "personnel",
        description: "Danh sách nhân sự tham gia UAT, vai trò, phạm vi phụ trách và thông tin liên hệ.",
        emptyIcon: "fa-user-plus",
        emptyTitle: "Chưa có dữ liệu nhân sự",
        emptyText: "Danh sách nhân sự từ sheet NhanSu_UAT sẽ hiển thị tại đây sau khi nhập Excel.",
        fields: [
            { key: "staffCode", label: "Mã nhân sự", type: "text", required: true },
            { key: "name", label: "Họ tên", type: "text", required: true },
            { key: "role", label: "Vai trò", type: "text" },
            { key: "scope", label: "Phạm vi chính", type: "textarea", full: true },
            { key: "status", label: "Trạng thái", type: "text" },
            { key: "birthYear", label: "Năm sinh", type: "number" },
            { key: "phone", label: "SĐT", type: "text" },
            { key: "email", label: "Email", type: "text" },
            { key: "unit", label: "Đơn vị", type: "text" }
        ],
        filters: [
            { key: "role", label: "Vai trò" },
            { key: "status", label: "Trạng thái" },
            { key: "unit", label: "Đơn vị" }
        ],
        columns: [
            { key: "staffCode", label: "Mã nhân sự", width: "112px", render: (row) => tag(row.staffCode, "teal") },
            { key: "name", label: "Họ tên", width: "180px", render: (row) => strongText(row.name, row.email) },
            { key: "role", label: "Vai trò", width: "190px" },
            { key: "scope", label: "Phạm vi chính", width: "280px" },
            { key: "status", label: "Trạng thái", width: "140px", render: (row) => renderStatus(row.status) },
            { key: "birthYear", label: "Năm sinh", width: "96px" },
            { key: "phone", label: "SĐT", width: "130px" },
            { key: "email", label: "Email", width: "220px" },
            { key: "unit", label: "Đơn vị", width: "150px" }
        ]
    },
    schedule: {
        label: "Lịch UAT",
        shortLabel: "Lịch",
        icon: "fa-calendar-check",
        collection: "schedule",
        description: "Lịch bàn giao, bắt đầu và kết thúc UAT theo Sprint.",
        emptyIcon: "fa-calendar-plus",
        emptyTitle: "Chưa có lịch UAT",
        emptyText: "Lịch từ sheet Lich_UAT sẽ hiển thị tại đây sau khi nhập Excel.",
        fields: [
            { key: "sprint", label: "Sprint", type: "text", required: true },
            { key: "devStart", label: "Bắt đầu DEV", type: "date" },
            { key: "devEnd", label: "Kết thúc DEV", type: "date" },
            { key: "handoffDate", label: "Bàn giao UAT", type: "date" },
            { key: "startDate", label: "Bắt đầu UAT", type: "date" },
            { key: "endDate", label: "Kết thúc UAT", type: "date" },
            { key: "note", label: "Ghi chú", type: "textarea", full: true }
        ],
        filters: [
            { key: "sprint", label: "Sprint" }
        ],
        columns: [
            { key: "sprint", label: "Sprint", width: "120px", render: (row) => tag(row.sprint, "teal") },
            { key: "devStart", label: "Bắt đầu DEV", width: "150px", render: (row) => formatDate(row.devStart) },
            { key: "devEnd", label: "Kết thúc DEV", width: "150px", render: (row) => formatDate(row.devEnd) },
            { key: "handoffDate", label: "Bàn giao UAT", width: "160px", render: (row) => formatDate(row.handoffDate) },
            { key: "startDate", label: "Bắt đầu UAT", width: "160px", render: (row) => formatDate(row.startDate) },
            { key: "endDate", label: "Kết thúc UAT", width: "160px", render: (row) => formatDate(row.endDate) },
            { key: "note", label: "Ghi chú", width: "260px" }
        ]
    },
    handoffs: {
        label: "Bàn giao US",
        shortLabel: "Bàn giao",
        icon: "fa-truck-fast",
        collection: "handoffs",
        description: "Lịch bàn giao UAT chi tiết theo từng User Story.",
        emptyIcon: "fa-calendar-day",
        emptyTitle: "Chưa có lịch bàn giao US",
        emptyText: "Dữ liệu từ sheet Lich_BG_US sẽ hiển thị tại đây sau khi nhập Excel.",
        fields: [
            { key: "jiraCode", label: "Mã Jira", type: "text", required: true },
            { key: "code", label: "Mã CN", type: "text" },
            { key: "storyCode", label: "Mã Story", type: "text" },
            { key: "name", label: "Tên chức năng", type: "text", required: true, full: true },
            { key: "sprint", label: "Sprint", type: "text" },
            { key: "defaultHandoffDate", label: "Ngày mặc định theo Sprint", type: "date" },
            { key: "uatHandoff", label: "BG UAT theo US", type: "date" },
            { key: "uatStart", label: "Ngày bắt đầu theo US", type: "date" },
            { key: "uatEnd", label: "Ngày kết thúc theo US", type: "date" },
            { key: "handoffStatus", label: "Trạng thái bàn giao", type: "text" },
            { key: "note", label: "Ghi chú", type: "textarea", full: true }
        ],
        filters: [
            { key: "sprint", label: "Sprint" },
            { key: "handoffStatus", label: "Trạng thái" }
        ],
        columns: [
            { key: "jiraCode", label: "Mã Jira", width: "140px" },
            { key: "code", label: "Mã CN", width: "92px", render: (row) => tag(row.code, "teal") },
            { key: "storyCode", label: "Mã Story", width: "100px", render: (row) => tag(row.storyCode, "gray") },
            { key: "name", label: "Tên chức năng", width: "280px", render: (row) => strongText(row.name, row.note) },
            { key: "sprint", label: "Sprint", width: "96px" },
            { key: "defaultHandoffDate", label: "Ngày mặc định theo Sprint", width: "220px", render: (row) => formatDate(row.defaultHandoffDate) },
            { key: "uatHandoff", label: "BG UAT theo US", width: "230px", render: (row) => formatDate(row.uatHandoff) },
            { key: "uatStart", label: "Ngày bắt đầu UAT theo US", width: "230px", render: (row) => formatDate(row.uatStart) },
            { key: "uatEnd", label: "Ngày kết thúc UAT theo US", width: "230px", render: (row) => formatDate(row.uatEnd) },
            { key: "handoffStatus", label: "Trạng thái bàn giao", width: "180px", render: (row) => renderStatus(row.handoffStatus) },
            { key: "note", label: "Ghi chú", width: "180px" }
        ]
    },
    plans: {
        label: "Phân công Sprint",
        shortLabel: "Phân công",
        icon: "fa-calendar-days",
        collection: "plans",
        description: "Phân công chức năng theo sprint, đầu mối nghiệp vụ, NV, tester T1-T6 và trạng thái testcase.",
        emptyIcon: "fa-calendar-plus",
        emptyTitle: "Chưa có phân công Sprint",
        emptyText: "Kế hoạch phân công sẽ hiển thị tại đây sau khi có bản ghi.",
        fields: [
            { key: "code", label: "Mã CN", type: "text" },
            { key: "jiraCode", label: "Mã Jira", type: "text" },
            { key: "group", label: "Nhóm chức năng", type: "text", full: true },
            { key: "feature", label: "Tên chức năng", type: "text", required: true, full: true },
            { key: "sprint", label: "Sprint", type: "text" },
            { key: "uatHandoff", label: "Bàn giao UAT", type: "date" },
            { key: "owner", label: "Đầu mối nghiệp vụ", type: "text" },
            { key: "nv", label: "NV", type: "number" },
            { key: "t1", label: "T1", type: "number" },
            { key: "t2", label: "T2", type: "number" },
            { key: "t3", label: "T3", type: "number" },
            { key: "t4", label: "T4", type: "number" },
            { key: "t5", label: "T5", type: "number" },
            { key: "t6", label: "T6", type: "number" },
            { key: "totalCases", label: "Tổng Testcase", type: "number" },
            { key: "executedCases", label: "Đã thực hiện", type: "number" },
            { key: "progress", label: "% hoàn thành", type: "percent" },
            { key: "uatStatus", label: "Trạng thái UAT", type: "text" },
            { key: "rotationWarning", label: "Cảnh báo luân chuyển", type: "text" },
            { key: "note", label: "Ghi chú", type: "textarea", full: true }
        ],
        filters: [
            { key: "sprint", label: "Sprint" },
            { key: "owner", label: "Chủ quản" }
        ],
        columns: [
            { key: "code", label: "Mã CN", width: "112px", render: (row) => tag(row.code, "teal") },
            { key: "jiraCode", label: "Mã Jira", width: "140px" },
            { key: "group", label: "Nhóm chức năng", width: "220px" },
            { key: "feature", label: "Tên chức năng", width: "260px", render: (row) => strongText(row.feature, row.note) },
            { key: "sprint", label: "Sprint", width: "100px", render: (row) => tag(row.sprint, "teal") },
            { key: "uatHandoff", label: "Bàn giao UAT", width: "150px", render: (row) => formatDate(row.uatHandoff) },
            { key: "owner", label: "Đầu mối nghiệp vụ", width: "188px" },
            { key: "nv", label: "NV", width: "68px", render: (row) => numberText(row.nv) },
            { key: "t1", label: "T1", width: "68px", render: (row) => numberText(row.t1) },
            { key: "t2", label: "T2", width: "68px", render: (row) => numberText(row.t2) },
            { key: "t3", label: "T3", width: "68px", render: (row) => numberText(row.t3) },
            { key: "t4", label: "T4", width: "68px", render: (row) => numberText(row.t4) },
            { key: "t5", label: "T5", width: "68px", render: (row) => numberText(row.t5) },
            { key: "t6", label: "T6", width: "68px", render: (row) => numberText(row.t6) },
            { key: "totalCases", label: "Tổng Testcase", width: "130px", render: (row) => numberText(row.totalCases) },
            { key: "executedCases", label: "Đã thực hiện", width: "120px", render: (row) => numberText(row.executedCases) },
            { key: "progress", label: "% hoàn thành", width: "140px", render: (row) => progressCell(resolveRate(row.progress, row.executedCases, row.totalCases)) },
            { key: "uatStatus", label: "Trạng thái UAT", width: "150px", render: (row) => renderStatus(row.uatStatus) },
            { key: "rotationWarning", label: "Cảnh báo luân chuyển", width: "180px", render: (row) => renderStatus(row.rotationWarning) },
            { key: "note", label: "Ghi chú", width: "180px" }
        ]
    },
    matrix: {
        label: "Ma trận năng lực",
        shortLabel: "Ma trận",
        icon: "fa-table-cells-large",
        collection: "matrix",
        description: "Theo dõi ma trận nhóm chức năng theo các mốc T1-T6.",
        emptyIcon: "fa-grip",
        emptyTitle: "Chưa có ma trận năng lực",
        emptyText: "Ma trận sẽ hiển thị tại đây sau khi có bản ghi.",
        fields: [
            { key: "group", label: "Nhóm chức năng", type: "text", required: true, full: true },
            { key: "t1", label: "T1", type: "number" },
            { key: "t2", label: "T2", type: "number" },
            { key: "t3", label: "T3", type: "number" },
            { key: "t4", label: "T4", type: "number" },
            { key: "t5", label: "T5", type: "number" },
            { key: "t6", label: "T6", type: "number" },
            { key: "totalParticipation", label: "Tổng lượt tham gia", type: "number" },
            { key: "target", label: "Mục tiêu", type: "number" },
            { key: "warning", label: "Cảnh báo", type: "text" }
        ],
        filters: [
            { key: "group", label: "Nhóm" }
        ],
        columns: [
            { key: "group", label: "Nhóm chức năng", width: "300px", render: (row) => tag(row.group, "teal") },
            { key: "t1", label: "T1", width: "80px", render: (row) => numberText(row.t1) },
            { key: "t2", label: "T2", width: "80px", render: (row) => numberText(row.t2) },
            { key: "t3", label: "T3", width: "80px", render: (row) => numberText(row.t3) },
            { key: "t4", label: "T4", width: "80px", render: (row) => numberText(row.t4) },
            { key: "t5", label: "T5", width: "80px", render: (row) => numberText(row.t5) },
            { key: "t6", label: "T6", width: "80px", render: (row) => numberText(row.t6) },
            { key: "totalParticipation", label: "Tổng lượt tham gia", width: "180px", render: (row) => numberText(row.totalParticipation) },
            { key: "target", label: "Mục tiêu", width: "100px", render: (row) => numberText(row.target) },
            { key: "warning", label: "Cảnh báo", width: "180px", render: (row) => renderStatus(row.warning) }
        ]
    },
    daily: {
        label: "Điều hành hằng ngày",
        shortLabel: "Daily",
        icon: "fa-clipboard-check",
        collection: "daily",
        description: "Theo dõi testcase, tiến độ, lỗi nghiêm trọng, lỗi mức cao và vướng mắc hằng ngày.",
        emptyIcon: "fa-clipboard-list",
        emptyTitle: "Chưa có dữ liệu điều hành hằng ngày",
        emptyText: "Dữ liệu điều hành sẽ hiển thị tại đây sau khi có bản ghi.",
        fields: [
            { key: "date", label: "Ngày", type: "date" },
            { key: "sprint", label: "Sprint", type: "text" },
            { key: "code", label: "Mã chức năng", type: "text" },
            { key: "jiraCode", label: "Mã Jira", type: "text" },
            { key: "feature", label: "Tên chức năng", type: "text", full: true },
            { key: "tester", label: "Tester", type: "text" },
            { key: "totalCases", label: "Tổng TC", type: "number" },
            { key: "executedCases", label: "TC đã chạy", type: "number" },
            { key: "passedCases", label: "TC đạt", type: "number" },
            { key: "failedCases", label: "TC lỗi", type: "number" },
            { key: "bugStatus", label: "Trạng thái lỗi", type: "text" },
            { key: "maxBugSeverity", label: "Mức độ lỗi", type: "text" },
            { key: "blocker", label: "Vướng mắc/Blocker", type: "textarea", full: true },
            { key: "handler", label: "Người xử lý", type: "text" },
            { key: "dueDate", label: "Thời hạn xử lý", type: "date" }
        ],
        filters: [
            { key: "sprint", label: "Sprint" },
            { key: "tester", label: "Tester" }
        ],
        columns: [
            { key: "date", label: "Ngày", width: "118px", render: (row) => formatDate(row.date) },
            { key: "sprint", label: "Sprint", width: "100px" },
            { key: "code", label: "Mã chức năng", width: "120px", render: (row) => tag(row.code, "teal") },
            { key: "jiraCode", label: "Mã Jira", width: "140px" },
            { key: "feature", label: "Tên chức năng", width: "260px", render: (row) => strongText(row.feature) },
            { key: "tester", label: "Tester", width: "120px" },
            { key: "totalCases", label: "Tổng TC", width: "100px", render: (row) => numberText(row.totalCases) },
            { key: "executedCases", label: "TC đã chạy", width: "110px", render: (row) => numberText(row.executedCases) },
            { key: "passedCases", label: "TC đạt", width: "90px", render: (row) => numberText(row.passedCases) },
            { key: "failedCases", label: "TC lỗi", width: "90px", render: (row) => numberText(row.failedCases) },
            { key: "bugStatus", label: "Trạng thái lỗi", width: "150px", render: (row) => renderStatus(row.bugStatus) },
            { key: "maxBugSeverity", label: "Mức độ lỗi", width: "180px", render: (row) => renderStatus(row.maxBugSeverity) },
            { key: "blocker", label: "Vướng mắc/Blocker", width: "240px" },
            { key: "handler", label: "Người xử lý", width: "150px" },
            { key: "dueDate", label: "Thời hạn xử lý", width: "150px", render: (row) => formatDate(row.dueDate) }
        ]
    },
    weekly: {
        label: "Chất lượng tuần",
        shortLabel: "Chất lượng",
        icon: "fa-chart-line",
        collection: "weekly",
        description: "Tổng hợp chất lượng kiểm thử theo tuần và nhóm chức năng.",
        emptyIcon: "fa-chart-column",
        emptyTitle: "Chưa có dữ liệu chất lượng tuần",
        emptyText: "Dữ liệu chất lượng tuần sẽ hiển thị tại đây sau khi có bản ghi.",
        fields: [
            { key: "week", label: "Tuần", type: "text", required: true },
            { key: "sprint", label: "Sprint", type: "text" },
            { key: "group", label: "Nhóm chức năng", type: "text" },
            { key: "totalStories", label: "Tổng Story", type: "number" },
            { key: "totalCases", label: "Tổng Testcase", type: "number" },
            { key: "executedCases", label: "TC đã chạy", type: "number" },
            { key: "coverageRate", label: "Tỷ lệ bao phủ", type: "percent" },
            { key: "passedCases", label: "TC đạt", type: "number" },
            { key: "successRate", label: "Tỷ lệ thành công", type: "percent" },
            { key: "blockerBugs", label: "Lỗi Blocker", type: "number" },
            { key: "criticalBugs", label: "Lỗi Critical", type: "number" },
            { key: "majorBugs", label: "Lỗi Major", type: "number" },
            { key: "gateResult", label: "Kết quả", type: "text" },
            { key: "note", label: "Ghi chú", type: "textarea", full: true }
        ],
        filters: [
            { key: "week", label: "Tuần" },
            { key: "group", label: "Nhóm" },
            { key: "assessment", label: "Đánh giá" }
        ],
        columns: [
            { key: "week", label: "Tuần", width: "110px", render: (row) => tag(row.week, "teal") },
            { key: "sprint", label: "Sprint", width: "100px" },
            { key: "group", label: "Nhóm chức năng", width: "220px" },
            { key: "totalStories", label: "Tổng Story", width: "110px", render: (row) => numberText(row.totalStories) },
            { key: "totalCases", label: "Tổng Testcase", width: "130px", render: (row) => numberText(row.totalCases) },
            { key: "executedCases", label: "TC đã chạy", width: "120px", render: (row) => numberText(row.executedCases) },
            { key: "coverageRate", label: "Tỷ lệ bao phủ", width: "150px", render: (row) => progressCell(resolveRate(row.coverageRate, row.executedCases, row.totalCases)) },
            { key: "passedCases", label: "TC đạt", width: "90px", render: (row) => numberText(row.passedCases) },
            { key: "successRate", label: "Tỷ lệ thành công", width: "160px", render: (row) => progressCell(row.successRate) },
            { key: "blockerBugs", label: "Lỗi Blocker", width: "120px", render: (row) => bugTag(row.blockerBugs) },
            { key: "criticalBugs", label: "Lỗi Critical", width: "120px", render: (row) => bugTag(row.criticalBugs, "orange") },
            { key: "majorBugs", label: "Lỗi Major", width: "110px", render: (row) => bugTag(row.majorBugs, "yellow") },
            { key: "gateResult", label: "Kết quả", width: "150px", render: (row) => renderStatus(row.gateResult || row.assessment) },
            { key: "note", label: "Ghi chú", width: "180px" }
        ]
    },
    readiness: {
        label: "Kết thúc Sprint",
        shortLabel: "Kết thúc",
        icon: "fa-flag-checkered",
        collection: "readiness",
        description: "Chốt sprint theo tỷ lệ bao phủ, tỷ lệ thành công, lỗi tồn đọng, mức độ sẵn sàng và quyết định.",
        emptyIcon: "fa-flag",
        emptyTitle: "Chưa có dữ liệu kết thúc Sprint",
        emptyText: "Dữ liệu kết thúc Sprint sẽ hiển thị tại đây sau khi có bản ghi.",
        fields: [
            { key: "sprint", label: "Sprint", type: "text", required: true },
            { key: "handoffDate", label: "Ngày bàn giao UAT", type: "date" },
            { key: "totalStories", label: "Tổng Story", type: "number" },
            { key: "totalCases", label: "Tổng Testcase", type: "number" },
            { key: "executedCases", label: "TC đã chạy", type: "number" },
            { key: "coverageRate", label: "Tỷ lệ bao phủ", type: "percent" },
            { key: "passedCases", label: "TC đạt", type: "number" },
            { key: "successRate", label: "Tỷ lệ thành công", type: "percent" },
            { key: "openCriticalBugs", label: "Lỗi nghiêm trọng mở", type: "number" },
            { key: "openHighBugs", label: "Lỗi cao mở", type: "number" },
            { key: "readinessLevel", label: "Mức độ sẵn sàng", type: "text" },
            { key: "decision", label: "Quyết định", type: "text" },
            { key: "note", label: "Ghi chú", type: "textarea", full: true }
        ],
        filters: [
            { key: "sprint", label: "Sprint" },
            { key: "decision", label: "Quyết định" }
        ],
        columns: [
            { key: "sprint", label: "Sprint", width: "110px", render: (row) => tag(row.sprint, "teal") },
            { key: "handoffDate", label: "Ngày bàn giao UAT", width: "160px", render: (row) => formatDate(row.handoffDate) },
            { key: "totalStories", label: "Tổng Story", width: "110px", render: (row) => numberText(row.totalStories) },
            { key: "totalCases", label: "Tổng Testcase", width: "130px", render: (row) => numberText(row.totalCases) },
            { key: "executedCases", label: "TC đã chạy", width: "120px", render: (row) => numberText(row.executedCases) },
            { key: "coverageRate", label: "Tỷ lệ bao phủ", width: "150px", render: (row) => progressCell(row.coverageRate) },
            { key: "passedCases", label: "TC đạt", width: "86px", render: (row) => numberText(row.passedCases) },
            { key: "successRate", label: "Tỷ lệ thành công", width: "160px", render: (row) => progressCell(row.successRate) },
            { key: "openCriticalBugs", label: "Lỗi nghiêm trọng mở", width: "170px", render: (row) => bugTag(row.openCriticalBugs) },
            { key: "openHighBugs", label: "Lỗi cao mở", width: "120px", render: (row) => bugTag(row.openHighBugs, "yellow") },
            { key: "readinessLevel", label: "Mức độ sẵn sàng", width: "160px", render: (row) => renderStatus(row.readinessLevel) },
            { key: "decision", label: "Quyết định", width: "160px", render: (row) => renderDecision(row.decision) },
            { key: "note", label: "Ghi chú", width: "180px" }
        ]
    },
    guide: {
        label: "HD_UAT",
        shortLabel: "HD_UAT",
        icon: "fa-book-open",
        collection: "guide",
        sectionKey: "category",
        sectionColumnKey: "topic",
        description: "Hướng dẫn sử dụng bộ công cụ UAT Squad 2.",
        emptyIcon: "fa-book",
        emptyTitle: "Chưa có dữ liệu HD_UAT",
        emptyText: "Nội dung từ sheet HD_UAT sẽ hiển thị tại đây sau khi nhập Excel.",
        fields: [
            { key: "category", label: "Nhóm nội dung", type: "text" },
            { key: "index", label: "STT", type: "number" },
            { key: "topic", label: "Nội dung", type: "text", required: true, full: true },
            { key: "content", label: "Cách sử dụng / Ý nghĩa", type: "textarea", required: true, full: true }
        ],
        filters: [
            { key: "category", label: "Nhóm" }
        ],
        columns: [
            { key: "index", label: "STT", width: "80px" },
            { key: "topic", label: "Nội dung", width: "260px", render: (row) => strongText(row.topic) },
            { key: "content", label: "Cách sử dụng", width: "760px" }
        ]
    }
};

const tabs = [
    { id: "dashboard", label: "Dashboard_UAT", icon: "fa-gauge-high" },
    { id: "personnel", label: "NhanSu_UAT", icon: modules.personnel.icon },
    { id: "guide", label: "HD_UAT", icon: modules.guide.icon },
    { id: "schedule", label: "Lich_UAT", icon: modules.schedule.icon },
    { id: "handoffs", label: "Lich_BG_US", icon: modules.handoffs.icon },
    { id: "features", label: "DM_ChucNang", icon: modules.features.icon },
    { id: "plans", label: "PhanCong_UAT", icon: modules.plans.icon },
    { id: "daily", label: "DieuHanh_Ngay", icon: modules.daily.icon },
    { id: "weekly", label: "ChatLuong_Tuan", icon: modules.weekly.icon },
    { id: "readiness", label: "TongKet_Sprint", icon: modules.readiness.icon },
    { id: "matrix", label: "MaTran_NangLuc", icon: modules.matrix.icon }
];

function getInitialTab() {
    const id = (window.location.hash || "").replace("#", "");
    return tabs.some((tab) => tab.id === id) ? id : "dashboard";
}

const emptyState = () => ({
    features: [],
    personnel: [],
    schedule: [],
    handoffs: [],
    plans: [],
    daily: [],
    weekly: [],
    readiness: [],
    matrix: [],
    guide: [],
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
    columnWidths: loadColumnWidths(),
    openColumnFilter: null,
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

function loadColumnWidths() {
    try {
        const raw = localStorage.getItem(COLUMN_WIDTHS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
        return Object.fromEntries(
            Object.entries(parsed)
                .map(([key, value]) => [key, Number(value)])
                .filter(([, value]) => Number.isFinite(value) && value > 0)
        );
    } catch {
        return {};
    }
}

function saveColumnWidths() {
    localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(ui.columnWidths || {}));
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
        <input id="importDataInput" class="hidden-input" type="file" accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12,application/json,.json">
    `;

    bindEvents();

    let restoredFocus = false;
    if (focus?.id) {
        const restored = document.getElementById(focus.id);
        if (restored) {
            restored.focus();
            restoredFocus = true;
            if (typeof focus.start === "number" && typeof restored.setSelectionRange === "function") {
                restored.setSelectionRange(focus.start, focus.end);
            }
        }
    }
    if (!restoredFocus) {
        const openedFilter = document.querySelector("[data-column-filter-autofocus]");
        if (openedFilter) requestAnimationFrame(() => openedFilter.focus());
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
                <strong>Squad 2 UAT Dashboard</strong>
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
                                <small>UAT Dashboard</small>
                            </div>
                        </div>

                        <h1>Bảng điều hành<br>UAT Squad 2</h1>
                        <p>Theo dõi danh mục UAT, phân công Sprint, tiến độ kiểm thử, chất lượng tuần và readiness trước Pilot/Go-live.</p>

                        <div class="login-stats">
                            <div><strong>6</strong><span>Phân hệ UAT</span></div>
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
                            <p>Truy cập Dashboard UAT Squad 2</p>
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
                    <strong>Squad 2 UAT Dashboard</strong>
                    <span>Không gian điều hành UAT tập trung</span>
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
                <button class="text-btn" data-action="export-excel" title="Xuất báo cáo dữ liệu UAT">
                    <i class="fa-solid fa-file-export"></i><span>Xuất báo cáo</span>
                </button>
                ${authState.user?.role === "admin" ? `
                    <button class="text-btn" data-action="import-data" title="Nhập Excel danh mục UAT">
                        <i class="fa-solid fa-upload"></i><span>Nhập</span>
                    </button>
                ` : ""}
            </div>
        </header>
    `;
}

function renderCommandBand() {
    const activeModule = modules[ui.activeTab];
    const title = activeModule ? activeModule.label : "Dashboard_UAT";
    const subtitle = activeModule ? activeModule.description : "Bảng điều hành UAT Squad 2 - Agile Tester Pool.";
    const totalRecords = Object.keys(modules).reduce((sum, id) => sum + appState[modules[id].collection].length, 0);
    return `
        <div class="command-band">
            <div>
                <div class="screen-kicker">BIDV · Squad 2 · UAT</div>
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
    return "";
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
    const hasAnyData = Object.keys(modules).some((id) => appState[modules[id].collection].length);
    return `
        <div class="dashboard-shell">
            ${hasAnyData ? renderExcelDashboard() : renderKickoffPanel()}
        </div>
    `;
}

function renderExcelDashboard() {
    const summaryRows = getDashboardSummaryRows();
    const ownerRows = getDashboardOwnerRows();
    const sprintRows = getDashboardSprintRows();
    const totalStories = summaryRows.find((row) => row.key === "totalStories")?.value || 0;
    const coverage = summaryRows.find((row) => row.key === "coverageRate")?.numericValue || 0;
    const trainingReadiness = summaryRows.find((row) => row.key === "trainingReadiness")?.numericValue || 0;
    return `
        <section class="uat-dashboard">
            <div class="uat-dashboard-hero">
                <div>
                    <span>Dashboard_UAT</span>
                    <h2>Bảng điều hành UAT Squad 2</h2>
                    <p>Agile Tester Pool · Tổng hợp từ danh mục, lịch bàn giao, phân công, daily, chất lượng tuần và tổng kết sprint.</p>
                </div>
                <div class="uat-hero-score">
                    <small>Tỷ lệ bao phủ</small>
                    <strong>${e(coverage)}%</strong>
                    <div class="progress progress-${e(getProgressTone(coverage))}"><span style="width:${clamp(coverage)}%"></span></div>
                </div>
            </div>

            <div class="uat-metric-grid">
                ${summaryRows.map((row) => `
                    <article class="uat-metric-card ${e(row.tone || "neutral")}">
                        <span>${e(row.label)}</span>
                        <strong>${e(row.value)}</strong>
                    </article>
                `).join("")}
            </div>

            <div class="uat-dashboard-grid">
                <section class="panel uat-dashboard-panel">
                    <div class="panel-head">
                        <div class="panel-title">
                            <i class="fa-solid fa-users-gear"></i>
                            <div>
                                <h2>Tổng hợp theo Chủ quản UAT</h2>
                                <span>${e(ownerRows.length)} chủ quản · ${e(totalStories)} story</span>
                            </div>
                        </div>
                    </div>
                    <div class="panel-body">
                        ${ownerRows.length ? `
                            <div class="uat-owner-list">
                                ${ownerRows.map((row) => `
                                    <article class="uat-owner-card">
                                        <div class="uat-owner-main">
                                            <strong>${e(row.owner)}</strong>
                                            <span>${e(row.storyCount)} story · ${e(row.totalCases)} TC</span>
                                        </div>
                                        <div class="uat-owner-progress">
                                            <div class="progress progress-${e(getProgressTone(row.coverageRate))}">
                                                <span style="width:${clamp(row.coverageRate)}%"></span>
                                            </div>
                                            <b>${e(row.coverageRate)}%</b>
                                        </div>
                                        <small>${e(row.executedCases)} TC đã chạy</small>
                                    </article>
                                `).join("")}
                            </div>
                        ` : renderEmpty("fa-users-gear", "Chưa có dữ liệu chủ quản", "Nhập PhanCong_UAT hoặc DM_ChucNang để tổng hợp theo chủ quản.", true)}
                    </div>
                </section>

                <section class="panel uat-dashboard-panel">
                    <div class="panel-head">
                        <div class="panel-title">
                            <i class="fa-solid fa-graduation-cap"></i>
                            <div>
                                <h2>Sẵn sàng đào tạo</h2>
                                <span>Theo MaTran_NangLuc</span>
                            </div>
                        </div>
                    </div>
                    <div class="panel-body">
                        <div class="uat-readiness-card ${e(getProgressTone(trainingReadiness))}">
                            <div>
                                <span>Mức độ sẵn sàng đào tạo</span>
                                <strong>${e(trainingReadiness)}%</strong>
                            </div>
                            <div class="progress progress-${e(getProgressTone(trainingReadiness))}">
                                <span style="width:${clamp(trainingReadiness)}%"></span>
                            </div>
                        </div>
                        <div class="uat-readiness-note">
                            <span>${e(appState.matrix.length)} nhóm chức năng</span>
                            <span>${e(sum(appState.matrix, "totalParticipation"))} lượt tham gia</span>
                        </div>
                    </div>
                </section>
            </div>

            <section class="panel uat-dashboard-panel">
                <div class="panel-head">
                    <div class="panel-title">
                        <i class="fa-solid fa-flag-checkered"></i>
                        <div>
                            <h2>Tổng hợp theo Sprint</h2>
                            <span>${e(sprintRows.length)} sprint · quyết định từ TongKet_Sprint</span>
                        </div>
                    </div>
                </div>
                <div class="panel-body">
                    ${sprintRows.length ? `
                        <div class="uat-sprint-table-wrap">
                            <table class="uat-sprint-table">
                                <thead>
                                    <tr>
                                        <th>Sprint</th>
                                        <th>Số Story</th>
                                        <th>Tổng TC</th>
                                        <th>TC đã chạy</th>
                                        <th>Tỷ lệ bao phủ</th>
                                        <th>Quyết định</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sprintRows.map((row) => `
                                        <tr>
                                            <td>${tag(row.sprint, "teal")}</td>
                                            <td>${e(row.storyCount)}</td>
                                            <td>${e(row.totalCases)}</td>
                                            <td>${e(row.executedCases)}</td>
                                            <td>
                                                <div class="uat-table-progress">
                                                    <div class="progress progress-${e(getProgressTone(row.coverageRate))}">
                                                        <span style="width:${clamp(row.coverageRate)}%"></span>
                                                    </div>
                                                    <b>${e(row.coverageRate)}%</b>
                                                </div>
                                            </td>
                                            <td>${renderDecision(row.decision)}</td>
                                        </tr>
                                    `).join("")}
                                </tbody>
                            </table>
                        </div>
                    ` : renderEmpty("fa-flag-checkered", "Chưa có dữ liệu sprint", "Nhập PhanCong_UAT hoặc TongKet_Sprint để tổng hợp theo sprint.", true)}
                </div>
        </section>
    `;
}

function getDashboardSummaryRows() {
    const totalStories = appState.features.length;
    const scheduledStories = appState.features.filter((row) => isFilled(row.uatHandoff || row.handoffDate)).length;
    const totalCases = sum(appState.plans, "totalCases");
    const executedCases = sum(appState.plans, "executedCases");
    const coverageRate = percent(executedCases, totalCases);
    const criticalBugs = countDailyOpenSeverity("Nghiêm trọng");
    const highBugs = countDailyOpenSeverity("Cao");
    const trainingReadiness = calculateTrainingReadiness();
    return [
        { key: "totalStories", label: "Tổng Story", value: totalStories, numericValue: totalStories, tone: "teal" },
        { key: "scheduledStories", label: "Story đã có lịch UAT", value: scheduledStories, numericValue: scheduledStories, tone: "blue" },
        { key: "totalCases", label: "Tổng Testcase", value: totalCases, numericValue: totalCases, tone: "neutral" },
        { key: "executedCases", label: "TC đã thực hiện", value: executedCases, numericValue: executedCases, tone: "neutral" },
        { key: "coverageRate", label: "Tỷ lệ bao phủ", value: `${coverageRate}%`, numericValue: coverageRate, tone: getProgressTone(coverageRate) },
        { key: "criticalBugs", label: "Lỗi nghiêm trọng mở", value: criticalBugs, numericValue: criticalBugs, tone: criticalBugs ? "red" : "green" },
        { key: "highBugs", label: "Lỗi mức cao mở", value: highBugs, numericValue: highBugs, tone: highBugs ? "yellow" : "green" },
        { key: "trainingReadiness", label: "Mức độ sẵn sàng đào tạo", value: `${trainingReadiness}%`, numericValue: trainingReadiness, tone: getProgressTone(trainingReadiness) }
    ];
}

function getDashboardOwnerRows() {
    const buckets = new Map();
    appState.plans.forEach((row) => {
        const owner = String(row.owner || "Chưa gán").trim();
        if (!buckets.has(owner)) buckets.set(owner, { owner, storyCount: 0, totalCases: 0, executedCases: 0 });
        const bucket = buckets.get(owner);
        bucket.storyCount += 1;
        bucket.totalCases += Number(row.totalCases || 0);
        bucket.executedCases += Number(row.executedCases || 0);
    });
    if (!buckets.size) {
        appState.features.forEach((row) => {
            const owner = String(row.owner || "Chưa gán").trim();
            if (!buckets.has(owner)) buckets.set(owner, { owner, storyCount: 0, totalCases: 0, executedCases: 0 });
            buckets.get(owner).storyCount += 1;
        });
    }
    return [...buckets.values()]
        .map((row) => ({ ...row, coverageRate: percent(row.executedCases, row.totalCases) }))
        .sort((a, b) => b.storyCount - a.storyCount || a.owner.localeCompare(b.owner, "vi"));
}

function getDashboardSprintRows() {
    const buckets = new Map();
    const ensure = (sprint) => {
        const key = String(sprint || "Chưa gán Sprint").trim();
        if (!buckets.has(key)) {
            buckets.set(key, { sprint: key, storyCount: 0, totalCases: 0, executedCases: 0, decision: "" });
        }
        return buckets.get(key);
    };
    appState.plans.forEach((row) => {
        const bucket = ensure(row.sprint);
        bucket.storyCount += 1;
        bucket.totalCases += Number(row.totalCases || 0);
        bucket.executedCases += Number(row.executedCases || 0);
    });
    appState.readiness.forEach((row) => {
        const bucket = ensure(row.sprint);
        bucket.storyCount = Number(row.totalStories || bucket.storyCount);
        bucket.totalCases = Number(row.totalCases || bucket.totalCases);
        bucket.executedCases = Number(row.executedCases || bucket.executedCases);
        bucket.decision = row.decision || bucket.decision;
    });
    return [...buckets.values()]
        .map((row) => ({
            ...row,
            coverageRate: percent(row.executedCases, row.totalCases),
            decision: row.decision || "Chưa quyết định"
        }))
        .sort((a, b) => a.sprint.localeCompare(b.sprint, "vi", { numeric: true }));
}

function calculateTrainingReadiness() {
    if (!appState.matrix.length) return 0;
    const matrixRows = appState.matrix.filter((row) => isFilled(row.group));
    if (!matrixRows.length) return 0;
    const rates = ["t1", "t2", "t3", "t4", "t5", "t6"].map((testerKey) => (
        percent(matrixRows.filter((row) => Number(row[testerKey] || 0) > 0).length, matrixRows.length)
    ));
    return round(averageAll(rates));
}

function renderExcelEmptyRow(colspan) {
    return `<tr><td colspan="${e(colspan)}" class="excel-empty-cell">Chưa có dữ liệu</td></tr>`;
}

function renderKickoffPanel() {
    return `
        <section class="panel dashboard-empty-panel">
            <div class="kickoff">
                <div class="kickoff-hero">
                    <div class="kickoff-icon"><i class="fa-solid fa-gauge-high"></i></div>
                    <div>
                        <h3>Chưa có dữ liệu UAT để phân tích</h3>
                        <p>Dashboard sẽ tự tổng hợp khi có dữ liệu từ các phân hệ UAT.</p>
                    </div>
                </div>
                <div class="kickoff-actions">
                    <button class="text-btn" data-tab="features"><i class="fa-solid fa-layer-group"></i><span>Nhập danh mục</span></button>
                    <button class="text-btn" data-tab="plans"><i class="fa-solid fa-calendar-days"></i><span>Lập phân công</span></button>
                    <button class="text-btn" data-tab="daily"><i class="fa-solid fa-clipboard-check"></i><span>Cập nhật daily</span></button>
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
                        <span>Tổng hợp từ danh mục, ma trận, daily và chất lượng tuần</span>
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
                ` : renderEmpty("fa-layer-group", "Chưa có dữ liệu nhóm chức năng", "Nhập danh mục hoặc chất lượng tuần để xem tiến độ theo nhóm.", true)}
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
        { label: "Đào tạo", value: metrics.trainingReadiness },
        { label: "Pilot/Go-live", value: metrics.pilotReadiness }
    ];
    return `
        <section class="panel dashboard-panel">
            <div class="panel-head">
                <div class="panel-title">
                    <i class="fa-solid fa-flag-checkered"></i>
                    <div>
                        <h2>Kết thúc Sprint</h2>
                        <span>${latestReadiness ? `Bản gần nhất: ${e(latestReadiness.sprint || "Kết thúc Sprint")}` : "Chưa có đánh giá"}</span>
                    </div>
                </div>
            </div>
            <div class="panel-body">
                <div class="readiness-score ${e(recommendation.tone)}">
                    <div>
                        <span>Khuyến nghị Pilot/Go-live</span>
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
                        <span>Rủi ro ảnh hưởng tới readiness và Pilot/Go-live</span>
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
                        <span>Mốc gần nhất từ phân công Sprint</span>
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
                ` : renderEmpty("fa-calendar-days", "Chưa có timeline Sprint", "Nhập phân công Sprint để dashboard hiển thị các mốc T1-T6 gần nhất.", true)}
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
                        <h2>Cập nhật gần đây</h2>
                        <span>Bản ghi mới cập nhật trong các phân hệ UAT</span>
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
        addRisk("red", "fa-chart-line", `${riskyWeekly.length} báo cáo tuần có rủi ro`, "Chất lượng tuần đang có đánh giá Rủi ro hoặc Blocker.");
    }
    if (blockerRows.length) {
        addRisk("yellow", "fa-ban", `${blockerRows.length} vướng mắc hằng ngày`, "Daily còn ghi nhận blocker cần làm rõ.");
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
        addRisk(latestReadiness.decision === "Chưa sẵn sàng" ? "red" : "yellow", "fa-flag", latestReadiness.decision, latestReadiness.note || "Cập nhật điều kiện kết thúc Sprint trước mốc Pilot/Go-live.");
    }
    if (latestReadiness && metrics.pilotReadiness > 0 && metrics.pilotReadiness < 80) {
        addRisk("yellow", "fa-rocket", `Pilot/Go-live ${metrics.pilotReadiness}%`, "Chưa đạt ngưỡng khuyến nghị 80%.");
    }

    if (!risks.length) {
        addRisk("green", "fa-circle-check", "Không có rủi ro đỏ", "Tiếp tục cập nhật daily, chất lượng tuần và kết thúc Sprint để dashboard phản ánh đúng thực tế.");
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
    if (mod.collection === "guide") return renderGuideModule(mod);
    const rows = getFilteredRows(mod);
    const total = appState[mod.collection].length;
    const activeFilters = countActiveFilters(mod);
    return `
        <div class="content-grid content-grid-single">
            <section class="panel">
                <div class="panel-head">
                    <div class="panel-title">
                        <i class="fa-solid ${mod.icon}"></i>
                        <div>
                            <h2>${e(mod.label)}</h2>
                            <span>${e(total)} bản ghi · ${e(mod.columns.length)} cột · ${e(rows.length)} đang hiển thị</span>
                        </div>
                    </div>
                    <div class="panel-actions">
                        ${activeFilters ? `
                            <button class="ghost-btn compact-reset-btn" data-action="reset-filters" title="Xóa toàn bộ lọc">
                                <i class="fa-solid fa-filter-circle-xmark"></i><span>${e(activeFilters)} lọc</span>
                            </button>
                        ` : ""}
                        <button class="primary-btn" data-action="open-create">
                            <i class="fa-solid fa-plus"></i><span>Thêm bản ghi</span>
                        </button>
                    </div>
                </div>
                <div class="panel-body">
                    ${renderTable(mod, rows)}
                </div>
            </section>
        </div>
    `;
}

function renderGuideModule(mod) {
    const rows = getGuideRows();
    const mainRows = rows.filter((row) => row.category === "Hướng dẫn");
    const handoffRows = rows.filter((row) => ["Cập nhật mới", "Nguyên tắc", "Cột cần nhập", "Cột tự động", "Khóa liên kết"].includes(row.category));
    const handoffMain = handoffRows[0];
    const handoffFacts = handoffRows.slice(1);
    const priorityRows = rows.filter((row) => row.category.includes("Priority"));
    const statusRows = rows.filter((row) => row.category.includes("Status"));
    return `
        <div class="guide-page">
            <section class="guide-hero">
                <div>
                    <span>HD_UAT</span>
                    <h2>Hướng dẫn sử dụng bộ công cụ UAT Squad 2</h2>
                    <p>Nội dung chuẩn theo sheet HD_UAT, trình bày lại thành các nhóm thông tin dễ đọc trên web.</p>
                </div>
                <div class="guide-hero-badge">
                    <strong>${e(rows.length)}</strong>
                    <span>đầu mục</span>
                </div>
            </section>

            <section class="guide-section">
                <div class="guide-section-head">
                    <i class="fa-solid fa-list-check"></i>
                    <div>
                        <h3>Quy trình sử dụng</h3>
                        <span>Các thao tác chính trong workbook UAT</span>
                    </div>
                </div>
                <div class="guide-step-grid">
                    ${mainRows.map((row) => `
                        <article class="guide-step-card">
                            <b>${e(row.index || "")}</b>
                            <div>
                                <strong>${e(row.topic)}</strong>
                                <p>${e(row.content)}</p>
                            </div>
                        </article>
                    `).join("")}
                </div>
            </section>

            <section class="guide-section guide-section-accent">
                <div class="guide-section-head">
                    <i class="fa-solid fa-calendar-day"></i>
                    <div>
                        <h3>Lịch bàn giao theo User Story</h3>
                        <span>Các nguyên tắc cập nhật ngày bàn giao UAT</span>
                    </div>
                </div>
                <div class="guide-handoff-layout">
                    ${handoffMain ? `
                        <article class="guide-handoff-primary">
                            <span>${e(handoffMain.category)}</span>
                            <h4>${e(handoffMain.topic)}</h4>
                            <p>${e(handoffMain.content)}</p>
                        </article>
                    ` : ""}
                    <div class="guide-handoff-facts">
                        ${handoffFacts.map((row) => `
                            <article>
                                <span>${e(row.category)}</span>
                                <strong>${e(row.topic)}</strong>
                                <p>${e(row.content)}</p>
                            </article>
                        `).join("")}
                    </div>
                </div>
            </section>

            <div class="guide-reference-grid">
                ${renderGuideReference("Ý nghĩa các mức độ ưu tiên (Priority)", "Mức độ", priorityRows)}
                ${renderGuideReference("Ý nghĩa các trạng thái (Status)", "Trạng thái", statusRows)}
            </div>
        </div>
    `;
}

function renderGuideReference(title, firstColumn, rows) {
    return `
        <section class="guide-section">
            <div class="guide-section-head">
                <i class="fa-solid fa-bookmark"></i>
                <div>
                    <h3>${e(title)}</h3>
                    <span>${e(rows.length)} mục tham chiếu</span>
                </div>
            </div>
            <div class="guide-reference-list">
                ${rows.map((row) => `
                    <article>
                        <strong>${e(row.topic)}</strong>
                        <span>${e(row.content)}</span>
                    </article>
                `).join("")}
            </div>
        </section>
    `;
}

function getGuideRows() {
    return normalizeGuideRowsForDisplay(appState.guide.length ? appState.guide : defaultGuideRows());
}

function normalizeGuideRowsForDisplay(rows) {
    return rows.map((row) => {
        if (row.category !== "Cột tự động") return row;
        const topic = String(row.topic || "").trim();
        if (topic !== "DM_ChucNang!W:Y" && topic !== "DM_ChucNang!P:R, U:X") return row;
        return {
            ...row,
            topic: "DM_ChucNang!P:R, U:X",
            content: "P:R lấy ngày bàn giao/bắt đầu/kết thúc từ Lich_BG_US theo Mã Jira; U:X tự tính trạng thái, %TC, lỗi mở và cảnh báo."
        };
    });
}

function defaultGuideRows() {
    const rows = [
        ["Hướng dẫn", 1, "Cập nhật lịch bàn giao", "Vào sheet Lich_UAT, chỉnh Ngày bàn giao/Bắt đầu/Kết thúc UAT theo lịch thực tế của TCT 217. DM_ChucNang và PhanCong_UAT tự động kế thừa."],
        ["Hướng dẫn", 2, "Phân công Tester", "Vào sheet PhanCong_UAT, đánh dấu ✓ cho T1-T6. Mô hình mặc định đã luân chuyển 2 Tester/Story."],
        ["Hướng dẫn", 3, "Theo dõi hằng ngày", "Vào sheet DieuHanh_Ngay để nhập số TC đã chạy, TC đạt, lỗi, blocker và người xử lý."],
        ["Hướng dẫn", 4, "Đánh giá hằng tuần", "Sheet ChatLuong_Tuan tổng hợp Quality Gate theo tuần/Sprint."],
        ["Hướng dẫn", 5, "Kết thúc Sprint", "Sheet TongKet_Sprint tự tính GO / CONDITIONAL GO / NO GO theo coverage, pass rate và lỗi mở."],
        ["Hướng dẫn", 6, "Đào tạo chéo", "Sheet MaTran_NangLuc theo dõi mức độ mỗi Tester tham gia các nhóm chức năng để hình thành giảng viên nội bộ."],
        ["Hướng dẫn", 7, "Báo cáo lãnh đạo", "Sheet Dashboard_UAT là bảng điều hành tổng hợp cho Squad Leader."],
        ["Cập nhật mới", 1, "Lịch bàn giao theo User Story", "Sử dụng sheet Lich_BG_US để nhập ngày bàn giao UAT riêng cho từng US; DM_ChucNang tự động lấy ngày từ sheet này."],
        ["Nguyên tắc", 2, "Không dùng lịch Sprint làm ngày bàn giao chính", "Trong cùng Sprint, mỗi US có thể có ngày bàn giao khác nhau."],
        ["Cột cần nhập", 3, "Lich_BG_US!G:G", "Ngày bàn giao UAT theo US"],
        ["Cột tự động", 4, "DM_ChucNang!P:R, U:X", "P:R lấy ngày bàn giao/bắt đầu/kết thúc từ Lich_BG_US theo Mã Jira; U:X tự tính trạng thái, %TC, lỗi mở và cảnh báo."],
        ["Khóa liên kết", 5, "Mã Jira", "SQ02_CNxxx_xxx"],
        ["Ý nghĩa các mức độ ưu tiên (Priority)", 1, "Blocker", "Lỗi chặn UAT, không thể kiểm thử tiếp"],
        ["Ý nghĩa các mức độ ưu tiên (Priority)", 2, "Critical", "Lỗi nghiêm trọng ảnh hưởng nghiệp vụ chính"],
        ["Ý nghĩa các mức độ ưu tiên (Priority)", 3, "Major", "Lỗi nghiệp vụ quan trọng"],
        ["Ý nghĩa các mức độ ưu tiên (Priority)", 4, "Minor", "Lỗi nhỏ, ảnh hưởng cục bộ"],
        ["Ý nghĩa các mức độ ưu tiên (Priority)", 5, "Trivial", "Lỗi giao diện, hiển thị, wording"],
        ["Ý nghĩa các trạng thái (Status)", 1, "Open", "Mới ghi nhận"],
        ["Ý nghĩa các trạng thái (Status)", 2, "In Progress", "Dev đang xử lý"],
        ["Ý nghĩa các trạng thái (Status)", 3, "Reopened", "Đã fix nhưng bị mở lại"],
        ["Ý nghĩa các trạng thái (Status)", 4, "Resolved", "Dev đã fix, chờ retest"],
        ["Ý nghĩa các trạng thái (Status)", 5, "Closed", "Đã retest thành công"],
        ["Ý nghĩa các trạng thái (Status)", 6, "Cancelled", "Hủy lỗi"],
        ["Ý nghĩa các trạng thái (Status)", 7, "Pending", "Chờ xử lý"],
        ["Ý nghĩa các trạng thái (Status)", 8, "SIT Fail", "Phát hiện từ SIT/UAT, chưa xử lý"]
    ];
    return rows.map(([category, index, topic, content]) => ({
        id: `${category}-${index}-${topic}`,
        category,
        index,
        topic,
        content
    }));
}

function renderTable(mod, rows) {
    const layout = tableColumnLayout(mod, rows);
    const colgroup = layout.columns.map(({ col, width }) => (
        `<col data-column-key="${e(col.key)}" style="width:${e(`${width}px`)}">`
    )).join("") + `<col data-column-key="${e(ACTION_COLUMN_KEY)}" style="width:${e(`${layout.actionWidth}px`)}">`;
    const columnMeta = layout.columnMeta;
    const tableClass = ["data-table", mod.compactTable ? "is-compact" : "", mod.stickyColumns ? "has-sticky-columns" : ""]
        .filter(Boolean)
        .join(" ");
    return `
        <div class="table-shell" data-table-scroll-shell>
            <div class="table-top-scroll" data-table-scrollbar="top" aria-label="Cuộn ngang bảng">
                <div data-table-scroll-spacer style="width:${e(`${layout.totalWidth}px`)}"></div>
            </div>
            <div class="table-wrap" data-table-scrollbar="main">
            <table class="${e(tableClass)}" data-resizable-table="${e(mod.collection)}" style="width:${e(`${layout.totalWidth}px`)}; min-width:${e(`${layout.totalWidth}px`)}">
                <colgroup>${colgroup}</colgroup>
                <thead>
                    <tr>
                        ${mod.columns.map((col, index) => renderTableHeaderCell(mod, col, columnMeta[index])).join("")}
                        <th class="col-actions">
                            <span>Thao tác</span>
                            ${renderColumnResizeHandle(ACTION_COLUMN_KEY, "Thao tác")}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.length ? renderTableRows(mod, rows, columnMeta) : `
                        <tr>
                            <td colspan="${mod.columns.length + 1}">
                                ${renderEmpty(mod.emptyIcon, mod.emptyTitle, mod.emptyText, true, mod)}
                            </td>
                        </tr>
                    `}
                </tbody>
            </table>
            </div>
        </div>
    `;
}

function renderTableRows(mod, rows, columnMeta) {
    let currentSection = null;
    return rows.map((row) => {
        const section = mod.sectionKey ? String(row[mod.sectionKey] || "").trim() : "";
        const sectionMarkup = section && section !== currentSection ? renderSectionRow(mod, section) : "";
        if (section) currentSection = section;
                        const canEdit = canModifyRecord(row);
                        const owner = recordOwnerLabel(row);
        return `
            ${sectionMarkup}
                            <tr>
                                ${mod.columns.map((col, index) => `<td${tableCellAttrs(columnMeta[index])}>${renderCell(row, col)}</td>`).join("")}
                                <td class="col-actions">
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
    }).join("");
}

function renderTableHeaderCell(mod, col, meta) {
    const key = columnFilterKey(mod, col);
    const value = ui.columnFilters[key] || "";
    const isOpen = ui.openColumnFilter === key;
    return `
        <th${tableCellAttrs(meta, isOpen ? "filter-open" : "")}>
            <div class="th-control" data-column-filter-shell="${e(key)}">
                <span class="th-label" title="${e(col.label)}">${e(col.label)}</span>
                <button type="button" class="th-filter-btn ${value ? "active" : ""}" data-action="toggle-column-filter" data-column-key="${e(col.key)}" title="Lọc ${e(col.label)}" aria-label="Lọc ${e(col.label)}">
                    <i class="fa-solid fa-filter"></i>
                </button>
                ${isOpen ? renderColumnFilterPopover(mod, col) : ""}
            </div>
            ${renderColumnResizeHandle(col.key, col.label)}
        </th>
    `;
}

function renderColumnResizeHandle(columnKey, label) {
    return `
        <button type="button" class="column-resize-handle" data-column-resizer="${e(columnKey)}" title="Kéo để đổi độ rộng, nhấp đúp để đặt lại" aria-label="Kéo dãn cột ${e(label)}"></button>
    `;
}

function renderColumnFilterPopover(mod, col) {
    const key = columnFilterKey(mod, col);
    const value = ui.columnFilters[key] || "";
    return `
        <div class="column-filter-popover">
            <div class="column-filter-head">
                <strong>${e(col.label)}</strong>
                <button type="button" class="mini-icon-btn" data-action="close-column-filter" title="Đóng" aria-label="Đóng">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            ${renderColumnFilterControl(mod, col, true)}
            <div class="column-filter-foot">
                ${value ? `
                    <button type="button" class="mini-text-btn" data-action="clear-column-filter" data-column-key="${e(col.key)}">
                        Xóa lọc
                    </button>
                ` : `<span></span>`}
            </div>
        </div>
    `;
}

function renderSectionRow(mod, section) {
    return `
        <tr class="section-row">
            <td class="section-title-cell" colspan="${e(mod.columns.length + 1)}">
                <strong>${e(section)}</strong>
            </td>
        </tr>
    `;
}

function tableColumnLayout(mod, rows) {
    const columns = mod.columns.map((col) => ({
        col,
        ...getResolvedColumnWidth(mod, col, rows)
    }));
    const actionWidth = getStoredColumnWidth(mod, ACTION_COLUMN_KEY) || ACTION_COLUMN_DEFAULT_WIDTH;
    distributeTableFillWidth(mod, columns, actionWidth);
    const totalWidth = columns.reduce((total, item) => total + item.width, actionWidth);
    return {
        columns,
        actionWidth,
        totalWidth,
        columnMeta: tableColumnMeta(mod, columns)
    };
}

function tableColumnMeta(mod, columnLayout) {
    const stickyCount = Number(mod.stickyColumns || 0);
    let left = 0;
    return columnLayout.map(({ col, width }, index) => {
        const sticky = index < stickyCount;
        const meta = {
            className: sticky ? `sticky-col${index === stickyCount - 1 ? " sticky-boundary" : ""}` : "",
            style: sticky ? `left:${left}px` : "",
            attrs: {
                "data-column-key": col.key,
                "data-column-index": index
            }
        };
        if (sticky) left += width;
        return meta;
    });
}

function tableCellAttrs(meta, extraClass = "") {
    const className = [meta?.className, extraClass].filter(Boolean).join(" ");
    const attrs = meta?.attrs
        ? Object.entries(meta.attrs).map(([key, value]) => ` ${key}="${e(value)}"`).join("")
        : "";
    if (!className && !meta?.style && !attrs) return "";
    return `${className ? ` class="${e(className)}"` : ""}${meta?.style ? ` style="${e(meta.style)}"` : ""}${attrs}`;
}

function parseColumnWidth(width) {
    const value = Number.parseInt(String(width || ""), 10);
    return Number.isFinite(value) ? value : 140;
}

function getResolvedColumnWidth(mod, col, rows) {
    const storedWidth = getStoredColumnWidth(mod, col.key);
    return {
        width: storedWidth || getDefaultColumnWidth(mod, col, rows),
        userSized: Boolean(storedWidth)
    };
}

function distributeTableFillWidth(mod, columns, actionWidth) {
    const targetWidth = getDefaultTableTargetWidth();
    let currentWidth = columns.reduce((total, item) => total + item.width, actionWidth);
    let remaining = Math.max(0, targetWidth - currentWidth);
    if (remaining <= 0) return;

    const candidates = columns
        .filter((item) => !item.userSized)
        .map((item) => ({
            item,
            weight: getColumnFillWeight(item.col),
            maxWidth: getColumnFillMaxWidth(mod, item.col, item.width)
        }))
        .filter((candidate) => candidate.weight > 0 && candidate.maxWidth > candidate.item.width);

    while (remaining > 0.5 && candidates.some((candidate) => candidate.maxWidth > candidate.item.width)) {
        const active = candidates.filter((candidate) => candidate.maxWidth > candidate.item.width);
        const weightTotal = active.reduce((total, candidate) => total + candidate.weight, 0);
        let consumed = 0;
        active.forEach((candidate) => {
            const share = remaining * (candidate.weight / weightTotal);
            const growth = Math.min(candidate.maxWidth - candidate.item.width, share);
            candidate.item.width += growth;
            consumed += growth;
        });
        if (consumed <= 0.5) break;
        remaining -= consumed;
    }

    currentWidth = columns.reduce((total, item) => total + item.width, actionWidth);
    remaining = Math.max(0, targetWidth - currentWidth);
    if (remaining > 0.5) {
        const elastic = columns.filter((item) => !item.userSized && isElasticFillColumn(item.col));
        const fallback = elastic.length ? elastic : columns.filter((item) => !item.userSized);
        if (fallback.length) {
            const extra = remaining / fallback.length;
            fallback.forEach((item) => {
                item.width += extra;
            });
        }
    }

    columns.forEach((item) => {
        item.width = Math.round(item.width);
    });
}

function getDefaultTableTargetWidth() {
    if (typeof document !== "undefined") {
        const panelBody = document.querySelector(".content-grid-single .panel-body");
        const width = panelBody?.clientWidth;
        if (Number.isFinite(width) && width > 0) return Math.max(TABLE_TARGET_MIN_WIDTH, Math.floor(width));
    }
    if (typeof window !== "undefined") {
        return Math.max(TABLE_TARGET_MIN_WIDTH, Math.floor(window.innerWidth - TABLE_VIEWPORT_GUTTER));
    }
    return TABLE_TARGET_MIN_WIDTH;
}

function getColumnFillWeight(col) {
    const key = String(col.key || "").toLowerCase();
    if (key === "stt" || /^t[1-6]$/.test(key)) return 0.2;
    if (key.includes("link")) return 0.35;
    if (key.includes("date") || key.includes("handoff") || key.includes("start") || key.includes("end") || key.includes("done") || key.includes("signed")) return 0.65;
    if (key.includes("sprint")) return 0.7;
    if (key.includes("status") || key.includes("decision") || key.includes("warning") || key.includes("level")) return 0.9;
    if (key.includes("code") || key.includes("jira") || key.includes("story") || key.includes("email")) return 1;
    if (isElasticFillColumn(col)) return 3;
    return 1.1;
}

function getColumnFillMaxWidth(mod, col, currentWidth) {
    const key = String(col.key || "").toLowerCase();
    const declared = parseColumnWidth(col.width);
    const field = getFieldForColumn(mod, col);
    if (key === "stt" || /^t[1-6]$/.test(key)) return Math.max(currentWidth, 78);
    if (key.includes("link")) return Math.max(currentWidth, 150);
    if (key.includes("date") || key.includes("handoff") || key.includes("start") || key.includes("end") || key.includes("done") || key.includes("signed")) return Math.max(currentWidth, 190);
    if (key.includes("sprint")) return Math.max(currentWidth, 170);
    if (key.includes("status") || key.includes("decision") || key.includes("warning") || key.includes("level")) return Math.max(currentWidth, 210);
    if (key.includes("code") || key.includes("jira") || key.includes("story") || key.includes("email")) return Math.max(currentWidth, 230);
    if (isElasticFillColumn(col) || field?.type === "textarea" || field?.full) {
        return Math.max(currentWidth, Math.max(360, declared + 120));
    }
    return Math.max(currentWidth, 240);
}

function isElasticFillColumn(col) {
    const key = String(col.key || "").toLowerCase();
    return key.includes("name")
        || key.includes("feature")
        || key.includes("group")
        || key.includes("topic")
        || key.includes("content")
        || key.includes("scope")
        || key.includes("note")
        || key.includes("blocker");
}

function getStoredColumnWidth(mod, columnKey) {
    const value = Number(ui.columnWidths?.[columnWidthStorageKey(mod, columnKey)]);
    if (!Number.isFinite(value) || value <= 0) return null;
    return Math.max(getColumnResizeMinWidth(columnKey), Math.round(value));
}

function getDefaultColumnWidth(mod, col, rows) {
    const minWidth = getColumnDefaultMinWidth(col);
    const headerWidth = getColumnHeaderWidth(col);
    const maxWidth = Math.max(getColumnDefaultMaxWidth(mod, col), headerWidth);
    const sampleWidth = getColumnSampleWidth(col, rows);
    return clampColumnWidth(Math.ceil(Math.max(minWidth, headerWidth, sampleWidth)), minWidth, maxWidth);
}

function getColumnHeaderWidth(col) {
    return Math.ceil(estimateTableTextWidth(col.label) + COLUMN_HEADER_CONTROL_WIDTH);
}

function getColumnSampleWidth(col, rows) {
    const values = (rows || [])
        .slice(0, COLUMN_DEFAULT_SAMPLE_SIZE)
        .map((row) => getColumnDisplayText(row, col))
        .filter((text) => text && text !== "-")
        .map((text) => estimateCellTextWidth(text, col) + 24)
        .sort((a, b) => a - b);
    if (!values.length) return 0;
    return values[Math.floor((values.length - 1) * 0.85)];
}

function getColumnDisplayText(row, col) {
    const raw = getColumnRawValue(row, col);
    if (raw !== "" && raw != null) return normalizeColumnText(raw);
    return normalizeColumnText(stripHtml(renderCell(row, col)));
}

function normalizeColumnText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function stripHtml(html) {
    return String(html || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&#039;/g, "'");
}

function estimateCellTextWidth(text, col) {
    const fullWidth = estimateTableTextWidth(text);
    const comfortChars = getColumnComfortChars(col);
    if ([...text].length <= comfortChars) return fullWidth;
    const segmentWidth = Math.max(
        ...text.split(/[\s,;:/|()[\]{}]+/).map(estimateTableTextWidth).filter(Boolean),
        0
    );
    return Math.max(segmentWidth, estimateTableTextWidth([...text].slice(0, comfortChars).join("")));
}

function estimateTableTextWidth(text) {
    return [...String(text || "")].reduce((width, char) => {
        if (/\s/.test(char)) return width + 3.5;
        if (/[MW@#%]/.test(char)) return width + 8.2;
        if (/[A-Z0-9]/.test(char)) return width + 7.2;
        return width + 6.4;
    }, 0);
}

function getColumnComfortChars(col) {
    const key = String(col.key || "").toLowerCase();
    if (key.includes("link")) return 18;
    if (key.includes("content")) return 48;
    if (key.includes("note") || key.includes("scope") || key.includes("blocker")) return 40;
    if (key.includes("name") || key.includes("feature") || key.includes("group") || key.includes("topic")) return 34;
    return 24;
}

function getColumnDefaultMinWidth(col) {
    const key = String(col.key || "").toLowerCase();
    if (key === "stt" || /^t[1-6]$/.test(key)) return 56;
    if (key.includes("link")) return 88;
    return 72;
}

function getColumnDefaultMaxWidth(mod, col) {
    const key = String(col.key || "").toLowerCase();
    const field = getFieldForColumn(mod, col);
    const declared = parseColumnWidth(col.width);
    if (key === "stt" || /^t[1-6]$/.test(key)) return 72;
    if (key.includes("link")) return 124;
    if (key.includes("date") || key.includes("handoff") || key.includes("start") || key.includes("end") || key.includes("done") || key.includes("signed")) return 170;
    if (key.includes("sprint")) return 140;
    if (key.includes("status") || key.includes("decision") || key.includes("warning") || key.includes("level")) return 170;
    if (key.includes("name") || key.includes("feature") || key.includes("group") || key.includes("topic") || key.includes("content") || key.includes("scope") || key.includes("note") || key.includes("blocker") || field?.type === "textarea" || field?.full) {
        return Math.max(220, Math.min(340, declared));
    }
    if (key.includes("code") || key.includes("jira") || key.includes("story") || key.includes("email")) return 190;
    return Math.max(130, Math.min(220, declared));
}

function getColumnResizeMinWidth(columnKey) {
    return columnKey === ACTION_COLUMN_KEY ? 76 : COLUMN_RESIZE_MIN_WIDTH;
}

function clampColumnWidth(value, minWidth, maxWidth) {
    return Math.max(minWidth, Math.min(maxWidth, value));
}

function columnWidthStorageKey(mod, columnKey) {
    return `${mod.collection}:${columnKey}`;
}

function renderColumnFilterControl(mod, col, autofocus = false) {
    const key = columnFilterKey(mod, col);
    const inputId = `colFilter_${mod.collection}_${col.key}`;
    const value = ui.columnFilters[key] || "";
    const field = getFieldForColumn(mod, col);
    const options = getColumnFilterOptions(mod, col, field);
    const autofocusAttr = autofocus ? ` data-column-filter-autofocus="true"` : "";
    if (options.length) {
        return `
            <select id="${e(inputId)}" class="column-filter" data-column-filter="${e(col.key)}"${autofocusAttr} aria-label="Lọc ${e(col.label)}">
                <option value="">Tất cả</option>
                ${options.map((option) => `<option value="${e(option)}" ${String(option) === String(value) ? "selected" : ""}>${e(option)}</option>`).join("")}
            </select>
        `;
    }
    return `
        <input id="${e(inputId)}" class="column-filter" data-column-filter="${e(col.key)}"${autofocusAttr} value="${e(value)}" placeholder="Lọc" aria-label="Lọc ${e(col.label)}">
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
    const value = row ? row[field.key] ?? "" : getDefaultFieldValue(field);
    const required = field.required ? "required" : "";
    const label = e(field.label);
    const wrapper = `field ${field.full ? "full" : ""}`;
    let control = "";
    if (field.type === "select") {
        const options = getFieldOptions(field);
        control = `
            <select class="field-select" name="${e(field.key)}" ${required}>
                <option value=""></option>
                ${options.map((option) => `
                    <option value="${e(option)}" ${option === value ? "selected" : ""}>${e(option)}</option>
                `).join("")}
            </select>
        `;
    } else if (field.type === "combo") {
        const options = getFieldOptions(field);
        control = `
            <div class="combo-field" data-combo-field>
                <div class="combo-control">
                    <input class="field-input combo-input" name="${e(field.key)}" type="text" value="${e(value)}" autocomplete="off" spellcheck="false" data-combo-input ${required}>
                    <button class="combo-toggle" type="button" data-combo-toggle title="Mở danh sách ${label}" aria-label="Mở danh sách ${label}">
                        <i class="fa-solid fa-chevron-down"></i>
                    </button>
                </div>
                <div class="combo-menu" data-combo-menu>
                    ${options.map((option) => `
                        <button class="combo-option" type="button" data-combo-option="${e(option)}">${e(option)}</button>
                    `).join("")}
                    <div class="combo-empty" data-combo-empty>Không có gợi ý. Gõ tên mới rồi lưu để tạo nhóm.</div>
                </div>
            </div>
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
            ui.openColumnFilter = null;
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

    bindColumnResizeEvents();
    fitTableHeadersToLabels();
    bindTableScrollbars();

    bindComboFields();

    const form = document.getElementById("recordForm");
    if (form) form.addEventListener("submit", handleSubmit);

    const modal = document.getElementById("recordModal");
    if (modal) {
        modal.addEventListener("click", (event) => {
            if (event.target.closest("[data-combo-field]")) return;
            closeComboFields();
            if (event.target === modal) closeModal();
        });
    }

    const importInput = document.getElementById("importDataInput");
    if (importInput) importInput.addEventListener("change", handleImport);
}

function bindColumnResizeEvents() {
    document.querySelectorAll("[data-column-resizer]").forEach((handle) => {
        handle.addEventListener("pointerdown", startColumnResize);
        handle.addEventListener("dblclick", resetColumnWidth);
        handle.addEventListener("keydown", handleColumnResizeKeydown);
    });
}

function fitTableHeadersToLabels() {
    document.querySelectorAll("[data-resizable-table]").forEach((table) => {
        const mod = Object.values(modules).find((item) => item.collection === table.dataset.resizableTable);
        let resized = false;
        table.querySelectorAll("thead th[data-column-key]").forEach((header) => {
            const label = header.querySelector(".th-label");
            const columnKey = header.dataset.columnKey;
            if (mod && ui.columnWidths[columnWidthStorageKey(mod, columnKey)]) return;
            const col = getTableColumnElement(table, columnKey);
            if (!label || !col) return;
            const deficit = label.scrollWidth - label.clientWidth;
            if (deficit <= 1) return;
            col.style.width = `${Math.ceil(getTableColumnWidth(col) + deficit + COLUMN_HEADER_FIT_BUFFER)}px`;
            resized = true;
        });
        if (!resized) return;
        syncTableWidth(table);
        syncStickyColumnOffsets(table);
    });
}

function bindTableScrollbars() {
    document.querySelectorAll("[data-table-scroll-shell]").forEach((shell) => {
        const top = shell.querySelector('[data-table-scrollbar="top"]');
        const main = shell.querySelector('[data-table-scrollbar="main"]');
        const table = shell.querySelector("[data-resizable-table]");
        const spacer = shell.querySelector("[data-table-scroll-spacer]");
        if (!top || !main || !table || !spacer) return;

        spacer.style.width = `${getTableRenderedWidth(table)}px`;
        top.scrollLeft = main.scrollLeft;
        let syncing = false;
        const syncScroll = (source, target) => {
            if (syncing) return;
            syncing = true;
            target.scrollLeft = source.scrollLeft;
            requestAnimationFrame(() => {
                syncing = false;
            });
        };

        top.addEventListener("scroll", () => syncScroll(top, main));
        main.addEventListener("scroll", () => syncScroll(main, top));
    });
}

function startColumnResize(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const handle = event.currentTarget;
    const table = handle.closest("[data-resizable-table]");
    const mod = modules[ui.activeTab];
    const columnKey = handle.dataset.columnResizer;
    const col = getTableColumnElement(table, columnKey);
    if (!table || !mod || !columnKey || !col) return;

    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = getTableColumnWidth(col);
    const minWidth = getColumnResizeMinWidth(columnKey);
    let nextWidth = startWidth;

    table.classList.add("is-resizing-column");
    handle.classList.add("active");
    document.body.classList.add("is-column-resizing");
    try {
        handle.setPointerCapture(event.pointerId);
    } catch {
        // Pointer capture is only an enhancement; window listeners keep dragging usable.
    }

    const handleMove = (moveEvent) => {
        nextWidth = Math.max(minWidth, Math.round(startWidth + moveEvent.clientX - startX));
        applyTableColumnWidth(table, columnKey, nextWidth);
    };

    const handleEnd = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleEnd);
        window.removeEventListener("pointercancel", handleEnd);
        table.classList.remove("is-resizing-column");
        handle.classList.remove("active");
        document.body.classList.remove("is-column-resizing");
        ui.columnWidths[columnWidthStorageKey(mod, columnKey)] = nextWidth;
        saveColumnWidths();
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
}

function handleColumnResizeKeydown(event) {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const handle = event.currentTarget;
    const table = handle.closest("[data-resizable-table]");
    const mod = modules[ui.activeTab];
    const columnKey = handle.dataset.columnResizer;
    const col = getTableColumnElement(table, columnKey);
    if (!table || !mod || !columnKey || !col) return;

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const step = event.shiftKey ? 24 : 8;
    const nextWidth = Math.max(getColumnResizeMinWidth(columnKey), getTableColumnWidth(col) + (direction * step));
    applyTableColumnWidth(table, columnKey, nextWidth);
    ui.columnWidths[columnWidthStorageKey(mod, columnKey)] = nextWidth;
    saveColumnWidths();
}

function resetColumnWidth(event) {
    event.preventDefault();
    event.stopPropagation();
    const mod = modules[ui.activeTab];
    const columnKey = event.currentTarget.dataset.columnResizer;
    if (!mod || !columnKey) return;
    delete ui.columnWidths[columnWidthStorageKey(mod, columnKey)];
    saveColumnWidths();
    render();
}

function applyTableColumnWidth(table, columnKey, width) {
    const col = getTableColumnElement(table, columnKey);
    if (!col) return;
    col.style.width = `${Math.round(width)}px`;
    syncTableWidth(table);
    syncStickyColumnOffsets(table);
}

function syncTableWidth(table) {
    const totalWidth = [...table.querySelectorAll("col[data-column-key]")]
        .reduce((total, col) => total + getTableColumnWidth(col), 0);
    table.style.width = `${totalWidth}px`;
    table.style.minWidth = `${totalWidth}px`;
    const spacer = table.closest("[data-table-scroll-shell]")?.querySelector("[data-table-scroll-spacer]");
    if (spacer) spacer.style.width = `${totalWidth}px`;
}

function syncStickyColumnOffsets(table) {
    const mod = modules[ui.activeTab];
    const stickyCount = Number(mod?.stickyColumns || 0);
    let left = 0;
    for (let index = 0; index < stickyCount; index += 1) {
        const col = getTableColumnElement(table, mod.columns[index]?.key);
        table.querySelectorAll(`[data-column-index="${index}"]`).forEach((cell) => {
            cell.style.left = `${left}px`;
        });
        left += getTableColumnWidth(col);
    }
}

function getTableColumnElement(table, columnKey) {
    if (!table || !columnKey) return null;
    return [...table.querySelectorAll("col[data-column-key]")]
        .find((col) => col.dataset.columnKey === columnKey) || null;
}

function getTableColumnWidth(col) {
    if (!col) return 0;
    const styleWidth = Number.parseFloat(col.style.width);
    if (Number.isFinite(styleWidth) && styleWidth > 0) return styleWidth;
    const rectWidth = col.getBoundingClientRect?.().width;
    return Number.isFinite(rectWidth) && rectWidth > 0 ? rectWidth : 0;
}

function getTableRenderedWidth(table) {
    const styleWidth = Number.parseFloat(table?.style?.width);
    if (Number.isFinite(styleWidth) && styleWidth > 0) return styleWidth;
    const rectWidth = table?.getBoundingClientRect?.().width;
    return Number.isFinite(rectWidth) && rectWidth > 0 ? rectWidth : 0;
}

function bindComboFields() {
    document.querySelectorAll("[data-combo-field]").forEach((combo) => {
        const input = combo.querySelector("[data-combo-input]");
        const toggle = combo.querySelector("[data-combo-toggle]");
        const options = [...combo.querySelectorAll("[data-combo-option]")];

        const openCombo = () => {
            closeComboFields(combo);
            combo.classList.add("open");
            filterComboOptions(combo);
        };

        toggle?.addEventListener("click", () => {
            if (combo.classList.contains("open")) {
                combo.classList.remove("open");
            } else {
                input?.focus();
                openCombo();
            }
        });

        input?.addEventListener("focus", openCombo);
        input?.addEventListener("input", () => {
            combo.classList.add("open");
            filterComboOptions(combo);
        });
        input?.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                combo.classList.remove("open");
                input.blur();
            }
        });

        options.forEach((option) => {
            option.addEventListener("click", () => {
                input.value = option.dataset.comboOption || option.textContent.trim();
                combo.classList.remove("open");
                input.focus();
            });
        });
    });
}

function filterComboOptions(combo) {
    const input = combo.querySelector("[data-combo-input]");
    const menu = combo.querySelector("[data-combo-menu]");
    const query = normalizeLookupKey(input?.value || "");
    let visible = 0;
    combo.querySelectorAll("[data-combo-option]").forEach((option) => {
        const match = !query || normalizeLookupKey(option.dataset.comboOption || option.textContent).includes(query);
        option.classList.toggle("hidden", !match);
        if (match) visible += 1;
    });
    menu?.classList.toggle("is-empty", visible === 0);
}

function closeComboFields(except = null) {
    document.querySelectorAll("[data-combo-field].open").forEach((combo) => {
        if (combo !== except) combo.classList.remove("open");
    });
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
    ui.openColumnFilter = null;
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
    if (action === "toggle-column-filter") return toggleColumnFilter(event.currentTarget.dataset.columnKey);
    if (action === "clear-column-filter") return clearColumnFilter(event.currentTarget.dataset.columnKey);
    if (action === "close-column-filter") {
        ui.openColumnFilter = null;
        return render();
    }
    if (action === "export-excel") return exportExcel();
    if (action === "import-data") {
        if (authState.user?.role !== "admin") return showToast("Chỉ admin được nhập dữ liệu.");
        return document.getElementById("importDataInput")?.click();
    }
}

function toggleColumnFilter(columnKey) {
    const mod = modules[ui.activeTab];
    if (!mod || !columnKey) return;
    const key = columnFilterKey(mod, { key: columnKey });
    ui.openColumnFilter = ui.openColumnFilter === key ? null : key;
    render();
}

function clearColumnFilter(columnKey) {
    const mod = modules[ui.activeTab];
    if (!mod || !columnKey) return;
    delete ui.columnFilters[columnFilterKey(mod, { key: columnKey })];
    ui.openColumnFilter = null;
    render();
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
    if (mod.collection === "features") {
        payload.owner = normalizeOwnerOption(payload.owner);
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
            if (result.state) {
                appState = normalizeState(result.state);
            } else {
                appState[mod.collection] = appState[mod.collection].map((row) => row.id === ui.modal.id ? result.record : row);
            }
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
            if (result.state) {
                appState = normalizeState(result.state);
            } else {
                appState[mod.collection].unshift(result.record);
            }
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
        if (result.state) {
            appState = normalizeState(result.state);
        } else {
            appState[mod.collection] = appState[mod.collection].filter((item) => item.id !== id);
        }
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
    ui.openColumnFilter = null;
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
        showToast("Đang tạo báo cáo từ Railway DB...");
    try {
        const response = await fetch(`${API_BASE}/export/excel`, {
            credentials: "same-origin"
        });
        if (!response.ok) {
            let message = `Không xuất được báo cáo (${response.status}).`;
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
        showToast("Đã xuất báo cáo dữ liệu UAT.");
    } catch (error) {
        showToast(error.message || "Không xuất được báo cáo.");
    } finally {
        ui.saving = false;
    }
}

function handleImport(event) {
    if (authState.user?.role !== "admin") {
        showToast("Chỉ admin được nhập dữ liệu.");
        event.target.value = "";
        return;
    }
    if (!ensureDbReady() || ui.saving) {
        event.target.value = "";
        return;
    }
    const file = event.target.files?.[0];
    if (!file) return;
    const fileName = String(file.name || "").toLowerCase();
    const fileType = String(file.type || "").toLowerCase();
    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xlsm") || fileType.includes("spreadsheetml") || fileType.includes("macroenabled")) {
        importExcelFile(file, event.target);
        return;
    }
    if (fileName.endsWith(".json") || fileType.includes("json")) {
        importJsonFile(file, event.target);
        return;
    }
    showToast("Chỉ hỗ trợ file .xlsx, .xlsm hoặc .json.");
    event.target.value = "";
}

function importJsonFile(file, input) {
    const reader = new FileReader();
    reader.onload = async () => {
        let parsed;
        try {
            parsed = JSON.parse(reader.result);
        } catch {
            showToast("File JSON không hợp lệ.");
            input.value = "";
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
                input.value = "";
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
            input.value = "";
        }
    };
    reader.readAsText(file, "utf-8");
}

async function importExcelFile(file, input) {
    if (!confirm("Nhập Excel sẽ thay thế toàn bộ dữ liệu UAT hiện tại trên Railway DB bằng các sheet trong workbook. Tiếp tục?")) {
        input.value = "";
        return;
    }
    ui.saving = true;
    showToast("Đang nhập toàn bộ workbook Excel...");
    try {
        const response = await fetch(`${API_BASE}/import/excel`, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            },
            body: file
        });
        const text = await response.text();
        let data = {};
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = { error: text || "API không trả về JSON hợp lệ" };
        }
        if (!response.ok) throw new Error(data.error || `API lỗi ${response.status}`);
        appState = normalizeState(data.state || appState);
        setDataStatus("online", "Railway Postgres đang hoạt động");
        localStorage.setItem(MIGRATION_FLAG_KEY, "uploaded");
        cacheState();
        showToast(`Đã nhập workbook Excel vào Railway DB.`);
    } catch (error) {
        setDataStatus("offline", error.message || "Không nhập được Excel");
        showToast(error.message ? `Không nhập được Excel: ${error.message}` : "File Excel không hợp lệ.");
    } finally {
        ui.saving = false;
        input.value = "";
        render();
    }
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
    return legacyCount + columnCount;
}

function columnFilterKey(mod, col) {
    return `${mod.collection}:${col.key}`;
}

function getFieldForColumn(mod, col) {
    return mod.fields.find((field) => field.key === col.key);
}

function getColumnFilterOptions(mod, col, field) {
    const fieldOptions = getFieldOptions(field);
    if (field?.type === "select" && fieldOptions.length) return fieldOptions;
    const values = uniqueValues(appState[mod.collection], col.key);
    if (values.length > 0 && values.length <= 8) return values;
    return [];
}

function getFieldOptions(field) {
    if (!field) return [];
    if (typeof field.options === "function") return field.options();
    return Array.isArray(field.options) ? field.options : [];
}

function getDefaultFieldValue(field) {
    if (!field) return "";
    if (typeof field.defaultValue === "function") return field.defaultValue();
    return field.defaultValue ?? "";
}

function getNextFeatureStt() {
    const maxStt = appState.features.reduce((max, row) => {
        const stt = Number(row?.stt);
        return Number.isFinite(stt) ? Math.max(max, Math.trunc(stt)) : max;
    }, 0);
    return maxStt + 1;
}

function uniqueTextValues(values) {
    return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "vi"));
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

function normalizeOwnerOption(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (text.toLocaleLowerCase("vi") === "all") return "ALL";
    if (text.toLocaleLowerCase("vi") === "ba") return "BA";
    return text;
}

function calculateMetrics() {
    const features = appState.features.length;
    const completedFeatures = appState.features.filter((row) => isCompletedFeatureStatus(row.status)).length;
    const statusDrivenProgress = features ? percent(completedFeatures, features) : 0;
    const totalCases = sum(appState.plans, "totalCases");
    const executedCases = sum(appState.plans, "executedCases");
    const coverage = percent(executedCases, totalCases);
    const successRate = round(average([
        ...appState.weekly.map((row) => row.successRate),
        ...appState.readiness.map((row) => row.successRate)
    ]));
    const latestReadiness = getLatest(appState.readiness);
    const dailyCritical = countDailyOpenSeverity("Nghiêm trọng");
    const readinessFallback = round(latestReadiness?.readinessLevel || average([coverage, successRate]));
    return {
        features,
        squadProgress: statusDrivenProgress || coverage,
        totalRecords: Object.keys(modules).reduce((total, id) => total + appState[modules[id].collection].length, 0),
        coverage,
        successRate,
        criticalBugs: dailyCritical,
        trainingReadiness: calculateTrainingReadiness(),
        pilotReadiness: round(latestReadiness?.pilotReadiness || readinessFallback || 0)
    };
}

function isCompletedFeatureStatus(status) {
    return status === "Done UAT" || status === "Hoàn thành";
}

function normalizeLookupKey(value) {
    return String(value || "").trim().toLocaleLowerCase("vi");
}

function normalizeWorkbookFormulaText(value) {
    return String(value || "")
        .trim()
        .toLocaleLowerCase("vi")
        .replace(/[đĐ]/g, "d")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function countDailyOpenSeverity(severity) {
    const target = normalizeWorkbookFormulaText(severity);
    const closed = normalizeWorkbookFormulaText("Đã đóng");
    return appState.daily.filter((row) => (
        normalizeWorkbookFormulaText(row.maxBugSeverity) === target
        && normalizeWorkbookFormulaText(row.bugStatus) !== closed
    )).length;
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

function checkTag(value) {
    return String(value || "").trim() ? tag("✓", "teal") : `<span style="color:#cbd5e1">-</span>`;
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
    const tone = value === "Done UAT" || value === "Hoàn thành" ? "green"
        : value === "Đạt" || value === "Xanh" ? "green"
            : value === "Vàng" || value === "Đạt có điều kiện" || value === "Chưa hoàn thành TC" ? "yellow"
                : value === "Đỏ" || value === "Chưa đạt" || value === "Thiếu tester" ? "red"
                    : value === "Done SIT" || value === "Retest" ? "purple"
                        : value === "Done DEV" || value === "Đang kiểm thử" ? "blue"
                            : value === "Done RSD" ? "yellow"
                                : value === "Chờ fix" || value === "Tạm hoãn" ? "red"
                                    : "gray";
    return tag(value, tone);
}

function renderAssessment(value) {
    const tone = value === "Tốt" ? "green" : value === "Blocker" || value === "Rủi ro" ? "red" : value === "Cần theo dõi" ? "yellow" : "gray";
    return tag(value, tone);
}

function renderDecision(value) {
    const tone = value === "GO" || value === "Sẵn sàng" ? "green"
        : value === "NO GO" || value === "Chưa sẵn sàng" ? "red"
            : value === "CONDITIONAL GO" || value === "Có điều kiện" ? "yellow"
                : "gray";
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

function averageAll(values) {
    const clean = values.map(Number).filter((value) => Number.isFinite(value));
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
    ui.openColumnFilter = null;
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
