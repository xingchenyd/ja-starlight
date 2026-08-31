"use client";

import { useState } from "react";
import { Dialog } from "../../components/ui";
import GrowthTimeline from "./GrowthTimeline";
import ResumePanel, { type StudentProfileForm } from "./ResumePanel";
import StudentSharePanel from "./StudentSharePanel";
import type { StudentExperience } from "./useStudentData";

type ProfileRecord = { id: string; payload: Record<string, unknown> };
type UploadResult = { url: string | null; key: string; name: string; type: string; size?: number };

function profileFrom(record?: ProfileRecord): StudentProfileForm {
  const value = record?.payload || {};
  return {
    name:String(value.name||"张晨"),school:String(value.school||"湖南大学"),major:String(value.major||"工商管理"),grade:String(value.grade||"2027届"),
    headline:String(value.headline||"关注产品运营、公益实践与青年发展"),bio:String(value.bio||"擅长把复杂问题整理为清晰行动方案，期待在真实项目中持续学习、协作和复盘。"),
    skills:String(value.skills||"内容策划,用户研究,项目协作,数据整理"),awards:String(value.awards||"星光计划简历工作坊优秀作品；校级创新挑战赛入围"),
    phone:String(value.phone||""),email:String(value.email||""),resumeName:String(value.resumeName||""),resumeKey:String(value.resumeKey||""),resumeType:String(value.resumeType||""),resumeSize:Number(value.resumeSize||0),
  };
}

export default function StudentProfile({ record, experiences, privateLoading, privateError, reloadPrivateData, saveRecord, upload, flash }: {
  record?: ProfileRecord; experiences: StudentExperience[]; privateLoading: boolean; privateError: string; reloadPrivateData: () => void;
  saveRecord: (payload: Record<string, unknown>, id?: string) => Promise<string | null>;
  upload: (file: File, purpose?: string) => Promise<UploadResult | null>; flash: (message: string) => void;
}) {
  const [profile, setProfile] = useState(() => profileFrom(record));
  const [draft, setDraft] = useState(profile);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const skills = profile.skills.split(/[,，]/).map((item)=>item.trim()).filter(Boolean);
  const save = async (next: StudentProfileForm) => { const id = await saveRecord(next, record?.id); if (id) { setProfile(next); setDraft(next); } };
  const saveEditor = async () => { if (!draft.name.trim() || !draft.school.trim()) return flash("请填写姓名与学校"); setSaving(true); await save(draft); setSaving(false); setEditing(false); };
  return <>
    <header className="student-section-heading profile-section-heading"><div><small>GROWTH PROFILE</small><h1>成长主页</h1></div><button className="outline-btn" onClick={()=>{setDraft(profile);setEditing(true)}}>编辑个人资料</button></header>
    <div className="student-growth-layout">
      <aside className="fixed-profile-rail">
        <section className="student-identity-card"><span className="profile-avatar">{profile.name.slice(0,1)}</span><small>STUDENT PROFILE</small><h2>{profile.name}</h2><p>{profile.school} · {profile.major} · {profile.grade}</p><strong>{profile.headline}</strong><div>{skills.map((skill)=><span key={skill}>{skill}</span>)}</div><blockquote>{profile.bio}</blockquote></section>
        <ResumePanel profile={profile} upload={upload} save={save} flash={flash} />
        <StudentSharePanel flash={flash} />
        <section className="profile-privacy-note"><b>资料可见性</b><p>完整简历、联系方式和设为私密的经历仅自己可见；企业只能看到你主动公开的成长主页内容。</p></section>
      </aside>
      <main className="growth-timeline-column"><GrowthTimeline experiences={experiences} loading={privateLoading} error={privateError} reload={reloadPrivateData} upload={upload} flash={flash} /></main>
    </div>
    <Dialog open={editing} title="编辑个人资料" description="这些信息用于活动报名预填和成长主页展示。" dirty={JSON.stringify(draft)!==JSON.stringify(profile)} onClose={()=>setEditing(false)} footer={<button className="primary-btn" disabled={saving} onClick={saveEditor}>{saving?"正在保存…":"保存资料"}</button>}><div className="profile-editor-form"><div><label><span>姓名 *</span><input value={draft.name} onChange={(e)=>setDraft(v=>({...v,name:e.target.value}))}/></label><label><span>年级</span><input value={draft.grade} onChange={(e)=>setDraft(v=>({...v,grade:e.target.value}))}/></label></div><label><span>学校 *</span><input value={draft.school} onChange={(e)=>setDraft(v=>({...v,school:e.target.value}))}/></label><label><span>专业</span><input value={draft.major} onChange={(e)=>setDraft(v=>({...v,major:e.target.value}))}/></label><label><span>主页标题</span><input value={draft.headline} onChange={(e)=>setDraft(v=>({...v,headline:e.target.value}))}/></label><label><span>自我介绍</span><textarea rows={4} value={draft.bio} onChange={(e)=>setDraft(v=>({...v,bio:e.target.value}))}/></label><label><span>技能（逗号分隔）</span><input value={draft.skills} onChange={(e)=>setDraft(v=>({...v,skills:e.target.value}))}/></label><label><span>奖项与荣誉</span><textarea rows={3} value={draft.awards} onChange={(e)=>setDraft(v=>({...v,awards:e.target.value}))}/></label><div><label><span>联系电话（仅自己和报名表可见）</span><input type="tel" value={draft.phone} onChange={(e)=>setDraft(v=>({...v,phone:e.target.value}))}/></label><label><span>邮箱（仅自己和报名表可见）</span><input type="email" value={draft.email} onChange={(e)=>setDraft(v=>({...v,email:e.target.value}))}/></label></div></div></Dialog>
  </>;
}
