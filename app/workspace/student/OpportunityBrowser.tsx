/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { SidePanel, StatusBadge } from "../../components/ui";
import FavoriteButton from "../../components/catalog/FavoriteButton";
import type { Job } from "../../data";
import {
  defaultStudentOpportunityFilters,
  parseStudentOpportunityFilters,
  studentOpportunityUrl,
  type StudentOpportunityFilters,
} from "../../../lib/catalog/student-opportunity-url";
import type { StudentFavorite } from "./useStudentData";

const jobCategories = ["全部类别", "产品运营", "技术研发", "数据分析", "品牌内容", "智能制造", "金融与商业", "项目实践", "公益实践"];
const degreeOptions = ["全部学历", "高中", "大专", "本科", "硕士", "博士"];
const industryOptions = ["全部行业", "互联网AI", "电子通信半导体", "服务业", "消费批发零售", "房地产建筑", "教育培训", "广告传媒文化体育", "制造业", "专业服务", "医疗", "汽车", "交通运输物流", "能源化工环保", "金融", "政府公益"];

function JobLogo({ job, large = false }: { job: Job; large?: boolean }) {
  return (
    <span className={`real-logo ${large ? "large" : ""}`} style={{ background: job.logoUrl ? "white" : job.color }}>
      {job.logoUrl ? <img src={job.logoUrl} alt={`${job.company} logo`} /> : job.logo}
    </span>
  );
}

