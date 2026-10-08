import React, { useRef, useState, useEffect } from "react";
import {
  Pen,
  Highlighter,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Type,
  Eraser,
  RotateCcw,
  Download,
  Trash2,
} from "lucide-react";

type ToolType = "pen" | "highlighter" | "line" | "arrow" | "rect" | "circle" | "text" | "eraser";

const PALETTE = ["#ffffff", "#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#a855f7"];

export const WhiteboardCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentTool, setCurrentTool] = useState<ToolType>("pen");
  const [strokeColor, setStrokeColor] = useState<string>("#6366f1");
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set high DPI scale
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Initial dark studio chalkboard canvas
    ctx.fillStyle = "#0b101d";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Grid lines for STEM equations and graphs
    ctx.strokeStyle = "#141c2e";
    ctx.lineWidth = 1;
    for (let x = 0; x < rect.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    for (let y = 0; y < rect.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    // Pre-seed a sample quantum formula annotation
    ctx.font = "14px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#818cf8";
    ctx.fillText("H|0⟩ = (|0⟩ + |1⟩) / √2", 40, 50);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("Hadamard Transform: Equal superposition state vector", 40, 75);
  }, []);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    setIsDrawing(true);
    setStartX(x);
    setStartY(y);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Take snapshot for shape preview
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

    if (currentTool === "pen" || currentTool === "highlighter" || currentTool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (currentTool === "text") {
      const text = prompt("Enter text or equation annotation:");
      if (text) {
        ctx.font = "14px 'JetBrains Mono', monospace";
        ctx.fillStyle = strokeColor;
        ctx.fillText(text, x, y);
      }
      setIsDrawing(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);

    if (currentTool === "pen") {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (currentTool === "highlighter") {
      ctx.strokeStyle = strokeColor + "44"; // transparent glow
      ctx.lineWidth = strokeWidth * 3;
      ctx.lineCap = "round";
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (currentTool === "eraser") {
      ctx.strokeStyle = "#0b101d";
      ctx.lineWidth = strokeWidth * 5;
      ctx.lineCap = "round";
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (snapshot) {
      // Restore snapshot for clean shape dragging
      ctx.putImageData(snapshot, 0, 0);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;

      if (currentTool === "line") {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (currentTool === "arrow") {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();
        // Arrow head
        const angle = Math.atan2(y - startY, x - startX);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 12 * Math.cos(angle - Math.PI / 6), y - 12 * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x, y);
        ctx.lineTo(x - 12 * Math.cos(angle + Math.PI / 6), y - 12 * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (currentTool === "rect") {
        ctx.strokeRect(startX, startY, x - startX, y - startY);
      } else if (currentTool === "circle") {
        const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#0b101d";
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `nexusstem-whiteboard-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0b101d] overflow-hidden select-none">
      {/* Top Whiteboard Toolbar */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/90 px-3 flex items-center justify-between gap-2 shrink-0">
        {/* Tool selector */}
        <div className="flex items-center gap-1">
          {[
            { id: "pen", icon: Pen, label: "Pen" },
            { id: "highlighter", icon: Highlighter, label: "Highlighter" },
            { id: "line", icon: Minus, label: "Line" },
            { id: "arrow", icon: ArrowRight, label: "Arrow" },
            { id: "rect", icon: Square, label: "Box" },
            { id: "circle", icon: Circle, label: "Circle" },
            { id: "text", icon: Type, label: "Text" },
            { id: "eraser", icon: Eraser, label: "Eraser" },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setCurrentTool(t.id as ToolType)}
                title={t.label}
                className={`p-1.5 rounded transition-colors ${
                  currentTool === t.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        {/* Palette & Stroke slider */}
        <div className="flex items-center gap-2">
          {/* Color swatches */}
          <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setStrokeColor(c)}
                className={`w-4 h-4 rounded-full transition-transform ${
                  strokeColor === c ? "scale-125 ring-2 ring-white ring-offset-1 ring-offset-slate-900" : ""
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Width slider */}
          <input
            type="range"
            min={1}
            max={12}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseInt(e.target.value, 10))}
            className="w-16 accent-indigo-500 cursor-pointer hidden sm:block"
            title="Stroke Width"
          />

          {/* Actions */}
          <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
            <button
              onClick={handleClear}
              title="Clear Whiteboard"
              className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDownload}
              title="Export as PNG"
              className="p-1.5 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full block"
        />

        {/* Quiet footer guide */}
        <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/60 backdrop-blur text-[10px] font-mono text-slate-400 pointer-events-none">
          Live Whiteboard Sync · Multi-User Canvas
        </div>
      </div>
    </div>
  );
};
