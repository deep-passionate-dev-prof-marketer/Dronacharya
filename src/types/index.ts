export type UserRole = "instructor" | "student" | "ta" | "admin" | "auditor" | "sales_rep";

export type LanguageCode = "en" | "es" | "fr" | "de" | "zh" | "hi" | "ar" | "ja";

export type RoomRatio = "1:1" | "1:2" | "1:3" | "1:4" | "1:5" | "1:6" | "1:8" | "1:12" | "1:16" | "1:24";

export type GridLayoutMode = "auto" | "spotlight" | "filmstrip" | "presentation" | "custom_grid";
export type TileAspectRatio = "16:9" | "4:3" | "1:1";
export type LiveClassStatus = "waiting" | "in_progress" | "paused" | "ended";

export interface Participant {
  id: string;
  name: string;
  role: UserRole;
  avatarColor: string;
  isLocal?: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  handRaised: boolean;
  breakoutRoomId?: string | null;
  audioLevel: number; // 0 to 100
  attendanceStatus: "present" | "late" | "absent";
  joinedAt: string;
  parentEmail?: string;
  xpPoints: number;
  gradeLevel?: number;
  section?: string;
  stream?: MediaStream;
  /** Live media (set by the classroom transport). Attach returns a detach function. */
  attachVideo?: (el: HTMLVideoElement) => () => void;
  attachScreen?: (el: HTMLVideoElement) => () => void;
  /** Local screen-share preview, or a remote screen stream on the peer-to-peer fallback */
  screenStream?: MediaStream;
  isSpeaking?: boolean;
  /** Learner waiting to be admitted by the host */
  waiting?: boolean;
  connectionQuality?: "excellent" | "good" | "poor" | "lost" | "unknown";
}

export interface BreakoutRoom {
  id: string;
  name: string;
  topic: string;
  participantIds: string[];
  isActive: boolean;
}

export interface TranscriptLine {
  id: string;
  speakerId: string;
  speakerName: string;
  timestamp: string;
  text: string;
  translatedText?: string;
  language: string;
}

export interface LiveCaption {
  speakerName: string;
  englishText: string;
  translatedText?: string;
  targetLanguage: LanguageCode;
  timestamp: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  active: boolean;
  createdAt: string;
  totalVotes: number;
  userVotedOptionId?: string;
}

export interface StudyMaterial {
  id: string;
  title: string;
  category: "Quantum Physics" | "Linear Algebra" | "Computer Science" | "Laboratory Guide" | "Mathematics" | "Robotics" | "Sciences";
  format: "slides" | "notes" | "code" | "pdf";
  size: string;
  downloadedOffline: boolean;
  updatedAt: string;
  slidesCount?: number;
  content: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface BlockchainCertificate {
  certificateId: string;
  studentName: string;
  courseTitle: string;
  grade: string;
  issuedAt: string;
  blockHash: string;
  previousHash: string;
  blockNumber: number;
  instructorSignature: string;
  verified: boolean;
}

export interface Announcement {
  id: string;
  senderName: string;
  senderRole: string;
  title: string;
  message: string;
  timestamp: string;
  priority: "urgent" | "info" | "normal";
}

export interface WaitingParticipant {
  id: string;
  name: string;
  role: UserRole;
  requestedAt: string;
  cameraReady: boolean;
  micReady: boolean;
}

// -------------------------------------------------------------
// Dronacharya Automation Models
// -------------------------------------------------------------

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  category:
    | "grade_room"
    | "course_room"
    | "teacher_assign"
    | "substitute_failover"
    | "attendance_alert"
    | "exam_lock";
  trigger: {
    type: "schedule_time" | "teacher_inactive" | "student_absent_count" | "exam_started" | "cohort_enrolled";
    label: string;
    value: string;
  };
  condition?: {
    field: string;
    operator: "equals" | "greater_than" | "contains" | "in_list";
    value: string;
  };
  actions: Array<{
    type:
      | "create_grade_rooms"
      | "create_course_room"
      | "assign_certified_teacher"
      | "route_emergency_substitute"
      | "send_parent_compliance_email"
      | "lockdown_exam_controls"
      | "attach_study_deck";
    label: string;
    params: Record<string, any>;
  }>;
  enabled: boolean;
  lastRunAt?: string;
  runCount: number;
}

export interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  grades: number[];
  status: "available" | "in_class" | "offline";
  currentRoomId?: string;
  weeklyHours: number;
  maxHours: number;
  rating: number;
  avatarColor: string;
}

export interface GradeRoomConfig {
  id: string;
  gradeLevel: number;
  section: string;
  courseName: string;
  teacherId: string;
  teacherName: string;
  studentCount: number;
  roomCode: string;
  scheduledTime: string;
  status: "scheduled" | "active" | "completed";
}

export interface StudentCohort {
  id: string;
  name: string;
  gradeLevel: number;
  section: string;
  studentCount: number;
  courseTracks: string[];
  primaryTeacher: string;
}

export interface ExecutionLog {
  id: string;
  ruleId: string;
  ruleName: string;
  triggerEvent: string;
  actionTaken: string;
  status: "success" | "warning" | "failed";
  timestamp: string;
  details: string;
}

// -------------------------------------------------------------
// Google LLM Notebook Visual Representation Models
// -------------------------------------------------------------

export interface ConceptCitation {
  speaker: string;
  timestamp: string;
  quote: string;
}

export interface ConceptNode {
  id: string;
  label: string;
  category: "Foundations" | "Core Theory" | "3D Visualization" | "Experimental" | "Mitigation";
  explanation: string;
  formulas: string[];
  phaseId: string;
  citations: ConceptCitation[];
  position: { x: number; y: number };
}

export interface ConceptEdge {
  id: string;
  from: string;
  to: string;
  relation: string;
}

export interface LectureFlowPhase {
  id: string;
  phaseNumber: number;
  title: string;
  timeRange: string;
  description: string;
  keyTakeaways: string[];
  conceptNodeIds: string[];
}

export interface NotebookFlashcard {
  id: string;
  question: string;
  answer: string;
  formulaHint?: string;
  category: string;
}

export interface FormulaDerivation {
  title: string;
  mathExpression: string;
  context: string;
  derivationSteps: string[];
  practiceProblem: string;
}

export interface NotebookChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  citations?: ConceptCitation[];
  timestamp: string;
}

// -------------------------------------------------------------
// Attention Audit & Audio Quality Tracking Models
// -------------------------------------------------------------

export type GazeDirection = "center" | "screen-left" | "screen-right" | "down" | "away";

export interface HeadPose {
  pitch: number; // up/down degrees
  yaw: number;   // left/right degrees
  roll: number;  // tilt degrees
}

export interface FacialLandmarks {
  leftEye: [number, number];
  rightEye: [number, number];
  noseTip: [number, number];
  mouthCenter: [number, number];
  chin: [number, number];
}

export interface AttentionAudit {
  participantId: string;
  name: string;
  role: UserRole;
  gaze: GazeDirection;
  headPose: HeadPose;
  blinkRate: number; // blinks/min
  eyesOnScreen: boolean;
  attentionScore: number; // 0 - 100
  engagementLevel: "High Focus" | "Attentive" | "Mild Distraction" | "Off-Task";
  distractionAlert: boolean;
  landmarks: FacialLandmarks;
}

export interface AudioQualityMetrics {
  participantId: string;
  snrDb: number; // Signal-to-noise ratio in dB
  ambientNoiseDb: number; // -60 to -10 dB
  packetLossPercent: number; // 0 - 100%
  jitterMs: number; // ms
  audioLatencyMs: number; // ms
  vocalClarityGrade: "A+" | "A" | "B" | "C" | "D";
  clippingDetected: boolean;
  speechPaceWpm: number; // words per minute
}

