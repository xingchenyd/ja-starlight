export type PublishKind = "job" | "activity" | "content";
export type ReadinessItem = { label: string; complete: boolean; detail: string };

const text = (value: unknown) => String(value || "").trim();
const lines = (value: unknown) => text(value).split("\n").map((item) => item.trim()).filter(Boolean);
const blockHasContent = (block: Record<string, unknown>) => Boolean(text(block.title) || text(block.text) || text(block.url));

export function buildPublishReadiness(kind: PublishKind, form: Record<string, unknown>, blocks: Record<string, unknown>[]): ReadinessItem[] {
  const basics = text(form.title).length >= 4 && text(form.company).length > 0 && text(form.summary).length >= 12;
  const material = kind === "job" ? /^\S+@\S+\.\S+$/.test(text(form.email)) : Boolean(text(form.cover));
  let details = false;
  if (kind === "job") {
    const min = Number(form.salaryMin), max = Number(form.salaryMax);
    details = lines(form.responsibilities).length >= 2 && lines(form.requirements).length >= 2 && min >= 0 && max <= 500 && min <= max;
  } else if (kind === "activity") {
    details = Boolean(text(form.date)) && lines(form.agenda).length >= 2 && Number(form.registrationFieldCount || 0) >= 2 && blocks.length >= 2 && blocks.every(blockHasContent);
  } else {
    details = blocks.length >= 2 && blocks.every(blockHasContent);
  }
  return [
    { label: "标题、发布方与摘要", complete: basics, detail: basics ? "基础信息完整" : "仍需补全标题、发布方或摘要" },
    { label: kind === "job" ? "投递邮箱" : "展示素材", complete: material, detail: material ? "展示与联络信息可用" : kind === "job" ? "仍需填写有效投递邮箱" : "仍需上传真实封面" },
    { label: "详细内容与规则", complete: details, detail: details ? "详细内容达到发布要求" : "仍需完善职责、流程或正文模块" },
  ];
}
