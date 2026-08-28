/* eslint-disable @next/next/no-html-link-for-pages */
import type {Metadata} from "next";
import { headers } from "next/headers";
import { chatGPTSignInPath, getChatGPTUser } from "../chatgpt-auth";
import JAConsole from "./JAConsole";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"平台运营后台",robots:{index:false,follow:false}};
export default async function AdminPage(){
  const h=await headers(),host=String(h.get("host")||"");
  const local=!host||host.startsWith("localhost")||host.startsWith("127.0.0.1");
  const user=await getChatGPTUser();
  const config=local?{}:((await import("cloudflare:workers")).env as unknown as {JA_ADMIN_EMAILS?:string;JA_ADMIN_USER_IDS?:string;STARLIGHT_TEST_MODE?:string});
  const values=(value?:string)=>String(value||"").split(",").map((item)=>item.trim().toLowerCase()).filter(Boolean);
  const allowed=Boolean(user&&(values(config.JA_ADMIN_EMAILS).includes(user.email.toLowerCase())||values(config.JA_ADMIN_USER_IDS).includes(user.userId.toLowerCase())));
  if(!local&&config.STARLIGHT_TEST_MODE!=="true"&&!user)return <main className="admin-denied"><small>JA OPERATIONS</small><h1>管理员登录</h1><p>JA 后台仅向获授权的项目管理员开放。</p><a href={chatGPTSignInPath("/ja-console")}>登录后进入</a></main>;
  if(!local&&config.STARLIGHT_TEST_MODE!=="true"&&!allowed)return <main className="admin-denied"><small>ACCESS CONTROL</small><h1>当前账号没有后台权限</h1><p>如需开通，请联系 JA 项目负责人加入管理员名单。</p><a href="/">返回主页</a></main>;
  return <JAConsole operator={local||config.STARLIGHT_TEST_MODE==="true"?"JA 本地测试管理员":user?.displayName||"JA 管理员"}/>;
}
