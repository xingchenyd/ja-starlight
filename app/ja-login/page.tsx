import type { Metadata } from "next";
import AuthShell from "../auth/AuthShell";
import JALoginPanel from "./JALoginPanel";
export const metadata: Metadata = { title: "JA 管理员登录｜JA 星光计划", robots: { index: false, follow: false } };
export default function JALoginPage() { return <AuthShell eyebrow="SECURE · AUDITABLE · RESPONSIBLE" title="守护每一次可信的成长连接。" description="JA 星光计划运营后台采用独立管理密钥，所有关键操作均可追溯。"><JALoginPanel/></AuthShell>; }
