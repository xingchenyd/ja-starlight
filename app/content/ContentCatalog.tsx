/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useMemo, useState } from "react";
import { contents, type ContentItem } from "../data";
import { catalogFilterUrl, parseCatalogFilters } from "../../lib/catalog/catalog-url";

type RecordItem = { id: string; kind: string; payload: Record<string, unknown> };
const categories = ["全部内容", "技能成长", "活动分享", "企业曝光", "职业探索", "简历面试", "公益实践"];

function normalize(record: RecordItem): ContentItem {
  const payload = record.payload;
  return {
    ...(payload as unknown as ContentItem),
    id: record.id,
    title: String(payload.title || "未命名内容"),
    summary: String(payload.summary || "暂未填写内容简介"),
    cover: String(payload.cover || "/media/ja-official-forum.jpg"),
    coverType: String(payload.coverType || "image") as ContentItem["coverType"],
    mediaType: String(payload.mediaType || "article") as ContentItem["mediaType"],
    category: String(payload.category || "职业探索"),
    duration: String(payload.duration || "预计 10 分钟"),
    level: String(payload.level || "通用"),
    publisher: String(payload.publisher || payload.company || "JA China"),
    tags: Array.isArray(payload.tags) ? payload.tags.map(String) : [],
    bodyBlocks: Array.isArray(payload.bodyBlocks) ? payload.bodyBlocks as ContentItem["bodyBlocks"] : [],
  };
}

export default function ContentCatalog({ initialQuery, initialCategory }: { initialQuery: string; initialCategory: string }) {
  const [catalog, setCatalog] = useState<ContentItem[]>([]),
    [category, setCategory] = useState(categories.includes(initialCategory) ? initialCategory : "全部内容"),
    [query, setQuery] = useState(initialQuery),
    [appliedQuery, setAppliedQuery] = useState(initialQuery),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetch("/api/catalog")
      .then((response) => response.json())
      .then((data) => {
        if (active)
          setCatalog((data.records || []).filter((record: RecordItem) => record.kind === "content").map(normalize));
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
      setQuery(filters.query);
      setAppliedQuery(filters.query);
      setCategory(categories.includes(filters.category) ? filters.category : "全部内容");
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
        category: category === "全部内容" ? "" : category,
      }),
    );
  }, [appliedQuery, category]);
  const shown = useMemo(() => {
    const seen = new Set<string>();
    return [...catalog, ...contents].filter((content) => {
      const key = `${content.publisher}-${content.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      const text = `${content.title}${content.summary}${content.publisher}${content.tags.join("")}`.toLowerCase();
      return (category === "全部内容" || content.category === category) && text.includes(appliedQuery.trim().toLowerCase());
    });
  }, [catalog, category, appliedQuery]);
  return (
    <>
      <section className="public-hero content-hero">
        <p className="eyebrow">LEARNING CENTER</p>
        <h1>把未知，变成<br /><em>可以行动的下一步。</em></h1>
        <p>由 JA 与企业发布的文章、视频和活动复盘，审核通过后统一进入公开目录。</p>
        <form onSubmit={(event) => { event.preventDefault(); setAppliedQuery(query.trim()); }}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索主题、发布方或能力关键词" />
          <button type="submit">搜索</button>
        </form>
      </section>
      <section className="public-list visual-content-list">
        <nav className="topic-tabs public-topic-buttons" aria-label="成长内容分类">
          {categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
        </nav>
        <div className="public-filter"><b>{shown.length} 条成长内容</b><span>{loading ? "正在同步最新发布" : "已同步公开目录"}</span></div>
        <div className="public-media-grid">
          {shown.map((content) => (
            <article key={content.id}>
              <div className="public-media-cover">
                {content.coverType === "video" ? <video src={content.cover} muted playsInline /> : <img src={content.cover} alt={content.title} />}
                <span>{content.mediaType === "video" ? "▶ 视频" : "▤ 图文"}</span>
              </div>
              <small>{content.publisher || "JA China"} · {content.category} · {content.duration}</small>
              <h2>{content.title}</h2><p>{content.summary}</p>
              <a href={`/content/${encodeURIComponent(content.id)}`}>打开内容 →</a>
            </article>
          ))}
        </div>
        {!loading && shown.length === 0 && <div className="admin-empty"><b>暂无匹配内容</b><p>请清空关键词或切换内容分类。</p></div>}
      </section>
    </>
  );
}
