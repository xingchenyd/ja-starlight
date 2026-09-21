import { env } from "cloudflare:workers";

export async function ensureChallengeSchema() {
  await env.DB.batch([
    "CREATE TABLE IF NOT EXISTS challenge_teams (id TEXT PRIMARY KEY,activity_id TEXT NOT NULL,captain_id TEXT NOT NULL,name TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'forming',submission TEXT NOT NULL DEFAULT '{}',review TEXT NOT NULL DEFAULT '{}',version INTEGER NOT NULL DEFAULT 1,mutation_key TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS challenge_members (activity_id TEXT NOT NULL,student_id TEXT NOT NULL,team_id TEXT NOT NULL,joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(activity_id,student_id))",
    "CREATE TABLE IF NOT EXISTS challenge_invites (id TEXT PRIMARY KEY,team_id TEXT NOT NULL,email TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,expires_at TEXT NOT NULL,consumed_at TEXT,revoked_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS challenge_history (id TEXT PRIMARY KEY,team_id TEXT NOT NULL,actor_id TEXT NOT NULL,action TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE INDEX IF NOT EXISTS idx_challenge_team_activity ON challenge_teams(activity_id,updated_at)",
    "CREATE INDEX IF NOT EXISTS idx_challenge_members_team ON challenge_members(team_id)",
    "CREATE INDEX IF NOT EXISTS idx_challenge_history_team ON challenge_history(team_id,created_at)",
  ].map(sql => env.DB.prepare(sql)));
}
