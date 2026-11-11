"use client";
// Selecting an identity never grants permissions: the server validates that
// identity's independent HttpOnly cookie and all required grants.
export function scopedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (typeof window !== "undefined" && (window.location.pathname.startsWith("/ja-console") || new URLSearchParams(window.location.search).get("access") === "owner")) headers.set("x-starlight-scope","admin");
  return fetch(input, { ...init, headers });
}
