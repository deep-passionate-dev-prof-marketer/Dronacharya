import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Video,
  MessageSquare,
  Flame,
  UserCheck,
  Database,
  Sparkles,
  Layers,
  BookOpen,
  BarChart2,
  CalendarCheck,
  ShieldCheck,
  Server,
  Laptop,
  ChevronLeft,
  ChevronRight,
  School,
  GraduationCap,
  Command,
  FileText,
  DoorOpen,
  Link2,
  Zap,
  X,
} from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenLinkModal: () => void;
  /** Phone layout: the sidebar renders as an off-canvas drawer */
  isMobile?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const SidebarNavigation: React.FC<SidebarProps> = ({
  isCollapsed: isCollapsedProp,
  onToggleCollapse,
  onOpenLinkModal,
  isMobile = false,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  // The mobile drawer always shows labels
  const isCollapsed = isMobile ? false : isCollapsedProp;
  const {
    activeView,
    setActiveView,
    currentRole,
    pitchRooms,
    waitingList,
    activeDockTab,
    setActiveDockTab
  } = useClassroom();

  const [schoolBrand, setSchoolBrand] = useState<"21kos" | "21klf">("21kos");
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

  interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
    action: () => void;
    isActive: boolean;
  }

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  let NAVIGATION_SECTIONS: NavSection[] = [];

  if (currentRole === "student") {
    NAVIGATION_SECTIONS = [
      {
        title: "My Learning Stage",
        items: [
          {
            id: "classroom",
            label: "Live Stage",
            icon: Video,
            action: () => setActiveView("classroom"),
            isActive: activeView === "classroom",
          },
          {
            id: "social",
            label: "Campus Feed",
            icon: MessageSquare,
            badge: "Live",
            action: () => setActiveView("social"),
            isActive: activeView === "social",
          },
        ],
      },
      {
        title: "Academics & Study",
        items: [
          {
            id: "notebook",
            label: "LLM Notebook",
            icon: Sparkles,
            action: () => setActiveView("notebook"),
            isActive: activeView === "notebook",
          },
          {
            id: "materials",
            label: "Offline Repository",
            icon: BookOpen,
            action: () => setActiveView("materials"),
            isActive: activeView === "materials",
          },
          {
            id: "blockchain",
            label: "My Certificates",
            icon: ShieldCheck,
            action: () => setActiveView("blockchain"),
            isActive: activeView === "blockchain",
          },
        ],
      },
    ];
  } else if (currentRole === "instructor") {
    NAVIGATION_SECTIONS = [
      {
        title: "Core Stage",
        items: [
          {
            id: "classroom",
            label: "Teacher Stage",
            icon: Video,
            action: () => setActiveView("classroom"),
            isActive: activeView === "classroom",
          },
          {
            id: "social",
            label: "Campus Feed",
            icon: MessageSquare,
            badge: "Live",
            action: () => setActiveView("social"),
            isActive: activeView === "social",
          },
        ],
      },
      {
        title: "Pedagogy & Classroom",
        items: [
          {
            id: "notebook",
            label: "LLM Notebook",
            icon: Sparkles,
            action: () => setActiveView("notebook"),
            isActive: activeView === "notebook",
          },
          {
            id: "materials",
            label: "Course Repository",
            icon: BookOpen,
            action: () => setActiveView("materials"),
            isActive: activeView === "materials",
          },
          {
            id: "attendance",
            label: "Class Attendance",
            icon: CalendarCheck,
            action: () => setActiveView("attendance"),
            isActive: activeView === "attendance",
          },
          {
            id: "analytics",
            label: "Attention Analytics",
            icon: BarChart2,
            action: () => setActiveView("analytics"),
            isActive: activeView === "analytics",
          },
          {
            id: "facilitators",
            label: "Teaching Schedule",
            icon: UserCheck,
            action: () => setActiveView("facilitators"),
            isActive: activeView === "facilitators",
          },
          {
            id: "device_audit",
            label: "Device Access",
            icon: ShieldCheck,
            action: () => setActiveView("device_audit"),
            isActive: activeView === "device_audit",
          },
        ],
      },
    ];
  } else if (currentRole === "auditor") {
    NAVIGATION_SECTIONS = [
      {
        title: "Audit & Compliance",
        items: [
          {
            id: "classroom",
            label: "Observer Cockpit",
            icon: Video,
            action: () => setActiveView("classroom"),
            isActive: activeView === "classroom",
          },
          {
            id: "analytics",
            label: "Quality & Attention",
            icon: BarChart2,
            action: () => setActiveView("analytics"),
            isActive: activeView === "analytics",
          },
          {
            id: "attendance",
            label: "Attendance Audit",
            icon: CalendarCheck,
            action: () => setActiveView("attendance"),
            isActive: activeView === "attendance",
          },
          {
            id: "device_audit",
            label: "Device Telemetry",
            icon: ShieldCheck,
            badge: "Active",
            badgeColor: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
            action: () => setActiveView("device_audit"),
            isActive: activeView === "device_audit",
          },
          {
            id: "blockchain",
            label: "Verifiable Creds",
            icon: ShieldCheck,
            action: () => setActiveView("blockchain"),
            isActive: activeView === "blockchain",
          },
        ],
      },
    ];
  } else if (currentRole === "sales_rep") {
    NAVIGATION_SECTIONS = [
      {
        title: "Admissions & Sales",
        items: [
          {
            id: "sales_hub",
            label: "Sales Command Hub",
            icon: Zap,
            badge: "Live CRM",
            badgeColor: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
            action: () => setActiveView("sales_hub"),
            isActive: activeView === "sales_hub",
          },
          {
            id: "room_bomber",
            label: "Room Bomber 1:1",
            icon: Flame,
            badge: String(pitchRooms.length || 4),
            badgeColor: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
            action: () => setActiveView("room_bomber"),
            isActive: activeView === "room_bomber",
          },
          {
            id: "crm",
            label: "CRM Webhook Sync",
            icon: Database,
            action: () => setActiveView("crm"),
            isActive: activeView === "crm",
          },
          {
            id: "facilitators",
            label: "Demo Schedule",
            icon: UserCheck,
            action: () => setActiveView("facilitators"),
            isActive: activeView === "facilitators",
          },
          {
            id: "classroom",
            label: "Live Pitch Stage",
            icon: Video,
            action: () => setActiveView("classroom"),
            isActive: activeView === "classroom",
          },
          {
            id: "device_audit",
            label: "Sales Device Health",
            icon: ShieldCheck,
            action: () => setActiveView("device_audit"),
            isActive: activeView === "device_audit",
          },
          {
            id: "social",
            label: "Campus Feed",
            icon: MessageSquare,
            action: () => setActiveView("social"),
            isActive: activeView === "social",
          },
        ],
      },
    ];
  } else {
    // Admin: Full platform access
    NAVIGATION_SECTIONS = [
      {
        title: "Core Stage",
        items: [
          {
            id: "classroom",
            label: "Live Stage",
            icon: Video,
            action: () => setActiveView("classroom"),
            isActive: activeView === "classroom",
          },
          {
            id: "social",
            label: "Campus Feed",
            icon: MessageSquare,
            badge: "Live",
            action: () => setActiveView("social"),
            isActive: activeView === "social",
          },
        ],
      },
      {
        title: "Operations & Sales",
        items: [
          {
            id: "sales_hub",
            label: "Sales Admissions Hub",
            icon: Zap,
            action: () => setActiveView("sales_hub"),
            isActive: activeView === "sales_hub",
          },
          {
            id: "room_bomber",
            label: "Room Bomber 1:1",
            icon: Flame,
            badge: String(pitchRooms.length || 4),
            badgeColor: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
            action: () => setActiveView("room_bomber"),
            isActive: activeView === "room_bomber",
          },
          {
            id: "links",
            label: "Room Nomenclature",
            icon: Link2,
            action: onOpenLinkModal,
            isActive: false,
          },
          {
            id: "facilitators",
            label: "Facilitators Matrix",
            icon: UserCheck,
            action: () => setActiveView("facilitators"),
            isActive: activeView === "facilitators",
          },
          {
            id: "crm",
            label: "CRM Connect",
            icon: Database,
            action: () => setActiveView("crm"),
            isActive: activeView === "crm",
          },
        ],
      },
      {
        title: "Academics & AI",
        items: [
          {
            id: "notebook",
            label: "LLM Notebook",
            icon: Sparkles,
            action: () => setActiveView("notebook"),
            isActive: activeView === "notebook",
          },
          {
            id: "materials",
            label: "Offline Repository",
            icon: BookOpen,
            action: () => setActiveView("materials"),
            isActive: activeView === "materials",
          },
          {
            id: "analytics",
            label: "Attention Analytics",
            icon: BarChart2,
            action: () => setActiveView("analytics"),
            isActive: activeView === "analytics",
          },
          {
            id: "attendance",
            label: "Biometric Attendance",
            icon: CalendarCheck,
            action: () => setActiveView("attendance"),
            isActive: activeView === "attendance",
          },
        ],
      },
      {
        title: "Audit & Enterprise",
        items: [
          {
            id: "device_audit",
            label: "Device Access & Audit",
            icon: ShieldCheck,
            action: () => setActiveView("device_audit"),
            isActive: activeView === "device_audit",
          },
          {
            id: "blockchain",
            label: "Verifiable Creds",
            icon: ShieldCheck,
            action: () => setActiveView("blockchain"),
            isActive: activeView === "blockchain",
          },
          {
            id: "selfhosted",
            label: "Self-Hosted Node",
            icon: Server,
            action: () => setActiveView("selfhosted"),
            isActive: activeView === "selfhosted",
          },
          {
            id: "admin",
            label: "Automation Hub",
            icon: Layers,
            action: () => setActiveView("admin"),
            isActive: activeView === "admin",
          },
        ],
      },
    ];
  }

  if (isMobile && !isMobileOpen) return null;

  const runAction = (action: () => void) => {
    action();
    if (isMobile) onCloseMobile?.();
  };

  return (
    <>
      {isMobile && (
        <div onClick={onCloseMobile} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fadeIn" aria-hidden="true" />
      )}

      <aside
        aria-label="Primary navigation"
        className={`flex flex-col shrink-0 select-none border-r border-white/10 bg-slate-950/95 backdrop-blur-2xl ${
          isMobile
            ? "fixed inset-y-0 left-0 z-50 w-[min(20rem,86vw)] shadow-2xl animate-drawerIn pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            : `relative h-full z-20 transition-[width] duration-200 ease-out ${isCollapsed ? "w-[68px]" : "w-60"}`
        }`}
      >
      {/* Workspace Brand Header */}
      <div className="h-14 border-b border-white/10 px-3 flex items-center justify-between shrink-0 relative">
        {!isCollapsed ? (
          <div className="relative flex-1 min-w-0 pr-2">
            <button
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="w-full flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-white/5 transition-all text-left group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0082FF] to-[#003872] flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                  <School className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-white tracking-wide truncate flex items-center gap-1.5">
                    {schoolBrand === "21kos" ? "21K School" : "21K Floww"}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {schoolBrand === "21kos" ? "Global Online School" : "Learning Floww LMS"}
                  </div>
                </div>
              </div>
            </button>

            {/* Workspace Dropdown */}
            {workspaceMenuOpen && (
              <div className="absolute left-1 top-12 w-60 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl p-1.5 z-50 backdrop-blur-xl animate-fadeIn space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Switch Workspace
                </div>
                <button
                  onClick={() => {
                    setSchoolBrand("21kos");
                    setWorkspaceMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    schoolBrand === "21kos"
                      ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <School className="w-4 h-4 text-blue-400" />
                  <div className="text-left">
                    <div className="font-semibold text-white">21K Online School</div>
                    <div className="text-[10px] text-slate-400">Formal K-12 Curriculum (IC/BC/US)</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setSchoolBrand("21klf");
                    setWorkspaceMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    schoolBrand === "21klf"
                      ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <GraduationCap className="w-4 h-4 text-indigo-400" />
                  <div className="text-left">
                    <div className="font-semibold text-white">21K Learning Floww</div>
                    <div className="text-[10px] text-slate-400">Hands-on Coding, Robotics & AI</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0082FF] to-[#003872] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <School className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={isMobile ? onCloseMobile : onToggleCollapse}
          className={`${isCollapsed ? "absolute -right-3 top-4 w-6 h-6 rounded-full bg-slate-800 border border-white/15 shadow-lg flex items-center justify-center" : "p-2 rounded-lg"} text-slate-400 hover:text-white hover:bg-white/10 transition-colors`}
          title={isMobile ? "Close menu" : isCollapsed ? "Expand sidebar (Ctrl/Cmd+B)" : "Collapse sidebar (Ctrl/Cmd+B)"}
          aria-label={isMobile ? "Close menu" : isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isMobile ? <X className="w-4 h-4" /> : isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links Scroll Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {NAVIGATION_SECTIONS.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!isCollapsed && (
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => runAction(item.action)}
                    title={isCollapsed ? item.label : undefined}
                    aria-label={item.label}
                    aria-current={item.isActive ? "page" : undefined}
                    className={`w-full flex items-center gap-3 px-3 min-h-10 rounded-xl text-[13px] font-medium transition-all group relative ${
                      item.isActive
                        ? "bg-blue-600/20 text-white border border-blue-500/30 shadow-sm shadow-blue-600/10 font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    } ${isCollapsed ? "justify-center px-0" : ""}`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                        item.isActive ? "text-[#0082FF]" : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    />

                    {!isCollapsed && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                          item.badgeColor || "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Collapsed active dot */}
                    {isCollapsed && item.isActive && (
                      <span className="absolute right-1 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Dock Quick Tabs in Sidebar for Rapid Switching */}
      {!isCollapsed && activeView === "classroom" && (
        <div className="p-2 border-t border-white/10 bg-slate-950/40">
          <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Dock Drawer</span>
            <span className="text-[9px] text-blue-400 font-mono">Synced</span>
          </div>
          <div className="grid grid-cols-2 gap-1 mt-1 text-[11px]">
            <button
              onClick={() => runAction(() => setActiveDockTab("whiteboard"))}
              className={`px-2 min-h-8 rounded-lg text-left truncate transition-colors ${
                activeDockTab === "whiteboard"
                  ? "bg-white/10 text-white font-semibold"
                  : "text-slate-400 hover:bg-white/5"
              }`}
            >
              Whiteboard
            </button>
            <button
              onClick={() => runAction(() => setActiveDockTab("stem3d"))}
              className={`px-2 min-h-8 rounded-lg text-left truncate transition-colors ${
                activeDockTab === "stem3d"
                  ? "bg-white/10 text-white font-semibold"
                  : "text-slate-400 hover:bg-white/5"
              }`}
            >
              3D AR Lab
            </button>
            <button
              onClick={() => runAction(() => setActiveDockTab("transcript"))}
              className={`px-2 min-h-8 rounded-lg text-left truncate transition-colors ${
                activeDockTab === "transcript"
                  ? "bg-white/10 text-white font-semibold"
                  : "text-slate-400 hover:bg-white/5"
              }`}
            >
              Transcripts
            </button>
            <button
              onClick={() => runAction(() => setActiveDockTab("smartnotes"))}
              className={`px-2 min-h-8 rounded-lg text-left truncate transition-colors ${
                activeDockTab === "smartnotes"
                  ? "bg-white/10 text-white font-semibold"
                  : "text-slate-400 hover:bg-white/5"
              }`}
            >
              Peer Notes
            </button>
          </div>
        </div>
      )}

      {/* Footer shortcut helper */}
      <div className="p-3 border-t border-white/10 shrink-0 flex items-center justify-between text-[11px] text-slate-500">
        {!isCollapsed ? (
          <>
            <span className="flex items-center gap-1 font-mono text-[10px]">
              {!isMobile && (<><Command className="w-3 h-3 text-slate-400" /> + B to toggle</>)}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Online" />
          </>
        ) : (
          <div className="w-full flex justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Online" />
          </div>
        )}
      </div>
    </aside>
    </>
  );
};
