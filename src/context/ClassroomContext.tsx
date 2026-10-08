import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  UserRole,
  LanguageCode,
  RoomRatio,
  Participant,
  BreakoutRoom,
  TranscriptLine,
  LiveCaption,
  Poll,
  StudyMaterial,
  Badge,
  Announcement,
  WaitingParticipant,
  AutomationRule,
  TeacherProfile,
  GradeRoomConfig,
  StudentCohort,
  ExecutionLog,
  AttentionAudit,
  AudioQualityMetrics,
  QualityScoreProfile,
  ManualRubricParameters,
  GeneratedRoomFlow,
  RoomCategory,
  RoomSubCategory,
  RoomSubCategoryCode,
  MicroCategoryDimension,
  RoomBreakSession,
  RemoteAccessSession,
  DeviceType,
  RemoteAccessLevel,
  DirectChildFeedback,
  EscalationTicket,
  AuthUser,
  PitchRoomStatus,
  PitchStageNumber,
  DeviceAuditRecord,
  GridLayoutMode,
  TileAspectRatio,
} from "../types";
import { translateDualCaption } from "../services/geminiService";
import { getParticipantsForRatio, FULL_24_STUDENT_POOL } from "../services/participantPool";
import {
  INITIAL_ATTENTION_AUDITS,
  INITIAL_AUDIO_METRICS,
  INITIAL_QUALITY_PROFILES,
  INITIAL_GENERATED_ROOMS,
  buildStandardizedRoomLink,
} from "../services/auditAndRoomService";
import { INITIAL_REMOTE_SESSIONS, DEVICE_METADATA_MAP } from "../services/remoteAccessService";
import { realtimeSocket } from "../services/realtimeSocket";
import { realtimeSpeechEngine, SpeechCaptionEvent } from "../services/speechRecognitionService";
import { realtimeInterpreterService } from "../services/translation/realtimeInterpreterService";
import { TranslationEngine } from "../services/translation/translationEngine";
import { detectClientDeviceEnvironment, createDeviceAuditRecord } from "../services/deviceDetector";
import {
  NormalizedProductionMeeting,
  parseProductionMeetingLink,
  buildMeetingUrl,
  buildShortMeetingUrl,
} from "../services/domainService";
import { webRtcMeshService, RemotePeerInfo } from "../services/webRtcMeshService";

export type ClassroomView =
  | "classroom"
  | "social"
  | "sales_hub"
  | "room_bomber"
  | "links"
  | "facilitators"
  | "crm"
  | "notebook"
  | "admin"
  | "materials"
  | "analytics"
  | "attendance"
  | "blockchain"
  | "selfhosted"
  | "remote_access"
  | "device_audit"
  | "docs";

export interface ClassroomContextType {
  // Role & Identity
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentUser: Participant;
  activeView: ClassroomView;
  setActiveView: (view: ClassroomView) => void;

  // Session & Security
  roomId: string;
  roomTitle: string;
  setRoomId: (id: string) => void;
  setRoomTitle: (title: string) => void;
  roomLink: string;
  isE2eeSecured: boolean;
  encryptionFingerprint: string;
  latencyMs: number;
  streamingQuality: "1080p 60fps" | "720p 30fps" | "Low Bandwidth";
  setStreamingQuality: (q: "1080p 60fps" | "720p 30fps" | "Low Bandwidth") => void;
  roomRatio: RoomRatio;
  setRoomRatio: (ratio: RoomRatio) => void;

  // Real Production Meeting Joining & Auto-Resolution
  activeProductionMeeting: NormalizedProductionMeeting | null;
  joinProductionMeetingUrl: (urlOrCode: string) => NormalizedProductionMeeting;
  leaveProductionMeeting: () => void;

  // Media & Devices
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  remotePointer: { x: number; y: number; active: boolean; label: string };
  setRemotePointer: React.Dispatch<React.SetStateAction<{ x: number; y: number; active: boolean; label: string }>>;

  // Participants
  participants: Participant[];
  handRaised: boolean;
  toggleHandRaise: () => void;
  muteAllParticipants: () => void;
  removeParticipant: (id: string) => void;

  // Waiting Lobby
  waitingList: WaitingParticipant[];
  admitParticipant: (id: string) => void;
  rejectParticipant: (id: string) => void;
  admitAllWaiting: () => void;

  // Breakout Rooms
  breakoutRooms: BreakoutRoom[];
  createBreakoutRoom: (name: string, topic: string) => void;
  assignStudentToBreakout: (studentId: string, breakoutId: string | null) => void;
  broadcastToAllBreakouts: (message: string) => void;
  closeAllBreakouts: () => void;

  // Recording
  isRecording: boolean;
  recordingSeconds: number;
  startRecording: () => void;
  stopRecording: () => void;
  hasRecordedClip: boolean;
  downloadRecordedClip: () => void;

  // Collaborative Dock Tab
  activeDockTab: "whiteboard" | "stem3d" | "notes" | "smartnotes" | "polls" | "breakouts" | "transcript" | "lobby";
  setActiveDockTab: (tab: "whiteboard" | "stem3d" | "notes" | "smartnotes" | "polls" | "breakouts" | "transcript" | "lobby") => void;

  // Transcripts & i18n
  transcriptLines: TranscriptLine[];
  addTranscriptLine: (speaker: string, text: string) => void;
  activeLanguage: LanguageCode;
  setActiveLanguage: (lang: LanguageCode) => void;
  isTranslating: boolean;
  translateTranscripts: (lang: LanguageCode) => Promise<void>;

  // Real-time Subtitle Overlay on Video Stage (Dual Multilingual + Universal English)
  isLiveSubtitlesActive: boolean;
  toggleLiveSubtitles: () => void;
  subtitleLanguage: LanguageCode;
  setSubtitleLanguage: (lang: LanguageCode) => void;
  subtitleMode: "dual" | "target_only" | "english_only";
  setSubtitleMode: (mode: "dual" | "target_only" | "english_only") => void;
  currentLiveCaption: LiveCaption | null;
  pushLiveCaption: (speakerName: string, englishText: string, customTranslation?: string) => Promise<void>;
  isSpeechRecognitionActive: boolean;
  toggleSpeechRecognition: () => void;
  simulateNextClassroomUtterance: () => Promise<void>;
  isLiveSpeechStreaming: boolean;

  // Manual Grid & Stage Layout Customization
  layoutMode: GridLayoutMode;
  setLayoutMode: (mode: GridLayoutMode) => void;
  manualGridColumns: number;
  setManualGridColumns: (cols: number) => void;
  tileAspectRatio: TileAspectRatio;
  setTileAspectRatio: (ratio: TileAspectRatio) => void;
  pinnedParticipantId: string | null;
  setPinnedParticipantId: (id: string | null) => void;
  showSelfView: boolean;
  setShowSelfView: (show: boolean) => void;
  dockSplitRatio: number;
  setDockSplitRatio: (ratio: number) => void;

  deviceAuditLogs: DeviceAuditRecord[];
  latestDeviceAudit: DeviceAuditRecord | null;
  logDeviceAudit: (role?: UserRole, details?: string) => Promise<DeviceAuditRecord>;

  // Polls & Quizzes
  polls: Poll[];
  createPoll: (question: string, options: string[]) => void;
  votePoll: (pollId: string, optionId: string) => void;

  // Announcements
  announcements: Announcement[];
  sendAnnouncement: (title: string, message: string, priority: "urgent" | "info" | "normal") => void;
  activeBannerAnnouncement: Announcement | null;
  dismissBannerAnnouncement: () => void;

  // Attendance & Parent Alerts
  attendanceLogs: Array<{ id: string; studentName: string; status: "present" | "late" | "absent"; timestamp: string }>;
  emailAlertLogs: Array<{ id: string; studentName: string; parentEmail: string; message: string; sentAt: string }>;
  triggerParentAlert: (studentId: string) => void;

  // Offline Mode & Materials
  isOfflineMode: boolean;
  toggleOfflineMode: () => void;
  materials: StudyMaterial[];
  toggleMaterialDownload: (id: string) => void;

  // Gamification & Badges
  userXp: number;
  addXp: (amount: number) => void;
  badges: Badge[];

  // -------------------------------------------------------------
  // Dronacharya Operational & Automation State
  // -------------------------------------------------------------
  automationRules: AutomationRule[];
  toggleAutomationRule: (ruleId: string) => void;
  executeRule: (ruleId: string) => Promise<void>;
  addNewRule: (rule: AutomationRule) => void;
  teachers: TeacherProfile[];
  gradeRooms: GradeRoomConfig[];
  createGradeRoom: (grade: number, section: string, course: string, teacherId: string) => void;
  assignTeacherToRoom: (teacherId: string, roomCode: string) => void;
  triggerEmergencySubstitute: (targetRoomCode: string) => void;
  cohorts: StudentCohort[];
  executionLogs: ExecutionLog[];
  triggerGradeBatchCreation: (grade: number) => void;

  // Modals
  isScheduleModalOpen: boolean;
  setIsScheduleModalOpen: (open: boolean) => void;
  isAiSummaryModalOpen: boolean;
  setIsAiSummaryModalOpen: (open: boolean) => void;
  isAnnouncementModalOpen: boolean;
  setIsAnnouncementModalOpen: (open: boolean) => void;

  // -------------------------------------------------------------
  // Attention Tracking & Audio Quality Audit
  // -------------------------------------------------------------
  attentionAudits: Record<string, AttentionAudit>;
  audioMetrics: Record<string, AudioQualityMetrics>;
  qualityProfiles: Record<string, QualityScoreProfile>;
  updateManualRubricScore: (
    participantId: string,
    rubric: Partial<ManualRubricParameters>,
    notes?: string
  ) => void;
  isAuditDrawerOpen: boolean;
  setIsAuditDrawerOpen: (open: boolean) => void;
  selectedAuditParticipantId: string;
  setSelectedAuditParticipantId: (id: string) => void;

  // -------------------------------------------------------------
  // Zero-Toggle Live In-Room Student Management
  // -------------------------------------------------------------
  muteParticipant: (id: string) => void;
  unmuteParticipant: (id: string) => void;
  kickParticipant: (id: string, reason?: string) => void;
  reAdmitParticipant: (id: string) => void;
  kickedParticipants: Array<{ id: string; name: string; reason: string; kickedAt: string }>;
  markAttendanceQuick: (id: string, status: "present" | "late" | "absent") => void;
  shareChildFeedback: (feedback: Omit<DirectChildFeedback, "id" | "timestamp">) => void;
  childFeedbackLogs: DirectChildFeedback[];
  isFeedbackModalOpen: boolean;
  setIsFeedbackModalOpen: (open: boolean) => void;
  activeFeedbackTarget: Participant | null;
  setActiveFeedbackTarget: (p: Participant | null) => void;

  // -------------------------------------------------------------
  // Multi-Device Remote System Access Functionality
  // -------------------------------------------------------------
  remoteSessions: RemoteAccessSession[];
  activeRemoteSessionId: string | null;
  remoteAccessSession: RemoteAccessSession | null;
  setActiveRemoteSessionId: (id: string | null) => void;
  requestRemoteAccess: (studentId: string, deviceType?: DeviceType, accessLevel?: RemoteAccessLevel) => void;
  offerRemoteAccess: (targetTeacherId: string, deviceType: DeviceType, accessLevel: RemoteAccessLevel, deviceModel?: string) => void;
  respondRemoteAccess: (sessionId: string, accept: boolean, adjustedLevel?: RemoteAccessLevel) => void;
  updateSessionLevel: (sessionId: string, level: RemoteAccessLevel) => void;
  endRemoteAccess: (sessionId?: string) => void;
  updateRemoteCursor: (x: number, y: number, sessionId?: string) => void;
  addRemoteAnnotation: (point: { x: number; y: number; color: string; size: number }, sessionId?: string) => void;
  clearRemoteAnnotations: (sessionId?: string) => void;
  updateRemoteWorksheet: (text: string, sessionId?: string) => void;
  updateRemoteInteractiveContent: (patch: Partial<RemoteAccessSession["interactiveContent"]>, sessionId?: string) => void;
  executeRemoteTerminalCommand: (command: string, sessionId?: string) => void;
  toggleMuteRemoteInput: (sessionId?: string) => void;
  isRemoteAccessModalOpen: boolean;
  setIsRemoteAccessModalOpen: (open: boolean) => void;
  isOfferAccessModalOpen: boolean;
  setIsOfferAccessModalOpen: (open: boolean) => void;
  incomingAccessRequest: RemoteAccessSession | null;
  incomingAccessOffer: RemoteAccessSession | null;
  dismissIncomingPrompt: (sessionId: string) => void;

