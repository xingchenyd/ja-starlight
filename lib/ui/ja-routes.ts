export const JA_TABS = [
  "pulse",
  "review",
  "registrations",
  "organizations",
  "publish",
  "records",
  "feedback",
  "integrity",
  "audit",
  "keys",
] as const;

export type JATab = (typeof JA_TABS)[number];

export function normalizeJATab(tab: unknown): JATab {
  return typeof tab === "string" && (JA_TABS as readonly string[]).includes(tab)
    ? (tab as JATab)
    : "pulse";
}

export function jaConsolePath(tab: unknown = "pulse") {
  return `/ja-console/${normalizeJATab(tab)}`;
}

export function jaConsoleLocation(pathname: string) {
  const match = pathname.match(/^\/ja-console\/([^/?#]+)/);
  return normalizeJATab(match?.[1]);
}
