import { env } from "cloudflare:workers";
import { getAccountActor, getAdminActor, type AuthConfig, type AuthDatabase } from "../lib/auth/accounts";
import { ensureFormalPlatformData } from "../lib/platform/ensure-formal-data";

export type PlatformRole = "student" | "enterprise" | "admin";
export type PlatformActor = { id: string; email: string; name: string; role: PlatformRole; testMode: boolean };

const coreSchema = [
  "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student', status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS workspace_records (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, archived_at TEXT, published_at TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', target_url TEXT NOT NULL DEFAULT '', read_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS media_assets (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, storage_key TEXT NOT NULL UNIQUE, original_name TEXT NOT NULL, content_type TEXT NOT NULL, size INTEGER NOT NULL, purpose TEXT NOT NULL, visibility TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ready', width INTEGER, height INTEGER, duration_seconds INTEGER, archived_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS file_access_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT NOT NULL, storage_key TEXT NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, credit_code TEXT NOT NULL DEFAULT '', verification_status TEXT NOT NULL DEFAULT 'pending', verified_by TEXT, verified_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS content_likes (content_id TEXT NOT NULL, user_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(content_id,user_id))",
  "CREATE TABLE IF NOT EXISTS content_comments (id TEXT PRIMARY KEY, content_id TEXT NOT NULL, author_id TEXT NOT NULL, author_name TEXT NOT NULL, body TEXT NOT NULL, reply_body TEXT NOT NULL DEFAULT '', replied_by TEXT NOT NULL DEFAULT '', replied_at TEXT, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS password_credentials (user_id TEXT PRIMARY KEY, algorithm TEXT NOT NULL, version INTEGER NOT NULL, iterations INTEGER NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL, password_changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS auth_sessions (id TEXT PRIMARY KEY, subject_type TEXT NOT NULL, subject_id TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, revoked_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS password_reset_challenges (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, code_hash TEXT NOT NULL, proof_hash TEXT, expires_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, verified_at TEXT, consumed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS admin_credentials (id TEXT PRIMARY KEY, label TEXT NOT NULL, key_prefix TEXT NOT NULL, secret_hash TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'active', last_used_at TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, revoked_at TEXT)",
  "CREATE TABLE IF NOT EXISTS system_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS auth_rate_limits (scope_key TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, window_started_at TEXT NOT NULL, blocked_until TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS student_favorites (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, target_snapshot TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS student_calendar_events (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, source_type TEXT NOT NULL DEFAULT 'activity', source_id TEXT NOT NULL, title TEXT NOT NULL, start_at TEXT, end_at TEXT, reminder_at TEXT, reminder_enabled INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS student_experiences (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, source_type TEXT NOT NULL DEFAULT 'manual', source_id TEXT, category TEXT NOT NULL, title TEXT NOT NULL, role TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', output TEXT NOT NULL DEFAULT '', evidence_url TEXT NOT NULL DEFAULT '', evidence_asset_key TEXT NOT NULL DEFAULT '', occurred_at TEXT NOT NULL, certified INTEGER NOT NULL DEFAULT 0, is_public INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS student_profile_shares (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'active', expires_at TEXT NOT NULL, revoked_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS activity_registrations (id TEXT PRIMARY KEY, activity_id TEXT NOT NULL, activity_title TEXT NOT NULL, student_owner_id TEXT NOT NULL, publisher_owner_id TEXT NOT NULL, answers TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', review_note TEXT NOT NULL DEFAULT '', reviewed_at TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, cancelled_at TEXT, attendance_status TEXT NOT NULL DEFAULT 'unconfirmed', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role,status)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(lower(email))",
  "CREATE INDEX IF NOT EXISTS idx_workspace_owner_kind ON workspace_records(owner_id,kind,updated_at)",
  "CREATE INDEX IF NOT EXISTS idx_workspace_public_kind ON workspace_records(kind,archived_at,updated_at)",
  "CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)",
  "CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id,read_at,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_media_assets_owner_created ON media_assets(owner_id,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_file_access_actor_created ON file_access_logs(actor_id,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_organizations_verification ON organizations(verification_status,updated_at)",
  "CREATE INDEX IF NOT EXISTS idx_content_comments_content_created ON content_comments(content_id,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_content_likes_content ON content_likes(content_id)",
  "CREATE INDEX IF NOT EXISTS idx_auth_sessions_subject ON auth_sessions(subject_type,subject_id,expires_at)",
  "CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_challenges(user_id,created_at)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_student_favorites_identity ON student_favorites(student_id,target_type,target_id)",
  "CREATE INDEX IF NOT EXISTS idx_student_favorites_created ON student_favorites(student_id,created_at)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_student_calendar_source ON student_calendar_events(student_id,source_type,source_id)",
  "CREATE INDEX IF NOT EXISTS idx_student_calendar_upcoming ON student_calendar_events(student_id,status,start_at)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_student_experiences_source ON student_experiences(student_id,source_type,source_id)",
  "CREATE INDEX IF NOT EXISTS idx_student_experiences_timeline ON student_experiences(student_id,sort_order,occurred_at)",
  "CREATE INDEX IF NOT EXISTS idx_student_profile_shares_student_status ON student_profile_shares(student_id,status,created_at)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_registration_student_activity ON activity_registrations(student_owner_id,activity_id)",
  "CREATE INDEX IF NOT EXISTS idx_activity_registration_publisher ON activity_registrations(publisher_owner_id,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_activity_registration_activity ON activity_registrations(activity_id,created_at)",
];

