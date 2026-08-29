import type { Metadata } from "next";
import AuthPanel from "../AuthPanel";
import AuthShell from "../AuthShell";
export const metadata: Metadata = { title: "企业登录｜JA 星光计划" };
export default function EnterpriseAuthPage() { return <AuthShell eyebrow="CONNECT · INSPIRE · ENABLE" title="与新一代人才，共同创造未来。" description="发布真实机会与成长活动，以清晰流程管理内容、报名和组织资料。"><AuthPanel accountRole="enterprise"/></AuthShell>; }
