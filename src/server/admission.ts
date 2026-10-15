/**
 * The waiting room's memory: who has been admitted to each class for the current session, so a
 * learner who refreshes or reconnects isn't sent back to the lobby. Kept in the database too, so a
 * restart or deploy mid-class doesn't send everyone back.
 */
import { kvDelete, kvLoad, kvUpsert, persist } from "./db/kv";

/** Identities admitted in each room for this class session (rejoin after refresh skips the lobby). */
export const admittedByRoom = new Map<string, Set<string>>();

// Kept in the database too, so a server restart or deploy mid-class doesn't send everyone back to the lobby
let admittedReady: Promise<void> | null = null;
export function admittedLoaded() {
  if (!admittedReady) {
    admittedReady = kvLoad<string[]>("room_admitted").then(
      (rows) => {
        for (const { key, value } of rows) admittedByRoom.set(key, new Set(value));
      },
      (err) => {
        // Don't cache a failure: the next request tries again
        admittedReady = null;
        throw err;
      }
    );
  }
  return admittedReady;
}
export function saveAdmitted(roomSlug: string) {
  const set = admittedByRoom.get(roomSlug);
  persist("admitted", set && set.size ? kvUpsert("room_admitted", [{ key: roomSlug, value: [...set] }]) : kvDelete("room_admitted", roomSlug));
}
/** New class session: everyone waits to be admitted again. */
export function clearAdmitted(roomSlug: string) {
  admittedByRoom.delete(roomSlug);
  saveAdmitted(roomSlug);
}

