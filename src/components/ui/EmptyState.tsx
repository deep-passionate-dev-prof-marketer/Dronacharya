import React from "react";

export const EmptyState: React.FC<{ icon?: React.ComponentType<{ className?: string }>; title: string; children?: React.ReactNode; action?: React.ReactNode; compact?: boolean }> = ({
  icon: Icon,
  title,
  children,
  action,
  compact,
}) => (
  <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-6" : "py-12"} px-4`}>
    {Icon && (
      <span className="mb-3 w-11 h-11 rounded-2xl bg-white/5 border border-line flex items-center justify-center text-ink-3">
        <Icon className="w-5 h-5" />
      </span>
    )}
    <p className="text-sm font-semibold text-ink">{title}</p>
    {children && <div className="mt-1 text-xs text-ink-3 max-w-sm leading-relaxed">{children}</div>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => <div className={`animate-pulse rounded-lg bg-white/5 ${className || "h-4 w-full"}`} aria-hidden="true" />;

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-critical/30 bg-critical/10 px-4 py-3 text-sm text-ink">
    <span className="min-w-0">{message}</span>
    {onRetry && (
      <button onClick={onRetry} className="min-h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold">
        Try again
      </button>
    )}
  </div>
);
