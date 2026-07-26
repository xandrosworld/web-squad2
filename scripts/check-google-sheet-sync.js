const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const {
  GOOGLE_SHEET_REQUIRED_TABS,
  spreadsheetGridToWorkbook,
  auditGoogleSheetSourceSafety,
  sourceStateHash,
  normalizeGoogleSheetSettings,
  extractSpreadsheetId
} = require("../google-sheet-sync");
const {
  parseWorkbookImportState,
  parseGoogleSpreadsheetImportState,
  mergeWorkbookSourceState,
  auditWorkbookObjectAgainstSource,
  auditMergePreservation,
  validateWorkbookImportState
} = require("../server");

function cell(value, options = {}) {
  const effectiveValue = typeof value === "number"
    ? { numberValue: value }
    : typeof value === "boolean"
      ? { boolValue: value }
      : { stringValue: String(value ?? "") };
  return {
    effectiveValue,
    formattedValue: options.formattedValue ?? String(value ?? ""),
    userEnteredValue: options.formula ? { formulaValue: options.formula } : effectiveValue,
    hyperlink: options.hyperlink,
    effectiveFormat: {
      numberFormat: options.numberFormat ? { pattern: options.numberFormat } : undefined,
      textFormat: { strikethrough: Boolean(options.strike) }
    }
  };
}

function sheet(title, rows = []) {
  return {
    properties: { title },
    data: [{
      startRow: 0,
      startColumn: 0,
      rowData: rows.map((values) => ({ values })),
      rowMetadata: rows.map((_, index) => ({ hiddenByUser: index === 2 }))
    }]
  };
}

const resource = {
  properties: { title: "Squad 2 UAT" },
  sheets: GOOGLE_SHEET_REQUIRED_TABS.map((title) => sheet(title, title === "DieuHanh_Ngay"
    ? [
      [cell("Ngày"), cell("Mã Jira")],
      [cell(46200, { formattedValue: "27/06/2026", numberFormat: "dd/mm/yyyy" }), cell("PS01", { hyperlink: "https://example.test/PS01" })],
      [cell(3, { formula: "=1+2" }), cell("Đã hủy", { strike: true })]
    ]
    : [[cell(title)]]
  ))
};

const workbook = spreadsheetGridToWorkbook(resource);
assert.deepStrictEqual(workbook.worksheets.map((worksheet) => worksheet.name), GOOGLE_SHEET_REQUIRED_TABS);
const daily = workbook.getWorksheet("DieuHanh_Ngay");
assert.strictEqual(daily.getCell("A2").value, 46200, "Ngày phải giữ serial để parser Excel xử lý chính xác");
assert.strictEqual(daily.getCell("A2").numFmt, "dd/mm/yyyy");
assert.strictEqual(daily.getCell("B2").value.hyperlink, "https://example.test/PS01");
assert.strictEqual(daily.getCell("A3").result, 3, "Công thức phải dùng effective result của Google");
assert.strictEqual(daily.getCell("B3").font.strike, true);
assert.strictEqual(daily.getRow(3).hidden, true);

const baseState = {
  daily: [{ id: "daily-1" }, { id: "daily-2" }],
  defects: [{ id: "defect-1", bugId: "BUG-1" }],
  userStories: [{ id: "us-1", issueKey: "US-1" }],
  bugSources: [{ id: "source-1", issueKey: "BUG-1" }],
  defectSummary: [{ id: "summary-1", jiraCode: "SQ02_CN001_001" }]
};
const safeImport = JSON.parse(JSON.stringify(baseState));
const safeAudit = auditGoogleSheetSourceSafety(safeImport, baseState);
assert.strictEqual(safeAudit.ok, true);

const duplicateImport = JSON.parse(JSON.stringify(baseState));
duplicateImport.defects.push({ id: "defect-2", bugId: "BUG-1" });
const duplicateAudit = auditGoogleSheetSourceSafety(duplicateImport, baseState);
assert.strictEqual(duplicateAudit.ok, false);
assert.ok(duplicateAudit.errors.some((message) => message.includes("trùng khóa nghiệp vụ")));

const largeExisting = {
  ...baseState,
  userStories: Array.from({ length: 10 }, (_, index) => ({
    id: `us-${index}`,
    issueKey: `US-${index}`,
    _import: { source: "google-sheet" }
  }))
};
const rowLossImport = {
  ...safeImport,
  userStories: [{ id: "us-0", issueKey: "US-0" }]
};
const rowLossAudit = auditGoogleSheetSourceSafety(rowLossImport, largeExisting, { minimumRatio: 0.5 });
assert.strictEqual(rowLossAudit.ok, false);
assert.ok(rowLossAudit.errors.some((message) => message.includes("ngưỡng an toàn")));

const firstHash = sourceStateHash(safeImport);
const timestampOnlyChange = JSON.parse(JSON.stringify(safeImport));
timestampOnlyChange.defects[0].updatedAt = new Date().toISOString();
timestampOnlyChange.defects[0]._import = { importedAt: new Date().toISOString() };
assert.strictEqual(sourceStateHash(timestampOnlyChange), firstHash, "Hash không được đổi vì metadata đồng bộ");
timestampOnlyChange.defects[0].status = "Closed";
assert.notStrictEqual(sourceStateHash(timestampOnlyChange), firstHash, "Hash phải đổi khi dữ liệu nghiệp vụ đổi");

