import { env } from "cloudflare:workers";
import { businessContext, hasBusinessRole } from "../../../lib/campus/access";
export async function GET(request: Request) {
  const context = await businessContext(request);
  if (!context.actor) return Response.json({ error: "请先登录" }, { status: 401 });
  if (!hasBusinessRole(context, "content_reviewer") && !hasBusinessRole(context, "project_lead")) return Response.json({ error: "尚未获得平台业务权限" }, { status: 403 });
  const records = await env.DB.prepare("SELECT id,owner_id AS ownerId,kind,payload,version,updated_at AS updatedAt FROM workspace_records WHERE archived_at IS NULL AND kind IN ('activity','content') AND json_extract(payload,'$.reviewStatus')<>'draft' ORDER BY updated_at DESC LIMIT 500").all();
  const organizations = hasBusinessRole(context, "project_lead") ? (await env.DB.prepare("SELECT id,name,credit_code AS creditCode,verification_status AS verificationStatus FROM organizations ORDER BY created_at DESC LIMIT 500").all()).results : [];
  return Response.json({ records: records.results.map(r => ({ ...r, payload: JSON.parse(String(r.payload)) })), organizations }, { headers: { "cache-control": "no-store" } });
}
