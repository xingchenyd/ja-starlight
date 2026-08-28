"use client";
import { useEffect, useState } from "react";
import { activities, contents, jobs } from "./data";

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
    fetch("/api/catalog")
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        const records = Array.isArray(data.records) ? data.records : [];
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
