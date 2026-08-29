import { revokeSession } from "../../../../lib/auth/accounts";
import { authEnvironment } from "../../../../lib/auth/environment";
import { authErrorResponse, jsonBody, validateMutationOrigin } from "../../../../lib/auth/request";

export async function POST(request: Request) {
  try {
    const { db, config } = await authEnvironment(); validateMutationOrigin(request, config);
    const body = await jsonBody(request), role = body.role === "enterprise" ? "enterprise" : "student";
    const cookie = await revokeSession(db, config, request, role);
    return Response.json({ loggedOut: true }, { headers: { "set-cookie": cookie, "cache-control": "no-store" } });
  } catch (error) { return authErrorResponse(error); }
}
