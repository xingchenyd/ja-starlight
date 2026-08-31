import { env } from "cloudflare:workers";
import { activities as seedActivities } from "../../data";
import { getActor, notify, requireAdmin, writeAudit } from "../../../db/runtime";
import { normalizeDateTime, reminderBefore } from "../../../lib/services/student";
import {
  canReviewRegistration,
  registrationReviewScope,
  type RegistrationReviewScope,
} from "../../../lib/services/registration-governance";

type ActivityRow = { id: string; ownerId: string; payload: string };
type RegistrationRow = {
  id: string;
  activityId: string;
  activityTitle: string;
  publisherOwnerId?: string;
  studentOwnerId?: string;
  answers: string;
  status: string;
  reviewNote?: string;
  reviewedAt?: string | null;
  createdAt: string;
};
const setupSql = [
  "CREATE TABLE IF NOT EXISTS workspace_records (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS activity_registrations (id TEXT PRIMARY KEY, activity_id TEXT NOT NULL, activity_title TEXT NOT NULL, student_owner_id TEXT NOT NULL, publisher_owner_id TEXT NOT NULL, answers TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', review_note TEXT NOT NULL DEFAULT '', reviewed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS student_calendar_events (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, source_type TEXT NOT NULL DEFAULT 'activity', source_id TEXT NOT NULL, title TEXT NOT NULL, start_at TEXT, end_at TEXT, reminder_at TEXT, reminder_enabled INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS student_experiences (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, source_type TEXT NOT NULL DEFAULT 'manual', source_id TEXT, category TEXT NOT NULL, title TEXT NOT NULL, role TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', output TEXT NOT NULL DEFAULT '', evidence_url TEXT NOT NULL DEFAULT '', evidence_asset_key TEXT NOT NULL DEFAULT '', occurred_at TEXT NOT NULL, certified INTEGER NOT NULL DEFAULT 0, is_public INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_registration_student_activity ON activity_registrations(student_owner_id, activity_id)",
  "CREATE INDEX IF NOT EXISTS idx_activity_registration_publisher ON activity_registrations(publisher_owner_id, created_at)",
  "CREATE INDEX IF NOT EXISTS idx_activity_registration_activity ON activity_registrations(activity_id, created_at)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_student_calendar_source ON student_calendar_events(student_id,source_type,source_id)",
  "CREATE INDEX IF NOT EXISTS idx_student_calendar_upcoming ON student_calendar_events(student_id,status,start_at)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_student_experiences_source ON student_experiences(student_id,source_type,source_id)",
];

async function setup() {
  await env.DB.batch(setupSql.slice(0, 5).map((sql) => env.DB.prepare(sql)));
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
  if (!names.has("updated_at"))
    alters.push(env.DB.prepare("ALTER TABLE activity_registrations ADD COLUMN updated_at TEXT"));
  if (!names.has("cancelled_at"))
    alters.push(env.DB.prepare("ALTER TABLE activity_registrations ADD COLUMN cancelled_at TEXT"));
  if (!names.has("attendance_status"))
    alters.push(env.DB.prepare("ALTER TABLE activity_registrations ADD COLUMN attendance_status TEXT NOT NULL DEFAULT 'unconfirmed'"));
  if (alters.length) await env.DB.batch(alters);
  await env.DB.batch(setupSql.slice(5).map((sql) => env.DB.prepare(sql)));
}
function cleanAnswers(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("报名信息格式不正确");
  const clean = Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, answer]) => [
      String(key).slice(0, 80),
      String(answer ?? "").trim().slice(0, 1200),
    ]),
  );
  const json = JSON.stringify(clean);
  if (json.length > 12000) throw new Error("报名信息过长");
  return { clean, json };
}
function parseRegistration(row: RegistrationRow) {
  return {
    ...row,
    answers: JSON.parse(String(row.answers)),
    status: row.status === "registered" ? "pending" : row.status,
    reviewNote: row.reviewNote || "",
  };
}
async function activities() {
  const rows = await env.DB.prepare(
    "SELECT id,owner_id AS ownerId,payload FROM workspace_records WHERE kind='activity'",
  ).all();
  return rows.results as unknown as ActivityRow[];
}
function findActivity(rows: ActivityRow[], activityId: string) {
  return rows.find((row) => {
    if (row.id === activityId) return true;
    try {
      return String(JSON.parse(String(row.payload)).id || "") === activityId;
    } catch {
      return false;
    }
  });
}

