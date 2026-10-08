import React, { useState, useEffect } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Search,
  Command,
  Link2,
  Globe,
  KeyRound,
  BookOpen,
  Wifi,
  WifiOff,
  Sparkles,
  ChevronDown,
  User,
  Coffee,
  Copy,
  Check,
  Flame,
  UserCheck,
  Video,
  MessageSquare,
  ShieldCheck,
  Calendar,
  Layers,
  ExternalLink,
  Laptop,
  LogOut,
  GraduationCap,
} from "lucide-react";
import { UserRole } from "../../types";
import { SchoolLogo } from "../brand/SchoolLogo";
import { EdgeMeshLatencyHUD } from "../classroom/EdgeMeshLatencyHUD";
import { RoomLinkManagerModal } from "../links/RoomLinkManagerModal";
import { JoinMeetingModal } from "../modals/JoinMeetingModal";

interface TopBarProps {
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleSidebar,
  isSidebarCollapsed,
}) => {
  const {
    activeView,
    setActiveView,
    currentRole,
    setCurrentRole,
    roomId,
    roomTitle,
    roomLink,
    isOfflineMode,
    toggleOfflineMode,
    activeRoomFlow,
    roomBreak,
    setIsDocsModalOpen,
    setIsAuthModalOpen,
    setIsScheduleModalOpen,
    setIsInterpreterModalOpen,
    authenticatedUser,
    logoutUser,
    pitchRooms,
    activeProductionMeeting,
    leaveProductionMeeting,
  } = useClassroom();

  const [copiedLink, setCopiedLink] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isJoinMeetingModalOpen, setIsJoinMeetingModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyStudentLink = () => {
    const studentUrl = typeof window !== "undefined"
      ? `${window.location.origin}/?room=${encodeURIComponent(roomId)}&role=student`
      : roomLink;
    navigator.clipboard.writeText(studentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const formatBreakTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Keyboard shortcut Cmd+K for command search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const ALL_COMMAND_ITEMS = [
    { label: "Live Classroom Stage", category: "View", roles: ["instructor", "student", "auditor", "sales_rep", "admin"], action: () => setActiveView("classroom"), icon: Video },
    { label: "Campus Social Feed", category: "Community", roles: ["instructor", "student", "auditor", "sales_rep", "admin"], action: () => setActiveView("social"), icon: MessageSquare },
    { label: "Sales Admissions Command Hub", category: "Sales", roles: ["sales_rep", "admin"], action: () => setActiveView("sales_hub"), icon: Flame },
    { label: "Room Bomber 1:1 Breakout Command", category: "Sales", roles: ["sales_rep", "admin"], action: () => setActiveView("room_bomber"), icon: Flame },
    { label: "Device Audit & Telemetry Center", category: "Audit", roles: ["auditor", "sales_rep", "admin"], action: () => setActiveView("device_audit"), icon: ShieldCheck },
    { label: "Facilitator Assignment Matrix", category: "Ops", roles: ["instructor", "sales_rep", "admin"], action: () => setActiveView("facilitators"), icon: UserCheck },
    { label: "CRM Webhook Auto-Room Generator", category: "Ops", roles: ["sales_rep", "admin"], action: () => setActiveView("crm"), icon: Layers },
    { label: "Google LLM Notebook Studio", category: "AI", roles: ["instructor", "student", "admin"], action: () => setActiveView("notebook"), icon: Sparkles },
    { label: "Room Link Nomenclature & Base62 Shortlinks", category: "Links", roles: ["instructor", "sales_rep", "admin"], action: () => setIsLinkModalOpen(true), icon: Link2 },
    { label: "Schedule Classroom Meeting", category: "Calendar", roles: ["instructor", "admin"], action: () => setIsScheduleModalOpen(true), icon: Calendar },
    { label: "Read Platform Architecture Specs", category: "Documentation", roles: ["instructor", "student", "auditor", "sales_rep", "admin"], action: () => setIsDocsModalOpen(true), icon: BookOpen },
  ];

  const filteredCommands = ALL_COMMAND_ITEMS.filter((c) => {
    const roleAllowed = c.roles.includes(currentRole);
    const matchesSearch =
      c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase());
    return roleAllowed && matchesSearch;
  });

  return (
    <header className="h-14 border-b border-white/10 backdrop-blur-2xl bg-slate-950/80 px-3 md:px-4 flex items-center justify-between select-none z-30 shrink-0 shadow-lg">
      {/* Zone 1: Logo, Workspace Identity & Room Slug Indicator */}
      <div className="flex items-center gap-3">
        <a
          href="#classroom"
          onClick={(e) => {
            e.preventDefault();
            setActiveView("classroom");
          }}
          className="hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <SchoolLogo size="sm" showTagline={false} systemName="Dronacharya" theme="dark" />
        </a>

        {/* Quiet unboxed breadcrumb separator */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 pl-3 border-l border-white/10 font-sans">
          <span className="font-semibold text-slate-200">
            {activeRoomFlow?.category || "21K School"}
          </span>
          <span aria-hidden="true" className="text-slate-600">/</span>
          <span className="truncate max-w-[200px] text-slate-300" title={roomTitle}>
            {roomTitle}
          </span>

          {roomBreak?.isActive && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[10px] font-bold animate-pulse ml-1">
              <Coffee className="w-3 h-3 text-amber-400" />
              <span>Break: {formatBreakTime(roomBreak.remainingSeconds)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Zone 2: Slack-style Global Command Search (Cmd+K) */}
      <div className="flex-1 max-w-md mx-4 hidden sm:block">
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="w-full h-8 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-all group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition-colors" />
            <span className="truncate">Search commands, tools, or schedule...</span>
          </div>
          <kbd className="hidden md:inline-flex items-center gap-0.5 font-mono text-[10px] bg-white/10 border border-white/10 px-1.5 py-0.5 rounded text-slate-400">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>
      </div>

      {/* Zone 3: Quick Action Bar, Room Link, Role Switcher & Profile Dropdown */}
      <div className="flex items-center gap-2">
        {/* Copy Student Invite Link Quick CTA (for instructors and staff) */}
        {currentRole !== "student" ? (
          <button
            onClick={handleCopyStudentLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white text-xs font-bold shadow-md transition-all cursor-pointer hover:scale-[1.02]"
            title="Copy Student WebRTC Joining Link to Clipboard"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedLink ? "Link Copied!" : "🔗 Invite Student"}</span>
          </button>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
            <span>Student Mode</span>
          </div>
        )}

        {/* Switch Classroom WebRTC Room Modal Button */}
        <button
          onClick={() => setIsJoinMeetingModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
          title="Switch WebRTC Classroom Code"
        >
          <Video className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Switch Room</span>
        </button>

        {/* AI Live Interpreter Studio Modal Trigger */}
        <button
          onClick={() => setIsInterpreterModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600/25 to-indigo-600/25 hover:from-cyan-600/40 hover:to-indigo-600/40 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm shadow-cyan-950/30"
          title="Open AI Real-time Live Interpreter (Two-Way Speech Translation & Dual Audio)"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="hidden md:inline">Interpreter</span>
        </button>

        {/* Room Link Quick Generator / Shortlink button */}
        {currentRole !== "student" && (
          <button
            onClick={() => setIsLinkModalOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all"
            title="Open Standard Room Link Nomenclature & 6-Char Shortlink Generator"
          >
            <Link2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Room Links</span>
          </button>
        )}

        {/* Copy current room link */}
        <button
          onClick={handleCopyLink}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all text-xs"
          title="Copy Live Classroom Link"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {/* Latency & Mesh Health */}
        <div className="hidden xl:block">
          <EdgeMeshLatencyHUD />
        </div>

        {/* Offline Cache Mode */}
        <button
          onClick={toggleOfflineMode}
          title={isOfflineMode ? "Running in Offline Cached Mode" : "Online Connected Mode"}
          className={`p-1.5 rounded-xl border transition-all ${
            isOfflineMode
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
              : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
          }`}
        >
          {isOfflineMode ? <WifiOff className="w-3.5 h-3.5 text-amber-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
        </button>

        {/* Active Role Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
            {currentRole === "instructor" ? "Teacher" : currentRole === "sales_rep" ? "Sales Admissions" : currentRole}
          </span>
        </div>

        {/* Quick Sign Out Action */}
        <button
          onClick={logoutUser}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-300 hover:text-white transition-all text-xs font-semibold"
          title="Sign Out of Dronacharya"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>

        {/* User Profile & Workspace Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 p-1 pl-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left"
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {authenticatedUser ? authenticatedUser.name.charAt(0) : "21"}
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 top-12 w-64 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl animate-fadeIn space-y-2">
              <div className="px-3 py-2 border-b border-white/10">
                <div className="text-xs font-bold text-white truncate">
                  {authenticatedUser ? authenticatedUser.name : "Authorized Academic User"}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {authenticatedUser ? authenticatedUser.email : "educator@21kschool.com"}
                </div>
                <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                  Active Role: {currentRole}
                </div>
              </div>

              <div className="space-y-0.5 text-xs">
                {currentRole === "admin" ? (
                  <button
                    onClick={() => {
                      setIsAuthModalOpen(true);
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Switch Role Portals</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      logoutUser();
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sign Out & Switch Role</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsDocsModalOpen(true);
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>System Architecture Docs</span>
                </button>
                {(currentRole === "instructor" || currentRole === "admin") && (
                  <button
                    onClick={() => {
                      setIsScheduleModalOpen(true);
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                  >
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Schedule Class</span>
                  </button>
                )}
              </div>

              {authenticatedUser && (
                <div className="pt-1 border-t border-white/10">
                  <button
                    onClick={() => {
                      logoutUser();
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Global Command Palette Modal (Cmd+K) */}
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-start justify-center pt-24 px-4 animate-fadeIn">
          <div className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl">
            <div className="p-3 border-b border-white/10 flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                autoFocus
                type="text"
                placeholder="Type a command, tool or search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
              />
              <kbd
                onClick={() => setIsCommandPaletteOpen(false)}
                className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 rounded cursor-pointer hover:text-white"
              >
                ESC
              </kbd>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 space-y-1">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, i) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        cmd.action();
                        setIsCommandPaletteOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-white/5 text-slate-300 group-hover:text-blue-400 group-hover:bg-blue-600/20 transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-medium text-slate-200 group-hover:text-white">
                          {cmd.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase px-1.5 py-0.5 rounded bg-white/5">
                        {cmd.category}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  No matching commands found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Embedded Link Manager Modal */}
      <RoomLinkManagerModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
      />

      {/* Join Real Production Meeting Modal */}
      <JoinMeetingModal
        isOpen={isJoinMeetingModalOpen}
        onClose={() => setIsJoinMeetingModalOpen(false)}
      />
    </header>
  );
};
