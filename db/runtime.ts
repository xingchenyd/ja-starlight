import { env } from "cloudflare:workers";

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
  "CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role,status)",
  "CREATE INDEX IF NOT EXISTS idx_workspace_owner_kind ON workspace_records(owner_id,kind,updated_at)",
  "CREATE INDEX IF NOT EXISTS idx_workspace_public_kind ON workspace_records(kind,archived_at,updated_at)",
  "CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)",
  "CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id,read_at,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_media_assets_owner_created ON media_assets(owner_id,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_file_access_actor_created ON file_access_logs(actor_id,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_organizations_verification ON organizations(verification_status,updated_at)",
  "CREATE INDEX IF NOT EXISTS idx_content_comments_content_created ON content_comments(content_id,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_content_likes_content ON content_likes(content_id)",
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
}

function list(name: "JA_ADMIN_EMAILS" | "JA_ADMIN_USER_IDS") {
  const value = String((env as unknown as Record<string, unknown>)[name] || "");
  return value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}
export function isTestRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || String((env as unknown as { STARLIGHT_TEST_MODE?: string }).STARLIGHT_TEST_MODE || "") === "true";
}
export async function getActor(request: Request, desiredRole?: PlatformRole): Promise<PlatformActor | null> {
  await ensureCoreSchema();
  const requestHeaders = request.headers;
  const realId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email") || "";
  const testMode = isTestRequest(request);
  const demo = request.headers.get("x-starlight-demo-id");
  const demoId = testMode && demo && /^[a-zA-Z0-9-]{8,80}$/.test(demo) ? `demo:${demo}` : null;
  const id = realId || demoId;
  if (!id) return null;
  const requested = desiredRole || (request.headers.get("x-starlight-role") as PlatformRole | null) || "student";
  const safeRequested: PlatformRole = ["student", "enterprise", "admin"].includes(requested) ? requested : "student";
  const existing = await env.DB.prepare("SELECT role,status,name,email FROM users WHERE id=?").bind(id).first<{ role: PlatformRole; status: string; name: string; email: string }>();
  if (existing?.status === "suspended") return null;
  const adminByConfig = Boolean(realId && (list("JA_ADMIN_USER_IDS").includes(realId.toLowerCase()) || list("JA_ADMIN_EMAILS").includes(email.toLowerCase())));
  const role: PlatformRole = adminByConfig ? "admin" : existing?.role || (safeRequested === "admin" ? "student" : safeRequested);
  const rawName = requestHeaders.get("oai-authenticated-user-full-name") || "";
  let decodedName = rawName;
  if (requestHeaders.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") {
    try { decodedName = decodeURIComponent(rawName); } catch { decodedName = rawName; }
  }
  const name = decodedName || existing?.name || (role === "enterprise" ? "企业用户" : "星光同学");
  await env.DB.prepare("INSERT INTO users(id,email,name,role,status,updated_at) VALUES(?,?,?,?, 'active',CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET email=excluded.email,name=excluded.name,updated_at=CURRENT_TIMESTAMP").bind(id, email || existing?.email || `${id}@local.invalid`, name, role).run();
  return { id, email: email || existing?.email || "", name, role, testMode };
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
export async function writeAudit(actorId: string, action: string, targetType: string, targetId: string) {
  await env.DB.prepare("INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES(?,?,?,?)").bind(actorId, action, targetType, targetId).run();
}
export async function notify(userId: string, type: string, title: string, body: string, targetUrl = "") {
  if (!userId || userId === "ja:seed") return;
  await env.DB.prepare("INSERT INTO notifications(id,user_id,type,title,body,target_url) VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(), userId, type, title.slice(0, 160), body.slice(0, 800), targetUrl.slice(0, 500)).run();
}
