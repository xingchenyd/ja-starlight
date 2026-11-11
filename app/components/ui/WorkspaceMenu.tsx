"use client";

import { useId, useRef, useState, type ReactNode } from "react";

export default function WorkspaceMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggle = useRef<HTMLButtonElement>(null);

  const close = () => {
    if (open && toggle.current?.getClientRects().length) {
      setOpen(false);
      toggle.current.focus();
    }
  };

  return <>
    <button ref={toggle} type="button" className="workspace-menu-toggle" aria-controls={menuId} aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <span aria-hidden="true">{open ? "×" : "☰"}</span> {open ? "收起菜单" : "菜单"}
    </button>
    {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Delegates events from native controls inside the menu. */}
    <div id={menuId} className="workspace-menu-items" data-open={open}
      onClick={event => {
        if (event.target instanceof Element && event.target.closest("nav button, nav a")) close();
      }}
      onKeyDown={event => {
        if (event.key === "Escape") close();
      }}>
      {children}
    </div>
  </>;
}