export async function ensureCoreSchema() {
  await env.DB.batch(coreSchema.map((statement) => env.DB.prepare(statement)));
  const userColumns = await env.DB.prepare("PRAGMA table_info(users)").all();
  if (!userColumns.results.some((row) => String(row.name) === "updated_at")) {
    await env.DB.prepare("ALTER TABLE users ADD COLUMN updated_at TEXT").run();
    await env.DB.prepare("UPDATE users SET updated_at=CURRENT_TIMESTAMP WHERE updated_at IS NULL").run();
  }
  const columns = await env.DB.prepare("PRAGMA table_info(workspace_records)").all();
  const names = new Set(columns.results.map((row) => String(row.name)));
  const alters = [];
  if (!names.has("version")) alters.push(env.DB.prepare("ALTER TABLE workspace_records ADD COLUMN version INTEGER NOT NULL DEFAULT 1"));
  if (!names.has("archived_at")) alters.push(env.DB.prepare("ALTER TABLE workspace_records ADD COLUMN archived_at TEXT"));
  if (!names.has("published_at")) alters.push(env.DB.prepare("ALTER TABLE workspace_records ADD COLUMN published_at TEXT"));
  if (alters.length) await env.DB.batch(alters);
  await ensureFormalPlatformData(env.DB);
  const brandMigration = await env.DB.prepare("SELECT id FROM system_migrations WHERE id='brand-starlight-20260831'").first();
  if (!brandMigration) {
    await env.DB.batch([
      env.DB.prepare("UPDATE workspace_records SET payload=replace(replace(replace(payload,'JA 星光计划','星光计划'),'JA China','星光计划'),'JA','星光计划') WHERE payload LIKE '%JA%'"),
      env.DB.prepare("UPDATE activity_registrations SET activity_title=replace(activity_title,'JA','星光计划'),review_note=replace(review_note,'JA','星光计划') WHERE activity_title LIKE '%JA%' OR review_note LIKE '%JA%'"),
      env.DB.prepare("UPDATE student_experiences SET title=replace(title,'JA','星光计划'),description=replace(description,'JA','星光计划'),output=replace(output,'JA','星光计划') WHERE title LIKE '%JA%' OR description LIKE '%JA%' OR output LIKE '%JA%'"),
      env.DB.prepare("UPDATE notifications SET title=replace(title,'JA','星光计划'),body=replace(body,'JA','星光计划') WHERE title LIKE '%JA%' OR body LIKE '%JA%'"),
      env.DB.prepare("INSERT INTO system_migrations(id) VALUES('brand-starlight-20260831')"),
    ]);
  }
  const copySpacingMigration = await env.DB.prepare("SELECT id FROM system_migrations WHERE id='copy-spacing-20260831'").first();
  if (!copySpacingMigration) {
    await env.DB.batch([
      env.DB.prepare("UPDATE workspace_records SET payload=replace(replace(payload,'形成 星光计划','形成星光计划'),'一段 星光计划','一段星光计划') WHERE payload LIKE '% 星光计划%'"),
      env.DB.prepare("INSERT INTO system_migrations(id) VALUES('copy-spacing-20260831')"),
    ]);
  }
}