export async function GET(request: Request) {
  await setup();
  const scope = new URL(request.url).searchParams.get("scope");
  if (scope === "ja") {
    const admin = await requireAdmin(request);
    if (!admin)
      return Response.json({ error: "需要星光计划运营后台权限" }, { status: 401 });
    const rows = await env.DB.prepare(
      "SELECT id,activity_id AS activityId,activity_title AS activityTitle,student_owner_id AS studentOwnerId,publisher_owner_id AS publisherOwnerId,answers,status,review_note AS reviewNote,reviewed_at AS reviewedAt,created_at AS createdAt FROM activity_registrations WHERE publisher_owner_id LIKE 'ja:%' ORDER BY created_at DESC LIMIT 500",
    ).all();
    return Response.json({
      registrations: (rows.results as unknown as RegistrationRow[]).map(
        parseRegistration,
      ),
    });
  }
  if (scope === "publisher") {
    const identity = await getActor(request, "enterprise");
    if (!identity)
      return Response.json({ registrations: [] }, { status: 401 });
    if (identity.role !== "enterprise")
      return Response.json({ error: "仅企业账号可查看报名数据" }, { status: 403 });
    const registrationRows = await env.DB.prepare(
      "SELECT id,activity_id AS activityId,activity_title AS activityTitle,student_owner_id AS studentOwnerId,publisher_owner_id AS publisherOwnerId,answers,status,review_note AS reviewNote,reviewed_at AS reviewedAt,created_at AS createdAt FROM activity_registrations WHERE publisher_owner_id=? ORDER BY created_at DESC LIMIT 500",
    )
      .bind(identity.id)
      .all();
    return Response.json({
      registrations: (registrationRows.results as unknown as RegistrationRow[]).map(
        parseRegistration,
      ),
    });
  }
  const identity = await getActor(request, "student");
  if (!identity) return Response.json({ registrations: [] }, { status: 401 });
  if (identity.role !== "student")
    return Response.json({ error: "仅学生账号可查看报名" }, { status: 403 });
  const owner = identity.id;
  const rows = await env.DB.prepare(
    "SELECT id,activity_id AS activityId,activity_title AS activityTitle,answers,status,review_note AS reviewNote,reviewed_at AS reviewedAt,created_at AS createdAt FROM activity_registrations WHERE student_owner_id=? ORDER BY created_at DESC",
  )
    .bind(owner)
    .all();
  return Response.json({
    registrations: (rows.results as unknown as RegistrationRow[]).map(
      parseRegistration,
    ),
  });
}

