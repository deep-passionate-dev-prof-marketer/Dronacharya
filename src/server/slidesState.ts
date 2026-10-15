/** Which slide deck each class is showing, and on which page (kept in memory and in the database). */
import { kvDelete, kvLoad, kvUpsert, persist } from "./db/kv";

export interface SlidesState {
  roomSlug: string;
  materialId: string;
  title: string;
  page: number;
  pageCount: number | null;
  /** Shown on the main stage for everyone (otherwise only in the Slides & notes panel) */
  onStage: boolean;
  updatedAt: string;
  by: string;
}

const state = new Map<string, SlidesState>();
let loaded: Promise<void> | null = null;

export function slidesLoaded() {
  if (!loaded) {
    loaded = kvLoad<SlidesState>("slides")
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

export async function getSlides(roomSlug: string) {
  await slidesLoaded().catch(() => {});
  return state.get(roomSlug) || null;
}

export function setSlides(s: SlidesState) {
  state.set(s.roomSlug, s);
  persist("slides", kvUpsert("slides", [{ key: s.roomSlug, value: s }]));
}

export function clearSlides(roomSlug: string) {
  state.delete(roomSlug);
  persist("slides", kvDelete("slides", roomSlug));
}

/** Rooms currently presenting this deck (its learners may open the file) */
export function roomsPresenting(materialId: string): string[] {
  return [...state.values()].filter((s) => s.materialId === materialId).map((s) => s.roomSlug);
}
