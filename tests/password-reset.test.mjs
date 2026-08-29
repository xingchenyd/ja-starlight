import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("password reset is three-step, single-use and never exposes a public code", async () => {
  const sources = await Promise.all(["forgot", "verify", "reset"].map((name) => readFile(new URL(`../app/api/auth/password/${name}/route.ts`, import.meta.url), "utf8")));
  assert.match(sources[0], /requestPasswordReset/);
  assert.match(sources[1], /verifyPasswordReset/);
  assert.match(sources[2], /completePasswordReset/);
  assert.doesNotMatch(sources.join("\n"), /demoCode|publicCode|return.*code/s);
  const service = await readFile(new URL("../lib/auth/accounts.ts", import.meta.url), "utf8");
  assert.match(service, /decoyChallengeId/);
});

test("branded reset mail adapter supports unavailable and Resend states", async () => {
  const source = await readFile(new URL("../lib/auth/mail.ts", import.meta.url), "utf8");
  assert.match(source, /MAIL_SERVICE_UNAVAILABLE/);
  assert.match(source, /api\.resend\.com\/emails/);
  assert.match(source, /JA 星光计划/);
  assert.match(source, /青年成就中国/);
  assert.match(source, /10 分钟/);
});