  // -------------------------------------------------------------
  // Room Hierarchy Flow Generator & Break Controls
  // -------------------------------------------------------------
  roomCategories: RoomCategory[];
  roomSubCategories: RoomSubCategory[];
  generatedRooms: GeneratedRoomFlow[];
  activeRoomFlow: GeneratedRoomFlow;
  createRoomFlow: (
    config: Omit<GeneratedRoomFlow, "id" | "roomCode" | "roomUrl" | "createdAt" | "activeStudentsCount">
  ) => GeneratedRoomFlow;
  switchActiveRoom: (roomId: string) => void;
  isRoomHierarchyModalOpen: boolean;
  setIsRoomHierarchyModalOpen: (open: boolean) => void;

  // -------------------------------------------------------------
  // Room Break System
  // -------------------------------------------------------------
  roomBreak: RoomBreakSession;
  startRoomBreak: (durationMinutes: number, reason?: string, activity?: string) => void;
  pauseRoomBreak: () => void;
  resumeRoomBreak: () => void;
  endRoomBreak: () => void;

  // -------------------------------------------------------------
  // Parent & Customer Experience (CX) Escalations
  // -------------------------------------------------------------
  escalationTickets: EscalationTicket[];
  askParentHelp: (studentId?: string, reason?: string) => void;
  askCxHelp: (reason?: string) => void;
  dismissEscalation: (ticketId: string) => void;
  activeEscalationToast: EscalationTicket | null;
  dismissEscalationToast: () => void;
  isParentHelpModalOpen: boolean;
  setIsParentHelpModalOpen: (open: boolean) => void;
  isCxHelpModalOpen: boolean;
  setIsCxHelpModalOpen: (open: boolean) => void;

  // -------------------------------------------------------------
  // Room Bomber 1:1 High-Conversion Sales Engine
  // -------------------------------------------------------------
  pitchRooms: PitchRoomStatus[];
  isRoomBomberActive: boolean;
  activePitchRoom: PitchRoomStatus | null;
  setActivePitchRoom: React.Dispatch<React.SetStateAction<PitchRoomStatus | null>>;
  triggerRoomBomber: (config?: any) => void;
  resetRoomBomber: () => void;
  updatePitchStage: (roomId: string, stage: PitchStageNumber, stageName: string, notes?: string) => void;
  applyPitchOffer: (roomId: string, discount: number, contractSigned: boolean) => void;

  // -------------------------------------------------------------
  // In-App Architecture Documentation Viewer
  // -------------------------------------------------------------
  isDocsModalOpen: boolean;
  setIsDocsModalOpen: (open: boolean) => void;

  // -------------------------------------------------------------
  // Real-Time AI Live Interpreter & Translation Studio Modal
  // -------------------------------------------------------------
  isInterpreterModalOpen: boolean;
  setIsInterpreterModalOpen: (open: boolean) => void;

  // -------------------------------------------------------------
  // Dedicated Multi-Role Authentication Sessions
  // -------------------------------------------------------------
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authenticatedUser: AuthUser | null;
  loginUser: (user: AuthUser, customRoomId?: string) => void;
  logoutUser: () => void;
}

const ClassroomContext = createContext<ClassroomContextType | undefined>(undefined);

const INITIAL_PARTICIPANTS: Participant[] = [];
const INITIAL_WAITING: WaitingParticipant[] = [];
const INITIAL_BREAKOUTS: BreakoutRoom[] = [];
const INITIAL_TRANSCRIPT: TranscriptLine[] = [];
const INITIAL_POLLS: Poll[] = [];

const INITIAL_MATERIALS: StudyMaterial[] = [
  {
    id: "mat-1",
    title: "Quantum State Vector Dynamics & Hamiltonian Operators",
    category: "Quantum Physics",
    format: "slides",
    size: "8.4 MB",
    downloadedOffline: true,
    updatedAt: "2 days ago",
    slidesCount: 28,
    content: "# 21K School: Quantum Dynamics\n\n- Hamiltonian matrix formulation\n- 2-qubit tensor products\n- Bell state generation via CNOT gate",
  },
  {
    id: "mat-2",
    title: "Linear Algebra Refresher: Eigenvalues & Hermitian Matrices",
    category: "Linear Algebra",
    format: "notes",
    size: "2.1 MB",
    downloadedOffline: true,
    updatedAt: "1 week ago",
    content: "Hermitian operators satisfy A = A^dagger. All eigenvalues are strictly real, forming the foundation of quantum observables.",
  },
  {
    id: "mat-3",
    title: "3D Molecular AR Lab Manual: Fullerene & Atomic Orbitals",
    category: "Laboratory Guide",
    format: "code",
    size: "14.2 MB",
    downloadedOffline: false,
    updatedAt: "Yesterday",
    content: "Step-by-step instructions for interacting with the 3D orbital mesh and calculating electron probability density surfaces.",
  },
  {
    id: "mat-4",
    title: "Applied Robotics: Kinematic Path Planning & PID Controllers",
    category: "Robotics",
    format: "pdf",
    size: "6.2 MB",
    downloadedOffline: false,
    updatedAt: "3 days ago",
    content: "Rotational kinematics, inverse Jacobian solvers, and closed-loop feedback in micro-actuators.",
  },
];

const INITIAL_TEACHERS: TeacherProfile[] = [
  {
    id: "tch-1",
    name: "Dr. Evelyn Vance",
    email: "e.vance@21k.school",
    subjects: ["Quantum Physics", "Advanced Physics", "Linear Algebra"],
    grades: [9, 10, 11, 12],
    status: "in_class",
    currentRoomId: "dronacharya-gr10-phy",
    weeklyHours: 18,
    maxHours: 25,
    rating: 4.95,
    avatarColor: "#003872",
  },
  {
    id: "tch-2",
    name: "Prof. Rajesh Sengupta",
    email: "r.sengupta@21k.school",
    subjects: ["Applied Robotics", "Computer Science", "Artificial Intelligence"],
    grades: [8, 9, 10, 11],
    status: "available",
    weeklyHours: 14,
    maxHours: 24,
    rating: 4.9,
    avatarColor: "#0082FF",
  },
  {
    id: "tch-3",
    name: "Dr. Ananya Iyer",
    email: "a.iyer@21k.school",
    subjects: ["Molecular Biology", "Bio-Sciences", "Genomics"],
    grades: [7, 8, 9, 10, 11, 12],
    status: "available",
    weeklyHours: 12,
    maxHours: 22,
    rating: 4.88,
    avatarColor: "#FF7176",
  },
  {
    id: "tch-4",
    name: "Kaelen Ray (Associate Facilitator)",
    email: "k.ray@21k.school",
    subjects: ["Mathematics", "Physics", "Robotics"],
    grades: [6, 7, 8, 9, 10],
    status: "available",
    weeklyHours: 8,
    maxHours: 20,
    rating: 4.82,
    avatarColor: "#FFBB00",
  },
];

const INITIAL_GRADE_ROOMS: GradeRoomConfig[] = [
  {
    id: "gr-10a",
    gradeLevel: 10,
    section: "A",
    courseName: "Advanced Quantum Mechanics & Physics",
    teacherId: "tch-1",
    teacherName: "Dr. Evelyn Vance",
    studentCount: 26,
    roomCode: "21k-gr10-secA-phy",
    scheduledTime: "09:00 AM UTC",
    status: "active",
  },
  {
    id: "gr-10b",
    gradeLevel: 10,
    section: "B",
    courseName: "Applied Robotics & Mechatronics",
    teacherId: "tch-2",
    teacherName: "Prof. Rajesh Sengupta",
    studentCount: 24,
    roomCode: "21k-gr10-secB-rob",
    scheduledTime: "10:30 AM UTC",
    status: "scheduled",
  },
  {
    id: "gr-11a",
    gradeLevel: 11,
    section: "A",
    courseName: "Computational Structural Biology",
    teacherId: "tch-3",
    teacherName: "Dr. Ananya Iyer",
    studentCount: 22,
    roomCode: "21k-gr11-secA-bio",
    scheduledTime: "11:00 AM UTC",
    status: "scheduled",
  },
];

const INITIAL_COHORTS: StudentCohort[] = [
  {
    id: "coh-10a",
    name: "Cohort 10-A (STEM Scholars)",
    gradeLevel: 10,
    section: "A",
    studentCount: 26,
    courseTracks: ["Quantum Physics", "Higher Mathematics"],
    primaryTeacher: "Dr. Evelyn Vance",
  },
  {
    id: "coh-10b",
    name: "Cohort 10-B (Robotics & AI)",
    gradeLevel: 10,
    section: "B",
    studentCount: 24,
    courseTracks: ["Robotics", "Computer Science"],
    primaryTeacher: "Prof. Rajesh Sengupta",
  },
  {
    id: "coh-11a",
    name: "Cohort 11-A (Bio-Sciences)",
    gradeLevel: 11,
    section: "A",
    studentCount: 22,
    courseTracks: ["Molecular Biology", "Bio-Informatics"],
    primaryTeacher: "Dr. Ananya Iyer",
  },
];

const INITIAL_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: "rule-1",
    name: "Grade-Wise Multi-Section Auto Room Provisioning",
    description: "Automatically creates encrypted, isolated WebRTC virtual rooms for Grades 6-12 sections A, B, and C at daily timetable dispatch.",
    category: "grade_room",
    trigger: {
      type: "schedule_time",
      label: "Daily Timetable Schedule (08:30 AM)",
      value: "08:30 AM",
    },
    condition: {
      field: "gradeLevel",
      operator: "in_list",
      value: "6,7,8,9,10,11,12",
    },
    actions: [
      {
        type: "create_grade_rooms",
        label: "Auto-Generate Grade Rooms with Roster Sync",
        params: { sections: ["A", "B", "C"], maxCapacity: 30, waitingRoomLocked: true },
      },
      {
        type: "assign_certified_teacher",
        label: "Assign Subject Teachers by Department Certification",
        params: { checkWorkloadLimit: true },
      },
    ],
    enabled: true,
    runCount: 42,
    lastRunAt: "Today, 08:30 AM",
  },
  {
    id: "rule-2",
    name: "Course-Wise Interactive Resource & Lab Auto-Binder",
    description: "When an advanced STEM or laboratory session initializes, automatically bind the 3D WebGL simulator and course slides to the classroom workstation dock.",
    category: "course_room",
    trigger: {
      type: "schedule_time",
      label: "10 mins prior to class start",
      value: "T-10m",
    },
    actions: [
      {
        type: "attach_study_deck",
        label: "Pre-load Course Syllabus & Lab Manual",
        params: { autoSyncToLearners: true },
      },
    ],
    enabled: true,
    runCount: 18,
    lastRunAt: "Today, 08:50 AM",
  },
  {
    id: "rule-3",
    name: "Emergency Substitute Teacher Failover Protocol",
    description: "If primary scheduled teacher fails to connect or heartbeat drops > 5 minutes after scheduled start, auto-failover host permissions to secondary certified Associate Teacher.",
    category: "substitute_failover",
    trigger: {
      type: "teacher_inactive",
      label: "Primary Host Inactive > 5 Minutes",
      value: "300s",
    },
    actions: [
      {
        type: "route_emergency_substitute",
        label: "Auto-Assign Available Department Substitute",
        params: { fallbackRole: "ta", broadcastStudentLobbyAlert: true },
      },
    ],
    enabled: true,
    runCount: 3,
    lastRunAt: "Yesterday, 02:15 PM",
  },
  {
    id: "rule-4",
    name: "Attendance Threshold & Automated Parent Compliance Alert",
    description: "When a learner registers 2 consecutive unexcused absences or live presence falls below 75%, auto-dispatch verified attendance alert email to registered parents.",
    category: "attendance_alert",
    trigger: {
      type: "student_absent_count",
      label: "Unexcused Absences >= 2",
      value: "2",
    },
    actions: [
      {
        type: "send_parent_compliance_email",
        label: "Send 21K School Formal Absence Alert to Parents",
        params: { includeMakeupLectureLinks: true, notifyCoordinator: true },
      },
    ],
    enabled: true,
    runCount: 12,
    lastRunAt: "Today, 09:15 AM",
  },
  {
    id: "rule-5",
    name: "Exam Proctoring & Security Lockdown Protocol",
    description: "When Examination Mode is triggered, automatically mute learner microphones, lock student-to-student chat, disable breakout rooms, and watermarked recording.",
    category: "exam_lock",
    trigger: {
      type: "exam_started",
      label: "Official Exam Period Commenced",
      value: "proctored_exam",
    },
    actions: [
      {
        type: "lockdown_exam_controls",
        label: "Enforce Single-View Proctored Lockdown",
        params: { disablePrivateChat: true, lockBreakouts: true, enforceWebcam: true },
      },
    ],
    enabled: true,
    runCount: 7,
    lastRunAt: "Oct 04, 11:00 AM",
  },
];

