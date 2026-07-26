const crypto = require("crypto");
const ExcelJS = require("exceljs");

const GOOGLE_SHEETS_READONLY_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const DEFAULT_GOOGLE_SHEET_ID = "1DLdeQEDo9FqGAFJIb35-sazm6xhf6laTISuCDPSwuH8";
const GOOGLE_SHEET_SOURCE_COLLECTIONS = Object.freeze([
  "daily",
  "defects",
  "userStories",
  "bugSources",
  "defectSummary"
]);
const GOOGLE_SHEET_SOURCE_RANGES = Object.freeze([
  "DieuHanh_Ngay!A1:N5000",
  "DEFECT_LOG!A1:M5000",
  "DS_US!A1:P5000",
  "'DS.Loi'!A1:T5000",
  "'Tong hop loi'!A1:AH5000",
  "DEFECT_Dashboard!A1:O80"
]);
const GOOGLE_SHEET_REQUIRED_TABS = Object.freeze([
  "DieuHanh_Ngay",
  "DEFECT_LOG",
  "DS_US",
  "DS.Loi",
  "Tong hop loi",
  "DEFECT_Dashboard"
]);

async function fetchGoogleSpreadsheet(options = {}) {
  const spreadsheetId = extractSpreadsheetId(options.spreadsheetId);
  const accessToken = String(options.accessToken || "").trim();
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const ranges = Array.isArray(options.ranges) && options.ranges.length
    ? options.ranges
    : GOOGLE_SHEET_SOURCE_RANGES;
  if (!spreadsheetId) throw createPublicError(400, "Google Sheet ID không hợp lệ.");
  if (!accessToken) throw createPublicError(409, "Chưa có quyền đọc Google Sheet.");
  if (typeof fetchImpl !== "function") throw createPublicError(500, "Môi trường Node chưa hỗ trợ fetch.");

  const query = new URLSearchParams({ includeGridData: "true" });
  ranges.forEach((range) => query.append("ranges", range));
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?${query.toString()}`;
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(Number(options.timeoutMs || 60000))
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { error: { message: text || `HTTP ${response.status}` } };
  }
  if (!response.ok) {
    const reason = payload?.error?.message || payload?.error_description || `HTTP ${response.status}`;
    const message = response.status === 403
      ? `Google chưa cho phép đọc bảng tính. Hãy bật Google Sheets API và kết nối lại tài khoản (${reason}).`
      : `Không đọc được Google Sheet (${reason}).`;
    throw createPublicError(response.status === 401 ? 409 : 502, message);
  }
  assertRequiredTabs(payload);
  return payload;
}

function spreadsheetGridToWorkbook(resource, options = {}) {
  const workbook = new ExcelJS.Workbook();
  const allowedTabs = new Set(options.sheetNames || GOOGLE_SHEET_REQUIRED_TABS);
  for (const sheetResource of resource?.sheets || []) {
    const properties = sheetResource?.properties || {};
    const title = String(properties.title || "").trim();
    if (!title || !allowedTabs.has(title)) continue;
    const worksheet = workbook.addWorksheet(title, {
      state: properties.hidden ? "hidden" : "visible"
    });

    for (const grid of sheetResource.data || []) {
      const startRow = Number(grid.startRow || 0);
      const startColumn = Number(grid.startColumn || 0);
      for (let rowOffset = 0; rowOffset < (grid.rowData || []).length; rowOffset += 1) {
        const sourceRow = grid.rowData[rowOffset] || {};
        const rowNumber = startRow + rowOffset + 1;
        const worksheetRow = worksheet.getRow(rowNumber);
        const rowMetadata = grid.rowMetadata?.[rowOffset] || {};
        worksheetRow.hidden = Boolean(rowMetadata.hiddenByUser || rowMetadata.hiddenByFilter);
        if (Number(rowMetadata.pixelSize) > 0) worksheetRow.height = pointsFromPixels(rowMetadata.pixelSize);

        for (let columnOffset = 0; columnOffset < (sourceRow.values || []).length; columnOffset += 1) {
          const sourceCell = sourceRow.values[columnOffset] || {};
          const columnNumber = startColumn + columnOffset + 1;
          const targetCell = worksheetRow.getCell(columnNumber);
          assignGridCell(targetCell, sourceCell);
        }
      }

      for (let columnOffset = 0; columnOffset < (grid.columnMetadata || []).length; columnOffset += 1) {
        const metadata = grid.columnMetadata[columnOffset] || {};
        const column = worksheet.getColumn(startColumn + columnOffset + 1);
        column.hidden = Boolean(metadata.hiddenByUser);
        if (Number(metadata.pixelSize) > 0) column.width = Math.max(1, Number(metadata.pixelSize) / 7);
      }
    }

    for (const merge of sheetResource.merges || []) {
      const startRow = Number(merge.startRowIndex || 0) + 1;
      const endRow = Number(merge.endRowIndex || startRow);
      const startColumn = Number(merge.startColumnIndex || 0) + 1;
      const endColumn = Number(merge.endColumnIndex || startColumn);
      if (endRow < startRow || endColumn < startColumn) continue;
      try {
        worksheet.mergeCells(startRow, startColumn, endRow, endColumn);
      } catch {
        // Overlapping source merges are ignored; cell values remain available.
      }
    }
  }
  assertRequiredTabs({
    sheets: workbook.worksheets.map((worksheet) => ({ properties: { title: worksheet.name } }))
  });
  return workbook;
}

function assignGridCell(targetCell, sourceCell) {
  const formula = String(sourceCell?.userEnteredValue?.formulaValue || "").replace(/^=/, "");
  const effective = gridEffectiveValue(sourceCell);
  const hyperlink = gridCellHyperlink(sourceCell);
  const displayText = String(sourceCell?.formattedValue ?? "");

  if (hyperlink && !formula) {
    targetCell.value = {
      text: displayText || String(effective ?? hyperlink),
      hyperlink
    };
  } else if (formula && effective !== undefined) {
    targetCell.value = { formula, result: effective };
  } else if (formula) {
    targetCell.value = sourceCell?.effectiveValue?.errorValue ? "########" : displayText;
  } else if (effective !== undefined) {
    targetCell.value = effective;
  } else if (displayText) {
    targetCell.value = displayText;
  }

  const format = sourceCell?.effectiveFormat || sourceCell?.userEnteredFormat || {};
  const textFormat = format.textFormat || {};
  const fontColor = googleColorToArgb(textFormat.foregroundColorStyle || textFormat.foregroundColor);
  const fillColor = googleColorToArgb(format.backgroundColorStyle || format.backgroundColor);
  targetCell.font = {
    name: textFormat.fontFamily || undefined,
    size: Number(textFormat.fontSize) || undefined,
    bold: Boolean(textFormat.bold),
    italic: Boolean(textFormat.italic),
    underline: Boolean(textFormat.underline),
    strike: Boolean(textFormat.strikethrough),
    color: fontColor ? { argb: fontColor } : undefined
  };
  if (fillColor) {
    targetCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: fillColor }
    };
  }
  if (format.numberFormat?.pattern) targetCell.numFmt = format.numberFormat.pattern;
  if (format.horizontalAlignment || format.verticalAlignment || format.wrapStrategy) {
    targetCell.alignment = {
      horizontal: normalizeHorizontalAlignment(format.horizontalAlignment),
      vertical: normalizeVerticalAlignment(format.verticalAlignment),
      wrapText: ["WRAP", "LEGACY_WRAP"].includes(format.wrapStrategy)
    };
  }
  if (sourceCell?.note) targetCell.note = String(sourceCell.note);
}

function gridEffectiveValue(sourceCell) {
  const value = sourceCell?.effectiveValue;
  if (!value || typeof value !== "object") return undefined;
  if (Object.prototype.hasOwnProperty.call(value, "numberValue")) return Number(value.numberValue);
  if (Object.prototype.hasOwnProperty.call(value, "stringValue")) return String(value.stringValue);
  if (Object.prototype.hasOwnProperty.call(value, "boolValue")) return Boolean(value.boolValue);
  if (value.errorValue) return "########";
  return undefined;
}

function gridCellHyperlink(sourceCell) {
  if (sourceCell?.hyperlink) return String(sourceCell.hyperlink);
  const direct = sourceCell?.effectiveFormat?.textFormat?.link?.uri
    || sourceCell?.userEnteredFormat?.textFormat?.link?.uri;
  if (direct) return String(direct);
  for (const run of sourceCell?.textFormatRuns || []) {
    const url = run?.format?.link?.uri;
    if (url) return String(url);
  }
  return "";
}

function assertRequiredTabs(resource) {
  const titles = new Set((resource?.sheets || []).map((sheet) => String(sheet?.properties?.title || "")));
  const missing = GOOGLE_SHEET_REQUIRED_TABS.filter((title) => !titles.has(title));
  if (missing.length) {
    throw createPublicError(422, `Google Sheet thiếu tab bắt buộc: ${missing.join(", ")}.`);
  }
}

function auditGoogleSheetSourceSafety(importState, existingState, options = {}) {
  const errors = [];
  const warnings = [];
  const minimumRatio = Math.max(0.1, Math.min(1, Number(options.minimumRatio || 0.5)));
  const counts = {};
  const identityFields = {
    defects: ["bugId"],
    userStories: ["issueKey"],
    bugSources: ["issueKey"],
    defectSummary: ["jiraCode", "usKey", "name"]
  };

  for (const collection of GOOGLE_SHEET_SOURCE_COLLECTIONS) {
    const incomingRows = Array.isArray(importState?.[collection]) ? importState[collection] : [];
    const currentRows = Array.isArray(existingState?.[collection]) ? existingState[collection] : [];
    const managedRows = currentRows.filter(isManagedWorkbookRow);
    const comparisonBase = managedRows.length || currentRows.length;
    const minimumExpected = comparisonBase ? Math.max(1, Math.floor(comparisonBase * minimumRatio)) : 0;
    counts[collection] = {
      incoming: incomingRows.length,
      current: currentRows.length,
      managedCurrent: managedRows.length,
      minimumExpected
    };

    if (!incomingRows.length && comparisonBase) {
      errors.push(`${collection}: nguồn Google Sheet không có dòng dữ liệu.`);
    } else if (minimumExpected && incomingRows.length < minimumExpected) {
      errors.push(`${collection}: chỉ còn ${incomingRows.length}/${comparisonBase} dòng, thấp hơn ngưỡng an toàn ${minimumExpected}.`);
    }

    const seenIds = new Set();
    for (const row of incomingRows) {
      const id = String(row?.id || "").trim();
      if (!id) {
        errors.push(`${collection}: có dòng không tạo được khóa dữ liệu.`);
        continue;
      }
      if (seenIds.has(id)) errors.push(`${collection}: trùng khóa dòng ${id}.`);
      seenIds.add(id);
    }

    const fields = identityFields[collection];
    if (fields) {
      const seenIdentity = new Set();
      for (const row of incomingRows) {
        const identity = fields.map((field) => normalizeIdentity(row?.[field])).find(Boolean) || "";
        if (!identity) {
          errors.push(`${collection}: có dòng thiếu khóa nghiệp vụ (${fields.join("/")}).`);
          continue;
        }
        if (seenIdentity.has(identity)) errors.push(`${collection}: trùng khóa nghiệp vụ ${identity}.`);
        seenIdentity.add(identity);
      }
    }
  }

  if ((importState?.daily || []).length > 0 && (importState?.daily || []).some((row) => !row.date && !row.tester)) {
    warnings.push("DieuHanh_Ngay có dòng thiếu cả ngày và tester; parser chỉ giữ dòng có nội dung vận hành.");
  }

  return {
    ok: errors.length === 0,
    minimumRatio,
    counts,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)]
  };
}

function sourceStateHash(state) {
  const payload = Object.fromEntries(GOOGLE_SHEET_SOURCE_COLLECTIONS.map((collection) => [
    collection,
    (state?.[collection] || []).map((row) => canonicalValue(row, new Set(["_import", "createdAt", "updatedAt", "sortOrder"])))
  ]));
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function normalizeGoogleSheetSettings(value = {}, defaults = {}) {
  const source = value && typeof value === "object" ? value : {};
  const defaultId = extractSpreadsheetId(defaults.spreadsheetId || DEFAULT_GOOGLE_SHEET_ID);
  const spreadsheetId = extractSpreadsheetId(source.spreadsheetId || source.spreadsheetUrl || defaultId);
  const intervalMinutes = Math.max(1, Math.min(60, Number(source.intervalMinutes || defaults.intervalMinutes || 5)));
  return {
    enabled: source.enabled !== false,
    spreadsheetId,
    spreadsheetUrl: spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : "",
    intervalMinutes,
    minimumRowRatio: Math.max(0.1, Math.min(1, Number(source.minimumRowRatio || defaults.minimumRowRatio || 0.5))),
    updatedAt: String(source.updatedAt || ""),
    updatedBy: String(source.updatedBy || "")
  };
}

function normalizeGoogleSheetSyncState(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return {
    lastAttemptAt: String(source.lastAttemptAt || ""),
    lastSuccessAt: String(source.lastSuccessAt || ""),
    lastSourceHash: String(source.lastSourceHash || ""),
    lastStatus: String(source.lastStatus || "never"),
    lastError: String(source.lastError || ""),
    lastSnapshotId: String(source.lastSnapshotId || ""),
    lastSummary: source.lastSummary && typeof source.lastSummary === "object" ? source.lastSummary : null
  };
}

function extractSpreadsheetId(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const urlMatch = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  const candidate = urlMatch ? urlMatch[1] : text;
  return /^[a-zA-Z0-9_-]{20,}$/.test(candidate) ? candidate : "";
}

function isManagedWorkbookRow(row) {
  const data = row?.data && typeof row.data === "object" ? row.data : row;
  const id = String(row?.id || data?.id || "").trim();
  return ["workbook", "google-sheet"].includes(String(data?._import?.source || ""))
    || /^[a-f0-9]{40}$/i.test(id);
}

function canonicalValue(value, omittedFields = new Set()) {
  if (Array.isArray(value)) return value.map((entry) => canonicalValue(entry, omittedFields));
  if (!value || typeof value !== "object") return value;
  return Object.keys(value)
    .filter((key) => !omittedFields.has(key))
    .sort()
    .reduce((result, key) => {
      result[key] = canonicalValue(value[key], omittedFields);
      return result;
    }, {});
}

function normalizeIdentity(value) {
  return String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function googleColorToArgb(color) {
  const rgb = color?.rgbColor || color;
  if (!rgb || typeof rgb !== "object") return "";
  if (!["red", "green", "blue", "alpha"].some((key) => Object.prototype.hasOwnProperty.call(rgb, key))) return "";
  const channel = (value) => Math.max(0, Math.min(255, Math.round(Number(value || 0) * 255)))
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
  const alpha = Object.prototype.hasOwnProperty.call(rgb, "alpha") ? channel(rgb.alpha) : "FF";
  return `${alpha}${channel(rgb.red)}${channel(rgb.green)}${channel(rgb.blue)}`;
}

function normalizeHorizontalAlignment(value) {
  const map = { LEFT: "left", CENTER: "center", RIGHT: "right", JUSTIFY: "justify" };
  return map[value] || undefined;
}

function normalizeVerticalAlignment(value) {
  const map = { TOP: "top", MIDDLE: "middle", BOTTOM: "bottom" };
  return map[value] || undefined;
}

function pointsFromPixels(value) {
  return Math.max(1, Number(value || 0) * 0.75);
}

function createPublicError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  GOOGLE_SHEETS_READONLY_SCOPE,
  DEFAULT_GOOGLE_SHEET_ID,
  GOOGLE_SHEET_SOURCE_COLLECTIONS,
  GOOGLE_SHEET_SOURCE_RANGES,
  GOOGLE_SHEET_REQUIRED_TABS,
  fetchGoogleSpreadsheet,
  spreadsheetGridToWorkbook,
  auditGoogleSheetSourceSafety,
  sourceStateHash,
  normalizeGoogleSheetSettings,
  normalizeGoogleSheetSyncState,
  extractSpreadsheetId,
  assertRequiredTabs,
  __testGridEffectiveValue: gridEffectiveValue,
  __testGridCellHyperlink: gridCellHyperlink
};
