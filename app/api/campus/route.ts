import { env } from "cloudflare:workers";
import { writeAudit } from "../../../db/runtime";
import { businessContext, campusError, CampusError, managesSchool, hasBusinessRole, requiredText, assertMutationOrigin, campusPepper } from "../../../lib/campus/access";
import { hashOpaqueToken, randomToken, validateEmail } from "../../../lib/auth/crypto";

export async function GET(request: Request) {
  try {
    const context = await businessContext(request), { actor } = context;
    if (!actor) throw new CampusError("请先登录", 401);
    const schools = (await env.DB.prepare("SELECT id,name,status FROM schools WHERE status='active' ORDER BY name").all()).results;
    const membership = actor.role === "student" ? await env.DB.prepare("SELECT m.school_id AS schoolId,s.name AS schoolName,m.status,m.note,m.reviewed_at AS reviewedAt FROM school_memberships m JOIN schools s ON s.id=m.school_id WHERE student_id=?").bind(actor.id).first() : null;
    const schoolId = new URL(request.url).searchParams.get("schoolId") || context.grants.find(g => g.schoolId)?.schoolId || (context.owner ? String(schools[0]?.id || "") : "");
    const leadership = hasBusinessRole(context, "project_lead");
    // A project leader sees counts, not private signup answers, contact details or CVs.
    const summary = context.owner || leadership ? (await env.DB.prepare("SELECT s.id,s.name,(SELECT COUNT(*) FROM school_memberships m WHERE m.school_id=s.id AND m.status='verified') AS students,(SELECT COUNT(*) FROM business_grants g WHERE g.school_id=s.id AND g.status='active' AND g.role='campus_partner') AS partners FROM schools s WHERE s.status='active' ORDER BY s.name").all()).results : [];
    const page = Math.max(1, Math.min(10000, Number(new URL(request.url).searchParams.get("page")) || 1));
    let members: Record<string, unknown>[] = [], total = 0;
    if (schoolId && managesSchool(context, schoolId)) {
      total = Number((await env.DB.prepare("SELECT COUNT(*) AS n FROM school_memberships WHERE school_id=?").bind(schoolId).first<{ n: number }>())?.n || 0);
      members = (await env.DB.prepare("SELECT u.id,COALESCE(NULLIF(json_extract(w.payload,'$.name'),''),u.name) AS name,m.status,m.created_at AS joinedAt,m.note,json_extract(w.payload,'$.major') AS major,json_extract(w.payload,'$.grade') AS grade,(SELECT COUNT(*) FROM activity_registrations r WHERE r.student_owner_id=u.id AND r.status='approved') AS activities,(SELECT COUNT(*) FROM student_experiences e WHERE e.student_id=u.id AND e.is_public=1) AS publicExperiences FROM school_memberships m JOIN users u ON u.id=m.student_id LEFT JOIN workspace_records w ON w.owner_id=u.id AND w.kind='student-profile' AND w.archived_at IS NULL WHERE m.school_id=? ORDER BY m.status='pending' DESC,m.created_at DESC,u.id LIMIT 50 OFFSET ?").bind(schoolId, (page - 1) * 50).all()).results;
    }
    const grants = context.owner ? (await env.DB.prepare("SELECT g.id,g.user_id AS userId,u.name,u.email,g.role,g.school_id AS schoolId,s.name AS schoolName,g.status,g.created_at AS createdAt,g.revoked_reason AS revokedReason FROM business_grants g JOIN users u ON u.id=g.user_id LEFT JOIN schools s ON s.id=g.school_id ORDER BY g.created_at DESC LIMIT 500").all()).results : [];
    return Response.json({ actor, owner: context.owner, roles: context.grants, schools, membership, selectedSchool: schoolId, members, page, total, summary, grants }, { headers: { "cache-control": "no-store" } });
  } catch (error) { return campusError(error); }
}

