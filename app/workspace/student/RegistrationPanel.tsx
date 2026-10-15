/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import type { Activity, RegistrationField } from "../../data";
import { SidePanel } from "../../components/ui";
import ChallengeBrief from "../../components/ChallengeBrief";
import { StudentChallenge } from "../../components/ChallengeWorkspace";
import { RegistrationAnswerInput } from "../../components/RegistrationForm";
import { defaultRegistrationFields, validateRegistrationAnswer } from "../../../lib/services/registration-form";

export type RegistrationItem = {
  id: string;
  activityId: string;
  activityTitle: string;
  answers: Record<string, string>;
  formFields?: RegistrationField[];
  status: "pending" | "approved" | "rejected" | "cancelled" | string;
  reviewNote?: string;
  reviewedAt?: string | null;
  createdAt: string;
};

type Profile = Record<string, unknown>;

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
  const fields = useMemo(() => registration?.status === "approved" && registration.formFields?.length ? registration.formFields : activity?.registrationFields?.length ? activity.registrationFields : defaultRegistrationFields(), [activity, registration]);
  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((field) => [
    field.id,
    registration?.answers?.[field.id] ?? prefill(field, profile),
  ])));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const readOnly = registration?.status === "approved";

  const submit = async () => {
    const nextErrors = Object.fromEntries(fields.map((field) => [field.id, validateRegistrationAnswer(field, answers[field.id] || "")]).filter(([, error]) => error));
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    try { await onSubmit(answers); }
    catch { setErrors(current => ({ ...current, submit: "网络异常，未能确认保存结果。请重试。" })); }
    finally { setSaving(false); }
  };

  const cancel = async () => {
    setSaving(true);
    try { await onCancel(); }
    catch { setErrors(current => ({ ...current, submit: "网络异常，取消未完成，请重试。" })); }
    finally { setSaving(false); }
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
      description={activity ? [activity.publisher || "星光计划", activity.date, activity.place].filter(Boolean).join(" · ") : undefined}
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
            <span>{activity.category || "成长活动"}</span><span>{activity.status}</span><span>{activity.registered || 0} / {activity.capacity} 人</span>
          </div>
          <p className="registration-activity-summary">{activity.summary}</p>
          {errors.submit && <p role="alert" className="field-error">{errors.submit}</p>}
          {activity.challenge?.enabled && readOnly && <StudentChallenge activityId={activity.id} />}
          {activity.challenge?.enabled && readOnly ? <details><summary>查看挑战任务书与比赛规则</summary><ChallengeBrief value={activity.challenge} /></details> : <ChallengeBrief value={activity.challenge} />}
          {activity.bodyBlocks?.length ? <div className="registration-activity-body">{activity.bodyBlocks.map((block) => block.type === "heading" ? <h3 key={block.id}>{block.title}</h3> : block.type === "image" && block.url ? <figure key={block.id}><img src={block.url} alt={block.caption || block.title || "活动图片"} /><figcaption>{block.caption}</figcaption></figure> : <p key={block.id}>{block.text || block.title}</p>)}</div> : null}
          {activity.gallery?.length ? <div className="registration-activity-gallery">{activity.gallery.map((url, i) => <img key={`${url}-${i}`} src={url} alt={`活动配图${i + 1}`} />)}</div> : null}
          <section className={`registration-status-card status-${registration?.status || "new"}`}>
            <b>{statusLabel}</b>
            {registration?.reviewNote ? <p>{registration.reviewNote}</p> : null}
            {registration ? <small>提交时间 {new Date(registration.createdAt).toLocaleString("zh-CN")}</small> : <small>以下信息仅供本次活动发布方审核与联络。</small>}
          </section>
          <div className="registration-fields refined-registration-fields">
            {fields.map((field) => (
              <div className="questionnaire-answer" key={field.id}>
                <h3>{field.label}{field.required ? <b>必填</b> : <em>选填</em>}</h3>
                {field.description && <p>{field.description}</p>}
                <RegistrationAnswerInput field={field} value={answers[field.id] || ""} disabled={readOnly} invalid={Boolean(errors[field.id])} onChange={value => setAnswers(current => ({ ...current, [field.id]: value }))} />
                {errors[field.id] ? <small className="field-error">{errors[field.id]}</small> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </SidePanel>
  );
}
