"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";

type OverlayProps = {
  open: boolean;
  title: string;
  description?: string;
  dirty?: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function OverlayFrame({
  open,
  title,
  description,
  dirty = false,
  onClose,
  children,
  footer,
  variant,
}: OverlayProps & { variant: "dialog" | "panel" }) {
  const titleId = useId();
  const descriptionId = useId();
  const frame = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const requestClose = useCallback(() => {
    if (dirty && !window.confirm("尚有未保存内容，确认离开？")) return;
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      const target = frame.current?.querySelector<HTMLElement>(focusableSelector) || frame.current;
      target?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !frame.current) return;
      const controls = [...frame.current.querySelectorAll<HTMLElement>(focusableSelector)];
      if (!controls.length) {
        event.preventDefault();
        frame.current.focus();
        return;
      }
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [open, requestClose]);

  if (!open) return null;
  return (
    <div className="ui-overlay-root">
      <button type="button" className="ui-overlay-backdrop" aria-label={`关闭${title}`} onClick={requestClose} />
      <section
        ref={frame}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`ui-overlay-frame ui-${variant} motion-panel-enter`}
      >
        <header className="ui-overlay-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <button type="button" className="ui-overlay-close motion-pressable" aria-label={`关闭${title}`} onClick={requestClose}>×</button>
        </header>
        <div className="ui-overlay-body">{children}</div>
        {footer ? <footer className="ui-overlay-footer">{footer}</footer> : null}
      </section>
    </div>
  );
}

export function Dialog(props: OverlayProps) {
  return <OverlayFrame {...props} variant="dialog" />;
}

export function SidePanel(props: OverlayProps) {
  return <OverlayFrame {...props} variant="panel" />;
}
