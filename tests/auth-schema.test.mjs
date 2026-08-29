import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

test("auth migration creates durable credential, session, reset and rate-limit stores", async () => {
  const directory = new URL("../drizzle/", import.meta.url);
  const filename = (await readdir(directory)).find((name) => name.startsWith("0006_") && name.endsWith(".sql"));
  assert.ok(filename, "the generated authentication migration exists");
  const sql = await readFile(new URL(filename, directory), "utf8");
  for (const table of ["password_credentials", "auth_sessions", "password_reset_challenges", "admin_credentials", "auth_rate_limits"])
    assert.match(sql, new RegExp(`CREATE TABLE .${table}.`));
  assert.match(sql, /CREATE UNIQUE INDEX `idx_users_email_unique`/);
  assert.match(sql, /token_hash/);
  assert.doesNotMatch(sql, /Student2026|Enterprise2026|JA-STARLIGHT-DEMO/);
});

test("runtime schema contains the same auth tables for fresh Sites databases", async () => {
  const source = await readFile(new URL("../db/runtime.ts", import.meta.url), "utf8");
  for (const table of ["password_credentials", "auth_sessions", "password_reset_challenges", "admin_credentials", "auth_rate_limits"])
    assert.match(source, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
});
