const fs = require("fs");
const path = require("path");

require("dotenv").config();

const { Pool } = require("pg");

const { parseWorkbookImportState } = require("../server");

const workbookPath = path.resolve(process.argv[2] || "SQ02_UAT_Squad2_QuanLy_HoanChinh_US_Date.xlsm");
const databaseUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
const collections = ["features", "personnel", "schedule", "handoffs", "plans", "daily", "defects", "userStories", "bugSources", "defectSummary", "weekly", "readiness", "matrix", "guide"];

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});

async function main() {
  if (!databaseUrl) throw new Error("DATABASE_PUBLIC_URL or DATABASE_URL is required.");
  if (!fs.existsSync(workbookPath)) throw new Error(`Workbook not found: ${workbookPath}`);

  const workbookBuffer = fs.readFileSync(workbookPath);
  const importState = await parseWorkbookImportState(workbookBuffer);
  const expectedCounts = countCollections(importState);

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 2,
    idleTimeoutMillis: 10000
  });

  const client = await pool.connect();
  try {
    const backup = await client.query(`
      select collection, id, data, created_by, updated_by, created_at, updated_at
      from uat_records
      where collection = any($1)
      order by collection asc, updated_at desc
    `, [collections]);
    const backupPath = writeBackup(backup.rows);
    const actor = await resolveActor(client);
    const now = new Date();

    await client.query("begin");
    await client.query("delete from uat_records where collection = any($1)", [collections]);

    for (const collection of collections) {
      for (const record of importState[collection] || []) {
        const data = {
          ...record,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        };
        await client.query(`
          insert into uat_records (collection, id, data, created_by, updated_by, created_at, updated_at)
          values ($1, $2, $3::jsonb, $4, $4, $5, $5)
        `, [collection, record.id, JSON.stringify(data), actor, now]);
      }
    }

    const updatedAt = importState.updatedAt || now.toISOString();
    await client.query(`
      insert into app_meta (key, value, updated_at)
      values ('state', $1::jsonb, now())
      on conflict (key) do update
        set value = excluded.value,
            updated_at = excluded.updated_at
    `, [JSON.stringify({ updatedAt })]);

    const dbCounts = await countDbRecords(client);
    validateCounts(expectedCounts, dbCounts);
    const sample = await client.query(`
      select data->>'group' as group_name,
             data->>'sprint' as sprint,
             data->>'owner' as owner,
             data->>'totalCases' as total_cases,
             data->>'status' as status
      from uat_records
      where collection = 'features'
      order by (data->>'stt')::int asc nulls last
      limit 1
    `);

    await client.query("commit");

    console.log(JSON.stringify({
      ok: true,
      workbook: path.basename(workbookPath),
      backupPath,
      updatedAt,
      expectedCounts,
      dbCounts,
      sampleFeature: sample.rows[0] || null
    }, null, 2));
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function resolveActor(client) {
  const admin = await client.query(`
    select id
    from app_users
    where role = 'admin'
    order by created_at asc
    limit 1
  `);
  if (admin.rows[0]?.id) return admin.rows[0].id;
  const anyUser = await client.query(`
    select id
    from app_users
    order by created_at asc
    limit 1
  `);
  return anyUser.rows[0]?.id || null;
}

async function countDbRecords(client) {
  const result = await client.query(`
    select collection, count(*)::int as count
    from uat_records
    where collection = any($1)
    group by collection
  `, [collections]);
  return result.rows.reduce((acc, row) => {
    acc[row.collection] = Number(row.count || 0);
    return acc;
  }, {});
}

function countCollections(state) {
  return collections.reduce((acc, collection) => {
    acc[collection] = Array.isArray(state[collection]) ? state[collection].length : 0;
    return acc;
  }, {});
}

function validateCounts(expected, actual) {
  const mismatches = collections.filter((collection) => Number(expected[collection] || 0) !== Number(actual[collection] || 0));
  if (mismatches.length) {
    throw new Error([
      "Imported DB counts do not match workbook counts.",
      ...mismatches.map((collection) => `${collection}: expected ${expected[collection]}, got ${actual[collection] || 0}`)
    ].join("\n"));
  }
}

function writeBackup(rows) {
  const dir = path.join(process.cwd(), "import", "backups");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const output = path.join(dir, `railway-backup-${stamp}.json`);
  fs.writeFileSync(output, JSON.stringify(rows, null, 2), "utf8");
  return output;
}
