import React from "react";
import { ClassroomProvider, useClassroom } from "./context/ClassroomContext";
import { TopBar } from "./components/navigation/TopBar";
import { VideoStage } from "./components/classroom/VideoStage";
import { CollaborativeDock } from "./components/classroom/CollaborativeDock";
import { DronacharyaAdminHub } from "./components/admin/DronacharyaAdminHub";
import { OfflineRepository } from "./components/materials/OfflineRepository";
import { AnalyticsDashboard } from "./components/analytics/AnalyticsDashboard";
import { AttendanceMonitor } from "./components/attendance/AttendanceMonitor";
import { BlockchainCertificates } from "./components/credentials/BlockchainCertificates";
import { SelfHostedPanel } from "./components/system/SelfHostedPanel";
import { ScheduleMeetingModal } from "./components/modals/ScheduleMeetingModal";
import { AnnouncementModal } from "./components/modals/AnnouncementModal";
import { AiSummaryModal } from "./components/modals/AiSummaryModal";
import { LlmNotebookStudio } from "./components/notebook/LlmNotebookStudio";
import { MultiDeviceRemoteConsole } from "./components/classroom/MultiDeviceRemoteConsole";
import { IncomingAccessNotification } from "./components/classroom/IncomingAccessNotification";
import { RoomBomberControlCenter } from "./components/bomber/RoomBomberControlCenter";
import { PitchBreakoutHUD } from "./components/bomber/PitchBreakoutHUD";
import { DocumentationModal } from "./components/docs/DocumentationModal";
import { AuthPortalView } from "./components/auth/AuthPortalView";
import { PreJoinLobbyModal } from "./components/classroom/PreJoinLobbyModal";
import { CampusCommunityFeed } from "./components/social/CampusCommunityFeed";
import { FacilitatorAssignmentDashboard } from "./components/admin/FacilitatorAssignmentDashboard";
import { CrmRoomIntegrationView } from "./components/admin/CrmRoomIntegrationView";
import { SidebarNavigation } from "./components/navigation/SidebarNavigation";
import { SplitViewContainer } from "./components/layout/SplitViewContainer";
import { RoomLinkManagerModal } from "./components/links/RoomLinkManagerModal";
import { SalesHub } from "./components/sales/SalesHub";
import { DedicatedStudentLogin } from "./components/classroom/DedicatedStudentLogin";
import { GamifiedWaitingLobby } from "./components/classroom/GamifiedWaitingLobby";
import { RealtimeInterpreterModal } from "./components/translation/RealtimeInterpreterModal";
import { DeviceAuditCenter } from "./components/audit/DeviceAuditCenter";
import { DeviceAccessGate } from "./components/access/DeviceAccessGate";
import { AnalyticsConsentModal } from "./components/engagement/AnalyticsConsentModal";
import { MobileTabBar } from "./components/navigation/MobileTabBar";
import { useBreakpoint } from "./hooks/useBreakpoint";
import { useUrlSync } from "./hooks/useUrlSync";
import { AuthUser } from "./types";
import { Megaphone, X } from "lucide-react";

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
    startClass,
    logoutUser,
    activeDockTab,
    setActiveDockTab,
  } = useClassroom();

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
  const [restoredGateCleared, setRestoredGateCleared] = React.useState<boolean>(() => {
    if (!authenticatedUser || authenticatedUser.role !== "student") return true;
    try {
      return sessionStorage.getItem(gateKey(roomId, authenticatedUser)) === "1";
    } catch {
      return false;
    }
  });
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

  const isStudentPortal = React.useMemo(() => {
    if (typeof window === "undefined") return currentRole === "student";
    const params = new URLSearchParams(window.location.search);
    return params.get("role") === "student" || Boolean(params.get("sid")) || currentRole === "student";
  }, [currentRole]);

  // Strict Role-Based View Protection and Auto-redirection
  React.useEffect(() => {
    const roleAllowedViews: Record<string, string[]> = {
      student: ["classroom", "social", "notebook", "materials", "blockchain"],
      instructor: ["classroom", "social", "notebook", "materials", "attendance", "facilitators", "remote_access", "device_audit"],
      auditor: ["classroom", "analytics", "attendance", "device_audit", "blockchain"],
      sales_rep: ["sales_hub", "classroom", "room_bomber", "crm", "facilitators", "device_audit", "social"],
      admin: [
        "classroom", "sales_hub", "device_audit", "social", "room_bomber",
        "facilitators", "crm", "notebook", "admin", "materials",
        "analytics", "attendance", "blockchain", "selfhosted", "remote_access"
      ],
    };

    const allowed = roleAllowedViews[currentRole] || ["classroom"];
    if (!allowed.includes(activeView)) {
      // Auto redirect to primary role view
      const defaultView = currentRole === "sales_rep" ? "sales_hub" : "classroom";
      setActiveView(defaultView as any);
    }
  }, [currentRole, activeView, setActiveView]);

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

  if (!authenticatedUser) {
    if (isStudentPortal) {
      return <DedicatedStudentLogin initialRoomId={roomId} onJoinSuccess={handleJoin} />;
    }

    return <PreJoinLobbyModal initialRole={currentRole} initialRoomId={roomId} onJoinSuccess={handleJoin} />;
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
    <div className="w-full max-w-full h-[100dvh] min-h-[100dvh] flex flex-col bg-[#070b14] text-slate-100 overflow-hidden font-sans pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      {/* Top Bar Navigation (Deep Frosted Glassmorphism Theme) */}
      <TopBar onOpenMobileNav={isMobile ? () => setIsMobileNavOpen(true) : undefined} />

      {/* Global Live Flash Announcement Banner */}
      {activeBannerAnnouncement && (
        <div
          className={`min-h-9 py-1.5 px-3 sm:px-4 flex items-center justify-between gap-2 text-xs z-20 transition-all font-sans ${
            activeBannerAnnouncement.priority === "urgent"
              ? "bg-[#FF7176] text-white border-b border-[#e65c61]"
              : activeBannerAnnouncement.priority === "info"
              ? "bg-[#003872] text-white border-b border-[#00264d]"
              : "bg-slate-800 text-white border-b border-slate-700"
          }`}
        >
          <div className="flex items-center gap-2 font-medium min-w-0">
            <Megaphone className="w-3.5 h-3.5 shrink-0 text-[#FFBB00]" />
            <span className="min-w-0 line-clamp-2 sm:line-clamp-1">
              <span className="font-bold uppercase tracking-wider text-[11px] mr-1.5">{activeBannerAnnouncement.title}:</span>
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
        <PitchBreakoutHUD
          pitchRoom={activePitchRoom}
          onClose={() => setShowPitchHud(false)}
        />
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
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden relative bg-[#070b14]">
          {activeView === "classroom" && (
            authenticatedUser?.role === "student" && classStatus === "waiting" ? (
              <GamifiedWaitingLobby onEnterClassroom={() => startClass()} />
            ) : (
              <SplitViewContainer
                initialSplitRatio={65}
                leftContent={<VideoStage />}
                rightContent={<CollaborativeDock />}
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
          {activeView === "admin" && <DronacharyaAdminHub />}
          {activeView === "materials" && <OfflineRepository />}
          {activeView === "analytics" && <AnalyticsDashboard />}
          {activeView === "attendance" && <AttendanceMonitor />}
          {activeView === "blockchain" && <BlockchainCertificates />}
          {activeView === "selfhosted" && <SelfHostedPanel />}
          {activeView === "remote_access" && <MultiDeviceRemoteConsole />}
        </main>
      </div>

      {showMobileTabBar && <MobileTabBar onOpenMore={() => setIsMobileNavOpen(true)} />}

      {/* Global Room Link Manager Modal */}
      <RoomLinkManagerModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
      />

      {/* Global Modals & Real-time Prompts */}
      <ScheduleMeetingModal />
      <AnnouncementModal />
      <AiSummaryModal />
      <IncomingAccessNotification />
      <AnalyticsConsentModal />

      {/* Standalone System Documentation Modal */}
      <DocumentationModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
      />

      {/* Real-Time AI Live Interpreter & Translation Studio Modal */}
      <RealtimeInterpreterModal
        isOpen={isInterpreterModalOpen}
        onClose={() => setIsInterpreterModalOpen(false)}
      />

      {/* Dedicated Multi-Role Pre-Join Lobby Modal */}
      {isAuthModalOpen && (
        <PreJoinLobbyModal
          initialRole={currentRole}
          initialRoomId={roomId}
          onJoinSuccess={(user, targetRoomId) => {
            setIsAuthModalOpen(false);
            handleJoin(user, targetRoomId);
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ClassroomProvider>
      <MainLayout />
    </ClassroomProvider>
  );
}
