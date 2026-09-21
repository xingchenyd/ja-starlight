import { normalizeChallenge } from "../../lib/challenges/model";

export default function ChallengeBrief({ value }: { value: unknown }) {
  const c = normalizeChallenge(value);
  if (!c.enabled) return null;
  return <section className="challenge-brief challenge-surface"><span className="challenge-eyebrow">真实命题 · 团队共创</span><h2>挑战任务书</h2>
    <div className="challenge-milestones"><div><span>报名 / 组队截止</span><b>{c.registrationDeadline}</b></div><div><span>成果提交截止</span><b>{c.submissionDeadline}</b></div><div><span>预计结果公布</span><b>{c.resultsDate}</b></div></div>
    <p>团队规模 {c.teamMin}–{c.teamMax} 人 · 每人独立账号 · 奖励由主办方线下兑现</p>
    {([["problem", "我们要解决什么"], ["eligibility", "谁可以参加"], ["deliverables", "需要交付什么"], ["criteria", "如何评审"], ["rewards", "奖励与发展机会"]] as const).map(([key, title]) => <div className="challenge-brief-section" key={key}><h3>{title}</h3><p>{c[key]}</p></div>)}
  </section>;
}
