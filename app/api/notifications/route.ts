import { env } from "cloudflare:workers";
import { getActor, writeAudit } from "../../../db/runtime";

export async function GET(request: Request) {
  const actor = await getActor(request);
  if (!actor) return Response.json({ notifications: [], unread: 0 }, { status: 401 });
  const url = new URL(request.url), limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20) || 20));
  const [items, unread] = await env.DB.batch([
    env.DB.prepare("SELECT id,type,title,body,target_url AS targetUrl,read_at AS readAt,created_at AS createdAt FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT ?").bind(actor.id, limit),
    env.DB.prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id=? AND read_at IS NULL").bind(actor.id),
  ]);
  return Response.json({ notifications: items.results, unread: Number(unread.results[0]?.count || 0) });
}
export async function PATCH(request: Request) {
  const actor = await getActor(request);
  if (!actor) return Response.json({ error: "请先登录" }, { status: 401 });
  const body = await request.json() as { id?: string; all?: boolean };
  if (body.all) await env.DB.prepare("UPDATE notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE user_id=?").bind(actor.id).run();
  else if (body.id) await env.DB.prepare("UPDATE notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE id=? AND user_id=?").bind(body.id, actor.id).run();
  else return Response.json({ error: "缺少通知标识" }, { status: 400 });
  await writeAudit(actor.id, "read-notification", "notification", body.all ? "all" : String(body.id));
  return Response.json({ ok: true });
}
