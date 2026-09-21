"use client";
import { normalizeChallenge, type ChallengeSpec } from "../../lib/challenges/model";

export default function ChallengeEditor({ value, onChange }: { value: ChallengeSpec; onChange: (value: ChallengeSpec) => void }) {
  const set = (key: keyof ChallengeSpec, field: string | number | boolean) => onChange({ ...value, [key]: field });
  return <section className="challenge-editor challenge-surface">
    <h3>参与方式</h3>
    <label><span>活动形式</span><select value={value.enabled ? "challenge" : "activity"} onChange={e => set("enabled", e.target.value === "challenge")}><option value="activity">普通成长活动</option><option value="challenge">命题挑战 / 创新竞赛（正式组队）</option></select></label>
    {value.enabled && <>
      <p>每位队员独立报名并接受邀请。主办方评审团队成果，奖励及实习推荐在线下兑现。</p>
      <button type="button" className="secondary-btn" onClick={() => {
        if (value.problem || value.deliverables || value.criteria) {
          if (!window.confirm("应用参考结构会替换问题、交付要求和评审标准，是否继续？")) return;
        }
        onChange({ ...normalizeChallenge(value), problem: "请填写本次循环经济挑战的真实场景、需要解决的问题、可提供的数据，以及不可逾越的限制。", deliverables: "提交问题分析、解决方案、可验证的原型或试点记录，以及环境与经济效果评估。请补充文件格式和验收要求。", criteria: "问题理解、方案可行性、验证质量、环境与社会价值、展示表达。请填写各项权重及评审方式。" });
      }}>使用循环经济命题参考结构</button>
      {([["problem", "真实问题与目标"], ["eligibility", "参赛条件与资源支持"], ["deliverables", "成果交付要求"], ["criteria", "评审标准、权重与方式"], ["rewards", "奖金 / 实习推荐及兑现条件"]] as const).map(([key, label]) => <label key={key}><span>{label} *</span><textarea rows={3} maxLength={5000} value={value[key]} onChange={e => set(key, e.target.value)} /></label>)}
      <div className="challenge-form-grid">{([["registrationDeadline", "报名与组队截止"], ["submissionDeadline", "成果提交截止"], ["resultsDate", "预计结果公布"]] as const).map(([key, label]) => <label key={key}><span>{label} *</span><input type="date" value={value[key]} onChange={e => set(key, e.target.value)} /></label>)}
        <label><span>团队最少人数 *</span><input type="number" min={1} max={20} value={value.teamMin} onChange={e => set("teamMin", Number(e.target.value))} /></label>
        <label><span>团队最多人数 *</span><input type="number" min={1} max={20} value={value.teamMax} onChange={e => set("teamMax", Number(e.target.value))} /></label>
      </div>
    </>}
  </section>;
}
