import type { HTMLAttributes, ReactNode } from "react";

export function Surface({ as = "section", className = "", children, ...props }: HTMLAttributes<HTMLElement> & { as?: "section" | "article" | "div"; children: ReactNode }) {
  const Component = as;
  return <Component {...props} className={`ui-surface ${className}`.trim()}>{children}</Component>;
}

export function StatusBadge({ tone = "neutral", children }: { tone?: "neutral" | "info" | "success" | "warning" | "danger"; children: ReactNode }) {
  return <span className="ui-status-badge" data-tone={tone}>{children}</span>;
}

