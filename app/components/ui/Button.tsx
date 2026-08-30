import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost" | "danger";
export type ActionState = "idle" | "loading" | "success" | "error";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  state?: ActionState;
  leadingIcon?: ReactNode;
  successLabel?: string;
};

export function Button({
  variant = "primary",
  state = "idle",
  leadingIcon,
  successLabel = "已完成",
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const waiting = state === "loading";
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || waiting}
      aria-busy={waiting || undefined}
      data-variant={variant}
      data-state={state}
      className={`ui-button motion-pressable ${className}`.trim()}
    >
      <span className="ui-button-icon" aria-hidden="true">
        {waiting ? <span className="ui-spinner" /> : state === "success" ? "✓" : state === "error" ? "!" : leadingIcon}
      </span>
      <span className="ui-button-label">{state === "success" ? successLabel : children}</span>
    </button>
  );
}

export type IconButtonProps = Omit<ButtonProps, "children" | "leadingIcon"> & {
  label: string;
  icon: ReactNode;
};

export function IconButton({ label, icon, className = "", variant = "ghost", ...props }: IconButtonProps) {
  return (
    <button
      {...props}
      type={props.type || "button"}
      aria-label={label}
      title={props.title || label}
      data-variant={variant}
      className={`ui-icon-button motion-pressable ${className}`.trim()}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

