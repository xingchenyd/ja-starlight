import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

test("all migrations apply to a fresh database with integrity intact", async () => {
  const directory = new URL("../drizzle/", import.meta.url);
  const files = (await readdir(directory)).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
  const database = new DatabaseSync(":memory:");
  for (const file of files) database.exec(await readFile(new URL(file, directory), "utf8"));
  assert.equal(database.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  assert.equal(database.prepare("SELECT count(*) count FROM sqlite_master WHERE type='table' AND name IN ('password_credentials','auth_sessions','password_reset_challenges','admin_credentials','auth_rate_limits')").get().count, 5);
  database.close();
});
