import { env } from "cloudflare:workers";
import { normalizeChallenge, validateChallenge } from "../../../lib/challenges/model";
import { ensureChallengeSchema } from "../../../db/challenges";
import { ensureCoreSchema, getActor, requireVerifiedEnterprise, writeAudit } from "../../../db/runtime";
function clean(value: unknown) {
  const text = JSON.stringify(value);
  if (text.length > 80000) throw new Error("内容过长");
  return text;
}

export async function GET(request: Request) {
  await ensureCoreSchema();
  const identity = await getActor(request);
  if (!identity) return Response.json({ records: [], signedIn: false }, { status: 401 });
  const id = identity.id;
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const archived = params.get("archived") === "1";
  const query = kind
    ? env.DB.prepare(
        `SELECT id,kind,payload,version,archived_at AS archivedAt,updated_at AS updatedAt FROM workspace_records WHERE owner_id=? AND kind=? AND archived_at IS ${archived ? "NOT NULL" : "NULL"} ORDER BY updated_at DESC`,
      ).bind(id, kind)
    : env.DB.prepare(
        `SELECT id,kind,payload,version,archived_at AS archivedAt,updated_at AS updatedAt FROM workspace_records WHERE owner_id=? AND archived_at IS ${archived ? "NOT NULL" : "NULL"} ORDER BY updated_at DESC`,
      ).bind(id);
  const rows = await query.all();
  return Response.json({
    records: rows.results.map((r) => ({
      ...r,
      payload: JSON.parse(String(r.payload)),
    })),
  });
}

