import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("student, enterprise, recovery and JA login pages use one branded system", async () => {
  const files = await Promise.all([
    readFile(new URL("../app/auth/student/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/enterprise/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/forgot-password/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ja-login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/AuthPanel.tsx", import.meta.url), "utf8"),
  ]);
  const source = files.join("\n");
  assert.match(source, /JA 星光计划/);
  assert.match(source, /登录/);
  assert.match(source, /注册/);
  assert.match(source, /忘记密码/);
  assert.match(source, /8-20/);
  assert.match(source, /autocomplete|autoComplete/);
  assert.doesNotMatch(source, /Student2026|Enterprise2026|JA-STARLIGHT-DEMO/);
});
