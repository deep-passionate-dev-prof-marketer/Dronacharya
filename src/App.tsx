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
import { DeviceAuditCenter } from "./components/audit/DeviceAuditCenter";
import { Megaphone, X } from "lucide-react";

const MainLayout: React.FC = () => {
  const {
    activeView,
    setActiveView,
    activeBannerAnnouncement,
    dismissBannerAnnouncement,
    isDocsModalOpen,
    setIsDocsModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authenticatedUser,
    loginUser,
    isRoomBomberActive,
    activePitchRoom,
    currentRole,
    roomId,
  } = useClassroom();

  const [mobilePane, setMobilePane] = React.useState<"video" | "dock">("video");
  const [showPitchHud, setShowPitchHud] = React.useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );
  const [isLinkModalOpen, setIsLinkModalOpen] = React.useState(false);

  // Strict Role-Based View Protection and Auto-redirection
  React.useEffect(() => {
    const roleAllowedViews: Record<string, string[]> = {
      student: ["classroom", "social", "notebook", "materials", "blockchain"],
      instructor: ["classroom", "social", "notebook", "materials", "attendance", "analytics", "facilitators", "remote_access"],
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
        setIsSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!authenticatedUser) {
    return (
      <PreJoinLobbyModal
        onJoinSuccess={(user, targetRoomId) => loginUser(user, targetRoomId)}
      />
    );
  }

  return (
    <div className="w-full max-w-full h-[100dvh] min-h-[100dvh] flex flex-col bg-[#070b14] text-slate-100 overflow-hidden font-sans pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      {/* Top Bar Navigation (Deep Frosted Glassmorphism Theme) */}
      <TopBar
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Global Live Flash Announcement Banner */}
      {activeBannerAnnouncement && (
        <div
          className={`h-9 px-4 flex items-center justify-between text-xs z-40 transition-all font-sans ${
            activeBannerAnnouncement.priority === "urgent"
              ? "bg-[#FF7176] text-white border-b border-[#e65c61]"
              : activeBannerAnnouncement.priority === "info"
              ? "bg-[#003872] text-white border-b border-[#00264d]"
              : "bg-slate-800 text-white border-b border-slate-700"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <Megaphone className="w-3.5 h-3.5 animate-bounce shrink-0 text-[#FFBB00]" />
            <span className="font-bold uppercase tracking-wider text-[11px]">
              [{activeBannerAnnouncement.senderRole}] {activeBannerAnnouncement.title}:
            </span>
            <span className="truncate max-w-xl">{activeBannerAnnouncement.message}</span>
          </div>

          <button
            onClick={dismissBannerAnnouncement}
            className="p-1 rounded hover:opacity-80 transition-opacity ml-2 shrink-0"
            title="Dismiss Announcement"
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
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenLinkModal={() => setIsLinkModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-[#070b14]">
          {activeView === "classroom" && (
            <SplitViewContainer
              initialSplitRatio={65}
              leftContent={<VideoStage />}
              rightContent={<CollaborativeDock />}
            />
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

      {/* Standalone System Documentation Modal */}
      <DocumentationModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
      />

      {/* Dedicated Multi-Role Pre-Join Lobby Modal */}
      {isAuthModalOpen && (
        <PreJoinLobbyModal
          initialRole={currentRole}
          initialRoomId={roomId}
          onJoinSuccess={(user, targetRoomId) => {
            setIsAuthModalOpen(false);
            loginUser(user, targetRoomId);
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
