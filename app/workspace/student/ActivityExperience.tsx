/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Activity } from "../../data";
import { useReducedMotion } from "../../components/motion";
import FavoriteButton from "../../components/catalog/FavoriteButton";
import ActivityCalendar from "./ActivityCalendar";
import RegistrationPanel, { type RegistrationItem } from "./RegistrationPanel";
import { studentRequest, type StudentCalendarEvent, type StudentFavorite } from "./useStudentData";

function activeRegistration(items: RegistrationItem[], activityId: string) {
  return items.find((item) => item.activityId === activityId && item.status !== "cancelled");
}

export default function ActivityExperience({
  activities,
  initialItem,
  profile,
  favorites,
  calendar,
  onNavigate,
  onToggleFavorite,
  onToggleReminder,
  onPrivateReload,
  flash,
}: {
  activities: Activity[];
  initialItem?: string;
  profile: Record<string, unknown>;
  favorites: StudentFavorite[];
  calendar: StudentCalendarEvent[];
  onNavigate: (tab: string, itemId?: string, preserveSearch?: boolean) => void;
  onToggleFavorite: (targetType: "activity", targetId: string, snapshot: Record<string, unknown>) => Promise<boolean>;
  onToggleReminder: (sourceId: string, enabled: boolean) => Promise<void>;
  onPrivateReload: () => void;
  flash: (message: string) => void;
}) {
  const reducedMotion = useReducedMotion();
  const list = useMemo(() => [...activities].filter((item) => item.status !== "已下线").sort((a, b) => Number(b.sortOrder || 0) - Number(a.sortOrder || 0) || String(b.date).localeCompare(String(a.date))), [activities]);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const selected = list.find((item) => item.id === initialItem) || null;
  const active = list[activeIndex % Math.max(list.length, 1)] || null;

  const loadRegistrations = async () => {
    try {
      const response = await studentRequest("/api/registrations");
      const payload = await response.json();
      setRegistrations(response.ok ? payload.registrations || [] : []);
    } catch { setRegistrations([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let activeRequest = true;
    studentRequest("/api/registrations")
      .then(async (response) => ({ ok: response.ok, payload: await response.json() }))
      .then(({ ok, payload }) => { if (activeRequest) setRegistrations(ok ? payload.registrations || [] : []); })
      .catch(() => { if (activeRequest) setRegistrations([]); })
      .finally(() => { if (activeRequest) setLoading(false); });
    return () => { activeRequest = false; };
  }, []);
  useEffect(() => {
    if (reducedMotion || paused || interacting || list.length < 2) return;
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % list.length), 5000);
    return () => window.clearInterval(timer);
  }, [interacting, list.length, paused, reducedMotion]);

  const open = (activity: Activity) => onNavigate("activities", activity.id, true);
  const close = () => onNavigate("activities", undefined, true);
  const registrationFor = (activity: Activity) => activeRegistration(registrations, activity.id);
  const stateText = (activity: Activity) => {
    const registration = registrationFor(activity);
    if (!registration) return "查看详情并报名";
    if (registration.status === "approved") return "报名已通过";
    if (registration.status === "rejected") return "修改报名信息";
    return "等待发布方确认";
  };

  const submit = async (activity: Activity, answers: Record<string, string>) => {
    const response = await studentRequest("/api/registrations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ activityId: activity.id, activityTitle: activity.title, activityDate: activity.date, answers }) });
    const payload = await response.json();
    if (!response.ok) { flash(payload.error || "报名失败，请稍后重试"); return false; }
    await loadRegistrations();
    onPrivateReload();
    flash("报名已提交，活动已加入我的日历");
    return true;
  };
  const cancel = async (activity: Activity) => {
    const response = await studentRequest(`/api/registrations?activityId=${encodeURIComponent(activity.id)}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) { flash(payload.error || "取消报名失败"); return false; }
    await loadRegistrations();
    onPrivateReload();
    flash("已取消本次活动报名");
    close();
    return true;
  };
  const favorite = async (activity: Activity) => {
    try { await onToggleFavorite("activity", activity.id, { title: activity.title, publisher: activity.publisher || "JA China", cover: activity.cover, date: activity.date }); }
    catch (error) { flash(error instanceof Error ? error.message : "收藏失败"); }
  };
  const isFavorite = (activity: Activity) => favorites.some((item) => item.targetType === "activity" && item.targetId === activity.id && item.status !== "removed");

  return (
    <>
      <header className="student-section-heading">
        <div><small>ACTIVITIES</small><h1>成长活动</h1></div>
        <ActivityCalendar items={calendar} onToggleReminder={onToggleReminder} />
      </header>
      {loading ? <div className="activity-sync-state">正在同步报名与日历状态…</div> : null}
      {active ? (
        <section className="refined-activity-showcase" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={() => setInteracting(false)}>
          <div className="activity-stage">
            <div className="activity-stage-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
              {list.map((activity) => <button key={activity.id} onClick={() => open(activity)}><img src={activity.cover} alt={activity.title} /><span><em>{activity.category}</em><b>{activity.title}</b><small>{activity.publisher || "JA China"} · {activity.date}</small></span></button>)}
            </div>
            <div className="activity-stage-controls">
              <button aria-label="上一项活动" onClick={() => setActiveIndex((activeIndex - 1 + list.length) % list.length)}>←</button>
              <span>{activeIndex + 1} / {list.length}</span>
              <button aria-label="下一项活动" onClick={() => setActiveIndex((activeIndex + 1) % list.length)}>→</button>
              <button className="carousel-pause" onClick={() => setPaused((value) => !value)}>{paused ? "继续轮播" : "暂停轮播"}</button>
            </div>
          </div>
          <aside className="activity-stage-summary">
            <small>{active.publisher || "JA China"} · {active.date}</small>
            <h2>{active.title}</h2><p>{active.summary}</p>
            <div className="activity-fact-row"><span>{active.place}</span><span>{active.registered} / {active.capacity} 人</span><span>{active.status}</span></div>
            <div className="activity-stage-actions"><FavoriteButton active={isFavorite(active)} onToggle={() => favorite(active)} /><button className="primary-btn" onClick={() => open(active)}>{stateText(active)}</button></div>
          </aside>
        </section>
      ) : <section className="activity-empty-state"><h2>暂无可报名活动</h2><p>新活动通过审核后会显示在这里。</p></section>}
      <div className="activity-directory-heading"><div><small>ALL ACTIVITIES</small><h2>全部活动</h2></div><span>按 JA 运营排序及日期展示</span></div>
      <div className="refined-activity-feed">
        {list.map((activity) => <article key={activity.id}>
          <button className="activity-feed-cover" onClick={() => open(activity)}><img src={activity.cover} alt={activity.title} /><span>{activity.category}</span></button>
          <div><small>{activity.publisher || "JA China"} · {activity.date}</small><h2><button onClick={() => open(activity)}>{activity.title}</button></h2><p>{activity.summary}</p><div className="activity-fact-row"><span>{activity.place}</span><span>{activity.registered} / {activity.capacity} 人</span><span>{activity.status}</span></div></div>
          <div className="activity-row-actions"><FavoriteButton active={isFavorite(activity)} onToggle={() => favorite(activity)} /><button className="outline-btn" onClick={() => open(activity)}>{stateText(activity)}</button></div>
        </article>)}
      </div>
      <RegistrationPanel key={selected?.id || "closed"} activity={selected} open={Boolean(selected)} profile={profile} registration={selected ? registrationFor(selected) : undefined} onClose={close} onSubmit={(answers) => selected ? submit(selected, answers) : Promise.resolve(false)} onCancel={() => selected ? cancel(selected) : Promise.resolve(false)} />
    </>
  );
}
