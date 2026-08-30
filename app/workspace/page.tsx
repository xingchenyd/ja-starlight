import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { legacyWorkspacePath } from "../../lib/ui/workspace-routes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "工作台｜JA 星光计划", description: "学生与企业协作工作台" };
export default async function Workspace({ searchParams }: { searchParams: Promise<{ role?: string; tab?: string; item?: string }> }) {
  redirect(legacyWorkspacePath(await searchParams));
}
