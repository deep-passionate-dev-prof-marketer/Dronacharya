/**
 * Attendance for one class session from LiveKit join/leave events (webhooks).
 * Time in the waiting room counts as present (the learner arrived; the host decides when to admit).
 */
export type AttendanceStatus = "present" | "late" | "left_early" | "absent";

export interface AttendanceResult {
  status: AttendanceStatus;
  minutesPresent: number;
  sessionMinutes: number;
  firstJoinAt: string | null;
  lastLeaveAt: string | null;
}

export const LATE_AFTER_MIN = 5;
export const EARLY_LEAVE_MIN = 5;

/**
 * @param events join/leave events for this learner in this room (any order)
 * @param start session start; @param end session end (or now for a running class)
 */
export function computeAttendance(events: Array<{ event: "join" | "leave"; at: string | Date }>, start: Date, end: Date): AttendanceResult {
  const s = start.getTime();
  const e = Math.max(s, end.getTime());
  const sessionMinutes = Math.round((e - s) / 60000);
  // Joins shortly before the start (opening the class early) count from the start
  const window = events
    .map((x) => ({ event: x.event, t: new Date(x.at).getTime() }))
    .filter((x) => x.t <= e && x.t >= s - 60 * 60000)
    .sort((a, b) => a.t - b.t);

  let open: number | null = null;
  let ms = 0;
  let firstJoin: number | null = null;
  let lastLeave: number | null = null;
  for (const x of window) {
    if (x.event === "join") {
      if (open === null) open = Math.max(x.t, s);
      if (firstJoin === null) firstJoin = Math.max(x.t, s);
    } else if (open !== null) {
      const t = Math.max(x.t, s);
      ms += Math.max(0, t - open);
      open = null;
      lastLeave = t;
    }
  }
  if (open !== null) ms += Math.max(0, e - open); // still in class (or never left before the end)
  const minutesPresent = Math.round(ms / 60000);

  let status: AttendanceStatus;
  if (firstJoin === null || ms === 0) status = "absent";
  else if (firstJoin - s > LATE_AFTER_MIN * 60000) status = "late";
  else if (open === null && lastLeave !== null && e - lastLeave > EARLY_LEAVE_MIN * 60000) status = "left_early";
  else status = "present";

  return {
    status,
    minutesPresent,
    sessionMinutes,
    firstJoinAt: firstJoin === null ? null : new Date(firstJoin).toISOString(),
    lastLeaveAt: open === null && lastLeave !== null ? new Date(lastLeave).toISOString() : null,
  };
}
