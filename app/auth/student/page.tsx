import type { Metadata } from "next";
import AuthPanel from "../AuthPanel";
import AuthShell from "../AuthShell";
export const metadata: Metadata = { title: "学生登录｜JA 星光计划" };
export default function StudentAuthPage() { return <AuthShell eyebrow="DISCOVER · GROW · SHINE" title="把真实世界，变成你的成长课堂。" description="探索实习与项目机会，参加成长活动，让每一段经历被看见。"><AuthPanel accountRole="student"/></AuthShell>; }
