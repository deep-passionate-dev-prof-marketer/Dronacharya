/**
 * The class's shared slides and notes pad, as small stores the dock panel and the stage both read.
 * The server is the authority: hosts change things through the API, and everyone hears about it
 * as a server message (the media server and the room socket), then re-reads when needed.
 */
import React from "react";
import { classroomTransport } from "./media/classroomTransport";
import { api } from "./apiClient";
import { toast } from "../components/ui/Feedback";

export interface SlidesState {
  roomSlug: string;
  materialId: string;
  title: string;
  page: number;
  pageCount: number | null;
  onStage: boolean;
  updatedAt: string;
}
export interface PadState {
  content: string;
  updatedAt: string | null;
}

type Listener = () => void;

export class Store<T> {
  value: T;
  room = "";
  private listeners = new Set<Listener>();
  constructor(initial: T) {
    this.value = initial;
  }
  set(v: T) {
    this.value = v;
    this.listeners.forEach((l) => l());
  }
  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };
}

export const slidesStore = new Store<SlidesState | null>(null);

export interface BreakoutGroupView {
  n: number;
  name: string;
  room: string;
  members: Array<{ id: string; name: string }>;
}
export type BreakoutsView = { active: false } | { active: true; roomSlug: string; startedAt: string; endsAt: string | null; groups: BreakoutGroupView[] };
export const breakoutsStore = new Store<BreakoutsView>({ active: false });
export const padStore = new Store<PadState>({ content: "", updatedAt: null });

let padTimer: ReturnType<typeof setTimeout> | null = null;

async function loadSlides(room: string) {
  const r = await api<{ slides: SlidesState | null }>("GET", `/api/rooms/${encodeURIComponent(room)}/slides`);
  if (r.ok && slidesStore.room === room) slidesStore.set(r.data.slides);
}
async function loadBreakouts(room: string) {
  const r = await api<{ breakouts: BreakoutsView }>("GET", `/api/rooms/${encodeURIComponent(room)}/breakouts`);
  if (r.ok && breakoutsStore.room === room) breakoutsStore.set(r.data.breakouts);
}
async function loadPad(room: string) {
  const r = await api<{ pad: PadState }>("GET", `/api/rooms/${encodeURIComponent(room)}/pad`);
  if (r.ok && padStore.room === room) padStore.set({ content: r.data.pad.content, updatedAt: r.data.pad.updatedAt });
}

/** Point the stores at a room (call when entering a class); reloads on reconnect */
export function attachClassContent(room: string) {
  if (slidesStore.room === room) return;
  slidesStore.room = room;
  padStore.room = room;
  breakoutsStore.room = room;
  slidesStore.set(null);
  padStore.set({ content: "", updatedAt: null });
  breakoutsStore.set({ active: false });
  if (room) {
    loadSlides(room);
    loadPad(room);
    loadBreakouts(room);
  }
}

classroomTransport.onData("slides", (payload: any) => {
  if (payload === null) return slidesStore.set(null);
  if (payload?.roomSlug && payload.roomSlug === slidesStore.room) slidesStore.set(payload);
});
classroomTransport.onData("pad", () => {
  // The text itself is fetched (it can be bigger than a data message); bursts of edits coalesce
  if (padTimer) clearTimeout(padTimer);
  padTimer = setTimeout(() => padStore.room && loadPad(padStore.room), 400);
});
classroomTransport.onData("breakouts", (payload: any) => {
  if (!payload || payload.roomSlug !== breakoutsStore.room) return;
  const wasActive = breakoutsStore.value.active;
  if (payload.announcement?.text) toast(`${payload.announcement.from || "Your teacher"}: ${payload.announcement.text}`, "neutral");
  if (payload.active) {
    // Learners get only their own group from the API; the broadcast carries every group
    breakoutsStore.set({ active: true, roomSlug: payload.roomSlug, startedAt: payload.startedAt, endsAt: payload.endsAt, groups: payload.groups || [] });
  } else {
    breakoutsStore.set({ active: false });
    if (wasActive) toast(payload.closedBy === "timer" ? "Time's up: back in the main room" : "Breakout rooms closed: back in the main room", "neutral");
  }
});

let wasConnected = false;
classroomTransport.onState((s) => {
  const connected = s.status === "connected";
  if (connected && !wasConnected && slidesStore.room) {
    loadSlides(slidesStore.room);
    loadPad(slidesStore.room);
    loadBreakouts(slidesStore.room);
  }
  wasConnected = connected;
});

/** Host: change deck, page, stage visibility */
export async function updateSlides(patch: { materialId?: string; page?: number; pageCount?: number; onStage?: boolean }) {
  const room = slidesStore.room;
  if (!room) return "Not in a class";
  const r = await api<{ slides: SlidesState }>("PUT", `/api/rooms/${encodeURIComponent(room)}/slides`, patch);
  if (!r.ok) return r.error;
  slidesStore.set(r.data.slides);
  return null;
}
export async function stopSlides() {
  const room = slidesStore.room;
  const r = await api("DELETE", `/api/rooms/${encodeURIComponent(room)}/slides`);
  if (!r.ok) return r.error;
  slidesStore.set(null);
  return null;
}
export async function savePad(content: string) {
  const room = padStore.room;
  const r = await api<{ pad: PadState }>("PUT", `/api/rooms/${encodeURIComponent(room)}/pad`, { content });
  if (!r.ok) return r.error;
  padStore.set({ content: r.data.pad.content, updatedAt: r.data.pad.updatedAt });
  return null;
}

export function useStore<T>(store: Store<T>): T {
  return React.useSyncExternalStore(store.subscribe, () => store.value);
}
