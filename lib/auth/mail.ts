export class MailServiceError extends Error {
  code = "MAIL_SERVICE_UNAVAILABLE";
  status = 503;
}

export function passwordResetEmail(code: string) {
  return {
    subject: "星光计划｜重置密码验证码",
    text: `您的星光计划重置密码验证码是 ${code}，10 分钟内有效。如非本人操作，请忽略本邮件。`,
    html: `<!doctype html><html lang="zh-CN"><body style="margin:0;background:#edf4f2;font-family:Arial,'Microsoft YaHei',sans-serif;color:#173f49"><table role="presentation" width="100%"><tr><td align="center" style="padding:36px 16px"><table role="presentation" width="560" style="max-width:100%;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 18px 45px rgba(23,63,73,.12)"><tr><td style="padding:30px;background:linear-gradient(135deg,#123f4a,#08a9b7);color:white"><div style="font-size:12px;letter-spacing:2px">星光计划</div><h1 style="margin:10px 0 0;font-size:28px">星光计划</h1></td></tr><tr><td style="padding:34px"><h2 style="margin:0 0 12px">重置密码验证码</h2><p style="line-height:1.8;color:#4d6870">请在密码重置页面输入以下验证码。验证码仅用于本次操作。</p><div style="margin:24px 0;padding:18px;text-align:center;background:#eff9f8;border:1px solid #bde7e4;border-radius:16px;font-size:34px;font-weight:800;letter-spacing:10px;color:#007f8c">${code}</div><p style="font-size:14px;color:#6e8287">验证码将在 <b>10 分钟</b>后失效。如非本人操作，请忽略本邮件。</p></td></tr><tr><td style="padding:18px 34px;background:#f4f8f7;color:#769096;font-size:12px">连接青年、企业与真实世界的成长机会。</td></tr></table></td></tr></table></body></html>`,
  };
}

type MailConfig = {
  MAIL_PROVIDER?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  MAIL_REPLY_TO?: string;
  TENCENT_SES_REGION?: string;
  TENCENT_SES_SECRET_ID?: string;
  TENCENT_SES_SECRET_KEY?: string;
  TENCENT_SES_TEMPLATE_ID?: string;
};

const encoder = new TextEncoder();
const toHex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
const toBase64 = (value: string) => {
  const bytes = encoder.encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  if (typeof btoa === "function") return btoa(binary);
  return Buffer.from(value, "utf8").toString("base64");
};
const sha256Hex = async (value: string) => toHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
const hmac = async (key: ArrayBuffer | Uint8Array, value: string) => crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", key instanceof ArrayBuffer ? key : key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), encoder.encode(value));

async function tencentAuthorization(secretId: string, secretKey: string, timestamp: number, payload: string) {
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const service = "ses";
  const host = "ses.tencentcloudapi.com";
  const signedHeaders = "content-type;host";
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\n`;
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${await sha256Hex(payload)}`;
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;
  const secretDate = await hmac(encoder.encode(`TC3${secretKey}`), date);
  const secretService = await hmac(secretDate, service);
  const secretSigning = await hmac(secretService, "tc3_request");
  const signature = toHex(await hmac(secretSigning, stringToSign));
  return `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

async function sendResendPasswordResetMail(config: MailConfig, to: string, code: string) {
  if (!config.RESEND_API_KEY || !config.MAIL_FROM) throw new MailServiceError("邮件服务尚未启用");
  const message = passwordResetEmail(code);
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${config.RESEND_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ from: config.MAIL_FROM, to: [to], reply_to: config.MAIL_REPLY_TO || undefined, ...message }) });
  if (!response.ok) throw new MailServiceError("邮件暂时无法发送，请稍后再试");
}

async function sendTencentPasswordResetMail(config: MailConfig, to: string, code: string) {
  if (!config.MAIL_FROM || !config.TENCENT_SES_SECRET_ID || !config.TENCENT_SES_SECRET_KEY) throw new MailServiceError("邮件服务尚未启用");
  const message = passwordResetEmail(code);
  const templateId = Number(config.TENCENT_SES_TEMPLATE_ID || 0);
  const payload = {
    FromEmailAddress: config.MAIL_FROM,
    Destination: [to],
    Subject: message.subject,
    ReplyToAddresses: config.MAIL_REPLY_TO || undefined,
    ...(templateId > 0 ? {
      Template: { TemplateID: templateId, TemplateData: JSON.stringify({ code, expires: "10 分钟", product: "星光计划" }) },
    } : {
      Simple: { Text: toBase64(message.text), Html: toBase64(message.html) },
    }),
  };
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const response = await fetch("https://ses.tencentcloudapi.com/", {
    method: "POST",
    headers: {
      authorization: await tencentAuthorization(config.TENCENT_SES_SECRET_ID, config.TENCENT_SES_SECRET_KEY, timestamp, body),
      "content-type": "application/json; charset=utf-8",
      "x-tc-action": "SendEmail",
      "x-tc-version": "2020-10-02",
      "x-tc-region": config.TENCENT_SES_REGION || "ap-guangzhou",
      "x-tc-timestamp": String(timestamp),
    },
    body,
  });
  const result = await response.json().catch(() => null) as { Response?: { Error?: { Message?: string } } } | null;
  if (!response.ok || result?.Response?.Error) throw new MailServiceError(result?.Response?.Error?.Message || "邮件暂时无法发送，请稍后再试");
}

export async function sendPasswordResetMail(config: MailConfig, to: string, code: string) {
  if (config.MAIL_PROVIDER === "tencent-ses") return sendTencentPasswordResetMail(config, to, code);
  return sendResendPasswordResetMail(config, to, code);
}
