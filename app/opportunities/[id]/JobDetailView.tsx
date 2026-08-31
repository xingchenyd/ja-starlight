/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */
import type { Job } from "../../data";
import { workspacePath } from "../../../lib/ui/workspace-routes";

export default function JobDetailView({ job }: { job: Job }) {
  return (
    <main className="detail-page">
      <header><a className="brand" href="/"><span>星</span><b>星光计划</b></a><a href="/opportunities">← 返回机会列表</a></header>
      <section className="detail-head direct">
        <div className="public-company-logo" style={{ background: job.logoUrl ? "white" : job.color }}>{job.logoUrl ? <img src={job.logoUrl} alt={`${job.company} logo`} /> : job.logo}</div>
        <div><span className="status">{job.jobCategory}</span><h1><a href={`/companies/${encodeURIComponent(job.company)}`}>{job.company}</a></h1><h2>{job.title}</h2><p>{job.city} · {job.mode} · {job.duration}</p></div>
        <a className="primary-btn" href={workspacePath("student", "opportunities", job.id)}>生成简历与成长档案邮件</a>
      </section>
      <div className="detail-grid">
        <article>
          <h2>机会简介</h2><p>{job.summary}</p>
          <h2>职责 / 项目说明</h2>{job.responsibilities.length ? <ol>{job.responsibilities.map((item) => <li key={item}>{item}</li>)}</ol> : <p>发布方暂未补充职责说明。</p>}
          <h2>能力要求</h2>{job.requirements.length ? <ul>{job.requirements.map((item) => <li key={item}>{item}</li>)}</ul> : <p>发布方暂未补充能力要求。</p>}
          <h2>你将获得</h2><div className="benefits">{job.benefits.length ? job.benefits.map((item) => <span key={item}>✓ {item}</span>) : <span>具体收获请通过招聘邮箱向企业确认</span>}</div>
        </article>
        <aside>
          <b>机会信息</b><p><span>公司</span>{job.company}</p><p><span>机会类别</span>{job.jobCategory}</p><p><span>所在区域</span>{job.city}</p><p><span>工作方式</span>{job.mode}</p><p><span>实践周期</span>{job.duration}</p>
          <div className="detail-email"><small>简历接收邮箱</small><a href={`mailto:${job.contactEmail}`}>{job.contactEmail}</a></div>
          <p className="privacy-note">请自行在邮件中附上简历。平台不读取邮件、不代投递，也不会提供企业与学生的站内聊天。</p>
        </aside>
      </div>
    </main>
  );
}
