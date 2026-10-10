import React from "react";
import { ClassroomProvider, useClassroom } from "./context/ClassroomContext";
import { TopBar } from "./components/navigation/TopBar";
import { IncomingAccessNotification } from "./components/classroom/IncomingAccessNotification";
import { SidebarNavigation } from "./components/navigation/SidebarNavigation";
import { SignInScreen } from "./components/auth/SignInScreen";
import { ForensicWatermark } from "./components/protection/ForensicWatermark";
import { useContentGuard } from "./components/protection/useContentGuard";
import { DeviceAccessGate } from "./components/access/DeviceAccessGate";
import { AnalyticsConsentModal } from "./components/engagement/AnalyticsConsentModal";
import { MobileTabBar } from "./components/navigation/MobileTabBar";
import { useBreakpoint } from "./hooks/useBreakpoint";
import { useUrlSync } from "./hooks/useUrlSync";
import { AuthUser } from "./types";
import { Megaphone, X } from "lucide-react";
import { canOpen, homeView, isClassContent } from "./routing/viewRegistry";
import { parsePath } from "./routing/appRoutes";


/** Views and modals load on first use, so the sign-in screen and shell paint fast. */
const lazyNamed = <T extends Record<string, any>, K extends keyof T>(load: () => Promise<T>, name: K) =>
  React.lazy(() => load().then((m) => ({ default: m[name] as React.ComponentType<any> })));
const VideoStage = lazyNamed(() => import("./components/classroom/VideoStage"), "VideoStage");
const CollaborativeDock = lazyNamed(() => import("./components/classroom/CollaborativeDock"), "CollaborativeDock");
const DronacharyaAdminHub = lazyNamed(() => import("./components/admin/DronacharyaAdminHub"), "DronacharyaAdminHub");
const OfflineRepository = lazyNamed(() => import("./components/materials/OfflineRepository"), "OfflineRepository");
const ClassAnalytics = lazyNamed(() => import("./components/analytics/ClassAnalytics"), "ClassAnalytics");
const AttendanceView = lazyNamed(() => import("./components/attendance/AttendanceView"), "AttendanceView");
const BlockchainCertificates = lazyNamed(() => import("./components/credentials/BlockchainCertificates"), "BlockchainCertificates");
const SelfHostedPanel = lazyNamed(() => import("./components/system/SelfHostedPanel"), "SelfHostedPanel");
const ScheduleMeetingModal = lazyNamed(() => import("./components/modals/ScheduleMeetingModal"), "ScheduleMeetingModal");
const AnnouncementModal = lazyNamed(() => import("./components/modals/AnnouncementModal"), "AnnouncementModal");
const LlmNotebookStudio = lazyNamed(() => import("./components/notebook/LlmNotebookStudio"), "LlmNotebookStudio");
const RecordingsView = lazyNamed(() => import("./components/recordings/RecordingsView"), "RecordingsView");
const ParentHome = lazyNamed(() => import("./components/parent/ParentHome"), "ParentHome");
const MultiDeviceRemoteConsole = lazyNamed(() => import("./components/classroom/MultiDeviceRemoteConsole"), "MultiDeviceRemoteConsole");
const RoomBomberControlCenter = lazyNamed(() => import("./components/bomber/RoomBomberControlCenter"), "RoomBomberControlCenter");
const PitchBreakoutHUD = lazyNamed(() => import("./components/bomber/PitchBreakoutHUD"), "PitchBreakoutHUD");
const DocumentationModal = lazyNamed(() => import("./components/docs/DocumentationModal"), "DocumentationModal");
const CampusCommunityFeed = lazyNamed(() => import("./components/social/CampusCommunityFeed"), "CampusCommunityFeed");
const FacilitatorAssignmentDashboard = lazyNamed(() => import("./components/admin/FacilitatorAssignmentDashboard"), "FacilitatorAssignmentDashboard");
const CrmRoomIntegrationView = lazyNamed(() => import("./components/admin/CrmRoomIntegrationView"), "CrmRoomIntegrationView");
const RoomLinkManagerModal = lazyNamed(() => import("./components/links/RoomLinkManagerModal"), "RoomLinkManagerModal");
const SalesHub = lazyNamed(() => import("./components/sales/SalesHub"), "SalesHub");
const GamifiedWaitingLobby = lazyNamed(() => import("./components/classroom/GamifiedWaitingLobby"), "GamifiedWaitingLobby");
const RealtimeInterpreterModal = lazyNamed(() => import("./components/translation/RealtimeInterpreterModal"), "RealtimeInterpreterModal");
const DeviceAuditCenter = lazyNamed(() => import("./components/audit/DeviceAuditCenter"), "DeviceAuditCenter");
const SplitViewContainer = lazyNamed(() => import("./components/layout/SplitViewContainer"), "SplitViewContainer");
const ObserverPanel = lazyNamed(() => import("./components/classroom/ObserverPanel"), "ObserverPanel");

