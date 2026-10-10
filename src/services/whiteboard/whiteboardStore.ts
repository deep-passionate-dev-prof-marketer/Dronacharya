/**
 * Shared whiteboard state.
 *
 * Strokes are stored in a fixed 1600x900 logical space so every device (phone, tablet, 4K monitor)
 * renders the same drawing in the same place. The dock board and the on-stage presented board both
 * read from this one store, and strokes sync to the room through the classroom transport.
 */
import { classroomTransport } from "../media/classroomTransport";

export const BOARD_W = 1600;
export const BOARD_H = 900;
export const BOARD_BG = "#0b101d";

export type WbTool = "pen" | "highlighter" | "line" | "arrow" | "rect" | "circle" | "text" | "eraser";

export interface WbStroke {
  id: string;
  tool: WbTool;
  color: string;
  width: number;
  points: Array<[number, number]>;
  text?: string;
  by: string;
  done: boolean;
}

type Listener = (strokes: WbStroke[]) => void;

let strokes: WbStroke[] = [];
const listeners = new Set<Listener>();
let wired = false;

const emit = () => listeners.forEach((l) => l(strokes));

function upsert(stroke: WbStroke) {
  const i = strokes.findIndex((s) => s.id === stroke.id);
  strokes = i >= 0 ? strokes.map((s, j) => (j === i ? stroke : s)) : [...strokes, stroke];
  emit();
}

export const whiteboardStore = {
  get: () => strokes,

  subscribe(l: Listener) {
    listeners.add(l);
    l(strokes);
    return () => listeners.delete(l);
  },

  /** Local drawing. In-progress updates go out lossy (fast), the finished stroke goes out reliable. */
  draw(stroke: WbStroke) {
    upsert(stroke);
    classroomTransport.sendData("wb_stroke", stroke, { reliable: stroke.done });
  },

  undo(by: string) {
    const last = [...strokes].reverse().find((s) => s.by === by);
    if (!last) return;
    strokes = strokes.filter((s) => s.id !== last.id);
    emit();
    classroomTransport.sendData("wb_clear", { ids: [last.id] });
  },

  clear() {
    strokes = [];
    emit();
    classroomTransport.sendData("wb_clear", {});
  },

  /**
   * Wire room sync once. A newcomer asks for the board; the host (teacher/admin) answers
   * directly to that participant with the full stroke list.
   */
  initSync(isHost: () => boolean) {
    if (wired) return;
    wired = true;
    classroomTransport.onData("wb_stroke", (s: WbStroke) => s?.id && upsert(s));
    classroomTransport.onData("wb_clear", (p: { ids?: string[] }, from, fromHost) => {
      // Undo removes only the sender's own strokes; a full clear comes from a host
      strokes = p?.ids ? strokes.filter((s) => !(p.ids!.includes(s.id) && (fromHost || s.by === from))) : [];
      emit();
    });
    classroomTransport.onData("wb_sync_request", (_p, from) => {
      if (isHost() && strokes.length) classroomTransport.sendData("wb_sync", { strokes }, { to: [from] });
    });
    classroomTransport.onData("wb_sync", (p: { strokes?: WbStroke[] }) => {
      if (Array.isArray(p?.strokes) && strokes.length === 0) {
        strokes = p.strokes;
        emit();
      }
    });
    classroomTransport.onState((st) => {
      if (st.status === "connected" && !isHost()) classroomTransport.sendData("wb_sync_request", {});
    });
  },
};

/** Draws one stroke onto a context already transformed into board coordinates. */
export function paintStroke(ctx: CanvasRenderingContext2D, s: WbStroke) {
  const pts = s.points;
  if (!pts.length) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = s.tool === "eraser" ? BOARD_BG : s.tool === "highlighter" ? `${s.color}55` : s.color;
  ctx.lineWidth = s.tool === "eraser" ? s.width * 6 : s.tool === "highlighter" ? s.width * 4 : s.width;
  const [x0, y0] = pts[0];
  const [x1, y1] = pts[pts.length - 1];
  switch (s.tool) {
    case "pen":
    case "highlighter":
    case "eraser":
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      if (pts.length === 1) ctx.lineTo(x0 + 0.01, y0);
      ctx.stroke();
      break;
    case "line":
    case "arrow":
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      if (s.tool === "arrow") {
        const a = Math.atan2(y1 - y0, x1 - x0);
        const head = 14 + s.width * 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 - head * Math.cos(a - Math.PI / 6), y1 - head * Math.sin(a - Math.PI / 6));
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 - head * Math.cos(a + Math.PI / 6), y1 - head * Math.sin(a + Math.PI / 6));
        ctx.stroke();
      }
      break;
    case "rect":
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      break;
    case "circle":
      ctx.beginPath();
      ctx.arc(x0, y0, Math.hypot(x1 - x0, y1 - y0), 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "text":
      ctx.fillStyle = s.color;
      ctx.font = `${16 + s.width * 3}px 'JetBrains Mono', monospace`;
      ctx.fillText(s.text || "", x0, y0);
      break;
  }
  ctx.restore();
}
