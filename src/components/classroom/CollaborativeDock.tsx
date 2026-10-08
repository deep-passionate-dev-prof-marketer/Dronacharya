import React from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  PenTool,
  Boxes,
  FileText,
  Sparkles,
  BarChart2,
  Users2,
  MessageSquare,
  DoorOpen,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { WhiteboardCanvas } from "./WhiteboardCanvas";
import { StemArVisualizer } from "./StemArVisualizer";
import { DeckAndNotes } from "./DeckAndNotes";
import { SmartPeerNoteTaker } from "./SmartPeerNoteTaker";
import { PollsAndQuizzes } from "./PollsAndQuizzes";
import { BreakoutManager } from "./BreakoutManager";
import { TranscriptFeed } from "./TranscriptFeed";
import { WaitingLobby } from "./WaitingLobby";

interface DockTab {
  id: "whiteboard" | "stem3d" | "notes" | "smartnotes" | "polls" | "breakouts" | "transcript" | "lobby";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  highlight?: boolean;
}

export const CollaborativeDock: React.FC = () => {
  const { activeDockTab, setActiveDockTab, waitingList, currentRole } = useClassroom();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const ALL_TABS: DockTab[] = [
    { id: "whiteboard", label: "Whiteboard", icon: PenTool },
    { id: "stem3d", label: "3D AR Lab", icon: Boxes },
    { id: "notes", label: "Deck & Notes", icon: FileText },
    { id: "smartnotes", label: "Peer Notes", icon: Sparkles, highlight: true },
    { id: "polls", label: "Polls & Quiz", icon: BarChart2 },
    { id: "breakouts", label: "Breakouts", icon: Users2 },
    { id: "transcript", label: "Transcripts", icon: MessageSquare },
    {
      id: "lobby",
      label: "Lobby",
      icon: DoorOpen,
      badge: waitingList.length > 0 ? waitingList.length : undefined,
    },
  ];

  const TABS = ALL_TABS.filter((tab) => {
    if (currentRole === "student") {
      return ["whiteboard", "stem3d", "notes", "smartnotes", "polls", "transcript"].includes(tab.id);
    }
    if (currentRole === "auditor") {
      return ["transcript", "smartnotes", "notes"].includes(tab.id);
    }
    if (currentRole === "sales_rep") {
      return ["notes", "transcript", "smartnotes"].includes(tab.id);
    }
    return true;
  });

  if (isCollapsed) {
    return (
      <div className="border-l border-white/10 bg-white/[0.03] flex flex-col items-center py-2 px-1 z-20 shrink-0 select-none">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 rounded-lg bg-slate-900/70 border border-white/15 text-slate-200 hover:text-blue-300 shadow-xs mb-3 transition-colors cursor-pointer"
          title="Expand Collaborative Dock"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex flex-col gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeDockTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveDockTab(tab.id);
                  setIsCollapsed(false);
                }}
                className={`p-2 rounded-lg transition-colors cursor-pointer relative ${
                  isActive
                    ? "bg-[#003872] text-white shadow-xs"
                    : "text-slate-300 hover:text-blue-300 hover:bg-white/10"
                }`}
                title={tab.label}
              >
                <Icon className="w-4 h-4" />
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#FFBB00] text-blue-300 text-[9px] font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 min-h-0 border-l border-white/10 bg-slate-900/70 flex flex-col select-none overflow-hidden font-sans">
      {/* Dock Navigation Tab Bar (21K School Light Style) */}
      <div className="h-12 border-b border-white/10 bg-white/[0.03] px-2 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeDockTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveDockTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-[#003872] text-white shadow-xs"
                    : tab.highlight
                    ? "bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-200"
                    : "text-slate-300 hover:text-blue-300 hover:bg-white/10"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.highlight && !isActive ? "text-amber-300" : ""}`} />
                <span>{tab.label}</span>

                {tab.badge && (
                  <span className="w-4 h-4 rounded-full bg-[#FFBB00] text-blue-300 text-[10px] font-bold flex items-center justify-center -ml-0.5 shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 shrink-0 transition-colors cursor-pointer"
          title="Minimize Dock"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Render Active Tool */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-slate-900/70">
        {activeDockTab === "whiteboard" && <WhiteboardCanvas />}
        {activeDockTab === "stem3d" && <StemArVisualizer />}
        {activeDockTab === "notes" && <DeckAndNotes />}
        {activeDockTab === "smartnotes" && <SmartPeerNoteTaker />}
        {activeDockTab === "polls" && <PollsAndQuizzes />}
        {activeDockTab === "breakouts" && <BreakoutManager />}
        {activeDockTab === "transcript" && <TranscriptFeed />}
        {activeDockTab === "lobby" && <WaitingLobby />}
      </div>
    </div>
  );
};
