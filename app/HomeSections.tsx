/* eslint-disable @next/next/no-img-element, @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useMemo, useState } from "react";
import { mergeCatalogRecords, type PublicCatalogRecord } from "../lib/catalog/public-catalog";
import { activities, contents, jobs, type Activity, type ContentItem, type Job } from "./data";

export default function HomeSections() {
  const [catalog, setCatalog] = useState<PublicCatalogRecord[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/catalog?pageSize=100")
      .then((response) => response.json())
      .then((data) => active && setCatalog(data.records || []))
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
    <section className="home-sections shell">
      <div className="home-section-head" id="jobs">
        <div><small>OPPORTUNITIES</small><h2>实习项目机会</h2></div>
        <a href="/opportunities">查看全部 →</a>
      </div>
      <div className="home-job-list">
        {publicJobs.map((job) => (
          <article key={job.id}>
            <div className="home-company-mark" style={{ background: job.logoUrl ? "white" : job.color }}>
              {job.logoUrl ? <img src={job.logoUrl} alt={`${job.company} logo`} /> : job.logo}
            </div>
            <div>
              <h3><a href={`/companies/${encodeURIComponent(job.company)}`}>{job.company}</a></h3>
              <h4>{job.title}</h4>
              <p>{job.summary}</p>
              <small>{job.city} · {job.duration} · {job.publishedAt} · {job.salary || "薪资面议"}</small>
            </div>
            <a href={`/opportunities/${encodeURIComponent(job.id)}`}>查看详情</a>
          </article>
        ))}
      </div>

      <div className="home-section-head" id="events">
        <div><small>ACTIVITIES</small><h2>成长活动</h2></div>
        <a href="/activities">查看全部 →</a>
      </div>
      <div className="home-card-row">
        {publicActivities.map((activity) => (
          <a href={`/activities/${encodeURIComponent(activity.id)}`} key={activity.id}>
            <img src={activity.cover} alt={activity.title} loading="lazy" />
            <span>{activity.category}</span>
            <h3>{activity.title}</h3>
            <small>{activity.publisher || "JA China"} · {activity.date}</small>
          </a>
        ))}
      </div>

      <div className="home-section-head" id="content">
        <div><small>CONTENTS</small><h2>成长内容</h2></div>
        <a href="/content">查看全部 →</a>
      </div>
      <div className="home-card-row content-row">
        {publicContents.map((content) => (
          <a href={`/content/${encodeURIComponent(content.id)}`} key={content.id}>
            <img src={content.cover} alt={content.title} loading="lazy" />
            <span>{content.mediaType === "video" ? "视频" : "文章"}</span>
            <h3>{content.title}</h3>
            <p>{content.summary}</p>
            <small>{content.duration}</small>
          </a>
        ))}
      </div>
    </section>
  );
}
