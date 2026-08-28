import { env } from "cloudflare:workers";
import { ensureCoreSchema } from "../../../db/runtime";

function inScope(payload: Record<string, unknown>) {
  if (payload.reviewStatus !== "approved") return false;
  const scope = String(payload.region || payload.city || payload.place || "湖南");
  return ["湖南", "长沙", "株洲", "湘潭", "岳阳", "常德", "衡阳"].some((place) => scope.includes(place));
}
function parse(row: Record<string, unknown>) {
  try { return { ...row, payload: JSON.parse(String(row.payload)) as Record<string, unknown> }; }
  catch { return null; }
}
export async function GET(request: Request) {
  await ensureCoreSchema();
  const url = new URL(request.url), id = String(url.searchParams.get("id") || "");
  if (id) {
    const row = await env.DB.prepare("SELECT id,kind,payload,version,updated_at AS updatedAt FROM workspace_records WHERE id=? AND kind IN ('job','activity','content') AND archived_at IS NULL LIMIT 1").bind(id).first();
    const record = row ? parse(row as Record<string, unknown>) : null;
    return record && inScope(record.payload) ? Response.json({ record }, { headers: { "cache-control": "public, max-age=60" } }) : Response.json({ error: "内容不存在或尚未公开" }, { status: 404 });
  }
  const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 50) || 50));
  const offset = (page - 1) * pageSize;
  const [rows, count] = await env.DB.batch([
    env.DB.prepare("SELECT id,kind,payload,version,updated_at AS updatedAt FROM workspace_records WHERE kind IN ('job','activity','content') AND archived_at IS NULL AND json_extract(payload,'$.reviewStatus')='approved' ORDER BY updated_at DESC LIMIT ? OFFSET ?").bind(pageSize, offset),
    env.DB.prepare("SELECT COUNT(*) AS count FROM workspace_records WHERE kind IN ('job','activity','content') AND archived_at IS NULL AND json_extract(payload,'$.reviewStatus')='approved'"),
  ]);
  const records = rows.results.map((row) => parse(row as Record<string, unknown>)).filter((row): row is NonNullable<typeof row> => Boolean(row && inScope(row.payload))).sort((a, b) => Number(b.payload.sortOrder || 0) - Number(a.payload.sortOrder || 0) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const total = Number(count.results[0]?.count || 0);
  return Response.json({ records, page, pageSize, total, hasMore: offset + pageSize < total }, { headers: { "cache-control": "public, max-age=60" } });
}
