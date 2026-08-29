/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import PlatformApp from "./PlatformApp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "工作台｜JA 星光计划", description: "学生与企业协作工作台" };
export default async function Workspace({ searchParams }: { searchParams: Promise<{ role?: string; tab?: string; item?: string }> }) {
  const { role, tab, item } = await searchParams, selectedRole = role === "enterprise" ? "enterprise" : "student";
  const h = await headers(), host = String(h.get("host") || "localhost");
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const request = new Request(`${host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https"}://${host}/workspace`, { headers: { cookie: h.get("cookie") || "", "x-starlight-role": selectedRole } });
  const actor = local ? { id: `demo:${selectedRole}`, email: `${selectedRole}@local.invalid`, name: selectedRole === "enterprise" ? "星光示范企业" : "张晨", role: selectedRole, testMode: true } : await (await import("../../db/runtime")).getActor(request, selectedRole);
  if (!actor) return <main className="workspace-gate"><Image src="/media/ja-china-logo.jpg" alt="JA China" width={104} height={104}/><small>JA STAR PLAN</small><h1>登录后进入{selectedRole === "enterprise" ? "企业工作台" : "学生空间"}</h1><p>公开机会、活动和成长内容无需登录；保存资料、报名和发布内容需要账号确认。</p><a href={`/auth/${selectedRole}?returnTo=${encodeURIComponent(`/workspace?role=${selectedRole}${tab ? `&tab=${tab}` : ""}`)}`}>邮箱登录 / 注册</a><a className="gate-back" href="/">返回公开主页</a></main>;
  if (actor.role !== selectedRole && actor.role !== "admin") return <main className="workspace-gate"><h1>账号身份不匹配</h1><p>一个邮箱只对应一个平台身份，请进入已注册的工作台。</p><a href={`/workspace?role=${actor.role}`}>进入正确工作台</a></main>;
  return <PlatformApp initialRole={selectedRole} initialTab={tab} initialItem={item}/>;
}
