"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Job } from "../../data";
import JobDetailView from "./JobDetailView";

type CatalogRecord = { id: string; kind: string; payload: Record<string, unknown> };
function textList(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}
function normalize(record: CatalogRecord): Job {
  const payload = record.payload;
  return {
    id: record.id,
    title: String(payload.title || "未命名机会"), company: String(payload.company || "未命名企业"),
    city: String(payload.city || "长沙"), mode: String(payload.mode || "线下"), duration: String(payload.duration || "周期面议"),
    tags: textList(payload.tags), jobCategory: String(payload.jobCategory || "项目实践"), status: String(payload.status || "招募中"),
    logo: String(payload.logo || String(payload.company || "企").slice(0, 2)), logoUrl: String(payload.logoUrl || ""), color: String(payload.color || "#008b9c"),
    summary: String(payload.summary || "暂未填写机会简介"), contactEmail: String(payload.contactEmail || ""),
    responsibilities: textList(payload.responsibilities), requirements: textList(payload.requirements), benefits: textList(payload.benefits),
    publishedAt: String(payload.publishedAt || ""), degree: String(payload.degree || ""), salary: String(payload.salary || "薪资面议"),
    salaryMin: Number(payload.salaryMin || 0), salaryMax: Number(payload.salaryMax || 0), industry: String(payload.industry || ""),
  };
}

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
