/**
 * Recording layout rendered by LiveKit Egress (it opens this page with ?url=&token= and records it).
 * Learners whose participant metadata says recordingExcluded are never shown or heard.
 * Hidden participants (auditors) and other recorders are ignored.
 */
import { Room, RoomEvent, Track, ParticipantKind } from "livekit-client";
import type { RemoteParticipant, RemoteTrack, RemoteTrackPublication } from "livekit-client";

const params = new URLSearchParams(location.search);
const url = params.get("url") || "";
const token = params.get("token") || "";

const stage = document.getElementById("stage")!;
const main = document.getElementById("main")!;
const strip = document.getElementById("strip")!;
const empty = document.getElementById("empty")!;
const mark = document.getElementById("mark")!;

const room = new Room({ adaptiveStream: false, dynacast: false });
const audioEls = new Map<string, HTMLMediaElement>();
let started = false;

function meta(p: RemoteParticipant): any {
  try {
    return JSON.parse(p.metadata || "{}");
  } catch {
    return {};
  }
}

/** Shown and heard in the recording? */
export function includedInRecording(p: { kind?: ParticipantKind | number; metadata?: string; permissions?: { hidden?: boolean } }): boolean {
  if (p.kind === ParticipantKind.EGRESS || p.kind === ParticipantKind.AGENT) return false;
  if (p.permissions?.hidden) return false;
  let m: any = {};
  try {
    m = JSON.parse(p.metadata || "{}");
  } catch {}
  if (m.recordingExcluded === true || m.waiting === true) return false;
  if (m.role === "auditor") return false;
  return true;
}

function videoTile(track: RemoteTrack, label: string, screen = false) {
  const tile = document.createElement("div");
  tile.className = screen ? "tile screen" : "tile";
  const v = track.attach() as HTMLVideoElement;
  v.muted = true;
  tile.appendChild(v);
  const n = document.createElement("div");
  n.className = "name";
  n.textContent = label;
  tile.appendChild(n);
  return tile;
}

function avatarTile(p: RemoteParticipant) {
  const tile = document.createElement("div");
  tile.className = "tile";
  const a = document.createElement("div");
  a.className = "avatar";
  a.style.background = meta(p).avatarColor || "#1d4ed8";
  a.textContent = (p.name || p.identity).charAt(0).toUpperCase();
  tile.appendChild(a);
  const n = document.createElement("div");
  n.className = "name";
  n.textContent = p.name || p.identity;
  tile.appendChild(n);
  return tile;
}

function cameraTrack(p: RemoteParticipant): RemoteTrack | null {
  const pub = p.getTrackPublication(Track.Source.Camera) as RemoteTrackPublication | undefined;
  return pub && pub.track && !pub.isMuted ? (pub.track as RemoteTrack) : null;
}

function render() {
  const people = [...room.remoteParticipants.values()].filter(includedInRecording);
  // Hosts first, then by name
  people.sort((a, b) => Number(["instructor", "admin", "sales_rep"].includes(meta(b).role)) - Number(["instructor", "admin", "sales_rep"].includes(meta(a).role)) || (a.name || "").localeCompare(b.name || ""));

  // Audio: only included people are heard
  const wantAudio = new Set<string>();
  for (const p of people) {
    for (const src of [Track.Source.Microphone, Track.Source.ScreenShareAudio]) {
      const pub = p.getTrackPublication(src) as RemoteTrackPublication | undefined;
      if (pub?.track) {
        const key = `${p.identity}:${src}`;
        wantAudio.add(key);
        if (!audioEls.has(key)) {
          const el = pub.track.attach();
          document.body.appendChild(el);
          audioEls.set(key, el);
        }
      }
    }
  }
  for (const [key, el] of audioEls) {
    if (!wantAudio.has(key)) {
      el.remove();
      audioEls.delete(key);
    }
  }

  main.replaceChildren();
  strip.replaceChildren();
  const presenter = people.find((p) => (p.getTrackPublication(Track.Source.ScreenShare) as RemoteTrackPublication | undefined)?.track);
  if (presenter) {
    stage.classList.add("presenting");
    const screen = presenter.getTrackPublication(Track.Source.ScreenShare)!.track as RemoteTrack;
    main.appendChild(videoTile(screen, `${presenter.name || presenter.identity} · presenting`, true));
    for (const p of people.slice(0, 4)) {
      const cam = cameraTrack(p);
      strip.appendChild(cam ? videoTile(cam, p.name || p.identity) : avatarTile(p));
    }
  } else {
    stage.classList.remove("presenting");
    const shown = people.slice(0, 16);
    const cols = Math.ceil(Math.sqrt(shown.length || 1));
    main.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    main.style.gridTemplateRows = `repeat(${Math.ceil((shown.length || 1) / cols)}, minmax(0, 1fr))`;
    for (const p of shown) {
      const cam = cameraTrack(p);
      main.appendChild(cam ? videoTile(cam, p.name || p.identity) : avatarTile(p));
    }
  }
  empty.style.display = people.length ? "none" : "flex";
  (window as any).__recordingLayout = { shown: people.map((p) => p.identity), audio: [...wantAudio] };
}

async function start() {
  mark.textContent = `Recorded class · ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`;
  for (const ev of [
    RoomEvent.ParticipantConnected,
    RoomEvent.ParticipantDisconnected,
    RoomEvent.TrackSubscribed,
    RoomEvent.TrackUnsubscribed,
    RoomEvent.TrackMuted,
    RoomEvent.TrackUnmuted,
    RoomEvent.ParticipantMetadataChanged,
    RoomEvent.ParticipantPermissionsChanged,
  ]) {
    room.on(ev as any, () => render());
  }
  room.on(RoomEvent.Disconnected, () => console.log("END_RECORDING"));
  await room.connect(url, token, { autoSubscribe: true });
  render();
  if (!started) {
    started = true;
    // Egress begins recording when the template logs this
    console.log("START_RECORDING");
  }
}

if (url && token) start().catch((e) => console.error("recording layout failed", e));
