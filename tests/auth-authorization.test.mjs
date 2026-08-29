import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("platform authorization uses native sessions and enterprise verification", async () => {
  const [runtime, platform, workspace, admin] = await Promise.all([
    readFile(new URL("../db/runtime.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/platform/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/workspace/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ja-console/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(runtime, /getAccountActor/);
  assert.match(runtime, /getAdminActor/);
  assert.doesNotMatch(runtime + workspace + admin, /oai-authenticated-user|signin-with-chatgpt/);
  assert.match(platform, /requireVerifiedEnterprise/);
  assert.match(workspace, /\/auth\/\$\{selectedRole\}/);
  assert.match(admin, /\/ja-login/);
  const platformApp = await readFile(new URL("../app/workspace/PlatformApp.tsx", import.meta.url), "utf8");
  assert.match(platformApp, /\/api\/auth\/logout/);
});
