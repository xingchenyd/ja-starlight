/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import { env } from "cloudflare:workers";
import { ensureCoreSchema } from "../../../../db/runtime";
import { getPublicGrowthProfile } from "../../../../lib/services/student-share";
import PublicGrowthProfile from "./PublicGrowthProfile";

export const metadata: Metadata = { title: "公开成长档案", robots: { index: false, follow: false } };
export default async function PublicGrowthPage({ params }: { params: Promise<{ token: string }> }) {
  await ensureCoreSchema();
  const { token } = await params;
  const profile = await getPublicGrowthProfile(env.DB, token, String((env as unknown as { AUTH_PEPPER?: string }).AUTH_PEPPER || ""));
  return profile ? <PublicGrowthProfile data={profile} /> : <main className="public-growth-invalid"><div><span>链接不可用</span><h1>这份成长档案已过期或被学生撤销。</h1><p>请联系档案所有者获取新的访问链接。</p><a href="/">返回星光计划首页</a></div></main>;
}
