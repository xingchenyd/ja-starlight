import OpportunityCatalog from "./OpportunityCatalog";
import Link from "next/link";

export default async function Opportunities({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { q = "", category = "全部类别" } = await searchParams;
  return (
    <main className="public-page">
      <header className="public-nav">
        <Link className="brand" href="/"><span>JA</span><b>Star Plan 星光计划</b></Link>
        <nav><Link href="/opportunities" className="active">实习 / 项目机会</Link><Link href="/activities">成长活动</Link><Link href="/content">成长内容</Link></nav>
        <Link className="button small" href="/workspace/student/opportunities">学生空间</Link>
      </header>
      <OpportunityCatalog initialQuery={q} initialCategory={category} />
    </main>
  );
}
