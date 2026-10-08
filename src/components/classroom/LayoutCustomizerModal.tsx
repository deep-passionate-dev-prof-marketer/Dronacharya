import React from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  LayoutGrid,
  Maximize2,
  Columns,
  Grid3X3,
  UserCheck,
  UserX,
  X,
  Sliders,
  Tv,
  Check,
  Split,
  Eye,
  EyeOff,
} from "lucide-react";
import { GridLayoutMode, TileAspectRatio } from "../../types";

interface LayoutCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LayoutCustomizerModal: React.FC<LayoutCustomizerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    layoutMode,
    setLayoutMode,
    manualGridColumns,
    setManualGridColumns,
    tileAspectRatio,
    setTileAspectRatio,
    showSelfView,
    setShowSelfView,
    dockSplitRatio,
    setDockSplitRatio,
    pinnedParticipantId,
    setPinnedParticipantId,
  } = useClassroom();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Adjust Layout & Grids</h3>
              <p className="text-[11px] text-slate-400">Customize video grid density, stage focus, and split view</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Section 1: Stage Layout Mode */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
              Stage Presentation Mode
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => {
                  setLayoutMode("auto");
                  setManualGridColumns(0);
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all ${
                  layoutMode === "auto" && manualGridColumns === 0
                    ? "bg-blue-600/20 border-blue-500 text-white shadow-sm"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Grid3X3 className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-bold">Auto Grid</span>
                <span className="text-[10px] text-slate-400">Dynamic balance</span>
              </button>

              <button
                onClick={() => setLayoutMode("spotlight")}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all ${
                  layoutMode === "spotlight"
                    ? "bg-blue-600/20 border-blue-500 text-white shadow-sm"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Maximize2 className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-bold">Spotlight</span>
                <span className="text-[10px] text-slate-400">Speaker hero</span>
              </button>

              <button
                onClick={() => setLayoutMode("filmstrip")}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all ${
                  layoutMode === "filmstrip"
                    ? "bg-blue-600/20 border-blue-500 text-white shadow-sm"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Columns className="w-5 h-5 text-cyan-400" />
                <span className="text-xs font-bold">Filmstrip</span>
                <span className="text-[10px] text-slate-400">Sidebar row</span>
              </button>

              <button
                onClick={() => setLayoutMode("presentation")}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all ${
                  layoutMode === "presentation"
                    ? "bg-blue-600/20 border-blue-500 text-white shadow-sm"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Tv className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold">Theater</span>
                <span className="text-[10px] text-slate-400">Clean lecture</span>
              </button>
            </div>
          </div>

          {/* Section 2: Manual Grid Columns Selector */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Manual Grid Columns
              </label>
              <span className="text-[11px] font-mono text-blue-400 font-semibold">
                {manualGridColumns === 0 ? "Automatic" : `${manualGridColumns} Columns`}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((col) => (
                <button
                  key={col}
                  onClick={() => {
                    setManualGridColumns(col);
                    if (col > 0) setLayoutMode("custom_grid");
                    else setLayoutMode("auto");
                  }}
                  className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all ${
                    manualGridColumns === col
                      ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                      : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {col === 0 ? "Auto" : `${col} Col`}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Tile Aspect Ratio */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
              Video Tile Aspect Ratio
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["16:9", "4:3", "1:1"] as TileAspectRatio[]).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setTileAspectRatio(ratio)}
                  className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                    tileAspectRatio === ratio
                      ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                      : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span>{ratio === "16:9" ? "16:9 Widescreen" : ratio === "4:3" ? "4:3 Classic" : "1:1 Square"}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Self View & Pinning */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Self View Tile</span>
                <span className="text-[10px] text-slate-400">Show your camera in grid</span>
              </div>
              <button
                onClick={() => setShowSelfView(!showSelfView)}
                className={`p-2 rounded-xl transition-all ${
                  showSelfView
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-white/5 text-slate-500 border border-white/10"
                }`}
              >
                {showSelfView ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Pinned Spotlight</span>
                <span className="text-[10px] text-slate-400">
                  {pinnedParticipantId ? "Active pin" : "None pinned"}
                </span>
              </div>
              {pinnedParticipantId && (
                <button
                  onClick={() => setPinnedParticipantId(null)}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold"
                >
                  Unpin
                </button>
              )}
            </div>
          </div>

          {/* Section 5: Stage vs Dock Split Ratio Presets */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Stage vs Tools Dock Split
              </label>
              <span className="text-[11px] font-mono text-blue-400 font-semibold">
                {dockSplitRatio}% Stage / {100 - dockSplitRatio}% Dock
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: "50 : 50", ratio: 50 },
                { label: "65 : 35", ratio: 65 },
                { label: "80 : 20", ratio: 80 },
                { label: "Stage Max", ratio: 100 },
                { label: "Dock Max", ratio: 0 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setDockSplitRatio(preset.ratio)}
                  className={`py-2 px-1.5 rounded-xl border text-[11px] font-bold transition-all truncate text-center ${
                    dockSplitRatio === preset.ratio
                      ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                      : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-end bg-slate-950/50">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
          >
            Apply Layout
          </button>
        </div>
      </div>
    </div>
  );
};
