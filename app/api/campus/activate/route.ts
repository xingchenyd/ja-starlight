import { env } from "cloudflare:workers";
import { ensureCoreSchema } from "../../../../db/runtime";
import { assertMutationOrigin, CampusError, campusError, campusPepper } from "../../../../lib/campus/access";
import { hashOpaqueToken, hashPassword, validatePassword } from "../../../../lib/auth/crypto";
export async function POST(request: Request) {
  try {
    assertMutationOrigin(request); await ensureCoreSchema();
    const body = await request.json() as { token?: string; password?: string }, password = String(body.password || "");
    if (!validatePassword(password).valid) throw new CampusError("密码须为 8-20 位英文字母、数字或符号，不含中文和空格");
    const invitation = await env.DB.prepare("SELECT id,email,name FROM business_invitations WHERE token_hash=? AND consumed_at IS NULL AND expires_at>?").bind(await hashOpaqueToken(String(body.token || ""), campusPepper()), new Date().toISOString()).first<{ id: string; email: string; name: string }>();
    if (!invitation) throw new CampusError("邀请已使用或已过期，请联系技术负责人重新邀请", 410);
    const id = crypto.randomUUID(), credential = await hashPassword(password, campusPepper());
    await env.DB.batch([
      env.DB.prepare("UPDATE business_invitations SET consumed_at=CURRENT_TIMESTAMP WHERE id=? AND consumed_at IS NULL AND expires_at>?").bind(invitation.id, new Date().toISOString()),
      env.DB.prepare("SELECT CASE WHEN changes()=1 THEN 1 ELSE json('invite-already-consumed') END"),
      env.DB.prepare("INSERT INTO users(id,email,name,role,status) VALUES(?,?,?,'operator','active')").bind(id, invitation.email, invitation.name),
      env.DB.prepare("INSERT INTO password_credentials(user_id,algorithm,version,iterations,salt,password_hash) VALUES(?,?,?,?,?,?)").bind(id, credential.algorithm, credential.version, credential.iterations, credential.salt, credential.hash),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    if (String(error).includes("malformed JSON") || String(error).includes("UNIQUE constraint failed: users")) return campusError(new CampusError("邀请已被使用，请直接登录或重新申请邀请", 410));
    return campusError(error);
  }
}
