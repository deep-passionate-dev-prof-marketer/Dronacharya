import React from "react";
import { cx } from "./cx";

export const Card: React.FC<React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article"; padded?: boolean }> = ({
  as: Tag = "section",
  padded = true,
  className,
  children,
  ...rest
}) => (
  <Tag className={cx("bg-surface border border-line rounded-card min-w-0", padded && "p-4 sm:p-5", className)} {...rest}>
    {children}
  </Tag>
);

/** Card title row: title + optional description on the left, actions on the right (wraps on phones). */
export const CardHeader: React.FC<{ title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; id?: string; className?: string }> = ({
  title,
  description,
  actions,
  id,
  className,
}) => (
  <div className={cx("flex flex-wrap items-start justify-between gap-x-4 gap-y-2 mb-4", className)}>
    <div className="min-w-0 flex-1 basis-56">
      <h2 id={id} className="text-sm font-bold text-ink leading-snug">
        {title}
      </h2>
      {description && <p className="mt-0.5 text-xs text-ink-3 leading-relaxed">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </div>
);
