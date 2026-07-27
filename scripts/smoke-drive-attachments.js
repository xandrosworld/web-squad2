const crypto = require("crypto");

const ExcelJS = require("exceljs");
const JSZip = require("jszip");

const baseUrl = String(process.env.SMOKE_URL || "https://squad2-dashboard-qlcv.up.railway.app").replace(/\/+$/, "");
const identifier = process.env.SMOKE_ADMIN || process.env.SMOKE_USER || "thanhmt@bidv.com.vn";
const password = process.env.SMOKE_PASSWORD || "";

if (!password) {
  throw new Error("Set SMOKE_PASSWORD before running the Drive attachment smoke.");
}

(async () => {
  const session = await login();
  const state = await jsonRequest("/api/state", { cookie: session.cookie });
  const workItem = (state.data.state?.workItems || []).find((item) => item?.id && item?.taskId);
  if (!workItem) throw new Error("Không tìm thấy công việc để kiểm tra file đính kèm.");

  const fixtures = await buildFixtures();
  const uploaded = [];
  try {
    for (const fixture of fixtures) {
      const result = await upload(workItem.id, fixture, session.cookie);
      uploaded.push({ ...fixture, attachment: result.data.attachment });
    }

    const list = await jsonRequest(`/api/work-items/${encodeURIComponent(workItem.id)}/attachments`, {
      cookie: session.cookie
    });
    expectStatus("list attachments", list, 200);
    for (const entry of uploaded) {
      if (!(list.data.attachments || []).some((item) => item.id === entry.attachment.id)) {
        throw new Error(`Danh sách file thiếu ${entry.name}.`);
      }
    }

    for (const entry of uploaded) {
      const preview = await jsonRequest(`/api/attachments/${encodeURIComponent(entry.attachment.id)}/preview`, {
        cookie: session.cookie
      });
      expectStatus(`preview ${entry.name}`, preview, 200);
      if (preview.data.preview?.kind !== entry.previewKind) {
        throw new Error(`${entry.name}: expected preview ${entry.previewKind}, got ${preview.data.preview?.kind || "empty"}.`);
      }

      const downloaded = await binaryRequest(`/api/attachments/${encodeURIComponent(entry.attachment.id)}/content`, {
        cookie: session.cookie
      });
      if (downloaded.status !== 200 || !downloaded.buffer.equals(entry.buffer)) {
        throw new Error(`${entry.name}: nội dung tải xuống không khớp file đã tải lên.`);
      }
    }

    console.log(JSON.stringify({
      ok: true,
      workItem: workItem.taskId,
      uploader: session.user.email || session.user.username,
      tested: uploaded.map((entry) => ({
        name: entry.name,
        preview: entry.previewKind,
        size: entry.buffer.length,
        sha256: entry.attachment.sha256
      }))
    }, null, 2));
  } finally {
    for (const entry of uploaded.reverse()) {
      await jsonRequest(`/api/attachments/${encodeURIComponent(entry.attachment.id)}`, {
        method: "DELETE",
        cookie: session.cookie
      }).catch(() => {});
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function login() {
  const result = await jsonRequest("/api/auth/login", {
    method: "POST",
    body: { identifier, password }
  });
  if (result.status !== 200 || !result.data.authenticated || !result.cookie) {
    throw new Error(`Login failed for ${identifier}: ${result.status} ${result.data.error || ""}`);
  }
  return { cookie: result.cookie, user: result.data.user };
}

async function upload(workItemId, fixture, cookie) {
  const uploadKey = `smoke-${Date.now()}-${crypto.randomUUID()}`;
  const response = await fetch(`${baseUrl}/api/work-items/${encodeURIComponent(workItemId)}/attachments`, {
    method: "POST",
    headers: {
      Cookie: cookie,
      "Content-Type": fixture.mimeType,
      "Content-Length": String(fixture.buffer.length),
      "X-File-Name": encodeURIComponent(fixture.name),
      "X-File-Type": fixture.mimeType,
      "X-File-Size": String(fixture.buffer.length),
      "X-Upload-Key": uploadKey
    },
    body: fixture.buffer
  });
  const data = await parseJson(response);
  const result = { status: response.status, data };
  expectStatus(`upload ${fixture.name}`, result, 201);
  if (!data.attachment?.id || data.attachment.sizeBytes !== fixture.buffer.length) {
    throw new Error(`${fixture.name}: metadata upload không hợp lệ.`);
  }
  const expectedHash = crypto.createHash("sha256").update(fixture.buffer).digest("hex");
  if (data.attachment.sha256 !== expectedHash) {
    throw new Error(`${fixture.name}: SHA-256 không khớp.`);
  }
  return result;
}

async function jsonRequest(path, { method = "GET", cookie = "", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return {
    status: response.status,
    data: await parseJson(response),
    cookie: (response.headers.get("set-cookie") || "").split(";")[0] || cookie
  };
}

async function binaryRequest(path, { cookie = "" } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: cookie ? { Cookie: cookie } : {}
  });
  return {
    status: response.status,
    buffer: Buffer.from(await response.arrayBuffer())
  };
}

async function parseJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function expectStatus(label, result, expected) {
  if (result.status !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${result.status} ${result.data?.error || result.data?.raw || ""}`);
  }
}

async function buildFixtures() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Theo dõi");
  sheet.addRow(["Task ID", "Trạng thái"]);
  sheet.addRow(["SQ2-SMOKE-001", "Đang thực hiện"]);

  return [
    {
      name: "smoke-ghi-chu.txt",
      mimeType: "text/plain",
      previewKind: "text",
      buffer: Buffer.from("Kiem tra file dinh kem Squad 2 UAT.", "utf8")
    },
    {
      name: "smoke-anh.png",
      mimeType: "image/png",
      previewKind: "inline",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64")
    },
    {
      name: "smoke-bao-cao.pdf",
      mimeType: "application/pdf",
      previewKind: "inline",
      buffer: minimalPdf()
    },
    {
      name: "smoke-huong-dan.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      previewKind: "document",
      buffer: await minimalDocx()
    },
    {
      name: "smoke-ke-hoach.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      previewKind: "workbook",
      buffer: Buffer.from(await workbook.xlsx.writeBuffer())
    },
    {
      name: "smoke-trinh-bay.pptx",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      previewKind: "unavailable",
      buffer: await minimalPptx()
    }
  ];
}

function minimalPdf() {
  return Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    + "2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\n"
    + "xref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n"
    + "trailer<</Size 3/Root 1 0 R>>\nstartxref\n110\n%%EOF\n",
    "ascii"
  );
}

async function minimalDocx() {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    </Types>`);
  zip.folder("_rels").file(".rels", `<?xml version="1.0" encoding="UTF-8"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>`);
  zip.folder("word").file("document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body><w:p><w:r><w:t>Huong dan su dung Squad 2 UAT</w:t></w:r></w:p><w:sectPr/></w:body>
    </w:document>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

async function minimalPptx() {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="xml" ContentType="application/xml"/>
    </Types>`);
  zip.file("README.txt", "Smoke PowerPoint attachment");
  return zip.generateAsync({ type: "nodebuffer" });
}
