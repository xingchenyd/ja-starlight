import type { Metadata } from "next";
import JAConsoleRoute from "../JAConsoleRoute";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "平台运营后台",
  robots: { index: false, follow: false },
};

export default async function JATabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  return <JAConsoleRoute tab={tab} />;
}
