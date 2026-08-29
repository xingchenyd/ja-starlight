import { verifyPasswordReset } from "../../../../../lib/auth/accounts";
import { authEnvironment } from "../../../../../lib/auth/environment";
import { authErrorResponse, jsonBody, validateMutationOrigin } from "../../../../../lib/auth/request";
export async function POST(request: Request) { try { const { db, config } = await authEnvironment(); validateMutationOrigin(request, config); return Response.json(await verifyPasswordReset(db, config, request, await jsonBody(request))); } catch (error) { return authErrorResponse(error); } }
