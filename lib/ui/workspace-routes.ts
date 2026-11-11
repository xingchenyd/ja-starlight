export const WORKSPACE_TABS = {
  student: ["overview", "opportunities", "activities", "content", "profile"],
  enterprise: ["overview", "positions", "activities", "content", "feedback", "registrations", "profile"],
} as const;

export type WorkspaceRole = keyof typeof WORKSPACE_TABS;
export type WorkspaceRoute = { role: WorkspaceRole; tab: string };

export function normalizeWorkspaceRoute(role: unknown, tab: unknown): WorkspaceRoute {
  const safeRole: WorkspaceRole = role === "enterprise" ? "enterprise" : "student";
  const candidate = typeof tab === "string" ? tab : "overview";
  const allowed = WORKSPACE_TABS[safeRole] as readonly string[];
  return { role: safeRole, tab: allowed.includes(candidate) ? candidate : "overview" };
}

export function workspacePath(role: unknown, tab: unknown = "overview", item?: unknown) {
  const route = normalizeWorkspaceRoute(role, tab);
  const query = typeof item === "string" && item ? `?item=${encodeURIComponent(item)}` : "";
  return `/workspace/${route.role}/${route.tab}${query}`;
}

export function legacyWorkspacePath(input: { role?: unknown; tab?: unknown; item?: unknown }) {
  return workspacePath(input.role, input.tab, input.item);
}

export function workspaceLoginReturnPath(role: WorkspaceRole, value: string | null) {
  const fallback = workspacePath(role);
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, "https://workspace.invalid");
    if (url.origin !== "https://workspace.invalid") return fallback;
    if (role === "student" && url.pathname === "/campus") return "/campus";
    const route = workspaceLocation(url.pathname, url.search);
    if (route.role !== role || workspacePath(role, route.tab) !== url.pathname) return fallback;
    return workspacePath(role, route.tab, route.item);
  } catch {
    return fallback;
  }
}

export function workspaceLocation(pathname: string, search = "") {
  const match = pathname.match(/^\/workspace\/(student|enterprise)\/([^/?#]+)/);
  const route = normalizeWorkspaceRoute(match?.[1], match?.[2]);
  const item = new URLSearchParams(search).get("item") || undefined;
  return { ...route, item };
}

