"use client";
import { useId, useState } from "react";
import type { RegistrationField } from "../data";
import { registrationPresets, selectedAnswers, validateRegistrationFields } from "../../lib/services/registration-form";

export function RegistrationAnswerInput({ field, value, onChange, disabled = false, invalid = false }: { field: RegistrationField; value: string; onChange: (value: string) => void; disabled?: boolean; invalid?: boolean }) {
  const id = useId();
  if (field.type === "radio" || field.type === "checkbox") return <fieldset className="question-options" disabled={disabled} aria-label={field.label} aria-invalid={invalid}>
    <legend className="sr-only">{field.label}</legend>
    {(field.options || []).map((option, index) => <label key={index} htmlFor={`${id}-${index}`}><input id={`${id}-${index}`} name={id} type={field.type} checked={field.type === "radio" ? value === option : selectedAnswers(value).includes(option)} onChange={e => onChange(field.type === "radio" ? option : JSON.stringify(e.target.checked ? [...selectedAnswers(value), option] : selectedAnswers(value).filter(v => v !== option)))} /><span>{option || `选项${index + 1}`}</span></label>)}
    {field.type === "radio" && value && !field.required && !disabled && <button type="button" className="text-btn" onClick={() => onChange("")}>清空选择</button>}
  </fieldset>;
  const common = { value, disabled, "aria-label": field.label, "aria-invalid": invalid, maxLength: field.maxLength || (field.type === "textarea" ? 5000 : 500), placeholder: field.placeholder || (field.type === "textarea" ? "请填写你的想法…" : "请输入"), onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value) };
  return field.type === "textarea" ? <><textarea rows={5} {...common} /><small className="answer-count">{value.length} / {common.maxLength}</small></> : <input type={field.type} {...common} />;
}

const typeNames: Record<RegistrationField["type"], string> = { text: "简答 / 填空", textarea: "开放式长答", radio: "单选题", checkbox: "多选题", email: "邮箱", tel: "联系电话" };
export default function RegistrationFormEditor({ value, onChange }: { value: RegistrationField[]; onChange: (fields: RegistrationField[]) => void }) {
  const [preview, setPreview] = useState(false), [answers, setAnswers] = useState<Record<string, string>>({});
  const change = (id: string, patch: Partial<RegistrationField>) => onChange(value.map(f => f.id === id ? { ...f, ...patch } : f));
  const add = (type: RegistrationField["type"]) => onChange([...value, { id: `q_${crypto.randomUUID()}`, label: "", type, required: true, ...(type === "radio" || type === "checkbox" ? { options: ["选项一", "选项二"] } : {}) }]);
  const move = (index: number, offset: number) => { const next = [...value]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; onChange(next); };
  const errors = validateRegistrationFields(value);
  return <section className="questionnaire-builder full" aria-label="报名问卷编辑器">
    <header><div><h2>设置学生需要回答的问题</h2><p>自由填写题目，也可添加选项供学生选择。每个问题都可设置必填、说明和顺序。</p></div><button type="button" className="secondary-btn" onClick={() => setPreview(v => !v)}>{preview ? "返回编辑" : "预览填写效果"}</button></header>
    {preview ? <div className="questionnaire-preview">{value.map((f, i) => <div className="questionnaire-answer" key={f.id}><h3>{i + 1}. {f.label || "未命名问题"} <small>{f.required ? "必填" : "选填"}</small></h3>{f.description && <p>{f.description}</p>}<RegistrationAnswerInput field={f} value={answers[f.id] || ""} onChange={v => setAnswers(a => ({ ...a, [f.id]: v }))} /></div>)}<p>此处仅为填写预览，不会提交报名。</p></div> : <>
      <div className="questionnaire-presets"><b>快速添加常用信息</b>{registrationPresets.map(f => <button type="button" key={f.id} disabled={value.length >= 40 || value.some(v => v.id === f.id)} onClick={() => onChange([...value, { ...f }])}>＋{f.label}</button>)}</div>
      {value.map((f, i) => <article className="question-editor" key={f.id}>
        <div className="question-editor-top"><b>问题 {i + 1}</b><div><button type="button" aria-label={`上移第${i + 1}题`} disabled={!i} onClick={() => move(i, -1)}>↑</button><button type="button" aria-label={`下移第${i + 1}题`} disabled={i === value.length - 1} onClick={() => move(i, 1)}>↓</button><button type="button" className="danger-text-btn" aria-label={`删除第${i + 1}题`} onClick={() => onChange(value.filter(v => v.id !== f.id))}>删除</button></div></div>
        <div className="question-editor-grid"><label>题目<input maxLength={300} value={f.label} placeholder="例如：你对循环经济有哪些看法？" onChange={e => change(f.id, { label: e.target.value })} /></label><label>回答方式<select value={f.type} onChange={e => { const type = e.target.value as RegistrationField["type"]; change(f.id, { type, options: type === "radio" || type === "checkbox" ? f.options?.length ? f.options : ["选项一", "选项二"] : undefined }); }}>{Object.entries(typeNames).map(([type, name]) => <option key={type} value={type}>{name}</option>)}</select></label></div>
        <label>补充说明（选填）<input maxLength={500} value={f.description || ""} placeholder="填写背景、回答提示或注意事项" onChange={e => change(f.id, { description: e.target.value })} /></label>
        {f.type === "radio" || f.type === "checkbox" ? <div className="question-editor-options"><b>选项</b>{(f.options || []).map((option, n) => <div key={n}><span>{n + 1}.</span><input aria-label={`第${i + 1}题选项${n + 1}`} maxLength={200} value={option} onChange={e => change(f.id, { options: f.options!.map((v, j) => j === n ? e.target.value : v) })} /><button type="button" aria-label={`删除第${i + 1}题选项${n + 1}`} onClick={() => change(f.id, { options: f.options!.filter((_, j) => j !== n) })}>移除</button></div>)}<button type="button" className="secondary-btn" disabled={(f.options?.length || 0) >= 20} onClick={() => change(f.id, { options: [...(f.options || []), ""] })}>＋ 添加选项</button></div> : <div className="question-editor-grid"><label>输入提示（选填）<input maxLength={500} value={f.placeholder || ""} onChange={e => change(f.id, { placeholder: e.target.value })} /></label><label>最多回答字数<input type="number" min={1} max={5000} value={f.maxLength ?? (f.type === "textarea" ? 5000 : 500)} onChange={e => change(f.id, { maxLength: Number(e.target.value) })} /></label></div>}
        <label className="question-required"><input type="checkbox" checked={f.required} onChange={e => change(f.id, { required: e.target.checked })} /><span>本题必填</span></label>
      </article>)}
      <div className="questionnaire-add"><b>添加问题</b>{(["text", "textarea", "radio", "checkbox"] as const).map(type => <button type="button" className="secondary-btn" key={type} disabled={value.length >= 40} onClick={() => add(type)}>＋ {typeNames[type]}</button>)}<small>{value.length} / 40 题</small></div>
      {errors.length > 0 && <p className="field-error" role="status">{errors[0]}</p>}
    </>}
  </section>;
}
