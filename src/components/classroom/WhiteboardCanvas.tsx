import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Pen,
  Highlighter,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Type,
  Eraser,
  Undo2,
  Download,
  Trash2,
  Maximize2,
  Minimize2,
  Expand,
  Shrink,
} from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";
import { BOARD_BG, BOARD_H, BOARD_W, WbStroke, WbTool, paintStroke, whiteboardStore } from "../../services/whiteboard/whiteboardStore";

const PALETTE = ["#ffffff", "#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#a855f7"];
const TOOLS: Array<{ id: WbTool; icon: React.ComponentType<{ className?: string }>; label: string }> = [
  { id: "pen", icon: Pen, label: "Pen" },
  { id: "highlighter", icon: Highlighter, label: "Highlighter" },
  { id: "line", icon: Minus, label: "Line" },
  { id: "arrow", icon: ArrowRight, label: "Arrow" },
  { id: "rect", icon: Square, label: "Box" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "text", icon: Type, label: "Text" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
];

interface Props {
  /** "dock" lives in the Tools panel; "stage" is the presented, full-size board */
  variant?: "dock" | "stage";
}

export const WhiteboardCanvas: React.FC<Props> = ({ variant = "dock" }) => {
  const { authenticatedUser, isWhiteboardPresenting, setWhiteboardPresenting, currentRole } = useClassroom();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<WbTool>("pen");
  const [color, setColor] = useState("#6366f1");
  const [width, setWidth] = useState(3);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const drawing = useRef<WbStroke | null>(null);
  const lastSent = useRef(0);
  const layout = useRef({ scale: 1, ox: 0, oy: 0 });
  const me = authenticatedUser?.id || "guest";
  const canPresent = currentRole === "instructor" || currentRole === "admin";

  // Replays the whole board; cheap at classroom scale and keeps every device pixel-consistent
  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { scale, ox, oy } = layout.current;
    const dpr = canvas.width / Math.max(1, canvas.getBoundingClientRect().width);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
    ctx.fillStyle = BOARD_BG;
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);
    ctx.strokeStyle = "#141c2e";
    ctx.lineWidth = 1;
    for (let x = 0; x <= BOARD_W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, BOARD_H);
      ctx.stroke();
    }
    for (let y = 0; y <= BOARD_H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(BOARD_W, y);
      ctx.stroke();
    }
    whiteboardStore.get().forEach((s) => paintStroke(ctx, s));
    if (drawing.current) paintStroke(ctx, drawing.current);
  }, []);

  // Fit the 16:9 board into whatever space we have (letterboxed), on every resize/rotation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const scale = Math.min(rect.width / BOARD_W, rect.height / BOARD_H);
      layout.current = { scale, ox: (rect.width - BOARD_W * scale) / 2, oy: (rect.height - BOARD_H * scale) / 2 };
      repaint();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    const unsub = whiteboardStore.subscribe(() => repaint());
    return () => {
      ro.disconnect();
      unsub();
    };
  }, [repaint]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toBoard = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { scale, ox, oy } = layout.current;
    const x = (e.clientX - rect.left - ox) / scale;
    const y = (e.clientY - rect.top - oy) / scale;
    return [Math.max(0, Math.min(BOARD_W, Math.round(x))), Math.max(0, Math.min(BOARD_H, Math.round(y)))];
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = toBoard(e);
    if (tool === "text") {
      const text = window.prompt("Text or equation:");
      if (text) whiteboardStore.draw({ id: `${me}-${Date.now()}`, tool, color, width, points: [p], text, by: me, done: true });
      return;
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawing.current = { id: `${me}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, tool, color, width, points: [p], by: me, done: false };
    repaint();
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = drawing.current;
    if (!s) return;
    const p = toBoard(e);
    s.points = s.tool === "pen" || s.tool === "highlighter" || s.tool === "eraser" ? [...s.points, p] : [s.points[0], p];
    repaint();
    // Stream progress ~12x/sec so others see the stroke appear live
    const now = performance.now();
    if (now - lastSent.current > 80) {
      lastSent.current = now;
      whiteboardStore.draw({ ...s, points: [...s.points] });
    }
  };

  const onUp = () => {
    const s = drawing.current;
    if (!s) return;
    drawing.current = null;
    whiteboardStore.draw({ ...s, points: [...s.points], done: true });
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `whiteboard-${new Date().toISOString().slice(0, 16)}.png`;
    a.click();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen?.().catch(() => {});
  };

  const btn = (active = false) =>
    `h-9 min-w-9 px-2 inline-flex items-center justify-center rounded-lg transition-colors ${
      active ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/10"
    }`;

  return (
    <div ref={rootRef} className="flex-1 min-h-0 flex flex-col bg-canvas overflow-hidden select-none">
      <div className="h-12 border-b border-white/10 bg-slate-900/95 px-1.5 sm:px-2 flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTool(t.id)} title={t.label} aria-label={t.label} aria-pressed={tool === t.id} className={btn(tool === t.id)}>
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
        <span className="w-px h-6 bg-white/10 mx-1 shrink-0" />
        {PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label={`Colour ${c}`}
            className="h-9 w-7 shrink-0 inline-flex items-center justify-center"
          >
            <span className={`w-4 h-4 rounded-full ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900" : ""}`} style={{ backgroundColor: c }} />
          </button>
        ))}
        <input
          type="range"
          min={1}
          max={12}
          value={width}
          onChange={(e) => setWidth(parseInt(e.target.value, 10))}
          className="w-16 accent-indigo-500 shrink-0 hidden sm:block"
          aria-label="Stroke width"
        />
        <span className="w-px h-6 bg-white/10 mx-1 shrink-0" />
        <button onClick={() => whiteboardStore.undo(me)} title="Undo" aria-label="Undo" className={btn()}>
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={() => whiteboardStore.clear()} title="Clear board" aria-label="Clear board" className={btn()}>
          <Trash2 className="w-4 h-4" />
        </button>
        <button onClick={download} title="Save as image" aria-label="Save as image" className={btn()}>
          <Download className="w-4 h-4" />
        </button>
        <span className="flex-1" />
        {canPresent && (
          <button
            onClick={() => setWhiteboardPresenting(!isWhiteboardPresenting)}
            title={isWhiteboardPresenting ? "Stop presenting on stage" : "Maximise: present on the main stage for everyone"}
            className={`${btn(isWhiteboardPresenting)} gap-1.5 text-xs font-semibold shrink-0`}
          >
            {isWhiteboardPresenting ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden md:inline">{isWhiteboardPresenting ? "Stop presenting" : "Present"}</span>
          </button>
        )}
        <button onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"} aria-label="Fullscreen" className={`${btn(isFullscreen)} shrink-0`}>
          {isFullscreen ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
        </button>
      </div>

      <div className={`relative flex-1 min-h-0 ${tool === "text" ? "cursor-text" : "cursor-crosshair"}`}>
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="absolute inset-0 w-full h-full block touch-none"
        />
        {variant === "stage" && (
          <span className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 text-2xs text-slate-300 pointer-events-none">Whiteboard · live for everyone</span>
        )}
      </div>
    </div>
  );
};
