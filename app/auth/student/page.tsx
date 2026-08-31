import type { Metadata } from "next";
import AuthPanel from "../AuthPanel";
import AuthShell from "../AuthShell";
export const metadata: Metadata = { title: "学生登录｜星光计划" };
const stories = [
  { image: "/media/ja-official-career-market.jpg", eyebrow: "DISCOVER · GROW · SHINE", title: "把真实世界，变成你的成长课堂。", description: "探索实习与项目机会，参加成长活动，让每一段经历被看见。" },
  { image: "/media/ja-official-student-company.jpg", eyebrow: "CREATE · COLLABORATE", title: "在真实项目里，创造能够被看见的成果。", description: "与伙伴共同实践，把每一次任务、作品与复盘沉淀为成长证据。" },
  { image: "/media/ja-official-manufacturing.jpg", eyebrow: "EXPERIENCE · CONNECT", title: "走近行业现场，找到面向未来的方向。", description: "连接企业与青年，让职业探索从信息浏览走向亲身体验。" },
];
export default function StudentAuthPage() { return <AuthShell eyebrow={stories[0].eyebrow} title={stories[0].title} description={stories[0].description} stories={stories}><AuthPanel accountRole="student"/></AuthShell>; }
