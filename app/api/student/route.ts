import { env } from "cloudflare:workers";
import { ensureCoreSchema, getActor, writeAudit } from "../../../db/runtime";
import {
  cleanExperience,
  cleanIdentifier,
  cleanSnapshot,
  normalizeFavoriteType,
} from "../../../lib/services/student";

async function studentActor(request: Request) {
  await ensureCoreSchema();
  const identity = await getActor(request);
  if (!identity) return { identity: null, response: Response.json({ error: "请先登录学生账号" }, { status: 401 }) };
  if (identity.role !== "student" && !identity.testMode)
    return { identity: null, response: Response.json({ error: "仅学生账号可管理个人数据" }, { status: 403 }) };
  return { identity, response: null };
}

function parseSnapshot(value: unknown) {
  try { return JSON.parse(String(value || "{}")); } catch { return {}; }
}

export async function GET(request: Request) {
  const auth = await studentActor(request);
  if (auth.response || !auth.identity) return auth.response;
  const student = auth.identity.id;
  const [favorites, calendar, experiences] = await env.DB.batch([
    env.DB.prepare("SELECT id,target_type AS targetType,target_id AS targetId,target_snapshot AS targetSnapshot,status,created_at AS createdAt,updated_at AS updatedAt FROM student_favorites WHERE student_id=? ORDER BY created_at DESC").bind(student),
    env.DB.prepare("SELECT id,source_type AS sourceType,source_id AS sourceId,title,start_at AS startAt,end_at AS endAt,reminder_at AS reminderAt,reminder_enabled AS reminderEnabled,status,created_at AS createdAt,updated_at AS updatedAt FROM student_calendar_events WHERE student_id=? ORDER BY CASE WHEN start_at IS NULL THEN 1 ELSE 0 END,start_at ASC").bind(student),
    env.DB.prepare("SELECT id,source_type AS sourceType,source_id AS sourceId,category,title,role,description,output,evidence_url AS evidenceUrl,evidence_asset_key AS evidenceAssetKey,occurred_at AS occurredAt,certified,is_public AS isPublic,sort_order AS sortOrder,created_at AS createdAt,updated_at AS updatedAt FROM student_experiences WHERE student_id=? ORDER BY sort_order DESC,occurred_at DESC").bind(student),
  ]);
  return Response.json({
    favorites: favorites.results.map((row) => ({ ...row, targetSnapshot: parseSnapshot(row.targetSnapshot) })),
    calendar: calendar.results.map((row) => ({ ...row, reminderEnabled: Boolean(row.reminderEnabled) })),
    experiences: experiences.results.map((row) => ({ ...row, certified: Boolean(row.certified), isPublic: Boolean(row.isPublic) })),
  });
}

