import { getAdminActor, listAdminKeys } from "../../../../lib/auth/accounts";
import { authEnvironment } from "../../../../lib/auth/environment";
export async function GET(request: Request) { const { db, config } = await authEnvironment(); const actor = await getAdminActor(db, config, request); if (!actor) return Response.json({ error: "请先登录星光计划运营后台" }, { status: 401 }); return Response.json({ keys: await listAdminKeys(db) }); }
export async function POST() { return Response.json({ error: "平台仅保留一位技术管理员。请通过运营授权分配业务权限。" }, { status: 410 }); }