export async function POST(request: Request) {
  await setup();
  const identity = await getActor(request, "student");
  if (!identity)
    return Response.json({ error: "缺少报名身份" }, { status: 401 });
  if (identity.role !== "student")
    return Response.json({ error: "仅学生账号可报名活动" }, { status: 403 });
  const student = identity.id;
  const body = (await request.json()) as {
    activityId?: string;
    activityTitle?: string;
    activityDate?: string;
    activityEnd?: string;
    answers?: Record<string, string>;
  };
  if (
    !body.activityId ||
    !body.activityTitle ||
    !body.answers ||
    Object.keys(body.answers).length === 0
  )
    return Response.json({ error: "请完整填写报名信息" }, { status: 400 });
  let answerData: { clean: Record<string, string>; json: string };
  try {
    answerData = cleanAnswers(body.answers);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "报名信息不正确" },
      { status: 400 },
    );
  }
  const activityRows = await activities();
  const record = findActivity(activityRows, body.activityId);
  const seedActivity = !record
    ? seedActivities.find((activity) => activity.id === body.activityId)
    : undefined;
  if (!record && !seedActivity)
    return Response.json(
      { error: "活动不存在或已下线，请刷新活动列表" },
      { status: 404 },
    );
  let publisher = "ja:seed";
  let canonicalActivityId = body.activityId;
  let canonicalTitle = String(body.activityTitle).trim().slice(0, 200);
  let startAt = normalizeDateTime(body.activityDate);
  let endAt = normalizeDateTime(body.activityEnd);
  if (seedActivity) {
    if (["报名截止", "已结束", "已满员"].includes(seedActivity.status))
      return Response.json({ error: "该活动当前不可报名" }, { status: 400 });
    const missing = (seedActivity.registrationFields || []).find(
      (field) => field.required && !answerData.clean[field.id],
    );
    if (missing)
      return Response.json(
        { error: `请填写：${missing.label}` },
        { status: 400 },
      );
    const emailField = (seedActivity.registrationFields || []).find(
      (field) => field.type === "email",
    );
    if (
      emailField &&
      answerData.clean[emailField.id] &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answerData.clean[emailField.id])
    )
      return Response.json({ error: "请填写有效邮箱" }, { status: 400 });
    const phoneField = (seedActivity.registrationFields || []).find(
      (field) => field.type === "tel",
    );
    if (
      phoneField &&
      answerData.clean[phoneField.id] &&
      !/^[0-9+\-\s]{7,24}$/.test(answerData.clean[phoneField.id])
    )
      return Response.json({ error: "请填写有效联系电话" }, { status: 400 });
    canonicalActivityId = seedActivity.id;
    canonicalTitle = seedActivity.title;
    startAt = normalizeDateTime(seedActivity.date) || startAt;
    if (seedActivity.capacity > 0)
      answerData.clean.__capacity = String(seedActivity.capacity);
  }
  if (record) {
    const payload = JSON.parse(String(record.payload));
    if (payload.reviewStatus !== "approved")
      return Response.json({ error: "该活动暂未开放报名" }, { status: 400 });
    if (["报名截止", "已结束", "已满员"].includes(String(payload.status || "")))
      return Response.json({ error: "该活动当前不可报名" }, { status: 400 });
    const deadline = String(payload.deadline || payload.date || "");
    if (deadline && /^\d{4}-\d{2}-\d{2}/.test(deadline)) {
      const closeAt = new Date(`${deadline.slice(0, 10)}T23:59:59+08:00`);
      if (Date.now() > closeAt.getTime())
        return Response.json({ error: "该活动报名已截止" }, { status: 400 });
    }
    const fields = Array.isArray(payload.registrationFields)
      ? (payload.registrationFields as { id?: string; label?: string; required?: boolean; type?: string }[])
      : [];
    const missing = fields.find(
      (field) => field.required && !answerData.clean[String(field.id || "")],
    );
    if (missing)
      return Response.json(
        { error: `请填写：${String(missing.label || "必填信息")}` },
        { status: 400 },
      );
    const emailField = fields.find((field) => field.type === "email");
    if (
      emailField &&
      answerData.clean[String(emailField.id || "")] &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answerData.clean[String(emailField.id)])
    )
      return Response.json({ error: "请填写有效邮箱" }, { status: 400 });
    const phoneField = fields.find((field) => field.type === "tel");
    if (
      phoneField &&
      answerData.clean[String(phoneField.id || "")] &&
      !/^[0-9+\-\s]{7,24}$/.test(answerData.clean[String(phoneField.id)])
    )
      return Response.json({ error: "请填写有效联系电话" }, { status: 400 });
    publisher = String(record.ownerId);
    canonicalActivityId = record.id;
    canonicalTitle = String(payload.title || canonicalTitle).slice(0, 200);
    startAt = normalizeDateTime(payload.startAt || payload.date) || startAt;
    endAt = normalizeDateTime(payload.endAt || payload.endDate) || endAt;
    const capacity = Number(payload.capacity || 0);
    if (capacity > 0) answerData.clean.__capacity = String(capacity);
  }
  const previous = await env.DB.prepare(
    "SELECT id FROM activity_registrations WHERE student_owner_id=? AND activity_id IN (?,?) LIMIT 1",
  )
    .bind(student, body.activityId, canonicalActivityId)
    .first();
  const id = previous ? String(previous.id) : crypto.randomUUID();
  if (previous)
    await env.DB.prepare(
      "UPDATE activity_registrations SET activity_id=?,activity_title=?,publisher_owner_id=?,answers=?,status='pending',review_note='',reviewed_at=NULL,cancelled_at=NULL,updated_at=CURRENT_TIMESTAMP,created_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(
        canonicalActivityId,
        canonicalTitle,
        publisher,
        answerData.json,
        id,
      )
      .run();
  else {
    const capacity = Number(answerData.clean.__capacity || 0);
    delete answerData.clean.__capacity;
    answerData.json = JSON.stringify(answerData.clean);
    const inserted = await env.DB.prepare(
      "INSERT INTO activity_registrations(id,activity_id,activity_title,student_owner_id,publisher_owner_id,answers,status,review_note,reviewed_at,created_at) SELECT ?,?,?,?,?,?,'pending','',NULL,CURRENT_TIMESTAMP WHERE ?<=0 OR (SELECT COUNT(*) FROM activity_registrations WHERE activity_id=? AND status IN ('pending','approved'))<?",
    ).bind(id, canonicalActivityId, canonicalTitle, student, publisher, answerData.json, capacity, canonicalActivityId, capacity).run();
    if (!inserted.meta.changes)
      return Response.json({ error: "该活动报名名额已满" }, { status: 409 });
  }
  await writeAudit(student, "register", "activity", canonicalActivityId);
  await env.DB.prepare("INSERT INTO student_calendar_events(id,student_id,source_type,source_id,title,start_at,end_at,reminder_at,reminder_enabled,status,created_at,updated_at) VALUES(?,?,'activity',?,?,?,?,?,1,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(student_id,source_type,source_id) DO UPDATE SET title=excluded.title,start_at=excluded.start_at,end_at=excluded.end_at,reminder_at=excluded.reminder_at,status='active',updated_at=CURRENT_TIMESTAMP")
    .bind(crypto.randomUUID(), student, canonicalActivityId, canonicalTitle, startAt, endAt, reminderBefore(startAt, 24)).run();
  await notify(
    publisher,
    "new-registration",
    "收到新的活动报名",
    `${canonicalTitle} 有新的学生报名待确认。`,
    registrationReviewScope(publisher) === "ja"
      ? "/ja-console/registrations"
      : "/workspace/enterprise/registrations",
  );
  return Response.json({ ok: true, id, status: "pending" });
}

