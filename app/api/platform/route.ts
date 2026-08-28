import { env } from "cloudflare:workers";
import { ensureCoreSchema, getActor, writeAudit } from "../../../db/runtime";
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
  const kind = new URL(request.url).searchParams.get("kind");
  const query = kind
    ? env.DB.prepare(
        "SELECT id,kind,payload,version,updated_at AS updatedAt FROM workspace_records WHERE owner_id=? AND kind=? AND archived_at IS NULL ORDER BY updated_at DESC",
      ).bind(id, kind)
    : env.DB.prepare(
        "SELECT id,kind,payload,version,updated_at AS updatedAt FROM workspace_records WHERE owner_id=? AND archived_at IS NULL ORDER BY updated_at DESC",
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
  const payload = { ...body.payload, region: "湖南" };
  const isPublicRecord = ["job", "activity", "content"].includes(body.kind);
  const isDraft = isPublicRecord && payload.reviewStatus === "draft";
  if (isPublicRecord && !isDraft && !identity.testMode) {
    const organization = await env.DB.prepare("SELECT verification_status AS verificationStatus FROM organizations WHERE owner_id=?").bind(owner).first<{ verificationStatus: string }>();
    if (organization?.verificationStatus !== "verified")
      return Response.json({ error: "企业资料通过 JA 主体认证后才能正式发布内容；你仍可保存草稿" }, { status: 403 });
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
    "SELECT owner_id AS ownerId,version FROM workspace_records WHERE id=?",
  )
    .bind(id)
    .first<{ ownerId: string; version: number }>();
  if (existing && existing.ownerId !== owner)
    return Response.json({ error: "无权修改该记录" }, { status: 403 });
  if (existing && body.version && Number(body.version) !== Number(existing.version))
    return Response.json({ error: "该内容已被其他窗口更新，请刷新后再保存", currentVersion: existing.version }, { status: 409 });

  await env.DB.prepare(
    "INSERT INTO workspace_records(id,owner_id,kind,payload,version,archived_at,published_at,updated_at) VALUES(?,?,?,?,1,NULL,CASE WHEN ?='approved' THEN CURRENT_TIMESTAMP ELSE NULL END,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,version=workspace_records.version+1,archived_at=NULL,published_at=CASE WHEN json_extract(excluded.payload,'$.reviewStatus')='approved' THEN COALESCE(workspace_records.published_at,CURRENT_TIMESTAMP) ELSE workspace_records.published_at END,updated_at=CURRENT_TIMESTAMP WHERE owner_id=excluded.owner_id",
  )
    .bind(id, owner, body.kind, clean(payload), String(payload.reviewStatus || ""))
    .run();
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
