import { hashOpaqueToken, hashPassword, randomCode, randomToken, validateEmail, validatePassword, verifyPassword, type PasswordCredential } from "./crypto";
import { cookieForRole, expiredCookie, sessionDurationSeconds, type AuthRole } from "./policy";
import { clientAddress, getCookie } from "./request";
import { sendPasswordResetMail } from "./mail";

type Statement = { bind: (...values: unknown[]) => Statement; first: <T>() => Promise<T | null>; run: () => Promise<{ success?: boolean; meta?: { changes?: number } }>; all: <T>() => Promise<{ results: T[] }> };
export type AuthDatabase = { prepare: (sql: string) => Statement };
export type AuthConfig = {
  AUTH_PEPPER?: string; AUTH_TRUSTED_ORIGINS?: string; RESEND_API_KEY?: string; MAIL_FROM?: string; MAIL_REPLY_TO?: string;
  AUTH_SEED_STUDENT_PASSWORD?: string; AUTH_SEED_ENTERPRISE_PASSWORD?: string; AUTH_SEED_ADMIN_KEY?: string;
};
type User = { id: string; email: string; name: string; role: "student" | "enterprise"; status: string };
const DUMMY_PASSWORD_SALT = "AAAAAAAAAAAAAAAAAAAAAA";

export class AuthServiceError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}
const pepper = (config: AuthConfig) => {
  const value = String(config.AUTH_PEPPER || "");
  if (value.length < 24) throw new AuthServiceError("AUTH_CONFIGURATION_ERROR", "认证服务配置不完整", 503);
  return value;
};
const roleOf = (value: unknown): "student" | "enterprise" => {
  if (value !== "student" && value !== "enterprise") throw new AuthServiceError("INVALID_ROLE", "请选择学生或企业身份");
  return value;
};
const passwordOf = (value: unknown) => {
  const password = String(value || "");
  if (!validatePassword(password).valid) throw new AuthServiceError("WEAK_PASSWORD", "密码须为 8-20 位，仅使用英文字母、数字和符号，且不能包含空格");
  return password;
};
const credentialFrom = (row: { algorithm: string; version: number; iterations: number; salt: string; password_hash: string }): PasswordCredential => ({ algorithm: row.algorithm as PasswordCredential["algorithm"], version: row.version, iterations: row.iterations, salt: row.salt, hash: row.password_hash });
const secure = (request: Request) => new URL(request.url).protocol === "https:";

async function rateLimit(db: AuthDatabase, request: Request, scope: string, identity: string, success = false) {
  const scopeKey = await hashOpaqueToken(`${scope}:${clientAddress(request)}:${identity}`, "rate-limit");
  if (success) { await db.prepare("DELETE FROM auth_rate_limits WHERE scope_key=?").bind(scopeKey).run(); return; }
  const now = Date.now();
  const row = await db.prepare("SELECT attempts,window_started_at,blocked_until FROM auth_rate_limits WHERE scope_key=?").bind(scopeKey).first<{ attempts: number; window_started_at: string; blocked_until: string | null }>();
  if (row?.blocked_until && Date.parse(row.blocked_until) > now) throw new AuthServiceError("TOO_MANY_ATTEMPTS", "尝试次数过多，请稍后再试", 429);
  const fresh = !row || now - Date.parse(row.window_started_at) > 15 * 60_000;
  const attempts = fresh ? 1 : row.attempts + 1;
  const blockedUntil = attempts >= 6 ? new Date(now + 15 * 60_000).toISOString() : null;
  await db.prepare("INSERT INTO auth_rate_limits(scope_key,attempts,window_started_at,blocked_until,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(scope_key) DO UPDATE SET attempts=excluded.attempts,window_started_at=excluded.window_started_at,blocked_until=excluded.blocked_until,updated_at=CURRENT_TIMESTAMP").bind(scopeKey, attempts, fresh ? new Date(now).toISOString() : row?.window_started_at, blockedUntil).run();
  if (blockedUntil) throw new AuthServiceError("TOO_MANY_ATTEMPTS", "尝试次数过多，请稍后再试", 429);
}

