const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ExcelJS = require("exceljs");
const { Pool } = require("pg");

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/import-features-from-excel.js <workbook.xlsx>");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_PUBLIC_URL or DATABASE_URL is required.");
  process.exit(1);
}

const allowedStatuses = new Set(["Done RSD", "Done DEV", "Done SIT", "Done UAT", ""]);
const allowedOwners = new Set([
  "NV1 - Bùi Thị Mai Phương",
  "NV2 - Nguyễn Châu Giang",
  "NV3 - Phạm Anh Tuấn",
  "ALL",
  "BA",
  ""
]);
const headerAliases = {
  stt: ["stt", "so thu tu"],
  code: ["ma chuc nang"],
  storyCode: ["ma story"],
  jiraCode: ["ma jira"],
  group: ["nhom chuc nang"],
  name: ["ten chuc nang"],
  jiraName: ["ten jira"],
  jiraLink: ["link jira"],
  rsdLink: ["link rsd"],
  sprintBA: ["sprint ba"],
  sprintDev: ["sprint dev"],
  sprintQC: ["sprint qc"],
  businessSprint: ["sprint nghiep vu"],
  sprint: ["sprint"],
  status: ["trang thai"],
  owner: ["dau moi nghiep vu", "nghiep vu", "chu quan", "chu quan nv"],
  uatStatus: ["trang thai uat"],
  uatHandoff: ["ban giao uat", "ngay ban giao uat"],
  uatStart: ["ngay bat dau uat", "bat dau uat"],
  uatEnd: ["ngay ket thuc uat", "ket thuc uat"],
  uatDone: ["hoan thanh uat", "ngay hoan thanh uat"],
  uatSigned: ["ngay ky uat"],
  handoffStatus: ["tinh trang ban giao", "trang thai ban giao"],
  completionRate: ["hoan thanh tc", "phan tram hoan thanh tc"],
  openBugs: ["so loi mo"],
  uatWarning: ["canh bao uat"]
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const absoluteInput = path.resolve(inputPath);
  if (!fs.existsSync(absoluteInput)) throw new Error(`Workbook not found: ${absoluteInput}`);

  const records = await parseWorkbook(absoluteInput);
  if (!records.length) throw new Error("No valid feature rows found.");
  validateRecords(records);

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 2,
    idleTimeoutMillis: 10000
  });

  const client = await pool.connect();
  try {
    await client.query("begin");
    const actorId = await getActorId(client);
    const backup = await client.query(
      "select id, data, created_by, updated_by, created_at, updated_at from uat_records where collection = $1 order by updated_at desc",
      ["features"]
    );
    const backupPath = writeBackup(backup.rows);

    await client.query("delete from uat_records where collection = $1", ["features"]);
    const now = new Date();
    for (const record of records) {
      record.createdAt = now.toISOString();
      record.updatedAt = now.toISOString();
      await client.query(`
        insert into uat_records (collection, id, data, created_by, updated_by, created_at, updated_at)
        values ($1, $2, $3::jsonb, $4, $4, $5, $5)
      `, ["features", record.id, JSON.stringify(record), actorId, now]);
    }

    const updatedAt = new Date().toISOString();
    await client.query(`
      insert into app_meta (key, value, updated_at)
      values ('state', $1::jsonb, now())
      on conflict (key) do update
        set value = excluded.value,
            updated_at = excluded.updated_at
    `, [JSON.stringify({ updatedAt })]);
    await client.query("commit");

    const summary = summarize(records);
    console.log(JSON.stringify({
      ok: true,
      imported: records.length,
      backupPath,
      firstCode: records[0].code,
      lastCode: records[records.length - 1].code,
      groups: summary.groups,
      statuses: summary.statuses,
      owners: summary.owners
    }, null, 2));
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function parseWorkbook(workbookPath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const worksheet = findWorksheet(workbook);
  if (!worksheet) throw new Error("Could not find a worksheet with the feature catalog header.");
  const header = findHeader(worksheet);
  if (!header) throw new Error("Could not find the feature catalog header row.");

  const records = [];
  for (let rowNumber = header.rowNumber + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const values = readRow(worksheet.getRow(rowNumber), header.map);
    if (isHeaderLike(values)) continue;
    const code = cleanText(values.code);
    const jiraCode = cleanText(values.jiraCode);
    const name = cleanText(values.name || values.jiraName);
    if (!code && !jiraCode && !name) continue;
    records.push({
      id: importId("features", jiraCode || code || name),
      stt: toNumber(values.stt) || records.length + 1,
      code,
      storyCode: cleanText(values.storyCode),
      jiraCode,
      group: cleanText(values.group),
      jiraName: cleanText(values.jiraName),
      name,
      jiraLink: cleanText(values.jiraLink),
      rsdLink: cleanText(values.rsdLink),
      sprintBA: cleanText(values.sprintBA),
      sprintDev: cleanText(values.sprintDev),
      sprintQC: cleanText(values.sprintQC),
      businessSprint: cleanText(values.businessSprint),
      sprint: cleanText(values.businessSprint) || cleanText(values.sprintQC) || cleanText(values.sprint),
      status: normalizeStatus(values.status),
      owner: normalizeOwner(values.owner),
      uatHandoff: toDateInput(values.uatHandoff),
      uatStart: toDateInput(values.uatStart),
      uatEnd: toDateInput(values.uatEnd),
      uatDone: toDateInput(values.uatDone),
      uatSigned: toDateInput(values.uatSigned),
      handoffStatus: cleanText(values.handoffStatus),
      completionRate: toPercent(values.completionRate),
      openBugs: toNumber(values.openBugs),
      uatWarning: cleanText(values.uatWarning)
    });
  }
  return records;
}

function findWorksheet(workbook) {
  const dm = workbook.getWorksheet("DM_ChucNang");
  if (dm && findHeader(dm)) return dm;
  const named = workbook.getWorksheet("01_DanhMuc_UAT");
  if (named && findHeader(named)) return named;
  return workbook.worksheets.find((sheet) => findHeader(sheet)) || null;
}

function findHeader(worksheet) {
  for (let rowNumber = 1; rowNumber <= Math.min(worksheet.rowCount, 120); rowNumber += 1) {
    const map = buildHeaderMap(worksheet.getRow(rowNumber));
    if (map.code && map.name && (map.storyCode || map.jiraCode || map.sprint || map.status)) {
      return { rowNumber, map };
    }
  }
  return null;
}

function buildHeaderMap(row) {
  const map = {};
  for (let column = 1; column <= row.cellCount; column += 1) {
    const label = normalizeHeader(row.getCell(column).value);
    if (!label) continue;
    for (const [key, aliases] of Object.entries(headerAliases)) {
      if (!map[key] && aliases.includes(label)) map[key] = column;
    }
  }
  return map;
}

function readRow(row, map) {
  return Object.fromEntries(Object.keys(headerAliases).map((key) => [
    key,
    map[key] ? unwrapCell(row.getCell(map[key]).value) : ""
  ]));
}

function isHeaderLike(values) {
  return normalizeHeader(values.code) === "ma chuc nang"
    || normalizeHeader(values.name) === "ten chuc nang";
}

function normalizeHeader(value) {
  return cleanText(unwrapCell(value))
    .toLocaleLowerCase("vi")
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unwrapCell(value) {
  if (value == null) return "";
  if (value instanceof Date) return value;
  if (typeof value !== "object") return value;
  if (Object.prototype.hasOwnProperty.call(value, "result")) return unwrapCell(value.result);
  if (typeof value.text === "string") return value.text;
  if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("");
  return "";
}

function cleanText(value) {
  if (value == null) return "";
  if (value instanceof Date) return formatDateInput(value);
  return String(value).replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  if (isBlank(value)) return "";
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : "";
}

function toPercent(value) {
  const number = toNumber(value);
  if (number === "") return "";
  return number > 0 && number <= 1 ? Math.round(number * 100) : Math.round(number);
}

function importId(collection, ...parts) {
  return crypto
    .createHash("sha1")
    .update([collection, ...parts].map((part) => String(part || "")).join("|"))
    .digest("hex");
}

function normalizeStatus(value) {
  const text = cleanText(value);
  if (!text) return "";
  const normalized = normalizeHeader(text);
  for (const status of allowedStatuses) {
    if (normalizeHeader(status) === normalized) return status;
  }
  return text;
}

function normalizeOwner(value) {
  const text = cleanText(value);
  if (!text) return "";
  if (text.toLocaleLowerCase("vi") === "all") return "ALL";
  if (text.toLocaleLowerCase("vi") === "ba") return "BA";
  return text;
}

function toDateInput(value) {
  if (isBlank(value)) return "";
  if (value instanceof Date) return formatDateInput(value);
  if (typeof value === "number" && Number.isFinite(value)) {
    return formatDateInput(new Date(Date.UTC(1899, 11, 30) + value * 24 * 60 * 60 * 1000));
  }
  const text = cleanText(value);
  const match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
    return formatDateInput(new Date(Date.UTC(year, month - 1, day)));
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : formatDateInput(parsed);
}

function formatDateInput(date) {
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : "";
}

function isBlank(value) {
  return value === "" || value == null;
}

function validateRecords(records) {
  records.forEach((record, index) => {
    if (!record.code) throw new Error(`Row ${index + 1}: code is required.`);
    if (!record.name) throw new Error(`Row ${index + 1}: name is required.`);
    if (!allowedStatuses.has(record.status)) {
      throw new Error(`Row ${index + 1}: unsupported status "${record.status}".`);
    }
    if (!allowedOwners.has(record.owner)) {
      throw new Error(`Row ${index + 1}: unsupported owner "${record.owner}".`);
    }
  });
}

async function getActorId(client) {
  const preferred = cleanText(process.env.APP_USER).toLowerCase();
  if (preferred) {
    const preferredResult = await client.query(`
      select id from app_users
      where lower(username) = $1 or lower(coalesce(email, '')) = $1
      limit 1
    `, [preferred]);
    if (preferredResult.rows[0]) return preferredResult.rows[0].id;
  }
  const result = await client.query("select id from app_users where role = 'admin' order by created_at asc limit 1");
  return result.rows[0]?.id || null;
}

function writeBackup(rows) {
  const dir = path.join(process.cwd(), "import", "backups");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const output = path.join(dir, `features-backup-${stamp}.json`);
  fs.writeFileSync(output, JSON.stringify(rows, null, 2), "utf8");
  return output;
}

function summarize(records) {
  return {
    groups: countBy(records, "group"),
    statuses: countBy(records, "status"),
    owners: countBy(records, "owner")
  };
}

function countBy(records, key) {
  return records.reduce((acc, record) => {
    const value = record[key] || "(blank)";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}
