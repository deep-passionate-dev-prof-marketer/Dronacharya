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
  Menu,
  UserPlus,
} from "lucide-react";
import { DeviceAccessInbox } from "../access/DeviceAccessInbox";
import { UserRole } from "../../types";
import { SchoolLogo } from "../brand/SchoolLogo";
import { EdgeMeshLatencyHUD } from "../classroom/EdgeMeshLatencyHUD";
import { RoomLinkManagerModal } from "../links/RoomLinkManagerModal";
import { JoinMeetingModal } from "../modals/JoinMeetingModal";

interface TopBarProps {
  /** Phones only: opens the navigation drawer */
  onOpenMobileNav?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileNav }) => {
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
    setIsAnalyticsConsentOpen,
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
      } else if (e.key === "Escape") {
        setIsCommandPaletteOpen(false);
        setIsProfileMenuOpen(false);
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
    { label: "Class Attendance", category: "View", roles: ["instructor", "auditor", "admin"], action: () => setActiveView("attendance"), icon: Calendar },
    { label: "Engagement Analytics", category: "Audit", roles: ["auditor", "admin"], action: () => setActiveView("analytics"), icon: Sparkles },
    { label: "Course Materials Library", category: "View", roles: ["instructor", "student", "admin"], action: () => setActiveView("materials"), icon: BookOpen },
    { label: "Automation & Operations Hub", category: "Ops", roles: ["admin"], action: () => setActiveView("admin"), icon: Layers },
    { label: "Device Access Requests & Audit Log", category: "Audit", roles: ["auditor", "admin", "instructor"], action: () => setActiveView("device_audit"), icon: ShieldCheck },
    { label: "Switch Classroom Room", category: "Room", roles: ["instructor", "student", "auditor", "sales_rep", "admin"], action: () => setIsJoinMeetingModalOpen(true), icon: Video },
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

  const roleLabel = currentRole === "instructor" ? "Teacher" : currentRole === "sales_rep" ? "Sales" : currentRole === "auditor" ? "Auditor" : currentRole === "admin" ? "Admin" : "Student";
  const closeMenu = () => setIsProfileMenuOpen(false);
  const menuAction = (fn: () => void) => () => {
    fn();
    closeMenu();
  };

  return (
    <header className="h-14 border-b border-white/10 bg-[#0a0f1c] pl-2 pr-2 sm:px-3 lg:px-4 flex items-center gap-2 select-none z-40 shrink-0 shadow-lg relative">
      {/* Zone 1: Menu (phones), logo, breadcrumb */}
      {onOpenMobileNav && (
        <button onClick={onOpenMobileNav} className="icon-btn md:hidden border-transparent bg-transparent" aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
      )}
      <a
        href="#classroom"
        onClick={(e) => {
          e.preventDefault();
          setActiveView(currentRole === "sales_rep" ? "sales_hub" : "classroom");
        }}
        className="hover:opacity-90 transition-opacity flex items-center min-w-0 shrink-0"
        aria-label="Dronacharya home"
      >
        <SchoolLogo size="sm" showTagline={false} systemName="Dronacharya" theme="dark" badgeFrom="xl" compactOnTiny />
      </a>

      <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400 pl-3 ml-1 border-l border-white/10 min-w-0">
        <span className="font-semibold text-slate-200 whitespace-nowrap">{activeRoomFlow?.category || "21K School"}</span>
        <span aria-hidden="true" className="text-slate-600">/</span>
        <span className="truncate max-w-[220px] text-slate-300" title={roomTitle}>
          {roomTitle}
        </span>
        {roomBreak?.isActive && (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[10px] font-bold animate-pulse whitespace-nowrap">
            <Coffee className="w-3 h-3 text-amber-400" />
            Break {formatBreakTime(roomBreak.remainingSeconds)}
          </span>
        )}
      </div>

      {/* Zone 2: Command search */}
      <div className="flex-1 min-w-0 flex justify-center px-1 lg:px-4">
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="hidden md:flex w-full max-w-md h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors group"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Search className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-blue-400 transition-colors" />
            <span className="truncate">Search tools, rooms, schedule…</span>
          </span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 font-mono text-[10px] bg-white/10 border border-white/10 px-1.5 py-0.5 rounded text-slate-400">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>
      </div>

      {/* Zone 3: Primary actions + account menu. Secondary actions live in the account menu. */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button onClick={() => setIsCommandPaletteOpen(true)} className="icon-btn md:hidden" aria-label="Search">
          <Search className="w-4 h-4" />
        </button>

        {currentRole !== "student" ? (
          <button
            onClick={handleCopyStudentLink}
            className="h-9 inline-flex items-center gap-1.5 px-2.5 lg:px-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-md transition-colors whitespace-nowrap"
            title="Copy the student joining link"
            aria-label={copiedLink ? "Link copied" : "Copy student invite link"}
          >
            {copiedLink ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span className="hidden lg:inline">{copiedLink ? "Link copied" : "Invite student"}</span>
          </button>
        ) : (
          <span className="hidden lg:flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-semibold whitespace-nowrap">
            <GraduationCap className="w-4 h-4 text-blue-400" />
            Student
          </span>
        )}

        <button
          onClick={() => setIsInterpreterModalOpen(true)}
          className="icon-btn hidden sm:inline-flex border-cyan-500/40 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20"
          title="AI live interpreter"
          aria-label="Open AI live interpreter"
        >
          <Globe className="w-4 h-4" />
        </button>

        <DeviceAccessInbox />

        <div className="hidden 2xl:block">
          <EdgeMeshLatencyHUD />
        </div>

        {/* Account menu */}
        <div className="relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="h-9 flex items-center gap-1.5 pl-1 pr-1.5 sm:pr-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            aria-haspopup="menu"
            aria-expanded={isProfileMenuOpen}
            aria-label="Account menu"
          >
            <span className="relative w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              {authenticatedUser ? authenticatedUser.name.charAt(0) : "21"}
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${isOfflineMode ? "bg-amber-400" : "bg-emerald-400"}`} />
            </span>
            <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider text-slate-300">{roleLabel}</span>
            <ChevronDown className="hidden sm:block w-3 h-3 text-slate-400" />
          </button>

          {isProfileMenuOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-black/50 sm:bg-transparent animate-fadeIn" onClick={closeMenu} />
              <div
                role="menu"
                className="fixed sm:absolute inset-x-0 bottom-0 sm:bottom-auto sm:inset-x-auto sm:right-0 sm:top-11 sm:w-72 z-50 bg-slate-900/98 border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-2 backdrop-blur-xl animate-sheetUp sm:animate-fadeIn max-h-[85dvh] overflow-y-auto"
              >
                <div className="sm:hidden mx-auto my-1.5 h-1 w-10 rounded-full bg-white/20" />
                <div className="px-3 py-2.5 mb-1 border-b border-white/10 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {authenticatedUser ? authenticatedUser.name.charAt(0) : "21"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{authenticatedUser ? authenticatedUser.name : "Signed-in user"}</div>
                    <div className="text-xs text-slate-400 truncate">{authenticatedUser?.email}</div>
                  </div>
                  <span className="ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30">{roleLabel}</span>
                </div>

                <div className="space-y-0.5">
                  <button className="menu-item" onClick={menuAction(() => setIsJoinMeetingModalOpen(true))}>
                    <Video className="w-4 h-4 text-cyan-400" /> Switch room
                  </button>
                  {currentRole !== "student" && (
                    <button className="menu-item" onClick={menuAction(() => setIsLinkModalOpen(true))}>
                      <Link2 className="w-4 h-4 text-blue-400" /> Room links & device rules
                    </button>
                  )}
                  <button className="menu-item" onClick={menuAction(handleCopyLink)}>
                    <Copy className="w-4 h-4 text-slate-400" /> Copy room link
                  </button>
                  <button className="menu-item sm:hidden" onClick={menuAction(() => setIsInterpreterModalOpen(true))}>
                    <Globe className="w-4 h-4 text-cyan-400" /> AI live interpreter
                  </button>
                  {(currentRole === "instructor" || currentRole === "admin") && (
                    <button className="menu-item" onClick={menuAction(() => setIsScheduleModalOpen(true))}>
                      <Calendar className="w-4 h-4 text-emerald-400" /> Schedule class
                    </button>
                  )}
                  <button className="menu-item" onClick={toggleOfflineMode} role="menuitemcheckbox" aria-checked={isOfflineMode}>
                    {isOfflineMode ? <WifiOff className="w-4 h-4 text-amber-400" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
                    <span className="flex-1">Offline cached mode</span>
                    <span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${isOfflineMode ? "bg-amber-500" : "bg-white/15"}`}>
                      <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${isOfflineMode ? "translate-x-4" : ""}`} />
                    </span>
                  </button>
                  {(currentRole === "student" || currentRole === "instructor" || currentRole === "sales_rep") && (
                    <button className="menu-item" onClick={menuAction(() => setIsAnalyticsConsentOpen(true))}>
                      <ShieldCheck className="w-4 h-4 text-violet-300" /> Engagement analytics choice
                    </button>
                  )}
                  <button className="menu-item" onClick={menuAction(() => setIsDocsModalOpen(true))}>
                    <BookOpen className="w-4 h-4 text-blue-400" /> Platform docs
                  </button>
                  {currentRole === "admin" && (
                    <button className="menu-item" onClick={menuAction(() => setIsAuthModalOpen(true))}>
                      <KeyRound className="w-4 h-4 text-amber-400" /> Switch role portal
                    </button>
                  )}
                </div>

                <div className="mt-1 pt-1 border-t border-white/10">
                  <button className="menu-item text-rose-300 hover:bg-rose-500/10" onClick={menuAction(logoutUser)}>
                    <LogOut className="w-4 h-4 text-rose-400" /> Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Global Command Palette Modal (Cmd+K) */}
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-start justify-center pt-[max(1rem,env(safe-area-inset-top))] sm:pt-24 px-2 sm:px-4 animate-fadeIn" onClick={(e) => e.target === e.currentTarget && setIsCommandPaletteOpen(false)}>
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
              <button
                onClick={() => setIsCommandPaletteOpen(false)}
                className="px-2 py-1 text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 rounded cursor-pointer hover:text-white"
              >
                ESC
              </button>
            </div>

            <div className="max-h-[60dvh] sm:max-h-80 overflow-y-auto p-2 space-y-1">
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
                      className="w-full flex items-center justify-between gap-2 p-2.5 min-h-11 rounded-xl hover:bg-white/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 p-1.5 rounded-lg bg-white/5 text-slate-300 group-hover:text-blue-400 group-hover:bg-blue-600/20 transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-200 group-hover:text-white truncate">
                          {cmd.label}
                        </span>
                      </div>
                      <span className="hidden sm:inline shrink-0 text-[10px] font-mono text-slate-500 uppercase px-1.5 py-0.5 rounded bg-white/5">
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
