import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("seed configuration is environment-only and idempotent", async () => {
  const source = await readFile(new URL("../lib/auth/seed.ts", import.meta.url), "utf8");
  assert.match(source, /student@starlight-hunan\.cn/);
  assert.match(source, /enterprise@starlight-hunan\.cn/);
  assert.match(source, /AUTH_SEED_STUDENT_PASSWORD/);
  assert.match(source, /AUTH_SEED_ENTERPRISE_PASSWORD/);
  assert.match(source, /AUTH_SEED_ADMIN_KEY/);
  assert.match(source, /ON CONFLICT|if \(!existing/);
  assert.doesNotMatch(source, /Starlight2026!|Enterprise2026!|STARLIGHT-[A-Za-z0-9_-]{20,}/);
});

test("localhost does not bypass formal account or admin authentication", async () => {
  const runtime = await readFile(new URL("../db/runtime.ts", import.meta.url), "utf8");
  assert.match(runtime, /STARLIGHT_TEST_MODE/);
  assert.match(runtime, /endsWith\("\.test"\)/);
  assert.doesNotMatch(runtime, /hostname === "localhost"|hostname === "127\.0\.0\.1"/);
});
