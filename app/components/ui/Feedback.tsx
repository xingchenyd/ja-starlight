"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type NoticeTone = "info" | "success" | "error";
type Notice = { id: number; message: string; tone: NoticeTone };
type ToastContextValue = { show: (message: string, tone?: NoticeTone) => number; dismiss: (id: number) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const remaining = useRef(new Map<number, number>());
  const startedAt = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    remaining.current.delete(id);
    startedAt.current.delete(id);
    setNotices((value) => value.filter((notice) => notice.id !== id));
  }, []);

  const schedule = useCallback((id: number, delay: number) => {
    remaining.current.set(id, delay);
    startedAt.current.set(id, Date.now());
    timers.current.set(id, setTimeout(() => dismiss(id), delay));
  }, [dismiss]);

  const show = useCallback((message: string, tone: NoticeTone = "success") => {
    const id = ++nextId.current;
    setNotices((value) => [...value.slice(-2), { id, message, tone }]);
    schedule(id, 2600);
    return id;
  }, [schedule]);

  const pause = (id: number) => {
    const timer = timers.current.get(id);
    if (!timer) return;
    clearTimeout(timer);
    timers.current.delete(id);
    const elapsed = Date.now() - (startedAt.current.get(id) || Date.now());
    remaining.current.set(id, Math.max(300, (remaining.current.get(id) || 2600) - elapsed));
  };

  const resume = (id: number) => {
    if (timers.current.has(id)) return;
    schedule(id, remaining.current.get(id) || 1200);
  };

  const value = useMemo(() => ({ show, dismiss }), [dismiss, show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toast-viewport" aria-live="polite" aria-atomic="false">
        {notices.map((notice) => (
          <div
            key={notice.id}
            className="ui-toast motion-panel-enter"
            data-tone={notice.tone}
            role={notice.tone === "error" ? "alert" : "status"}
            onMouseEnter={() => pause(notice.id)}
            onMouseLeave={() => resume(notice.id)}
            onFocus={() => pause(notice.id)}
            onBlur={() => resume(notice.id)}
          >
            <span aria-hidden="true">{notice.tone === "error" ? "!" : notice.tone === "success" ? "✓" : "i"}</span>
            <p>{notice.message}</p>
            <button type="button" aria-label="关闭提示" onClick={() => dismiss(notice.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

export function InlineError({ title = "操作未完成", message, retry }: { title?: string; message: string; retry?: () => void }) {
  return (
    <div className="ui-inline-error" role="alert">
      <span aria-hidden="true">!</span>
      <div><b>{title}</b><p>{message}</p></div>
      {retry ? <button type="button" onClick={retry}>重新尝试</button> : null}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <section className="ui-empty-state">
      <span aria-hidden="true">◇</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? <div>{action}</div> : null}
    </section>
  );
}

export function Skeleton({ lines = 3, label = "正在读取内容" }: { lines?: number; label?: string }) {
  return (
    <div className="ui-skeleton" role="status" aria-label={label}>
      {Array.from({ length: Math.max(1, lines) }, (_, index) => <i key={index} style={{ width: `${92 - index * 11}%` }} />)}
    </div>
  );
}

