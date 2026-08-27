import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

async function setup() {
  await env.DB.batch([
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS workspace_records (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    ),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    ),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS activity_registrations (id TEXT PRIMARY KEY, activity_id TEXT NOT NULL, activity_title TEXT NOT NULL, student_owner_id TEXT NOT NULL, publisher_owner_id TEXT NOT NULL, answers TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', review_note TEXT NOT NULL DEFAULT '', reviewed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    ),
    env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_activity_registration_publisher ON activity_registrations(publisher_owner_id, created_at)",
    ),
  ]);
  const columns = await env.DB.prepare(
    "PRAGMA table_info(activity_registrations)",
  ).all();
  const names = new Set(columns.results.map((row) => String(row.name)));
  const alters = [];
  if (!names.has("review_note"))
    alters.push(
      env.DB.prepare(
        "ALTER TABLE activity_registrations ADD COLUMN review_note TEXT NOT NULL DEFAULT ''",
      ),
    );
  if (!names.has("reviewed_at"))
    alters.push(
      env.DB.prepare(
        "ALTER TABLE activity_registrations ADD COLUMN reviewed_at TEXT",
      ),
    );
  if (alters.length) await env.DB.batch(alters);
}
function allowed(email: string) {
  const value =
    (env as unknown as { JA_ADMIN_EMAILS?: string }).JA_ADMIN_EMAILS ?? "";
  return value
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}
async function admin() {
  const user = await getChatGPTUser();
  if (user && allowed(user.email))
    return { id: user.userId, email: user.email };
  return {
    id: "ja-public-test",
    email: user?.email ?? "ja-testing@public.invalid",
  };
}
export async function GET() {
  await setup();
  const user = await admin();
  if (!user.id)
    return Response.json({ error: "需要后台登录" }, { status: 401 });
  const [records, logs, registrations] = await env.DB.batch([
    env.DB.prepare(
      "SELECT id,owner_id AS ownerId,kind,payload,updated_at AS updatedAt FROM workspace_records ORDER BY updated_at DESC LIMIT 200",
    ),
    env.DB.prepare(
      "SELECT id,actor_id AS actorId,action,target_type AS targetType,target_id AS targetId,created_at AS createdAt FROM audit_logs ORDER BY created_at DESC LIMIT 200",
    ),
    env.DB.prepare(
      "SELECT id,activity_id AS activityId,activity_title AS activityTitle,answers,status,review_note AS reviewNote,reviewed_at AS reviewedAt,created_at AS createdAt FROM activity_registrations ORDER BY created_at DESC LIMIT 500",
    ),
  ]);
  return Response.json({
    operator: user.email,
    records: records.results.map((r) => ({
      ...r,
      payload: JSON.parse(String(r.payload)),
    })),
    logs: logs.results,
    registrations: registrations.results.map((r) => ({
      ...r,
      answers: JSON.parse(String(r.answers)),
      status: r.status === "registered" ? "pending" : r.status,
    })),
  });
}
export async function POST(request: Request) {
  await setup();
  const user = await admin();
  if (!user.id)
    return Response.json(
      { error: "需要后台登录或管理员权限" },
      { status: 401 },
    );
  const body = (await request.json()) as {
    id?: string;
    decision?: "approved" | "rejected";
    reason?: string;
    sortOrder?: number | string;
    category?: string;
    featured?: boolean;
  };
  if (!body.id || !body.decision)
    return Response.json({ error: "缺少审核信息" }, { status: 400 });
  if (body.decision === "rejected" && !body.reason?.trim())
    return Response.json({ error: "退回时必须填写修改意见" }, { status: 400 });
  const row = await env.DB.prepare(
    "SELECT kind,payload FROM workspace_records WHERE id=?",
  )
    .bind(body.id)
    .first();
  if (!row) return Response.json({ error: "内容不存在" }, { status: 404 });
  if (!["activity", "content"].includes(String(row.kind)))
    return Response.json(
      { error: "当前 JA 测试端只审核活动和内容" },
      { status: 400 },
    );
  const current = JSON.parse(String(row.payload));
  const payload = {
    ...current,
    region: current.region || "湖南",
    sortOrder: Number(body.sortOrder ?? current.sortOrder ?? 0) || 0,
    featured: Boolean(body.featured ?? current.featured),
    reviewStatus: body.decision,
    reviewNote:
      body.reason?.trim() ||
      (body.decision === "approved" ? "信息完整，JA 审核通过" : ""),
    reviewedAt: new Date().toISOString(),
    reviewedBy: user.email,
    status:
      body.decision === "approved"
        ? String(row.kind) === "job"
          ? "招募中"
          : "已发布"
        : "已退回",
  };
  if (body.category) {
    if (String(row.kind) === "job") payload.jobCategory = body.category;
    else payload.category = body.category;
  }
  await env.DB.prepare(
    "UPDATE workspace_records SET payload=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
  )
    .bind(JSON.stringify(payload), body.id)
    .run();
  await env.DB.prepare(
    "INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES(?,?,'review',?)",
  )
    .bind(user.id, body.decision, body.id)
    .run();
  return Response.json({ ok: true, reviewStatus: body.decision });
}

export async function PUT(request: Request) {
  await setup();
  const user = await admin();
  if (!user.id)
    return Response.json(
      { error: "需要后台登录或管理员权限" },
      { status: 401 },
    );
  const body = (await request.json()) as {
    kind?: "activity" | "content" | "blacklist";
    payload?: Record<string, unknown>;
  };
  if (
    !body.kind ||
    !["activity", "content", "blacklist"].includes(body.kind) ||
    !body.payload
  )
    return Response.json({ error: "发布类型不正确" }, { status: 400 });
  if (
    !String(body.payload.title || "").trim() ||
    !String(body.payload.summary || "").trim()
  )
    return Response.json({ error: "请填写标题与简介" }, { status: 400 });
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const needsInternalReview = body.kind === "activity";
  const payload = {
    ...body.payload,
    id,
    region: "湖南",
    place:
      body.kind === "activity"
        ? String(body.payload.place || "湖南")
        : body.payload.place,
    sortOrder: Number(body.payload.sortOrder || 0) || 0,
    featured: Boolean(body.payload.featured),
    reviewStatus: needsInternalReview ? "pending" : "approved",
    reviewNote:
      body.kind === "blacklist"
        ? "JA 诚信记录"
        : needsInternalReview
          ? "JA 发起活动，等待内部审核确认"
          : "JA 后台直接发布",
    reviewedAt: needsInternalReview ? null : now,
    reviewedBy: user.email,
    submittedAt: now,
    status:
      body.kind === "blacklist"
        ? "已记录"
        : needsInternalReview
          ? "待内部审核"
          : "已发布",
  };
  const json = JSON.stringify(payload);
  if (json.length > 80000)
    return Response.json({ error: "内容过长" }, { status: 400 });
  await env.DB.prepare(
    "INSERT INTO workspace_records(id,owner_id,kind,payload,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)",
  )
    .bind(id, `ja:${user.id}`, body.kind, json)
    .run();
  await env.DB.prepare(
    "INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES(?,?,?,?)",
  )
    .bind(
      user.id,
      needsInternalReview ? "submit-ja-activity-review" : "direct-publish",
      body.kind,
      id,
    )
    .run();
  return Response.json({ ok: true, id });
}
