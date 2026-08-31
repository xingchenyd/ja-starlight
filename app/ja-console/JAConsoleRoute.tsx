/* eslint-disable @next/next/no-html-link-for-pages */
import { headers } from "next/headers";
import { jaConsolePath, normalizeJATab } from "../../lib/ui/ja-routes";
import JAConsole from "./JAConsole";

export default async function JAConsoleRoute({ tab }: { tab: string }) {
  const safeTab = normalizeJATab(tab);
  const h = await headers();
  const host = String(h.get("host") || "localhost");
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const request = new Request(
    `${local ? "http" : "https"}://${host}${jaConsolePath(safeTab)}`,
    { headers: { cookie: h.get("cookie") || "" } },
  );
  const actor = host.endsWith(".test")
    ? { id: "test:admin", email: "", name: "星光计划运营管理员", role: "admin" as const, testMode: true }
    : await (await import("../../db/runtime")).getActor(request, "admin");

  if (!actor) {
    return (
      <main className="admin-denied">
        <small>STARLIGHT OPERATIONS</small>
        <h1>管理员登录</h1>
        <p>星光计划运营后台仅向持有有效管理密钥的项目管理员开放。</p>
        <a href={`/ja-login?returnTo=${encodeURIComponent(jaConsolePath(safeTab))}`}>
          使用管理密钥登录
        </a>
        <a href="/">返回主页</a>
      </main>
    );
  }

  return <JAConsole operator={actor.name} initialTab={safeTab} />;
}
