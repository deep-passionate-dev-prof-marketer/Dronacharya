/**
 * Breakout room state (which learners are in which group), kept in memory and in the database so a
 * restart mid-class keeps everyone in their group. Rooms are named `<class room>--bo-<n>`.
 */
import { kvDelete, kvLoad, kvUpsert, persist } from "./db/kv";
import { BREAKOUT_SEP, parentRoom } from "./roomAccess";
import type { SessionUser } from "./auth/session";

export interface BreakoutGroup {
  n: number;
  name: string;
  members: string[];
}
export interface BreakoutState {
  roomSlug: string;
  groups: BreakoutGroup[];
  startedAt: string;
  startedBy: string;
  /** ISO time the groups close by themselves (optional timer) */
  endsAt: string | null;
}

const state = new Map<string, BreakoutState>();
let loaded: Promise<void> | null = null;

export function breakoutsLoaded() {
  if (!loaded) {
    loaded = kvLoad<BreakoutState>("breakouts")
      .then((rows) => {
        for (const { key, value } of rows) state.set(key, value);
      })
      .catch((err) => {
        loaded = null;
        throw err;
      });
  }
  return loaded;
}

export const breakoutRoomName = (roomSlug: string, n: number) => `${roomSlug}${BREAKOUT_SEP}${n}`;
export const breakoutNumber = (slug: string) => Number(slug.slice(slug.indexOf(BREAKOUT_SEP) + BREAKOUT_SEP.length)) || 0;

export async function getBreakouts(roomSlug: string) {
  await breakoutsLoaded();
  return state.get(parentRoom(roomSlug)) || null;
}

export function setBreakouts(s: BreakoutState) {
  state.set(s.roomSlug, s);
  persist("breakouts", kvUpsert("breakouts", [{ key: s.roomSlug, value: s }]));
}

/** Every class with breakouts running (after loading) */
export async function allBreakouts() {
  await breakoutsLoaded();
  return [...state.values()];
}

export function clearBreakouts(roomSlug: string) {
  state.delete(roomSlug);
  persist("breakouts", kvDelete("breakouts", roomSlug));
}

/** The group a learner is in, if breakouts are running in their class */
export async function groupOf(roomSlug: string, userId: string) {
  const s = await getBreakouts(roomSlug);
  return s?.groups.find((g) => g.members.includes(userId)) || null;
}

/** Learners may only enter their own group's room; hosts, auditors and admins may visit any group. */
export async function breakoutAllowed(user: Pick<SessionUser, "id" | "role">, slug: string) {
  const s = await getBreakouts(slug);
  if (!s) return false;
  const n = breakoutNumber(slug);
  if (!s.groups.some((g) => g.n === n)) return false;
  if (user.role !== "student") return true;
  return s.groups.find((g) => g.n === n)!.members.includes(user.id);
}
