import React, { useState, useEffect } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Flame,
  Users,
  UserCheck,
  Zap,
  RotateCcw,
  Sparkles,
  Award,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Percent,
  Radio,
  Eye,
  ExternalLink,
} from "lucide-react";
import { PitchRoomStatus, Participant } from "../../types";
import { realtimeSocket } from "../../services/realtimeSocket";

export const RoomBomberControlCenter: React.FC = () => {
  const {
    participants,
    currentRole,
    currentUser,
    authenticatedUser,
    pitchRooms,
    isRoomBomberActive,
    triggerRoomBomber,
    resetRoomBomber,
    setActivePitchRoom,
    setRoomId,
    setRoomTitle,
    setActiveView,
  } = useClassroom();

  const [ratio, setRatio] = useState<"1:1" | "1:2">("1:1");
  const [scholarshipCap, setScholarshipCap] = useState(25);
  const [isTriggering, setIsTriggering] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const handleJoinOneToOneRoom = (room: PitchRoomStatus) => {
    setActivePitchRoom(room);
    setRoomId(room.roomId);
    setRoomTitle(`${room.roomName} · 1:1 Pitch Breakout`);
    setActiveView("classroom");
  };

  // Filter students and sales reps
  const students = participants.filter((p) => p.role === "student");
  const studentCount = students.length || 4;
  const calculatedRoomsNeeded = ratio === "1:1" ? studentCount : Math.ceil(studentCount / 2);

  const handleExecuteBomb = () => {
    setIsTriggering(true);
    triggerRoomBomber({
      ratio,
      scholarshipCapPercent: scholarshipCap,
    });
    setTimeout(() => {
      setIsTriggering(false);
    }, 1000);
  };

  const handleRecallAll = () => {
    resetRoomBomber();
  };

  const selectedRoom = pitchRooms.find((r) => r.roomId === selectedRoomId) || pitchRooms[0];

  return (
    <div className="w-full h-full flex flex-col bg-[#070b14] overflow-y-auto font-sans p-3 sm:p-4 lg:p-6">
      {/* Top Header Card */}
      <div className="bg-linear-to-r from-[#991B1B] via-[#DC2626] to-[#EF4444] rounded-2xl p-4 sm:p-6 text-white shadow-xl relative overflow-hidden mb-4 sm:mb-6 shrink-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-[#FFBB00] text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2 border border-white/20 max-w-full">
              <Flame className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Room Bomber 1:1 High-Conversion Sales Engine</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black leading-tight">
              Executive Sales Partition & Pitch HUD Command
            </h1>
            <p className="text-sm text-rose-100 max-w-2xl mt-1">
              Instantly bomb the main aggregate demo hall into dedicated 1:1 breakout rooms pairing each student & parent with a specialized admissions counselor.
            </p>
          </div>

          {/* Trigger Action Cluster */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:shrink-0">
            {isRoomBomberActive ? (
              <button
                onClick={handleRecallAll}
                className="px-5 py-3 rounded-xl bg-slate-900/70 text-slate-100 hover:bg-white/[0.08] font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-rose-300" />
                <span>Recall All to Main Hall</span>
              </button>
            ) : (
              <button
                onClick={handleExecuteBomb}
                disabled={isTriggering}
                className="px-6 py-3.5 rounded-xl bg-[#FFBB00] hover:bg-[#e6a800] text-[#001F40] font-black text-sm flex items-center gap-2.5 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 cursor-pointer uppercase tracking-wider"
              >
                <Zap className="w-5 h-5 text-slate-100 fill-current animate-bounce" />
                <span>{isTriggering ? "Initiating Admissions Pitch..." : "Execute Admissions Breakout"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/20">
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] font-bold text-rose-200 uppercase tracking-wider block">
              Students Available
            </span>
            <div className="mt-1.5 flex items-baseline gap-x-1.5 gap-y-0.5 flex-wrap min-w-0">
              <Users className="shrink-0 self-center w-4 h-4 text-[#FFBB00]" />
              <span className="text-xl sm:text-2xl font-black text-white leading-none tabular-nums">{studentCount}</span>
              <span className="text-xs font-semibold text-white/70 leading-tight">Prospective Families</span>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] font-bold text-rose-200 uppercase tracking-wider block">
              1:1 Breakout Partition
            </span>
            <div className="mt-1.5 flex items-baseline gap-x-1.5 gap-y-0.5 flex-wrap min-w-0">
              <Sparkles className="shrink-0 self-center w-4 h-4 text-amber-300" />
              <span className="text-xl sm:text-2xl font-black text-white leading-none tabular-nums">{calculatedRoomsNeeded}</span>
              <span className="text-xs font-semibold text-white/70 leading-tight">Isolated Rooms</span>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] font-bold text-rose-200 uppercase tracking-wider block">
              Target Ratio
            </span>
            <div className="mt-1.5 flex items-baseline gap-x-1.5 gap-y-0.5 flex-wrap min-w-0">
              <UserCheck className="shrink-0 self-center w-4 h-4 text-emerald-300" />
              <span className="text-xl sm:text-2xl font-black text-white leading-none tabular-nums">1:1</span>
              <span className="text-xs font-semibold text-white/70 leading-tight">rep per family</span>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] font-bold text-rose-200 uppercase tracking-wider block">
              Conversion Status
            </span>
            <div className="mt-1.5 flex items-baseline gap-x-1.5 gap-y-0.5 flex-wrap min-w-0">
              <TrendingUp className="shrink-0 self-center w-4 h-4 text-cyan-300" />
              <span className="text-xl sm:text-2xl font-black text-white leading-none tabular-nums">{pitchRooms.filter((r) => r.contractStatus === "signed").length}</span>
              <span className="text-xs font-semibold text-white/70 leading-tight">/ {pitchRooms.length || calculatedRoomsNeeded} Closed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Active Breakout Matrix, Right Live Room Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[460px]">
        {/* Left Column: 1:1 Breakout Rooms Matrix (8 Cols) */}
        <div className="lg:col-span-8 bg-slate-900/70 rounded-2xl border border-white/10 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-300 animate-pulse" />
                <span>Active 1:1 Room Bomber Sales Breakouts</span>
              </h2>
              <p className="text-xs text-slate-400">
                Real-time bird's-eye monitor of all private sales pitch breakouts currently in session.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-300">Breakout Ratio:</span>
              <button
                onClick={() => setRatio("1:1")}
                className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                  ratio === "1:1"
                    ? "bg-[#003872] text-white border-blue-500/60"
                    : "bg-white/[0.06] text-slate-300 border-white/10"
                }`}
              >
                1:1 (Recommended)
              </button>
              <button
                onClick={() => setRatio("1:2")}
                className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                  ratio === "1:2"
                    ? "bg-[#003872] text-white border-blue-500/60"
                    : "bg-white/[0.06] text-slate-300 border-white/10"
                }`}
              >
                1:2
              </button>
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto">
            {pitchRooms.map((room) => {
              const isSelected = selectedRoom?.roomId === room.roomId;
              const isSigned = room.contractStatus === "signed";

              return (
                <div
                  key={room.roomId}
                  onClick={() => setSelectedRoomId(room.roomId)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "border-[#DC2626] bg-rose-500/10 shadow-md ring-2 ring-rose-500/20"
                      : "border-white/10 bg-slate-900/70 hover:border-white/20 hover:shadow-xs"
                  }`}
                >
                  <div>
                    {/* Room Header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-white/[0.06] text-slate-100">
                        {room.roomName}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          isSigned
                            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {isSigned ? "Enrolled · Contract Signed" : `Stage ${room.currentStage}: ${room.stageName}`}
                      </span>
                    </div>

                    {/* Parties Info */}
                    <div className="space-y-1.5 text-xs mt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Sales Counselor:</span>
                        <span className="font-bold text-blue-300">{room.salesRepName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Student Prospect:</span>
                        <span className="font-bold text-slate-100">
                          {room.studentName} (Grade {room.gradeLevel})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Parent Attendee:</span>
                        <span className="font-medium text-slate-200">{room.parentName}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <span className="text-slate-400">Lead Quality:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {room.leadQualityScore || 94}/100 · High Intent
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress & Metrics Footer */}
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">1:1 Agent Access:</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-blue-300" />
                        <span>Locked to {room.salesRepName}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Tuition Quote:</span>
                      <span className="font-mono font-bold text-slate-100">
                        {room.scholarshipGrantedPercent > 0 ? (
                          <>
                            <span className="line-through text-slate-400 mr-1">${room.tuitionTotal}</span>
                            <span className="text-emerald-300">${room.discountedTuition}/yr (-{room.scholarshipGrantedPercent}%)</span>
                          </>
                        ) : (
                          `$${room.tuitionTotal}/yr`
                        )}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinOneToOneRoom(room);
                      }}
                      className="w-full py-1.5 px-3 rounded-lg bg-linear-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-[11px] shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-300" />
                      <span>Join 1:1 Video Meeting</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Room Deep Dive / Silent Hop (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900/70 rounded-2xl border border-white/10 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-rose-300 uppercase tracking-widest block">
                  Breakout Inspector
                </span>
                <h3 className="text-base font-bold text-slate-100">{selectedRoom?.roomName || "Pitch Room #1"}</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/[0.06] text-slate-300">
                1:1 Private
              </span>
            </div>

            {selectedRoom ? (
              <div className="space-y-4">
                {/* Prospect Dossier */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs space-y-2">
                  <div className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-blue-300">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Family Profile & Contact</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Student:</span>
                      <span className="font-bold text-slate-100">{selectedRoom.studentName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Grade:</span>
                      <span className="font-bold text-slate-100">Grade {selectedRoom.gradeLevel}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Parent:</span>
                      <span className="font-bold text-slate-100">{selectedRoom.parentName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Phone:</span>
                      <span className="font-mono text-slate-200">{selectedRoom.parentPhone}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <span className="text-slate-400 text-[10px] block">Target Goals:</span>
                    <span className="font-medium text-slate-100 text-[11px]">{selectedRoom.academicGoals}</span>
                  </div>
                </div>

                {/* Script Progression */}
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs">
                  <div className="font-bold text-blue-300 uppercase tracking-wider text-[10px] mb-2 flex items-center justify-between">
                    <span>5-Step Pitch Script Progress</span>
                    <span className="font-mono text-blue-300">Stage {selectedRoom.currentStage} of 5</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { step: 1, name: "Academic Diagnostic" },
                      { step: 2, name: "3D & Remote Tech Demo" },
                      { step: 3, name: "Cambridge & IB Rigor" },
                      { step: 4, name: "Tuition & Scholarship" },
                      { step: 5, name: "Enrollment Close" },
                    ].map((s) => (
                      <div
                        key={s.step}
                        className={`flex items-center gap-2 text-xs p-1.5 rounded-md ${
                          selectedRoom.currentStage === s.step
                            ? "bg-slate-900/70 font-bold text-blue-300 shadow-2xs border border-blue-500/30"
                            : selectedRoom.currentStage > s.step
                            ? "text-emerald-300 line-through font-medium opacity-80"
                            : "text-slate-400"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                            selectedRoom.currentStage >= s.step ? "bg-emerald-600 text-white" : "bg-white/10 text-slate-300"
                          }`}
                        >
                          {s.step}
                        </span>
                        <span>{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Closing Offer Status */}
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-300 block">
                      Spot Scholarship Status
                    </span>
                    <span className="font-bold text-emerald-950 text-sm">
                      {selectedRoom.scholarshipGrantedPercent > 0
                        ? `${selectedRoom.scholarshipGrantedPercent}% Founder's Grant Applied`
                        : "Full Standard Tuition ($2,400)"}
                    </span>
                  </div>
                  <span className="font-mono text-lg font-black text-emerald-300">
                    ${selectedRoom.discountedTuition}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                No active breakout room selected.
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-white/10">
            {selectedRoom ? (
              <button
                onClick={() => handleJoinOneToOneRoom(selectedRoom)}
                className="w-full py-2.5 px-4 rounded-xl bg-linear-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Flame className="w-4 h-4 text-amber-300" />
                <span>Enter 1:1 Video Pitch Breakout</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveView("classroom")}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <span>Return to Main Classroom Hall</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
