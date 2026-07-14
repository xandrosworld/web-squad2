const assert = require("node:assert/strict");
const {
  __testCanEditRecord: canEditRecord,
  __testCanDeleteRecord: canDeleteRecord,
  __testCanFullyManageWorkItem: canFullyManageWorkItem,
  __testDecorateRecord: decorateRecord,
  __testEnforceWorkItemGroupEditorScope: enforceWorkItemGroupEditorScope
} = require("../server");

const phuong = {
  id: "user-phuong",
  username: "phuongbtm@bidv.com.vn",
  email: "phuongbtm@bidv.com.vn",
  name: "Bùi Thị Mai Phương",
  role: "user"
};
const anotherUser = {
  id: "user-other",
  username: "tuanpa13@bidv.com.vn",
  email: "tuanpa13@bidv.com.vn",
  name: "Phạm Anh Tuấn",
  role: "user"
};
const t07Record = {
  created_by: null,
  data: {
    id: "t07-seeded-task",
    categoryId: "pilot-t07",
    taskId: "SQ2-T07-001",
    title: "Tài liệu đào tạo"
  }
};
const t08Record = {
  created_by: null,
  data: {
    id: "t08-seeded-task",
    categoryId: "pilot-t08",
    taskId: "SQ2-T08-001",
    title: "Tham gia ý kiến"
  }
};

assert.equal(canEditRecord(phuong, t07Record), true, "Phương phải được sửa công việc T07.");
assert.equal(canFullyManageWorkItem(phuong, t07Record), true, "Phương phải được mở form kế hoạch đầy đủ tại T07.");
assert.equal(canDeleteRecord(phuong, t07Record), false, "Quyền T07 không được tự mở quyền xóa bản ghi có sẵn.");
assert.equal(canEditRecord(phuong, t08Record), false, "Phương không được sửa công việc ngoài T07.");
assert.equal(canFullyManageWorkItem(phuong, t08Record), false, "Phương không được quản lý kế hoạch ngoài T07.");
assert.equal(canEditRecord(anotherUser, t07Record), false, "Người dùng khác không được hưởng quyền T07 của Phương.");

const incoming = { ...t07Record.data, categoryId: "pilot-t08", title: "Đã sửa" };
assert.equal(enforceWorkItemGroupEditorScope(phuong, t07Record, incoming), true);
assert.equal(incoming.categoryId, "pilot-t07", "Editor T07 không được chuyển công việc sang nhóm khác.");

const decorated = decorateRecord({
  ...t07Record,
  updated_by: null,
  created_at: new Date(),
  updated_at: new Date(),
  creator_name: null,
  creator_email: null,
  creator_username: null
}, phuong);
assert.equal(decorated._ownership.isGroupEditor, true);
assert.equal(decorated._ownership.canManage, true);
assert.equal(decorated._ownership.canEdit, true);
assert.equal(decorated._ownership.canDelete, false);

console.log("T07 group editor policy check passed.");
