/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import type { ContentItem } from "../../data";
import FavoriteButton from "../../components/catalog/FavoriteButton";
import ContentReader from "./ContentReader";
import type { StudentFavorite } from "./useStudentData";

const categories = ["全部内容", "技能成长", "活动分享", "企业曝光", "职业探索", "简历面试", "公益实践"];

function initialCategory() {
  if (typeof window === "undefined") return "全部内容";
  const value = new URLSearchParams(window.location.search).get("category") || "全部内容";
  return categories.includes(value) ? value : "全部内容";
}

export default function LearningCenter({ items, initialItem, favorites, onNavigate, onToggleFavorite, flash }: {
  items: ContentItem[];
  initialItem?: string;
  favorites: StudentFavorite[];
  onNavigate: (tab: string, itemId?: string, preserveSearch?: boolean) => void;
  onToggleFavorite: (targetType: "content", targetId: string, snapshot: Record<string, unknown>) => Promise<boolean>;
  flash: (message: string) => void;
}) {
  const [category, setCategory] = useState(initialCategory);
  const list = useMemo(() => [...items].filter((item) => (item as ContentItem & { status?: string }).status !== "已下线").sort((a, b) => Number(b.sortOrder || 0) - Number(a.sortOrder || 0)), [items]);
  const selected = list.find((item) => item.id === initialItem) || null;
  const shown = list.filter((item) => category === "全部内容" || item.category === category);

  useEffect(() => {
    const onPopState = () => setCategory(initialCategory());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (category === "全部内容") params.delete("category"); else params.set("category", category);
    const search = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
  }, [category]);

  const open = (item: ContentItem) => onNavigate("content", item.id, true);
  const close = () => onNavigate("content", undefined, true);
  const favorite = async (item: ContentItem) => {
    try { await onToggleFavorite("content", item.id, { title: item.title, publisher: item.publisher || "星光计划", cover: item.cover, duration: item.duration }); }
    catch (error) { flash(error instanceof Error ? error.message : "收藏失败"); }
  };
  const isFavorite = (item: ContentItem) => favorites.some((favoriteItem) => favoriteItem.targetType === "content" && favoriteItem.targetId === item.id && favoriteItem.status !== "removed");

  return <>
    <header className="student-section-heading"><div><small>CONTENTS</small><h1>成长内容</h1></div><span className="content-result-count">{shown.length} 条内容</span></header>
    <nav className="refined-content-categories" aria-label="成长内容分类">{categories.map((name) => <button key={name} className={category === name ? "active" : ""} onClick={() => setCategory(name)}>{name}</button>)}</nav>
    <div className="refined-learning-grid">
      {shown.map((item) => <article key={item.id}>
        <button className="learning-card-cover" onClick={() => open(item)}>{item.coverType === "video" ? <video src={item.cover} muted playsInline /> : <img src={item.cover} alt={item.title} />}<span>{item.mediaType === "video" ? "▶ 视频" : "图文"}</span></button>
        <div className="learning-card-body"><small>{item.publisher || "星光计划"} · {item.category}</small><h2><button onClick={() => open(item)}>{item.title}</button></h2><p>{item.summary}</p><footer><span>{item.duration}</span><span>{item.level}</span>{item.tags?.slice(0, 2).map((tag) => <i key={tag}>{tag}</i>)}</footer></div>
        <div className="learning-card-actions"><FavoriteButton active={isFavorite(item)} onToggle={() => favorite(item)} /><button className="outline-btn" onClick={() => open(item)}>开始阅读</button></div>
      </article>)}
    </div>
    {!shown.length ? <section className="activity-empty-state"><h2>该分类暂无内容</h2><button className="outline-btn" onClick={() => setCategory("全部内容")}>查看全部内容</button></section> : null}
    <ContentReader key={selected?.id || "closed"} item={selected} open={Boolean(selected)} onClose={close} flash={flash} />
  </>;
}
