"use client";
import { useCallback, useEffect, useState } from "react";
import { challengeStatus } from "../../lib/challenges/model";

type Team = { id: string; activityId: string; activityTitle?: string; captainId: string; name: string; status: string; version: number; members: { id: string; name: string }[]; invites: { id: string; email: string; expiresAt: string; consumedAt: string | null; revokedAt: string | null }[]; submission: { title?: string; summary?: string; url?: string; submittedAt?: string }; review: { note?: string; score?: number | null; award?: string; referral?: string; fulfillment?: string } };
async function api(body: Record<string, unknown>) {
  const response = await fetch("/api/challenges", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "操作失败，请稍后重试");
  return result;
}
function Result({ team }: { team: Team }) {
  if (!team.review.note) return null;
  return <section className="challenge-result"><h4>{challengeStatus[team.status] || "评审意见"}</h4><p>{team.review.note}</p>{team.review.score != null && <p>评分：{team.review.score} / 100</p>}{team.review.award && <p>奖励：{team.review.award}</p>}{team.review.referral && <p>实习推荐：{team.review.referral}</p>}<p>{team.review.fulfillment}</p>{["completed", "awarded"].includes(team.status) && <p>认证经历已写入团队成员的成长时间轴，默认不对外分享。</p>}</section>;
}

