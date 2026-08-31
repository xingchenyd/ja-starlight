"use client";

import { useState } from "react";
import { SidePanel } from "../../components/ui";
import { studentRequest } from "./useStudentData";

export type StudentProfileForm = {
  name: string; school: string; major: string; grade: string; headline: string; bio: string; skills: string; awards: string;
  phone: string; email: string; resumeName: string; resumeKey: string; resumeType: string; resumeSize: number;
};

type UploadResult = { url: string | null; key: string; name: string; type: string; size?: number };
type PendingResume = UploadResult & Pick<StudentProfileForm, "name" | "school" | "major" | "grade" | "skills" | "awards">;

function sizeLabel(size: number) { return size ? `${(size / 1024 / 1024).toFixed(2)} MB` : "大小待同步"; }

export default function ResumePanel({ profile, upload, save, flash }: {
  profile: StudentProfileForm;
  upload: (file: File, purpose?: string) => Promise<UploadResult | null>;
  save: (next: StudentProfileForm) => Promise<void>;
  flash: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PendingResume | null>(null);
  const [busy, setBusy] = useState(false);

  const select = async (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf") return flash("简历仅支持 PDF 文件");
    if (file.size > 20 * 1024 * 1024) return flash("简历不能超过 20 MB");
    setBusy(true);
    const result = await upload(file, "resume");
    setBusy(false);
    if (!result) return;
    setPending({ ...result, size: result.size || file.size, name: profile.name, school: profile.school, major: profile.major, grade: profile.grade, skills: profile.skills, awards: profile.awards });
    setOpen(true);
  };
  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    await save({ ...profile, name: pending.name, school: pending.school, major: pending.major, grade: pending.grade, skills: pending.skills, awards: pending.awards, resumeName: pending.name ? pending.name + "_简历.pdf" : pending.name, resumeKey: pending.key, resumeType: pending.type, resumeSize: Number(pending.size || 0) });
    setBusy(false); setOpen(false); setPending(null); flash("识别结果已确认，简历仅自己可见");
  };
  const view = async () => {
    if (!profile.resumeKey) return flash("请先上传简历");
    const response = await studentRequest(`/api/files?key=${encodeURIComponent(profile.resumeKey)}`);
    if (!response.ok) return flash("完整简历读取失败，请重试");
    const url = URL.createObjectURL(await response.blob());
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  const remove = async () => {
    if (!profile.resumeKey) return;
    setBusy(true);
    const response = await studentRequest(`/api/files?key=${encodeURIComponent(profile.resumeKey)}`, { method: "DELETE" });
    if (response.ok) await save({ ...profile, resumeName: "", resumeKey: "", resumeType: "", resumeSize: 0 });
    setBusy(false); flash(response.ok ? "简历已从个人资料中移除" : "简历移除失败");
  };

  return <>
    <section className="resume-control-card private-resume-card">
      <header><span>PDF</span><div><small>PRIVATE RESUME</small><h3>{profile.resumeName || "上传完整简历"}</h3></div></header>
      <p>{profile.resumeKey ? `${sizeLabel(profile.resumeSize)} · 仅自己可见 · 私有访问不缓存` : "支持 PDF，最大 20 MB。上传后先确认识别结果，再更新主页资料。"}</p>
      <div>{profile.resumeKey ? <button className="outline-btn" onClick={view}>查看完整简历</button> : null}<label className="primary-btn">{busy ? "正在上传…" : profile.resumeKey ? "替换简历" : "上传简历"}<input type="file" accept="application/pdf" disabled={busy} onChange={(event) => select(event.target.files?.[0])} /></label>{profile.resumeKey ? <button className="danger-text-btn" disabled={busy} onClick={remove}>移除</button> : null}</div>
    </section>
    <SidePanel open={open && Boolean(pending)} title="确认简历识别结果" description="自动解析服务尚未接入时会保留原文件，并允许你手动确认和修正关键信息。" dirty={Boolean(pending)} onClose={() => { setOpen(false); setPending(null); }} footer={<button className="primary-btn" disabled={busy} onClick={confirm}>{busy ? "正在保存…" : "确认并更新个人资料"}</button>}>
      {pending ? <div className="resume-extraction-form"><div className="resume-extraction-notice"><b>请确认主页资料</b><p>简历文件已安全保留。请核对并完善下列信息，确认后将用于个人成长主页和活动报名预填。</p></div>{(["name","school","major","grade","skills","awards"] as const).map((key) => <label key={key}><span>{{ name:"姓名",school:"学校",major:"专业",grade:"年级",skills:"技能",awards:"奖项" }[key]}</span>{key === "skills" || key === "awards" ? <textarea rows={3} value={pending[key]} onChange={(event) => setPending((current) => current ? { ...current, [key]: event.target.value } : current)} /> : <input value={pending[key]} onChange={(event) => setPending((current) => current ? { ...current, [key]: event.target.value } : current)} />}</label>)}</div> : null}
    </SidePanel>
  </>;
}
