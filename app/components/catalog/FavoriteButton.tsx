"use client";

import { useState } from "react";

export default function FavoriteButton({ active, onToggle, label = "收藏" }: { active: boolean; onToggle: () => Promise<void>; label?: string }) {
  const [pending, setPending] = useState(false);
  const toggle = async () => {
    if (pending) return;
    setPending(true);
    try { await onToggle(); } finally { setPending(false); }
  };
  return (
    <button
      type="button"
      className={`favorite-button ${active ? "active" : ""}`}
      aria-pressed={active}
      aria-label={active ? `取消${label}` : label}
      disabled={pending}
      onClick={toggle}
    >
      <span aria-hidden="true">{active ? "♥" : "♡"}</span>
      {pending ? "正在保存…" : active ? "已收藏" : label}
    </button>
  );
}