export async function POST(request: Request) {
  await ensureCoreSchema();
  const identity = await getActor(request);
  if (!identity) return Response.json({ error: "请先登录后继续" }, { status: 401 });
  const owner = identity.id;
  const body = (await request.json()) as {
    id?: string;
    kind?: string;
    payload?: Record<string, unknown>;
    version?: number;
  };
  const allowed = [
    "student-profile",
    "enterprise-profile",
    "job",
    "activity",
    "content",
  ];
  if (!body.kind || !allowed.includes(body.kind) || !body.payload)
    return Response.json({ error: "数据类型不正确" }, { status: 400 });
  const enterpriseKinds = ["enterprise-profile", "job", "activity", "content"];
  const requiredRole = enterpriseKinds.includes(body.kind) ? "enterprise" : "student";
  if (identity.role !== requiredRole && !identity.testMode)
    return Response.json({ error: `当前账号不是${requiredRole === "enterprise" ? "企业" : "学生"}账号` }, { status: 403 });

  const categories = [
    "产品运营",
    "技术研发",
    "数据分析",
    "品牌内容",
    "智能制造",
    "金融与商业",
    "项目实践",
    "公益实践",
  ];
  const payload: Record<string, unknown> = { ...body.payload, region: "湖南" };
  const isPublicRecord = ["job", "activity", "content"].includes(body.kind);
  const isDraft = isPublicRecord && payload.reviewStatus === "draft";
  if (body.kind === "activity") {
    payload.challenge = normalizeChallenge(payload.challenge);
    const errors = validateChallenge(payload.challenge);
    if (!isDraft && errors.length) return Response.json({ error: errors.join("；") }, { status: 400 });
  }
  if (body.kind === "student-profile") {
    const limits: Record<string, number> = { name: 80, school: 160, major: 160, grade: 80, headline: 200, bio: 4000, skills: 4000, awards: 4000, phone: 40, email: 254, resumeName: 240, resumeKey: 500 };
    for (const [field, limit] of Object.entries(limits)) {
      if (payload[field] !== undefined && (typeof payload[field] !== "string" || payload[field].length > limit))
        return Response.json({ error: "资料格式不正确或内容过长，请检查后重试" }, { status: 400 });
    }
    if (payload.email && !/^\S+@\S+\.\S+$/.test(String(payload.email)))
      return Response.json({ error: "请填写有效的联系邮箱" }, { status: 400 });
    if (payload.resumeKey) {
      const asset = await env.DB.prepare("SELECT id FROM media_assets WHERE storage_key=? AND owner_id=? AND purpose='resume' AND archived_at IS NULL").bind(String(payload.resumeKey), owner).first();
      if (!asset) return Response.json({ error: "简历不存在或不属于当前账号，请重新上传" }, { status: 400 });
    }
    if (!body.id) {
      const current = await env.DB.prepare("SELECT id FROM workspace_records WHERE owner_id=? AND kind='student-profile' AND archived_at IS NULL LIMIT 1").bind(owner).first();
      if (current) return Response.json({ error: "资料已在其他窗口创建，请刷新后再编辑" }, { status: 409 });
    }
  }
  if (isPublicRecord && !isDraft && !identity.testMode) {
    const verification = await requireVerifiedEnterprise(request);
    if (verification.response) return verification.response;
  }

  if (body.kind === "job") {
    payload.city = String(payload.city || "长沙");
    if (!categories.includes(String(payload.jobCategory || "")))
      return Response.json({ error: "请选择有效的岗位类别" }, { status: 400 });
    payload.reviewStatus = isDraft ? "draft" : "approved";
    payload.status = isDraft ? "草稿" : "招募中";
    if (
      !isDraft &&
      (!String(payload.title || "").trim() ||
        !String(payload.company || "").trim() ||
        !/^\S+@\S+\.\S+$/.test(String(payload.contactEmail || "")) ||
        !Array.isArray(payload.responsibilities) ||
        payload.responsibilities.length < 2 ||
        !Array.isArray(payload.requirements) ||
        payload.requirements.length < 2)
    )
      return Response.json(
        { error: "请完整填写机会名称、企业、投递邮箱、职责和能力要求" },
        { status: 400 },
      );
  }
  if (body.kind === "activity" || body.kind === "content") {
    payload.reviewStatus = isDraft ? "draft" : "pending";
    payload.status = isDraft ? "草稿" : "审核中";
    if (isDraft) {
      payload.reviewNote = "";
      payload.reviewedAt = null;
      payload.reviewedBy = "";
      payload.submittedAt = null;
    }
    if (
      !isDraft &&
      (!String(payload.title || "").trim() ||
        String(payload.summary || "").trim().length < 12 ||
        !String(payload.cover || "").trim())
    )
      return Response.json(
        { error: "请完整填写标题、摘要并上传真实封面" },
        { status: 400 },
      );
  }
  if (body.kind === "enterprise-profile") {
    payload.city = String(payload.city || "长沙");
    if (
      !String(payload.name || "").trim() ||
      !String(payload.industry || "").trim() ||
      String(payload.intro || "").trim().length < 30 ||
      !String(payload.contactName || "").trim() ||
      !String(payload.contactPhone || "").trim() ||
      !/^\S+@\S+\.\S+$/.test(String(payload.contactEmail || ""))
    )
      return Response.json(
        { error: "请完整填写企业名称、行业、简介与内部联系信息" },
        { status: 400 },
      );
    const creditCode = String(payload.creditCode || "").trim();
    if (creditCode && !/^[0-9A-Z]{18}$/.test(creditCode))
      return Response.json(
        { error: "统一社会信用代码应为 18 位大写字母或数字" },
        { status: 400 },
      );
  }
  if (isPublicRecord) {
    payload.sortOrder = Number(payload.sortOrder || 0) || 0;
    payload.featured = Boolean(payload.featured);
  }

  const id =
    body.id && /^[a-zA-Z0-9-]{4,100}$/.test(body.id)
      ? body.id
      : crypto.randomUUID();
  const existing = await env.DB.prepare(
    "SELECT owner_id AS ownerId,version,payload,kind FROM workspace_records WHERE id=?",
  )
    .bind(id)
    .first<{ ownerId: string; version: number; payload: string; kind: string }>();
  if (existing && existing.ownerId !== owner)
    return Response.json({ error: "无权修改该记录" }, { status: 403 });
  if (existing && existing.kind !== body.kind)
    return Response.json({ error: "不能将已有记录改成另一种内容类型" }, { status: 409 });
  if (existing && body.version && Number(body.version) !== Number(existing.version))
    return Response.json({ error: "该内容已被其他窗口更新，请刷新后再保存", currentVersion: existing.version }, { status: 409 });
  let challengeRulesChanging = false;
  if (body.kind === "activity") {
    await ensureChallengeSchema();
    const hasTeams = await env.DB.prepare("SELECT id FROM challenge_teams WHERE activity_id=? LIMIT 1").bind(id).first();
    challengeRulesChanging = Boolean(existing && JSON.stringify(normalizeChallenge(JSON.parse(existing.payload).challenge)) !== JSON.stringify(payload.challenge));
    if (hasTeams && challengeRulesChanging)
      return Response.json({ error: "已有参赛团队，不能直接更改比赛规则。请联系项目团队确认变更并通知参赛者。" }, { status: 409 });
  }

  const write = await env.DB.prepare(
    "INSERT INTO workspace_records(id,owner_id,kind,payload,version,archived_at,published_at,updated_at) VALUES(?,?,?,?,1,NULL,CASE WHEN ?='approved' THEN CURRENT_TIMESTAMP ELSE NULL END,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,version=workspace_records.version+1,archived_at=NULL,published_at=CASE WHEN json_extract(excluded.payload,'$.reviewStatus')='approved' THEN COALESCE(workspace_records.published_at,CURRENT_TIMESTAMP) ELSE workspace_records.published_at END,updated_at=CURRENT_TIMESTAMP WHERE owner_id=excluded.owner_id AND workspace_records.version=?" + (challengeRulesChanging ? " AND NOT EXISTS(SELECT 1 FROM challenge_teams WHERE activity_id=workspace_records.id)" : ""),
  )
    .bind(id, owner, body.kind, clean(payload), String(payload.reviewStatus || ""), existing?.version || 0)
    .run();
  if (!write.meta.changes) return Response.json({ error: "该内容刚刚被其他窗口更新，请刷新后再保存" }, { status: 409 });
  if (body.kind === "enterprise-profile") {
    await env.DB.prepare("INSERT INTO organizations(id,owner_id,name,credit_code,verification_status,updated_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(owner_id) DO UPDATE SET name=excluded.name,credit_code=excluded.credit_code,verification_status=CASE WHEN organizations.name<>excluded.name OR organizations.credit_code<>excluded.credit_code THEN 'pending' ELSE organizations.verification_status END,updated_at=CURRENT_TIMESTAMP").bind(`org:${owner}`, owner, String(payload.name || "未命名企业"), String(payload.creditCode || ""), identity.testMode ? "verified" : "pending").run();
  }
  const action = isDraft
    ? "save-draft"
    : body.kind === "job"
      ? "publish-job"
      : isPublicRecord
        ? "submit-review"
        : "save";
  await writeAudit(owner, action, body.kind, id);
  const saved = await env.DB.prepare("SELECT version FROM workspace_records WHERE id=?").bind(id).first<{ version: number }>();
  return Response.json({ ok: true, id, version: saved?.version || 1 });
}

export async function DELETE(request: Request) {
  await ensureCoreSchema();
  const identity = await getActor(request);
  if (!identity) return Response.json({ error: "请先登录后继续" }, { status: 401 });
  const owner = identity.id;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "缺少记录" }, { status: 400 });
  await env.DB.prepare(
    "UPDATE workspace_records SET archived_at=CURRENT_TIMESTAMP,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND owner_id=? AND archived_at IS NULL",
  )
    .bind(id, owner)
    .run();
  await writeAudit(owner, "archive", "workspace_record", id);
  return Response.json({ ok: true });
}
