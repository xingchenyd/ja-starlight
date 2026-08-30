export const favoriteTypes = ["job", "activity", "content"] as const;
export type FavoriteType = (typeof favoriteTypes)[number];

export function normalizeFavoriteType(value: unknown): FavoriteType | null {
  return favoriteTypes.includes(value as FavoriteType) ? (value as FavoriteType) : null;
}

export function cleanIdentifier(value: unknown, max = 120): string {
  const text = String(value || "").trim();
  return text && text.length <= max && /^[\p{L}\p{N}_.:-]+$/u.test(text) ? text : "";
}

export function cleanSnapshot(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "{}";
  const allowed = ["title", "summary", "cover", "company", "publisher", "status"];
  const snapshot = Object.fromEntries(
    allowed.flatMap((key) => {
      const item = (value as Record<string, unknown>)[key];
      return item == null ? [] : [[key, String(item).trim().slice(0, 500)]];
    }),
  );
  return JSON.stringify(snapshot).slice(0, 4000);
}

export function normalizeDateTime(value: unknown): string | null {
  const text = String(value || "").trim();
  if (!text) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? `${text}T09:00:00+08:00`
    : text;
  const time = new Date(normalized).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export function reminderBefore(startAt: unknown, hours = 24): string | null {
  const normalized = normalizeDateTime(startAt);
  if (!normalized) return null;
  const safeHours = Math.max(0, Math.min(168, Number(hours) || 0));
  return new Date(new Date(normalized).getTime() - safeHours * 60 * 60 * 1000).toISOString();
}

export function cleanExperience(input: Record<string, unknown>) {
  const occurredAt = normalizeDateTime(input.occurredAt);
  const title = String(input.title || "").trim().slice(0, 160);
  if (!occurredAt || !title) throw new Error("请填写有效日期和经历标题");
  return {
    category: String(input.category || "其他经历").trim().slice(0, 40),
    title,
    role: String(input.role || "").trim().slice(0, 100),
    description: String(input.description || "").trim().slice(0, 2000),
    output: String(input.output || "").trim().slice(0, 1000),
    evidenceUrl: /^https?:\/\//.test(String(input.evidenceUrl || ""))
      ? String(input.evidenceUrl).slice(0, 500)
      : "",
    evidenceAssetKey: String(input.evidenceAssetKey || "").trim().slice(0, 500),
    occurredAt,
    isPublic: input.isPublic === false ? 0 : 1,
  };
}
