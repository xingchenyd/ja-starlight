import { getAccountActor } from "../../../../lib/auth/accounts";
import { authEnvironment } from "../../../../lib/auth/environment";

export async function GET(request: Request) {
  const { db, config } = await authEnvironment();
  const user = await getAccountActor(db, config, request);
  return Response.json({ authenticated: Boolean(user), user }, { status: user ? 200 : 401, headers: { "cache-control": "no-store" } });
}
