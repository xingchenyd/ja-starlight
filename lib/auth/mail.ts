export class MailServiceError extends Error {
  code = "MAIL_SERVICE_UNAVAILABLE";
  status = 503;
}

export function passwordResetEmail(code: string) {
  return {
    subject: "JA 星光计划｜重置密码验证码",
    text: `您的 JA 星光计划重置密码验证码是 ${code}，10 分钟内有效。如非本人操作，请忽略本邮件。`,
    html: `<!doctype html><html lang="zh-CN"><body style="margin:0;background:#edf4f2;font-family:Arial,'Microsoft YaHei',sans-serif;color:#173f49"><table role="presentation" width="100%"><tr><td align="center" style="padding:36px 16px"><table role="presentation" width="560" style="max-width:100%;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 18px 45px rgba(23,63,73,.12)"><tr><td style="padding:30px;background:linear-gradient(135deg,#123f4a,#08a9b7);color:white"><div style="font-size:12px;letter-spacing:2px">JA CHINA · 青年成就中国</div><h1 style="margin:10px 0 0;font-size:28px">JA 星光计划</h1></td></tr><tr><td style="padding:34px"><h2 style="margin:0 0 12px">重置密码验证码</h2><p style="line-height:1.8;color:#4d6870">请在密码重置页面输入以下验证码。验证码仅用于本次操作。</p><div style="margin:24px 0;padding:18px;text-align:center;background:#eff9f8;border:1px solid #bde7e4;border-radius:16px;font-size:34px;font-weight:800;letter-spacing:10px;color:#007f8c">${code}</div><p style="font-size:14px;color:#6e8287">验证码将在 <b>10 分钟</b>后失效。如非本人操作，请忽略本邮件。</p></td></tr><tr><td style="padding:18px 34px;background:#f4f8f7;color:#769096;font-size:12px">连接青年、企业与真实世界的成长机会。</td></tr></table></td></tr></table></body></html>`,
  };
}

export async function sendPasswordResetMail(config: { RESEND_API_KEY?: string; MAIL_FROM?: string; MAIL_REPLY_TO?: string }, to: string, code: string) {
  if (!config.RESEND_API_KEY || !config.MAIL_FROM) throw new MailServiceError("邮件服务尚未启用");
  const message = passwordResetEmail(code);
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${config.RESEND_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ from: config.MAIL_FROM, to: [to], reply_to: config.MAIL_REPLY_TO || undefined, ...message }) });
  if (!response.ok) throw new MailServiceError("邮件暂时无法发送，请稍后再试");
}
