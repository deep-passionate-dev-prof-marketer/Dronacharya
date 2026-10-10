import React from "react";
import { cx } from "./cx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand-blue text-white hover:bg-brand-blue-strong border border-transparent",
  secondary: "bg-white/5 text-ink hover:bg-white/10 border border-line-strong",
  ghost: "bg-transparent text-ink-2 hover:bg-white/5 hover:text-ink border border-transparent",
  danger: "bg-critical/15 text-critical hover:bg-critical/25 border border-critical/30",
};
const SIZE: Record<Size, string> = {
  sm: "min-h-9 px-3 text-xs gap-1.5 rounded-lg",
  md: "min-h-11 px-4 text-sm gap-2 rounded-xl",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon: Icon, loading, className, children, disabled, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        className
      )}
      {...rest}
    >
      {loading ? (
        <span className="w-4 h-4 rounded-full border-2 border-current/30 border-t-current animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      )}
      {children}
    </button>
  );
});

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ComponentType<{ className?: string }>;
  /** Spoken and shown as a tooltip */
  label: string;
  size?: Size;
  active?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, size = "md", active, className, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex items-center justify-center shrink-0 rounded-xl border transition-colors disabled:opacity-50",
        size === "sm" ? "h-9 w-9" : "h-11 w-11",
        active ? "bg-accent/15 border-accent/40 text-ink" : "bg-white/5 border-line text-ink-2 hover:text-ink hover:bg-white/10",
        className
      )}
      {...rest}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
});
