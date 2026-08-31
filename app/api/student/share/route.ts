import { env } from "cloudflare:workers";
import { ensureCoreSchema, getActor, writeAudit } from "../../../../db/runtime";
import { hashOpaqueToken, randomToken } from "../../../../lib/auth/crypto";
import { validateMutationOrigin } from "../../../../lib/auth/request";
import { normalizeShareDays, shareExpiresAt } from "../../../../lib/services/student-share";

async function actor(request: Request) {
  await ensureCoreSchema();
  const identity = await getActor(request);
  if (!identity || (identity.role !== "student" && !identity.testMode)) return null;
  return identity;
}

export async function GET(request: Request) {
  const identity = await actor(request);
  if (!identity) return Response.json({ error: "请先登录学生账号" }, { status: 401 });
  const share = await env.DB.prepare("SELECT id,status,expires_at AS expiresAt,created_at AS createdAt FROM student_profile_shares WHERE student_id=? AND status='active' AND expires_at>CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 1").bind(identity.id).first();
  return Response.json({ share: share || null }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  validateMutationOrigin(request, env as unknown as { AUTH_TRUSTED_ORIGINS?: string });
  const identity = await actor(request);
  if (!identity) return Response.json({ error: "请先登录学生账号" }, { status: 401 });
  const body = await request.json() as { days?: number };
  const days = normalizeShareDays(body.days), id = crypto.randomUUID(), secret = randomToken(32);
  const pepper = String((env as unknown as { AUTH_PEPPER?: string }).AUTH_PEPPER || "");
  const tokenHash = await hashOpaqueToken(secret, pepper), expiresAt = shareExpiresAt(days);
  await env.DB.batch([
    env.DB.prepare("UPDATE student_profile_shares SET status='revoked',revoked_at=CURRENT_TIMESTAMP WHERE student_id=? AND status='active'").bind(identity.id),
    env.DB.prepare("INSERT INTO student_profile_shares(id,student_id,token_hash,status,expires_at,created_at) VALUES(?,?,?,'active',?,CURRENT_TIMESTAMP)").bind(id, identity.id, tokenHash, expiresAt),
  ]);
  await writeAudit(identity.id, "create-growth-share", "student-profile-share", id);
  return Response.json({ url: new URL(`/growth/share/${id}.${secret}`, request.url).toString(), expiresAt, days }, { status: 201, headers: { "cache-control": "no-store" } });
}

export async function DELETE(request: Request) {
  validateMutationOrigin(request, env as unknown as { AUTH_TRUSTED_ORIGINS?: string });
  const identity = await actor(request);
  if (!identity) return Response.json({ error: "请先登录学生账号" }, { status: 401 });
  await env.DB.prepare("UPDATE student_profile_shares SET status='revoked',revoked_at=CURRENT_TIMESTAMP WHERE student_id=? AND status='active'").bind(identity.id).run();
  await writeAudit(identity.id, "revoke-growth-share", "student-profile-share", identity.id);
  return Response.json({ ok: true });
}
