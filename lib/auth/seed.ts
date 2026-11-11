import { hashOpaqueToken, hashPassword, validatePassword } from "./crypto";

type Statement = { bind: (...values: unknown[]) => Statement; first: <T>() => Promise<T | null>; run: () => Promise<unknown> };
type Database = { prepare: (sql: string) => Statement };
type SeedConfig = { AUTH_PEPPER?: string; AUTH_ENABLE_SAMPLE_ACCOUNTS?: string; AUTH_SEED_STUDENT_PASSWORD?: string; AUTH_SEED_ENTERPRISE_PASSWORD?: string; AUTH_SEED_ADMIN_KEY?: string };

export async function ensureAuthSeeds(config: SeedConfig, db: Database) {
  const pepper = String(config.AUTH_PEPPER || "");
  if (!pepper) return;
  const accounts = [
    { email: "student@starlight-hunan.cn", role: "student", name: "张晨", password: config.AUTH_SEED_STUDENT_PASSWORD },
    { email: "enterprise@starlight-hunan.cn", role: "enterprise", name: "长沙星联数字科技有限公司", password: config.AUTH_SEED_ENTERPRISE_PASSWORD },
  ];
  for (const account of config.AUTH_ENABLE_SAMPLE_ACCOUNTS === "true" ? accounts : []) {
    if (!account.password || !validatePassword(account.password).valid) continue;
    const existing = await db.prepare("SELECT id FROM users WHERE lower(email)=?").bind(account.email).first<{ id: string }>();
    if (!existing) {
      const id = crypto.randomUUID();
      const credential = await hashPassword(account.password, pepper);
      await db.prepare("INSERT INTO users(id,email,name,role,status) VALUES(?,?,?,?, 'active')").bind(id, account.email, account.name, account.role).run();
      await db.prepare("INSERT INTO password_credentials(user_id,algorithm,version,iterations,salt,password_hash) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO NOTHING").bind(id, credential.algorithm, credential.version, credential.iterations, credential.salt, credential.hash).run();
      if (account.role === "enterprise") await db.prepare("INSERT INTO organizations(id,owner_id,name,verification_status,verified_by,verified_at) VALUES(?,?,?,'verified','seed',CURRENT_TIMESTAMP) ON CONFLICT(owner_id) DO NOTHING").bind(crypto.randomUUID(), id, account.name).run();
    }
  }
  const owner = await db.prepare("SELECT credential_id FROM platform_owner WHERE id=1").first<{ credential_id: string }>();
  if (!owner && config.AUTH_SEED_ADMIN_KEY) {
    const secretHash = await hashOpaqueToken(config.AUTH_SEED_ADMIN_KEY, pepper);
    const existingKey = await db.prepare("SELECT id FROM admin_credentials WHERE secret_hash=?").bind(secretHash).first<{ id: string }>();
    if (!existingKey) await db.prepare("INSERT INTO admin_credentials(id,label,key_prefix,secret_hash,status,created_by) VALUES(?,?,?,?, 'active','system') ON CONFLICT(secret_hash) DO NOTHING").bind(crypto.randomUUID(), "平台主管理员", config.AUTH_SEED_ADMIN_KEY.slice(0, 28), secretHash).run();
    await db.prepare("INSERT INTO platform_owner(id,credential_id) SELECT 1,id FROM admin_credentials WHERE secret_hash=? AND status='active' ON CONFLICT(id) DO NOTHING").bind(secretHash).run();
  }
  await db.prepare("UPDATE admin_credentials SET status='revoked',revoked_at=COALESCE(revoked_at,CURRENT_TIMESTAMP) WHERE status<>'revoked' AND EXISTS(SELECT 1 FROM platform_owner) AND id<>(SELECT credential_id FROM platform_owner WHERE id=1)").run();
  await db.prepare("UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE subject_type='admin' AND revoked_at IS NULL AND subject_id IN (SELECT id FROM admin_credentials WHERE status<>'active')").run();
}