export interface ManualRubricParameters {
  pedagogyDelivery: number; // 0 - 25
  studentInclusivity: number; // 0 - 25
  vocalClarityAcoustics: number; // 0 - 25
  screenEngagementPacing: number; // 0 - 25
}

export interface QualityScoreProfile {
  participantId: string;
  participantName: string;
  role: UserRole;
  autoComputedScore: number; // 0 - 100
  manualRubricScore: number; // 0 - 100
  finalCompositeScore: number; // 0 - 100
  rubricBreakdown: ManualRubricParameters;
  evaluatorNotes: string;
  lastAuditedAt: string;
  auditorName: string;
}

// -------------------------------------------------------------
// Categorical Room Flow & Hierarchical Shortlinks
// -------------------------------------------------------------

export type RoomCategory = "21K School" | "21K Learning Floww";

export type RoomSubCategory =
  | "Demo Classes"
  | "Enrolled Classes"
  | "Doubt Clearance Classes"
  | "Community Activities Classes"
  | "Student Collaboration Classes";

export type RoomSubCategoryCode = "DC" | "PC" | "DCC" | "CAC" | "SCC";

export type MicroSpecialRequest =
  | "General"
  | "Special Needs (IEP)"
  | "Accelerated Learning"
  | "Dyslexia Accommodation"
  | "Bilingual Support";

export interface MicroCategoryDimension {
  course: string;
  language: string;
  timezone: string;
  teacherId: string;
  teacherName: string;
  requestType: MicroSpecialRequest;
}

export interface GeneratedRoomFlow {
  id: string;
  name: string;
  category: RoomCategory;
  subCategory: RoomSubCategory;
  subCategoryCode: RoomSubCategoryCode;
  microCategory: MicroCategoryDimension;
  roomCode: string; // e.g. 21K-DC-MATH-VANCE
  roomUrl: string;  // e.g. `${window.location.origin}/room/21k-dc-grade9-math-vance-ist`
  scheduledBreakMinutes: number;
  activeBreak: boolean;
  createdAt: string;
  studentCapacity: number;
  activeStudentsCount: number;
  roomRatio?: RoomRatio;
}

// -------------------------------------------------------------
// Room Break System
// -------------------------------------------------------------

export interface RoomBreakSession {
  isActive: boolean;
  durationMinutes: number;
  remainingSeconds: number;
  reason: string;
  mindfulnessActivity: string;
  soundAlertEnabled: boolean;
  startedAt?: string;
}

// -------------------------------------------------------------
// In-Meeting Remote Screen Access & Quick Actions
// -------------------------------------------------------------

export type DeviceType = "phone" | "tablet" | "laptop" | "desktop";
export type RemoteAccessLevel = "view_only" | "annotate" | "full_control";

export interface RemoteInputEvent {
  type: "click" | "move" | "touch" | "key" | "scroll" | "annotate";
  x?: number;
  y?: number;
  key?: string;
  data?: unknown;
  timestamp: number;
}

export interface DeviceAuditRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  deviceType: DeviceType;
  deviceModel: string;
  osName: string;
  browserName: string;
  browserVersion: string;
  screenResolution: string;
  pixelRatio: number;
  touchSupported: boolean;
  maxTouchPoints: number;
  hardwareConcurrency: number;
  deviceMemoryGb?: number;
  networkType?: string;
  audioInputsCount: number;
  videoInputsCount: number;
  audioOutputsCount: number;
  detectedAt: string;
  complianceStatus: "compliant" | "warning" | "needs_review";
  details?: string;
}

export interface RemoteAccessSession {
  id: string;
  studentId: string;
  studentName: string;
  requesterId: string;
  requesterName: string;
  deviceType: DeviceType;
  deviceModel: string;
  osName: string;
  accessLevel: RemoteAccessLevel;
  status: "idle" | "requested" | "offered" | "active" | "paused" | "denied" | "ended";
  cursorPosition: { x: number; y: number };
  activeAnnotationTool: "pointer" | "pen" | "highlighter";
  annotations: Array<{ x: number; y: number; color: string; size: number }>;
  worksheetContent?: string;
  screenResolution: { width: number; height: number };
  fps: number;
  latencyMs: number;
  isMutedControl?: boolean;
  interactiveContent: {
    activeApp: "worksheet" | "ide" | "terminal" | "browser" | "calculator";
    codeEditorText: string;
    terminalLogs: string[];
    worksheetAnswers: Record<string, string>;
    notesText: string;
  };
  actionLog: Array<{ timestamp: string; actor: string; description: string }>;
  requestedAt: string;
}

