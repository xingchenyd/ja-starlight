import { env } from "cloudflare:workers";
import { ensureCoreSchema, notify, requireAdmin } from "../../../db/runtime";

async function setup() {
  await ensureCoreSchema();
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
export async function GET(request: Request) {
  await setup();
  const user = await requireAdmin(request);
  if (!user)
    return Response.json({ error: "需要后台登录" }, { status: 401 });
  const [records, logs, registrations, organizations] = await env.DB.batch([
    env.DB.prepare(
      "SELECT id,owner_id AS ownerId,kind,payload,version,updated_at AS updatedAt FROM workspace_records WHERE archived_at IS NULL ORDER BY updated_at DESC LIMIT 200",
    ),
    env.DB.prepare(
      "SELECT id,actor_id AS actorId,action,target_type AS targetType,target_id AS targetId,created_at AS createdAt FROM audit_logs ORDER BY created_at DESC LIMIT 200",
    ),
    env.DB.prepare(
      "SELECT id,activity_id AS activityId,activity_title AS activityTitle,student_owner_id AS studentOwnerId,publisher_owner_id AS publisherOwnerId,answers,status,review_note AS reviewNote,reviewed_at AS reviewedAt,created_at AS createdAt FROM activity_registrations WHERE publisher_owner_id LIKE 'ja:%' ORDER BY created_at DESC LIMIT 500",
    ),
    env.DB.prepare("SELECT id,owner_id AS ownerId,name,credit_code AS creditCode,verification_status AS verificationStatus,verified_at AS verifiedAt,created_at AS createdAt,updated_at AS updatedAt FROM organizations ORDER BY updated_at DESC LIMIT 200"),
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
    organizations: organizations.results,
  });
}
export async function POST(request: Request) {
  await setup();
  const user = await requireAdmin(request);
  if (!user)
    return Response.json(
      { error: "需要后台登录或管理员权限" },
      { status: 401 },
    );
  const body = (await request.json()) as {
    id?: string;
    ids?: string[];
    action?: "configure" | "verify-organization";
    organizationId?: string;
    decision?: "approved" | "rejected";
    reason?: string;
    sortOrder?: number | string;
    category?: string;
    featured?: boolean;
  };
  if (body.action === "verify-organization") {
    if (!body.organizationId || !["approved", "rejected"].includes(String(body.decision)))
      return Response.json({ error: "缺少企业认证决定" }, { status: 400 });
    if (body.decision === "rejected" && !body.reason?.trim())
      return Response.json({ error: "退回企业认证时必须填写原因" }, { status: 400 });
    const organization = await env.DB.prepare("SELECT owner_id AS ownerId,name FROM organizations WHERE id=?").bind(body.organizationId).first<{ ownerId: string; name: string }>();
    if (!organization) return Response.json({ error: "企业认证申请不存在" }, { status: 404 });
    const result = await env.DB.prepare("UPDATE organizations SET verification_status=?,verified_by=?,verified_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(body.decision === "approved" ? "verified" : "rejected", user.id, body.organizationId).run();
    if (!result.meta.changes) return Response.json({ error: "企业认证申请不存在" }, { status: 404 });
    await env.DB.prepare("INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES(?,?,'organization',?)").bind(user.id, body.decision === "approved" ? "verify-organization" : "reject-organization", body.organizationId).run();
    await notify(organization.ownerId, "organization-verification", body.decision === "approved" ? "企业主体认证已通过" : "企业主体认证需要补充材料", body.decision === "approved" ? `${organization.name} 已获得平台企业发布权限。` : String(body.reason || "请补充企业认证材料。"), "/workspace?role=enterprise&tab=profile");
    return Response.json({ ok: true });
  }
  const ids = Array.from(
    new Set(
      (Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [])
        .map((id) => String(id).trim())
        .filter(Boolean),
    ),
  );
  const configuring = body.action === "configure";
  if (!ids.length || (!configuring && !body.decision))
    return Response.json({ error: "缺少审核信息" }, { status: 400 });
  if (configuring && ids.length !== 1)
    return Response.json({ error: "展示设置仅支持逐条保存" }, { status: 400 });
  if (ids.length > 100)
    return Response.json({ error: "单次最多审核 100 条内容" }, { status: 400 });
  if (!configuring && body.decision === "rejected" && !body.reason?.trim())
    return Response.json({ error: "退回时必须填写修改意见" }, { status: 400 });
  const placeholders = ids.map(() => "?").join(",");
  const result = await env.DB.prepare(
    `SELECT id,owner_id AS ownerId,kind,payload FROM workspace_records WHERE archived_at IS NULL AND id IN (${placeholders})`,
  )
    .bind(...ids)
    .all();
  if (result.results.length !== ids.length)
    return Response.json({ error: "部分内容不存在，请刷新审核队列" }, { status: 404 });
  const rows = result.results.map((row) => ({
    ...row,
    id: String(row.id),
    ownerId: String(row.ownerId || ""),
    kind: String(row.kind),
    current: JSON.parse(String(row.payload)) as Record<string, unknown>,
  }));
  const unsupported = rows.find(
    (row) =>
      configuring
        ? !["job", "activity", "content"].includes(row.kind)
        : !["activity", "content"].includes(row.kind) ||
          (row.kind === "content" && row.ownerId.startsWith("ja:")),
  );
  if (unsupported)
    return Response.json(
      { error: "JA 仅审核 JA 活动、企业活动和企业内容" },
      { status: 400 },
    );
  const alreadyReviewed = !configuring && rows.find(
    (row) =>
      row.current.reviewStatus && row.current.reviewStatus !== "pending",
  );
  if (alreadyReviewed)
    return Response.json(
      { error: "队列中包含已处理内容，请刷新后重试" },
      { status: 409 },
    );
  const reviewedAt = new Date().toISOString();
  const statements = rows.flatMap((row) => {
    const single = rows.length === 1;
    const payload: Record<string, unknown> = {
      ...row.current,
      region: row.current.region || "湖南",
      sortOrder:
        Number(single ? body.sortOrder ?? row.current.sortOrder ?? 0 : row.current.sortOrder ?? 0) || 0,
      featured: single
        ? Boolean(body.featured ?? row.current.featured)
        : Boolean(row.current.featured),
      reviewStatus: configuring ? row.current.reviewStatus : body.decision,
      reviewNote: configuring
        ? row.current.reviewNote
        : body.reason?.trim() ||
          (body.decision === "approved" ? "信息完整，JA 审核通过" : ""),
      reviewedAt: configuring ? row.current.reviewedAt : reviewedAt,
      reviewedBy: configuring ? row.current.reviewedBy : user.email,
      status: configuring
        ? row.current.status
        : body.decision === "approved"
          ? "已发布"
          : "已退回",
    };
    if (single && body.category) {
      if (row.kind === "job") payload.jobCategory = body.category;
      else payload.category = body.category;
    }
    return [
      env.DB.prepare(
        "UPDATE workspace_records SET payload=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).bind(JSON.stringify(payload), row.id),
      env.DB.prepare(
        "INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES(?,?,?,?)",
      ).bind(
        user.id,
        configuring
          ? "configure-publication"
          : rows.length > 1
            ? `batch-${body.decision}`
            : body.decision,
        configuring ? `publication:${row.kind}` : `review:${row.kind}`,
        row.id,
      ),
    ];
  });
  await env.DB.batch(statements);
  return Response.json({
    ok: true,
    count: rows.length,
    reviewStatus: configuring ? rows[0].current.reviewStatus : body.decision,
  });
}

export async function PUT(request: Request) {
  await setup();
  const user = await requireAdmin(request);
  if (!user)
    return Response.json(
      { error: "需要后台登录或管理员权限" },
      { status: 401 },
    );
  const body = (await request.json()) as {
    id?: string;
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
  const id = body.id && /^[a-zA-Z0-9-]{4,100}$/.test(body.id)
    ? body.id
    : crypto.randomUUID();
  if (body.id) {
    const existing = await env.DB.prepare(
      "SELECT kind FROM workspace_records WHERE id=?",
    ).bind(id).first<{ kind: string }>();
    if (!existing || existing.kind !== "blacklist" || body.kind !== "blacklist")
      return Response.json({ error: "只能更新已有诚信记录" }, { status: 403 });
  }
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
    "INSERT INTO workspace_records(id,owner_id,kind,payload,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=CURRENT_TIMESTAMP",
  ).bind(id, `ja:${user.id}`, body.kind, json).run();
  await env.DB.prepare(
    "INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES(?,?,?,?)",
  )
    .bind(
      user.id,
      body.id
        ? "update-integrity"
        : needsInternalReview
          ? "submit-ja-activity-review"
          : "direct-publish",
      body.kind,
      id,
    )
    .run();
  return Response.json({ ok: true, id });
}
