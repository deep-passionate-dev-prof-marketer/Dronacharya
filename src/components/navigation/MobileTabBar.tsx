import React from "react";
import { Menu } from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";
import { phoneTabs } from "../../routing/viewRegistry";

/** The four pages each role opens most (from the view registry); everything else is under "More". */
export const MobileTabBar: React.FC<{ onOpenMore: () => void }> = ({ onOpenMore }) => {
  const { activeView, setActiveView, currentRole } = useClassroom();
  const tabs = phoneTabs(currentRole);
  const moreActive = !tabs.some((t) => t.id === activeView);

  return (
    <nav aria-label="Primary" className="shrink-0 border-t border-line bg-surface-sunken/95 backdrop-blur-2xl pb-[env(safe-area-inset-bottom)] z-30">
      <div className="grid h-16" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
        {tabs.map(({ id, short, icon: Icon }) => {
          const active = activeView === id;
          return (
            <button
              key={id}
              onClick={() => setActiveView(id as any)}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 text-2xs font-semibold transition-colors ${active ? "text-ink" : "text-ink-3 active:text-ink-2"}`}
            >
              <span className={`h-7 w-12 rounded-full flex items-center justify-center transition-colors ${active ? "bg-accent/20" : ""}`}>
                <Icon className={`w-5 h-5 ${active ? "text-accent" : ""}`} />
              </span>
              {short}
            </button>
          );
        })}
        <button onClick={onOpenMore} aria-current={moreActive ? "page" : undefined} className={`flex flex-col items-center justify-center gap-1 text-2xs font-semibold ${moreActive ? "text-ink" : "text-ink-3"}`}>
          <span className={`h-7 w-12 rounded-full flex items-center justify-center ${moreActive ? "bg-accent/20" : ""}`}>
            <Menu className={`w-5 h-5 ${moreActive ? "text-accent" : ""}`} />
          </span>
          More
        </button>
      </div>
    </nav>
  );
};
