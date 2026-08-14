const crypto = require("crypto");
const path = require("path");
const { Readable } = require("stream");

require("dotenv").config();

const express = require("express");
const ExcelJS = require("exceljs");
const { Pool } = require("pg");
const { computedFieldsByCollection } = require("./excel-formula-contract");
const {
  createDeadlineNotificationService,
  nextDailyRunAt,
  signOAuthState,
  verifyOAuthState,
  GOOGLE_DRIVE_FILE_SCOPE
} = require("./deadline-notifications");
const {
  GOOGLE_SHEETS_READONLY_SCOPE,
  DEFAULT_GOOGLE_SHEET_ID,
  GOOGLE_SHEET_SOURCE_COLLECTIONS,
  fetchGoogleSpreadsheet,
  spreadsheetGridToWorkbook,
  auditGoogleSheetSourceSafety,
  sourceStateHash,
  normalizeGoogleSheetSettings,
  normalizeGoogleSheetSyncState,
  extractSpreadsheetId
} = require("./google-sheet-sync");
const {
  createDriveAttachmentService,
  normalizeFileName,
  normalizeMimeType,
  DEFAULT_MAX_FILE_SIZE_BYTES
} = require("./drive-attachments");

const app = express();
let server = null;
const port = Number(process.env.PORT || 3000);
const publicDir = __dirname;
const databaseUrl = process.env.DATABASE_URL;
const authUser = process.env.APP_USER;
const authPassword = process.env.APP_PASSWORD;
const authEnabled = Boolean(authUser && authPassword);
const authMisconfigured = Boolean(authUser || authPassword) && !authEnabled;
const sessionCookieName = "squad2_session";
const sessionTtlMs = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 8);
const sessionSecret = process.env.SESSION_SECRET || crypto
  .createHash("sha256")
  .update(`${databaseUrl || "local"}:${authPassword || "squad2-session"}`)
  .digest("hex");
const maxAvatarFileSizeMb = Number(process.env.MAX_AVATAR_FILE_SIZE_MB || 6);
const maxAvatarDataLength = Number(process.env.MAX_AVATAR_DATA_LENGTH || Math.ceil(maxAvatarFileSizeMb * 1024 * 1024 * 4 / 3) + 512);
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || "10mb";
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const geminiApiBase = process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta";
const geminiTimeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || 30000);
const gmailSenderEmail = String(process.env.GMAIL_SENDER_EMAIL || "maitanthanh1998@gmail.com").trim().toLowerCase();
const deadlineManagerEmails = process.env.DEADLINE_MANAGER_EMAILS || "yenuth@bidv.com.vn";
const appBaseUrl = String(process.env.APP_BASE_URL || "").trim();
const deadlineSchedulerEnabled = /^(1|true|yes)$/i.test(String(process.env.DEADLINE_NOTIFICATION_SCHEDULER_ENABLED || "false"));
const deadlineSchedulerUtcHour = Math.max(0, Math.min(23, Number(process.env.DEADLINE_NOTIFICATION_RUN_UTC_HOUR || 1)));
let deadlineSchedulerTimer = null;
const googleSheetSyncSchedulerEnabled = !/^(0|false|no)$/i.test(String(process.env.GOOGLE_SHEET_SYNC_SCHEDULER_ENABLED || "true"));
const googleSheetSyncDefaultId = extractSpreadsheetId(process.env.GOOGLE_SHEET_SYNC_SPREADSHEET_ID || DEFAULT_GOOGLE_SHEET_ID);
const googleSheetSyncDefaultIntervalMinutes = Math.max(1, Math.min(60, Number(process.env.GOOGLE_SHEET_SYNC_INTERVAL_MINUTES || 5)));
const googleSheetSyncSettingsMetaKey = "google_sheet_sync_settings";
const googleSheetSyncStateMetaKey = "google_sheet_sync_state";
let googleSheetSyncTimer = null;
const attachmentMaxFileSizeBytes = Math.max(
  1024,
  Number(process.env.WORK_ATTACHMENT_MAX_FILE_SIZE_MB || 50) * 1024 * 1024
);
const deadlineNotificationService = createDeadlineNotificationService({
  oauthClientId: process.env.GMAIL_OAUTH_CLIENT_ID,
  oauthClientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
  expectedSenderEmail: gmailSenderEmail,
  defaultManagerEmails: deadlineManagerEmails,
  appBaseUrl,
  encryptionSecret: process.env.GMAIL_TOKEN_ENCRYPTION_KEY || sessionSecret
});
const driveAttachmentService = createDriveAttachmentService({
  getAccessToken: (db, scopes) => deadlineNotificationService.getGoogleAccessToken(db, scopes),
  requiredScope: GOOGLE_DRIVE_FILE_SCOPE,
  rootFolderName: process.env.GOOGLE_DRIVE_ATTACHMENT_ROOT_NAME || "Squad 2 UAT - Tep cong viec",
  maxFileSizeBytes: attachmentMaxFileSizeBytes || DEFAULT_MAX_FILE_SIZE_BYTES
});
const defaultUsers = [
  { username: "yenuth@bidv.com.vn", email: "yenuth@bidv.com.vn", name: "Uông Thị Hải Yến", password: "123456" },
  { username: "phuongbtm@bidv.com.vn", email: "phuongbtm@bidv.com.vn", name: "Bùi Thị Mai Phương", password: "123456" },
  { username: "giangnc2@bidv.com.vn", email: "giangnc2@bidv.com.vn", name: "Nguyễn Châu Giang", password: "123456" },
  { username: "tuanpa13@bidv.com.vn", email: "tuanpa13@bidv.com.vn", name: "Phạm Anh Tuấn", password: "123456" },
  { username: "thanhmt@bidv.com.vn", email: "thanhmt@bidv.com.vn", name: "Mai Tấn Thành", password: "123456" },
  { username: "sonlt8@bidv.com.vn", email: "sonlt8@bidv.com.vn", name: "Lê Trần Sơn", password: "123456" },
  { username: "sinhhc@bidv.com.vn", email: "sinhhc@bidv.com.vn", name: "Huỳnh Công Sinh", password: "123456" },
  { username: "triht@bidv.com.vn", email: "triht@bidv.com.vn", name: "Hoàng Thành Trí", password: "123456" },
  { username: "huyng@bidv.com.vn", email: "huyng@bidv.com.vn", name: "Nguyễn Gia Huy", password: "123456" },
  { username: "tuantd3@bidv.com.vn", email: "tuantd3@bidv.com.vn", name: "Trần Đình Tuấn", password: "123456" },
  { username: "huanphc@bidv.com.vn", email: "huanphc@bidv.com.vn", name: "Phạm Hoàng Công Huân", password: "123456" }
];
const adminIdentities = ["yenuth@bidv.com.vn", "thanhmt@bidv.com.vn", "huyng@bidv.com.vn"];
const workItemGroupEditors = {
  "pilot-t07": ["phuongbtm@bidv.com.vn"]
};

const workbookCollections = [
  "features",
  "personnel",
  "schedule",
  "handoffs",
  "plans",
  "daily",
  "defects",
  "userStories",
  "bugSources",
  "defectSummary",
  "weekly",
  "readiness",
  "matrix",
  "guide"
];
const planningCollections = ["workCategories", "workItems", "kpiConfig", "memberKpiInputs"];
const collections = [...workbookCollections, ...planningCollections];
const collectionSet = new Set(collections);
const computedCollections = new Set(["defectSummary"]);
const workbookSourceMergeCollections = ["daily", "defects", "userStories", "bugSources"];
const workbookMergeProtectedCollections = [
  "personnel",
  "schedule",
  "handoffs",
  "plans",
  "guide",
  ...planningCollections
];
const workbookSourceIdentityFields = {
  defects: "bugId",
  userStories: "issueKey",
  bugSources: "issueKey"
};
const defectManualFields = ["owner", "resolvedDate", "note"];
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
const featureStatusOptions = ["Done RSD", "Done DEV", "Done SIT", "Done UAT"];
const legacyFeatureStatusOptions = ["Chưa bắt đầu", "Đang kiểm thử", "Chờ fix", "Retest", "Hoàn thành", "Tạm hoãn"];
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
  "Phạm Hoàng Công Huân",
  "Trần Đình Tuấn"
];
const ownerAccountLinks = [
  { code: "NV1", label: ownerOptions[0], email: "phuongbtm@bidv.com.vn" },
  { code: "NV2", label: ownerOptions[1], email: "giangnc2@bidv.com.vn" },
  { code: "NV3", label: ownerOptions[2], email: "tuanpa13@bidv.com.vn" }
];
// PhanCong_UAT is the source of truth for tester assignments.  The personnel
// sheet has historically used a shifted T1-T6 sequence, so never infer a plan
// column from that unverified staff code.  Normalize known tester identities by
// their full name and keep this directory aligned with the visible plan header.
const canonicalTesterDirectory = Object.freeze([
  Object.freeze({ key: "t1", code: "T1", shortName: "Sơn", name: "Lê Trần Sơn", email: "sonlt8@bidv.com.vn" }),
  Object.freeze({ key: "t2", code: "T2", shortName: "Sinh", name: "Huỳnh Công Sinh", email: "sinhhc@bidv.com.vn" }),
  Object.freeze({ key: "t3", code: "T3", shortName: "Trí", name: "Hoàng Thành Trí", email: "triht@bidv.com.vn" }),
  Object.freeze({ key: "t4", code: "T4", shortName: "Huy", name: "Nguyễn Gia Huy", email: "huyng@bidv.com.vn" }),
  Object.freeze({ key: "t5", code: "T5", shortName: "Tuấn", name: "Trần Đình Tuấn", email: "tuantd3@bidv.com.vn" }),
  Object.freeze({ key: "t6", code: "T6", shortName: "Thành", name: "Mai Tấn Thành", email: "thanhmt@bidv.com.vn" }),
  Object.freeze({ key: "t7", code: "T7", shortName: "Huân", name: "Phạm Hoàng Công Huân", email: "huanphc@bidv.com.vn" })
]);
const canonicalTesterByName = new Map(canonicalTesterDirectory.map((tester) => [testerIdentityKey(tester.name), tester]));
const handoffStatusOptions = ["⏯️Chưa bàn giao", "✅ Đã bàn giao"];
const handoffNoteOptions = ["Done RSD", "Done DEV", "Done SIT", "Done UAT"];
const planStatusOptions = ["Chưa bắt đầu", "Đang kiểm thử", "Hoàn thành", "Tạm dừng/Blocked", "Chờ sửa lỗi", "Đã ký UAT"];
const testStatusOptions = ["Chưa Test", "Đang Test", "Passed", "Failed"];
const bugStatusOptions = ["Cancelled", "Closed", "In Progress", "Open", "Pending", "Reopened", "Resolved", "SIT Fail", "SIT Pass", "Reopen"];
const dailyBugStatusOptions = ["Cancelled", "Closed", "In Progress", "Open", "Pending", "Reopened", "Resolved", "SIT Fail"];
const bugSeverityOptions = ["Blocker", "Critical", "Major", "Minor", "Trivial"];
const workCategoryStatusOptions = ["Đang theo dõi", "Hoàn thành", "Tạm dừng"];
const workStatusOptions = ["Chưa bắt đầu", "Đang thực hiện", "Hoàn thành"];
const personalWorkspaceOwner = "thanhmt@bidv.com.vn";
const personalWorkspaceSquads = ["1", "7", "11"];
const personalWorkspaceStatusOptions = ["Chưa bắt đầu", "Đang thực hiện", "Hoàn thành"];
const workPriorityOptions = ["Cao", "Trung bình", "Thấp"];
const planNoteMaxLength = 5000;
const jiraBrowseBaseUrl = "https://bidv-vn.atlassian.net/browse/";
const memberKpiRoleOptions = ["PO", "BA", "Squad Lead", "Tester", "Developer", "Reviewer", "Khác"];
const defaultWorkKpiConfig = {
  id: "work-kpi-default",
  progressWeight: 35,
  onTimeWeight: 25,
  qualityWeight: 20,
  contributionWeight: 10,
  disciplineWeight: 10,
  progressTarget: 100,
  onTimeTarget: 95,
  qualityTarget: 90,
  contributionTarget: 90,
  disciplineTarget: 95
};
const pilotWorkPlanSeedKey = "pilot_workplan_seed_v1";
const deliveryWorkCategoriesMigrationKey = "delivery_work_categories_v1";
const workItemInvariantMigrationKey = "work_item_status_progress_v1";
const workItemInvariantBackupKey = "backup_work_item_status_progress_v1";
const workItemCompletionMigrationKey = "work_item_completion_date_v1";
const workItemCompletionBackupKey = "backup_work_item_completion_date_v1";
const workItemPeopleMigrationKey = "work_item_people_v1";
const workItemPeopleBackupKey = "backup_work_item_people_v1";
const workItemPeopleIdentityMigrationKey = "work_item_people_identity_v1";
const workItemPeopleIdentityBackupKey = "backup_work_item_people_identity_v1";
const tester7PersonnelMigrationKey = "tester_t7_personnel_v1";
const tester7PersonnelBackupKey = "backup_tester_t7_personnel_v1";
const legacyStartDateBackfillField = "_allowStartDateBackfill";
const pilotWorkPlanDocumentUrl = "https://drive.google.com/drive/folders/1mraUTa3nb4bVhikApO9i-uCB-THKbVWd";
const workAssigneeDirectory = {
  "Bùi Thị Mai Phương": "phuongbtm@bidv.com.vn",
  "Nguyễn Châu Giang": "giangnc2@bidv.com.vn",
  "Nguyễn Gia Huy": "huyng@bidv.com.vn",
  "Phạm Anh Tuấn": "tuanpa13@bidv.com.vn",
  "Trần Đình Tuấn": "tuantd3@bidv.com.vn",
  "Lê Trần Sơn": "sonlt8@bidv.com.vn",
  "Huỳnh Công Sinh": "sinhhc@bidv.com.vn",
  "Hoàng Thành Trí": "triht@bidv.com.vn",
  "Mai Tấn Thành": "thanhmt@bidv.com.vn",
  "Phạm Hoàng Công Huân": "huanphc@bidv.com.vn",
  "Uông Thị Hải Yến": "yenuth@bidv.com.vn"
};
const pilotWorkCategories = [
  { id: "pilot-t01", sortOrder: 1, taskPrefix: "SQ2-T01", name: "Kiểm thử chức năng", description: "Theo dõi các đầu việc kiểm thử chức năng Lending Hub.", targetDate: "" },
  { id: "pilot-t02", sortOrder: 2, taskPrefix: "SQ2-T02", name: "Kiểm thử luồng", description: "Theo dõi các luồng nghiệp vụ cần kiểm thử end-to-end.", targetDate: "" },
  { id: "pilot-t03", sortOrder: 3, taskPrefix: "SQ2-T03", name: "Xây dựng Tài liệu Hướng dẫn sử dụng hệ thống Lending Hub", description: "Nguồn: 1_TL HDSD_Squad2_v1 (Deadline 15.07).docx", targetDate: "2026-07-15" },
  { id: "pilot-t04", sortOrder: 4, taskPrefix: "SQ2-T04", name: "Xây dựng Tài liệu Quick Guide khai thác nghiệp vụ hệ thống Lending Hub", description: "Nguồn: 2_Quytrinhhuongdantacnghiep_Squad2_v1 (Deadline 25.07).docx", targetDate: "2026-07-25" },
  { id: "pilot-t05", sortOrder: 5, taskPrefix: "SQ2-T05", name: "Xây dựng Tài liệu Hướng dẫn vận hành hệ thống Lending Hub", description: "Nguồn: 4. TL HDSD SysAdmin_Squad2_v1 (Deadline 10.08).docx", targetDate: "2026-08-10" },
  { id: "pilot-t06", sortOrder: 6, taskPrefix: "SQ2-T06", name: "Xây dựng Tài liệu Quy định vận hành nghiệp vụ hệ thống Lending Hub", description: "Nguồn: 3_Quydinhvanhanh SysAdmin_Squad2_v1 ((Deadline 31.07).docx", targetDate: "2026-07-31" },
  { id: "pilot-t07", sortOrder: 7, taskPrefix: "SQ2-T07", name: "Xây dựng Tài liệu đào tạo hệ thống Lending Hub", description: "Danh sách deliverable theo ảnh sếp gửi ngày 09/07.", targetDate: "" },
  { id: "pilot-t08", sortOrder: 8, taskPrefix: "SQ2-T08", name: "Tham gia ý kiến", description: "Theo dõi các đầu việc góp ý, rà soát và phản hồi tài liệu Pilot.", targetDate: "" },
  { id: "pilot-t09", sortOrder: 9, taskPrefix: "SQ2-T09", name: "Công tác Báo cáo", description: "Nguồn: Phụ lục báo cáo Squad 02 trong tài liệu Quy định vận hành.", targetDate: "" },
  { id: "pilot-t10", sortOrder: 10, taskPrefix: "SQ2-T10", name: "Các công việc khác", description: "Nhóm mở để sếp/admin bổ sung việc phát sinh.", targetDate: "" },
  { id: "delivery-urd", sortOrder: 11, taskPrefix: "SQ2-URD", name: "URD", description: "Theo dõi các công việc liên quan đến tài liệu yêu cầu người dùng (URD).", targetDate: "" },
  { id: "delivery-rsd", sortOrder: 12, taskPrefix: "SQ2-RSD", name: "RSD", description: "Theo dõi các công việc liên quan đến tài liệu đặc tả yêu cầu (RSD).", targetDate: "" }
];
const deliveryWorkCategories = pilotWorkCategories.filter((category) => ["delivery-urd", "delivery-rsd"].includes(category.id));
const protectedWorkCategoryIds = new Set(["pilot-t01", ...deliveryWorkCategories.map((category) => category.id)]);
const pilotWorkSeedItems = [
  { categoryId: "pilot-t03", title: "Tiếp nhận hồ sơ", assignee: "Phạm Anh Tuấn", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P27)" },
  { categoryId: "pilot-t03", title: "Phân bổ tự động (Common Pool)", assignee: "Phạm Anh Tuấn", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P29)" },
  { categoryId: "pilot-t03", title: "Phân bổ thủ công", assignee: "Bùi Thị Mai Phương", collaborators: "Trần Đình Tuấn", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P32)" },
  { categoryId: "pilot-t03", title: "Luân chuyển HSTD", assignee: "Bùi Thị Mai Phương", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P37)" },
  { categoryId: "pilot-t03", title: "Luồng trình duyệt & lịch sử xử lý", assignee: "Bùi Thị Mai Phương", collaborators: "Trần Đình Tuấn", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P39)" },
  { categoryId: "pilot-t03", title: "Tác vụ Trả lại", assignee: "Bùi Thị Mai Phương", collaborators: "Nguyễn Gia Huy", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P159/P199)" },
  { categoryId: "pilot-t03", title: "Thẩm định tín dụng - phần tổng hợp", assignee: "Nguyễn Châu Giang", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P266)" },
  { categoryId: "pilot-t03", title: "Thông tin phi tài chính", assignee: "Phạm Anh Tuấn", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P284)" },
  { categoryId: "pilot-t03", title: "Thông tin quan hệ tại các TCTD", assignee: "Nguyễn Gia Huy", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P329)" },
  { categoryId: "pilot-t03", title: "Quan hệ tại BIDV", assignee: "Nguyễn Gia Huy", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P338)" },
  { categoryId: "pilot-t03", title: "Thông tin CIC", assignee: "Phạm Anh Tuấn", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P358)" },
  { categoryId: "pilot-t03", title: "Nhóm KHLQ", assignee: "Nguyễn Gia Huy", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P360)" },
  { categoryId: "pilot-t03", title: "Phương án cấp tín dụng", assignee: "Lê Trần Sơn", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P398)" },
  { categoryId: "pilot-t03", title: "Quyết định phê duyệt", assignee: "Lê Trần Sơn", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P536)" },
  { categoryId: "pilot-t03", title: "Phê duyệt tín dụng - phần tổng hợp", assignee: "Nguyễn Châu Giang", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P521)" },
  { categoryId: "pilot-t03", title: "Hội đồng tín dụng - phần tổng hợp", assignee: "Nguyễn Châu Giang", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P589)" },
  { categoryId: "pilot-t03", title: "Luồng Hội đồng quản trị", assignee: "Nguyễn Gia Huy", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P637)" },
  { categoryId: "pilot-t03", title: "Quản lý TSBĐ", assignee: "Phạm Anh Tuấn", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P674)" },
  { categoryId: "pilot-t03", title: "Thông tin tài chính", assignee: "Hoàng Thành Trí", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P289)" },
  { categoryId: "pilot-t03", title: "Biện pháp bảo đảm", assignee: "Hoàng Thành Trí", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P465)" },
  { categoryId: "pilot-t03", title: "Đánh giá chung", assignee: "Huỳnh Công Sinh", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P514)" },
  { categoryId: "pilot-t03", title: "Tài liệu tín dụng", assignee: "Huỳnh Công Sinh", dueDate: "2026-07-15", source: "1_TL HDSD_Squad2_v1 (P518)" },

  { categoryId: "pilot-t04", title: "Đệ trình Tờ trình/Báo cáo đề xuất", assignee: "Bùi Thị Mai Phương", dueDate: "2026-07-25", source: "2_Quytrinhhuongdantacnghiep_Squad2_v1 (P6)" },
  { categoryId: "pilot-t04", title: "Kiểm soát, phê duyệt Tờ trình/Báo cáo đề xuất", assignee: "Bùi Thị Mai Phương", dueDate: "2026-07-25", source: "2_Quytrinhhuongdantacnghiep_Squad2_v1 (P12)" },
  { categoryId: "pilot-t04", title: "Ký số Tờ trình/Báo cáo đề xuất", assignee: "Nguyễn Gia Huy", dueDate: "2026-07-25", source: "2_Quytrinhhuongdantacnghiep_Squad2_v1 (P25)" },
  { categoryId: "pilot-t04", title: "Tiếp nhận, khởi tạo Tờ trình/Báo cáo thẩm định", assignee: "Nguyễn Châu Giang", dueDate: "2026-07-25", source: "2_Quytrinhhuongdantacnghiep_Squad2_v1 (P32)" },
  { categoryId: "pilot-t04", title: "Kiểm soát Tờ trình/Báo cáo thẩm định", assignee: "Nguyễn Châu Giang", dueDate: "2026-07-25", source: "2_Quytrinhhuongdantacnghiep_Squad2_v1 (P38)" },
  { categoryId: "pilot-t04", title: "Phê duyệt Tờ trình/Báo cáo thẩm định", assignee: "Nguyễn Châu Giang", dueDate: "2026-07-25", source: "2_Quytrinhhuongdantacnghiep_Squad2_v1 (P44)" },
  { categoryId: "pilot-t04", title: "Ký số Tờ trình/Báo cáo thẩm định", assignee: "Nguyễn Gia Huy", dueDate: "2026-07-25", source: "2_Quytrinhhuongdantacnghiep_Squad2_v1 (P50)" },
  { categoryId: "pilot-t04", title: "Tác nghiệp của cấp thẩm quyền phê duyệt", assignee: "Nguyễn Châu Giang", dueDate: "2026-07-25", source: "2_Quytrinhhuongdantacnghiep_Squad2_v1 (P56)" },
  { categoryId: "pilot-t04", title: "Ký số quyết định phê duyệt và lưu trữ hồ sơ", assignee: "Nguyễn Gia Huy", dueDate: "2026-07-25", source: "2_Quytrinhhuongdantacnghiep_Squad2_v1 (P72)" },
  { categoryId: "pilot-t04", title: "Xử lý trường hợp phê duyệt CAS sai thẩm quyền", assignee: "Bùi Thị Mai Phương", dueDate: "2026-07-25", source: "2_Quytrinhhuongdantacnghiep_Squad2_v1 (P84)" },
  { categoryId: "pilot-t04", title: "Mẫu tờ trình thẩm định, luồng trình", assignee: "Nguyễn Châu Giang", dueDate: "2026-07-25", source: "2_Quytrinhhuongdantacnghiep_Squad2_v1 (P93/P99/P117/P123/P136/P143)" },
  { categoryId: "pilot-t04", title: "Tình huống Omnibus/Commitment", assignee: "Nguyễn Châu Giang", dueDate: "2026-07-25", source: "2_Quytrinhhuongdantacnghiep_Squad2_v1 (P159)" },
  { categoryId: "pilot-t04", title: "Luồng trình, mẫu BCTĐ", assignee: "Bùi Thị Mai Phương", collaborators: "Nguyễn Châu Giang", dueDate: "2026-07-25", source: "2_Quytrinhhuongdantacnghiep_Squad2_v1 (P179)" },

  { categoryId: "pilot-t05", title: "Quản lý cấu hình luồng phê duyệt", assignee: "Bùi Thị Mai Phương", collaborators: "Trần Đình Tuấn", dueDate: "2026-08-10", source: "4. TL HDSD SysAdmin_Squad2_v1 (P50)" },
  { categoryId: "pilot-t05", title: "Quản lý sinh số văn bản", assignee: "Nguyễn Gia Huy", dueDate: "2026-08-10", source: "4. TL HDSD SysAdmin_Squad2_v1 (P92)" },
  { categoryId: "pilot-t05", title: "Quản lý chữ ký số", assignee: "Nguyễn Gia Huy", dueDate: "2026-08-10", source: "4. TL HDSD SysAdmin_Squad2_v1 (P93)" },
  { categoryId: "pilot-t05", title: "Rà soát tham số do Squad 2 đầu mối", dueDate: "2026-08-10", source: "4. TL HDSD SysAdmin_Squad2_v1 (P78)" },

  { categoryId: "pilot-t06", title: "Mục 4 - Quản lý cấu hình luồng phê duyệt, tham số quy trình", dueDate: "2026-07-31", source: "3_Quydinhvanhanh SysAdmin_Squad2_v1 (P1)" },
  { categoryId: "pilot-t06", title: "Mục 5 - Quản lý công cụ phân bổ hồ sơ tự động", dueDate: "2026-07-31", source: "3_Quydinhvanhanh SysAdmin_Squad2_v1 (P4/T1-R4)" },
  { categoryId: "pilot-t06", title: "Mục 6 - Quản lý chữ ký số", assignee: "Nguyễn Gia Huy", dueDate: "2026-07-31", source: "3_Quydinhvanhanh SysAdmin_Squad2_v1 (P8/T1-R14)" },
  { categoryId: "pilot-t06", title: "Quản lý template sinh số văn bản", assignee: "Nguyễn Gia Huy", dueDate: "2026-07-31", source: "3_Quydinhvanhanh SysAdmin_Squad2_v1 (T1-R21)" },

  { categoryId: "pilot-t07", title: "Khung chương trình đào tạo (Training Framework)" },
  { categoryId: "pilot-t07", title: "Training Master Deck" },
  { categoryId: "pilot-t07", title: "Slide đào tạo Workflow" },
  { categoryId: "pilot-t07", title: "Slide đào tạo Thẩm định tín dụng" },
  { categoryId: "pilot-t07", title: "Slide đào tạo Phê duyệt tín dụng" },
  { categoryId: "pilot-t07", title: "Slide đào tạo Tài liệu tín dụng" },
  { categoryId: "pilot-t07", title: "Slide đào tạo Điều kiện tín dụng" },
  { categoryId: "pilot-t07", title: "Demo Script nghiệp vụ" },
  { categoryId: "pilot-t07", title: "Case Study thực hành" },
  { categoryId: "pilot-t07", title: "Bộ câu hỏi FAQ" },
  { categoryId: "pilot-t07", title: "Bộ câu hỏi đánh giá sau đào tạo (Quiz/Assessment)" },
  { categoryId: "pilot-t07", title: "Kịch bản Train the Trainer (TTT)" },
  { categoryId: "pilot-t07", title: "Tài liệu đào tạo Key User" },
  { categoryId: "pilot-t07", title: "Tài liệu đào tạo Pilot Branch" },
  { categoryId: "pilot-t07", title: "Video hướng dẫn (Video Learning Script)" },

  { categoryId: "pilot-t08", title: "Rà soát ý kiến về tác vụ Từ chối/Trả lại chuyển về Squad 2", source: "Comment trong 2_Quytrinhhuongdantacnghiep_Squad2_v1" },
  { categoryId: "pilot-t08", title: "Tham gia ý kiến các tình huống đặc thù của Squad 2", source: "2_Quytrinhhuongdantacnghiep_Squad2_v1 - Chương III" },
  { categoryId: "pilot-t08", title: "Tổng hợp phản hồi góp ý tài liệu Pilot" },

  { categoryId: "pilot-t09", title: "Báo cáo danh sách hồ sơ tín dụng bị trả về", source: "3_Quydinhvanhanh SysAdmin_Squad2_v1 (T2-R16)" },
  { categoryId: "pilot-t09", title: "Báo cáo danh sách hồ sơ tín dụng bị từ chối", source: "3_Quydinhvanhanh SysAdmin_Squad2_v1 (T2-R17)" },
  { categoryId: "pilot-t09", title: "Báo cáo tổng hợp hồ sơ cấp tín dụng được phê duyệt tại Chi nhánh", source: "3_Quydinhvanhanh SysAdmin_Squad2_v1 (T2-R18)" },
  { categoryId: "pilot-t09", title: "Báo cáo tổng hợp hồ sơ cấp tín dụng được phê duyệt tại Trụ sở chính", source: "3_Quydinhvanhanh SysAdmin_Squad2_v1 (T2-R19)" },
  { categoryId: "pilot-t09", title: "Báo cáo tổng hợp hồ sơ cấp tín dụng đang xử lý tại Chi nhánh & TSC", source: "3_Quydinhvanhanh SysAdmin_Squad2_v1 (T2-R20)" },
  { categoryId: "pilot-t09", title: "Báo cáo hồ sơ tín dụng do HĐQT thông qua", source: "3_Quydinhvanhanh SysAdmin_Squad2_v1 (T2-R21)" },
  { categoryId: "pilot-t09", title: "Báo cáo hồ sơ xin ý kiến Hội đồng", source: "3_Quydinhvanhanh SysAdmin_Squad2_v1 (T2-R22)" },
  { categoryId: "pilot-t09", title: "Báo cáo hồ sơ khác biệt trọng yếu giữa BPTD và BPĐX", source: "3_Quydinhvanhanh SysAdmin_Squad2_v1 (T2-R23)" },
  { categoryId: "pilot-t09", title: "Báo cáo kết quả phân bổ hồ sơ tự động", source: "3_Quydinhvanhanh SysAdmin_Squad2_v1 (T2-R24)" },
  { categoryId: "pilot-t09", title: "Báo cáo danh sách văn bản đã sinh số", assignee: "Nguyễn Gia Huy", source: "3_Quydinhvanhanh SysAdmin_Squad2_v1 (T2-R25)" }
];
const collectionRules = {
  features: {
    required: ["code", "name"],
    numbers: ["stt", "totalCases", "passedCases", "failedCases", "blockedCases", "defectOpen", "blockerOpen", "criticalOpen", "openBugs"],
    percents: ["completionRate"],
    enums: {
      status: featureStatusOptions,
      owner: ownerOptions,
      handoffStatus: handoffStatusOptions
    }
  },
  personnel: {
    required: ["staffCode", "name"],
    numbers: ["birthYear"],
    percents: [],
    enums: {}
  },
  schedule: {
    required: ["sprint"],
    numbers: [],
    percents: [],
    enums: {}
  },
  handoffs: {
    required: ["jiraCode", "name"],
    numbers: [],
    percents: [],
    enums: {
      handoffStatus: handoffStatusOptions,
      note: handoffNoteOptions,
      uatStatus: handoffNoteOptions
    }
  },
  plans: {
    required: ["feature"],
    numbers: ["nv", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "totalCases", "executedCases", "priority"],
    percents: ["progress"],
    enums: {
      owner: ownerOptions,
      testStatus: testStatusOptions,
      uatStatus: planStatusOptions,
      devStatus: handoffNoteOptions
    }
  },
  daily: {
    required: ["date", "tester"],
    numbers: ["totalCases", "executedCases", "passedCases", "failedCases", "criticalBugs", "highBugs"],
    percents: [],
    enums: {
      bugStatus: dailyBugStatusOptions,
      maxBugSeverity: bugSeverityOptions,
      handler: personnelNameOptions
    }
  },
  defects: {
    required: [],
    numbers: ["aging"],
    percents: [],
    enums: {
      severity: bugSeverityOptions,
      status: bugStatusOptions,
      tester: personnelNameOptions,
      owner: ownerOptions
    }
  },
  userStories: {
    required: ["issueKey"],
    numbers: [],
    percents: [],
    enums: {}
  },
  bugSources: {
    required: ["issueKey"],
    numbers: [],
    percents: [],
    enums: {
      priority: bugSeverityOptions,
      status: bugStatusOptions
    }
  },
  defectSummary: {
    required: ["jiraCode"],
    numbers: ["stt", "totalCases", "passedCases", "failedCases", "blockedCases", "defectOpen", "blockerOpen", "criticalOpen", "totalBugs", "openBugs", "inProgressBugs", "pendingBugs", "resolvedBugs", "sitPassBugs", "otherBugs", "activeBugs", "handledBugs", "severeBugs"],
    percents: ["handledRate", "completionRate"],
    enums: {
      owner: ownerOptions
    }
  },
  weekly: {
    required: ["week"],
    numbers: ["totalStories", "storyTested", "totalCases", "executedCases", "passedCases", "blockerBugs", "criticalBugs", "majorBugs", "highBugs", "totalOpenBugs", "reopenedBugs"],
    percents: ["coverageRate", "successRate", "reopenRate"],
    enums: {}
  },
  readiness: {
    required: ["sprint"],
    numbers: ["totalStories", "deliveredStories", "totalCases", "executedCases", "passedCases", "openBlockerBugs", "openCriticalBugs", "openMajorBugs", "openHighBugs"],
    percents: ["coverageRate", "successRate", "reopenRate", "trainingReadiness", "pilotReadiness"],
    enums: {}
  },
  matrix: {
    required: ["group"],
    numbers: ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "totalParticipation", "target"],
    percents: [],
    enums: {}
  },
  guide: {
    required: ["topic", "content"],
    numbers: ["index"],
    percents: [],
    enums: {}
  },
  workCategories: {
    required: ["name"],
    numbers: ["sortOrder"],
    percents: [],
    enums: {
      status: workCategoryStatusOptions
    }
  },
  workItems: {
    required: ["title", "categoryId", "status"],
    numbers: ["sortOrder"],
    percents: ["progress"],
    enums: {
      status: workStatusOptions,
      priority: workPriorityOptions
    }
  },
  kpiConfig: {
    required: [],
    numbers: [],
    percents: ["progressWeight", "onTimeWeight", "qualityWeight", "contributionWeight", "disciplineWeight", "progressTarget", "onTimeTarget", "qualityTarget", "contributionTarget", "disciplineTarget"],
    enums: {}
  },
  memberKpiInputs: {
    required: ["memberEmail"],
    numbers: ["capacity"],
    percents: ["qualityScore", "contributionScore", "disciplineScore"],
    enums: {
      role: memberKpiRoleOptions
    }
  }
};
const personnelExtendedFields = [
  { key: "bidvJoinDate", label: "Ngày vào BIDV", column: 10 },
  { key: "salaryGrade", label: "Cấp lương", column: 11 },
  { key: "salaryStep", label: "Bậc lương", column: 12 }
];
const excelSheets = [
  {
    collection: "personnel",
    name: "NhanSu_UAT",
    columns: [
      ["staffCode", "Mã nhân sự", 12],
      ["name", "Họ tên", 24],
      ["role", "Vai trò", 28],
      ["scope", "Phạm vi chính", 42],
      ["status", "Trạng thái", 18],
      ["birthYear", "Năm sinh", 12, "number"],
      ["phone", "SĐT", 16],
      ["email", "Email", 28],
      ["unit", "Đơn vị", 22],
      ["bidvJoinDate", "Ngày vào BIDV", 16, "date"],
      ["salaryGrade", "Cấp lương", 14],
      ["salaryStep", "Bậc lương", 14]
    ]
  },
  {
    collection: "guide",
    name: "HD_UAT",
    sectionKey: "category",
    sectionColumnKey: "topic",
    columns: [
      ["category", "Nhóm nội dung", 28],
      ["index", "STT", 8, "number"],
      ["topic", "Nội dung", 34],
      ["content", "Cách sử dụng / Ý nghĩa", 64],
      ["note", "Quy ước", 44]
    ]
  },
  {
    collection: "schedule",
    name: "Lich_UAT",
    state: "hidden",
    columns: [
      ["sprint", "Sprint", 14],
      ["devStart", "Bắt đầu DEV", 16, "date"],
      ["devEnd", "Kết thúc DEV", 16, "date"],
      ["handoffDate", "Bàn giao UAT", 16, "date"],
      ["startDate", "Bắt đầu UAT", 16, "date"],
      ["endDate", "Kết thúc UAT", 16, "date"],
      ["note", "Ghi chú", 44]
    ]
  },
  {
    collection: "features",
    name: "DM_ChucNang",
    freezeColumns: 4,
    columns: [
      ["stt", "STT", 8, "number"],
      ["code", "Mã CN", 12],
      ["storyCode", "Mã Story", 12],
      ["jiraCode", "Mã Jira", 20],
      ["group", "Nhóm chức năng", 28],
      ["name", "Tên chức năng", 34],
      ["sprint", "Sprint", 16],
      ["owner", "Đầu mối nghiệp vụ", 28],
      ["uatHandoff", "Ngày BG UAT", 16, "date"],
      ["handoffStatus", "Trạng thái BG", 18],
      ["totalCases", "Tổng TC", 12, "number"],
      ["passedCases", "Passed", 12, "number"],
      ["failedCases", "Failed", 12, "number"],
      ["blockedCases", "Blocked", 12, "number"],
      ["defectOpen", "Defect Open", 14, "number"],
      ["blockerOpen", "Blocker Open", 14, "number"],
      ["criticalOpen", "Critical Open", 14, "number"],
      ["uatResult", "Kết quả UAT", 18],
      ["status", "Trạng thái UAT", 18],
      ["completionRate", "% Hoàn thành TC", 16, "number"]
    ]
  },
  {
    collection: "handoffs",
    name: "Lich_BG_US",
    sectionKey: "sectionLevel1",
    sectionColumnKey: "name",
    columns: [
      ["jiraCode", "Mã Jira", 20],
      ["code", "Mã CN", 12],
      ["storyCode", "Mã Story", 12],
      ["name", "Tên chức năng", 34],
      ["sprint", "Sprint", 16],
      ["uatHandoff", "BG UAT", 14, "date"],
      ["uatStart", "Bắt đầu UAT", 14, "date"],
      ["uatEnd", "Kết thúc UAT", 14, "date"],
      ["handoffStatus", "Trạng thái BG", 18],
      ["uatStatus", "Trạng thái UAT", 18]
    ]
  },
  {
    collection: "plans",
    name: "PhanCong_UAT",
    columns: [
      ["code", "Mã CN", 12],
      ["jiraCode", "Mã Jira", 20],
      ["group", "Nhóm chức năng", 28],
      ["feature", "Tên chức năng", 34],
      ["sprint", "Sprint", 16],
      ["uatHandoff", "Bàn giao UAT", 14, "date"],
      ["owner", "Đầu mối nghiệp vụ", 28],
      ["nv", "NV", 10, "number"],
      ["t1", "T1", 10, "number"],
      ["t2", "T2", 10, "number"],
      ["t3", "T3", 10, "number"],
      ["t4", "T4", 10, "number"],
      ["t5", "T5", 10, "number"],
      ["t6", "T6", 10, "number"],
      ["t7", "T7", 10, "number"],
      ["totalCases", "Tổng Testcase", 14, "number"],
      ["testStatus", "Trạng thái kiểm thử", 20],
      ["progress", "% hoàn thành", 16, "number"],
      ["uatStatus", "Trạng thái UAT", 18],
      ["devStatus", "Trạng thái DEV", 18],
      ["priority", "Mức độ ưu tiên", 16, "number"],
      ["note", "Ghi chú", 24]
    ]
  },
  {
    collection: "daily",
    name: "DieuHanh_Ngay",
    columns: [
      ["date", "Ngày", 14, "date"],
      ["jiraCode", "Mã Jira", 20],
      ["feature", "Tên chức năng", 34],
      ["sprint", "Sprint", 16],
      ["tester", "Tester", 18],
      ["totalCases", "Tổng TC", 12, "number"],
      ["passedCases", "TC Passed", 12, "number"],
      ["failedCases", "TC Failed", 12, "number"],
      ["bugStatus", "Trạng thái lỗi", 18],
      ["maxBugSeverity", "Mức độ lỗi", 16],
      ["bugDetail", "Chi tiết lỗi", 30],
      ["blocker", "Vướng mắc/Blocker", 32],
      ["handler", "Người xử lý", 20],
      ["dueDate", "Thời hạn xử lý", 16, "date"]
    ]
  },
  {
    collection: "defects",
    name: "DEFECT_LOG",
    columns: [
      ["stt", "STT", 8, "number"],
      ["bugId", "Bug ID", 14],
      ["linkedUsKey", "Mã US liên kết", 18],
      ["storyName", "Tên Story", 34],
      ["sprint", "Sprint", 16],
      ["severity", "Severity", 14],
      ["status", "Status", 16],
      ["foundDate", "Ngày phát hiện", 16, "date"],
      ["tester", "Tester", 18],
      ["owner", "Owner", 28],
      ["resolvedDate", "Ngày xử lý", 16, "date"],
      ["aging", "Aging", 10, "number"],
      ["note", "Ghi chú", 30]
    ]
  },
  {
    collection: "userStories",
    name: "DS_US",
    tabColor: "FFFF0000",
    columns: [
      ["sourceNote", "Ghi chú nguồn", 22],
      ["issueType", "Issue Type", 14],
      ["issueKey", "Issue key", 18],
      ["issueId", "Issue id", 14],
      ["summary", "Summary", 52],
      ["assignee", "Assignee", 30],
      ["assigneeId", "Assignee Id", 24],
      ["reporter", "Reporter", 30],
      ["reporterId", "Reporter Id", 24],
      ["priority", "Priority", 14],
      ["status", "Status", 14],
      ["resolution", "Resolution", 16],
      ["created", "Created", 14, "date"],
      ["updated", "Updated", 14, "date"],
      ["dueDate", "Due date", 14, "date"],
      ["squadSummary", "SQ2_Summary", 20]
    ]
  },
  {
    collection: "bugSources",
    name: "DS.Loi",
    tabColor: "FFFF0000",
    columns: [
      ["reporterLookup", "Reporter lookup", 26],
      ["testerLookup", "Tester lookup", 18],
      ["issueType", "Issue Type", 14],
      ["issueKey", "Issue key", 18],
      ["issueId", "Issue id", 14],
      ["summary", "Summary", 52],
      ["assignee", "Assignee", 30],
      ["assigneeId", "Assignee Id", 24],
      ["reporter", "Reporter", 30],
      ["reporterId", "Reporter Id", 24],
      ["priority", "Priority", 14],
      ["status", "Status", 14],
      ["resolution", "Resolution", 16],
      ["created", "Created", 14, "date"],
      ["updated", "Updated", 14, "date"],
      ["dueDate", "Due date", 14, "date"],
      ["actualEnd", "Custom field (Actual end)", 18, "date"],
      ["timeSpent", "Time Spent", 14],
      ["inwardBlocks", "Inward issue link (Blocks)", 22],
      ["linkedUsKey", "Inward issue link (Parent of)", 24]
    ]
  },
  {
    collection: "defectSummary",
    name: "Tong hop loi",
    columns: [
      ["stt", "STT", 8, "number"],
      ["code", "Mã CN", 12],
      ["storyCode", "Mã Story", 12],
      ["jiraCode", "Mã Jira", 18],
      ["usKey", "Mã US", 18],
      ["group", "Nhóm chức năng", 28],
      ["name", "Tên chức năng", 34],
      ["sprint", "Sprint", 16],
      ["owner", "Đầu mối nghiệp vụ", 28],
      ["uatHandoff", "Ngày BG UAT", 16, "date"],
      ["handoffStatus", "Trạng thái BG", 18],
      ["assignee", "Assignee", 28],
      ["usStatus", "Trạng thái US", 18],
      ["totalCases", "Tổng TC", 12, "number"],
      ["passedCases", "Passed", 12, "number"],
      ["failedCases", "Failed", 12, "number"],
      ["blockedCases", "Blocked", 12, "number"],
      ["defectOpen", "Defect Open", 14, "number"],
      ["blockerOpen", "Blocker Open", 14, "number"],
      ["criticalOpen", "Critical Open", 14, "number"],
      ["totalBugs", "Tổng lỗi", 12, "number"],
      ["openBugs", "Open", 12, "number"],
      ["inProgressBugs", "In Progress", 14, "number"],
      ["pendingBugs", "Pending", 12, "number"],
      ["resolvedBugs", "Resolved", 12, "number"],
      ["sitPassBugs", "SIT Pass", 12, "number"],
      ["otherBugs", "Khác", 12, "number"],
      ["activeBugs", "Đang mở", 12, "number"],
      ["handledBugs", "Đã xử lý", 12, "number"],
      ["handledRate", "% xử lý", 12, "number"],
      ["severeBugs", "Lỗi nghiêm trọng", 16, "number"],
      ["uatResult", "Kết quả UAT", 18],
      ["status", "Trạng thái UAT", 18],
      ["completionRate", "% Hoàn thành TC", 16, "number"]
    ]
  },
  {
    collection: "weekly",
    name: "ChatLuong_Tuan",
    columns: [
      ["week", "Tuần", 14],
      ["sprint", "Sprint", 16],
      ["totalStories", "Tổng Story", 12, "number"],
      ["storyTested", "Story đã test", 14, "number"],
      ["coverageRate", "Coverage %", 14, "number"],
      ["successRate", "Pass Rate %", 14, "number"],
      ["blockerBugs", "Blocker Open", 14, "number"],
      ["criticalBugs", "Critical Open", 14, "number"],
      ["reopenRate", "Reopen Rate", 14, "number"],
      ["assessment", "Đánh giá", 18]
    ]
  },
  {
    collection: "readiness",
    name: "TongKet_Sprint",
    columns: [
      ["sprint", "Sprint", 14],
      ["totalStories", "Tổng Story", 12, "number"],
      ["deliveredStories", "Story đã bàn giao", 16, "number"],
      ["coverageRate", "Tỷ lệ bao phủ", 14, "number"],
      ["successRate", "Pass Rate %", 14, "number"],
      ["openBlockerBugs", "Blocker Open", 14, "number"],
      ["openCriticalBugs", "Critical Open", 14, "number"],
      ["openMajorBugs", "Major Open", 14, "number"],
      ["reopenRate", "Reopen Rate", 14, "number"],
      ["decision", "Quyết định", 20]
    ]
  },
  {
    collection: "matrix",
    name: "NangSuat_Tester",
    columns: [
      ["group", "Nhóm chức năng", 34],
      ["t1", "T1", 10, "number"],
      ["t2", "T2", 10, "number"],
      ["t3", "T3", 10, "number"],
      ["t4", "T4", 10, "number"],
      ["t5", "T5", 10, "number"],
      ["t6", "T6", 10, "number"],
      ["t7", "T7", 10, "number"],
      ["totalParticipation", "Tổng lượt tham gia", 18, "number"],
      ["target", "Mục tiêu", 12, "number"],
      ["warning", "Cảnh báo", 20]
    ]
  }
];

