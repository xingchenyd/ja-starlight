type Database = Pick<import("@cloudflare/workers-types").D1Database, "prepare" | "batch">;
const migration = "production-publication-order-20261013";

export async function ensureLaunchMigration(db: Database) {
  if (await db.prepare("SELECT id FROM system_migrations WHERE id=?").bind(migration).first()) return;
  // Guards live in the transaction as well as the early read, so simultaneous
  // first requests cannot reverse or renumber the migrated order twice.
  await db.batch([
    db.prepare("UPDATE workspace_records SET payload=json_set(payload,'$.reviewStatus','approved','$.status','已发布','$.reviewNote','星光计划运营后台直接发布'),published_at=COALESCE(published_at,CURRENT_TIMESTAMP),version=version+1 WHERE owner_id LIKE 'ja:%' AND kind IN ('activity','content') AND archived_at IS NULL AND json_extract(payload,'$.reviewStatus')='pending' AND NOT EXISTS(SELECT 1 FROM system_migrations WHERE id=?)").bind(migration),
    db.prepare(`WITH ranked AS (SELECT id,ROW_NUMBER() OVER(PARTITION BY kind ORDER BY COALESCE(json_extract(payload,'$.sortOrder'),0) DESC,updated_at DESC,id) AS position FROM workspace_records WHERE kind IN ('job','activity','content') AND archived_at IS NULL AND json_extract(payload,'$.reviewStatus')='approved') UPDATE workspace_records SET payload=json_set(payload,'$.sortOrder',(SELECT position FROM ranked WHERE ranked.id=workspace_records.id)),version=version+1 WHERE id IN (SELECT id FROM ranked) AND NOT EXISTS(SELECT 1 FROM system_migrations WHERE id=?)`).bind(migration),
    db.prepare("INSERT OR IGNORE INTO system_migrations(id) VALUES(?)").bind(migration),
  ]);
}
