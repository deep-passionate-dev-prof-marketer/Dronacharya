import React from "react";
import { cx } from "./cx";

export type Tone = "neutral" | "accent" | "good" | "warning" | "serious" | "critical";

const TONE: Record<Tone, string> = {
  neutral: "bg-white/5 text-ink-2 border-line-strong",
  accent: "bg-accent/15 text-accent border-accent/30",
  good: "bg-good/12 text-good border-good/30",
  warning: "bg-warning/12 text-warning border-warning/30",
  serious: "bg-serious/12 text-serious border-serious/30",
  critical: "bg-critical/12 text-critical border-critical/30",
};

export const Badge: React.FC<{ tone?: Tone; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode; className?: string; title?: string }> = ({
  tone = "neutral",
  icon: Icon,
  children,
  className,
  title,
}) => (
  <span title={title} className={cx("inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-2xs font-semibold whitespace-nowrap", TONE[tone], className)}>
    {Icon && <Icon className="w-3 h-3" aria-hidden="true" />}
    {children}
  </span>
);

/** Marks content that isn't real data (legacy demo screens). */
export const SampleBadge: React.FC<{ className?: string }> = ({ className }) => (
  <Badge tone="warning" className={className} title="Illustrative content, not live data">
    Sample
  </Badge>
);

/**
 * Top-of-page notice for screens that still run on illustrative data: says plainly what isn't real,
 * so nobody mistakes it for the school's records.
 */
export const SampleNotice: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div role="note" className={cx("flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-ink-2", className)}>
    <SampleBadge />
    <span className="min-w-0">{children}</span>
  </div>
);