const id = "1DLdeQEDo9FqGAFJIb35-sazm6xhf6laTISuCDPSwuH8";
assert.strictEqual(extractSpreadsheetId(`https://docs.google.com/spreadsheets/d/${id}/edit`), id);
assert.strictEqual(extractSpreadsheetId("not-a-sheet"), "");
const settings = normalizeGoogleSheetSettings({ spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`, intervalMinutes: 500 });
assert.strictEqual(settings.spreadsheetId, id);
assert.strictEqual(settings.intervalMinutes, 60);
assert.strictEqual(settings.enabled, true);

const legacyDailyWithoutDate = {
  daily: [{
    id: "legacy-daily-without-date",
    date: "",
    tester: "Hoàng Thành Trí"
  }]
};
assert.throws(
  () => validateWorkbookImportState(legacyDailyWithoutDate),
  /date/,
  "Import workbook thông thường vẫn phải bắt buộc ngày"
);
assert.doesNotThrow(
  () => validateWorkbookImportState(legacyDailyWithoutDate, { allowLegacyDailyWithoutDate: true }),
  "Google Sheet phải giữ được dòng legacy thiếu ngày đã có trong nguồn thật"
);

function excelValueToGridValue(value) {
  if (value == null || value === "") return {};
  if (value instanceof Date) {
    return { numberValue: (value.getTime() - Date.UTC(1899, 11, 30)) / 86400000 };
  }
  if (typeof value === "number") return { numberValue: value };
  if (typeof value === "boolean") return { boolValue: value };
  if (typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "error")) return { errorValue: { type: "ERROR", message: String(value.error) } };
    if (Object.prototype.hasOwnProperty.call(value, "text")) return { stringValue: String(value.text || "") };
    if (Array.isArray(value.richText)) return { stringValue: value.richText.map((part) => part.text || "").join("") };
  }
  return { stringValue: String(value) };
}

function workbookToGridResource(workbook) {
  return {
    properties: { title: "Excel 26.7 mô phỏng Google Sheet" },
    sheets: GOOGLE_SHEET_REQUIRED_TABS.map((title) => {
      const worksheet = workbook.getWorksheet(title);
      assert.ok(worksheet, `Workbook kiểm thử thiếu tab ${title}`);
      const rowData = [];
      const rowMetadata = [];
      for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
        const row = worksheet.getRow(rowNumber);
        const values = [];
        for (let column = 1; column <= row.cellCount; column += 1) {
          const source = row.getCell(column);
          const raw = source.value;
          const formula = source.formula || (raw && typeof raw === "object" ? raw.formula : "");
          const result = formula ? source.result : raw;
          const effectiveValue = excelValueToGridValue(result);
          values.push({
            effectiveValue,
            formattedValue: source.text || "",
            userEnteredValue: formula
              ? { formulaValue: `=${formula}` }
              : excelValueToGridValue(raw),
            hyperlink: source.hyperlink || raw?.hyperlink,
            note: typeof source.note === "string" ? source.note : undefined,
            effectiveFormat: {
              numberFormat: source.numFmt ? { pattern: source.numFmt } : undefined,
              textFormat: { strikethrough: Boolean(source.font?.strike) }
            }
          });
        }
        rowData.push({ values });
        rowMetadata.push({ hiddenByUser: Boolean(row.hidden) });
      }
      return {
        properties: { title, hidden: worksheet.state === "hidden" },
        data: [{ startRow: 0, startColumn: 0, rowData, rowMetadata }]
      };
    })
  };
}

async function checkRealWorkbookRoundTrip() {
  const workbookPath = path.join(__dirname, "..", "SQ02_UAT_Squad2_QuanLy_US_Date-new-26.7.xlsx");
  if (!fs.existsSync(workbookPath)) return { skipped: true };
  const buffer = fs.readFileSync(workbookPath);
  const directState = await parseWorkbookImportState(buffer);
  const excelWorkbook = new ExcelJS.Workbook();
  await excelWorkbook.xlsx.load(buffer);
  const resource = workbookToGridResource(excelWorkbook);
  const parsed = parseGoogleSpreadsheetImportState(resource);

  for (const collection of ["daily", "defects", "userStories", "bugSources", "defectSummary"]) {
    assert.strictEqual(
      parsed.state[collection].length,
      directState[collection].length,
      `${collection} phải có cùng số dòng khi đọc qua Google GridData`
    );
  }
  const safety = auditGoogleSheetSourceSafety(parsed.state, directState);
  assert.strictEqual(safety.ok, true, safety.errors.join("; "));
  const merged = mergeWorkbookSourceState(directState, parsed.state, {
    importedAt: "2026-07-26T00:00:00.000Z",
    source: "google-sheet"
  });
  const golden = auditWorkbookObjectAgainstSource(parsed.workbook, merged.state);
  assert.strictEqual(golden.ok, true, JSON.stringify(golden.mismatches.slice(0, 10)));
  const preservation = auditMergePreservation(directState, merged.state);
  assert.strictEqual(preservation.ok, true, preservation.mismatches.join("; "));
  return {
    skipped: false,
    counts: Object.fromEntries(["daily", "defects", "userStories", "bugSources", "defectSummary"]
      .map((collection) => [collection, parsed.state[collection].length])),
    checkedCells: golden.checkedCells
  };
}

checkRealWorkbookRoundTrip()
  .then((result) => {
    const detail = result.skipped
      ? "real workbook not present; integration round-trip skipped"
      : `real workbook round-trip ${JSON.stringify(result.counts)}, ${result.checkedCells} golden cells`;
    console.log(`Google Sheet sync checks passed: GridData conversion, formulas, links, hidden/struck rows, source hashing, duplicate and row-loss guards; ${detail}.`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
