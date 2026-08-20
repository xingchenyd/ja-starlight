/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import { jobs } from "./data";

export const metadata: Metadata = {
  title: "JA 星光计划｜连接青年与未来",
  description: "JA 中国青年发展平台——实习、活动、成长内容与可信经历。",
  other: { "codex-preview": "development" },
};

export default function Home() {
  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top" aria-label="JA 星光计划首页"><span>JA</span><b>星光计划</b></a>
        <div className="navlinks"><a href="#jobs">实习机会</a><a href="#events">成长活动</a><a href="#content">成长内容</a></div>
        <div className="actions"><a className="text-link" href="/workspace?role=enterprise">企业发布入口</a><a className="button small" href="/workspace?role=student">学生进入</a></div>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">JA STARLIGHT PROGRAM</p>
          <h1>让每一次探索，<br/><em>都成为未来的光。</em></h1>
          <p className="lead">连接青年、企业与真实世界的成长机会。发现适合你的实习与活动，把每段实践沉淀为可信的成长经历。</p>
          <form className="search" action="/opportunities"><label><span>寻找机会</span><input name="q" placeholder="职位、行业或城市" /></label><button type="submit">开始探索 →</button></form>
          <div className="trust"><b>12,600+</b> 青年参与 <i/> <b>180+</b> 合作企业 <i/> <b>92%</b> 推荐率</div>
        </div>
        <div className="hero-art" aria-label="青年成长路径插画">
          <div className="sun"/><div className="orbit orbit-a"/><div className="orbit orbit-b"/>
          <div className="photo-card"><div className="portrait photo-real"/><p>从校园到职场</p><b>看见更大的世界</b></div>
          <span className="bird bird-a">⌁</span><span className="bird bird-b">⌁</span>
          <div className="float-note"><span>本周新增</span><b>26 个机会</b></div>
        </div>
      </section>

      <section className="section shell" id="jobs">
        <div className="section-head"><div><p className="eyebrow">精选机会</p><h2>值得投入的第一步</h2></div><a href="/opportunities">查看全部机会 →</a></div>
        <div className="job-grid">{jobs.slice(0,3).map((job)=><article className="job-card home-job" key={job.id}><div className="home-job-logo" style={{backgroundImage:job.logoUrl?`url(${job.logoUrl})`:undefined}}>{job.logoUrl?"":job.logo}</div><span className="tag">{job.status}</span><h3>{job.company}</h3><h4>{job.title}</h4><small>{job.city} · {job.mode} · {job.duration}</small><a href={`/opportunities/${job.id}`}>查看职责与投递邮箱 <b>↗</b></a></article>)}</div>
      </section>

      <section className="path" id="events"><div className="shell path-inner"><div><p className="eyebrow light">你的成长路径</p><h2>不只找到机会，<br/>更看见自己的进步。</h2></div><ol><li><span>01</span><b>发现</b><p>匹配真实的实习与活动</p></li><li><span>02</span><b>参与</b><p>完成有质量的实践体验</p></li><li><span>03</span><b>沉淀</b><p>获得 JA 认证的成长经历</p></li></ol></div></section>

      <section className="section shell content-strip" id="content"><p className="eyebrow">成长内容</p><h2>在出发之前，做好准备。</h2><div className="topic-row"><a href="/content">简历与面试 <span>08</span></a><a href="/content">职业探索 <span>12</span></a><a href="/content">职场通识 <span>16</span></a></div></section>
      <footer><div className="shell"><div className="brand inverse"><span>JA</span><b>星光计划</b></div><p>让青年拥有成就全球经济的技能与思维。</p><small>© 2026 JA China. All rights reserved.</small></div></footer>
    </main>
  );
}
