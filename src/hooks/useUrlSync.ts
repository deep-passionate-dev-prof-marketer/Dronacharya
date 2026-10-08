import { useEffect, useRef } from "react";
import { buildPath, parsePath, AppPage } from "../routing/appRoutes";
import { findFaculty } from "../services/matching/facultyRoster";
import type { AuthUser } from "../types";

const DOCK_FEATURE: Record<string, string> = {
  whiteboard: "whiteboard",
  stem3d: "3d-lab",
  notes: "deck-and-notes",
  smartnotes: "peer-notes",
  polls: "polls",
  breakouts: "breakouts",
  transcript: "transcript",
  lobby: "lobby",
};
const FEATURE_DOCK = Object.fromEntries(Object.entries(DOCK_FEATURE).map(([k, v]) => [v, k]));

/**
 * Keeps the address bar in step with what's on screen (role/country/language/user/page/feature),
 * and lets browser back/forward move between pages.
 */
export function useUrlSync(opts: {
  user: AuthUser | null;
  activeView: string;
  setActiveView: (v: any) => void;
  dockTab: string;
  setDockTab: (t: any) => void;
  roomId: string;
}) {
  const { user, activeView, setActiveView, dockTab, setDockTab, roomId } = opts;
  const first = useRef(true);

  // On first load, honour a role URL that was opened directly (bookmark / shared staff link)
  useEffect(() => {
    const parsed = parsePath(window.location.pathname);
    if (!parsed) return;
    setActiveView(parsed.page);
    if (parsed.page === "classroom" && parsed.feature && FEATURE_DOCK[parsed.feature]) setDockTab(FEATURE_DOCK[parsed.feature]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    const faculty = findFaculty(user.id);
    const path = buildPath(
      {
        id: user.id,
        name: user.name,
        role: user.role,
        studentCode: user.studentCode,
        country: user.country || faculty?.countryIso3,
        languageTag: user.languageTag || faculty?.languageTag,
      },
      activeView as AppPage,
      activeView === "classroom" ? DOCK_FEATURE[dockTab] : undefined
    );
    // Keep the class room in the URL so a reload rejoins the same room
    const params = new URLSearchParams(window.location.search);
    params.delete("view");
    if (activeView === "classroom" && roomId) params.set("room", roomId);
    const query = params.toString();
    const url = `${path}${query ? `?${query}` : ""}`;
    if (url === `${window.location.pathname}${window.location.search}`) return;
    // Don't litter history with the initial normalisation
    if (first.current) window.history.replaceState({ view: activeView }, "", url);
    else window.history.pushState({ view: activeView }, "", url);
    first.current = false;
  }, [user?.id, user?.role, user?.name, activeView, dockTab, roomId]);

  useEffect(() => {
    const onPop = () => {
      const parsed = parsePath(window.location.pathname);
      if (parsed) {
        setActiveView(parsed.page);
        if (parsed.feature && FEATURE_DOCK[parsed.feature]) setDockTab(FEATURE_DOCK[parsed.feature]);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setActiveView, setDockTab]);
}
