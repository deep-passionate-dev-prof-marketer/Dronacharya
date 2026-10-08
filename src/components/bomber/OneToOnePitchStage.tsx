import React, { useState, useEffect, useRef } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  ShieldAlert,
  ShieldCheck,
  Flame,
  Award,
  DollarSign,
  TrendingUp,
  Percent,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Clock,
  User,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Disc,
  Download,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  FileText,
  Send,
  Zap,
  RotateCcw,
  BookOpen,
  Volume2,
  Copy,
  ExternalLink,
  Laptop,
  HelpCircle,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  PitchRoomStatus,
  PitchStageNumber,
  PitchCallAuditReport,
  PitchDialogueUtterance,
  PitchCueCard,
} from "../../types";
import {
  LEAD_INTELLIGENCE_REGISTRY,
  generateLiveCueCards,
  calculateCallDynamics,
  generatePitchCallAuditReport,
  LeadIntelligenceDossier,
} from "../../services/salesIntelligenceEngine";
import { realtimeSocket } from "../../services/realtimeSocket";

interface Props {
  pitchRoom: PitchRoomStatus;
  onExit: () => void;
}

export const OneToOnePitchStage: React.FC<Props> = ({ pitchRoom, onExit }) => {
  const {
    currentRole,
    currentUser,
    authenticatedUser,
    localStream,
    isAudioMuted,
    isVideoOff,
    toggleAudio,
    toggleVideo,
    isRecording,
    startRecording,
    stopRecording,
    setActiveView,
    updatePitchStage,
    applyPitchOffer,
  } = useClassroom();

  const activeUserId = authenticatedUser?.id || currentUser?.id || "sales-kabir";
  const activeUserEmail = authenticatedUser?.email || "k.mehta@admissions.21k.school";

  // -------------------------------------------------------------
  // 1. STRICT ACCESS ENFORCEMENT GATE: ONLY ASSIGNED AGENT
  // -------------------------------------------------------------
  const isAssignedAgent =
    currentRole === "admin" ||
    pitchRoom.salesRepId === activeUserId ||
    pitchRoom.assignedRepEmail === activeUserEmail ||
    pitchRoom.salesRepName.toLowerCase().includes(authenticatedUser?.name?.toLowerCase() || "");

  const isAssignedLead =
    currentRole === "admin" ||
    currentRole === "instructor" ||
    currentRole === "sales_rep" ||
    pitchRoom.studentId === activeUserId ||
    pitchRoom.parentEmail === activeUserEmail;

  // -------------------------------------------------------------
  // Intelligence Dossier & State
  // -------------------------------------------------------------
  const leadIntelligence: LeadIntelligenceDossier =
    LEAD_INTELLIGENCE_REGISTRY[pitchRoom.studentId] ||
    LEAD_INTELLIGENCE_REGISTRY["lead-101"];

  const [activeTab, setActiveTab] = useState<"dossier" | "copilot" | "transcript" | "contract">("dossier");
  const [currentStep, setCurrentStep] = useState<PitchStageNumber>(pitchRoom.currentStage || 1);
  const [scholarshipPercent, setScholarshipPercent] = useState<number>(pitchRoom.scholarshipGrantedPercent || 0);
  const [contractSigned, setContractSigned] = useState<boolean>(pitchRoom.contractStatus === "signed");
  const [counselorNotes, setCounselorNotes] = useState<string>(pitchRoom.notes || "");

  // Real-time call recording and timer
  const [callDurationSeconds, setCallDurationSeconds] = useState<number>(pitchRoom.durationSeconds || 140);
  const [isCallLive, setIsCallLive] = useState<boolean>(true);
  const [mobilePitchView, setMobilePitchView] = useState<"video" | "cockpit">("video");
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Live Transcript Dialogue & Cue Cards
  const [transcript, setTranscript] = useState<PitchDialogueUtterance[]>([
    {
      id: "ut-1",
      speaker: pitchRoom.salesRepName,
      role: "sales_rep",
      text: `Hello ${pitchRoom.parentName}! Welcome to our 1:1 consultation session. We are thrilled to review ${pitchRoom.studentName}'s academic transition today.`,
      timestamp: "00:15",
    },
    {
      id: "ut-2",
      speaker: pitchRoom.parentName,
      role: "lead",
      text: `Thank you for having us. We are currently quite disappointed by the traditional school setup—the curriculum pacing is too rigid, and there are almost no real STEM laboratory opportunities for ${pitchRoom.studentName}.`,
      timestamp: "00:48",
      sentiment: "hesitant",
    },
    {
      id: "ut-3",
      speaker: pitchRoom.salesRepName,
      role: "sales_rep",
      text: `I completely understand. That is precisely why hundreds of families switch to 21K School. Let me share how our small 1:4 cohorts and live 3D simulations empower ${pitchRoom.studentName}.`,
      timestamp: "01:20",
    },
    {
      id: "ut-4",
      speaker: pitchRoom.parentName,
      role: "lead",
      text: "Our main question is regarding accreditation and universities. Is the online diploma fully recognized and valid without any credit loss?",
      timestamp: "02:10",
      sentiment: "hesitant",
    },
  ]);

  const [liveCueCards, setLiveCueCards] = useState<PitchCueCard[]>(() =>
    generateLiveCueCards("accreditation valid recognized")
  );

  const [customLeadInput, setCustomLeadInput] = useState<string>("");
  const [selectedObjectionIndex, setSelectedObjectionIndex] = useState<number | null>(0);

  // Post-Call AI Audit Modal State
  const [auditReport, setAuditReport] = useState<PitchCallAuditReport | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [isSyncingCrm, setIsSyncingCrm] = useState<boolean>(false);
  const [crmSyncedToast, setCrmSyncedToast] = useState<boolean>(false);

  // Call timer effect
  useEffect(() => {
    if (!isCallLive) return;
    const interval = setInterval(() => {
      setCallDurationSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isCallLive]);

  // Video stream ref
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOff]);

  const dynamics = calculateCallDynamics(transcript);
  const discountedTuition = Math.round(
    pitchRoom.tuitionTotal * (1 - (scholarshipPercent || 0) / 100)
  );

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // -------------------------------------------------------------
  // If Access Denied: Render Lock Shield
  // -------------------------------------------------------------
  if (!isAssignedAgent) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-950 p-6 select-none font-sans text-white">
        <div className="w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center mx-auto text-rose-400">
            <ShieldAlert className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 font-mono text-xs font-bold uppercase tracking-wider border border-rose-500/30">
              Cryptographic 1:1 Isolation Guard
            </span>
            <h2 className="text-2xl font-black text-white">1:1 Breakout Access Denied</h2>
            <p className="text-sm text-slate-300">
              This private pitch breakout is cryptographically locked and restricted exclusively to the assigned counselor:
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Assigned Counselor:</span>
              <span className="font-bold text-amber-400">{pitchRoom.salesRepName}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Authorized Agent ID:</span>
              <span className="font-mono text-slate-300">{pitchRoom.salesRepId}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Prospect Target:</span>
              <span className="font-semibold text-white">
                {pitchRoom.studentName} ({pitchRoom.parentName})
              </span>
            </div>
          </div>

          <p className="text-xs text-rose-400/80 italic">
            To prevent sales conflict and maintain customer confidentiality, unauthorized team members cannot observe or enter this room.
          </p>

          <button
            onClick={onExit}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors cursor-pointer"
          >
            Return to Sales Command Hub
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Handle Script Step Progress
  // -------------------------------------------------------------
  const SCRIPT_STEPS = [
    {
      num: 1,
      title: "Discovery & Academic Diagnosis",
      action: "Identify student's specific friction points and academic ambitions.",
    },
    {
      num: 2,
      title: "Interactive Tech & Curriculum Demo",
      action: "Guide student to test WebXR 3D quantum lab simulation and remote IDE.",
    },
    {
      num: 3,
      title: "Accreditation & Faculty Mentorship",
      action: "Prove Cambridge/Cognia university transferability with official Hague Apostille seal.",
    },
    {
      num: 4,
      title: "Spot Scholarship Grant Authorization",
      action: "Deploy 25% Founder's Spot Scholarship with immediate fee re-calculation.",
    },
    {
      num: 5,
      title: "Instant Digital Agreement & Seat Reservation",
      action: "Present live enrollment agreement and secure digital signature.",
    },
  ];

  const handleStepChange = (newStep: PitchStageNumber) => {
    setCurrentStep(newStep);
    updatePitchStage(pitchRoom.roomId, newStep, SCRIPT_STEPS[newStep - 1].title, counselorNotes);
  };

  const handleApplyScholarship = (pct: number) => {
    setScholarshipPercent(pct);
    applyPitchOffer(pitchRoom.roomId, pct, false);
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.8 } });
  };

  const handleSignAgreement = () => {
    setContractSigned(true);
    applyPitchOffer(pitchRoom.roomId, scholarshipPercent || 25, true);
    confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 } });
  };

  // Add custom simulated utterance to test AI teleprompter
  const handleAddTestLeadUtterance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLeadInput.trim()) return;

    const newUtterance: PitchDialogueUtterance = {
      id: `ut-${Date.now()}`,
      speaker: pitchRoom.parentName,
      role: "lead",
      text: customLeadInput.trim(),
      timestamp: formatTime(callDurationSeconds),
      sentiment: customLeadInput.toLowerCase().includes("cost") ? "hesitant" : "neutral",
    };

    const newTranscript = [...transcript, newUtterance];
    setTranscript(newTranscript);

    // Auto trigger dynamic cue cards
    const newCues = generateLiveCueCards(customLeadInput);
    if (newCues.length > 0) {
      setLiveCueCards((prev) => [...newCues, ...prev]);
    }

    setCustomLeadInput("");
  };

  // End Call & Generate Deep Tech AI Audit
  const handleEndCallAndAudit = () => {
    setIsCallLive(false);
    if (isRecording) stopRecording();

    const report = generatePitchCallAuditReport(
      {
        ...pitchRoom,
        contractStatus: contractSigned ? "signed" : "pending",
        scholarshipGrantedPercent: scholarshipPercent,
      },
      transcript,
      callDurationSeconds
    );

    setAuditReport(report);
    setIsAuditModalOpen(true);
  };

  const handleSyncToCrm = () => {
    setIsSyncingCrm(true);
    setTimeout(() => {
      setIsSyncingCrm(false);
      setCrmSyncedToast(true);
      setTimeout(() => setCrmSyncedToast(false), 3000);
    }, 1200);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#070b14] font-sans text-slate-100 overflow-hidden relative">
      {/* Top 1:1 Executive Status Strip */}
      <div className="h-12 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-linear-to-r from-red-600 to-rose-600 text-white text-xs font-bold shadow-md">
            <Flame className="w-3.5 h-3.5 animate-pulse" />
            <span>1:1 Video Pitch Breakout</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="font-mono text-slate-300 font-bold">{pitchRoom.roomName}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">Prospect:</span>
            <span className="text-white font-semibold">
              {pitchRoom.studentName} & {pitchRoom.parentName}
            </span>
          </div>

          {/* E2EE Lock Badge */}
          <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
            <ShieldCheck className="w-3 h-3" />
            <span>E2EE 256-bit Encrypted</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Recording Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 font-mono text-xs font-bold">
            <Disc className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span>REC {formatTime(callDurationSeconds)}</span>
          </div>

          {/* Talk-to-Listen Live Monitor */}
          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg">
            <span className="text-slate-400">Talk Ratio:</span>
            <span className={`font-bold ${dynamics.isMonopolizing ? "text-rose-400" : "text-emerald-400"}`}>
              Rep {dynamics.repPercent}% : {dynamics.leadPercent}% Parent
            </span>
          </div>

          {/* Mobile Screen Segmented Switcher */}
          {isMobileScreen && (
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setMobilePitchView("video")}
                className={`px-2 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
                  mobilePitchView === "video"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                1:1 Video
              </button>
              <button
                onClick={() => setMobilePitchView("cockpit")}
                className={`px-2 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
                  mobilePitchView === "cockpit"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                AI Cockpit
              </button>
            </div>
          )}

          {/* End Call & Audit Button */}
          <button
            onClick={handleEndCallAndAudit}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 min-h-[36px]"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">End Call & Audit via AI</span>
            <span className="sm:hidden">End & Audit</span>
          </button>
        </div>
      </div>

      {/* Main Split Body: Video Stage (Left) + Sales Intelligence Cockpit (Right) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: 1:1 Video Conference Grid */}
        <div
          className={`flex-1 flex flex-col bg-[#060911] overflow-hidden p-2 sm:p-4 relative ${
            isMobileScreen && mobilePitchView !== "video" ? "hidden" : "flex"
          }`}
        >
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center max-w-5xl mx-auto w-full">
            {/* Tile 1: Assigned Counselor (Local Sales Rep) */}
            <div className="w-full h-full max-h-[460px] rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden relative shadow-2xl flex flex-col items-center justify-center">
              {localStream && !isVideoOff ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover -scale-x-100"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 p-6">
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-xl mb-3"
                    style={{ backgroundColor: "#EA580C" }}
                  >
                    {pitchRoom.salesRepName.charAt(0)}
                  </div>
                  <h3 className="font-bold text-white text-base">{pitchRoom.salesRepName}</h3>
                  <p className="text-xs text-amber-400 font-mono mt-0.5">
                    Authorized Admissions Counselor (You)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">21K School Global Admissions</p>

                  {/* Equalizer */}
                  <div className="flex items-center gap-1 mt-4">
                    <span className="w-1 h-3 rounded bg-amber-500 animate-pulse" />
                    <span className="w-1 h-6 rounded bg-amber-400 animate-pulse delay-75" />
                    <span className="w-1 h-4 rounded bg-amber-500 animate-pulse delay-150" />
                    <span className="w-1 h-2 rounded bg-amber-400 animate-pulse delay-100" />
                  </div>
                </div>
              )}

              {/* Bottom Badge */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs pointer-events-none">
                <div className="px-2.5 py-1 rounded bg-black/70 backdrop-blur border border-white/10 font-mono text-[11px] text-slate-200">
                  <span>{pitchRoom.salesRepName} (Host)</span>
                </div>
                <div className="flex items-center gap-1.5 pointer-events-auto">
                  <button
                    onClick={toggleAudio}
                    className={`p-1.5 rounded bg-black/70 backdrop-blur border border-white/10 ${
                      isAudioMuted ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {isAudioMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={toggleVideo}
                    className={`p-1.5 rounded bg-black/70 backdrop-blur border border-white/10 ${
                      isVideoOff ? "text-rose-400" : "text-slate-300"
                    }`}
                  >
                    {isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <VideoIcon className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Tile 2: Prospect (Parent & Student) */}
            <div className="w-full h-full max-h-[460px] rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden relative shadow-2xl flex flex-col items-center justify-center">
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 p-6">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-xl mb-3 ring-4 ring-indigo-500/30"
                  style={{ backgroundColor: "#0082FF" }}
                >
                  {pitchRoom.studentName.charAt(0)}
                </div>
                <h3 className="font-bold text-white text-base">{pitchRoom.studentName}</h3>
                <p className="text-xs text-indigo-300 font-medium mt-0.5">
                  Parent: {pitchRoom.parentName}
                </p>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                    Grade {pitchRoom.gradeLevel}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                    {leadIntelligence.curriculumTrack}
                  </span>
                </div>

                {/* Live Speaking Equalizer */}
                <div className="flex items-center gap-1 mt-4">
                  <span className="w-1 h-4 rounded bg-indigo-500 animate-pulse" />
                  <span className="w-1 h-7 rounded bg-indigo-400 animate-pulse delay-75" />
                  <span className="w-1 h-3 rounded bg-indigo-500 animate-pulse delay-150" />
                  <span className="w-1 h-5 rounded bg-indigo-400 animate-pulse delay-100" />
                </div>
              </div>

              {/* Bottom Badge */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs pointer-events-none">
                <div className="px-2.5 py-1 rounded bg-black/70 backdrop-blur border border-white/10 font-mono text-[11px] text-slate-200 flex items-center gap-2">
                  <span>{pitchRoom.parentName} & {pitchRoom.studentName}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <div className="px-2 py-1 rounded bg-black/70 backdrop-blur border border-white/10 text-[10px] font-mono text-cyan-300">
                  Madrid (CET) · Laptop
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Subtitle / Closed Caption Strip */}
          <div className="mt-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3 max-w-5xl mx-auto w-full backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white uppercase text-[10px] tracking-wider">
                Live Speech Subtitles:
              </span>
              <span className="font-mono text-[11px] text-cyan-300">
                {transcript[transcript.length - 1]?.speaker || pitchRoom.parentName}
              </span>
            </div>
            <p className="text-xs text-slate-200 italic font-sans leading-relaxed">
              "{transcript[transcript.length - 1]?.text || "Awaiting live voice feed..."}"
            </p>
          </div>
        </div>

        {/* Right Side: Deep Tech Assigned Agent Intelligence Cockpit */}
        <div
          className={`${
            isMobileScreen
              ? mobilePitchView === "cockpit"
                ? "flex-1 w-full"
                : "hidden"
              : "w-96 lg:w-[420px]"
          } bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 z-10 shadow-2xl`}
        >
          {/* Cockpit Tab Selector */}
          <div className="grid grid-cols-4 bg-slate-950 p-1 border-b border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab("dossier")}
              className={`py-2 px-1 text-center font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === "dossier"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Dossier
            </button>
            <button
              onClick={() => setActiveTab("copilot")}
              className={`py-2 px-1 text-center font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === "copilot"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Co-Pilot
            </button>
            <button
              onClick={() => setActiveTab("transcript")}
              className={`py-2 px-1 text-center font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === "transcript"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Transcript
            </button>
            <button
              onClick={() => setActiveTab("contract")}
              className={`py-2 px-1 text-center font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === "contract"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Closer
            </button>
          </div>

          {/* Tab 1: Lead Intelligence Dossier */}
          {activeTab === "dossier" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Quality Score & Probability Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">
                    Lead Quality Score
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-amber-400">
                      {leadIntelligence.leadQualityScore}
                    </span>
                    <span className="text-slate-500 font-mono">/100</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold mt-1">
                    Tier-1 High Intent
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">
                    Close Likelihood
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-emerald-400">
                      {leadIntelligence.conversionProbability}%
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1">
                    Decision Maker On Call
                  </span>
                </div>
              </div>

              {/* Pre-Call AI Background Brief */}
              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/60 space-y-2">
                <div className="flex items-center gap-1.5 text-blue-300 font-bold uppercase text-[10px] tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pre-Call AI Briefing (CRM Ingestion)</span>
                </div>
                <p className="text-slate-200 leading-relaxed text-xs">
                  {leadIntelligence.preCallSummary}
                </p>
                <div className="pt-2 border-t border-blue-900/60 text-[11px] text-slate-400 space-y-1">
                  <div>
                    Current School: <span className="text-white font-medium">{leadIntelligence.currentSchool}</span>
                  </div>
                  <div>
                    Budget Tier: <span className="text-amber-300 font-medium">{leadIntelligence.budgetTier}</span>
                  </div>
                </div>
              </div>

              {/* Key Value Anchors / Personalization Hooks */}
              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>Key Value Anchors (What Matters Most)</span>
                </h4>
                <div className="space-y-1.5">
                  {leadIntelligence.keySellingPoints.map((point, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 leading-normal flex items-start gap-2"
                    >
                      <span className="text-blue-400 font-bold">✓</span>
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Objection Forecast with 1-Click Winning Counter-Tracks */}
              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Predicted Objections & Winning Scripts</span>
                </h4>
                <div className="space-y-2">
                  {leadIntelligence.objectionForecast.map((obj, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        selectedObjectionIndex === idx
                          ? "bg-slate-950 border-amber-500/60 ring-1 ring-amber-500/30"
                          : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                      }`}
                      onClick={() => setSelectedObjectionIndex(idx)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 uppercase">
                          {obj.category}
                        </span>
                        <span className="text-[10px] text-slate-400">Click to view counter</span>
                      </div>
                      <p className="font-bold text-slate-200 mb-2">"{obj.objection}"</p>

                      {selectedObjectionIndex === idx && (
                        <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-700/50 text-emerald-200 text-xs leading-relaxed">
                          <span className="font-bold text-emerald-400 block mb-1">
                            Winning Pitch Track:
                          </span>
                          "{obj.winningResponse}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Live AI Teleprompter & Flaw Radar */}
          {activeTab === "copilot" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Talk-to-Listen Meter & Over-Monologue Warning */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white uppercase text-[10px] tracking-wider">
                    Talk-to-Listen Cadence
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      dynamics.isMonopolizing ? "text-rose-400 animate-pulse" : "text-emerald-400"
                    }`}
                  >
                    Rep: {dynamics.repPercent}% | Lead: {dynamics.leadPercent}%
                  </span>
                </div>

                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
                  <div
                    className={`h-full transition-all ${
                      dynamics.isMonopolizing ? "bg-rose-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${dynamics.repPercent}%` }}
                  />
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${dynamics.leadPercent}%` }}
                  />
                </div>

                {dynamics.isMonopolizing ? (
                  <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 flex items-center gap-2 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      <strong>Warning:</strong> You are talking {dynamics.repPercent}% of the time. Pause and ask an open-ended question to let the parent speak!
                    </span>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400">
                    Optimal consultative pace. Discovery conversation is balanced.
                  </div>
                )}
              </div>

              {/* Dynamic Live Cue Cards */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Live AI Teleprompter Cue Cards</span>
                  </h4>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {liveCueCards.length} Active Cues
                  </span>
                </div>

                <div className="space-y-2">
                  {liveCueCards.map((cue) => (
                    <div
                      key={cue.id}
                      className="p-3 rounded-xl bg-blue-950/40 border border-blue-700/60 space-y-1.5 animate-fadeIn"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-600 text-white uppercase">
                          {cue.triggerKeyword}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{cue.timestamp}</span>
                      </div>
                      <p className="text-slate-200 leading-relaxed font-sans">{cue.advice}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step-by-Step Script Navigator */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                    Script Stage Navigator (Step {currentStep}/5)
                  </h4>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={currentStep === 1}
                      onClick={() => handleStepChange((currentStep - 1) as PitchStageNumber)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={currentStep === 5}
                      onClick={() => handleStepChange((currentStep + 1) as PitchStageNumber)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-amber-400">
                    {SCRIPT_STEPS[currentStep - 1].title}
                  </div>
                  <p className="text-slate-300 leading-normal">
                    {SCRIPT_STEPS[currentStep - 1].action}
                  </p>
                  <button
                    onClick={() => {
                      if (currentStep < 5) handleStepChange((currentStep + 1) as PitchStageNumber);
                    }}
                    className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Mark Stage Complete & Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Live Dual Transcript */}
          {activeTab === "transcript" && (
            <div className="flex-1 flex flex-col overflow-hidden p-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3 text-xs">
                <span className="font-bold text-white uppercase text-[10px] tracking-wider">
                  Live Dual-Speaker Stream
                </span>
                <span className="font-mono text-slate-400 text-[10px]">
                  {transcript.length} Utterances
                </span>
              </div>

              {/* Dialogue Log */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {transcript.map((u) => {
                  const isRep = u.role === "sales_rep";
                  return (
                    <div
                      key={u.id}
                      className={`p-3 rounded-xl border leading-relaxed text-xs space-y-1 ${
                        isRep
                          ? "bg-slate-950 border-slate-800 ml-4"
                          : "bg-blue-950/30 border-blue-900/60 mr-4"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span
                          className={`font-bold uppercase tracking-wider ${
                            isRep ? "text-amber-400" : "text-cyan-300"
                          }`}
                        >
                          {u.speaker}
                        </span>
                        <span className="font-mono text-slate-500">{u.timestamp}</span>
                      </div>
                      <p className="text-slate-200">{u.text}</p>
                    </div>
                  );
                })}
              </div>

              {/* Simulation input to test objection cue popping */}
              <form onSubmit={handleAddTestLeadUtterance} className="mt-3 pt-3 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  placeholder="Simulate parent objection (e.g. 'Is tuition expensive?')..."
                  value={customLeadInput}
                  onChange={(e) => setCustomLeadInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                >
                  Send
                </button>
              </form>
            </div>
          )}

          {/* Tab 4: Instant Deal Closer & Digital Agreement */}
          {activeTab === "contract" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/70 to-slate-950 border border-emerald-600/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 uppercase text-[10px] tracking-wider">
                    Instant Tuition & Scholarship Closer
                  </span>
                  <span className="font-mono font-bold text-amber-400">
                    {scholarshipPercent > 0 ? `-${scholarshipPercent}% Grant` : "Full Quote"}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-400">
                    ${discountedTuition}
                  </span>
                  <span className="text-slate-400 text-xs">/academic year</span>
                  {scholarshipPercent > 0 && (
                    <span className="text-xs line-through text-slate-500">
                      ${pitchRoom.tuitionTotal}
                    </span>
                  )}
                </div>

                {/* Spot Scholarship Discount Levers */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Authorize Founder's Spot Grant:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[15, 25, 35].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => handleApplyScholarship(pct)}
                        className={`py-2 px-1 rounded-lg font-bold text-xs transition-all cursor-pointer border ${
                          scholarshipPercent === pct
                            ? "bg-emerald-600 text-white border-emerald-500 shadow-lg"
                            : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800"
                        }`}
                      >
                        {pct}% Off
                      </button>
                    ))}
                  </div>
                </div>

                {/* Agreement Presentation & Sign Button */}
                {!contractSigned ? (
                  <div className="pt-2 space-y-2">
                    <p className="text-[11px] text-slate-300 leading-normal">
                      Push digital agreement directly to {pitchRoom.parentName}'s screen to reserve {pitchRoom.studentName}'s seat right now.
                    </p>
                    <button
                      onClick={handleSignAgreement}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5 text-slate-950" />
                      <span>Push & Sign Agreement ($500 Deposit)</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-center space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <h4 className="font-black text-emerald-300 text-sm">
                      Enrollment Agreement Signed!
                    </h4>
                    <p className="text-[11px] text-emerald-200">
                      Deposit verified. Seat officially reserved for {pitchRoom.studentName}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* POST-CALL AI AUDIT & FLAW HIGHLIGHTING MODAL */}
      {/* ------------------------------------------------------------- */}
      {isAuditModalOpen && auditReport && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none font-sans text-white animate-fadeIn">
          <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                  <Sparkles className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Post-Call AI Audit & Flaw Highlight Report
                  </h3>
                  <p className="text-xs text-slate-400">
                    Call with {pitchRoom.parentName} ({pitchRoom.studentName}) · Duration: {auditReport.durationFormatted}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsAuditModalOpen(false);
                  onExit();
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Overall Score Banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-blue-500/40 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-full border-4 border-amber-400 flex items-center justify-center text-3xl font-black text-amber-300 shadow-xl">
                    {auditReport.overallScore}
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                      Overall Sales Call Score
                    </span>
                    <h4 className="text-xl font-bold text-white mt-1">
                      {auditReport.overallScore >= 85 ? "High-Converting Master Pitch" : "Solid Pitch with Detectable Flaws"}
                    </h4>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Talk Ratio: {auditReport.talkToListenRatio.repPercent}% Rep vs {auditReport.talkToListenRatio.leadPercent}% Parent
                    </p>
                  </div>
                </div>

                {/* Score Rubric Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Discovery</span>
                    <span className="text-lg font-black text-blue-400">{auditReport.discoveryScore}%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Value Pitch</span>
                    <span className="text-lg font-black text-indigo-400">{auditReport.valueArticulationScore}%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Objections</span>
                    <span className="text-lg font-black text-amber-400">{auditReport.objectionHandlingScore}%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Closing</span>
                    <span className="text-lg font-black text-emerald-400">{auditReport.closingDecisivenessScore}%</span>
                  </div>
                </div>
              </div>

              {/* Highlighted Flaws & Infractions (Critical Misses) */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Highlighted Flaws & Critical Misses (AI Detected)</span>
                </h4>

                {auditReport.highlightedFlaws.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
                    No critical flaws detected! Exceptional consultative pitch discipline.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditReport.highlightedFlaws.map((flaw) => (
                      <div
                        key={flaw.id}
                        className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/60 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-600 text-white uppercase">
                              [{flaw.timestamp}] {flaw.severity}
                            </span>
                            <span className="font-bold text-white text-xs">{flaw.flaw}</span>
                          </div>
                          <span className="text-slate-400 font-mono text-[10px] capitalize">
                            Category: {flaw.flawCategory}
                          </span>
                        </div>

                        <p className="text-rose-200/90 leading-relaxed text-xs">
                          <strong>Impact:</strong> {flaw.impact}
                        </p>

                        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-emerald-300 text-xs leading-relaxed">
                          <strong className="text-emerald-400">Winning Alternative Approach:</strong> {flaw.betterApproach}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Winning Moments */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Winning Moments & Best Practices</span>
                </h4>
                <div className="space-y-2">
                  {auditReport.winningMoments.map((win) => (
                    <div
                      key={win.id}
                      className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/60 flex items-start gap-3"
                    >
                      <span className="font-mono text-emerald-400 font-bold shrink-0">
                        [{win.timestamp}]
                      </span>
                      <div>
                        <div className="font-bold text-emerald-300 text-xs">{win.achievement}</div>
                        <p className="text-slate-300 mt-0.5 leading-normal">{win.reproducibleTip}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable AI Coaching Directives */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-amber-400 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Actionable AI Directives for Next Call</span>
                </h4>
                <ul className="space-y-1.5 text-slate-300 pl-4 list-disc">
                  {auditReport.aiCoachingDirectives.map((dir, idx) => (
                    <li key={idx}>{dir}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Footer: CRM Sync & Close */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs">
                {crmSyncedToast ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Synced to HubSpot & Salesforce CRM!
                  </span>
                ) : (
                  <span className="text-slate-400 font-mono">
                    Audio & Video recording stored in secure cloud vault.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSyncToCrm}
                  disabled={isSyncingCrm}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{isSyncingCrm ? "Syncing to CRM..." : "Sync Audit to CRM"}</span>
                </button>
                <button
                  onClick={() => {
                    setIsAuditModalOpen(false);
                    onExit();
                  }}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Done & Exit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
