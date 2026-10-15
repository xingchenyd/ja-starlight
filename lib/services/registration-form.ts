import type { RegistrationField } from "../../app/data";

export const registrationPresets: RegistrationField[] = [
  { id: "name", label: "姓名", type: "text", required: true },
  { id: "phone", label: "联系电话", type: "tel", required: true },
  { id: "email", label: "常用邮箱", type: "email", required: true },
  { id: "school", label: "学校、专业与年级", type: "text", required: true },
  { id: "studentId", label: "学号", type: "text", required: false },
  { id: "expectation", label: "参加活动的期待", type: "textarea", required: false },
];
export const defaultRegistrationFields = () => registrationPresets.filter(f => ["name", "phone", "school"].includes(f.id)).map(f => ({ ...f }));

// Keep stable IDs, including IDs from the earlier one-question-per-line editor.
export function validateRegistrationFields(value: unknown, draft = false): string[] {
  if (value === undefined) return []; // Legacy publications may omit a form.
  if (!Array.isArray(value) || value.length > 40) return ["报名问卷最多设置40个问题"];
  if (!draft && value.length === 0) return ["请至少设置一个报名问题"];
  if (JSON.stringify(value).length > 60000) return ["问卷内容过长，请减少问题或选项文字"];
  const errors: string[] = [], ids = new Set<string>();
  for (let i = 0; i < value.length; i++) {
    const f = value[i] as RegistrationField;
    const prefix = `第${i + 1}题`;
    if (!f || typeof f !== "object" || typeof f.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(f.id) || ids.has(f.id) || ["__proto__", "constructor", "prototype"].includes(f.id)) { errors.push(`${prefix}的问题编号无效或重复`); continue; }
    ids.add(f.id);
    if (typeof f.label !== "string" || f.label.length > 300 || (!draft && !f.label.trim())) errors.push(`${prefix}请填写题目，最多300字`);
    if (!["text", "tel", "email", "textarea", "radio", "checkbox"].includes(f.type) || typeof f.required !== "boolean") errors.push(`${prefix}题型或必填设置无效`);
    for (const key of ["description", "placeholder"] as const) if (f[key] !== undefined && (typeof f[key] !== "string" || f[key]!.length > 500)) errors.push(`${prefix}说明或提示最多500字`);
    if (f.maxLength !== undefined && (!Number.isInteger(f.maxLength) || f.maxLength < 1 || f.maxLength > 5000)) errors.push(`${prefix}回答字数上限须为1–5000`);
    if (f.type === "radio" || f.type === "checkbox") {
      const options = f.options;
      if (!Array.isArray(options) || options.length > 20 || (!draft && options.length < 2) || options.some(o => typeof o !== "string" || o.length > 200 || (!draft && !o.trim())) || (!draft && new Set(options.map(o => o.trim())).size !== options.length)) errors.push(`${prefix}需要2–20个不重复的有效选项`);
    }
  }
  return errors;
}

export function selectedAnswers(value: string): string[] {
  try { const result: unknown = JSON.parse(value); return Array.isArray(result) && result.every(v => typeof v === "string") ? result : []; } catch { return []; }
}
export function validateRegistrationAnswer(field: RegistrationField, value: string): string {
  if (field.type === "checkbox") {
    const chosen = selectedAnswers(value);
    const raw = value ? safeJSON(value) : [];
    if (field.required && !chosen.length) return `请选择：${field.label}`;
    if (!Array.isArray(raw) || raw.some(v => typeof v !== "string") || new Set(chosen).size !== chosen.length || chosen.some(v => !field.options?.includes(v))) return `请重新选择：${field.label}`;
    return "";
  }
  if (field.required && !value.trim()) return `请填写：${field.label}`;
  if (value.length > (field.maxLength || (field.type === "textarea" ? 5000 : 500))) return `“${field.label}”的回答超过字数上限`;
  if (value && field.type === "radio" && !field.options?.includes(value)) return `请重新选择：${field.label}`;
  if (value && field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `请填写有效邮箱：${field.label}`;
  if (value && field.type === "tel" && !/^[0-9+\-\s]{7,24}$/.test(value)) return `请填写有效联系电话：${field.label}`;
  return "";
}
function safeJSON(value: string): unknown { try { return JSON.parse(value); } catch { return null; } }
export function answerLabel(key: string, fields?: RegistrationField[]): string { return fields?.find(f => f.id === key)?.label || registrationPresets.find(f => f.id === key)?.label || key; }
export function answerText(value: string, field?: RegistrationField): string { return field?.type === "checkbox" ? selectedAnswers(value).join("、") : value; }

export function validateRegistrationAnswers(fields: RegistrationField[], answers: Record<string, string>) {
  return fields.map(f => validateRegistrationAnswer(f, answers[f.id] || "")).filter(Boolean);
}
