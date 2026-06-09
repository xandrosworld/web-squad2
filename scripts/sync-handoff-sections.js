const fs = require("fs");
const path = require("path");

const { Pool } = require("pg");

const { parseWorkbookImportState } = require("../server");

const workbookPath = path.resolve(process.argv[2] || "SQ02_UAT_Squad2_QuanLy_HoanChinh_US_Date.xlsm");
const databaseUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});

async function main() {
  if (!databaseUrl) throw new Error("DATABASE_PUBLIC_URL or DATABASE_URL is required.");
  if (!fs.existsSync(workbookPath)) throw new Error(`Workbook not found: ${workbookPath}`);

  const workbookBuffer = fs.readFileSync(workbookPath);
  const importState = await parseWorkbookImportState(workbookBuffer);
  const mapped = (importState.handoffs || [])
    .filter((row) => row.jiraCode && row.sectionLevel1)
    .map((row) => ({
      id: row.id,
      jiraCode: String(row.jiraCode || "").trim(),
      sectionLevel1: String(row.sectionLevel1 || "").trim(),
      sectionLevel2: String(row.sectionLevel2 || "").trim()
    }));

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 2,
    idleTimeoutMillis: 10000
  });

  const client = await pool.connect();
  let updated = 0;
  const missing = [];
  const now = new Date();
  const nowIso = now.toISOString();
  try {
    await client.query("begin");
    for (const row of mapped) {
      const result = await client.query(`
        update uat_records
        set data = jsonb_set(
              jsonb_set(
                jsonb_set(data, '{sectionLevel1}', to_jsonb($3::text), true),
                '{sectionLevel2}',
                to_jsonb($4::text),
                true
              ),
              '{updatedAt}',
              to_jsonb($5::text),
              true
            ),
            updated_at = $6
        where collection = 'handoffs'
          and (id = $1 or lower(coalesce(data->>'jiraCode', '')) = $2)
        returning id
      `, [row.id, row.jiraCode.toLowerCase(), row.sectionLevel1, row.sectionLevel2, nowIso, now]);
      if (result.rowCount) {
        updated += result.rowCount;
      } else {
        missing.push(row.jiraCode);
      }
    }
    await client.query(`
      insert into app_meta (key, value, updated_at)
      values ('state', $1::jsonb, now())
      on conflict (key) do update
        set value = excluded.value,
            updated_at = excluded.updated_at
    `, [JSON.stringify({ updatedAt: nowIso })]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

  console.log(JSON.stringify({
    ok: true,
    workbook: path.basename(workbookPath),
    mapped: mapped.length,
    updated,
    missing
  }, null, 2));
}
