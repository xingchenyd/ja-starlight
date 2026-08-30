export type PublicCatalogRecord = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
};

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
    const featured = Number(Boolean(b.payload.featured)) - Number(Boolean(a.payload.featured));
    if (featured) return featured;
    const order = Number(b.payload.sortOrder || 0) - Number(a.payload.sortOrder || 0);
    if (order) return order;
    return String(b.payload.publishedAt || b.payload.publishAt || b.payload.date || "")
      .localeCompare(String(a.payload.publishedAt || a.payload.publishAt || a.payload.date || ""));
  });
}

export function mergeCatalogRecords<T extends { id: string }>(
  live: PublicCatalogRecord[],
  fallback: T[],
  kind: string,
  now = new Date(),
) {
  const candidates = sortPublicRecords(
    live.filter((record) => record.kind === kind && isPublicNow(record.payload, now)),
  ).map((record) => ({ ...record.payload, id: record.id }) as T);
  if (!candidates.length) return fallback;

  const seen = new Set<string>();
  return candidates.filter((item) => {
    const value = item as T & Record<string, unknown>;
    const key = `${String(value.company || value.publisher || "").trim().toLowerCase()}::${String(value.title || item.id).trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