const excelSheetOrder = [
  "NhanSu_UAT",
  "HD_UAT",
  "DM_ChucNang",
  "Lich_UAT",
  "Lich_BG_US",
  "PhanCong_UAT",
  "DieuHanh_Ngay",
  "DEFECT_LOG",
  "ChatLuong_Tuan",
  "TongKet_Sprint",
  "NangSuat_Tester",
  "Tong hop loi",
  "DS_US",
  "DS.Loi"
];

function orderedExcelSheets() {
  const byName = new Map(excelSheets.map((sheetConfig) => [sheetConfig.name, sheetConfig]));
  return excelSheetOrder.map((name) => byName.get(name)).filter(Boolean);
}

let pool;
let schemaPromise;

app.disable("x-powered-by");
app.set("trust proxy", 1);
const jsonBodyParser = express.json({ limit: requestBodyLimit });
app.use((req, res, next) => {
  const rawAttachmentUpload = req.method === "POST"
    && /^\/api\/work-items\/[^/]+\/attachments$/.test(req.path);
  if (rawAttachmentUpload) {
    next();
    return;
  }
  jsonBodyParser(req, res, next);
});
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

app.get("/api/health", async (req, res) => {
  const baseHealth = {
    ok: true,
    service: "squad2-uat-command-center",
    timestamp: new Date().toISOString()
  };
  try {
    await ensureSchema();
    await getPool().query("select 1");
    res.json({
      ...baseHealth,
      db: "online",
      ready: true
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.json({
      ...baseHealth,
      db: "offline",
      error: publicError(error),
      ready: false
    });
  }
});

app.get("/api/auth/me", asyncHandler(async (req, res) => {
  await ensureSchema();
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, user });
}));

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  await ensureSchema();
  const identifier = String(req.body.identifier || req.body.email || req.body.username || "").trim().toLowerCase();
  const identifierCandidates = loginIdentifierCandidates(identifier);
  const password = String(req.body.password || "");
  if (!identifier || !password) {
    throw httpError(400, "Vui lòng nhập tài khoản và mật khẩu.");
  }

  const result = await getPool().query(`
    select id, username, email, name, role, password_hash, active, avatar_data
    from app_users
    where lower(username) = any($1::text[]) or lower(coalesce(email, '')) = any($1::text[])
    limit 1
  `, [identifierCandidates]);
  const user = result.rows[0];
  if (!user || !user.active || !(await verifyPassword(password, user.password_hash))) {
    throw httpError(401, "Tài khoản hoặc mật khẩu không đúng.");
  }

  const publicUser = toPublicUser(user);
  setSessionCookie(req, res, signSession(publicUser));
  res.json({ authenticated: true, user: publicUser });
}));

app.post("/api/auth/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get("/api/email-notifications/oauth/callback", async (req, res) => {
  const redirectWithStatus = (status, message = "") => {
    const query = new URLSearchParams({ gmail: status });
    if (message) query.set("message", message.slice(0, 240));
    res.redirect(`/?${query.toString()}#work/inputs`);
  };
  try {
    await ensureSchema();
    if (req.query.error) {
      redirectWithStatus("error", "Google chưa cấp đủ quyền cho hệ thống.");
      return;
    }
    const state = verifyOAuthState(req.query.state, sessionSecret);
    if (!state?.userId || !state?.redirectUri) {
      redirectWithStatus("error", "Phiên kết nối Google đã hết hạn. Hãy thực hiện lại.");
      return;
    }
    const userResult = await getPool().query(`
      select id, role, active
      from app_users
      where id = $1
      limit 1
    `, [state.userId]);
    const user = userResult.rows[0];
    if (!user?.active || user.role !== "admin") {
      redirectWithStatus("error", "Tài khoản không còn quyền kết nối Google.");
      return;
    }
    await deadlineNotificationService.connectFromAuthorizationCode(getPool(), {
      code: String(req.query.code || ""),
      redirectUri: state.redirectUri
    });
    redirectWithStatus("connected");
  } catch (error) {
    console.error("Gmail OAuth callback failed:", error);
    redirectWithStatus("error", publicError(error));
  }
});

app.use("/api", requireApiAuth);

app.patch("/api/auth/profile", asyncHandler(async (req, res) => {
  await ensureSchema();
  const name = normalizeDisplayName(req.body.name, req.user.name || req.user.username);
  const avatarData = Object.prototype.hasOwnProperty.call(req.body, "avatarData")
    ? normalizeAvatarData(req.body.avatarData)
    : req.user.avatarData || "";
  const result = await getPool().query(`
    update app_users
    set name = $1,
        avatar_data = $2,
        updated_at = now()
    where id = $3 and active = true
    returning id, username, email, name, role, active, avatar_data, created_at, updated_at
  `, [name, avatarData || null, req.user.id]);

  if (!result.rows[0]) throw httpError(404, "Không tìm thấy tài khoản.");
  const user = toPublicUser(result.rows[0]);
  setSessionCookie(req, res, signSession(user));
  res.json({ user });
}));

app.post("/api/auth/change-password", asyncHandler(async (req, res) => {
  await ensureSchema();
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  validatePassword(newPassword);
  if (!currentPassword) throw httpError(400, "Vui lòng nhập mật khẩu hiện tại.");

  const result = await getPool().query(`
    select id, password_hash
    from app_users
    where id = $1 and active = true
    limit 1
  `, [req.user.id]);
  const user = result.rows[0];
  if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
    throw httpError(401, "Mật khẩu hiện tại không đúng.");
  }

  const passwordHash = await hashPassword(newPassword);
  await getPool().query(`
    update app_users
    set password_hash = $1,
        password_changed_at = now(),
        updated_at = now()
    where id = $2
  `, [passwordHash, req.user.id]);
  res.json({ ok: true });
}));

app.get("/api/directory/users", asyncHandler(async (req, res) => {
  await ensureSchema();
  const result = await getPool().query(`
    select id, username, email, name, role, active, avatar_data
    from app_users
    where active = true
    order by name asc, username asc
  `);
  res.json({ users: result.rows.map(toPublicUser) });
}));

app.get("/api/auth/users", requireAdmin, asyncHandler(async (req, res) => {
  await ensureSchema();
  const result = await getPool().query(`
    select id, username, email, name, role, active, avatar_data, created_at, updated_at
    from app_users
    order by created_at asc
  `);
  res.json({ users: result.rows.map(toPublicUser) });
}));

app.post("/api/auth/users", requireAdmin, asyncHandler(async (req, res) => {
  await ensureSchema();
  const username = String(req.body.username || "").trim().toLowerCase();
  const email = String(req.body.email || "").trim().toLowerCase() || null;
  const name = String(req.body.name || username || email || "").trim();
  const role = roleForIdentity(username, email);
  const password = String(req.body.password || "");
  validateNewUser({ username, email, name, password });
  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();
  const result = await getPool().query(`
    insert into app_users (id, username, email, name, role, password_hash, active)
    values ($1, $2, $3, $4, $5, $6, true)
    returning id, username, email, name, role, active, avatar_data, created_at, updated_at
  `, [id, username, email, name, role, passwordHash]);
  res.status(201).json({ user: toPublicUser(result.rows[0]) });
}));

app.get("/api/email-notifications/settings", requireAdmin, asyncHandler(async (req, res) => {
  await ensureSchema();
  const callbackUrl = gmailOAuthRedirectUri(req);
  const status = await deadlineNotificationService.getPublicStatus(getPool(), { callbackUrl });
  res.json(status);
}));

app.post("/api/email-notifications/settings", requireAdmin, asyncHandler(async (req, res) => {
  await ensureSchema();
  const settings = await deadlineNotificationService.saveSettings(getPool(), {
    enabled: req.body.enabled !== false,
    managerEmails: req.body.managerEmails,
    timeZone: req.body.timeZone,
    appBaseUrl: req.body.appBaseUrl || publicAppBaseUrl(req)
  }, req.user);
  res.json({ settings });
}));

app.post("/api/email-notifications/oauth/start", requireAdmin, asyncHandler(async (req, res) => {
  await ensureSchema();
  const redirectUri = gmailOAuthRedirectUri(req);
  const state = signOAuthState({
    userId: req.user.id,
    redirectUri,
    nonce: crypto.randomUUID(),
    exp: Date.now() + 10 * 60 * 1000
  }, sessionSecret);
  res.json({ url: deadlineNotificationService.buildAuthorizationUrl({ redirectUri, state }) });
}));

app.post("/api/email-notifications/disconnect", requireAdmin, asyncHandler(async (req, res) => {
  await ensureSchema();
  await deadlineNotificationService.disconnect(getPool());
  res.json({ ok: true });
}));

app.get("/api/email-notifications/preview", requireAdmin, asyncHandler(async (req, res) => {
  await ensureSchema();
  const preview = await deadlineNotificationService.preview(getPool(), {
    forceManagerDigest: req.query.manager === "true"
  });
  res.json({ preview });
}));

app.post("/api/email-notifications/test", requireAdmin, asyncHandler(async (req, res) => {
  await ensureSchema();
  const result = await deadlineNotificationService.sendTest(getPool(), req.body.recipient);
  res.json({ result });
}));

app.post("/api/email-notifications/manager-status", requireAdmin, asyncHandler(async (req, res) => {
  await ensureSchema();
  const result = await deadlineNotificationService.sendManagerStatus(getPool(), {
    recipients: req.body.recipients,
    todayKey: req.body.todayKey
  });
  res.json({ result });
}));

app.post("/api/email-notifications/run", requireAdmin, asyncHandler(async (req, res) => {
  await ensureSchema();
  const result = await deadlineNotificationService.run(getPool(), {
    force: true,
    forceManagerDigest: req.body.forceManagerDigest === true
  });
  res.json({ result });
}));

app.get("/api/google-sheet-sync/status", requireAdmin, asyncHandler(async (req, res) => {
  await ensureSchema();
  const status = await getGoogleSheetSyncStatus(getPool(), req);
  res.json(status);
}));

app.post("/api/google-sheet-sync/settings", requireAdmin, asyncHandler(async (req, res) => {
  await ensureSchema();
  const settings = await saveGoogleSheetSyncSettings(getPool(), {
    enabled: req.body.enabled !== false,
    spreadsheetId: req.body.spreadsheetId || req.body.spreadsheetUrl,
    intervalMinutes: req.body.intervalMinutes,
    minimumRowRatio: req.body.minimumRowRatio
  }, req.user);
  await scheduleNextGoogleSheetSync({ reset: true });
  res.json({ settings });
}));

app.post("/api/google-sheet-sync/preview", requireAdmin, asyncHandler(async (req, res) => {
  await ensureSchema();
  const preview = await previewGoogleSheetSync(getPool(), {
    spreadsheetId: req.body.spreadsheetId || req.body.spreadsheetUrl
  });
  res.json({ preview });
}));

app.post("/api/google-sheet-sync/run", requireAdmin, asyncHandler(async (req, res) => {
  await ensureSchema();
  const result = await runGoogleSheetSync({
    force: true,
    actorId: req.user.id,
    spreadsheetId: req.body.spreadsheetId || req.body.spreadsheetUrl
  });
  res.json({ result });
}));

app.get("/api/attachments/storage-status", requireAdmin, asyncHandler(async (req, res) => {
  await ensureSchema();
  const status = await driveAttachmentService.getStorageStatus(getPool());
  res.json(status);
}));

app.get("/api/work-items/:id/attachments", asyncHandler(async (req, res) => {
  await ensureSchema();
  const workItem = await getWorkItemRecordForAttachment(getPool(), req.params.id);
  const attachments = await listWorkItemAttachments(getPool(), req.params.id, req.user, workItem);
  res.json({
    attachments,
    maxFileSizeBytes: driveAttachmentService.maxFileSizeBytes
  });
}));

app.post("/api/work-items/:id/attachments", asyncHandler(async (req, res) => {
  await ensureSchema();
  const workItem = await getWorkItemRecordForAttachment(getPool(), req.params.id);
  if (!canEditRecord(req.user, workItem)) {
    throw httpError(403, "Bạn không có quyền đính kèm file vào công việc này.");
  }

  const fileName = decodeUploadFileName(req.get("x-file-name"));
  const mimeType = normalizeMimeType(req.get("x-file-type") || req.get("content-type"), fileName);
  const declaredSize = parseAttachmentSize(req.get("x-file-size") || req.get("content-length"));
  const contentLength = req.get("content-length") ? parseAttachmentSize(req.get("content-length")) : declaredSize;
  const uploadKey = normalizeUploadKey(req.get("x-upload-key"));
  if (contentLength !== declaredSize) throw httpError(400, "Dung lượng file gửi lên không khớp với file đã chọn.");

  const existing = await getAttachmentByUploadKey(getPool(), uploadKey);
  if (existing && (existing.work_item_id !== workItem.data.id || existing.created_by !== req.user.id)) {
    throw httpError(409, "Mã upload đã được sử dụng. Hãy chọn tải lại file.");
  }
  if (existing?.status === "completed" && !existing.deleted_at) {
    res.json({ attachment: mapAttachmentRow(existing, req.user, workItem), duplicate: true });
    return;
  }
  if (existing?.deleted_at) {
    throw httpError(409, "Mã upload cũ đã hết hiệu lực. Hãy chọn tải lại file.");
  }
  if (existing?.status === "uploading") {
    throw httpError(409, "File này đang được tải lên. Vui lòng chờ hoàn tất.");
  }

  const attachmentId = existing?.id || crypto.randomUUID();
  await getPool().query(`
    insert into work_item_attachments (
      id, work_item_id, task_id, upload_key, original_name, mime_type,
      size_bytes, status, created_by, created_at, updated_at
    )
    values ($1, $2, $3, $4, $5, $6, $7, 'uploading', $8, now(), now())
    on conflict (upload_key) do update
      set status = 'uploading',
          error_message = null,
          updated_at = now()
  `, [
    attachmentId,
    workItem.data.id,
    workItem.data.taskId || "",
    uploadKey,
    fileName,
    mimeType,
    declaredSize,
    req.user.id
  ]);

  const abortController = new AbortController();
  req.once("aborted", () => abortController.abort());
  let driveResult;
  try {
    driveResult = await driveAttachmentService.upload(getPool(), {
      stream: req,
      contentLength: declaredSize,
      fileName,
      mimeType,
      workItem: workItem.data,
      uploader: req.user,
      signal: abortController.signal
    });
    const updated = await getPool().query(`
      update work_item_attachments
      set drive_file_id = $1,
          drive_folder_id = $2,
          drive_web_view_link = $3,
          sha256 = $4,
          status = 'completed',
          error_message = null,
          updated_at = now()
      where upload_key = $5
      returning *
    `, [
      driveResult.driveFile.id,
      driveResult.taskFolder.id,
      driveResult.driveFile.webViewLink || "",
      driveResult.sha256,
      uploadKey
    ]);
    if (!updated.rows[0]) {
      await driveAttachmentService.trash(getPool(), driveResult.driveFile.id).catch(() => {});
      throw httpError(500, "Không lưu được thông tin file sau khi upload.");
    }
    res.status(201).json({ attachment: mapAttachmentRow(updated.rows[0], req.user, workItem) });
  } catch (error) {
    if (driveResult?.driveFile?.id) {
      await driveAttachmentService.trash(getPool(), driveResult.driveFile.id).catch(() => {});
    }
    await getPool().query(`
      update work_item_attachments
      set status = 'failed',
          error_message = $1,
          updated_at = now()
      where upload_key = $2
    `, [publicError(error).slice(0, 500), uploadKey]).catch(() => {});
    throw error;
  }
}));

app.get("/api/attachments/:id/preview", asyncHandler(async (req, res) => {
  await ensureSchema();
  const row = await getAttachmentRecord(getPool(), req.params.id);
  const workItem = await getWorkItemRecordForAttachment(getPool(), row.work_item_id);
  const preview = await driveAttachmentService.getPreview(getPool(), attachmentServiceInput(row));
  res.json({
    attachment: mapAttachmentRow(row, req.user, workItem),
    preview,
    contentUrl: ["inline", "presentation"].includes(preview.kind)
      ? `/api/attachments/${encodeURIComponent(row.id)}/content?inline=1`
      : ""
  });
}));

