/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { chatGPTSignInPath, getChatGPTUser } from "../chatgpt-auth";
import PlatformApp from "./PlatformApp";

export const metadata:Metadata={title:"工作台｜JA 星光计划",description:"学生、企业与 JA 运营协作工作台"};
export default async function Workspace({searchParams}:{searchParams:Promise<{role?:string;tab?:string;item?:string}>}){
  const {role,tab,item}=await searchParams,selectedRole=role==="enterprise"?"enterprise":"student";
  const h=await headers(),host=String(h.get("host")||"");
  const local=!host||host.startsWith("localhost")||host.startsWith("127.0.0.1");
  const runtime=local?null:await import("cloudflare:workers"),env=runtime?.env;
  const testMode=String((env as unknown as {STARLIGHT_TEST_MODE?:string}|undefined)?.STARLIGHT_TEST_MODE||"")==="true";
  const user=await getChatGPTUser();
  if(!local&&!testMode&&!user)return <main className="workspace-gate"><Image src="/media/ja-china-logo.jpg" alt="JA China" width={104} height={104}/><small>JA STAR PLAN</small><h1>登录后进入{selectedRole==="enterprise"?"企业工作台":"学生空间"}</h1><p>公开机会、活动和成长内容无需登录；保存资料、报名和发布内容需要经过身份确认。</p><a href={chatGPTSignInPath(`/workspace?role=${selectedRole}${tab?`&tab=${encodeURIComponent(tab)}`:""}`)}>登录并继续</a><a className="gate-back" href="/">返回公开主页</a></main>;
  if(user&&!testMode&&env){const {ensureCoreSchema}=await import("../../db/runtime");await ensureCoreSchema();const account=await env.DB.prepare("SELECT role,status FROM users WHERE id=?").bind(user.userId).first<{role:string;status:string}>();if(account?.status==="suspended")return <main className="workspace-gate"><h1>账号暂不可用</h1><p>请联系 JA 项目团队核实账号状态。</p><a href="mailto:support@jachina.org">联系项目团队</a></main>;if(account&&account.role!==selectedRole&&account.role!=="admin")return <main className="workspace-gate"><h1>账号身份不匹配</h1><p>该账号已登记为{account.role==="enterprise"?"企业":"学生"}身份，不能切换到另一工作台。</p><a href={`/workspace?role=${account.role}`}>进入正确工作台</a></main>}
  return <PlatformApp initialRole={selectedRole} initialTab={tab} initialItem={item}/>;
}
