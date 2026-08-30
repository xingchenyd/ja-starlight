/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { mergeCatalogRecords, type PublicCatalogRecord } from "../../lib/catalog/public-catalog";
import { activities, type Activity } from "../data";

const categories = ["全部活动", "企业参访", "职业体验", "主题工作坊", "赛事路演", "志愿公益", "校园活动"];

export default function ActivityCatalog() {
  const [catalog, setCatalog] = useState<PublicCatalogRecord[]>([]);
  const [category, setCategory] = useState("全部活动");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/catalog?pageSize=100")
      .then((response) => response.json())
      .then((data) => active && setCatalog(data.records || []))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const shown = useMemo(() => {
    const all = mergeCatalogRecords<Activity>(catalog, activities, "activity");
    const needle = query.trim().toLowerCase();
    return all.filter((activity) =>
      (category === "全部活动" || activity.category === category) &&
      `${activity.title}${activity.summary}${activity.publisher || ""}`.toLowerCase().includes(needle),
    );
  }, [catalog, category, query]);

  return (
    <>
      <section className="public-hero activity-directory-hero">
        <p className="eyebrow">GROWTH ACTIVITIES</p>
        <h1>走进真实现场，<br /><em>让经历成为成长。</em></h1>
        <p>浏览由 JA 与企业发布并通过审核的成长活动。</p>
        <label className="public-directory-search">
          <span>搜索活动</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="活动名称、发布方或关键词" />
        </label>
      </section>
      <section className="public-list activity-directory">
        <nav className="topic-tabs public-topic-buttons" aria-label="成长活动分类">
          {categories.map((item) => (
            <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </nav>
        <div className="public-filter"><b>{shown.length} 场成长活动</b><span>{loading ? "正在同步最新发布" : "已同步公开目录"}</span></div>
        <div className="activity-directory-list">
          {shown.map((activity) => (
            <article key={activity.id}>
              <img src={activity.cover} alt={activity.title} loading="lazy" />
              <div><small>{activity.publisher || "JA China"} · {activity.category}</small><h2>{activity.title}</h2><p>{activity.summary}</p><span>{activity.date} · {activity.place}</span></div>
              <a href={`/activities/${encodeURIComponent(activity.id)}`}>查看活动 →</a>
            </article>
          ))}
        </div>
        {!loading && shown.length === 0 ? <div className="admin-empty"><b>暂无匹配活动</b><p>请清空关键词或切换活动分类。</p></div> : null}
      </section>
    </>
  );
}
