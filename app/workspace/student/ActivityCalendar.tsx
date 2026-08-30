"use client";

import { useMemo, useState } from "react";
import { SidePanel } from "../../components/ui";
import type { StudentCalendarEvent } from "./useStudentData";

function day(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value.replaceAll(".", "-"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function ActivityCalendar({
  items,
  onToggleReminder,
}: {
  items: StudentCalendarEvent[];
  onToggleReminder: (sourceId: string, enabled: boolean) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [current] = useState(() => new Date());
  const activeItems = useMemo(() => items.filter((item) => item.status === "active"), [items]);
  const monthItems = activeItems.filter((item) => {
    const date = day(item.startAt);
    return date && date.getFullYear() === current.getFullYear() && date.getMonth() === current.getMonth();
  });
  const upcoming = [...activeItems].filter((item) => !day(item.startAt) || day(item.startAt)!.getTime() >= current.getTime() - 86_400_000).slice(0, 8);
  const toggle = async (item: StudentCalendarEvent) => {
    setBusy(item.sourceId);
    await onToggleReminder(item.sourceId, !item.reminderEnabled);
    setBusy("");
  };
  return (
    <>
      <button className="activity-calendar-trigger" onClick={() => setOpen(true)}>
        <span><small>MY CALENDAR</small><b>我的活动日历</b></span>
        <em>{upcoming.length ? `${upcoming.length} 项近期安排` : "报名后自动加入"}</em>
      </button>
      <SidePanel open={open} title="我的活动日历" description="报名成功后自动加入，可单独关闭活动前提醒。" onClose={() => setOpen(false)}>
        <div className="activity-calendar-panel">
          <section>
            <h3>本月日历</h3>
            <div className="calendar-month-strip">
              {monthItems.length ? monthItems.map((item) => <article key={item.id}><time>{day(item.startAt)?.getDate() || "—"}</time><span><b>{item.title}</b><small>{day(item.startAt)?.toLocaleDateString("zh-CN")}</small></span></article>) : <p>本月暂无已报名活动</p>}
            </div>
          </section>
          <section>
            <h3>近期安排</h3>
            <div className="calendar-upcoming-list">
              {upcoming.length ? upcoming.map((item) => (
                <article key={item.id}>
                  <span><time>{day(item.startAt)?.toLocaleDateString("zh-CN") || "时间待定"}</time><b>{item.title}</b><small>{item.reminderAt ? `计划提醒：${new Date(item.reminderAt).toLocaleString("zh-CN")}` : "发布方确认时间后将生成提醒"}</small></span>
                  <button className={item.reminderEnabled ? "reminder-on" : ""} disabled={busy === item.sourceId} onClick={() => toggle(item)}>{item.reminderEnabled ? "提醒已开启" : "开启提醒"}</button>
                </article>
              )) : <p className="calendar-empty">报名活动后，这里会显示活动日期和提醒状态。</p>}
            </div>
          </section>
        </div>
      </SidePanel>
    </>
  );
}