app.get("/api/attachments/:id/content", asyncHandler(async (req, res) => {
  await ensureSchema();
  const row = await getAttachmentRecord(getPool(), req.params.id);
  await getWorkItemRecordForAttachment(getPool(), row.work_item_id);
  const upstream = await driveAttachmentService.getContent(getPool(), row.drive_file_id, {
    range: req.get("range") || ""
  });
  const inline = req.query.inline === "1";
  res.status(upstream.status);
  res.setHeader("Content-Type", safeAttachmentResponseMime(row.mime_type, inline));
  res.setHeader("Content-Disposition", attachmentContentDisposition(row.original_name, inline));
  res.setHeader("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
  for (const header of ["content-length", "content-range", "etag", "last-modified"]) {
    const value = upstream.headers.get(header);
    if (value) res.setHeader(header, value);
  }
  if (!upstream.body) {
    res.end();
    return;
  }
  Readable.fromWeb(upstream.body).on("error", (error) => {
    if (!res.headersSent) res.status(502);
    res.destroy(error);
  }).pipe(res);
}));

app.delete("/api/attachments/:id", asyncHandler(async (req, res) => {
  await ensureSchema();
  const row = await getAttachmentRecord(getPool(), req.params.id);
  const workItem = await getWorkItemRecordForAttachment(getPool(), row.work_item_id);
  if (!canDeleteAttachment(req.user, row, workItem)) {
    throw httpError(403, "Bạn không có quyền xóa file này.");
  }
  await driveAttachmentService.trash(getPool(), row.drive_file_id);
  await getPool().query(`
    update work_item_attachments
    set status = 'deleted',
        deleted_by = $1,
        deleted_at = now(),
        updated_at = now()
    where id = $2
  `, [req.user.id, row.id]);
  res.json({ ok: true });
}));

app.get("/api/state", asyncHandler(async (req, res) => {
  await ensureSchema();
  const state = await readState(getPool(), req.user);
  res.json({ state: applyWorkbookRulesForResponse(state) });
}));

app.get("/api/export/excel", asyncHandler(async (req, res) => {
  await ensureSchema();
  const state = applyWorkbookRulesForResponse(await readState(getPool()));
  const workbook = buildExcelWorkbook(state);
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `squad2-uat-${new Date().toISOString().slice(0, 10)}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");
  res.send(Buffer.from(buffer));
}));

app.get("/api/export/work-items", asyncHandler(async (req, res) => {
  await ensureSchema();
  const filters = parseWorkItemExportFilters(req.query);
  const state = applyWorkbookRulesForResponse(await readState(getPool()));
  const category = collectionRows(state, "workCategories")
    .find((row) => String(row.id || "") === filters.categoryId);
  if (!category) throw httpError(404, "Không tìm thấy nhóm công việc cần xuất.");

  const workbook = buildWorkItemsExportWorkbook(state, filters);
  const buffer = await workbook.xlsx.writeBuffer();
  const filenameParts = [
    safeFilenamePart(category.taskPrefix || category.name || "cong-viec"),
    filters.fromDate || "dau-ky",
    filters.toDate || "cuoi-ky"
  ];
  const filename = `${filenameParts.join("-")}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");
  res.send(Buffer.from(buffer));
}));

app.get("/api/personal-workspace", requirePersonalWorkspaceOwner, asyncHandler(async (req, res) => {
  await ensureSchema();
  res.json({ tasks: await listPersonalWorkspaceTasks(getPool()) });
}));

app.post("/api/personal-workspace/tasks", requirePersonalWorkspaceOwner, asyncHandler(async (req, res) => {
  await ensureSchema();
  const task = normalizePersonalWorkspaceTask(req.body);
  const id = crypto.randomUUID();
  const result = await getPool().query(`
    insert into personal_cross_squad_tasks (
      id, squad, title, assigner, assigned_date, due_date, status, note,
      completed_date, created_by, updated_by
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
    returning id
  `, [
    id,
    task.squad,
    task.title,
    task.assigner,
    task.assignedDate || null,
    task.dueDate || null,
    task.status,
    task.note || null,
    task.completedDate || null,
    req.user.id
  ]);
  if (!result.rows[0]) throw httpError(500, "Không tạo được công việc.");
  res.status(201).json({ task: await getPersonalWorkspaceTask(getPool(), id) });
}));

app.put("/api/personal-workspace/tasks/:id", requirePersonalWorkspaceOwner, asyncHandler(async (req, res) => {
  await ensureSchema();
  const current = await getPersonalWorkspaceTask(getPool(), req.params.id);
  if (!current) throw httpError(404, "Không tìm thấy công việc.");
  const task = normalizePersonalWorkspaceTask(req.body, current);
  const result = await getPool().query(`
    update personal_cross_squad_tasks
    set squad = $1,
        title = $2,
        assigner = $3,
        assigned_date = $4,
        due_date = $5,
        status = $6,
        note = $7,
        completed_date = $8,
        updated_by = $9,
        updated_at = now()
    where id = $10
    returning id
  `, [
    task.squad,
    task.title,
    task.assigner,
    task.assignedDate || null,
    task.dueDate || null,
    task.status,
    task.note || null,
    task.completedDate || null,
    req.user.id,
    req.params.id
  ]);
  if (!result.rows[0]) throw httpError(404, "Không tìm thấy công việc.");
  res.json({ task: await getPersonalWorkspaceTask(getPool(), req.params.id) });
}));

app.delete("/api/personal-workspace/tasks/:id", requirePersonalWorkspaceOwner, asyncHandler(async (req, res) => {
  await ensureSchema();
  const result = await getPool().query(`
    delete from personal_cross_squad_tasks
    where id = $1
    returning id
  `, [req.params.id]);
  if (!result.rows[0]) throw httpError(404, "Không tìm thấy công việc.");
  res.json({ ok: true });
}));

app.get("/api/personal-workspace/export", requirePersonalWorkspaceOwner, asyncHandler(async (req, res) => {
  await ensureSchema();
  const workbook = buildPersonalWorkspaceWorkbook(await listPersonalWorkspaceTasks(getPool()));
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `cong-viec-lien-squad-${new Date().toISOString().slice(0, 10)}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");
  res.send(Buffer.from(buffer));
}));

app.post("/api/import/excel/merge", requireAdmin, express.raw({
  type: () => true,
  limit: requestBodyLimit
}), asyncHandler(async (req, res) => {
  await ensureSchema();
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw httpError(400, "Invalid or empty Excel file.");
  }

  const dryRun = parseBooleanFlag(req.query.dryRun);
  const sourceName = normalizeImportSourceName(req.headers["x-source-filename"]);
  const sourceSha256 = crypto.createHash("sha256").update(req.body).digest("hex");
  const importedAt = new Date().toISOString();
  const importState = await parseWorkbookImportState(req.body);
  if (!stateRecordTotal(importState, workbookSourceMergeCollections)) {
    throw httpError(400, "No supported source data was found in the Excel file.");
  }
  validateWorkbookImportState(importState);
  prepareWorkbookImportState(importState, importedAt);

  const client = await getPool().connect();
  try {
    await client.query("begin isolation level repeatable read");
    const existingState = await readState(client);
    const merged = mergeWorkbookSourceState(existingState, importState, {
      importedAt,
      source: "workbook"
    });
    const [goldenAudit, preservationAudit] = await Promise.all([
      auditWorkbookMergeAgainstSource(req.body, merged.state),
      Promise.resolve(auditMergePreservation(existingState, merged.state))
    ]);

    if (!goldenAudit.ok || !preservationAudit.ok) {
      await client.query("rollback");
      res.status(422).json({
        ok: false,
        dryRun,
        sourceName,
        sourceSha256,
        merge: merged.summary,
        goldenAudit,
        preservationAudit
      });
      return;
    }

    const preview = {
      ok: true,
      dryRun,
      sourceName,
      sourceSha256,
      imported: summarizeImportState(importState, workbookSourceMergeCollections),
      output: summarizeImportState(merged.state, workbookCollections),
      merge: merged.summary,
      goldenAudit,
      preservationAudit
    };

    if (dryRun) {
      await client.query("rollback");
      res.json(preview);
      return;
    }

    const snapshot = await createImportSnapshot(client, {
      sourceName,
      sourceSha256,
      actorId: req.user.id
    });
    const persistence = await persistMergedWorkbookState(
      client,
      existingState,
      merged.state,
      req.user.id
    );
    const updatedAt = await touchMeta(client);
    const persistedState = await readState(client);
    const persistenceAudit = auditPersistedMergeState(merged.state, persistedState);
    if (!persistenceAudit.ok) {
      const error = new Error(`Persisted merge verification failed: ${persistenceAudit.mismatches.join("; ")}`);
      error.status = 500;
      throw error;
    }

    await client.query("commit");
    res.json({
      ...preview,
      dryRun: false,
      snapshotId: snapshot.id,
      snapshotRecords: snapshot.recordCount,
      persistence,
      persistenceAudit,
      updatedAt,
      state: applyWorkbookRulesForResponse(await readState(getPool(), req.user))
    });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}));

app.get("/api/import/snapshots", requireAdmin, asyncHandler(async (req, res) => {
  await ensureSchema();
  const limit = Math.max(1, Math.min(20, Number(req.query.limit || 10)));
  const result = await getPool().query(`
    select id, source_name, source_sha256, record_count, created_by, created_at
    from uat_import_snapshots
    order by created_at desc
    limit $1
  `, [limit]);
  res.json({
    snapshots: result.rows.map((row) => ({
      id: row.id,
      sourceName: row.source_name,
      sourceSha256: row.source_sha256 || "",
      recordCount: Number(row.record_count || 0),
      createdBy: row.created_by || "",
      createdAt: row.created_at?.toISOString?.() || row.created_at
    }))
  });
}));

app.post("/api/import/snapshots/:id/restore", requireAdmin, asyncHandler(async (req, res) => {
  await ensureSchema();
  const snapshotId = String(req.params.id || "").trim();
  if (!snapshotId || String(req.body.confirmSnapshotId || "") !== snapshotId) {
    throw httpError(400, "confirmSnapshotId must match the snapshot being restored.");
  }

  const client = await getPool().connect();
  try {
    await client.query("begin");
    const safetySnapshot = await createImportSnapshot(client, {
      sourceName: `before-restore-${snapshotId}`,
      sourceSha256: "",
      actorId: req.user.id
    });
    const restored = await restoreImportSnapshot(client, snapshotId);
    await client.query("commit");
    res.json({
      ok: true,
      restoredSnapshotId: snapshotId,
      safetySnapshotId: safetySnapshot.id,
      restoredRecords: restored.recordCount,
      state: applyWorkbookRulesForResponse(await readState(getPool(), req.user))
    });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}));

app.post("/api/import/excel", requireAdmin, express.raw({
  type: () => true,
  limit: requestBodyLimit
}), asyncHandler(async (req, res) => {
  await ensureSchema();
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw httpError(400, "File Excel không hợp lệ.");
  }

  const importState = await parseWorkbookImportState(req.body);
  if (!stateRecordTotal(importState, workbookCollections)) {
    throw httpError(400, "Không tìm thấy dữ liệu UAT hợp lệ trong file Excel.");
  }
  validateWorkbookImportState(importState);
  prepareWorkbookImportState(importState);

  const client = await getPool().connect();
  try {
    await client.query("begin");
    const mergeSummary = await mergeWorkbookImportRecords(client, importState, req.user);
    await touchMeta(client);
    const state = applyWorkbookRulesForResponse(await readState(client, req.user));
    await client.query("commit");
    res.json({
      state,
      imported: summarizeImportState(importState, workbookCollections),
      preserved: mergeSummary.preserved,
      replaced: mergeSummary.replaced
    });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}));

app.get("/api/chat/group", asyncHandler(async (req, res) => {
  await ensureSchema();
  const limit = Math.max(10, Math.min(100, Number(req.query.limit || 50)));
  const result = await getPool().query(`
    select messages.id,
           messages.body,
           messages.created_at,
           users.id as user_id,
           users.name as user_name,
           users.email as user_email,
           users.username as username,
           users.avatar_data as user_avatar_data
    from group_chat_messages messages
    left join app_users users on users.id = messages.created_by
    order by messages.created_at desc
    limit $1
  `, [limit]);
  res.json({ messages: result.rows.reverse().map(toGroupChatMessage) });
}));

app.post("/api/chat/group", asyncHandler(async (req, res) => {
  await ensureSchema();
  const body = normalizeChatMessage(req.body.message || req.body.body);
  const id = crypto.randomUUID();
  const result = await getPool().query(`
    with inserted as (
      insert into group_chat_messages (id, body, created_by)
      values ($1, $2, $3)
      returning id, body, created_by, created_at
    )
    select inserted.id,
           inserted.body,
           inserted.created_at,
           users.id as user_id,
           users.name as user_name,
           users.email as user_email,
           users.username as username,
           users.avatar_data as user_avatar_data
    from inserted
    left join app_users users on users.id = inserted.created_by
  `, [id, body, req.user.id]);
  res.status(201).json({ message: toGroupChatMessage(result.rows[0]) });
}));

app.post("/api/ai/chat", asyncHandler(async (req, res) => {
  await ensureSchema();
  if (!geminiApiKey) {
    throw httpError(503, "Chưa cấu hình GEMINI_API_KEY trong .env hoặc Railway Variables.");
  }
  const message = normalizeAiMessage(req.body.message || req.body.body);
  const history = normalizeAiHistory(req.body.history);
  const state = applyWorkbookRulesForResponse(await readState(getPool(), req.user));
  const shortcutAnswer = tryAnswerAiShortcut(message, state);
  if (shortcutAnswer) {
    res.json({ answer: shortcutAnswer });
    return;
  }
  const context = buildAiDataContext(state);
  const answer = await askGeminiUatAssistant({ message, history, context, user: req.user });
  res.json({ answer });
}));

app.put("/api/state", requireAdmin, asyncHandler(async (req, res) => {
  const state = normalizeState(req.body.state || req.body);
  normalizeWorkItemsForValidation(state.workItems);
  for (const collection of collections) {
    state[collection].forEach((record) => validateRecordForCollection(collection, record));
  }
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const currentWorkItems = await client.query(`
      select id, data
      from uat_records
      where collection = 'workItems'
      for update
    `);
    const currentWorkItemsById = new Map(currentWorkItems.rows.map((row) => [String(row.id), row.data || {}]));
    for (const record of state.workItems) {
      const current = currentWorkItemsById.get(String(record.id));
      if (current) assertAndPreserveWorkItemStartDate(current, record);
      else delete record[legacyStartDateBackfillField];
    }
    await client.query("delete from uat_records");
    for (const collection of collections) {
      for (const inputRecord of state[collection]) {
        const record = normalizeRecord(inputRecord);
        await createRecord(client, collection, record, req.user);
      }
    }
    await touchMeta(client);
    const nextState = applyWorkbookRulesForResponse(await readState(client, req.user));
    await client.query("commit");
    res.json({ state: nextState });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}));

app.post("/api/records/:collection", asyncHandler(async (req, res) => {
  const collection = requireCollection(req.params.collection);
  const record = normalizeRecord(req.body.record || req.body);
  await ensureSchema();
  if (computedCollections.has(collection)) {
    throw httpError(403, "Phan he nay duoc tinh tu dong, khong cho sua truc tiep.");
  }
  if (collection === "workCategories" && !canManageWorkCategories(req.user)) {
    throw httpError(403, "Chỉ admin được tạo nhóm công việc.");
  }
  if (collection === "workItems" && !canCreateWorkItem(req.user)) {
    throw httpError(403, "Bạn cần đăng nhập để thêm đầu việc.");
  }
  if (collection === "plans" && !canManagePlanRecords(req.user)) {
    throw httpError(403, "Chỉ admin được tạo bản ghi PhanCong_UAT. Thành viên chỉ được cập nhật Ghi chú.");
  }
  if (["kpiConfig", "memberKpiInputs"].includes(collection) && !canManageWorkCategories(req.user)) {
    throw httpError(403, "Chỉ admin được cập nhật cấu hình KPI.");
  }
  const client = await getPool().connect();
  try {
    await client.query("begin");
    stripComputedFields(collection, record);
    if (collection === "workItems") {
      delete record.sortOrder;
      delete record[legacyStartDateBackfillField];
    }
    if (collection === "workItems" && req.user.role !== "admin") {
      assignWorkItemToUser(record, req.user);
    }
    await applyRecordDefaults(client, collection, record);
    if (collection === "plans") record.note = normalizePlanNote(record.note);
    if (collection === "memberKpiInputs") {
      await assertUniqueMemberKpiInput(client, record.memberEmail, record.id);
    }
    validateRecordForCollection(collection, record);
    const saved = await createRecord(client, collection, record, req.user);
    const { state, updatedAt } = await recomputeAndPersistWorkbookRules(client, req.user.id, req.user);
    const savedRecord = state[collection].find((item) => item.id === saved.data?.id) || decorateRecord(saved, req.user);
    await client.query("commit");
    res.status(201).json({ record: savedRecord, state, updatedAt });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}));

app.patch("/api/records/plans/:id/note", asyncHandler(async (req, res) => {
  await ensureSchema();
  if (!canUpdatePlanNote(req.user)) {
    throw httpError(403, "Tài khoản không có quyền cập nhật Ghi chú PhanCong_UAT.");
  }
  const note = normalizePlanNote(req.body.note);
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const current = await getRecordForUpdate(client, "plans", req.params.id);
    const record = mergePlanNoteUpdate(current.data, note);
    validateRecordForCollection("plans", record);
    const saved = await updateRecord(client, "plans", record, req.user.id, current);
    const { state, updatedAt } = await recomputeAndPersistWorkbookRules(client, req.user.id, req.user);
    const savedRecord = state.plans.find((item) => item.id === saved.data?.id) || decorateRecord({
      ...saved,
      collection: "plans"
    }, req.user);
    await client.query("commit");
    res.json({ record: savedRecord, state, updatedAt });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}));

app.put("/api/records/:collection/:id", asyncHandler(async (req, res) => {
  const collection = requireCollection(req.params.collection);
  let record = normalizeRecord({ ...(req.body.record || req.body), id: req.params.id }, req.params.id);
  await ensureSchema();
  if (computedCollections.has(collection)) {
    throw httpError(403, "Phan he nay duoc tinh tu dong, khong cho sua truc tiep.");
  }
  if (collection === "plans" && !canManagePlanRecords(req.user)) {
    throw httpError(403, "Chỉ admin được sửa phân công và số liệu PhanCong_UAT. Hãy dùng chức năng Cập nhật Ghi chú.");
  }
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const current = await getRecordForUpdate(client, collection, req.params.id);
    assertCanModifyRecord(req.user, current);
    if (collection === "workItems") {
      assertAndPreserveWorkItemStartDate(current.data || {}, record);
    }
    const scopedWorkItemEditor = collection === "workItems"
      && enforceWorkItemGroupEditorScope(req.user, current, record);
    const fullyManagedWorkItem = collection === "workItems"
      && canFullyManageWorkItem(req.user, current);
    if (collection === "workCategories" && !canManageWorkCategories(req.user)) {
      throw httpError(403, "Chỉ admin được sửa nhóm công việc.");
    }
    if (["kpiConfig", "memberKpiInputs"].includes(collection) && !canManageWorkCategories(req.user)) {
      throw httpError(403, "Chỉ admin được cập nhật cấu hình KPI.");
    }
    if (collection === "workCategories" && protectedWorkCategoryIds.has(req.params.id)) {
      const systemCategory = pilotWorkCategories.find((category) => category.id === req.params.id);
      record.taskPrefix = current.data?.taskPrefix || systemCategory?.taskPrefix || "SQ2-T01";
      record.sortOrder = current.data?.sortOrder ?? systemCategory?.sortOrder ?? 1;
    }
    if (collection === "workItems" && !scopedWorkItemEditor && !fullyManagedWorkItem) {
      record = mergeWorkItemProgressUpdate(current.data, record);
    }
    if (collection === "workItems" && req.user.role !== "admin" && !scopedWorkItemEditor && fullyManagedWorkItem) {
      assignWorkItemToUser(record, req.user);
    }
    stripComputedFields(collection, record);
    if (collection === "workItems") {
      if (String(record.categoryId || "") !== String(current.data?.categoryId || "")) {
        delete record.sortOrder;
        delete record.taskId;
      } else {
        record.sortOrder = current.data?.sortOrder;
      }
    }
    record.createdAt = current.data?.createdAt || current.created_at?.toISOString?.() || record.createdAt;
    record.updatedAt = new Date().toISOString();
    await applyRecordDefaults(client, collection, record);
    if (collection === "plans") record.note = normalizePlanNote(record.note);
    if (collection === "memberKpiInputs") {
      await assertUniqueMemberKpiInput(client, record.memberEmail, record.id);
    }
    validateRecordForCollection(collection, record);
    const saved = await updateRecord(client, collection, record, req.user.id, current);
    const { state, updatedAt } = await recomputeAndPersistWorkbookRules(client, req.user.id, req.user);
    const savedRecord = state[collection].find((item) => item.id === saved.data?.id) || decorateRecord(saved, req.user);
    await client.query("commit");
    res.json({ record: savedRecord, state, updatedAt });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}));

app.delete("/api/records/:collection/:id", asyncHandler(async (req, res) => {
  const collection = requireCollection(req.params.collection);
  await ensureSchema();
  if (collection === "plans" && !canManagePlanRecords(req.user)) {
    throw httpError(403, "Chỉ admin được xóa bản ghi PhanCong_UAT.");
  }
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const current = await getRecordForUpdate(client, collection, req.params.id);
    assertCanDeleteRecord(req.user, current);
    if (collection === "workCategories" && !canManageWorkCategories(req.user)) {
      throw httpError(403, "Chỉ admin được xóa nhóm công việc.");
    }
    if (["kpiConfig", "memberKpiInputs"].includes(collection) && !canManageWorkCategories(req.user)) {
      throw httpError(403, "Chỉ admin được xóa cấu hình KPI.");
    }
    if (collection === "kpiConfig") {
      throw httpError(409, "Cấu hình KPI mặc định không thể xóa.");
    }
    if (collection === "workCategories") {
      if (protectedWorkCategoryIds.has(req.params.id)) {
        throw httpError(409, "Đây là nhóm công việc hệ thống và không thể xóa.");
      }
      const linked = await client.query(`
        select count(*)::integer as count
        from uat_records
        where collection = 'workItems' and data->>'categoryId' = $1
      `, [req.params.id]);
      if (Number(linked.rows[0]?.count || 0) > 0) {
        throw httpError(409, "Nhóm đang có đầu việc. Hãy chuyển hoặc xóa đầu việc trước.");
      }
    }
    if (collection === "workItems") {
      await deleteWorkItemAttachments(client, req.params.id, req.user);
    }
    await client.query("delete from uat_records where collection = $1 and id = $2", [collection, req.params.id]);
    const { state, updatedAt } = await recomputeAndPersistWorkbookRules(client, req.user.id, req.user);
    await client.query("commit");
    res.json({ ok: true, state, updatedAt });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}));

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint không tồn tại.", status: 404 });
});

app.get("/vendor/pptx-renderer/aiden0z-pptx-renderer.browser.es.js", (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.type("application/javascript");
  res.sendFile(path.join(
    publicDir,
    "node_modules",
    "@aiden0z",
    "pptx-renderer",
    "dist",
    "aiden0z-pptx-renderer.browser.es.js"
  ));
});

app.use("/assets", express.static(path.join(publicDir, "assets")));
app.get(["/", "/index.html"], (req, res) => {
  setNoStore(res);
  res.sendFile(path.join(publicDir, "index.html"));
});
app.get("/app.js", (req, res) => {
  setNoStore(res);
  res.sendFile(path.join(publicDir, "app.js"));
});
app.get("/styles.css", (req, res) => {
  setNoStore(res);
  res.sendFile(path.join(publicDir, "styles.css"));
});
app.get(/^\/.*\.[^/]+$/, (req, res) => {
  res.status(404).send("Not found");
});
app.get("*", (req, res) => {
  setNoStore(res);
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = Number(error.status || 500);
  if (status >= 500) {
    console.error(`${req.method} ${req.originalUrl} failed:`, error);
  }
  res.status(status).json({
    error: publicError(error),
    status
  });
});

if (require.main === module) {
  server = app.listen(port, "0.0.0.0", () => {
    console.log(`Squad2 UAT Dashboard listening on port ${port}`);
    if (!databaseUrl) {
      console.warn("DATABASE_URL is not configured. API writes will fail until it is set.");
    }
    if (authMisconfigured) {
      console.warn("APP_USER and APP_PASSWORD must be configured together to enable basic auth.");
    }
    startDeadlineNotificationScheduler();
    startGoogleSheetSyncScheduler();
  });

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

module.exports = {
  app,
  parseWorkbookImportState,
  parseGoogleSpreadsheetImportState,
  applyWorkbookRules,
  computedFieldsByCollection,
  isComputedRecordField,
  buildExcelWorkbook,
  buildWorkItemsExportWorkbook,
  buildPersonalWorkspaceWorkbook,
  filterWorkItemsForExport,
  parseWorkItemExportFilters,
  excelSheets,
  loginIdentifierCandidates,
  tryAnswerAiShortcut,
  summarizeTesterAssignments,
  canonicalTesterDirectory,
  __testDefaultUsers: defaultUsers,
  validateWorkbookImportState,
  prepareWorkbookImportState,
  mergeWorkbookSourceState,
  auditWorkbookMergeAgainstSource,
  auditWorkbookObjectAgainstSource,
  auditMergePreservation,
  auditPersistedMergeState,
  isWorkbookManagedRecord,
  __testApplyWorkKpiRules: applyWorkKpiRules,
  __testDefaultWorkKpiConfig: defaultWorkKpiConfig,
  __testValidateRecordForCollection: validateRecordForCollection,
  __testExpectedWorkStatusForProgress: expectedWorkStatusForProgress,
  __testNormalizeWorkItemCompletion: normalizeWorkItemCompletion,
  __testAssertAndPreserveWorkItemStartDate: assertAndPreserveWorkItemStartDate,
  __testLegacyStartDateBackfillField: legacyStartDateBackfillField,
  __testNormalizePersonalWorkspaceTask: normalizePersonalWorkspaceTask,
  __testIsPersonalWorkspaceOwner: isPersonalWorkspaceOwner,
  __testBuildPilotWorkPlanSeedRecords: buildPilotWorkPlanSeedRecords,
  __testEmptyState: emptyState,
  __testCanEditRecord: canEditRecord,
  __testCanDeleteRecord: canDeleteRecord,
  __testCanFullyManageWorkItem: canFullyManageWorkItem,
  __testCanManagePlanRecords: canManagePlanRecords,
  __testCanUpdatePlanNote: canUpdatePlanNote,
  __testNormalizePlanNote: normalizePlanNote,
  __testMergePlanNoteUpdate: mergePlanNoteUpdate,
  __testApplyPlanOpenBugRules: applyPlanOpenBugRules,
  __testBuildUnmappedPlanBugGroups: buildUnmappedPlanBugGroups,
  __testDeriveSquadSummaryFromUserStorySummary: deriveSquadSummaryFromUserStorySummary,
  __testIsClosedBugStatus: isClosedBugStatus,
  __testIsPlanTrackableBugStatus: isPlanTrackableBugStatus,
  __testPlanBugRecencyBucket: planBugRecencyBucket,
  __testJiraBugUrl: jiraBugUrl,
  __testDecorateRecord: decorateRecord,
  __testEnforceWorkItemGroupEditorScope: enforceWorkItemGroupEditorScope,
  __testNormalizeWorkItemPeople: normalizeWorkItemPeople,
  __testWorkItemAssignees: workItemAssignees,
  __testWorkItemBusinessContacts: workItemBusinessContacts,
  __testPreservePersonnelExtendedFields: preservePersonnelExtendedFields,
  __testToImportCellDate: toImportCellDate,
  runDeadlineNotificationJob,
  runGoogleSheetSync,
  previewGoogleSheetSync,
  closeDatabase
};

function getPool() {
  if (!databaseUrl) {
    throw httpError(503, "DATABASE_URL chưa được cấu hình.");
  }
  if (!pool) {
    const useSsl = process.env.PGSSLMODE === "require" || /sslmode=require/i.test(databaseUrl);
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.PG_POOL_MAX || 10),
      idleTimeoutMillis: 30000
    });
  }
  return pool;
}

function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await getPool().query(`
      create table if not exists uat_records (
        collection text not null,
        id text not null,
        data jsonb not null,
        created_by text,
        updated_by text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        primary key (collection, id)
      );

      create index if not exists idx_uat_records_collection_updated
        on uat_records (collection, updated_at desc);

      create table if not exists app_meta (
        key text primary key,
        value jsonb not null,
        updated_at timestamptz not null default now()
      );

      create table if not exists app_users (
        id text primary key,
        username text not null unique,
        email text unique,
        name text not null,
        role text not null default 'user',
        password_hash text not null,
        avatar_data text,
        password_changed_at timestamptz,
        active boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      alter table app_users
        add column if not exists avatar_data text;

      alter table app_users
        add column if not exists password_changed_at timestamptz;

      alter table uat_records
        add column if not exists created_by text;

      alter table uat_records
        add column if not exists updated_by text;

      create index if not exists idx_uat_records_created_by
        on uat_records (created_by);

      create table if not exists group_chat_messages (
        id text primary key,
        body text not null,
        created_by text,
        created_at timestamptz not null default now()
      );

      create index if not exists idx_group_chat_messages_created
        on group_chat_messages (created_at desc);

      create table if not exists email_notification_log (
        notification_key text primary key,
        kind text not null,
        recipient text not null,
        scheduled_date date not null,
        status text not null,
        item_count integer not null default 0,
        attempt_count integer not null default 0,
        error_message text,
        sent_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create index if not exists idx_email_notification_log_date
        on email_notification_log (scheduled_date desc, kind, status);

      create table if not exists uat_import_snapshots (
        id text primary key,
        source_name text not null,
        source_sha256 text,
        record_count integer not null default 0,
        snapshot jsonb not null,
        created_by text,
        created_at timestamptz not null default now()
      );

      create index if not exists idx_uat_import_snapshots_created
        on uat_import_snapshots (created_at desc);

      create table if not exists work_item_attachments (
        id text primary key,
        work_item_id text not null,
        task_id text,
        upload_key text not null unique,
        original_name text not null,
        mime_type text not null,
        size_bytes bigint not null,
        sha256 text,
        drive_file_id text unique,
        drive_folder_id text,
        drive_web_view_link text,
        status text not null default 'uploading',
        error_message text,
        created_by text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        deleted_by text,
        deleted_at timestamptz
      );

      create index if not exists idx_work_item_attachments_item
        on work_item_attachments (work_item_id, created_at desc)
        where deleted_at is null;

      create index if not exists idx_work_item_attachments_uploader
        on work_item_attachments (created_by, created_at desc);

      create table if not exists personal_cross_squad_tasks (
        id text primary key,
        squad text not null,
        title text not null,
        assigner text not null,
        assigned_date date,
        due_date date,
        status text not null default 'Chưa bắt đầu',
        note text,
        completed_date date,
        created_by text not null,
        updated_by text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create index if not exists idx_personal_cross_squad_tasks_order
        on personal_cross_squad_tasks (squad, due_date, created_at desc);
    `);
      await ensureSeedAdmin();
      await ensureDefaultUsers();
      await ensureExclusiveAdminRoles();
      await ensurePilotWorkPlanSeed();
      await ensureDeliveryWorkCategories();
      await ensureWorkItemInvariantMigration();
      await ensureWorkItemCompletionMigration();
      await ensureWorkItemPeopleMigration();
      await ensureWorkItemPeopleIdentityMigration();
      await ensureTester7PersonnelMigration();
      await ensureWorkKpiConfig();
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

function normalizeImportedText(value) {
  if (value == null) return "";
  if (value instanceof Date) return formatDateForInput(value);
  return String(value).replace(/\s+/g, " ").trim();
}

function isSpreadsheetErrorText(value) {
  return /^#(?:N\/A|VALUE!|REF!|DIV\/0!|NAME\?|NULL!|NUM!)$/i.test(normalizeImportedText(value));
}

function cleanSpreadsheetText(value) {
  const text = normalizeImportedText(value);
  return isSpreadsheetErrorText(text) ? "" : text;
}

function normalizeImportedNumber(value) {
  if (isBlank(value)) return "";
  const text = cleanSpreadsheetText(value);
  if (!text) return "";
  const number = Number(text.replace(",", "."));
  return Number.isFinite(number) ? number : text;
}

function normalizeImportHeader(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("vi")
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeImportedFeatureStatus(value) {
  const text = normalizeImportedText(value);
  if (!text) return "";
  const normalized = normalizeImportHeader(text);
  const match = [...featureStatusOptions, ...legacyFeatureStatusOptions]
    .find((option) => normalizeImportHeader(option) === normalized);
  return match || text;
}

function normalizeImportedOwner(value) {
  const text = normalizeImportedText(value);
  if (!text) return "";
  if (text.toLocaleLowerCase("vi") === "all") return "ALL";
  if (text.toLocaleLowerCase("vi") === "ba") return "BA";
  return text;
}

function normalizeBugStatus(value) {
  const text = normalizeImportedText(value);
  if (!text) return "";
  const normalized = normalizeImportHeader(text);
  const match = bugStatusOptions.find((option) => normalizeImportHeader(option) === normalized);
  return match || text;
}

function deriveSquadSummaryFromUserStorySummary(summary) {
  const text = normalizeImportedText(summary);
  const match = text.match(/^(?:SQ0?2[_\-\s]+)?(CN\d{3})[_\-\s]+(\d{3,})(?!\d)/i);
  return match ? `SQ02_${match[1].toUpperCase()}_${match[2]}` : "";
}

function normalizeImportedDate(value) {
  if (isBlank(value)) return "";
  if (value instanceof Date) {
    if (value.getUTCFullYear() < 2000) return "";
    return formatDateForInput(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value <= 0) return "";
    const excelEpoch = Date.UTC(1899, 11, 30);
    const parsed = new Date(excelEpoch + value * 24 * 60 * 60 * 1000);
    return parsed.getUTCFullYear() < 2000 ? "" : formatDateForInput(parsed);
  }
  const text = normalizeImportedText(value);
  if (!text || isSpreadsheetErrorText(text)) return "";
  const slashDate = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (slashDate) {
    const day = Number(slashDate[1]);
    const month = Number(slashDate[2]);
    const year = Number(slashDate[3].length === 2 ? `20${slashDate[3]}` : slashDate[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(parsed.getTime())) return formatDateForInput(parsed);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : formatDateForInput(parsed);
}

function formatDateForInput(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

async function parseWorkbookImportState(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  validatePlanTesterHeader(workbook.getWorksheet("PhanCong_UAT"));
  const state = emptyState();
  state.features = parseDmChucNangSheet(workbook.getWorksheet("DM_ChucNang"));
  const personnelWorksheet = workbook.getWorksheet("NhanSu_UAT");
  state._personnelImportFields = detectPersonnelImportFields(personnelWorksheet);
  state.personnel = parsePersonnelSheet(personnelWorksheet);
  state.schedule = parseScheduleSheet(workbook.getWorksheet("Lich_UAT"));
  state.handoffs = parseHandoffSheet(workbook.getWorksheet("Lich_BG_US"));
  state.plans = parsePlanSheet(workbook.getWorksheet("PhanCong_UAT"));
  state.daily = parseDailySheet(workbook.getWorksheet("DieuHanh_Ngay"));
  state.userStories = parseUserStorySheet(workbook.getWorksheet("DS_US"));
  state.bugSources = parseBugSourceSheet(workbook.getWorksheet("DS.Loi"));
  state.defects = parseDefectSheet(workbook.getWorksheet("DEFECT_LOG"));
  state.defectSummary = parseDefectSummarySheet(workbook.getWorksheet("Tong hop loi"));
  state.weekly = parseWeeklySheet(workbook.getWorksheet("ChatLuong_Tuan"));
  state.readiness = parseReadinessSheet(workbook.getWorksheet("TongKet_Sprint"));
  state.matrix = parseMatrixSheet(workbook.getWorksheet("NangSuat_Tester"));
  state.guide = parseGuideSheet(workbook.getWorksheet("HD_UAT"));
  applyWorkbookRules(state);
  assignSortOrder(state);
  state.updatedAt = new Date().toISOString();
  return state;
}

function parseGoogleSpreadsheetImportState(resource) {
  const workbook = spreadsheetGridToWorkbook(resource);
  const state = emptyState();
  state.daily = parseDailySheet(workbook.getWorksheet("DieuHanh_Ngay"));
  state.userStories = parseUserStorySheet(workbook.getWorksheet("DS_US"));
  state.bugSources = parseBugSourceSheet(workbook.getWorksheet("DS.Loi"));
  state.defects = parseDefectSheet(workbook.getWorksheet("DEFECT_LOG"));
  state.defectSummary = parseDefectSummarySheet(workbook.getWorksheet("Tong hop loi"));
  assignSortOrder(state);
  state.updatedAt = new Date().toISOString();
  return { workbook, state };
}

function parseDmChucNangSheet(worksheet) {
  if (!worksheet) return [];
  const records = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const jiraCode = cellTextAt(row, 4);
    const code = cellTextAt(row, 2);
    const name = cellTextAt(row, 6);
    if (!jiraCode && !code && !name) continue;
    const group = cellTextAt(row, 5);
    records.push(markWorksheetRowSourceFlags({
      id: importId("features", jiraCode || code || name),
      stt: toImportNumber(cellValueAt(row, 1)) || records.length + 1,
      code,
      storyCode: cellTextAt(row, 3),
      jiraCode,
      group,
      name,
      jiraName: name,
      sprint: cellTextAt(row, 7),
      owner: normalizeImportedOwner(cellValueAt(row, 8)),
      uatHandoff: toImportDate(cellValueAt(row, 9)),
      handoffStatus: cellTextAt(row, 10),
      totalCases: toImportNumber(cellValueAt(row, 11)),
      passedCases: toImportNumber(cellValueAt(row, 12)),
      failedCases: toImportNumber(cellValueAt(row, 13)),
      blockedCases: toImportNumber(cellValueAt(row, 14)),
      defectOpen: toImportNumber(cellValueAt(row, 15)),
      blockerOpen: toImportNumber(cellValueAt(row, 16)),
      criticalOpen: toImportNumber(cellValueAt(row, 17)),
      uatResult: cellTextAt(row, 18),
      status: cellTextAt(row, 19),
      completionRate: toImportPercent(cellValueAt(row, 20)),
      openBugs: toImportNumber(cellValueAt(row, 15)),
      uatWarning: cellTextAt(row, 18)
    }, row, { maxStrikeColumns: 20 }));
  }
  return records;
}

function parsePersonnelSheet(worksheet) {
  if (!worksheet) return [];
  return parseRows(worksheet, 4, (row) => {
    const sourceStaffCode = cellTextAt(row, 1);
    const name = cellTextAt(row, 2);
    if (!sourceStaffCode || !name) return null;
    const staffCode = canonicalTesterCodeForName(name) || sourceStaffCode;
    return {
      id: importId("personnel", staffCode),
      staffCode,
      name,
      role: cellTextAt(row, 3),
      scope: cellTextAt(row, 4),
      status: cellTextAt(row, 5),
      birthYear: toImportNumber(cellValueAt(row, 6)),
      phone: cellTextAt(row, 7),
      email: cellTextAt(row, 8),
      unit: cellTextAt(row, 9),
      bidvJoinDate: toImportDate(cellValueAt(row, 10)),
      salaryGrade: cellTextAt(row, 11),
      salaryStep: cellTextAt(row, 12)
    };
  });
}

function detectPersonnelImportFields(worksheet) {
  return Object.fromEntries(personnelExtendedFields.map(({ key, label, column }) => {
    if (!worksheet) return [key, false];
    const expectedLabel = lookupKey(label);
    const hasHeader = [1, 2, 3].some((rowNumber) => lookupKey(cellTextAt(worksheet.getRow(rowNumber), column)) === expectedLabel);
    let hasData = false;
    for (let rowNumber = 4; rowNumber <= worksheet.rowCount && !hasData; rowNumber += 1) {
      hasData = !isBlank(cellValueAt(worksheet.getRow(rowNumber), column));
    }
    return [key, hasHeader || hasData];
  }));
}

function parseScheduleSheet(worksheet) {
  if (!worksheet) return [];
  return parseRows(worksheet, 4, (row) => {
    const sprint = cellTextAt(row, 1);
    if (!isSprintLabel(sprint)) return null;
    return {
      id: importId("schedule", sprint),
      sprint,
      devStart: toImportDate(cellValueAt(row, 2)),
      devEnd: toImportDate(cellValueAt(row, 3)),
      handoffDate: toImportDate(cellValueAt(row, 4)),
      startDate: toImportDate(cellValueAt(row, 5)),
      endDate: toImportDate(cellValueAt(row, 6)),
      note: cellTextAt(row, 7)
    };
  });
}

function parseHandoffSheet(worksheet) {
  if (!worksheet) return [];
  const records = [];
  let sectionLevel1 = "";
  let sectionLevel2 = "";
  for (let rowNumber = 6; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const jiraCode = cellTextAt(row, 1);
    const name = cellTextAt(row, 4);
    if (!jiraCode && name) {
      const sectionType = handoffSectionRowType(row);
      if (sectionType === 1) {
        sectionLevel1 = name;
        sectionLevel2 = "";
      } else if (sectionType === 2) {
        sectionLevel2 = name;
      }
      continue;
    }
    if (!jiraCode || !name) continue;
    records.push(markWorksheetRowSourceFlags({
      id: importId("handoffs", jiraCode),
      jiraCode,
      code: cellTextAt(row, 2),
      storyCode: cellTextAt(row, 3),
      sectionLevel1,
      sectionLevel2,
      name,
      sprint: cellTextAt(row, 5),
      uatHandoff: toImportDate(cellValueAt(row, 6)),
      uatStart: toImportDate(cellValueAt(row, 7)),
      uatEnd: toImportDate(cellValueAt(row, 8)),
      handoffStatus: cellTextAt(row, 9),
      uatStatus: cellTextAt(row, 10)
    }, row, { maxStrikeColumns: 10 }));
  }
  return records;
}

function handoffSectionRowType(row) {
  const fill = String(row.getCell(4).fill?.fgColor?.argb || row.getCell(1).fill?.fgColor?.argb || "").toUpperCase();
  if (fill === "FF009999") return 1;
  if (fill === "FF98F5F2") return 2;
  return 0;
}

function parsePlanSheet(worksheet) {
  if (!worksheet) return [];
  const hasT7 = worksheetHasTester7Column(worksheet, 15);
  const trailingOffset = hasT7 ? 1 : 0;
  return parseRows(worksheet, 4, (row) => {
    const code = cellTextAt(row, 1);
    const jiraCode = cellTextAt(row, 2);
    const group = cellTextAt(row, 3);
    const feature = cellTextAt(row, 4);
    if (!jiraCode || !feature) return null;
    const totalCases = toImportNumber(cellValueAt(row, 15 + trailingOffset));
    const executedCases = 0;
    return {
      id: importId("plans", cellTextAt(row, 5), jiraCode),
      code,
      jiraCode,
      group,
      feature,
      sprint: cellTextAt(row, 5),
      featureSprint: cellTextAt(row, 5),
      uatHandoff: toImportDate(cellValueAt(row, 6)),
      owner: normalizeImportedOwner(cellValueAt(row, 7)),
      nv: toImportNumber(cellValueAt(row, 8)),
      t1: toImportNumber(cellValueAt(row, 9)),
      t2: toImportNumber(cellValueAt(row, 10)),
      t3: toImportNumber(cellValueAt(row, 11)),
      t4: toImportNumber(cellValueAt(row, 12)),
      t5: toImportNumber(cellValueAt(row, 13)),
      t6: toImportNumber(cellValueAt(row, 14)),
      t7: hasT7 ? toImportNumber(cellValueAt(row, 15)) : "",
      totalCases,
      executedCases,
      testStatus: cellTextAt(row, 16 + trailingOffset),
      progress: toImportPercent(cellValueAt(row, 17 + trailingOffset)) || percent(executedCases, totalCases),
      uatStatus: cellTextAt(row, 18 + trailingOffset),
      devStatus: cellTextAt(row, 19 + trailingOffset),
      priority: toImportNumber(cellValueAt(row, 20 + trailingOffset)),
      note: cellTextAt(row, 21 + trailingOffset)
    };
  });
}

function parseDailySheet(worksheet) {
  if (!worksheet) return [];
  return parseRows(worksheet, 4, (row) => {
    const date = toImportCellDate(row.getCell(1));
    const jiraCode = cellTextAt(row, 2);
    const feature = cellTextAt(row, 3);
    const sprint = cellTextAt(row, 4);
    const tester = cellTextAt(row, 5);
    const totalCases = toImportNumber(cellValueAt(row, 6));
    const passedCases = toImportNumber(cellValueAt(row, 7));
    const failedCases = toImportNumber(cellValueAt(row, 8));
    const bugDetail = cellTextAt(row, 11);
    const blocker = cellTextAt(row, 12);
    const blockerLinks = cellLinksAt(row, 12);
    const executedCases = Number(passedCases || 0) + Number(failedCases || 0);
    if (!date && !jiraCode && !tester && !totalCases && !executedCases && !blocker) return null;
    return {
      id: importId("daily", date, jiraCode, tester, feature, sprint),
      date,
      sprint,
      code: "",
      jiraCode,
      feature,
      tester,
      totalCases,
      executedCases,
      passedCases,
      failedCases,
      bugStatus: cellTextAt(row, 9),
      maxBugSeverity: cellTextAt(row, 10),
      bugDetail,
      criticalBugs: normalizeSeverityCount(cellTextAt(row, 10), ["Blocker", "Critical", "Nghiêm trọng"], cellTextAt(row, 9)),
      highBugs: normalizeSeverityCount(cellTextAt(row, 10), ["Major", "Cao"], cellTextAt(row, 9)),
      blocker,
      blockerLinks,
      handler: cellTextAt(row, 13),
      dueDate: toImportCellDate(row.getCell(14))
    };
  });
}

function parseDefectSheet(worksheet) {
  if (!worksheet) return [];
  return parseRows(worksheet, 2, (row) => {
    const stt = toImportNumber(cellValueAt(row, 1));
    const bugId = cellTextAt(row, 2);
    const linkedUsKey = cellTextAt(row, 3);
    const severity = cellTextAt(row, 6);
    const status = normalizeBugStatus(cellTextAt(row, 7));
    const note = cellTextAt(row, 13);
    const foundDate = toImportDate(cellValueAt(row, 8));
    const resolvedDate = toImportDate(cellValueAt(row, 11));
    if (!bugId && !linkedUsKey && !severity && !status && !note) return null;
    if (!bugId) return null;
    if (!Number.isFinite(Number(stt)) || Number(stt) <= 0) return null;
    return markSourceInvalidFields({
      id: importId("defects", bugId),
      stt,
      bugId,
      jiraUrl: firstSafeHttpUrl(cellLinksAt(row, 2)),
      linkedUsKey,
      jiraCode: "",
      featureJiraCode: "",
      storyName: cellTextAt(row, 4),
      sprint: cellTextAt(row, 5),
      severity,
      status,
      foundDate,
      tester: cellTextAt(row, 9),
      owner: normalizeImportedOwner(cellValueAt(row, 10)),
      resolvedDate,
      // Aging is a computed field. Google formulas can briefly become negative
      // while source dates are being refreshed, so never let that transient
      // value block the atomic import of every other source tab.
      aging: calculateDefectAging(foundDate, resolvedDate),
      note
    }, [
      ...(isInvalidWorkbookCell(row.getCell(8)) ? ["foundDate"] : [])
    ]);
  });
}

function parseUserStorySheet(worksheet) {
  if (!worksheet) return [];
  return parseRows(worksheet, 2, (row) => {
    const issueKey = cellTextAt(row, 3);
    const summary = cellTextAt(row, 5);
    if (!issueKey && !summary) return null;
    if (!issueKey) return null;
    const squadSummary = cellTextAt(row, 16) || deriveSquadSummaryFromUserStorySummary(summary);
    return {
      id: importId("userStories", issueKey),
      sourceNote: cellTextAt(row, 1),
      issueType: cellTextAt(row, 2),
      issueKey,
      issueId: cellTextAt(row, 4),
      summary,
      assignee: cellTextAt(row, 6),
      assigneeId: cellTextAt(row, 7),
      reporter: cellTextAt(row, 8),
      reporterId: cellTextAt(row, 9),
      priority: cellTextAt(row, 10),
      status: cellTextAt(row, 11),
      resolution: cellTextAt(row, 12),
      created: toImportDate(cellValueAt(row, 13)),
      updated: toImportDate(cellValueAt(row, 14)),
      dueDate: toImportDate(cellValueAt(row, 15)),
      squadSummary,
      jiraCode: squadSummary
    };
  });
}

function parseBugSourceSheet(worksheet) {
  if (!worksheet) return [];
  const reporterMap = parseBugReporterMap(worksheet);
  return parseRows(worksheet, 2, (row) => {
    const issueKey = cellTextAt(row, 4);
    const summary = cellTextAt(row, 6);
    if (!issueKey && !summary) return null;
    if (!issueKey) return null;
    const reporter = cellTextAt(row, 9);
    const linkedUsKey = cellTextAt(row, 20);
    return markSourceInvalidFields({
      id: importId("bugSources", issueKey),
      reporterLookup: cellTextAt(row, 1),
      testerLookup: cellTextAt(row, 2),
      issueType: cellTextAt(row, 3),
      issueKey,
      jiraUrl: firstSafeHttpUrl(cellLinksAt(row, 4)),
      issueId: cellTextAt(row, 5),
      summary,
      assignee: cellTextAt(row, 7),
      assigneeId: cellTextAt(row, 8),
      reporter,
      reporterId: cellTextAt(row, 10),
      priority: cellTextAt(row, 11),
      status: normalizeBugStatus(cellTextAt(row, 12)),
      resolution: cellTextAt(row, 13),
      created: toImportDate(cellValueAt(row, 14)),
      updated: toImportDate(cellValueAt(row, 15)),
      dueDate: toImportDate(cellValueAt(row, 16)),
      actualEnd: toImportDate(cellValueAt(row, 17)),
      timeSpent: cellTextAt(row, 18),
      inwardBlocks: cellTextAt(row, 19),
      linkedUsKey,
      tester: reporterMap.get(lookupKey(reporter)) || cellTextAt(row, 2)
    }, [
      ...(isInvalidWorkbookCell(row.getCell(14)) ? ["created"] : []),
      ...(isInvalidWorkbookCell(row.getCell(15)) ? ["updated"] : []),
      ...(isInvalidWorkbookCell(row.getCell(16)) ? ["dueDate"] : [])
    ]);
  });
}

function parseBugReporterMap(worksheet) {
  const map = new Map();
  if (!worksheet) return map;
  for (let rowNumber = 2; rowNumber <= Math.min(worksheet.rowCount, 30); rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const raw = cellTextAt(row, 1);
    const display = cellTextAt(row, 2);
    if (!raw || !display) continue;
    if (raw.includes("paste") || raw.includes("Không xóa")) continue;
    map.set(lookupKey(raw), display);
  }
  return map;
}

function parseDefectSummarySheet(worksheet) {
  if (!worksheet) return [];
  return parseRows(worksheet, 2, (row) => {
    const jiraCode = cellTextAt(row, 4);
    const usKey = cellTextAt(row, 5);
    const name = cellTextAt(row, 7);
    if (!jiraCode && !usKey && !name) return null;
    return {
      id: importId("defectSummary", jiraCode || usKey || name),
      stt: toImportNumber(cellValueAt(row, 1)),
      code: cellTextAt(row, 2),
      storyCode: cellTextAt(row, 3),
      jiraCode,
      usKey,
      group: cellTextAt(row, 6),
      name,
      sprint: cellTextAt(row, 8),
      owner: normalizeImportedOwner(cellValueAt(row, 9)),
      uatHandoff: toImportDate(cellValueAt(row, 10)),
      handoffStatus: cellTextAt(row, 11),
      assignee: cellTextAt(row, 12),
      usStatus: cellTextAt(row, 13),
      totalCases: toImportNumber(cellValueAt(row, 14)),
      passedCases: toImportNumber(cellValueAt(row, 15)),
      failedCases: toImportNumber(cellValueAt(row, 16)),
      blockedCases: toImportNumber(cellValueAt(row, 17)),
      defectOpen: toImportNumber(cellValueAt(row, 18)),
      blockerOpen: toImportNumber(cellValueAt(row, 19)),
      criticalOpen: toImportNumber(cellValueAt(row, 20)),
      totalBugs: toImportNumber(cellValueAt(row, 21)),
      openBugs: toImportNumber(cellValueAt(row, 22)),
      inProgressBugs: toImportNumber(cellValueAt(row, 23)),
      pendingBugs: toImportNumber(cellValueAt(row, 24)),
      resolvedBugs: toImportNumber(cellValueAt(row, 25)),
      sitPassBugs: toImportNumber(cellValueAt(row, 26)),
      otherBugs: toImportNumber(cellValueAt(row, 27)),
      activeBugs: toImportNumber(cellValueAt(row, 28)),
      handledBugs: toImportNumber(cellValueAt(row, 29)),
      handledRate: toImportPercent(cellValueAt(row, 30)),
      severeBugs: toImportNumber(cellValueAt(row, 31)),
      uatResult: cellTextAt(row, 32),
      status: cellTextAt(row, 33),
      completionRate: toImportPercent(cellValueAt(row, 34))
    };
  });
}

function parseWeeklySheet(worksheet) {
  if (!worksheet) return [];
  return parseRows(worksheet, 2, (row) => {
    const week = cellTextAt(row, 1);
    if (!week) return null;
    const blockerBugs = toImportNumber(cellValueAt(row, 7));
    const criticalBugs = toImportNumber(cellValueAt(row, 8));
    return {
      id: importId("weekly", week, cellTextAt(row, 2)),
      week,
      sprint: cellTextAt(row, 2),
      totalStories: toImportNumber(cellValueAt(row, 3)),
      storyTested: toImportNumber(cellValueAt(row, 4)),
      coverageRate: toImportPercent(cellValueAt(row, 5)),
      successRate: toImportPercent(cellValueAt(row, 6)),
      blockerBugs,
      criticalBugs,
      reopenRate: toImportPercent(cellValueAt(row, 9)),
      gateResult: cellTextAt(row, 10),
      assessment: cellTextAt(row, 10)
    };
  });
}

function parseReadinessSheet(worksheet) {
  if (!worksheet) return [];
  return parseRows(worksheet, 2, (row) => {
    const sprint = cellTextAt(row, 1);
    if (!sprint) return null;
    return {
      id: importId("readiness", sprint),
      sprint,
      totalStories: toImportNumber(cellValueAt(row, 2)),
      deliveredStories: toImportNumber(cellValueAt(row, 3)),
      coverageRate: toImportPercent(cellValueAt(row, 4)),
      successRate: toImportPercent(cellValueAt(row, 5)),
      openBlockerBugs: toImportNumber(cellValueAt(row, 6)),
      openCriticalBugs: toImportNumber(cellValueAt(row, 7)),
      openMajorBugs: toImportNumber(cellValueAt(row, 8)),
      reopenRate: toImportPercent(cellValueAt(row, 9)),
      decision: cellTextAt(row, 10)
    };
  });
}

function parseMatrixSheet(worksheet) {
  if (!worksheet) return [];
  const hasT7 = worksheetHasTester7Column(worksheet, 8);
  const trailingOffset = hasT7 ? 1 : 0;
  return parseRows(worksheet, 4, (row) => {
    const group = cellTextAt(row, 1);
    if (!group || group.toLocaleLowerCase("vi").includes("tỷ lệ")) return null;
    return {
      id: importId("matrix", group),
      group,
      t1: toImportNumber(cellValueAt(row, 2)),
      t2: toImportNumber(cellValueAt(row, 3)),
      t3: toImportNumber(cellValueAt(row, 4)),
      t4: toImportNumber(cellValueAt(row, 5)),
      t5: toImportNumber(cellValueAt(row, 6)),
      t6: toImportNumber(cellValueAt(row, 7)),
      t7: hasT7 ? toImportNumber(cellValueAt(row, 8)) : "",
      totalParticipation: toImportNumber(cellValueAt(row, 8 + trailingOffset)),
      target: toImportNumber(cellValueAt(row, 9 + trailingOffset)),
      warning: cellTextAt(row, 10 + trailingOffset)
    };
  });
}

function parseGuideSheet(worksheet) {
  if (!worksheet) return [];
  const records = [];
  let category = "Hướng dẫn";
  for (let rowNumber = 4; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const a = cellTextAt(row, 1);
    const b = cellTextAt(row, 2);
    const c = cellTextAt(row, 3);
    const d = cellTextAt(row, 4);
    if (!a && !b && !c && !d) continue;
    if (a && !b && !c && !d) {
      category = a;
      continue;
    }
    if (["STT", "Mức độ", "Trạng thái"].includes(a) || b === "Ý nghĩa") continue;
    const numericIndex = Number(a);
    const isNumbered = Number.isFinite(numericIndex);
    const topic = isNumbered ? b : (c ? b : a);
    const content = isNumbered ? c : (c || b);
    const rowCategory = isNumbered ? category : (c ? a : category);
    if (!topic || !content) continue;
    records.push(markWorksheetRowSourceFlags({
      id: importId("guide", rowCategory, topic),
      category: rowCategory,
      index: isNumbered ? numericIndex : records.length + 1,
      topic,
      content,
      note: d
    }, row));
  }
  return records;
}

function assignSortOrder(state) {
  for (const collection of collections) {
    if (planningCollections.includes(collection)) continue;
    (state[collection] || []).forEach((record, index) => {
      record.sortOrder = index + 1;
    });
  }
}

function parseRows(worksheet, startRow, mapper) {
  const records = [];
  for (let rowNumber = startRow; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const record = mapper(row, rowNumber);
    if (record) records.push(markWorksheetRowSourceFlags(record, row));
  }
  return records;
}

function markWorksheetRowSourceFlags(record, row, options = {}) {
  const flags = worksheetRowSourceFlags(row, options);
  if (flags.sourceHidden) record.sourceHidden = true;
  if (flags.sourceStruck) record.sourceStruck = true;
  return record;
}

function worksheetRowSourceFlags(row, options = {}) {
  const skipHidden = options.skipHidden !== false;
  const skipStruck = options.skipStruck !== false;
  const maxStrikeColumns = options.maxStrikeColumns || row.worksheet?.columnCount || row.cellCount || 0;
  return {
    sourceHidden: Boolean(skipHidden && row.hidden),
    sourceStruck: Boolean(skipStruck && rowHasStrikethrough(row, maxStrikeColumns))
  };
}

function rowHasStrikethrough(row, maxColumns = row.cellCount || 0) {
  for (let column = 1; column <= maxColumns; column += 1) {
    if (row.getCell(column).font?.strike) return true;
  }
  return false;
}

function unwrapExcelCellValue(value) {
  if (value == null) return "";
  if (value instanceof Date) return value;
  if (typeof value !== "object") return value;
  if (Object.prototype.hasOwnProperty.call(value, "result")) return unwrapExcelCellValue(value.result);
  if (Object.prototype.hasOwnProperty.call(value, "error")) return "";
  if (Object.prototype.hasOwnProperty.call(value, "text")) return unwrapExcelCellValue(value.text);
  if (Array.isArray(value.richText)) return value.richText.map((part) => part?.text || "").join("");
  return value.text ?? value.result ?? "";
}

function cellValueAt(row, column) {
  const cell = row.getCell(column);
  if (cell.isMerged && cell.master && cell.master.address !== cell.address) return "";
  const value = unwrapExcelCellValue(cell.value);
  const displayText = typeof cell.text === "string" ? cell.text.trim() : "";
  if (value instanceof Date && /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/.test(displayText)) return displayText;
  return value;
}

function cellTextAt(row, column) {
  return cleanSpreadsheetText(cellValueAt(row, column));
}

function cellLinksAt(row, column) {
  const cell = row.getCell(column);
  const links = [];
  const addLink = (url) => {
    const text = String(url || "").trim();
    if (text && !links.includes(text)) links.push(text);
  };
  addLink(cell.hyperlink);
  addLink(cell.value?.hyperlink);
  extractUrls(cellTextAt(row, column)).forEach(addLink);
  return links;
}

function isInvalidWorkbookCell(cell) {
  const value = unwrapExcelCellValue(cell?.value);
  if (value instanceof Date) return Number.isNaN(value.getTime());
  const text = String(value ?? cell?.text ?? "").trim();
  return /^#+$/.test(text)
    || /^invalid date$/i.test(text)
    || /^#(?:value|ref|num|name|n\/a|div\/0)[!?]?$/i.test(text);
}

function markSourceInvalidFields(record, fields) {
  const invalidFields = [...new Set((fields || []).filter(Boolean))];
  if (!invalidFields.length) return record;
  Object.defineProperty(record, "_sourceInvalidFields", {
    configurable: true,
    enumerable: false,
    value: invalidFields
  });
  return record;
}

function extractUrls(value) {
  const text = String(value || "");
  const urls = [];
  const pattern = /https?:\/\/[^\s<>"']+/gi;
  let match;
  while ((match = pattern.exec(text))) {
    urls.push(match[0].replace(/[),.;]+$/g, ""));
  }
  return urls;
}

function toImportDate(value) {
  return normalizeImportedDate(value);
}

function validatePlanTesterHeader(worksheet) {
  if (!worksheet) return;
  const supportedTesters = canonicalTesterDirectory.slice(0, worksheetHasTester7Column(worksheet, 15) ? 7 : 6);
  const actualNames = supportedTesters.map((_, index) => cellTextAt(worksheet.getRow(2), 9 + index));
  const expectedNames = supportedTesters.map((tester) => tester.shortName);
  const mismatches = expectedNames
    .map((expected, index) => ({ expected, actual: actualNames[index], code: supportedTesters[index].code }))
    .filter((item) => testerIdentityKey(item.actual) !== testerIdentityKey(item.expected));
  if (!mismatches.length) return;
  throw httpError(400, [
    "Tên Tester trên đầu cột PhanCong_UAT không khớp danh mục đang dùng trên web.",
    ...mismatches.map((item) => `${item.code}: cần '${item.expected}', file đang ghi '${item.actual || "trống"}'.`),
    "Dừng import để tránh gán nhầm testcase cho người khác."
  ].join(" "));
}

function worksheetHasTester7Column(worksheet, column) {
  if (!worksheet) return false;
  const markers = [1, 2, 3].map((rowNumber) => testerIdentityKey(cellTextAt(worksheet.getRow(rowNumber), column)));
  return markers.includes("t7") || markers.includes(testerIdentityKey(canonicalTesterDirectory[6].shortName));
}

function toImportCellDate(cell) {
  const value = unwrapExcelCellValue(cell?.value);
  const format = String(cell?.numFmt || "")
    .toLowerCase()
    .replace(/["'\\]/g, "");
  const isMonthFirst = /^m{1,2}[./-]d{1,2}(?:[./-]y{2,4})?$/.test(format);
  if (value instanceof Date && isMonthFirst) {
    const year = value.getUTCFullYear();
    const displayedDay = value.getUTCMonth() + 1;
    const displayedMonth = value.getUTCDate();
    if (displayedMonth >= 1 && displayedMonth <= 12) {
      return formatDateForInput(new Date(Date.UTC(year, displayedMonth - 1, displayedDay)));
    }
  }
  return toImportDate(value);
}

function toImportNumber(value) {
  const number = normalizeImportedNumber(value);
  if (number === "") return "";
  return Number.isFinite(Number(number)) ? Number(number) : "";
}

function toImportPercent(value) {
  const number = toImportNumber(value);
  if (number === "") return "";
  return number > 0 && number <= 1 ? round(number * 100) : round(number);
}

function normalizeSeverityCount(severity, targets, status) {
  if (!severity || !isOpenBugStatus(status)) return 0;
  return isAnySeverity(severity, Array.isArray(targets) ? targets : [targets]) ? 1 : 0;
}

function applyWorkbookRules(state) {
  const personnel = collectionRows(state, "personnel");
  const schedule = collectionRows(state, "schedule");
  const handoffs = collectionRows(state, "handoffs");
  const features = collectionRows(state, "features");
  const plans = collectionRows(state, "plans");
  const daily = collectionRows(state, "daily");
  const defects = collectionRows(state, "defects");
  const userStories = collectionRows(state, "userStories");
  const bugSources = collectionRows(state, "bugSources");
  const weekly = collectionRows(state, "weekly");
  const readiness = collectionRows(state, "readiness");
  const matrix = collectionRows(state, "matrix");

  applyCanonicalTesterPersonnelRules(personnel);

  applyScheduleRules(schedule);

  const featureByJira = lookupBy(features, "jiraCode");
  const featureByName = lookupBy(features, "name");
  const scheduleBySprint = lookupBy(schedule, "sprint");
  handoffs.forEach((row) => {
    const feature = featureByJira.get(lookupKey(row.jiraCode)) || featureByName.get(lookupKey(row.name));
    row.uatStart = row.uatHandoff || "";
    row.uatEnd = row.uatHandoff ? addDays(row.uatHandoff, 4) : "";
    row.handoffStatus = row.handoffStatus || (row.uatHandoff ? "✅ Đã bàn giao" : "⏯️Chưa bàn giao");
    row.uatStatus = feature?.status || row.uatStatus || row.note || "";
    delete row.note;
  });

  const handoffByJira = lookupBy(handoffs, "jiraCode");
  const handoffByFeatureName = lookupBy(handoffs, "name");
  const userStoryByIssueKey = lookupBy(userStories, "issueKey");
  const planJiraKeys = new Set(plans
    .flatMap((row) => [row.jiraCode, row.code])
    .map(lookupKey)
    .filter(Boolean));

  userStories.forEach((row) => {
    const currentCode = row.jiraCode || row.squadSummary || "";
    const derivedCode = deriveSquadSummaryFromUserStorySummary(row.summary);
    const canonicalCode = planJiraKeys.has(lookupKey(currentCode))
      ? currentCode
      : derivedCode || currentCode;
    row.squadSummary = canonicalCode;
    row.jiraCode = canonicalCode;
    const feature = featureByJira.get(lookupKey(row.jiraCode)) || featureByName.get(lookupKey(row.summary));
    row.featureName = feature?.name || row.featureName || "";
    row.group = feature?.group || row.group || "";
    row.owner = feature?.owner || row.owner || "";
    row.sprint = feature?.sprint || row.sprint || "";
  });
  const userStoryByJira = lookupBy(userStories, "jiraCode");

  bugSources.forEach((row) => {
    row.status = normalizeBugStatus(row.status);
    row.linkedUsKey = row.linkedUsKey || row.parentIssueKey || "";
    const story = userStoryByIssueKey.get(lookupKey(row.linkedUsKey));
    row.featureJiraCode = story?.jiraCode || row.featureJiraCode || "";
    row.jiraCode = row.featureJiraCode || row.jiraCode || "";
    row.featureName = story?.featureName || row.featureName || "";
    row.tester = row.tester || "";
  });
  const bugSourceByIssueKey = lookupBy(bugSources, "issueKey");

  plans.forEach((row) => {
    const feature = featureByJira.get(lookupKey(row.jiraCode)) || featureByName.get(lookupKey(row.feature));
    const handoff = handoffByJira.get(lookupKey(row.jiraCode)) || handoffByFeatureName.get(lookupKey(row.feature));
    row.feature = feature?.name || row.feature || "";
    row.group = feature?.group || row.group || "";
    row.sprint = feature?.sprint || handoff?.sprint || "";
    row.featureSprint = row.sprint;
    row.uatHandoff = handoff?.uatHandoff || "";
    row.owner = feature?.owner || "";
    row.totalCases = sumPlanAssignments(row);
    row.executedCases = sumWhere(daily, (item) => sameLookup(item.jiraCode, row.code), "totalCases");
    row.progress = percent(row.executedCases, sumWhere(daily, (item) => sameLookup(item.jiraCode, row.code), "tester", true));
    row.testStatus = row.testStatus || inferTestStatus(row.executedCases, row.totalCases);
    row.uatStatus = row.uatStatus || inferUatStatus(row.executedCases, row.totalCases);
    row.devStatus = feature?.status || "";
    row.priority = inferUatPriority(row.devStatus);
  });

  daily.forEach((row) => {
    const feature = featureByJira.get(lookupKey(row.jiraCode)) || featureByName.get(lookupKey(row.feature));
    row.code = feature?.code || row.code || "";
    row.jiraCode = feature?.jiraCode || "";
    row.sprint = row.sprint || feature?.sprint || "";
    row.feature = row.feature || feature?.name || "";
    row.executedCases = Number(row.executedCases || 0) || Number(row.passedCases || 0) + Number(row.failedCases || 0);
    row.criticalBugs = isBlockingSeverity(row.maxBugSeverity) && isOpenBugStatus(row.bugStatus) ? 1 : 0;
    row.highBugs = isHighSeverity(row.maxBugSeverity) && isOpenBugStatus(row.bugStatus) ? 1 : 0;
  });

  defects.forEach((row) => {
    const sourceBug = bugSourceByIssueKey.get(lookupKey(row.bugId));
    row.status = normalizeBugStatus(row.status);
    row.linkedUsKey = row.linkedUsKey || sourceBug?.linkedUsKey || "";
    const story = userStoryByIssueKey.get(lookupKey(row.linkedUsKey));
    const featureJiraCode = row.featureJiraCode || row.jiraCode || story?.jiraCode || "";
    const feature = featureByJira.get(lookupKey(featureJiraCode)) || featureByName.get(lookupKey(row.featureName || row.storyName));
    row.featureJiraCode = feature?.jiraCode || story?.jiraCode || featureJiraCode || "";
    row.jiraCode = row.featureJiraCode || row.jiraCode || "";
    row.featureName = feature?.name || story?.featureName || row.featureName || "";
    row.storyName = row.storyName || row.featureName || "";
    row.sprint = row.sprint || feature?.sprint || "";
    row.tester = row.tester || sourceBug?.tester || "";
    row.owner = row.owner || feature?.owner || "";
    row.aging = calculateDefectAging(row.foundDate, row.resolvedDate);
  });

  applyPlanOpenBugRules(state);
  state.unmappedPlanBugGroups = buildUnmappedPlanBugGroups(state);

  features.forEach((row) => {
    const story = userStoryByJira.get(lookupKey(row.jiraCode));
    const handoff = handoffByJira.get(lookupKey(row.jiraCode)) || handoffByFeatureName.get(lookupKey(row.name));
    const planRows = plans.filter((plan) => sameLookup(plan.jiraCode, row.jiraCode) || sameLookup(plan.feature, row.name));
    const dailyRows = daily.filter((item) => sameLookup(item.jiraCode, row.jiraCode) || sameLookup(item.feature, row.name));
    const defectRows = defects.filter((item) => sameLookup(item.linkedUsKey, row.jiraCode) && isOpenBugStatus(item.status));
    row.usKey = story?.issueKey || row.usKey || "";
    row.usStatus = story?.status || row.usStatus || "";
    row.assignee = story?.assignee || row.assignee || "";
    row.uatHandoff = handoff?.uatHandoff || "";
    row.uatStart = handoff?.uatStart || "";
    row.uatEnd = handoff?.uatEnd || "";
    row.handoffStatus = handoff?.handoffStatus || "";
    row.sprint = handoff?.sprint || "";
    row.owner = row.owner || planRows[0]?.owner || "";
    row.totalCases = sumWhere(dailyRows, () => true, "totalCases");
    row.passedCases = sumWhere(dailyRows, () => true, "passedCases");
    row.failedCases = sumWhere(dailyRows, () => true, "failedCases");
    row.blockedCases = sumWhere(dailyRows, () => true, "bugStatus", true);
    row.defectOpen = defectRows.length;
    row.blockerOpen = defectRows.filter((item) => isSeverity(item.severity, "Blocker")).length;
    row.criticalOpen = defectRows.filter((item) => isSeverity(item.severity, "Critical")).length;
    row.completionRate = percent(sumWhere(planRows, () => true, "t6"), sumWhere(planRows, () => true, "t5"));
    row.uatResult = inferFeatureUatResult(row);
    row.openBugs = row.defectOpen;
    row.uatWarning = row.defectOpen > 0 ? "Có lỗi mở" : (Number(row.completionRate || 0) < 100 ? "Chưa hoàn thành TC" : "Đạt");
  });

  state.defectSummary = buildDefectSummaryRows(state);

  weekly.forEach((row) => {
    const sprintKey = row.sprint || (isSprintLabel(row.week) ? row.week : "");
    if (!sprintKey) {
      row.totalStories = 0;
      row.storyTested = 0;
      row.totalCases = 0;
      row.executedCases = 0;
      row.coverageRate = 0;
      row.passedCases = 0;
      row.successRate = 0;
      row.blockerBugs = 0;
      row.criticalBugs = 0;
      row.majorBugs = 0;
      row.highBugs = 0;
      row.totalOpenBugs = 0;
      row.reopenRate = 0;
      row.gateResult = row.assessment || "Đạt có điều kiện";
      row.assessment = row.gateResult;
      return;
    }
    row.totalStories = features.filter((feature) => sprintMatches(feature.sprint, sprintKey)).length;
    row.storyTested = features.filter((feature) => sprintMatches(feature.sprint, sprintKey) && Number(feature.totalCases || 0) > 0).length;
    row.totalCases = sumWhere(features, (feature) => sprintMatches(feature.sprint, sprintKey), "totalCases");
    row.executedCases = row.totalCases;
    row.coverageRate = percent(row.storyTested, row.totalStories);
    row.passedCases = sumWhere(features, (feature) => sprintMatches(feature.sprint, sprintKey), "passedCases");
    row.successRate = percent(row.passedCases, row.totalCases);
    const openDefects = defects.filter((item) => sprintMatches(item.sprint, sprintKey) && isOpenBugStatus(item.status));
    row.blockerBugs = openDefects.filter((item) => isSeverity(item.severity, "Blocker")).length;
    row.criticalBugs = openDefects.filter((item) => isSeverity(item.severity, "Critical")).length;
    row.majorBugs = openDefects.filter((item) => isSeverity(item.severity, "Major")).length;
    row.highBugs = row.majorBugs;
    row.totalOpenBugs = row.blockerBugs + row.criticalBugs + row.majorBugs;
    row.reopenRate = percent(defects.filter((item) => sprintMatches(item.sprint, sprintKey) && isBugStatus(item.status, "Reopen")).length, defects.filter((item) => sprintMatches(item.sprint, sprintKey)).length);
    row.gateResult = row.totalOpenBugs > 0 ? "Chưa đạt" : (Number(row.coverageRate || 0) < 95 || Number(row.successRate || 0) < 90 ? "Đạt có điều kiện" : "Đạt");
    row.assessment = row.gateResult;
  });

  readiness.forEach((row) => {
    const scheduleRow = scheduleBySprint.get(lookupKey(row.sprint));
    row.handoffDate = scheduleRow?.handoffDate || "";
    row.totalStories = features.filter((feature) => sprintMatches(feature.sprint, row.sprint)).length;
    row.deliveredStories = handoffs.filter((handoff) => sprintMatches(handoff.sprint, row.sprint) && normalizeImportedText(handoff.uatHandoff)).length;
    row.totalCases = sumWhere(features, (feature) => sprintMatches(feature.sprint, row.sprint), "totalCases");
    row.executedCases = row.totalCases;
    row.coverageRate = percent(row.deliveredStories, row.totalStories);
    row.passedCases = sumWhere(features, (feature) => sprintMatches(feature.sprint, row.sprint), "passedCases");
    row.successRate = percent(row.passedCases, row.totalCases);
    const openDefects = defects.filter((item) => sprintMatches(item.sprint, row.sprint) && isOpenBugStatus(item.status));
    row.openBlockerBugs = openDefects.filter((item) => isSeverity(item.severity, "Blocker")).length;
    row.openCriticalBugs = openDefects.filter((item) => isSeverity(item.severity, "Critical")).length;
    row.openMajorBugs = openDefects.filter((item) => isSeverity(item.severity, "Major")).length;
    row.openHighBugs = row.openMajorBugs;
    row.reopenRate = percent(defects.filter((item) => sprintMatches(item.sprint, row.sprint) && isBugStatus(item.status, "Reopen")).length, defects.filter((item) => sprintMatches(item.sprint, row.sprint)).length);
    row.readinessLevel = row.openBlockerBugs || row.openCriticalBugs ? "Đỏ" : (Number(row.coverageRate || 0) < 95 || Number(row.successRate || 0) < 90 ? "Vàng" : "Xanh");
    row.decision = row.openBlockerBugs || row.openCriticalBugs
      ? "NO GO"
      : (Number(row.coverageRate || 0) >= 95 && Number(row.successRate || 0) >= 90 && Number(row.openMajorBugs || 0) <= 5 && Number(row.reopenRate || 0) < 10 ? "GO" : "CONDITIONAL GO");
  });

  matrix.forEach((row) => {
    row.totalParticipation = testerKeys.reduce((total, testerKey) => total + Number(row[testerKey] || 0), 0);
    row.warning = Number(row.totalParticipation || 0) < Number(row.target || 0) ? "Chưa đủ luân chuyển" : "Đạt";
  });

  return state;
}

const testerKeys = canonicalTesterDirectory.map((tester) => tester.key);

function testerIdentityKey(value) {
  return String(value || "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi");
}

function canonicalTesterForName(name) {
  return canonicalTesterByName.get(testerIdentityKey(name)) || null;
}

function canonicalTesterCodeForName(name) {
  return canonicalTesterForName(name)?.code || "";
}

function applyCanonicalTesterPersonnelRules(personnel) {
  const tester7 = canonicalTesterDirectory.find((tester) => tester.key === "t7");
  const tester7Row = (personnel || []).find((row) => isTester7PersonnelRow(row, tester7));
  if (tester7Row) applyCanonicalTester7PersonnelFields(tester7Row, tester7);
  for (const row of personnel || []) {
    const tester = canonicalTesterForName(row?.name);
    if (!tester) continue;
    row.staffCode = tester.code;
    row.email = tester.email;
  }
}

function isTester7PersonnelRow(row, tester = canonicalTesterDirectory.find((item) => item.key === "t7")) {
  if (!row || !tester) return false;
  return String(row.id || "") === "personnel-t7-huanphc"
    || String(row.staffCode || "").trim().toUpperCase() === tester.code
    || testerIdentityKey(row.name) === testerIdentityKey(tester.name)
    || String(row.email || "").trim().toLowerCase() === tester.email;
}

function applyCanonicalTester7PersonnelFields(row, tester = canonicalTesterDirectory.find((item) => item.key === "t7")) {
  if (!row || !tester) return row;
  row.staffCode = tester.code;
  row.name = tester.name;
  row.email = tester.email;
  row.role = "Tester / Giảng viên nội bộ";
  row.scope = "Kiểm thử luân chuyển đa nghiệp vụ";
  row.status = "Đang tham gia";
  return row;
}

function collectionRows(state, collection) {
  if (!state || typeof state !== "object") return [];
  if (!Array.isArray(state[collection])) state[collection] = [];
  return state[collection];
}

function lookupBy(rows, key) {
  const map = new Map();
  rows.forEach((row) => {
    const keyValue = lookupKey(row?.[key]);
    if (keyValue && !map.has(keyValue)) map.set(keyValue, row);
  });
  return map;
}

function lookupKey(value) {
  return normalizeImportedText(value).toLocaleLowerCase("vi");
}

function sameLookup(left, right) {
  return lookupKey(left) === lookupKey(right);
}

function sameNonBlankLookup(left, right) {
  const leftKey = lookupKey(left);
  const rightKey = lookupKey(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
}

function sprintMatches(left, right) {
  if (sameLookup(left, right)) return true;
  const leftSingle = singleSprintNumber(left);
  const rightSingle = singleSprintNumber(right);
  return leftSingle !== null && rightSingle !== null && leftSingle === rightSingle;
}

function singleSprintNumber(value) {
  const text = normalizeImportedText(value);
  if (!text) return null;
  const numbers = [...text.matchAll(/\d+/g)].map((match) => Number(match[0])).filter((number) => Number.isFinite(number));
  return numbers.length === 1 ? numbers[0] : null;
}

function hasDailyFeatureLink(row) {
  return Boolean(normalizeImportedText(row?.jiraCode) || normalizeImportedText(row?.feature));
}

function defectMatchesFeature(defect, feature, userStory = null) {
  if (!defect || !feature) return false;
  return sameNonBlankLookup(defect.featureJiraCode, feature.jiraCode)
    || sameNonBlankLookup(defect.jiraCode, feature.jiraCode)
    || sameNonBlankLookup(defect.linkedUsKey, userStory?.issueKey)
    || sameNonBlankLookup(defect.featureName, feature.name)
    || sameNonBlankLookup(defect.storyName, feature.name);
}

function bugSourceMatchesFeature(bug, feature, userStory = null) {
  if (!bug || !feature) return false;
  return sameNonBlankLookup(bug.featureJiraCode, feature.jiraCode)
    || sameNonBlankLookup(bug.jiraCode, feature.jiraCode)
    || sameNonBlankLookup(bug.linkedUsKey, userStory?.issueKey);
}

function buildDefectSummaryRows(state) {
  const features = collectionRows(state, "features");
  const sourceSummaryRows = collectionRows(state, "defectSummary");
  const handoffs = collectionRows(state, "handoffs");
  const plans = collectionRows(state, "plans");
  const daily = collectionRows(state, "daily");
  const defects = collectionRows(state, "defects");
  const userStories = collectionRows(state, "userStories");
  const bugSources = collectionRows(state, "bugSources");
  const userStoryByJira = lookupBy(userStories, "jiraCode");
  const sourceSummaryByJira = lookupBy(sourceSummaryRows, "jiraCode");
  const handoffByJira = lookupBy(handoffs, "jiraCode");
  const handoffByFeatureName = lookupBy(handoffs, "name");

  return features.map((feature, index) => {
    const story = userStoryByJira.get(lookupKey(feature.jiraCode));
    const sourceSummary = sourceSummaryByJira.get(lookupKey(feature.jiraCode));
    const sourceUsKey = sourceSummary?.usKey || story?.issueKey || feature.usKey || "";
    const handoff = handoffByJira.get(lookupKey(feature.jiraCode)) || handoffByFeatureName.get(lookupKey(feature.name));
    const planRows = plans.filter((plan) => sameLookup(plan.jiraCode, feature.jiraCode) || sameLookup(plan.feature, feature.name));
    const dailyRows = daily.filter((item) => sameLookup(item.jiraCode, feature.jiraCode) || sameLookup(item.feature, feature.name));
    const linkedDefects = sourceUsKey
      ? defects.filter((defect) => sameNonBlankLookup(defect.linkedUsKey, sourceUsKey))
      : defects.filter((defect) => defectMatchesFeature(defect, feature, story));
    const linkedBugSources = sourceUsKey
      ? bugSources.filter((bug) => sameNonBlankLookup(bug.linkedUsKey, sourceUsKey))
      : bugSources.filter((bug) => bugSourceMatchesFeature(bug, feature, story));
    const bugRows = linkedBugSources.length ? linkedBugSources : linkedDefects.map((defect) => ({
      priority: defect.severity,
      status: defect.status
    }));
    const statusCount = (status) => bugRows.filter((bug) => isBugStatus(bug.status, status)).length;
    const openBugs = statusCount("Open");
    const inProgressBugs = statusCount("In Progress");
    const pendingBugs = statusCount("Pending");
    const resolvedBugs = statusCount("Resolved");
    const sitPassBugs = statusCount("SIT Pass");
    const totalBugs = bugRows.length;
    const activeBugs = openBugs + inProgressBugs + pendingBugs;
    const handledBugs = Math.max(0, totalBugs - activeBugs);
    const blockerOpen = bugRows.filter((bug) => isSeverity(bug.priority || bug.severity, "Blocker") && isOpenBugStatus(bug.status)).length;
    const criticalOpen = bugRows.filter((bug) => isSeverity(bug.priority || bug.severity, "Critical") && isOpenBugStatus(bug.status)).length;
    const totalCases = sumWhere(planRows, () => true, "totalCases");
    const passedCases = sumWhere(dailyRows, () => true, "passedCases");
    const failedCases = sumWhere(dailyRows, () => true, "failedCases");
    const blockedCases = dailyRows.filter((item) => normalizeImportedText(item.blocker)).length;

    return {
      id: importId("defectSummary", feature.jiraCode || story?.issueKey || feature.name),
      stt: Number(feature.stt || index + 1),
      code: feature.code || "",
      storyCode: feature.storyCode || "",
      jiraCode: feature.jiraCode || "",
      usKey: sourceUsKey,
      group: feature.group || "",
      name: feature.name || "",
      sprint: feature.sprint || handoff?.sprint || "",
      owner: feature.owner || "",
      uatHandoff: handoff?.uatHandoff || feature.uatHandoff || "",
      handoffStatus: handoff?.handoffStatus || feature.handoffStatus || "",
      assignee: story?.assignee || feature.assignee || "",
      usStatus: story?.status || feature.usStatus || "",
      totalCases,
      passedCases,
      failedCases,
      blockedCases,
      defectOpen: linkedDefects.filter((defect) => isOpenBugStatus(defect.status)).length,
      blockerOpen,
      criticalOpen,
      totalBugs,
      openBugs,
      inProgressBugs,
      pendingBugs,
      resolvedBugs,
      sitPassBugs,
      otherBugs: Math.max(0, totalBugs - openBugs - inProgressBugs - pendingBugs - resolvedBugs - sitPassBugs),
      activeBugs,
      handledBugs,
      handledRate: totalBugs ? percent(handledBugs, totalBugs) : "",
      severeBugs: bugRows.filter((bug) => isAnySeverity(bug.priority || bug.severity, ["Blocker", "Critical"])).length,
      uatResult: inferFeatureUatResult({
        totalCases,
        passedCases,
        failedCases,
        blockedCases,
        blockerOpen,
        criticalOpen,
        completionRate: percent(passedCases, totalCases)
      }),
      status: feature.status || "",
      completionRate: percent(passedCases, totalCases)
    };
  });
}

function calculateDefectAging(foundDate, resolvedDate) {
  const from = parseImportDateOnly(foundDate);
  if (!from) return "";
  const to = parseImportDateOnly(resolvedDate) || new Date();
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);
  const days = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  return Number.isFinite(days) && days >= 0 ? days : "";
}

function parseImportDateOnly(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sumWhere(rows, predicate, key, excelNumericMode = false) {
  return rows.reduce((total, row) => {
    if (!predicate(row)) return total;
    return total + (excelNumericMode ? excelNumeric(row?.[key]) : Number(row?.[key] || 0));
  }, 0);
}

function excelNumeric(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const text = value.trim();
  if (!text) return 0;
  const number = Number(text.replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function isCheckmark(value) {
  return normalizeImportedText(value) === "✓";
}

function inferTestStatus(executedCases, totalCases) {
  const executed = Number(executedCases || 0);
  const total = Number(totalCases || 0);
  if (!executed) return "Chưa Test";
  return total && executed >= total ? "Passed" : "Đang Test";
}

function inferUatStatus(executedCases, totalCases) {
  const executed = Number(executedCases || 0);
  const total = Number(totalCases || 0);
  if (!executed) return "Chưa bắt đầu";
  return total && executed >= total ? "Hoàn thành" : "Đang kiểm thử";
}

function inferUatPriority(devStatus) {
  const normalized = normalizeImportHeader(devStatus);
  if (normalized === "done sit") return 1;
  if (normalized === "done uat") return 2;
  return "";
}

function inferFeatureUatResult(row) {
  if (Number(row.blockerOpen || 0) || Number(row.criticalOpen || 0)) return "CÓ LỖI NGHIÊM TRỌNG";
  if (!Number(row.totalCases || 0) || !Number(row.passedCases || 0)) return "CHƯA TEST";
  if (Number(row.failedCases || 0) || Number(row.blockedCases || 0)) return "ĐANG XỬ LÝ";
  return Number(row.completionRate || 0) >= 100 ? "PASS" : "ĐANG TEST";
}

function isSeverity(value, target) {
  return normalizeImportHeader(value) === normalizeImportHeader(target);
}

function isBugStatus(value, target) {
  if (normalizeImportHeader(target) === "reopen") {
    return ["reopen", "reopened"].includes(normalizeImportHeader(value));
  }
  return normalizeImportHeader(value) === normalizeImportHeader(target);
}

function isAnySeverity(value, targets) {
  return targets.some((target) => isSeverity(value, target));
}

function isBlockingSeverity(value) {
  return isAnySeverity(value, ["Blocker", "Critical", "Nghiêm trọng"]);
}

function isHighSeverity(value) {
  return isAnySeverity(value, ["Major", "Cao"]);
}

function isOpenBugStatus(status) {
  const normalized = normalizeImportHeader(status);
  if (!normalized) return false;
  return !["da dong", "closed", "cancelled", "canceled"].includes(normalized);
}

function isClosedBugStatus(status) {
  return ["da dong", "closed"].includes(normalizeImportHeader(status));
}

function isPlanTrackableBugStatus(status) {
  return !["da dong", "closed", "cancelled", "canceled"].includes(normalizeImportHeader(status));
}

function vietnamDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateOnlyOrdinal(value) {
  const match = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
}

function planBugRecencyBucket(logDate, referenceDate = new Date()) {
  const logOrdinal = dateOnlyOrdinal(logDate);
  const todayOrdinal = dateOnlyOrdinal(vietnamDateKey(referenceDate));
  if (logOrdinal === null || todayOrdinal === null) return "unknown";
  const ageDays = todayOrdinal - logOrdinal;
  if (ageDays < 0) return "unknown";
  return ageDays <= 7 ? "new" : "old";
}

function firstSafeHttpUrl(values) {
  const candidates = Array.isArray(values) ? values : [values];
  for (const value of candidates) {
    const text = String(value || "").trim();
    if (!text) continue;
    try {
      const parsed = new URL(text);
      if (["http:", "https:"].includes(parsed.protocol)) return parsed.toString();
    } catch {
      // Invalid and non-HTTP(S) links are deliberately ignored.
    }
  }
  return "";
}

function jiraIssueKey(value) {
  const text = normalizeImportedText(value);
  const match = text.match(/\b[A-Z][A-Z0-9_]*-\d+\b/i);
  return match ? match[0].toUpperCase() : "";
}

function jiraBugUrl(bugId, ...candidateUrls) {
  const sourceUrl = firstSafeHttpUrl(candidateUrls);
  if (sourceUrl) return sourceUrl;
  const issueKey = jiraIssueKey(bugId);
  return issueKey ? `${jiraBrowseBaseUrl}${encodeURIComponent(issueKey)}` : "";
}

function buildPlanBugLink(defect, sourceBug) {
  const status = normalizeBugStatus(defect?.status || sourceBug?.status || "");
  if (!isPlanTrackableBugStatus(status)) return null;
  const bugId = normalizeImportedText(defect?.bugId || sourceBug?.issueKey);
  if (!bugId) return null;
  const title = normalizeImportedText(sourceBug?.summary || defect?.bugTitle || defect?.summary);
  const logDate = normalizeImportedDate(defect?.foundDate || sourceBug?.created || "");
  return {
    bugId,
    title,
    label: title && lookupKey(title) !== lookupKey(bugId) ? `${bugId} - ${title}` : bugId,
    status,
    severity: normalizeImportedText(defect?.severity || sourceBug?.priority),
    logDate,
    recencyBucket: planBugRecencyBucket(logDate),
    linkedUsKey: jiraIssueKey(defect?.linkedUsKey || sourceBug?.linkedUsKey)
      || normalizeImportedText(defect?.linkedUsKey || sourceBug?.linkedUsKey),
    url: jiraBugUrl(bugId, defect?.jiraUrl, sourceBug?.jiraUrl)
  };
}

function applyPlanOpenBugRules(state) {
  const plans = collectionRows(state, "plans");
  const defects = collectionRows(state, "defects");
  const userStories = collectionRows(state, "userStories");
  const bugSources = collectionRows(state, "bugSources");
  const bugSourceByIssueKey = lookupBy(bugSources, "issueKey");
  const userStoryKeysByPlanKey = new Map();

  const addStoryPlanKey = (planKey, issueKey) => {
    const normalizedPlanKey = lookupKey(planKey);
    const normalizedIssueKey = lookupKey(jiraIssueKey(issueKey) || issueKey);
    if (!normalizedPlanKey || !normalizedIssueKey) return;
    if (!userStoryKeysByPlanKey.has(normalizedPlanKey)) userStoryKeysByPlanKey.set(normalizedPlanKey, new Set());
    userStoryKeysByPlanKey.get(normalizedPlanKey).add(normalizedIssueKey);
  };
  userStories.forEach((story) => {
    addStoryPlanKey(story.jiraCode, story.issueKey);
    addStoryPlanKey(story.squadSummary, story.issueKey);
    addStoryPlanKey(deriveSquadSummaryFromUserStorySummary(story.summary), story.issueKey);
    addStoryPlanKey(story.issueKey, story.issueKey);
  });

  plans.forEach((plan) => {
    const planKeys = new Set([plan.jiraCode, plan.code]
      .map(lookupKey)
      .filter(Boolean));
    const linkedUsKeys = new Set();
    for (const planKey of planKeys) {
      linkedUsKeys.add(planKey);
      for (const issueKey of userStoryKeysByPlanKey.get(planKey) || []) linkedUsKeys.add(issueKey);
    }

    const seenBugIds = new Set();
    plan.openBugLinks = defects.reduce((items, defect) => {
      const sourceBug = bugSourceByIssueKey.get(lookupKey(defect.bugId));
      const bugLink = buildPlanBugLink(defect, sourceBug);
      if (!bugLink) return items;

      const linkedUsKey = lookupKey(jiraIssueKey(defect.linkedUsKey || sourceBug?.linkedUsKey)
        || defect.linkedUsKey
        || sourceBug?.linkedUsKey);
      const featureKey = lookupKey(defect.featureJiraCode || defect.jiraCode || sourceBug?.featureJiraCode || sourceBug?.jiraCode);
      if (!linkedUsKeys.has(linkedUsKey) && !planKeys.has(featureKey)) return items;

      const dedupeKey = lookupKey(bugLink.bugId || defect.id);
      if (!dedupeKey || seenBugIds.has(dedupeKey)) return items;
      seenBugIds.add(dedupeKey);
      items.push(bugLink);
      return items;
    }, []);
  });

  return plans;
}

function buildUnmappedPlanBugGroups(state) {
  const plans = collectionRows(state, "plans");
  const defects = collectionRows(state, "defects");
  const userStories = collectionRows(state, "userStories");
  const bugSources = collectionRows(state, "bugSources");
  const sourceByIssueKey = lookupBy(bugSources, "issueKey");
  const storyByIssueKey = lookupBy(userStories, "issueKey");
  const linkedBugIds = new Set(plans
    .flatMap((plan) => Array.isArray(plan.openBugLinks) ? plan.openBugLinks : [])
    .map((bug) => lookupKey(bug?.bugId))
    .filter(Boolean));
  const groups = new Map();
  const seenBugIds = new Set();

  for (const defect of defects) {
    const sourceBug = sourceByIssueKey.get(lookupKey(defect?.bugId));
    const bugLink = buildPlanBugLink(defect, sourceBug);
    const bugKey = lookupKey(bugLink?.bugId);
    if (!bugLink || !bugKey || linkedBugIds.has(bugKey) || seenBugIds.has(bugKey)) continue;
    seenBugIds.add(bugKey);

    const linkedUsKey = jiraIssueKey(bugLink.linkedUsKey) || normalizeImportedText(bugLink.linkedUsKey);
    const story = storyByIssueKey.get(lookupKey(linkedUsKey));
    const groupKey = lookupKey(linkedUsKey) || "__missing_child_of__";
    if (!groups.has(groupKey)) {
      const featureJiraCode = linkedUsKey ? normalizeImportedText(
        story?.jiraCode
        || story?.squadSummary
        || deriveSquadSummaryFromUserStorySummary(story?.summary)
        || defect?.featureJiraCode
        || defect?.jiraCode
      ) : "";
      groups.set(groupKey, {
        id: importId("unmapped-plan-bugs", groupKey),
        linkedUsKey,
        featureJiraCode,
        storyName: linkedUsKey ? normalizeImportedText(story?.summary || defect?.storyName || "") : "",
        sprint: normalizeImportedText(story?.sprint || defect?.sprint || ""),
        reason: linkedUsKey
          ? "US chưa có dòng phù hợp trong PhanCong_UAT"
          : "Bug chưa khai báo Child Of",
        missingChildOf: !linkedUsKey,
        openBugLinks: []
      });
    }
    groups.get(groupKey).openBugLinks.push(bugLink);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      openBugLinks: group.openBugLinks.sort((left, right) => (
        String(right.logDate || "").localeCompare(String(left.logDate || ""))
        || String(left.bugId || "").localeCompare(String(right.bugId || ""), "vi", { numeric: true })
      ))
    }))
    .sort((left, right) => (
      Number(left.missingChildOf) - Number(right.missingChildOf)
      || String(left.linkedUsKey || "").localeCompare(String(right.linkedUsKey || ""), "vi", { numeric: true })
    ));
}

function addDays(value, days) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateForInput(date);
}

function applyScheduleRules(schedule) {
  const sprintDays = 14;
  let previousDevStart = "";
  schedule.forEach((row) => {
    if (!isSprintLabel(row.sprint)) return;
    const devStart = row.devStart || previousDevStart;
    if (!devStart) return;
    row.devStart = devStart;
    row.devEnd = addDays(devStart, sprintDays - 1);
    row.handoffDate = row.devEnd;
    row.startDate = addDays(row.handoffDate, 1);
    row.endDate = row.startDate ? addDays(row.startDate, sprintDays - 1) : "";
    previousDevStart = devStart;
  });
}

function sumPlanAssignments(row) {
  return ["nv", ...testerKeys].reduce((total, key) => total + excelNumeric(row?.[key]), 0);
}

function isSprintLabel(value) {
  return /^sprint\s*\d+/i.test(normalizeImportedText(value));
}

function importId(collection, ...parts) {
  return crypto
    .createHash("sha1")
    .update([collection, ...parts].map((part) => String(part || "")).join("|"))
    .digest("hex");
}

function stateRecordTotal(state, targetCollections = collections) {
  return targetCollections.reduce((total, collection) => total + (Array.isArray(state?.[collection]) ? state[collection].length : 0), 0);
}

function summarizeImportState(state, targetCollections = collections) {
  return targetCollections.reduce((summary, collection) => {
    summary[collection] = Array.isArray(state?.[collection]) ? state[collection].length : 0;
    return summary;
  }, {});
}

function prepareWorkbookImportState(state, importedAt = new Date().toISOString()) {
  return prepareSourceImportState(state, {
    importedAt,
    source: "workbook",
    targetCollections: workbookCollections
  });
}

function prepareSourceImportState(state, options = {}) {
  const importedAt = options.importedAt || new Date().toISOString();
  const source = options.source || "workbook";
  const targetCollections = options.targetCollections || workbookCollections;
  const sheetByCollection = new Map(excelSheets.map((sheet) => [sheet.collection, sheet.name]));
  for (const collection of targetCollections) {
    for (const record of state[collection] || []) {
      record._import = {
        source,
        sheet: sheetByCollection.get(collection) || collection,
        importedAt
      };
    }
  }
  return state;
}

function mergeWorkbookSourceState(existingState, importState, options = {}) {
  const importedAt = options.importedAt || new Date().toISOString();
  const sheetByCollection = new Map(excelSheets.map((sheet) => [sheet.collection, sheet.name]));
  const mergedState = cloneSerializable(existingState);
  const protectedRows = new Map(workbookMergeProtectedCollections.map((collection) => [
    collection,
    cloneSerializable(Array.isArray(existingState?.[collection]) ? existingState[collection] : [])
  ]));
  const summary = {};

  for (const collection of ["userStories", "bugSources", "defects"]) {
    const identityField = workbookSourceIdentityFields[collection];
    const existingRows = collectionRows(existingState, collection);
    const incomingRows = collectionRows(importState, collection);
    const existingByIdentity = lookupBy(existingRows, identityField);
    const incomingIdentityKeys = new Set();
    let carriedInvalidFields = 0;
    let carriedDefectManualFields = 0;

    const mergedRows = incomingRows.map((incoming) => {
      const identityKey = lookupKey(incoming?.[identityField]);
      if (identityKey) incomingIdentityKeys.add(identityKey);
      const existing = existingByIdentity.get(identityKey);
      const invalidFields = new Set(incoming?._sourceInvalidFields || []);
      const record = {
        ...incoming,
        _import: {
          source: options.source || "workbook",
          sheet: sheetByCollection.get(collection) || collection,
          importedAt
        }
      };

      for (const field of invalidFields) {
        if (!existing || isBlank(existing[field])) continue;
        record[field] = existing[field];
        carriedInvalidFields += 1;
      }

      if (collection === "defects" && options.preserveDefectManualFields !== false) {
        for (const field of defectManualFields) {
          const nextValue = existing ? existing[field] : "";
          if (!existing || sameLookup(record[field], nextValue)) {
            record[field] = nextValue;
            continue;
          }
          record[field] = nextValue;
          carriedDefectManualFields += 1;
        }
      }

      return record;
    });

    const preservedManualRows = existingRows
      .filter((row) => !isWorkbookManagedRecord(row))
      .filter((row) => !incomingIdentityKeys.has(lookupKey(row?.[identityField])))
      .map((row) => cloneSerializable(row));
    mergedState[collection] = [...mergedRows, ...preservedManualRows];
    summary[collection] = {
      existing: existingRows.length,
      incoming: incomingRows.length,
      output: mergedState[collection].length,
      preservedManual: preservedManualRows.length,
      carriedInvalidFields,
      carriedDefectManualFields
    };
  }

  const existingDaily = collectionRows(existingState, "daily");
  const incomingDaily = collectionRows(importState, "daily");
  const managedDaily = existingDaily.filter((row) => isWorkbookManagedRecord(row));
  let carriedDailyFields = 0;
  const mergedDaily = incomingDaily.map((incoming) => {
    const existing = findDailyCarryForwardMatch(incoming, managedDaily);
    const record = {
      ...incoming,
      _import: {
        source: options.source || "workbook",
        sheet: sheetByCollection.get("daily") || "DieuHanh_Ngay",
        importedAt
      }
    };
    if (existing) {
      for (const field of ["code", "jiraCode", "feature", "sprint"]) {
        if (!isBlank(record[field]) || isBlank(existing[field])) continue;
        record[field] = existing[field];
        carriedDailyFields += 1;
      }
    }
    record.id = importId("daily", record.date, record.jiraCode, record.tester, record.feature, record.sprint);
    return record;
  });
  const preservedManualDaily = existingDaily
    .filter((row) => !isWorkbookManagedRecord(row))
    .filter((row) => !mergedDaily.some((incoming) => dailyRowsEquivalent(incoming, row)))
    .map((row) => cloneSerializable(row));
  mergedState.daily = [...mergedDaily, ...preservedManualDaily];
  summary.daily = {
    existing: existingDaily.length,
    incoming: incomingDaily.length,
    output: mergedState.daily.length,
    preservedManual: preservedManualDaily.length,
    carriedFields: carriedDailyFields
  };

  // Keep the workbook's row-to-US mapping as the calculation skeleton.
  mergedState.defectSummary = cloneSerializable(collectionRows(importState, "defectSummary"));
  applyWorkbookRules(mergedState);
  assignSortOrder(mergedState);
  for (const [collection, rows] of protectedRows.entries()) mergedState[collection] = rows;
  mergedState.updatedAt = importedAt;
  return { state: mergedState, summary };
}

function findDailyCarryForwardMatch(incoming, existingRows) {
  const candidates = (existingRows || []).filter((existing) => (
    sameNonBlankLookup(existing.date, incoming.date)
    && sameNonBlankLookup(existing.tester, incoming.tester)
  ));
  if (!candidates.length) return null;
  const byJira = candidates.find((existing) => sameNonBlankLookup(existing.jiraCode, incoming.jiraCode));
  if (byJira) return byJira;
  const incomingLinks = new Set([
    ...(incoming.blockerLinks || []),
    ...extractUrls(incoming.blocker || "")
  ].map(lookupKey).filter(Boolean));
  if (incomingLinks.size) {
    const byLink = candidates.find((existing) => [
      ...(existing.blockerLinks || []),
      ...extractUrls(existing.blocker || "")
    ].some((link) => incomingLinks.has(lookupKey(link))));
    if (byLink) return byLink;
  }
  return candidates.find((existing) => (
    sameNonBlankLookup(existing.feature, incoming.feature)
    && sprintMatches(existing.sprint, incoming.sprint)
  )) || null;
}

function dailyRowsEquivalent(left, right) {
  return [
    "date",
    "sprint",
    "jiraCode",
    "feature",
    "tester",
    "totalCases",
    "passedCases",
    "failedCases",
    "bugStatus",
    "maxBugSeverity",
    "bugDetail",
    "blocker",
    "handler",
    "dueDate"
  ].every((field) => sameLookup(left?.[field], right?.[field]));
}

function cloneSerializable(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseBooleanFlag(value) {
  return /^(1|true|yes|on)$/i.test(String(value || "").trim());
}

function normalizeImportSourceName(value) {
  const raw = String(value || "workbook.xlsx").trim();
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch (_error) {
    decoded = raw;
  }
  return path.basename(decoded)
    .replace(/[\u0000-\u001f\u007f]+/g, "")
    .slice(0, 180) || "workbook.xlsx";
}

async function auditWorkbookMergeAgainstSource(buffer, state) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return auditWorkbookObjectAgainstSource(workbook, state);
}

function auditWorkbookObjectAgainstSource(workbook, state) {
  const mismatches = [];
  let checkedCells = 0;

  const compareCell = (label, expected, cell) => {
    checkedCells += 1;
    const actual = workbookAuditCellValue(cell);
    if (workbookAuditValuesEqual(expected, actual)) return;
    mismatches.push({
      cell: label,
      expected: workbookAuditPrintable(expected),
      actual: workbookAuditPrintable(actual)
    });
  };

  const defectDashboard = workbook.getWorksheet("DEFECT_Dashboard");
  if (!defectDashboard) {
    mismatches.push({ cell: "DEFECT_Dashboard", expected: "sheet", actual: "missing" });
  } else {
    auditDashboardTable(
      defectDashboard,
      4,
      1,
      getDefectDashboardKpiRows(state),
      "DEFECT_Dashboard KPI",
      compareCell
    );
    auditDashboardTable(
      defectDashboard,
      4,
      4,
      getDefectDashboardMatrixRows(state),
      "DEFECT_Dashboard matrix",
      compareCell
    );
    auditDashboardTable(
      defectDashboard,
      18,
      1,
      getDefectUserStorySummaryRows(state),
      "DEFECT_Dashboard US",
      compareCell
    );
    auditDashboardTable(
      defectDashboard,
      18,
      4,
      getDefectStatusSummaryRows(state),
      "DEFECT_Dashboard status",
      compareCell
    );
    auditDashboardTable(
      defectDashboard,
      26,
      4,
      getDefectPrioritySummaryRows(state),
      "DEFECT_Dashboard severity",
      compareCell
    );
  }

  const defectSummary = workbook.getWorksheet("Tong hop loi");
  let summaryRows = 0;
  if (!defectSummary) {
    mismatches.push({ cell: "Tong hop loi", expected: "sheet", actual: "missing" });
  } else {
    const byJira = lookupBy(collectionRows(state, "defectSummary"), "jiraCode");
    const byUsKey = lookupBy(collectionRows(state, "defectSummary"), "usKey");
    const summaryFields = [
      ["totalBugs", 21],
      ["openBugs", 22],
      ["inProgressBugs", 23],
      ["pendingBugs", 24],
      ["resolvedBugs", 25],
      ["sitPassBugs", 26],
      ["otherBugs", 27]
    ];
    for (let rowNumber = 2; rowNumber <= defectSummary.rowCount; rowNumber += 1) {
      const row = defectSummary.getRow(rowNumber);
      const jiraCode = cellTextAt(row, 4);
      const usKey = cellTextAt(row, 5);
      if (!jiraCode && !usKey) continue;
      summaryRows += 1;
      const expectedRow = byJira.get(lookupKey(jiraCode)) || byUsKey.get(lookupKey(usKey));
      if (!expectedRow) {
        mismatches.push({
          cell: `Tong hop loi!${rowNumber}`,
          expected: jiraCode || usKey,
          actual: "missing merged row"
        });
        continue;
      }
      for (const [field, column] of summaryFields) {
        compareCell(
          `Tong hop loi!${columnLetters(column)}${rowNumber}`,
          expectedRow[field],
          row.getCell(column)
        );
      }
    }
    if (summaryRows !== collectionRows(state, "defectSummary").length) {
      mismatches.push({
        cell: "Tong hop loi row count",
        expected: collectionRows(state, "defectSummary").length,
        actual: summaryRows
      });
    }
  }

  return {
    ok: mismatches.length === 0,
    checkedCells,
    summaryRows,
    mismatches
  };
}

function auditDashboardTable(worksheet, startRow, startColumn, rows, label, compareCell) {
  rows.forEach((values, rowIndex) => {
    values.forEach((expected, columnIndex) => {
      const rowNumber = startRow + rowIndex;
      const columnNumber = startColumn + columnIndex;
      compareCell(
        `${label}!${columnLetters(columnNumber)}${rowNumber}`,
        expected,
        worksheet.getCell(rowNumber, columnNumber)
      );
    });
  });
}

function workbookAuditCellValue(cell) {
  if (cell && cell.result !== undefined && cell.result !== null) return cell.result;
  const value = cell?.value;
  if (value == null) return "";
  if (value instanceof Date) return formatDateForInput(value);
  if (typeof value !== "object") return value;
  if (Object.prototype.hasOwnProperty.call(value, "result")) return value.result;
  if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("");
  if (value.text != null) return value.text;
  if (value.hyperlink != null) return value.text || value.hyperlink;
  return String(value);
}

function workbookAuditValuesEqual(expected, actual) {
  const normalizedExpected = normalizeWorkbookAuditValue(expected);
  const normalizedActual = normalizeWorkbookAuditValue(actual);
  if (normalizedExpected.type === "blank" && normalizedActual.type === "blank") return true;
  if (normalizedExpected.type === "number" && normalizedActual.type === "number") {
    return Math.abs(normalizedExpected.value - normalizedActual.value) <= 0.00005;
  }
  return normalizedExpected.type === normalizedActual.type
    && normalizedExpected.value === normalizedActual.value;
}

function normalizeWorkbookAuditValue(value) {
  if (isBlank(value)) return { type: "blank", value: "" };
  if (typeof value === "number" && Number.isFinite(value)) return { type: "number", value };
  const text = normalizeImportedText(value);
  if (!text || text === "-") return { type: "blank", value: "" };
  const percentage = text.match(/^(-?[\d.,]+)\s*%$/);
  if (percentage) {
    const parsed = Number(percentage[1].replace(",", "."));
    if (Number.isFinite(parsed)) return { type: "number", value: parsed / 100 };
  }
  const numeric = Number(text.replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", "."));
  if (Number.isFinite(numeric) && /^-?[\d.,]+$/.test(text)) {
    return { type: "number", value: numeric };
  }
  return {
    type: "text",
    value: text.normalize("NFC").toLocaleLowerCase("vi")
  };
}

function workbookAuditPrintable(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function columnLetters(columnNumber) {
  let number = Number(columnNumber || 0);
  let letters = "";
  while (number > 0) {
    const remainder = (number - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    number = Math.floor((number - 1) / 26);
  }
  return letters;
}

function auditMergePreservation(existingState, mergedState) {
  const mismatches = [];
  const protectedCollections = workbookMergeProtectedCollections;
  for (const collection of protectedCollections) {
    const before = canonicalCollectionRows(collectionRows(existingState, collection));
    const after = canonicalCollectionRows(collectionRows(mergedState, collection));
    if (before !== after) mismatches.push(`${collection} changed`);
  }

  for (const collection of workbookSourceMergeCollections) {
    const existingManualRows = collectionRows(existingState, collection)
      .filter((row) => !isWorkbookManagedRecord(row));
    const mergedRows = collectionRows(mergedState, collection);
    for (const row of existingManualRows) {
      const preserved = mergedRows.some((candidate) => (
        (
          candidate.id === row.id
          && canonicalRecord(candidate, ["sortOrder"]) === canonicalRecord(row, ["sortOrder"])
        )
        || (collection === "daily" && dailyRowsEquivalent(candidate, row))
      ));
      if (!preserved) mismatches.push(`${collection}:${row.id} manual row was not preserved`);
    }
  }

  return {
    ok: mismatches.length === 0,
    protectedCollections,
    preservedManual: Object.fromEntries(workbookSourceMergeCollections.map((collection) => [
      collection,
      collectionRows(existingState, collection).filter((row) => !isWorkbookManagedRecord(row)).length
    ])),
    mismatches
  };
}

function auditPersistedMergeState(expectedState, actualState) {
  const mismatches = [];
  for (const collection of workbookCollections) {
    const expected = new Map(collectionRows(expectedState, collection).map((row) => [
      String(row.id),
      canonicalRecord(row, ["createdAt", "updatedAt"])
    ]));
    const actual = new Map(collectionRows(actualState, collection).map((row) => [
      String(row.id),
      canonicalRecord(row, ["createdAt", "updatedAt"])
    ]));
    if (expected.size !== actual.size) {
      mismatches.push(`${collection} count expected ${expected.size}, got ${actual.size}`);
      continue;
    }
    for (const [id, expectedRecord] of expected.entries()) {
      if (!actual.has(id)) {
        mismatches.push(`${collection}:${id} missing`);
        continue;
      }
      if (actual.get(id) !== expectedRecord) mismatches.push(`${collection}:${id} data mismatch`);
    }
  }
  return {
    ok: mismatches.length === 0,
    mismatches
  };
}

function canonicalCollectionRows(rows) {
  return JSON.stringify((rows || [])
    .map((row) => [String(row.id || ""), canonicalRecord(row)])
    .sort((left, right) => left[0].localeCompare(right[0])));
}

function canonicalRecord(record, omittedFields = ["createdAt", "updatedAt"]) {
  const omitted = new Set(omittedFields);
  return JSON.stringify(canonicalJsonValue(record, omitted));
}

function canonicalJsonValue(value, omittedFields = new Set()) {
  if (Array.isArray(value)) return value.map((entry) => canonicalJsonValue(entry, omittedFields));
  if (!value || typeof value !== "object") return value;
  return Object.keys(value)
    .filter((key) => !omittedFields.has(key))
    .sort()
    .reduce((result, key) => {
      result[key] = canonicalJsonValue(value[key], omittedFields);
      return result;
    }, {});
}

function isWorkbookManagedRecord(row) {
  const data = row?.data && typeof row.data === "object" ? row.data : row;
  const id = String(row?.id || data?.id || "").trim();
  return ["workbook", "google-sheet"].includes(String(data?._import?.source || ""))
    || /^[a-f0-9]{40}$/i.test(id);
}

function preservePersonnelExtendedFields(importState, existingRows) {
  const importedFields = importState?._personnelImportFields || {};
  const existingPersonnel = (existingRows || [])
    .filter((row) => row.collection === "personnel" && isWorkbookManagedRecord(row));
  const byId = new Map(existingPersonnel.map((row) => [String(row.id || ""), row.data || {}]));
  const byStaffCode = new Map(existingPersonnel
    .map((row) => row.data || {})
    .filter((row) => !isBlank(row.staffCode))
    .map((row) => [lookupKey(row.staffCode), row]));
  const byEmail = new Map(existingPersonnel
    .map((row) => row.data || {})
    .filter((row) => !isBlank(row.email))
    .map((row) => [normalizeIdentity(row.email), row]));
  let preservedFieldCount = 0;

  for (const record of importState?.personnel || []) {
    const existing = byId.get(String(record.id || ""))
      || byStaffCode.get(lookupKey(record.staffCode))
      || byEmail.get(normalizeIdentity(record.email));
    if (!existing) continue;
    for (const { key } of personnelExtendedFields) {
      if (importedFields[key] || !isBlank(record[key]) || isBlank(existing[key])) continue;
      record[key] = existing[key];
      preservedFieldCount += 1;
    }
  }
  return preservedFieldCount;
}

async function mergeWorkbookImportRecords(client, importState, actor) {
  const existing = await client.query(`
    select collection, id, data
    from uat_records
    where collection = any($1::text[])
  `, [workbookCollections]);
  const idsToReplace = new Map(workbookCollections.map((collection) => [collection, []]));
  const preserved = Object.fromEntries(workbookCollections.map((collection) => [collection, 0]));
  preservePersonnelExtendedFields(importState, existing.rows);

  for (const row of existing.rows) {
    if (isWorkbookManagedRecord(row)) idsToReplace.get(row.collection)?.push(row.id);
    else preserved[row.collection] = Number(preserved[row.collection] || 0) + 1;
  }

  const replaced = {};
  for (const collection of workbookCollections) {
    const ids = idsToReplace.get(collection) || [];
    replaced[collection] = ids.length;
    if (ids.length) {
      await client.query(
        "delete from uat_records where collection = $1 and id = any($2::text[])",
        [collection, ids]
      );
    }
    for (const record of importState[collection] || []) {
      await createRecord(client, collection, record, actor);
    }
  }

  return { preserved, replaced };
}

function parseWorkItemExportFilters(query = {}) {
  const categoryId = String(query.categoryId || "").trim();
  const dateField = String(query.dateField || "startDate").trim();
  const fromDate = String(query.fromDate || "").trim();
  const toDate = String(query.toDate || "").trim();
  const allowedDateFields = new Set(["startDate", "dueDate", "completedDate"]);
  if (!categoryId) throw httpError(400, "Nhóm công việc là trường bắt buộc.");
  if (!allowedDateFields.has(dateField)) throw httpError(400, "Mốc thời gian không hợp lệ.");
  if (fromDate && !isIsoDateOnly(fromDate)) throw httpError(400, "Từ ngày không hợp lệ.");
  if (toDate && !isIsoDateOnly(toDate)) throw httpError(400, "Đến ngày không hợp lệ.");
  if (fromDate && toDate && fromDate > toDate) throw httpError(400, "Từ ngày không được sau Đến ngày.");
  return { categoryId, dateField, fromDate, toDate };
}

function isIsoDateOnly(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizePersonalWorkspaceTask(input = {}, current = null) {
  const squad = String(input.squad ?? current?.squad ?? "").trim();
  const title = String(input.title ?? current?.title ?? "").replace(/\s+/g, " ").trim();
  const assigner = String(input.assigner ?? current?.assigner ?? "").replace(/\s+/g, " ").trim();
  const assignedDate = String(input.assignedDate ?? current?.assignedDate ?? "").trim();
  const dueDate = String(input.dueDate ?? current?.dueDate ?? "").trim();
  const status = String(input.status ?? current?.status ?? personalWorkspaceStatusOptions[0]).trim();
  const note = String(input.note ?? current?.note ?? "").trim();

  if (!personalWorkspaceSquads.includes(squad)) throw httpError(400, "Squad không hợp lệ.");
  if (!title) throw httpError(400, "Tên công việc là trường bắt buộc.");
  if (title.length > 240) throw httpError(400, "Tên công việc không được vượt quá 240 ký tự.");
  if (!assigner) throw httpError(400, "Người giao việc là trường bắt buộc.");
  if (assigner.length > 160) throw httpError(400, "Người giao việc không được vượt quá 160 ký tự.");
  if (assignedDate && !isIsoDateOnly(assignedDate)) throw httpError(400, "Ngày giao việc không hợp lệ.");
  if (dueDate && !isIsoDateOnly(dueDate)) throw httpError(400, "Deadline không hợp lệ.");
  if (assignedDate && dueDate && dueDate < assignedDate) {
    throw httpError(400, "Deadline không được trước ngày giao việc.");
  }
  if (!personalWorkspaceStatusOptions.includes(status)) throw httpError(400, "Trạng thái không hợp lệ.");
  if (note.length > 2000) throw httpError(400, "Ghi chú không được vượt quá 2.000 ký tự.");

  const completedDate = status === "Hoàn thành"
    ? String(input.completedDate || current?.completedDate || new Date().toISOString().slice(0, 10))
    : "";
  return { squad, title, assigner, assignedDate, dueDate, status, note, completedDate };
}

function mapPersonalWorkspaceTaskRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    squad: row.squad,
    title: row.title,
    assigner: row.assigner,
    assignedDate: row.assigned_date || "",
    dueDate: row.due_date || "",
    status: row.status,
    note: row.note || "",
    completedDate: row.completed_date || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const personalWorkspaceSelect = `
  select id,
         squad,
         title,
         assigner,
         to_char(assigned_date, 'YYYY-MM-DD') as assigned_date,
         to_char(due_date, 'YYYY-MM-DD') as due_date,
         status,
         note,
         to_char(completed_date, 'YYYY-MM-DD') as completed_date,
         created_at,
         updated_at
  from personal_cross_squad_tasks
`;

async function listPersonalWorkspaceTasks(db) {
  const result = await db.query(`${personalWorkspaceSelect}
    order by case squad when '1' then 1 when '7' then 2 when '11' then 3 else 4 end,
             case when status = 'Hoàn thành' then 1 else 0 end,
             due_date asc nulls last,
             created_at desc
  `);
  return result.rows.map(mapPersonalWorkspaceTaskRow);
}

async function getPersonalWorkspaceTask(db, id) {
  const result = await db.query(`${personalWorkspaceSelect} where id = $1 limit 1`, [id]);
  return mapPersonalWorkspaceTaskRow(result.rows[0]);
}

function buildPersonalWorkspaceWorkbook(tasks = []) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Mai Tấn Thành";
  workbook.created = new Date();
  workbook.modified = new Date();
  const columns = [
    { header: "STT", key: "index", width: 8 },
    { header: "Tên công việc", key: "title", width: 42 },
    { header: "Người giao", key: "assigner", width: 24 },
    { header: "Ngày giao", key: "assignedDate", width: 14 },
    { header: "Deadline", key: "dueDate", width: 14 },
    { header: "Trạng thái", key: "status", width: 20 },
    { header: "Ghi chú", key: "note", width: 48 }
  ];

  for (const squad of personalWorkspaceSquads) {
    const worksheet = workbook.addWorksheet(`Squad ${squad}`, {
      views: [{ state: "frozen", ySplit: 2 }]
    });
    worksheet.mergeCells("A1:G1");
    worksheet.getCell("A1").value = `CÔNG VIỆC CÁ NHÂN · SQUAD ${squad}`;
    worksheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    worksheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF006F6B" } };
    worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(1).height = 28;
    worksheet.columns = columns.map(({ key, width }) => ({ key, width }));
    worksheet.getRow(2).values = columns.map((column) => column.header);
    worksheet.getRow(2).height = 24;
    worksheet.getRow(2).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF008C86" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
    worksheet.autoFilter = { from: "A2", to: "G2" };

    tasks.filter((task) => String(task.squad) === squad).forEach((task, index) => {
      const row = worksheet.addRow({
        index: index + 1,
        title: task.title,
        assigner: task.assigner,
        assignedDate: task.assignedDate ? new Date(`${task.assignedDate}T00:00:00`) : null,
        dueDate: task.dueDate ? new Date(`${task.dueDate}T00:00:00`) : null,
        status: task.status,
        note: task.note
      });
      row.getCell("assignedDate").numFmt = "dd/mm/yyyy";
      row.getCell("dueDate").numFmt = "dd/mm/yyyy";
      row.alignment = { vertical: "top", wrapText: true };
      row.height = Math.min(90, Math.max(22, 15 * Math.ceil(Math.max(task.title.length / 40, task.note.length / 48, 1))));
      row.eachCell((cell) => {
        cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
      });
    });
  }
  return workbook;
}

function safeFilenamePart(value) {
  return String(value || "")
    .replace(/[đĐ]/g, (letter) => letter === "Đ" ? "D" : "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "cong-viec";
}

function filterWorkItemsForExport(state, filters) {
  const normalized = parseWorkItemExportFilters(filters);
  return collectionRows(state, "workItems").filter((item) => {
    if (String(item.categoryId || "") !== normalized.categoryId) return false;
    if (!normalized.fromDate && !normalized.toDate) return true;
    const value = String(item[normalized.dateField] || "").trim();
    if (!isIsoDateOnly(value)) return false;
    if (normalized.fromDate && value < normalized.fromDate) return false;
    if (normalized.toDate && value > normalized.toDate) return false;
    return true;
  });
}

function buildWorkItemsExportWorkbook(state, filters = {}) {
  const normalized = parseWorkItemExportFilters(filters);
  const category = collectionRows(state, "workCategories")
    .find((row) => String(row.id || "") === normalized.categoryId);
  if (!category) throw httpError(404, "Không tìm thấy nhóm công việc cần xuất.");
  const workItems = filterWorkItemsForExport(state, normalized);
  const exportState = {
    ...state,
    workCategories: [category],
    workItems
  };
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Squad 2 UAT Dashboard";
  workbook.created = new Date();
  workbook.modified = new Date();
  addWorkPlanWorksheet(workbook, exportState);

  const worksheet = workbook.getWorksheet("KeHoach_CongViec");
  const dateLabels = {
    startDate: "Ngày giao việc",
    dueDate: "Deadline",
    completedDate: "Ngày hoàn thành"
  };
  const rangeLabel = normalized.fromDate || normalized.toDate
    ? `${formatExcelDateLabel(normalized.fromDate) || "đầu kỳ"} - ${formatExcelDateLabel(normalized.toDate) || "cuối kỳ"}`
    : "Toàn bộ thời gian";
  worksheet.mergeCells("A2:T2");
  const scopeCell = worksheet.getCell("A2");
  scopeCell.value = `${category.taskPrefix || ""} · ${category.name || "Nhóm công việc"} | ${dateLabels[normalized.dateField]}: ${rangeLabel} | ${workItems.length} công việc`;
  scopeCell.font = { italic: true, color: { argb: "FF475569" } };
  scopeCell.alignment = { vertical: "middle", horizontal: "left" };
  worksheet.getRow(2).height = 22;
  return workbook;
}

function formatExcelDateLabel(value) {
  if (!isIsoDateOnly(value)) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function buildExcelWorkbook(state) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Squad 2 UAT Dashboard";
  workbook.created = new Date();
  workbook.modified = new Date();

  addDashboardUatWorksheet(workbook, state);
  addDefectDashboardWorksheet(workbook, state);

  for (const sheetConfig of orderedExcelSheets()) {
    const worksheetOptions = {
      views: [{ state: "frozen", ySplit: 1, xSplit: sheetConfig.freezeColumns || 0 }]
    };
    if (sheetConfig.tabColor) {
      worksheetOptions.properties = { tabColor: { argb: sheetConfig.tabColor } };
    }
    const worksheet = workbook.addWorksheet(sheetConfig.name, worksheetOptions);
    if (sheetConfig.state) worksheet.state = sheetConfig.state;
    if (sheetConfig.tabColor) worksheet.properties.tabColor = { argb: sheetConfig.tabColor };
    worksheet.columns = sheetConfig.columns.map(([key, header, width]) => ({ key, header, width }));
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheetConfig.columns.length }
    };
    worksheet.getRow(1).height = 24;
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF006B68" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FF004D4A" } }
      };
    });

    let currentSection = "";
    for (const record of state[sheetConfig.collection] || []) {
      const section = sheetConfig.sectionKey ? String(record[sheetConfig.sectionKey] || "").trim() : "";
      if (section && section !== currentSection) {
        addExcelSectionRow(worksheet, sheetConfig, section);
        currentSection = section;
      }
      const rowData = {};
      for (const [key, , , type] of sheetConfig.columns) {
        rowData[key] = excelCellValue(excelRecordValue(record, key), type);
      }
      const row = worksheet.addRow(rowData);
      row.alignment = { vertical: "top", wrapText: true };
      for (const [key, , , type] of sheetConfig.columns) {
        if (type === "date") row.getCell(key).numFmt = "dd/mm/yyyy";
        if (type === "number") row.getCell(key).numFmt = "0.##";
        if (key === "blocker") {
          const links = Array.isArray(record.blockerLinks) ? record.blockerLinks : extractUrls(record.blocker);
          if (links.length && row.getCell(key).value) {
            row.getCell(key).value = { text: String(record.blocker || links[0]), hyperlink: links[0] };
            row.getCell(key).font = { color: { argb: "FF0563C1" }, underline: true };
          }
        }
      }
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (rowNumber % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F8F7" } };
        });
      }
    });
  }
  addWorkPlanWorksheet(workbook, state);
  return workbook;
}

function addWorkPlanWorksheet(workbook, state) {
  const worksheet = workbook.addWorksheet("KeHoach_CongViec", {
    views: [{ state: "frozen", ySplit: 12, xSplit: 2 }]
  });
  const columns = [
    ["recordType", "Loại dòng", 12],
    ["sortOrder", "STT", 8, "number"],
    ["taskPrefix", "Task Prefix", 14],
    ["taskId", "Task ID", 16],
    ["categoryName", "Nhóm công việc", 28],
    ["title", "Tên công việc", 34],
    ["description", "Mô tả", 42],
    ["assignee", "Người thực hiện", 22],
    ["assigneeEmail", "Email người thực hiện", 28],
    ["collaborators", "Đầu mối nghiệp vụ", 26],
    ["status", "Trạng thái", 18],
    ["progress", "% hoàn thành", 14, "number"],
    ["priority", "Ưu tiên", 14],
    ["startDate", "Ngày giao việc", 16, "date"],
    ["dueDate", "Deadline", 16, "date"],
    ["completedDate", "Ngày hoàn thành", 18, "date"],
    ["warning", "Cảnh báo", 18],
    ["documentUrl", "Link tài liệu", 38],
    ["note", "Vướng mắc/Ghi chú", 44],
    ["updatedAt", "Cập nhật", 20, "date"]
  ];

  worksheet.columns = columns.map(([, , width]) => ({ width }));
  writeDashboardTitle(worksheet, "A1:T1", "KẾ HOẠCH CÔNG VIỆC SQUAD 2");
  writeDashboardTable(worksheet, 3, 1, ["Chỉ số", "Giá trị"], getWorkPlanKpiRows(state));

  const headerRow = worksheet.getRow(12);
  columns.forEach(([, header], index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF009C95" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FF00736F" } } };
  });
  worksheet.autoFilter = {
    from: { row: 12, column: 1 },
    to: { row: 12, column: columns.length }
  };

  const categories = collectionRows(state, "workCategories").sort(compareStateRecords);
  const categoryMap = new Map(categories.map((category) => [String(category.id), category]));
  const itemsByCategory = new Map();
  collectionRows(state, "workItems").sort(compareWorkItemsNewestFirst).forEach((item) => {
    const key = String(item.categoryId || "");
    if (!itemsByCategory.has(key)) itemsByCategory.set(key, []);
    itemsByCategory.get(key).push(item);
  });

  const rows = [];
  categories.forEach((category) => {
    rows.push({
      recordType: "Nhóm",
      sortOrder: category.sortOrder || "",
      taskPrefix: category.taskPrefix || "",
      categoryName: category.name || "",
      title: category.name || "",
      description: category.description || "",
      assignee: category.owner || "",
      status: category.status || "",
      dueDate: category.targetDate || "",
      note: category.note || "",
      updatedAt: category.updatedAt || category.createdAt || ""
    });
    (itemsByCategory.get(String(category.id)) || []).forEach((item) => {
      rows.push(workPlanExportRow(item, categoryMap));
    });
    itemsByCategory.delete(String(category.id));
  });
  for (const ungroupedItems of itemsByCategory.values()) {
    ungroupedItems.forEach((item) => rows.push(workPlanExportRow(item, categoryMap)));
  }

  rows.forEach((rowData, index) => {
    const row = worksheet.addRow(columns.map(([key, , , type]) => excelCellValue(rowData[key], type)));
    row.alignment = { vertical: "top", wrapText: true };
    if (rowData.recordType === "Nhóm") {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF12BDB8" } };
      });
    } else if (index % 2 === 1) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F8F7" } };
      });
    }
    columns.forEach(([key, , , type], columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      if (type === "date") cell.numFmt = "dd/mm/yyyy";
      if (type === "number") cell.numFmt = "0.##";
      if (key === "documentUrl" && rowData.documentUrl && /^https?:\/\//i.test(String(rowData.documentUrl))) {
        cell.value = { text: String(rowData.documentUrl), hyperlink: String(rowData.documentUrl) };
        cell.font = { color: { argb: "FF0563C1" }, underline: true };
      }
    });
  });
}

function compareWorkItemsNewestFirst(a, b) {
  const sortA = Number(a?.sortOrder);
  const sortB = Number(b?.sortOrder);
  if (Number.isFinite(sortA) && Number.isFinite(sortB) && sortA !== sortB) return sortB - sortA;
  if (Number.isFinite(sortA) !== Number.isFinite(sortB)) return Number.isFinite(sortA) ? -1 : 1;
  const created = String(b?.createdAt || "").localeCompare(String(a?.createdAt || ""));
  if (created) return created;
  return String(b?.taskId || b?.title || "").localeCompare(String(a?.taskId || a?.title || ""), "vi", { numeric: true });
}

function workPlanExportRow(item, categoryMap) {
  const category = categoryMap.get(String(item.categoryId || ""));
  const assignees = workItemAssignees(item);
  const businessContacts = workItemBusinessContacts(item);
  return {
    recordType: "Công việc",
    sortOrder: item.sortOrder || "",
    taskPrefix: category?.taskPrefix || "",
    taskId: item.taskId || "",
    categoryName: category?.name || item.categoryName || "Chưa phân nhóm",
    title: item.title || "",
    description: item.description || "",
    assignee: assignees.map((person) => person.name || person.email).filter(Boolean).join("\n"),
    assigneeEmail: assignees.map((person) => person.email).filter(Boolean).join("\n"),
    collaborators: businessContacts.map((person) => person.name || person.email).filter(Boolean).join("\n"),
    status: item.status || "",
    progress: item.progress || 0,
    priority: item.priority || "",
    startDate: item.startDate || "",
    dueDate: item.dueDate || "",
    completedDate: item.completedDate || "",
    warning: getWorkItemWarning(item),
    documentUrl: item.documentUrl || "",
    note: item.note || item.blocker || "",
    updatedAt: item.updatedAt || item.createdAt || ""
  };
}

function addExcelSectionRow(worksheet, sheetConfig, section) {
  const rowData = {};
  const sectionKey = sheetConfig.sectionColumnKey || sheetConfig.columns[0][0];
  for (const [key] of sheetConfig.columns) {
    rowData[key] = key === sectionKey ? section : "";
  }
  const row = worksheet.addRow(rowData);
  row.height = 20;
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF12BDB8" } };
    cell.alignment = { vertical: "middle", wrapText: false };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF0EA5A0" } }
    };
  });
}

function addDashboardUatWorksheet(workbook, state) {
  const worksheet = workbook.addWorksheet("Dashboard_UAT", {
    views: [{ state: "frozen", ySplit: 3 }]
  });
  worksheet.columns = [
    { width: 24 },
    { width: 18 },
    { width: 5 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 22 },
    { width: 5 },
    { width: 30 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 16 }
  ];
  writeDashboardTitle(worksheet, "A1:O1", "BẢNG ĐIỀU HÀNH UAT SQUAD 2 - PILOT & GO-LIVE");
  writeDashboardTable(worksheet, 3, 1, ["Chỉ số", "Giá trị"], getDashboardUatSummaryRows(state));
  writeDashboardTable(worksheet, 3, 4, ["Sprint", "Coverage", "Pass Rate", "Blocker", "Critical", "Quyết định"], getDashboardUatSprintRows(state));
  writeDashboardBand(worksheet, "K3:O3", "Tổng hợp theo Đầu mối Nghiệp vụ");
  writeDashboardTable(worksheet, 4, 11, ["ĐMNV", "Số Story", "Tổng TC", "TC đã chạy", "Tỷ lệ bao phủ"], getDashboardUatOwnerRows(state));
}

function addDefectDashboardWorksheet(workbook, state) {
  const worksheet = workbook.addWorksheet("DEFECT_Dashboard", {
    views: [{ state: "frozen", ySplit: 3 }]
  });
  worksheet.columns = [
    { width: 30 },
    { width: 16 },
    { width: 5 },
    { width: 18 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 }
  ];
  writeDashboardTitle(worksheet, "A1:N1", "DASHBOARD DEFECT UAT - SQUAD 2");
  writeDashboardTable(worksheet, 3, 1, ["KPI", "Giá trị"], getDefectDashboardKpiRows(state));
  writeDashboardTable(worksheet, 3, 4, ["Severity/Status", "Open", "In Progress", "Reopen", "Resolved", "Closed", "Cancelled", "Pending", "SIT Pass", "SIT Fail", "Tổng"], getDefectDashboardMatrixRows(state));
  writeDashboardBand(worksheet, "A15:E15", "DASHBOARD - LỖI THEO USER STORY");
  writeDashboardTable(worksheet, 17, 1, ["CHỈ SỐ TỔNG QUAN", "Giá trị"], getDefectUserStorySummaryRows(state));
  writeDashboardTable(worksheet, 17, 4, ["Lỗi theo trạng thái", "Số lượng"], getDefectStatusSummaryRows(state));
  writeDashboardTable(worksheet, 25, 4, ["Lỗi theo mức độ", "Số lượng"], getDefectPrioritySummaryRows(state));
}

function writeDashboardTitle(worksheet, range, title) {
  worksheet.mergeCells(range);
  const cell = worksheet.getCell(range.split(":")[0]);
  cell.value = title;
  cell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF006B68" } };
  cell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(cell.row).height = 24;
}

function writeDashboardBand(worksheet, range, title) {
  worksheet.mergeCells(range);
  const cell = worksheet.getCell(range.split(":")[0]);
  cell.value = title;
  cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF009C95" } };
  cell.alignment = { vertical: "middle", horizontal: "center" };
}

function writeDashboardTable(worksheet, startRow, startColumn, headers, rows) {
  const headerRow = worksheet.getRow(startRow);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(startColumn + index);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF009C95" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  rows.forEach((values, rowIndex) => {
    const row = worksheet.getRow(startRow + rowIndex + 1);
    values.forEach((value, colIndex) => {
      const cell = row.getCell(startColumn + colIndex);
      cell.value = value;
      cell.alignment = { vertical: "middle", horizontal: colIndex === 0 ? "left" : "center", wrapText: true };
      if (rowIndex % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F8F7" } };
      }
    });
  });
  const endRow = startRow + rows.length;
  const endColumn = startColumn + headers.length - 1;
  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
    for (let columnNumber = startColumn; columnNumber <= endColumn; columnNumber += 1) {
      worksheet.getCell(rowNumber, columnNumber).border = {
        top: { style: "thin", color: { argb: "FFD6DBE2" } },
        left: { style: "thin", color: { argb: "FFD6DBE2" } },
        bottom: { style: "thin", color: { argb: "FFD6DBE2" } },
        right: { style: "thin", color: { argb: "FFD6DBE2" } }
      };
    }
  }
}

function getDashboardUatSummaryRows(state) {
  const totalStories = collectionRows(state, "features").length;
  const deliveredStories = collectionRows(state, "handoffs").filter((row) => normalizeImportedText(row.uatHandoff)).length;
  const totalCases = sumBy(collectionRows(state, "plans"), "totalCases");
  const handoffRate = percent(deliveredStories, totalStories);
  const pilotReadiness = round(handoffRate * 0.5);
  return [
    ["Tổng Story", totalStories],
    ["Đã bàn giao UAT", deliveredStories],
    ["Chưa bàn giao", Math.max(0, totalStories - deliveredStories)],
    ["Tỷ lệ bàn giao UAT", `${handoffRate}%`],
    ["Tổng Testcase", totalCases],
    ["Passed", 0],
    ["Failed", 0],
    ["Blocked", 0],
    ["Blocker Open", 0],
    ["Critical Open", 0],
    ["Pilot Readiness", `${pilotReadiness}%`],
    ["Pilot Readiness", "CONDITIONAL GO"],
    ["Go-live Readiness", "CONDITIONAL GO"]
  ];
}

function getDashboardUatOwnerRows(state) {
  const plans = collectionRows(state, "plans");
  return ownerOptions.slice(0, 3).map((owner) => {
    const rows = plans.filter((row) => lookupKey(row.owner) === lookupKey(owner));
    const totalCases = sumBy(rows, "totalCases");
    return [owner, rows.length, totalCases, 0, "0%"];
  });
}

function getDashboardUatSprintRows(state) {
  const readinessBySprint = new Map(collectionRows(state, "readiness").map((row) => [lookupKey(row.sprint), row]));
  const sourceRows = collectionRows(state, "weekly").length ? collectionRows(state, "weekly") : collectionRows(state, "readiness");
  return sourceRows
    .map((row) => {
      const readiness = readinessBySprint.get(lookupKey(row.sprint)) || {};
      return [row.sprint || readiness.sprint || "", "0%", "0%", 0, 0, readiness.decision || "CONDITIONAL GO"];
    })
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]), "vi", { numeric: true }));
}

function getDefectDashboardKpiRows(state) {
  const defects = collectionRows(state, "defects");
  const openDefects = defects.filter((row) => isOpenBugStatus(row.status));
  const statusCount = (status) => defects.filter((row) => isBugStatus(row.status, status)).length;
  const openSeverity = (severity) => openDefects.filter((row) => isSeverity(row.severity, severity)).length;
  const reopenRate = defects.length ? ((statusCount("Reopen") / 999) * 100).toFixed(2) : "0.00";
  return [
    ["Tổng Defect", defects.length],
    ["Open", statusCount("Open")],
    ["In Progress", statusCount("In Progress")],
    ["Reopen", statusCount("Reopen")],
    ["Resolved", statusCount("Resolved")],
    ["Closed", statusCount("Closed")],
    ["Blocker Open", openSeverity("Blocker")],
    ["Critical Open", openSeverity("Critical")],
    ["Reopen Rate", `${reopenRate}%`]
  ];
}

function getDefectDashboardMatrixRows(state) {
  const defects = collectionRows(state, "defects");
  const statuses = ["Open", "In Progress", "Reopen", "Resolved", "Closed", "Cancelled", "Pending", "SIT Pass", "SIT Fail"];
  const severities = ["Blocker", "Critical", "Major", "Minor", "Trivial"];
  const rows = severities.map((severity) => {
    const counts = statuses.map((status) => defects.filter((row) => isSeverity(row.severity, severity) && isBugStatus(row.status, status)).length);
    return [severity, ...counts, counts.reduce((total, value) => total + value, 0)];
  });
  const totals = statuses.map((status) => defects.filter((row) => isBugStatus(row.status, status)).length);
  rows.push(["Tổng", ...totals, totals.reduce((total, value) => total + value, 0)]);
  return rows;
}

function getDefectUserStorySummaryRows(state) {
  const defectSummary = collectionRows(state, "defectSummary");
  const bugSources = collectionRows(state, "bugSources");
  const validBugSources = getValidLinkedBugSources(state);
  const hasBugSourceSheet = bugSources.length > 0;
  const totalUs = collectionRows(state, "features").length || defectSummary.length;
  const usWithBugs = hasBugSourceSheet
    ? new Set(validBugSources.map((row) => lookupKey(row.linkedUsKey))).size
    : defectSummary.filter((row) => Number(row.totalBugs || 0) > 0).length;
  const totalBugs = bugSources.length || collectionRows(state, "defects").length;
  const validLinkedBugs = hasBugSourceSheet ? validBugSources.length : sumBy(defectSummary, "totalBugs");
  const activeBugs = hasBugSourceSheet
    ? validBugSources.filter((row) => ["Open", "In Progress", "Pending"].some((status) => isBugStatus(row.status, status))).length
    : sumBy(defectSummary, "activeBugs");
  const handledBugs = hasBugSourceSheet ? Math.max(0, validLinkedBugs - activeBugs) : sumBy(defectSummary, "handledBugs");
  const severeBugs = hasBugSourceSheet
    ? validBugSources.filter((row) => isAnySeverity(row.priority, ["Blocker", "Critical"])).length
    : sumBy(defectSummary, "severeBugs");
  return [
    ["Tổng số US", totalUs],
    ["Số US có lỗi", usWithBugs],
    ["Số US chưa có lỗi", Math.max(0, totalUs - usWithBugs)],
    ["Tổng số lỗi (trong sheet)", totalBugs],
    ["Lỗi đã gắn US (hợp lệ)", validLinkedBugs],
    ["Lỗi CHƯA gắn US / sai mã", Math.max(0, totalBugs - validLinkedBugs)],
    ["Lỗi đang mở (chưa xử lý)", activeBugs],
    ["Lỗi đã xử lý", handledBugs],
    ["% xử lý", `${validLinkedBugs ? ((handledBugs / validLinkedBugs) * 100).toFixed(2) : "0.00"}%`],
    ["Lỗi nghiêm trọng (Blocker/Critical)", severeBugs]
  ];
}

function getValidLinkedBugSources(state) {
  const userStoryKeys = new Set(collectionRows(state, "userStories").map((row) => lookupKey(row.issueKey)).filter(Boolean));
  return collectionRows(state, "bugSources").filter((row) => userStoryKeys.has(lookupKey(row.linkedUsKey)));
}

function getDefectStatusSummaryRows(state) {
  const bugSources = collectionRows(state, "bugSources");
  const statuses = ["Open", "In Progress", "Pending", "Resolved", "SIT Pass"];
  const rows = statuses.map((status) => [status, bugSources.filter((row) => isBugStatus(row.status, status)).length]);
  const knownTotal = rows.reduce((total, [, value]) => total + value, 0);
  rows.push(["Khác", Math.max(0, bugSources.length - knownTotal)]);
  return rows;
}

function getDefectPrioritySummaryRows(state) {
  const bugSources = collectionRows(state, "bugSources");
  return ["Blocker", "Critical", "Major", "Minor", "Trivial"].map((priority) => [
    priority,
    bugSources.filter((row) => isSeverity(row.priority, priority)).length
  ]);
}

function getWorkPlanKpiRows(state) {
  const items = collectionRows(state, "workItems");
  const done = items.filter((row) => row.status === "Hoàn thành").length;
  const notStarted = items.filter((row) => row.status === "Chưa bắt đầu").length;
  const inProgress = items.filter((row) => row.status === "Đang thực hiện").length;
  const overdue = items.filter((row) => getWorkItemWarning(row) === "Quá hạn").length;
  const progress = items.length ? Math.round(items.reduce((total, row) => total + Number(row.progress || 0), 0) / items.length) : 0;
  return [
    ["Nhóm công việc", collectionRows(state, "workCategories").length],
    ["Tổng đầu việc", items.length],
    ["Chưa bắt đầu", notStarted],
    ["Đang thực hiện", inProgress],
    ["Quá hạn (cảnh báo giao cắt)", overdue],
    ["Đã hoàn thành", done],
    ["Tiến độ trung bình", `${progress}%`]
  ];
}

function getWorkItemWarning(row) {
  const status = String(row?.status || "").trim();
  if (status === "Hoàn thành") return "Đã xong";
  const dueDate = parseImportDateOnly(row?.dueDate);
  if (!dueDate) return Number(row?.progress || 0) >= 80 ? "Ổn" : "Đang theo dõi";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  const remainingDays = Math.round((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (remainingDays < 0) return "Quá hạn";
  if (remainingDays <= 3) return "Sắp đến hạn";
  return Number(row?.progress || 0) >= 80 ? "Ổn" : "Đang theo dõi";
}

function excelRecordValue(record, key) {
  if (key === "progress") return percent(record.executedCases, record.totalCases);
  if (key === "uatHandoff") return record.uatHandoff || record.handoffDate;
  return record[key];
}

function excelCellValue(value, type) {
  if (value == null || value === "") return "";
  if (type === "number") {
    const number = Number(value);
    return Number.isFinite(number) ? number : String(value);
  }
  if (type === "date") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date;
  }
  return String(value);
}

function calculateWorkbookMetrics(state) {
  const features = Array.isArray(state.features) ? state.features : [];
  const daily = Array.isArray(state.daily) ? state.daily : [];
  const weekly = Array.isArray(state.weekly) ? state.weekly : [];
  const readiness = Array.isArray(state.readiness) ? state.readiness : [];
  const plans = Array.isArray(state.plans) ? state.plans : [];
  const matrix = Array.isArray(state.matrix) ? state.matrix : [];
  const defects = Array.isArray(state.defects) ? state.defects : [];
  const completedFeatures = features.filter((row) => isCompletedFeatureStatus(row.status)).length;
  const statusDrivenProgress = features.length ? percent(completedFeatures, features.length) : 0;
  const totalCases = sumBy(plans, "totalCases");
  const passedCases = sumBy(features, "passedCases");
  const deliveredStories = (state.handoffs || []).filter((row) => normalizeImportedText(row.uatHandoff)).length;
  const coverage = percent(deliveredStories, features.length);
  const successRate = round(average([
    ...weekly.map((row) => row.successRate),
    ...readiness.map((row) => row.successRate)
  ]) || 0);
  const latestReadiness = getLatestRecord(readiness);
  const blockerBugs = defects.filter((row) => isSeverity(row.severity, "Blocker") && isOpenBugStatus(row.status)).length;
  const criticalBugs = defects.filter((row) => isSeverity(row.severity, "Critical") && isOpenBugStatus(row.status)).length;
  const readinessFallback = round(latestReadiness?.readinessLevel || average([coverage, successRate]));

  return {
    squadProgress: statusDrivenProgress || coverage,
    coverage,
    successRate,
    blockerBugs,
    criticalBugs,
    trainingReadiness: calculateDashboardTrainingReadiness(matrix),
    pilotReadiness: round((coverage * 0.5 + percent(passedCases, totalCases) * 0.5) || latestReadiness?.pilotReadiness || readinessFallback || 0)
  };
}

function isCompletedFeatureStatus(status) {
  return status === "Done UAT" || status === "Hoàn thành";
}

function sumBy(rows, key) {
  return rows.reduce((total, row) => total + Number(row?.[key] || 0), 0);
}

function average(values) {
  const numeric = values.map(Number).filter((value) => Number.isFinite(value) && value > 0);
  if (!numeric.length) return 0;
  return numeric.reduce((total, value) => total + value, 0) / numeric.length;
}

function averageAll(values) {
  const numeric = values.map(Number).filter((value) => Number.isFinite(value));
  if (!numeric.length) return 0;
  return numeric.reduce((total, value) => total + value, 0) / numeric.length;
}

function calculateDashboardTrainingReadiness(matrix) {
  const rows = (Array.isArray(matrix) ? matrix : []).filter((row) => normalizeImportedText(row.group));
  if (!rows.length) return 0;
  const rates = testerKeys.map((testerKey) => percent(rows.filter((row) => Number(row[testerKey] || 0) > 0).length, rows.length));
  return round(averageAll(rates));
}

function percent(done, total) {
  const totalNumber = Number(total || 0);
  if (!totalNumber) return 0;
  return round((Number(done || 0) / totalNumber) * 100);
}

function resolveRate(value, done, total) {
  if (value !== undefined && value !== null && value !== "") return Number(value) || 0;
  return percent(done, total);
}

function round(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number);
}

function getLatestRecord(rows) {
  return [...rows].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0] || null;
}

async function readState(db, viewer = null) {
  const state = emptyState();
  const [recordResult, metaResult, attachmentCountResult] = await Promise.all([
    db.query(`
      select records.collection,
             records.data,
             records.created_by,
             records.updated_by,
             records.created_at,
             records.updated_at,
             creator.name as creator_name,
             creator.email as creator_email,
             creator.username as creator_username
      from uat_records records
      left join app_users creator on creator.id = records.created_by
      order by records.collection asc, records.updated_at desc
    `),
    db.query("select value from app_meta where key = 'state'"),
    viewer
      ? db.query(`
          select work_item_id, count(*)::int as attachment_count
          from work_item_attachments
          where status = 'completed'
            and deleted_at is null
          group by work_item_id
        `)
      : Promise.resolve({ rows: [] })
  ]);

  const attachmentCounts = new Map(
    attachmentCountResult.rows.map((row) => [
      String(row.work_item_id),
      Number(row.attachment_count || 0)
    ])
  );
  for (const row of recordResult.rows) {
    if (collectionSet.has(row.collection)) {
      const record = viewer ? decorateRecord(row, viewer) : row.data;
      if (viewer && row.collection === "workItems") {
        record.attachmentCount = attachmentCounts.get(String(record.id)) || 0;
      }
      state[row.collection].push(record);
    }
  }
  sortStateCollections(state);

  const metaUpdatedAt = metaResult.rows[0]?.value?.updatedAt;
  state.updatedAt = typeof metaUpdatedAt === "string" ? metaUpdatedAt : latestUpdatedAt(recordResult.rows);
  return state;
}

function sortStateCollections(state) {
  for (const collection of collections) {
    if (collection === "workItems") continue;
    state[collection].sort(compareStateRecords);
  }
  const categoryOrder = new Map((state.workCategories || []).map((category, index) => [String(category.id), index]));
  state.workItems.sort((a, b) => {
    const categoryA = categoryOrder.get(String(a?.categoryId || "")) ?? Number.MAX_SAFE_INTEGER;
    const categoryB = categoryOrder.get(String(b?.categoryId || "")) ?? Number.MAX_SAFE_INTEGER;
    if (categoryA !== categoryB) return categoryA - categoryB;
    return compareStateRecords(a, b);
  });
}

function compareStateRecords(a, b) {
  const numericA = Number(a?.sortOrder ?? a?.stt ?? a?.index);
  const numericB = Number(b?.sortOrder ?? b?.stt ?? b?.index);
  if (Number.isFinite(numericA) && Number.isFinite(numericB) && numericA !== numericB) {
    return numericA - numericB;
  }
  if (Number.isFinite(numericA) !== Number.isFinite(numericB)) {
    return Number.isFinite(numericA) ? -1 : 1;
  }
  return String(a?.sprint || a?.code || a?.jiraCode || a?.name || a?.title || a?.topic || "")
    .localeCompare(String(b?.sprint || b?.code || b?.jiraCode || b?.name || b?.title || b?.topic || ""), "vi", { numeric: true });
}

async function createRecord(client, collection, record, actor) {
  const now = new Date();
  record.createdAt = now.toISOString();
  record.updatedAt = now.toISOString();
  const result = await client.query(`
    insert into uat_records (collection, id, data, created_by, updated_by, created_at, updated_at)
    values ($1, $2, $3::jsonb, $4, $4, $5, $5)
    on conflict (collection, id) do nothing
    returning data, created_by, updated_by, created_at, updated_at
  `, [collection, record.id, JSON.stringify(record), actor.id, now]);
  if (!result.rows[0]) throw httpError(409, "Bản ghi đã tồn tại.");
  return {
    ...result.rows[0],
    creator_name: actor.name,
    creator_email: actor.email,
    creator_username: actor.username
  };
}

async function updateRecord(client, collection, record, actorId, current) {
  const updatedAt = toDate(record.updatedAt);
  const result = await client.query(`
    update uat_records
    set data = $1::jsonb,
        updated_by = $2,
        updated_at = $3
    where collection = $4 and id = $5
    returning data, created_by, updated_by, created_at, updated_at
  `, [JSON.stringify(record), actorId, updatedAt, collection, record.id]);
  if (!result.rows[0]) throw httpError(404, "Không tìm thấy bản ghi.");
  return {
    ...result.rows[0],
    creator_name: current.creator_name,
    creator_email: current.creator_email,
    creator_username: current.creator_username
  };
}

async function getRecordForUpdate(client, collection, id) {
  const result = await client.query(`
    select records.data,
           records.created_by,
           records.updated_by,
           records.created_at,
           records.updated_at,
           creator.name as creator_name,
           creator.email as creator_email,
           creator.username as creator_username
    from uat_records records
    left join app_users creator on creator.id = records.created_by
    where records.collection = $1 and records.id = $2
    for update of records
  `, [collection, id]);
  if (!result.rows[0]) throw httpError(404, "Không tìm thấy bản ghi.");
  return result.rows[0];
}

function assertCanModifyRecord(user, record) {
  if (canEditRecord(user, record)) return;
  throw httpError(403, "Bạn chỉ có thể sửa bản ghi do chính mình tạo, bản ghi thuộc NV của mình, hoặc dùng tài khoản admin.");
}

function assertCanDeleteRecord(user, record) {
  if (canDeleteRecord(user, record)) return;
  throw httpError(403, "Bạn chỉ có thể xóa bản ghi do chính mình tạo hoặc dùng tài khoản admin.");
}

function canEditRecord(user, record) {
  if (!user) return false;
  return user.role === "admin"
    || Boolean(record.created_by && record.created_by === user.id)
    || isLinkedOwnerUser(user, record.data)
    || isWorkItemGroupEditor(user, record.data);
}

function canDeleteRecord(user, record) {
  if (!user) return false;
  return user.role === "admin" || Boolean(record.created_by && record.created_by === user.id);
}

function canFullyManageWorkItem(user, record) {
  if (!user) return false;
  return user.role === "admin"
    || Boolean(record.created_by && record.created_by === user.id)
    || isWorkItemGroupEditor(user, record.data);
}

function canManageWorkCategories(user) {
  return user?.role === "admin";
}

function canCreateWorkItem(user) {
  return Boolean(user?.id && user?.active !== false);
}

function canManagePlanRecords(user) {
  return Boolean(user?.id && user?.active !== false && user.role === "admin");
}

function canUpdatePlanNote(user) {
  return Boolean(user?.id && user?.active !== false);
}

function normalizePlanNote(value) {
  const note = String(value ?? "").trim();
  if (note.length > planNoteMaxLength) {
    throw httpError(400, `Ghi chú không được vượt quá ${planNoteMaxLength.toLocaleString("vi-VN")} ký tự.`);
  }
  return note;
}

function mergePlanNoteUpdate(currentRecord, note, updatedAt = new Date().toISOString()) {
  return {
    ...(currentRecord || {}),
    id: currentRecord?.id,
    note: normalizePlanNote(note),
    createdAt: currentRecord?.createdAt,
    updatedAt
  };
}

function assignWorkItemToUser(record, user) {
  const email = String(user?.email || user?.username || "").trim().toLowerCase();
  if (!email) throw httpError(403, "Tài khoản chưa có email để tự nhận đầu việc.");
  const name = String(user?.name || user?.username || email).trim();
  record.assignees = [{ name, email }];
  record.assignee = name;
  record.assigneeEmail = email;
  return record;
}

function mergeWorkItemProgressUpdate(existingRecord, inputRecord) {
  const allowedFields = ["status", "progress", "completedDate", "documentUrl", "note"];
  const merged = {
    ...(existingRecord || {})
  };
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(inputRecord, field)) {
      merged[field] = inputRecord[field];
    }
  }
  merged.id = existingRecord?.id || inputRecord.id;
  merged.createdAt = existingRecord?.createdAt || inputRecord.createdAt;
  merged.updatedAt = inputRecord.updatedAt;
  return merged;
}

function decorateRecord(row, viewer) {
  const isOwner = Boolean(row.created_by && row.created_by === viewer?.id);
  const linkedOwner = ownerAccountLinkForRecord(row.data, viewer);
  const isLinkedOwner = Boolean(viewer && isOwnerAccountLinkForUser(linkedOwner, viewer));
  const isGroupEditor = Boolean(viewer && isWorkItemGroupEditor(viewer, row.data));
  const isPlan = row.collection === "plans";
  const canManage = Boolean(viewer && (viewer.role === "admin" || (!isPlan && (isOwner || isGroupEditor))));
  const canEdit = Boolean(viewer && (viewer.role === "admin" || (!isPlan && (canManage || isLinkedOwner))));
  const canDelete = Boolean(viewer && (viewer.role === "admin" || (!isPlan && isOwner)));
  const canEditNote = Boolean(isPlan && canUpdatePlanNote(viewer));
  const publicData = { ...(row.data || {}) };
  delete publicData[legacyStartDateBackfillField];
  return {
    ...publicData,
    _canBackfillStartDate: row.data?.[legacyStartDateBackfillField] === true,
    _ownership: {
      createdByName: row.creator_name || row.creator_username || "Không xác định",
      createdByEmail: row.creator_email || "",
      linkedOwnerCode: linkedOwner?.code || "",
      linkedOwnerLabel: linkedOwner?.label || "",
      linkedOwnerEmail: linkedOwner?.email || "",
      isOwner,
      isLinkedOwner,
      isGroupEditor,
      canManage,
      canEdit,
      canDelete,
      canEditNote
    }
  };
}

function ownerAccountLinksForRecord(record) {
  const assigneeLinks = workItemAssignees(record)
    .filter((person) => normalizeIdentity(person.email))
    .map((person) => ({
      code: "",
      label: person.name || person.email,
      email: normalizeIdentity(person.email)
    }));
  if (assigneeLinks.length) return assigneeLinks;
  const code = ownerCodeFromValue(record?.owner);
  const legacyLink = ownerAccountLinks.find((link) => link.code === code);
  return legacyLink ? [legacyLink] : [];
}

function ownerAccountLinkForRecord(record, user = null) {
  const links = ownerAccountLinksForRecord(record);
  if (!user) return links[0] || null;
  return links.find((link) => isOwnerAccountLinkForUser(link, user)) || links[0] || null;
}

function ownerCodeFromValue(value) {
  const text = String(value || "").trim();
  const match = text.match(/^NV\s*([1-3])\b/i);
  return match ? `NV${match[1]}` : "";
}

function isLinkedOwnerUser(user, record) {
  return ownerAccountLinksForRecord(record)
    .some((link) => isOwnerAccountLinkForUser(link, user));
}

function isOwnerAccountLinkForUser(link, user) {
  if (!link || !user) return false;
  const email = String(link.email || "").toLowerCase();
  const identities = [user.email, user.username]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  return identities.includes(email);
}

async function touchMeta(client) {
  const updatedAt = new Date().toISOString();
  await client.query(`
    insert into app_meta (key, value, updated_at)
    values ('state', $1::jsonb, now())
    on conflict (key) do update
      set value = excluded.value,
          updated_at = excluded.updated_at
  `, [JSON.stringify({ updatedAt })]);
  return updatedAt;
}

async function recomputeAndPersistWorkbookRules(client, actorId, viewer = null) {
  const state = await readState(client);
  const before = new Map();
  const existingByCollection = new Map();
  for (const collection of collections) {
    existingByCollection.set(collection, new Set());
    for (const record of state[collection] || []) {
      const key = recordKey(collection, record.id);
      existingByCollection.get(collection).add(record.id);
      before.set(key, JSON.stringify(record));
    }
  }

  applyWorkbookRules(state);
  assignSortOrder(state);

  const now = new Date();
  const updatedAt = now.toISOString();
  const upserts = [];
  const deletesByCollection = new Map();
  for (const collection of collections) {
    const nextIds = new Set();
    for (const record of state[collection] || []) {
      const key = recordKey(collection, record.id);
      nextIds.add(record.id);
      if (!before.has(key)) {
        if (!computedCollections.has(collection)) continue;
        record.createdAt = updatedAt;
        record.updatedAt = updatedAt;
        upserts.push({ collection, id: record.id, data: record });
        continue;
      }
      if (JSON.stringify(record) === before.get(key)) continue;
      record.updatedAt = updatedAt;
      upserts.push({ collection, id: record.id, data: record });
    }
    if (computedCollections.has(collection)) {
      const deleteIds = [];
      for (const id of existingByCollection.get(collection) || []) {
        if (nextIds.has(id)) continue;
        deleteIds.push(id);
      }
      if (deleteIds.length) deletesByCollection.set(collection, deleteIds);
    }
  }

  await bulkUpsertRecords(client, upserts, actorId, now);
  for (const [collection, ids] of deletesByCollection.entries()) {
    await bulkDeleteRecords(client, collection, ids);
  }

  const metaUpdatedAt = await touchMeta(client);
  return {
    state: applyWorkbookRulesForResponse(await readState(client, viewer)),
    updatedAt: metaUpdatedAt
  };
}

async function getWorkItemRecordForAttachment(db, id) {
  const result = await db.query(`
    select records.data,
           records.created_by,
           records.updated_by,
           records.created_at,
           records.updated_at,
           creator.name as creator_name,
           creator.email as creator_email,
           creator.username as creator_username
    from uat_records records
    left join app_users creator on creator.id = records.created_by
    where records.collection = 'workItems' and records.id = $1
    limit 1
  `, [String(id || "")]);
  if (!result.rows[0]) throw httpError(404, "Không tìm thấy công việc.");
  return result.rows[0];
}

async function listWorkItemAttachments(db, workItemId, viewer, workItem) {
  const result = await db.query(`
    select attachments.*,
           uploader.name as uploader_name,
           uploader.email as uploader_email,
           uploader.username as uploader_username
    from work_item_attachments attachments
    left join app_users uploader on uploader.id = attachments.created_by
    where attachments.work_item_id = $1
      and attachments.status = 'completed'
      and attachments.deleted_at is null
    order by attachments.created_at desc, attachments.original_name
  `, [String(workItemId || "")]);
  return result.rows.map((row) => mapAttachmentRow(row, viewer, workItem));
}

async function getAttachmentByUploadKey(db, uploadKey) {
  const result = await db.query(`
    select attachments.*,
           uploader.name as uploader_name,
           uploader.email as uploader_email,
           uploader.username as uploader_username
    from work_item_attachments attachments
    left join app_users uploader on uploader.id = attachments.created_by
    where attachments.upload_key = $1
    limit 1
  `, [uploadKey]);
  return result.rows[0] || null;
}

async function getAttachmentRecord(db, id) {
  const result = await db.query(`
    select attachments.*,
           uploader.name as uploader_name,
           uploader.email as uploader_email,
           uploader.username as uploader_username
    from work_item_attachments attachments
    left join app_users uploader on uploader.id = attachments.created_by
    where attachments.id = $1
      and attachments.status = 'completed'
      and attachments.deleted_at is null
    limit 1
  `, [String(id || "")]);
  if (!result.rows[0]) throw httpError(404, "Không tìm thấy file đính kèm.");
  return result.rows[0];
}

function mapAttachmentRow(row, viewer, workItem = null) {
  const uploaderName = row.uploader_name
    || (row.created_by === viewer?.id ? viewer.name : "")
    || row.uploader_username
    || "Không xác định";
  const uploaderEmail = row.uploader_email
    || (row.created_by === viewer?.id ? viewer.email || viewer.username : "")
    || row.uploader_username
    || "";
  return {
    id: row.id,
    workItemId: row.work_item_id,
    taskId: row.task_id || "",
    name: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes || 0),
    sha256: row.sha256 || "",
    uploadedAt: row.created_at?.toISOString?.() || String(row.created_at || ""),
    uploadedBy: {
      id: row.created_by,
      name: uploaderName,
      email: uploaderEmail
    },
    canDelete: workItem
      ? canDeleteAttachment(viewer, row, workItem)
      : viewer?.role === "admin" || row.created_by === viewer?.id,
    driveUrl: viewer ? row.drive_web_view_link || "" : ""
  };
}

function canDeleteAttachment(user, attachment, workItem) {
  return Boolean(
    user
    && (
      user.role === "admin"
      || attachment.created_by === user.id
      || canFullyManageWorkItem(user, workItem)
    )
  );
}

function decodeUploadFileName(value) {
  const encoded = String(value || "").trim();
  if (!encoded) throw httpError(400, "Thiếu tên file.");
  let decoded;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    throw httpError(400, "Tên file không hợp lệ.");
  }
  const fileName = normalizeFileName(decoded);
  if (!fileName) throw httpError(400, "Tên file không hợp lệ.");
  return fileName;
}

function parseAttachmentSize(value) {
  const size = Number(value);
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw httpError(400, "File rỗng hoặc thiếu thông tin dung lượng.");
  }
  if (size > driveAttachmentService.maxFileSizeBytes) {
    const maxMb = Math.round(driveAttachmentService.maxFileSizeBytes / (1024 * 1024));
    throw httpError(413, `Mỗi file chỉ được tối đa ${maxMb} MB.`);
  }
  return size;
}

function normalizeUploadKey(value) {
  const key = String(value || "").trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,119}$/.test(key)) {
    throw httpError(400, "Mã upload không hợp lệ.");
  }
  return key;
}

function attachmentServiceInput(row) {
  return {
    driveFileId: row.drive_file_id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes || 0)
  };
}

function safeAttachmentResponseMime(value, inline) {
  const mimeType = normalizeMimeType(value);
  if (!inline) return mimeType;
  if (mimeType === "application/pdf") return mimeType;
  if (["image/avif", "image/bmp", "image/gif", "image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    return mimeType;
  }
  return "application/octet-stream";
}

function attachmentContentDisposition(fileName, inline) {
  const normalized = normalizeFileName(fileName) || "download";
  const ascii = normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(normalized).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

async function deleteWorkItemAttachments(db, workItemId, actor) {
  const result = await db.query(`
    select *
    from work_item_attachments
    where work_item_id = $1
      and status = 'completed'
      and deleted_at is null
    for update
  `, [String(workItemId || "")]);
  for (const attachment of result.rows) {
    if (attachment.drive_file_id) {
      await driveAttachmentService.trash(db, attachment.drive_file_id);
    }
  }
  if (!result.rows.length) return;
  await db.query(`
    update work_item_attachments
    set status = 'deleted',
        deleted_by = $1,
        deleted_at = now(),
        updated_at = now()
    where work_item_id = $2
      and deleted_at is null
  `, [actor.id, String(workItemId || "")]);
}

async function persistMergedWorkbookState(client, currentState, mergedState, actorId, now = new Date()) {
  const nowIso = now.toISOString();
  const upserts = [];
  const deletesByCollection = new Map();
  const summary = {};

  for (const collection of workbookCollections) {
    const currentRows = collectionRows(currentState, collection);
    const desiredRows = collectionRows(mergedState, collection);
    const currentById = new Map(currentRows.map((row) => [String(row.id), row]));
    const desiredIds = new Set();
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;

    for (const desired of desiredRows) {
      const id = String(desired.id || "").trim();
      if (!id) throw new Error(`Cannot persist ${collection} record without an id.`);
      desiredIds.add(id);
      const current = currentById.get(id);
      const nextData = cloneSerializable(desired);
      if (current) {
        nextData.createdAt = current.createdAt || nextData.createdAt || nowIso;
        if (
          canonicalRecord(current, ["createdAt", "updatedAt"])
          === canonicalRecord(nextData, ["createdAt", "updatedAt"])
        ) {
          unchanged += 1;
          continue;
        }
        updated += 1;
      } else {
        nextData.createdAt = nextData.createdAt || nowIso;
        inserted += 1;
      }
      nextData.updatedAt = nowIso;
      upserts.push({ collection, id, data: nextData });
    }

    const deletedIds = currentRows
      .map((row) => String(row.id || ""))
      .filter((id) => id && !desiredIds.has(id));
    if (deletedIds.length) deletesByCollection.set(collection, deletedIds);
    summary[collection] = {
      existing: currentRows.length,
      output: desiredRows.length,
      inserted,
      updated,
      unchanged,
      deleted: deletedIds.length
    };
  }

  await bulkUpsertRecords(client, upserts, actorId, now);
  for (const [collection, ids] of deletesByCollection.entries()) {
    await bulkDeleteRecords(client, collection, ids);
  }

  return {
    upserted: upserts.length,
    deleted: [...deletesByCollection.values()].reduce((total, ids) => total + ids.length, 0),
    collections: summary
  };
}

async function createImportSnapshot(client, options = {}) {
  const [recordsResult, metaResult] = await Promise.all([
    client.query(`
      select collection, id, data, created_by, updated_by, created_at, updated_at
      from uat_records
      order by collection asc, id asc
    `),
    client.query(`
      select value, updated_at
      from app_meta
      where key = 'state'
      limit 1
    `)
  ]);
  const id = crypto.randomUUID();
  const snapshot = {
    version: 1,
    records: recordsResult.rows.map((row) => ({
      collection: row.collection,
      id: row.id,
      data: row.data,
      createdBy: row.created_by || "",
      updatedBy: row.updated_by || "",
      createdAt: row.created_at?.toISOString?.() || row.created_at,
      updatedAt: row.updated_at?.toISOString?.() || row.updated_at
    })),
    stateMeta: metaResult.rows[0]
      ? {
        value: metaResult.rows[0].value,
        updatedAt: metaResult.rows[0].updated_at?.toISOString?.() || metaResult.rows[0].updated_at
      }
      : null
  };
  const sourceName = normalizeImportSourceName(options.sourceName || "workbook.xlsx");
  await client.query(`
    insert into uat_import_snapshots (
      id, source_name, source_sha256, record_count, snapshot, created_by, created_at
    )
    values ($1, $2, $3, $4, $5::jsonb, $6, now())
  `, [
    id,
    sourceName,
    String(options.sourceSha256 || ""),
    snapshot.records.length,
    JSON.stringify(snapshot),
    options.actorId || null
  ]);
  return { id, recordCount: snapshot.records.length };
}

async function restoreImportSnapshot(client, snapshotId) {
  const result = await client.query(`
    select snapshot
    from uat_import_snapshots
    where id = $1
    limit 1
  `, [snapshotId]);
  const snapshot = result.rows[0]?.snapshot;
  if (!snapshot || Number(snapshot.version) !== 1 || !Array.isArray(snapshot.records)) {
    throw httpError(404, "Import snapshot was not found or is invalid.");
  }
  for (const row of snapshot.records) {
    if (!collectionSet.has(String(row.collection || "")) || !String(row.id || "").trim()) {
      throw new Error("Snapshot contains an unsupported record.");
    }
  }

  await client.query("delete from uat_records");
  const chunkSize = 500;
  for (let index = 0; index < snapshot.records.length; index += chunkSize) {
    const chunk = snapshot.records.slice(index, index + chunkSize);
    await client.query(`
      insert into uat_records (
        collection, id, data, created_by, updated_by, created_at, updated_at
      )
      select item->>'collection',
             item->>'id',
             item->'data',
             nullif(item->>'createdBy', ''),
             nullif(item->>'updatedBy', ''),
             coalesce((item->>'createdAt')::timestamptz, now()),
             coalesce((item->>'updatedAt')::timestamptz, now())
      from jsonb_array_elements($1::jsonb) as item
    `, [JSON.stringify(chunk)]);
  }

  if (snapshot.stateMeta?.value) {
    await client.query(`
      insert into app_meta (key, value, updated_at)
      values ('state', $1::jsonb, coalesce($2::timestamptz, now()))
      on conflict (key) do update
        set value = excluded.value,
            updated_at = excluded.updated_at
    `, [
      JSON.stringify(snapshot.stateMeta.value),
      snapshot.stateMeta.updatedAt || null
    ]);
  } else {
    await touchMeta(client);
  }
  return { recordCount: snapshot.records.length };
}

async function bulkUpsertRecords(client, rows, actorId, now) {
  if (!rows.length) return;
  const chunkSize = 500;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    await client.query(`
      with payload as (
        select collection_values.collection,
               id_values.id,
               data_values.data
        from unnest($1::text[]) with ordinality as collection_values(collection, ord)
        join unnest($2::text[]) with ordinality as id_values(id, ord) using (ord)
        join jsonb_array_elements($3::jsonb) with ordinality as data_values(data, ord) using (ord)
      )
      insert into uat_records (collection, id, data, created_by, updated_by, created_at, updated_at)
      select collection,
             id,
             data,
             $4::uuid,
             $4::uuid,
             $5::timestamptz,
             $5::timestamptz
      from payload
      on conflict (collection, id) do update
        set data = excluded.data,
            updated_by = excluded.updated_by,
            updated_at = excluded.updated_at
    `, [
      chunk.map((row) => row.collection),
      chunk.map((row) => row.id),
      JSON.stringify(chunk.map((row) => row.data)),
      actorId || null,
      now
    ]);
  }
}

async function bulkDeleteRecords(client, collection, ids) {
  if (!ids.length) return;
  await client.query("delete from uat_records where collection = $1 and id = any($2::text[])", [collection, ids]);
}

function recordKey(collection, id) {
  return `${collection}:${id}`;
}

function emptyState() {
  return {
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
  };
}

function normalizeState(input) {
  const state = emptyState();
  const source = input && typeof input === "object" ? input : {};
  for (const collection of collections) {
    state[collection] = Array.isArray(source[collection])
      ? source[collection].map((record) => normalizeRecord(record))
      : [];
  }
  normalizeWorkItemsForValidation(state.workItems);
  applyWorkbookRules(state);
  applyWorkKpiRules(state);
  assignSortOrder(state);
  sortStateCollections(state);
  normalizeWorkItemSortOrders(state);
  state.updatedAt = typeof source.updatedAt === "string" ? source.updatedAt : new Date().toISOString();
  return state;
}

function applyWorkbookRulesForResponse(state) {
  applyWorkbookRules(state);
  applyWorkKpiRules(state);
  assignSortOrder(state);
  sortStateCollections(state);
  normalizeWorkItemSortOrders(state);
  return state;
}

function enforceWorkItemGroupEditorScope(user, current, incomingRecord) {
  const scopedEditor = Boolean(
    user
    && user.role !== "admin"
    && !Boolean(current?.created_by && current.created_by === user.id)
    && isWorkItemGroupEditor(user, current?.data)
  );
  if (scopedEditor && incomingRecord) {
    incomingRecord.categoryId = current.data?.categoryId;
  }
  return scopedEditor;
}

function isWorkItemGroupEditor(user, record) {
  if (!user || !record || typeof record !== "object") return false;
  const categoryId = String(record.categoryId || "").trim().toLowerCase();
  const allowedIdentities = workItemGroupEditors[categoryId] || [];
  if (!allowedIdentities.length) return false;
  const identities = [user.email, user.username]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  return allowedIdentities.some((identity) => identities.includes(identity));
}

function normalizeWorkItemSortOrders(state) {
  const nextOrderByCategory = new Map();
  (state.workItems || []).forEach((item) => {
    const categoryId = String(item.categoryId || "");
    const nextOrder = (nextOrderByCategory.get(categoryId) || 0) + 1;
    nextOrderByCategory.set(categoryId, nextOrder);
    item.sortOrder = nextOrder;
  });
}

function applyWorkKpiRules(state) {
  const config = { ...defaultWorkKpiConfig, ...(state.kpiConfig?.[0] || {}) };
  state.kpiConfig = [config];
  const inputByEmail = new Map((state.memberKpiInputs || []).map((row) => [normalizeIdentity(row.memberEmail), row]));
  const people = new Map();

  (state.personnel || []).forEach((row) => {
    const email = normalizeIdentity(row.email || workAssigneeDirectory[row.name]);
    if (!email) return;
    people.set(email, { email, name: row.name || email, personnel: row });
  });
  (state.memberKpiInputs || []).forEach((row) => {
    const email = normalizeIdentity(row.memberEmail);
    if (!email) return;
    if (!people.has(email)) people.set(email, { email, name: row.memberName || email, personnel: {} });
  });
  (state.workItems || []).forEach((row) => {
    workItemAssignees(row).forEach((assignee) => {
      const email = normalizeIdentity(assignee.email || workAssigneeDirectory[assignee.name]);
      if (!email) return;
      if (!people.has(email)) people.set(email, { email, name: assignee.name || email, personnel: {} });
    });
  });

  const today = localDateString(new Date());
  state.memberKpiResults = [...people.values()]
    .map((person, index) => {
      const input = inputByEmail.get(person.email) || {};
      const tasks = (state.workItems || []).filter((row) => workItemAssignees(row)
        .some((assignee) => normalizeIdentity(assignee.email || workAssigneeDirectory[assignee.name]) === person.email));
      const completedTasks = tasks.filter((row) => row.status === "Hoàn thành");
      const datedCompletedTasks = completedTasks.filter((row) => isDateOnly(row.completedDate) && isDateOnly(row.dueDate));
      const progress = tasks.length ? round(averageAll(tasks.map((row) => Number(row.progress || 0)))) : null;
      const onTimeRate = datedCompletedTasks.length
        ? round((datedCompletedTasks.filter((row) => row.completedDate <= row.dueDate).length / datedCompletedTasks.length) * 100)
        : null;
      const capacity = numberOrNull(input.capacity);
      const qualityScore = numberOrNull(input.qualityScore);
      const contributionScore = numberOrNull(input.contributionScore);
      const disciplineScore = numberOrNull(input.disciplineScore);
      const hasScoreInputs = progress !== null && onTimeRate !== null
        && qualityScore !== null && contributionScore !== null && disciplineScore !== null;
      const kpiTotal = hasScoreInputs ? roundOne(
        normalizedKpiScore(progress, config.progressTarget, config.progressWeight)
        + normalizedKpiScore(onTimeRate, config.onTimeTarget, config.onTimeWeight)
        + normalizedKpiScore(qualityScore, config.qualityTarget, config.qualityWeight)
        + normalizedKpiScore(contributionScore, config.contributionTarget, config.contributionWeight)
        + normalizedKpiScore(disciplineScore, config.disciplineTarget, config.disciplineWeight)
      ) : null;
      return {
        id: `member-kpi-${person.email}`,
        sortOrder: index + 1,
        memberName: input.memberName || person.name,
        memberEmail: person.email,
        role: input.role || person.personnel?.role || "",
        module: input.module || person.personnel?.scope || "",
        capacity,
        totalTasks: tasks.length,
        completed: completedTasks.length,
        inProgress: tasks.filter((row) => row.status === "Đang thực hiện").length,
        overdue: tasks.filter((row) => isDateOnly(row.dueDate) && row.dueDate < today && row.status !== "Hoàn thành").length,
        progress,
        onTimeRate,
        qualityScore,
        contributionScore,
        disciplineScore,
        workload: capacity && capacity > 0 ? roundOne(tasks.length / capacity) : null,
        rank: kpiRank(kpiTotal),
        kpiTotal,
        scored: kpiTotal !== null
      };
    })
    .sort((a, b) => String(a.memberName).localeCompare(String(b.memberName), "vi"));
}

function normalizeIdentity(value) {
  return String(value || "").trim().toLowerCase();
}

function numberOrNull(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isDateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function normalizedKpiScore(value, target, weight) {
  const safeTarget = Number(target || 0);
  if (!safeTarget) return 0;
  return Math.min(Number(value || 0) / safeTarget, 1) * Number(weight || 0);
}

function roundOne(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function kpiRank(value) {
  if (value == null) return "";
  if (value >= 90) return "Xuất sắc";
  if (value >= 80) return "Tốt";
  if (value >= 65) return "Đạt";
  return "Cần cải thiện";
}

function normalizeRecord(input, forcedId) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw httpError(400, "Record không hợp lệ.");
  }
  const { _ownership, _canBackfillStartDate, ...recordData } = input;
  const now = new Date().toISOString();
  const id = forcedId || recordData.id || crypto.randomUUID();
  return {
    ...recordData,
    id: String(id),
    createdAt: isValidDateString(recordData.createdAt) ? recordData.createdAt : now,
    updatedAt: isValidDateString(recordData.updatedAt) ? recordData.updatedAt : now
  };
}

function isComputedRecordField(collection, field) {
  const fields = computedFieldsByCollection[collection] || [];
  return fields.includes("*") || fields.includes(field);
}

function stripComputedFields(collection, record) {
  if (collection === "workItems") delete record.attachmentCount;
  const fields = computedFieldsByCollection[collection] || [];
  if (!fields.length || fields.includes("*")) return record;
  for (const field of fields) {
    delete record[field];
  }
  return record;
}

async function applyRecordDefaults(client, collection, record) {
  if (collection === "features" && isBlank(record.stt)) {
    record.stt = await getNextFeatureStt(client);
  }
  if (collection === "workCategories") {
    if (isBlank(record.sortOrder)) record.sortOrder = await getNextCollectionSortOrder(client, collection);
    if (isBlank(record.taskPrefix)) record.taskPrefix = `SQ2-T${String(Math.trunc(Number(record.sortOrder) || 0)).padStart(2, "0")}`;
    if (isBlank(record.status)) record.status = "Đang theo dõi";
  }
  if (collection === "workItems") {
    if (isBlank(record.sortOrder)) record.sortOrder = await getNextWorkItemSortOrder(client, record.categoryId);
    if (isBlank(record.taskId)) record.taskId = await getNextWorkItemTaskId(client, record.categoryId);
    if (isBlank(record.status)) record.status = "Chưa bắt đầu";
    record.status = normalizeWorkStatus(record.status);
    if (isBlank(record.priority)) record.priority = "Trung bình";
    if (isBlank(record.assigneeEmail)) record.assigneeEmail = emailForWorkAssignee(record.assignee);
    normalizeWorkItemPeople(record);
    if (isBlank(record.progress)) record.progress = 0;
    normalizeWorkItemCompletion(record);
    if (record.status === "Hoàn thành") {
      if (isBlank(record.completedDate)) record.completedDate = localDateString(new Date());
    }
  }
  if (collection === "kpiConfig") {
    Object.assign(record, { ...defaultWorkKpiConfig, ...record, id: "work-kpi-default" });
  }
  if (collection === "memberKpiInputs") {
    record.memberEmail = String(record.memberEmail || "").trim().toLowerCase();
  }
}

function normalizeWorkStatus(value) {
  return String(value || "").trim();
}

function expectedWorkStatusForProgress(value) {
  const blank = value == null || String(value).trim() === "";
  const progress = blank ? 0 : Number(value);
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) return null;
  if (progress === 0) return "Chưa bắt đầu";
  if (progress < 100) return "Đang thực hiện";
  return "Hoàn thành";
}

function validateWorkItemStatusProgress(record) {
  const expectedStatus = expectedWorkStatusForProgress(record.progress);
  if (!expectedStatus) {
    throw httpError(400, "% hoàn thành phải nằm trong khoảng 0-100%.");
  }
  const status = normalizeWorkStatus(record.status);
  if (status !== expectedStatus) {
    throw httpError(400, `Trạng thái phải là "${expectedStatus}" khi % hoàn thành là ${record.progress == null || String(record.progress).trim() === "" ? "0 hoặc để trống" : record.progress}.`);
  }
}

function normalizeWorkItemsForValidation(items) {
  for (const record of items || []) {
    normalizeWorkItemPeople(record);
    record.status = normalizeWorkStatus(record.status);
    if (record.progress == null || String(record.progress).trim() === "") record.progress = 0;
    normalizeWorkItemCompletion(record);
  }
  return items;
}

function normalizeWorkItemCompletion(record) {
  if (!String(record?.completedDate || "").trim()) return record;
  record.status = "Hoàn thành";
  record.progress = 100;
  return record;
}

function assertAndPreserveWorkItemStartDate(currentRecord, incomingRecord) {
  const current = currentRecord || {};
  const currentStartDate = String(current.startDate || "").trim();
  const hasIncomingStartDate = Object.prototype.hasOwnProperty.call(incomingRecord, "startDate");
  const incomingStartDate = hasIncomingStartDate
    ? String(incomingRecord.startDate || "").trim()
    : currentStartDate;
  const canBackfillLegacyDate = current[legacyStartDateBackfillField] === true;

  if (incomingStartDate !== currentStartDate && (currentStartDate || !canBackfillLegacyDate)) {
    throw httpError(409, "Ngày giao việc đã được khóa sau khi tạo và không thể thay đổi.");
  }

  incomingRecord.startDate = incomingStartDate;
  delete incomingRecord[legacyStartDateBackfillField];
  if (!currentStartDate && !incomingStartDate && canBackfillLegacyDate) {
    incomingRecord[legacyStartDateBackfillField] = true;
  }
  return incomingRecord;
}

async function getNextWorkItemTaskId(client, categoryId) {
  const categoryResult = await client.query(`
    select data
    from uat_records
    where collection = 'workCategories' and id = $1
    limit 1
  `, [categoryId]);
  const category = categoryResult.rows[0]?.data || {};
  const prefix = String(category.taskPrefix || "").trim()
    || `SQ2-T${String(Math.trunc(Number(category.sortOrder) || 0)).padStart(2, "0")}`;
  const itemResult = await client.query(`
    select data->>'taskId' as task_id
    from uat_records
    where collection = 'workItems'
      and data->>'categoryId' = $1
      and data->>'taskId' like $2
  `, [categoryId, `${prefix}-%`]);
  const maxIndex = itemResult.rows.reduce((max, row) => {
    const match = String(row.task_id || "").match(/-(\d+)$/);
    const value = match ? Number(match[1]) : 0;
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  return `${prefix}-${String(maxIndex + 1).padStart(3, "0")}`;
}

async function getNextWorkItemSortOrder(client, categoryId) {
  const normalizedCategoryId = String(categoryId || "");
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`workItems:${normalizedCategoryId}`]);
  const result = await client.query(`
    select coalesce(max((data->>'sortOrder')::numeric), 0) as max_sort_order
    from uat_records
    where collection = 'workItems'
      and data->>'categoryId' = $1
      and (data->>'sortOrder') ~ '^[0-9]+(\\.[0-9]+)?$'
  `, [normalizedCategoryId]);
  return Math.trunc(Number(result.rows[0]?.max_sort_order || 0)) + 1;
}

async function getNextFeatureStt(client) {
  const result = await client.query(`
    select coalesce(max((data->>'stt')::integer), 0) as max_stt
    from uat_records
    where collection = $1
      and (data->>'stt') ~ '^[0-9]+$'
  `, ["features"]);
  return Number(result.rows[0]?.max_stt || 0) + 1;
}

async function getNextCollectionSortOrder(client, collection) {
  const result = await client.query(`
    select coalesce(max((data->>'sortOrder')::numeric), 0) as max_sort_order
    from uat_records
    where collection = $1
      and (data->>'sortOrder') ~ '^[0-9]+(\\.[0-9]+)?$'
  `, [collection]);
  return Math.trunc(Number(result.rows[0]?.max_sort_order || 0)) + 1;
}

function localDateString(date) {
  const safeDate = date instanceof Date ? date : new Date();
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function requireCollection(collection) {
  if (!collectionSet.has(collection)) {
    throw httpError(404, "Phân hệ dữ liệu không hợp lệ.");
  }
  return collection;
}

function validateWorkbookImportState(state, options = {}) {
  for (const collection of workbookCollections) {
    for (const record of state[collection] || []) {
      validateRecordForCollection(collection, record, {
        preserveWorkbookSource: true,
        allowLegacyDailyWithoutDate: options.allowLegacyDailyWithoutDate === true
      });
    }
  }
}

function validateRecordForCollection(collection, record, options = {}) {
  const rules = collectionRules[collection];
  if (!rules) throw httpError(404, "Phân hệ dữ liệu không hợp lệ.");

  for (const field of rules.required) {
    if (
      collection === "daily"
      && field === "date"
      && options.allowLegacyDailyWithoutDate
    ) {
      continue;
    }
    if (isBlank(record[field])) {
      throw httpError(400, `${field} là trường bắt buộc.`);
    }
  }

  for (const field of rules.numbers) {
    if (isBlank(record[field])) continue;
    const value = Number(record[field]);
    if (!Number.isFinite(value) || value < 0) {
      throw httpError(400, `${field} phải là số không âm.`);
    }
  }

  for (const field of rules.percents) {
    if (isBlank(record[field])) continue;
    const value = Number(record[field]);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw httpError(400, `${field} phải nằm trong khoảng 0-100%.`);
    }
  }

  for (const [field, allowedValues] of Object.entries(rules.enums || {})) {
    if (isBlank(record[field])) continue;
    if (!allowedValues.includes(record[field])) {
      throw httpError(400, `${field} không nằm trong danh mục hợp lệ.`);
    }
  }

  if (collection === "workItems") {
    normalizeWorkItemPeople(record);
    validateWorkItemPeople(record);
    validateWorkItemStatusProgress(record);
  }

  if (collection === "personnel" && !isBlank(record.bidvJoinDate) && !isIsoDateOnly(String(record.bidvJoinDate))) {
    throw httpError(400, "Ngày vào BIDV không hợp lệ.");
  }

  if (collection === "kpiConfig") {
    const totalWeight = [
      "progressWeight",
      "onTimeWeight",
      "qualityWeight",
      "contributionWeight",
      "disciplineWeight"
    ].reduce((total, field) => total + Number(record[field] || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.001) {
      throw httpError(400, "Tổng trọng số KPI phải bằng 100%.");
    }
  }

  if (!options.preserveWorkbookSource && !isBlank(record.totalCases) && !isBlank(record.executedCases)) {
    const totalCases = Number(record.totalCases);
    const executedCases = Number(record.executedCases);
    if (Number.isFinite(totalCases) && Number.isFinite(executedCases) && executedCases > totalCases) {
      throw httpError(400, "executedCases không được lớn hơn totalCases.");
    }
  }
}

function isBlank(value) {
  return value === "" || value == null;
}

async function ensureWorkItemInvariantMigration() {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [workItemInvariantMigrationKey]);
    const existing = await client.query(
      "select value from app_meta where key = $1 for update",
      [workItemInvariantMigrationKey]
    );
    if (existing.rows[0]) {
      await client.query("commit");
      return existing.rows[0].value;
    }

    const result = await client.query(`
      select id, data, created_by, updated_by, created_at, updated_at
      from uat_records
      where collection = 'workItems'
      order by id
      for update
    `);
    const backup = result.rows.map((row) => ({
      id: row.id,
      data: row.data,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    await client.query(`
      insert into app_meta (key, value, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (key) do nothing
    `, [workItemInvariantBackupKey, JSON.stringify({ createdAt: new Date().toISOString(), records: backup })]);

    let statusCorrections = 0;
    let legacyBlankStartDates = 0;
    let changedRecords = 0;
    for (const row of result.rows) {
      const data = { ...(row.data || {}) };
      const expectedStatus = expectedWorkStatusForProgress(data.progress);
      if (!expectedStatus) {
        throw new Error(`Work item ${row.id} có % hoàn thành không hợp lệ; migration đã rollback.`);
      }
      let changed = false;
      if (normalizeWorkStatus(data.status) !== expectedStatus) {
        data.status = expectedStatus;
        statusCorrections += 1;
        changed = true;
      }
      if (!String(data.startDate || "").trim()) {
        legacyBlankStartDates += 1;
        if (data[legacyStartDateBackfillField] !== true) {
          data[legacyStartDateBackfillField] = true;
          changed = true;
        }
      } else if (Object.prototype.hasOwnProperty.call(data, legacyStartDateBackfillField)) {
        delete data[legacyStartDateBackfillField];
        changed = true;
      }
      validateWorkItemStatusProgress(data);
      if (!changed) continue;
      await client.query(`
        update uat_records
        set data = $1::jsonb,
            updated_at = now()
        where collection = 'workItems' and id = $2
      `, [JSON.stringify(data), row.id]);
      changedRecords += 1;
    }

    const summary = {
      appliedAt: new Date().toISOString(),
      totalRecords: result.rows.length,
      changedRecords,
      statusCorrections,
      legacyBlankStartDates,
      backupKey: workItemInvariantBackupKey
    };
    await client.query(`
      insert into app_meta (key, value, updated_at)
      values ($1, $2::jsonb, now())
    `, [workItemInvariantMigrationKey, JSON.stringify(summary)]);
    if (changedRecords) await touchMeta(client);
    await client.query("commit");
    return summary;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function ensureWorkItemCompletionMigration() {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [workItemCompletionMigrationKey]);
    const existing = await client.query(
      "select value from app_meta where key = $1 for update",
      [workItemCompletionMigrationKey]
    );
    if (existing.rows[0]) {
      await client.query("commit");
      return existing.rows[0].value;
    }

    const result = await client.query(`
      select id, data, created_by, updated_by, created_at, updated_at
      from uat_records
      where collection = 'workItems'
      order by id
      for update
    `);
    const backup = result.rows.map((row) => ({
      id: row.id,
      data: row.data,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    await client.query(`
      insert into app_meta (key, value, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (key) do nothing
    `, [workItemCompletionBackupKey, JSON.stringify({
      createdAt: new Date().toISOString(),
      records: backup
    })]);

    let changedRecords = 0;
    for (const row of result.rows) {
      const data = { ...(row.data || {}) };
      if (!String(data.completedDate || "").trim()) continue;
      const previousStatus = normalizeWorkStatus(data.status);
      const previousProgress = Number(data.progress);
      normalizeWorkItemCompletion(data);
      validateWorkItemStatusProgress(data);
      if (previousStatus === data.status && previousProgress === data.progress) continue;
      await client.query(`
        update uat_records
        set data = $1::jsonb,
            updated_at = now()
        where collection = 'workItems' and id = $2
      `, [JSON.stringify(data), row.id]);
      changedRecords += 1;
    }

    const summary = {
      appliedAt: new Date().toISOString(),
      totalRecords: result.rows.length,
      changedRecords,
      backupKey: workItemCompletionBackupKey
    };
    await client.query(`
      insert into app_meta (key, value, updated_at)
      values ($1, $2::jsonb, now())
    `, [workItemCompletionMigrationKey, JSON.stringify(summary)]);
    if (changedRecords) await touchMeta(client);
    await client.query("commit");
    return summary;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function ensureWorkItemPeopleMigration() {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [workItemPeopleMigrationKey]);
    const existing = await client.query(
      "select value from app_meta where key = $1 for update",
      [workItemPeopleMigrationKey]
    );
    if (existing.rows[0]) {
      await client.query("commit");
      return existing.rows[0].value;
    }

    const result = await client.query(`
      select id, data, created_by, updated_by, created_at, updated_at
      from uat_records
      where collection = 'workItems'
      order by id
      for update
    `);
    const backup = result.rows.map((row) => ({
      id: row.id,
      data: row.data,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    await client.query(`
      insert into app_meta (key, value, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (key) do nothing
    `, [workItemPeopleBackupKey, JSON.stringify({ createdAt: new Date().toISOString(), records: backup })]);

    let changedRecords = 0;
    let assigneeLinks = 0;
    let businessContactLinks = 0;
    let recordsWithMultipleAssignees = 0;
    for (const row of result.rows) {
      const data = { ...(row.data || {}) };
      const before = JSON.stringify(data);
      normalizeWorkItemPeople(data);
      validateWorkItemPeople(data);
      assigneeLinks += data.assignees.length;
      businessContactLinks += data.businessContacts.length;
      if (data.assignees.length > 1) recordsWithMultipleAssignees += 1;
      if (JSON.stringify(data) === before) continue;
      await client.query(`
        update uat_records
        set data = $1::jsonb,
            updated_at = now()
        where collection = 'workItems' and id = $2
      `, [JSON.stringify(data), row.id]);
      changedRecords += 1;
    }

    const summary = {
      version: 1,
      appliedAt: new Date().toISOString(),
      totalRecords: result.rows.length,
      changedRecords,
      assigneeLinks,
      businessContactLinks,
      recordsWithMultipleAssignees,
      backupKey: workItemPeopleBackupKey
    };
    await client.query(`
      insert into app_meta (key, value, updated_at)
      values ($1, $2::jsonb, now())
    `, [workItemPeopleMigrationKey, JSON.stringify(summary)]);
    if (changedRecords) await touchMeta(client);
    await client.query("commit");
    return summary;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function ensureWorkItemPeopleIdentityMigration() {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [workItemPeopleIdentityMigrationKey]);
    const existing = await client.query(
      "select value from app_meta where key = $1 for update",
      [workItemPeopleIdentityMigrationKey]
    );
    if (existing.rows[0]) {
      await client.query("commit");
      return existing.rows[0].value;
    }

    const result = await client.query(`
      select id, data, created_by, updated_by, created_at, updated_at
      from uat_records
      where collection = 'workItems'
      order by id
      for update
    `);
    const changes = [];
    for (const row of result.rows) {
      const data = { ...(row.data || {}) };
      const before = JSON.stringify(data);
      normalizeWorkItemPeople(data);
      validateWorkItemPeople(data);
      if (JSON.stringify(data) !== before) changes.push({ row, data });
    }

    const backup = changes.map(({ row }) => ({
      id: row.id,
      data: row.data,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    await client.query(`
      insert into app_meta (key, value, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (key) do nothing
    `, [workItemPeopleIdentityBackupKey, JSON.stringify({
      createdAt: new Date().toISOString(),
      records: backup
    })]);

    for (const { row, data } of changes) {
      await client.query(`
        update uat_records
        set data = $1::jsonb,
            updated_at = now()
        where collection = 'workItems' and id = $2
      `, [JSON.stringify(data), row.id]);
    }

    const summary = {
      version: 1,
      appliedAt: new Date().toISOString(),
      totalRecords: result.rows.length,
      changedRecords: changes.length,
      affectedTaskIds: changes.map(({ data }) => data.taskId || data.id).filter(Boolean),
      backupKey: workItemPeopleIdentityBackupKey
    };
    await client.query(`
      insert into app_meta (key, value, updated_at)
      values ($1, $2::jsonb, now())
    `, [workItemPeopleIdentityMigrationKey, JSON.stringify(summary)]);
    if (changes.length) await touchMeta(client);
    await client.query("commit");
    return summary;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function ensureTester7PersonnelMigration() {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [tester7PersonnelMigrationKey]);
    const existingMigration = await client.query(
      "select value from app_meta where key = $1 for update",
      [tester7PersonnelMigrationKey]
    );
    if (existingMigration.rows[0]) {
      await client.query("commit");
      return existingMigration.rows[0].value;
    }

    const result = await client.query(`
      select id, data, created_by, updated_by, created_at, updated_at
      from uat_records
      where collection = 'personnel'
      order by id
      for update
    `);
    const backup = result.rows.map((row) => ({
      id: row.id,
      data: row.data,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    await client.query(`
      insert into app_meta (key, value, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (key) do nothing
    `, [tester7PersonnelBackupKey, JSON.stringify({
      createdAt: new Date().toISOString(),
      records: backup
    })]);

    const matches = result.rows.filter((row) => isTester7PersonnelRow({ id: row.id, ...(row.data || {}) }));
    if (matches.length > 1) {
      throw new Error(`Có ${matches.length} bản ghi cùng nhận diện Tester 7; migration đã rollback để tránh trùng nhân sự.`);
    }

    const nowIso = new Date().toISOString();
    let inserted = false;
    let updated = false;
    let personnelId = "personnel-t7-huanphc";
    if (matches.length === 0) {
      const data = applyCanonicalTester7PersonnelFields({
        id: personnelId,
        birthYear: "",
        phone: "",
        unit: "",
        bidvJoinDate: "",
        salaryGrade: "",
        salaryStep: "",
        createdAt: nowIso,
        updatedAt: nowIso
      });
      validateRecordForCollection("personnel", data);
      await client.query(`
        insert into uat_records (collection, id, data, created_by, updated_by, created_at, updated_at)
        values ('personnel', $1, $2::jsonb, null, null, now(), now())
      `, [personnelId, JSON.stringify(data)]);
      inserted = true;
    } else {
      const current = matches[0];
      personnelId = current.id;
      const data = { ...(current.data || {}), id: personnelId };
      for (const field of ["birthYear", "phone", "unit", "bidvJoinDate", "salaryGrade", "salaryStep"]) {
        if (data[field] == null) data[field] = "";
      }
      applyCanonicalTester7PersonnelFields(data);
      if (!data.createdAt) data.createdAt = new Date(current.created_at).toISOString();
      validateRecordForCollection("personnel", data);
      if (canonicalRecord(data) !== canonicalRecord(current.data || {})) {
        data.updatedAt = nowIso;
        await client.query(`
          update uat_records
          set data = $1::jsonb,
              updated_at = now()
          where collection = 'personnel' and id = $2
        `, [JSON.stringify(data), personnelId]);
        updated = true;
      }
    }

    const summary = {
      version: 1,
      appliedAt: nowIso,
      totalPersonnelBefore: result.rows.length,
      totalPersonnelAfter: result.rows.length + (inserted ? 1 : 0),
      personnelId,
      inserted,
      updated,
      backupKey: tester7PersonnelBackupKey
    };
    await client.query(`
      insert into app_meta (key, value, updated_at)
      values ($1, $2::jsonb, now())
    `, [tester7PersonnelMigrationKey, JSON.stringify(summary)]);
    if (inserted || updated) await touchMeta(client);
    await client.query("commit");
    return summary;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function ensurePilotWorkPlanSeed() {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const existingSeed = await client.query(
      "select value from app_meta where key = $1 for update",
      [pilotWorkPlanSeedKey]
    );
    if (existingSeed.rows[0]) {
      await client.query("commit");
      return;
    }

    const countResult = await client.query(
      "select count(*)::integer as count from uat_records where collection = any($1::text[])",
      [planningCollections]
    );
    const existingPlanRecords = Number(countResult.rows[0]?.count || 0);
    let seeded = false;
    if (existingPlanRecords === 0) {
      const now = new Date();
      const nowIso = now.toISOString();
      const rows = buildPilotWorkPlanSeedRecords(nowIso);
      rows.forEach((row) => validateRecordForCollection(row.collection, row.data));
      await bulkUpsertRecords(client, rows, null, now);
      seeded = true;
    }

    await client.query(`
      insert into app_meta (key, value, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (key) do update
        set value = excluded.value,
            updated_at = now()
    `, [pilotWorkPlanSeedKey, JSON.stringify({
      seeded,
      version: 1,
      checkedAt: new Date().toISOString(),
      categories: pilotWorkCategories.length,
      items: seeded ? pilotWorkSeedItems.length : 0
    })]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function ensureDeliveryWorkCategories() {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [deliveryWorkCategoriesMigrationKey]);
    const nowIso = new Date().toISOString();
    let inserted = 0;
    for (const category of deliveryWorkCategories) {
      const record = {
        id: category.id,
        sortOrder: category.sortOrder,
        taskPrefix: category.taskPrefix,
        name: category.name,
        description: category.description || "",
        owner: "",
        targetDate: category.targetDate || "",
        status: "Đang theo dõi",
        note: "",
        createdAt: nowIso,
        updatedAt: nowIso
      };
      validateRecordForCollection("workCategories", record);
      const result = await client.query(`
        insert into uat_records (collection, id, data, created_by, updated_by, created_at, updated_at)
        values ('workCategories', $1, $2::jsonb, null, null, now(), now())
        on conflict (collection, id) do nothing
        returning id
      `, [record.id, JSON.stringify(record)]);
      inserted += result.rowCount || 0;
    }
    const summary = {
      version: 1,
      checkedAt: nowIso,
      inserted,
      categories: deliveryWorkCategories.map((category) => category.id)
    };
    await client.query(`
      insert into app_meta (key, value, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (key) do update
        set value = excluded.value,
            updated_at = excluded.updated_at
    `, [deliveryWorkCategoriesMigrationKey, JSON.stringify(summary)]);
    if (inserted) await touchMeta(client);
    await client.query("commit");
    return summary;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function assertUniqueMemberKpiInput(client, memberEmail, currentId) {
  const result = await client.query(`
    select id
    from uat_records
    where collection = 'memberKpiInputs'
      and lower(data->>'memberEmail') = lower($1)
      and id <> $2
    limit 1
  `, [String(memberEmail || "").trim(), String(currentId || "")]);
  if (result.rows[0]) {
    throw httpError(409, "Thành viên này đã có dữ liệu chấm KPI. Hãy sửa bản ghi hiện tại.");
  }
}

async function ensureWorkKpiConfig() {
  const now = new Date().toISOString();
  const record = { ...defaultWorkKpiConfig, createdAt: now, updatedAt: now };
  await getPool().query(`
    insert into uat_records (collection, id, data, created_by, updated_by, created_at, updated_at)
    values ('kpiConfig', $1, $2::jsonb, null, null, now(), now())
    on conflict (collection, id) do nothing
  `, [record.id, JSON.stringify(record)]);
}

function buildPilotWorkPlanSeedRecords(nowIso) {
  const categories = pilotWorkCategories.map((category) => ({
    collection: "workCategories",
    id: category.id,
    data: {
      id: category.id,
      sortOrder: category.sortOrder,
      taskPrefix: category.taskPrefix,
      name: category.name,
      description: category.description || "",
      owner: "",
      targetDate: category.targetDate || "",
      status: "Đang theo dõi",
      note: "",
      createdAt: nowIso,
      updatedAt: nowIso
    }
  }));

  const categoryById = new Map(pilotWorkCategories.map((category) => [category.id, category]));
  const indexByCategory = new Map();
  const items = pilotWorkSeedItems.map((item) => {
    const category = categoryById.get(item.categoryId);
    const nextIndex = (indexByCategory.get(item.categoryId) || 0) + 1;
    indexByCategory.set(item.categoryId, nextIndex);
    const taskId = `${category?.taskPrefix || "SQ2-T00"}-${String(nextIndex).padStart(3, "0")}`;
    const assigneeEmail = emailForWorkAssignee(item.assignee);
    return {
      collection: "workItems",
      id: `pilot-${taskId.toLowerCase()}`,
      data: {
        id: `pilot-${taskId.toLowerCase()}`,
        sortOrder: nextIndex,
        taskId,
        categoryId: item.categoryId,
        title: item.title,
        description: item.description || item.source || "",
        assignee: item.assignee || "",
        assigneeEmail,
        collaborators: item.collaborators || "",
        assignees: item.assignee ? [{ name: item.assignee, email: assigneeEmail }] : [],
        businessContacts: item.collaborators
          ? normalizeWorkPeopleList(null, splitLegacyPeople(item.collaborators))
          : [],
        status: "Chưa bắt đầu",
        progress: 0,
        priority: item.priority || "Trung bình",
        startDate: "",
        dueDate: item.dueDate || category?.targetDate || "",
        completedDate: "",
        documentUrl: pilotWorkPlanDocumentUrl,
        note: item.source ? `Nguồn: ${item.source}` : "",
        createdAt: nowIso,
        updatedAt: nowIso
      }
    };
  });

  return [...categories, ...items];
}

function emailForWorkAssignee(name) {
  return canonicalWorkAssignee(name)?.email || "";
}

function normalizeWorkPersonNameKey(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

function canonicalWorkAssignee(name, email = "") {
  const normalizedEmail = normalizeIdentity(email);
  const normalizedName = normalizeWorkPersonNameKey(name);
  const entries = Object.entries(workAssigneeDirectory);
  const matchedByEmail = normalizedEmail
    ? entries.find(([, candidateEmail]) => normalizeIdentity(candidateEmail) === normalizedEmail)
    : null;
  const matched = matchedByEmail || (normalizedName
    ? entries.find(([candidateName]) => normalizeWorkPersonNameKey(candidateName) === normalizedName)
    : null);
  return matched ? { name: matched[0], email: normalizeIdentity(matched[1]) } : null;
}

function normalizeWorkPerson(entry) {
  if (entry == null) return null;
  const raw = typeof entry === "object" && !Array.isArray(entry)
    ? entry
    : (String(entry || "").includes("@") ? { email: entry } : { name: entry });
  let name = String(raw.name || raw.label || "").replace(/\s+/g, " ").trim();
  let email = String(raw.email || raw.value || "").trim().toLowerCase();
  if (email && !email.includes("@")) {
    if (!name) name = email;
    email = "";
  }
  const canonical = canonicalWorkAssignee(name, email);
  if (canonical) return canonical;
  if (!email && name) email = emailForWorkAssignee(name);
  if (!name && email) {
    const matched = Object.entries(workAssigneeDirectory)
      .find(([, candidate]) => normalizeIdentity(candidate) === normalizeIdentity(email));
    name = matched?.[0] || email;
  }
  if (!name && !email) return null;
  return { name: name || email, email };
}

function splitLegacyPeople(value) {
  if (Array.isArray(value)) return value;
  return String(value || "")
    .split(/[\n;,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeWorkPeopleList(value, fallback = []) {
  const source = Array.isArray(value) ? value : fallback;
  const people = [];
  const seen = new Set();
  for (const entry of source || []) {
    const person = normalizeWorkPerson(entry);
    if (!person) continue;
    const key = normalizeIdentity(person.email) || `name:${normalizeIdentity(person.name)}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    people.push(person);
  }
  return people;
}

function normalizeWorkItemPeople(record) {
  if (!record || typeof record !== "object") return record;
  const legacyAssignees = record.assignee || record.assigneeEmail
    ? [{ name: record.assignee || "", email: record.assigneeEmail || "" }]
    : [];
  const legacyContacts = splitLegacyPeople(record.collaborators);
  const assignees = normalizeWorkPeopleList(record.assignees, legacyAssignees);
  const businessContacts = normalizeWorkPeopleList(record.businessContacts, legacyContacts);
  record.assignees = assignees;
  record.businessContacts = businessContacts;
  record.assignee = assignees[0]?.name || "";
  record.assigneeEmail = assignees[0]?.email || "";
  record.collaborators = businessContacts.map((person) => person.name || person.email).filter(Boolean).join(", ");
  return record;
}

function workItemAssignees(record) {
  return normalizeWorkItemPeople({ ...(record || {}) }).assignees;
}

function workItemBusinessContacts(record) {
  return normalizeWorkItemPeople({ ...(record || {}) }).businessContacts;
}

function validateWorkItemPeople(record) {
  const groups = [
    ["Người thực hiện", record.assignees],
    ["Đầu mối nghiệp vụ", record.businessContacts]
  ];
  for (const [label, people] of groups) {
    if (!Array.isArray(people)) throw httpError(400, `${label} phải là danh sách.`);
    if (people.length > 50) throw httpError(400, `${label} không được vượt quá 50 người.`);
    for (const person of people) {
      if (!person || typeof person !== "object" || Array.isArray(person) || !String(person.name || person.email || "").trim()) {
        throw httpError(400, `${label} chứa thành viên không hợp lệ.`);
      }
      const email = String(person.email || "").trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw httpError(400, `${label} chứa email không hợp lệ.`);
      }
    }
  }
}

async function ensureSeedAdmin() {
  if (authMisconfigured) {
    console.warn("APP_USER and APP_PASSWORD must be configured together to seed the admin account.");
    return;
  }
  if (!authEnabled) return;
  const username = String(authUser).trim().toLowerCase();
  if (!username) return;
  const email = username.includes("@") ? username : null;
  const name = process.env.APP_ADMIN_NAME || "Squad 2 Administrator";
  const role = roleForIdentity(username, email);
  const passwordHash = await hashPassword(String(authPassword));
  await getPool().query(`
    insert into app_users (id, username, email, name, role, password_hash, active)
    values ($1, $2, $3, $4, $5, $6, true)
    on conflict (username) do update
      set email = coalesce(app_users.email, excluded.email),
          role = excluded.role,
          active = true,
          updated_at = now()
  `, [crypto.randomUUID(), username, email, name, role, passwordHash]);
}

async function ensureDefaultUsers() {
  for (const user of defaultUsers) {
    const username = String(user.username).trim().toLowerCase();
    const email = String(user.email || username).trim().toLowerCase();
    const name = String(user.name || username.split("@")[0]).trim();
    const role = roleForIdentity(username, email);
    const passwordHash = await hashPassword(String(user.password));
    await getPool().query(`
      insert into app_users (id, username, email, name, role, password_hash, active)
      values ($1, $2, $3, $4, $5, $6, true)
      on conflict (username) do update
        set email = excluded.email,
            name = excluded.name,
            role = excluded.role,
            password_hash = excluded.password_hash,
            active = true,
            updated_at = now()
    `, [crypto.randomUUID(), username, email, name, role, passwordHash]);
  }
}

async function ensureExclusiveAdminRoles() {
  await getPool().query(`
    update app_users
    set role = case
          when lower(username) = any($1::text[])
            or lower(coalesce(email, '')) = any($1::text[])
          then 'admin'
          else 'user'
        end,
        updated_at = now()
  `, [adminIdentities]);
}

async function requireApiAuth(req, res, next) {
  try {
    await ensureSchema();
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Vui lòng đăng nhập.", status: 401 });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Bạn không có quyền quản trị tài khoản.", status: 403 });
    return;
  }
  next();
}

function isPersonalWorkspaceOwner(user) {
  const identities = [user?.email, user?.username]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  return identities.includes(personalWorkspaceOwner);
}

function requirePersonalWorkspaceOwner(req, res, next) {
  if (!isPersonalWorkspaceOwner(req.user)) {
    res.status(403).json({ error: "Màn hình này chỉ dành cho tài khoản cá nhân được cấu hình.", status: 403 });
    return;
  }
  next();
}

async function getUserFromRequest(req) {
  const token = parseCookies(req.headers.cookie || "")[sessionCookieName];
  const session = verifySession(token);
  if (!session) return null;
  const result = await getPool().query(`
    select id, username, email, name, role, active, avatar_data
    from app_users
    where id = $1 and active = true
    limit 1
  `, [session.id]);
  if (!result.rows[0]) return null;
  return toPublicUser(result.rows[0]);
}

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email || "",
    name: user.name || user.username,
    role: normalizeRole(user.role || "user"),
    avatarData: user.avatar_data || user.avatarData || "",
    active: user.active !== false
  };
}

function toGroupChatMessage(row) {
  return {
    id: row.id,
    body: row.body || "",
    createdAt: row.created_at?.toISOString?.() || new Date().toISOString(),
    user: {
      id: row.user_id || "",
      name: row.user_name || row.username || "Người dùng",
      email: row.user_email || "",
      username: row.username || "",
      avatarData: row.user_avatar_data || ""
    }
  };
}

function normalizeChatMessage(value) {
  const body = String(value || "").trim();
  if (!body) throw httpError(400, "Tin nhắn không được để trống.");
  if (body.length > 1000) throw httpError(400, "Tin nhắn tối đa 1000 ký tự.");
  return body;
}

function normalizeAiMessage(value) {
  const body = String(value || "").trim();
  if (!body) throw httpError(400, "Câu hỏi AI không được để trống.");
  if (body.length > 2000) throw httpError(400, "Câu hỏi AI tối đa 2000 ký tự.");
  return body;
}

function normalizeAiHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-12)
    .map((item) => ({
      role: item?.role === "assistant" ? "assistant" : "user",
      body: String(item?.body || item?.message || "").trim().slice(0, 4000)
    }))
    .filter((item) => item.body);
}

function tryAnswerAiShortcut(message, state) {
  const query = normalizeAiQuery(message);
  if (isTesterShortageQuestion(query)) return formatTesterShortageAnswer(state);
  return "";
}

function normalizeAiQuery(value) {
  return normalizeImportedText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi");
}

function isTesterShortageQuestion(query) {
  return (
    query.includes("thieu tester")
    || query.includes("thieu nguoi test")
    || query.includes("thieu nguoi kiem thu")
    || query.includes("chua phan cong tester")
    || query.includes("chua co tester")
  ) && (query.includes("sprint") || query.includes("phan cong") || query.includes("tester"));
}

function formatTesterShortageAnswer(state) {
  const summary = summarizeTesterAssignments(state);
  if (!summary.shortageRows.length) {
    return [
      "Hiện tại chưa có Sprint nào đang thiếu tester.",
      "",
      `Đã kiểm trên PhanCong_UAT: ${summary.totalRows} dòng phân công, ${summary.rowsWithCases} dòng có testcase, tổng ${summary.totalCases} testcase.`,
      "Tiêu chí kiểm: dòng có testcase nhưng dưới 2 tester T1-T7, hoặc tổng testcase phân bổ cho T1-T7 nhỏ hơn Tổng Testcase.",
      `Kết quả: 0 dòng thiếu tester theo tiêu chí này.${summary.rowsWithoutCasesAndTester ? ` Có ${summary.rowsWithoutCasesAndTester} dòng chưa có số tester nhưng Tổng Testcase = 0 nên chưa tính là thiếu tester.` : ""}`
    ].join("\n");
  }

  const lines = summary.shortageBySprint.map((row) => {
    const examples = row.examples.length ? ` Ví dụ: ${row.examples.join("; ")}.` : "";
    return `- ${row.sprint}: ${row.storyCount} story, ${row.totalCases} testcase cần rà tester.${examples}`;
  });
  return [
    `Có ${summary.shortageBySprint.length} Sprint đang thiếu tester trong PhanCong_UAT:`,
    ...lines,
    "",
    `Tổng cộng ${summary.shortageRows.length}/${summary.rowsWithCases} dòng có testcase cần rà lại phân công tester.`
  ].join("\n");
}

function summarizeTesterAssignments(state) {
  const rows = Array.isArray(state?.plans) ? state.plans : [];
  const rowsWithCases = rows.filter((row) => Number(row.totalCases || 0) > 0);
  const shortageRows = rowsWithCases
    .map((row) => {
      const testerValues = testerKeys.map((key) => Number(row[key] || 0)).filter((value) => Number.isFinite(value) && value > 0);
      const testerCaseTotal = testerValues.reduce((total, value) => total + value, 0);
      const totalCases = Number(row.totalCases || 0);
      return {
        row,
        totalCases,
        testerSlotCount: testerValues.length,
        testerCaseTotal,
        isShortage: testerValues.length < 2 || testerCaseTotal < totalCases
      };
    })
    .filter((item) => item.isShortage);
  const bySprint = new Map();
  shortageRows.forEach((item) => {
    const sprint = normalizeImportedText(item.row.sprint) || "Chưa gán Sprint";
    if (!bySprint.has(sprint)) bySprint.set(sprint, { sprint, storyCount: 0, totalCases: 0, examples: [] });
    const bucket = bySprint.get(sprint);
    bucket.storyCount += 1;
    bucket.totalCases += item.totalCases;
    if (bucket.examples.length < 3) {
      bucket.examples.push(`${item.row.jiraCode || item.row.code || "Chưa có mã"} - ${item.row.feature || "Chưa có tên"}`);
    }
  });
  return {
    totalRows: rows.length,
    rowsWithCases: rowsWithCases.length,
    totalCases: rowsWithCases.reduce((total, row) => total + Number(row.totalCases || 0), 0),
    rowsWithoutCasesAndTester: rows.filter((row) => Number(row.totalCases || 0) <= 0 && testerKeys.every((key) => Number(row[key] || 0) <= 0)).length,
    shortageRows,
    shortageBySprint: [...bySprint.values()].sort((a, b) => a.sprint.localeCompare(b.sprint, "vi", { numeric: true }))
  };
}

function summarizeTesterAssignmentsForAi(state) {
  const summary = summarizeTesterAssignments(state);
  return {
    totalRows: summary.totalRows,
    rowsWithCases: summary.rowsWithCases,
    totalCases: summary.totalCases,
    rowsWithoutCasesAndTester: summary.rowsWithoutCasesAndTester,
    shortageStoryCount: summary.shortageRows.length,
    shortageSprintCount: summary.shortageBySprint.length,
    shortageBySprint: summary.shortageBySprint
  };
}

function buildAiDataContext(state) {
  const metrics = calculateWorkbookMetrics(state);
  const totalCases = sumBy(state.plans || [], "totalCases");
  const passedCases = sumBy(state.features || [], "passedCases");
  const failedCases = sumBy(state.features || [], "failedCases");
  const deliveredStories = (state.handoffs || []).filter((row) => row.uatHandoff).length;
  const context = {
    generatedAt: new Date().toISOString(),
    dataUpdatedAt: state.updatedAt || "",
    counts: summarizeImportState(state),
    dashboard: {
      totalStories: (state.features || []).length,
      deliveredStories,
      notDeliveredStories: Math.max(0, (state.features || []).length - deliveredStories),
      totalCases,
      passedCases,
      failedCases,
      handoffRate: percent(deliveredStories, (state.features || []).length),
      blockerBugs: metrics.blockerBugs,
      criticalBugs: metrics.criticalBugs,
      trainingReadiness: metrics.trainingReadiness,
      pilotReadiness: metrics.pilotReadiness,
      squadProgress: metrics.squadProgress,
      successRate: metrics.successRate
    },
    testerAssignment: summarizeTesterAssignmentsForAi(state),
    ownerSummary: summarizeAiOwners(state),
    sprintSummary: summarizeAiSprints(state),
    fieldLegend: aiFieldLegend(),
    modules: Object.fromEntries(collections.map((collection) => [
      aiCollectionName(collection),
      {
        collection,
        rowCount: Array.isArray(state[collection]) ? state[collection].length : 0,
        rows: (Array.isArray(state[collection]) ? state[collection] : []).map((row) => compactAiRecord(collection, row))
      }
    ]))
  };
  return limitAiContext(JSON.stringify(context, null, 2));
}

function summarizeAiOwners(state) {
  const buckets = new Map();
  (state.plans || []).forEach((row) => {
    const owner = String(row.owner || "Chưa gán").trim();
    if (!buckets.has(owner)) buckets.set(owner, { owner, storyCount: 0, totalCases: 0, executedCases: 0 });
    const bucket = buckets.get(owner);
    bucket.storyCount += 1;
    bucket.totalCases += Number(row.totalCases || 0);
    bucket.executedCases += Number(row.executedCases || 0);
  });
  return [...buckets.values()]
    .map((row) => ({ ...row, coverageRate: percent(row.executedCases, row.totalCases) }))
    .sort((a, b) => b.storyCount - a.storyCount || a.owner.localeCompare(b.owner, "vi"));
}

function summarizeAiSprints(state) {
  const buckets = new Map();
  const ensure = (sprint) => {
    const key = String(sprint || "Chưa gán Sprint").trim();
    if (!buckets.has(key)) {
      buckets.set(key, { sprint: key, storyCount: 0, deliveredStories: 0, totalCases: 0, executedCases: 0, coverageRate: 0, decision: "" });
    }
    return buckets.get(key);
  };
  (state.plans || []).forEach((row) => {
    const bucket = ensure(row.sprint);
    bucket.storyCount += 1;
    bucket.totalCases += Number(row.totalCases || 0);
    bucket.executedCases += Number(row.executedCases || 0);
  });
  (state.readiness || []).forEach((row) => {
    const bucket = ensure(row.sprint);
    bucket.storyCount = Number(row.totalStories || bucket.storyCount);
    bucket.deliveredStories = Number(row.deliveredStories || bucket.deliveredStories);
    bucket.totalCases = Number(row.totalCases || bucket.totalCases);
    bucket.executedCases = Number(row.executedCases || bucket.executedCases);
    bucket.coverageRate = Number(row.coverageRate || bucket.coverageRate);
    bucket.decision = row.decision || bucket.decision;
  });
  return [...buckets.values()]
    .map((row) => ({
      ...row,
      coverageRate: row.coverageRate || percent(row.deliveredStories, row.storyCount),
      decision: row.decision || "Chưa quyết định"
    }))
    .sort((a, b) => a.sprint.localeCompare(b.sprint, "vi", { numeric: true }));
}

function compactAiRecord(collection, row) {
  const fieldOrder = aiFieldOrder(collection);
  const omitted = new Set(["id", "sortOrder", "createdAt", "updatedAt", "_ownership"]);
  const keys = [
    ...fieldOrder,
    ...Object.keys(row || {}).filter((key) => !fieldOrder.includes(key))
  ];
  return keys.reduce((record, key) => {
    if (omitted.has(key) || key.startsWith("_")) return record;
    const value = row?.[key];
    if (value === "" || value == null) return record;
    if (typeof value === "object") return record;
    record[key] = typeof value === "string" && value.length > 500 ? `${value.slice(0, 500)}...` : value;
    return record;
  }, {});
}

function aiCollectionName(collection) {
  return {
    features: "DM_ChucNang",
    personnel: "NhanSu_UAT",
    schedule: "Lich_UAT",
    handoffs: "Lich_BG_US",
    plans: "PhanCong_UAT",
    daily: "DieuHanh_Ngay",
    defects: "DEFECT_LOG",
    userStories: "DS_US",
    bugSources: "DS.Loi",
    defectSummary: "Tong hop loi",
    weekly: "ChatLuong_Tuan",
    readiness: "TongKet_Sprint",
    matrix: "NangSuat_Tester",
    guide: "HD_UAT"
  }[collection] || collection;
}

function aiFieldOrder(collection) {
  return {
    features: ["stt", "code", "storyCode", "jiraCode", "group", "name", "sprint", "owner", "uatHandoff", "handoffStatus", "totalCases", "passedCases", "failedCases", "blockedCases", "defectOpen", "blockerOpen", "criticalOpen", "uatResult", "status", "completionRate", "uatWarning"],
    personnel: ["staffCode", "name", "role", "scope", "status", "birthYear", "phone", "email", "unit", "bidvJoinDate", "salaryGrade", "salaryStep"],
    schedule: ["sprint", "devStart", "devEnd", "handoffDate", "startDate", "endDate", "note"],
    handoffs: ["jiraCode", "code", "storyCode", "sectionLevel1", "sectionLevel2", "name", "sprint", "uatHandoff", "uatStart", "uatEnd", "handoffStatus", "uatStatus"],
    plans: ["code", "jiraCode", "group", "feature", "sprint", "uatHandoff", "owner", "nv", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "totalCases", "testStatus", "progress", "uatStatus", "devStatus", "priority", "note"],
    daily: ["date", "jiraCode", "feature", "sprint", "tester", "totalCases", "passedCases", "failedCases", "bugStatus", "maxBugSeverity", "bugDetail", "blocker", "handler", "dueDate"],
    defects: ["stt", "bugId", "linkedUsKey", "featureJiraCode", "storyName", "sprint", "severity", "status", "foundDate", "tester", "owner", "resolvedDate", "aging", "note"],
    userStories: ["issueType", "issueKey", "issueId", "summary", "assignee", "reporter", "priority", "status", "resolution", "created", "updated", "dueDate", "squadSummary"],
    bugSources: ["issueType", "issueKey", "issueId", "summary", "assignee", "reporter", "tester", "priority", "status", "resolution", "created", "updated", "dueDate", "linkedUsKey"],
    defectSummary: ["stt", "code", "storyCode", "jiraCode", "usKey", "group", "name", "sprint", "owner", "handoffStatus", "assignee", "usStatus", "totalCases", "passedCases", "failedCases", "totalBugs", "openBugs", "inProgressBugs", "pendingBugs", "resolvedBugs", "sitPassBugs", "activeBugs", "handledBugs", "handledRate", "severeBugs", "uatResult", "status", "completionRate"],
    weekly: ["week", "sprint", "totalStories", "storyTested", "coverageRate", "successRate", "blockerBugs", "criticalBugs", "reopenRate", "assessment"],
    readiness: ["sprint", "totalStories", "deliveredStories", "coverageRate", "successRate", "openBlockerBugs", "openCriticalBugs", "openMajorBugs", "reopenRate", "decision"],
    matrix: ["group", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "totalParticipation", "target", "warning"],
    guide: ["category", "index", "topic", "content"]
  }[collection] || [];
}

function aiFieldLegend() {
  return {
    code: "Mã chức năng",
    storyCode: "Mã story",
    jiraCode: "Mã Jira",
    group: "Nhóm chức năng",
    name: "Tên chức năng",
    bidvJoinDate: "Ngày vào BIDV",
    salaryGrade: "Cấp lương",
    salaryStep: "Bậc lương",
    owner: "Đầu mối nghiệp vụ/chủ quản",
    uatHandoff: "Ngày bàn giao UAT",
    handoffStatus: "Trạng thái bàn giao",
    sectionLevel1: "Badge/tiêu đề cấp 1 của Lich_BG_US",
    sectionLevel2: "Badge/tiêu đề cấp 2 của Lich_BG_US",
    note: "Ghi chú",
    totalCases: "Tổng testcase",
    passedCases: "Testcase Passed",
    failedCases: "Testcase Failed",
    progress: "% hoàn thành",
    uatStatus: "Trạng thái UAT",
    devStatus: "Trạng thái DEV",
    testStatus: "Trạng thái kiểm thử",
    defectOpen: "Số defect đang mở",
    blockerOpen: "Số lỗi Blocker đang mở",
    criticalOpen: "Số lỗi Critical đang mở",
    t1: "Tester Sơn T1",
    t2: "Tester Sinh T2",
    t3: "Tester Trí T3",
    t4: "Tester Huy T4",
    t5: "Tester Tuấn T5",
    t6: "Tester Thành T6",
    t7: "Tester Huân T7"
  };
}

function limitAiContext(text) {
  const maxLength = Number(process.env.AI_CONTEXT_MAX_CHARS || 140000);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n... Context bị rút gọn do quá dài. Hãy nói rõ nếu câu hỏi cần phần dữ liệu có thể đã bị cắt.`;
}

async function askGeminiUatAssistant({ message, history, context, user }) {
  const url = `${geminiApiBase.replace(/\/$/, "")}/models/${geminiModel.replace(/^models\//, "")}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;
  const contents = [
    {
      role: "user",
      parts: [{ text: `DỮ LIỆU HIỆN TẠI CỦA SQUAD 2 UAT DASHBOARD (JSON):\n${context}` }]
    },
    {
      role: "model",
      parts: [{ text: "Đã hiểu. Tôi sẽ trả lời dựa trên JSON hiện tại và nêu rõ nếu dữ liệu không đủ." }]
    },
    ...history.map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.body }]
    })),
    {
      role: "user",
      parts: [{ text: message }]
    }
  ];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), geminiTimeoutMs);
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: [
              "Bạn là trợ lý AI cho web Squad 2 UAT Dashboard.",
              "Luôn trả lời bằng tiếng Việt, ngắn gọn, rõ số liệu.",
              "Chỉ dùng dữ liệu JSON được cung cấp. Nếu dữ liệu không có, nói rõ là chưa có dữ liệu thay vì suy đoán.",
              "Không dùng backtick hoặc tên field kỹ thuật nếu không cần; hãy nói bằng tên cột tiếng Việt mà người dùng nhìn thấy trên web.",
              "Khi người dùng hỏi nghiệp vụ, hãy liên hệ đúng sheet/module như DM_ChucNang, Lich_BG_US, PhanCong_UAT, DieuHanh_Ngay, DEFECT_LOG, DS_US, DS.Loi, Tong hop loi, ChatLuong_Tuan, TongKet_Sprint, NangSuat_Tester.",
              "Với câu hỏi thiếu tester/phân công tester, ưu tiên trường testerAssignment trong JSON; không dùng Trạng thái UAT để kết luận thiếu tester.",
              "Nếu câu trả lời là không có vấn đề, vẫn nêu rõ đã kiểm bao nhiêu dòng và tiêu chí kiểm là gì.",
              `Người đang hỏi: ${user?.name || user?.email || user?.username || "người dùng"}.`
            ].join("\n")
          }]
        },
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048
        }
      })
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw httpError(504, "Gemini phản hồi quá lâu. Vui lòng thử lại sau.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  const data = await safeJson(response);
  if (!response.ok) {
    const detail = data?.error?.message || data?.error || response.statusText || "không rõ lỗi";
    throw httpError(response.status === 401 || response.status === 403 ? 502 : response.status, `Gemini API lỗi: ${detail}`);
  }
  const answer = (data?.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();
  if (!answer) {
    const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || "không có nội dung trả lời";
    throw httpError(502, `Gemini không trả về câu trả lời: ${reason}.`);
  }
  return answer;
}

async function safeJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function validateNewUser({ username, email, name, password }) {
  if (!username || username.length < 3) throw httpError(400, "Username phải có ít nhất 3 ký tự.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, "Email không hợp lệ.");
  if (!name) throw httpError(400, "Tên hiển thị là bắt buộc.");
  validatePassword(password);
}

function loginIdentifierCandidates(identifier) {
  const raw = String(identifier || "").trim().toLowerCase();
  if (!raw) return [];
  const candidates = new Set([raw]);
  if (raw.includes("@")) {
    const shortName = raw.split("@")[0];
    if (shortName) candidates.add(shortName);
  } else {
    candidates.add(`${raw}@bidv.com.vn`);
  }
  return [...candidates];
}

function validatePassword(password) {
  if (!password || String(password).length < 6) {
    throw httpError(400, "Mật khẩu phải có ít nhất 6 ký tự.");
  }
}

function normalizeDisplayName(name, fallback) {
  const value = String(name || "").trim();
  if (!value) throw httpError(400, "Tên hiển thị là bắt buộc.");
  if (value.length > 80) throw httpError(400, "Tên hiển thị tối đa 80 ký tự.");
  return value || fallback;
}

function normalizeAvatarData(value) {
  const avatarData = String(value || "").trim();
  if (!avatarData) return "";
  if (avatarData.length > maxAvatarDataLength) {
    throw httpError(400, `Ảnh đại diện quá lớn. Vui lòng chọn ảnh dưới ${maxAvatarFileSizeMb}MB.`);
  }
  if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(avatarData)) {
    throw httpError(400, "Ảnh đại diện phải là PNG, JPG, WEBP hoặc GIF.");
  }
  return avatarData;
}

function normalizeRole(role) {
  const value = String(role || "user").toLowerCase();
  return ["admin", "manager", "user", "viewer"].includes(value) ? value : "user";
}

function roleForIdentity(username, email) {
  const identities = [username, email].map((value) => String(value || "").trim().toLowerCase());
  return identities.some((identity) => adminIdentities.includes(identity)) ? "admin" : "user";
}

function signSession(user) {
  const payload = {
    id: user.id,
    role: user.role,
    exp: Date.now() + sessionTtlMs
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = createSignature(body);
  return `${body}.${signature}`;
}

function verifySession(token) {
  if (!token || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  if (!safeEqual(signature, createSignature(body))) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(body));
    if (!payload.id || Number(payload.exp) < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function setSessionCookie(req, res, token) {
  res.setHeader("Set-Cookie", serializeCookie(sessionCookieName, token, {
    httpOnly: true,
    secure: req.secure || req.get("x-forwarded-proto") === "https" || process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: Math.floor(sessionTtlMs / 1000)
  }));
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", serializeCookie(sessionCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: 0
  }));
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge != null) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join("; ");
}

