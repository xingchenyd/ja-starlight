/* eslint-disable @next/next/no-img-element, @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useMemo, useState } from "react";
import { mergeCatalogRecords, type PublicCatalogRecord } from "../lib/catalog/public-catalog";
import { getPublicCatalog } from "../lib/catalog/client-catalog";
import { activities, contents, jobs, type Activity, type ContentItem, type Job } from "./data";

export default function HomeSections() {
  const [catalog, setCatalog] = useState<PublicCatalogRecord[]>([]);

  useEffect(() => {
    let active = true;
    getPublicCatalog()
      .then((records) => active && setCatalog(records))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const publicJobs = useMemo(
    () => mergeCatalogRecords<Job>(catalog, jobs, "job").slice(0, 3),
    [catalog],
  );
  const publicActivities = useMemo(
    () => mergeCatalogRecords<Activity>(catalog, activities, "activity").slice(0, 3),
    [catalog],
  );
  const publicContents = useMemo(
    () => mergeCatalogRecords<ContentItem>(catalog, contents, "content").slice(0, 3),
    [catalog],
  );

  return (
    <section className="home-live-sections" aria-labelledby="home-live-title">
      <section className="home-chapter home-opportunities">
      <div className="shell">
        <header className="home-live-intro home-reveal">
          <p className="eyebrow">EXPLORE STAR PLAN</p>
          <h2 id="home-live-title">现在，机会正在发生。</h2>
          <p>从真实岗位、线下活动和成长内容，找到你的下一步。</p>
        </header>
        <div className="home-section-head home-reveal" id="jobs">
          <div><small>01 / OPPORTUNITIES</small><h2>实习项目机会</h2></div>
          <a className="home-directory-link" href="/opportunities">查看全部 <span aria-hidden="true">↗</span></a>
        </div>
      <div className="home-job-list home-reveal" aria-label="最新实习项目机会">
        {!publicJobs.length && <p className="admin-empty">暂无公开机会，欢迎企业入驻发布。</p>}
        {publicJobs.map((job) => (
          <article key={job.id}>
            <div className="home-company-mark" style={{ background: job.logoUrl ? "white" : job.color }}>
              {job.logoUrl ? <img src={job.logoUrl} alt={`${job.company} logo`} /> : job.logo}
            </div>
            <div className="home-job-title">
              <a href={`/companies/${encodeURIComponent(job.company)}`}>{job.company}</a>
              <h3>{job.title}</h3>
            </div>
            <div className="home-job-info">
              <p>{job.summary}</p>
              <small>{[job.city, job.duration, job.publishedAt, job.salary || "薪资面议"].filter(Boolean).join(" · ")}</small>
            </div>
            <a className="home-job-detail" href={`/opportunities/${encodeURIComponent(job.id)}`} aria-label={`查看详情：${job.title}`}>查看详情 <span aria-hidden="true">↗</span></a>
          </article>
        ))}
      </div>
      </div>
      </section>

      <section className="home-chapter home-activities">
      <div className="shell">
      <div className="home-section-head home-reveal" id="events">
        <div><small>02 / ACTIVITIES</small><h2>成长活动</h2></div>
        <a className="home-directory-link" href="/activities">查看全部 <span aria-hidden="true">↗</span></a>
      </div>
      <div className="home-event-grid home-reveal" data-count={publicActivities.length} aria-label="最新成长活动">
        {!publicActivities.length && <p className="admin-empty">暂无公开活动，发布后将在这里展示。</p>}
        {publicActivities.map((activity) => (
          <a className="home-event-feature" href={`/activities/${encodeURIComponent(activity.id)}`} key={activity.id}>
            <img src={activity.cover} alt="" loading="lazy" decoding="async" />
            <div>
              <span>{activity.category}</span>
              <h3>{activity.title}</h3>
              <small>{activity.publisher || "星光计划"} · {activity.date}</small>
            </div>
            <i aria-hidden="true">↗</i>
          </a>
        ))}
      </div>
      </div>
      </section>

      <section className="home-chapter home-library">
      <div className="shell">
      <div className="home-section-head home-reveal" id="content">
        <div><small>03 / CONTENT LIBRARY</small><h2>成长内容</h2></div>
        <a className="home-directory-link" href="/content">查看全部 <span aria-hidden="true">↗</span></a>
      </div>
      <div className="home-library-grid home-reveal" aria-label="最新成长内容">
        {!publicContents.length && <p className="admin-empty">暂无公开成长内容。</p>}
        {publicContents.map((content) => (
          <a className="home-library-card" href={`/content/${encodeURIComponent(content.id)}`} key={content.id}>
            <div className="home-library-cover">
              <img src={content.cover} alt="" loading="lazy" decoding="async" />
              <span>{content.mediaType === "video" ? "视频" : "文章"}</span>
            </div>
            <div className="home-library-description">
              <h3>{content.title}</h3>
              <p>{content.summary}</p>
              <small>{content.duration} <i aria-hidden="true">↗</i></small>
            </div>
          </a>
        ))}
      </div>
      </div>
      </section>
    </section>
  );
}
