export type AuthRole = "student" | "enterprise" | "admin";
export type RateLimitState = { attempts: number; windowStartedAt: number; blockedUntil: number | null };

export function sessionDurationSeconds(role: AuthRole) {
  if (role === "student") return 7 * 24 * 60 * 60;
  if (role === "enterprise") return 24 * 60 * 60;
  return 4 * 60 * 60;
}

export function cookieForRole(role: AuthRole, token: string, secure: boolean, maxAge = sessionDurationSeconds(role)) {
  const name = role === "admin" ? "ja_admin_session" : "ja_account_session";
  return `${name}=${token}; Path=/; HttpOnly${secure ? "; Secure" : ""}; SameSite=Lax; Max-Age=${maxAge}`;
}

export function expiredCookie(role: AuthRole, secure: boolean) {
  return cookieForRole(role, "", secure, 0);
}

export function evaluateRateLimit(
  state: RateLimitState | null,
  now: number,
  options: { maximum: number; windowMs: number; blockMs: number },
) {
  if (state?.blockedUntil && state.blockedUntil > now) return { allowed: false, retryAt: state.blockedUntil, next: state };
  const freshWindow = !state || now - state.windowStartedAt >= options.windowMs || (state.blockedUntil !== null && state.blockedUntil <= now);
  const attempts = freshWindow ? 1 : state.attempts + 1;
  const windowStartedAt = freshWindow ? now : state.windowStartedAt;
  const blockedUntil = attempts >= options.maximum ? now + options.blockMs : null;
  const next = { attempts, windowStartedAt, blockedUntil };
  return { allowed: !blockedUntil, retryAt: blockedUntil, next };
}
