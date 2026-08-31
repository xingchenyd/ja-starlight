import { env } from "cloudflare:workers";
import { ensureCoreSchema } from "../../../../../db/runtime";
import { getPublicGrowthProfile } from "../../../../../lib/services/student-share";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  await ensureCoreSchema();
  const { token } = await context.params;
  const pepper = String((env as unknown as { AUTH_PEPPER?: string }).AUTH_PEPPER || "");
  const profile = await getPublicGrowthProfile(env.DB, token, pepper);
  return profile ? Response.json(profile, { headers: { "cache-control": "private, max-age=60" } }) : Response.json({ error: "成长档案链接无效或已过期" }, { status: 404 });
}
