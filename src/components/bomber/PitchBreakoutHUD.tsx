import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Flame,
  CheckCircle2,
  DollarSign,
  Award,
  ChevronRight,
  ChevronLeft,
  Percent,
  Sparkles,
  Phone,
  FileCheck,
  User,
  HeartHandshake,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  Zap,
} from "lucide-react";
import confetti from "canvas-confetti";
import { PitchRoomStatus, PitchStageNumber } from "../../types";

interface Props {
  pitchRoom?: PitchRoomStatus | null;
  onClose?: () => void;
}

export const PitchBreakoutHUD: React.FC<Props> = ({ pitchRoom, onClose }) => {
  const {
    currentRole,
    currentUser,
    updatePitchStage,
    applyPitchOffer,
    setActiveView,
    setIsRemoteAccessModalOpen,
  } = useClassroom();

  const [currentStep, setCurrentStep] = useState<PitchStageNumber>(pitchRoom?.currentStage || 1);
  const [scholarshipPercent, setScholarshipPercent] = useState<number>(pitchRoom?.scholarshipGrantedPercent || 0);
  const [contractSigned, setContractSigned] = useState<boolean>(pitchRoom?.contractStatus === "signed");
  const [counselorNotes, setCounselorNotes] = useState<string>(pitchRoom?.notes || "");

  const activeRoom = pitchRoom || {
    roomId: "bomber-room-1",
    roomName: "Academic counselling room 1",
    salesRepId: "host-1",
    salesRepName: currentUser?.name || "Dr. Evelyn Vance",
    studentId: "stu-1",
    studentName: "Sophia Chen",
    parentName: "Mrs. Linda Chen",
    parentEmail: "linda.chen@family.org",
    parentPhone: "+1 (555) 234-8901",
    gradeLevel: 10,
    academicGoals: "Quantum Computing & AP Physics Preparation",
    currentStage: 1 as PitchStageNumber,
    stageName: "Diagnostic" as const,
    parentEngagementScore: 84,
    scholarshipGrantedPercent: 0,
    tuitionTotal: 2400,
    discountedTuition: 2400,
    contractStatus: "pending" as const,
    startedAt: "09:15 AM",
  };

  const steps = [
    {
      num: 1,
      title: "Rapport & Diagnostic",
      talkingPoint: "Ask Mrs. Chen: What is Sophia's biggest hurdle in her current school's STEM program? Frame 21K as the accelerated environment she needs.",
      actionLabel: "Complete Diagnostic",
    },
    {
      num: 2,
      title: "Live Tech & Curriculum Demo",
      talkingPoint: "Guide Sophia to open her Tablet/PC screen. Demonstrate real-time multi-device remote control and 3D Bloch sphere simulation.",
      actionLabel: "Launch Remote Desk",
      actionAction: () => {
        setIsRemoteAccessModalOpen(true);
        setActiveView("remote_access");
      },
    },
    {
      num: 3,
      title: "Cambridge & IB Rigor",
      talkingPoint: "Explain our dual Cambridge IGCSE and IB Diploma alignment. Emphasize Harvard & MIT faculty mentorship.",
      actionLabel: "Confirm Academic Fit",
    },
    {
      num: 4,
      title: "Spot Scholarship Offer",
      talkingPoint: "Authorize the 25% Founder's Spot Scholarship. Emphasize that only 3 scholarship seats remain for the current cohort.",
      actionLabel: "Apply 25% Scholarship",
      actionAction: () => handleApplyDiscount(25),
    },
    {
      num: 5,
      title: "Instant Enrollment Close",
      talkingPoint: "Present digital enrollment agreement. Secure initial reservation deposit and celebrate student admission!",
      actionLabel: "Sign & Reserve Seat",
      actionAction: () => handleSignContract(),
    },
  ];

  const handleStepChange = (newStep: PitchStageNumber) => {
    setCurrentStep(newStep);
    updatePitchStage(activeRoom.roomId, newStep, steps[newStep - 1].title, counselorNotes);
  };

  const handleApplyDiscount = (pct: number) => {
    setScholarshipPercent(pct);
    applyPitchOffer(activeRoom.roomId, pct, false);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
  };

  const handleSignContract = () => {
    setContractSigned(true);
    applyPitchOffer(activeRoom.roomId, scholarshipPercent || 25, true);
    confetti({ particleCount: 100, spread: 100, origin: { y: 0.6 } });
  };

  const discountedTuition = Math.round(activeRoom.tuitionTotal * (1 - (scholarshipPercent || 0) / 100));

  return (
    <div className="bg-slate-900/70 border-b border-white/15 shadow-md font-sans text-slate-100 z-30">
      {/* Top Banner Bar */}
      <div className="h-10 px-4 bg-linear-to-r from-red-800 via-red-600 to-red-500 text-white flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
          <span className="font-bold uppercase tracking-wider text-2xs bg-white/20 px-2 py-0.5 rounded">
            1:1 Private Pitch Breakout
          </span>
          <span className="font-bold">{activeRoom.roomName}</span>
          <span className="text-rose-200">·</span>
          <span>Prospect: {activeRoom.studentName} & {activeRoom.parentName}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-mono text-2xs">
            <span className="text-rose-200">Parent Engagement:</span>
            <span className="font-bold text-emerald-300">
              {activeRoom.parentEngagementScore}% High Focus
            </span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:text-amber-200 text-xs font-bold transition-colors"
            >
              Minimize HUD
            </button>
          )}
        </div>
      </div>

      {/* Main HUD Body */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Left: Prospect Quick Dossier (3 Cols) */}
        <div className="lg:col-span-3 bg-white/[0.03] rounded-xl p-3 border border-white/10 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-300 uppercase tracking-wider text-2xs flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>Prospect File</span>
            </span>
            <span className="text-2xs font-mono font-bold text-slate-400">
              Grade {activeRoom.gradeLevel}
            </span>
          </div>

          <div className="text-slate-200">
            <div className="font-bold text-slate-100">{activeRoom.studentName}</div>
            <div className="text-2xs text-slate-400">Parent: {activeRoom.parentName}</div>
            <div className="text-2xs font-mono text-slate-300 flex items-center gap-1 mt-0.5">
              <Phone className="w-2.5 h-2.5 text-slate-400" />
              <span>{activeRoom.parentPhone}</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-white/10 text-2xs text-slate-300 truncate">
            Target: <span className="font-medium text-slate-100">{activeRoom.academicGoals}</span>
          </div>
        </div>

        {/* Center: Guided Pitch Step Navigator (6 Cols) */}
        <div className="lg:col-span-6 bg-blue-500/10 rounded-xl p-3 border border-blue-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-blue-300 text-xs">
                Step {currentStep} of 5: {steps[currentStep - 1].title}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentStep === 1}
                onClick={() => handleStepChange((currentStep - 1) as PitchStageNumber)}
                className="p-1 rounded bg-slate-900/70 border border-white/10 text-slate-300 hover:bg-white/[0.08] disabled:opacity-40 transition-colors"
                title="Previous Script Step"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={currentStep === 5}
                onClick={() => handleStepChange((currentStep + 1) as PitchStageNumber)}
                className="p-1 rounded bg-slate-900/70 border border-white/10 text-slate-300 hover:bg-white/[0.08] disabled:opacity-40 transition-colors"
                title="Next Script Step"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Script Guidance */}
          <p className="text-xs text-slate-200 font-sans leading-relaxed mb-3">
            {steps[currentStep - 1].talkingPoint}
          </p>

          {/* Step Actions */}
          <div className="flex items-center gap-2">
            {steps[currentStep - 1].actionAction ? (
              <button
                onClick={steps[currentStep - 1].actionAction}
                className="py-1.5 px-3 rounded-lg bg-brand-navy hover:bg-brand-navy-ink text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-yellow" />
                <span>{steps[currentStep - 1].actionLabel}</span>
              </button>
            ) : null}

            {currentStep < 5 && (
              <button
                onClick={() => handleStepChange((currentStep + 1) as PitchStageNumber)}
                className="py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-slate-100 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Advance to Step {currentStep + 1}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Closing & Scholarship Action (3 Cols) */}
        <div className="lg:col-span-3 bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-emerald-300 uppercase tracking-wider text-2xs">
                Tuition & Scholarship
              </span>
              <span className="font-mono font-bold text-emerald-300 text-2xs">
                {scholarshipPercent > 0 ? `-${scholarshipPercent}% Spot Grant` : "Full Rate"}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-mono text-xl font-black text-emerald-300">
                ${discountedTuition}
              </span>
              <span className="text-2xs text-slate-400">/academic year</span>
              {scholarshipPercent > 0 && (
                <span className="text-2xs text-slate-400 line-through">
                  ${activeRoom.tuitionTotal}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            {!contractSigned ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApplyDiscount(25)}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-2xs border transition-colors ${
                    scholarshipPercent === 25
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-slate-900/70 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10"
                  }`}
                >
                  <Percent className="w-3 h-3 inline mr-1" />
                  Apply 25% Off
                </button>
                <button
                  onClick={handleSignContract}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-2xs shadow-xs transition-colors"
                >
                  Sign & Close
                </button>
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Seat Reserved · Contract Signed!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
