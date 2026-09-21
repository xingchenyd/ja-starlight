import { env } from "cloudflare:workers";
import { getActor, requireAdmin } from "../../../db/runtime";
import { ensureChallengeSchema } from "../../../db/challenges";
import { deadlineAt, normalizeChallenge, safeEvidenceUrl, validateChallenge } from "../../../lib/challenges/model";

type Team = { id: string; activity_id: string; captain_id: string; name: string; status: string; submission: string; review: string; version: number };
type ActivityRow = { id: string; owner_id: string; payload: string; archived_at: string | null };
const fail = (error: string, status = 400) => Response.json({ error }, { status });
const json = (value: string) => JSON.parse(value || "{}");
async function digest(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}
async function serialize(team: Team, captain = false) {
  const members = await env.DB.prepare("SELECT m.student_id AS id,COALESCE(NULLIF(json_extract(r.answers,'$.name'),''),u.name) AS name,m.joined_at AS joinedAt FROM challenge_members m JOIN users u ON u.id=m.student_id LEFT JOIN activity_registrations r ON r.student_owner_id=m.student_id AND r.activity_id=m.activity_id WHERE team_id=? ORDER BY joined_at,m.student_id").bind(team.id).all();
  const invites = captain ? (await env.DB.prepare("SELECT id,email,expires_at AS expiresAt,consumed_at AS consumedAt,revoked_at AS revokedAt FROM challenge_invites WHERE team_id=? ORDER BY created_at DESC LIMIT 100").bind(team.id).all()).results : [];
  return { id: team.id, activityId: team.activity_id, captainId: team.captain_id, name: team.name, status: team.status, version: team.version, submission: json(team.submission), review: json(team.review), members: members.results, invites };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");
  const actor = scope === "ja" ? await requireAdmin(request) : await getActor(request);
  if (!actor) return fail("请先登录", 401);
  await ensureChallengeSchema();
  if (scope === "ja" || scope === "enterprise") {
    if (scope === "enterprise" && actor.role !== "enterprise") return fail("无权查看评审工作台", 403);
    const rows = await env.DB.prepare(`SELECT t.*,w.payload AS activityPayload FROM challenge_teams t JOIN workspace_records w ON w.id=t.activity_id WHERE ${scope === "ja" ? "w.owner_id LIKE 'ja:%'" : "w.owner_id=?"} ORDER BY t.updated_at DESC LIMIT 500`).bind(...(scope === "ja" ? [] : [actor.id])).all<Team & { activityPayload: string }>();
    return Response.json({ teams: await Promise.all(rows.results.map(async row => ({ ...await serialize(row), activityTitle: json(row.activityPayload).title, challenge: normalizeChallenge(json(row.activityPayload).challenge) }))) });
  }
  if (actor.role !== "student") return fail("仅学生可查看自己的参赛团队", 403);
  const activityId = url.searchParams.get("activityId") || "";
  const team = await env.DB.prepare("SELECT t.* FROM challenge_teams t JOIN challenge_members m ON m.team_id=t.id WHERE m.activity_id=? AND m.student_id=?").bind(activityId, actor.id).first<Team>();
  return Response.json({ actorId: actor.id, team: team ? await serialize(team, team.captain_id === actor.id) : null });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return fail("请求格式不正确");
  const action = String(body.action || "");
  const actor = body.scope === "ja" ? await requireAdmin(request) : await getActor(request);
  if (!actor) return fail("请先登录", 401);
  await ensureChallengeSchema();
  const teamId = String(body.teamId || "");
  let team = teamId ? await env.DB.prepare("SELECT * FROM challenge_teams WHERE id=?").bind(teamId).first<Team>() : null;
  let invite: { id: string; team_id: string; email: string; expires_at: string; consumed_at: string | null; revoked_at: string | null } | null = null;
  if (action === "join") {
    const code = String(body.code || "").trim();
    if (code.length < 32 || code.length > 100) return fail("邀请码不正确");
    invite = await env.DB.prepare("SELECT * FROM challenge_invites WHERE token_hash=?").bind(await digest(code)).first();
    if (!invite || invite.consumed_at || invite.revoked_at || Date.parse(invite.expires_at) < Date.now() || invite.email !== actor.email.toLowerCase()) return fail("邀请无效、已过期，或不是发给当前登录邮箱的邀请", 403);
    team = await env.DB.prepare("SELECT * FROM challenge_teams WHERE id=?").bind(invite.team_id).first<Team>();
  }
  const activityId = team?.activity_id || String(body.activityId || "");
  if (body.activityId && String(body.activityId) !== activityId) return fail("该邀请或团队属于另一场活动，请到对应活动中操作", 409);
  const activity = await env.DB.prepare("SELECT id,owner_id,payload,archived_at FROM workspace_records WHERE id=? AND kind='activity'").bind(activityId).first<ActivityRow>();
  if (!activity) return fail("活动不存在", 404);
  const payload = json(activity.payload);
  const spec = normalizeChallenge(payload.challenge);
  if (!spec.enabled || validateChallenge(spec).length) return fail("该活动尚未配置完整的竞赛规则", 409);
  const reviewing = action === "review";
  if (reviewing) {
    if (!(actor.role === "enterprise" && activity.owner_id === actor.id || actor.role === "admin" && activity.owner_id.startsWith("ja:"))) return fail("只有本场竞赛主办方可评审", 403);
  } else {
    if (actor.role !== "student") return fail("仅学生可参赛", 403);
    if (activity.archived_at || payload.reviewStatus !== "approved" || ["已结束", "已下线", "已归档"].includes(payload.status)) return fail("当前活动不开放参赛操作", 409);
    const registration = await env.DB.prepare("SELECT id FROM activity_registrations WHERE activity_id=? AND student_owner_id=? AND status='approved'").bind(activity.id, actor.id).first();
    if (!registration) return fail("请先完成本活动报名并等待主办方审核通过", 403);
  }
  try {
    if (action === "create") {
      if (Date.now() > deadlineAt(spec.registrationDeadline)) return fail("组队时间已截止", 409);
      const name = String(body.name || "").trim();
      if (name.length < 2 || name.length > 60) return fail("团队名称须为 2–60 字");
      const existing = await env.DB.prepare("SELECT team_id FROM challenge_members WHERE activity_id=? AND student_id=?").bind(activity.id, actor.id).first();
      if (existing) return fail("你已加入本场活动的团队", 409);
      const id = crypto.randomUUID();
      const created = await env.DB.batch([
        env.DB.prepare("INSERT INTO challenge_teams(id,activity_id,captain_id,name) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM workspace_records WHERE id=? AND payload=? AND archived_at IS NULL)").bind(id, activity.id, actor.id, name, activity.id, activity.payload),
        env.DB.prepare("INSERT INTO challenge_members(activity_id,student_id,team_id) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM challenge_teams WHERE id=?)").bind(activity.id, actor.id, id, id),
        env.DB.prepare("INSERT INTO audit_logs(actor_id,action,target_type,target_id) SELECT ?,'create-team','challenge',? WHERE EXISTS(SELECT 1 FROM challenge_teams WHERE id=?)").bind(actor.id, id, id),
      ]);
      if (!created[0].meta.changes) return fail("活动信息刚刚更新，请刷新任务书后重试", 409);
      return Response.json({ ok: true, teamId: id });
    }
    if (!team) return fail("团队不存在", 404);
    if (!reviewing && action !== "join") {
      const member = await env.DB.prepare("SELECT student_id FROM challenge_members WHERE team_id=? AND student_id=?").bind(team.id, actor.id).first();
      if (!member) return fail("无权操作该团队", 403);
      if (action !== "leave" && team.captain_id !== actor.id) return fail("此操作仅限队长", 403);
    }
    const expected = Number(body.version);
    if (action !== "join" && expected !== team.version) return fail("团队内容已更新，请刷新后重试", 409);
    const mutation = crypto.randomUUID();
    const condition = "EXISTS(SELECT 1 FROM challenge_teams WHERE id=? AND mutation_key=?)";
    const statements = [action === "join" && invite
      ? env.DB.prepare("UPDATE challenge_teams SET version=version+1,mutation_key=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND EXISTS(SELECT 1 FROM challenge_invites WHERE id=? AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at>?)").bind(mutation, team.id, team.version, invite.id, new Date().toISOString())
      : env.DB.prepare("UPDATE challenge_teams SET version=version+1,mutation_key=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=?").bind(mutation, team.id, team.version)];
    let response: Record<string, unknown> = {};
    if (["invite", "revoke", "join", "leave"].includes(action)) {
      if (team.status !== "forming" || Date.now() > deadlineAt(spec.registrationDeadline)) return fail("团队名单已锁定，不能再调整成员", 409);
      if (action === "invite") {
        const email = String(body.email || "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || email === actor.email.toLowerCase()) return fail("请填写队员的登录邮箱");
        const code = crypto.randomUUID() + crypto.randomUUID();
        const expiry = new Date(Math.min(Date.now() + 7 * 86400000, deadlineAt(spec.registrationDeadline))).toISOString();
        statements.push(env.DB.prepare(`UPDATE challenge_invites SET revoked_at=CURRENT_TIMESTAMP WHERE team_id=? AND email=? AND consumed_at IS NULL AND ${condition}`).bind(team.id, email, team.id, mutation));
        statements.push(env.DB.prepare(`INSERT INTO challenge_invites(id,team_id,email,token_hash,expires_at) SELECT ?,?,?,?,? WHERE ${condition}`).bind(crypto.randomUUID(), team.id, email, await digest(code), expiry, team.id, mutation));
        response = { code, expiresAt: expiry };
      } else if (action === "revoke") {
        statements.push(env.DB.prepare(`UPDATE challenge_invites SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND team_id=? AND consumed_at IS NULL AND ${condition}`).bind(String(body.inviteId || ""), team.id, team.id, mutation));
      } else if (action === "join" && invite) {
        const existing = await env.DB.prepare("SELECT team_id FROM challenge_members WHERE activity_id=? AND student_id=?").bind(activity.id, actor.id).first();
        if (existing) return fail("每位学生在同一竞赛只能加入一个团队", 409);
        const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM challenge_members WHERE team_id=?").bind(team.id).first<{ n: number }>();
        if (Number(count?.n) >= spec.teamMax) return fail("该团队人数已满", 409);
        statements.push(env.DB.prepare(`INSERT INTO challenge_members(activity_id,student_id,team_id) SELECT ?,?,? WHERE ${condition}`).bind(activity.id, actor.id, team.id, team.id, mutation));
        statements.push(env.DB.prepare(`UPDATE challenge_invites SET consumed_at=CURRENT_TIMESTAMP WHERE id=? AND ${condition}`).bind(invite.id, team.id, mutation));
      } else if (action === "leave") {
        if (team.captain_id === actor.id) return fail("队长不能退出自己的团队；如需调整队长请联系主办方", 409);
        statements.push(env.DB.prepare(`DELETE FROM challenge_members WHERE team_id=? AND student_id=? AND ${condition}`).bind(team.id, actor.id, team.id, mutation));
      }
    } else if (action === "submit") {
      if (!["forming", "revision_requested"].includes(team.status)) return fail("当前成果不能重复提交", 409);
      if (Date.now() > deadlineAt(spec.submissionDeadline) && team.status !== "revision_requested") return fail("成果提交已截止", 409);
      const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM challenge_members WHERE team_id=?").bind(team.id).first<{ n: number }>();
      if (Number(count?.n) < spec.teamMin || Number(count?.n) > spec.teamMax) return fail(`提交时团队须有 ${spec.teamMin}–${spec.teamMax} 人`, 409);
      const title = String(body.title || "").trim(), summary = String(body.summary || "").trim();
      if (title.length < 2 || title.length > 120 || summary.length < 20 || summary.length > 10000) return fail("成果名称须为 2–120 字，成果说明须为 20–10000 字");
      const submission = { title, summary, url: safeEvidenceUrl(body.url), submittedAt: new Date().toISOString() };
      statements.push(env.DB.prepare(`UPDATE challenge_teams SET status='submitted',submission=? WHERE id=? AND mutation_key=?`).bind(JSON.stringify(submission), team.id, mutation));
      statements.push(env.DB.prepare(`INSERT INTO challenge_history(id,team_id,actor_id,action,payload) SELECT ?,?,?,'submit',? WHERE ${condition}`).bind(crypto.randomUUID(), team.id, actor.id, JSON.stringify(submission), team.id, mutation));
    } else if (reviewing) {
      if (team.status !== "submitted") return fail("仅待评审成果可处理，请刷新列表", 409);
      const decision = String(body.decision || ""), note = String(body.note || "").trim();
      if (!["revision_requested", "completed", "awarded"].includes(decision) || note.length < 2 || note.length > 5000) return fail("请选择结果，并填写 2–5000 字的评审意见");
      const score = body.score === "" || body.score == null ? null : Number(body.score);
      if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) return fail("评分须为 0–100 分");
      const award = String(body.award || "").trim(), referral = String(body.referral || "").trim();
      if (award.length > 1000 || referral.length > 1000 || decision === "awarded" && !award) return fail("获奖须填写奖励说明；奖励与推荐说明各不超过 1000 字");
      const review = { decision, note, score, award, referral, reviewedAt: new Date().toISOString(), fulfillment: "由主办方线下兑现，平台记录结果" };
      statements.push(env.DB.prepare("UPDATE challenge_teams SET status=?,review=? WHERE id=? AND mutation_key=?").bind(decision, JSON.stringify(review), team.id, mutation));
      statements.push(env.DB.prepare(`INSERT INTO challenge_history(id,team_id,actor_id,action,payload) SELECT ?,?,?,'review',? WHERE ${condition}`).bind(crypto.randomUUID(), team.id, actor.id, JSON.stringify(review), team.id, mutation));
      if (decision !== "revision_requested") {
        const submission = json(team.submission);
        statements.push(env.DB.prepare(`INSERT INTO student_experiences(id,student_id,source_type,source_id,category,title,role,description,output,evidence_url,occurred_at,certified,is_public,sort_order) SELECT 'challenge:'||m.team_id||':'||m.student_id,m.student_id,'platform','challenge:'||m.team_id,'命题挑战',?,CASE WHEN m.student_id=? THEN '队长' ELSE '队员' END,?,?,?,CURRENT_TIMESTAMP,1,0,1000 FROM challenge_members m WHERE m.team_id=? AND ${condition} ON CONFLICT(student_id,source_type,source_id) DO UPDATE SET description=excluded.description,output=excluded.output,certified=1,updated_at=CURRENT_TIMESTAMP`).bind(String(payload.title), team.captain_id, String(submission.summary || ""), [submission.title, note, award, referral].filter(Boolean).join("\n"), String(submission.url || ""), team.id, team.id, mutation));
      }
      statements.push(env.DB.prepare(`INSERT INTO notifications(id,user_id,type,title,body,target_url) SELECT ?||':'||student_id,student_id,'challenge-result','竞赛成果评审有更新',?,'/workspace/student/activities?item='||? FROM challenge_members WHERE team_id=? AND ${condition}`).bind(crypto.randomUUID(), `${payload.title}：${note}`, activity.id, team.id, team.id, mutation));
    } else return fail("不支持的操作");
    statements.push(env.DB.prepare(`INSERT INTO audit_logs(actor_id,action,target_type,target_id) SELECT ?,?,'challenge',? WHERE ${condition}`).bind(actor.id, action, team.id, team.id, mutation));
    const result = await env.DB.batch(statements);
    if (!result[0].meta.changes) return fail("其他成员刚刚更新了团队，请刷新后重试", 409);
    return Response.json({ ok: true, ...response });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("成果链接")) return fail(error.message);
    console.error("Challenge operation failed", action, error instanceof Error ? error.name : "Error");
    return fail("操作未完成，请刷新确认后重试；已保存的数据不会被覆盖", 409);
  }
}