export function isTestRequest(request: Request) {
  if ((env as unknown as { STARLIGHT_RUNTIME?: string }).STARLIGHT_RUNTIME === "node") return false;
  const hostname = new URL(request.url).hostname;
  return hostname.endsWith(".test") || String((env as unknown as { STARLIGHT_TEST_MODE?: string }).STARLIGHT_TEST_MODE || "") === "true";
}
export async function getActor(request: Request, desiredRole?: PlatformRole): Promise<PlatformActor | null> {
  const testMode = isTestRequest(request);
  if (testMode) {
    const requested = desiredRole || (request.headers.get("x-starlight-role") as PlatformRole | null) || "student";
    const role: PlatformRole = ["student", "enterprise", "admin"].includes(requested) ? requested : "student";
    return { id: `demo:${role}`, email: `${role}@local.invalid`, name: role === "admin" ? "星光计划运营管理员" : role === "enterprise" ? "长沙星联数字科技有限公司" : "张晨", role, testMode: true };
  }
  await ensureCoreSchema();
  const db = env.DB as unknown as AuthDatabase, config = env as unknown as AuthConfig;
  if (desiredRole === "admin") return await getAdminActor(db, config, request);
  return await getAccountActor(db, config, request);
}
export async function requireRole(request: Request, roles: PlatformRole[]) {
  const actor = await getActor(request);
  if (!actor) return { actor: null, response: Response.json({ error: "请先登录后继续" }, { status: 401 }) };
  if (!roles.includes(actor.role) && !(actor.testMode && actor.id.startsWith("demo:")))
    return { actor: null, response: Response.json({ error: "当前账号没有执行此操作的权限" }, { status: 403 }) };
  return { actor, response: null };
}
export async function requireAdmin(request: Request) {
  const actor = await getActor(request, "admin");
  if (actor?.role === "admin" || actor?.testMode) return actor;
  return null;
}
export async function requireVerifiedEnterprise(request: Request) {
  const actor = await getActor(request);
  if (!actor || actor.role !== "enterprise") return { actor: null, response: Response.json({ error: "请使用企业账号登录" }, { status: actor ? 403 : 401 }) };
  if (actor.testMode) return { actor, response: null };
  const organization = await env.DB.prepare("SELECT verification_status AS status FROM organizations WHERE owner_id=?").bind(actor.id).first<{ status: string }>();
  if (organization?.status !== "verified") return { actor: null, response: Response.json({ error: "企业资料通过星光计划主体认证后才能正式发布；你仍可保存草稿" }, { status: 403 }) };
  return { actor, response: null };
}
export async function writeAudit(actorId: string, action: string, targetType: string, targetId: string) {
  await env.DB.prepare("INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES(?,?,?,?)").bind(actorId, action, targetType, targetId).run();
}
export async function notify(userId: string, type: string, title: string, body: string, targetUrl = "") {
  if (!userId || userId === "ja:seed") return;
  await env.DB.prepare("INSERT INTO notifications(id,user_id,type,title,body,target_url) VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(), userId, type, title.slice(0, 160), body.slice(0, 800), targetUrl.slice(0, 500)).run();
}
