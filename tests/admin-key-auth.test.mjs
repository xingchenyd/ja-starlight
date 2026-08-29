import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("JA key authentication and lifecycle routes are present", async () => {
  const [login, keys, keyed] = await Promise.all([
    readFile(new URL("../app/api/admin-auth/login/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin-auth/keys/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin-auth/keys/[id]/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(login, /authenticateAdminKey/);
  assert.match(login, /ja_admin_session/);
  assert.match(keys, /createAdminKey/);
  assert.match(keyed, /disable|restore|revoke/);
  assert.match(keys, /rawKey/);
});

test("JA console exposes key management and native logout", async () => {
  const source = await readFile(new URL("../app/ja-console/JAConsole.tsx", import.meta.url), "utf8");
  assert.match(source, /密钥管理/);
  assert.match(source, /\/api\/admin-auth\/keys/);
  assert.match(source, /\/api\/admin-auth\/logout/);
  assert.doesNotMatch(source, /signout-with-chatgpt/);
});
