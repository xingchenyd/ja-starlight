/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useState } from "react";
import { activities, contents, jobs } from "./data";
import { getPublicCatalog } from "../lib/catalog/client-catalog";

type Counts = { jobs: number; activities: number; contents: number };
const fallback: Counts = {
  jobs: jobs.length,
  activities: activities.length,
  contents: contents.length,
};

function usePublicCounts() {
  const [counts, setCounts] = useState(fallback);
  useEffect(() => {
    let active = true;
    getPublicCatalog()
      .then((records) => {
        if (!active) return;
        const uniqueCount = (
          kind: string,
          staticItems: Array<{ title: string; company?: string; publisher?: string }>,
        ) => {
          const keys = new Set(
            staticItems.map((item) =>
              `${item.company || item.publisher || ""}-${item.title}`.toLowerCase(),
            ),
          );
          records
            .filter((record: { kind?: string }) => record.kind === kind)
            .forEach((record: { payload?: Record<string, unknown> }) => {
              const payload = record.payload || {};
              keys.add(
                `${String(payload.company || payload.publisher || "")}-${String(payload.title || "")}`.toLowerCase(),
              );
            });
          return keys.size;
        };
        setCounts({
          jobs: uniqueCount("job", jobs),
          activities: uniqueCount("activity", activities),
          contents: uniqueCount("content", contents),
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return counts;
}

export function HomeTrustMetrics() {
  const counts = usePublicCounts();
  return (
    <div className="trust" aria-label="平台当前公开内容数量">
      <b>{counts.jobs}</b> 个公开机会 <i />
      <b>{counts.activities}</b> 场成长活动 <i />
      <b>{counts.contents}</b> 条成长内容
    </div>
  );
}

export function HomeOpportunityCount() {
  const counts = usePublicCounts();
  return (
    <div className="float-note">
      <span>当前公开</span>
      <b>{counts.jobs} 个机会</b>
    </div>
  );
}

export function HomeImpactMetrics() {
  const counts = usePublicCounts();
  return (
    <section className="home-impact" aria-label="星光计划实时公开数据与合作伙伴">
      <div className="shell home-impact-grid">
        <div className="home-impact-copy">
          <small>LIVE IMPACT · HUNAN</small>
          <h2>真实机会，持续发生。</h2>
          <p>平台数据随企业与星光计划审核发布实时更新。</p>
        </div>
        <dl>
          <div><dt>{counts.jobs}</dt><dd>公开机会</dd></div>
          <div><dt>{counts.activities}</dt><dd>成长活动</dd></div>
          <div><dt>{counts.contents}</dt><dd>成长内容</dd></div>
        </dl>
        <div className="home-partners" aria-label="平台示例合作企业">
          <span>与青年共同成长</span>
          <div>
            <img src="/media/logos/lenovo.svg" alt="Lenovo" />
            <img src="/media/logos/intel.svg" alt="Intel" />
            <img src="/media/logos/dell.svg" alt="Dell Technologies" />
            <img src="/media/logos/schneider.svg" alt="Schneider Electric" />
          </div>
        </div>
      </div>
    </section>
  );
}
