import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Columns,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layout,
  Video,
  Layers,
} from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";

interface SplitViewContainerProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  initialSplitRatio?: number; // e.g. 60 for 60% left, 40% right
}

export const SplitViewContainer: React.FC<SplitViewContainerProps> = ({
  leftContent,
  rightContent,
  initialSplitRatio = 65,
}) => {
  const { dockSplitRatio, setDockSplitRatio } = useClassroom();
  const splitRatio = dockSplitRatio ?? initialSplitRatio;
  const setSplitRatio = setDockSplitRatio;
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<"custom" | "50" | "65" | "80" | "leftOnly" | "rightOnly">("65");
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [mobileTab, setMobileTab] = useState<"stage" | "dock">("stage");

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleTouchStart = () => {
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const totalWidth = rect.width;
      const newRatio = Math.min(85, Math.max(25, (currentX / totalWidth) * 100));
      setSplitRatio(newRatio);
      setActivePreset("custom");
    },
    [isDragging]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !containerRef.current || !e.touches[0]) return;
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = e.touches[0].clientX - rect.left;
      const totalWidth = rect.width;
      const newRatio = Math.min(85, Math.max(25, (currentX / totalWidth) * 100));
      setSplitRatio(newRatio);
      setActivePreset("custom");
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  const applyPreset = (preset: "50" | "65" | "80" | "leftOnly" | "rightOnly") => {
    setActivePreset(preset);
    if (preset === "50") setSplitRatio(50);
    else if (preset === "65") setSplitRatio(65);
    else if (preset === "80") setSplitRatio(80);
    else if (preset === "leftOnly") setSplitRatio(100);
    else if (preset === "rightOnly") setSplitRatio(0);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex flex-col md:flex-row overflow-hidden select-none ${
        isDragging ? "cursor-col-resize pointer-events-none" : ""
      }`}
    >
      {/* Mobile Switcher Segmented Bar (Screens < 768px) */}
      {isMobile && (
        <div className="h-11 bg-slate-900/95 border-b border-white/10 px-3 flex items-center justify-center shrink-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 w-full max-w-xs">
            <button
              onClick={() => setMobileTab("stage")}
              className={`flex-1 py-1.5 px-3 flex items-center justify-center gap-1.5 font-bold text-xs rounded-lg transition-all min-h-[36px] ${
                mobileTab === "stage"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video Stage</span>
            </button>
            <button
              onClick={() => setMobileTab("dock")}
              className={`flex-1 py-1.5 px-3 flex items-center justify-center gap-1.5 font-bold text-xs rounded-lg transition-all min-h-[36px] ${
                mobileTab === "dock"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tools & Dock</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Quick Layout Mode Pill Bar on Top Right */}
      {!isMobile && (
        <div className="absolute top-2.5 right-6 z-30 hidden lg:flex items-center gap-1 bg-slate-900/90 backdrop-blur-xl border border-white/10 px-1.5 py-1 rounded-xl shadow-xl">
          <span className="text-[10px] text-slate-400 font-semibold px-1.5 uppercase tracking-wider">
            Split
          </span>
          <button
            onClick={() => applyPreset("50")}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
              splitRatio === 50
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
            title="Balanced 50/50 Stage & Dock"
          >
            50 : 50
          </button>
          <button
            onClick={() => applyPreset("65")}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
              splitRatio === 65
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
            title="Cinema 65/35 Focus Stage"
          >
            Stage+
          </button>
          <button
            onClick={() => applyPreset("80")}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
              splitRatio === 80
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
            title="Wide 80/20 Stage View"
          >
            Max Stage
          </button>
          <div className="w-[1px] h-3 bg-white/10 mx-0.5" />
          <button
            onClick={() => applyPreset(splitRatio === 100 ? "65" : "leftOnly")}
            className={`p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all ${
              splitRatio === 100 ? "text-blue-400 bg-blue-600/20" : ""
            }`}
            title={splitRatio === 100 ? "Restore Split View" : "Maximize Stage (Dock Hidden)"}
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Left Pane (Live Stage) */}
      <div
        style={{
          width: isMobile ? "100%" : `${splitRatio}%`,
          display: isMobile
            ? mobileTab === "stage"
              ? "flex"
              : "none"
            : splitRatio === 0
            ? "none"
            : "flex",
        }}
        className="h-full flex flex-col overflow-hidden transition-[width] duration-75 relative bg-slate-950 shrink-0"
      >
        {leftContent}
      </div>

      {/* Splitter Resizer Handle (Desktop Only) */}
      {!isMobile && splitRatio > 0 && splitRatio < 100 && (
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={`hidden md:flex items-center justify-center relative w-2.5 hover:w-3.5 bg-slate-900/80 hover:bg-blue-600/30 transition-all cursor-col-resize group shrink-0 z-20 border-x border-white/5 backdrop-blur-md ${
            isDragging ? "bg-blue-600 w-3.5 shadow-lg shadow-blue-500/50" : ""
          }`}
          title="Drag to resize Stage vs Dock (or double-click to center)"
          onDoubleClick={() => applyPreset("50")}
        >
          {/* Subtle Grip Dots */}
          <div className="flex flex-col gap-1 items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
            <div className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-blue-400" />
            <div className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-blue-400" />
            <div className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-blue-400" />
          </div>
        </div>
      )}

      {/* Right Pane (Collaborative Dock & Labs) */}
      <div
        style={{
          width: isMobile ? "100%" : `${100 - splitRatio}%`,
          display: isMobile
            ? mobileTab === "dock"
              ? "flex"
              : "none"
            : splitRatio === 100
            ? "none"
            : "flex",
        }}
        className="h-full flex flex-col overflow-hidden transition-[width] duration-75 relative bg-slate-950/70 backdrop-blur-xl border-l border-white/5 shrink-0"
      >
        {rightContent}
      </div>
    </div>
  );
};
