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
const bugStatusOptions = ["Cancelled", "Closed", "In Progress", "Open", "Pending", "Reopen", "Reopened", "Resolved", "SIT Pass", "SIT Fail"];
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
const workCategoryStatusOptions = ["Đang theo dõi", "Tạm dừng", "Hoàn thành"];
const workStatusOptions = ["Chưa bắt đầu", "Đang thực hiện", "Chờ phản hồi", "Tạm dừng", "Hoàn thành", "Quá hạn", "Hủy"];
const workPriorityOptions = ["Cao", "Trung bình", "Thấp"];

const modules = {
    features: {
        label: "Danh mục UAT",
        shortLabel: "Danh mục",
        icon: "fa-layer-group",
        collection: "features",
        stickyColumns: 7,
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
        description: "Lập kế hoạch, giao người phụ trách và theo dõi tiến độ các đầu việc ngoài luồng UAT Excel.",
        emptyIcon: "fa-list-check",
        emptyTitle: "Chưa có đầu việc",
        emptyText: "Thêm nhóm công việc hoặc tạo đầu việc để bắt đầu theo dõi tiến độ.",
        fields: [
            { key: "sortOrder", label: "STT", type: "number", defaultValue: getNextWorkItemSortOrder },
            { key: "categoryId", label: "Nhóm công việc", type: "select", options: () => getWorkCategorySelectOptions(), full: true },
            { key: "title", label: "Tên công việc", type: "text", required: true, full: true },
            { key: "description", label: "Mô tả", type: "textarea", full: true },
            { key: "assignee", label: "Người phụ trách", type: "text" },
            { key: "assigneeEmail", label: "Email phụ trách", type: "text" },
            { key: "collaborators", label: "Người phối hợp", type: "text", full: true },
            { key: "status", label: "Trạng thái", type: "select", options: workStatusOptions, defaultValue: "Chưa bắt đầu" },
            { key: "progress", label: "% hoàn thành", type: "percent", defaultValue: 0 },
            { key: "priority", label: "Ưu tiên", type: "select", options: workPriorityOptions, defaultValue: "Trung bình" },
            { key: "startDate", label: "Ngày bắt đầu", type: "date" },
            { key: "dueDate", label: "Deadline", type: "date" },
            { key: "completedDate", label: "Ngày hoàn thành thực tế", type: "date" },
            { key: "documentUrl", label: "Link tài liệu", type: "text", full: true },
            { key: "note", label: "Vướng mắc/Ghi chú", type: "textarea", full: true }
        ],
        filters: [
            { key: "categoryId", label: "Nhóm" },
            { key: "status", label: "Trạng thái" },
            { key: "priority", label: "Ưu tiên" },
            { key: "assignee", label: "Phụ trách" }
        ],
        columns: [
            { key: "sortOrder", label: "STT", width: "58px" },
            { key: "categoryName", label: "Nhóm công việc", width: "180px", render: (row) => tag(row.categoryName, "teal") },
            { key: "title", label: "Tên công việc", width: "300px", render: renderWorkTitleCell },
            { key: "assignee", label: "Người phụ trách", width: "180px", render: (row) => strongText(row.assignee || "-", row.assigneeEmail) },
            { key: "status", label: "Trạng thái", width: "140px", render: (row) => renderWorkStatus(row.status) },
            { key: "progress", label: "% hoàn thành", width: "150px", render: (row) => progressCell(row.progress) },
            { key: "priority", label: "Ưu tiên", width: "110px", render: (row) => renderWorkPriority(row.priority) },
            { key: "startDate", label: "Ngày bắt đầu", width: "120px", render: (row) => formatDate(row.startDate) },
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
            { key: "date", label: "Ngày", type: "date" },
            { key: "jiraCode", label: "Mã Jira", type: "text" },
            { key: "feature", label: "Tên chức năng", type: "text", full: true },
            { key: "sprint", label: "Sprint", type: "text" },
            { key: "tester", label: "Tester", type: "text" },
            { key: "totalCases", label: "Tổng TC", type: "number" },
            { key: "passedCases", label: "TC Passed", type: "number" },
            { key: "failedCases", label: "TC Failed", type: "number" },
            { key: "bugStatus", label: "Trạng thái lỗi", type: "select", options: bugStatusOptions },
            { key: "maxBugSeverity", label: "Mức độ lỗi", type: "select", options: bugSeverityOptions },
            { key: "bugDetail", label: "Chi tiết lỗi", type: "textarea", full: true },
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
            { key: "jiraCode", label: "Mã Jira", width: "140px" },
            { key: "feature", label: "Tên chức năng", width: "260px", render: (row) => strongText(row.feature) },
            { key: "sprint", label: "Sprint", width: "100px" },
            { key: "tester", label: "Tester", width: "120px" },
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
            { key: "tester", label: "Tester", type: "text" },
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

const tabs = [
    { id: "dashboard", label: "Dashboard_UAT", icon: "fa-gauge-high" },
    { id: "workItems", label: "KeHoach_CongViec", icon: modules.workItems.icon },
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
    { id: "userStories", label: "DS_US", icon: modules.userStories.icon, sheetMark: "red" },
    { id: "bugSources", label: "DS.Loi", icon: modules.bugSources.icon, sheetMark: "red" }
];

function getDataModuleCount() {
    return tabs.filter((tab) => modules[tab.id]).length;
}

function getInitialTab() {
    const id = (window.location.hash || "").replace("#", "");
    return tabs.some((tab) => tab.id === id) ? id : "dashboard";
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
    updatedAt: null
});

let appState = loadCachedState();
let authState = {
    status: "checking",
    user: null,
    error: null
};
let lastRenderedTab = null;
let pendingActiveTabScroll = null;
let ui = {
    activeTab: getInitialTab(),
    query: "",
    filters: {},
    columnFilters: {},
    columnWidths: loadColumnWidths(),
    tableScrollLefts: loadTableScrollLefts(),
    openColumnFilter: null,
    modal: null,
    profileOpen: false,
    aiChatOpen: false,
    aiChatDraft: "",
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
            ui.aiChatOpen = false;
            ui.aiChatDraft = "";
            ui.groupChatOpen = false;
            ui.groupChatDraft = "";
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

function render() {
    const pageScroll = lastRenderedTab === ui.activeTab ? capturePageScroll() : null;
    const previousTabbarScrollLeft = document.querySelector(".tabbar")?.scrollLeft || 0;
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
            <main class="main">
                ${renderTopbar()}
                <section class="workspace">
                    ${renderCommandBand()}
                    ${renderKpis()}
                    ${renderTabs()}
                    ${ui.activeTab === "dashboard" ? renderDashboard() : ui.activeTab === "defectDashboard" ? renderDefectDashboardPage() : ui.activeTab === "workItems" ? renderWorkPlanModule() : renderModule(modules[ui.activeTab])}
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
    lastRenderedTab = ui.activeTab;
    restoreTabbarScrollLeft(previousTabbarScrollLeft);

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
        tab: ui.activeTab,
        left: window.scrollX || document.documentElement.scrollLeft || 0,
        top: window.scrollY || document.documentElement.scrollTop || 0,
        workspaceLeft: workspace?.scrollLeft || 0,
        workspaceTop: workspace?.scrollTop || 0
    };
}

function restorePageScroll(snapshot) {
    if (!snapshot || snapshot.tab !== ui.activeTab) return;
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
                    <button class="${tabButtonClass(tab, "side-btn")}" data-tab="${tab.id}" title="${e(tab.label)}" aria-label="${e(tab.label)}">
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
                <button class="${tabButtonClass(tab, "tab-btn")}" data-tab="${tab.id}">
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
    const rows = getFilteredWorkRows();
    const total = appState.workItems.length;
    const activeFilters = countActiveFilters(mod);
    return `
        <div class="work-plan-page">
            <section class="work-plan-summary">
                ${renderWorkMetric("Nhóm công việc", appState.workCategories.length, "fa-folder-tree", "teal")}
                ${renderWorkMetric("Tổng đầu việc", total, "fa-list-check", "blue")}
                ${renderWorkMetric("Đã hoàn thành", getWorkPlanStats().done, "fa-circle-check", "green")}
                ${renderWorkMetric("Quá hạn", getWorkPlanStats().overdue, "fa-triangle-exclamation", "red")}
                ${renderWorkMetric("Tiến độ TB", `${getWorkPlanStats().averageProgress}%`, "fa-chart-simple", "yellow")}
            </section>

            <div class="content-grid work-plan-layout">
                ${renderWorkCategoryPanel()}
                <section class="panel work-items-panel">
                    <div class="panel-head">
                        <div class="panel-title">
                            <i class="fa-solid ${mod.icon}"></i>
                            <div>
                                <h2>${e(mod.label)}</h2>
                                <span>${e(total)} đầu việc · ${e(rows.length)} đang hiển thị</span>
                            </div>
                        </div>
                        <div class="panel-actions">
                            ${activeFilters ? `
                                <button class="ghost-btn compact-reset-btn" data-action="reset-filters" title="Xóa toàn bộ lọc">
                                    <i class="fa-solid fa-filter-circle-xmark"></i><span>${e(activeFilters)} lọc</span>
                                </button>
                            ` : ""}
                            <button class="primary-btn" data-action="open-create">
                                <i class="fa-solid fa-plus"></i><span>Thêm đầu việc</span>
                            </button>
                        </div>
                    </div>
                    <div class="panel-body">
                        ${renderWorkPlanFilterBar()}
                        ${renderTable(mod, rows)}
                    </div>
                </section>
            </div>
        </div>
    `;
}

function renderWorkMetric(label, value, icon, tone) {
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

function renderWorkCategoryPanel() {
    const categories = getWorkCategories();
    return `
        <section class="panel work-category-panel">
            <div class="panel-head">
                <div class="panel-title">
                    <i class="fa-solid fa-folder-tree"></i>
                    <div>
                        <h2>Nhóm công việc</h2>
                        <span>${e(categories.length)} nhóm · sếp có thể thêm/sửa</span>
                    </div>
                </div>
                <div class="panel-actions">
                    <button class="primary-btn compact-primary" data-action="open-category-create">
                        <i class="fa-solid fa-plus"></i><span>Thêm nhóm</span>
                    </button>
                </div>
            </div>
            <div class="panel-body">
                <div class="work-category-tabs">
                    <button class="work-category-tab ${!ui.filters["workItems:categoryId"] ? "active" : ""}" data-action="set-work-category" data-id="">
                        Tất cả
                    </button>
                    ${categories.map((category) => `
                        <button class="work-category-tab ${ui.filters["workItems:categoryId"] === category.id ? "active" : ""}" data-action="set-work-category" data-id="${e(category.id)}">
                            ${e(category.name)}
                        </button>
                    `).join("")}
                </div>
                <div class="work-category-list">
                    ${categories.length ? categories.map(renderWorkCategoryRow).join("") : `
                        <div class="work-empty-note">
                            <i class="fa-solid fa-folder-plus"></i>
                            <strong>Chưa có nhóm công việc</strong>
                            <span>Tạo nhóm như HDSD, Quy trình tác nghiệp, hoặc nhóm mới theo nhu cầu.</span>
                            <button class="primary-btn" data-action="open-category-create">
                                <i class="fa-solid fa-plus"></i><span>Thêm nhóm</span>
                            </button>
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
    const canEdit = canModifyRecord(category);
    const canDelete = canDeleteRecord(category);
    return `
        <article class="work-category-row">
            <button class="work-category-main" data-action="set-work-category" data-id="${e(category.id)}">
                <strong>${e(category.name)}</strong>
                <span>${e(items.length)} đầu việc · ${e(done)} hoàn thành</span>
                <div class="work-category-progress">
                    <span style="width:${e(clamp(progress))}%"></span>
                </div>
            </button>
            <div class="work-category-meta">
                ${renderStatus(category.status || "Đang theo dõi")}
                ${category.targetDate ? `<span>${e(formatDate(category.targetDate))}</span>` : ""}
            </div>
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

function renderWorkPlanFilterBar() {
    const categoryOptions = getWorkCategorySelectOptions();
    const assignees = uniqueTextValues(appState.workItems.map((row) => row.assignee));
    return `
        <div class="work-filter-bar">
            <label>
                <span>Nhóm</span>
                <select class="field-select" data-filter-key="categoryId">
                    <option value="">Tất cả nhóm</option>
                    ${categoryOptions.map((option) => `<option value="${e(optionValue(option))}" ${ui.filters["workItems:categoryId"] === optionValue(option) ? "selected" : ""}>${e(optionLabel(option))}</option>`).join("")}
                </select>
            </label>
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
                <span>Phụ trách</span>
                <select class="field-select" data-filter-key="assignee">
                    <option value="">Tất cả người phụ trách</option>
                    ${assignees.map((option) => `<option value="${e(option)}" ${ui.filters["workItems:assignee"] === option ? "selected" : ""}>${e(option)}</option>`).join("")}
                </select>
            </label>
        </div>
    `;
}

function getWorkPlanStats() {
    const rows = appState.workItems || [];
    const done = rows.filter((row) => row.status === "Hoàn thành").length;
    const overdue = rows.filter((row) => getWorkItemWarning(row) === "Quá hạn").length;
    const averageProgress = rows.length ? Math.round(rows.reduce((total, row) => total + Number(row.progress || 0), 0) / rows.length) : 0;
    return { done, overdue, averageProgress };
}

function getFilteredWorkRows() {
    const mod = modules.workItems;
    const rows = getWorkRowsForDisplay();
    const query = ui.query.trim().toLowerCase();
    return rows.filter((row) => {
        const matchQuery = !query || Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(query));
        if (!matchQuery) return false;
        const matchLegacyFilters = (mod.filters || []).every((filter) => {
            const selected = ui.filters[`${mod.collection}:${filter.key}`];
            return !selected || String(row[filter.key] || "") === String(selected);
        });
        if (!matchLegacyFilters) return false;
        return mod.columns.every((col) => {
            const selected = ui.columnFilters[columnFilterKey(mod, col)];
            if (!selected) return true;
            return String(getColumnRawValue(row, col) ?? "").toLowerCase().includes(String(selected).toLowerCase());
        });
    });
}

function getWorkRowsForDisplay() {
    const categoryById = new Map(getWorkCategories().map((category) => [String(category.id), category]));
    return getDisplayRows("workItems").map((row) => {
        const category = categoryById.get(String(row.categoryId || ""));
        return {
            ...row,
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
                        ${mod.readOnly ? "" : `
                            <button class="primary-btn" data-action="open-create">
                                <i class="fa-solid fa-plus"></i><span>Thêm bản ghi</span>
                            </button>
                        `}
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
                        const canEdit = canModifyRecord(row);
                        const canDelete = canDeleteRecord(row);
                        const owner = recordOwnerLabel(row);
        const actionCell = includeActions ? `
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
        ` : "";
        return `
            ${sectionMarkup}
                            <tr>
                                ${mod.columns.map((col, index) => `<td${tableCellAttrs(columnMeta[index])}>${renderCell(row, col)}</td>`).join("")}
                                ${actionCell}
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

function renderComboOptions(options) {
    return options.map((option) => `
        <button class="combo-option" type="button" data-combo-option="${e(option)}">${e(option)}</button>
    `).join("");
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

        const collection = table.dataset.resizableTable || ui.activeTab;
        spacer.style.width = `${getTableRenderedWidth(table)}px`;
        table.style.setProperty("--table-view-width", `${main.clientWidth}px`);
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
        await hydrateState(true);
    } catch (error) {
        authState = { status: "guest", user: null, error: error.message || "Không đăng nhập được." };
        appState = emptyState();
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
    localStorage.removeItem(STORAGE_KEY);
    ui.modal = null;
    ui.profileOpen = false;
    ui.aiChatOpen = false;
    ui.aiChatDraft = "";
    ui.groupChatOpen = false;
    ui.groupChatDraft = "";
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
    if (action === "open-category-create") return openWorkCategoryCreate();
    if (action === "open-category-edit") return openWorkCategoryEdit(id);
    if (action === "delete-category") return deleteWorkCategory(id);
    if (action === "set-work-category") return setWorkCategoryFilter(id);
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
    const mod = modules[ui.activeTab];
    if (!mod || mod.readOnly) return;
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
    ui.modal = { tab: "workCategories", id: null };
    render();
}

function openWorkCategoryEdit(id) {
    if (!id) return;
    const row = appState.workCategories.find((item) => item.id === id);
    if (!row || !canModifyRecord(row)) {
        showToast("Bạn chỉ có thể sửa nhóm do chính mình tạo hoặc dùng tài khoản admin.");
        return;
    }
    ui.modal = { tab: "workCategories", id };
    render();
}

function setWorkCategoryFilter(id) {
    ui.filters["workItems:categoryId"] = id || "";
    ui.openColumnFilter = null;
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
    if (!mod || mod.readOnly) return;
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
    if (mod.collection === "workItems") {
        if (payload.status === "Hoàn thành") {
            payload.progress = 100;
            if (!payload.completedDate) payload.completedDate = todayStamp();
        }
        if (payload.status === "Chưa bắt đầu" && payload.progress === "") {
            payload.progress = 0;
        }
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
    if (!mod || mod.readOnly || !id || !ensureDbReady() || ui.saving) return;
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
    const rows = getDisplayRows(mod.collection);
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

async function deleteWorkCategory(id) {
    if (!id || !ensureDbReady() || ui.saving) return;
    const row = appState.workCategories.find((item) => item.id === id);
    if (!row) return;
    if (!canDeleteRecord(row)) {
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
    return (appState[collection] || []).filter(shouldDisplaySourceRow);
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

function getNextWorkItemSortOrder() {
    return getNextSortOrder(appState.workItems);
}

function getNextWorkCategorySortOrder() {
    return getNextSortOrder(appState.workCategories);
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

function getWorkItemWarning(row) {
    const status = String(row?.status || "").trim();
    if (status === "Hoàn thành") return "Đã xong";
    if (status === "Hủy") return "Đã hủy";
    if (status === "Quá hạn") return "Quá hạn";
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

function renderWorkTitleCell(row) {
    return `
        <div class="work-title-cell">
            <strong>${e(row.title || "-")}</strong>
            ${row.description ? `<span>${e(row.description)}</span>` : ""}
            ${row.collaborators ? `<small>Phối hợp: ${e(row.collaborators)}</small>` : ""}
        </div>
    `;
}

function renderWorkStatus(value) {
    const text = String(value || "");
    const tone = text === "Hoàn thành" ? "green"
        : text === "Đang thực hiện" ? "blue"
            : text === "Chờ phản hồi" || text === "Tạm dừng" ? "yellow"
                : text === "Quá hạn" ? "red"
                    : text === "Hủy" ? "gray"
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
                : value === "Đã hủy" ? "gray"
                    : "blue";
    return tag(value, tone);
}

function renderStatus(value) {
    const text = String(value || "");
    const tone = text.includes("Đã bàn giao") || value === "Done" || value === "Done UAT" || value === "Hoàn thành" || value === "Đã ký UAT" || value === "Closed" ? "green"
        : value === "Đạt" || value === "Xanh" ? "green"
            : text.includes("Chưa bàn giao") || value === "Vàng" || value === "Đạt có điều kiện" || value === "Chưa hoàn thành TC" || value === "Chưa bắt đầu" || value === "Chờ sửa lỗi" || value === "Pending" || value === "In Progress" || value === "Major" ? "yellow"
                : value === "Đỏ" || value === "Chưa đạt" || value === "Thiếu tester" || value === "Tạm dừng/Blocked" || value === "Open" || value === "SIT Fail" || value === "Blocker" || value === "Critical" ? "red"
                    : value === "Done SIT" || value === "Retest" || value === "Reopen" || value === "Reopened" ? "purple"
                        : value === "Done DEV" || value === "Đang kiểm thử" || value === "Resolved" || value === "SIT Pass" || value === "Minor" ? "blue"
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

function canDeleteRecord(row) {
    if (authState.user?.role === "admin") return true;
    return row?._ownership?.canDelete === true;
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
    if (event.key !== STORAGE_KEY) return;
    appState = loadCachedState();
    ui.modal = null;
    render();
});

window.addEventListener("hashchange", () => {
    ui.activeTab = getInitialTab();
    ui.query = "";
    ui.openColumnFilter = null;
    requestActiveTabScroll();
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

window.setInterval(refreshFromDbIfIdle, SYNC_INTERVAL_MS);
window.setInterval(refreshGroupChatIfOpen, GROUP_CHAT_POLL_INTERVAL_MS);

render();
initAuth();
