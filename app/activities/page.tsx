/* eslint-disable @next/next/no-html-link-for-pages */
import ActivityCatalog from "./ActivityCatalog";

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { q = "", category = "全部活动" } = await searchParams;
  return (
    <main className="public-page">
      <header className="public-nav">
        <a className="brand" href="/"><span>星</span><b>星光计划</b></a>
        <nav><a href="/opportunities">实习 / 项目机会</a><a href="/activities" className="active">成长活动</a><a href="/content">成长内容</a></nav>
        <a className="button small" href="/workspace/student/activities">学生空间</a>
      </header>
      <ActivityCatalog initialQuery={q} initialCategory={category} />
    </main>
  );
}
