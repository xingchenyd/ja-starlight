/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */
import type { Metadata } from "next";
import { activities, contents, jobs } from "./data";
import HomeCarousel from "./HomeCarousel";

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
        <div className="actions"><a className="text-link" href="/workspace?role=enterprise">企业发布入口</a><a className="button small" href="/workspace?role=student">学生进入</a></div>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">JA STAR PLAN · HUNAN</p>
          <h1>让每一次探索，<br/><em>都成为未来的光。</em></h1>
          <p className="lead">连接湖南青年、湖南企业与真实世界的成长机会。按类别发现适合你的实习 / 项目与活动，把技能、思维和格局沉淀为可信的成长经历。</p>
          <form className="search" action="/opportunities"><label><span>寻找机会</span><input name="q" placeholder="机会类别、企业或技能" /></label><button type="submit">开始探索 →</button></form>
          <div className="trust"><b>12,600+</b> 青年参与 <i/> <b>180+</b> 合作企业 <i/> <b>92%</b> 推荐率</div>
        </div>
        <div className="hero-art" aria-label="青年成长路径插画">
          <div className="sun"/><div className="orbit orbit-a"/><div className="orbit orbit-b"/>
          <div className="photo-card"><div className="portrait photo-real"/><p>从校园到职场</p><b>看见更大的世界</b></div>
          <span className="bird bird-a">⌁</span><span className="bird bird-b">⌁</span>
          <div className="float-note"><span>本周新增</span><b>26 个机会</b></div>
        </div>
      </section>

      <HomeCarousel/>

      <section className="section shell live-board" aria-label="Star Plan 平台活力看板">
        <div className="section-head"><div><p className="eyebrow">LIVE IMPACT</p><h2>平台正在沉淀真实成长。</h2></div><a href="/workspace?role=student">进入学生空间 →</a></div>
        <div className="live-board-grid"><article><b>{jobs.length}</b><span>实习 / 项目机会</span><i style={{height:"74%"}}/></article><article><b>{activities.length}</b><span>成长活动</span><i style={{height:"56%"}}/></article><article><b>{contents.length}</b><span>成长内容</span><i style={{height:"68%"}}/></article><article><b>3</b><span>成长维度：技能、思维、格局</span><i style={{height:"86%"}}/></article></div>
      </section>

      <section className="section shell" id="jobs">
        <div className="section-head"><div><p className="eyebrow">湖南精选机会</p><h2>值得投入的第一步</h2></div><a href="/opportunities">按类别查看 →</a></div>
        <div className="job-grid">{jobs.slice(0,3).map((job)=><article className="job-card home-job" key={job.id}><div className="home-job-logo" style={{backgroundImage:job.logoUrl?`url(${job.logoUrl})`:undefined}}>{job.logoUrl?"":job.logo}</div><span className="tag">{job.jobCategory}</span><h3>{job.company}</h3><h4>{job.title}</h4><small>{job.city} · {job.mode} · {job.duration}</small><a href={`/opportunities/${job.id}`}>查看职责与投递邮箱 <b>↗</b></a></article>)}</div>
      </section>

      <section className="path" id="events"><div className="shell path-inner"><div><p className="eyebrow light">你的成长路径</p><h2>不只找到机会，<br/>更看见自己的进步。</h2></div><ol><li><span>01</span><b>技能</b><p>匹配真实的实习、项目与活动</p></li><li><span>02</span><b>思维</b><p>完成有质量的实践与复盘</p></li><li><span>03</span><b>格局</b><p>沉淀 JA 认证的成长经历</p></li></ol></div></section>

      <section className="section shell content-strip" id="content"><p className="eyebrow">成长内容</p><h2>在出发之前，做好准备。</h2><div className="topic-row"><a href="/content">技能成长 <span>08</span></a><a href="/content">活动分享 <span>12</span></a><a href="/content">企业曝光 <span>16</span></a></div></section>
      <footer><div className="shell"><div className="brand inverse brand-official"><img src="/media/ja-china-logo.jpg" alt="JA China"/><b>Star Plan 星光计划</b></div><p>让青年拥有成就全球经济的技能、思维与格局。</p><small>© 2026 JA China. All rights reserved.</small></div></footer>
    </main>
  );
}
