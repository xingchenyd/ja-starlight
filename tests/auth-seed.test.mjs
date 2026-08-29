import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("seed configuration is environment-only and idempotent", async () => {
  const source = await readFile(new URL("../lib/auth/seed.ts", import.meta.url), "utf8");
  assert.match(source, /student-demo@ja-starlight\.test/);
  assert.match(source, /enterprise-demo@ja-starlight\.test/);
  assert.match(source, /AUTH_SEED_STUDENT_PASSWORD/);
  assert.match(source, /AUTH_SEED_ENTERPRISE_PASSWORD/);
  assert.match(source, /AUTH_SEED_ADMIN_KEY/);
  assert.match(source, /ON CONFLICT|if \(!existing/);
  assert.doesNotMatch(source, /Student2026!|Enterprise2026!|JA-STARLIGHT-DEMO-2026-OPS-/);
});