export default function OpportunityBrowser({
  allJobs,
  initialItem,
  favorites,
  onNavigate,
  onToggleFavorite,
  flash,
}: {
  allJobs: Job[];
  initialItem?: string;
  favorites: StudentFavorite[];
  onNavigate: (tab: string, itemId?: string, preserveSearch?: boolean) => void;
  onToggleFavorite: (targetType: "job", targetId: string, snapshot: Record<string, unknown>) => Promise<boolean>;
  flash: (message: string) => void;
}) {
  const initial = typeof window === "undefined" ? defaultStudentOpportunityFilters : parseStudentOpportunityFilters(window.location.search);
  const [filters, setFilters] = useState<StudentOpportunityFilters>(initial);
  const [queryDraft, setQueryDraft] = useState(initial.query);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(["岗位类别"]));
  const selected = initialItem ? allJobs.find((job) => job.id === initialItem) || null : null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => current.query === queryDraft.trim() ? current : { ...current, query: queryDraft.trim() });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [queryDraft]);

  useEffect(() => {
    window.history.replaceState(window.history.state, "", studentOpportunityUrl(filters, initialItem));
  }, [filters, initialItem]);

  useEffect(() => {
    const restore = () => {
      const restored = parseStudentOpportunityFilters(window.location.search);
      setFilters(restored);
      setQueryDraft(restored.query);
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  const shown = useMemo(() => allJobs
    .filter((job) => {
      const haystack = `${job.company}${job.title}${job.jobCategory}${job.tags.join("")}`.toLowerCase();
      return (filters.category === "全部类别" || job.jobCategory === filters.category)
        && (filters.degree === "全部学历" || job.degree === filters.degree)
        && (filters.industry === "全部行业" || job.industry === filters.industry)
        && Number(job.salaryMax || 500) >= filters.salaryMin
        && Number(job.salaryMin || 0) <= filters.salaryMax
        && haystack.includes(filters.query.toLowerCase());
    })
    .sort((a, b) => filters.sort === "salary-high"
      ? Number(b.salaryMax || 0) - Number(a.salaryMax || 0)
      : filters.sort === "salary-low"
        ? Number(a.salaryMin || 0) - Number(b.salaryMin || 0)
        : String(b.publishedAt || "").localeCompare(String(a.publishedAt || ""))), [allJobs, filters]);

  const set = <K extends keyof StudentOpportunityFilters>(key: K, value: StudentOpportunityFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const toggleGroup = (name: string) => setOpenGroups((current) => {
    const next = new Set(current);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });
  const group = (name: string, summary: string, children: ReactNode) => (
    <section className={`filter-dropdown ${openGroups.has(name) ? "open" : ""}`}>
      <button className="filter-trigger" onClick={() => toggleGroup(name)} aria-expanded={openGroups.has(name)}>
        <span><b>{name}</b><em>{summary}</em></span><i>{openGroups.has(name) ? "−" : "+"}</i>
      </button>
      <div className="filter-panel">{children}</div>
    </section>
  );
  const reset = () => {
    setFilters(defaultStudentOpportunityFilters);
    setQueryDraft("");
  };
  const activeChips = [
    filters.query ? { label: `关键词：${filters.query}`, clear: () => { setQueryDraft(""); set("query", ""); } } : null,
    filters.category !== "全部类别" ? { label: filters.category, clear: () => set("category", "全部类别") } : null,
    filters.degree !== "全部学历" ? { label: filters.degree, clear: () => set("degree", "全部学历") } : null,
    filters.industry !== "全部行业" ? { label: filters.industry, clear: () => set("industry", "全部行业") } : null,
    filters.salaryMin !== 0 || filters.salaryMax !== 500 ? { label: `${filters.salaryMin}–${filters.salaryMax} 元/天`, clear: () => setFilters((current) => ({ ...current, salaryMin: 0, salaryMax: 500 })) } : null,
  ].filter(Boolean) as { label: string; clear: () => void }[];

  const isFavorite = (job: Job) => favorites.some((favorite) => favorite.targetType === "job" && favorite.targetId === job.id && favorite.status !== "removed");
  const toggleFavorite = async (job: Job) => {
    try {
      const active = await onToggleFavorite("job", job.id, { title: job.title, company: job.company, summary: job.summary, status: job.status, cover: job.logoUrl || "" });
      flash(active ? "已收藏该机会" : "已取消收藏");
    } catch (error) { flash(error instanceof Error ? error.message : "收藏操作失败"); }
  };
  const copy = async (email: string) => {
    try { await navigator.clipboard.writeText(email); }
    catch {
      const area = document.createElement("textarea");
      area.value = email; area.style.position = "fixed"; area.style.opacity = "0";
      document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove();
    }
    flash(`招聘邮箱已复制：${email}`);
  };
  const mailHref = (job: Job) => `mailto:${job.contactEmail}?subject=${encodeURIComponent(`应聘${job.title}｜来自 JA 星光计划`)}&body=${encodeURIComponent(`您好，我希望申请贵公司的「${job.title}」岗位，简历见附件。\n\n姓名：\n学校：\n联系电话：`)}`;

  return (
    <>
      <div className="page-title" data-page-heading tabIndex={-1}><div><small>OPPORTUNITIES</small><h1>实习项目机会</h1></div></div>
      <section className="opportunity-filter-system compact">
        <label className="search-field"><span>搜索机会</span><input value={queryDraft} onChange={(event) => setQueryDraft(event.target.value)} placeholder="企业、岗位或技能" /></label>
        {group("岗位类别", filters.category, <nav>{jobCategories.map((item) => <button key={item} className={filters.category === item ? "active" : ""} onClick={() => set("category", item)}>{item}</button>)}</nav>)}
        {group("学历要求", filters.degree, <nav>{degreeOptions.map((item) => <button key={item} className={filters.degree === item ? "active" : ""} onClick={() => set("degree", item)}>{item}</button>)}</nav>)}
        {group("薪资待遇", `${filters.salaryMin}–${filters.salaryMax} 元/天`, <div className="dual-salary salary-dual-slider" style={{ "--from": `${filters.salaryMin / 5}%`, "--to": `${filters.salaryMax / 5}%` } as CSSProperties}>
          <div className="salary-range-values"><span>下限 {filters.salaryMin} 元/天</span><span>上限 {filters.salaryMax} 元/天</span></div>
          <div className="double-range"><input aria-label="薪资下限" type="range" min="0" max="500" step="1" value={filters.salaryMin} onChange={(event) => set("salaryMin", Math.min(Number(event.target.value), filters.salaryMax))} /><input aria-label="薪资上限" type="range" min="0" max="500" step="1" value={filters.salaryMax} onChange={(event) => set("salaryMax", Math.max(Number(event.target.value), filters.salaryMin))} /></div>
          <div className="salary-range-labels"><span>0</span><span>500 元/天</span></div>
        </div>)}
        {group("行业分类", filters.industry, <nav>{industryOptions.map((item) => <button key={item} className={filters.industry === item ? "active" : ""} onClick={() => set("industry", item)}>{item}</button>)}</nav>)}
      </section>
      {activeChips.length ? <div className="active-filter-chips" aria-label="已启用筛选">{activeChips.map((chip) => <button key={chip.label} onClick={chip.clear}>{chip.label}<span>×</span></button>)}<button className="clear-all" onClick={reset}>清空全部</button></div> : null}
      <div className="opportunity-resultbar"><div><b>{shown.length}</b><span>个机会符合当前条件</span></div><label>排序<select value={filters.sort} onChange={(event) => set("sort", event.target.value)}><option value="latest">最新发布</option><option value="salary-high">最高薪资优先</option><option value="salary-low">最低门槛优先</option></select></label></div>
      <div className="student-job-list">
        {shown.map((job) => (
          <article key={job.id}>
            <div className="student-job-main"><JobLogo job={job} large /><div><a className="company-name-link" href={`/companies/${encodeURIComponent(job.company)}`}>{job.company}</a><h3>{job.title}</h3><p>{job.summary}</p><small>{job.city || "长沙"} · {job.duration} · 发布于 {job.publishedAt} · {job.salary || "薪资面议"}</small></div><StatusBadge tone={job.status === "即将截止" ? "warning" : "success"}>{job.status}</StatusBadge></div>
            <div className="student-job-tags"><span>{job.jobCategory}</span><span>{job.degree || "学历不限"}</span><span>{job.industry || "行业不限"}</span></div>
            <div className="email-strip"><div><small>简历投递邮箱</small><a href={`mailto:${job.contactEmail}`}>{job.contactEmail}</a></div><button onClick={() => copy(job.contactEmail)}>复制邮箱</button><a className="primary-btn" href={mailHref(job)}>写邮件</a></div>
            <div className="job-card-actions"><FavoriteButton active={isFavorite(job)} onToggle={() => toggleFavorite(job)} /><button className="detail-link" onClick={() => onNavigate("opportunities", job.id, true)}>查看职责、要求与项目说明 →</button></div>
          </article>
        ))}
        {!shown.length ? <section className="opportunity-empty"><b>暂时没有匹配的机会</b><p>可以放宽薪资区间或清空部分分类条件后再查看。</p><button className="primary-btn" onClick={reset}>查看全部机会</button></section> : null}
      </div>
      <SidePanel open={Boolean(selected)} title={selected ? `${selected.company} · ${selected.title}` : "机会详情"} description={selected?.summary} onClose={() => onNavigate("opportunities", undefined, true)} footer={selected ? <div className="opportunity-panel-actions"><FavoriteButton active={isFavorite(selected)} onToggle={() => toggleFavorite(selected)} /><button onClick={() => copy(selected.contactEmail)}>复制邮箱</button><a className="primary-btn" href={mailHref(selected)}>发送简历邮件</a></div> : null}>
        {selected ? <div className="opportunity-detail-panel"><header><JobLogo job={selected} large /><div><a href={`/companies/${encodeURIComponent(selected.company)}`}>{selected.company}</a><h3>{selected.title}</h3><p>{selected.city} · {selected.mode} · {selected.duration} · {selected.salary || "薪资面议"}</p></div></header><section><h4>岗位职责</h4><ol>{selected.responsibilities.map((item) => <li key={item}>{item}</li>)}</ol></section><section><h4>能力要求</h4><ul>{selected.requirements.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h4>你将获得</h4><div className="benefits">{selected.benefits.map((item) => <span key={item}>✓ {item}</span>)}</div></section></div> : <p>机会不存在或已下线。</p>}
      </SidePanel>
    </>
  );
}
