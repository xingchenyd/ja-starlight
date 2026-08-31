/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import HomeSections from "./HomeSections";
import HomeCarousel from "./HomeCarousel";
import { HomeOpportunityCount, HomeTrustMetrics } from "./HomeLiveMetrics";
import HomeGrowthJourney from "./HomeGrowthJourney";
import HomeImpactStories from "./HomeImpactStories";

export const metadata: Metadata = {
  title: "星光计划｜连接青年与未来",
  description: "连接湖南青年与湖南企业的实习、项目、活动和成长平台。",
};

export default function Home() {
  return (
    <main className="public-home">
      <nav className="nav shell home-nav">
        <a className="brand brand-official" href="#top" aria-label="星光计划首页"><img src="/media/ja-china-logo.jpg" alt="星光计划"/><b>Star Plan 星光计划</b></a>
        <div className="navlinks"><a href="#jobs">实习 / 项目机会</a><a href="#events">成长活动</a><a href="#content">成长内容</a></div>
        <div className="actions"><a className="text-link" href="/auth/enterprise">企业登录</a><a className="button small" href="/auth/student">学生登录</a></div>
      </nav>

      <section className="cinema-hero" id="top">
        <HomeCarousel/>
        <div className="cinema-message shell">
          <div className="cinema-copy">
          <p className="eyebrow">星光计划 · HUNAN</p>
          <h1>让每一次探索，<br/><em>都成为未来的光。</em></h1>
          <p className="lead">连接青年、企业与真实世界的成长机会。</p>
          <form className="search" action="/opportunities" method="get"><label><span>寻找机会</span><input name="q" placeholder="机会类别、企业或技能" /></label><button type="submit">开始探索 →</button></form>
          <HomeTrustMetrics />
          </div>
        </div>
        <HomeOpportunityCount />
      </section>

      <HomeSections/>
      <HomeGrowthJourney/>
      <HomeImpactStories/>
      <footer><div className="shell"><div className="brand inverse brand-official"><img src="/media/ja-china-logo.jpg" alt="星光计划"/><b>Star Plan 星光计划</b></div><p>让青年拥有成就全球经济的技能、思维与格局。</p><div className="footer-legal"><a href="/privacy">隐私政策</a><a href="/terms">平台使用规则</a><a href="mailto:support@jachina.org">联系项目团队</a></div><small>© 2026 星光计划. All rights reserved.</small></div></footer>
    </main>
  );
}
