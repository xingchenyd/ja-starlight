import { env } from "cloudflare:workers";
import { ensureCoreSchema } from "../../../db/runtime";
import { isPublicNow, sortPublicRecords } from "../../../lib/catalog/public-catalog";

function inScope(payload: Record<string, unknown>) {
  if (!isPublicNow(payload)) return false;
  const scope = String(payload.region || payload.city || payload.place || "湖南");
  return ["湖南", "长沙", "株洲", "湘潭", "岳阳", "常德", "衡阳"].some((place) => scope.includes(place));
}
function parse(row: Record<string, unknown>): (Record<string, unknown> & { payload: Record<string, unknown> }) | null {
  try { return { ...row, payload: JSON.parse(String(row.payload)) as Record<string, unknown> }; }
  catch { return null; }
}
export async function GET(request: Request) {
  await ensureCoreSchema();
  const url = new URL(request.url), id = String(url.searchParams.get("id") || "");
  if (id) {
    const row = await env.DB.prepare("SELECT id,kind,payload,version,updated_at AS updatedAt FROM workspace_records WHERE id=? AND kind IN ('job','activity','content') AND archived_at IS NULL LIMIT 1").bind(id).first();
    const record = row ? parse(row as Record<string, unknown>) : null;
    return record && inScope(record.payload) ? Response.json({ record }, { headers: { "cache-control": "no-store" } }) : Response.json({ error: "内容不存在或尚未公开" }, { status: 404 });
  }
  const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 50) || 50));
  const offset = (page - 1) * pageSize;
  // Sort/filter before pagination so earlier-ranked records never disappear on a later page.
  const rows = await env.DB.prepare("SELECT id,kind,payload,version,updated_at AS updatedAt FROM workspace_records WHERE kind IN ('job','activity','content') AND archived_at IS NULL AND json_extract(payload,'$.reviewStatus')='approved'").all<Record<string, unknown>>();
  const all = sortPublicRecords(rows.results.map(parse).filter((row): row is NonNullable<typeof row> => Boolean(row && inScope(row.payload))) as { id: string; kind: string; payload: Record<string, unknown> }[]);
  const total = all.length;
  return Response.json({ records: all.slice(offset, offset + pageSize), page, pageSize, total, hasMore: offset + pageSize < total }, { headers: { "cache-control": "no-store" } });
}
