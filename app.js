const STORAGE_KEY = "squad2_uat_command_center_v1";
const MIGRATION_FLAG_KEY = `${STORAGE_KEY}_remote_migration_checked`;
const LEGACY_BACKUP_KEY = `${STORAGE_KEY}_legacy_backup`;
const COLUMN_WIDTHS_KEY = `${STORAGE_KEY}_column_widths_v3`;
const TABLE_SCROLL_LEFTS_KEY = `${STORAGE_KEY}_table_scroll_lefts_v1`;
const API_BASE = "/api";
const SYNC_INTERVAL_MS = 30000;
const GROUP_CHAT_POLL_INTERVAL_MS = 15000;
const GROUP_CHAT_LIMIT = 50;
const AI_CHAT_HISTORY_LIMIT = 12;
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
const ROWS_PER_PAGE_OPTIONS = [10, 20, 50];
const DEFAULT_ROWS_PER_PAGE = 20;

const computedFieldsByCollection = {
    features: [
        "sprint",
        "uatHandoff",
        "handoffStatus",
        "totalCases",
        "passedCases",
        "failedCases",
        "blockedCases",
        "defectOpen",
        "blockerOpen",
        "criticalOpen",
        "uatResult",
        "openBugs",
        "completionRate",
        "uatWarning"
    ],
    schedule: ["devEnd", "handoffDate", "startDate", "endDate"],
    handoffs: ["uatStart", "uatEnd", "uatStatus"],
    plans: ["sprint", "uatHandoff", "owner", "totalCases", "progress", "devStatus", "priority"],
    daily: ["jiraCode", "executedCases", "criticalBugs", "highBugs"],
    defects: ["featureJiraCode", "sprint", "aging"],
    userStories: ["squadSummary", "jiraCode"],
    bugSources: ["tester", "featureJiraCode", "jiraCode", "featureName"],
    defectSummary: ["*"],
    weekly: ["totalStories", "storyTested", "coverageRate", "successRate", "blockerBugs", "criticalBugs", "reopenRate", "assessment", "gateResult"],
    readiness: ["totalStories", "deliveredStories", "coverageRate", "successRate", "openBlockerBugs", "openCriticalBugs", "openMajorBugs", "openHighBugs", "reopenRate", "readinessLevel", "decision", "handoffDate"],
    matrix: ["totalParticipation", "warning"]
};

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
const personnelNameOptions = [
    "Bùi Thị Mai Phương",
    "Hoàng Thành Trí",
    "Huỳnh Công Sinh",
    "Lê Trần Sơn",
    "Mai Tấn Thành",
    "Nguyễn Châu Giang",
    "Nguyễn Gia Huy",
    "Phạm Anh Tuấn",
    "Trần Đình Tuấn"
];
const dailyTesterLabels = {
    "1": "T1 – Lê Trần Sơn",
    "2": "T2 – Huỳnh Công Sinh",
    "3": "T3 – Hoàng Thành Trí",
    "4": "T4 – Nguyễn Gia Huy",
    "5": "T5 – Trần Đình Tuấn",
    "6": "T6 – Mai Tấn Thành"
};
const handoffStatusOptions = ["⏯️Chưa bàn giao", "✅ Đã bàn giao"];
const handoffNoteOptions = ["Done RSD", "Done DEV", "Done SIT", "Done UAT"];
const handoffSectionDefaults = [
    { level1: "Luồng quy trình", children: ["Tính năng gợi ý và lựa chọn cấp trình"] },
    { level1: "Tính năng nâng cao", children: [] },
    { level1: "Màn hình thẩm định", children: ["Màn hình thẩm định - Tab thông tin khách hàng", "Màn hình thẩm định - Khoản cấp tín dụng"] },
    { level1: "Màn hình phê duyệt", children: ["Màn hình phê duyệt - Tab thông tin khách hàng", "Màn hình phê duyệt - Khoản cấp tín dụng", "Màn hình phê duyệt - Tab Phê duyệt tín dụng"] },
    { level1: "Màn hình Thư ký Hội đồng", children: [] },
    { level1: "Logic khi NSD xử lý CAS", children: [] },
    { level1: "Tích hợp", children: [] },
    { level1: "Quản trị hệ thống", children: [] },
    { level1: "Luồng nhận, giải chấp, rút bớt, thay thế TSBĐ", children: [] }
];
const planStatusOptions = ["Chưa bắt đầu", "Đang kiểm thử", "Hoàn thành", "Tạm dừng/Blocked", "Chờ sửa lỗi", "Đã ký UAT"];
const testStatusOptions = ["Chưa Test", "Đang Test", "Passed", "Failed"];
const bugStatusOptions = ["Cancelled", "Closed", "In Progress", "Open", "Pending", "Reopened", "Resolved", "SIT Fail", "SIT Pass", "Reopen"];
const dailyBugStatusOptions = ["Cancelled", "Closed", "In Progress", "Open", "Pending", "Reopened", "Resolved", "SIT Fail"];
const bugSeverityOptions = ["Blocker", "Critical", "Major", "Minor", "Trivial"];
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
const workCategoryStatusOptions = ["Đang theo dõi", "Hoàn thành", "Tạm dừng"];
const workStatusOptions = ["Chưa bắt đầu", "Đang thực hiện", "Hoàn thành"];
const workStatusSummaryOptions = ["Chưa bắt đầu", "Đang thực hiện", "Quá hạn", "Hoàn thành"];
const workPriorityOptions = ["Cao", "Trung bình", "Thấp"];
const workAssigneeOptions = [
    "Bùi Thị Mai Phương",
    "Nguyễn Châu Giang",
    "Nguyễn Gia Huy",
    "Phạm Anh Tuấn",
    "Trần Đình Tuấn",
    "Lê Trần Sơn",
    "Huỳnh Công Sinh",
    "Hoàng Thành Trí",
    "Mai Tấn Thành",
    "Uông Thị Hải Yến"
];
const workAssigneeEmailByName = {
    "Bùi Thị Mai Phương": "phuongbtm@bidv.com.vn",
    "Nguyễn Châu Giang": "giangnc2@bidv.com.vn",
    "Nguyễn Gia Huy": "huyng@bidv.com.vn",
    "Phạm Anh Tuấn": "tuanpa13@bidv.com.vn",
    "Trần Đình Tuấn": "tuantd3@bidv.com.vn",
    "Lê Trần Sơn": "sonlt8@bidv.com.vn",
    "Huỳnh Công Sinh": "sinhhc@bidv.com.vn",
    "Hoàng Thành Trí": "triht@bidv.com.vn",
    "Mai Tấn Thành": "thanhmt@bidv.com.vn",
    "Uông Thị Hải Yến": "yenuth@bidv.com.vn"
};

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
            { key: "name", label: "Tên chức năng", type: "text", required: true, full: true },
            { key: "sprint", label: "Sprint", type: "text" },
            { key: "owner", label: "Đầu mối nghiệp vụ", type: "select", options: ownerOptions },
            { key: "uatHandoff", label: "Ngày BG UAT", type: "date" },
            { key: "handoffStatus", label: "Trạng thái BG", type: "select", options: handoffStatusOptions },
            { key: "totalCases", label: "Tổng TC", type: "number" },
            { key: "passedCases", label: "Passed", type: "number" },
            { key: "failedCases", label: "Failed", type: "number" },
            { key: "blockedCases", label: "Blocked", type: "number" },
            { key: "defectOpen", label: "Defect Open", type: "number" },
            { key: "blockerOpen", label: "Blocker Open", type: "number" },
            { key: "criticalOpen", label: "Critical Open", type: "number" },
            { key: "uatResult", label: "Kết quả UAT", type: "text" },
            { key: "status", label: "Trạng thái UAT", type: "select", options: statusOptions },
            { key: "completionRate", label: "% Hoàn thành TC", type: "percent" },
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
            { key: "sprint", label: "Sprint", width: "120px" },
            { key: "owner", label: "Đầu mối nghiệp vụ", width: "188px" },
            { key: "uatHandoff", label: "Ngày BG UAT", width: "150px", render: (row) => formatDate(row.uatHandoff || row.handoffDate) },
            { key: "handoffStatus", label: "Trạng thái BG", width: "150px", render: (row) => renderStatus(row.handoffStatus) },
            { key: "totalCases", label: "Tổng TC", width: "110px", render: (row) => numberText(row.totalCases) },
            { key: "passedCases", label: "Passed", width: "90px", render: (row) => numberText(row.passedCases) },
            { key: "failedCases", label: "Failed", width: "90px", render: (row) => numberText(row.failedCases) },
            { key: "blockedCases", label: "Blocked", width: "100px", render: (row) => numberText(row.blockedCases) },
            { key: "defectOpen", label: "Defect Open", width: "120px", render: (row) => bugTag(row.defectOpen) },
            { key: "blockerOpen", label: "Blocker Open", width: "130px", render: (row) => bugTag(row.blockerOpen) },
            { key: "criticalOpen", label: "Critical Open", width: "130px", render: (row) => bugTag(row.criticalOpen, "orange") },
            { key: "uatResult", label: "Kết quả UAT", width: "140px", render: (row) => renderStatus(row.uatResult) },
            { key: "status", label: "Trạng thái UAT", width: "140px", render: (row) => renderStatus(row.status) },
            { key: "completionRate", label: "% Hoàn thành TC", width: "150px", render: (row) => progressCell(row.completionRate) },
            { key: "uatWarning", label: "Cảnh báo UAT", width: "150px", render: (row) => renderStatus(row.uatWarning) }
        ]
    },
    workItems: {
        label: "Kế hoạch công việc",
        shortLabel: "Kế hoạch",
        icon: "fa-clipboard-list",
        collection: "workItems",
        compactTable: true,
        description: "Lập kế hoạch, giao người thực hiện và theo dõi tiến độ các đầu việc ngoài luồng UAT Excel.",
        emptyIcon: "fa-list-check",
        emptyTitle: "Chưa có đầu việc",
        emptyText: "Thêm nhóm công việc hoặc tạo đầu việc để bắt đầu theo dõi tiến độ.",
        fields: [
            { key: "categoryId", label: "Nhóm công việc", type: "select", options: () => getWorkCategorySelectOptions(), defaultValue: getDefaultWorkCategoryId, required: true, full: true },
            { key: "taskId", label: "Task ID", type: "text", defaultValue: getNextWorkItemTaskId },
            { key: "title", label: "Tên công việc", type: "text", required: true, full: true },
            { key: "description", label: "Mô tả", type: "textarea", full: true },
            { key: "assignee", label: "Người thực hiện", type: "select", options: () => getWorkPeopleOptions() },
            { key: "collaborators", label: "Đầu mối nghiệp vụ", type: "select", options: () => getWorkPeopleOptions(), full: true },
            { key: "status", label: "Trạng thái", type: "select", options: workStatusOptions, defaultValue: "Chưa bắt đầu" },
            { key: "progress", label: "% hoàn thành", type: "percent", defaultValue: 0 },
            { key: "priority", label: "Ưu tiên", type: "select", options: workPriorityOptions, defaultValue: "Trung bình" },
            { key: "startDate", label: "Ngày giao việc", type: "date" },
            { key: "dueDate", label: "Deadline", type: "date" },
            { key: "completedDate", label: "Ngày hoàn thành thực tế", type: "date" },
            { key: "documentUrl", label: "Link tài liệu", type: "text", full: true },
            { key: "note", label: "Vướng mắc/Ghi chú", type: "textarea", full: true }
        ],
        filters: [
            { key: "categoryId", label: "Nhóm" },
            { key: "status", label: "Trạng thái" },
            { key: "priority", label: "Ưu tiên" },
            { key: "assignee", label: "Người thực hiện" }
        ],
        columns: [
            { key: "displayOrder", label: "STT", width: "58px" },
            { key: "taskId", label: "Task ID", width: "132px", render: renderWorkTaskIdCell },
            { key: "categoryName", label: "Nhóm công việc", width: "210px", render: renderWorkCategoryCell },
            { key: "title", label: "Tên công việc", width: "300px", render: renderWorkTitleCell },
            { key: "assignee", label: "Người thực hiện", width: "180px", render: (row) => strongText(row.assignee || "-", row.assigneeEmail) },
            { key: "status", label: "Trạng thái", width: "140px", render: (row) => renderWorkStatus(row.status) },
            { key: "progress", label: "% hoàn thành", width: "150px", render: (row) => progressCell(row.progress) },
            { key: "priority", label: "Ưu tiên", width: "110px", render: (row) => renderWorkPriority(row.priority) },
            { key: "startDate", label: "Ngày giao việc", width: "120px", render: (row) => formatDate(row.startDate) },
            { key: "dueDate", label: "Deadline", width: "120px", render: (row) => formatDate(row.dueDate) },
            { key: "completedDate", label: "Hoàn thành", width: "126px", render: (row) => formatDate(row.completedDate) },
            { key: "warning", label: "Cảnh báo", width: "130px", render: (row) => renderWorkWarning(row.warning) },
            { key: "documentUrl", label: "Link tài liệu", width: "180px", render: (row) => row.documentUrl ? renderExternalLink(row.documentUrl, "Mở link") : `<span style="color:#9ca3af">-</span>` },
            { key: "note", label: "Ghi chú", width: "240px", render: (row) => renderLinkedText(row.note) }
        ]
    },
    workCategories: {
        label: "Nhóm công việc",
        shortLabel: "Nhóm công việc",
        icon: "fa-folder-tree",
        collection: "workCategories",
        description: "Quản lý các nhóm kế hoạch như Xây dựng HDSD, Quy trình tác nghiệp hoặc các nhóm mới.",
        emptyIcon: "fa-folder-plus",
        emptyTitle: "Chưa có nhóm công việc",
        emptyText: "Thêm nhóm để phân loại kế hoạch công việc.",
        fields: [
            { key: "sortOrder", label: "STT", type: "number", defaultValue: getNextWorkCategorySortOrder },
            { key: "taskPrefix", label: "Task ID Prefix", type: "text", defaultValue: getNextWorkCategoryPrefix },
            { key: "name", label: "Tên nhóm", type: "text", required: true, full: true },
            { key: "description", label: "Mô tả", type: "textarea", full: true },
            { key: "owner", label: "Người phụ trách nhóm", type: "text" },
            { key: "targetDate", label: "Mốc hoàn thành", type: "date" },
            { key: "status", label: "Trạng thái", type: "select", options: workCategoryStatusOptions, defaultValue: "Đang theo dõi" },
            { key: "note", label: "Ghi chú", type: "textarea", full: true }
        ],
        filters: [
            { key: "status", label: "Trạng thái" }
        ],
        columns: [
            { key: "sortOrder", label: "STT", width: "70px" },
            { key: "taskPrefix", label: "Prefix", width: "110px", render: (row) => tag(row.taskPrefix, "gray") },
            { key: "name", label: "Tên nhóm", width: "260px", render: (row) => strongText(row.name, row.description) },
            { key: "owner", label: "Phụ trách", width: "180px" },
            { key: "targetDate", label: "Mốc hoàn thành", width: "150px", render: (row) => formatDate(row.targetDate) },
            { key: "status", label: "Trạng thái", width: "140px", render: (row) => renderStatus(row.status) },
            { key: "note", label: "Ghi chú", width: "260px" }
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
        sectionKeys: ["sectionLevel1", "sectionLevel2"],
        description: "Lịch bàn giao UAT chi tiết theo từng User Story.",
        emptyIcon: "fa-calendar-day",
        emptyTitle: "Chưa có lịch bàn giao US",
        emptyText: "Dữ liệu từ sheet Lich_BG_US sẽ hiển thị tại đây sau khi nhập Excel.",
        fields: [
            { key: "jiraCode", label: "Mã Jira", type: "text", required: true },
            { key: "code", label: "Mã CN", type: "text" },
            { key: "storyCode", label: "Mã Story", type: "text" },
            { key: "sectionLevel1", label: "Badge cấp 1", type: "combo", options: () => getHandoffLevel1Options() },
            { key: "sectionLevel2", label: "Badge cấp 2", type: "combo", options: (row) => getHandoffLevel2Options(row), dependsOn: "sectionLevel1", full: true },
            { key: "name", label: "Tên chức năng", type: "text", required: true, full: true },
            { key: "sprint", label: "Sprint", type: "text" },
            { key: "uatHandoff", label: "BG UAT", type: "date" },
            { key: "uatStart", label: "Bắt đầu UAT", type: "date" },
            { key: "uatEnd", label: "Kết thúc UAT", type: "date" },
            { key: "handoffStatus", label: "Trạng thái BG", type: "select", options: handoffStatusOptions },
            { key: "uatStatus", label: "Trạng thái UAT", type: "select", options: handoffNoteOptions }
        ],
        filters: [
            { key: "sprint", label: "Sprint" },
            { key: "handoffStatus", label: "Trạng thái" }
        ],
        columns: [
            { key: "jiraCode", label: "Mã Jira", width: "140px" },
            { key: "code", label: "Mã CN", width: "92px", render: (row) => tag(row.code, "teal") },
            { key: "storyCode", label: "Mã Story", width: "100px", render: (row) => tag(row.storyCode, "gray") },
            { key: "name", label: "Tên chức năng", width: "280px", render: (row) => strongText(row.name) },
            { key: "sprint", label: "Sprint", width: "96px" },
            { key: "uatHandoff", label: "BG UAT", width: "130px", render: (row) => formatDate(row.uatHandoff) },
            { key: "uatStart", label: "Bắt đầu UAT", width: "140px", render: (row) => formatDate(row.uatStart) },
            { key: "uatEnd", label: "Kết thúc UAT", width: "140px", render: (row) => formatDate(row.uatEnd) },
            { key: "handoffStatus", label: "Trạng thái BG", width: "150px", render: (row) => renderStatus(row.handoffStatus) },
            { key: "uatStatus", label: "Trạng thái UAT", width: "150px", render: (row) => renderStatus(row.uatStatus) }
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
            { key: "owner", label: "Đầu mối nghiệp vụ", type: "select", options: ownerOptions },
            { key: "nv", label: "NV", type: "number" },
            { key: "t1", label: "T1", type: "number" },
            { key: "t2", label: "T2", type: "number" },
            { key: "t3", label: "T3", type: "number" },
            { key: "t4", label: "T4", type: "number" },
            { key: "t5", label: "T5", type: "number" },
            { key: "t6", label: "T6", type: "number" },
            { key: "totalCases", label: "Tổng Testcase", type: "number" },
            { key: "testStatus", label: "Trạng thái kiểm thử", type: "select", options: testStatusOptions },
            { key: "progress", label: "% hoàn thành", type: "percent" },
            { key: "uatStatus", label: "Trạng thái UAT", type: "select", options: planStatusOptions },
            { key: "devStatus", label: "Trạng thái DEV", type: "select", options: handoffNoteOptions },
            { key: "priority", label: "Mức độ ưu tiên", type: "number" },
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
            { key: "nv", label: "NV", headerTop: "NV", width: "68px", render: (row) => numberText(row.nv) },
            { key: "t1", label: "T1", headerTop: "Sơn", width: "76px", render: (row) => numberText(row.t1) },
            { key: "t2", label: "T2", headerTop: "Sinh", width: "78px", render: (row) => numberText(row.t2) },
            { key: "t3", label: "T3", headerTop: "Trí", width: "76px", render: (row) => numberText(row.t3) },
            { key: "t4", label: "T4", headerTop: "Huy", width: "76px", render: (row) => numberText(row.t4) },
            { key: "t5", label: "T5", headerTop: "Tuấn", width: "80px", render: (row) => numberText(row.t5) },
            { key: "t6", label: "T6", headerTop: "Thành", width: "84px", render: (row) => numberText(row.t6) },
            { key: "totalCases", label: "Tổng Testcase", width: "130px", render: (row) => numberText(row.totalCases) },
            { key: "testStatus", label: "Trạng thái kiểm thử", width: "170px", render: (row) => renderStatus(row.testStatus) },
            { key: "progress", label: "% hoàn thành", width: "140px", render: (row) => progressCell(resolveRate(row.progress, row.executedCases, row.totalCases)) },
            { key: "uatStatus", label: "Trạng thái UAT", width: "150px", render: (row) => renderStatus(row.uatStatus) },
            { key: "devStatus", label: "Trạng thái DEV", width: "150px", render: (row) => renderStatus(row.devStatus) },
            { key: "priority", label: "Mức độ ưu tiên", width: "140px", render: (row) => numberText(row.priority) },
            { key: "note", label: "Ghi chú", width: "220px" }
        ]
    },
    matrix: {
        label: "Năng suất Tester",
        shortLabel: "Năng suất",
        icon: "fa-table-cells-large",
        collection: "matrix",
        description: "Theo dõi đào tạo chéo và mức độ tham gia của tester theo nhóm chức năng.",
        emptyIcon: "fa-grip",
        emptyTitle: "Chưa có dữ liệu năng suất tester",
        emptyText: "Dữ liệu từ sheet NangSuat_Tester sẽ hiển thị tại đây sau khi nhập Excel.",
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
            { key: "date", label: "Ngày", type: "date", required: true },
            { key: "jiraCode", label: "Mã Jira", type: "text" },
            { key: "feature", label: "Tên chức năng", type: "text", full: true },
            { key: "sprint", label: "Sprint", type: "text" },
            { key: "tester", label: "Tester", type: "select", options: () => getDailyTesterOptions(), required: true },
            { key: "totalCases", label: "Tổng TC", type: "number" },
            { key: "passedCases", label: "TC Passed", type: "number" },
            { key: "failedCases", label: "TC Failed", type: "number" },
            { key: "bugStatus", label: "Trạng thái lỗi", type: "select", options: dailyBugStatusOptions },
            { key: "maxBugSeverity", label: "Mức độ lỗi", type: "select", options: bugSeverityOptions },
            { key: "bugDetail", label: "Chi tiết lỗi", type: "textarea", full: true },
            { key: "blocker", label: "Vướng mắc/Blocker", type: "textarea", full: true },
            { key: "handler", label: "Người xử lý", type: "select", options: personnelNameOptions },
            { key: "dueDate", label: "Thời hạn xử lý", type: "date" }
        ],
        filters: [
            { key: "date", label: "Ngày" },
            { key: "sprint", label: "Sprint" },
            { key: "tester", label: "Tester" }
        ],
        columns: [
            { key: "date", label: "Ngày", width: "118px", render: (row) => formatDate(row.date) },
            { key: "jiraCode", label: "Mã Jira", width: "140px" },
            { key: "feature", label: "Tên chức năng", width: "260px", render: (row) => strongText(row.feature) },
            { key: "sprint", label: "Sprint", width: "100px" },
            { key: "tester", label: "Tester", width: "190px", render: (row) => e(formatDailyTesterLabel(row.tester)) },
            { key: "totalCases", label: "Tổng TC", width: "100px", render: (row) => numberText(row.totalCases) },
            { key: "passedCases", label: "TC Passed", width: "110px", render: (row) => numberText(row.passedCases) },
            { key: "failedCases", label: "TC Failed", width: "110px", render: (row) => numberText(row.failedCases) },
            { key: "bugStatus", label: "Trạng thái lỗi", width: "150px", render: (row) => renderStatus(row.bugStatus) },
            { key: "maxBugSeverity", label: "Mức độ lỗi", width: "180px", render: (row) => renderStatus(row.maxBugSeverity) },
            { key: "bugDetail", label: "Chi tiết lỗi", width: "240px" },
            { key: "blocker", label: "Vướng mắc/Blocker", width: "320px", render: (row) => renderLinkedText(row.blocker, row.blockerLinks) },
            { key: "handler", label: "Người xử lý", width: "150px" },
            { key: "dueDate", label: "Thời hạn xử lý", width: "150px", render: (row) => formatDate(row.dueDate) }
        ]
    },
    defects: {
        label: "DEFECT_LOG",
        shortLabel: "Defect",
        icon: "fa-bug",
        collection: "defects",
        description: "Theo dõi defect UAT theo Jira, Severity, Status, tester, owner và aging.",
        emptyIcon: "fa-bug-slash",
        emptyTitle: "Chưa có defect",
        emptyText: "Dữ liệu từ sheet DEFECT_LOG sẽ hiển thị tại đây sau khi có bản ghi.",
        fields: [
            { key: "stt", label: "STT", type: "number" },
            { key: "bugId", label: "Bug ID", type: "text" },
            { key: "linkedUsKey", label: "Mã US liên kết", type: "text" },
            { key: "featureJiraCode", label: "Mã Jira chức năng", type: "text" },
            { key: "storyName", label: "Tên Story", type: "text", full: true },
            { key: "sprint", label: "Sprint", type: "text" },
            { key: "severity", label: "Severity", type: "select", options: bugSeverityOptions },
            { key: "status", label: "Status", type: "select", options: bugStatusOptions },
            { key: "foundDate", label: "Ngày phát hiện", type: "date" },
            { key: "tester", label: "Tester", type: "select", options: personnelNameOptions },
            { key: "owner", label: "Owner", type: "select", options: ownerOptions },
            { key: "resolvedDate", label: "Ngày xử lý", type: "date" },
            { key: "aging", label: "Aging", type: "number" },
            { key: "note", label: "Ghi chú", type: "textarea", full: true }
        ],
        filters: [
            { key: "sprint", label: "Sprint" },
            { key: "severity", label: "Severity" },
            { key: "status", label: "Status" }
        ],
        columns: [
            { key: "stt", label: "STT", width: "58px" },
            { key: "bugId", label: "Bug ID", width: "120px" },
            { key: "linkedUsKey", label: "Mã US liên kết", width: "140px" },
            { key: "featureJiraCode", label: "Mã Jira chức năng", width: "150px" },
            { key: "storyName", label: "Tên Story", width: "260px", render: (row) => strongText(row.storyName) },
            { key: "sprint", label: "Sprint", width: "100px" },
            { key: "severity", label: "Severity", width: "110px", render: (row) => renderStatus(row.severity) },
            { key: "status", label: "Status", width: "130px", render: (row) => renderStatus(row.status) },
            { key: "foundDate", label: "Ngày phát hiện", width: "140px", render: (row) => formatDate(row.foundDate) },
            { key: "tester", label: "Tester", width: "140px" },
            { key: "owner", label: "Owner", width: "188px" },
            { key: "resolvedDate", label: "Ngày xử lý", width: "130px", render: (row) => formatDate(row.resolvedDate) },
            { key: "aging", label: "Aging", width: "90px", render: (row) => numberText(row.aging) },
            { key: "note", label: "Ghi chú", width: "220px" }
        ]
    },
    userStories: {
        label: "DS_US",
        shortLabel: "DS_US",
        icon: "fa-list",
        collection: "userStories",
        stickyColumns: 3,
        compactTable: true,
        description: "Danh sách User Story nguồn từ Jira, thay cho vùng paste DS_US trong Excel.",
        emptyIcon: "fa-list",
        emptyTitle: "Chưa có DS_US",
        emptyText: "Dữ liệu User Story từ Jira sẽ hiển thị tại đây sau khi nhập Excel hoặc thêm trên web.",
        fields: [
            { key: "issueType", label: "Issue Type", type: "text" },
            { key: "issueKey", label: "Issue key", type: "text", required: true },
            { key: "issueId", label: "Issue id", type: "text" },
            { key: "summary", label: "Summary", type: "textarea", required: true, full: true },
            { key: "assignee", label: "Assignee", type: "text" },
            { key: "assigneeId", label: "Assignee Id", type: "text" },
            { key: "reporter", label: "Reporter", type: "text" },
            { key: "reporterId", label: "Reporter Id", type: "text" },
            { key: "priority", label: "Priority", type: "text" },
            { key: "status", label: "Status", type: "text" },
            { key: "resolution", label: "Resolution", type: "text" },
            { key: "created", label: "Created", type: "date" },
            { key: "updated", label: "Updated", type: "date" },
            { key: "dueDate", label: "Due date", type: "date" },
            { key: "squadSummary", label: "SQ2_Summary", type: "text" }
        ],
        filters: [
            { key: "status", label: "Status" },
            { key: "priority", label: "Priority" }
        ],
        columns: [
            { key: "issueType", label: "Issue Type", width: "100px" },
            { key: "issueKey", label: "Issue key", width: "130px", render: (row) => tag(row.issueKey, "teal") },
            { key: "squadSummary", label: "SQ2_Summary", width: "140px" },
            { key: "summary", label: "Summary", width: "300px", render: (row) => strongText(row.summary) },
            { key: "assignee", label: "Assignee", width: "210px" },
            { key: "reporter", label: "Reporter", width: "210px" },
            { key: "priority", label: "Priority", width: "100px", render: (row) => renderStatus(row.priority) },
            { key: "status", label: "Status", width: "100px", render: (row) => renderStatus(row.status) },
            { key: "created", label: "Created", width: "118px", render: (row) => formatDate(row.created) },
            { key: "updated", label: "Updated", width: "118px", render: (row) => formatDate(row.updated) },
            { key: "dueDate", label: "Due date", width: "118px", render: (row) => formatDate(row.dueDate) },
            { key: "issueId", label: "Issue id", width: "100px" }
        ]
    },
    bugSources: {
        label: "DS.Loi",
        shortLabel: "DS.Loi",
        icon: "fa-bugs",
        collection: "bugSources",
        stickyColumns: 4,
        compactTable: true,
        description: "Danh sách bug nguồn từ Jira, thay cho vùng paste DS.Loi trong Excel.",
        emptyIcon: "fa-bug-slash",
        emptyTitle: "Chưa có DS.Loi",
        emptyText: "Dữ liệu bug Jira sẽ hiển thị tại đây sau khi nhập Excel hoặc thêm trên web.",
        fields: [
            { key: "issueType", label: "Issue Type", type: "text" },
            { key: "issueKey", label: "Issue key", type: "text", required: true },
            { key: "issueId", label: "Issue id", type: "text" },
            { key: "summary", label: "Summary", type: "textarea", required: true, full: true },
            { key: "assignee", label: "Assignee", type: "text" },
            { key: "reporter", label: "Reporter", type: "text" },
            { key: "tester", label: "Tester", type: "text" },
            { key: "priority", label: "Priority", type: "select", options: bugSeverityOptions },
            { key: "status", label: "Status", type: "select", options: bugStatusOptions },
            { key: "resolution", label: "Resolution", type: "text" },
            { key: "created", label: "Created", type: "date" },
            { key: "updated", label: "Updated", type: "date" },
            { key: "dueDate", label: "Due date", type: "date" },
            { key: "actualEnd", label: "Actual end", type: "date" },
            { key: "linkedUsKey", label: "Parent US", type: "text" },
            { key: "inwardBlocks", label: "Blocks", type: "text" }
        ],
        filters: [
            { key: "priority", label: "Priority" },
            { key: "status", label: "Status" },
            { key: "tester", label: "Tester" }
        ],
        columns: [
            { key: "issueType", label: "Issue Type", width: "92px" },
            { key: "issueKey", label: "Issue key", width: "130px", render: (row) => tag(row.issueKey, "teal") },
            { key: "linkedUsKey", label: "Parent US", width: "130px" },
            { key: "summary", label: "Summary", width: "320px", render: (row) => strongText(row.summary) },
            { key: "priority", label: "Priority", width: "100px", render: (row) => renderStatus(row.priority) },
            { key: "status", label: "Status", width: "110px", render: (row) => renderStatus(row.status) },
            { key: "tester", label: "Tester", width: "140px" },
            { key: "assignee", label: "Assignee", width: "210px" },
            { key: "reporter", label: "Reporter", width: "210px" },
            { key: "created", label: "Created", width: "118px", render: (row) => formatDate(row.created) },
            { key: "updated", label: "Updated", width: "118px", render: (row) => formatDate(row.updated) },
            { key: "dueDate", label: "Due date", width: "118px", render: (row) => formatDate(row.dueDate) }
        ]
    },
    defectSummary: {
        label: "Tong hop loi",
        shortLabel: "Tổng lỗi",
        icon: "fa-table-list",
        collection: "defectSummary",
        stickyColumns: 7,
        compactTable: true,
        readOnly: true,
        description: "Bảng tổng hợp lỗi theo User Story, được backend tính lại từ DS_US, DS.Loi, DEFECT_LOG và dữ liệu UAT.",
        emptyIcon: "fa-table-list",
        emptyTitle: "Chưa có tổng hợp lỗi",
        emptyText: "Bảng sẽ tự sinh sau khi có DM_ChucNang và dữ liệu bug.",
        fields: [],
        filters: [
            { key: "sprint", label: "Sprint" },
            { key: "owner", label: "Nghiệp vụ" },
            { key: "status", label: "Trạng thái UAT" }
        ],
        columns: [
            { key: "stt", label: "STT", width: "58px" },
            { key: "code", label: "Mã CN", width: "92px", render: (row) => tag(row.code, "teal") },
            { key: "storyCode", label: "Mã Story", width: "90px" },
            { key: "jiraCode", label: "Mã Jira", width: "132px" },
            { key: "usKey", label: "Mã US", width: "130px" },
            { key: "group", label: "Nhóm chức năng", width: "220px" },
            { key: "name", label: "Tên chức năng", width: "260px", render: (row) => strongText(row.name) },
            { key: "sprint", label: "Sprint", width: "100px" },
            { key: "owner", label: "Đầu mối nghiệp vụ", width: "188px" },
            { key: "handoffStatus", label: "Trạng thái BG", width: "136px", render: (row) => renderStatus(row.handoffStatus) },
            { key: "assignee", label: "Assignee", width: "190px" },
            { key: "usStatus", label: "Trạng thái US", width: "118px", render: (row) => renderStatus(row.usStatus) },
            { key: "totalCases", label: "Tổng TC", width: "96px", render: (row) => numberText(row.totalCases) },
            { key: "passedCases", label: "Passed", width: "86px", render: (row) => numberText(row.passedCases) },
            { key: "failedCases", label: "Failed", width: "86px", render: (row) => numberText(row.failedCases) },
            { key: "totalBugs", label: "Tổng lỗi", width: "96px", render: (row) => bugTag(row.totalBugs, "blue") },
            { key: "openBugs", label: "Open", width: "82px", render: (row) => bugTag(row.openBugs) },
            { key: "inProgressBugs", label: "In Progress", width: "110px", render: (row) => bugTag(row.inProgressBugs, "yellow") },
            { key: "pendingBugs", label: "Pending", width: "90px", render: (row) => bugTag(row.pendingBugs, "yellow") },
            { key: "resolvedBugs", label: "Resolved", width: "96px", render: (row) => bugTag(row.resolvedBugs, "blue") },
            { key: "sitPassBugs", label: "SIT Pass", width: "96px", render: (row) => bugTag(row.sitPassBugs, "green") },
            { key: "activeBugs", label: "Đang mở", width: "92px", render: (row) => bugTag(row.activeBugs) },
            { key: "handledBugs", label: "Đã xử lý", width: "92px", render: (row) => bugTag(row.handledBugs, "green") },
            { key: "handledRate", label: "% xử lý", width: "96px", render: (row) => progressCell(row.handledRate) },
            { key: "severeBugs", label: "Lỗi nghiêm trọng", width: "130px", render: (row) => bugTag(row.severeBugs, "orange") },
            { key: "uatResult", label: "Kết quả UAT", width: "130px", render: (row) => renderStatus(row.uatResult) },
            { key: "status", label: "Trạng thái UAT", width: "130px", render: (row) => renderStatus(row.status) },
            { key: "completionRate", label: "% Hoàn thành TC", width: "140px", render: (row) => progressCell(row.completionRate) }
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
            { key: "totalStories", label: "Tổng Story", type: "number" },
            { key: "storyTested", label: "Story đã test", type: "number" },
            { key: "coverageRate", label: "Coverage %", type: "percent" },
            { key: "successRate", label: "Pass Rate %", type: "percent" },
            { key: "blockerBugs", label: "Blocker Open", type: "number" },
            { key: "criticalBugs", label: "Critical Open", type: "number" },
            { key: "reopenRate", label: "Reopen Rate", type: "percent" },
            { key: "assessment", label: "Đánh giá", type: "text" }
        ],
        filters: [
            { key: "week", label: "Tuần" },
            { key: "sprint", label: "Sprint" },
            { key: "assessment", label: "Đánh giá" }
        ],
        columns: [
            { key: "week", label: "Tuần", width: "110px", render: (row) => tag(row.week, "teal") },
            { key: "sprint", label: "Sprint", width: "100px" },
            { key: "totalStories", label: "Tổng Story", width: "110px", render: (row) => numberText(row.totalStories) },
            { key: "storyTested", label: "Story đã test", width: "130px", render: (row) => numberText(row.storyTested) },
            { key: "coverageRate", label: "Coverage %", width: "150px", render: (row) => progressCell(row.coverageRate) },
            { key: "successRate", label: "Pass Rate %", width: "150px", render: (row) => progressCell(row.successRate) },
            { key: "blockerBugs", label: "Blocker Open", width: "130px", render: (row) => bugTag(row.blockerBugs) },
            { key: "criticalBugs", label: "Critical Open", width: "130px", render: (row) => bugTag(row.criticalBugs, "orange") },
            { key: "reopenRate", label: "Reopen Rate", width: "140px", render: (row) => progressCell(row.reopenRate) },
            { key: "assessment", label: "Đánh giá", width: "160px", render: (row) => renderStatus(row.assessment || row.gateResult) }
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
            { key: "totalStories", label: "Tổng Story", type: "number" },
            { key: "deliveredStories", label: "Story đã bàn giao", type: "number" },
            { key: "coverageRate", label: "Tỷ lệ bao phủ", type: "percent" },
            { key: "successRate", label: "Pass Rate %", type: "percent" },
            { key: "openBlockerBugs", label: "Blocker Open", type: "number" },
            { key: "openCriticalBugs", label: "Critical Open", type: "number" },
            { key: "openMajorBugs", label: "Major Open", type: "number" },
            { key: "reopenRate", label: "Reopen Rate", type: "percent" },
            { key: "decision", label: "Quyết định", type: "text" }
        ],
        filters: [
            { key: "sprint", label: "Sprint" },
            { key: "decision", label: "Quyết định" }
        ],
        columns: [
            { key: "sprint", label: "Sprint", width: "110px", render: (row) => tag(row.sprint, "teal") },
            { key: "totalStories", label: "Tổng Story", width: "110px", render: (row) => numberText(row.totalStories) },
            { key: "deliveredStories", label: "Story đã bàn giao", width: "160px", render: (row) => numberText(row.deliveredStories) },
            { key: "coverageRate", label: "Tỷ lệ bao phủ", width: "150px", render: (row) => progressCell(row.coverageRate) },
            { key: "successRate", label: "Pass Rate %", width: "150px", render: (row) => progressCell(row.successRate) },
            { key: "openBlockerBugs", label: "Blocker Open", width: "130px", render: (row) => bugTag(row.openBlockerBugs) },
            { key: "openCriticalBugs", label: "Critical Open", width: "130px", render: (row) => bugTag(row.openCriticalBugs, "orange") },
            { key: "openMajorBugs", label: "Major Open", width: "120px", render: (row) => bugTag(row.openMajorBugs, "yellow") },
            { key: "reopenRate", label: "Reopen Rate", width: "140px", render: (row) => progressCell(row.reopenRate) },
            { key: "decision", label: "Quyết định", width: "160px", render: (row) => renderDecision(row.decision) },
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

modules.kpiConfig = {
    label: "Cấu hình KPI",
    shortLabel: "cấu hình KPI",
    icon: "fa-sliders",
    collection: "kpiConfig",
    description: "Thiết lập trọng số và mục tiêu KPI thành viên. Tổng trọng số luôn bằng 100%.",
    fields: [
        { key: "progressWeight", label: "Trọng số tiến độ", type: "percent", required: true },
        { key: "onTimeWeight", label: "Trọng số đúng hạn", type: "percent", required: true },
        { key: "qualityWeight", label: "Trọng số chất lượng", type: "percent", required: true },
        { key: "contributionWeight", label: "Trọng số đóng góp", type: "percent", required: true },
        { key: "disciplineWeight", label: "Trọng số kỷ luật cập nhật", type: "percent", required: true },
        { key: "progressTarget", label: "Mục tiêu tiến độ", type: "percent", required: true },
        { key: "onTimeTarget", label: "Mục tiêu đúng hạn", type: "percent", required: true },
        { key: "qualityTarget", label: "Mục tiêu chất lượng", type: "percent", required: true },
        { key: "contributionTarget", label: "Mục tiêu đóng góp", type: "percent", required: true },
        { key: "disciplineTarget", label: "Mục tiêu kỷ luật", type: "percent", required: true }
    ],
    filters: [],
    columns: []
};

modules.memberKpiInputs = {
    label: "Dữ liệu chấm KPI",
    shortLabel: "KPI thành viên",
    icon: "fa-user-check",
    collection: "memberKpiInputs",
    description: "Nhập capacity và các tiêu chí cần đánh giá thủ công cho từng thành viên.",
    fields: [
        { key: "memberEmail", label: "Thành viên", type: "select", options: () => getKpiMemberOptions(), required: true, full: true },
        { key: "role", label: "Vai trò KPI", type: "select", options: ["PO", "BA", "Squad Lead", "Tester", "Developer", "Reviewer", "Khác"] },
        { key: "module", label: "Module phụ trách", type: "text", full: true },
        { key: "capacity", label: "Capacity / kỳ", type: "number" },
        { key: "qualityScore", label: "Điểm review / chất lượng", type: "percent" },
        { key: "contributionScore", label: "Điểm phối hợp / đóng góp", type: "percent" },
        { key: "disciplineScore", label: "Điểm kỷ luật cập nhật", type: "percent" }
    ],
    filters: [],
    columns: []
};

const tabs = [
    { id: "dashboard", label: "Dashboard_UAT", icon: "fa-gauge-high" },
    { id: "workItems", label: "Kế hoạch công việc", icon: modules.workItems.icon },
    { id: "defectDashboard", label: "DEFECT_Dashboard", icon: "fa-bug" },
    { id: "personnel", label: "NhanSu_UAT", icon: modules.personnel.icon },
    { id: "guide", label: "HD_UAT", icon: modules.guide.icon },
    { id: "features", label: "DM_ChucNang", icon: modules.features.icon },
    { id: "handoffs", label: "Lich_BG_US", icon: modules.handoffs.icon },
    { id: "plans", label: "PhanCong_UAT", icon: modules.plans.icon },
    { id: "daily", label: "DieuHanh_Ngay", icon: modules.daily.icon },
    { id: "defects", label: "DEFECT_LOG", icon: modules.defects.icon },
    { id: "weekly", label: "ChatLuong_Tuan", icon: modules.weekly.icon },
    { id: "readiness", label: "TongKet_Sprint", icon: modules.readiness.icon },
    { id: "matrix", label: "NangSuat_Tester", icon: modules.matrix.icon },
    { id: "defectSummary", label: "Tong hop loi", icon: modules.defectSummary.icon },
    { id: "userStories", label: "DS_US", icon: modules.userStories.icon, sheetMark: "red", hidden: true },
    { id: "bugSources", label: "DS.Loi", icon: modules.bugSources.icon, sheetMark: "red", hidden: true }
];

const t01ModuleIds = [
    "dashboard",
    "defectDashboard",
    "features",
    "handoffs",
    "plans",
    "daily",
    "defects",
    "weekly",
    "readiness",
    "matrix"
];
const t01ModuleTabs = tabs.filter((tab) => t01ModuleIds.includes(tab.id));
const legacyRouteAliases = {
    dashboard: "work/group/pilot-t01/dashboard",
    defectDashboard: "work/group/pilot-t01/defectDashboard",
    features: "work/group/pilot-t01/features",
    handoffs: "work/group/pilot-t01/handoffs",
    plans: "work/group/pilot-t01/plans",
    daily: "work/group/pilot-t01/daily",
    defects: "work/group/pilot-t01/defects",
    defectSummary: "work/group/pilot-t01/defectSummary",
    weekly: "work/group/pilot-t01/weekly",
    readiness: "work/group/pilot-t01/readiness",
    matrix: "work/group/pilot-t01/matrix",
    personnel: "common/personnel/list",
    guide: "common/guide",
    workItems: "work/task-master"
};

function visibleTabs() {
    return tabs.filter((tab) => !tab.hidden);
}

function getDataModuleCount() {
    return visibleTabs().filter((tab) => modules[tab.id]).length;
}

function getInitialTab() {
    return getInitialRoute().activeTab;
}

function getInitialRoute(pathOverride) {
    const rawPath = pathOverride == null ? window.location.hash || "" : pathOverride;
    let path = decodeURIComponent(String(rawPath).replace(/^#\/?/, "")).trim();
    if (legacyRouteAliases[path]) path = legacyRouteAliases[path];
    if (!path) path = "work/dashboard";
    const parts = path.split("/").filter(Boolean);

    if (parts[0] === "common" && parts[1] === "personnel") {
        const section = ["list", "map", "kpi"].includes(parts[2]) ? parts[2] : "list";
        return { path: `common/personnel/${section}`, view: `personnel-${section}`, activeTab: "personnel", categoryId: "", t01Tab: "dashboard" };
    }
    if (path === "common/guide") {
        return { path, view: "guide", activeTab: "guide", categoryId: "", t01Tab: "dashboard" };
    }
    if (path === "work/task-master") {
        return { path, view: "task-master", activeTab: "workItems", categoryId: "", t01Tab: "dashboard" };
    }
    if (path === "work/dashboard") {
        return { path, view: "work-dashboard", activeTab: "workItems", categoryId: "", t01Tab: "dashboard" };
    }
    if (path === "work/inputs") {
        return { path, view: "work-inputs", activeTab: "workCategories", categoryId: "", t01Tab: "dashboard" };
    }
    if (path === "work/member-kpi") {
        return { path, view: "member-kpi", activeTab: "workItems", categoryId: "", t01Tab: "dashboard" };
    }
    if (parts[0] === "work" && parts[1] === "group" && parts[2]) {
        const categoryId = parts[2];
        const requestedTab = parts[3] || "dashboard";
        const t01Tab = [...t01ModuleIds, "defectSummary"].includes(requestedTab) ? requestedTab : "dashboard";
        return {
            path: `work/group/${categoryId}${categoryId === "pilot-t01" ? `/${t01Tab}` : ""}`,
            view: "work-group",
            activeTab: categoryId === "pilot-t01" ? t01Tab : "workItems",
            categoryId,
            t01Tab
        };
    }
    return { path: "work/dashboard", view: "work-dashboard", activeTab: "workItems", categoryId: "", t01Tab: "dashboard" };
}

function tabButtonClass(tab, baseClass) {
    return [
        baseClass,
        ui.activeTab === tab.id ? "active" : "",
        tab.sheetMark === "red" ? "sheet-tab-red" : ""
    ].filter(Boolean).join(" ");
}

const emptyState = () => ({
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
    workItems: [],
    kpiConfig: [],
    memberKpiInputs: [],
    memberKpiResults: [],
    updatedAt: null
});

let appState = loadCachedState();
let authState = {
    status: "checking",
    user: null,
    error: null
};
let accountDirectory = [];
let lastRenderedTab = null;
let pendingActiveTabScroll = null;
let responsiveTableResizeFrame = 0;
const initialRoute = getInitialRoute();
if ((window.location.hash || "").replace(/^#\/?/, "") !== initialRoute.path) {
    history.replaceState(null, "", `#${initialRoute.path}`);
}
const SIDEBAR_ACCORDION_STORAGE_KEY = "squad2-sidebar-accordion";
const initialSidebarAccordion = getInitialSidebarAccordionState(initialRoute);
let ui = {
    activeTab: initialRoute.activeTab,
    activeView: initialRoute.view,
    activeRoute: initialRoute.path,
    activeCategoryId: initialRoute.categoryId,
    t01Tab: initialRoute.t01Tab,
    sidebarCollapsed: localStorage.getItem("squad2-sidebar-collapsed") === "true",
    sidebarMobileOpen: false,
    sidebarOpenSection: initialSidebarAccordion.openSection,
    sidebarOpenGroups: initialSidebarAccordion.openGroups,
    query: "",
    filters: {},
    columnFilters: {},
    columnWidths: loadColumnWidths(),
    tableScrollLefts: loadTableScrollLefts(),
    tablePages: {},
    tablePageSizes: {},
    openColumnFilter: null,
    modal: null,
    profileOpen: false,
    aiChatOpen: false,
    aiChatDraft: "",
    groupChatOpen: false,
    groupChatDraft: "",
    profileAvatarDraft: null,
    workView: "all",
    t01MetricView: "all",
    profileSaving: false,
    passwordSaving: false,
    toast: null,
    saving: false
};

function getSidebarRouteBranch(route) {
    const view = String(route?.view || "");
    const path = String(route?.path || "");
    if (path.startsWith("common/")) {
        return {
            section: "common",
            group: ["personnel-list", "personnel-map", "personnel-kpi"].includes(view) ? "personnel" : null
        };
    }
    const workStage = view === "work-group" ? getSidebarWorkStage(route?.categoryId) : null;
    return {
        section: "work",
        group: view === "work-group" ? "workGroups" : null,
        subgroup: workStage
    };
}

function getSidebarWorkStage(categoryId) {
    const id = String(categoryId || "").trim().toLowerCase();
    if (["pilot-t01", "pilot-t02"].includes(id)) return "uat";
    if (["pilot-t03", "pilot-t04", "pilot-t05", "pilot-t06", "pilot-t07"].includes(id)) return "prePilot";
    return null;
}

function readSidebarAccordionPreference() {
    try {
        const stored = JSON.parse(localStorage.getItem(SIDEBAR_ACCORDION_STORAGE_KEY) || "null");
        return {
            openSection: ["common", "work"].includes(stored?.openSection) ? stored.openSection : null,
            openGroups: {
                personnel: Boolean(stored?.openGroups?.personnel),
                workGroups: Boolean(stored?.openGroups?.workGroups),
                uat: Boolean(stored?.openGroups?.uat),
                prePilot: Boolean(stored?.openGroups?.prePilot)
            }
        };
    } catch {
        return { openSection: null, openGroups: { personnel: false, workGroups: false, uat: false, prePilot: false } };
    }
}

function getInitialSidebarAccordionState(route) {
    const stored = readSidebarAccordionPreference();
    const branch = getSidebarRouteBranch(route);
    const openGroups = { ...stored.openGroups };
    if (branch.group) openGroups[branch.group] = true;
    if (branch.subgroup) {
        openGroups.uat = branch.subgroup === "uat";
        openGroups.prePilot = branch.subgroup === "prePilot";
    }
    return { openSection: branch.section, openGroups };
}

function persistSidebarAccordionState() {
    localStorage.setItem(SIDEBAR_ACCORDION_STORAGE_KEY, JSON.stringify({
        openSection: ui.sidebarOpenSection,
        openGroups: ui.sidebarOpenGroups
    }));
}

function syncSidebarAccordionForRoute(route) {
    const branch = getSidebarRouteBranch(route);
    ui.sidebarOpenSection = branch.section;
    ui.sidebarOpenGroups = {
        personnel: branch.group === "personnel",
        workGroups: branch.group === "workGroups",
        uat: branch.subgroup === "uat",
        prePilot: branch.subgroup === "prePilot"
    };
    persistSidebarAccordionState();
}

function applySidebarAccordionDomState() {
    const sectionStates = {
        common: ui.sidebarOpenSection === "common",
        work: ui.sidebarOpenSection === "work"
    };
    Object.entries(sectionStates).forEach(([key, expanded]) => {
        const toggle = document.querySelector(`[data-sidebar-section="${key}"]`);
        const panel = document.getElementById(`sidebar-section-${key}`);
        toggle?.setAttribute("aria-expanded", String(expanded));
        toggle?.classList.toggle("is-expanded", expanded);
        panel?.classList.toggle("is-expanded", expanded);
        panel?.setAttribute("aria-hidden", String(!expanded));
        if (panel) panel.inert = !expanded;
    });
    const groupStates = {
        personnel: ui.sidebarOpenGroups.personnel,
        workGroups: ui.sidebarOpenGroups.workGroups,
        uat: ui.sidebarOpenGroups.uat,
        prePilot: ui.sidebarOpenGroups.prePilot
    };
    Object.entries(groupStates).forEach(([key, expanded]) => {
        const toggle = document.querySelector(`[data-sidebar-group="${key}"]`);
        const panel = document.getElementById(`sidebar-group-${key}`);
        toggle?.setAttribute("aria-expanded", String(expanded));
        toggle?.classList.toggle("is-expanded", expanded);
        panel?.classList.toggle("is-expanded", expanded);
        panel?.setAttribute("aria-hidden", String(!expanded));
        if (panel) panel.inert = !expanded;
    });
}
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
let aiChatState = {
    messages: [],
    sending: false,
    error: null
};

function normalizeState(raw) {
    const nextState = emptyState();
    const source = raw && typeof raw === "object" ? raw : {};
    Object.keys(modules).forEach((id) => {
        const collection = modules[id].collection;
        nextState[collection] = Array.isArray(source[collection]) ? source[collection] : [];
    });
    nextState.memberKpiResults = Array.isArray(source.memberKpiResults) ? source.memberKpiResults : [];
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

function loadTableScrollLefts() {
    try {
        if (typeof sessionStorage === "undefined") return {};
        const raw = sessionStorage.getItem(TABLE_SCROLL_LEFTS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
        return Object.fromEntries(
            Object.entries(parsed)
                .map(([key, value]) => [key, Number(value)])
                .filter(([, value]) => Number.isFinite(value) && value >= 0)
        );
    } catch {
        return {};
    }
}

function saveTableScrollLefts() {
    try {
        if (typeof sessionStorage === "undefined") return;
        sessionStorage.setItem(TABLE_SCROLL_LEFTS_KEY, JSON.stringify(ui.tableScrollLefts || {}));
    } catch {
        // Scroll memory is a convenience; private browsing/storage limits should not block the app.
    }
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
        const previousSignature = stateDataSignature(appState);
        const nextSignature = stateDataSignature(remoteState);
        appState = remoteState;
        setDataStatus("online", "Railway Postgres đang hoạt động");
        cacheState();
        if (!showNotice && previousSignature === nextSignature) return;
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
            accountDirectory = [];
            ui.aiChatOpen = false;
            ui.aiChatDraft = "";
            ui.groupChatOpen = false;
            ui.groupChatDraft = "";
            ui.workView = "all";
            resetAiChatState();
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

function navigateToRoute(path, options = {}) {
    const route = getRouteForPath(path);
    ui.activeRoute = route.path;
    ui.activeView = route.view;
    ui.activeTab = route.activeTab;
    ui.activeCategoryId = route.categoryId;
    ui.t01Tab = route.t01Tab;
    ui.query = "";
    ui.openColumnFilter = null;
    ui.sidebarMobileOpen = false;
    syncSidebarAccordionForRoute(route);
    if (route.view === "work-group" && route.categoryId === "pilot-t01" && !options.preserveT01MetricView) {
        ui.t01MetricView = "all";
    }
    if (route.view === "task-master" || route.view === "work-dashboard") {
        ui.filters["workItems:categoryId"] = options.preserveWorkCategoryId || "";
    } else if (route.view === "work-group" && route.categoryId !== "pilot-t01") {
        ui.filters["workItems:categoryId"] = route.categoryId;
    }
    const hash = `#${route.path}`;
    if (options.push) history.pushState(null, "", hash);
    else history.replaceState(null, "", hash);
    requestActiveTabScroll();
    render();
}

function getRouteForPath(path) {
    return getInitialRoute(path);
}

function render() {
    const pageScroll = lastRenderedTab === ui.activeRoute ? capturePageScroll() : null;
    const previousTabbarScrollLeft = document.querySelector(".tabbar")?.scrollLeft || 0;
    const previousSidebar = document.querySelector(".sidebar-menu");
    const previousSidebarScrollTop = previousSidebar ? previousSidebar.scrollTop : null;
    if (authState.status === "checking") {
        lastRenderedTab = null;
        document.getElementById("app").innerHTML = `
            ${renderAuthLoading()}
            <div class="toast ${ui.toast ? "show" : ""}">${e(ui.toast || "")}</div>
        `;
        return;
    }

    if (authState.status !== "authenticated") {
        lastRenderedTab = null;
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
            ${ui.sidebarMobileOpen ? `<button class="sidebar-scrim" data-action="toggle-sidebar" aria-label="Đóng điều hướng"></button>` : ""}
            <main class="main">
                ${renderTopbar()}
                <section class="workspace">
                    ${renderCommandBand()}
                    ${renderActiveView()}
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
    lastRenderedTab = ui.activeRoute;
    restoreTabbarScrollLeft(previousTabbarScrollLeft);
    restoreSidebarScrollTop(previousSidebarScrollTop);

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
    restorePageScroll(pageScroll);
    const tabScrollBehavior = pendingActiveTabScroll || "auto";
    pendingActiveTabScroll = null;
    syncActiveTabScroll(tabScrollBehavior);
    requestAnimationFrame(() => syncActiveTabScroll("auto"));
}

function restoreSidebarScrollTop(scrollTop) {
    const restore = () => {
        const sidebar = document.querySelector(".sidebar-menu");
        if (!sidebar) return;
        if (typeof scrollTop === "number") {
            const maxScrollTop = Math.max(0, sidebar.scrollHeight - sidebar.clientHeight);
            sidebar.scrollTop = Math.min(Math.max(0, scrollTop), maxScrollTop);
            return;
        }
        sidebar.querySelector(".tree-link.active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    requestAnimationFrame(() => {
        restore();
        requestAnimationFrame(restore);
    });
}

function restoreTabbarScrollLeft(scrollLeft) {
    const tabbar = document.querySelector(".tabbar");
    if (!tabbar) return;
    const maxScrollLeft = Math.max(0, tabbar.scrollWidth - tabbar.clientWidth);
    tabbar.scrollLeft = Math.min(Math.max(0, scrollLeft), maxScrollLeft);
}

function requestActiveTabScroll(behavior = "auto") {
    pendingActiveTabScroll = behavior;
}

function syncActiveTabScroll(behavior = "auto") {
    const tabbar = document.querySelector(".tabbar");
    const activeTab = tabbar?.querySelector(".tab-btn.active");
    if (!tabbar || !activeTab) return;

    const maxScrollLeft = Math.max(0, tabbar.scrollWidth - tabbar.clientWidth);
    if (!maxScrollLeft) return;

    const tabbarRect = tabbar.getBoundingClientRect();
    const activeRect = activeTab.getBoundingClientRect();
    const edgePadding = 12;
    const isVisible = activeRect.left >= tabbarRect.left + edgePadding && activeRect.right <= tabbarRect.right - edgePadding;
    if (isVisible) return;

    let nextLeft = tabbar.scrollLeft;
    if (activeRect.left < tabbarRect.left + edgePadding) {
        nextLeft -= (tabbarRect.left + edgePadding) - activeRect.left;
    } else if (activeRect.right > tabbarRect.right - edgePadding) {
        nextLeft += activeRect.right - (tabbarRect.right - edgePadding);
    }
    nextLeft = Math.min(Math.max(0, Math.round(nextLeft)), maxScrollLeft);
    if (Math.abs(tabbar.scrollLeft - nextLeft) < 1) return;

    tabbar.scrollTo({
        left: nextLeft,
        behavior: behavior === "smooth" ? "smooth" : "auto"
    });
}

function stateDataSignature(state) {
    try {
        return JSON.stringify(Object.fromEntries(
            Object.keys(modules).map((id) => {
                const collection = modules[id].collection;
                return [collection, Array.isArray(state?.[collection]) ? state[collection] : []];
            })
        ));
    } catch {
        return "";
    }
}

function capturePageScroll() {
    const workspace = document.querySelector(".workspace");
    return {
        route: ui.activeRoute,
        left: window.scrollX || document.documentElement.scrollLeft || 0,
        top: window.scrollY || document.documentElement.scrollTop || 0,
        workspaceLeft: workspace?.scrollLeft || 0,
        workspaceTop: workspace?.scrollTop || 0
    };
}

function restorePageScroll(snapshot) {
    if (!snapshot || snapshot.route !== ui.activeRoute) return;
    const restore = () => {
        const workspace = document.querySelector(".workspace");
        if (workspace) {
            const maxWorkspaceLeft = Math.max(0, workspace.scrollWidth - workspace.clientWidth);
            const maxWorkspaceTop = Math.max(0, workspace.scrollHeight - workspace.clientHeight);
            workspace.scrollTo(
                Math.min(snapshot.workspaceLeft || 0, maxWorkspaceLeft),
                Math.min(snapshot.workspaceTop || 0, maxWorkspaceTop)
            );
        }
        const maxLeft = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
        const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo(
            Math.min(snapshot.left, maxLeft),
            Math.min(snapshot.top, maxTop)
        );
    };
    requestAnimationFrame(() => {
        restore();
        requestAnimationFrame(restore);
        window.setTimeout(restore, 80);
    });
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
                            <div><strong>${e(getDataModuleCount())}</strong><span>Phân hệ dữ liệu</span></div>
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
                                <label for="loginIdentifier">Email / mã BIDV</label>
                                <div class="login-input-wrap">
                                    <i class="fa-regular fa-user"></i>
                                    <input id="loginIdentifier" name="identifier" type="text" autocomplete="username" placeholder="Ví dụ: huyng hoặc huyng@bidv.com.vn" required>
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
    const categories = getWorkCategories();
    const uatCategories = categories.filter((category) => getSidebarWorkStage(category.id) === "uat");
    const prePilotCategories = categories.filter((category) => getSidebarWorkStage(category.id) === "prePilot");
    const standaloneCategories = categories.filter((category) => !getSidebarWorkStage(category.id));
    const sidebarToggleLabel = ui.sidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên";
    const railMode = ui.sidebarCollapsed && window.innerWidth > 820;
    const commonActive = ui.activeRoute.startsWith("common/");
    const workActive = !commonActive;
    const personnelActive = ["personnel-list", "personnel-map", "personnel-kpi"].includes(ui.activeView);
    const workGroupsActive = ui.activeView === "work-group";
    const activeWorkStage = workGroupsActive ? getSidebarWorkStage(ui.activeCategoryId) : null;
    const commonExpanded = railMode || ui.sidebarOpenSection === "common";
    const workExpanded = railMode || ui.sidebarOpenSection === "work";
    const personnelExpanded = railMode || ui.sidebarOpenGroups.personnel;
    const workGroupsExpanded = railMode || ui.sidebarOpenGroups.workGroups;
    const uatExpanded = railMode || ui.sidebarOpenGroups.uat;
    const prePilotExpanded = railMode || ui.sidebarOpenGroups.prePilot;
    const renderWorkCategoryLink = (category, label, level = 3) => renderSidebarRouteButton(
        `work/group/${category.id}${category.id === "pilot-t01" ? `/${ui.t01Tab || "dashboard"}` : ""}`,
        "fa-circle",
        label,
        level,
        workGroupsActive && ui.activeCategoryId === category.id
    );
    return `
        <aside class="sidebar navigation-tree ${ui.sidebarCollapsed ? "collapsed" : ""} ${ui.sidebarMobileOpen ? "mobile-open" : ""}" aria-label="Điều hướng chính" data-sidebar-state="${ui.sidebarCollapsed ? "collapsed" : "expanded"}">
            <div class="sidebar-logo">
                <div class="sidebar-brand"><strong>Squad 2 UAT</strong></div>
                <button class="sidebar-collapse-toggle" type="button" data-action="toggle-sidebar-collapse" title="${sidebarToggleLabel}" aria-label="${sidebarToggleLabel}" aria-expanded="${ui.sidebarCollapsed ? "false" : "true"}" aria-controls="sidebarMenu" data-tooltip="${sidebarToggleLabel}">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <rect x="3.5" y="4" width="17" height="16" rx="3"></rect>
                        <path d="M9 4v16"></path>
                    </svg>
                </button>
                <button class="sidebar-mobile-close" type="button" data-action="toggle-sidebar" title="Đóng thanh điều hướng" aria-label="Đóng thanh điều hướng" aria-controls="sidebarMenu">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <nav class="sidebar-menu tree-menu" id="sidebarMenu">
                <div class="tree-section ${commonActive ? "contains-active" : ""}">
                    <button id="sidebar-section-common-toggle" class="tree-section-title tree-section-toggle ${commonActive ? "branch-active" : ""} ${commonExpanded ? "is-expanded" : ""}" type="button" data-action="toggle-sidebar-section" data-sidebar-section="common" aria-expanded="${commonExpanded}" aria-controls="sidebar-section-common" title="Thông tin chung">
                        <i class="fa-solid fa-users-viewfinder"></i><b>THÔNG TIN CHUNG</b><i class="fa-solid fa-chevron-right tree-toggle-chevron" aria-hidden="true"></i>
                    </button>
                    <div id="sidebar-section-common" class="tree-accordion-panel tree-section-content ${commonExpanded ? "is-expanded" : ""}" aria-hidden="${!commonExpanded}" ${commonExpanded ? "" : "inert"}>
                        <div class="tree-accordion-inner">
                            <button id="sidebar-group-personnel-toggle" class="tree-parent tree-group-toggle ${personnelActive ? "branch-active" : ""} ${personnelExpanded ? "is-expanded" : ""}" type="button" data-action="toggle-sidebar-group" data-sidebar-group="personnel" aria-expanded="${personnelExpanded}" aria-controls="sidebar-group-personnel" title="Nhân sự">
                                <i class="fa-regular fa-user"></i><b>Nhân sự</b><i class="fa-solid fa-chevron-right tree-toggle-chevron" aria-hidden="true"></i>
                            </button>
                            <div id="sidebar-group-personnel" class="tree-accordion-panel tree-group-content ${personnelExpanded ? "is-expanded" : ""}" aria-hidden="${!personnelExpanded}" ${personnelExpanded ? "" : "inert"}>
                                <div class="tree-accordion-inner">
                                    ${renderSidebarRouteButton("common/personnel/list", "fa-address-book", "Danh sách thành viên", 2)}
                                    ${renderSidebarRouteButton("common/personnel/map", "fa-sitemap", "Sơ đồ hoạt động", 2)}
                                    ${renderSidebarRouteButton("common/personnel/kpi", "fa-chart-column", "KPI", 2)}
                                </div>
                            </div>
                            ${renderSidebarRouteButton("common/guide", "fa-book-open", "Hướng dẫn UAT", 1)}
                        </div>
                    </div>
                </div>
                <div class="tree-section ${workActive ? "contains-active" : ""}">
                    <button id="sidebar-section-work-toggle" class="tree-section-title tree-section-toggle ${workActive ? "branch-active" : ""} ${workExpanded ? "is-expanded" : ""}" type="button" data-action="toggle-sidebar-section" data-sidebar-section="work" aria-expanded="${workExpanded}" aria-controls="sidebar-section-work" title="Công việc">
                        <i class="fa-solid fa-clipboard-list"></i><b>CÔNG VIỆC</b><i class="fa-solid fa-chevron-right tree-toggle-chevron" aria-hidden="true"></i>
                    </button>
                    <div id="sidebar-section-work" class="tree-accordion-panel tree-section-content ${workExpanded ? "is-expanded" : ""}" aria-hidden="${!workExpanded}" ${workExpanded ? "" : "inert"}>
                        <div class="tree-accordion-inner">
                            ${renderSidebarRouteButton("work/task-master", "fa-table-list", "Task_Master", 1)}
                            ${renderSidebarRouteButton("work/dashboard", "fa-chart-pie", "Dashboard", 1)}
                            ${renderSidebarRouteButton("work/inputs", "fa-file-circle-plus", "Thông tin đầu vào", 1)}
                            ${renderSidebarRouteButton("work/member-kpi", "fa-chart-line", "KPI_Thành viên", 1)}
                            <button id="sidebar-group-workGroups-toggle" class="tree-parent tree-group-toggle ${workGroupsActive ? "branch-active" : ""} ${workGroupsExpanded ? "is-expanded" : ""}" type="button" data-action="toggle-sidebar-group" data-sidebar-group="workGroups" aria-expanded="${workGroupsExpanded}" aria-controls="sidebar-group-workGroups" title="Nhóm công việc">
                                <i class="fa-regular fa-folder-open"></i><b>Nhóm công việc</b><i class="fa-solid fa-chevron-right tree-toggle-chevron" aria-hidden="true"></i>
                            </button>
                            <div id="sidebar-group-workGroups" class="tree-accordion-panel tree-group-content ${workGroupsExpanded ? "is-expanded" : ""}" aria-hidden="${!workGroupsExpanded}" ${workGroupsExpanded ? "" : "inert"}>
                                <div class="tree-accordion-inner tree-category-list">
                                    <div class="tree-work-stage tree-stage-placeholder" title="URD — chưa cấu hình nhóm công việc" aria-disabled="true">
                                        <i class="fa-solid fa-angles-right" aria-hidden="true"></i><b>URD</b>
                                    </div>
                                    <div class="tree-work-stage tree-stage-placeholder" title="RSD — chưa cấu hình nhóm công việc" aria-disabled="true">
                                        <i class="fa-solid fa-angles-right" aria-hidden="true"></i><b>RSD</b>
                                    </div>
                                    <button id="sidebar-group-uat-toggle" class="tree-parent tree-group-toggle tree-work-stage ${activeWorkStage === "uat" ? "branch-active" : ""} ${uatExpanded ? "is-expanded" : ""}" type="button" data-action="toggle-sidebar-group" data-sidebar-group="uat" aria-expanded="${uatExpanded}" aria-controls="sidebar-group-uat" title="UAT">
                                        <i class="fa-regular fa-folder" aria-hidden="true"></i><b>UAT</b><i class="fa-solid fa-chevron-right tree-toggle-chevron" aria-hidden="true"></i>
                                    </button>
                                    <div id="sidebar-group-uat" class="tree-accordion-panel tree-work-stage-content ${uatExpanded ? "is-expanded" : ""}" aria-hidden="${!uatExpanded}" ${uatExpanded ? "" : "inert"}>
                                        <div class="tree-accordion-inner">
                                            ${uatCategories.map((category, index) => renderWorkCategoryLink(category, `${index + 1}. ${getWorkCategoryShortName(category)}`)).join("")}
                                        </div>
                                    </div>
                                    <button id="sidebar-group-prePilot-toggle" class="tree-parent tree-group-toggle tree-work-stage ${activeWorkStage === "prePilot" ? "branch-active" : ""} ${prePilotExpanded ? "is-expanded" : ""}" type="button" data-action="toggle-sidebar-group" data-sidebar-group="prePilot" aria-expanded="${prePilotExpanded}" aria-controls="sidebar-group-prePilot" title="Pre-Pilot">
                                        <i class="fa-regular fa-folder" aria-hidden="true"></i><b>Pre-Pilot</b><i class="fa-solid fa-chevron-right tree-toggle-chevron" aria-hidden="true"></i>
                                    </button>
                                    <div id="sidebar-group-prePilot" class="tree-accordion-panel tree-work-stage-content ${prePilotExpanded ? "is-expanded" : ""}" aria-hidden="${!prePilotExpanded}" ${prePilotExpanded ? "" : "inert"}>
                                        <div class="tree-accordion-inner">
                                            ${prePilotCategories.map((category, index) => renderWorkCategoryLink(category, `${index + 1}. ${getWorkCategoryShortName(category)}`)).join("")}
                                        </div>
                                    </div>
                                    ${standaloneCategories.map((category) => renderWorkCategoryLink(category, getWorkCategoryShortName(category), 2)).join("")}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        </aside>
    `;
}

function renderSidebarRouteButton(route, icon, label, level = 1, forceActive = false) {
    const active = forceActive || ui.activeRoute === route;
    return `
        <button class="tree-link level-${e(level)} ${active ? "active" : ""}" type="button" data-route="${e(route)}" title="${e(label)}" ${active ? `aria-current="page"` : ""}>
            <i class="fa-solid ${e(icon)}"></i><span>${e(label)}</span>
        </button>
    `;
}

function renderTopbar() {
    const mobileSidebarLabel = ui.sidebarMobileOpen ? "Đóng thanh điều hướng" : "Mở thanh điều hướng";
    return `
        <header class="topbar">
            <div class="brand-lockup">
                <button class="mobile-menu-btn" type="button" data-action="toggle-sidebar" title="${mobileSidebarLabel}" aria-label="${mobileSidebarLabel}" aria-expanded="${ui.sidebarMobileOpen ? "true" : "false"}" aria-controls="sidebarMenu">
                    <i class="fa-solid fa-bars"></i>
                </button>
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
    const meta = getActiveViewMeta();
    const healthCollections = [...new Set([
        ...tabs.map((tab) => modules[tab.id]?.collection).filter(Boolean),
        "schedule",
        "workCategories",
        "workItems"
    ])];
    const totalRecords = healthCollections.reduce((sum, collection) => sum + (appState[collection]?.length || 0), 0);
    return `
        <div class="command-band">
            <div>
                <div class="screen-kicker">BIDV · Squad 2 · UAT</div>
                <h1 class="screen-title">${e(meta.title)}</h1>
                <p class="screen-subtitle">${e(meta.subtitle)}</p>
            </div>
            <div class="command-meta">
                ${renderDbStatusPill()}
                ${renderDataHealthPill(totalRecords)}
                ${renderDbSyncPill()}
            </div>
        </div>
    `;
}

function getActiveViewMeta() {
    const category = getWorkCategories().find((row) => row.id === ui.activeCategoryId);
    if (ui.activeView === "personnel-list") return { title: "Danh sách thành viên", subtitle: modules.personnel.description };
    if (ui.activeView === "personnel-map") return { title: "Sơ đồ hoạt động", subtitle: "Tổng quan vai trò, đơn vị và phạm vi phụ trách của thành viên Squad 2." };
    if (ui.activeView === "personnel-kpi") return { title: "Cấu hình KPI", subtitle: "Thiết lập trọng số, mục tiêu và dữ liệu đánh giá thủ công cho thành viên." };
    if (ui.activeView === "guide") return { title: "Hướng dẫn UAT", subtitle: modules.guide.description };
    if (ui.activeView === "task-master") return { title: "Task_Master", subtitle: "Danh sách nguồn duy nhất để tạo, giao và cập nhật toàn bộ công việc." };
    if (ui.activeView === "work-dashboard") return { title: "Dashboard công việc", subtitle: "Tổng hợp tiến độ trực tiếp từ Task_Master, không nhập số liệu riêng." };
    if (ui.activeView === "work-inputs") return { title: "Thông tin đầu vào", subtitle: "Quản lý nhóm công việc và tra cứu các danh mục dùng chung." };
    if (ui.activeView === "member-kpi") return { title: "KPI thành viên", subtitle: "Kết quả được tính từ công việc thực tế và dữ liệu đánh giá đã cấu hình." };
    if (ui.activeView === "work-group") return {
        title: category ? `${category.taskPrefix || ""} · ${getWorkCategoryShortName(category)}` : "Nhóm công việc",
        subtitle: category?.description || "Theo dõi tiến độ và danh sách đầu việc của nhóm."
    };
    return { title: "Dashboard công việc", subtitle: "Tổng hợp tiến độ công việc Squad 2." };
}

function renderKpis() {
    return "";
}

function renderTabs() {
    return `
        <nav class="tabbar" aria-label="Module">
            ${visibleTabs().map((tab) => `
                <button class="${tabButtonClass(tab, "tab-btn")}" data-tab="${tab.id}">
                    <i class="fa-solid ${tab.icon}"></i>${e(tab.label)}
                </button>
            `).join("")}
        </nav>
    `;
}

function renderActiveView() {
    if (ui.activeView === "personnel-list") return renderModule(modules.personnel);
    if (ui.activeView === "personnel-map") return renderPersonnelMapPage();
    if (ui.activeView === "personnel-kpi") return renderPersonnelKpiPage();
    if (ui.activeView === "guide") return renderModule(modules.guide);
    if (ui.activeView === "task-master") return renderTaskMasterPage();
    if (ui.activeView === "work-dashboard") return renderWorkDashboardPage();
    if (ui.activeView === "work-inputs") return renderWorkInputsPage();
    if (ui.activeView === "member-kpi") return renderMemberKpiPage();
    if (ui.activeView === "work-group") return renderWorkGroupPage();
    return renderWorkDashboardPage();
}

function renderTaskMasterPage() {
    const stats = getWorkPlanStats();
    return `
        <div class="work-plan-page">
            ${renderWorkSummaryStrip(stats, true)}
            ${renderWorkItemsPanel({ title: "Task_Master", subtitle: "Toàn bộ đầu việc · cập nhật tại đây để đồng bộ Dashboard/KPI", showViews: true, showGroupFilter: true })}
        </div>
    `;
}

function renderWorkDashboardPage() {
    const stats = getWorkPlanStats();
    const categories = getWorkCategories();
    const workRows = getWorkRowsForDisplay();
    return `
        <div class="work-plan-page">
            ${renderWorkSummaryStrip(stats, true)}
            <div class="work-dashboard-grid">
                <section class="panel">
                    <div class="panel-head">
                        <div class="panel-title"><i class="fa-solid fa-layer-group"></i><div><h2>Tiến độ theo nhóm</h2><span>Tính trực tiếp từ Task_Master</span></div></div>
                    </div>
                    <div class="panel-body flush-mobile">
                        <div class="work-dashboard-list">
                            ${categories.map((category) => {
                                const groupStats = getWorkGroupStats(category.id);
                                const progress = groupStats.total ? Math.round(groupStats.progress) : 0;
                                return `
                                    <button class="work-dashboard-row" type="button" data-route="work/group/${e(category.id)}${category.id === "pilot-t01" ? "/dashboard" : ""}">
                                        <span class="work-dashboard-code">${e(category.taskPrefix || "-")}</span>
                                        <span class="work-dashboard-name"><strong>${e(getWorkCategoryShortName(category))}</strong><small>${e(groupStats.total)} việc · ${e(groupStats.done)} hoàn thành</small></span>
                                        <span class="work-dashboard-progress"><span><i style="width:${e(clamp(progress))}%"></i></span><b>${e(progress)}%</b></span>
                                        <i class="fa-solid fa-chevron-right"></i>
                                    </button>
                                `;
                            }).join("") || `<div class="work-task-empty"><i class="fa-solid fa-folder-open"></i><strong>Chưa có nhóm công việc</strong></div>`}
                        </div>
                    </div>
                </section>
                <section class="panel work-status-panel">
                    <div class="panel-head">
                        <div class="panel-title"><i class="fa-solid fa-chart-simple"></i><div><h2>Trạng thái công việc</h2><span>${e(stats.total)} đầu việc · quá hạn là cảnh báo giao cắt</span></div></div>
                    </div>
                    <div class="panel-body">
                        ${workStatusSummaryOptions.map((status) => {
                            const count = workRows.filter((row) => status === "Quá hạn" ? row.warning === "Quá hạn" : row.status === status).length;
                            const percent = stats.total ? Math.round((count / stats.total) * 100) : 0;
                            return `<div class="status-breakdown-row"><span>${renderWorkStatus(status)}</span><div><i style="width:${e(percent)}%"></i></div><strong>${e(count)}</strong></div>`;
                        }).join("")}
                    </div>
                </section>
            </div>
        </div>
    `;
}

function renderWorkSummaryStrip(stats, includeCategories = false) {
    return `
        <section class="work-plan-summary ${includeCategories ? "with-categories" : ""}">
            ${includeCategories ? renderWorkMetric("Nhóm", stats.categories ?? 0, "fa-folder-tree", "teal") : ""}
            ${renderWorkMetric("Tổng công việc", stats.total, "fa-list-check", "blue", "all")}
            ${renderWorkMetric("Chưa bắt đầu", stats.notStarted, "fa-circle-pause", "gray", "notStarted")}
            ${renderWorkMetric("Đang thực hiện", stats.inProgress, "fa-person-running", "blue", "inProgress")}
            ${renderWorkMetric("Quá hạn", stats.overdue, "fa-triangle-exclamation", "red", "overdue", "Cảnh báo giao cắt: các việc chưa hoàn thành đã quá deadline")}
            ${renderWorkMetric("Hoàn thành", stats.done, "fa-circle-check", "green", "done")}
        </section>
    `;
}

function renderWorkItemsPanel({ title, subtitle, categoryId = "", showViews = true, showGroupFilter = true }) {
    const mod = modules.workItems;
    const filteredRows = getFilteredWorkRows(categoryId);
    const pageState = getPaginationState(mod.collection, filteredRows);
    const rows = pageState.rows;
    const canCreate = canCreateWorkItems();
    const categories = getWorkCategories();
    return `
        <section class="panel work-items-panel standalone-work-items">
            <div class="panel-head">
                <div class="panel-title"><i class="fa-solid ${mod.icon}"></i><div><h2>${e(title)}</h2><span>${e(subtitle)} · ${renderPaginationSummary(pageState)}</span></div></div>
                <div class="panel-actions">
                    ${canCreate && categories.length ? `<button class="primary-btn" data-action="open-create"><i class="fa-solid fa-plus"></i><span>Thêm công việc</span></button>` : ""}
                </div>
            </div>
            <div class="panel-body">
                <div class="work-task-tools">
                    <label class="work-task-search"><i class="fa-solid fa-magnifying-glass"></i><input id="searchInput" value="${e(ui.query)}" placeholder="Tìm Task ID, tên công việc, người thực hiện..."></label>
                    ${showViews ? renderWorkViewTabs(getWorkPlanStats()) : ""}
                </div>
                ${renderWorkPlanFilterBar(showGroupFilter)}
                ${renderPaginationControls(mod.collection, pageState)}
                ${rows.length ? renderTable(mod, rows) : renderEmpty(mod.emptyIcon, categoryId ? "Nhóm chưa có công việc" : mod.emptyTitle, categoryId ? "Thêm công việc đầu tiên hoặc thay đổi bộ lọc." : mod.emptyText, true, canCreate ? mod : null)}
            </div>
        </section>
    `;
}

function renderWorkGroupPage() {
    const category = getWorkCategories().find((row) => row.id === ui.activeCategoryId);
    if (!category) return `<div class="work-plan-page">${renderEmpty("fa-folder-open", "Không tìm thấy nhóm", "Nhóm công việc có thể đã được đổi hoặc xóa.", false)}</div>`;
    if (category.id === "pilot-t01") return renderT01WorkGroup(category);
    const stats = getWorkGroupStats(category.id);
    return `
        <div class="work-plan-page">
            ${renderWorkSummaryStrip(stats)}
            ${renderWorkItemsPanel({
                title: getWorkCategoryShortName(category),
                subtitle: `${category.taskPrefix || ""} · ${stats.total} đầu việc`,
                categoryId: category.id,
                showViews: false,
                showGroupFilter: false
            })}
        </div>
    `;
}

function renderT01WorkGroup(category) {
    const activeTab = ui.t01Tab || "dashboard";
    const effectiveParent = activeTab === "defectSummary" ? "defects" : activeTab;
    return `
        <div class="work-plan-page t01-workspace">
            ${renderT01SheetSummary(activeTab)}
            <nav class="t01-module-tabs" aria-label="Phân hệ kiểm thử chức năng">
                ${t01ModuleTabs.map((tab) => `
                    <button class="${effectiveParent === tab.id ? "active" : ""}" type="button" data-route="work/group/${e(category.id)}/${e(tab.id)}">
                        <i class="fa-solid ${e(tab.icon)}"></i><span>${e(tab.label)}</span>
                    </button>
                `).join("")}
            </nav>
            ${effectiveParent === "defects" ? `
                <div class="secondary-tabs">
                    <button class="${activeTab === "defects" ? "active" : ""}" data-route="work/group/${e(category.id)}/defects">DEFECT_LOG</button>
                    <button class="${activeTab === "defectSummary" ? "active" : ""}" data-route="work/group/${e(category.id)}/defectSummary">Tổng hợp lỗi</button>
                </div>
            ` : ""}
            ${renderLegacyT01Content(activeTab)}
        </div>
    `;
}

function renderLegacyT01Content(tabId) {
    if (tabId === "dashboard") return renderDashboard();
    if (tabId === "defectDashboard") return renderDefectDashboardPage();
    return renderModule(modules[tabId] || modules.features);
}

function getWorkGroupStats(categoryId) {
    const rows = getWorkRowsForDisplay().filter((row) => String(row.categoryId || "") === String(categoryId || ""));
    const done = rows.filter((row) => row.status === "Hoàn thành").length;
    const notStarted = rows.filter((row) => row.status === "Chưa bắt đầu").length;
    const inProgress = rows.filter((row) => row.status === "Đang thực hiện").length;
    const overdue = rows.filter((row) => getWorkItemWarning(row) === "Quá hạn").length;
    const progress = rows.length ? rows.reduce((sum, row) => sum + Number(row.progress || 0), 0) / rows.length : 0;
    return { total: rows.length, done, notStarted, inProgress, overdue, progress };
}

function renderT01SheetSummary(tabId) {
    const dashboard = getT01SheetDashboard(tabId);
    return `
        <section class="work-plan-summary t01-context-summary" aria-label="Tổng quan ${e(dashboard.label)}">
            ${dashboard.metrics.map((metric) => renderT01SheetMetric(tabId, metric)).join("")}
        </section>
    `;
}

function renderT01SheetMetric(tabId, metric) {
    const clickable = typeof metric.predicate === "function";
    const active = clickable && (ui.t01MetricView || "all") === metric.view;
    if (!clickable) {
        return renderWorkMetric(metric.label, metric.value, metric.icon, metric.tone);
    }
    return `
        <button class="work-metric is-clickable ${e(metric.tone)} ${active ? "active" : ""}" type="button" data-action="set-t01-metric" data-t01-tab="${e(tabId)}" data-t01-view="${e(metric.view)}" aria-pressed="${active ? "true" : "false"}" ${metric.title ? `title="${e(metric.title)}"` : ""}>
            <i class="fa-solid ${e(metric.icon)}"></i>
            <div>
                <span>${e(metric.label)}</span>
                <strong>${e(metric.value)}</strong>
            </div>
        </button>
    `;
}

function getT01SheetDashboard(tabId) {
    const normalizedTab = tabId === "defectSummary" ? "defectSummary" : (tabId || "dashboard");
    const metric = (view, label, value, icon, tone, predicate = null, title = "") => ({
        view,
        label,
        value,
        icon,
        tone,
        predicate,
        title
    });
    const statusIs = (value, target) => normalizeWorkbookFormulaText(value) === normalizeWorkbookFormulaText(target);
    const statusIn = (value, targets) => targets.some((target) => statusIs(value, target));
    const hasText = (value, target) => normalizeWorkbookFormulaText(value).includes(normalizeWorkbookFormulaText(target));

    if (normalizedTab === "dashboard") {
        const rows = getDisplayRows("features");
        return {
            label: "Dashboard UAT",
            collection: "features",
            metrics: [
                metric("all", "Tổng chức năng", rows.length, "fa-layer-group", "teal"),
                metric("hasCases", "Tổng testcase", sum(rows, "totalCases"), "fa-list-check", "blue"),
                metric("hasPassed", "TC Passed", sum(rows, "passedCases"), "fa-circle-check", "green"),
                metric("hasFailed", "TC Failed", sum(rows, "failedCases"), "fa-circle-xmark", "red"),
                metric("inProgress", "Đang xử lý", rows.filter((row) => getT01FeatureState(row) === "inProgress").length, "fa-person-running", "blue"),
                metric("done", "Hoàn thành UAT", rows.filter((row) => getT01FeatureState(row) === "done").length, "fa-flag-checkered", "green")
            ]
        };
    }

    if (normalizedTab === "defectDashboard") {
        const rows = getDisplayRows("defects");
        const active = rows.filter(isT01ActiveDefect);
        const handled = rows.filter(isT01HandledDefect);
        const severe = rows.filter((row) => statusIn(row.severity, ["Blocker", "Critical"]));
        const reopened = rows.filter((row) => statusIn(row.status, ["Reopen", "Reopened"]));
        return {
            label: "Dashboard Defect",
            collection: "defects",
            metrics: [
                metric("all", "Tổng defect", rows.length, "fa-bugs", "blue"),
                metric("active", "Đang mở", active.length, "fa-bug", "red"),
                metric("handled", "Đã xử lý", handled.length, "fa-screwdriver-wrench", "green"),
                metric("handledRate", "Tỷ lệ xử lý", `${percent(handled.length, rows.length)}%`, "fa-chart-pie", "teal"),
                metric("severe", "Blocker/Critical", severe.length, "fa-triangle-exclamation", "red"),
                metric("reopen", "Reopen", reopened.length, "fa-rotate-left", "yellow")
            ]
        };
    }

    if (normalizedTab === "features") {
        const rows = getDisplayRows("features");
        const predicates = {
            all: () => true,
            notStarted: (row) => getT01FeatureState(row) === "notStarted",
            inProgress: (row) => getT01FeatureState(row) === "inProgress",
            notHandedOff: (row) => hasText(row.handoffStatus, "chưa bàn giao") || !isFilled(row.handoffStatus),
            overdue: isT01FeatureOverdue,
            done: (row) => getT01FeatureState(row) === "done"
        };
        return {
            label: "Danh mục chức năng",
            collection: "features",
            metrics: [
                metric("all", "Tổng chức năng", rows.length, "fa-layer-group", "teal", predicates.all),
                metric("notStarted", "Chưa bắt đầu", rows.filter(predicates.notStarted).length, "fa-circle-pause", "gray", predicates.notStarted),
                metric("inProgress", "Đang thực hiện", rows.filter(predicates.inProgress).length, "fa-person-running", "blue", predicates.inProgress),
                metric("notHandedOff", "Chưa bàn giao", rows.filter(predicates.notHandedOff).length, "fa-truck-ramp-box", "yellow", predicates.notHandedOff),
                metric("overdue", "Quá hạn", rows.filter(predicates.overdue).length, "fa-triangle-exclamation", "red", predicates.overdue),
                metric("done", "Hoàn thành", rows.filter(predicates.done).length, "fa-circle-check", "green", predicates.done)
            ]
        };
    }

    if (normalizedTab === "handoffs") {
        const rows = getDisplayRows("handoffs");
        const predicates = {
            all: () => true,
            handedOff: (row) => hasText(row.handoffStatus, "đã bàn giao") && !hasText(row.handoffStatus, "chưa bàn giao"),
            notHandedOff: (row) => hasText(row.handoffStatus, "chưa bàn giao") || !isFilled(row.handoffStatus),
            notStarted: (row) => !isFilled(row.uatStatus) || statusIs(row.uatStatus, "Done RSD") || statusIs(row.uatStatus, "Chưa bắt đầu"),
            inProgress: (row) => statusIn(row.uatStatus, ["Done DEV", "Done SIT", "Đang kiểm thử", "Đang thực hiện"]),
            done: (row) => statusIn(row.uatStatus, ["Done UAT", "Hoàn thành"])
        };
        return {
            label: "Lịch bàn giao US",
            collection: "handoffs",
            metrics: [
                metric("all", "Tổng User Story", rows.length, "fa-list-check", "blue", predicates.all),
                metric("handedOff", "Đã bàn giao", rows.filter(predicates.handedOff).length, "fa-truck-fast", "green", predicates.handedOff),
                metric("notHandedOff", "Chưa bàn giao", rows.filter(predicates.notHandedOff).length, "fa-clock", "yellow", predicates.notHandedOff),
                metric("notStarted", "Chưa bắt đầu UAT", rows.filter(predicates.notStarted).length, "fa-circle-pause", "gray", predicates.notStarted),
                metric("inProgress", "Đang UAT", rows.filter(predicates.inProgress).length, "fa-person-running", "blue", predicates.inProgress),
                metric("done", "Hoàn thành UAT", rows.filter(predicates.done).length, "fa-circle-check", "green", predicates.done)
            ]
        };
    }

    if (normalizedTab === "plans") {
        const rows = getDisplayRows("plans");
        const hasAssignment = (row) => ["nv", "t1", "t2", "t3", "t4", "t5", "t6"].some((key) => Number(row[key] || 0) > 0);
        const predicates = {
            all: () => true,
            hasCases: (row) => Number(row.totalCases || 0) > 0,
            assigned: hasAssignment,
            unassigned: (row) => !hasAssignment(row),
            inProgress: (row) => statusIn(row.uatStatus, ["Đang kiểm thử", "Đang thực hiện"]) || (Number(row.progress || 0) > 0 && Number(row.progress || 0) < 100),
            done: (row) => statusIn(row.uatStatus, ["Hoàn thành", "Done UAT"]) || Number(row.progress || 0) >= 100
        };
        return {
            label: "Phân công UAT",
            collection: "plans",
            metrics: [
                metric("all", "Tổng chức năng", rows.length, "fa-layer-group", "teal", predicates.all),
                metric("hasCases", "Tổng testcase", sum(rows, "totalCases"), "fa-list-check", "blue", predicates.hasCases, "Hiển thị các chức năng đã có testcase"),
                metric("assigned", "Đã phân công", rows.filter(predicates.assigned).length, "fa-user-check", "green", predicates.assigned),
                metric("unassigned", "Chưa phân công", rows.filter(predicates.unassigned).length, "fa-user-clock", "yellow", predicates.unassigned),
                metric("inProgress", "Đang kiểm thử", rows.filter(predicates.inProgress).length, "fa-vial-circle-check", "blue", predicates.inProgress),
                metric("done", "Hoàn thành", rows.filter(predicates.done).length, "fa-circle-check", "green", predicates.done)
            ]
        };
    }

    if (normalizedTab === "daily") {
        const rows = getDisplayRows("daily");
        const predicates = {
            all: () => true,
            hasCases: (row) => Number(row.totalCases || 0) > 0,
            passed: (row) => Number(row.passedCases || 0) > 0,
            failed: (row) => Number(row.failedCases || 0) > 0,
            openBug: (row) => isT01ActiveDefect({ status: row.bugStatus }),
            blocker: (row) => isFilled(row.blocker)
        };
        return {
            label: "Điều hành hằng ngày",
            collection: "daily",
            metrics: [
                metric("all", "Lượt cập nhật", rows.length, "fa-calendar-day", "teal", predicates.all),
                metric("hasCases", "Tổng testcase", sum(rows, "totalCases"), "fa-list-check", "blue", predicates.hasCases, "Hiển thị các dòng có testcase"),
                metric("passed", "TC Passed", sum(rows, "passedCases"), "fa-circle-check", "green", predicates.passed, "Hiển thị các dòng có testcase Passed"),
                metric("failed", "TC Failed", sum(rows, "failedCases"), "fa-circle-xmark", "red", predicates.failed, "Hiển thị các dòng có testcase Failed"),
                metric("openBug", "Dòng có lỗi mở", rows.filter(predicates.openBug).length, "fa-bug", "yellow", predicates.openBug),
                metric("blocker", "Có blocker", rows.filter(predicates.blocker).length, "fa-triangle-exclamation", "red", predicates.blocker)
            ]
        };
    }

    if (normalizedTab === "defects") {
        const rows = getDisplayRows("defects");
        const predicates = {
            all: () => true,
            open: (row) => statusIs(row.status, "Open"),
            inProgress: (row) => statusIs(row.status, "In Progress"),
            pendingOrReopen: (row) => statusIn(row.status, ["Pending", "Reopen", "Reopened"]),
            resolved: (row) => statusIn(row.status, ["Resolved", "SIT Pass"]),
            closed: (row) => statusIn(row.status, ["Closed", "Cancelled", "Canceled"])
        };
        return {
            label: "Danh sách defect",
            collection: "defects",
            metrics: [
                metric("all", "Tổng defect", rows.length, "fa-bugs", "blue", predicates.all),
                metric("open", "Open", rows.filter(predicates.open).length, "fa-circle-exclamation", "red", predicates.open),
                metric("inProgress", "In Progress", rows.filter(predicates.inProgress).length, "fa-person-digging", "blue", predicates.inProgress),
                metric("pendingOrReopen", "Pending/Reopen", rows.filter(predicates.pendingOrReopen).length, "fa-rotate-left", "yellow", predicates.pendingOrReopen),
                metric("resolved", "Resolved/SIT Pass", rows.filter(predicates.resolved).length, "fa-screwdriver-wrench", "teal", predicates.resolved),
                metric("closed", "Closed/Cancelled", rows.filter(predicates.closed).length, "fa-circle-check", "green", predicates.closed)
            ]
        };
    }

    if (normalizedTab === "defectSummary") {
        const rows = getDisplayRows("defectSummary");
        const predicates = {
            all: () => true,
            hasBugs: (row) => Number(row.totalBugs || 0) > 0,
            active: (row) => Number(row.activeBugs || 0) > 0,
            handled: (row) => Number(row.handledBugs || 0) > 0,
            severe: (row) => Number(row.severeBugs || 0) > 0
        };
        return {
            label: "Tổng hợp lỗi",
            collection: "defectSummary",
            metrics: [
                metric("all", "Tổng User Story", rows.length, "fa-list-check", "blue", predicates.all),
                metric("hasBugs", "US có lỗi", rows.filter(predicates.hasBugs).length, "fa-bug", "yellow", predicates.hasBugs),
                metric("totalBugs", "Tổng lỗi", sum(rows, "totalBugs"), "fa-bugs", "red", predicates.hasBugs),
                metric("active", "Lỗi đang mở", sum(rows, "activeBugs"), "fa-circle-exclamation", "red", predicates.active),
                metric("handled", "Lỗi đã xử lý", sum(rows, "handledBugs"), "fa-circle-check", "green", predicates.handled),
                metric("severe", "Lỗi nghiêm trọng", sum(rows, "severeBugs"), "fa-triangle-exclamation", "yellow", predicates.severe)
            ]
        };
    }

    if (normalizedTab === "weekly") {
        const rows = getDisplayRows("weekly");
        const notMet = (row) => hasText(row.assessment || row.gateResult, "chưa đạt");
        return {
            label: "Chất lượng tuần",
            collection: "weekly",
            metrics: [
                metric("all", "Số tuần", rows.length, "fa-calendar-week", "teal", () => true),
                metric("coverage", "Coverage TB", `${round(averageAll(rows.map((row) => row.coverageRate)))}%`, "fa-chart-area", "blue", (row) => Number(row.coverageRate || 0) > 0),
                metric("success", "Pass Rate TB", `${round(averageAll(rows.map((row) => row.successRate)))}%`, "fa-chart-line", "green", (row) => Number(row.successRate || 0) > 0),
                metric("blocker", "Blocker Open", sum(rows, "blockerBugs"), "fa-ban", "red", (row) => Number(row.blockerBugs || 0) > 0),
                metric("critical", "Critical Open", sum(rows, "criticalBugs"), "fa-triangle-exclamation", "yellow", (row) => Number(row.criticalBugs || 0) > 0),
                metric("notMet", "Tuần chưa đạt", rows.filter(notMet).length, "fa-circle-xmark", "red", notMet)
            ]
        };
    }

    if (normalizedTab === "readiness") {
        const rows = getDisplayRows("readiness");
        const noGo = (row) => hasText(row.decision, "no go");
        const canGo = (row) => isFilled(row.decision) && !noGo(row);
        const hasSevere = (row) => Number(row.openBlockerBugs || 0) + Number(row.openCriticalBugs || 0) + Number(row.openMajorBugs || 0) > 0;
        return {
            label: "Kết thúc Sprint",
            collection: "readiness",
            metrics: [
                metric("all", "Tổng Sprint", rows.length, "fa-flag-checkered", "teal", () => true),
                metric("coverage", "Coverage TB", `${round(averageAll(rows.map((row) => row.coverageRate)))}%`, "fa-chart-area", "blue", (row) => Number(row.coverageRate || 0) > 0),
                metric("success", "Pass Rate TB", `${round(averageAll(rows.map((row) => row.successRate)))}%`, "fa-chart-line", "green", (row) => Number(row.successRate || 0) > 0),
                metric("canGo", "Có thể GO", rows.filter(canGo).length, "fa-circle-check", "green", canGo),
                metric("noGo", "NO GO", rows.filter(noGo).length, "fa-circle-xmark", "red", noGo),
                metric("severe", "Sprint còn lỗi nặng", rows.filter(hasSevere).length, "fa-triangle-exclamation", "yellow", hasSevere)
            ]
        };
    }

    const rows = getDisplayRows("matrix");
    const reached = (row) => statusIs(row.warning, "Đạt") || (Number(row.target || 0) > 0 && Number(row.totalParticipation || 0) >= Number(row.target || 0));
    const insufficient = (row) => !reached(row);
    const activeTesterCount = ["t1", "t2", "t3", "t4", "t5", "t6"].filter((key) => rows.some((row) => Number(row[key] || 0) > 0)).length;
    return {
        label: "Năng suất Tester",
        collection: "matrix",
        metrics: [
            metric("all", "Nhóm chức năng", rows.length, "fa-layer-group", "teal", () => true),
            metric("participation", "Tổng lượt tham gia", sum(rows, "totalParticipation"), "fa-users", "blue", (row) => Number(row.totalParticipation || 0) > 0),
            metric("target", "Tổng mục tiêu", sum(rows, "target"), "fa-bullseye", "yellow", (row) => Number(row.target || 0) > 0),
            metric("testers", "Tester có tham gia", activeTesterCount, "fa-user-check", "blue", (row) => ["t1", "t2", "t3", "t4", "t5", "t6"].some((key) => Number(row[key] || 0) > 0)),
            metric("reached", "Nhóm đạt", rows.filter(reached).length, "fa-circle-check", "green", reached),
            metric("insufficient", "Thiếu luân chuyển", rows.filter(insufficient).length, "fa-triangle-exclamation", "red", insufficient)
        ]
    };
}

function isT01ActiveDefect(row) {
    return ["Open", "In Progress", "Pending", "Reopen", "Reopened"]
        .some((status) => isBugStatus(row?.status, status));
}

function isT01HandledDefect(row) {
    return ["Resolved", "SIT Pass", "Closed", "Cancelled", "Canceled"]
        .some((status) => isBugStatus(row?.status, status));
}

function getT01FeatureState(row) {
    const status = String(row?.status || "").trim().toLowerCase();
    if (!status || status === "chưa bắt đầu") return "notStarted";
    if (status === "done uat" || status === "hoàn thành") return "done";
    return "inProgress";
}

function isT01FeatureOverdue(row) {
    return String(row?.uatWarning || "").trim().toLowerCase().includes("quá hạn");
}

function renderWorkInputsPage() {
    const categories = getWorkCategories();
    return `
        <div class="work-plan-page input-catalog-grid">
            <section class="panel input-catalog-main">
                <div class="panel-head">
                    <div class="panel-title"><i class="fa-solid fa-folder-tree"></i><div><h2>Nhóm công việc</h2><span>${e(categories.length)} nhóm · dùng để sinh Task ID và tổng hợp Dashboard</span></div></div>
                    ${canManageWorkPlans() ? `<button class="primary-btn" data-action="open-category-create"><i class="fa-solid fa-plus"></i><span>Thêm nhóm</span></button>` : ""}
                </div>
                <div class="panel-body flush-mobile">
                    <div class="catalog-table">
                        <div class="catalog-row catalog-head"><span>Prefix</span><span>Tên nhóm</span><span>Mốc hoàn thành</span><span>Trạng thái</span><span>Thao tác</span></div>
                        ${categories.map((category) => `
                            <div class="catalog-row">
                                <span>${tag(category.taskPrefix || "-", "teal")}</span>
                                <span><strong>${e(category.name || "-")}</strong><small>${e(category.description || "")}</small></span>
                                <span>${category.targetDate ? e(formatPlainDate(category.targetDate)) : `<span class="muted-value">-</span>`}</span>
                                <span>${renderStatus(category.status)}</span>
                                <span class="row-actions">
                                    ${canManageWorkPlans() ? `<button class="icon-btn" data-action="open-category-edit" data-id="${e(category.id)}" title="Sửa nhóm"><i class="fa-solid fa-pen"></i></button>` : ""}
                                    ${canManageWorkPlans() && category.id !== "pilot-t01" ? `<button class="icon-btn" data-action="delete-category" data-id="${e(category.id)}" title="Xóa nhóm"><i class="fa-solid fa-trash"></i></button>` : ""}
                                </span>
                            </div>
                        `).join("")}
                    </div>
                </div>
            </section>
            <aside class="input-reference-stack">
                <section class="panel reference-panel">
                    <div class="panel-head"><div class="panel-title"><i class="fa-solid fa-users"></i><div><h2>Nguồn nhân sự</h2><span>${e(appState.personnel?.length || 0)} thành viên đang dùng để giao việc</span></div></div></div>
                    <div class="panel-body"><button class="ghost-btn input-source-link" type="button" data-route="common/personnel/list"><i class="fa-solid fa-arrow-up-right-from-square"></i><span>Mở danh sách thành viên</span></button></div>
                </section>
                ${renderReferenceList("Trạng thái công việc", "fa-circle-half-stroke", workStatusOptions, renderWorkStatus)}
                ${renderReferenceList("Mức ưu tiên", "fa-flag", workPriorityOptions, renderWorkPriority)}
            </aside>
        </div>
    `;
}

function renderReferenceList(title, icon, values, renderer) {
    return `<section class="panel reference-panel"><div class="panel-head"><div class="panel-title"><i class="fa-solid ${e(icon)}"></i><div><h2>${e(title)}</h2><span>Danh mục cố định</span></div></div></div><div class="panel-body reference-list">${values.map((value) => `<div>${renderer(value)}<span>${e(value)}</span></div>`).join("")}</div></section>`;
}

function renderPersonnelMapPage() {
    const groups = new Map();
    [...(appState.personnel || [])].sort(compareBySortOrderThenName).forEach((person) => {
        const role = person.role || "Chưa cập nhật vai trò";
        if (!groups.has(role)) groups.set(role, []);
        groups.get(role).push(person);
    });
    return `
        <div class="personnel-map">
            ${[...groups.entries()].map(([role, people]) => `
                <section class="panel role-lane">
                    <div class="panel-head"><div class="panel-title"><i class="fa-solid fa-people-group"></i><div><h2>${e(role)}</h2><span>${e(people.length)} thành viên</span></div></div></div>
                    <div class="panel-body member-card-grid">
                        ${people.map((person) => `<article class="member-card">${renderPersonnelAvatar(person)}<div><strong>${e(person.name || "-")}</strong><span>${e(person.unit || "Chưa cập nhật đơn vị")}</span><small>${e(person.scope || "Chưa cập nhật phạm vi")}</small></div></article>`).join("")}
                    </div>
                </section>
            `).join("") || renderEmpty("fa-users", "Chưa có dữ liệu nhân sự", modules.personnel.emptyText)}
        </div>
    `;
}

function renderPersonnelAvatar(person) {
    const account = findPersonnelAccount(person);
    const label = person?.name || account?.name || "Thành viên";
    if (account?.avatarData) {
        return `<span class="member-avatar has-image"><img src="${e(account.avatarData)}" alt="Avatar ${e(label)}"></span>`;
    }
    return `<span class="member-avatar">${e(userInitials({ name: label || "?" }))}</span>`;
}

function findPersonnelAccount(person) {
    const candidates = accountDirectory.length ? accountDirectory : (authState.user ? [authState.user] : []);
    const email = String(person?.email || "").trim().toLowerCase();
    if (email) {
        const byEmail = candidates.find((account) => [account?.email, account?.username]
            .some((value) => String(value || "").trim().toLowerCase() === email));
        if (byEmail) return byEmail;
    }
    const nameKey = normalizeLookupKey(person?.name || "");
    return nameKey ? candidates.find((account) => normalizeLookupKey(account?.name || "") === nameKey) || null : null;
}

function renderPersonnelKpiPage() {
    const config = appState.kpiConfig?.[0] || {};
    const inputs = appState.memberKpiInputs || [];
    const weightRows = [
        ["Tiến độ", config.progressWeight, config.progressTarget],
        ["Hoàn thành đúng hạn", config.onTimeWeight, config.onTimeTarget],
        ["Chất lượng", config.qualityWeight, config.qualityTarget],
        ["Phối hợp / đóng góp", config.contributionWeight, config.contributionTarget],
        ["Kỷ luật cập nhật", config.disciplineWeight, config.disciplineTarget]
    ];
    return `
        <div class="kpi-config-grid">
            <section class="panel">
                <div class="panel-head"><div class="panel-title"><i class="fa-solid fa-sliders"></i><div><h2>Trọng số và mục tiêu</h2><span>Tổng trọng số phải bằng 100%</span></div></div>${canManageWorkPlans() ? `<button class="primary-btn" data-action="open-kpi-config"><i class="fa-solid fa-pen"></i><span>Chỉnh cấu hình</span></button>` : ""}</div>
                <div class="panel-body"><div class="kpi-weight-table"><div><b>Tiêu chí</b><b>Trọng số</b><b>Mục tiêu</b></div>${weightRows.map(([name, weight, target]) => `<div><span>${e(name)}</span><strong>${e(formatKpiPercent(weight))}</strong><strong>${e(formatKpiPercent(target))}</strong></div>`).join("")}</div></div>
            </section>
            <section class="panel">
                <div class="panel-head"><div class="panel-title"><i class="fa-solid fa-user-pen"></i><div><h2>Dữ liệu đánh giá thủ công</h2><span>${e(inputs.length)} thành viên đã cấu hình</span></div></div>${canManageWorkPlans() ? `<button class="primary-btn" data-action="open-member-kpi-create"><i class="fa-solid fa-plus"></i><span>Thêm đánh giá</span></button>` : ""}</div>
                <div class="panel-body flush-mobile"><div class="manual-kpi-list">${inputs.map((row) => `<button type="button" data-action="open-member-kpi-edit" data-id="${e(row.id)}"><span><strong>${e(kpiMemberName(row.memberEmail))}</strong><small>${e(row.memberEmail)}</small></span><span>Capacity <b>${e(formatKpiValue(row.capacity))}</b></span><span>Chất lượng <b>${e(formatKpiPercent(row.qualityScore))}</b></span><i class="fa-solid fa-pen"></i></button>`).join("") || `<div class="work-task-empty"><i class="fa-solid fa-user-clock"></i><strong>Chưa có đánh giá thủ công</strong><span>KPI tổng sẽ hiện “Chưa chấm” cho đến khi có đủ dữ liệu.</span></div>`}</div></div>
            </section>
        </div>
    `;
}

function renderMemberKpiPage() {
    const rows = appState.memberKpiResults || [];
    return `
        <div class="work-plan-page">
            <section class="panel member-kpi-panel">
                <div class="panel-head"><div class="panel-title"><i class="fa-solid fa-chart-line"></i><div><h2>KPI theo từng thành viên Squad</h2><span>Số liệu công việc tự động; điểm chất lượng, đóng góp và kỷ luật lấy từ cấu hình</span></div></div></div>
                <div class="panel-body flush-mobile">
                    <div class="member-kpi-table-wrap"><table class="member-kpi-table"><thead><tr><th>Thành viên</th><th>Module phụ trách</th><th>Capacity</th><th>Tổng task</th><th>Hoàn thành</th><th>Đang xử lý</th><th>Quá hạn</th><th>% Tiến độ</th><th>% Đúng hạn</th><th>Chất lượng</th><th>Đóng góp</th><th>Kỷ luật</th><th>Workload</th><th>Xếp loại</th><th>KPI tổng</th></tr></thead><tbody>
                        ${rows.map((row) => `<tr><td><strong>${e(row.memberName || row.memberEmail)}</strong><small>${e(row.memberEmail)}</small></td><td>${e(row.module || "-")}</td><td>${e(formatKpiValue(row.capacity))}</td><td>${e(row.totalTasks)}</td><td>${e(row.completed)}</td><td>${e(row.inProgress)}</td><td>${e(row.overdue)}</td><td>${e(formatKpiPercent(row.progress))}</td><td>${e(formatKpiPercent(row.onTimeRate))}</td><td>${e(formatKpiPercent(row.qualityScore))}</td><td>${e(formatKpiPercent(row.contributionScore))}</td><td>${e(formatKpiPercent(row.disciplineScore))}</td><td>${e(row.workload == null ? "-" : `${row.workload}x`)}</td><td>${row.scored ? renderKpiRank(row.rank) : `<span class="tag gray">Chưa chấm</span>`}</td><td><strong>${e(row.kpiTotal == null ? "-" : row.kpiTotal)}</strong></td></tr>`).join("") || `<tr><td colspan="15">Chưa có dữ liệu thành viên</td></tr>`}
                    </tbody></table></div>
                </div>
            </section>
        </div>
    `;
}

function renderKpiRank(rank) {
    const tone = rank === "Xuất sắc" || rank === "Tốt" ? "green" : rank === "Đạt" ? "yellow" : "red";
    return tag(rank || "Chưa chấm", tone);
}

function formatKpiPercent(value) {
    return value === "" || value == null || !Number.isFinite(Number(value)) ? "-" : `${Number(value)}%`;
}

function formatKpiValue(value) {
    return value === "" || value == null || !Number.isFinite(Number(value)) ? "-" : Number(value);
}

function getKpiMemberOptions() {
    return (appState.personnel || []).filter((row) => row.email).map((row) => ({ value: String(row.email).toLowerCase(), label: `${row.name || row.email} · ${row.email}` }));
}

function kpiMemberName(email) {
    const normalized = String(email || "").toLowerCase();
    return (appState.personnel || []).find((row) => String(row.email || "").toLowerCase() === normalized)?.name || email || "-";
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
    return `
        <section class="sheet-dashboard">
            <section class="panel sheet-dashboard-panel">
                <div class="sheet-dashboard-head">
                    <div>
                        <span>Dashboard_UAT</span>
                        <h2>BẢNG ĐIỀU HÀNH UAT SQUAD 2 - PILOT & GO-LIVE</h2>
                    </div>
                    <span class="sheet-dashboard-pill">${e(summaryRows[0]?.value || 0)} story</span>
                </div>
                <div class="sheet-dashboard-grid">
                    <article class="sheet-dashboard-card summary-card">
                        <div class="sheet-card-title">
                            <i class="fa-solid fa-gauge-high"></i>
                            <h3>Chỉ số</h3>
                        </div>
                        ${renderDashboardTable(["Chỉ số", "Giá trị"], summaryRows.map((row) => [
                            row.label,
                            row.decision ? { html: renderDecision(row.value) } : { html: renderDashboardValue(row.value, row.type) }
                        ]), "compact")}
                    </article>
                    <article class="sheet-dashboard-card sprint-card">
                        <div class="sheet-card-title">
                            <i class="fa-solid fa-flag-checkered"></i>
                            <h3>Sprint</h3>
                        </div>
                        ${renderDashboardTable(["Sprint", "Coverage", "Pass Rate", "Blocker", "Critical", "Quyết định"], sprintRows.map((row) => [
                            row.sprint,
                            `${row.coverageRate}%`,
                            `${row.passRate}%`,
                            row.blocker,
                            row.critical,
                            { html: renderDecision(row.decision) }
                        ]), "sprint-dashboard-table")}
                    </article>
                    <article class="sheet-dashboard-card owner-card">
                        <div class="sheet-card-title">
                            <i class="fa-solid fa-users-gear"></i>
                            <h3>Tổng hợp theo Đầu mối Nghiệp vụ</h3>
                        </div>
                        ${renderDashboardTable(["ĐMNV", "Số Story", "Tổng TC", "TC đã chạy", "Tỷ lệ bao phủ"], ownerRows.map((row) => [
                            row.owner,
                            row.storyCount,
                            renderNumber(row.totalCases),
                            renderNumber(row.executedCases),
                            `${row.coverageRate}%`
                        ]), "owner-dashboard-table")}
                    </article>
                </div>
            </section>
        </section>
    `;
}

function renderDefectDashboardPanel() {
    const rows = getDefectDashboardRows();
    const severityRows = getDefectSeverityStatusRows();
    const usRows = getDefectUserStoryRows();
    const statusRows = getDefectStatusRows();
    const priorityRows = getDefectPriorityRows();
    return `
        <section class="panel sheet-dashboard-panel defect-dashboard-panel">
            <div class="sheet-dashboard-head">
                <div>
                    <span>DEFECT_Dashboard</span>
                    <h2>DASHBOARD DEFECT UAT - SQUAD 2</h2>
                </div>
                <span class="sheet-dashboard-pill">${e(rows[0]?.value || 0)} defect</span>
            </div>
            <div class="defect-dashboard-layout">
                <article class="sheet-dashboard-card">
                    <div class="sheet-card-title">
                        <i class="fa-solid fa-bug"></i>
                        <h3>KPI</h3>
                    </div>
                    ${renderDashboardTable(["KPI", "Giá trị"], rows.map((row) => [
                        row.label,
                        row.type === "percent" ? row.value : renderNumber(row.value)
                    ]), "compact")}
                </article>
                <article class="sheet-dashboard-card matrix-card">
                    <div class="sheet-card-title">
                        <i class="fa-solid fa-table-cells"></i>
                        <h3>Severity/Status</h3>
                    </div>
                    ${renderDashboardTable(["Severity/Status", "Open", "In Progress", "Reopen", "Resolved", "Closed", "Cancelled", "Pending", "SIT Pass", "SIT Fail", "Tổng"], severityRows.map((row) => [
                        row.severity,
                        ...row.statuses,
                        row.total
                    ]), "matrix-dashboard-table")}
                </article>
            </div>
            <div class="defect-dashboard-summary-row">
                <article class="sheet-dashboard-card">
                    <div class="sheet-card-title">
                        <i class="fa-solid fa-list-check"></i>
                        <h3>CHỈ SỐ TỔNG QUAN</h3>
                    </div>
                    ${renderDashboardTable(["Chỉ số", "Giá trị"], usRows.map((row) => [
                        row.label,
                        row.type === "percent" ? row.value : renderNumber(row.value)
                    ]), "compact")}
                </article>
                <article class="sheet-dashboard-card">
                    <div class="sheet-card-title">
                        <i class="fa-solid fa-chart-simple"></i>
                        <h3>Lỗi theo trạng thái</h3>
                    </div>
                    ${renderDashboardTable(["Trạng thái", "Số lượng"], statusRows, "compact")}
                </article>
                <article class="sheet-dashboard-card">
                    <div class="sheet-card-title">
                        <i class="fa-solid fa-layer-group"></i>
                        <h3>Lỗi theo mức độ</h3>
                    </div>
                    ${renderDashboardTable(["Mức độ", "Số lượng"], priorityRows, "compact")}
                </article>
            </div>
        </section>
    `;
}

function renderDefectDashboardPage() {
    return `
        <div class="sheet-dashboard">
            ${renderDefectDashboardPanel()}
        </div>
    `;
}

function getDefectDashboardRows() {
    const openDefects = appState.defects.filter((row) => isOpenBugStatus(row.status));
    const openSeverity = (severity) => openDefects.filter((row) => normalizeWorkbookFormulaText(row.severity) === normalizeWorkbookFormulaText(severity)).length;
    const reopenRate = appState.defects.length ? (countDefectStatus("Reopen") / 999) * 100 : 0;
    return [
        { label: "Tổng Defect", value: appState.defects.length },
        { label: "Open", value: countDefectStatus("Open") },
        { label: "In Progress", value: countDefectStatus("In Progress") },
        { label: "Reopen", value: countDefectStatus("Reopen") },
        { label: "Resolved", value: countDefectStatus("Resolved") },
        { label: "Closed", value: countDefectStatus("Closed") },
        { label: "Blocker Open", value: openSeverity("Blocker") },
        { label: "Critical Open", value: openSeverity("Critical") },
        { label: "Reopen Rate", value: `${reopenRate.toFixed(2)}%`, type: "percent" }
    ];
}

function getDefectSeverityStatusRows() {
    const statuses = ["Open", "In Progress", "Reopen", "Resolved", "Closed", "Cancelled", "Pending", "SIT Pass", "SIT Fail"];
    const severities = ["Blocker", "Critical", "Major", "Minor", "Trivial"];
    const rows = severities.map((severity) => {
        const statusCounts = statuses.map((status) => countDefectsBySeverityStatus(severity, status));
        return {
            severity,
            statuses: statusCounts,
            total: statusCounts.reduce((sumValue, value) => sumValue + value, 0)
        };
    });
    const totals = statuses.map((status) => countDefectStatus(status));
    rows.push({
        severity: "Tổng",
        statuses: totals,
        total: totals.reduce((sumValue, value) => sumValue + value, 0)
    });
    return rows;
}

function countDefectStatus(status) {
    return appState.defects.filter((row) => isBugStatus(row.status, status)).length;
}

function countDefectsBySeverityStatus(severity, status) {
    const targetSeverity = normalizeWorkbookFormulaText(severity);
    return appState.defects.filter((row) => (
        normalizeWorkbookFormulaText(row.severity) === targetSeverity
        && isBugStatus(row.status, status)
    )).length;
}

function getDashboardSummaryRows() {
    const totalStories = appState.features.length;
    const deliveredStories = appState.handoffs.filter((row) => isFilled(row.uatHandoff)).length;
    const notDeliveredStories = Math.max(0, totalStories - deliveredStories);
    const handoffRate = percent(deliveredStories, totalStories);
    const totalCases = sum(appState.plans, "totalCases");
    const passedCases = 0;
    const failedCases = 0;
    const blockedCases = 0;
    const blockerBugs = 0;
    const criticalBugs = 0;
    const pilotReadiness = round(handoffRate * 0.5 + percent(passedCases, totalCases) * 0.5);
    return [
        { key: "totalStories", label: "Tổng Story", value: totalStories, type: "number" },
        { key: "deliveredStories", label: "Đã bàn giao UAT", value: deliveredStories, type: "number" },
        { key: "notDeliveredStories", label: "Chưa bàn giao", value: notDeliveredStories, type: "number" },
        { key: "handoffRate", label: "Tỷ lệ bàn giao UAT", value: `${handoffRate}%`, type: "percent" },
        { key: "totalCases", label: "Tổng Testcase", value: totalCases, type: "number" },
        { key: "passedCases", label: "Passed", value: passedCases, type: "number" },
        { key: "failedCases", label: "Failed", value: failedCases, type: "number" },
        { key: "blockedCases", label: "Blocked", value: blockedCases, type: "number" },
        { key: "blockerBugs", label: "Blocker Open", value: blockerBugs, type: "number" },
        { key: "criticalBugs", label: "Critical Open", value: criticalBugs, type: "number" },
        { key: "pilotReadinessPercent", label: "Pilot Readiness", value: `${pilotReadiness}%`, type: "percent" },
        { key: "pilotReadiness", label: "Pilot Readiness", value: "CONDITIONAL GO", decision: true },
        { key: "goLiveReadiness", label: "Go-live Readiness", value: "CONDITIONAL GO", decision: true }
    ];
}

function getDashboardOwnerRows() {
    return ownerOptions.slice(0, 3).map((owner) => {
        const rows = appState.plans.filter((row) => normalizeLookupKey(row.owner) === normalizeLookupKey(owner));
        const totalCases = sum(rows, "totalCases");
        const executedCases = 0;
        return {
            owner,
            storyCount: rows.length,
            totalCases,
            executedCases,
            coverageRate: percent(executedCases, totalCases)
        };
    });
}

function getDashboardSprintRows() {
    const readinessBySprint = new Map(appState.readiness.map((row) => [normalizeLookupKey(row.sprint), row]));
    const sourceRows = appState.weekly.length ? appState.weekly : appState.readiness;
    return sourceRows
        .map((row) => {
            const readiness = readinessBySprint.get(normalizeLookupKey(row.sprint)) || {};
            return {
                sprint: row.sprint || readiness.sprint || "",
                coverageRate: 0,
                passRate: 0,
                blocker: 0,
                critical: 0,
                decision: readiness.decision || row.decision || "CONDITIONAL GO"
            };
        })
        .sort((a, b) => a.sprint.localeCompare(b.sprint, "vi", { numeric: true }));
}

function getDefectUserStoryRows() {
    const validBugSources = getValidLinkedBugSources();
    const hasBugSourceSheet = appState.bugSources.length > 0;
    const totalUs = appState.features.length || appState.defectSummary.length;
    const usWithBugs = hasBugSourceSheet
        ? new Set(validBugSources.map((row) => normalizeLookupKey(row.linkedUsKey))).size
        : appState.defectSummary.filter((row) => Number(row.totalBugs || 0) > 0).length;
    const totalBugs = appState.bugSources.length || appState.defects.length;
    const validLinkedBugs = hasBugSourceSheet ? validBugSources.length : sum(appState.defectSummary, "totalBugs");
    const activeBugs = hasBugSourceSheet
        ? validBugSources.filter((row) => ["Open", "In Progress", "Pending"].some((status) => isBugStatus(row.status, status))).length
        : sum(appState.defectSummary, "activeBugs");
    const handledBugs = hasBugSourceSheet ? Math.max(0, validLinkedBugs - activeBugs) : sum(appState.defectSummary, "handledBugs");
    const severeBugs = hasBugSourceSheet
        ? validBugSources.filter((row) => ["Blocker", "Critical"].some((severity) => normalizeWorkbookFormulaText(row.priority) === normalizeWorkbookFormulaText(severity))).length
        : sum(appState.defectSummary, "severeBugs");
    return [
        { label: "Tổng số US", value: totalUs },
        { label: "Số US có lỗi", value: usWithBugs },
        { label: "Số US chưa có lỗi", value: Math.max(0, totalUs - usWithBugs) },
        { label: "Tổng số lỗi (trong sheet)", value: totalBugs },
        { label: "Lỗi đã gắn US (hợp lệ)", value: validLinkedBugs },
        { label: "Lỗi CHƯA gắn US / sai mã", value: Math.max(0, totalBugs - validLinkedBugs) },
        { label: "Lỗi đang mở (chưa xử lý)", value: activeBugs },
        { label: "Lỗi đã xử lý", value: handledBugs },
        { label: "% xử lý", value: `${validLinkedBugs ? ((handledBugs / validLinkedBugs) * 100).toFixed(2) : "0.00"}%`, type: "percent" },
        { label: "Lỗi nghiêm trọng (Blocker/Critical)", value: severeBugs }
    ];
}

function getValidLinkedBugSources() {
    const userStoryKeys = new Set(appState.userStories.map((row) => normalizeLookupKey(row.issueKey)).filter(Boolean));
    return appState.bugSources.filter((row) => userStoryKeys.has(normalizeLookupKey(row.linkedUsKey)));
}

function getDefectStatusRows() {
    const statuses = ["Open", "In Progress", "Pending", "Resolved", "SIT Pass"];
    const rows = statuses.map((status) => [status, countBugSourceStatus(status)]);
    const knownTotal = rows.reduce((total, [, value]) => total + value, 0);
    rows.push(["Khác", Math.max(0, appState.bugSources.length - knownTotal)]);
    return rows;
}

function getDefectPriorityRows() {
    return ["Blocker", "Critical", "Major", "Minor", "Trivial"].map((priority) => [
        priority,
        appState.bugSources.filter((row) => normalizeWorkbookFormulaText(row.priority) === normalizeWorkbookFormulaText(priority)).length
    ]);
}

function countBugSourceStatus(status) {
    return appState.bugSources.filter((row) => isBugStatus(row.status, status)).length;
}

function renderDashboardTable(headers, rows, className = "") {
    const bodyRows = rows.length ? rows : [[{ html: `<span class="excel-empty-cell">Chưa có dữ liệu</span>` }]];
    return `
        <div class="sheet-dashboard-table-wrap">
            <table class="sheet-dashboard-table ${e(className)}">
                <thead>
                    <tr>${headers.map((header) => `<th>${e(header)}</th>`).join("")}</tr>
                </thead>
                <tbody>
                    ${bodyRows.map((row) => `
                        <tr>
                            ${row.map((cell, index) => `<td class="${index === 0 ? "label-cell" : "value-cell"}">${renderDashboardCell(cell)}</td>`).join("")}
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderDashboardCell(cell) {
    if (cell && typeof cell === "object" && "html" in cell) return cell.html;
    return e(cell);
}

function renderDashboardValue(value, type) {
    if (type === "number") return renderNumber(value);
    return e(value);
}

function renderNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? e(number.toLocaleString("vi-VN")) : e(value);
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
        getDisplayRows(mod.collection).forEach((row) => {
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

function renderWorkPlanModule() {
    const mod = modules.workItems;
    const filteredRows = getFilteredWorkRows();
    const pageState = getPaginationState(mod.collection, filteredRows);
    const rows = pageState.rows;
    const categories = getWorkCategories();
    const stats = getWorkPlanStats();
    const total = stats.total;
    const canManage = canManageWorkPlans();
    const canCreate = canCreateWorkItems();
    const activeFilters = countActiveFilters(mod);
    return `
        <div class="work-plan-page">
            <section class="work-plan-summary with-categories">
                ${renderWorkMetric("Nhóm", stats.categories, "fa-folder-tree", "teal")}
                ${renderWorkMetric("Tổng đầu việc", stats.total, "fa-list-check", "blue", "all")}
                ${renderWorkMetric("Chưa bắt đầu", stats.notStarted, "fa-circle-pause", "gray", "notStarted")}
                ${renderWorkMetric("Đang thực hiện", stats.inProgress, "fa-person-running", "blue", "inProgress")}
                ${renderWorkMetric("Quá hạn", stats.overdue, "fa-triangle-exclamation", "red", "overdue", "Cảnh báo giao cắt: các việc chưa hoàn thành đã quá deadline")}
                ${renderWorkMetric("Hoàn thành", stats.done, "fa-circle-check", "green", "done")}
            </section>

            ${renderWorkOnboarding(canManage, canCreate, categories.length, total)}

            <div class="content-grid work-plan-layout">
                ${renderWorkCategoryPanel()}
                <section class="panel work-items-panel">
                    <div class="panel-head">
                        <div class="panel-title">
                            <i class="fa-solid ${mod.icon}"></i>
                            <div>
                                <h2>Danh sách đầu việc</h2>
                                <span>${e(total)} đầu việc · ${renderPaginationSummary(pageState)}</span>
                            </div>
                        </div>
                        <div class="panel-actions">
                            ${activeFilters ? `
                                <button class="ghost-btn compact-reset-btn" data-action="reset-filters" title="Xóa toàn bộ lọc">
                                    <i class="fa-solid fa-filter-circle-xmark"></i><span>${e(activeFilters)} lọc</span>
                                </button>
                            ` : ""}
                            ${canCreate && categories.length ? `
                            <button class="primary-btn" data-action="open-create">
                                <i class="fa-solid fa-plus"></i><span>Thêm đầu việc</span>
                            </button>
                            ` : ""}
                        </div>
                    </div>
                    <div class="panel-body">
                        ${total ? `
                            ${renderWorkViewTabs(stats)}
                            ${renderWorkPlanFilterBar()}
                            ${renderPaginationControls(mod.collection, pageState)}
                            ${renderTable(mod, rows)}
                        ` : renderWorkTaskEmptyState(canCreate, canManage, categories.length)}
                    </div>
                </section>
            </div>
        </div>
    `;
}

function renderWorkMetric(label, value, icon, tone, workView = "", title = "") {
    if (workView) {
        const active = (ui.workView || "all") === workView;
        return `
            <button class="work-metric is-clickable ${e(tone)} ${active ? "active" : ""}" type="button" data-action="set-work-metric" data-work-view="${e(workView)}" aria-pressed="${active ? "true" : "false"}" ${title ? `title="${e(title)}"` : ""}>
                <i class="fa-solid ${e(icon)}"></i>
                <div>
                    <span>${e(label)}</span>
                    <strong>${e(value)}</strong>
                </div>
            </button>
        `;
    }
    return `
        <article class="work-metric ${e(tone)}">
            <i class="fa-solid ${e(icon)}"></i>
            <div>
                <span>${e(label)}</span>
                <strong>${e(value)}</strong>
            </div>
        </article>
    `;
}

function renderWorkOnboarding(canManage, canCreate, categoryCount, totalTasks) {
    if (categoryCount && totalTasks) return "";
    if (!canManage) {
        return `
            <section class="work-onboarding compact">
                <div>
                    <i class="fa-solid fa-circle-info"></i>
                    <div>
                        <strong>${categoryCount && canCreate ? "Bạn có thể tự thêm đầu việc" : "Chưa có kế hoạch công việc được giao"}</strong>
                        <span>${categoryCount && canCreate ? "Chọn Thêm đầu việc để bổ sung công việc còn thiếu. Hệ thống sẽ tự gán công việc cho tài khoản của bạn." : "Khi admin tạo nhóm hoặc giao đầu việc, nội dung cần xử lý sẽ hiện tại đây để bạn cập nhật tiến độ."}</span>
                    </div>
                </div>
            </section>
        `;
    }
    return `
        <section class="work-onboarding">
            <div class="work-onboarding-copy">
                <span>Gợi ý thiết lập</span>
                <strong>Tạo nhóm trước, sau đó giao từng đầu việc và deadline.</strong>
                <p>Người thực hiện chỉ cần mở việc được giao để cập nhật trạng thái, % hoàn thành, link tài liệu và vướng mắc.</p>
            </div>
            <div class="work-onboarding-steps">
                <div><b>1</b><span>Tạo nhóm như HDSD, Quy trình tác nghiệp</span></div>
                <div><b>2</b><span>Thêm đầu việc, người thực hiện và deadline</span></div>
                <div><b>3</b><span>Theo dõi quá hạn, hoàn thành và tiến độ trung bình</span></div>
            </div>
        </section>
    `;
}

function renderWorkViewTabs(stats) {
    const views = [
        { id: "all", label: "Tất cả", count: stats.total },
        { id: "mine", label: "Việc của tôi", count: stats.mine },
        { id: "notStarted", label: "Chưa bắt đầu", count: stats.notStarted },
        { id: "inProgress", label: "Đang thực hiện", count: stats.inProgress },
        { id: "open", label: "Chưa hoàn thành", count: stats.open },
        { id: "overdue", label: "Quá hạn", count: stats.overdue },
        { id: "done", label: "Hoàn thành", count: stats.done }
    ];
    const current = ui.workView === "approval" ? "all" : (ui.workView || "all");
    return `
        <div class="work-view-tabs" role="tablist" aria-label="Chế độ xem kế hoạch">
            ${views.map((view) => `
                <button class="work-view-tab ${current === view.id ? "active" : ""}" type="button" data-action="set-work-view" data-work-view="${e(view.id)}">
                    <span>${e(view.label)}</span><b>${e(view.count)}</b>
                </button>
            `).join("")}
        </div>
    `;
}

function renderWorkTaskEmptyState(canCreate, canManage, categoryCount) {
    const title = canCreate ? "Chưa có đầu việc" : "Chưa có công việc được giao";
    const text = canCreate
        ? categoryCount
            ? "Thêm đầu việc đầu tiên để bắt đầu theo dõi tiến độ."
            : canManage
                ? "Tạo nhóm công việc trước, sau đó thêm từng đầu việc."
                : "Admin cần tạo ít nhất một nhóm trước khi bạn có thể tự thêm đầu việc."
        : "Khi có việc được giao, bạn sẽ cập nhật tiến độ trực tiếp tại màn này.";
    const action = canCreate && categoryCount
        ? `<button class="primary-btn" data-action="open-create"><i class="fa-solid fa-plus"></i><span>Thêm đầu việc</span></button>`
        : canManage
            ? `<button class="primary-btn" data-action="open-category-create"><i class="fa-solid fa-folder-plus"></i><span>Tạo nhóm công việc</span></button>`
            : "";
    return `
        <div class="work-task-empty">
            <i class="fa-solid fa-list-check"></i>
            <strong>${e(title)}</strong>
            <span>${e(text)}</span>
            ${action}
        </div>
    `;
}

function renderWorkCategoryPanel() {
    const categories = getWorkCategories();
    const canManage = canManageWorkPlans();
    const stats = getWorkPlanStats();
    const selectedCategoryId = ui.filters["workItems:categoryId"] || "";
    const doneProgress = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
    return `
        <section class="panel work-category-panel">
            <div class="panel-head">
                <div class="panel-title">
                    <i class="fa-solid fa-folder-tree"></i>
                    <div>
                        <h2>Nhóm công việc</h2>
                        <span>${e(categories.length)} nhóm · ${canManage ? "tạo/sắp xếp nhóm" : "đang theo dõi"}</span>
                    </div>
                </div>
                <div class="panel-actions">
                    ${canManage ? `
                    <button class="primary-btn compact-primary" data-action="open-category-create">
                        <i class="fa-solid fa-plus"></i><span>Thêm nhóm</span>
                    </button>
                    ` : ""}
                </div>
            </div>
            <div class="panel-body">
                <div class="work-category-list">
                    <button class="work-category-overview ${!selectedCategoryId ? "active" : ""}" data-action="set-work-category" data-id="">
                        <span class="work-category-overview-icon"><i class="fa-solid fa-layer-group"></i></span>
                        <span class="work-category-overview-copy">
                            <strong>Tất cả nhóm</strong>
                            <small>${e(stats.total)} đầu việc · ${e(stats.done)} hoàn thành</small>
                        </span>
                        <span class="work-category-overview-percent">${e(doneProgress)}%</span>
                        <span class="work-category-progress">
                            <span style="width:${e(clamp(doneProgress))}%"></span>
                        </span>
                    </button>
                    ${categories.length ? categories.map(renderWorkCategoryRow).join("") : `
                        <div class="work-empty-note">
                            <i class="fa-solid fa-folder-plus"></i>
                            <strong>Chưa có nhóm công việc</strong>
                            <span>${canManage ? "Tạo nhóm như HDSD, Quy trình tác nghiệp, hoặc nhóm mới theo nhu cầu." : "Khi sếp tạo nhóm, danh sách nhóm sẽ hiển thị tại đây."}</span>
                        </div>
                    `}
                </div>
            </div>
        </section>
    `;
}

function renderWorkCategoryRow(category) {
    const items = appState.workItems.filter((item) => String(item.categoryId || "") === String(category.id));
    const done = items.filter((item) => item.status === "Hoàn thành").length;
    const progress = items.length ? Math.round(items.reduce((total, item) => total + Number(item.progress || 0), 0) / items.length) : 0;
    const canEdit = canManageWorkPlans() && canModifyRecord(category);
    const canDelete = canManageWorkPlans() && canDeleteRecord(category);
    const active = ui.filters["workItems:categoryId"] === category.id;
    const title = getWorkCategoryShortName(category);
    const deadline = category.targetDate ? ` · hạn ${formatWorkCategoryDueShort(category.targetDate)}` : "";
    const itemLabel = items.length ? `${items.length} việc` : "Chưa có việc";
    return `
        <article class="work-category-row ${active ? "active" : ""}">
            <button class="work-category-main" data-action="set-work-category" data-id="${e(category.id)}" title="${e(category.name)}">
                <span class="work-category-code">${e(category.taskPrefix || "-")}</span>
                <span class="work-category-copy">
                    <strong>${e(title)}</strong>
                    <small>${e(itemLabel)} · ${e(done)} xong${e(deadline)}</small>
                </span>
                <span class="work-category-percent">${e(progress)}%</span>
                <div class="work-category-progress">
                    <span style="width:${e(clamp(progress))}%"></span>
                </div>
            </button>
            <div class="row-actions work-category-actions">
                ${canEdit ? `
                    <button class="icon-btn" data-action="open-category-edit" data-id="${e(category.id)}" title="Sửa nhóm" aria-label="Sửa nhóm">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                ` : ""}
                ${canDelete ? `
                    <button class="icon-btn" data-action="delete-category" data-id="${e(category.id)}" title="Xóa nhóm" aria-label="Xóa nhóm">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                ` : ""}
            </div>
        </article>
    `;
}

function getWorkCategoryShortName(category) {
    const prefix = String(category?.taskPrefix || "").trim().toUpperCase();
    const names = {
        "SQ2-T01": "Kiểm thử chức năng",
        "SQ2-T02": "Kiểm thử luồng",
        "SQ2-T03": "HDSD Lending Hub",
        "SQ2-T04": "Quy trình tác nghiệp",
        "SQ2-T05": "HDSD vận hành",
        "SQ2-T06": "Quy định vận hành",
        "SQ2-T07": "Tài liệu đào tạo",
        "SQ2-T08": "Tham gia ý kiến",
        "SQ2-T09": "Công tác Báo cáo",
        "SQ2-T10": "Công việc khác"
    };
    return names[prefix] || category?.name || "Nhóm công việc";
}

function formatWorkCategoryDueShort(value) {
    const date = parseDateOnly(value);
    if (!date) return String(value || "");
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function renderWorkPlanFilterBar(showGroup = true) {
    const categoryOptions = getWorkCategorySelectOptions();
    const assignees = uniqueTextValues(appState.workItems.map((row) => row.assignee));
    return `
        <div class="work-filter-bar">
            ${showGroup ? `<label>
                <span>Nhóm</span>
                <select class="field-select" data-filter-key="categoryId">
                    <option value="">Tất cả nhóm</option>
                    ${categoryOptions.map((option) => `<option value="${e(optionValue(option))}" ${ui.filters["workItems:categoryId"] === optionValue(option) ? "selected" : ""}>${e(optionLabel(option))}</option>`).join("")}
                </select>
            </label>` : ""}
            <label>
                <span>Trạng thái</span>
                <select class="field-select" data-filter-key="status">
                    <option value="">Tất cả trạng thái</option>
                    ${workStatusOptions.map((option) => `<option value="${e(option)}" ${ui.filters["workItems:status"] === option ? "selected" : ""}>${e(option)}</option>`).join("")}
                </select>
            </label>
            <label>
                <span>Ưu tiên</span>
                <select class="field-select" data-filter-key="priority">
                    <option value="">Tất cả ưu tiên</option>
                    ${workPriorityOptions.map((option) => `<option value="${e(option)}" ${ui.filters["workItems:priority"] === option ? "selected" : ""}>${e(option)}</option>`).join("")}
                </select>
            </label>
            <label>
                <span>Người thực hiện</span>
                <select class="field-select" data-filter-key="assignee">
                    <option value="">Tất cả người thực hiện</option>
                    ${assignees.map((option) => `<option value="${e(option)}" ${ui.filters["workItems:assignee"] === option ? "selected" : ""}>${e(option)}</option>`).join("")}
                </select>
            </label>
        </div>
    `;
}

function getWorkPlanStats() {
    const rows = getWorkRowsForDisplay();
    const categories = getWorkCategories();
    const done = rows.filter((row) => row.status === "Hoàn thành").length;
    const notStarted = rows.filter((row) => row.status === "Chưa bắt đầu").length;
    const overdue = rows.filter((row) => getWorkItemWarning(row) === "Quá hạn").length;
    const mine = rows.filter(isAssignedWorkItem).length;
    const inProgress = rows.filter((row) => row.status === "Đang thực hiện").length;
    const open = rows.filter((row) => String(row.status || "") !== "Hoàn thành").length;
    const averageProgress = rows.length ? Math.round(rows.reduce((total, row) => total + Number(row.progress || 0), 0) / rows.length) : 0;
    return { categories: categories.length, total: rows.length, mine, open, notStarted, inProgress, done, overdue, averageProgress };
}

function getFilteredWorkRows(forcedCategoryId = "") {
    const mod = modules.workItems;
    const rows = getWorkRowsForDisplay();
    const query = ui.query.trim().toLowerCase();
    return rows.filter((row) => {
        if (forcedCategoryId && String(row.categoryId || "") !== String(forcedCategoryId)) return false;
        const matchQuery = !query || Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(query));
        if (!matchQuery) return false;
        const matchLegacyFilters = (mod.filters || []).every((filter) => {
            const selected = ui.filters[`${mod.collection}:${filter.key}`];
            return !selected || String(row[filter.key] || "") === String(selected);
        });
        if (!matchLegacyFilters) return false;
        const view = ui.workView === "approval" ? "all" : (ui.workView || "all");
        if (view === "mine" && !isAssignedWorkItem(row)) return false;
        if (view === "notStarted" && String(row.status || "") !== "Chưa bắt đầu") return false;
        if (view === "inProgress" && String(row.status || "") !== "Đang thực hiện") return false;
        if (view === "open" && String(row.status || "") === "Hoàn thành") return false;
        if (view === "overdue" && row.warning !== "Quá hạn") return false;
        if (view === "done" && String(row.status || "") !== "Hoàn thành") return false;
        return mod.columns.every((col) => {
            const selected = ui.columnFilters[columnFilterKey(mod, col)];
            if (!selected) return true;
            return String(getColumnRawValue(row, col) ?? "").toLowerCase().includes(String(selected).toLowerCase());
        });
    });
}

function getWorkRowsForDisplay() {
    const categories = getWorkCategories();
    const categoryById = new Map(categories.map((category) => [String(category.id), category]));
    const categoryOrder = new Map(categories.map((category, index) => [String(category.id), index]));
    const localOrderByCategory = new Map();
    return [...getDisplayRows("workItems")]
        .sort((a, b) => {
            const categoryA = categoryOrder.get(String(a.categoryId || "")) ?? Number.MAX_SAFE_INTEGER;
            const categoryB = categoryOrder.get(String(b.categoryId || "")) ?? Number.MAX_SAFE_INTEGER;
            if (categoryA !== categoryB) return categoryA - categoryB;
            const orderA = Number(a.sortOrder);
            const orderB = Number(b.sortOrder);
            if (Number.isFinite(orderA) && Number.isFinite(orderB) && orderA !== orderB) return orderA - orderB;
            if (Number.isFinite(orderA) !== Number.isFinite(orderB)) return Number.isFinite(orderA) ? -1 : 1;
            return String(a.taskId || a.title || "").localeCompare(String(b.taskId || b.title || ""), "vi", { numeric: true });
        })
        .map((row) => {
        const category = categoryById.get(String(row.categoryId || ""));
        const categoryKey = String(row.categoryId || "");
        const displayOrder = (localOrderByCategory.get(categoryKey) || 0) + 1;
        localOrderByCategory.set(categoryKey, displayOrder);
        return {
            ...row,
            displayOrder,
            categoryName: category?.name || row.categoryName || "Chưa phân nhóm",
            warning: getWorkItemWarning(row)
        };
    });
}

function getWorkCategories() {
    return [...(appState.workCategories || [])]
        .filter(shouldDisplaySourceRow)
        .sort(compareBySortOrderThenName);
}

function compareBySortOrderThenName(a, b) {
    const sortA = Number(a?.sortOrder);
    const sortB = Number(b?.sortOrder);
    if (Number.isFinite(sortA) && Number.isFinite(sortB) && sortA !== sortB) return sortA - sortB;
    if (Number.isFinite(sortA) !== Number.isFinite(sortB)) return Number.isFinite(sortA) ? -1 : 1;
    return String(a?.name || a?.title || "").localeCompare(String(b?.name || b?.title || ""), "vi", { numeric: true });
}

function renderModule(mod) {
    if (mod.collection === "guide") return renderGuideModule(mod);
    const filteredRows = getFilteredRows(mod);
    const pageState = getPaginationState(mod.collection, filteredRows);
    const rows = pageState.rows;
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
                            <span>${e(total)} bản ghi · ${e(mod.columns.length)} cột · ${renderPaginationSummary(pageState)}</span>
                        </div>
                    </div>
                    <div class="panel-actions">
                        ${activeFilters ? `
                            <button class="ghost-btn compact-reset-btn" data-action="reset-filters" title="Xóa toàn bộ lọc">
                                <i class="fa-solid fa-filter-circle-xmark"></i><span>${e(activeFilters)} lọc</span>
                            </button>
                        ` : ""}
                        ${mod.readOnly ? "" : `
                            <button class="primary-btn" data-action="open-create">
                                <i class="fa-solid fa-plus"></i><span>Thêm bản ghi</span>
                            </button>
                        `}
                    </div>
                </div>
                <div class="panel-body">
                    ${renderModuleDataTools(mod)}
                    ${renderPaginationControls(mod.collection, pageState)}
                    ${renderTable(mod, rows)}
                </div>
            </section>
        </div>
    `;
}

function renderModuleDataTools(mod) {
    if (mod.collection !== "daily") return "";
    const dateValue = ui.filters[`${mod.collection}:date`] || "";
    const sprintValue = ui.filters[`${mod.collection}:sprint`] || "";
    const testerValue = ui.filters[`${mod.collection}:tester`] || "";
    const sprintOptions = uniqueValues(getDisplayRows(mod.collection), "sprint");
    const testerOptions = getDailyTesterOptions();
    return `
        <div class="module-data-tools" aria-label="Tìm kiếm và lọc Điều hành hằng ngày">
            <label class="work-task-search module-data-search">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input id="searchInput" value="${e(ui.query)}" placeholder="Tìm ngày, Jira, chức năng, Tester, lỗi..." aria-label="Tìm bản ghi Điều hành hằng ngày">
            </label>
            <label class="module-data-filter">
                <span>Ngày</span>
                <input class="field-input" type="date" data-filter-key="date" value="${e(dateValue)}">
            </label>
            <label class="module-data-filter">
                <span>Sprint</span>
                <select class="field-select" data-filter-key="sprint">
                    <option value="">Tất cả Sprint</option>
                    ${sprintOptions.map((option) => `<option value="${e(option)}" ${String(option) === String(sprintValue) ? "selected" : ""}>${e(option)}</option>`).join("")}
                </select>
            </label>
            <label class="module-data-filter">
                <span>Tester</span>
                <select class="field-select" data-filter-key="tester">
                    <option value="">Tất cả Tester</option>
                    ${testerOptions.map((option) => `<option value="${e(option.value)}" ${String(option.value) === String(testerValue) ? "selected" : ""}>${e(option.label)}</option>`).join("")}
                </select>
            </label>
        </div>
    `;
}

function renderGuideModule(mod) {
    const rows = getGuideRows();
    const mainRows = rows.filter((row) => row.category === "Hướng dẫn");
    const handoffRows = rows.filter((row) => ["Cập nhật mới", "Nguyên tắc", "Cột cần nhập", "Cột tự động", "Khóa liên kết"].includes(row.category));
    const handoffMain = handoffRows[0];
    const handoffFacts = handoffRows.slice(1);
    const priorityRows = rows.filter((row) => bugSeverityOptions.includes(row.category));
    const statusRows = rows.filter((row) => bugStatusOptions.includes(row.category) || row.category === "Reopened");
    const flowRows = rows.filter((row) => row.category.includes("Status") && (row.topic.includes("Luồng") || row.topic.includes("Retest")));
    const devRows = rows.filter((row) => handoffNoteOptions.includes(row.category));
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
                ${renderGuideTable(
                    "Ý nghĩa các mức độ ưu tiên (Priority)",
                    ["Mức độ lỗi", "Màu", "Ý nghĩa", "Quy ước"],
                    priorityRows.map((row) => [row.category, row.topic, row.content, row.note || ""])
                )}
                ${renderGuideTable(
                    "Ý nghĩa các trạng thái (Status)",
                    ["Trạng thái lỗi", "Màu", "Ý nghĩa"],
                    statusRows.map((row) => [row.category, row.topic, row.content])
                )}
            </div>

            <section class="guide-section">
                <div class="guide-section-head">
                    <i class="fa-solid fa-route"></i>
                    <div>
                        <h3>Luồng xử lý Defect</h3>
                        <span>Các trường hợp chuyển trạng thái lỗi trong UAT</span>
                    </div>
                </div>
                <div class="guide-flow-list">
                    ${flowRows.map((row) => `
                        <article>
                            <strong>${e(row.topic)}</strong>
                            <span>${e(row.content)}</span>
                        </article>
                    `).join("")}
                </div>
            </section>

            <div class="guide-reference-grid">
                ${renderGuideTable(
                    "Ý nghĩa các Trạng thái Dev",
                    ["Dev Status", "UAT Priority", "Ý nghĩa"],
                    devRows.map((row) => [row.category, row.topic, row.content])
                )}
                <section class="guide-section guide-priority-order">
                    <div class="guide-section-head">
                        <i class="fa-solid fa-arrow-down-1-9"></i>
                        <div>
                            <h3>Thứ tự ưu tiên kiểm thử (UAT Priority)</h3>
                            <span>Theo phần cuối sheet HD_UAT</span>
                        </div>
                    </div>
                    <div class="guide-priority-steps">
                        <strong>1 = Done SIT</strong>
                        <i class="fa-solid fa-arrow-down-long"></i>
                        <strong>2 = Done UAT (Regression Test)</strong>
                    </div>
                </section>
            </div>
        </div>
    `;
}

function getPaginationState(collection, rows) {
    const pageSize = getRowsPerPage(collection);
    const totalRows = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const page = Math.min(Math.max(1, Number(ui.tablePages?.[collection] || 1)), totalPages);
    if (!ui.tablePages) ui.tablePages = {};
    if (Number(ui.tablePages[collection] || 1) !== page) ui.tablePages[collection] = page;
    const startIndex = totalRows ? (page - 1) * pageSize : 0;
    const endIndex = Math.min(totalRows, startIndex + pageSize);
    return {
        collection,
        page,
        pageSize,
        totalPages,
        totalRows,
        start: totalRows ? startIndex + 1 : 0,
        end: endIndex,
        rows: rows.slice(startIndex, endIndex)
    };
}

function getRowsPerPage(collection) {
    const value = Number(ui.tablePageSizes?.[collection]);
    return ROWS_PER_PAGE_OPTIONS.includes(value) ? value : DEFAULT_ROWS_PER_PAGE;
}

function renderPaginationSummary(pageState) {
    if (!pageState.totalRows) return "0 đang hiển thị";
    return `${e(pageState.totalRows)} kết quả · đang xem ${e(pageState.start)}-${e(pageState.end)}`;
}

function renderPaginationControls(collection, pageState) {
    if (!pageState || pageState.totalRows <= ROWS_PER_PAGE_OPTIONS[0]) return "";
    return `
        <div class="table-pagination" data-pagination-collection="${e(collection)}">
            <div class="table-page-size">
                <span>Dòng/trang</span>
                <select class="field-select compact-select" data-page-size="${e(collection)}" aria-label="Chọn số dòng mỗi trang">
                    ${ROWS_PER_PAGE_OPTIONS.map((option) => `<option value="${e(option)}" ${option === pageState.pageSize ? "selected" : ""}>${e(option)}</option>`).join("")}
                </select>
            </div>
            <div class="table-page-status">
                ${e(pageState.start)}-${e(pageState.end)} / ${e(pageState.totalRows)}
            </div>
            <div class="table-page-actions">
                <button class="icon-btn page-btn" type="button" data-action="set-table-page" data-collection="${e(collection)}" data-page="${e(pageState.page - 1)}" ${pageState.page <= 1 ? "disabled" : ""} title="Trang trước" aria-label="Trang trước">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <span>${e(pageState.page)} / ${e(pageState.totalPages)}</span>
                <button class="icon-btn page-btn" type="button" data-action="set-table-page" data-collection="${e(collection)}" data-page="${e(pageState.page + 1)}" ${pageState.page >= pageState.totalPages ? "disabled" : ""} title="Trang sau" aria-label="Trang sau">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;
}

function resetTablePage(collection) {
    if (!collection) return;
    ui.tablePages = {
        ...(ui.tablePages || {}),
        [collection]: 1
    };
}

function setTablePage(collection, page) {
    if (!collection) return;
    ui.tablePages = {
        ...(ui.tablePages || {}),
        [collection]: Math.max(1, Number(page) || 1)
    };
    render();
}

function setRowsPerPage(collection, pageSize) {
    const value = Number(pageSize);
    if (!collection || !ROWS_PER_PAGE_OPTIONS.includes(value)) return;
    ui.tablePageSizes = {
        ...(ui.tablePageSizes || {}),
        [collection]: value
    };
    resetTablePage(collection);
    render();
}

function renderGuideTable(title, headers, rows) {
    return `
        <section class="guide-section">
            <div class="guide-section-head">
                <i class="fa-solid fa-bookmark"></i>
                <div>
                    <h3>${e(title)}</h3>
                    <span>${e(rows.length)} mục tham chiếu</span>
                </div>
            </div>
            <div class="guide-table-wrap">
                <table class="guide-table">
                    <thead>
                        <tr>${headers.map((header) => `<th>${e(header)}</th>`).join("")}</tr>
                    </thead>
                    <tbody>
                        ${rows.map((row) => `
                            <tr>${row.map((cell) => `<td>${e(cell || "-")}</td>`).join("")}</tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </section>
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
    return rows.map((row) => ({ ...row }));
}

function defaultGuideRows() {
    const rows = [
        ["Hướng dẫn", 1, "Cập nhật lịch bàn giao", "Vào sheet Lich_BG_US"],
        ["Hướng dẫn", 2, "Phân công Tester", "Vào sheet PhanCong_UAT, đánh dấu ✓ cho T1-T6. Mô hình mặc định đã luân chuyển 2 Tester/Story."],
        ["Hướng dẫn", 3, "Theo dõi hằng ngày", "Vào sheet DieuHanh_Ngay để nhập số TC đã chạy, TC đạt, lỗi, blocker và người xử lý."],
        ["Hướng dẫn", 4, "Đánh giá hằng tuần", "Sheet ChatLuong_Tuan tổng hợp Quality Gate theo tuần/Sprint."],
        ["Hướng dẫn", 5, "Kết thúc Sprint", "Sheet TongKet_Sprint tự tính GO / CONDITIONAL GO / NO GO theo coverage, pass rate và lỗi mở."],
        ["Hướng dẫn", 6, "Đào tạo chéo", "Sheet NangSuat_UAT theo dõi mức độ mỗi Tester tham gia các nhóm chức năng để hình thành giảng viên nội bộ."],
        ["Hướng dẫn", 7, "Báo cáo lãnh đạo", "Sheet Dashboard_UAT là bảng điều hành tổng hợp cho Squad Leader."],
        ["Cập nhật mới", 1, "Lịch bàn giao theo User Story", "Sử dụng sheet Lich_BG_US để nhập ngày bàn giao UAT riêng cho từng US; DM_ChucNang tự động lấy ngày từ sheet này."],
        ["Nguyên tắc", 2, "Không dùng lịch Sprint làm ngày bàn giao chính", "Trong cùng Sprint, mỗi US có thể có ngày bàn giao khác nhau."],
        ["Cột cần nhập", 3, "Lich_BG_US!G:G", "Ngày bàn giao UAT theo US"],
        ["Cột tự động", 4, "DM_ChucNang!W:Y", "Ngày bàn giao/bắt đầu/kết thúc UAT tự động theo Mã Jira"],
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
    const includeActions = !mod.readOnly;
    const colgroup = layout.columns.map(({ col, width }) => (
        `<col data-column-key="${e(col.key)}" style="width:${e(`${width}px`)}">`
    )).join("") + (includeActions ? `<col data-column-key="${e(ACTION_COLUMN_KEY)}" style="width:${e(`${layout.actionWidth}px`)}">` : "");
    const columnMeta = layout.columnMeta;
    const hasGroupedHeaders = mod.columns.some((col) => col.headerTop);
    const tableClass = ["data-table", hasGroupedHeaders ? "has-group-header" : "", mod.compactTable ? "is-compact" : "", mod.stickyColumns ? "has-sticky-columns" : ""]
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
                    ${renderTableHeaderRows(mod, columnMeta, hasGroupedHeaders, includeActions)}
                </thead>
                <tbody>
                    ${rows.length ? renderTableRows(mod, rows, columnMeta, includeActions) : `
                        <tr>
                            <td colspan="${mod.columns.length + (includeActions ? 1 : 0)}">
                                ${renderEmpty(mod.emptyIcon, mod.emptyTitle, mod.emptyText, true, mod.readOnly ? null : mod)}
                            </td>
                        </tr>
                    `}
                </tbody>
            </table>
            </div>
        </div>
    `;
}

function renderTableHeaderRows(mod, columnMeta, hasGroupedHeaders, includeActions = true) {
    const labelRowClass = hasGroupedHeaders ? ` class="excel-header-label"` : "";
    const labelRow = `
        <tr${labelRowClass}>
            ${mod.columns.map((col, index) => renderTableHeaderCell(mod, col, columnMeta[index])).join("")}
            ${includeActions ? renderActionHeaderCell() : ""}
        </tr>
    `;
    if (!hasGroupedHeaders) return labelRow;
    return `
        <tr class="excel-header-top">
            ${mod.columns.map((col, index) => renderTableTopHeaderCell(col, columnMeta[index])).join("")}
            ${includeActions ? `<th class="col-actions excel-header-top-action" aria-hidden="true"></th>` : ""}
        </tr>
        ${labelRow}
    `;
}

function renderTableTopHeaderCell(col, meta) {
    const label = col.headerTop || "";
    const extraClass = `excel-header-top-cell ${label ? "has-label" : "is-empty"}`;
    return `
        <th${tableCellAttrs(meta, extraClass)}>
            ${label ? `<span class="excel-header-top-label">${e(label)}</span>` : ""}
        </th>
    `;
}

function renderActionHeaderCell() {
    return `
        <th class="col-actions">
            <span>Thao tác</span>
            ${renderColumnResizeHandle(ACTION_COLUMN_KEY, "Thao tác")}
        </th>
    `;
}

function renderTableRows(mod, rows, columnMeta, includeActions = true) {
    let currentSection = null;
    let currentSections = [];
    return rows.map((row) => {
        const section = mod.sectionKey ? String(row[mod.sectionKey] || "").trim() : "";
        const sections = Array.isArray(mod.sectionKeys) ? mod.sectionKeys.map((key) => String(row[key] || "").trim()) : [];
        let sectionMarkup = "";
        if (sections.length) {
            let parentChanged = false;
            sections.forEach((nestedSection, index) => {
                const changed = nestedSection && (parentChanged || nestedSection !== currentSections[index]);
                if (changed) sectionMarkup += renderSectionRow(mod, nestedSection, index + 1);
                if (nestedSection !== currentSections[index]) parentChanged = true;
            });
            currentSections = sections;
        } else {
            sectionMarkup = section && section !== currentSection ? renderSectionRow(mod, section) : "";
        }
        if (section) currentSection = section;
        const actionCell = includeActions ? (mod.collection === "workItems" ? renderWorkItemActionCell(row) : renderDefaultActionCell(row)) : "";
        return `
            ${sectionMarkup}
                            <tr>
                                ${mod.columns.map((col, index) => `<td${tableCellAttrs(columnMeta[index])}>${renderCell(row, col)}</td>`).join("")}
                                ${actionCell}
                            </tr>
                        `;
    }).join("");
}

function renderDefaultActionCell(row) {
    const canEdit = canModifyRecord(row);
    const canDelete = canDeleteRecord(row);
    const owner = recordOwnerLabel(row);
    return `
        <td class="col-actions">
            <div class="row-actions">
                ${canEdit ? `
                    <button class="icon-btn" data-action="open-edit" data-id="${e(row.id)}" title="Sửa" aria-label="Sửa">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                ` : ""}
                ${canDelete ? `
                    <button class="icon-btn" data-action="delete-row" data-id="${e(row.id)}" title="Xóa" aria-label="Xóa">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                ` : ""}
                ${!canEdit && !canDelete ? `
                    <span class="permission-lock" title="Bản ghi do ${e(owner)} tạo. Chỉ người tạo hoặc admin được sửa.">
                        <i class="fa-solid fa-lock"></i>
                    </span>
                ` : ""}
            </div>
        </td>
    `;
}

function renderWorkItemActionCell(row) {
    const canManage = canFullyManageWorkItem(row);
    const canProgress = canUpdateWorkItemProgress(row);
    const canDelete = canManage && canDeleteRecord(row);
    const owner = recordOwnerLabel(row);
    return `
        <td class="col-actions">
            <div class="row-actions">
                ${canManage ? `
                    <button class="icon-btn" data-action="open-edit" data-id="${e(row.id)}" title="Sửa kế hoạch" aria-label="Sửa kế hoạch">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                ` : ""}
                ${canProgress ? `
                    <button class="icon-btn work-progress-btn" data-action="open-work-progress" data-id="${e(row.id)}" title="Cập nhật tiến độ" aria-label="Cập nhật tiến độ">
                        <i class="fa-solid fa-clipboard-check"></i>
                    </button>
                ` : ""}
                ${canDelete ? `
                    <button class="icon-btn" data-action="delete-row" data-id="${e(row.id)}" title="Xóa đầu việc" aria-label="Xóa đầu việc">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                ` : ""}
                ${!canManage && !canProgress ? `
                    <span class="permission-lock" title="Đầu việc do ${e(owner)} tạo. Bạn chỉ xem được khi không phải người phụ trách.">
                        <i class="fa-solid fa-lock"></i>
                    </span>
                ` : ""}
            </div>
        </td>
    `;
}

function renderTableHeaderCell(mod, col, meta) {
    const key = columnFilterKey(mod, col);
    const value = ui.columnFilters[key] || "";
    const isOpen = ui.openColumnFilter === key;
    const computed = isComputedField(mod.collection, col.key);
    return `
        <th${tableCellAttrs(meta, isOpen ? "filter-open" : "")}>
            <div class="th-control" data-column-filter-shell="${e(key)}">
                <span class="th-label" title="${e(col.label)}">${e(col.label)}</span>
                ${computed ? `<span class="computed-chip" title="Tự tính theo công thức Excel">Tự tính</span>` : ""}
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

function renderSectionRow(mod, section, level = 1) {
    return `
        <tr class="section-row section-level-${e(level)}">
            <td class="section-title-cell" colspan="${e(mod.columns.length + (mod.readOnly ? 0 : 1))}">
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
    const actionWidth = mod.readOnly ? 0 : (getStoredColumnWidth(mod, ACTION_COLUMN_KEY) || ACTION_COLUMN_DEFAULT_WIDTH);
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
                ${options.map((option) => `<option value="${e(option)}" ${String(option) === String(value) ? "selected" : ""}>${e(formatModuleFilterOption(mod, col, option))}</option>`).join("")}
            </select>
        `;
    }
    return `
        <input id="${e(inputId)}" class="column-filter" data-column-filter="${e(col.key)}"${autofocusAttr} value="${e(value)}" placeholder="Lọc" aria-label="Lọc ${e(col.label)}">
    `;
}

function renderModal() {
    if (!ui.modal) return `<div class="modal-backdrop" id="recordModal"></div>`;
    if (ui.modal.mode === "work-progress") return renderWorkProgressModal();
    const mod = modules[ui.modal.tab];
    const row = ui.modal.id
        ? appState[mod.collection].find((item) => item.id === ui.modal.id)
        : null;
    const title = row ? `Sửa ${mod.shortLabel}` : `Thêm ${mod.shortLabel}`;
    const editableFields = getEditableFields(mod);
    const computedCount = Math.max(0, mod.fields.length - editableFields.length);
    const requiredFields = editableFields.filter((field) => field.required);
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
                            ${editableFields.map((field) => renderField(field, row)).join("")}
                            ${mod.collection === "workItems" ? renderWorkStatusProgressWarning() : ""}
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
                            ${computedCount ? `
                                <div class="rail-card">
                                    <span>Tự tính</span>
                                    <strong>${e(computedCount)}</strong>
                                    <small>Backend cập nhật theo công thức Excel sau khi lưu.</small>
                                </div>
                            ` : ""}
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

function renderWorkProgressModal() {
    const row = getWorkRowsForDisplay().find((item) => item.id === ui.modal.id);
    if (!row) return `<div class="modal-backdrop" id="recordModal"></div>`;
    const progress = row.progress === "" || row.progress == null ? 0 : clamp(row.progress);
    return `
        <div class="modal-backdrop open" id="recordModal" role="dialog" aria-modal="true">
            <form class="modal work-progress-modal" id="recordForm">
                <div class="modal-head">
                    <div class="modal-title">
                        <span><i class="fa-solid fa-clipboard-check"></i></span>
                        <div>
                            <h2>Cập nhật tiến độ</h2>
                            <p>${e(row.title || "Đầu việc")} · ${e(row.categoryName || "Chưa phân nhóm")}</p>
                        </div>
                    </div>
                    <button class="icon-btn" type="button" data-action="close-modal" title="Đóng" aria-label="Đóng">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="record-form-layout work-progress-layout">
                        <div class="form-grid work-progress-form">
                            <div class="field">
                                <label>Trạng thái</label>
                                <select class="field-select" name="status">
                                    ${workStatusOptions.map((option) => `
                                        <option value="${e(option)}" ${String(option) === String(row.status || "") ? "selected" : ""}>${e(option)}</option>
                                    `).join("")}
                                </select>
                            </div>
                            <div class="field">
                                <label>% hoàn thành</label>
                                <input class="field-input" name="progress" type="number" min="0" max="100" step="1" value="${e(progress)}">
                            </div>
                            <div class="field">
                                <label>Ngày hoàn thành thực tế</label>
                                <input class="field-input" name="completedDate" type="date" value="${e(row.completedDate || "")}">
                            </div>
                            <div class="field full">
                                <label>Link tài liệu / kết quả</label>
                                <input class="field-input" name="documentUrl" type="url" value="${e(row.documentUrl || "")}" placeholder="https://...">
                            </div>
                            <div class="field full">
                                <label>Vướng mắc / ghi chú</label>
                                <textarea class="field-textarea" name="note" placeholder="Ghi vướng mắc, kết quả xử lý hoặc nội dung cần sếp hỗ trợ">${e(row.note || "")}</textarea>
                            </div>
                            ${renderWorkStatusProgressWarning()}
                        </div>
                        <aside class="record-rail">
                            <div class="rail-card">
                                <span>Công việc</span>
                                <strong>${e(row.title || "-")}</strong>
                                <small>${e(row.description || row.categoryName || "")}</small>
                            </div>
                            <div class="rail-card">
                                <span>Người thực hiện</span>
                                <strong>${e(row.assignee || "-")}</strong>
                                <small>${e(row.assigneeEmail || "Không có email")}</small>
                            </div>
                            <div class="rail-card ${getWorkItemWarning(row) === "Quá hạn" ? "is-danger" : ""}">
                                <span>Deadline</span>
                                <strong>${e(formatDate(row.dueDate) || "-")}</strong>
                                <small>${e(getWorkItemWarning(row))}</small>
                            </div>
                        </aside>
                    </div>
                </div>
                <div class="modal-foot">
                    <button class="ghost-btn" type="button" data-action="close-modal">Hủy</button>
                    <button class="primary-btn" type="submit" data-save-mode="close">
                        <i class="fa-solid fa-floppy-disk"></i><span>Lưu tiến độ</span>
                    </button>
                </div>
            </form>
        </div>
    `;
}

function renderWorkStatusProgressWarning() {
    return `
        <div class="work-status-warning field full" data-work-status-warning role="alert" aria-live="polite" hidden>
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span></span>
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
    if (ui.aiChatOpen) {
        return `
            <div class="floating-hub ai-open">
                ${renderAiChatPanel()}
            </div>
        `;
    }
    if (!ui.groupChatOpen) {
        return `
            <div class="floating-hub">
                <button class="ai-fab" type="button" data-ai-action="open" title="AI Chat dữ liệu UAT" aria-label="AI Chat dữ liệu UAT">
                    ${renderAiSparkSvg()}
                </button>
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

function renderAiChatPanel() {
    return `
        <section class="group-chat-panel ai-chat-panel" aria-label="AI Chat dữ liệu UAT">
            <div class="group-chat-head ai-chat-head">
                <div class="ai-head-main">
                    <span class="ai-head-icon">${renderAiSparkSvg()}</span>
                    <div>
                        <h2>AI Chat UAT</h2>
                        <span>${aiChatState.error ? e(aiChatState.error) : "Trợ lý hỏi đáp theo dữ liệu Squad 2 đang có trong hệ thống."}</span>
                    </div>
                </div>
                <div class="group-chat-actions">
                    <span class="ai-model-pill">Gemini 2.5 Flash</span>
                    <button class="icon-btn" type="button" data-ai-action="clear" title="Xóa hội thoại" aria-label="Xóa hội thoại">
                        <i class="fa-solid fa-broom"></i>
                    </button>
                    <button class="icon-btn" type="button" data-ai-action="close" title="Đóng" aria-label="Đóng">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>
            <div class="group-chat-body ai-chat-body" id="aiChatBody">
                ${renderAiChatMessages()}
            </div>
            <form class="group-chat-compose ai-chat-compose" id="aiChatForm">
                <textarea id="aiChatInput" class="group-chat-input" name="message" maxlength="2000" rows="2" placeholder="Hỏi AI về dashboard, sprint, tester, defect..." ${aiChatState.sending ? "disabled" : ""}>${e(ui.aiChatDraft)}</textarea>
                <button class="primary-btn group-chat-send ai-chat-send" type="submit" ${aiChatState.sending ? "disabled" : ""} title="Gửi">
                    <i class="fa-solid fa-paper-plane"></i><span>${aiChatState.sending ? "Đang hỏi" : "Gửi"}</span>
                </button>
            </form>
        </section>
    `;
}

function renderAiChatMessages() {
    const messages = aiChatState.messages || [];
    if (!messages.length && !aiChatState.sending) {
        return `
            <div class="group-chat-empty ai-chat-empty">
                <span class="ai-empty-icon">${renderAiSparkSvg()}</span>
                <strong>Hỏi nhanh dữ liệu UAT</strong>
                <span>AI có thể đọc dashboard, phân công, bàn giao US, defect, chất lượng tuần và tổng kết sprint.</span>
                <div class="ai-prompt-grid">
                    ${renderAiPromptChip("Sprint nào đang thiếu tester?")}
                    ${renderAiPromptChip("Tổng testcase hiện tại là bao nhiêu?")}
                    ${renderAiPromptChip("CN001 đang bàn giao đến đâu?")}
                    ${renderAiPromptChip("Những US nào chưa bàn giao?")}
                </div>
            </div>
        `;
    }
    return `
        ${messages.map((message) => {
            const isOwn = message.role === "user";
            return `
                <article class="group-chat-message ai-chat-message ${isOwn ? "own" : ""}">
                    <div class="group-chat-avatar ai-chat-avatar ${isOwn ? "user" : ""}">
                        ${isOwn ? e(userInitials(authState.user)) : renderAiSparkSvg()}
                    </div>
                    <div class="group-chat-bubble">
                        <div class="group-chat-meta">
                            <strong>${isOwn ? "Bạn" : "AI dữ liệu UAT"}</strong>
                            <span>${e(formatShortDateTime(message.createdAt))}</span>
                        </div>
                        <p>${e(message.body)}</p>
                    </div>
                </article>
            `;
        }).join("")}
        ${aiChatState.sending ? `
            <article class="group-chat-message ai-chat-message">
                <div class="group-chat-avatar ai-chat-avatar">${renderAiSparkSvg()}</div>
                <div class="group-chat-bubble ai-typing">
                    <span></span><span></span><span></span>
                </div>
            </article>
        ` : ""}
    `;
}

function renderAiSparkSvg() {
    return `
        <svg class="ai-bot-svg" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <path class="ai-bot-core" d="M16 4.5a2 2 0 0 1 2 2v1.1h2.4a6.6 6.6 0 0 1 6.6 6.6v5.2a6.6 6.6 0 0 1-6.6 6.6h-8.1l-4.9 3.1v-3.4A6.6 6.6 0 0 1 5 19.4v-5.2a6.6 6.6 0 0 1 6.6-6.6H14V6.5a2 2 0 0 1 2-2Z"></path>
            <path class="ai-bot-face" d="M11.8 16.1a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Zm8.4 0a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4ZM12.2 20.1c1 .9 2.2 1.3 3.8 1.3s2.8-.4 3.8-1.3"></path>
            <path class="ai-bot-spark" d="M25.6 5.3l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8.8-2.1Z"></path>
        </svg>
    `;
}

function renderAiPromptChip(prompt) {
    return `<button class="ai-prompt-chip" type="button" data-ai-prompt="${e(prompt)}">${e(prompt)}</button>`;
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
    const initials = words.slice(-2).map((word) => word[0]).join("");
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

function renderComboOptions(options) {
    return options.map((option) => `
        <button class="combo-option" type="button" data-combo-option="${e(option)}">${e(option)}</button>
    `).join("");
}

function renderField(field, row) {
    const selfAssignmentField = ui.modal?.tab === "workItems"
        && authState.user?.role !== "admin"
        && ["assignee", "assigneeEmail"].includes(field.key);
    const selfAssignmentValue = field.key === "assignee"
        ? authState.user?.name || authState.user?.username || ""
        : authState.user?.email || authState.user?.username || "";
    const value = selfAssignmentField ? selfAssignmentValue : row ? row[field.key] ?? "" : getDefaultFieldValue(field);
    const lockedWorkStartDate = ui.modal?.tab === "workItems"
        && field.key === "startDate"
        && Boolean(row)
        && row?._canBackfillStartDate !== true;
    const required = field.required ? "required" : "";
    const label = e(field.label);
    const wrapper = `field ${field.full ? "full" : ""}`;
    let control = "";
    if (selfAssignmentField) {
        control = `<input class="field-input" name="${e(field.key)}" type="text" value="${e(value)}" readonly aria-readonly="true">`;
    } else if (lockedWorkStartDate) {
        control = `<input class="field-input is-locked" name="${e(field.key)}" type="date" value="${e(value)}" readonly aria-readonly="true" data-locked-start-date>`;
    } else if (field.type === "select") {
        const options = getFieldOptions(field);
        control = `
            <select class="field-select" name="${e(field.key)}" ${required}>
                <option value=""></option>
                ${options.map((option) => `
                    <option value="${e(optionValue(option))}" ${String(optionValue(option)) === String(value) ? "selected" : ""}>${e(optionLabel(option))}</option>
                `).join("")}
            </select>
        `;
    } else if (field.type === "combo") {
        const options = getFieldOptions(field, row);
        control = `
            <div class="combo-field" data-combo-field data-combo-key="${e(field.key)}"${field.dependsOn ? ` data-combo-depends-on="${e(field.dependsOn)}"` : ""}>
                <div class="combo-control">
                    <input class="field-input combo-input" name="${e(field.key)}" type="text" value="${e(value)}" autocomplete="off" spellcheck="false" data-combo-input ${required}>
                    <button class="combo-toggle" type="button" data-combo-toggle title="Mở danh sách ${label}" aria-label="Mở danh sách ${label}">
                        <i class="fa-solid fa-chevron-down"></i>
                    </button>
                </div>
                <div class="combo-menu" data-combo-menu>
                    ${renderComboOptions(options)}
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
            ${lockedWorkStartDate ? `<small class="field-lock-note"><i class="fa-solid fa-lock"></i> Đã khóa sau khi tạo công việc.</small>` : ""}
        </div>
    `;
}

function bindWorkItemFormHelpers(form) {
    if (ui.modal?.tab !== "workItems") return;
    bindWorkStatusProgressValidation(form);
    if (ui.modal?.mode === "work-progress") return;
    const categorySelect = form.elements.categoryId;
    const taskInput = form.elements.taskId;
    const assigneeSelect = form.elements.assignee;
    const emailInput = form.elements.assigneeEmail;
    if (categorySelect && taskInput && !ui.modal.id) {
        categorySelect.addEventListener("change", () => {
            const current = String(taskInput.value || "").trim();
            if (current && !/^SQ2-T\d{2}-\d{3}$/i.test(current)) return;
            taskInput.value = categorySelect.value ? getNextWorkItemTaskIdForCategory(categorySelect.value) : "";
        });
    }
    if (assigneeSelect && emailInput) {
        assigneeSelect.addEventListener("change", () => {
            const suggestedEmail = emailForWorkAssignee(assigneeSelect.value);
            const currentEmail = String(emailInput.value || "").trim();
            const knownEmails = new Set(Object.values(workAssigneeEmailByName));
            if (suggestedEmail && (!currentEmail || knownEmails.has(currentEmail))) {
                emailInput.value = suggestedEmail;
            }
        });
    }
}

function expectedWorkStatusForProgress(value) {
    const blank = value == null || String(value).trim() === "";
    const progress = blank ? 0 : Number(value);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) return null;
    if (progress === 0) return "Chưa bắt đầu";
    if (progress < 100) return "Đang thực hiện";
    return "Hoàn thành";
}

function getWorkStatusProgressIssue(status, progress) {
    const expectedStatus = expectedWorkStatusForProgress(progress);
    if (!expectedStatus) return "% hoàn thành phải nằm trong khoảng 0-100%.";
    if (String(status || "").trim() === expectedStatus) return "";
    const progressLabel = progress == null || String(progress).trim() === "" ? "0 hoặc để trống" : `${progress}%`;
    return `${progressLabel} chỉ hợp lệ với trạng thái “${expectedStatus}”.`;
}

function bindWorkStatusProgressValidation(form) {
    const statusInput = form.elements.status;
    const progressInput = form.elements.progress;
    const warning = form.querySelector("[data-work-status-warning]");
    if (!statusInput || !progressInput || !warning) return;
    const warningText = warning.querySelector("span");
    const submitButtons = [...form.querySelectorAll('button[type="submit"]')];
    const updateValidation = () => {
        const issue = getWorkStatusProgressIssue(statusInput.value, progressInput.value);
        const invalid = Boolean(issue);
        for (const input of [statusInput, progressInput]) {
            input.classList.toggle("is-invalid", invalid);
            input.setAttribute("aria-invalid", invalid ? "true" : "false");
        }
        warning.hidden = !invalid;
        if (warningText) warningText.textContent = issue;
        submitButtons.forEach((button) => {
            button.disabled = invalid;
            button.setAttribute("aria-disabled", invalid ? "true" : "false");
        });
    };
    statusInput.addEventListener("change", updateValidation);
    progressInput.addEventListener("input", updateValidation);
    progressInput.addEventListener("change", updateValidation);
    updateValidation();
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

    document.querySelectorAll("[data-route]").forEach((button) => {
        button.addEventListener("click", () => navigateToRoute(button.dataset.route, { push: true }));
    });

    document.querySelectorAll("[data-tab]").forEach((button) => {
        button.addEventListener("click", () => {
            ui.activeTab = button.dataset.tab;
            ui.query = "";
            ui.openColumnFilter = null;
            const mod = modules[ui.activeTab];
            if (mod) resetTablePage(mod.collection);
            history.replaceState(null, "", `#${ui.activeTab}`);
            requestActiveTabScroll();
            render();
        });
    });

    document.querySelectorAll("[data-action]").forEach((button) => {
        button.addEventListener("click", handleAction);
    });

    document.querySelectorAll("[data-chat-action]").forEach((button) => {
        button.addEventListener("click", handleChatAction);
    });

    document.querySelectorAll("[data-ai-action]").forEach((button) => {
        button.addEventListener("click", handleAiAction);
    });

    document.querySelectorAll("[data-ai-prompt]").forEach((button) => {
        button.addEventListener("click", () => {
            ui.aiChatDraft = button.dataset.aiPrompt || "";
            const input = document.getElementById("aiChatInput");
            if (input) {
                input.value = ui.aiChatDraft;
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        });
    });

    const aiChatForm = document.getElementById("aiChatForm");
    if (aiChatForm) aiChatForm.addEventListener("submit", handleAiChatSubmit);

    const aiChatInput = document.getElementById("aiChatInput");
    if (aiChatInput) {
        aiChatInput.addEventListener("input", (event) => {
            ui.aiChatDraft = event.target.value;
        });
        aiChatInput.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" || event.shiftKey) return;
            event.preventDefault();
            aiChatForm?.requestSubmit();
        });
    }
    const aiChatBody = document.getElementById("aiChatBody");
    if (aiChatBody) aiChatBody.scrollTop = aiChatBody.scrollHeight;

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
            const mod = modules[ui.activeTab];
            ui.query = event.target.value;
            if (mod) resetTablePage(mod.collection);
            render();
        });
    }

    document.querySelectorAll("[data-filter-key]").forEach((select) => {
        select.addEventListener("change", (event) => {
            const mod = modules[ui.activeTab];
            const key = `${mod.collection}:${event.target.dataset.filterKey}`;
            ui.filters[key] = event.target.value;
            resetTablePage(mod.collection);
            render();
        });
    });

    document.querySelectorAll("[data-column-filter]").forEach((input) => {
        const updateColumnFilter = (event) => {
            const mod = modules[ui.activeTab];
            if (!mod) return;
            ui.columnFilters[columnFilterKey(mod, { key: event.target.dataset.columnFilter })] = event.target.value;
            resetTablePage(mod.collection);
            render();
        };
        input.addEventListener(input.tagName === "SELECT" ? "change" : "input", updateColumnFilter);
    });

    document.querySelectorAll("[data-page-size]").forEach((select) => {
        select.addEventListener("change", (event) => {
            setRowsPerPage(event.target.dataset.pageSize, event.target.value);
        });
    });

    bindColumnResizeEvents();
    fitTableHeadersToLabels();
    bindTableScrollbars();

    bindComboFields();

    const form = document.getElementById("recordForm");
    if (form) {
        bindWorkItemFormHelpers(form);
        form.addEventListener("submit", handleSubmit);
    }

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

        const collection = table.dataset.resizableTable || ui.activeTab;
        spacer.style.width = `${getTableRenderedWidth(table)}px`;
        table.style.setProperty("--table-view-width", `${main.clientWidth}px`);
        syncStickyColumnOffsets(table);
        restoreTableScrollLeft(collection, top, main);
        let syncing = false;
        const syncScroll = (source, target) => {
            if (syncing) return;
            syncing = true;
            target.scrollLeft = source.scrollLeft;
            rememberTableScrollLeft(collection, source.scrollLeft);
            requestAnimationFrame(() => {
                syncing = false;
            });
        };

        top.addEventListener("scroll", () => syncScroll(top, main));
        main.addEventListener("scroll", () => syncScroll(main, top));
    });
}

function restoreTableScrollLeft(collection, top, main) {
    const desired = Number(ui.tableScrollLefts?.[collection] || 0);
    const maxScrollLeft = Math.max(0, main.scrollWidth - main.clientWidth);
    const nextScrollLeft = Math.min(Math.max(0, desired), maxScrollLeft);
    main.scrollLeft = nextScrollLeft;
    top.scrollLeft = nextScrollLeft;
    requestAnimationFrame(() => {
        main.scrollLeft = nextScrollLeft;
        top.scrollLeft = nextScrollLeft;
    });
}

function rememberTableScrollLeft(collection, scrollLeft) {
    if (!collection) return;
    const nextScrollLeft = Math.max(0, Math.round(Number(scrollLeft || 0)));
    if (ui.tableScrollLefts?.[collection] === nextScrollLeft) return;
    ui.tableScrollLefts = {
        ...(ui.tableScrollLefts || {}),
        [collection]: nextScrollLeft
    };
    saveTableScrollLefts();
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
    if (!table) return;
    const mod = Object.values(modules).find((item) => item.collection === table.dataset.resizableTable);
    const configuredCount = Math.min(Number(mod?.stickyColumns || 0), Number(mod?.columns?.length || 0));
    const scrollViewport = table.closest('[data-table-scrollbar="main"]');
    const viewportWidth = Number(scrollViewport?.clientWidth || 0);
    const stickyWidthBudget = Math.max(0, Math.min(
        640,
        viewportWidth * 0.48,
        viewportWidth - 280
    ));
    const offsets = [];
    let stickyCount = 0;
    let stickyWidth = 0;

    for (let index = 0; index < configuredCount; index += 1) {
        const col = getTableColumnElement(table, mod.columns[index]?.key);
        const width = getTableColumnWidth(col);
        if (!width || stickyWidth + width > stickyWidthBudget) break;
        offsets[index] = stickyWidth;
        stickyWidth += width;
        stickyCount += 1;
    }

    table.querySelectorAll("[data-column-index]").forEach((cell) => {
        const index = Number(cell.dataset.columnIndex);
        const sticky = Number.isInteger(index) && index < stickyCount;
        cell.classList.toggle("sticky-col", sticky);
        cell.classList.toggle("sticky-boundary", sticky && index === stickyCount - 1);
        if (sticky) {
            cell.style.left = `${offsets[index]}px`;
        } else {
            cell.style.removeProperty("left");
        }
    });
    table.classList.toggle("has-sticky-columns", stickyCount > 0);
    table.dataset.stickyColumnCount = String(stickyCount);
}

function formatModuleFilterOption(mod, col, value) {
    if (mod?.collection === "daily" && col?.key === "tester") return formatDailyTesterLabel(value);
    if (mod?.collection === "daily" && col?.key === "date") return formatDateText(value);
    return value;
}

function syncResponsiveTables() {
    document.querySelectorAll("[data-resizable-table]").forEach((table) => {
        const main = table.closest('[data-table-scrollbar="main"]');
        if (main) table.style.setProperty("--table-view-width", `${main.clientWidth}px`);
        syncStickyColumnOffsets(table);
    });
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
            handleComboDependencyChange(combo);
        });
        input?.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                combo.classList.remove("open");
                input.blur();
            }
        });

        combo.addEventListener("click", (event) => {
            const option = event.target.closest("[data-combo-option]");
            if (!option || !combo.contains(option)) return;
            input.value = option.dataset.comboOption || option.textContent.trim();
            combo.classList.remove("open");
            input.focus();
            handleComboDependencyChange(combo);
        });
    });
}

function handleComboDependencyChange(combo) {
    const sourceKey = combo?.dataset?.comboKey;
    if (!sourceKey) return;
    document.querySelectorAll("[data-combo-field][data-combo-depends-on]").forEach((dependent) => {
        if (dependent.dataset.comboDependsOn !== sourceKey) return;
        const dependentKey = dependent.dataset.comboKey;
        const input = dependent.querySelector("[data-combo-input]");
        const options = getDependentComboOptions(dependentKey, sourceKey, combo.querySelector("[data-combo-input]")?.value || "");
        const menu = dependent.querySelector("[data-combo-menu]");
        if (menu) {
            menu.querySelectorAll("[data-combo-option]").forEach((option) => option.remove());
            menu.insertAdjacentHTML("afterbegin", renderComboOptions(options));
        }
        if (!String(input?.value || "").trim() && options.length === 1) {
            input.value = options[0];
        }
        filterComboOptions(dependent);
    });
}

function getDependentComboOptions(dependentKey, sourceKey, sourceValue) {
    if (dependentKey === "sectionLevel2" && sourceKey === "sectionLevel1") {
        return getHandoffLevel2Options(sourceValue);
    }
    return [];
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

async function hydrateAccountDirectory() {
    try {
        const data = await requestJson("/directory/users", { skipAuthRedirect: true });
        accountDirectory = Array.isArray(data.users) ? data.users : [];
    } catch {
        accountDirectory = authState.user ? [authState.user] : [];
    }
}

async function initAuth() {
    authState = { status: "checking", user: null, error: null };
    render();
    try {
        const data = await requestJson("/auth/me", { skipAuthRedirect: true });
        authState = { status: "authenticated", user: data.user, error: null };
        render();
        await Promise.all([hydrateState(true), hydrateAccountDirectory()]);
        render();
    } catch {
        authState = { status: "guest", user: null, error: null };
        appState = emptyState();
        accountDirectory = [];
        ui.aiChatOpen = false;
        ui.aiChatDraft = "";
        ui.groupChatOpen = false;
        ui.groupChatDraft = "";
        resetAiChatState();
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
        await Promise.all([hydrateState(true), hydrateAccountDirectory()]);
        render();
    } catch (error) {
        authState = { status: "guest", user: null, error: error.message || "Không đăng nhập được." };
        appState = emptyState();
        accountDirectory = [];
        ui.aiChatOpen = false;
        ui.aiChatDraft = "";
        ui.groupChatOpen = false;
        ui.groupChatDraft = "";
        resetAiChatState();
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
    accountDirectory = [];
    localStorage.removeItem(STORAGE_KEY);
    ui.modal = null;
    ui.profileOpen = false;
    ui.aiChatOpen = false;
    ui.aiChatDraft = "";
    ui.groupChatOpen = false;
    ui.groupChatDraft = "";
    ui.workView = "all";
    ui.profileAvatarDraft = null;
    ui.query = "";
    ui.filters = {};
    ui.columnFilters = {};
    ui.openColumnFilter = null;
    resetAiChatState();
    resetGroupChatState();
    render();
}

async function handleAiAction(event) {
    const action = event.currentTarget.dataset.aiAction;
    if (action === "open") {
        ui.aiChatOpen = true;
        ui.groupChatOpen = false;
        render();
        return;
    }
    if (action === "close") {
        ui.aiChatOpen = false;
        render();
        return;
    }
    if (action === "clear") {
        resetAiChatState();
        ui.aiChatDraft = "";
        render();
    }
}

async function handleAiChatSubmit(event) {
    event.preventDefault();
    if (aiChatState.sending) return;
    const form = event.currentTarget;
    const message = (form.elements.message?.value || "").trim();
    ui.aiChatDraft = message;
    if (!message) {
        showToast("Vui lòng nhập câu hỏi cho AI.");
        return;
    }

    const history = (aiChatState.messages || [])
        .slice(-AI_CHAT_HISTORY_LIMIT)
        .map(({ role, body }) => ({ role, body }));
    const now = new Date().toISOString();
    aiChatState.messages = [
        ...aiChatState.messages,
        { role: "user", body: message, createdAt: now }
    ].slice(-AI_CHAT_HISTORY_LIMIT * 2);
    aiChatState.sending = true;
    aiChatState.error = null;
    ui.aiChatDraft = "";
    render();

    try {
        const data = await requestJson("/ai/chat", {
            method: "POST",
            body: JSON.stringify({ message, history })
        });
        const answer = String(data.answer || "").trim() || "AI chưa trả về nội dung.";
        aiChatState.messages = [
            ...aiChatState.messages,
            { role: "assistant", body: answer, createdAt: new Date().toISOString() }
        ].slice(-AI_CHAT_HISTORY_LIMIT * 2);
        aiChatState.error = null;
    } catch (error) {
        const messageText = error.message || "Không hỏi được AI.";
        aiChatState.error = messageText;
        aiChatState.messages = [
            ...aiChatState.messages,
            { role: "assistant", body: messageText, createdAt: new Date().toISOString() }
        ].slice(-AI_CHAT_HISTORY_LIMIT * 2);
        showToast(messageText);
    } finally {
        aiChatState.sending = false;
        render();
    }
}

function resetAiChatState() {
    aiChatState = {
        messages: [],
        sending: false,
        error: null
    };
}

async function handleChatAction(event) {
    const action = event.currentTarget.dataset.chatAction;
    if (action === "open") {
        ui.aiChatOpen = false;
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

function syncCurrentUserInDirectory(user) {
    if (!user?.id) return;
    const index = accountDirectory.findIndex((account) => account.id === user.id);
    if (index >= 0) accountDirectory[index] = { ...accountDirectory[index], ...user };
    else accountDirectory.push(user);
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
        syncCurrentUserInDirectory(data.user);
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
    if (action === "open-category-create") return openWorkCategoryCreate();
    if (action === "open-category-edit") return openWorkCategoryEdit(id);
    if (action === "delete-category") return deleteWorkCategory(id);
    if (action === "set-work-category") return setWorkCategoryFilter(id);
    if (action === "set-work-view") return setWorkView(event.currentTarget.dataset.workView);
    if (action === "set-work-metric") return setWorkMetric(event.currentTarget.dataset.workView);
    if (action === "set-t01-metric") return setT01Metric(event.currentTarget.dataset.t01Tab, event.currentTarget.dataset.t01View);
    if (action === "toggle-sidebar") {
        ui.sidebarMobileOpen = !ui.sidebarMobileOpen;
        const focusSelector = ui.sidebarMobileOpen ? ".sidebar-mobile-close" : ".mobile-menu-btn";
        render();
        if (event.detail === 0) requestAnimationFrame(() => document.querySelector(focusSelector)?.focus());
        return;
    }
    if (action === "toggle-sidebar-collapse") {
        if (window.innerWidth <= 820) {
            ui.sidebarMobileOpen = false;
        } else {
            ui.sidebarCollapsed = !ui.sidebarCollapsed;
            localStorage.setItem("squad2-sidebar-collapsed", String(ui.sidebarCollapsed));
        }
        render();
        if (event.detail === 0) requestAnimationFrame(() => document.querySelector('[data-action="toggle-sidebar-collapse"]')?.focus());
        return;
    }
    if (action === "toggle-sidebar-section") {
        const section = event.currentTarget.dataset.sidebarSection;
        if (!["common", "work"].includes(section)) return;
        if (ui.sidebarCollapsed && window.innerWidth > 820) {
            ui.sidebarCollapsed = false;
            localStorage.setItem("squad2-sidebar-collapsed", "false");
            ui.sidebarOpenSection = section;
            persistSidebarAccordionState();
            render();
            return;
        }
        ui.sidebarOpenSection = ui.sidebarOpenSection === section ? null : section;
        persistSidebarAccordionState();
        applySidebarAccordionDomState();
        return;
    }
    if (action === "toggle-sidebar-group") {
        const group = event.currentTarget.dataset.sidebarGroup;
        if (!["personnel", "workGroups", "uat", "prePilot"].includes(group)) return;
        const section = group === "personnel" ? "common" : "work";
        const nestedWorkStage = ["uat", "prePilot"].includes(group);
        if (ui.sidebarCollapsed && window.innerWidth > 820) {
            ui.sidebarCollapsed = false;
            localStorage.setItem("squad2-sidebar-collapsed", "false");
            ui.sidebarOpenSection = section;
            if (nestedWorkStage) ui.sidebarOpenGroups.workGroups = true;
            ui.sidebarOpenGroups[group] = true;
            if (nestedWorkStage) ui.sidebarOpenGroups[group === "uat" ? "prePilot" : "uat"] = false;
            persistSidebarAccordionState();
            render();
            return;
        }
        ui.sidebarOpenSection = section;
        const opening = !ui.sidebarOpenGroups[group];
        if (nestedWorkStage) {
            ui.sidebarOpenGroups.workGroups = true;
            ui.sidebarOpenGroups[group === "uat" ? "prePilot" : "uat"] = false;
        }
        ui.sidebarOpenGroups[group] = opening;
        persistSidebarAccordionState();
        applySidebarAccordionDomState();
        return;
    }
    if (action === "open-kpi-config") return openKpiConfig();
    if (action === "open-member-kpi-create") return openMemberKpiInput();
    if (action === "open-member-kpi-edit") return openMemberKpiInput(id);
    if (action === "set-table-page") return setTablePage(event.currentTarget.dataset.collection, event.currentTarget.dataset.page);
    if (action === "open-work-progress") return openWorkProgress(id);
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

function openKpiConfig() {
    if (!canManageWorkPlans()) return showToast("Chỉ admin được chỉnh cấu hình KPI.");
    ui.modal = { tab: "kpiConfig", id: appState.kpiConfig?.[0]?.id || null };
    render();
}

function openMemberKpiInput(id = null) {
    if (!canManageWorkPlans()) return showToast("Chỉ admin được cập nhật dữ liệu KPI.");
    ui.modal = { tab: "memberKpiInputs", id: id || null };
    render();
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
    const mod = modules[ui.activeTab];
    if (!mod || mod.readOnly) return;
    if (mod.collection === "workItems") {
        if (!canCreateWorkItems()) {
            showToast("Bạn cần đăng nhập để thêm đầu việc.");
            return;
        }
        if (!getWorkCategories().length) {
            showToast("Tạo nhóm công việc trước rồi thêm đầu việc.");
            return;
        }
    }
    ui.modal = { tab: ui.activeTab, id: null };
    render();
}

function openEdit(id) {
    if (!id) return;
    const mod = modules[ui.activeTab];
    if (!mod || mod.readOnly) return;
    const row = mod ? appState[mod.collection].find((item) => item.id === id) : null;
    if (!row || !canModifyRecord(row)) {
        showToast("Bạn chỉ có thể sửa bản ghi do chính mình tạo.");
        return;
    }
    ui.modal = { tab: ui.activeTab, id };
    render();
}

function openWorkCategoryCreate() {
    if (!canManageWorkPlans()) {
        showToast("Chỉ admin được tạo nhóm công việc.");
        return;
    }
    ui.modal = { tab: "workCategories", id: null };
    render();
}

function openWorkCategoryEdit(id) {
    if (!id) return;
    const row = appState.workCategories.find((item) => item.id === id);
    if (!row || !canManageWorkPlans() || !canModifyRecord(row)) {
        showToast("Bạn chỉ có thể sửa nhóm do chính mình tạo hoặc dùng tài khoản admin.");
        return;
    }
    ui.modal = { tab: "workCategories", id };
    render();
}

function setWorkCategoryFilter(id) {
    ui.filters["workItems:categoryId"] = id || "";
    ui.openColumnFilter = null;
    resetTablePage("workItems");
    render();
}

function setWorkView(view) {
    ui.workView = view === "approval" ? "all" : (view || "all");
    ui.openColumnFilter = null;
    resetTablePage("workItems");
    render();
}

function setWorkMetric(view) {
    const categoryId = ui.activeView === "work-group"
        ? ui.activeCategoryId
        : ui.filters["workItems:categoryId"] || "";
    const stayInPlace = ui.activeView === "task-master"
        || (ui.activeView === "work-group" && ui.activeCategoryId !== "pilot-t01");
    ui.workView = view === "approval" ? "all" : (view || "all");
    ui.query = "";
    ui.openColumnFilter = null;
    Object.keys(ui.filters)
        .filter((key) => key.startsWith("workItems:"))
        .forEach((key) => delete ui.filters[key]);
    Object.keys(ui.columnFilters)
        .filter((key) => key.startsWith("workItems:"))
        .forEach((key) => delete ui.columnFilters[key]);
    if (categoryId) ui.filters["workItems:categoryId"] = categoryId;
    resetTablePage("workItems");
    if (!stayInPlace) {
        return navigateToRoute("work/task-master", { push: true, preserveWorkCategoryId: categoryId });
    }
    render();
}

function setT01Metric(tabId, view) {
    if (ui.activeView !== "work-group" || ui.activeCategoryId !== "pilot-t01") return;
    const activeTab = ui.t01Tab || "dashboard";
    if (tabId && tabId !== activeTab) return;
    const dashboard = getT01SheetDashboard(activeTab);
    const selectedMetric = dashboard.metrics.find((metric) => metric.view === (view || "all") && typeof metric.predicate === "function");
    if (!selectedMetric) return;

    ui.t01MetricView = selectedMetric.view;
    ui.query = "";
    ui.openColumnFilter = null;
    Object.keys(ui.filters)
        .filter((key) => key.startsWith(`${dashboard.collection}:`))
        .forEach((key) => delete ui.filters[key]);
    Object.keys(ui.columnFilters)
        .filter((key) => key.startsWith(`${dashboard.collection}:`))
        .forEach((key) => delete ui.columnFilters[key]);
    resetTablePage(dashboard.collection);
    render();
}

function openWorkProgress(id) {
    if (!id) return;
    const row = appState.workItems.find((item) => item.id === id);
    if (!row || !canUpdateWorkItemProgress(row)) {
        showToast("Bạn chỉ có thể cập nhật tiến độ công việc được giao.");
        return;
    }
    ui.modal = { tab: "workItems", id, mode: "work-progress" };
    render();
}

function closeModal() {
    ui.modal = null;
    render();
}

async function handleSubmit(event) {
    event.preventDefault();
    if (ui.modal?.mode === "work-progress") return handleWorkProgressSubmit(event);
    if (!ensureDbReady() || ui.saving) return;
    const mod = modules[ui.modal.tab];
    if (!mod || mod.readOnly) return;
    if (mod.collection === "workCategories" && !canManageWorkPlans()) {
        showToast("Chỉ admin được tạo hoặc sửa nhóm công việc.");
        return;
    }
    const form = event.currentTarget;
    const saveMode = event.submitter?.dataset.saveMode || "close";
    const payload = {};
    for (const field of getEditableFields(mod)) {
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
    if (mod.collection === "workItems") {
        if (authState.user?.role !== "admin") {
            payload.assignee = authState.user?.name || authState.user?.username || "";
            payload.assigneeEmail = authState.user?.email || authState.user?.username || "";
        }
        if (!payload.assigneeEmail) payload.assigneeEmail = emailForWorkAssignee(payload.assignee);
        if (!payload.taskId && payload.categoryId) payload.taskId = getNextWorkItemTaskIdForCategory(payload.categoryId);
        if (payload.progress === "") payload.progress = 0;
    }

    const validationErrors = validateRecord(mod, payload);
    if (validationErrors.length) {
        showToast(validationErrors[0]);
        return;
    }
    if (mod.collection === "workItems" && payload.status === "Hoàn thành" && !payload.completedDate) {
        payload.completedDate = todayStamp();
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
            showToast(mod.collection === "workItems" ? "Đã cập nhật kế hoạch công việc." : "Đã cập nhật bản ghi vào Railway DB.");
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
            showToast(mod.collection === "workCategories" ? "Đã thêm nhóm công việc." : mod.collection === "workItems" ? "Đã thêm đầu việc." : "Đã thêm bản ghi vào Railway DB.");
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

async function handleWorkProgressSubmit(event) {
    if (!ensureDbReady() || ui.saving) return;
    const current = appState.workItems.find((row) => row.id === ui.modal?.id);
    if (!current || !canUpdateWorkItemProgress(current)) {
        showToast("Bạn chỉ có thể cập nhật tiến độ công việc được giao.");
        return;
    }
    const form = event.currentTarget;
    let progress = form.elements.progress?.value ?? "";
    if (typeof progress === "string") progress = progress.trim();
    progress = progress === "" ? 0 : Number(progress);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
        showToast("% hoàn thành phải nằm trong khoảng 0-100%.");
        return;
    }
    const now = new Date().toISOString();
    const status = String(form.elements.status?.value || "").trim();
    const completedDate = String(form.elements.completedDate?.value || "").trim();
    const record = {
        ...current,
        status,
        progress,
        completedDate,
        documentUrl: String(form.elements.documentUrl?.value || "").trim(),
        note: String(form.elements.note?.value || "").trim(),
        updatedAt: now
    };
    const statusProgressIssue = getWorkStatusProgressIssue(record.status, record.progress);
    if (statusProgressIssue) {
        showToast(statusProgressIssue);
        return;
    }
    if (record.status === "Hoàn thành" && !record.completedDate) {
        record.completedDate = todayStamp();
    }
    ui.saving = true;
    try {
        const result = await updateRemoteRecord("workItems", current.id, record);
        if (result.state) {
            appState = normalizeState(result.state);
        } else {
            appState.workItems = appState.workItems.map((row) => row.id === current.id ? result.record : row);
        }
        appState.updatedAt = result.updatedAt || now;
        setDataStatus("online", "Railway Postgres đang hoạt động");
        localStorage.setItem(MIGRATION_FLAG_KEY, "active");
        cacheState();
        ui.modal = null;
        showToast("Đã cập nhật tiến độ.");
    } catch (error) {
        setDataStatus("offline", error.message || "Không lưu được vào Railway DB");
        showToast(`Không lưu được tiến độ: ${error.message}`);
    } finally {
        ui.saving = false;
        render();
    }
}

async function deleteRow(id) {
    const mod = modules[ui.activeTab];
    if (!mod || mod.readOnly || !id || !ensureDbReady() || ui.saving) return;
    const row = appState[mod.collection].find((item) => item.id === id);
    if (!row) return;
    if (!canDeleteRecord(row)) {
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
    if (mod?.collection === "workItems") ui.workView = "all";
    if (mod) resetTablePage(mod.collection);
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
    if (!confirm("Đồng bộ Excel sẽ cập nhật lại các bản ghi có nguồn từ workbook. Các bản ghi nhập trực tiếp trên app vẫn được giữ nguyên. Tiếp tục?")) {
        input.value = "";
        return;
    }
    ui.saving = true;
    showToast("Đang đồng bộ workbook Excel...");
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
        const preservedCount = Object.values(data.preserved || {}).reduce((total, value) => total + Number(value || 0), 0);
        showToast(`Đã đồng bộ workbook Excel${preservedCount ? `, giữ lại ${preservedCount} bản ghi nhập trên app` : ""}.`);
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
    const rows = getDisplayRows(mod.collection);
    const query = ui.query.trim().toLowerCase();
    const t01MetricPredicate = getT01MetricPredicate(mod.collection);
    return rows.filter((row) => {
        if (t01MetricPredicate && !t01MetricPredicate(row)) return false;
        const searchableValues = Object.values(row);
        if (mod.collection === "daily") {
            searchableValues.push(formatDateText(row.date), formatDailyTesterLabel(row.tester));
        }
        const matchQuery = !query || searchableValues.some((value) => String(value ?? "").toLowerCase().includes(query));
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

async function deleteWorkCategory(id) {
    if (!id || !ensureDbReady() || ui.saving) return;
    const row = appState.workCategories.find((item) => item.id === id);
    if (!row) return;
    if (!canManageWorkPlans() || !canDeleteRecord(row)) {
        showToast("Bạn chỉ có thể xóa nhóm do chính mình tạo hoặc dùng tài khoản admin.");
        return;
    }
    const linkedItems = appState.workItems.filter((item) => String(item.categoryId || "") === String(id));
    if (linkedItems.length) {
        showToast(`Nhóm này đang có ${linkedItems.length} đầu việc. Chuyển/xóa đầu việc trước rồi xóa nhóm.`);
        return;
    }
    if (!confirm(`Xóa nhóm "${row.name || "công việc"}"?`)) return;
    ui.saving = true;
    try {
        const result = await deleteRemoteRecord("workCategories", id);
        if (result.state) {
            appState = normalizeState(result.state);
        } else {
            appState.workCategories = appState.workCategories.filter((item) => item.id !== id);
        }
        if (ui.filters["workItems:categoryId"] === id) ui.filters["workItems:categoryId"] = "";
        appState.updatedAt = result.updatedAt || new Date().toISOString();
        setDataStatus("online", "Railway Postgres đang hoạt động");
        localStorage.setItem(MIGRATION_FLAG_KEY, "active");
        cacheState();
        showToast("Đã xóa nhóm công việc khỏi Railway DB.");
    } catch (error) {
        setDataStatus("offline", error.message || "Không xóa được nhóm công việc");
        showToast(`Không xóa được nhóm: ${error.message}`);
    } finally {
        ui.saving = false;
        render();
    }
}

function getDisplayRows(collection) {
    const rows = (appState[collection] || []).filter(shouldDisplaySourceRow);
    return collection === "daily" ? [...rows].sort(compareDailyRows) : rows;
}

function compareDailyRows(a, b) {
    const dateA = parseDateOnly(a?.date)?.getTime() || 0;
    const dateB = parseDateOnly(b?.date)?.getTime() || 0;
    if (dateA !== dateB) return dateB - dateA;
    const orderA = Number(a?.sortOrder);
    const orderB = Number(b?.sortOrder);
    if (Number.isFinite(orderA) && Number.isFinite(orderB) && orderA !== orderB) return orderA - orderB;
    return String(a?.jiraCode || a?.feature || "").localeCompare(String(b?.jiraCode || b?.feature || ""), "vi", { numeric: true });
}

function shouldDisplaySourceRow(row) {
    return !row?.sourceHidden && !row?.sourceStruck;
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

function isComputedField(collection, key) {
    const fields = computedFieldsByCollection[collection] || [];
    return fields.includes("*") || fields.includes(key);
}

function getEditableFields(mod) {
    if (!mod?.fields) return [];
    return mod.fields.filter((field) => !isComputedField(mod.collection, field.key));
}

function getColumnFilterOptions(mod, col, field) {
    const fieldOptions = getFieldOptions(field);
    if (field?.type === "select" && fieldOptions.length) return fieldOptions.map(optionValue);
    const sourceRows = mod.collection === "workItems" ? getWorkRowsForDisplay() : getDisplayRows(mod.collection);
    const values = uniqueValues(sourceRows, col.key);
    if (values.length > 0 && values.length <= 8) return values;
    return [];
}

function getFieldOptions(field, row = null) {
    if (!field) return [];
    if (typeof field.options === "function") return field.options(row);
    return Array.isArray(field.options) ? field.options : [];
}

function optionValue(option) {
    if (option && typeof option === "object") return option.value ?? option.label ?? "";
    return option ?? "";
}

function optionLabel(option) {
    if (option && typeof option === "object") return option.label ?? option.value ?? "";
    return option ?? "";
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

function getNextWorkItemTaskId() {
    const categoryId = getDefaultWorkCategoryId();
    if (!categoryId) return "";
    return getNextWorkItemTaskIdForCategory(categoryId);
}

function getNextWorkCategorySortOrder() {
    return getNextSortOrder(appState.workCategories);
}

function getNextWorkCategoryPrefix() {
    return `SQ2-T${String(getNextWorkCategorySortOrder()).padStart(2, "0")}`;
}

function getNextSortOrder(rows) {
    const maxSortOrder = (rows || []).reduce((max, row) => {
        const sortOrder = Number(row?.sortOrder);
        return Number.isFinite(sortOrder) ? Math.max(max, Math.trunc(sortOrder)) : max;
    }, 0);
    return maxSortOrder + 1;
}

function getWorkCategorySelectOptions() {
    return getWorkCategories().map((category) => ({
        value: category.id,
        label: category.name
    }));
}

function getDefaultWorkCategoryId() {
    const categories = getWorkCategories();
    return categories.length === 1 ? categories[0].id : "";
}

function getNextWorkItemTaskIdForCategory(categoryId) {
    const category = getWorkCategories().find((item) => String(item.id) === String(categoryId));
    const prefix = String(category?.taskPrefix || "").trim()
        || `SQ2-T${String(Math.trunc(Number(category?.sortOrder) || 0)).padStart(2, "0")}`;
    const maxIndex = (appState.workItems || []).reduce((max, row) => {
        if (String(row.categoryId || "") !== String(categoryId)) return max;
        const match = String(row.taskId || "").match(/-(\d+)$/);
        const value = match ? Number(match[1]) : 0;
        return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0);
    return `${prefix}-${String(maxIndex + 1).padStart(3, "0")}`;
}

function emailForWorkAssignee(name) {
    return workAssigneeEmailByName[String(name || "").trim()] || "";
}

function getWorkItemWarning(row) {
    const status = String(row?.status || "").trim();
    if (status === "Hoàn thành") return "Đã xong";
    const dueDate = parseDateOnly(row?.dueDate);
    if (!dueDate) return Number(row?.progress || 0) >= 80 ? "Ổn" : "Đang theo dõi";
    const today = getTodayDateOnly();
    const remainingDays = daysBetween(today, dueDate);
    if (remainingDays < 0) return "Quá hạn";
    if (remainingDays <= 3) return "Sắp đến hạn";
    return Number(row?.progress || 0) >= 80 ? "Ổn" : "Đang theo dõi";
}

function uniqueTextValues(values) {
    return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "vi"));
}

function getDailyTesterOptions() {
    return Object.entries(dailyTesterLabels).map(([value, label]) => ({ value, label }));
}

function formatDailyTesterLabel(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "-";
    const key = raw.replace(/^T/i, "");
    return dailyTesterLabels[key] || raw;
}

function getT01MetricPredicate(collection) {
    if (ui.activeCategoryId !== "pilot-t01") return null;
    const dashboard = getT01SheetDashboard(ui.t01Tab || "dashboard");
    if (dashboard.collection !== collection) return null;
    const activeView = ui.t01MetricView || "all";
    const metric = dashboard.metrics.find((item) => item.view === activeView);
    return typeof metric?.predicate === "function" ? metric.predicate : null;
}

function getWorkPeopleOptions() {
    return uniqueTextValues([
        ...workAssigneeOptions,
        ...(appState.personnel || []).map((row) => row.name),
        ...(appState.workItems || []).map((row) => row.assignee),
        ...(appState.workItems || []).map((row) => row.collaborators)
    ]);
}

function getHandoffLevel1Options() {
    return uniqueTextValues([
        ...handoffSectionDefaults.map((item) => item.level1),
        ...appState.handoffs.map((row) => row.sectionLevel1)
    ]);
}

function getHandoffLevel2Options(rowOrLevel1 = null) {
    const level1 = typeof rowOrLevel1 === "string"
        ? rowOrLevel1
        : rowOrLevel1?.sectionLevel1;
    const normalizedLevel1 = normalizeLookupKey(level1);
    const defaults = handoffSectionDefaults
        .filter((item) => !normalizedLevel1 || normalizeLookupKey(item.level1) === normalizedLevel1)
        .flatMap((item) => item.children);
    const fromRows = appState.handoffs
        .filter((row) => !normalizedLevel1 || normalizeLookupKey(row.sectionLevel1) === normalizedLevel1)
        .map((row) => row.sectionLevel2);
    return uniqueTextValues([...defaults, ...fromRows]);
}

function getColumnRawValue(row, col) {
    if (col.key === "progress") {
        if (row.executedCases !== undefined || row.totalCases !== undefined) return percent(row.executedCases, row.totalCases);
        return row.progress;
    }
    return row[col.key];
}

function validateRecord(mod, payload) {
    const errors = [];
    getEditableFields(mod).filter((field) => field.required).forEach((field) => {
        if (!isFilled(payload[field.key])) errors.push(`${field.label} là trường bắt buộc.`);
    });
    const percentFields = getEditableFields(mod).filter((field) => field.type === "percent");
    percentFields.forEach((field) => {
        const value = payload[field.key];
        if (value !== "" && (Number(value) < 0 || Number(value) > 100)) {
            errors.push(`${field.label} phải nằm trong khoảng 0-100%.`);
        }
    });
    if (payload.totalCases !== "" && payload.executedCases !== "" && Number(payload.executedCases) > Number(payload.totalCases)) {
        errors.push("Số testcase đã thực hiện không được lớn hơn tổng testcase.");
    }
    if (mod.collection === "workItems") {
        const issue = getWorkStatusProgressIssue(payload.status, payload.progress);
        if (issue) errors.push(issue);
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
    const passedCases = sum(appState.features, "passedCases");
    const deliveredStories = appState.handoffs.filter((row) => isFilled(row.uatHandoff)).length;
    const coverage = percent(deliveredStories, features);
    const successRate = round(average([
        ...appState.weekly.map((row) => row.successRate),
        ...appState.readiness.map((row) => row.successRate)
    ]));
    const latestReadiness = getLatest(appState.readiness);
    const openCritical = countOpenDefectSeverity("Blocker") + countOpenDefectSeverity("Critical");
    const pilotReadiness = round(coverage * 0.5 + percent(passedCases, totalCases) * 0.5);
    const readinessFallback = round(latestReadiness?.readinessLevel || average([coverage, successRate]));
    return {
        features,
        squadProgress: statusDrivenProgress || coverage,
        totalRecords: Object.keys(modules).reduce((total, id) => total + appState[modules[id].collection].length, 0),
        coverage,
        successRate,
        criticalBugs: openCritical,
        trainingReadiness: calculateTrainingReadiness(),
        pilotReadiness: pilotReadiness || round(latestReadiness?.pilotReadiness || readinessFallback || 0)
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

function isBugStatus(value, target) {
    if (normalizeWorkbookFormulaText(target) === "reopen") {
        return ["reopen", "reopened"].includes(normalizeWorkbookFormulaText(value));
    }
    return normalizeWorkbookFormulaText(value) === normalizeWorkbookFormulaText(target);
}

function countDailyOpenSeverity(severity) {
    const target = normalizeWorkbookFormulaText(severity);
    return appState.daily.filter((row) => (
        normalizeWorkbookFormulaText(row.maxBugSeverity) === target
        && isOpenBugStatus(row.bugStatus)
    )).length;
}

function countOpenDefectSeverity(severity) {
    const target = normalizeWorkbookFormulaText(severity);
    return appState.defects.filter((row) => (
        normalizeWorkbookFormulaText(row.severity) === target
        && isOpenBugStatus(row.status)
    )).length;
}

function isOpenBugStatus(status) {
    const normalized = normalizeWorkbookFormulaText(status);
    if (!normalized) return false;
    return !["da dong", "closed", "cancelled", "canceled"].includes(normalized);
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

function renderLinkedText(value, explicitLinks = []) {
    const text = String(value || "");
    const links = Array.isArray(explicitLinks) ? explicitLinks.filter(Boolean) : [];
    if (!text.trim() && !links.length) return `<span style="color:#9ca3af">-</span>`;

    const pieces = [];
    const pattern = /https?:\/\/[^\s<>"']+/gi;
    let lastIndex = 0;
    let match;
    while ((match = pattern.exec(text))) {
        const rawUrl = match[0];
        const url = rawUrl.replace(/[),.;]+$/g, "");
        const trailing = rawUrl.slice(url.length);
        if (match.index > lastIndex) pieces.push(e(text.slice(lastIndex, match.index)));
        pieces.push(renderExternalLink(url));
        if (trailing) pieces.push(e(trailing));
        lastIndex = match.index + rawUrl.length;
    }
    if (lastIndex < text.length) pieces.push(e(text.slice(lastIndex)));

    const renderedText = pieces.length ? pieces.join("") : e(text);
    const textUrls = new Set(extractTextUrls(text));
    const extraLinks = links
        .map((url) => String(url || "").trim())
        .filter((url) => url && !textUrls.has(url));
    return `
        <div class="linked-text">
            <span>${renderedText}</span>
            ${extraLinks.length ? `
                <div class="linked-text-extra">
                    ${extraLinks.map((url) => renderExternalLink(url, "Mở link")).join("")}
                </div>
            ` : ""}
        </div>
    `;
}

function renderExternalLink(url, label = url) {
    const safeUrl = String(url || "").trim();
    if (!/^https?:\/\//i.test(safeUrl)) return e(label);
    return `<a class="inline-link" href="${e(safeUrl)}" target="_blank" rel="noopener noreferrer">${e(label)}</a>`;
}

function extractTextUrls(value) {
    const urls = [];
    const pattern = /https?:\/\/[^\s<>"']+/gi;
    let match;
    while ((match = pattern.exec(String(value || "")))) {
        urls.push(match[0].replace(/[),.;]+$/g, ""));
    }
    return urls;
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

function renderHandoffFeatureCell(row) {
    const badges = [row.sectionLevel1, row.sectionLevel2]
        .map((value) => String(value || "").trim())
        .filter(Boolean);
    return `
        <div>
            ${badges.length ? `
                <div class="cell-badge-list">
                    ${badges.map((badge, index) => `<span class="cell-badge level-${index + 1}">${e(badge)}</span>`).join("")}
                </div>
            ` : ""}
            <strong>${e(row.name || "-")}</strong>
            ${row.note ? `<div style="color:#6b7280;margin-top:3px">${e(row.note)}</div>` : ""}
        </div>
    `;
}

function renderPriority(value) {
    const tone = value === "Critical" ? "red" : value === "Cao" ? "yellow" : value === "Trung bình" ? "blue" : "gray";
    return tag(value, tone);
}

function renderWorkTaskIdCell(row) {
    const taskId = String(row.taskId || "").trim();
    if (!taskId) return `<span style="color:#9ca3af">-</span>`;
    return `<span class="work-task-id" title="${e(taskId)}">${e(taskId)}</span>`;
}

function renderWorkCategoryCell(row) {
    const category = getWorkCategoryForRow(row);
    const prefix = String(category?.taskPrefix || extractWorkTaskPrefix(row.taskId) || "").trim();
    const fullName = category?.name || row.categoryName || "Chưa phân nhóm";
    const shortName = getWorkCategoryShortName(category || { taskPrefix: prefix, name: fullName });
    return `
        <div class="work-table-category" title="${e(fullName)}">
            ${prefix ? `<span class="work-table-category-code">${e(prefix.replace(/^SQ2-/, ""))}</span>` : ""}
            <strong>${e(shortName)}</strong>
        </div>
    `;
}

function getWorkCategoryForRow(row) {
    return getWorkCategories().find((category) => String(category.id || "") === String(row.categoryId || "")) || null;
}

function extractWorkTaskPrefix(taskId) {
    const match = String(taskId || "").trim().match(/^(.*)-\d+$/);
    return match ? match[1] : "";
}

function renderWorkTitleCell(row) {
    return `
        <div class="work-title-cell">
            <strong>${e(row.title || "-")}</strong>
            ${row.description ? `<span>${e(row.description)}</span>` : ""}
            ${row.collaborators ? `<small>Đầu mối nghiệp vụ: ${e(row.collaborators)}</small>` : ""}
        </div>
    `;
}

function renderWorkStatus(value) {
    const text = String(value || "");
    const tone = text === "Hoàn thành" ? "green"
        : text === "Đang thực hiện" ? "blue"
            : text === "Quá hạn" ? "red"
                : "gray";
    return tag(value, tone);
}

function renderWorkPriority(value) {
    const tone = value === "Cao" ? "red" : value === "Trung bình" ? "yellow" : "gray";
    return tag(value, tone);
}

function renderWorkWarning(value) {
    const tone = value === "Quá hạn" ? "red"
        : value === "Sắp đến hạn" ? "yellow"
            : value === "Đã xong" || value === "Ổn" ? "green"
                : "blue";
    return tag(value, tone);
}

function renderStatus(value) {
    const text = String(value || "");
    const tone = text.includes("Đã bàn giao") || value === "Done" || value === "Done UAT" || value === "Hoàn thành" || value === "Đã ký UAT" || value === "Closed" || value === "Đạt" || value === "Xanh" ? "green"
        : value === "Blocker" || value === "SIT Fail" ? "red-dark"
            : value === "Đỏ" || value === "Chưa đạt" || value === "Thiếu tester" || value === "Tạm dừng/Blocked" || value === "Open" || value === "Critical" || value === "Chờ fix" || value === "Tạm hoãn" ? "red"
                : value === "Major" || value === "In Progress" ? "orange"
                    : text.includes("Chưa bàn giao") || value === "Minor" || value === "Pending" || value === "Vàng" || value === "Đạt có điều kiện" || value === "Chưa hoàn thành TC" || value === "Chưa bắt đầu" || value === "Chờ sửa lỗi" || value === "Done RSD" ? "yellow"
                        : value === "Trivial" || value === "Done DEV" || value === "Đang kiểm thử" || value === "Resolved" || value === "SIT Pass" ? "blue"
                            : value === "Done SIT" || value === "Retest" || value === "Reopen" || value === "Reopened" ? "purple"
                                : value === "Cancelled" ? "gray-dark"
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

function canDeleteRecord(row) {
    if (authState.user?.role === "admin") return true;
    return row?._ownership?.canDelete === true;
}

function canManageWorkPlans() {
    return authState.user?.role === "admin";
}

function canCreateWorkItems() {
    return Boolean(authState.user);
}

function canFullyManageWorkItem(row) {
    return canManageWorkPlans() || row?._ownership?.canManage === true || row?._ownership?.isOwner === true;
}

function isAssignedWorkItem(row) {
    const identities = [authState.user?.email, authState.user?.username]
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean);
    const assigneeEmail = String(row?.assigneeEmail || "").trim().toLowerCase();
    const assigneeName = String(row?.assignee || "").trim().toLowerCase();
    const userName = String(authState.user?.name || "").trim().toLowerCase();
    return Boolean(
        row?._ownership?.isLinkedOwner ||
        (assigneeEmail && identities.includes(assigneeEmail)) ||
        (assigneeName && userName && assigneeName === userName)
    );
}

function canUpdateWorkItemProgress(row) {
    return canFullyManageWorkItem(row) || isAssignedWorkItem(row) || row?._ownership?.canEdit === true;
}

function recordOwnerLabel(row) {
    return row?._ownership?.createdByName || row?._ownership?.createdByEmail || "admin";
}

function recordTitle(row, mod) {
    if (mod.collection === "features") return row.name || row.code || mod.shortLabel;
    if (mod.collection === "workItems") return row.title || mod.shortLabel;
    if (mod.collection === "workCategories") return row.name || mod.shortLabel;
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

function formatDateText(value) {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("vi-VN").format(date);
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
    if (ui.sidebarMobileOpen) {
        ui.sidebarMobileOpen = false;
        render();
        requestAnimationFrame(() => document.querySelector(".mobile-menu-btn")?.focus());
        return;
    }
    if (ui.aiChatOpen) {
        ui.aiChatOpen = false;
        render();
        return;
    }
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
    if (event.key === STORAGE_KEY) {
        appState = loadCachedState();
        ui.modal = null;
        render();
        return;
    }
    if (event.key === SIDEBAR_ACCORDION_STORAGE_KEY) {
        const stored = readSidebarAccordionPreference();
        ui.sidebarOpenSection = stored.openSection;
        ui.sidebarOpenGroups = stored.openGroups;
        render();
    }
});

window.addEventListener("hashchange", () => {
    const route = getInitialRoute();
    if ((window.location.hash || "").replace(/^#\/?/, "") !== route.path) {
        history.replaceState(null, "", `#${route.path}`);
    }
    ui.activeTab = route.activeTab;
    ui.activeView = route.view;
    ui.activeRoute = route.path;
    ui.activeCategoryId = route.categoryId;
    ui.t01Tab = route.t01Tab;
    ui.query = "";
    ui.openColumnFilter = null;
    ui.t01MetricView = "all";
    ui.sidebarMobileOpen = false;
    syncSidebarAccordionForRoute(route);
    requestActiveTabScroll();
    render();
});

window.addEventListener("resize", () => {
    if (responsiveTableResizeFrame) return;
    responsiveTableResizeFrame = requestAnimationFrame(() => {
        responsiveTableResizeFrame = 0;
        syncResponsiveTables();
    });
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

window.setInterval(refreshFromDbIfIdle, SYNC_INTERVAL_MS);
window.setInterval(refreshGroupChatIfOpen, GROUP_CHAT_POLL_INTERVAL_MS);

render();
initAuth();
