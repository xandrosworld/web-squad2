const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");
const {
  buildExcelWorkbook,
  parseWorkbookImportState,
  __testEmptyState: emptyState,
  __testPreservePersonnelExtendedFields: preservePersonnelExtendedFields,
  __testValidateRecordForCollection: validateRecord
} = require("../server");

(async () => {
  const person = {
    id: "personnel-field-check",
    staffCode: "NV99",
    name: "Nhân sự kiểm thử",
    role: "Tester",
    scope: "Kiểm tra trường nhân sự",
    status: "Hoạt động",
    birthYear: 1992,
    phone: "0900000000",
    email: "personnel-field-check@bidv.com.vn",
    unit: "Đơn vị kiểm thử",
    bidvJoinDate: "2018-08-15",
    salaryGrade: "Cấp 5",
    salaryStep: "Bậc 3"
  };
  assert.doesNotThrow(() => validateRecord("personnel", person));
  assert.throws(
    () => validateRecord("personnel", { ...person, bidvJoinDate: "2018-99-99" }),
    /Ngày vào BIDV không hợp lệ/
  );

  const state = emptyState();
  state.personnel = [person];
  const exported = buildExcelWorkbook(state);
  const personnelSheet = exported.getWorksheet("NhanSu_UAT");
  assert.ok(personnelSheet, "File xuất phải có sheet NhanSu_UAT.");
  assert.deepEqual(personnelSheet.getRow(1).values.slice(1), [
    "Mã nhân sự",
    "Họ tên",
    "Vai trò",
    "Phạm vi chính",
    "Trạng thái",
    "Năm sinh",
    "SĐT",
    "Email",
    "Đơn vị",
    "Ngày vào BIDV",
    "Cấp lương",
    "Bậc lương"
  ]);
  assert.equal(personnelSheet.getRow(2).getCell(10).value.toISOString().slice(0, 10), "2018-08-15");
  assert.equal(personnelSheet.getRow(2).getCell(11).value, "Cấp 5");
  assert.equal(personnelSheet.getRow(2).getCell(12).value, "Bậc 3");

  const source = new ExcelJS.Workbook();
  const sourceSheet = source.addWorksheet("NhanSu_UAT");
  sourceSheet.getRow(4).values = [
    "NV99",
    "Nhân sự kiểm thử",
    "Tester",
    "Kiểm tra trường nhân sự",
    "Hoạt động",
    1992,
    "0900000000",
    "personnel-field-check@bidv.com.vn",
    "Đơn vị kiểm thử",
    new Date("2018-08-15T00:00:00.000Z"),
    "Cấp 5",
    "Bậc 3"
  ];
  sourceSheet.getRow(5).values = [
    "NV98",
    "Nhân sự dữ liệu cũ",
    "Tester",
    "Kiểm tra tương thích",
    "Hoạt động",
    1993,
    "",
    "legacy-personnel@bidv.com.vn",
    "Đơn vị kiểm thử"
  ];
  const imported = await parseWorkbookImportState(await source.xlsx.writeBuffer());
  const importedPerson = imported.personnel.find((row) => row.staffCode === "NV99");
  assert.equal(importedPerson.bidvJoinDate, "2018-08-15");
  assert.equal(importedPerson.salaryGrade, "Cấp 5");
  assert.equal(importedPerson.salaryStep, "Bậc 3");
  const legacyPerson = imported.personnel.find((row) => row.staffCode === "NV98");
  assert.equal(legacyPerson.bidvJoinDate, "");
  assert.equal(legacyPerson.salaryGrade, "");
  assert.equal(legacyPerson.salaryStep, "");

  const legacyImportState = {
    personnel: [{
      id: person.id,
      staffCode: person.staffCode,
      email: person.email,
      bidvJoinDate: "",
      salaryGrade: "",
      salaryStep: ""
    }],
    _personnelImportFields: {
      bidvJoinDate: false,
      salaryGrade: false,
      salaryStep: false
    }
  };
  const existingRows = [{
    collection: "personnel",
    id: person.id,
    data: { ...person, _import: { source: "workbook" } }
  }];
  assert.equal(preservePersonnelExtendedFields(legacyImportState, existingRows), 3);
  assert.equal(legacyImportState.personnel[0].bidvJoinDate, "2018-08-15");
  assert.equal(legacyImportState.personnel[0].salaryGrade, "Cấp 5");
  assert.equal(legacyImportState.personnel[0].salaryStep, "Bậc 3");

  const explicitBlankState = {
    personnel: [{ ...legacyImportState.personnel[0], bidvJoinDate: "", salaryGrade: "", salaryStep: "" }],
    _personnelImportFields: {
      bidvJoinDate: true,
      salaryGrade: true,
      salaryStep: true
    }
  };
  assert.equal(preservePersonnelExtendedFields(explicitBlankState, existingRows), 0);
  assert.equal(explicitBlankState.personnel[0].bidvJoinDate, "");

  console.log(JSON.stringify({
    ok: true,
    checked: {
      apiValidation: true,
      excelExport: true,
      excelImport: true,
      legacyWorkbookCompatibility: true,
      legacyImportPreservesWebValues: true
    }
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