export async function PATCH(request: Request) {
  await setup();
  const body = (await request.json()) as {
    scope?: RegistrationReviewScope;
    registrationId?: string;
    registrationIds?: string[];
    decision?: "approved" | "rejected";
    note?: string;
  };
  const reviewScope: RegistrationReviewScope =
    body.scope === "ja" ? "ja" : "enterprise";
  const identity =
    reviewScope === "ja"
      ? await requireAdmin(request)
      : await getActor(request, "enterprise");
  if (!identity)
    return Response.json(
      { error: reviewScope === "ja" ? "需要星光计划运营后台权限" : "缺少企业身份" },
      { status: 401 },
    );
  if (reviewScope === "enterprise" && identity.role !== "enterprise")
    return Response.json({ error: "仅活动发布企业可审核报名" }, { status: 403 });
  const publisher = identity.id;
  const ids = [
    ...(Array.isArray(body.registrationIds) ? body.registrationIds : []),
    ...(body.registrationId ? [body.registrationId] : []),
  ].filter((id, index, values) => id && values.indexOf(id) === index);
  if (
    !ids.length ||
    ids.length > 100 ||
    !["approved", "rejected"].includes(String(body.decision))
  )
    return Response.json({ error: "缺少审核决定" }, { status: 400 });
  if (body.decision === "rejected" && !body.note?.trim())
    return Response.json({ error: "退回时请填写原因" }, { status: 400 });
  const placeholders = ids.map(() => "?").join(",");
  const registrations = await env.DB.prepare(
    `SELECT id,activity_id AS activityId,activity_title AS activityTitle,student_owner_id AS studentOwnerId,publisher_owner_id AS publisherOwnerId FROM activity_registrations WHERE id IN (${placeholders})`,
  )
    .bind(...ids)
    .all<{
      id: string;
      activityId: string;
      publisherOwnerId: string;
      studentOwnerId: string;
      activityTitle: string;
    }>();
  if (registrations.results.length !== ids.length)
    return Response.json(
      { error: "部分报名不存在，请刷新后重试" },
      { status: 404 },
    );
  const unauthorized = registrations.results.some(
    (registration) =>
      !canReviewRegistration(
        reviewScope,
        publisher,
        registration.publisherOwnerId,
      ),
  );
  if (unauthorized)
    return Response.json(
      {
        error:
          reviewScope === "ja"
            ? "星光计划只能审核星光计划发起活动的报名"
            : "无权审核其他发布方的报名",
      },
      { status: 403 },
    );

  const reviewNote =
    body.note?.trim() ||
    (body.decision === "approved"
      ? reviewScope === "ja"
        ? "星光计划确认报名通过"
        : "企业确认报名通过"
      : "");
  await env.DB.batch(
    registrations.results.flatMap((registration) => [
      env.DB.prepare(
        "UPDATE activity_registrations SET status=?,review_note=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?",
      ).bind(body.decision, reviewNote, registration.id),
      env.DB.prepare(
        "INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES(?,?,'activity-registration',?)",
      ).bind(
        publisher,
        `${reviewScope}-registration-${body.decision}`,
        registration.id,
      ),
    ]),
  );
  if (body.decision === "approved") {
    await env.DB.batch(
      registrations.results.map((registration, index) =>
        env.DB.prepare(
          "INSERT INTO student_experiences(id,student_id,source_type,source_id,category,title,role,description,output,occurred_at,certified,is_public,sort_order,created_at,updated_at) VALUES(?,?,'platform',?,'成长活动',?,'参与者','通过平台报名并由活动发布方确认。',?,CURRENT_TIMESTAMP,1,1,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(student_id,source_type,source_id) DO UPDATE SET title=excluded.title,output=excluded.output,certified=1,updated_at=CURRENT_TIMESTAMP",
        ).bind(crypto.randomUUID(), registration.studentOwnerId, registration.id, registration.activityTitle, reviewNote || "已完成活动报名确认", 1000 + index),
      ),
    );
  }
  await Promise.all(registrations.results.map((registration) => notify(registration.studentOwnerId, "registration-result", body.decision === "approved" ? "活动报名已通过" : "活动报名需要修改", `${registration.activityTitle}：${reviewNote}`, "/workspace/student/activities")));
  return Response.json({
    ok: true,
    status: body.decision,
    updated: registrations.results.length,
  });
}