export async function POST(request: Request) {
  try {
    assertMutationOrigin(request);
    const context = await businessContext(request), { actor } = context;
    if (!actor) throw new CampusError("请先登录", 401);
    const body = await request.json() as Record<string, unknown>, action = String(body.action || "");
    if (action === "join") {
      if (actor.role !== "student") throw new CampusError("仅学生可申请加入学校", 403);
      const schoolId = requiredText(body.schoolId, "学校");
      if (!await env.DB.prepare("SELECT id FROM schools WHERE id=? AND status='active'").bind(schoolId).first()) throw new CampusError("学校不存在", 404);
      const current = await env.DB.prepare("SELECT school_id,status FROM school_memberships WHERE student_id=?").bind(actor.id).first<{ school_id: string; status: string }>();
      if (current?.status === "verified") throw new CampusError("已核验的学籍请联系技术负责人变更，不能自行覆盖", 409);
      await env.DB.prepare("INSERT INTO school_memberships(student_id,school_id,status) VALUES(?,?,'pending') ON CONFLICT(student_id) DO UPDATE SET school_id=excluded.school_id,status='pending',note='',reviewed_by=NULL,reviewed_at=NULL,updated_at=CURRENT_TIMESTAMP").bind(actor.id, schoolId).run();
    } else if (action === "review-membership") {
      const studentId = requiredText(body.studentId, "学生"), schoolId = requiredText(body.schoolId, "学校");
      if (!managesSchool(context, schoolId)) throw new CampusError("没有该校学籍核验权限", 403);
      if (studentId === actor.id && !context.owner) throw new CampusError("不能核验自己的学籍", 403);
      const status = body.decision === "approved" ? "verified" : body.decision === "rejected" ? "rejected" : "";
      if (!status) throw new CampusError("请选择核验结果");
      const note = status === "rejected" ? requiredText(body.note, "退回原因", 1000) : String(body.note || "").slice(0, 1000);
      const result = await env.DB.prepare("UPDATE school_memberships SET status=?,note=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE student_id=? AND school_id=? AND status='pending'").bind(status, note, actor.id, studentId, schoolId).run();
      if (!result.meta.changes) throw new CampusError("申请已处理或不属于该校，请刷新", 409);
    } else {
      if (!context.owner) throw new CampusError("仅技术负责人可管理学校和任命权限", 403);
      if (action === "create-school") {
        const name = requiredText(body.name, "学校名称", 100);
        if (await env.DB.prepare("SELECT id FROM schools WHERE name=?").bind(name).first()) throw new CampusError("学校已存在", 409);
        await env.DB.prepare("INSERT INTO schools(id,name) VALUES(?,?)").bind(crypto.randomUUID(), name).run();
      } else if (action === "grant") {
        const email = validateEmail(body.email), role = String(body.role || ""), schoolId = role === "campus_partner" ? requiredText(body.schoolId, "学校") : null;
        if (!["campus_partner", "content_reviewer", "project_lead"].includes(role)) throw new CampusError("授权角色不正确");
        const user = await env.DB.prepare("SELECT id,role FROM users WHERE lower(email)=? AND status='active'").bind(email).first<{ id: string; role: string }>();
        if (!user || !["student", "operator"].includes(user.role)) throw new CampusError("请先注册学生账号，或邀请校外运营人员激活账号");
        if (role === "campus_partner") {
          if (user.role !== "student") throw new CampusError("星光伙伴必须保留学生身份");
          if (!await env.DB.prepare("SELECT m.student_id FROM school_memberships m JOIN schools s ON s.id=m.school_id WHERE student_id=? AND school_id=? AND m.status='verified' AND s.status='active'").bind(user.id, schoolId).first()) throw new CampusError("请先完成该学生的本校学籍核验");
        }
        if (await env.DB.prepare("SELECT id FROM business_grants WHERE user_id=? AND role=? AND COALESCE(school_id,'')=COALESCE(?,'') AND status='active'").bind(user.id, role, schoolId).first()) throw new CampusError("该授权已生效，无需重复任命", 409);
        const id = crypto.randomUUID();
        const statements = [env.DB.prepare("INSERT INTO business_grants(id,user_id,role,school_id,granted_by) VALUES(?,?,?,?,?)").bind(id, user.id, role, schoolId, actor.id)];
        if (role === "campus_partner") {
          const school = await env.DB.prepare("SELECT name FROM schools WHERE id=?").bind(schoolId).first<{ name: string }>();
          statements.push(env.DB.prepare("INSERT INTO student_experiences(id,student_id,source_type,source_id,category,title,role,description,output,occurred_at,certified,is_public) VALUES(?,?,'campus-appointment',?,'校园运营',?,'星光伙伴','由平台正式任命，负责本校学生协同与校园运营。','任职中 · 平台认证',CURRENT_TIMESTAMP,1,0)").bind(crypto.randomUUID(), user.id, id, `${school?.name} · 星光伙伴任职`));
        }
        await env.DB.batch(statements);
      } else if (action === "revoke") {
        const id = requiredText(body.id, "授权"), reason = requiredText(body.reason, "撤销原因", 1000);
        if (!await env.DB.prepare("SELECT id FROM business_grants WHERE id=? AND status='active'").bind(id).first()) throw new CampusError("授权已撤销或不存在，请刷新", 409);
        await env.DB.batch([
          env.DB.prepare("UPDATE business_grants SET status='revoked',revoked_at=CURRENT_TIMESTAMP,revoked_by=?,revoked_reason=? WHERE id=? AND status='active'").bind(actor.id, reason, id),
          env.DB.prepare("SELECT CASE WHEN changes()=1 THEN 1 ELSE json('grant-already-revoked') END"),
          env.DB.prepare("UPDATE student_experiences SET certified=0,output='任职已结束 · 有效标识已撤销',updated_at=CURRENT_TIMESTAMP WHERE source_type='campus-appointment' AND source_id=? AND EXISTS(SELECT 1 FROM business_grants WHERE id=? AND status='revoked')").bind(id, id),
        ]);
      } else if (action === "invite-operator") {
        const email = validateEmail(body.email), name = requiredText(body.name, "姓名", 60);
        if (await env.DB.prepare("SELECT id FROM users WHERE lower(email)=?").bind(email).first()) throw new CampusError("邮箱已有账号，请直接授予业务权限", 409);
        const token = randomToken(32), id = crypto.randomUUID();
        await env.DB.batch([
          env.DB.prepare("UPDATE business_invitations SET consumed_at=CURRENT_TIMESTAMP WHERE email=? AND consumed_at IS NULL").bind(email),
          env.DB.prepare("INSERT INTO business_invitations(id,email,name,token_hash,expires_at,created_by) VALUES(?,?,?,?,?,?)").bind(id, email, name, await hashOpaqueToken(token, campusPepper()), new Date(Date.now() + 7 * 86400_000).toISOString(), actor.id),
        ]);
        await writeAudit(actor.id, action, "business-invitation", id);
        return Response.json({ ok: true, activationUrl: `${new URL(request.url).origin}/operations/activate?token=${token}`, message: "邀请链接七天有效、仅可使用一次；激活后再授予业务权限。" }, { headers: { "cache-control": "no-store" } });
      } else throw new CampusError("操作类型不正确");
    }
    await writeAudit(actor.id, action, "campus", String(body.id || body.studentId || body.schoolId || body.email || "school"));
    return Response.json({ ok: true });
  } catch (error) { return campusError(error); }
}
