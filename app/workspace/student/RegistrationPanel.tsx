/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import type { Activity, RegistrationField } from "../../data";
import { SidePanel } from "../../components/ui";

export type RegistrationItem = {
  id: string;
  activityId: string;
  activityTitle: string;
  answers: Record<string, string>;
  status: "pending" | "approved" | "rejected" | "cancelled" | string;
  reviewNote?: string;
  reviewedAt?: string | null;
  createdAt: string;
};

type Profile = Record<string, unknown>;

function defaultFields(): RegistrationField[] {
  return [
    { id: "name", label: "姓名", type: "text", required: true },
    { id: "phone", label: "联系电话", type: "tel", required: true },
    { id: "email", label: "常用邮箱", type: "email", required: true },
    { id: "school", label: "学校、专业与年级", type: "text", required: true },
  ];
}

function prefill(field: RegistrationField, profile: Profile) {
  if (field.id === "school") {
    return [profile.school, profile.major, profile.grade].filter(Boolean).join(" · ");
  }
  const direct = profile[field.id];
  if (direct) return String(direct);
  if (field.type === "email") return String(profile.email || "");
  if (field.type === "tel") return String(profile.phone || "");
  return "";
}

function validate(field: RegistrationField, value: string) {
  if (field.required && !value.trim()) return `请填写${field.label}`;
  if (value && field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "请填写有效邮箱";
  if (value && field.type === "tel" && !/^[0-9+\-\s]{7,24}$/.test(value)) return "请填写有效联系电话";
  return "";
}

export default function RegistrationPanel({
  activity,
  open,
  profile,
  registration,
  onClose,
  onSubmit,
  onCancel,
}: {
  activity: Activity | null;
  open: boolean;
  profile: Profile;
  registration?: RegistrationItem;
  onClose: () => void;
  onSubmit: (answers: Record<string, string>) => Promise<boolean>;
  onCancel: () => Promise<boolean>;
}) {
  const fields = useMemo(() => activity?.registrationFields?.length ? activity.registrationFields : defaultFields(), [activity]);
  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((field) => [
    field.id,
    registration?.answers?.[field.id] ?? prefill(field, profile),
  ])));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const readOnly = registration?.status === "approved";

  const submit = async () => {
    const nextErrors = Object.fromEntries(fields.map((field) => [field.id, validate(field, answers[field.id] || "")]).filter(([, error]) => error));
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    await onSubmit(answers);
    setSaving(false);
  };

  const cancel = async () => {
    setSaving(true);
    await onCancel();
    setSaving(false);
  };

  const statusLabel = registration?.status === "approved"
    ? "报名已通过"
    : registration?.status === "rejected"
      ? "报名已退回，可修改后重新提交"
      : registration?.status === "cancelled"
        ? "报名已取消"
        : registration
          ? "报名已提交，等待发布方确认"
          : "尚未报名";

  return (
    <SidePanel
      open={open && Boolean(activity)}
      title={activity?.title || "活动详情"}
      description={activity ? `${activity.publisher || "JA China"} · ${activity.date} · ${activity.place}` : undefined}
      dirty={!readOnly && Object.values(answers).some(Boolean) && !registration}
      onClose={onClose}
      footer={activity ? (
        <div className="registration-panel-actions">
          {registration && !["approved", "cancelled"].includes(registration.status) ? <button className="danger-text-btn" disabled={saving} onClick={cancel}>取消报名</button> : null}
          {!readOnly ? <button className="primary-btn" disabled={saving || registration?.status === "cancelled"} onClick={submit}>{saving ? "正在保存…" : registration ? "保存并重新提交" : "确认报名"}</button> : null}
        </div>
      ) : null}
    >
      {activity ? (
        <div className="registration-panel-content">
          <img className="registration-panel-cover" src={activity.cover} alt={activity.title} />
          <div className="registration-activity-facts">
            <span>{activity.category}</span><span>{activity.status}</span><span>{activity.registered} / {activity.capacity} 人</span>
          </div>
          <p className="registration-activity-summary">{activity.summary}</p>
          {activity.bodyBlocks?.length ? <div className="registration-activity-body">{activity.bodyBlocks.map((block) => block.type === "heading" ? <h3 key={block.id}>{block.title}</h3> : block.type === "image" && block.url ? <figure key={block.id}><img src={block.url} alt={block.caption || block.title || "活动图片"} /><figcaption>{block.caption}</figcaption></figure> : <p key={block.id}>{block.text || block.title}</p>)}</div> : null}
          <section className={`registration-status-card status-${registration?.status || "new"}`}>
            <b>{statusLabel}</b>
            {registration?.reviewNote ? <p>{registration.reviewNote}</p> : null}
            {registration ? <small>提交时间 {new Date(registration.createdAt).toLocaleString("zh-CN")}</small> : <small>以下信息仅供本次活动发布方审核与联络。</small>}
          </section>
          <div className="registration-fields refined-registration-fields">
            {fields.map((field) => (
              <label key={field.id}>
                <span>{field.label}{field.required ? <b>必填</b> : <em>选填</em>}</span>
                {field.type === "textarea" ? <textarea rows={4} value={answers[field.id] || ""} disabled={readOnly} aria-invalid={Boolean(errors[field.id])} onChange={(event) => setAnswers((current) => ({ ...current, [field.id]: event.target.value }))} /> : <input type={field.type} value={answers[field.id] || ""} disabled={readOnly} aria-invalid={Boolean(errors[field.id])} onChange={(event) => setAnswers((current) => ({ ...current, [field.id]: event.target.value }))} />}
                {errors[field.id] ? <small className="field-error">{errors[field.id]}</small> : null}
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </SidePanel>
  );
}
