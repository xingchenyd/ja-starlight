import { createAccount } from "../../../../lib/auth/accounts";
import { authEnvironment } from "../../../../lib/auth/environment";
import { authErrorResponse, jsonBody, validateMutationOrigin } from "../../../../lib/auth/request";

export async function POST(request: Request) {
  try {
    const { db, config } = await authEnvironment(); validateMutationOrigin(request, config);
    const result = await createAccount(db, config, request, await jsonBody(request));
    return Response.json({ user: result.user }, { status: 201, headers: { "set-cookie": result.session.cookie, "cache-control": "no-store" } });
  } catch (error) { return authErrorResponse(error); }
}
