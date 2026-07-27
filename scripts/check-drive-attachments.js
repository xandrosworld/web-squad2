const assert = require("assert");
const { Readable } = require("stream");

const ExcelJS = require("exceljs");
const {
  createDriveAttachmentService,
  validateUpload,
  normalizeFileName,
  normalizeMimeType,
  sanitizeDocumentHtml,
  renderWorkbookPreview,
  DEFAULT_MAX_FILE_SIZE_BYTES,
  OFFICE_PREVIEW_LIMIT_BYTES
} = require("../drive-attachments");

async function main() {
  testValidation();
  testNormalizationAndSanitizing();
  await testWorkbookPreview();
  await testDriveFolderHierarchyAndUpload();
  await testTextPreview();
  await testPresentationPreviewClassification();
  console.log("Drive attachment checks passed.");
}

function testValidation() {
  assert.doesNotThrow(() => validateUpload({
    fileName: "Bao cao UAT.pdf",
    contentLength: DEFAULT_MAX_FILE_SIZE_BYTES,
    maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES
  }));
  assert.throws(() => validateUpload({
    fileName: "oversize.pdf",
    contentLength: DEFAULT_MAX_FILE_SIZE_BYTES + 1,
    maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES
  }), /50 MB/);
  assert.throws(() => validateUpload({
    fileName: "run.exe",
    contentLength: 100,
    maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES
  }), /an toàn/);
  assert.throws(() => validateUpload({
    fileName: "empty.txt",
    contentLength: 0,
    maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES
  }), /rỗng/);
}

