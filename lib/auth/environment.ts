import { env } from "cloudflare:workers";
import { ensureCoreSchema } from "../../db/runtime";
import { ensureAuthSeeds } from "./seed";
import type { AuthConfig, AuthDatabase } from "./accounts";
import { ensureFormalPlatformData } from "../platform/ensure-formal-data";

export async function authEnvironment() {
  await ensureCoreSchema();
  const config = env as unknown as AuthConfig;
  const db = env.DB as unknown as AuthDatabase;
  await ensureAuthSeeds(config, db);
  await ensureFormalPlatformData(db);
  return { config, db };
}
