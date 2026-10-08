import React from "react";
import { Video, MessageSquare, Sparkles, BookOpen, CalendarCheck, BarChart2, ShieldCheck, Zap, Flame, Database, Menu } from "lucide-react";
import { useClassroom, ClassroomView } from "../../context/ClassroomContext";

type Tab = { view: ClassroomView; label: string; icon: React.ComponentType<{ className?: string }> };

/** The four destinations each role opens most; everything else lives behind "More". */
const PRIMARY_TABS: Record<string, Tab[]> = {
  student: [
    { view: "classroom", label: "Class", icon: Video },
    { view: "social", label: "Feed", icon: MessageSquare },
    { view: "notebook", label: "Notebook", icon: Sparkles },
    { view: "materials", label: "Library", icon: BookOpen },
  ],
  instructor: [
    { view: "classroom", label: "Stage", icon: Video },
    { view: "attendance", label: "Attendance", icon: CalendarCheck },
    { view: "analytics", label: "Insights", icon: BarChart2 },
    { view: "notebook", label: "Notebook", icon: Sparkles },
  ],
  auditor: [
    { view: "classroom", label: "Observe", icon: Video },
    { view: "analytics", label: "Quality", icon: BarChart2 },
    { view: "attendance", label: "Attendance", icon: CalendarCheck },
    { view: "device_audit", label: "Devices", icon: ShieldCheck },
  ],
  sales_rep: [
    { view: "sales_hub", label: "Hub", icon: Zap },
    { view: "room_bomber", label: "Pitches", icon: Flame },
    { view: "crm", label: "CRM", icon: Database },
    { view: "classroom", label: "Stage", icon: Video },
  ],
  admin: [
    { view: "classroom", label: "Live", icon: Video },
    { view: "sales_hub", label: "Sales", icon: Zap },
    { view: "device_audit", label: "Devices", icon: ShieldCheck },
    { view: "analytics", label: "Insights", icon: BarChart2 },
  ],
};

export const MobileTabBar: React.FC<{ onOpenMore: () => void }> = ({ onOpenMore }) => {
  const { activeView, setActiveView, currentRole } = useClassroom();
  const tabs = PRIMARY_TABS[currentRole] || PRIMARY_TABS.student;
  const moreActive = !tabs.some((t) => t.view === activeView);

  return (
    <nav
      aria-label="Primary"
      className="shrink-0 border-t border-white/10 bg-slate-950/95 backdrop-blur-2xl pb-[env(safe-area-inset-bottom)] z-30"
    >
      <div className="grid grid-cols-5 h-16">
        {tabs.map(({ view, label, icon: Icon }) => {
          const active = activeView === view;
          return (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${active ? "text-white" : "text-slate-500 active:text-slate-300"}`}
            >
              <span className={`h-7 w-12 rounded-full flex items-center justify-center transition-colors ${active ? "bg-blue-600/25" : ""}`}>
                <Icon className={`w-5 h-5 ${active ? "text-blue-400" : ""}`} />
              </span>
              {label}
            </button>
          );
        })}
        <button
          onClick={onOpenMore}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${moreActive ? "text-white" : "text-slate-500"}`}
        >
          <span className={`h-7 w-12 rounded-full flex items-center justify-center ${moreActive ? "bg-blue-600/25" : ""}`}>
            <Menu className={`w-5 h-5 ${moreActive ? "text-blue-400" : ""}`} />
          </span>
          More
        </button>
      </div>
    </nav>
  );
};
