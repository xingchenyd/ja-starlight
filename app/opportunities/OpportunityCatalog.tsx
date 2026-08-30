/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useMemo, useState } from "react";
import { jobs, type Job } from "../data";
import { catalogFilterUrl, parseCatalogFilters } from "../../lib/catalog/catalog-url";

type RecordItem = { id: string; kind: string; payload: Record<string, unknown> };
const categories = [
  "全部类别",
  "产品运营",
  "技术研发",
  "数据分析",
  "品牌内容",
  "智能制造",
  "金融与商业",
  "项目实践",
  "公益实践",
];

function normalize(record: RecordItem): Job {
  const payload = record.payload;
  return {
    ...(payload as unknown as Job),
    id: record.id,
    company: String(payload.company || "未命名企业"),
    title: String(payload.title || "未命名机会"),
    summary: String(payload.summary || "暂未填写机会简介"),
    jobCategory: String(payload.jobCategory || "项目实践"),
    tags: Array.isArray(payload.tags) ? payload.tags.map(String) : [],
    city: String(payload.city || "长沙"),
    mode: String(payload.mode || "线下"),
    duration: String(payload.duration || "周期面议"),
    contactEmail: String(payload.contactEmail || ""),
    status: String(payload.status || "招募中"),
    logo: String(payload.logo || String(payload.company || "企").slice(0, 1)),
    color: String(payload.color || "#008b9c"),
    logoUrl: String(payload.logoUrl || ""),
    publishedAt: String(payload.publishedAt || ""),
    responsibilities: Array.isArray(payload.responsibilities) ? payload.responsibilities.map(String) : [],
    requirements: Array.isArray(payload.requirements) ? payload.requirements.map(String) : [],
    benefits: Array.isArray(payload.benefits) ? payload.benefits.map(String) : [],
  };
}

export default function OpportunityCatalog({ initialQuery, initialCategory }: { initialQuery: string; initialCategory: string }) {
  const [catalog, setCatalog] = useState<Job[]>([]),
    [query, setQuery] = useState(initialQuery),
    [appliedQuery, setAppliedQuery] = useState(initialQuery),
    [category, setCategory] = useState(categories.includes(initialCategory) ? initialCategory : "全部类别"),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetch("/api/catalog")
      .then((response) => response.json())
      .then((data) => {
        if (active)
          setCatalog((data.records || []).filter((record: RecordItem) => record.kind === "job").map(normalize));
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const restoreFromUrl = () => {
      const filters = parseCatalogFilters(window.location.search);
      const nextCategory = categories.includes(filters.category) ? filters.category : "全部类别";
      setQuery(filters.query);
      setAppliedQuery(filters.query);
      setCategory(nextCategory);
    };
    window.addEventListener("popstate", restoreFromUrl);
    return () => window.removeEventListener("popstate", restoreFromUrl);
  }, []);
  useEffect(() => {
    window.history.replaceState(
      window.history.state,
      "",
      catalogFilterUrl(window.location.pathname, {
        query: appliedQuery,
        category: category === "全部类别" ? "" : category,
      }),
    );
  }, [appliedQuery, category]);
  const list = useMemo(() => {
    const seen = new Set<string>();
    return [...catalog, ...jobs]
      .filter((job) => {
        const key = `${job.company}-${job.title}`;
        if (seen.has(key)) return false;
        seen.add(key);
        const text = `${job.title}${job.company}${job.jobCategory}${job.tags.join("")}`.toLowerCase();
        return (category === "全部类别" || job.jobCategory === category) && text.includes(appliedQuery.trim().toLowerCase());
      })
      .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
  }, [catalog, category, appliedQuery]);
  return (
    <>
      <section className="public-hero">
        <p className="eyebrow">OPPORTUNITIES</p>
        <h1>实习项目机会，<br /><em>按类别清晰查找。</em></h1>
        <form onSubmit={(event) => { event.preventDefault(); setAppliedQuery(query.trim()); }}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索企业、机会类别或技能" />
          <button type="submit">搜索</button>
        </form>
        <p>岗位由企业直接发布，学生通过岗位下方的招聘邮箱自行投递简历。</p>
      </section>
      <section className="public-list">
        <nav className="public-category-nav" aria-label="机会类别">
          {categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
        </nav>
        <div className="public-filter"><b>{list.length} 个开放机会</b><span>{loading ? "正在同步最新发布" : "已同步公开目录"}</span></div>
        <div className="public-opportunities">
          {list.map((job) => (
            <article key={job.id}>
              <div className="public-company-logo" style={{ background: job.logoUrl ? "white" : job.color }}>
                {job.logoUrl ? <img src={job.logoUrl} alt={`${job.company} logo`} /> : job.logo}
              </div>
              <div>
                <span className={job.status === "即将截止" ? "status warn" : "status"}>{job.jobCategory}</span>
                <h2><a href={`/companies/${encodeURIComponent(job.company)}`}>{job.company}</a></h2><h3>{job.title}</h3><p>{job.summary}</p>
                <small>{job.city || "长沙"} · {job.mode} · {job.duration}</small>
                <div className="chips">{job.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                <div className="public-email"><span>简历邮箱</span><a href={`mailto:${job.contactEmail}`}>{job.contactEmail}</a></div>
              </div>
              <a className="primary-btn" href={`/opportunities/${encodeURIComponent(job.id)}`}>机会详情</a>
            </article>
          ))}
        </div>
        {!loading && list.length === 0 && <div className="admin-empty"><b>暂无匹配机会</b><p>请清空关键词或切换机会类别。</p></div>}
      </section>
    </>
  );
}
