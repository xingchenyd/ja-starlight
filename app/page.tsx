/* eslint-disable @next/next/no-img-element */
import BrandLogo from "./components/BrandLogo";
import type { Metadata } from "next";
import HomeSections from "./HomeSections";
import HomeCarousel from "./HomeCarousel";
import { HomeTrustMetrics } from "./HomeLiveMetrics";
import HomeGrowthJourney from "./HomeGrowthJourney";
import HomeImpactStories from "./HomeImpactStories";
import HomeHeader from "./HomeHeader";

export const metadata: Metadata = {
  title: "星光计划｜连接青年与未来",
  description: "连接湖南青年与湖南企业的实习、项目、活动和成长平台。",
};

export default function Home() {
  return (
    <main className="public-home">
      <HomeHeader />

      <section className="cinema-hero" id="top">
        <div className="cinema-message shell">
          <div className="cinema-copy">
            <p className="eyebrow">星光计划 · HUNAN</p>
            <h1><span>让每一次探索，</span><em>都成为未来的光。</em></h1>
            <p className="lead">连接青年、企业与真实世界的成长机会。</p>
            <form className="search" action="/opportunities" method="get" role="search"><label><span>寻找机会</span><input name="q" aria-label="寻找机会" placeholder="机会类别、企业或技能" /></label><button type="submit">开始探索 <span aria-hidden="true">→</span></button></form>
            <HomeTrustMetrics />
          </div>
        </div>
        <HomeCarousel/>
      </section>

      <HomeSections/>
      <HomeGrowthJourney/>
      <HomeImpactStories/>
      <footer className="site-footer"><div className="shell"><div className="brand inverse brand-official"><BrandLogo /></div><p>让青年拥有成就全球经济的技能、思维与格局。</p><div className="footer-legal"><a href="/privacy">隐私政策</a><a href="/terms">平台使用规则</a><a href="mailto:ruthyanghao@hotmail.com">联系项目团队</a></div><div className="footer-compliance" aria-label="网站备案信息"><small>© 2026 星光计划 · 主办者：杨浩</small><a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">湘ICP备2026038303号-1</a><a className="public-security-record" href="https://beian.mps.gov.cn/#/query/webSearch?code=43012102001418" target="_blank" rel="noreferrer"><img src="/beian-icon.png" alt="" aria-hidden="true"/><span>湘公网安备43012102001418号</span></a></div></div></footer>
    </main>
  );
}