export function StudentChallenge({ activityId }: { activityId: string }) {
  const [team, setTeam] = useState<Team | null>(null), [actorId, setActorId] = useState(""), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [name, setName] = useState(""), [code, setCode] = useState(""), [email, setEmail] = useState(""), [inviteCode, setInviteCode] = useState("");
  const [submission, setSubmission] = useState({ title: "", summary: "", url: "" });
  const reload = useCallback(async () => {
    const response = await fetch(`/api/challenges?activityId=${encodeURIComponent(activityId)}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "团队加载失败");
    setTeam(result.team); setActorId(result.actorId);
    return result.team as Team | null;
  }, [activityId]);
  useEffect(() => { let alive = true; const load = async () => {
    try { const next = await reload(); if (alive && next?.submission) setSubmission({ title: next.submission.title || "", summary: next.submission.summary || "", url: next.submission.url || "" }); }
    catch (e) { if (alive) setError(e instanceof Error ? e.message : "团队加载失败"); }
    finally { if (alive) setLoading(false); }
  }; void load(); return () => { alive = false; }; }, [reload]);
  const run = async (action: string, values: Record<string, unknown> = {}) => {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await api({ action, activityId, teamId: team?.id, version: team?.version, ...values });
      if (result.code) setInviteCode(result.code);
      await reload(); setMessage("已保存");
    } catch (e) { setError(e instanceof Error ? e.message : "网络异常，请重试"); }
    finally { setBusy(false); }
  };
  const captain = team?.captainId === actorId;
  return <section className="challenge-surface challenge-student"><h3>我的参赛团队</h3><p>邀请绑定队员登录邮箱，队员须先报名通过，再输入邀请码确认加入。</p>
    {error && <p role="alert" className="field-error">{error}<button type="button" onClick={() => void reload().then(() => setError("")).catch(e => setError(e.message))}>重新加载</button></p>}{message && <p role="status">{message}</p>}
    {loading ? <p>正在加载团队…</p> : !team ? <div className="challenge-form-grid"><label><span>创建团队</span><input value={name} maxLength={60} onChange={e => setName(e.target.value)} placeholder="团队名称" /><button type="button" className="primary-btn" disabled={busy} onClick={() => void run("create", { name })}>创建并担任队长</button></label><label><span>接受邀请</span><input value={code} onChange={e => setCode(e.target.value)} placeholder="粘贴队长发给你的邀请码" /><button type="button" className="secondary-btn" disabled={busy} onClick={() => void run("join", { code })}>确认加入团队</button></label></div> : <>
      <div className="challenge-team-heading"><h4>{team.name}</h4><span>{challengeStatus[team.status]}</span></div><ul className="challenge-members">{team.members.map(m => <li key={m.id}><b>{m.name || "未填写姓名"}</b><span>{m.id === team.captainId ? "队长" : "队员"}{m.id === actorId ? " · 我" : ""}</span></li>)}</ul>
      {team.status === "forming" && (captain ? <><label><span>邀请队员的登录邮箱</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></label><button type="button" className="secondary-btn" disabled={busy} onClick={() => void run("invite", { email })}>生成专属邀请码</button>{inviteCode && <div className="challenge-invite"><p>将此码发给对应队员。仅本次显示，请及时复制。</p><textarea readOnly value={inviteCode} rows={3} aria-label="专属邀请码" /><button type="button" onClick={() => void navigator.clipboard.writeText(inviteCode).then(() => setMessage("邀请码已复制")).catch(() => setError("无法自动复制，请选中上方文字手动复制"))}>复制邀请码</button></div>}<ul>{team.invites.filter(i => !i.consumedAt && !i.revokedAt).map(i => <li key={i.id}>{i.email} · {new Date(i.expiresAt).toLocaleDateString("zh-CN")} 到期 <button type="button" disabled={busy} onClick={() => void run("revoke", { inviteId: i.id })}>撤销邀请</button></li>)}</ul></> : <button type="button" className="secondary-btn" disabled={busy} onClick={() => { if (window.confirm("确认退出当前团队？")) void run("leave"); }}>退出团队</button>)}
      <Result team={team} />
      {captain && ["forming", "revision_requested"].includes(team.status) ? <div className="challenge-submission"><h4>提交团队成果</h4><p>提交后锁定成员名单，主办方可要求补充成果。请勿在链接中包含无权公开的企业数据。</p><label><span>成果名称 *</span><input value={submission.title} maxLength={120} onChange={e => setSubmission(v => ({ ...v, title: e.target.value }))} /></label><label><span>完成了什么、如何验证、取得了什么结果 *</span><textarea rows={6} maxLength={10000} value={submission.summary} onChange={e => setSubmission(v => ({ ...v, summary: e.target.value }))} /></label><label><span>成果访问链接（选填）</span><input type="url" value={submission.url} onChange={e => setSubmission(v => ({ ...v, url: e.target.value }))} placeholder="https://" /></label><button type="button" className="primary-btn" disabled={busy} onClick={() => { if (window.confirm("确认代表全体队员提交成果？提交后团队名单将锁定。")) void run("submit", submission); }}>提交主办方评审</button></div> : team.submission.title ? <div><h4>{team.submission.title}</h4><p className="challenge-prose">{team.submission.summary}</p>{team.submission.url && <a href={team.submission.url} target="_blank" rel="noopener noreferrer">查看团队成果 ↗</a>}</div> : <p>由队长统一提交团队成果，提交后所有成员可查看。</p>}
    </>}
  </section>;
}

function ReviewCard({ team, scope, refresh }: { team: Team; scope: "enterprise" | "ja"; refresh: () => Promise<void> }) {
  const [expanded, setExpanded] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [form, setForm] = useState({ decision: "completed", score: "", note: "", award: "", referral: "" });
  const submit = async () => {
    setBusy(true); setError("");
    try { await api({ action: "review", scope, teamId: team.id, version: team.version, ...form }); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "评审保存失败"); }
    finally { setBusy(false); }
  };
  return <article className="challenge-review-card"><button type="button" className="challenge-review-toggle" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}><span><b>{team.name}</b><span>{team.activityTitle} · {team.members.length} 人</span></span><span>{challengeStatus[team.status]} {expanded ? "−" : "+"}</span></button>{expanded && <div className="challenge-review-detail"><p>{team.members.map(m => `${m.name || "未填写姓名"}${m.id === team.captainId ? "（队长）" : ""}`).join("、")}</p><h4>{team.submission.title || "尚未提交成果"}</h4><p className="challenge-prose">{team.submission.summary}</p>{team.submission.url && <a href={team.submission.url} target="_blank" rel="noopener noreferrer">查看成果链接 ↗</a>}<Result team={team} />{team.status === "submitted" && <div className="challenge-review-form"><label><span>评审结果</span><select value={form.decision} onChange={e => setForm(v => ({ ...v, decision: e.target.value }))}><option value="completed">完成评审，生成认证经历</option><option value="awarded">获奖，生成认证经历</option><option value="revision_requested">退回补充（允许截止后补交）</option></select></label><label><span>评分（选填，0–100）</span><input type="number" min={0} max={100} value={form.score} onChange={e => setForm(v => ({ ...v, score: e.target.value }))} /></label><label><span>评审意见 *</span><textarea rows={4} maxLength={5000} value={form.note} onChange={e => setForm(v => ({ ...v, note: e.target.value }))} /></label><label><span>奖励与线下兑现说明</span><textarea maxLength={1000} value={form.award} onChange={e => setForm(v => ({ ...v, award: e.target.value }))} /></label><label><span>实习推荐与后续安排</span><textarea maxLength={1000} value={form.referral} onChange={e => setForm(v => ({ ...v, referral: e.target.value }))} /></label>{error && <p role="alert" className="field-error">{error}</p>}<button type="button" className="primary-btn" disabled={busy} onClick={() => { if (window.confirm("确认将评审结果发送给全体队员？")) void submit(); }}>{busy ? "正在保存…" : "确认评审结果"}</button></div>}</div>}</article>;
}

export function ChallengeReviewDesk({ scope }: { scope: "enterprise" | "ja" }) {
  const [teams, setTeams] = useState<Team[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(""), [filter, setFilter] = useState("all");
  const reload = useCallback(async () => {
    const response = await fetch(`/api/challenges?scope=${scope}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "加载失败");
    setTeams(result.teams); setError("");
  }, [scope]);
  useEffect(() => { let alive = true; const load = async () => { try { await reload(); } catch (e) { if (alive) setError(e instanceof Error ? e.message : "加载失败"); } finally { if (alive) setLoading(false); } }; void load(); return () => { alive = false; }; }, [reload]);
  return <section className="challenge-surface challenge-review-desk"><div className="challenge-team-heading"><div><span className="challenge-eyebrow">团队与成果</span><h2>竞赛评审</h2></div><button type="button" className="secondary-btn" onClick={() => void reload().catch(e => setError(e.message))}>刷新</button></div><p>这里处理本方发起的竞赛成果；下方报名审核用于确认个人参赛资格。</p><div className="challenge-milestones"><div><span>参赛团队</span><b>{teams.length}</b></div><div><span>待评审</span><b>{teams.filter(t => t.status === "submitted").length}</b></div><div><span>已完成</span><b>{teams.filter(t => ["completed", "awarded"].includes(t.status)).length}</b></div></div><label><span>筛选阶段</span><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">全部团队</option>{Object.entries(challengeStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>{error && <p role="alert" className="field-error">{error}</p>}{loading ? <p>正在加载…</p> : teams.length === 0 ? <p>发布组队竞赛后，参赛团队和成果将在这里集中展示。</p> : teams.filter(t => filter === "all" || t.status === filter).map(t => <ReviewCard key={`${t.id}-${t.version}`} team={t} scope={scope} refresh={reload} />)}</section>;
}
