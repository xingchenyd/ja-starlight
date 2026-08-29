import { revokeSession } from "../../../../lib/auth/accounts";
import { authEnvironment } from "../../../../lib/auth/environment";
import { authErrorResponse, validateMutationOrigin } from "../../../../lib/auth/request";
export async function POST(request: Request) { try { const { db, config } = await authEnvironment(); validateMutationOrigin(request, config); return Response.json({ loggedOut: true }, { headers: { "set-cookie": await revokeSession(db, config, request, "admin"), "cache-control": "no-store" } }); } catch (error) { return authErrorResponse(error); } }
