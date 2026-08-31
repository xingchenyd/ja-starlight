import ContentCatalog from "./ContentCatalog";
import Link from "next/link";

export default async function Content({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { q = "", category = "全部内容" } = await searchParams;
  return (
    <main className="public-page">
      <header className="public-nav">
        <Link className="brand" href="/"><span>星</span><b>星光计划</b></Link>
        <nav><Link href="/opportunities">实习 / 项目机会</Link><Link href="/activities">成长活动</Link><Link className="active" href="/content">成长内容</Link></nav>
        <Link className="button small" href="/workspace/student/content">进入平台</Link>
      </header>
      <ContentCatalog initialQuery={q} initialCategory={category} />
    </main>
  );
}
