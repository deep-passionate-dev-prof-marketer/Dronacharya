import React from "react";
import type { AnalyticsQuery, Meta } from "./analyticsClient";

export interface AnalyticsCtx {
  query: AnalyticsQuery;
  setQuery: (patch: Partial<AnalyticsQuery>) => void;
  meta: Meta | null;
  /** Adds one value to a filter (drill-down) */
  addFilter: (key: string, value: string) => void;
  openSession: (recordingId: string) => void;
  openTeacher: (teacherId: string) => void;
  isAdmin: boolean;
}

export const AnalyticsContext = React.createContext<AnalyticsCtx | null>(null);

export function useAnalytics() {
  const ctx = React.useContext(AnalyticsContext);
  if (!ctx) throw new Error("useAnalytics outside ClassAnalytics");
  return ctx;
}

/** Label for a filter value from the meta options (falls back to the raw value). */
export function optionLabel(meta: Meta | null, key: string, value: string) {
  return meta?.filters[key]?.find((o) => o.value === value)?.label || (value === "unknown" ? "Unknown" : value);
}
