import type { Metadata } from "next";
import WorkspaceRoute from "../../WorkspaceRoute";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "工作台｜JA 星光计划", description: "学生与企业协作工作台" };

export default async function CanonicalWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ role: string; tab: string }>;
  searchParams: Promise<{ item?: string }>;
}) {
  const [{ role, tab }, { item }] = await Promise.all([params, searchParams]);
  return <WorkspaceRoute role={role} tab={tab} item={item}/>;
}

