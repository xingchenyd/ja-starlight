export async function PATCH() { return Response.json({ error: "已关闭旧密钥恢复和多人管理。唯一密钥通过服务器安全轮换。" }, { status: 410 }); }