const ViewFallback: React.FC = () => (
  <div className="flex-1 flex items-center justify-center" role="status" aria-label="Loading">
    <span className="w-7 h-7 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
  </div>
);

const SIDEBAR_PREF_KEY = "21k_sidebar_collapsed";
const gateKey = (room: string, user: AuthUser) => `21k_gate_ok:${room}:${user.studentCode || user.id}`;

const MainLayout: React.FC = () => {
  const {
    activeView,
    setActiveView,
    activeBannerAnnouncement,
    dismissBannerAnnouncement,
    isDocsModalOpen,
    setIsDocsModalOpen,
    isInterpreterModalOpen,
    setIsInterpreterModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authenticatedUser,
    loginUser,
    isRoomBomberActive,
    activePitchRoom,
    currentRole,
    roomId,
    classStatus,
    enterClassroom,
    enteredBeforeStart,
    logoutUser,
    authLoading,
    authError,
    activeDockTab,
    setActiveDockTab,
    isScheduleModalOpen,
    isAnnouncementModalOpen,
  } = useClassroom();

  // Copy/print protection applies to pages that show class content (not to analytics or admin pages)
  const classContent = isClassContent(activeView);
  useContentGuard({
    enabled: Boolean(authenticatedUser) && classContent,
    roomSlug: roomId,
    view: activeView,
    allowScreenShare: ["instructor", "admin", "sales_rep"].includes(authenticatedUser?.role || ""),
  });

  useUrlSync({
    user: authenticatedUser,
    activeView,
    setActiveView,
    dockTab: activeDockTab,
    setDockTab: setActiveDockTab,
    roomId,
  });

  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "mobile";
  const [showPitchHud, setShowPitchHud] = React.useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);
  // Desktop remembers the user's choice; tablets default to the icon rail to keep content wide
  const [desktopCollapsed, setDesktopCollapsed] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_PREF_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [tabletExpanded, setTabletExpanded] = React.useState(false);
  const isSidebarCollapsed = breakpoint === "desktop" ? desktopCollapsed : !tabletExpanded;
  const toggleSidebar = React.useCallback(() => {
    if (breakpoint === "mobile") {
      setIsMobileNavOpen((o) => !o);
    } else if (breakpoint === "tablet") {
      setTabletExpanded((e) => !e);
    } else {
      setDesktopCollapsed((c) => {
        try {
          localStorage.setItem(SIDEBAR_PREF_KEY, c ? "0" : "1");
        } catch {}
        return !c;
      });
    }
  }, [breakpoint]);
  React.useEffect(() => {
    if (!isMobile) setIsMobileNavOpen(false);
  }, [isMobile]);
  const [isLinkModalOpen, setIsLinkModalOpen] = React.useState(false);

  // Student joins pass through the device gate before entering the room
  const [pendingJoin, setPendingJoin] = React.useState<{ user: AuthUser; roomId: string } | null>(null);
  // A learner restored from an existing session still passes the device check once per tab/room
  const [restoredGateCleared, setRestoredGateCleared] = React.useState(true);
  React.useEffect(() => {
    if (!authenticatedUser || authenticatedUser.role !== "student") return setRestoredGateCleared(true);
    try {
      setRestoredGateCleared(sessionStorage.getItem(gateKey(roomId, authenticatedUser)) === "1");
    } catch {
      setRestoredGateCleared(false);
    }
  }, [authenticatedUser?.id, roomId]);
  const handleJoin = React.useCallback(
    (user: AuthUser, targetRoomId: string) => {
      if (user.role === "student") setPendingJoin({ user, roomId: targetRoomId });
      else loginUser(user, targetRoomId);
    },
    [loginUser]
  );
  const markGateCleared = (room: string, user: AuthUser) => {
    try {
      sessionStorage.setItem(gateKey(room, user), "1");
    } catch {}
  };


  // After sign-in, people land on their role's home page, unless they opened a class link or a page URL
  const landed = React.useRef(false);
  // The address as first opened (the URL sync rewrites it before sign-in finishes)
  const openedUrl = React.useRef({ pathname: window.location.pathname, search: window.location.search });
  React.useEffect(() => {
    if (!authenticatedUser || landed.current) return;
    landed.current = true;
    const { pathname, search } = openedUrl.current;
    const openedSomething = Boolean(parsePath(pathname)) || /^\/(room|s)\//.test(pathname) || /[?&](room|roomId|join|meet|view|invite)=/.test(search);
    if (!openedSomething && activeView === "classroom") setActiveView(homeView(authenticatedUser.role) as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticatedUser]);

  // Pages a role can't open send them to their home page (one list for every role: viewRegistry)
  // Uses the signed-in user's role: `currentRole` catches up one render later and starts as "student"
  const signedInRole = authenticatedUser?.role;
  React.useEffect(() => {
    if (signedInRole && !canOpen(signedInRole, activeView)) setActiveView(homeView(signedInRole) as any);
  }, [signedInRole, activeView, setActiveView]);

  // Keyboard shortcut Cmd/Ctrl + B to toggle sidebar
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  if (pendingJoin) {
    return (
      <DeviceAccessGate
        user={pendingJoin.user}
        roomId={pendingJoin.roomId}
        onAllowed={() => {
          markGateCleared(pendingJoin.roomId, pendingJoin.user);
          setRestoredGateCleared(true);
          loginUser(pendingJoin.user, pendingJoin.roomId);
          setPendingJoin(null);
        }}
        onCancel={() => setPendingJoin(null)}
      />
    );
  }

  if (authLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-canvas" role="status" aria-label="Loading">
        <span className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
      </div>
    );
  }

  if (!authenticatedUser) {
    // Everyone signs in on the server (class links carry a signed invite); there is no client-side login
    return <SignInScreen error={authError} onSignedIn={(user) => handleJoin(user, roomId)} />;
  }

  // A student session restored from storage is re-checked once per tab
  if (authenticatedUser.role === "student" && !restoredGateCleared) {
    return (
      <DeviceAccessGate
        user={authenticatedUser}
        roomId={roomId}
        onAllowed={() => {
          markGateCleared(roomId, authenticatedUser);
          setRestoredGateCleared(true);
        }}
        onCancel={() => {
          setRestoredGateCleared(true);
          logoutUser();
        }}
      />
    );
  }

  const showMobileTabBar = isMobile && activeView !== "classroom";

  return (
    <div className="w-full max-w-full h-[100dvh] min-h-[100dvh] flex flex-col bg-canvas text-slate-100 overflow-hidden font-sans pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      {/* Top Bar Navigation (Deep Frosted Glassmorphism Theme) */}
      <TopBar onOpenMobileNav={isMobile ? () => setIsMobileNavOpen(true) : undefined} />

      {/* Global Live Flash Announcement Banner */}
      {activeBannerAnnouncement && (
        <div
          className={`min-h-9 py-1.5 px-3 sm:px-4 flex items-center justify-between gap-2 text-xs z-20 transition-all font-sans ${
            activeBannerAnnouncement.priority === "urgent"
              ? "bg-brand-coral text-white border-b border-brand-coral-strong"
              : activeBannerAnnouncement.priority === "info"
              ? "bg-brand-navy text-white border-b border-brand-navy-ink"
              : "bg-slate-800 text-white border-b border-slate-700"
          }`}
        >
          <div className="flex items-center gap-2 font-medium min-w-0">
            <Megaphone className="w-3.5 h-3.5 shrink-0 text-brand-yellow" />
            <span className="min-w-0 line-clamp-2 sm:line-clamp-1">
              <span className="font-bold uppercase tracking-wider text-2xs mr-1.5">{activeBannerAnnouncement.title}:</span>
              {activeBannerAnnouncement.message}
            </span>
          </div>

          <button
            onClick={dismissBannerAnnouncement}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            title="Dismiss announcement"
            aria-label="Dismiss announcement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Room Bomber 1:1 Breakout Pitch HUD Overlay */}
      {isRoomBomberActive && showPitchHud && (
        <React.Suspense fallback={null}>
          <PitchBreakoutHUD pitchRoom={activePitchRoom} onClose={() => setShowPitchHud(false)} />
        </React.Suspense>
      )}

      {/* Workspace Shell Container: Sidebar + Active Canvas Split */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Slack-style Collapsible Left Navigation Rail */}
        <SidebarNavigation
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          onOpenLinkModal={() => setIsLinkModalOpen(true)}
          isMobile={isMobile}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        {/* Main Content Area */}
        <main className={`${classContent ? "content-guarded " : ""}flex-1 min-w-0 flex flex-col overflow-hidden relative bg-canvas`}>
          {authenticatedUser.watermarkId && <ForensicWatermark id={authenticatedUser.watermarkId} />}
          <React.Suspense fallback={<ViewFallback />}>
          {activeView === "classroom" && (
            authenticatedUser?.role === "student" && classStatus === "waiting" && !enteredBeforeStart ? (
              <GamifiedWaitingLobby onEnterClassroom={enterClassroom} />
            ) : (
              <SplitViewContainer
                initialSplitRatio={authenticatedUser.role === "auditor" ? 60 : 65}
                leftContent={<VideoStage />}
                // Auditors observe: live numbers, engagement, transcript and their review instead of the teaching dock
                rightContent={authenticatedUser.role === "auditor" ? <ObserverPanel /> : <CollaborativeDock />}
              />
            )
          )}

          {activeView === "social" && <CampusCommunityFeed />}
          {activeView === "sales_hub" && <SalesHub />}
          {activeView === "device_audit" && <DeviceAuditCenter />}
          {activeView === "room_bomber" && <RoomBomberControlCenter />}
          {activeView === "facilitators" && <FacilitatorAssignmentDashboard />}
          {activeView === "crm" && <CrmRoomIntegrationView />}
          {activeView === "notebook" && <LlmNotebookStudio />}
          {activeView === "recordings" && <RecordingsView />}
          {activeView === "parent_home" && <ParentHome />}
          {activeView === "admin" && <DronacharyaAdminHub />}
          {activeView === "materials" && <OfflineRepository />}
          {activeView === "analytics" && <ClassAnalytics />}
          {activeView === "attendance" && <AttendanceView />}
          {activeView === "blockchain" && <BlockchainCertificates />}
          {activeView === "selfhosted" && <SelfHostedPanel />}
          {activeView === "remote_access" && <MultiDeviceRemoteConsole />}
          </React.Suspense>
        </main>
      </div>

      {showMobileTabBar && <MobileTabBar onOpenMore={() => setIsMobileNavOpen(true)} />}

      <IncomingAccessNotification />
      <AnalyticsConsentModal />

      {/* Modals load when first opened */}
      <React.Suspense fallback={null}>
        {isLinkModalOpen && <RoomLinkManagerModal isOpen onClose={() => setIsLinkModalOpen(false)} />}
        {isScheduleModalOpen && <ScheduleMeetingModal />}
        {isAnnouncementModalOpen && <AnnouncementModal />}
        {isDocsModalOpen && <DocumentationModal isOpen onClose={() => setIsDocsModalOpen(false)} />}
        {isInterpreterModalOpen && <RealtimeInterpreterModal isOpen onClose={() => setIsInterpreterModalOpen(false)} />}
      </React.Suspense>

    </div>
  );
};

const DownloadPage = lazyNamed(() => import("./components/access/DownloadPage"), "DownloadPage");

export default function App() {
  // Public page (no sign-in, no camera): the desktop app download
  if (typeof window !== "undefined" && window.location.pathname === "/download") {
    return (
      <React.Suspense
        fallback={
          <div className="fixed inset-0 flex items-center justify-center bg-canvas" role="status" aria-label="Loading">
            <span className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
          </div>
        }
      >
        <DownloadPage />
      </React.Suspense>
    );
  }
  return (
    <ClassroomProvider>
      <MainLayout />
    </ClassroomProvider>
  );
}
