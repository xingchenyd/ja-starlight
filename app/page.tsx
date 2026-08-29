/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import HomeSections from "./HomeSections";
import HomeCarousel from "./HomeCarousel";
import { HomeOpportunityCount, HomeTrustMetrics } from "./HomeLiveMetrics";

export const metadata: Metadata = {
  title: "JA Star Plan 星光计划｜连接青年与未来",
  description: "连接湖南青年与湖南企业的实习、项目、活动和成长平台。",
};

export default function Home() {
  return (
    <main>
      <nav className="nav shell">
        <a className="brand brand-official" href="#top" aria-label="JA 星光计划首页"><img src="/media/ja-china-logo.jpg" alt="JA China"/><b>Star Plan 星光计划</b></a>
        <div className="navlinks"><a href="#jobs">实习 / 项目机会</a><a href="#events">成长活动</a><a href="#content">成长内容</a></div>
        <div className="actions"><a className="text-link" href="/auth/enterprise">企业登录</a><a className="button small" href="/auth/student">学生登录</a></div>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">JA STAR PLAN · HUNAN</p>
          <h1>让每一次探索，<br/><em>都成为未来的光。</em></h1>
          <p className="lead">连接青年、企业与真实世界的成长机会。</p>
          <form className="search" action="/opportunities" method="get"><label><span>寻找机会</span><input name="q" placeholder="机会类别、企业或技能" /></label><button type="submit">开始探索 →</button></form>
          <HomeTrustMetrics />
        </div>
        <div className="hero-art" aria-label="青年成长路径插画">
          <div className="sun"/><div className="orbit orbit-a"/><div className="orbit orbit-b"/>
          <div className="photo-card"><div className="portrait photo-real"/><p>从校园到职场</p><b>看见更大的世界</b></div>
          <span className="bird bird-a">⌁</span><span className="bird bird-b">⌁</span>
          <HomeOpportunityCount />
        </div>
      </section>

      <HomeCarousel/>

      <HomeSections/>
      <footer><div className="shell"><div className="brand inverse brand-official"><img src="/media/ja-china-logo.jpg" alt="JA China"/><b>Star Plan 星光计划</b></div><p>让青年拥有成就全球经济的技能、思维与格局。</p><div className="footer-legal"><a href="/privacy">隐私政策</a><a href="/terms">平台使用规则</a><a href="mailto:support@jachina.org">联系项目团队</a></div><small>© 2026 JA China. All rights reserved.</small></div></footer>
    </main>
  );
}
