import React from "react";
import { useClassroom } from "../../context/ClassroomContext";
import { ChevronLeft, ChevronRight, Command, Link2, School, X } from "lucide-react";
import { navSections, viewLabel } from "../../routing/viewRegistry";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenLinkModal: () => void;
  /** Phone layout: the sidebar renders as an off-canvas drawer */
  isMobile?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const ROLE_NAME: Record<string, string> = {
  instructor: "Teacher",
  ta: "Teaching assistant",
  auditor: "Auditor",
  sales_rep: "Admissions",
  admin: "Admin",
  student: "Learner",
  parent: "Parent",
};

/**
 * Main navigation. Pages, names, icons and who sees them come from the view registry; the only
 * badges are real counts (learners waiting to be admitted).
 */
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
  const { activeView, setActiveView, currentRole, waitingList } = useClassroom();
  const sections = navSections(currentRole);
  const canHost = ["instructor", "admin"].includes(currentRole);
  const badgeFor = (id: string) => (id === "classroom" && canHost && waitingList.length ? { value: String(waitingList.length), label: `${waitingList.length} waiting to be admitted` } : null);

  if (isMobile && !isMobileOpen) return null;

  const go = (fn: () => void) => {
    fn();
    if (isMobile) onCloseMobile?.();
  };

  return (
    <>
      {isMobile && <div onClick={onCloseMobile} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fadeIn" aria-hidden="true" />}

      <aside
        aria-label="Primary navigation"
        className={`flex flex-col shrink-0 select-none border-r border-line bg-surface-sunken/95 backdrop-blur-2xl ${
          isMobile
            ? "fixed inset-y-0 left-0 z-50 w-[min(20rem,86vw)] shadow-overlay animate-drawerIn pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            : `relative h-full z-20 transition-[width] duration-200 ease-out ${isCollapsed ? "w-[68px]" : "w-60"}`
        }`}
      >
        <div className="h-14 border-b border-line px-3 flex items-center justify-between shrink-0 relative">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-brand-navy flex items-center justify-center text-white shrink-0">
                <School className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold text-ink truncate">21K School</span>
                <span className="block text-2xs text-ink-3 truncate">{ROLE_NAME[currentRole] || "Workspace"}</span>
              </span>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-brand-navy flex items-center justify-center text-white">
                <School className="w-4 h-4" />
              </span>
            </div>
          )}
          <button
            onClick={isMobile ? onCloseMobile : onToggleCollapse}
            className={`${isCollapsed ? "absolute -right-3 top-4 w-6 h-6 rounded-full bg-surface-raised border border-line-strong shadow-lg flex items-center justify-center" : "h-9 w-9 rounded-lg flex items-center justify-center"} text-ink-3 hover:text-ink hover:bg-white/10 transition-colors`}
            title={isMobile ? "Close menu" : isCollapsed ? "Expand sidebar (Ctrl/Cmd+B)" : "Collapse sidebar (Ctrl/Cmd+B)"}
            aria-label={isMobile ? "Close menu" : isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isMobile ? <X className="w-4 h-4" /> : isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 flex flex-col gap-4">
          {sections.map((section) => (
            <div key={section.group} className="flex flex-col gap-0.5">
              {!isCollapsed ? (
                <div className="px-2 py-1 text-2xs font-semibold text-ink-3 uppercase tracking-wider">{section.group}</div>
              ) : (
                <div className="mx-3 my-1 h-px bg-line" aria-hidden="true" />
              )}
              {section.views.map((v) => {
                const Icon = v.icon;
                const active = activeView === v.id;
                const label = viewLabel(v.id, currentRole);
                const badge = badgeFor(v.id);
                return (
                  <button
                    key={v.id}
                    onClick={() => go(() => setActiveView(v.id as any))}
                    title={isCollapsed ? label : undefined}
                    aria-label={badge ? `${label}, ${badge.label}` : label}
                    aria-current={active ? "page" : undefined}
                    className={`w-full flex items-center gap-3 min-h-10 rounded-xl text-[13px] font-medium transition-colors relative ${
                      active ? "bg-accent/15 text-ink font-semibold" : "text-ink-3 hover:text-ink hover:bg-white/5"
                    } ${isCollapsed ? "justify-center px-0" : "px-3"}`}
                  >
                    {active && !isCollapsed && <span className="absolute left-0 inset-y-2 w-0.5 rounded-full bg-accent" aria-hidden="true" />}
                    <Icon className={`w-4 h-4 shrink-0 ${active ? "text-accent" : ""}`} />
                    {!isCollapsed && <span className="truncate flex-1 text-left">{label}</span>}
                    {badge && !isCollapsed && <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand-yellow text-brand-navy-deep text-2xs font-bold flex items-center justify-center">{badge.value}</span>}
                    {badge && isCollapsed && <span className="absolute top-1.5 right-2.5 w-2 h-2 rounded-full bg-brand-yellow" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          ))}

          {["instructor", "sales_rep", "admin"].includes(currentRole) && (
            <div className="flex flex-col gap-0.5">
              {!isCollapsed ? <div className="px-2 py-1 text-2xs font-semibold text-ink-3 uppercase tracking-wider">Tools</div> : <div className="mx-3 my-1 h-px bg-line" aria-hidden="true" />}
              <button
                onClick={() => go(onOpenLinkModal)}
                title={isCollapsed ? "Class links" : undefined}
                aria-label="Class links"
                className={`w-full flex items-center gap-3 min-h-10 rounded-xl text-[13px] font-medium text-ink-3 hover:text-ink hover:bg-white/5 ${isCollapsed ? "justify-center px-0" : "px-3"}`}
              >
                <Link2 className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate flex-1 text-left">Class links</span>}
              </button>
            </div>
          )}
        </nav>

        {!isMobile && !isCollapsed && (
          <div className="p-3 border-t border-line shrink-0 text-2xs text-ink-3 flex items-center gap-1">
            <Command className="w-3 h-3" aria-hidden="true" />
            <span>B to collapse · </span>
            <Command className="w-3 h-3" aria-hidden="true" />
            <span>K to search</span>
          </div>
        )}
      </aside>
    </>
  );
};