const INITIAL_EXECUTION_LOGS: ExecutionLog[] = [
  {
    id: "log-101",
    ruleId: "rule-1",
    ruleName: "Grade-Wise Multi-Section Auto Room Provisioning",
    triggerEvent: "Daily Timetable Schedule (08:30 AM)",
    actionTaken: "Provisioned 6 Grade Rooms (Grades 9 & 10 Sections A & B) with certified teachers assigned.",
    status: "success",
    timestamp: "08:30:02 AM",
    details: "Rooms created: 21k-gr10-secA-phy, 21k-gr10-secB-rob, 21k-gr9-secA-math. 50 learners mapped.",
  },
  {
    id: "log-102",
    ruleId: "rule-2",
    ruleName: "Course-Wise Interactive Resource & Lab Auto-Binder",
    triggerEvent: "Class scheduled: Quantum Mechanics Lab 04",
    actionTaken: "Pre-bound 3D Bloch Sphere AR model and Lecture Deck 08 to classroom dock.",
    status: "success",
    timestamp: "08:50:11 AM",
    details: "Attached mat-1 and 3D simulation module for Cohort 10-A.",
  },
  {
    id: "log-103",
    ruleId: "rule-4",
    ruleName: "Attendance Threshold & Automated Parent Compliance Alert",
    triggerEvent: "Learner Liam O'Connor flagged Absent in Grade 10-B",
    actionTaken: "Dispatched automated formal email to oconnor.guardian@21k.family with makeup links.",
    status: "warning",
    timestamp: "09:15:00 AM",
    details: "Attendance score: 68%. Email sent with subject '21K School Attendance Notice: Liam O'Connor'.",
  },
];

