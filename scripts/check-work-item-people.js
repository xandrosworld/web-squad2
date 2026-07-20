const assert = require("node:assert/strict");
const {
  __testNormalizeWorkItemPeople: normalizeWorkItemPeople,
  __testWorkItemAssignees: workItemAssignees,
  __testWorkItemBusinessContacts: workItemBusinessContacts,
  __testCanEditRecord: canEditRecord,
  __testDecorateRecord: decorateRecord,
  __testValidateRecordForCollection: validateRecord
} = require("../server");

const legacy = normalizeWorkItemPeople({
  id: "legacy",
  assignee: "Nguyễn Gia Huy",
  assigneeEmail: "huyng@bidv.com.vn",
  collaborators: "Nguyễn Châu Giang; Trần Đình Tuấn"
});
assert.deepEqual(legacy.assignees, [{ name: "Nguyễn Gia Huy", email: "huyng@bidv.com.vn" }]);
assert.deepEqual(legacy.businessContacts, [
  { name: "Nguyễn Châu Giang", email: "giangnc2@bidv.com.vn" },
  { name: "Trần Đình Tuấn", email: "tuantd3@bidv.com.vn" }
]);

const multi = normalizeWorkItemPeople({
  id: "multi",
  assignees: [
    { name: "Nguyễn Gia Huy", email: "HUYNG@BIDV.COM.VN" },
    { name: "Huỳnh Công Sinh", email: "sinhhc@bidv.com.vn" },
    { name: "Huy bị trùng", email: "huyng@bidv.com.vn" }
  ],
  businessContacts: [
    { name: "Bùi Thị Mai Phương", email: "phuongbtm@bidv.com.vn" }
  ]
});
assert.equal(multi.assignees.length, 2, "Email trùng phải được loại bỏ.");
assert.equal(multi.assignee, "Nguyễn Gia Huy", "Field tương thích phải giữ người đầu tiên.");
assert.equal(multi.assigneeEmail, "huyng@bidv.com.vn");
assert.equal(multi.collaborators, "Bùi Thị Mai Phương");
assert.equal(workItemAssignees(multi).length, 2);
assert.equal(workItemBusinessContacts(multi).length, 1);

const canonicalIdentity = normalizeWorkItemPeople({
  id: "canonical-identity",
  assignees: [
    { name: "Bui Thi Mai Phuong", email: "" },
    { name: "Bùi Thị Mai Phương", email: "phuongbtm@bidv.com.vn" }
  ],
  businessContacts: [
    { name: "Bui Thi Mai Phuong", email: "" }
  ]
});
assert.deepEqual(canonicalIdentity.assignees, [
  { name: "Bùi Thị Mai Phương", email: "phuongbtm@bidv.com.vn" }
], "Tên không dấu và bản ghi chuẩn phải được hợp nhất thành một người.");
assert.deepEqual(canonicalIdentity.businessContacts, [
  { name: "Bùi Thị Mai Phương", email: "phuongbtm@bidv.com.vn" }
], "Đầu mối nghiệp vụ phải dùng cùng danh tính chuẩn.");
assert.equal(canonicalIdentity.assignee, "Bùi Thị Mai Phương");
assert.equal(canonicalIdentity.assigneeEmail, "phuongbtm@bidv.com.vn");
assert.equal(canonicalIdentity.collaborators, "Bùi Thị Mai Phương");

const emailWins = normalizeWorkItemPeople({
  id: "email-wins",
  assignees: [{ name: "Bui Thi Mai Phuong", email: "huyng@bidv.com.vn" }]
});
assert.deepEqual(emailWins.assignees, [
  { name: "Nguyễn Gia Huy", email: "huyng@bidv.com.vn" }
], "Email hợp lệ phải là khóa định danh ưu tiên khi tên và email xung đột.");

const secondAssignee = {
  id: "user-sinh",
  username: "sinhhc",
  email: "sinhhc@bidv.com.vn",
  name: "Huỳnh Công Sinh",
  role: "user"
};
const stored = {
  created_by: "someone-else",
  data: {
    ...multi,
    title: "Công việc nhiều người",
    categoryId: "delivery-rsd",
    status: "Đang thực hiện",
    progress: 50
  },
  created_at: new Date(),
  updated_at: new Date()
};
assert.equal(canEditRecord(secondAssignee, stored), true, "Mọi người thực hiện phải được cập nhật tiến độ.");
const decorated = decorateRecord(stored, secondAssignee);
assert.equal(decorated._ownership.isLinkedOwner, true);
assert.equal(decorated._ownership.linkedOwnerEmail, "sinhhc@bidv.com.vn");
assert.doesNotThrow(() => validateRecord("workItems", stored.data));

console.log(JSON.stringify({
  ok: true,
  checked: {
    legacyMigration: true,
    duplicateEmailRemoval: true,
    canonicalIdentityNormalization: true,
    multipleAssigneePermission: true,
    businessContactsSeparated: true
  }
}, null, 2));
