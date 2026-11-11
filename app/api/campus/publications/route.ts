import { env } from "cloudflare:workers";
import { businessContext, managesSchool, hasBusinessRole, CampusError, campusError, assertMutationOrigin, requiredText } from "../../../../lib/campus/access";
import { defaultRegistrationFields, validateRegistrationFields } from "../../../../lib/services/registration-form";
import { normalizeChallenge, validateChallenge } from "../../../../lib/challenges/model";
import { publicationOrderStatement, compactPublicationOrderStatement } from "../../../../lib/platform/publication-order";
import { validateRichBlocks } from "../../../../lib/campus/publication";
import { ensureChallengeSchema } from "../../../../db/challenges";
import { jsonBody } from "../../../../lib/auth/request";
export async function GET(request: Request) {
  const context = await businessContext(request);
  if (!context.actor) return Response.json({ error: "请先登录" }, { status: 401 });
  const schoolIds = context.grants.filter(g => g.role === "campus_partner").map(g => "school:" + g.schoolId);
  const lead = hasBusinessRole(context, "project_lead");
  if (!context.owner && !lead && schoolIds.length === 0) return Response.json({ records: [] });
  const clause = context.owner ? "(owner_id LIKE 'school:%' OR owner_id LIKE 'ja:%')" : "(" + [schoolIds.length ? "owner_id IN (" + schoolIds.map(() => "?").join(",") + ")" : "", lead ? "owner_id LIKE 'ja:%'" : ""].filter(Boolean).join(" OR ") + ")";
  const rows = await env.DB.prepare(`SELECT id,owner_id AS ownerId,kind,payload,version,updated_at AS updatedAt FROM workspace_records WHERE archived_at IS NULL AND kind IN ('activity','content') AND ${clause} ORDER BY updated_at DESC LIMIT 500`).bind(...(context.owner ? [] : schoolIds)).all();
  return Response.json({ records: rows.results.map(r => ({ ...r, payload: JSON.parse(String(r.payload)) })) }, { headers: { "cache-control": "no-store" } });
}
export async function POST(request: Request) {
  try {
    assertMutationOrigin(request);
    const context = await businessContext(request), actor = context.actor;
    if (!actor) throw new CampusError("请先登录", 401);
    const body = await jsonBody(request) as { id?: string; schoolId?: string; kind?: string; version?: number; draft?: boolean; payload?: Record<string, unknown> };
    const schoolId = String(body.schoolId || "");
    const platform = !schoolId && hasBusinessRole(context, "project_lead");
    if (!platform && (!schoolId || !managesSchool(context, schoolId))) throw new CampusError("没有该发布范围的权限", 403);
    if (!["activity", "content"].includes(String(body.kind))) throw new CampusError("只支持成长活动和成长内容");
    const p = body.payload;
    if (!p || typeof p !== "object" || Array.isArray(p)) throw new CampusError("请填写发布内容");
    const title = requiredText(p.title, "标题", 160), draft = body.draft === true;
    const school = schoolId ? await env.DB.prepare("SELECT name FROM schools WHERE id=? AND status='active'").bind(schoolId).first<{ name: string }>() : null;
    if (schoolId && !school) throw new CampusError("学校不存在", 404);
    const expectedOwner = platform ? "ja:" + actor.id : "school:" + schoolId;
    const existing = body.id ? await env.DB.prepare("SELECT owner_id,payload,version FROM workspace_records WHERE id=? AND kind=? AND archived_at IS NULL").bind(body.id, body.kind).first<{ owner_id: string; payload: string; version: number }>() : null;
    if (body.id && (!existing || (platform ? !existing.owner_id.startsWith("ja:") : existing.owner_id !== expectedOwner))) throw new CampusError("无权编辑该内容", 403);
    if (existing && existing.version !== body.version) throw new CampusError("内容已更新，请刷新后再保存", 409);
    const ownerId = existing?.owner_id || expectedOwner;
    const previous = existing ? JSON.parse(existing.payload) : {};
    const richErrors = validateRichBlocks(p.bodyBlocks || []);
    if (richErrors.length) throw new CampusError(richErrors.join("；"));
    const summary = draft ? String(p.summary || "").slice(0, 1000) : requiredText(p.summary, "简介", 1000);
    const cover = String(p.cover || ""), gallery = Array.isArray(p.gallery) ? p.gallery.map(String).slice(0, 12) : [];
    const attached = new Set([previous.cover, ...(Array.isArray(previous.gallery) ? previous.gallery : [])]);
    for (const url of [cover, ...gallery].filter(Boolean)) {
      if (!url.startsWith("/api/files?key=")) {
        // Retain legacy media on edits. New attachments still use the upload endpoint.
        if (attached.has(url) && (/^\/(?!\/)/.test(url) || /^https?:\/\//i.test(url))) continue;
        throw new CampusError("请使用上传通道添加图片或视频");
      }
      const key = new URL(url, request.url).searchParams.get("key");
      const asset = await env.DB.prepare("SELECT owner_id AS ownerId FROM media_assets WHERE storage_key=? AND visibility='public' AND status='ready' AND archived_at IS NULL").bind(key).first<{ ownerId: string }>();
      if (!asset || (asset.ownerId !== actor.id && !attached.has(url))) throw new CampusError("图片不存在或不属于本次发布");
    }
    if (!draft && !cover) throw new CampusError("请上传封面");
    const fields = Array.isArray(p.registrationFields) ? p.registrationFields : defaultRegistrationFields();
    const challenge = normalizeChallenge(p.challenge);
    if (body.kind === "activity" && !draft) {
      const errors = [...validateRegistrationFields(fields), ...validateChallenge(challenge)];
      if (errors.length) throw new CampusError(errors.join("；"));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.date || ""))) throw new CampusError("请选择活动日期");
    }
    let rulesChanging = false;
    if (existing && body.kind === "activity") {
      await ensureChallengeSchema();
      rulesChanging = JSON.stringify(normalizeChallenge(previous.challenge)) !== JSON.stringify(challenge);
      if (rulesChanging && await env.DB.prepare("SELECT id FROM challenge_teams WHERE activity_id=? LIMIT 1").bind(body.id).first()) throw new CampusError("已有参赛团队，不能直接更改竞赛规则。请先协调参赛者和主办方。", 409);
    }
    const id = body.id || crypto.randomUUID();
    const previousRank = Number(previous.sortOrder);
    const sortOrder = Number.isSafeInteger(previousRank) && previousRank > 0 ? previousRank : 0;
    const payload = {
      ...previous,
      title, summary, cover, gallery,
      coverType: p.coverType === "video" ? "video" : "image",
      bodyBlocks: Array.isArray(p.bodyBlocks) ? p.bodyBlocks : [],
      author: platform ? "星光计划" : school?.name + " · 星光伙伴",
      publisher: platform ? "星光计划" : school?.name,
      date: String(p.date || ""),
      place: String(p.place || "").slice(0, 200),
      capacity: Math.max(0, Math.min(100000, Math.floor(Number(p.capacity) || 0))),
      category: String(p.category || (body.kind === "activity" ? "校园活动" : "成长实践")).slice(0, 50),
      readTime: String(p.readTime || "5 分钟").slice(0, 30),
      registrationFields: fields, challenge,
      creatorId: previous.creatorId || actor.id,
      submittedBy: actor.id,
      schoolId,
      reviewStatus: draft ? "draft" : platform ? "approved" : "pending",
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
      status: draft ? "草稿" : platform ? "已发布" : "审核中",
      submittedAt: new Date().toISOString(),
      sortOrder,
    };
    const serialized = JSON.stringify(payload);
    if (serialized.length > 80000) throw new CampusError("内容不能超过 80KB，请通过文件通道上传图片和视频");
    const statements = [
      existing ? env.DB.prepare("UPDATE workspace_records SET payload=?,version=version+1,published_at=CASE WHEN ?='approved' THEN COALESCE(published_at,CURRENT_TIMESTAMP) ELSE published_at END,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND archived_at IS NULL" + (rulesChanging ? " AND NOT EXISTS(SELECT 1 FROM challenge_teams WHERE activity_id=workspace_records.id)" : "")).bind(serialized, payload.reviewStatus, id, body.version) : env.DB.prepare("INSERT INTO workspace_records(id,owner_id,kind,payload,published_at) VALUES(?,?,?,?,CASE WHEN ?='approved' THEN CURRENT_TIMESTAMP ELSE NULL END)").bind(id, ownerId, body.kind, serialized, payload.reviewStatus),
      env.DB.prepare("SELECT CASE WHEN EXISTS(SELECT 1 FROM workspace_records WHERE id=? AND payload=? AND version=?) THEN 1 ELSE json('campus-write-conflict') END").bind(id, serialized, existing ? existing.version + 1 : 1),
      env.DB.prepare("INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES(?,'campus-publication',?,?)").bind(actor.id, body.kind, id),
      payload.reviewStatus === "approved" ? publicationOrderStatement(env.DB, body.kind!, id, sortOrder || null) : compactPublicationOrderStatement(env.DB, body.kind!),
    ];
    await env.DB.batch(statements);
    return Response.json({ ok: true, id, version: existing ? existing.version + 1 : 1 });
  } catch (error) {
    if (String(error).includes("malformed JSON")) return campusError(new CampusError("内容或参赛状态刚刚更新，请刷新后重试", 409));
    return campusError(error);
  }
}
