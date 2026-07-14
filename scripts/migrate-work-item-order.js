const { Pool } = require("pg");

require("dotenv").config();

const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
const shouldApply = process.argv.includes("--apply");

if (!connectionString) {
  throw new Error("DATABASE_PUBLIC_URL hoặc DATABASE_URL chưa được cấu hình.");
}

const pool = new Pool({
  connectionString,
  ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false }
});

(async () => {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const before = await getOrderSummary(client);

    if (shouldApply) {
      await client.query(`
        insert into app_meta (key, value, updated_at)
        select 'backup-work-item-order-20260714',
               jsonb_build_object(
                 'createdAt', now(),
                 'records', coalesce(jsonb_agg(jsonb_build_object('id', id, 'sortOrder', data->'sortOrder')), '[]'::jsonb)
               ),
               now()
        from uat_records
        where collection = 'workItems'
        on conflict (key) do nothing
      `);

    }

    await client.query(`
      with ranked as (
        select id,
               row_number() over (
                 partition by coalesce(data->>'categoryId', '')
                 order by
                   case when data->>'sortOrder' ~ '^[0-9]+(\\.[0-9]+)?$' then (data->>'sortOrder')::numeric end nulls last,
                   data->>'taskId' nulls last,
                   created_at,
                   id
               )::integer as local_order
        from uat_records
        where collection = 'workItems'
      )
      update uat_records records
      set data = jsonb_set(records.data, '{sortOrder}', to_jsonb(ranked.local_order), true)
      from ranked
      where records.collection = 'workItems'
        and records.id = ranked.id
    `);

    if (shouldApply) {
      const updatedAt = new Date().toISOString();
      await client.query(`
        insert into app_meta (key, value, updated_at)
        values ('state', $1::jsonb, now())
        on conflict (key) do update
          set value = excluded.value,
              updated_at = excluded.updated_at
      `, [JSON.stringify({ updatedAt })]);
    }

    const after = await getOrderSummary(client);
    assertContiguous(after);

    if (shouldApply) await client.query("commit");
    else await client.query("rollback");

    console.log(JSON.stringify({
      ok: true,
      mode: shouldApply ? "applied" : "dry-run",
      total: after.reduce((sum, row) => sum + Number(row.total), 0),
      categories: after
    }, null, 2));
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
})().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});

async function getOrderSummary(client) {
  const result = await client.query(`
    select coalesce(data->>'categoryId', '') as category_id,
           count(*)::integer as total,
           min(case when data->>'sortOrder' ~ '^[0-9]+$' then (data->>'sortOrder')::integer end)::integer as min_order,
           max(case when data->>'sortOrder' ~ '^[0-9]+$' then (data->>'sortOrder')::integer end)::integer as max_order,
           count(distinct case when data->>'sortOrder' ~ '^[0-9]+$' then (data->>'sortOrder')::integer end)::integer as distinct_orders
    from uat_records
    where collection = 'workItems'
    group by coalesce(data->>'categoryId', '')
    order by category_id
  `);
  return result.rows;
}

function assertContiguous(rows) {
  for (const row of rows) {
    const total = Number(row.total);
    if (!total) continue;
    if (Number(row.min_order) !== 1 || Number(row.max_order) !== total || Number(row.distinct_orders) !== total) {
      throw new Error(`STT nhóm ${row.category_id || "không phân nhóm"} chưa liên tục 1-${total}.`);
    }
  }
}
