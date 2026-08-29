import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("account routes expose native register, login, session and logout flows", async () => {
  const [register, login, session, logout] = await Promise.all([
    source("../app/api/auth/register/route.ts"), source("../app/api/auth/login/route.ts"),
    source("../app/api/auth/session/route.ts"), source("../app/api/auth/logout/route.ts"),
  ]);
  assert.match(register, /createAccount/);
  assert.match(login, /authenticateAccount/);
  assert.match(session, /getAccountActor/);
  assert.match(logout, /revokeSession/);
  assert.match(login, /ja_account_session/);
  assert.doesNotMatch([register, login, session, logout].join("\n"), /oai-authenticated-user|signin-with-chatgpt/);
});

test("role and origin validation are server enforced", async () => {
  const service = await source("../lib/auth/accounts.ts");
  const request = await source("../lib/auth/request.ts");
  assert.match(service, /student.*enterprise/s);
  assert.match(service, /EMAIL_ALREADY_REGISTERED/);
  assert.match(service, /DUMMY_PASSWORD_SALT/);
  assert.match(request, /validateMutationOrigin/);
  assert.match(request, /AUTH_TRUSTED_ORIGINS/);
});