export const ClassroomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>("instructor");
  const [activeView, setActiveView] = useState<ClassroomView>("classroom");

  // Dedicated Multi-Role Auth Session (Persistent)
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem("21k_dronacharya_auth");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [isInterpreterModalOpen, setIsInterpreterModalOpen] = useState(false);

  // Room Bomber 1:1 High-Conversion Sales Breakout States
  const [pitchRooms, setPitchRooms] = useState<PitchRoomStatus[]>([]);
  const [isRoomBomberActive, setIsRoomBomberActive] = useState(false);
  const [activePitchRoom, setActivePitchRoom] = useState<PitchRoomStatus | null>(null);

  // Room parameters
  const [roomId, setRoomId] = useState("dronacharya-gr10-phy");
  const [roomTitle, setRoomTitle] = useState("Grade 10-A · Advanced Quantum Mechanics & Physics (Dronacharya)");
  const [roomLink, setRoomLink] = useState(() => buildMeetingUrl("dronacharya-gr10-phy"));
  const [activeProductionMeeting, setActiveProductionMeeting] = useState<NormalizedProductionMeeting | null>(null);
  const [isE2eeSecured] = useState(true);
  const [encryptionFingerprint] = useState("0x21K-Dronacharya · AES-256-GCM · ECDH Key Exchange");
  const [latencyMs, setLatencyMs] = useState(18);
  const [streamingQuality, setStreamingQuality] = useState<"1080p 60fps" | "720p 30fps" | "Low Bandwidth">("1080p 60fps");
  const [roomRatio, setRoomRatioState] = useState<RoomRatio>("1:4");

  // Media
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remotePointer, setRemotePointer] = useState<{ x: number; y: number; active: boolean; label: string }>({
    x: 0.5,
    y: 0.5,
    active: false,
    label: "Facilitator Laser Pointer",
  });

  // Participants & Breakouts
  const [participants, setParticipants] = useState<Participant[]>(INITIAL_PARTICIPANTS);
  const [handRaised, setHandRaised] = useState(false);
  const [waitingList, setWaitingList] = useState<WaitingParticipant[]>(INITIAL_WAITING);
  const [breakoutRooms, setBreakoutRooms] = useState<BreakoutRoom[]>(INITIAL_BREAKOUTS);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [hasRecordedClip, setHasRecordedClip] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordedBlobUrlRef = useRef<string | null>(null);

  // Dock
  const [activeDockTab, setActiveDockTab] = useState<"whiteboard" | "stem3d" | "notes" | "smartnotes" | "polls" | "breakouts" | "transcript" | "lobby">("whiteboard");

  // Transcripts & i18n
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>(INITIAL_TRANSCRIPT);
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>("en");
  const [isTranslating, setIsTranslating] = useState(false);

  // Real-Time Subtitles & Multilingual Translation State
  const [isLiveSubtitlesActive, setIsLiveSubtitlesActive] = useState(true);
  const [subtitleLanguage, setSubtitleLanguage] = useState<LanguageCode>("es");
  const [subtitleMode, setSubtitleMode] = useState<"dual" | "target_only" | "english_only">("dual");
  const [currentLiveCaption, setCurrentLiveCaption] = useState<LiveCaption | null>(null);
  const [isSpeechRecognitionActive, setIsSpeechRecognitionActive] = useState(true);
  const [isLiveSpeechStreaming, setIsLiveSpeechStreaming] = useState(true);
  const speechRecognitionInstanceRef = useRef<any>(null);

  // Manual Grid & Stage Layout Customization State
  const [layoutMode, setLayoutMode] = useState<GridLayoutMode>("auto");
  const [manualGridColumns, setManualGridColumns] = useState<number>(0); // 0 = auto
  const [tileAspectRatio, setTileAspectRatio] = useState<TileAspectRatio>("16:9");
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  const [showSelfView, setShowSelfView] = useState<boolean>(true);
  const [dockSplitRatio, setDockSplitRatio] = useState<number>(65);

  // Device Auto-Detection & Audit Telemetry State
  const [deviceAuditLogs, setDeviceAuditLogs] = useState<DeviceAuditRecord[]>(() => {
    try {
      if (typeof localStorage !== "undefined") {
        const stored = localStorage.getItem("21k_device_audit_history");
        if (stored) return JSON.parse(stored);
      }
    } catch {}
    return [];
  });
  const [latestDeviceAudit, setLatestDeviceAudit] = useState<DeviceAuditRecord | null>(() => {
    try {
      if (typeof localStorage !== "undefined") {
        const stored = localStorage.getItem("21k_latest_device_audit");
        if (stored) return JSON.parse(stored);
      }
    } catch {}
    return null;
  });

  const logDeviceAudit = async (role?: UserRole, details?: string): Promise<DeviceAuditRecord> => {
    const targetRole = role || currentRole;
    const userName = authenticatedUser ? authenticatedUser.name : "Participant";
    const userId = authenticatedUser ? authenticatedUser.id : "usr-1";

    const record = await createDeviceAuditRecord(userId, userName, targetRole, details);
    setLatestDeviceAudit(record);
    setDeviceAuditLogs((prev) => [record, ...prev.filter((r) => r.id !== record.id).slice(0, 49)]);

    try {
      realtimeSocket.sendDeviceAuditLog(record);
    } catch {}

    try {
      await fetch("/api/audit/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
    } catch {}

    return record;
  };

  // Auto-detect and record device audit on role/user check-in with ZERO questionnaire
  useEffect(() => {
    logDeviceAudit(currentRole, `Background flightdeck check-in telemetry audit for ${currentRole}`);
  }, [currentRole, authenticatedUser]);

  // Polls
  const [polls, setPolls] = useState<Poll[]>(INITIAL_POLLS);

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: "a-1",
      senderName: "Dr. Evelyn Vance",
      senderRole: "21K Lead Facilitator",
      title: "Breakout Laboratory Initiated",
      message: "Please open Breakout Lab 1 and engage with the 3D Bloch sphere module for 10 minutes.",
      timestamp: "09:10 AM",
      priority: "info",
    },
  ]);
  const [activeBannerAnnouncement, setActiveBannerAnnouncement] = useState<Announcement | null>(null);

  // Attendance & Parent Alerts
  const [attendanceLogs] = useState([
    { id: "log-1", studentName: "Sophia Chen", status: "present" as const, timestamp: "09:00:14 AM" },
    { id: "log-2", studentName: "Marcus Vance", status: "present" as const, timestamp: "09:01:45 AM" },
    { id: "log-3", studentName: "Aria Thorne", status: "late" as const, timestamp: "09:14:10 AM" },
    { id: "log-4", studentName: "Liam O'Connor", status: "absent" as const, timestamp: "Unrecorded" },
  ]);
  const [emailAlertLogs, setEmailAlertLogs] = useState([
    {
      id: "al-1",
      studentName: "Liam O'Connor",
      parentEmail: "oconnor.guardian@21k.family",
      message: "21K School Attendance Notice: Liam has not joined Grade 10-B Robotics.",
      sentAt: "09:15 AM",
    },
  ]);

  // Offline Mode & Materials
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [materials, setMaterials] = useState<StudyMaterial[]>(INITIAL_MATERIALS);

  // Gamification
  const [userXp, setUserXp] = useState(3450);
  const [badges] = useState<Badge[]>([
    {
      id: "b-1",
      title: "Quantum Pioneer",
      description: "Engaged in 3D AR lab simulation for over 15 minutes",
      icon: "Atom",
      unlocked: true,
      unlockedAt: "Today",
    },
    {
      id: "b-2",
      title: "Collaborative Scholar",
      description: "Shared 10+ annotations on the 21K School collaborative whiteboard",
      icon: "Edit3",
      unlocked: true,
      unlockedAt: "Yesterday",
    },
  ]);

  // -------------------------------------------------------------
  // Dronacharya Operational & Automation State
  // -------------------------------------------------------------
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(INITIAL_AUTOMATION_RULES);
  const [teachers, setTeachers] = useState<TeacherProfile[]>(INITIAL_TEACHERS);
  const [gradeRooms, setGradeRooms] = useState<GradeRoomConfig[]>(INITIAL_GRADE_ROOMS);
  const [cohorts, setCohorts] = useState<StudentCohort[]>(INITIAL_COHORTS);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>(INITIAL_EXECUTION_LOGS);

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isAiSummaryModalOpen, setIsAiSummaryModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  // Toggle automation rule enabled status
  const toggleAutomationRule = (ruleId: string) => {
    setAutomationRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  // Add a newly crafted automation rule
  const addNewRule = (rule: AutomationRule) => {
    setAutomationRules((prev) => [rule, ...prev]);
    const log: ExecutionLog = {
      id: `log-${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      triggerEvent: rule.trigger.label,
      actionTaken: `Registered new rule with ${rule.actions.length} action(s).`,
      status: "success",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      details: rule.description,
    };
    setExecutionLogs((prev) => [log, ...prev]);
  };

  // Execute rule manually / test dry-run
  const executeRule = async (ruleId: string) => {
    const targetRule = automationRules.find((r) => r.id === ruleId);
    if (!targetRule) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    // Simulate rule action execution
    if (targetRule.category === "grade_room") {
      triggerGradeBatchCreation(10);
    } else if (targetRule.category === "substitute_failover") {
      triggerEmergencySubstitute("21k-gr10-secA-phy");
    } else if (targetRule.category === "attendance_alert") {
      triggerParentAlert("stu-4");
    }

    const newLog: ExecutionLog = {
      id: `log-${Date.now()}`,
      ruleId: targetRule.id,
      ruleName: targetRule.name,
      triggerEvent: `Manual Dispatch / Test Execution (${targetRule.trigger.label})`,
      actionTaken: targetRule.actions.map((a) => a.label).join(" & "),
      status: "success",
      timestamp: timeStr,
      details: `Dispatched ${targetRule.actions.length} automated operations. All parameters verified against Dronacharya policies.`,
    };

    setExecutionLogs((prev) => [newLog, ...prev]);
    setAutomationRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? { ...r, lastRunAt: `Today, ${timeStr}`, runCount: r.runCount + 1 }
          : r
      )
    );
  };

  // Create grade room
  const createGradeRoom = (grade: number, section: string, course: string, teacherId: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    const newRoom: GradeRoomConfig = {
      id: `gr-${grade}${section.toLowerCase()}-${Date.now().toString().slice(-4)}`,
      gradeLevel: grade,
      section,
      courseName: course,
      teacherId,
      teacherName: teacher ? teacher.name : "Unassigned Facilitator",
      studentCount: 25,
      roomCode: `21k-gr${grade}-sec${section}-${course.toLowerCase().replace(/[^a-z]/g, "").slice(0, 3)}`,
      scheduledTime: "10:00 AM UTC",
      status: "scheduled",
    };

    setGradeRooms((prev) => [newRoom, ...prev]);

    const log: ExecutionLog = {
      id: `log-${Date.now()}`,
      ruleId: "manual-create",
      ruleName: "Dronacharya Grade Room Generator",
      triggerEvent: `Grade ${grade} Section ${section} Auto-Creation`,
      actionTaken: `Generated room ${newRoom.roomCode} assigned to ${newRoom.teacherName}`,
      status: "success",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      details: `Encrypted WebRTC room active at 21k.school/room/${newRoom.roomCode}`,
    };
    setExecutionLogs((prev) => [log, ...prev]);
  };

  // Trigger batch grade rooms creation
  const triggerGradeBatchCreation = (grade: number) => {
    const sections = ["A", "B", "C"];
    const subjects = ["Advanced Mathematics", "Applied Robotics", "World Literature"];
    const newRooms: GradeRoomConfig[] = sections.map((sec, idx) => {
      const assignedTeacher = teachers[idx % teachers.length];
      return {
        id: `gr-${grade}${sec.toLowerCase()}-${Date.now() + idx}`,
        gradeLevel: grade,
        section: sec,
        courseName: subjects[idx % subjects.length],
        teacherId: assignedTeacher.id,
        teacherName: assignedTeacher.name,
        studentCount: 28,
        roomCode: `21k-gr${grade}-sec${sec}-${subjects[idx].slice(0, 3).toLowerCase()}`,
        scheduledTime: "09:00 AM UTC",
        status: "scheduled",
      };
    });

    setGradeRooms((prev) => [...newRooms, ...prev]);
  };

  // Assign teacher
  const assignTeacherToRoom = (teacherId: string, roomCode: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return;
    setGradeRooms((prev) =>
      prev.map((r) =>
        r.roomCode === roomCode
          ? { ...r, teacherId: teacher.id, teacherName: teacher.name }
          : r
      )
    );
  };

  // Emergency substitute trigger
  const triggerEmergencySubstitute = (targetRoomCode: string) => {
    const substituteTeacher = teachers.find((t) => t.status === "available") || teachers[teachers.length - 1];
    setGradeRooms((prev) =>
      prev.map((r) =>
        r.roomCode === targetRoomCode
          ? { ...r, teacherId: substituteTeacher.id, teacherName: `${substituteTeacher.name} (Substitute)` }
          : r
      )
    );

    const newLog: ExecutionLog = {
      id: `log-${Date.now()}`,
      ruleId: "rule-3",
      ruleName: "Emergency Substitute Teacher Failover Protocol",
      triggerEvent: `Primary Facilitator Inactive in room ${targetRoomCode}`,
      actionTaken: `Transferred host credentials to ${substituteTeacher.name}. Student lobby notified.`,
      status: "warning",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      details: "Substitute failover executed in 1.2s. Coordinator audit ticket #SUB-9021 created.",
    };
    setExecutionLogs((prev) => [newLog, ...prev]);

    sendAnnouncement(
      "Facilitator Reassignment Alert",
      `${substituteTeacher.name} has been auto-assigned as your classroom facilitator. Class starting now.`,
      "urgent"
    );
  };

  // Local Camera / Mic Setup
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    async function initMedia() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: true,
          });
          activeStream = stream;
          setLocalStream(stream);
        }
      } catch (err) {
        console.info("Camera/Mic preview not active or permission dismissed.", err);
      }
    }
    initMedia();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // -------------------------------------------------------------
  // Real Full-Stack WebSocket & Room Bomber Synchronization
  // -------------------------------------------------------------
  useEffect(() => {
    const userPayload = authenticatedUser
      ? {
          id: authenticatedUser.id,
          name: authenticatedUser.name,
          role: authenticatedUser.role,
        }
      : {
          id: currentUser?.id || "guest-user-1",
          name: currentUser?.name || "Guest User",
          role: currentRole || "instructor",
        };

    realtimeSocket.connect(userPayload, roomId);

    const unbindGridSync = realtimeSocket.on("ROOM_BOMBER_GRID_SYNC", (data: any) => {
      setIsRoomBomberActive(!!data.active);
      if (data.pitchRooms) setPitchRooms(data.pitchRooms);
    });

    const unbindDispatch = realtimeSocket.on("ROOM_BOMBED_DISPATCH", (data: any) => {
      if (data.targetRoomId) {
        setRoomId(data.targetRoomId);
        setRoomTitle(data.roomName);
        if (data.pitchRoom) setActivePitchRoom(data.pitchRoom);
        setIsRoomBomberActive(true);
      }
    });

    const unbindReset = realtimeSocket.on("ROOM_BOMBER_RESET_NOTIFY", () => {
      setIsRoomBomberActive(false);
      setActivePitchRoom(null);
      setRoomId("dronacharya-gr10-phy");
      setRoomTitle("Grade 10-A · Advanced Quantum Mechanics & Physics (Dronacharya)");
    });

    const unbindStageSync = realtimeSocket.on("PITCH_STAGE_SYNC", (data: any) => {
      if (data.pitchRoom) {
        setPitchRooms((prev) =>
          prev.map((r) => (r.roomId === data.pitchRoom.roomId ? data.pitchRoom : r))
        );
        setActivePitchRoom((curr) => (curr?.roomId === data.pitchRoom.roomId ? data.pitchRoom : curr));
      }
    });

    const unbindOfferSync = realtimeSocket.on("PITCH_OFFER_SYNC", (data: any) => {
      if (data.pitchRoom) {
        setPitchRooms((prev) =>
          prev.map((r) => (r.roomId === data.pitchRoom.roomId ? data.pitchRoom : r))
        );
        setActivePitchRoom((curr) => (curr?.roomId === data.pitchRoom.roomId ? data.pitchRoom : curr));
      }
    });

    const unbindRemoteSession = realtimeSocket.on("REMOTE_SESSION_UPDATED", (data: any) => {
      if (data.session) {
        setRemoteSessions((prev) => {
          const exists = prev.some((s) => s.id === data.session.id);
          return exists ? prev.map((s) => (s.id === data.session.id ? data.session : s)) : [data.session, ...prev];
        });
      }
    });

    const unbindRemoteAnnot = realtimeSocket.on("REMOTE_ANNOTATION_ADDED", (data: any) => {
      if (data.sessionId && data.annotation) {
        setRemoteSessions((prev) =>
          prev.map((s) => (s.id === data.sessionId ? { ...s, annotations: [...s.annotations, data.annotation] } : s))
        );
      }
    });

    const unbindRemoteClearAnnot = realtimeSocket.on("REMOTE_ANNOTATIONS_CLEARED", (data: any) => {
      if (data.sessionId) {
        setRemoteSessions((prev) =>
          prev.map((s) => (s.id === data.sessionId ? { ...s, annotations: [] } : s))
        );
      }
    });

    const unbindWorksheet = realtimeSocket.on("REMOTE_WORKSHEET_SYNC", (data: any) => {
      if (data.sessionId && data.fieldId) {
        setRemoteSessions((prev) =>
          prev.map((s) => {
            if (s.id !== data.sessionId) return s;
            return {
              ...s,
              interactiveContent: {
                ...s.interactiveContent,
                worksheetAnswers: {
                  ...s.interactiveContent.worksheetAnswers,
                  [data.fieldId]: data.value,
                },
              },
            };
          })
        );
      }
    });

    const unbindTerminal = realtimeSocket.on("TERMINAL_LOG_SYNC", (data: any) => {
      if (data.sessionId && data.logs) {
        setRemoteSessions((prev) =>
          prev.map((s) => {
            if (s.id !== data.sessionId) return s;
            return {
              ...s,
              interactiveContent: {
                ...s.interactiveContent,
                terminalLogs: data.logs,
              },
            };
          })
        );
      }
    });

    const unbindSpeechCaption = realtimeSocket.on("SPEECH_CAPTION_BROADCAST", (data: any) => {
      const caption = data.caption;
      if (caption) {
        setCurrentLiveCaption({
          speakerName: caption.speaker,
          englishText: caption.text,
          translatedText: caption.translatedText || caption.text,
          targetLanguage: caption.targetLanguage,
          timestamp: caption.timestamp,
        });

        if (caption.isFinal) {
          const newLine: TranscriptLine = {
            id: caption.id || `t-${Date.now()}`,
            speakerId: "remote-peer",
            speakerName: caption.speaker,
            timestamp: caption.timestamp,
            text: caption.text,
            translatedText: caption.translatedText,
            language: caption.targetLanguage,
          };

          setTranscriptLines((prev) => {
            if (prev.some((l) => l.id === newLine.id || (l.text === newLine.text && l.timestamp === newLine.timestamp))) {
              return prev;
            }
            return [...prev, newLine];
          });
        }
      }
    });

    const unbindDeviceAudit = realtimeSocket.on("DEVICE_AUDIT_LOG_BROADCAST", (data: any) => {
      const record = data.record;
      if (record) {
        setDeviceAuditLogs((prev) => {
          if (prev.some((r) => r.id === record.id)) return prev;
          return [record, ...prev];
        });
      }
    });

    // Fetch initial status of Room Bomber from REST
    fetch("/api/room-bomber/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.pitchRooms && d.pitchRooms.length > 0) setPitchRooms(d.pitchRooms);
        if (d.active !== undefined) setIsRoomBomberActive(d.active);
      })
      .catch(() => {});

    return () => {
      unbindGridSync();
      unbindDispatch();
      unbindReset();
      unbindStageSync();
      unbindOfferSync();
      unbindRemoteSession();
      unbindRemoteAnnot();
      unbindRemoteClearAnnot();
      unbindWorksheet();
      unbindTerminal();
      unbindSpeechCaption();
      unbindDeviceAudit();
    };
  }, [authenticatedUser, currentRole, roomId]);

  const triggerRoomBomber = (config?: any) => {
    realtimeSocket.triggerRoomBomber(config);
    setIsRoomBomberActive(true);
    fetch("/api/room-bomber/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.pitchRooms) setPitchRooms(d.pitchRooms);
      })
      .catch(() => {});
  };

  const resetRoomBomber = () => {
    realtimeSocket.resetRoomBomber();
    setIsRoomBomberActive(false);
    setActivePitchRoom(null);
  };

  const updatePitchStage = (roomIdTarget: string, stage: PitchStageNumber, stageName: string, notes?: string) => {
    realtimeSocket.updatePitchStage(roomIdTarget, stage, stageName, notes);
    setPitchRooms((prev) =>
      prev.map((r) => (r.roomId === roomIdTarget ? { ...r, currentStage: stage, stageName: stageName as any, notes: notes || r.notes } : r))
    );
  };

  const applyPitchOffer = (roomIdTarget: string, discount: number, contractSigned: boolean) => {
    realtimeSocket.applyPitchOffer(roomIdTarget, discount, contractSigned);
    setPitchRooms((prev) =>
      prev.map((r) =>
        r.roomId === roomIdTarget
          ? {
              ...r,
              scholarshipGrantedPercent: discount,
              discountedTuition: Math.round(r.tuitionTotal * (1 - discount / 100)),
              contractStatus: contractSigned ? "signed" : r.contractStatus,
            }
          : r
      )
    );
  };

  const loginUser = (user: AuthUser, customRoomId?: string) => {
    setAuthenticatedUser(user);
    setCurrentRole(user.role);
    const targetRoom = customRoomId || roomId;
    if (customRoomId) {
      setRoomId(customRoomId);
      setRoomLink(buildMeetingUrl(customRoomId));
    }
    try {
      localStorage.setItem("21k_dronacharya_auth", JSON.stringify(user));
    } catch {}
    setIsAuthModalOpen(false);

    const localParticipant: Participant = {
      id: user.id,
      name: user.name,
      role: user.role,
      avatarColor: user.avatarColor || (user.role === "instructor" ? "#003872" : "#0082FF"),
      isLocal: true,
      audioEnabled: !isAudioMuted,
      videoEnabled: !isVideoOff,
      screenSharing: isScreenSharing,
      handRaised: false,
      breakoutRoomId: null,
      audioLevel: 80,
      attendanceStatus: "present",
      joinedAt: "Just now",
      xpPoints: 120,
      gradeLevel: user.gradeLevel,
      section: user.section,
      stream: localStream || undefined,
    };
    setParticipants((prev) => {
      const rest = prev.filter((p) => p.id !== user.id && p.isLocal);
      const others = prev.filter((p) => !p.isLocal);
      return [localParticipant, ...others];
    });

    // In-house WebRTC mesh connect
    webRtcMeshService.joinRoom(targetRoom, localParticipant, localStream || undefined);
    realtimeSocket.joinRoom(user, targetRoom);
  };

  const logoutUser = () => {
    webRtcMeshService.leaveRoom();
    setAuthenticatedUser(null);
    try {
      localStorage.removeItem("21k_dronacharya_auth");
    } catch {}
    setParticipants([]);
    setIsAuthModalOpen(true);
  };

  // WebRTC Mesh Remote Streams Subscription
  useEffect(() => {
    const unbindPeer = webRtcMeshService.onPeerStream((peerInfo: RemotePeerInfo) => {
      setParticipants((prev) => {
        const existingIdx = prev.findIndex((p) => p.id === peerInfo.peerId);
        const remoteParticipant: Participant = {
          id: peerInfo.peerId,
          name: peerInfo.name,
          role: peerInfo.role,
          avatarColor: peerInfo.avatarColor,
          isLocal: false,
          audioEnabled: !peerInfo.isAudioMuted,
          videoEnabled: !peerInfo.isVideoOff,
          screenSharing: false,
          handRaised: false,
          breakoutRoomId: null,
          audioLevel: peerInfo.audioLevel || 50,
          attendanceStatus: "present",
          joinedAt: "Just now",
          xpPoints: 100,
          stream: peerInfo.stream,
        };
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = remoteParticipant;
          return updated;
        }
        return [...prev, remoteParticipant];
      });
    });

    const unbindLeft = webRtcMeshService.onPeerLeft((peerId: string) => {
      setParticipants((prev) => prev.filter((p) => p.id !== peerId));
    });

    return () => {
      unbindPeer();
      unbindLeft();
    };
  }, []);

  // Keep authenticated user updated in participants list when media state changes
  useEffect(() => {
    if (authenticatedUser) {
      setParticipants((prev) => {
        const existingIdx = prev.findIndex((p) => p.id === authenticatedUser.id);
        const localParticipant: Participant = {
          id: authenticatedUser.id,
          name: authenticatedUser.name,
          role: authenticatedUser.role,
          avatarColor: authenticatedUser.avatarColor || (authenticatedUser.role === "instructor" ? "#003872" : "#0082FF"),
          isLocal: true,
          audioEnabled: !isAudioMuted,
          videoEnabled: !isVideoOff,
          screenSharing: isScreenSharing,
          handRaised: handRaised,
          breakoutRoomId: null,
          audioLevel: 80,
          attendanceStatus: "present",
          joinedAt: "Just now",
          xpPoints: 120,
          gradeLevel: authenticatedUser.gradeLevel,
          section: authenticatedUser.section,
          stream: localStream || undefined,
        };
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], ...localParticipant };
          return updated;
        }
        return [localParticipant, ...prev];
      });
    }
  }, [authenticatedUser, isAudioMuted, isVideoOff, isScreenSharing, handRaised, localStream]);

  // Sync local stream with WebRTC mesh
  useEffect(() => {
    if (localStream) {
      webRtcMeshService.setLocalStream(localStream);
    }
  }, [localStream]);

  const toggleAudio = () => {
    setIsAudioMuted((prev) => {
      const next = !prev;
      if (localStream) {
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      webRtcMeshService.updateMediaState(next, isVideoOff);
      return next;
    });
  };

  const toggleVideo = () => {
    setIsVideoOff((prev) => {
      const next = !prev;
      if (localStream) {
        localStream.getVideoTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      webRtcMeshService.updateMediaState(isAudioMuted, next);
      return next;
    });
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(display);
        setIsScreenSharing(true);
        display.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
        };
      } else {
        setIsScreenSharing(true);
      }
    } catch {
      setIsScreenSharing(true);
    }
  };

  const toggleHandRaise = () => {
    setHandRaised((prev) => !prev);
  };

  const muteAllParticipants = () => {
    setParticipants((prev) =>
      prev.map((p) => (p.isLocal ? p : { ...p, audioEnabled: false, audioLevel: 0 }))
    );
  };

  const removeParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const admitParticipant = (id: string) => {
    const target = waitingList.find((w) => w.id === id);
    if (!target) return;
    setWaitingList((prev) => prev.filter((w) => w.id !== id));
    setParticipants((prev) => [
      ...prev,
      {
        id: target.id,
        name: target.name,
        role: target.role,
        avatarColor: "#00C2E0",
        audioEnabled: target.micReady,
        videoEnabled: target.cameraReady,
        screenSharing: false,
        handRaised: false,
        audioLevel: 10,
        attendanceStatus: "present",
        joinedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        parentEmail: `${target.name.toLowerCase().replace(" ", ".")}@21k.family`,
        xpPoints: 1200,
      },
    ]);
  };

  const rejectParticipant = (id: string) => {
    setWaitingList((prev) => prev.filter((w) => w.id !== id));
  };

  const admitAllWaiting = () => {
    waitingList.forEach((w) => admitParticipant(w.id));
  };

  const createBreakoutRoom = (name: string, topic: string) => {
    const newRoom: BreakoutRoom = {
      id: `bo-${Date.now()}`,
      name,
      topic,
      participantIds: [],
      isActive: true,
    };
    setBreakoutRooms((prev) => [...prev, newRoom]);
  };

  const assignStudentToBreakout = (studentId: string, breakoutId: string | null) => {
    setBreakoutRooms((prev) =>
      prev.map((room) => {
        const filtered = room.participantIds.filter((id) => id !== studentId);
        if (room.id === breakoutId) {
          return { ...room, participantIds: [...filtered, studentId] };
        }
        return { ...room, participantIds: filtered };
      })
    );
    setParticipants((prev) =>
      prev.map((p) => (p.id === studentId ? { ...p, breakoutRoomId: breakoutId } : p))
    );
  };

  const broadcastToAllBreakouts = (message: string) => {
    sendAnnouncement("Facilitator Broadcast to All Breakouts", message, "urgent");
  };

  const closeAllBreakouts = () => {
    setBreakoutRooms((prev) => prev.map((r) => ({ ...r, isActive: false, participantIds: [] })));
    setParticipants((prev) => prev.map((p) => ({ ...p, breakoutRoomId: null })));
  };

  // Recording
  const startRecording = () => {
    recordedChunksRef.current = [];
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#003872";
        ctx.fillRect(0, 0, 1280, 720);
      }
      const streamToRecord = localStream || canvas.captureStream(30);

      const recorder = new MediaRecorder(streamToRecord, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        if (recordedBlobUrlRef.current) {
          URL.revokeObjectURL(recordedBlobUrlRef.current);
        }
        recordedBlobUrlRef.current = URL.createObjectURL(blob);
        setHasRecordedClip(true);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setIsRecording(true);
      setTimeout(() => setHasRecordedClip(true), 2000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setHasRecordedClip(true);
  };

  const downloadRecordedClip = () => {
    if (recordedBlobUrlRef.current) {
      const a = document.createElement("a");
      a.href = recordedBlobUrlRef.current;
      a.download = `21k-dronacharya-lecture-${roomId}-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Wire up RealtimeSpeechRecognitionEngine subscription and auto-start
  useEffect(() => {
    realtimeSpeechEngine.setTargetLanguage(subtitleLanguage);

    const unsubscribe = realtimeSpeechEngine.subscribe((event: SpeechCaptionEvent) => {
      // 1. Immediately update live caption (both interim typing and final)
      setCurrentLiveCaption({
        speakerName: event.speaker,
        englishText: event.text,
        translatedText: event.translatedText || event.text,
        targetLanguage: event.targetLanguage,
        timestamp: event.timestamp,
      });

      // 2. If utterance is final, append to transcriptLines and broadcast
      if (event.isFinal) {
        const newLine: TranscriptLine = {
          id: event.id || `t-${Date.now()}`,
          speakerId: event.speaker.includes("Vance") ? "host-1" : "stu-user",
          speakerName: event.speaker,
          timestamp: event.timestamp,
          text: event.text,
          translatedText: event.translatedText,
          language: event.targetLanguage,
        };

        setTranscriptLines((prev) => {
          if (prev.some((l) => l.id === newLine.id || (l.text === newLine.text && l.timestamp === newLine.timestamp))) {
            return prev;
          }
          return [...prev, newLine];
        });

        // Broadcast to other room participants over WebSocket
        try {
          realtimeSocket.sendSpeechCaption(event, roomId);
        } catch {}
      }
    });

    const unsubscribeInterpreter = realtimeInterpreterService.subscribeChunks((chunk) => {
      setCurrentLiveCaption({
        speakerName: chunk.speakerName,
        englishText: chunk.sourceText,
        translatedText: chunk.translatedText,
        targetLanguage: chunk.targetLanguage as any,
        timestamp: chunk.timestamp,
      });

      if (chunk.isFinal) {
        const newLine: TranscriptLine = {
          id: chunk.id || `t-${Date.now()}`,
          speakerId: chunk.speakerId || "stu-user",
          speakerName: chunk.speakerName,
          timestamp: chunk.timestamp,
          text: chunk.sourceText,
          translatedText: chunk.translatedText,
          language: chunk.targetLanguage,
        };

        setTranscriptLines((prev) => {
          if (prev.some((l) => l.id === newLine.id || (l.text === newLine.text && l.timestamp === newLine.timestamp))) {
            return prev;
          }
          return [...prev, newLine];
        });
      }
    });

    return () => {
      unsubscribe();
      unsubscribeInterpreter();
    };
  }, [roomId, subtitleLanguage]);

  // Synchronize subtitle engine listening state
  useEffect(() => {
    if (isLiveSubtitlesActive) {
      const activeSpeaker = authenticatedUser ? authenticatedUser.name : "Participant";
      realtimeSpeechEngine.startListening(activeSpeaker);
      realtimeInterpreterService.startListening(activeSpeaker);
      setIsSpeechRecognitionActive(true);
      setIsLiveSpeechStreaming(true);
    } else {
      realtimeSpeechEngine.stopListening();
      realtimeInterpreterService.stopListening();
      setIsSpeechRecognitionActive(false);
      setIsLiveSpeechStreaming(false);
    }
  }, [isLiveSubtitlesActive, currentRole]);

  const addTranscriptLine = (speaker: string, text: string) => {
    realtimeSpeechEngine.injectSpeech(speaker, text);
  };

  const translateTranscripts = async (targetLang: LanguageCode) => {
    setIsTranslating(true);
    try {
      setActiveLanguage(targetLang);
      setSubtitleLanguage(targetLang);
      realtimeSpeechEngine.setTargetLanguage(targetLang);

      if (targetLang === "en") {
        setTranscriptLines((prev) =>
          prev.map((line) => ({
            ...line,
            translatedText: undefined,
          }))
        );
        return;
      }

      // Concurrently translate each line using real translation API
      const updatedLines = await Promise.all(
        transcriptLines.map(async (line) => {
          try {
            const res = await translateDualCaption(line.text, targetLang, line.speakerName);
            return {
              ...line,
              translatedText: res.translatedText,
            };
          } catch {
            return line;
          }
        })
      );

      setTranscriptLines(updatedLines);

      // Also update current live caption to match the target language
      if (currentLiveCaption && currentLiveCaption.englishText) {
        translateDualCaption(currentLiveCaption.englishText, targetLang, currentLiveCaption.speakerName)
          .then((res) => {
            setCurrentLiveCaption((prev) =>
              prev ? { ...prev, translatedText: res.translatedText, targetLanguage: targetLang } : null
            );
          })
          .catch(() => {});
      }
    } finally {
      setIsTranslating(false);
    }
  };

  // Real-Time Subtitles & Multilingual Translation Functions
  const toggleLiveSubtitles = () => {
    setIsLiveSubtitlesActive((prev) => !prev);
  };

  const pushLiveCaption = async (speakerName: string, englishText: string, customTranslation?: string) => {
    await realtimeSpeechEngine.injectSpeech(speakerName, englishText, customTranslation);
  };

  // Re-translate current caption when subtitleLanguage changes
  useEffect(() => {
    if (currentLiveCaption && currentLiveCaption.englishText) {
      translateDualCaption(currentLiveCaption.englishText, subtitleLanguage, currentLiveCaption.speakerName)
        .then((res) => {
          setCurrentLiveCaption((prev) =>
            prev ? { ...prev, translatedText: res.translatedText, targetLanguage: subtitleLanguage } : null
          );
        })
        .catch(() => {});
    }
  }, [subtitleLanguage]);

  const simulateNextClassroomUtterance = async () => {
    const speaker = authenticatedUser ? authenticatedUser.name : "Active Speaker";
    await realtimeSpeechEngine.injectSpeech(speaker, "Hello, welcome to class! Real-time captions and transcripts are active.");
  };

  const toggleSpeechRecognition = () => {
    if (isSpeechRecognitionActive) {
      realtimeSpeechEngine.stopListening();
      setIsSpeechRecognitionActive(false);
      setIsLiveSpeechStreaming(false);
    } else {
      const activeSpeaker = authenticatedUser ? authenticatedUser.name : "Active Participant";
      realtimeSpeechEngine.startListening(activeSpeaker);
      setIsSpeechRecognitionActive(true);
      setIsLiveSpeechStreaming(true);
    }
  };

  const createPoll = (question: string, optionsText: string[]) => {
    const newPoll: Poll = {
      id: `p-${Date.now()}`,
      question,
      options: optionsText.map((t, idx) => ({ id: `opt-${idx}`, text: t, votes: 0 })),
      active: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      totalVotes: 0,
    };
    setPolls((prev) => [newPoll, ...prev]);
  };

  const votePoll = (pollId: string, optionId: string) => {
    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id !== pollId) return poll;
        const updatedOptions = poll.options.map((opt) =>
          opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
        );
        return {
          ...poll,
          options: updatedOptions,
          totalVotes: poll.totalVotes + 1,
          userVotedOptionId: optionId,
        };
      })
    );
    setUserXp((xp) => xp + 50);
  };

  const sendAnnouncement = (
    title: string,
    message: string,
    priority: "urgent" | "info" | "normal"
  ) => {
    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      senderName: currentRole === "instructor" ? "Dr. Evelyn Vance" : "21K School Administrator",
      senderRole: currentRole === "instructor" ? "Lead Facilitator" : "Dronacharya Operations",
      title,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      priority,
    };
    setAnnouncements((prev) => [newAnn, ...prev]);
    setActiveBannerAnnouncement(newAnn);
  };

  const dismissBannerAnnouncement = () => {
    setActiveBannerAnnouncement(null);
  };

  const triggerParentAlert = (studentId: string) => {
    const student = participants.find((p) => p.id === studentId);
    if (!student) return;
    const newLog = {
      id: `al-${Date.now()}`,
      studentName: student.name,
      parentEmail: student.parentEmail || "guardian@21k.family",
      message: `21K School Attendance & Academic Compliance Alert: ${student.name} was recorded as ${student.attendanceStatus.toUpperCase()} in ${roomTitle}.`,
      sentAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setEmailAlertLogs((prev) => [newLog, ...prev]);
  };

  const toggleOfflineMode = () => {
    setIsOfflineMode((prev) => !prev);
  };

  const toggleMaterialDownload = (id: string) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, downloadedOffline: !m.downloadedOffline } : m))
    );
  };

  const addXp = (amount: number) => {
    setUserXp((prev) => prev + amount);
  };

  // -------------------------------------------------------------
  // Attention Tracking & Audio Quality Audit
  // -------------------------------------------------------------
  const [attentionAudits, setAttentionAudits] = useState<Record<string, AttentionAudit>>(INITIAL_ATTENTION_AUDITS);
  const [audioMetrics, setAudioMetrics] = useState<Record<string, AudioQualityMetrics>>(INITIAL_AUDIO_METRICS);
  const [qualityProfiles, setQualityProfiles] = useState<Record<string, QualityScoreProfile>>(INITIAL_QUALITY_PROFILES);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [selectedAuditParticipantId, setSelectedAuditParticipantId] = useState("host-1");

  // Subtle real-time drift loop for facial attention & audio quality metrics
  useEffect(() => {
    const timer = setInterval(() => {
      setAttentionAudits((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((id) => {
          const item = next[id];
          const gazeOptions: Array<"center" | "screen-left" | "screen-right" | "down"> = [
            "center",
            "center",
            "center",
            "down",
            "screen-right",
          ];
          const newGaze =
            id === "host-1"
              ? "center"
              : Math.random() > 0.8
              ? gazeOptions[Math.floor(Math.random() * gazeOptions.length)]
              : item.gaze;
          const eyesOnScreen = newGaze !== "away";
          const blinkDrift = Math.max(10, Math.min(28, item.blinkRate + (Math.random() > 0.5 ? 1 : -1)));
          const attnDrift =
            id === "host-1"
              ? Math.max(93, Math.min(99, item.attentionScore + (Math.random() > 0.5 ? 1 : -1)))
              : Math.max(50, Math.min(98, item.attentionScore + (Math.random() > 0.5 ? 2 : -2)));

          const engagementLevel =
            attnDrift >= 90
              ? "High Focus"
              : attnDrift >= 75
              ? "Attentive"
              : attnDrift >= 60
              ? "Mild Distraction"
              : "Off-Task";

          next[id] = {
            ...item,
            gaze: newGaze,
            blinkRate: blinkDrift,
            eyesOnScreen,
            attentionScore: attnDrift,
            engagementLevel,
            distractionAlert: attnDrift < 65,
          };
        });
        return next;
      });

      setAudioMetrics((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((id) => {
          const item = next[id];
          const snrDrift = Math.max(
            12,
            Math.min(38, Math.round((item.snrDb + (Math.random() * 2 - 1)) * 10) / 10)
          );
          const paceDrift = Math.max(70, Math.min(160, item.speechPaceWpm + Math.floor(Math.random() * 5 - 2)));
          next[id] = {
            ...item,
            snrDb: snrDrift,
            speechPaceWpm: paceDrift,
          };
        });
        return next;
      });
    }, 3500);

    return () => clearInterval(timer);
  }, []);

  const updateManualRubricScore = (
    participantId: string,
    rubric: Partial<ManualRubricParameters>,
    notes?: string
  ) => {
    setQualityProfiles((prev) => {
      const current = prev[participantId] || INITIAL_QUALITY_PROFILES[participantId];
      if (!current) return prev;
      const updatedBreakdown = {
        ...current.rubricBreakdown,
        ...rubric,
      };
      const manualRubricScore =
        updatedBreakdown.pedagogyDelivery +
        updatedBreakdown.studentInclusivity +
        updatedBreakdown.vocalClarityAcoustics +
        updatedBreakdown.screenEngagementPacing;

      const finalCompositeScore = Math.round(current.autoComputedScore * 0.4 + manualRubricScore * 0.6);

      return {
        ...prev,
        [participantId]: {
          ...current,
          rubricBreakdown: updatedBreakdown,
          manualRubricScore,
          finalCompositeScore,
          evaluatorNotes: notes !== undefined ? notes : current.evaluatorNotes,
          lastAuditedAt: "Just now",
        },
      };
    });
  };

  const setRoomRatio = (ratio: RoomRatio) => {
    setRoomRatioState(ratio);
    const newParticipants = getParticipantsForRatio(ratio);
    setParticipants(newParticipants);

    // Initialize telemetry for any new participants
    newParticipants.forEach((p) => {
      setAttentionAudits((prev) => {
        if (prev[p.id]) return prev;
        return {
          ...prev,
          [p.id]: {
            participantId: p.id,
            name: p.name,
            role: p.role,
            eyesOnScreen: true,
            gaze: "center",
            blinkRate: 18,
            headPose: { yaw: 1.2, pitch: -0.5, roll: 0.1 },
            attentionScore: Math.floor(82 + Math.random() * 15),
            engagementLevel: "High Focus",
            distractionAlert: false,
            landmarks: {
              leftEye: [0.35, 0.4],
              rightEye: [0.65, 0.4],
              noseTip: [0.5, 0.55],
              mouthCenter: [0.5, 0.7],
              chin: [0.5, 0.9],
            },
          },
        };
      });

      setAudioMetrics((prev) => {
        if (prev[p.id]) return prev;
        return {
          ...prev,
          [p.id]: {
            participantId: p.id,
            snrDb: 28.4,
            ambientNoiseDb: -49.0,
            packetLossPercent: 0.001,
            jitterMs: 0.7,
            audioLatencyMs: 12.0,
            vocalClarityGrade: "A",
            clippingDetected: false,
            speechPaceWpm: 120,
          },
        };
      });
    });

    const ratioCode = ratio.replace(":", "V");
    setRoomTitle((prev) => prev.includes("1V") ? prev.replace(/1V\d+/, ratioCode) : `${prev} · [${ratio}]`);
  };

  // -------------------------------------------------------------
  // Zero-Toggle Live In-Room Student Management
  // -------------------------------------------------------------
  const [kickedParticipants, setKickedParticipants] = useState<
    Array<{ id: string; name: string; reason: string; kickedAt: string }>
  >([]);
  const [childFeedbackLogs, setChildFeedbackLogs] = useState<DirectChildFeedback[]>([
    {
      id: "fb-1",
      studentId: "stu-1",
      studentName: "Sophia Chen",
      teacherId: "host-1",
      praiseType: "Active Contributor",
      stars: 5,
      note: "Brilliant explanation of phase damping in quantum states!",
      timestamp: "09:08 AM",
    },
  ]);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [activeFeedbackTarget, setActiveFeedbackTarget] = useState<Participant | null>(null);

  const muteParticipant = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, audioEnabled: false } : p))
    );
  };

  const unmuteParticipant = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, audioEnabled: true } : p))
    );
  };

  const kickParticipant = (id: string, reason: string = "Classroom Policy") => {
    const target = participants.find((p) => p.id === id);
    if (!target) return;
    setKickedParticipants((prev) => [
      {
        id: target.id,
        name: target.name,
        reason,
        kickedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      ...prev,
    ]);
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const reAdmitParticipant = (id: string) => {
    const record = kickedParticipants.find((k) => k.id === id);
    if (!record) return;
    const initial = INITIAL_PARTICIPANTS.find((p) => p.id === id) || {
      id,
      name: record.name,
      role: "student" as const,
      avatarColor: "#0082FF",
      audioEnabled: false,
      videoEnabled: true,
      screenSharing: false,
      handRaised: false,
      audioLevel: 0,
      attendanceStatus: "present" as const,
      joinedAt: "Re-admitted",
      xpPoints: 1000,
    };
    setParticipants((prev) => [...prev, initial]);
    setKickedParticipants((prev) => prev.filter((k) => k.id !== id));
  };

  const markAttendanceQuick = (id: string, status: "present" | "late" | "absent") => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, attendanceStatus: status } : p))
    );
  };

  const shareChildFeedback = (feedback: Omit<DirectChildFeedback, "id" | "timestamp">) => {
    const newFb: DirectChildFeedback = {
      ...feedback,
      id: `fb-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChildFeedbackLogs((prev) => [newFb, ...prev]);
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === feedback.studentId ? { ...p, xpPoints: p.xpPoints + feedback.stars * 50 } : p
      )
    );
  };

  // -------------------------------------------------------------
  // Multi-Device Remote System Access Functionality
  // -------------------------------------------------------------
  const [remoteSessions, setRemoteSessions] = useState<RemoteAccessSession[]>(INITIAL_REMOTE_SESSIONS);
  const [activeRemoteSessionId, setActiveRemoteSessionId] = useState<string | null>("ras-tablet-sophia");
  const [isRemoteAccessModalOpen, setIsRemoteAccessModalOpen] = useState(false);
  const [isOfferAccessModalOpen, setIsOfferAccessModalOpen] = useState(false);
  const [incomingAccessRequest, setIncomingAccessRequest] = useState<RemoteAccessSession | null>(null);
  const [incomingAccessOffer, setIncomingAccessOffer] = useState<RemoteAccessSession | null>(null);

  const activeSession = remoteSessions.find((s) => s.id === activeRemoteSessionId) || remoteSessions[0] || null;
  const remoteAccessSession = activeSession;

  const requestRemoteAccess = (
    studentId: string,
    deviceType: DeviceType = "laptop",
    accessLevel: RemoteAccessLevel = "full_control"
  ) => {
    const target = participants.find((p) => p.id === studentId);
    if (!target) return;

    const meta = DEVICE_METADATA_MAP[deviceType];
    const existing = remoteSessions.find((s) => s.studentId === studentId && s.deviceType === deviceType);

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const sessionId = existing ? existing.id : `ras-${deviceType}-${Date.now()}`;

    const newSession: RemoteAccessSession = {
      id: sessionId,
      studentId,
      studentName: target.name,
      requesterId: currentUser?.id || "host-1",
      requesterName: currentUser?.name || "Dr. Evelyn Vance",
      deviceType,
      deviceModel: meta.defaultModel,
      osName: meta.defaultOs,
      accessLevel,
      status: "requested",
      cursorPosition: { x: 0.5, y: 0.5 },
      activeAnnotationTool: "pen",
      annotations: existing?.annotations || [],
      worksheetContent: existing?.worksheetContent || `21K School Interactive Workstation: ${target.name}`,
      screenResolution: meta.resolution,
      fps: 60,
      latencyMs: Math.floor(8 + Math.random() * 8),
      isMutedControl: false,
      interactiveContent: existing?.interactiveContent || {
        activeApp: meta.sampleApps[0] || "worksheet",
        codeEditorText: `// Live collaborative script for ${target.name} (${meta.label})\nconsole.log("Connected to 21K School Classroom");\n`,
        terminalLogs: [
          `[Remote Mesh] Handshake established with ${meta.defaultModel}`,
          `[WebRTC DataChannel] AES-256 encrypted stream initialized.`,
        ],
        worksheetAnswers: {},
        notesText: "Real-time session initiated.",
      },
      actionLog: [
        {
          timestamp: nowTime,
          actor: currentUser?.name || "Dr. Evelyn Vance",
          description: `Requested Remote Access (${accessLevel === "full_control" ? "Full Control" : accessLevel === "annotate" ? "Annotate" : "View Only"}) on ${meta.label}`,
        },
      ],
      requestedAt: nowTime,
    };

    setRemoteSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === sessionId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newSession;
        return copy;
      }
      return [newSession, ...prev];
    });

    setActiveRemoteSessionId(sessionId);
    setIncomingAccessRequest(newSession);
    setIsRemoteAccessModalOpen(true);
  };

  const offerRemoteAccess = (
    targetTeacherId: string,
    deviceType: DeviceType,
    accessLevel: RemoteAccessLevel,
    deviceModel?: string
  ) => {
    const meta = DEVICE_METADATA_MAP[deviceType];
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const sessionId = `ras-${deviceType}-${Date.now()}`;
    const studentUser = currentUser?.role === "student" ? currentUser : participants.find((p) => p.role === "student") || currentUser;

    const newSession: RemoteAccessSession = {
      id: sessionId,
      studentId: studentUser.id,
      studentName: studentUser.name,
      requesterId: studentUser.id,
      requesterName: studentUser.name,
      deviceType,
      deviceModel: deviceModel || meta.defaultModel,
      osName: meta.defaultOs,
      accessLevel,
      status: "offered",
      cursorPosition: { x: 0.5, y: 0.5 },
      activeAnnotationTool: "pointer",
      annotations: [],
      worksheetContent: `Student Live Workstation: ${studentUser.name}`,
      screenResolution: meta.resolution,
      fps: 60,
      latencyMs: Math.floor(7 + Math.random() * 8),
      isMutedControl: false,
      interactiveContent: {
        activeApp: meta.sampleApps[0] || "worksheet",
        codeEditorText: `// Student offered screen: ${studentUser.name}\n// Ready for instructor guidance\n`,
        terminalLogs: [
          `[Client Mesh] Screen stream offered to instructor`,
          `[Hardware Encoding] 60fps VP9 encoder ready`,
        ],
        worksheetAnswers: {},
        notesText: `Student ${studentUser.name} requested real-time assistance.`,
      },
      actionLog: [
        {
          timestamp: nowTime,
          actor: studentUser.name,
          description: `Offered Remote Access (${accessLevel === "full_control" ? "Full Control" : accessLevel === "annotate" ? "Annotate" : "View Only"}) from ${meta.label}`,
        },
      ],
      requestedAt: nowTime,
    };

    setRemoteSessions((prev) => [newSession, ...prev]);
    setActiveRemoteSessionId(sessionId);
    setIncomingAccessOffer(newSession);
    setIsOfferAccessModalOpen(false);
  };

  const respondRemoteAccess = (sessionId: string, accept: boolean, adjustedLevel?: RemoteAccessLevel) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setRemoteSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const newLevel = adjustedLevel || s.accessLevel;
        return {
          ...s,
          status: accept ? "active" : "denied",
          accessLevel: newLevel,
          actionLog: [
            ...s.actionLog,
            {
              timestamp: nowTime,
              actor: accept ? s.studentName : "Student",
              description: accept
                ? `Granted Access (${newLevel === "full_control" ? "Full Control" : newLevel === "annotate" ? "Annotate" : "View Only"})`
                : "Declined remote access request",
            },
          ],
        };
      })
    );
    setIncomingAccessRequest(null);
    setIncomingAccessOffer(null);
    if (accept) {
      setActiveRemoteSessionId(sessionId);
      setIsRemoteAccessModalOpen(true);
    }
  };

  const updateSessionLevel = (sessionId: string, level: RemoteAccessLevel) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setRemoteSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          accessLevel: level,
          actionLog: [
            ...s.actionLog,
            {
              timestamp: nowTime,
              actor: currentUser?.name || "Facilitator",
              description: `Changed access permissions to ${level === "full_control" ? "Full Control" : level === "annotate" ? "Annotate" : "View Only"}`,
            },
          ],
        };
      })
    );
  };

  const endRemoteAccess = (sessionId?: string) => {
    const targetId = sessionId || activeRemoteSessionId;
    if (!targetId) {
      setIsRemoteAccessModalOpen(false);
      return;
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setRemoteSessions((prev) =>
      prev.map((s) => {
        if (s.id !== targetId) return s;
        return {
          ...s,
          status: "ended",
          actionLog: [
            ...s.actionLog,
            {
              timestamp: nowTime,
              actor: currentUser?.name || "Participant",
              description: "Terminated remote access session via Kill Switch",
            },
          ],
        };
      })
    );

    const remaining = remoteSessions.filter((s) => s.id !== targetId && s.status === "active");
    if (remaining.length > 0) {
      setActiveRemoteSessionId(remaining[0].id);
    } else {
      setIsRemoteAccessModalOpen(false);
    }
  };

  const updateRemoteCursor = (x: number, y: number, sessionId?: string) => {
    const targetId = sessionId || activeRemoteSessionId;
    setRemoteSessions((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, cursorPosition: { x, y } } : s))
    );
  };

  const addRemoteAnnotation = (
    point: { x: number; y: number; color: string; size: number },
    sessionId?: string
  ) => {
    const targetId = sessionId || activeRemoteSessionId;
    setRemoteSessions((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, annotations: [...s.annotations, point] } : s))
    );
  };

  const clearRemoteAnnotations = (sessionId?: string) => {
    const targetId = sessionId || activeRemoteSessionId;
    setRemoteSessions((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, annotations: [] } : s))
    );
  };

  const updateRemoteWorksheet = (text: string, sessionId?: string) => {
    const targetId = sessionId || activeRemoteSessionId;
    setRemoteSessions((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, worksheetContent: text } : s))
    );
  };

  const updateRemoteInteractiveContent = (
    patch: Partial<RemoteAccessSession["interactiveContent"]>,
    sessionId?: string
  ) => {
    const targetId = sessionId || activeRemoteSessionId;
    setRemoteSessions((prev) =>
      prev.map((s) =>
        s.id === targetId
          ? {
              ...s,
              interactiveContent: {
                ...s.interactiveContent,
                ...patch,
              },
            }
          : s
      )
    );
  };

  const executeRemoteTerminalCommand = (command: string, sessionId?: string) => {
    const targetId = sessionId || activeRemoteSessionId;
    const session = remoteSessions.find((s) => s.id === targetId);
    if (!session) return;

    let responseLog = `[Remote Exec] command executed: ${command}`;
    const lower = command.toLowerCase().trim();
    if (lower === "ls" || lower === "dir") {
      responseLog = "main.py  quantum_sim.py  data.json  test_circuit.ts  README.md";
    } else if (lower.includes("python") || lower.includes("run")) {
      responseLog = ">>> Running simulation...\n[Status 200 OK] 4 Qubits measured with fidelity 0.9984.";
    } else if (lower.includes("clear") || lower.includes("cls")) {
      updateRemoteInteractiveContent(
        { terminalLogs: [`Terminal cleared by ${currentUser?.name || "Remote Facilitator"}`] },
        targetId || undefined
      );
      return;
    } else if (lower.includes("git")) {
      responseLog = "On branch main. Your branch is up to date with 'origin/main'.";
    }

    const updatedLogs = [
      ...session.interactiveContent.terminalLogs,
      `$ ${command}`,
      responseLog,
    ];

    updateRemoteInteractiveContent({ terminalLogs: updatedLogs }, targetId || undefined);
  };

  const toggleMuteRemoteInput = (sessionId?: string) => {
    const targetId = sessionId || activeRemoteSessionId;
    setRemoteSessions((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, isMutedControl: !s.isMutedControl } : s))
    );
  };

  const dismissIncomingPrompt = (sessionId: string) => {
    if (incomingAccessRequest?.id === sessionId) setIncomingAccessRequest(null);
    if (incomingAccessOffer?.id === sessionId) setIncomingAccessOffer(null);
  };

  // -------------------------------------------------------------
  // Room Hierarchy Flow Generator & Break Controls
  // -------------------------------------------------------------
  const roomCategories: RoomCategory[] = ["21K School", "21K Learning Floww"];
  const roomSubCategories: RoomSubCategory[] = [
    "Demo Classes",
    "Enrolled Classes",
    "Doubt Clearance Classes",
    "Community Activities Classes",
    "Student Collaboration Classes",
  ];
  const [generatedRooms, setGeneratedRooms] = useState<GeneratedRoomFlow[]>(INITIAL_GENERATED_ROOMS);
  const [activeRoomFlow, setActiveRoomFlow] = useState<GeneratedRoomFlow>(INITIAL_GENERATED_ROOMS[0]);
  const [isRoomHierarchyModalOpen, setIsRoomHierarchyModalOpen] = useState(false);

  const createRoomFlow = (
    config: Omit<GeneratedRoomFlow, "id" | "roomCode" | "roomUrl" | "createdAt" | "activeStudentsCount">
  ) => {
    const { roomCode, roomUrl, subCode } = buildStandardizedRoomLink(
      config.category,
      config.subCategory,
      config.microCategory.course,
      config.microCategory.teacherName,
      config.microCategory.timezone,
      config.microCategory.requestType
    );

    const newRoom: GeneratedRoomFlow = {
      ...config,
      id: `rf-${Date.now()}`,
      subCategoryCode: subCode,
      roomCode,
      roomUrl,
      createdAt: "Just now",
      activeStudentsCount: 0,
    };
    setGeneratedRooms((prev) => [newRoom, ...prev]);
    return newRoom;
  };

  const switchActiveRoom = (roomIdToSwitch: string) => {
    const target = generatedRooms.find((r) => r.id === roomIdToSwitch);
    if (!target) return;
    setActiveRoomFlow(target);
    setRoomId(target.roomCode.toLowerCase());
    setRoomTitle(`${target.microCategory.course} · [${target.subCategoryCode}] ${target.category}`);
    setRoomLink(target.roomUrl);
    setActiveProductionMeeting(null);
  };

  // Real Production Meeting Joining & Auto-Resolution
  const joinProductionMeetingUrl = (urlOrCode: string): NormalizedProductionMeeting => {
    const parsed = parseProductionMeetingLink(urlOrCode);

    // 1. Check if matching any 1:1 Pitch Breakout Room
    const matchingPitch = pitchRooms.find(
      (p) =>
        p.roomId === parsed.roomSlug ||
        (p.roomCode && p.roomCode.toLowerCase() === parsed.roomSlug.toLowerCase()) ||
        parsed.normalizedUrl.includes(p.roomId)
    );
    if (matchingPitch) {
      setActivePitchRoom(matchingPitch);
      setIsRoomBomberActive(true);
      setRoomId(matchingPitch.roomId);
      setRoomTitle(matchingPitch.roomName);
      setRoomLink(parsed.normalizedUrl);
      setActiveProductionMeeting(null);
      setActiveView("classroom");
      return parsed;
    }

    // 2. Direct In-House WebRTC Mesh Room Connection
    const roomSlug = parsed.roomSlug || "dronacharya-live";
    setRoomId(roomSlug);
    setRoomTitle(parsed.displayTitle || `Classroom · ${roomSlug}`);
    setRoomLink(buildMeetingUrl(roomSlug));
    setActiveProductionMeeting(null);
    setActivePitchRoom(null);
    setActiveView("classroom");

    const localP = participants.find((p) => p.isLocal) || fallbackUser;
    webRtcMeshService.joinRoom(roomSlug, localP, localStream || undefined);

    return parsed;
  };

  const leaveProductionMeeting = () => {
    setActiveProductionMeeting(null);
    setActivePitchRoom(null);
    setRoomId("dronacharya-gr10-phy");
    setRoomTitle("Grade 10-A · Advanced Quantum Mechanics & Physics (Dronacharya)");
    setRoomLink(buildMeetingUrl("dronacharya-gr10-phy"));
  };

  // Auto-detect production meeting link from browser URL query params (?join=, ?meetingUrl=, ?room=)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const joinParam =
        params.get("join") ||
        params.get("meetingUrl") ||
        params.get("meeting") ||
        params.get("room") ||
        params.get("meet");
      if (joinParam && joinParam.trim()) {
        joinProductionMeetingUrl(joinParam.trim());
      }
    }
  }, [pitchRooms]);

  // -------------------------------------------------------------
  // Room Break System
  // -------------------------------------------------------------
  const [roomBreak, setRoomBreak] = useState<RoomBreakSession>({
    isActive: false,
    durationMinutes: 5,
    remainingSeconds: 300,
    reason: "Cognitive Decompression & Visual Rest",
    mindfulnessActivity: "4-7-8 Breathing & Eye Distant Focus",
    soundAlertEnabled: true,
  });

  const startRoomBreak = (durationMinutes: number = 5, reason?: string, activity?: string) => {
    setRoomBreak({
      isActive: true,
      durationMinutes,
      remainingSeconds: durationMinutes * 60,
      reason: reason || "Scheduled Classroom Decompression Break",
      mindfulnessActivity: activity || "4-7-8 Breathing & Gentle Neck Relaxation",
      soundAlertEnabled: true,
      startedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  };

  const pauseRoomBreak = () => {
    setRoomBreak((prev) => ({ ...prev, isActive: false }));
  };

  const resumeRoomBreak = () => {
    setRoomBreak((prev) => ({ ...prev, isActive: true }));
  };

  const endRoomBreak = () => {
    setRoomBreak((prev) => ({ ...prev, isActive: false, remainingSeconds: 0 }));
  };

  // Break countdown timer
  useEffect(() => {
    if (!roomBreak.isActive) return;
    const interval = setInterval(() => {
      setRoomBreak((prev) => {
        if (!prev.isActive) return prev;
        if (prev.remainingSeconds <= 1) {
          return {
            ...prev,
            isActive: false,
            remainingSeconds: 0,
          };
        }
        return {
          ...prev,
          remainingSeconds: prev.remainingSeconds - 1,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [roomBreak.isActive]);

  // -------------------------------------------------------------
  // Parent & Customer Experience (CX) Escalations
  // -------------------------------------------------------------
  const [escalationTickets, setEscalationTickets] = useState<EscalationTicket[]>([
    {
      id: "esc-1",
      type: "parent_help",
      senderId: "stu-2",
      senderName: "Marcus Vance",
      senderRole: "student",
      studentTargetId: "stu-2",
      studentTargetName: "Marcus Vance",
      parentContact: "vance.guardian@21k.family",
      urgency: "Assistance Required",
      reason: "Requested parent clarification on secondary monitor audio sync issue.",
      status: "acknowledged",
      dispatchedAt: "09:05 AM",
      responseNote: "Guardian acknowledged via SMS: Joining chat in 3 minutes.",
    },
  ]);
  const [activeEscalationToast, setActiveEscalationToast] = useState<EscalationTicket | null>(null);
  const [isParentHelpModalOpen, setIsParentHelpModalOpen] = useState(false);
  const [isCxHelpModalOpen, setIsCxHelpModalOpen] = useState(false);

  const askParentHelp = (studentId?: string, reason?: string) => {
    const targetStudent = studentId
      ? participants.find((p) => p.id === studentId)
      : currentRole === "student"
      ? currentUser
      : participants[1];
    const targetName = targetStudent?.name || "Sophia Chen";
    const ticket: EscalationTicket = {
      id: `esc-parent-${Date.now()}`,
      type: "parent_help",
      senderId: currentUser?.id || "user",
      senderName: currentUser?.name || "Dr. Evelyn Vance",
      senderRole: currentRole,
      studentTargetId: targetStudent?.id,
      studentTargetName: targetName,
      parentContact: targetStudent?.parentEmail || "guardian@21k.family",
      urgency: "Urgent (Class Interruption)",
      reason: reason || `Parent assistance requested during ${roomTitle} for ${targetName}.`,
      status: "dispatched",
      dispatchedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      responseNote: "SMS & WhatsApp notification delivered to guardian. Acknowledged by automated delivery system.",
    };
    setEscalationTickets((prev) => [ticket, ...prev]);
    setActiveEscalationToast(ticket);
    setTimeout(() => {
      setEscalationTickets((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, status: "acknowledged" } : t))
      );
    }, 4000);
  };

  const askCxHelp = (reason?: string) => {
    const ticket: EscalationTicket = {
      id: `esc-cx-${Date.now()}`,
      type: "cx_help",
      senderId: currentUser?.id || "user",
      senderName: currentUser?.name || "Dr. Evelyn Vance",
      senderRole: currentRole,
      urgency: "Technical Diagnostic",
      reason:
        reason ||
        `Classroom facilitator or learner requested 21K Customer Experience / Tech Ops live assistance in ${roomTitle}.`,
      status: "dispatched",
      dispatchedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      responseNote: "Ticket assigned to 21K CX Duty Lead (Agent Rohit M.). Connecting diagnostic probe.",
    };
    setEscalationTickets((prev) => [ticket, ...prev]);
    setActiveEscalationToast(ticket);
    setTimeout(() => {
      setEscalationTickets((prev) =>
        prev.map((t) =>
          t.id === ticket.id
            ? {
                ...t,
                status: "acknowledged",
                responseNote: "21K CX Specialist connected to classroom diagnostics channel.",
              }
            : t
        )
      );
    }, 3000);
  };

  const dismissEscalation = (ticketId: string) => {
    setEscalationTickets((prev) => prev.filter((t) => t.id !== ticketId));
  };

  const dismissEscalationToast = () => {
    setActiveEscalationToast(null);
  };

  const fallbackUser: Participant = {
    id: authenticatedUser?.id || "local-user-1",
    name: authenticatedUser?.name || "Dr. Evelyn Vance",
    role: authenticatedUser?.role || currentRole || "instructor",
    avatarColor: authenticatedUser?.avatarColor || "#0082FF",
    isLocal: true,
    audioEnabled: !isAudioMuted,
    videoEnabled: !isVideoOff,
    screenSharing: isScreenSharing,
    handRaised: handRaised,
    breakoutRoomId: null,
    audioLevel: 80,
    attendanceStatus: "present",
    joinedAt: "Just now",
    xpPoints: 120,
    gradeLevel: authenticatedUser?.gradeLevel,
    section: authenticatedUser?.section,
  };

  const currentUser: Participant = participants[0] || fallbackUser;

  return (
    <ClassroomContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        currentUser,
        activeView,
        setActiveView,
        roomId,
        setRoomId,
        roomTitle,
        setRoomTitle,
        roomLink,
        isE2eeSecured,
        encryptionFingerprint,
        latencyMs,
        streamingQuality,
        setStreamingQuality,
        roomRatio,
        setRoomRatio,
        localStream,
        screenStream,
        isAudioMuted,
        isVideoOff,
        isScreenSharing,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
        remotePointer,
        setRemotePointer,
        participants,
        handRaised,
        toggleHandRaise,
        muteAllParticipants,
        removeParticipant,
        waitingList,
        admitParticipant,
        rejectParticipant,
        admitAllWaiting,
        breakoutRooms,
        createBreakoutRoom,
        assignStudentToBreakout,
        broadcastToAllBreakouts,
        closeAllBreakouts,
        isRecording,
        recordingSeconds,
        startRecording,
        stopRecording,
        hasRecordedClip,
        downloadRecordedClip,
        activeDockTab,
        setActiveDockTab,
        transcriptLines,
        addTranscriptLine,
        activeLanguage,
        setActiveLanguage,
        isTranslating,
        translateTranscripts,
        isLiveSubtitlesActive,
        toggleLiveSubtitles,
        subtitleLanguage,
        setSubtitleLanguage,
        subtitleMode,
        setSubtitleMode,
        currentLiveCaption,
        pushLiveCaption,
        isSpeechRecognitionActive,
        toggleSpeechRecognition,
        simulateNextClassroomUtterance,
        isLiveSpeechStreaming,
        layoutMode,
        setLayoutMode,
        manualGridColumns,
        setManualGridColumns,
        tileAspectRatio,
        setTileAspectRatio,
        pinnedParticipantId,
        setPinnedParticipantId,
        showSelfView,
        setShowSelfView,
        dockSplitRatio,
        setDockSplitRatio,
        deviceAuditLogs,
        latestDeviceAudit,
        logDeviceAudit,
        polls,
        createPoll,
        votePoll,
        announcements,
        sendAnnouncement,
        activeBannerAnnouncement,
        dismissBannerAnnouncement,
        attendanceLogs,
        emailAlertLogs,
        triggerParentAlert,
        isOfflineMode,
        toggleOfflineMode,
        materials,
        toggleMaterialDownload,
        userXp,
        addXp,
        badges,
        automationRules,
        toggleAutomationRule,
        executeRule,
        addNewRule,
        teachers,
        gradeRooms,
        createGradeRoom,
        assignTeacherToRoom,
        triggerEmergencySubstitute,
        cohorts,
        executionLogs,
        triggerGradeBatchCreation,
        isScheduleModalOpen,
        setIsScheduleModalOpen,
        isAiSummaryModalOpen,
        setIsAiSummaryModalOpen,
        isAnnouncementModalOpen,
        setIsAnnouncementModalOpen,
        // Attention & Audio Tracking
        attentionAudits,
        audioMetrics,
        qualityProfiles,
        updateManualRubricScore,
        isAuditDrawerOpen,
        setIsAuditDrawerOpen,
        selectedAuditParticipantId,
        setSelectedAuditParticipantId,
        // Zero-Toggle Student Management
        muteParticipant,
        unmuteParticipant,
        kickParticipant,
        reAdmitParticipant,
        kickedParticipants,
        markAttendanceQuick,
        shareChildFeedback,
        childFeedbackLogs,
        isFeedbackModalOpen,
        setIsFeedbackModalOpen,
        activeFeedbackTarget,
        setActiveFeedbackTarget,
        // Multi-Device Remote System Access
        remoteSessions,
        activeRemoteSessionId,
        remoteAccessSession,
        setActiveRemoteSessionId,
        requestRemoteAccess,
        offerRemoteAccess,
        respondRemoteAccess,
        updateSessionLevel,
        endRemoteAccess,
        updateRemoteCursor,
        addRemoteAnnotation,
        clearRemoteAnnotations,
        updateRemoteWorksheet,
        updateRemoteInteractiveContent,
        executeRemoteTerminalCommand,
        toggleMuteRemoteInput,
        isRemoteAccessModalOpen,
        setIsRemoteAccessModalOpen,
        isOfferAccessModalOpen,
        setIsOfferAccessModalOpen,
        incomingAccessRequest,
        incomingAccessOffer,
        dismissIncomingPrompt,
        // Real Production Meeting Joining & Auto-Resolution
        activeProductionMeeting,
        joinProductionMeetingUrl,
        leaveProductionMeeting,
        // Room Hierarchy & Flow Generator
        roomCategories,
        roomSubCategories,
        generatedRooms,
        activeRoomFlow,
        createRoomFlow,
        switchActiveRoom,
        isRoomHierarchyModalOpen,
        setIsRoomHierarchyModalOpen,
        // Room Break
        roomBreak,
        startRoomBreak,
        pauseRoomBreak,
        resumeRoomBreak,
        endRoomBreak,
        // Help Escalations
        escalationTickets,
        askParentHelp,
        askCxHelp,
        dismissEscalation,
        activeEscalationToast,
        dismissEscalationToast,
        isParentHelpModalOpen,
        setIsParentHelpModalOpen,
        isCxHelpModalOpen,
        setIsCxHelpModalOpen,
        // Room Bomber 1:1 High-Conversion Sales Engine
        pitchRooms,
        isRoomBomberActive,
        activePitchRoom,
        setActivePitchRoom,
        triggerRoomBomber,
        resetRoomBomber,
        updatePitchStage,
        applyPitchOffer,
        // Documentation Modal
        isDocsModalOpen,
        setIsDocsModalOpen,
        // AI Realtime Interpreter Studio Modal
        isInterpreterModalOpen,
        setIsInterpreterModalOpen,
        // Dedicated Multi-Role Auth
        isAuthModalOpen,
        setIsAuthModalOpen,
        authenticatedUser,
        loginUser,
        logoutUser,
      }}
    >
      {children}
    </ClassroomContext.Provider>
  );
};

export const useClassroom = () => {
  const context = useContext(ClassroomContext);
  if (!context) {
    throw new Error("useClassroom must be used within a ClassroomProvider");
  }
  return context;
};
