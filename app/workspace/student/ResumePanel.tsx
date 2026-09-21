"use client";

import { useState } from "react";
import { SidePanel } from "../../components/ui";
import { studentRequest } from "./useStudentData";

export type StudentProfileForm = {
  name: string; school: string; major: string; grade: string; headline: string; bio: string; skills: string; awards: string;
  phone: string; email: string; resumeName: string; resumeKey: string; resumeType: string; resumeSize: number;
};

type UploadResult = { url: string | null; key: string; name: string; type: string; size?: number };
type PendingResume = Omit<UploadResult, "name"> & StudentProfileForm & { originalName: string };

function sizeLabel(size: number) { return size ? `${(size / 1024 / 1024).toFixed(2)} MB` : "大小待同步"; }

export default function ResumePanel({ profile, loading = false, upload, save, flash }: {
  profile: StudentProfileForm;
  loading?: boolean;
  upload: (file: File, purpose?: string) => Promise<UploadResult | null>;
  save: (next: StudentProfileForm) => Promise<boolean>;
  flash: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PendingResume | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const prepare = async (file: File, result: UploadResult) => {
    let fields = {};
    try {
      const { readResumePdf } = await import("../../../lib/services/read-resume-pdf");
      const extracted = await readResumePdf(file);
      fields = extracted.fields;
      const count = Object.keys(fields).length;
      setNotice(count ? `已从简历中识别 ${count} 项信息。请核对后保存；未识别的信息保留原值。` : extracted.hasText ? "已读取简历文字，但未能确定资料字段。请手动确认下列信息。" : "这份 PDF 没有可读取的文字，可能是扫描件。请上传可选中文字的 PDF，或手动确认资料。");
    } catch (error) {
      setNotice(error instanceof Error && /30 页/.test(error.message) ? error.message : "无法读取这份 PDF 的文字，可能受密码保护或文件格式异常。文件已保留，请手动确认资料或换一份 PDF。");
    }
    setPending({ ...profile, ...result, ...fields, name: (fields as Partial<StudentProfileForm>).name ?? profile.name, originalName: result.name, size: result.size || file.size });
    setOpen(true);
  };

  const select = async (file?: File) => {
    if (!file || loading || busy) return;
    if (file.type !== "application/pdf") return flash("简历仅支持 PDF 文件");
    if (file.size > 20 * 1024 * 1024) return flash("简历不能超过 20 MB");
    setBusy(true);
    try {
      const result = await upload(file, "resume");
      if (result) await prepare(file, result);
    } catch { flash("简历上传失败，请检查网络后重试"); }
    finally { setBusy(false); }
  };
  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const saved = await save({ ...profile, name: pending.name, school: pending.school, major: pending.major, grade: pending.grade, skills: pending.skills, awards: pending.awards, bio: pending.bio, phone: pending.phone, email: pending.email, resumeName: pending.originalName, resumeKey: pending.key, resumeType: pending.type, resumeSize: Number(pending.size || 0) });
      if (saved) { setOpen(false); setPending(null); flash("简历与个人资料已保存"); }
    } catch { flash("资料保存失败，请重试"); }
    finally { setBusy(false); }
  };
  const reparse = async () => {
    if (!profile.resumeKey || busy) return;
    setBusy(true);
    try {
      const response = await studentRequest(`/api/files?key=${encodeURIComponent(profile.resumeKey)}`);
      if (!response.ok) throw new Error("简历读取失败，请重试");
      const file = new File([await response.blob()], profile.resumeName || "简历.pdf", { type: "application/pdf" });
      await prepare(file, { key: profile.resumeKey, name: file.name, type: file.type, size: file.size, url: null });
    } catch { flash("简历读取失败，请重试"); }
    finally { setBusy(false); }
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
    try {
      if (await save({ ...profile, resumeName: "", resumeKey: "", resumeType: "", resumeSize: 0 })) flash("简历已从个人资料中移除");
    } catch { flash("简历移除失败，请重试"); }
    finally { setBusy(false); }
  };

  return <>
    <section className="resume-control-card private-resume-card">
      <header><span>PDF</span><div><small>PRIVATE RESUME</small><h3>{profile.resumeName || "上传完整简历"}</h3></div></header>
      <p>{profile.resumeKey ? `${sizeLabel(profile.resumeSize)} · 仅自己可见 · 私有访问不缓存` : "支持 PDF，最大 20 MB。上传后先确认识别结果，再更新主页资料。"}</p>
      <div>{profile.resumeKey ? <><button className="outline-btn" onClick={view}>查看完整简历</button><button className="outline-btn" disabled={busy} onClick={reparse}>从简历更新资料</button></> : null}<label className="primary-btn">{busy ? "正在处理简历…" : profile.resumeKey ? "替换简历" : "上传简历"}<input type="file" accept="application/pdf" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void select(file); }} /></label>{profile.resumeKey ? <button className="danger-text-btn" disabled={busy} onClick={remove}>移除</button> : null}</div>
    </section>
    <SidePanel open={open && Boolean(pending)} title="确认简历识别结果" description="在当前浏览器中读取简历文字，手动确认后更新你的个人资料。" dirty={Boolean(pending)} onClose={() => { if (!busy) { setOpen(false); setPending(null); } }} footer={<button className="primary-btn" disabled={busy} onClick={confirm}>{busy ? "正在保存…" : "确认并更新个人资料"}</button>}>
      {pending ? <div className="resume-extraction-form"><div className="resume-extraction-notice" role="status"><b>{pending.originalName}</b><p>{notice}</p></div>{(["name","school","major","grade","skills","awards","bio","phone","email"] as const).map((key) => <label key={key}><span>{{ name:"姓名",school:"学校",major:"专业",grade:"年级",skills:"技能",awards:"奖项",bio:"自我介绍",phone:"联系电话",email:"邮箱" }[key]}</span>{key === "skills" || key === "awards" || key === "bio" ? <textarea rows={3} value={pending[key]} onChange={(event) => setPending((current) => current ? { ...current, [key]: event.target.value } : current)} /> : <input value={pending[key]} onChange={(event) => setPending((current) => current ? { ...current, [key]: event.target.value } : current)} />}</label>)}</div> : null}
    </SidePanel>
  </>;
}
