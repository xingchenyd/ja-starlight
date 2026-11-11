"use client";
import { useEffect, useRef, type ReactNode } from "react";
export default function CampusOverlay({ children, onClose, dirty = false, blocked = false }: { children: ReactNode; onClose: () => void; dirty?: boolean; blocked?: boolean }) {
  const frame = useRef<HTMLDivElement>(null), close = useRef(onClose), guard = useRef({ dirty, blocked });
  useEffect(() => { close.current = onClose; guard.current = { dirty, blocked }; }, [onClose, dirty, blocked]);
  const requestClose = () => { if (guard.current.blocked) return; if (guard.current.dirty && !confirm("尚有未保存内容，确认离开？")) return; close.current(); };
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null, overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const selector = "button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex='0']";
    const timer = setTimeout(() => frame.current?.querySelector<HTMLElement>(selector)?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); if (!guard.current.blocked && (!guard.current.dirty || confirm("尚有未保存内容，确认离开？"))) close.current(); }
      if (event.key === "Tab") {
        const nodes = [...(frame.current?.querySelectorAll<HTMLElement>(selector) || [])];
        const first = nodes[0], last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => { clearTimeout(timer); document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, []);
  return <div ref={frame} className="campus-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) requestClose(); }}>{children}</div>;
}
