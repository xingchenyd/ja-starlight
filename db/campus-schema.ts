// Additive migration: existing students, publications and signup snapshots stay intact.
export const campusSchema = [
  "CREATE TABLE IF NOT EXISTS platform_owner (id INTEGER PRIMARY KEY CHECK(id=1), credential_id TEXT NOT NULL UNIQUE, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS schools (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS school_memberships (student_id TEXT PRIMARY KEY REFERENCES users(id), school_id TEXT NOT NULL REFERENCES schools(id), status TEXT NOT NULL CHECK(status IN ('pending','verified','rejected')), note TEXT NOT NULL DEFAULT '', reviewed_by TEXT, reviewed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS business_grants (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), role TEXT NOT NULL CHECK(role IN ('campus_partner','content_reviewer','project_lead')), school_id TEXT REFERENCES schools(id), status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')), granted_by TEXT NOT NULL, revoked_by TEXT, revoked_reason TEXT, revoked_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, CHECK((role='campus_partner' AND school_id IS NOT NULL) OR (role<>'campus_partner' AND school_id IS NULL)))",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_business_grants_active ON business_grants(user_id,role,COALESCE(school_id,'')) WHERE status='active'",
  "CREATE INDEX IF NOT EXISTS idx_school_memberships_scope ON school_memberships(school_id,status)",
  "CREATE TABLE IF NOT EXISTS business_invitations (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, consumed_at TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
];