export interface DirectChildFeedback {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  praiseType: "Star Performer" | "Deep Question" | "Keep Focused" | "Check Audio" | "Active Contributor";
  stars: number;
  note: string;
  timestamp: string;
}

// -------------------------------------------------------------
// Parent & Customer Experience (CX) Escalations
// -------------------------------------------------------------

export interface EscalationTicket {
  id: string;
  type: "parent_help" | "cx_help";
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  studentTargetId?: string;
  studentTargetName?: string;
  parentContact?: string;
  urgency: "Urgent (Class Interruption)" | "Assistance Required" | "Technical Diagnostic";
  reason: string;
  status: "dispatching" | "dispatched" | "acknowledged" | "resolved";
  dispatchedAt: string;
  responseNote?: string;
}

// -------------------------------------------------------------
// Netflix-Style Ultra-Low Latency (<20ms) Open Connect Edge Mesh
// -------------------------------------------------------------

export interface EdgeNodePoP {
  id: string;
  code: string;
  city: string;
  region: string;
  country: string;
  coordinates: { lat: number; lng: number };
  measuredPingMs: number;
  jitterMs: number;
  packetLossPercent: number;
  openConnectCacheHitRatio: number;
  webrtcDataProtocol: "QUIC/HTTP3" | "WebRTC-DataChannel";
  status: "optimal" | "active" | "standby";
}

export interface StudentEdgeRouting {
  studentId: string;
  studentName: string;
  clientIp: string;
  geoCity: string;
  assignedEdgePop: string;
  sub20msLatency: number;
  jitterMs: number;
  abrBandwidthMbps: number;
  directPeeringOca: boolean;
}

// -------------------------------------------------------------
// Smart Student-to-Student Conversation Note-Taker
// -------------------------------------------------------------

export interface PeerDialogueMessage {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  timestamp: string;
}

export interface PeerNotetakerSession {
  id: string;
  roomRatio: RoomRatio;
  peerA: string;
  peerB: string;
  topic: string;
  isActive: boolean;
  messages: PeerDialogueMessage[];
  keyTakeaways: string[];
  actionItems: Array<{ owner: string; task: string; deadline: string }>;
  sharedVocabulary: string[];
  peerContributionSplit: Record<string, number>;
  lastGeneratedAt: string;
}

// -------------------------------------------------------------
// Authentication & Multi-Role User Profile Models
// -------------------------------------------------------------

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarColor: string;
  department?: string;
  section?: string;
  gradeLevel?: number;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  auditorLicense?: string;
  adminSecurityKey?: string;
  salesCluster?: string;
  deviceType?: DeviceType;
  deviceModel?: string;
  osName?: string;
  deviceAudit?: DeviceAuditRecord;
  academicGoals?: string;
  /** Stable learner code (e.g. "10ABCDEFGH") used to key device approvals across sessions */
  studentCode?: string;
  /** ISO-2/ISO-3 country and BCP-47 primary language, used in role URLs and caption language */
  country?: string;
  languageTag?: string;
  /** "10ABCDEFGH · 4F2A9C": school id + session fingerprint, drawn as the forensic watermark */
  watermarkId?: string;
}

// -------------------------------------------------------------
// Room Bomber: 1:1 Sales Pitch Breakout Models
// -------------------------------------------------------------

export type PitchStageNumber = 1 | 2 | 3 | 4 | 5;

