import React, { useState, useRef } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import { DeviceType, RemoteAccessLevel, RemoteAccessSession } from "../../types";
import {
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  X,
  Plus,
  MousePointer,
  PenTool,
  Highlighter,
  Trash2,
  ShieldAlert,
  Play,
  RotateCcw,
  Terminal,
  Columns,
  Maximize2,
  Minimize2,
  Wifi,
  Sparkles,
  Lock,
  Unlock,
  Eye,
  CheckCircle2,
  History,
  FileCode,
  Calculator,
  ChevronDown,
  Volume2,
  VolumeX,
} from "lucide-react";
import { DEVICE_METADATA_MAP } from "../../services/remoteAccessService";
import { RemoteAccessRequestModal } from "./RemoteAccessRequestModal";
import { realtimeSocket } from "../../services/realtimeSocket";

export const MultiDeviceRemoteConsole: React.FC = () => {
  const {
    remoteSessions,
    activeRemoteSessionId,
    setActiveRemoteSessionId,
    endRemoteAccess,
    updateSessionLevel,
    updateRemoteCursor,
    addRemoteAnnotation,
    clearRemoteAnnotations,
    updateRemoteWorksheet,
    updateRemoteInteractiveContent,
    executeRemoteTerminalCommand,
    toggleMuteRemoteInput,
    isRemoteAccessModalOpen,
    setIsRemoteAccessModalOpen,
    activeView,
    setActiveView,
    currentRole,
    currentUser,
  } = useClassroom();

  const [activeTool, setActiveTool] = useState<"pointer" | "pen" | "highlighter">("pen");
  const [activeColor, setActiveColor] = useState<string>("#00C2E0");
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isSplitDualView, setIsSplitDualView] = useState(false);
  const [secondarySessionId, setSecondarySessionId] = useState<string | null>(null);
  const [showActionLogDrawer, setShowActionLogDrawer] = useState(false);
  const [terminalInput, setTerminalInput] = useState<string>("");
  const [calcDisplay, setCalcDisplay] = useState<string>("0.7071");

  const canvasRef = useRef<HTMLDivElement | null>(null);

  const handleCloseConsole = () => {
    setIsRemoteAccessModalOpen(false);
    if (activeView === "remote_access") {
      setActiveView("classroom");
    }
  };

  if (!isRemoteAccessModalOpen && activeView !== "remote_access") return null;

  // Active primary session
  const activeSession =
    remoteSessions.find((s) => s.id === activeRemoteSessionId) ||
    remoteSessions.find((s) => s.status === "active") ||
    remoteSessions[0];

  // Secondary session for split dual view
  const secondarySession =
    remoteSessions.find(
      (s) => s.id === secondarySessionId && s.id !== activeSession?.id
    ) ||
    remoteSessions.find((s) => s.id !== activeSession?.id) ||
    null;

  if (!activeSession) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs text-white">
        <div className="p-8 rounded-2xl bg-[#080d1a] border border-slate-800 text-center max-w-md">
          <Laptop className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold">No Active Remote Sessions</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Request access to a learner&apos;s phone, tablet, laptop, or desktop PC to start.
          </p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#0082FF] hover:bg-[#0070df] text-white text-xs font-bold transition-all cursor-pointer"
            >
              Request Remote Access
            </button>
            <button
              onClick={() => setIsRemoteAccessModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 cursor-pointer"
            >
              Close
            </button>
          </div>
          <RemoteAccessRequestModal
            isOpen={isRequestModalOpen}
            onClose={() => setIsRequestModalOpen(false)}
          />
        </div>
      </div>
    );
  }

  const getDeviceIcon = (type: DeviceType, className = "w-4 h-4") => {
    switch (type) {
      case "phone":
        return <Smartphone className={className} />;
      case "tablet":
        return <Tablet className={className} />;
      case "desktop":
        return <Monitor className={className} />;
      default:
        return <Laptop className={className} />;
    }
  };

  const getTierBadge = (level: RemoteAccessLevel) => {
    switch (level) {
      case "full_control":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
            FULL CONTROL
          </span>
        );
      case "annotate":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
            ANNOTATE
          </span>
        );
      case "view_only":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
            VIEW ONLY
          </span>
        );
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, sessionId: string) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    updateRemoteCursor(x, y, sessionId);
    realtimeSocket.sendRemoteInputEvent(sessionId, { type: "move", x, y, timestamp: Date.now() });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>, session: RemoteAccessSession) => {
    if (session.accessLevel === "view_only" || session.isMutedControl) return;
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const size = activeTool === "highlighter" ? 12 : activeTool === "pen" ? 4 : 2;
    addRemoteAnnotation({ x, y, color: activeColor, size }, session.id);
    realtimeSocket.sendRemoteAnnotate(session.id, { x, y, color: activeColor, size });
    realtimeSocket.sendRemoteInputEvent(session.id, { type: "click", x, y, timestamp: Date.now() });
  };

  const handleTerminalSubmit = (e: React.FormEvent, session: RemoteAccessSession) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    executeRemoteTerminalCommand(terminalInput, session.id);
    realtimeSocket.sendTerminalCommand(session.id, terminalInput);
    setTerminalInput("");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050811] text-white font-sans select-none overflow-hidden animate-in fade-in duration-150">
      {/* ------------------------------------------------------------- */}
      {/* Master Top Bar: Multi-Device Tabs & Navigation */}
      {/* ------------------------------------------------------------- */}
      <header className="h-14 border-b border-slate-800/80 bg-[#070d1e] px-3 flex items-center justify-between shrink-0 gap-2">
        {/* Left: Brand & Active Device Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-800 shrink-0">
            <div className="p-1.5 rounded-lg bg-[#003872] text-[#00C2E0]">
              <Laptop className="w-4 h-4" />
            </div>
            <div className="hidden xl:block">
              <h2 className="text-xs font-bold text-white tracking-wide uppercase font-mono">
                Remote Cockpit
              </h2>
              <span className="text-[10px] text-cyan-400 font-mono">
                {remoteSessions.filter((s) => s.status === "active").length} Sessions Active
              </span>
            </div>
          </div>

          {/* Interactive Multi-Device Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {remoteSessions.map((session) => {
              const isSelected = activeSession.id === session.id;
              const isEnded = session.status === "ended";

              return (
                <div
                  key={session.id}
                  onClick={() => setActiveRemoteSessionId(session.id)}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? "bg-[#001F40] border-[#00C2E0]/60 text-white shadow-md shadow-[#00C2E0]/10"
                      : isEnded
                      ? "bg-slate-950/60 border-slate-800 text-slate-500 opacity-60"
                      : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                  }`}
                >
                  <span
                    className={`${
                      isSelected
                        ? "text-[#00C2E0]"
                        : session.deviceType === "phone"
                        ? "text-rose-400"
                        : session.deviceType === "tablet"
                        ? "text-amber-400"
                        : session.deviceType === "desktop"
                        ? "text-indigo-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {getDeviceIcon(session.deviceType)}
                  </span>

                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold leading-tight truncate max-w-[120px]">
                        {session.studentName}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          session.status === "active"
                            ? "bg-emerald-400 animate-pulse"
                            : session.status === "requested"
                            ? "bg-amber-400 animate-ping"
                            : "bg-slate-500"
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 leading-tight truncate max-w-[130px]">
                      {session.deviceModel.split(" ")[0]} · {session.latencyMs}ms
                    </span>
                  </div>

                  {/* Close Tab Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      endRemoteAccess(session.id);
                    }}
                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10 text-slate-400 hover:text-white transition-opacity ml-1"
                    title="Terminate Remote Session"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {/* Request Another Device Button */}
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 hover:bg-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 text-xs font-semibold transition-all shrink-0 cursor-pointer"
              title="Request or Connect Another Device"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Device</span>
            </button>
          </div>
        </div>

        {/* Right: View Mode Toggle & Close Console */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Split Dual Grid Mode Switcher */}
          <button
            onClick={() => setIsSplitDualView((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              isSplitDualView
                ? "bg-[#0082FF] border-[#0082FF] text-white shadow"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
            title="Toggle Split Dual View to monitor two screens side by side"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isSplitDualView ? "Single View" : "Split Dual View"}</span>
          </button>

          {/* Action Log Drawer Toggle */}
          <button
            onClick={() => setShowActionLogDrawer((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              showActionLogDrawer
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
            title="Inspect Real-Time Action Audit Trail"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Audit Trail</span>
          </button>

          {/* Close Console (Back to Classroom) */}
          <button
            onClick={handleCloseConsole}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
            title="Close Remote Console (Sessions remain active)"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* Floating Student Safety & Elevation Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-[#001F40] via-[#05264b] to-[#001F40] border-b border-[#00C2E0]/40 px-4 py-1.5 flex items-center justify-between text-xs text-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-white">
            {activeSession.deviceModel} ({activeSession.osName})
          </span>
          <span className="text-slate-400">·</span>
          <span>Target Learner: <strong>{activeSession.studentName}</strong></span>
          <span className="text-slate-400">·</span>
          <span className="font-mono text-cyan-300 text-[11px]">
            {activeSession.screenResolution.width}x{activeSession.screenResolution.height} · {activeSession.latencyMs}ms RTT · 60 FPS
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Permission Level Selector (Live In-Session Elevation/Downgrade) */}
          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <span className="px-2 text-slate-400 font-mono uppercase text-[10px] font-bold">Tier:</span>
            <button
              onClick={() => updateSessionLevel(activeSession.id, "view_only")}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                activeSession.accessLevel === "view_only"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              View Only
            </button>
            <button
              onClick={() => updateSessionLevel(activeSession.id, "annotate")}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                activeSession.accessLevel === "annotate"
                  ? "bg-amber-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Annotate
            </button>
            <button
              onClick={() => updateSessionLevel(activeSession.id, "full_control")}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                activeSession.accessLevel === "full_control"
                  ? "bg-cyan-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Full Control
            </button>
          </div>

          {/* Mute Remote Input Toggle */}
          <button
            onClick={() => toggleMuteRemoteInput(activeSession.id)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              activeSession.isMutedControl
                ? "bg-amber-950 text-amber-300 border-amber-800"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
            }`}
            title={activeSession.isMutedControl ? "Remote Input Paused (Click to Unpause)" : "Pause Remote Input Events"}
          >
            {activeSession.isMutedControl ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Instant Emergency Revoke Kill Switch */}
          <button
            onClick={() => endRemoteAccess(activeSession.id)}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs transition-all shadow-md shadow-rose-600/30 cursor-pointer"
            title="Instant Safe Disconnect Kill Switch"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Emergency Revoke</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Facilitator Annotate & Control Tool Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="h-10 bg-[#090f20] border-b border-slate-800/80 px-4 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-bold">
            Interactive Tools:
          </span>

          <button
            onClick={() => setActiveTool("pointer")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              activeTool === "pointer"
                ? "bg-[#0082FF] text-white font-bold shadow"
                : "bg-slate-800/80 text-slate-300 hover:text-white"
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Laser Pointer</span>
          </button>

          <button
            onClick={() => setActiveTool("pen")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              activeTool === "pen"
                ? "bg-[#0082FF] text-white font-bold shadow"
                : "bg-slate-800/80 text-slate-300 hover:text-white"
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Ink Pen</span>
          </button>

          <button
            onClick={() => setActiveTool("highlighter")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              activeTool === "highlighter"
                ? "bg-[#0082FF] text-white font-bold shadow"
                : "bg-slate-800/80 text-slate-300 hover:text-white"
            }`}
          >
            <Highlighter className="w-3.5 h-3.5 text-[#FFBB00]" />
            <span>Highlighter</span>
          </button>

          {/* Color Palette */}
          <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
            {["#00C2E0", "#FFBB00", "#FF7176", "#10B981", "#FFFFFF"].map((c) => (
              <button
                key={c}
                onClick={() => setActiveColor(c)}
                className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                  activeColor === c ? "ring-2 ring-white scale-110" : "opacity-70 hover:opacity-100"
                }`}
                style={{ backgroundColor: c }}
                title={`Select ink color ${c}`}
              />
            ))}
          </div>

          <button
            onClick={() => clearRemoteAnnotations(activeSession.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/60 hover:bg-rose-950 text-slate-300 hover:text-rose-300 transition-colors ml-2 cursor-pointer"
            title="Clear all drawn annotations on this screen"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Marks</span>
          </button>
        </div>

        {/* Active App Switcher for Target Device */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
          <span className="text-[10px] text-slate-400 font-mono px-2 uppercase font-bold">Target App:</span>
          {(["worksheet", "ide", "terminal", "calculator"] as const).map((app) => (
            <button
              key={app}
              onClick={() =>
                updateRemoteInteractiveContent({ activeApp: app }, activeSession.id)
              }
              className={`px-2 py-0.5 rounded capitalize font-medium transition-colors cursor-pointer ${
                activeSession.interactiveContent.activeApp === app
                  ? "bg-[#003872] text-[#00C2E0] font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {app}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Main Workspace: Device Viewports Area */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className={`flex-1 flex p-4 overflow-auto justify-center items-center ${isSplitDualView ? "gap-4" : ""}`}>
          {/* PRIMARY DEVICE VIEWPORT */}
          <div className="flex flex-col items-center max-h-full">
            <DeviceFrameRenderer
              session={activeSession}
              canvasRef={canvasRef}
              activeTool={activeTool}
              activeColor={activeColor}
              onMouseMove={(e) => handleMouseMove(e, activeSession.id)}
              onClick={(e) => handleCanvasClick(e, activeSession)}
              onTerminalSubmit={(e) => handleTerminalSubmit(e, activeSession)}
              terminalInput={terminalInput}
              setTerminalInput={setTerminalInput}
              calcDisplay={calcDisplay}
              setCalcDisplay={setCalcDisplay}
              onUpdateWorksheet={(text) => updateRemoteWorksheet(text, activeSession.id)}
              onUpdateCode={(code) =>
                updateRemoteInteractiveContent({ codeEditorText: code }, activeSession.id)
              }
            />
          </div>

          {/* SECONDARY DEVICE VIEWPORT (SPLIT DUAL VIEW) */}
          {isSplitDualView && secondarySession && (
            <div className="flex flex-col items-center max-h-full border-l border-slate-800 pl-4">
              <div className="mb-2 flex items-center justify-between w-full max-w-[500px]">
                <span className="text-xs font-bold text-amber-300 font-mono">
                  [Split Secondary] {secondarySession.studentName} ({secondarySession.deviceModel})
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {secondarySession.latencyMs}ms · {secondarySession.accessLevel}
                </span>
              </div>
              <DeviceFrameRenderer
                session={secondarySession}
                activeTool={activeTool}
                activeColor={activeColor}
                onMouseMove={(e) => handleMouseMove(e, secondarySession.id)}
                onClick={(e) => handleCanvasClick(e, secondarySession)}
                onTerminalSubmit={(e) => handleTerminalSubmit(e, secondarySession)}
                terminalInput={terminalInput}
                setTerminalInput={setTerminalInput}
                calcDisplay={calcDisplay}
                setCalcDisplay={setCalcDisplay}
                onUpdateWorksheet={(text) => updateRemoteWorksheet(text, secondarySession.id)}
                onUpdateCode={(code) =>
                  updateRemoteInteractiveContent({ codeEditorText: code }, secondarySession.id)
                }
              />
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Right Drawer: Live Action Audit Trail */}
        {/* ------------------------------------------------------------- */}
        {showActionLogDrawer && (
          <aside className="w-80 border-l border-slate-800 bg-[#070b17] flex flex-col shrink-0 animate-in slide-in-from-right duration-200">
            <div className="p-3 bg-[#001F40] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#00C2E0]" />
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Session Audit Trail
                </h3>
              </div>
              <button
                onClick={() => setShowActionLogDrawer(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 text-[11px] text-slate-400 border-b border-slate-800/80 bg-slate-950/40">
              <p>
                Immutable chronological log for child safety and pedagogical compliance.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs">
              {activeSession.actionLog.map((log, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-[#00C2E0]">{log.actor}</span>
                    <span>{log.timestamp}</span>
                  </div>
                  <p className="text-slate-200 text-[11px] font-sans leading-snug">
                    {log.description}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* Remote Access Request Modal */}
      <RemoteAccessRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
      />
    </div>
  );
};

// -----------------------------------------------------------------------
// Device Frame Renderer: Authentic Bezels for Phone, Tablet, Laptop, PC
// -----------------------------------------------------------------------
interface DeviceFrameRendererProps {
  session: RemoteAccessSession;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
  activeTool: "pointer" | "pen" | "highlighter";
  activeColor: string;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTerminalSubmit: (e: React.FormEvent) => void;
  terminalInput: string;
  setTerminalInput: (val: string) => void;
  calcDisplay: string;
  setCalcDisplay: (val: string) => void;
  onUpdateWorksheet: (text: string) => void;
  onUpdateCode: (code: string) => void;
}

const DeviceFrameRenderer: React.FC<DeviceFrameRendererProps> = ({
  session,
  canvasRef,
  activeTool,
  activeColor,
  onMouseMove,
  onClick,
  onTerminalSubmit,
  terminalInput,
  setTerminalInput,
  calcDisplay,
  setCalcDisplay,
  onUpdateWorksheet,
  onUpdateCode,
}) => {
  const isPhone = session.deviceType === "phone";
  const isTablet = session.deviceType === "tablet";
  const isLaptop = session.deviceType === "laptop";
  const isDesktop = session.deviceType === "desktop";

  const isFullControl = session.accessLevel === "full_control" && !session.isMutedControl;

  return (
    <div className="flex flex-col items-center">
      {/* Outer Hardware Chassis Frame */}
      <div
        className={`relative shadow-2xl transition-all duration-200 ${
          isPhone
            ? "w-[320px] h-[640px] rounded-[44px] p-3 bg-slate-900 border-[8px] border-slate-800 ring-1 ring-slate-700 shadow-cyan-950/20"
            : isTablet
            ? "w-[620px] h-[480px] rounded-[28px] p-3.5 bg-slate-900 border-[6px] border-slate-800 ring-1 ring-slate-700"
            : isLaptop
            ? "w-[760px] h-[500px] rounded-2xl p-2.5 bg-slate-900 border-[4px] border-slate-800 ring-1 ring-slate-700"
            : "w-[840px] h-[520px] rounded-xl p-2 bg-slate-950 border-[6px] border-slate-800 ring-1 ring-slate-700"
        }`}
      >
        {/* Phone Top Notch / Dynamic Island */}
        {isPhone && (
          <div className="absolute top-4 inset-x-0 flex justify-center z-40 pointer-events-none">
            <div className="w-24 h-4 rounded-full bg-black flex items-center justify-between px-2 text-[9px] text-white">
              <span className="w-2 h-2 rounded-full bg-slate-900" />
              <span className="w-2 h-2 rounded-full bg-cyan-600/60" />
            </div>
          </div>
        )}

        {/* Laptop Bottom Lip / Stand illusion */}
        {isLaptop && (
          <div className="absolute -bottom-3 inset-x-12 h-3 bg-slate-700/80 rounded-b-xl border-t border-slate-600 pointer-events-none" />
        )}

        {/* Inner Screen Canvas */}
        <div
          ref={canvasRef}
          onMouseMove={onMouseMove}
          onClick={onClick}
          className={`w-full h-full bg-[#0a0f1d] rounded-2xl overflow-hidden relative flex flex-col font-mono text-xs select-none ${
            isFullControl ? "cursor-default" : "cursor-crosshair"
          }`}
        >
          {/* Top In-Device Status Bar */}
          <div className="h-7 bg-slate-950/90 border-b border-slate-800/80 px-3 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white">{session.deviceModel}</span>
              <span>·</span>
              <span className="text-cyan-400 font-bold">{session.interactiveContent.activeApp.toUpperCase()}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <Wifi className="w-3 h-3" />
                <span>5G · 60fps</span>
              </span>
              <span className="text-[10px] text-slate-300 font-bold">9:41 AM</span>
            </div>
          </div>

          {/* Synchronized Virtual Cursor */}
          <div
            className="absolute pointer-events-none transition-all duration-75 -translate-x-1/2 -translate-y-1/2 z-30"
            style={{
              left: `${session.cursorPosition.x * 100}%`,
              top: `${session.cursorPosition.y * 100}%`,
            }}
          >
            <div className="relative">
              <MousePointer className="w-5 h-5 text-cyan-400 drop-shadow-lg" />
              <span className="absolute left-4 top-2 px-1.5 py-0.5 rounded bg-[#001F40] border border-cyan-400/50 text-[9px] text-cyan-200 font-mono whitespace-nowrap shadow-lg">
                Dr. Vance (Remote)
              </span>
            </div>
          </div>

          {/* Rendered Annotations Over Canvas */}
          {session.annotations.map((a, idx) => (
            <div
              key={idx}
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${a.x * 100}%`,
                top: `${a.y * 100}%`,
                width: `${a.size * 2}px`,
                height: `${a.size * 2}px`,
                backgroundColor: a.color,
                opacity: 0.85,
              }}
            />
          ))}

          {/* ACTIVE IN-DEVICE APP CONTENT */}
          <div className="flex-1 flex flex-col p-3 overflow-hidden bg-[#070b16]">
            {/* 1. WORKSHEET APP */}
            {session.interactiveContent.activeApp === "worksheet" && (
              <div className="flex-1 flex flex-col bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-slate-200 overflow-y-auto">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-cyan-300">
                  <span className="font-bold">21K School Quantum Worksheet #04</span>
                  <span className="text-slate-400">{session.accessLevel.replace("_", " ")} mode</span>
                </div>
                <textarea
                  value={session.worksheetContent || ""}
                  onChange={(e) => onUpdateWorksheet(e.target.value)}
                  disabled={!isFullControl}
                  className="flex-1 w-full bg-transparent resize-none focus:outline-none leading-relaxed text-slate-100 font-mono text-xs"
                  placeholder="Interactive collaborative exercise worksheet..."
                />
              </div>
            )}

            {/* 2. IDE / CODE EDITOR APP */}
            {session.interactiveContent.activeApp === "ide" && (
              <div className="flex-1 flex flex-col bg-[#050914] rounded-xl border border-slate-800 overflow-hidden">
                <div className="h-8 bg-slate-900 px-3 flex items-center justify-between border-b border-slate-800 text-[11px]">
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <FileCode className="w-3.5 h-3.5" />
                    <span className="font-bold">quantum_circuit.py</span>
                  </div>
                  <button
                    onClick={() => onTerminalSubmit(new Event("submit") as any)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-all cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    <span>Run in VM</span>
                  </button>
                </div>
                <textarea
                  value={session.interactiveContent.codeEditorText}
                  onChange={(e) => onUpdateCode(e.target.value)}
                  disabled={!isFullControl}
                  className="flex-1 w-full bg-transparent p-3 resize-none focus:outline-none text-emerald-300 font-mono text-xs leading-relaxed"
                  placeholder="# Write code in remote container..."
                />
              </div>
            )}

            {/* 3. TERMINAL APP */}
            {session.interactiveContent.activeApp === "terminal" && (
              <div className="flex-1 flex flex-col bg-black rounded-xl p-3 border border-slate-800 text-slate-200 overflow-hidden font-mono text-xs">
                <div className="flex-1 overflow-y-auto space-y-1 mb-2">
                  {session.interactiveContent.terminalLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={
                        log.startsWith("$")
                          ? "text-cyan-400 font-bold"
                          : log.includes("Error")
                          ? "text-rose-400"
                          : "text-slate-300"
                      }
                    >
                      {log}
                    </div>
                  ))}
                </div>
                {isFullControl && (
                  <form onSubmit={onTerminalSubmit} className="flex items-center gap-2 border-t border-slate-800 pt-2">
                    <span className="text-cyan-400 font-bold">$</span>
                    <input
                      type="text"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      placeholder="Type command (e.g. python3 run.py, ls, clear)..."
                      className="flex-1 bg-transparent text-white focus:outline-none text-xs"
                    />
                  </form>
                )}
              </div>
            )}

            {/* 4. SCIENTIFIC CALCULATOR APP (Specialized for Mobile / Tablet) */}
            {session.interactiveContent.activeApp === "calculator" && (
              <div className="flex-1 flex flex-col items-center justify-center p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <div className="w-full max-w-[240px] bg-black p-3 rounded-xl border border-slate-800 mb-3 text-right">
                  <span className="text-[10px] text-slate-500 block">sin(π/4) = cos(π/4)</span>
                  <span className="text-xl font-mono text-cyan-300 font-bold">{calcDisplay}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 w-full max-w-[240px]">
                  {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "C", "0", "=", "+"].map((btn) => (
                    <button
                      key={btn}
                      onClick={() => {
                        if (!isFullControl) return;
                        if (btn === "C") setCalcDisplay("0");
                        else if (btn === "=") setCalcDisplay("1.0000");
                        else setCalcDisplay(calcDisplay === "0" ? btn : calcDisplay + btn);
                      }}
                      className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
