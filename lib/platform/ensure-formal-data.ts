import { formalExperiences, formalRecords, formalRegistrations, formalStudentProfile } from "./formal-seed-data.ts";

type Statement = { bind: (...values: unknown[]) => Statement; first: <T>() => Promise<T | null>; run: () => Promise<unknown> };
type Database = { prepare: (sql: string) => Statement; batch: (statements: Statement[]) => Promise<unknown> };

export async function ensureFormalPlatformData(db: Database) {
  const enterprise = await db.prepare("SELECT id FROM users WHERE role='enterprise' AND status='active' ORDER BY created_at LIMIT 1").first<{ id: string }>();
  const student = await db.prepare("SELECT id FROM users WHERE role='student' AND status='active' ORDER BY created_at LIMIT 1").first<{ id: string }>();
  const enterpriseOwner = enterprise?.id || "demo:enterprise", studentOwner = student?.id || "demo:student", starlightOwner = "ja:formal";
  const existing = await db.prepare("SELECT owner_id AS ownerId FROM workspace_records WHERE id='formal-job-01'").first<{ ownerId: string }>();
  const existingExperience = await db.prepare("SELECT student_id AS studentId FROM student_experiences WHERE id='formal-experience-01'").first<{ studentId: string }>();
  const existingRegistration = await db.prepare("SELECT student_owner_id AS studentOwnerId FROM activity_registrations WHERE id='formal-registration-01'").first<{ studentOwnerId: string }>();
  if (existing?.ownerId === enterpriseOwner && existingExperience?.studentId === studentOwner && existingRegistration?.studentOwnerId === studentOwner) return;

  const records = formalRecords.map((record) => db.prepare("INSERT INTO workspace_records(id,owner_id,kind,payload,version,archived_at,published_at,updated_at) VALUES(?,?,?,?,1,NULL,CASE WHEN json_extract(?,'$.reviewStatus')='approved' THEN CURRENT_TIMESTAMP ELSE NULL END,CURRENT_TIMESTAMP) ON CONFLICT(id) DO NOTHING").bind(record.id, record.owner === "enterprise" ? enterpriseOwner : starlightOwner, record.kind, JSON.stringify(record.payload), JSON.stringify(record.payload)));
  records.push(db.prepare("INSERT INTO workspace_records(id,owner_id,kind,payload,version,archived_at,published_at,updated_at) VALUES('formal-student-profile',?,'student-profile',?,1,NULL,NULL,CURRENT_TIMESTAMP) ON CONFLICT(id) DO NOTHING").bind(studentOwner, JSON.stringify(formalStudentProfile)));
  records.push(db.prepare("INSERT INTO workspace_records(id,owner_id,kind,payload,version,archived_at,published_at,updated_at) VALUES('formal-enterprise-profile',?,'enterprise-profile',?,1,NULL,NULL,CURRENT_TIMESTAMP) ON CONFLICT(id) DO NOTHING").bind(enterpriseOwner, JSON.stringify({ name: "长沙星联数字科技有限公司", industry: "互联网AI", city: "长沙", intro: "面向湖南本地企业提供数字化产品与青年创新实践项目，长期开放产品、数据与内容方向的真实任务。", contactName: "周老师", contactPhone: "0731-88886666", contactEmail: "talent@starlink-hn.example", creditCode: "91430100MA4R8X6K2Y", verificationStatus: "verified" })));
  await db.batch(records);
  await db.batch([
    db.prepare("UPDATE workspace_records SET owner_id=? WHERE owner_id='demo:enterprise' AND id LIKE 'formal-%'").bind(enterpriseOwner),
    db.prepare("UPDATE workspace_records SET owner_id=? WHERE owner_id='demo:student' AND id='formal-student-profile'").bind(studentOwner),
    db.prepare("UPDATE student_experiences SET student_id=? WHERE student_id='demo:student' AND id LIKE 'formal-experience-%'").bind(studentOwner),
    db.prepare("UPDATE activity_registrations SET student_owner_id=? WHERE student_owner_id='demo:student' AND id='formal-registration-01'").bind(studentOwner),
    db.prepare("UPDATE activity_registrations SET publisher_owner_id=? WHERE publisher_owner_id='demo:enterprise' AND id LIKE 'formal-registration-%'").bind(enterpriseOwner),
    db.prepare("INSERT INTO organizations(id,owner_id,name,credit_code,verification_status,verified_by,verified_at,created_at,updated_at) VALUES('formal-organization',?,'长沙星联数字科技有限公司','91430100MA4R8X6K2Y','verified','system',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(owner_id) DO NOTHING").bind(enterpriseOwner),
  ]);
  await db.batch(formalExperiences.map((item) => db.prepare("INSERT INTO student_experiences(id,student_id,source_type,source_id,category,title,role,description,output,evidence_url,evidence_asset_key,occurred_at,certified,is_public,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,'','',?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(id) DO NOTHING").bind(item.id, studentOwner, item.sourceType, item.sourceId, item.category, item.title, item.role, item.description, item.output, item.occurredAt, item.certified, item.isPublic, item.sortOrder)));
  await db.batch(formalRegistrations.map((item) => db.prepare("INSERT INTO activity_registrations(id,activity_id,activity_title,student_owner_id,publisher_owner_id,answers,status,review_note,reviewed_at,updated_at,cancelled_at,attendance_status,created_at) VALUES(?,?,?,?,?,?,?, ?,CASE WHEN ? IN ('approved','rejected','waitlisted') THEN CURRENT_TIMESTAMP ELSE NULL END,CURRENT_TIMESTAMP,CASE WHEN ?='cancelled' THEN CURRENT_TIMESTAMP ELSE NULL END,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO NOTHING").bind(item.id, item.activityId, item.activityTitle, item.studentSlug === "primary" ? studentOwner : `formal:${item.studentSlug}`, item.publisher === "enterprise" ? enterpriseOwner : starlightOwner, JSON.stringify(item.answers), item.status, item.reviewNote, item.status, item.status, item.attendanceStatus)));
}
