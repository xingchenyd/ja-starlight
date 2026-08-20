import type {Metadata} from "next";
import {env} from "cloudflare:workers";
import Link from "next/link";
import {requireChatGPTUser} from "../chatgpt-auth";
import JAConsole from "./JAConsole";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"平台运营后台",robots:{index:false,follow:false}};
export default async function AdminPage(){const user=await requireChatGPTUser("/ja-console");const list=((env as unknown as {JA_ADMIN_EMAILS?:string}).JA_ADMIN_EMAILS??"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);if(!list.includes(user.email.toLowerCase()))return <main className="admin-denied"><small>JA OPERATIONS</small><h1>此账号没有后台权限</h1><p>请联系平台所有者将你的工作邮箱加入管理员名单。</p><Link href="/">返回官网</Link></main>;return <JAConsole operator={user.displayName}/>}
