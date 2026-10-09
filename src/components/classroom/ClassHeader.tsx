import React, { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { ClassInfo, ClassKind, describeClass, KIND_TONE } from "../../services/classLabels";

/** Loads the scheduled class for a room (null when the room has no class record). */
export function useClassInfo(roomSlug: string | null | undefined) {
  const [info, setInfo] = useState<ClassInfo | null>(null);
  useEffect(() => {
    if (!roomSlug) return;
    let cancelled = false;
    fetch(`/api/classes/by-room/${encodeURIComponent(roomSlug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => !cancelled && setInfo(b?.class || null))
      .catch(() => !cancelled && setInfo(null));
    return () => {
      cancelled = true;
    };
  }, [roomSlug]);
  return info;
}

interface Props {
  roomSlug: string;
  /** Used when the room has no scheduled class (ad-hoc rooms) */
  fallbackTitle?: string;
  /** Force a kind, e.g. the 1:1 counselling breakout */
  kindOverride?: ClassKind;
  compact?: boolean;
}

/** "Demo class · Robotics: Build your first robot" + course/grade, and the day for enrolled classes. */
export const ClassHeader: React.FC<Props> = ({ roomSlug, fallbackTitle, kindOverride, compact }) => {
  const info = useClassInfo(roomSlug);
  if (!info && !fallbackTitle) return null;
  const heading = info
    ? describeClass({ ...info, kind: kindOverride || info.kind })
    : { badge: kindOverride ? describeClass({ kind: kindOverride, subject: "", scheduledStart: new Date().toISOString() }).badge : "Class", title: fallbackTitle!, detail: "" };
  const kind = (kindOverride || info?.kind || "enrolled") as ClassKind;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`shrink-0 px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${KIND_TONE[kind]}`}>{heading.badge}</span>
      <div className="min-w-0">
        <div className={`truncate font-semibold text-white ${compact ? "text-xs" : "text-sm"}`} title={heading.title}>
          {heading.title}
        </div>
        {heading.detail && !compact && (
          <div className="truncate text-[11px] text-slate-400 flex items-center gap-1" title={heading.detail}>
            {kind === "enrolled" && <CalendarDays className="w-3 h-3 shrink-0" />}
            {heading.detail}
          </div>
        )}
      </div>
    </div>
  );
};