export async function DELETE(request: Request) {
  await setup();
  const identity = await getActor(request, "student");
  if (!identity)
    return Response.json({ error: "缺少报名身份" }, { status: 401 });
  if (identity.role !== "student")
    return Response.json({ error: "仅学生账号可取消报名" }, { status: 403 });
  const student = identity.id;
  const id = new URL(request.url).searchParams.get("activityId");
  if (!id) return Response.json({ error: "缺少活动" }, { status: 400 });
  const activityRows = await activities();
  const record = findActivity(activityRows, id);
  const canonicalId = record?.id || id;
  const existing = await env.DB.prepare(
    "SELECT id,status FROM activity_registrations WHERE activity_id=? AND student_owner_id=?",
  )
    .bind(canonicalId, student)
    .first<{ id: string; status: string }>();
  if (!existing)
    return Response.json({ error: "未找到该报名记录" }, { status: 404 });
  if (existing.status === "approved")
    return Response.json(
      { error: "已通过的报名请联系活动发布方取消" },
      { status: 409 },
    );
  await env.DB.prepare(
    "UPDATE activity_registrations SET status='cancelled',cancelled_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE activity_id=? AND student_owner_id=?",
  )
    .bind(canonicalId, student)
    .run();
  await env.DB.prepare("UPDATE student_calendar_events SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE student_id=? AND source_type='activity' AND source_id=?")
    .bind(student, canonicalId).run();
  await writeAudit(student, "cancel-registration", "activity-registration", existing.id);
  return Response.json({ ok: true });
}