async function createSession(db: AuthDatabase, config: AuthConfig, subjectType: "account" | "admin", subjectId: string, role: AuthRole, request: Request) {
  const token = randomToken();
  const tokenHash = await hashOpaqueToken(token, pepper(config));
  const expiresAt = new Date(Date.now() + sessionDurationSeconds(role) * 1000).toISOString();
  await db.prepare("INSERT INTO auth_sessions(id,subject_type,subject_id,token_hash,expires_at) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(), subjectType, subjectId, tokenHash, expiresAt).run();
  return { token, expiresAt, cookie: cookieForRole(role, token, secure(request)) };
}

export async function createAccount(db: AuthDatabase, config: AuthConfig, request: Request, body: Record<string, unknown>) {
  const email = validateEmail(body.email), password = passwordOf(body.password), role = roleOf(body.role);
  await rateLimit(db, request, "register", email);
  const existing = await db.prepare("SELECT id FROM users WHERE lower(email)=?").bind(email).first<{ id: string }>();
  if (existing) throw new AuthServiceError("EMAIL_ALREADY_REGISTERED", "该邮箱已注册，请直接登录或使用找回密码");
  const id = crypto.randomUUID(), name = role === "enterprise" ? email.split("@")[0] : "星光同学";
  const credential = await hashPassword(password, pepper(config));
  await db.prepare("INSERT INTO users(id,email,name,role,status) VALUES(?,?,?,?, 'active')").bind(id, email, name, role).run();
  await db.prepare("INSERT INTO password_credentials(user_id,algorithm,version,iterations,salt,password_hash) VALUES(?,?,?,?,?,?)").bind(id, credential.algorithm, credential.version, credential.iterations, credential.salt, credential.hash).run();
  if (role === "enterprise") await db.prepare("INSERT INTO organizations(id,owner_id,name,verification_status) VALUES(?,?,?,'pending')").bind(crypto.randomUUID(), id, name).run();
  await rateLimit(db, request, "register", email, true);
  const session = await createSession(db, config, "account", id, role, request);
  return { user: { id, email, name, role }, session };
}

export async function authenticateAccount(db: AuthDatabase, config: AuthConfig, request: Request, body: Record<string, unknown>) {
  const email = validateEmail(body.email), password = String(body.password || ""), role = roleOf(body.role);
  await rateLimit(db, request, "login", email);
  const row = await db.prepare("SELECT u.id,u.email,u.name,u.role,u.status,p.algorithm,p.version,p.iterations,p.salt,p.password_hash FROM users u JOIN password_credentials p ON p.user_id=u.id WHERE lower(u.email)=?").bind(email).first<User & { algorithm: string; version: number; iterations: number; salt: string; password_hash: string }>();
  let passwordValid = false;
  if (row) passwordValid = await verifyPassword(password, pepper(config), credentialFrom(row));
  else await hashPassword(password, pepper(config), { iterations: 600_000, salt: DUMMY_PASSWORD_SALT });
  const valid = Boolean(row && row.role === role && row.status === "active" && passwordValid);
  if (!valid || !row) throw new AuthServiceError("INVALID_CREDENTIALS", "邮箱、密码或登录身份不正确", 401);
  await rateLimit(db, request, "login", email, true);
  const session = await createSession(db, config, "account", row.id, row.role, request);
  return { user: { id: row.id, email: row.email, name: row.name, role: row.role }, session };
}

export async function getAccountActor(db: AuthDatabase, config: AuthConfig, request: Request) {
  const token = getCookie(request, "ja_account_session");
  if (!token) return null;
  const tokenHash = await hashOpaqueToken(token, pepper(config));
  const actor = await db.prepare("SELECT u.id,u.email,u.name,u.role,u.status,s.id session_id,s.expires_at FROM auth_sessions s JOIN users u ON u.id=s.subject_id WHERE s.token_hash=? AND s.subject_type='account' AND s.revoked_at IS NULL").bind(tokenHash).first<User & { session_id: string; expires_at: string }>();
  if (!actor || actor.status !== "active" || Date.parse(actor.expires_at) <= Date.now()) return null;
  await db.prepare("UPDATE auth_sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE id=?").bind(actor.session_id).run();
  return { id: actor.id, email: actor.email, name: actor.name, role: actor.role, testMode: false } as const;
}

export async function getAdminActor(db: AuthDatabase, config: AuthConfig, request: Request) {
  const token = getCookie(request, "ja_admin_session");
  if (!token) return null;
  const tokenHash = await hashOpaqueToken(token, pepper(config));
  const actor = await db.prepare("SELECT c.id,c.label,s.id session_id,s.expires_at FROM auth_sessions s JOIN admin_credentials c ON c.id=s.subject_id WHERE s.token_hash=? AND s.subject_type='admin' AND s.revoked_at IS NULL AND c.status='active'").bind(tokenHash).first<{ id: string; label: string; session_id: string; expires_at: string }>();
  if (!actor || Date.parse(actor.expires_at) <= Date.now()) return null;
  await db.prepare("UPDATE auth_sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE id=?").bind(actor.session_id).run();
  return { id: `admin:${actor.id}`, email: "", name: actor.label, role: "admin", testMode: false } as const;
}

export async function revokeSession(db: AuthDatabase, config: AuthConfig, request: Request, role: AuthRole) {
  const name = role === "admin" ? "ja_admin_session" : "ja_account_session", token = getCookie(request, name);
  if (token) await db.prepare("UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE token_hash=?").bind(await hashOpaqueToken(token, pepper(config))).run();
  return expiredCookie(role, secure(request));
}

export async function requestPasswordReset(db: AuthDatabase, config: AuthConfig, request: Request, body: Record<string, unknown>) {
  const email = validateEmail(body.email);
  await rateLimit(db, request, "forgot", email);
  if (!config.RESEND_API_KEY || !config.MAIL_FROM) throw new AuthServiceError("MAIL_SERVICE_UNAVAILABLE", "邮件重置服务正在配置中，请稍后再试", 503);
  const user = await db.prepare("SELECT id,email FROM users WHERE lower(email)=? AND status='active'").bind(email).first<{ id: string; email: string }>();
  if (!user) {
    const decoyChallengeId = crypto.randomUUID(), decoyCode = randomCode();
    await db.prepare("INSERT INTO password_reset_challenges(id,user_id,code_hash,expires_at) VALUES(?,?,?,?)").bind(decoyChallengeId, `decoy:${crypto.randomUUID()}`, await hashOpaqueToken(`${decoyChallengeId}:${decoyCode}`, pepper(config)), new Date(Date.now() + 10 * 60_000).toISOString()).run();
    return { accepted: true, challengeId: decoyChallengeId };
  }
  const code = randomCode(), id = crypto.randomUUID(), codeHash = await hashOpaqueToken(`${id}:${code}`, pepper(config));
  await db.prepare("INSERT INTO password_reset_challenges(id,user_id,code_hash,expires_at) VALUES(?,?,?,?)").bind(id, user.id, codeHash, new Date(Date.now() + 10 * 60_000).toISOString()).run();
  try { await sendPasswordResetMail(config, user.email, code); }
  catch (error) { await db.prepare("DELETE FROM password_reset_challenges WHERE id=?").bind(id).run(); throw error; }
  return { accepted: true, challengeId: id };
}

export async function verifyPasswordReset(db: AuthDatabase, config: AuthConfig, request: Request, body: Record<string, unknown>) {
  const challengeId = String(body.challengeId || ""), code = String(body.code || "");
  await rateLimit(db, request, "reset-code", challengeId);
  const row = await db.prepare("SELECT id,user_id,code_hash,expires_at,attempts,consumed_at FROM password_reset_challenges WHERE id=?").bind(challengeId).first<{ id: string; user_id: string; code_hash: string; expires_at: string; attempts: number; consumed_at: string | null }>();
  const validHash = await hashOpaqueToken(`${challengeId}:${code}`, pepper(config));
  if (!row || row.user_id.startsWith("decoy:") || row.consumed_at || row.attempts >= 5 || Date.parse(row.expires_at) <= Date.now() || validHash !== row.code_hash) {
    if (row) await db.prepare("UPDATE password_reset_challenges SET attempts=attempts+1 WHERE id=?").bind(challengeId).run();
    throw new AuthServiceError("INVALID_RESET_CODE", "验证码不正确或已过期", 400);
  }
  const proof = randomToken(), proofHash = await hashOpaqueToken(proof, pepper(config));
  await db.prepare("UPDATE password_reset_challenges SET verified_at=CURRENT_TIMESTAMP,proof_hash=? WHERE id=?").bind(proofHash, challengeId).run();
  await rateLimit(db, request, "reset-code", challengeId, true);
  return { proof };
}

export async function completePasswordReset(db: AuthDatabase, config: AuthConfig, body: Record<string, unknown>) {
  const challengeId = String(body.challengeId || ""), proof = String(body.proof || ""), password = passwordOf(body.password);
  const proofHash = await hashOpaqueToken(proof, pepper(config));
  const row = await db.prepare("SELECT id,user_id,proof_hash,verified_at,consumed_at,expires_at FROM password_reset_challenges WHERE id=?").bind(challengeId).first<{ id: string; user_id: string; proof_hash: string | null; verified_at: string | null; consumed_at: string | null; expires_at: string }>();
  if (!row || !row.verified_at || row.consumed_at || Date.parse(row.expires_at) <= Date.now() || row.proof_hash !== proofHash) throw new AuthServiceError("INVALID_RESET_PROOF", "重置凭证已失效，请重新获取验证码", 400);
  const credential = await hashPassword(password, pepper(config));
  await db.prepare("INSERT INTO password_credentials(user_id,algorithm,version,iterations,salt,password_hash,password_changed_at) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET algorithm=excluded.algorithm,version=excluded.version,iterations=excluded.iterations,salt=excluded.salt,password_hash=excluded.password_hash,password_changed_at=CURRENT_TIMESTAMP").bind(row.user_id, credential.algorithm, credential.version, credential.iterations, credential.salt, credential.hash).run();
  await db.prepare("UPDATE password_reset_challenges SET consumed_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.id).run();
  await db.prepare("UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE subject_type='account' AND subject_id=? AND revoked_at IS NULL").bind(row.user_id).run();
  return { reset: true };
}

export async function authenticateAdminKey(db: AuthDatabase, config: AuthConfig, request: Request, body: Record<string, unknown>) {
  const key = String(body.key || "").trim();
  await rateLimit(db, request, "admin-login", key.slice(0, 24));
  const secretHash = await hashOpaqueToken(key, pepper(config));
  const credential = await db.prepare("SELECT id,label,status FROM admin_credentials WHERE secret_hash=?").bind(secretHash).first<{ id: string; label: string; status: string }>();
  if (!credential || credential.status !== "active") throw new AuthServiceError("INVALID_ADMIN_KEY", "管理密钥无效或已停用", 401);
  await db.prepare("UPDATE admin_credentials SET last_used_at=CURRENT_TIMESTAMP WHERE id=?").bind(credential.id).run();
  await rateLimit(db, request, "admin-login", key.slice(0, 24), true);
  const session = await createSession(db, config, "admin", credential.id, "admin", request);
  return { admin: { id: credential.id, label: credential.label }, session };
}

export async function listAdminKeys(db: AuthDatabase) {
  return (await db.prepare("SELECT id,label,key_prefix,status,last_used_at,created_at,revoked_at FROM admin_credentials ORDER BY created_at DESC").all<Record<string, unknown>>()).results;
}
export async function createAdminKey(db: AuthDatabase, config: AuthConfig, label: unknown, actorId: string) {
  const safeLabel = String(label || "").trim().slice(0, 60);
  if (safeLabel.length < 2) throw new AuthServiceError("INVALID_KEY_LABEL", "请输入密钥名称");
  const rawKey = `STARLIGHT-${randomToken(24)}`, id = crypto.randomUUID();
  await db.prepare("INSERT INTO admin_credentials(id,label,key_prefix,secret_hash,status,created_by) VALUES(?,?,?,?, 'active',?)").bind(id, safeLabel, rawKey.slice(0, 28), await hashOpaqueToken(rawKey, pepper(config)), actorId).run();
  return { id, label: safeLabel, prefix: rawKey.slice(0, 28), rawKey };
}
export async function updateAdminKey(db: AuthDatabase, id: string, action: unknown) {
  if (action === "disable") await db.prepare("UPDATE admin_credentials SET status='disabled' WHERE id=? AND status!='revoked'").bind(id).run();
  else if (action === "restore") await db.prepare("UPDATE admin_credentials SET status='active',revoked_at=NULL WHERE id=? AND status='disabled'").bind(id).run();
  else if (action === "revoke") { await db.prepare("UPDATE admin_credentials SET status='revoked',revoked_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run(); await db.prepare("UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE subject_type='admin' AND subject_id=?").bind(id).run(); }
  else throw new AuthServiceError("INVALID_KEY_ACTION", "不支持的密钥操作");
}
