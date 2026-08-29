import { authenticateAdminKey } from "../../../../lib/auth/accounts";
import { authEnvironment } from "../../../../lib/auth/environment";
import { authErrorResponse, jsonBody, validateMutationOrigin } from "../../../../lib/auth/request";
const sessionCookieName = "ja_admin_session";
export async function POST(request: Request) { try { const { db, config } = await authEnvironment(); validateMutationOrigin(request, config); const result = await authenticateAdminKey(db, config, request, await jsonBody(request)); return Response.json({ admin: result.admin, sessionCookieName }, { headers: { "set-cookie": result.session.cookie, "cache-control": "no-store" } }); } catch (error) { return authErrorResponse(error); } }
