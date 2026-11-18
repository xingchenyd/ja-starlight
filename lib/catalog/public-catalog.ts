import type { Job } from "../../app/data";

export type PublicCatalogRecord = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
};

// Database payloads may predate optional form fields. Normalize at the shared
// read boundary so one incomplete record cannot break the student's workspace.
export function normalizePublicJob(record: PublicCatalogRecord): Job {
  const p = record.payload;
  const text = (value: unknown, fallback = "") => typeof value === "string" && value.trim() ? value : fallback;
  const list = (value: unknown): string[] => Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : typeof value === "string" ? value.split(/\r?\n/).map(item => item.trim()).filter(Boolean) : [];
  return {
    ...p, id: record.id,
    title: text(p.title, "未命名机会"), company: text(p.company, "未命名企业"),
    summary: text(p.summary, "暂未填写机会简介"), jobCategory: text(p.jobCategory, "项目实践"),
    city: text(p.city, "长沙"), mode: text(p.mode, "线下"), duration: text(p.duration, "周期面议"),
    tags: list(p.tags), responsibilities: list(p.responsibilities), requirements: list(p.requirements), benefits: list(p.benefits),
    status: text(p.status, "招募中"), contactEmail: text(p.contactEmail),
    logo: text(p.logo, text(p.company, "企业").slice(0, 2)), logoUrl: text(p.logoUrl), color: text(p.color, "#008b9c"),
    publishedAt: text(p.publishedAt), degree: text(p.degree), industry: text(p.industry), salary: text(p.salary, "薪资面议"),
  };
}

function timeOf(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function isPublicNow(
  payload: Record<string, unknown>,
  now = new Date(),
) {
  const reviewStatus = String(payload.reviewStatus || "approved");
  const state = String(payload.publicationStatus || payload.status || "").toLowerCase();
  if (reviewStatus !== "approved") return false;
  if (["offline", "archived", "removed", "已下线"].includes(state)) return false;

  const startsAt = timeOf(
    payload.publishAt || payload.publicAt || payload.scheduledAt,
  );
  const endsAt = timeOf(payload.offlineAt || payload.unpublishAt);
  const current = now.getTime();
  return (startsAt === null || startsAt <= current) &&
    (endsAt === null || endsAt > current);
}

export function sortPublicRecords<T extends PublicCatalogRecord>(records: T[]) {
  return [...records].sort((a, b) => {
    const order = (Number(a.payload.sortOrder) > 0 ? Number(a.payload.sortOrder) : Number.MAX_SAFE_INTEGER) - (Number(b.payload.sortOrder) > 0 ? Number(b.payload.sortOrder) : Number.MAX_SAFE_INTEGER);
    if (order) return order;
    return String(b.payload.publishedAt || b.payload.publishAt || b.payload.date || "")
      .localeCompare(String(a.payload.publishedAt || a.payload.publishAt || a.payload.date || ""));
  });
}

export function mergeCatalogRecords<T extends { id: string }>(
  live: PublicCatalogRecord[],
  _fallback: T[],
  kind: string,
  now = new Date(),
) {
  const candidates = sortPublicRecords(
    live.filter((record) => record.kind === kind && isPublicNow(record.payload, now)),
  ).map((record) => (kind === "job" ? normalizePublicJob(record) : { ...record.payload, id: record.id }) as T);
  if (!candidates.length) return [];

  const seen = new Set<string>();
  return candidates.filter((item) => {
    const value = item as T & Record<string, unknown>;
    const key = `${String(value.company || value.publisher || "").trim().toLowerCase()}::${String(value.title || item.id).trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
