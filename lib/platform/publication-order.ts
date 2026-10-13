type Database = Pick<import("@cloudflare/workers-types").D1Database, "prepare">;

export function publicationRank(value: unknown): number | null {
  if (value === undefined || value === null || value === "" || value === 0 || value === "0") return null;
  const rank = Number(value);
  if (!Number.isSafeInteger(rank) || rank < 1 || rank > 1000000) throw new Error("排名应为1至1000000的整数");
  return rank;
}

// Run in the publication write transaction. Removing the moving record first
// closes its old gap; inserting at a taken position shifts subsequent records.
export function publicationOrderStatement(db: Database, kind: string, id: string, requested: number | null) {
  return db.prepare(`WITH others AS (
    SELECT id,ROW_NUMBER() OVER (ORDER BY
      CASE WHEN CAST(json_extract(payload,'$.sortOrder') AS INTEGER)>0 THEN CAST(json_extract(payload,'$.sortOrder') AS INTEGER) ELSE 2147483647 END,
      COALESCE(published_at,updated_at) DESC,id) AS position
    FROM workspace_records WHERE kind=? AND archived_at IS NULL
      AND json_extract(payload,'$.reviewStatus')='approved' AND id<>?
  ), insertion AS (
    SELECT MIN(COALESCE(?,COUNT(*)+1),COUNT(*)+1) AS position FROM others
  ), positions AS (
    SELECT id,position+CASE WHEN position>=(SELECT position FROM insertion) THEN 1 ELSE 0 END AS position FROM others
    UNION ALL SELECT ?,position FROM insertion
      WHERE EXISTS(SELECT 1 FROM workspace_records WHERE id=? AND archived_at IS NULL AND json_extract(payload,'$.reviewStatus')='approved')
  ) UPDATE workspace_records SET payload=json_set(payload,'$.sortOrder',(SELECT position FROM positions WHERE positions.id=workspace_records.id)),
      version=version+1
    WHERE id IN (SELECT id FROM positions) AND COALESCE(json_extract(payload,'$.sortOrder'),0)<>(SELECT position FROM positions WHERE positions.id=workspace_records.id)`)
    .bind(kind, id, requested, id, id);
}

export function compactPublicationOrderStatement(db: Database, kind: string) {
  return publicationOrderStatement(db, kind, "", null);
}
