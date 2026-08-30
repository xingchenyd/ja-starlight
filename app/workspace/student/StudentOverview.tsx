/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { workspacePath } from "../../../lib/ui/workspace-routes";
import type { Activity, ContentItem, Job } from "../../data";
import FavoritesPanel from "./FavoritesPanel";
import type { StudentFavorite, StudentPrivateData } from "./useStudentData";

type ProfileRecord = { payload: Record<string, unknown> };

function DeepLink({
  tab,
  itemId,
  onNavigate,
  className,
  children,
}: {
  tab: string;
  itemId?: string;
  onNavigate: (tab: string, itemId?: string) => void;
  className?: string;
  children: ReactNode;
}) {
  const href = workspacePath("student", tab, itemId);
  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(tab, itemId);
  };
  return <a href={href} className={className} onClick={open}>{children}</a>;
}

function JobLogo({ job }: { job: Job }) {
  return (
    <span className="real-logo" style={{ background: job.logoUrl ? "white" : job.color }}>
      {job.logoUrl ? <img src={job.logoUrl} alt={`${job.company} logo`} /> : job.logo}
    </span>
  );
}

function legacyTimeline(profile?: ProfileRecord) {
  return String(profile?.payload.timelineItems || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [date, type, title, action, output] = line.split("｜");
      return {
        id: `legacy-${index}`,
        occurredAt: date || "",
        category: type || "个人经历",
        title: title || "未命名经历",
        description: action || "",
        output: output || "待补充成果",
        certified: type?.includes("JA认证") || false,
      };
    });
}

export default function StudentOverview({
  onNavigate,
  allJobs,
  allActivities,
  allContents,
  profile,
  privateData,
  privateLoading,
  privateError,
  onReload,
  onRemoveFavorite,
}: {
  onNavigate: (tab: string, itemId?: string) => void;
  allJobs: Job[];
  allActivities: Activity[];
  allContents: ContentItem[];
  profile?: ProfileRecord;
  privateData: StudentPrivateData;
  privateLoading: boolean;
  privateError: string;
  onReload: () => void;
  onRemoveFavorite: (favorite: StudentFavorite) => Promise<void>;
}) {
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");
  const sortedJobs = useMemo(
    () => [...allJobs].sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || ""))),
    [allJobs],
  );
  const sortedActivities = useMemo(
    () => [...allActivities].sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))),
    [allActivities],
  );
  const sortedContents = useMemo(
    () => [...allContents].sort((a, b) => Number((b as ContentItem & { sortOrder?: number }).sortOrder || 0) - Number((a as ContentItem & { sortOrder?: number }).sortOrder || 0)),
    [allContents],
  );
  const timeline = useMemo(() => {
    const structured = privateData.experiences.map((item) => ({
      id: item.id,
      occurredAt: item.occurredAt,
      category: item.category,
      title: item.title,
      description: item.description,
      output: item.output,
      certified: item.certified,
    }));
    return [...structured, ...legacyTimeline(profile)]
      .sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))
      .slice(0, 3);
  }, [privateData.experiences, profile]);
  const activeFavorites = privateData.favorites.filter((item) => item.status !== "removed");

  const removeFavorite = async (favorite: StudentFavorite) => {
    setFavoriteError("");
    try { await onRemoveFavorite(favorite); }
    catch (error) { setFavoriteError(error instanceof Error ? error.message : "取消收藏失败"); }
  };

  return (
    <>
      <div className="page-title" data-page-heading tabIndex={-1}>
        <div><small>OVERVIEW</small><h1>总览</h1></div>
        <button className="outline-btn favorites-entry" onClick={() => setFavoritesOpen(true)}>
          我的收藏 <span>{activeFavorites.length}</span>
        </button>
      </div>
      {privateError ? (
        <div className="student-data-error" role="status">
          <span>个人收藏与时间轴暂未同步，其他内容仍可继续浏览。</span>
          <button onClick={onReload}>重新加载</button>
        </div>
      ) : null}
      <section className="student-overview-grid student-overview-stagger">
        <article className="overview-panel large">
          <div className="panel-head"><div><small>OPPORTUNITIES</small><h2>最新实习项目机会</h2></div><DeepLink tab="opportunities" onNavigate={onNavigate}>查看全部 →</DeepLink></div>
          <div className="overview-job-stack">
            {sortedJobs.slice(0, 5).map((job) => (
              <DeepLink key={job.id} tab="opportunities" itemId={job.id} onNavigate={onNavigate}>
                <JobLogo job={job} />
                <span><b>{job.company}</b><strong>{job.title}</strong><em>{job.city} · {job.duration} · {job.salary || "薪资面议"}</em></span>
                <i>{job.jobCategory}</i>
              </DeepLink>
            ))}
          </div>
        </article>
        <article className="overview-panel">
          <div className="panel-head"><div><small>ACTIVITIES</small><h2>成长活动</h2></div><DeepLink tab="activities" onNavigate={onNavigate}>查看全部 →</DeepLink></div>
          {sortedActivities.slice(0, 3).map((activity) => (
            <DeepLink className="overview-media-line" key={activity.id} tab="activities" itemId={activity.id} onNavigate={onNavigate}>
              <img src={activity.cover} alt={activity.title} loading="lazy" />
              <span><b>{activity.title}</b><em>{activity.publisher || "JA China"} · {activity.date}</em></span>
            </DeepLink>
          ))}
        </article>
        <article className="overview-panel">
          <div className="panel-head"><div><small>CONTENTS</small><h2>成长内容</h2></div><DeepLink tab="content" onNavigate={onNavigate}>查看全部 →</DeepLink></div>
          {sortedContents.slice(0, 3).map((content) => (
            <DeepLink className="overview-media-line" key={content.id} tab="content" itemId={content.id} onNavigate={onNavigate}>
              <img src={content.cover} alt={content.title} loading="lazy" />
              <span><b>{content.title}</b><em>{content.publisher || "JA China"} · {content.duration}</em></span>
            </DeepLink>
          ))}
        </article>
        <article className="overview-panel growth-timeline-preview">
          <div className="panel-head"><div><small>GROWTH TIMELINE</small><h2>成长时间轴</h2></div><DeepLink tab="profile" onNavigate={onNavigate}>查看完整时间轴 →</DeepLink></div>
          {privateLoading ? (
            <div className="student-overview-skeleton" aria-label="正在加载成长时间轴"><i /><i /><i /></div>
          ) : timeline.length ? (
            <div>{timeline.map((item) => (
              <DeepLink key={item.id} tab="profile" itemId={item.id} onNavigate={onNavigate}>
                <time>{item.occurredAt ? new Date(item.occurredAt).toLocaleDateString("zh-CN") : "待补充"}</time>
                <span><b>{item.title}</b>{item.certified ? <strong className="ja-certified-label">JA 认证</strong> : null}<em>{item.output || item.description || "待补充成果"}</em></span>
              </DeepLink>
            ))}</div>
          ) : (
            <DeepLink className="timeline-preview-empty" tab="profile" onNavigate={onNavigate}><span><b>开始建立成长时间轴</b><em>参加活动或手动添加经历后，会在这里形成真实记录。</em></span></DeepLink>
          )}
        </article>
      </section>
      {favoriteError ? <p className="form-error" role="alert">{favoriteError}</p> : null}
      <FavoritesPanel
        open={favoritesOpen}
        favorites={privateData.favorites}
        onClose={() => setFavoritesOpen(false)}
        onOpen={(tab, itemId) => { setFavoritesOpen(false); onNavigate(tab, itemId); }}
        onRemove={removeFavorite}
      />
    </>
  );
}