function parseCookies(header) {
  return header.split(";").reduce((cookies, item) => {
    const separator = item.indexOf("=");
    if (separator < 0) return cookies;
    const key = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function createSignature(value) {
  return crypto.createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt);
  return `scrypt$${salt}$${hash}`;
}

async function verifyPassword(password, storedHash) {
  const [scheme, salt, hash] = String(storedHash || "").split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const attempted = await scrypt(password, salt);
  return safeEqual(attempted, hash);
}

function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey.toString("hex"));
    });
  });
}

function safeEqual(actual, expected) {
  const left = Buffer.from(String(actual));
  const right = Buffer.from(String(expected));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function latestUpdatedAt(rows) {
  const dates = rows
    .map((row) => row.data?.updatedAt || row.data?.createdAt)
    .filter(isValidDateString)
    .sort((a, b) => new Date(b) - new Date(a));
  return dates[0] || null;
}

function toDate(value) {
  return isValidDateString(value) ? new Date(value) : new Date();
}

function isValidDateString(value) {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function publicError(error) {
  if (error.status && error.message) return error.message;
  return "Không kết nối được hệ thống dữ liệu.";
}

function setNoStore(res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function publicAppBaseUrl(req) {
  return appBaseUrl || `${req.protocol}://${req.get("host")}`;
}

function gmailOAuthRedirectUri(req) {
  return String(process.env.GMAIL_OAUTH_REDIRECT_URI || `${publicAppBaseUrl(req)}/api/email-notifications/oauth/callback`).trim();
}

async function readAppMetaValue(db, key) {
  const result = await db.query("select value from app_meta where key = $1 limit 1", [key]);
  return result.rows[0]?.value || null;
}

async function writeAppMetaValue(db, key, value) {
  await db.query(`
    insert into app_meta (key, value, updated_at)
    values ($1, $2::jsonb, now())
    on conflict (key) do update
      set value = excluded.value,
          updated_at = excluded.updated_at
  `, [key, JSON.stringify(value)]);
}

async function readGoogleSheetSyncSettings(db) {
  const stored = await readAppMetaValue(db, googleSheetSyncSettingsMetaKey);
  return normalizeGoogleSheetSettings(stored, {
    spreadsheetId: googleSheetSyncDefaultId,
    intervalMinutes: googleSheetSyncDefaultIntervalMinutes,
    minimumRowRatio: 0.5
  });
}

async function saveGoogleSheetSyncSettings(db, input = {}, actor = {}) {
  const current = await readGoogleSheetSyncSettings(db);
  const requestedId = input.spreadsheetId == null || input.spreadsheetId === ""
    ? current.spreadsheetId
    : extractSpreadsheetId(input.spreadsheetId);
  if (!requestedId) throw httpError(400, "Link hoặc ID Google Sheet không hợp lệ.");
  const settings = normalizeGoogleSheetSettings({
    ...current,
    ...input,
    spreadsheetId: requestedId,
    updatedAt: new Date().toISOString(),
    updatedBy: actor.id || ""
  }, {
    spreadsheetId: googleSheetSyncDefaultId,
    intervalMinutes: googleSheetSyncDefaultIntervalMinutes
  });
  await writeAppMetaValue(db, googleSheetSyncSettingsMetaKey, settings);
  return settings;
}

async function readGoogleSheetSyncState(db) {
  return normalizeGoogleSheetSyncState(await readAppMetaValue(db, googleSheetSyncStateMetaKey));
}

async function writeGoogleSheetSyncState(db, value) {
  const state = normalizeGoogleSheetSyncState(value);
  await writeAppMetaValue(db, googleSheetSyncStateMetaKey, state);
  return state;
}

async function getGoogleSheetSyncStatus(db, req = null) {
  const [settings, syncState, googleStatus] = await Promise.all([
    readGoogleSheetSyncSettings(db),
    readGoogleSheetSyncState(db),
    deadlineNotificationService.getPublicStatus(db, {
      callbackUrl: req ? gmailOAuthRedirectUri(req) : ""
    })
  ]);
  return {
    settings,
    syncState,
    oauth: {
      configured: googleStatus.configured,
      connected: googleStatus.connected,
      accountEmail: googleStatus.accountEmail,
      sheetAccessConnected: googleStatus.sheetAccessConnected,
      missingSheetScope: googleStatus.missingSheetScope,
      driveAccessConnected: googleStatus.driveAccessConnected,
      missingDriveScope: googleStatus.missingDriveScope
    },
    scheduler: {
      processEnabled: googleSheetSyncSchedulerEnabled,
      running: Boolean(googleSheetSyncTimer),
      intervalMinutes: settings.intervalMinutes
    }
  };
}

async function loadGoogleSheetSource(db, options = {}) {
  const settings = await readGoogleSheetSyncSettings(db);
  const spreadsheetId = extractSpreadsheetId(options.spreadsheetId || settings.spreadsheetId);
  if (!spreadsheetId) throw httpError(400, "Chưa cấu hình Google Sheet nguồn.");
  const accessToken = await deadlineNotificationService.getGoogleAccessToken(db, [
    GOOGLE_SHEETS_READONLY_SCOPE
  ]);
  const resource = await fetchGoogleSpreadsheet({
    spreadsheetId,
    accessToken
  });
  const parsed = parseGoogleSpreadsheetImportState(resource);
  if (!stateRecordTotal(parsed.state, GOOGLE_SHEET_SOURCE_COLLECTIONS)) {
    throw httpError(422, "Google Sheet không có dữ liệu nguồn được hỗ trợ.");
  }
  validateWorkbookImportState(parsed.state, { allowLegacyDailyWithoutDate: true });
  return {
    settings: { ...settings, spreadsheetId, spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` },
    spreadsheetId,
    spreadsheetTitle: String(resource?.properties?.title || "Google Sheet"),
    workbook: parsed.workbook,
    importState: parsed.state,
    sourceHash: sourceStateHash(parsed.state)
  };
}

function buildGoogleSheetSyncCandidate(source, existingState, syncState = {}) {
  const importedAt = new Date().toISOString();
  const safetyAudit = auditGoogleSheetSourceSafety(source.importState, existingState, {
    minimumRatio: source.settings.minimumRowRatio
  });
  const preparedImportState = cloneSerializable(source.importState);
  prepareSourceImportState(preparedImportState, {
    importedAt,
    source: "google-sheet",
    targetCollections: GOOGLE_SHEET_SOURCE_COLLECTIONS
  });
  const merged = mergeWorkbookSourceState(existingState, preparedImportState, {
    importedAt,
    source: "google-sheet"
  });
  const goldenAudit = auditWorkbookObjectAgainstSource(source.workbook, merged.state);
  const preservationAudit = auditMergePreservation(existingState, merged.state);
  const ok = safetyAudit.ok && goldenAudit.ok && preservationAudit.ok;
  return {
    ok,
    importedAt,
    sourceHash: source.sourceHash,
    unchanged: Boolean(syncState.lastSourceHash && syncState.lastSourceHash === source.sourceHash),
    spreadsheetId: source.spreadsheetId,
    spreadsheetTitle: source.spreadsheetTitle,
    spreadsheetUrl: source.settings.spreadsheetUrl,
    imported: summarizeImportState(source.importState, GOOGLE_SHEET_SOURCE_COLLECTIONS),
    output: summarizeImportState(merged.state, workbookCollections),
    merge: merged.summary,
    safetyAudit,
    goldenAudit,
    preservationAudit,
    existingState,
    mergedState: merged.state
  };
}

function publicGoogleSheetSyncCandidate(candidate) {
  return {
    ok: candidate.ok,
    importedAt: candidate.importedAt,
    sourceHash: candidate.sourceHash,
    unchanged: candidate.unchanged,
    spreadsheetId: candidate.spreadsheetId,
    spreadsheetTitle: candidate.spreadsheetTitle,
    spreadsheetUrl: candidate.spreadsheetUrl,
    imported: candidate.imported,
    output: candidate.output,
    merge: candidate.merge,
    safetyAudit: candidate.safetyAudit,
    goldenAudit: candidate.goldenAudit,
    preservationAudit: candidate.preservationAudit
  };
}

async function previewGoogleSheetSync(db, options = {}) {
  const source = await loadGoogleSheetSource(db, options);
  const [existingState, syncState] = await Promise.all([
    readState(db),
    readGoogleSheetSyncState(db)
  ]);
  return publicGoogleSheetSyncCandidate(buildGoogleSheetSyncCandidate(source, existingState, syncState));
}

async function runGoogleSheetSync(options = {}) {
  const db = getPool();
  const lockClient = await db.connect();
  const lockName = "squad2-google-sheet-sync-job";
  let locked = false;
  let transactionOpen = false;
  const attemptAt = new Date().toISOString();
  let previousSyncState = normalizeGoogleSheetSyncState();
  try {
    const lockResult = await lockClient.query("select pg_try_advisory_lock(hashtext($1)) as locked", [lockName]);
    locked = Boolean(lockResult.rows[0]?.locked);
    if (!locked) return { skipped: true, reason: "job-already-running" };

    const settings = await readGoogleSheetSyncSettings(lockClient);
    previousSyncState = await readGoogleSheetSyncState(lockClient);
    if (!settings.enabled && !options.force) {
      return { skipped: true, reason: "sync-disabled" };
    }
    await writeGoogleSheetSyncState(lockClient, {
      ...previousSyncState,
      lastAttemptAt: attemptAt,
      lastStatus: "checking",
      lastError: ""
    });

    const source = await loadGoogleSheetSource(lockClient, {
      spreadsheetId: options.spreadsheetId || settings.spreadsheetId
    });
    if (!options.force && previousSyncState.lastSourceHash === source.sourceHash) {
      const unchangedState = await writeGoogleSheetSyncState(lockClient, {
        ...previousSyncState,
        lastAttemptAt: attemptAt,
        lastStatus: "unchanged",
        lastError: "",
        lastSummary: {
          spreadsheetId: source.spreadsheetId,
          spreadsheetTitle: source.spreadsheetTitle,
          imported: summarizeImportState(source.importState, GOOGLE_SHEET_SOURCE_COLLECTIONS),
          changed: false
        }
      });
      return {
        skipped: true,
        reason: "source-unchanged",
        sourceHash: source.sourceHash,
        syncState: unchangedState
      };
    }

    await lockClient.query("begin isolation level repeatable read");
    transactionOpen = true;
    const existingState = await readState(lockClient);
    const candidate = buildGoogleSheetSyncCandidate(source, existingState, previousSyncState);
    if (!candidate.ok) {
      const reasons = [
        ...candidate.safetyAudit.errors,
        ...candidate.goldenAudit.mismatches.slice(0, 8).map((item) => `${item.cell}: ${item.actual} != ${item.expected}`),
        ...candidate.preservationAudit.mismatches
      ];
      throw httpError(422, `Google Sheet chưa vượt qua kiểm tra an toàn: ${reasons.join("; ") || "không xác định"}`);
    }

    const snapshot = await createImportSnapshot(lockClient, {
      sourceName: `google-sheet-${source.spreadsheetTitle}.xlsx`,
      sourceSha256: source.sourceHash,
      actorId: options.actorId || null
    });
    const persistence = await persistMergedWorkbookState(
      lockClient,
      existingState,
      candidate.mergedState,
      options.actorId || null
    );
    const updatedAt = await touchMeta(lockClient);
    const persistedState = await readState(lockClient);
    const persistenceAudit = auditPersistedMergeState(candidate.mergedState, persistedState);
    if (!persistenceAudit.ok) {
      throw httpError(500, `Xác minh sau đồng bộ thất bại: ${persistenceAudit.mismatches.slice(0, 8).join("; ")}`);
    }
    await lockClient.query("commit");
    transactionOpen = false;

    const summary = {
      spreadsheetId: source.spreadsheetId,
      spreadsheetTitle: source.spreadsheetTitle,
      imported: candidate.imported,
      output: candidate.output,
      merge: candidate.merge,
      persistence,
      goldenCheckedCells: candidate.goldenAudit.checkedCells,
      preservedManual: candidate.preservationAudit.preservedManual,
      changed: true,
      updatedAt
    };
    const syncState = await writeGoogleSheetSyncState(lockClient, {
      ...previousSyncState,
      lastAttemptAt: attemptAt,
      lastSuccessAt: new Date().toISOString(),
      lastSourceHash: source.sourceHash,
      lastStatus: "success",
      lastError: "",
      lastSnapshotId: snapshot.id,
      lastSummary: summary
    });
    return {
      skipped: false,
      ok: true,
      sourceHash: source.sourceHash,
      snapshotId: snapshot.id,
      snapshotRecords: snapshot.recordCount,
      persistence,
      persistenceAudit,
      preview: publicGoogleSheetSyncCandidate(candidate),
      syncState
    };
  } catch (error) {
    if (transactionOpen) {
      await lockClient.query("rollback").catch(() => {});
      transactionOpen = false;
    }
    await writeGoogleSheetSyncState(lockClient, {
      ...previousSyncState,
      lastAttemptAt: attemptAt,
      lastStatus: "failed",
      lastError: publicError(error),
      lastSummary: previousSyncState.lastSummary
    }).catch(() => {});
    throw error;
  } finally {
    if (transactionOpen) await lockClient.query("rollback").catch(() => {});
    if (locked) await lockClient.query("select pg_advisory_unlock(hashtext($1))", [lockName]).catch(() => {});
    lockClient.release();
  }
}

async function runDeadlineNotificationJob(options = {}) {
  await ensureSchema();
  return deadlineNotificationService.run(getPool(), options);
}

function startDeadlineNotificationScheduler() {
  if (!deadlineSchedulerEnabled || deadlineSchedulerTimer) return;
  const scheduleNext = () => {
    const nextRun = nextDailyRunAt(new Date(), deadlineSchedulerUtcHour);
    const delay = Math.max(1000, nextRun.getTime() - Date.now());
    console.log(`Deadline reminder scheduler: next run ${nextRun.toISOString()}`);
    deadlineSchedulerTimer = setTimeout(async () => {
      deadlineSchedulerTimer = null;
      try {
        const result = await runDeadlineNotificationJob();
        console.log("Deadline reminder scheduler completed:", JSON.stringify(result));
      } catch (error) {
        console.error("Deadline reminder scheduler failed:", error);
      } finally {
        scheduleNext();
      }
    }, delay);
    deadlineSchedulerTimer.unref?.();
  };
  scheduleNext();
}

function startGoogleSheetSyncScheduler() {
  scheduleNextGoogleSheetSync({ startup: true }).catch((error) => {
    console.error("Google Sheet sync scheduler failed to start:", error);
  });
}

async function scheduleNextGoogleSheetSync(options = {}) {
  if (options.reset && googleSheetSyncTimer) {
    clearTimeout(googleSheetSyncTimer);
    googleSheetSyncTimer = null;
  }
  if (!googleSheetSyncSchedulerEnabled || googleSheetSyncTimer) return;
  await ensureSchema();
  const settings = await readGoogleSheetSyncSettings(getPool());
  if (!settings.enabled) return;
  const startupDelayMs = Math.max(1000, Number(process.env.GOOGLE_SHEET_SYNC_STARTUP_DELAY_MS || 15000));
  const intervalMs = settings.intervalMinutes * 60 * 1000;
  const delay = options.startup ? startupDelayMs : intervalMs;
  const nextRun = new Date(Date.now() + delay);
  console.log(`Google Sheet sync scheduler: next run ${nextRun.toISOString()}`);
  googleSheetSyncTimer = setTimeout(async () => {
    googleSheetSyncTimer = null;
    try {
      const result = await runGoogleSheetSync();
      console.log("Google Sheet sync scheduler completed:", JSON.stringify(result));
    } catch (error) {
      console.error("Google Sheet sync scheduler failed:", error);
    } finally {
      scheduleNextGoogleSheetSync().catch((error) => {
        console.error("Google Sheet sync scheduler failed to reschedule:", error);
      });
    }
  }, delay);
  googleSheetSyncTimer.unref?.();
}

async function closeDatabase() {
  if (!pool) return;
  const activePool = pool;
  pool = null;
  schemaPromise = null;
  await activePool.end();
}

async function shutdown() {
  if (deadlineSchedulerTimer) clearTimeout(deadlineSchedulerTimer);
  deadlineSchedulerTimer = null;
  if (googleSheetSyncTimer) clearTimeout(googleSheetSyncTimer);
  googleSheetSyncTimer = null;
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
}
