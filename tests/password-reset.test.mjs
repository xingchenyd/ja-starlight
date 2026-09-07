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
  assert.match(source, /星光计划/);
  assert.match(source, /连接青年、企业与真实世界的成长机会/);
  assert.match(source, /10 分钟/);
});

test("Tencent SES adapter sends branded reset codes through template API", async () => {
  const { sendPasswordResetMail } = await import("../lib/auth/mail.ts");
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ Response: { MessageId: "qcloudses-test", RequestId: "req-test" } }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    await sendPasswordResetMail({
      MAIL_PROVIDER: "tencent-ses",
      MAIL_FROM: "星光计划 <no-reply@mail.star-plan.com>",
      MAIL_REPLY_TO: "ruthyanghao@hotmail.com",
      TENCENT_SES_REGION: "ap-guangzhou",
      TENCENT_SES_SECRET_ID: "AKID_TEST",
      TENCENT_SES_SECRET_KEY: "SECRET_TEST",
      TENCENT_SES_TEMPLATE_ID: "123456",
    }, "student@example.com", "123456");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://ses.tencentcloudapi.com/");
  assert.match(calls[0].init.headers.authorization, /^TC3-HMAC-SHA256 Credential=AKID_TEST\/\d{4}-\d{2}-\d{2}\/ses\/tc3_request/);
  assert.equal(calls[0].init.headers["x-tc-action"], "SendEmail");
  assert.equal(calls[0].init.headers["x-tc-version"], "2020-10-02");
  assert.equal(calls[0].init.headers["x-tc-region"], "ap-guangzhou");
  const payload = JSON.parse(calls[0].init.body);
  assert.equal(payload.FromEmailAddress, "星光计划 <no-reply@mail.star-plan.com>");
  assert.deepEqual(payload.Destination, ["student@example.com"]);
  assert.equal(payload.Subject, "星光计划｜重置密码验证码");
  assert.equal(payload.ReplyToAddresses, "ruthyanghao@hotmail.com");
  assert.deepEqual(payload.Template, { TemplateID: 123456, TemplateData: JSON.stringify({ code: "123456" }) });
  assert.equal(payload.Simple, undefined);
});

test("Tencent SES adapter falls back to base64 simple content when no template is configured", async () => {
  const { sendPasswordResetMail } = await import("../lib/auth/mail.ts");
  let body = "";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    body = String(init.body);
    return new Response(JSON.stringify({ Response: { MessageId: "qcloudses-simple", RequestId: "req-simple" } }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    await sendPasswordResetMail({
      MAIL_PROVIDER: "tencent-ses",
      MAIL_FROM: "星光计划 <no-reply@mail.star-plan.com>",
      TENCENT_SES_REGION: "ap-guangzhou",
      TENCENT_SES_SECRET_ID: "AKID_TEST",
      TENCENT_SES_SECRET_KEY: "SECRET_TEST",
    }, "student@example.com", "654321");
  } finally {
    globalThis.fetch = originalFetch;
  }

  const payload = JSON.parse(body);
  assert.equal(payload.Template, undefined);
  assert.equal(payload.Simple.Subject, undefined);
  assert.equal(payload.Subject, "星光计划｜重置密码验证码");
  assert.match(Buffer.from(payload.Simple.Text, "base64").toString("utf8"), /654321/);
  assert.match(Buffer.from(payload.Simple.Html, "base64").toString("utf8"), /星光计划/);
});