export interface PitchCallFlaw {
  id: string;
  timestamp: string;
  severity: "critical" | "warning" | "minor";
  flawCategory: "discovery" | "pacing" | "objection_handling" | "closing" | "interruption";
  flaw: string;
  impact: string;
  betterApproach: string;
}

export interface PitchWinningMoment {
  id: string;
  timestamp: string;
  achievement: string;
  reproducibleTip: string;
}

export interface PitchCueCard {
  id: string;
  triggerKeyword: string;
  category: string;
  advice: string;
  timestamp: string;
}

export interface PitchDialogueUtterance {
  id: string;
  speaker: string;
  role: "sales_rep" | "lead";
  text: string;
  timestamp: string;
  sentiment?: "positive" | "neutral" | "hesitant" | "critical";
  isFlawDetected?: boolean;
}

export interface PitchCallAuditReport {
  id: string;
  roomId: string;
  callDate: string;
  durationFormatted: string;
  overallScore: number;
  discoveryScore: number;
  valueArticulationScore: number;
  objectionHandlingScore: number;
  closingDecisivenessScore: number;
  talkToListenRatio: { repPercent: number; leadPercent: number };
  highlightedFlaws: PitchCallFlaw[];
  winningMoments: PitchWinningMoment[];
  aiCoachingDirectives: string[];
  crmSyncStatus: "synced" | "pending" | "failed";
  crmSyncTimestamp?: string;
  recordedClipUrl?: string;
}

export interface PitchRoomStatus {
  roomId: string;
  roomName: string;
  roomCode?: string;
  salesRepId: string;
  salesRepName: string;
  assignedRepEmail?: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  gradeLevel: number;
  academicGoals?: string;
  currentSchool?: string;
  curriculumTrack?: string;
  leadQualityScore?: number;
  conversionProbability?: number;
  preCallSummary?: string;
  keyInsights?: string[];
  keySellingPoints?: string[];
  keyObjections?: Array<{ objection: string; winningResponse: string; category: string }>;
  budgetTier?: string;
  timezone?: string;
  currentStage: PitchStageNumber;
  stageName: "Diagnostic" | "Curriculum Showcase" | "Pedagogy & Rigor" | "Tuition & Scholarship" | "Enrollment Close";
  parentEngagementScore: number; // 0 - 100
  scholarshipGrantedPercent: number; // e.g. 25
  tuitionTotal: number;
  discountedTuition: number;
  contractStatus: "pending" | "signed" | "declined";
  startedAt: string;
  durationSeconds?: number;
  notes?: string;
  isCallRecording?: boolean;
  recordingDurationSeconds?: number;
  talkToListenRatio?: { repPercent: number; leadPercent: number };
  liveSentiment?: "positive" | "neutral" | "hesitant" | "critical";
  liveCueCards?: PitchCueCard[];
  callTranscript?: PitchDialogueUtterance[];
  postCallAudit?: PitchCallAuditReport;
}

export interface RoomBomberConfig {
  active: boolean;
  ratio: "1:1" | "1:2";
  totalBreakoutRooms: number;
  scholarshipCapPercent: number;
  autoReturnToMainHall: boolean;
}

export interface CampusComment {
  id: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  timestamp: string;
}

export interface CampusPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorAvatar: string;
  content: string;
  mediaUrl?: string;
  codeSnippet?: string;
  category: "Academic Question" | "STEM Project" | "Campus Announcement" | "Peer Study Group" | "Research Paper";
  likes: number;
  likedByMe: boolean;
  comments: CampusComment[];
  safetyStatus: "approved" | "flagged" | "rejected";
  timestamp: string;
}

export interface UpcomingClassSchedule {
  id: string;
  title: string;
  subject: string;
  subjectCode: string;
  gradeLevel: number;
  curriculum: string;
  teacherName: string;
  teacherAvatar: string;
  roomSlug: string;
  shortUrl: string;
  dayDate: string;
  timeSlot: string;
  startsInSeconds: number;
  category: "Live Lecture" | "STEM Lab" | "Admissions Counseling" | "Doubt Resolution";
}