export async function POST(request: Request) {
  const auth = await studentActor(request);
  if (auth.response || !auth.identity) return auth.response;
  const student = auth.identity.id;
  const body = await request.json() as Record<string, unknown>;
  const action = String(body.action || "");

  if (action === "favorite") {
    const targetType = normalizeFavoriteType(body.targetType);
    const targetId = cleanIdentifier(body.targetId);
    if (!targetType || !targetId) return Response.json({ error: "收藏对象不正确" }, { status: 400 });
    const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO student_favorites(id,student_id,target_type,target_id,target_snapshot,status,created_at,updated_at) VALUES(?,?,?,?,?,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(student_id,target_type,target_id) DO UPDATE SET target_snapshot=excluded.target_snapshot,status='active',updated_at=CURRENT_TIMESTAMP")
      .bind(id, student, targetType, targetId, cleanSnapshot(body.snapshot)).run();
    await writeAudit(student, "favorite", targetType, targetId);
    return Response.json({ ok: true, targetType, targetId });
  }

  if (action === "set-reminder") {
    const sourceId = cleanIdentifier(body.sourceId);
    if (!sourceId) return Response.json({ error: "活动标识不正确" }, { status: 400 });
    const enabled = body.enabled === false ? 0 : 1;
    const result = await env.DB.prepare("UPDATE student_calendar_events SET reminder_enabled=?,updated_at=CURRENT_TIMESTAMP WHERE student_id=? AND source_type='activity' AND source_id=?")
      .bind(enabled, student, sourceId).run();
    if (!result.meta.changes) return Response.json({ error: "未找到日历活动" }, { status: 404 });
    await writeAudit(student, enabled ? "enable-reminder" : "disable-reminder", "activity", sourceId);
    return Response.json({ ok: true, reminderEnabled: Boolean(enabled) });
  }

  if (action === "save-experience") {
    let experience;
    try { experience = cleanExperience(body); }
    catch (error) { return Response.json({ error: error instanceof Error ? error.message : "经历信息不正确" }, { status: 400 }); }
    const requestedId = cleanIdentifier(body.id);
    const id = requestedId || crypto.randomUUID();
    const existing = requestedId
      ? await env.DB.prepare("SELECT source_type AS sourceType FROM student_experiences WHERE id=? AND student_id=?").bind(id, student).first<{ sourceType: string }>()
      : null;
    if (requestedId && !existing) return Response.json({ error: "经历不存在或无权修改" }, { status: 404 });
    if (existing?.sourceType !== "manual") return Response.json({ error: "平台认证经历不可修改" }, { status: 403 });
    await env.DB.prepare("INSERT INTO student_experiences(id,student_id,source_type,source_id,category,title,role,description,output,evidence_url,evidence_asset_key,occurred_at,certified,is_public,sort_order,created_at,updated_at) VALUES(?,?,'manual',NULL,?,?,?,?,?,?,?, ?,0,?,COALESCE((SELECT MAX(sort_order)+1 FROM student_experiences WHERE student_id=?),1),CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET category=excluded.category,title=excluded.title,role=excluded.role,description=excluded.description,output=excluded.output,evidence_url=excluded.evidence_url,evidence_asset_key=excluded.evidence_asset_key,occurred_at=excluded.occurred_at,is_public=excluded.is_public,updated_at=CURRENT_TIMESTAMP WHERE student_id=excluded.student_id AND source_type='manual'")
      .bind(id, student, experience.category, experience.title, experience.role, experience.description, experience.output, experience.evidenceUrl, experience.evidenceAssetKey, experience.occurredAt, experience.isPublic, student).run();
    await writeAudit(student, requestedId ? "update-experience" : "create-experience", "student-experience", id);
    return Response.json({ ok: true, id });
  }

  if (action === "reorder-experiences") {
    const ids = Array.isArray(body.ids) ? body.ids.map((id) => cleanIdentifier(id)).filter(Boolean).slice(0, 200) : [];
    if (!ids.length) return Response.json({ error: "缺少排序记录" }, { status: 400 });
    const owned = await env.DB.prepare(`SELECT id FROM student_experiences WHERE student_id=? AND id IN (${ids.map(() => "?").join(",")})`).bind(student, ...ids).all();
    if (owned.results.length !== ids.length) return Response.json({ error: "排序中包含无权操作的记录" }, { status: 403 });
    await env.DB.batch(ids.map((id, index) => env.DB.prepare("UPDATE student_experiences SET sort_order=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND student_id=?").bind(ids.length - index, id, student)));
    await writeAudit(student, "reorder-experiences", "student-experience", ids.join(","));
    return Response.json({ ok: true });
  }

  return Response.json({ error: "不支持的学生数据操作" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const auth = await studentActor(request);
  if (auth.response || !auth.identity) return auth.response;
  const student = auth.identity.id;
  const url = new URL(request.url);
  const favoriteType = normalizeFavoriteType(url.searchParams.get("targetType"));
  const targetId = cleanIdentifier(url.searchParams.get("targetId"));
  if (favoriteType && targetId) {
    await env.DB.prepare("UPDATE student_favorites SET status='removed',updated_at=CURRENT_TIMESTAMP WHERE student_id=? AND target_type=? AND target_id=?")
      .bind(student, favoriteType, targetId).run();
    await writeAudit(student, "remove-favorite", favoriteType, targetId);
    return Response.json({ ok: true });
  }
  const experienceId = cleanIdentifier(url.searchParams.get("experienceId"));
  if (experienceId) {
    const result = await env.DB.prepare("DELETE FROM student_experiences WHERE student_id=? AND id=? AND source_type='manual'").bind(student, experienceId).run();
    if (!result.meta.changes) return Response.json({ error: "手动经历不存在或不可删除" }, { status: 404 });
    await writeAudit(student, "delete-experience", "student-experience", experienceId);
    return Response.json({ ok: true });
  }
  return Response.json({ error: "缺少要删除的个人数据" }, { status: 400 });
}
