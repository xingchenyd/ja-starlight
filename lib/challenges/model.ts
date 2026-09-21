export type ChallengeSpec = {
  enabled: boolean;
  problem: string;
  deliverables: string;
  criteria: string;
  rewards: string;
  eligibility: string;
  registrationDeadline: string;
  submissionDeadline: string;
  resultsDate: string;
  teamMin: number;
  teamMax: number;
};

export const activityCategories = ["企业命题", "创新竞赛", "循环经济", "企业参访", "职业体验", "主题工作坊", "能力工作坊", "创新挑战", "赛事路演", "职业市集", "导师对谈", "商业实践", "志愿公益", "公益课堂", "校园活动", "赛事观摩"];

export function normalizeChallenge(value: unknown): ChallengeSpec {
  const v = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const text = (key: string) => String(v[key] ?? "").trim();
  return {
    enabled: v.enabled === true,
    problem: text("problem"), deliverables: text("deliverables"), criteria: text("criteria"),
    rewards: text("rewards"), eligibility: text("eligibility"),
    registrationDeadline: text("registrationDeadline"), submissionDeadline: text("submissionDeadline"), resultsDate: text("resultsDate"),
    teamMin: Number(v.teamMin ?? 2), teamMax: Number(v.teamMax ?? 6),
  };
}

// All event deadlines are calendar dates in China Standard Time, inclusive.
export function deadlineAt(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NaN;
  const value = Date.parse(`${date}T23:59:59.999+08:00`);
  if (!Number.isFinite(value) || new Date(value + 8 * 3600000).toISOString().slice(0, 10) !== date) return NaN;
  return value;
}

export function validateChallenge(value: unknown): string[] {
  const c = normalizeChallenge(value);
  if (!c.enabled) return [];
  const errors: string[] = [];
  for (const [key, label] of [["problem", "真实问题与目标"], ["deliverables", "成果交付要求"], ["criteria", "评审标准"], ["rewards", "奖励与兑现说明"], ["eligibility", "参赛条件"]] as const) {
    if (!c[key] || c[key].length > 5000) errors.push(`${label}须填写，且不超过 5000 字`);
  }
  if (!Number.isInteger(c.teamMin) || !Number.isInteger(c.teamMax) || c.teamMin < 1 || c.teamMax > 20 || c.teamMin > c.teamMax) errors.push("团队人数须为 1–20 人的整数区间");
  if (![c.registrationDeadline, c.submissionDeadline, c.resultsDate].every(d => Number.isFinite(deadlineAt(d)))) errors.push("请填写有效的报名截止、成果截止和结果公布日期");
  else if (c.registrationDeadline > c.submissionDeadline || c.submissionDeadline > c.resultsDate) errors.push("日期应满足：报名截止 ≤ 成果截止 ≤ 结果公布");
  return errors;
}

export function safeEvidenceUrl(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.length > 2000) throw new Error("成果链接过长");
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error();
    return url.href;
  } catch { throw new Error("成果链接须为完整的 http 或 https 地址，且不能包含账号密码"); }
}

export const challengeStatus: Record<string, string> = {
  forming: "组队中", submitted: "待评审", revision_requested: "待补充成果", completed: "评审完成", awarded: "获奖",
};
