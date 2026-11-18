"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { normalizePublicJob as normalize } from "../../../lib/catalog/public-catalog";
import type { Job } from "../../data";
import JobDetailView from "./JobDetailView";

type CatalogRecord = { id: string; kind: string; payload: Record<string, unknown> };

export default function DynamicJobDetail({ id }: { id: string }) {
  const [job, setJob] = useState<Job | null>(null), [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetch(`/api/catalog?id=${encodeURIComponent(id)}`).then((response) => response.json()).then((data) => {
      if (!active) return;
      const record = data.record as CatalogRecord | undefined;
      setJob(record?.kind === "job" ? normalize(record) : null);
    }).catch(() => {}).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);
  if (loading) return <main className="detail-page detail-loading"><Link href="/opportunities">← 返回机会列表</Link><h1>正在读取机会详情…</h1></main>;
  if (!job) return <main className="detail-page detail-loading"><Link href="/opportunities">← 返回机会列表</Link><h1>机会不存在或已下线</h1><p>该机会可能尚未通过审核，或已由发布方撤回。</p></main>;
  return <JobDetailView job={job} />;
}
