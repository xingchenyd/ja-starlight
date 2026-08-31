"use client";

import { useMemo, useState } from "react";
import { Dialog, SidePanel } from "../../components/ui";
import { studentRequest, type StudentExperience } from "./useStudentData";

type UploadResult = { url: string | null; key: string; name: string; type: string; size?: number };
type Draft = { id?: string; category: string; title: string; role: string; description: string; output: string; evidenceUrl: string; evidenceAssetKey: string; occurredAt: string; isPublic: boolean };
const blank = (): Draft => ({ category: "学生项目", title: "", role: "", description: "", output: "", evidenceUrl: "", evidenceAssetKey: "", occurredAt: new Date().toISOString().slice(0, 10), isPublic: true });

export default function GrowthTimeline({ experiences, loading, error, reload, upload, flash }: {
  experiences: StudentExperience[]; loading: boolean; error: string; reload: () => void;
  upload: (file: File, purpose?: string) => Promise<UploadResult | null>; flash: (message: string) => void;
}) {
  const items = useMemo(() => [...experiences].sort((a, b) => b.sortOrder - a.sortOrder || String(b.occurredAt).localeCompare(String(a.occurredAt))), [experiences]);
  const [selected, setSelected] = useState<StudentExperience | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(blank);
  const [saving, setSaving] = useState(false);
  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const startAdd = () => { setDraft(blank()); setEditing(true); };
  const startEdit = (item: StudentExperience) => { if (item.sourceType !== "manual") return; setDraft({ id:item.id,category:item.category,title:item.title,role:item.role,description:item.description,output:item.output,evidenceUrl:item.evidenceUrl || "",evidenceAssetKey:"",occurredAt:item.occurredAt.slice(0,10),isPublic:item.isPublic }); setSelected(null); setEditing(true); };
  const save = async () => {
    if (!draft.title.trim() || !draft.occurredAt) return flash("请填写经历名称与日期");
    setSaving(true);
    const response = await studentRequest("/api/student", { method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({ action:"save-experience",...draft }) });
    const payload = await response.json(); setSaving(false);
    if (!response.ok) return flash(payload.error || "经历保存失败");
    setEditing(false); reload(); flash(draft.id ? "经历已更新" : "经历已加入成长时间轴");
  };
  const remove = async (item: StudentExperience) => {
    if (item.sourceType !== "manual") return;
    const response = await studentRequest(`/api/student?experienceId=${encodeURIComponent(item.id)}`, { method:"DELETE" });
    if (!response.ok) return flash((await response.json()).error || "删除失败");
    setSelected(null); reload(); flash("手动经历已删除");
  };
  const setVisibility = async (item: StudentExperience) => {
    const response = await studentRequest("/api/student", { method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({ action:"set-experience-visibility",id:item.id,isPublic:!item.isPublic }) });
    if (!response.ok) return flash((await response.json()).error || "公开状态保存失败");
    setSelected((current) => current ? { ...current, isPublic: !current.isPublic } : current); reload();
  };
  const reorder = async (item: StudentExperience, direction: -1 | 1) => {
    const index = items.findIndex((entry) => entry.id === item.id), target = index + direction;
    if (target < 0 || target >= items.length) return;
    const ids = items.map((entry) => entry.id); [ids[index], ids[target]] = [ids[target], ids[index]];
    const response = await studentRequest("/api/student", { method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({ action:"reorder-experiences",ids }) });
    if (!response.ok) return flash((await response.json()).error || "排序失败");
    reload();
  };
  const addEvidence = async (file?: File) => { if (!file) return; const result = await upload(file, "media"); if (result) { change("evidenceUrl", result.url || ""); change("evidenceAssetKey", result.key); } };

  return <section className="growth-timeline-workspace">
    <header><div><small>GROWTH TIMELINE</small><h2>成长时间轴</h2><p>平台活动自动沉淀为 JA 认证经历，也可补充校内项目、比赛和志愿实践。</p></div><button className="primary-btn" onClick={startAdd}>添加经历</button></header>
    {loading ? <div className="timeline-state">正在同步成长记录…</div> : null}{error ? <div className="timeline-state error"><p>{error}</p><button onClick={reload}>重新加载</button></div> : null}
    {!loading && !error && !items.length ? <div className="timeline-empty"><span>◇</span><h3>开始建立真实的成长记录</h3><p>参加平台活动，或手动添加一段经历。</p><button className="outline-btn" onClick={startAdd}>添加第一条经历</button></div> : null}
    <div className="growth-timeline-list">{items.map((item, index) => <article key={item.id} className={item.certified ? "certified" : "manual"}><div className="timeline-marker"><i /><time>{new Date(item.occurredAt).toLocaleDateString("zh-CN")}</time></div><button className="timeline-main-card" onClick={() => setSelected(item)}><header><span>{item.certified ? "JA 认证" : item.category}</span><em>{item.isPublic ? "已公开" : "仅自己可见"}</em></header><h3>{item.title}</h3><p>{item.description || item.role || "查看经历详情"}</p>{item.output ? <strong>产出：{item.output}</strong> : null}</button><div className="timeline-order-controls"><button disabled={!index} aria-label={`上移${item.title}`} onClick={() => reorder(item,-1)}>↑</button><button disabled={index===items.length-1} aria-label={`下移${item.title}`} onClick={() => reorder(item,1)}>↓</button></div></article>)}</div>
    <SidePanel open={Boolean(selected)} title={selected?.title || "经历详情"} description={selected ? `${new Date(selected.occurredAt).toLocaleDateString("zh-CN")} · ${selected.certified ? "JA 认证经历" : selected.category}` : undefined} onClose={() => setSelected(null)} footer={selected ? <div className="timeline-detail-actions"><button className="outline-btn" onClick={() => setVisibility(selected)}>{selected.isPublic ? "设为仅自己可见" : "公开到成长主页"}</button>{selected.sourceType === "manual" ? <><button onClick={() => startEdit(selected)}>编辑</button><button className="danger-text-btn" onClick={() => remove(selected)}>删除</button></> : null}</div> : null}>{selected ? <div className="timeline-detail"><dl><div><dt>角色</dt><dd>{selected.role || "参与者"}</dd></div><div><dt>经历说明</dt><dd>{selected.description || "暂无补充"}</dd></div><div><dt>成果产出</dt><dd>{selected.output || "暂无补充"}</dd></div></dl>{selected.evidenceUrl ? <a href={selected.evidenceUrl} target="_blank" rel="noreferrer">查看成果证明 ↗</a> : null}{selected.certified ? <aside><b>JA 认证</b><p>该记录由平台活动流程生成，不可由学生修改或删除。</p></aside> : null}</div> : null}</SidePanel>
    <Dialog open={editing} title={draft.id ? "编辑经历" : "添加成长经历"} description="记录做了什么、承担什么角色，以及最终产出。" dirty={Boolean(draft.title || draft.description || draft.output)} onClose={() => setEditing(false)} footer={<button className="primary-btn" disabled={saving} onClick={save}>{saving?"正在保存…":"保存到时间轴"}</button>}><div className="experience-editor"><label><span>经历名称 *</span><input value={draft.title} onChange={(event)=>change("title",event.target.value)} /></label><div><label><span>日期 *</span><input type="date" value={draft.occurredAt} onChange={(event)=>change("occurredAt",event.target.value)} /></label><label><span>类型</span><select value={draft.category} onChange={(event)=>change("category",event.target.value)}><option>学生项目</option><option>比赛竞赛</option><option>志愿实践</option><option>校园活动</option><option>实习实践</option><option>其他经历</option></select></label></div><label><span>我的角色</span><input value={draft.role} onChange={(event)=>change("role",event.target.value)} placeholder="例如：项目负责人 / 研究成员" /></label><label><span>做了什么</span><textarea rows={4} value={draft.description} onChange={(event)=>change("description",event.target.value)} /></label><label><span>成果产出</span><textarea rows={3} value={draft.output} onChange={(event)=>change("output",event.target.value)} /></label><label><span>成果链接</span><input type="url" value={draft.evidenceUrl} onChange={(event)=>change("evidenceUrl",event.target.value)} placeholder="https://" /></label><label className="evidence-upload"><span>或上传成果图片</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event)=>addEvidence(event.target.files?.[0])} /></label><label className="visibility-check"><input type="checkbox" checked={draft.isPublic} onChange={(event)=>change("isPublic",event.target.checked)} /><span>公开展示在成长主页</span></label></div></Dialog>
  </section>;
}
