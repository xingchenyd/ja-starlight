import AuthShell from "../AuthShell";
import PasswordResetPanel from "./PasswordResetPanel";
export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) { const role = (await searchParams).role === "enterprise" ? "enterprise" : "student"; return <AuthShell eyebrow="SECURE ACCOUNT RECOVERY" title="找回通往成长的入口。" description="验证码仅发送到注册邮箱，验证通过后即可设置新密码。"><PasswordResetPanel role={role}/></AuthShell>; }
