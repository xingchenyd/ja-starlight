/* eslint-disable @next/next/no-html-link-for-pages */
import Image from "next/image";
import { headers } from "next/headers";
import PlatformApp from "./PlatformApp";
import { normalizeWorkspaceRoute, workspacePath } from "../../lib/ui/workspace-routes";

export default async function WorkspaceRoute({ role, tab, item }: { role: string; tab: string; item?: string }) {
  const route = normalizeWorkspaceRoute(role, tab);
  const h = await headers();
  const host = String(h.get("host") || "localhost");
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const protocol = local ? "http" : "https";
  const request = new Request(`${protocol}://${host}${workspacePath(route.role, route.tab, item)}`, {
    headers: { cookie: h.get("cookie") || "" },
  });
  const actor = local
    ? { id: `demo:${route.role}`, email: `${route.role}@local.invalid`, name: route.role === "enterprise" ? "星光示范企业" : "张晨", role: route.role, testMode: true }
    : await (await import("../../db/runtime")).getActor(request, route.role);

  if (!actor) {
    const returnTo = workspacePath(route.role, route.tab, item);
    return (
      <main className="workspace-gate">
        <Image src="/media/ja-china-logo.jpg" alt="JA China" width={104} height={104}/>
        <small>JA STAR PLAN</small>
        <h1>登录后进入{route.role === "enterprise" ? "企业工作台" : "学生空间"}</h1>
        <p>公开机会、活动和成长内容无需登录；保存资料、报名和发布内容需要账号确认。</p>
        <a href={`/auth/${route.role}?returnTo=${encodeURIComponent(returnTo)}`}>邮箱登录 / 注册</a>
        <a className="gate-back" href="/">返回公开主页</a>
      </main>
    );
  }

  if (actor.role !== route.role && actor.role !== "admin") {
    const targetRole = actor.role === "enterprise" ? "enterprise" : "student";
    return (
      <main className="workspace-gate">
        <h1>账号身份不匹配</h1>
        <p>一个邮箱只对应一个平台身份，请进入已注册的工作台。</p>
        <a href={workspacePath(targetRole, "overview")}>进入正确工作台</a>
      </main>
    );
  }

  return <PlatformApp initialRole={route.role} initialTab={route.tab} initialItem={item}/>;
}

