import React from "react";
import { cx } from "./cx";

export const inputClass =
  "w-full min-h-11 rounded-xl bg-surface-sunken border border-line-strong px-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent disabled:opacity-60";

export const Field: React.FC<{ label: string; hint?: React.ReactNode; error?: string; children: (id: string, describedBy?: string) => React.ReactNode; className?: string }> = ({
  label,
  hint,
  error,
  children,
  className,
}) => {
  const id = React.useId();
  const hintId = hint || error ? `${id}-hint` : undefined;
  return (
    <div className={cx("flex flex-col gap-1.5 min-w-0", className)}>
      <label htmlFor={id} className="text-xs font-semibold text-ink-2">
        {label}
      </label>
      {children(id, hintId)}
      {(hint || error) && (
        <p id={hintId} className={cx("text-2xs leading-relaxed", error ? "text-critical" : "text-ink-3")}>
          {error || hint}
        </p>
      )}
    </div>
  );
};

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, children, ...rest }) => (
  <select className={cx(inputClass, "pr-8 appearance-none bg-[length:12px] bg-no-repeat bg-[right_0.75rem_center] select-chevron", className)} {...rest}>
    {children}
  </select>
);
