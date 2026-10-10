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
  ChevronDown,
  Coffee,
  Copy,
  Check,
  Video,
  ShieldCheck,
  Calendar,
  LogOut,
  Menu,
  UserPlus,
} from "lucide-react";
import { DeviceAccessInbox } from "../access/DeviceAccessInbox";
import { UserRole } from "../../types";
import { SchoolLogo } from "../brand/SchoolLogo";
import { EdgeMeshLatencyHUD } from "../classroom/EdgeMeshLatencyHUD";
import { RoomLinkManagerModal } from "../links/RoomLinkManagerModal";
import { JoinMeetingModal } from "../modals/JoinMeetingModal";
import { homeView, viewLabel, viewsFor } from "../../routing/viewRegistry";

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

  // Pages come from the view registry (only pages this role can open); then actions
  const ALL_COMMAND_ITEMS: Array<{ label: string; hint?: string; category: "Pages" | "Actions"; action: () => void; icon: React.ComponentType<{ className?: string }> }> = [
    ...viewsFor(currentRole).map((v) => ({ label: viewLabel(v.id, currentRole), hint: v.description, category: "Pages" as const, action: () => setActiveView(v.id as any), icon: v.icon })),
    ...(currentRole !== "parent" ? [{ label: "Switch class room", hint: "Open another class by link or code", category: "Actions" as const, action: () => setIsJoinMeetingModalOpen(true), icon: Video }] : []),
    ...(["instructor", "sales_rep", "admin"].includes(currentRole) ? [{ label: "Class links", hint: "Share links and device rules for a room", category: "Actions" as const, action: () => setIsLinkModalOpen(true), icon: Link2 }] : []),
    ...(["instructor", "admin"].includes(currentRole) ? [{ label: "Schedule a class", hint: "Book a class with the best-matched teacher", category: "Actions" as const, action: () => setIsScheduleModalOpen(true), icon: Calendar }] : []),
    { label: "Platform documentation", hint: "How the platform works", category: "Actions" as const, action: () => setIsDocsModalOpen(true), icon: BookOpen },
  ];

  const filteredCommands = ALL_COMMAND_ITEMS.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    return !q || c.label.toLowerCase().includes(q) || (c.hint || "").toLowerCase().includes(q);
  });
  const [cmdIndex, setCmdIndex] = useState(0);
  useEffect(() => setCmdIndex(0), [searchQuery, isCommandPaletteOpen]);
  const runCommand = (i: number) => {
    const cmd = filteredCommands[i];
    if (!cmd) return;
    cmd.action();
    setIsCommandPaletteOpen(false);
    setSearchQuery("");
  };
  const pageTitle = currentRole === "parent" && activeView === "parent_home" ? "Parent portal" : viewLabel(activeView, currentRole);
  const canInvite = activeView === "classroom" && ["instructor", "admin", "sales_rep"].includes(currentRole);

  const roleLabel = currentRole === "instructor" ? "Teacher" : currentRole === "sales_rep" ? "Admissions" : currentRole === "auditor" ? "Auditor" : currentRole === "admin" ? "Admin" : currentRole === "parent" ? "Parent" : "Student";
  const closeMenu = () => setIsProfileMenuOpen(false);
  const menuAction = (fn: () => void) => () => {
    fn();
    closeMenu();
  };

  return (
    <header className="h-14 border-b border-line bg-surface-sunken pl-2 pr-2 sm:px-3 lg:px-4 flex items-center gap-2 select-none z-40 shrink-0 relative">
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
          setActiveView(homeView(currentRole) as any);
        }}
        className="hover:opacity-90 transition-opacity flex items-center min-w-0 shrink-0"
        aria-label="Dronacharya home"
      >
        <SchoolLogo size="sm" showTagline={false} systemName="Dronacharya" theme="dark" badgeFrom="xl" compactOnTiny />
      </a>

      {/* Where you are: the page, and on the live class page the room */}
      <div className="hidden lg:flex items-center gap-2 text-xs text-ink-3 pl-3 ml-1 border-l border-line min-w-0">
        <span className="font-semibold text-ink whitespace-nowrap">{pageTitle}</span>
        {activeView === "classroom" && currentRole !== "parent" && (
          <>
            <span aria-hidden="true">/</span>
            <span className="truncate max-w-[220px] text-ink-2" title={roomTitle}>
              {roomTitle}
            </span>
          </>
        )}
        {roomBreak?.isActive && (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-2xs font-bold animate-pulse whitespace-nowrap">
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
          <kbd className="hidden lg:inline-flex items-center gap-0.5 font-mono text-2xs bg-white/10 border border-white/10 px-1.5 py-0.5 rounded text-slate-400">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>
      </div>

      {/* Zone 3: Primary actions + account menu. Secondary actions live in the account menu. */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button onClick={() => setIsCommandPaletteOpen(true)} className="icon-btn md:hidden" aria-label="Search">
          <Search className="w-4 h-4" />
        </button>

        {canInvite ? (
          <button
            onClick={handleCopyStudentLink}
            className="h-9 inline-flex items-center gap-1.5 px-2.5 lg:px-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-md transition-colors whitespace-nowrap"
            title="Copy the student joining link"
            aria-label={copiedLink ? "Link copied" : "Copy student invite link"}
          >
            {copiedLink ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span className="hidden lg:inline">{copiedLink ? "Link copied" : "Invite student"}</span>
          </button>
        ) : null}

        {activeView === "classroom" && <button
          onClick={() => setIsInterpreterModalOpen(true)}
          className="icon-btn hidden sm:inline-flex border-brand-cyan/40 text-brand-cyan bg-brand-cyan/10 hover:bg-brand-cyan/20"
          title="AI live interpreter"
          aria-label="Open AI live interpreter"
        >
          <Globe className="w-4 h-4" />
        </button>}

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
            <span className="hidden lg:inline text-2xs font-bold uppercase tracking-wider text-slate-300">{roleLabel}</span>
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
                  <span className="ml-auto text-2xs font-bold uppercase px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30">{roleLabel}</span>
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
                    <button className="menu-item" onClick={menuAction(logoutUser)}>
                      <KeyRound className="w-4 h-4 text-amber-400" /> Sign in as someone else
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
                placeholder="Go to a page or run an action…"
                aria-label="Search pages and actions"
                role="combobox"
                aria-expanded="true"
                aria-controls="command-results"
                aria-activedescendant={filteredCommands.length ? `cmd-${cmdIndex}` : undefined}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") setCmdIndex((i) => Math.min(filteredCommands.length - 1, i + 1));
                  else if (e.key === "ArrowUp") setCmdIndex((i) => Math.max(0, i - 1));
                  else if (e.key === "Enter") runCommand(cmdIndex);
                  else return;
                  e.preventDefault();
                }}
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 outline-none"
              />
              <button
                onClick={() => setIsCommandPaletteOpen(false)}
                className="px-2 py-1 text-2xs font-mono text-slate-400 bg-white/5 border border-white/10 rounded cursor-pointer hover:text-white"
              >
                ESC
              </button>
            </div>

            <div className="max-h-[60dvh] sm:max-h-96 overflow-y-auto p-2" role="listbox" id="command-results" aria-label="Results">
              {filteredCommands.length > 0 ? (
                (["Pages", "Actions"] as const).map((cat) => {
                  const items = filteredCommands.map((c, i) => ({ c, i })).filter(({ c }) => c.category === cat);
                  if (!items.length) return null;
                  return (
                    <div key={cat} className="mb-1">
                      <div className="px-2.5 pt-2 pb-1 text-2xs font-semibold uppercase tracking-wider text-ink-3">{cat}</div>
                      {items.map(({ c, i }) => {
                        const Icon = c.icon;
                        const active = i === cmdIndex;
                        return (
                          <button
                            key={`${cat}-${c.label}`}
                            id={`cmd-${i}`}
                            role="option"
                            aria-selected={active}
                            onMouseEnter={() => setCmdIndex(i)}
                            onClick={() => runCommand(i)}
                            className={`w-full flex items-center gap-3 p-2.5 min-h-11 rounded-xl text-left transition-colors ${active ? "bg-white/[0.07]" : "hover:bg-white/5"}`}
                          >
                            <span className={`shrink-0 p-1.5 rounded-lg ${active ? "bg-accent/20 text-accent" : "bg-white/5 text-ink-3"}`}>
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-ink truncate">{c.label}</span>
                              {c.hint && <span className="block text-2xs text-ink-3 truncate">{c.hint}</span>}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-ink-3">Nothing matches “{searchQuery}”.</div>
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
