import ContentCatalog from "./ContentCatalog";
import Link from "next/link";

export default function Content() {
  return (
    <main className="public-page">
      <header className="public-nav">
        <Link className="brand" href="/"><span>JA</span><b>Star Plan 星光计划</b></Link>
        <nav><Link href="/opportunities">实习 / 项目机会</Link><Link href="/#events">成长活动</Link><Link className="active" href="/content">成长内容</Link></nav>
        <Link className="button small" href="/workspace?role=student">进入平台</Link>
      </header>
      <ContentCatalog />
    </main>
  );
}
