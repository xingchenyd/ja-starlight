/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import { headers } from "next/headers";
import JAConsole from "./JAConsole";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "平台运营后台", robots: { index: false, follow: false } };
export default async function AdminPage() {
  const h = await headers(), host = String(h.get("host") || "localhost");
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const request = new Request(`${host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https"}://${host}/ja-console`, { headers: { cookie: h.get("cookie") || "" } });
  const actor = local ? { id: "demo:admin", email: "admin@local.invalid", name: "JA 本地测试管理员", role: "admin" as const, testMode: true } : await (await import("../../db/runtime")).getActor(request, "admin");
  if (!actor) return <main className="admin-denied"><small>JA OPERATIONS</small><h1>管理员登录</h1><p>JA 后台仅向持有有效管理密钥的项目管理员开放。</p><a href="/ja-login">使用管理密钥登录</a><a href="/">返回主页</a></main>;
  return <JAConsole operator={actor.name}/>;
}
