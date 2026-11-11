import { env } from "cloudflare:workers";
import { ensureCoreSchema, getActor, requireAdmin, type PlatformActor } from "../../db/runtime";
export type BusinessRole = "campus_partner" | "content_reviewer" | "project_lead";
export type Grant = { id: string; userId: string; role: BusinessRole; schoolId: string | null; schoolName: string | null; status: string; createdAt: string };
export async function businessContext(request: Request) {
  await ensureCoreSchema();
  const actor = request.headers.get("x-starlight-scope") === "admin" ? await requireAdmin(request) : await getActor(request) || await requireAdmin(request);
  if (actor?.role === "student") {
    const profile = await env.DB.prepare("SELECT json_extract(payload,'$.name') AS name FROM workspace_records WHERE owner_id=? AND kind='student-profile' AND archived_at IS NULL LIMIT 1").bind(actor.id).first<{ name: string }>();
    if (typeof profile?.name === "string" && profile.name.trim()) actor.name = profile.name.trim();
  }
  const grants = actor ? (await env.DB.prepare("SELECT g.id,g.user_id AS userId,g.role,g.school_id AS schoolId,s.name AS schoolName,g.status,g.created_at AS createdAt FROM business_grants g LEFT JOIN schools s ON s.id=g.school_id WHERE g.user_id=? AND g.status='active' AND (s.id IS NULL OR s.status='active')").bind(actor.id).all<Grant>()).results : [];
  return { actor, grants, owner: actor?.role === "admin" };
}
export type BusinessContext = Awaited<ReturnType<typeof businessContext>>;
export const hasBusinessRole = (context: BusinessContext, role: BusinessRole) => context.owner || context.grants.some(g => g.role === role);
export const managesSchool = (context: BusinessContext, schoolId: string) => context.owner || context.grants.some(g => g.role === "campus_partner" && g.schoolId === schoolId);
export async function businessReviewer(request: Request): Promise<PlatformActor | null> {
  const context = await businessContext(request);
  return hasBusinessRole(context, "content_reviewer") || hasBusinessRole(context, "project_lead") ? context.actor : null;
}
export async function businessHost(request: Request, publisherId: string) {
  const context = await businessContext(request);
  if (!context.actor) return false;
  if (publisherId.startsWith("school:")) return managesSchool(context, publisherId.slice(7));
  if (publisherId.startsWith("ja:")) return hasBusinessRole(context, "project_lead");
  return context.actor.role === "enterprise" && context.actor.id === publisherId;
}
export function assertMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new CampusError("请求来源不受信任", 403);
}
export class CampusError extends Error { constructor(message: string, public status = 400) { super(message); } }
export const campusError = (error: unknown) => Response.json({ error: error instanceof CampusError ? error.message : error instanceof SyntaxError ? "请求数据格式不正确" : "操作未能完成，请刷新后重试" }, { status: error instanceof CampusError ? error.status : error instanceof SyntaxError ? 400 : 500 });
export function campusPepper() { const value = String((env as unknown as { AUTH_PEPPER?: string }).AUTH_PEPPER || ""); if (value.length < 24) throw new CampusError("认证服务配置不完整", 503); return value; }
export const requiredText = (value: unknown, label: string, max = 120) => { const text = String(value || "").trim(); if (!text || text.length > max) throw new CampusError(`${label}须填写且不超过 ${max} 字`); return text; };
