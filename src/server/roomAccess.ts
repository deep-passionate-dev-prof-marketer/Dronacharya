/**
 * Who may host a room and who may be in it. One place, used by tokens, sockets, sessions, invites,
 * materials and breakouts. Breakout rooms (`<room>--bo-<n>`) follow their parent room's rules.
 */
import { classByRoom, learnerKeys, STAFF } from "./classesHub";
import type { SessionUser } from "./auth/session";

export const BREAKOUT_SEP = "--bo-";
export const isBreakoutRoom = (slug: string) => slug.includes(BREAKOUT_SEP);
/** The class a room belongs to (a breakout room's parent; otherwise the room itself) */
export const parentRoom = (slug: string) => (isBreakoutRoom(slug) ? slug.slice(0, slug.indexOf(BREAKOUT_SEP)) : slug);

/** Hosts: admins; the class's own teacher; counsellors on demo/admission/counselling sessions; any teacher or counsellor in an ad-hoc room. */
export async function canHost(user: Pick<SessionUser, "id" | "role">, roomSlug: string): Promise<boolean> {
  if (user.role === "admin") return true;
  if (!["instructor", "sales_rep"].includes(user.role)) return false;
  const cls = await classByRoom(parentRoom(roomSlug));
  if (!cls) return true;
  if (cls.teacherId === user.id) return true;
  return user.role === "sales_rep" && cls.kind !== "enrolled" && cls.kind !== "doubt_clearing";
}

/** Who the class is hosted by, for "Hosted by …" messages */
export async function hostName(roomSlug: string): Promise<string | null> {
  const cls = await classByRoom(parentRoom(roomSlug));
  return cls?.teacherName || null;
}

/** Staff may be in any room; learners only in classes they're enrolled in (and in ad-hoc rooms); parents never join live. */
export async function canAccessRoom(user: Pick<SessionUser, "id" | "role">, roomSlug: string): Promise<boolean> {
  if (STAFF.includes(user.role) || (user.role as string) === "ta") return true;
  const cls = await classByRoom(parentRoom(roomSlug));
  if (!cls) return user.role === "student";
  const keys = (await learnerKeys(user.id, user.role)).map((k) => k.toLowerCase());
  return cls.studentKeys.some((k: string) => keys.includes(k.toLowerCase()));
}

/** Learner (or a learner's parent) enrolled in this room's class */
export async function isEnrolled(userId: string, role: string, roomSlug: string): Promise<boolean> {
  const cls = await classByRoom(parentRoom(roomSlug));
  if (!cls) return false;
  const keys = (await learnerKeys(userId, role)).map((k) => k.toLowerCase());
  return cls.studentKeys.some((k: string) => keys.includes(k.toLowerCase()));
}