function testNormalizationAndSanitizing() {
  assert.strictEqual(normalizeFileName("../Bao cao: UAT?.pdf"), "Bao cao_ UAT_.pdf");
  assert.strictEqual(normalizeMimeType("", "bang-tong-hop.xlsx"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  const html = sanitizeDocumentHtml(`
    <h1>Hướng dẫn</h1>
    <script>alert("x")</script>
    <a href="javascript:alert(1)">Không an toàn</a>
    <a href="https://example.com">Hợp lệ</a>
  `);
  assert(!html.includes("<script"));
  assert(!html.includes("javascript:"));
  assert(html.includes("https://example.com"));
  const imageHtml = sanitizeDocumentHtml(`
    <img src="data:image/png;base64,iVBORw0KGgo=" alt="Ảnh an toàn">
    <img src="data:image/svg+xml;base64,PHN2Zy8+" alt="Ảnh không an toàn">
    <img src="https://example.com/tracking.png" alt="Ảnh ngoài">
  `);
  assert(imageHtml.includes("data:image/png;base64,"));
  assert(!imageHtml.includes("image/svg+xml"));
  assert(!imageHtml.includes("tracking.png"));
}

async function testWorkbookPreview() {
  const workbook = new ExcelJS.Workbook();
  const first = workbook.addWorksheet("Kế hoạch");
  first.addRow(["Task ID", "Tên công việc", "%"]);
  first.addRow(["SQ2-T03-001", "Viết HDSD", 50]);
  const second = workbook.addWorksheet("Phân công");
  second.addRow(["Người thực hiện", "Deadline"]);
  second.addRow(["Mai Tấn Thành", new Date("2026-07-31T00:00:00.000Z")]);
  const preview = await renderWorkbookPreview(Buffer.from(await workbook.xlsx.writeBuffer()));
  assert.strictEqual(preview.length, 2);
  assert.strictEqual(preview[0].name, "Kế hoạch");
  assert.strictEqual(preview[0].rows[1][0], "SQ2-T03-001");
  assert.strictEqual(preview[1].rows[1][0], "Mai Tấn Thành");
}

async function testDriveFolderHierarchyAndUpload() {
  const calls = [];
  const folders = [];
  const requiredScopes = [];
  const payload = Buffer.from("noi dung kiem thu drive", "utf8");
  let folderSequence = 0;

  const service = createDriveAttachmentService({
    getAccessToken: async (pool, scopes) => {
      requiredScopes.push(...scopes);
      return "access-token";
    },
    requiredScope: "https://www.googleapis.com/auth/drive.file",
    rootFolderName: "Squad 2 UAT - Tep cong viec",
    fetchImpl: async (url, init = {}) => {
      calls.push({ url: String(url), method: init.method || "GET" });
      if (String(url).startsWith("https://www.googleapis.com/drive/v3/files?") && !init.method) {
        return jsonResponse({ files: [] });
      }
      if (String(url).startsWith("https://www.googleapis.com/drive/v3/files?") && init.method === "POST") {
        const body = JSON.parse(init.body);
        const file = {
          id: `folder-${++folderSequence}`,
          name: body.name,
          mimeType: body.mimeType,
          parents: body.parents || [],
          appProperties: body.appProperties || {},
          webViewLink: `https://drive.google.com/drive/folders/folder-${folderSequence}`
        };
        folders.push(file);
        return jsonResponse(file);
      }
      if (String(url).startsWith("https://www.googleapis.com/upload/drive/v3/files?")) {
        return jsonResponse({}, { headers: { location: "https://upload.example/session-1" } });
      }
      if (String(url) === "https://upload.example/session-1") {
        const chunks = [];
        for await (const chunk of init.body) chunks.push(Buffer.from(chunk));
        assert.deepStrictEqual(Buffer.concat(chunks), payload);
        return jsonResponse({
          id: "drive-file-1",
          name: "Tai lieu Pilot.pdf",
          mimeType: "application/pdf",
          size: String(payload.length),
          parents: ["folder-3"],
          webViewLink: "https://drive.google.com/file/d/drive-file-1/view"
        });
      }
      throw new Error(`Unexpected Drive request: ${init.method || "GET"} ${url}`);
    }
  });

  const result = await service.upload({}, {
    stream: Readable.from(payload),
    contentLength: payload.length,
    fileName: "Tai lieu Pilot.pdf",
    mimeType: "application/pdf",
    workItem: { id: "work-1", taskId: "SQ2-T03-001" },
    uploader: {
      id: "user-thanh",
      name: "Mai Tấn Thành",
      username: "thanhmt@bidv.com.vn",
      email: "thanhmt@bidv.com.vn"
    }
  });

  assert.strictEqual(folders.length, 3);
  assert.strictEqual(folders[0].name, "Squad 2 UAT - Tep cong viec");
  assert.strictEqual(folders[1].name, "Mai Tấn Thành (thanhmt)");
  assert.deepStrictEqual(folders[1].parents, [folders[0].id]);
  assert.strictEqual(folders[2].name, "SQ2-T03-001");
  assert.deepStrictEqual(folders[2].parents, [folders[1].id]);
  assert.strictEqual(folders[2].appProperties.uploaderId, "user-thanh");
  assert.strictEqual(result.taskFolder.id, folders[2].id);
  assert.strictEqual(result.driveFile.id, "drive-file-1");
  assert.strictEqual(result.sha256.length, 64);
  assert(requiredScopes.includes("https://www.googleapis.com/auth/drive.file"));
  assert(calls.some((call) => call.url === "https://upload.example/session-1" && call.method === "PUT"));
}

async function testTextPreview() {
  const text = "Dòng 1\nDòng 2\u0000";
  const service = createDriveAttachmentService({
    getAccessToken: async () => "token",
    fetchImpl: async (url) => {
      if (String(url).includes("alt=media")) {
        return new Response(Buffer.from(text, "utf8"), {
          status: 200,
          headers: { "content-type": "text/plain" }
        });
      }
      return jsonResponse({
        id: "text-file",
        name: "ghi-chu.txt",
        mimeType: "text/plain",
        size: String(Buffer.byteLength(text))
      });
    }
  });
  const preview = await service.getPreview({}, {
    driveFileId: "text-file",
    originalName: "ghi-chu.txt",
    mimeType: "text/plain",
    sizeBytes: Buffer.byteLength(text)
  });
  assert.strictEqual(preview.kind, "text");
  assert.strictEqual(preview.text, "Dòng 1\nDòng 2");
}

async function testPresentationPreviewClassification() {
  const service = createDriveAttachmentService({
    getAccessToken: async () => "token",
    fetchImpl: async () => {
      throw new Error("PPTX classification must not download the file during preview metadata lookup.");
    }
  });
  const presentation = await service.getPreview({}, {
    driveFileId: "pptx-file",
    originalName: "bao-cao-tuan.pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    sizeBytes: 1024
  });
  assert.strictEqual(presentation.kind, "presentation");
  assert.strictEqual(
    presentation.contentType,
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  );

  const oversized = await service.getPreview({}, {
    driveFileId: "large-pptx-file",
    originalName: "bao-cao-lon.pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    sizeBytes: OFFICE_PREVIEW_LIMIT_BYTES + 1
  });
  assert.strictEqual(oversized.kind, "unavailable");

  const legacy = await service.getPreview({}, {
    driveFileId: "legacy-ppt-file",
    originalName: "bao-cao-cu.ppt",
    mimeType: "application/vnd.ms-powerpoint",
    sizeBytes: 1024
  });
  assert.strictEqual(legacy.kind, "unavailable");
}

function jsonResponse(value, options = {}) {
  return new Response(JSON.stringify(value), {
    status: options.status || 200,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
