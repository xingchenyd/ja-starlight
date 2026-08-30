import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { jaConsolePath } from "../../lib/ui/ja-routes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "平台运营后台", robots: { index: false, follow: false } };
export default async function AdminPage() {
  redirect(jaConsolePath("pulse"));
}
