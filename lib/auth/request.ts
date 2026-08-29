export function getCookie(request: Request, name: string) {
  const raw = request.headers.get("cookie") || "";
  for (const item of raw.split(";")) {
    const [key, ...parts] = item.trim().split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return "";
}

export function validateMutationOrigin(request: Request, config: { AUTH_TRUSTED_ORIGINS?: string }) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const ownOrigin = new URL(request.url).origin;
  const allowed = new Set([ownOrigin, ...String(config.AUTH_TRUSTED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean)]);
  if (!allowed.has(origin)) throw new Response(JSON.stringify({ error: "请求来源校验失败", code: "INVALID_ORIGIN" }), { status: 403, headers: { "content-type": "application/json" } });
}

export function clientAddress(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function jsonBody(request: Request) {
  const type = request.headers.get("content-type") || "";
  if (!type.includes("application/json")) throw new Response(JSON.stringify({ error: "请提交 JSON 数据", code: "INVALID_CONTENT_TYPE" }), { status: 415, headers: { "content-type": "application/json" } });
  try { return await request.json() as Record<string, unknown>; }
  catch { throw new Response(JSON.stringify({ error: "请求数据无法解析", code: "INVALID_JSON" }), { status: 400, headers: { "content-type": "application/json" } }); }
}

export function authErrorResponse(error: unknown) {
  if (error instanceof Response) return error;
  const candidate = error as { status?: number; code?: string; message?: string };
  return Response.json({ error: candidate.message || "服务暂时不可用", code: candidate.code || "AUTH_ERROR" }, { status: candidate.status || 500 });
}
