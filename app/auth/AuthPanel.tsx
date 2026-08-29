"use client";
import { FormEvent, useMemo, useState } from "react";

type Role = "student" | "enterprise";
const messages: Record<string, string> = { EMAIL_ALREADY_REGISTERED: "该邮箱已注册，请直接登录或找回密码。", INVALID_CREDENTIALS: "邮箱、密码或登录身份不正确。", WEAK_PASSWORD: "密码须为 8-20 位，含字母、数字和符号，且不能包含中文或空格。", TOO_MANY_ATTEMPTS: "尝试次数过多，请稍后再试。" };

export default function AuthPanel({ accountRole: role }: { accountRole: Role }) {
  const [mode, setMode] = useState<"login" | "register">("login"), [busy, setBusy] = useState(false), [error, setError] = useState(""), [password, setPassword] = useState(""), [show, setShow] = useState(false);
  const strength = useMemo(() => [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z\d]/].filter((item) => item.test(password)).length, [password]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget), email = String(data.get("email") || "");
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, role }) });
      const result = await response.json() as { code?: string; error?: string };
      if (!response.ok) throw new Error(messages[result.code || ""] || result.error || "暂时无法完成，请稍后再试。");
      location.assign(`/workspace?role=${role}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "暂时无法完成，请稍后再试。"); }
    finally { setBusy(false); }
  }
  return <div className="auth-card page-transition"><header><small>{role === "student" ? "STUDENT ACCESS" : "ENTERPRISE ACCESS"}</small><h2>{role === "student" ? "学生空间" : "企业工作台"}</h2></header><div className="auth-tabs" role="tablist"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>登录</button><button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>注册</button></div><form onSubmit={submit}><label><span>邮箱</span><input name="email" type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" maxLength={254} required/></label><label><span>密码</span><div className="auth-password"><input name="password" type={show ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="8-20 位英文、数字与符号" minLength={8} maxLength={20} pattern="[!-~]{8,20}" value={password} onChange={(event) => setPassword(event.target.value)} required/><button type="button" onClick={() => setShow(!show)} aria-label={show ? "隐藏密码" : "显示密码"}>{show ? "隐藏" : "显示"}</button></div></label>{mode === "register" && <div className="password-meter"><span><i className={strength > 0 ? "on" : ""}/><i className={strength > 1 ? "on" : ""}/><i className={strength > 2 ? "on" : ""}/><i className={strength > 3 ? "on" : ""}/></span><small>8-20 位，不支持中文和空格</small></div>}{error && <p className="auth-error" role="alert">{error}</p>}<button className="auth-submit" disabled={busy}>{busy ? "正在处理…" : mode === "login" ? "登录并进入" : "创建账号"}</button>{mode === "login" && <a className="auth-forgot" href={`/auth/forgot-password?role=${role}`}>忘记密码？</a>}</form><footer>{role === "student" ? "发现机会 · 报名活动 · 记录成长" : "发布机会 · 管理活动 · 查看报名"}</footer></div>;
}
