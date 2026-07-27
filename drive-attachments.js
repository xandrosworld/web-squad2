const crypto = require("crypto");
const path = require("path");
const { Transform } = require("stream");

const ExcelJS = require("exceljs");
const mammoth = require("mammoth");
const sanitizeHtml = require("sanitize-html");

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const DEFAULT_ROOT_FOLDER_NAME = "Squad 2 UAT - Tep cong viec";
const DEFAULT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const OFFICE_PREVIEW_LIMIT_BYTES = 20 * 1024 * 1024;
const TEXT_PREVIEW_LIMIT_BYTES = 2 * 1024 * 1024;
const BLOCKED_EXTENSIONS = new Set([
  ".app", ".bat", ".cmd", ".com", ".cpl", ".dll", ".exe", ".gadget", ".hta",
  ".inf", ".ins", ".jar", ".js", ".jse", ".lnk", ".msi", ".msp", ".pif",
  ".ps1", ".reg", ".scr", ".sct", ".sh", ".sys", ".vb", ".vbe", ".vbs", ".wsf"
]);
const INLINE_IMAGE_EXTENSIONS = new Set([".avif", ".bmp", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);
const TEXT_EXTENSIONS = new Set([".csv", ".json", ".log", ".md", ".text", ".txt", ".xml", ".yaml", ".yml"]);
const EXCEL_EXTENSIONS = new Set([".xlsx", ".xlsm"]);

function createDriveAttachmentService(options = {}) {
  const getAccessToken = options.getAccessToken;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const rootFolderName = String(options.rootFolderName || DEFAULT_ROOT_FOLDER_NAME).trim();
  const maxFileSizeBytes = positiveInteger(options.maxFileSizeBytes, DEFAULT_MAX_FILE_SIZE_BYTES);
  const requiredScope = String(options.requiredScope || "https://www.googleapis.com/auth/drive.file");

  if (typeof getAccessToken !== "function") throw new Error("Drive attachment service requires getAccessToken.");
  if (typeof fetchImpl !== "function") throw new Error("Node runtime does not support fetch.");

  async function accessToken(pool) {
    return getAccessToken(pool, [requiredScope]);
  }

  async function getStorageStatus(pool) {
    const token = await accessToken(pool);
    const root = await ensureRootFolder(token);
    return {
      connected: true,
      rootFolderId: root.id,
      rootFolderName: root.name,
      rootFolderUrl: root.webViewLink || `https://drive.google.com/drive/folders/${encodeURIComponent(root.id)}`,
      maxFileSizeBytes
    };
  }

  async function upload(pool, input = {}) {
    const fileName = normalizeFileName(input.fileName);
    const contentLength = positiveInteger(input.contentLength, 0);
    const mimeType = normalizeMimeType(input.mimeType, fileName);
    validateUpload({ fileName, contentLength, maxFileSizeBytes });

    const token = await accessToken(pool);
    const taskFolder = await ensureTaskFolder(token, input.workItem || {}, input.uploader || {});
    const metadata = {
      name: fileName,
      parents: [taskFolder.id],
      mimeType,
      appProperties: compactProperties({
        squad2Kind: "work-item-attachment",
        workItemId: input.workItem?.id,
        taskId: input.workItem?.taskId,
        uploadedBy: input.uploader?.id
      })
    };

    const sessionResponse = await fetchImpl(
      `${DRIVE_UPLOAD_BASE}/files?uploadType=resumable&supportsAllDrives=true&fields=${encodeURIComponent(fileFields())}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": mimeType,
          "X-Upload-Content-Length": String(contentLength)
        },
        body: JSON.stringify(metadata)
      }
    );
    if (!sessionResponse.ok) throw await driveError(sessionResponse, "Không khởi tạo được phiên tải file lên Google Drive.");
    const uploadUrl = sessionResponse.headers.get("location");
    if (!uploadUrl) throw publicError(502, "Google Drive không trả về địa chỉ upload.");

    const hash = crypto.createHash("sha256");
    let receivedBytes = 0;
    const meter = new Transform({
      transform(chunk, encoding, callback) {
        receivedBytes += chunk.length;
        hash.update(chunk);
        if (receivedBytes > maxFileSizeBytes) {
          callback(publicError(413, `Mỗi file chỉ được tối đa ${formatBytes(maxFileSizeBytes)}.`));
          return;
        }
        callback(null, chunk);
      }
    });
    input.stream.on("error", (error) => meter.destroy(error));
    input.stream.pipe(meter);

    let uploadResponse;
    try {
      uploadResponse = await fetchImpl(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": mimeType,
          "Content-Length": String(contentLength)
        },
        body: meter,
        duplex: "half",
        signal: input.signal
      });
    } catch (error) {
      if (error?.name === "AbortError") throw publicError(499, "Tải file đã bị hủy.");
      throw publicError(502, `Không truyền được file lên Google Drive: ${publicMessage(error)}`);
    }
    if (!uploadResponse.ok) throw await driveError(uploadResponse, "Google Drive không nhận được file.");
    if (receivedBytes !== contentLength) {
      const uploaded = await safeJson(uploadResponse);
      if (uploaded?.id) await trashByToken(token, uploaded.id).catch(() => {});
      throw publicError(400, "Dung lượng file nhận được không khớp với dữ liệu đã chọn.");
    }

    const uploaded = await safeJson(uploadResponse);
    return {
      driveFile: normalizeDriveFile(uploaded),
      taskFolder,
      sha256: hash.digest("hex"),
      contentLength,
      mimeType,
      fileName
    };
  }

  async function getMetadata(pool, fileId) {
    const token = await accessToken(pool);
    return getMetadataByToken(token, fileId);
  }

  async function getContent(pool, fileId, options = {}) {
    const token = await accessToken(pool);
    const headers = { Authorization: `Bearer ${token}` };
    if (options.range) headers.Range = String(options.range);
    const response = await fetchImpl(`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?alt=media`, {
      headers
    });
    if (!response.ok && response.status !== 206) {
      throw await driveError(response, "Không đọc được nội dung file từ Google Drive.");
    }
    return response;
  }

  async function getPreview(pool, attachment) {
    const fileName = normalizeFileName(attachment.originalName || attachment.name);
    const extension = path.extname(fileName).toLowerCase();
    const mimeType = normalizeMimeType(attachment.mimeType, fileName);
    const size = Number(attachment.sizeBytes || 0);

    if (mimeType === "application/pdf" || extension === ".pdf") {
      return { kind: "inline", contentType: "application/pdf" };
    }
    if (INLINE_IMAGE_EXTENSIONS.has(extension) || /^image\//i.test(mimeType)) {
      return { kind: "inline", contentType: safeInlineImageMime(mimeType, extension) };
    }
    if (TEXT_EXTENSIONS.has(extension) || /^text\//i.test(mimeType)) {
      if (size > TEXT_PREVIEW_LIMIT_BYTES) {
        return previewUnavailable("File văn bản quá lớn để xem trực tiếp. Bạn vẫn có thể tải xuống.");
      }
      const buffer = await readBuffer(pool, attachment.driveFileId, TEXT_PREVIEW_LIMIT_BYTES);
      return {
        kind: "text",
        contentType: "text/plain; charset=utf-8",
        text: stripUnsafeControlCharacters(buffer.toString("utf8"))
      };
    }
    if (extension === ".docx") {
      if (size > OFFICE_PREVIEW_LIMIT_BYTES) {
        return previewUnavailable("File Word lớn hơn 20 MB. Hãy tải xuống hoặc mở trên Google Drive.");
      }
      const buffer = await readBuffer(pool, attachment.driveFileId, OFFICE_PREVIEW_LIMIT_BYTES);
      const result = await mammoth.convertToHtml({ buffer });
      return {
        kind: "document",
        html: sanitizeDocumentHtml(result.value),
        warnings: (result.messages || []).map((message) => String(message.message || "")).filter(Boolean).slice(0, 5)
      };
    }
    if (EXCEL_EXTENSIONS.has(extension)) {
      if (size > OFFICE_PREVIEW_LIMIT_BYTES) {
        return previewUnavailable("File Excel lớn hơn 20 MB. Hãy tải xuống hoặc mở trên Google Drive.");
      }
      const buffer = await readBuffer(pool, attachment.driveFileId, OFFICE_PREVIEW_LIMIT_BYTES);
      return {
        kind: "workbook",
        sheets: await renderWorkbookPreview(buffer)
      };
    }
    if (extension === ".pptx") {
      if (size > OFFICE_PREVIEW_LIMIT_BYTES) {
        return previewUnavailable("File PowerPoint lớn hơn 20 MB. Hãy tải xuống hoặc mở trên Google Drive.");
      }
      return {
        kind: "presentation",
        contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      };
    }
    if (extension === ".ppt") {
      return previewUnavailable("PowerPoint định dạng cũ (.ppt) chưa hỗ trợ xem trực tiếp. Hãy tải xuống hoặc mở trên Google Drive.");
    }
    if (extension === ".zip" || extension === ".rar" || extension === ".7z") {
      return previewUnavailable("File nén không được mở nội dung trực tiếp để đảm bảo an toàn.");
    }
    return previewUnavailable("Định dạng này chưa hỗ trợ xem trực tiếp. Bạn vẫn có thể tải file xuống.");
  }

  async function trash(pool, fileId) {
    const token = await accessToken(pool);
    return trashByToken(token, fileId);
  }

  async function ensureRootFolder(token) {
    return ensureFolder(token, {
      name: rootFolderName,
      queryProperties: { squad2Kind: "attachment-root" },
      appProperties: { squad2Kind: "attachment-root" }
    });
  }

  async function ensureUploaderFolder(token, uploader) {
    const root = await ensureRootFolder(token);
    const uploaderId = String(uploader.id || uploader.email || uploader.username || "unknown").trim();
    const account = String(uploader.username || uploader.email || "").trim().split("@")[0];
    const label = [String(uploader.name || "Nguoi dung").trim(), account ? `(${account})` : ""]
      .filter(Boolean)
      .join(" ");
    return ensureFolder(token, {
      name: normalizeFolderName(label),
      parentId: root.id,
      queryProperties: {
        squad2Kind: "attachment-uploader",
        uploaderId
      },
      appProperties: compactProperties({
        squad2Kind: "attachment-uploader",
        uploaderId,
        uploaderEmail: uploader.email || uploader.username
      })
    });
  }

  async function ensureTaskFolder(token, workItem, uploader) {
    const uploaderFolder = await ensureUploaderFolder(token, uploader);
    const taskId = String(workItem.taskId || workItem.id || "Khong-xac-dinh").trim();
    return ensureFolder(token, {
      name: normalizeFolderName(taskId),
      parentId: uploaderFolder.id,
      queryProperties: {
        squad2Kind: "attachment-task",
        workItemId: String(workItem.id || ""),
        uploaderId: String(uploader.id || uploader.email || uploader.username || "unknown")
      },
      appProperties: compactProperties({
        squad2Kind: "attachment-task",
        workItemId: workItem.id,
        taskId,
        uploaderId: uploader.id || uploader.email || uploader.username
      })
    });
  }

  async function ensureFolder(token, input) {
    const query = [
      `mimeType = '${DRIVE_FOLDER_MIME}'`,
      "trashed = false",
      input.parentId ? `'${escapeDriveQuery(input.parentId)}' in parents` : "",
      ...Object.entries(input.queryProperties || {})
        .filter(([, value]) => String(value || "").trim())
        .map(([key, value]) => `appProperties has { key='${escapeDriveQuery(key)}' and value='${escapeDriveQuery(value)}' }`)
    ].filter(Boolean).join(" and ");
    const params = new URLSearchParams({
      q: query,
      spaces: "drive",
      pageSize: "10",
      fields: `files(${fileFields()})`
    });
    const listResponse = await fetchImpl(`${DRIVE_API_BASE}/files?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!listResponse.ok) throw await driveError(listResponse, "Không kiểm tra được thư mục lưu file trên Google Drive.");
    const found = (await safeJson(listResponse))?.files?.[0];
    if (found) return normalizeDriveFile(found);

    const createResponse = await fetchImpl(`${DRIVE_API_BASE}/files?fields=${encodeURIComponent(fileFields())}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8"
      },
      body: JSON.stringify({
        name: input.name,
        mimeType: DRIVE_FOLDER_MIME,
        parents: input.parentId ? [input.parentId] : undefined,
        appProperties: compactProperties(input.appProperties)
      })
    });
    if (!createResponse.ok) throw await driveError(createResponse, "Không tạo được thư mục lưu file trên Google Drive.");
    return normalizeDriveFile(await safeJson(createResponse));
  }

  async function getMetadataByToken(token, fileId) {
    const response = await fetchImpl(
      `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(fileFields())}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) throw await driveError(response, "Không tìm thấy file trên Google Drive.");
    return normalizeDriveFile(await safeJson(response));
  }

  async function readBuffer(pool, fileId, limitBytes) {
    const metadata = await getMetadata(pool, fileId);
    if (Number(metadata.size || 0) > limitBytes) throw publicError(413, "File quá lớn để dựng bản xem trước.");
    const response = await getContent(pool, fileId);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > limitBytes) throw publicError(413, "File quá lớn để dựng bản xem trước.");
    return buffer;
  }

  async function trashByToken(token, fileId) {
    const response = await fetchImpl(
      `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(fileFields())}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify({ trashed: true })
      }
    );
    if (!response.ok) throw await driveError(response, "Không xóa được file trên Google Drive.");
    return normalizeDriveFile(await safeJson(response));
  }

  return {
    getStorageStatus,
    upload,
    getMetadata,
    getContent,
    getPreview,
    trash,
    maxFileSizeBytes
  };
}

function validateUpload({ fileName, contentLength, maxFileSizeBytes }) {
  if (!fileName) throw publicError(400, "Tên file không hợp lệ.");
  if (!Number.isInteger(contentLength) || contentLength <= 0) throw publicError(400, "File rỗng hoặc thiếu dung lượng.");
  if (contentLength > maxFileSizeBytes) {
    throw publicError(413, `Mỗi file chỉ được tối đa ${formatBytes(maxFileSizeBytes)}.`);
  }
  const extension = path.extname(fileName).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(extension)) {
    throw publicError(415, `Không cho phép tải file ${extension || "thực thi"} vì lý do an toàn.`);
  }
}

function normalizeFileName(value) {
  const base = path.basename(String(value || "").replace(/\0/g, "").trim());
  return base.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/\s+/g, " ").slice(0, 180);
}

function normalizeFolderName(value) {
  return normalizeFileName(value).replace(/\.+$/g, "") || "Khong-xac-dinh";
}

function normalizeMimeType(value, fileName = "") {
  const input = String(value || "").split(";")[0].trim().toLowerCase();
  if (input && /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i.test(input)) return input;
  return mimeFromExtension(path.extname(fileName).toLowerCase());
}

function mimeFromExtension(extension) {
  const map = {
    ".csv": "text/csv",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".json": "application/json",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".webp": "image/webp",
    ".xls": "application/vnd.ms-excel",
    ".xlsm": "application/vnd.ms-excel.sheet.macroenabled.12",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xml": "application/xml",
    ".zip": "application/zip"
  };
  return map[extension] || "application/octet-stream";
}

function safeInlineImageMime(mimeType, extension) {
  const allowed = new Set(["image/avif", "image/bmp", "image/gif", "image/jpeg", "image/png", "image/webp"]);
  if (allowed.has(mimeType)) return mimeType;
  return mimeFromExtension(extension);
}

function sanitizeDocumentHtml(value) {
  return sanitizeHtml(String(value || ""), {
    allowedTags: [
      "a", "b", "blockquote", "br", "code", "del", "div", "em", "h1", "h2", "h3",
      "h4", "h5", "h6", "hr", "i", "img", "li", "ol", "p", "pre", "s", "span", "strong",
      "sub", "sup", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul"
    ],
    allowedAttributes: {
      a: ["href", "title"],
      img: ["src", "alt", "title", "width", "height"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["data"]
    },
    exclusiveFilter(frame) {
      return frame.tag === "img"
        && !/^data:image\/(?:avif|bmp|gif|jpe?g|png|webp);base64,/i.test(String(frame.attribs?.src || ""));
    },
    allowProtocolRelative: false
  });
}

async function renderWorkbookPreview(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook.worksheets.slice(0, 10).map((worksheet) => {
    const maxRow = Math.min(worksheet.actualRowCount || worksheet.rowCount || 0, 200);
    const maxColumn = Math.min(worksheet.actualColumnCount || worksheet.columnCount || 0, 40);
    const rows = [];
    for (let rowNumber = 1; rowNumber <= maxRow; rowNumber += 1) {
      const row = [];
      for (let columnNumber = 1; columnNumber <= maxColumn; columnNumber += 1) {
        row.push(workbookCellText(worksheet.getCell(rowNumber, columnNumber)));
      }
      while (row.length && row[row.length - 1] === "") row.pop();
      rows.push(row);
    }
    while (rows.length && rows[rows.length - 1].length === 0) rows.pop();
    return {
      name: worksheet.name,
      rows,
      truncatedRows: (worksheet.actualRowCount || worksheet.rowCount || 0) > maxRow,
      truncatedColumns: (worksheet.actualColumnCount || worksheet.columnCount || 0) > maxColumn
    };
  });
}

function workbookCellText(cell) {
  const value = cell?.value;
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return String(value);
  if (value.text != null) return String(value.text);
  if (value.result != null) return String(value.result);
  if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("");
  return String(cell.text || "");
}

function previewUnavailable(message) {
  return { kind: "unavailable", message };
}

function stripUnsafeControlCharacters(value) {
  return String(value || "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

function compactProperties(value = {}) {
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [String(key), String(item || "").slice(0, 120)])
      .filter(([, item]) => item)
  );
}

function fileFields() {
  return "id,name,mimeType,size,createdTime,modifiedTime,webViewLink,iconLink,thumbnailLink,trashed,parents,appProperties";
}

function normalizeDriveFile(value = {}) {
  return {
    id: String(value.id || ""),
    name: String(value.name || ""),
    mimeType: String(value.mimeType || ""),
    size: Number(value.size || 0),
    createdTime: String(value.createdTime || ""),
    modifiedTime: String(value.modifiedTime || ""),
    webViewLink: String(value.webViewLink || ""),
    iconLink: String(value.iconLink || ""),
    thumbnailLink: String(value.thumbnailLink || ""),
    trashed: value.trashed === true,
    parents: Array.isArray(value.parents) ? value.parents.map(String) : [],
    appProperties: value.appProperties && typeof value.appProperties === "object" ? value.appProperties : {}
  };
}

function escapeDriveQuery(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function driveError(response, fallback) {
  const payload = await safeJson(response);
  const detail = payload?.error?.message || payload?.message || "";
  const status = response.status === 401 || response.status === 403 ? 409 : response.status >= 400 && response.status < 600 ? response.status : 502;
  return publicError(status, detail ? `${fallback} (${detail})` : fallback);
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function publicError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function publicMessage(error) {
  return String(error?.message || error || "Lỗi không xác định.");
}

module.exports = {
  createDriveAttachmentService,
  validateUpload,
  normalizeFileName,
  normalizeMimeType,
  mimeFromExtension,
  sanitizeDocumentHtml,
  renderWorkbookPreview,
  DEFAULT_MAX_FILE_SIZE_BYTES,
  OFFICE_PREVIEW_LIMIT_BYTES,
  TEXT_PREVIEW_LIMIT_BYTES
};
