import React, { useState, useEffect, useRef } from "react";
import { AuthUser } from "../../types";
import {
  GraduationCap,
  Sparkles,
  Video,
  VideoOff,
  Mic,
  MicOff,
  ShieldCheck,
  Clock,
  ArrowRight,
  BookOpen,
  User,
  Lock,
  Globe,
  Radio,
  Volume2,
  Check,
  LogIn,
} from "lucide-react";
import { demoClassService, generatePassword } from "../../services/demoClassService";

interface Props {
  initialRoomId?: string;
  onJoinSuccess: (user: AuthUser, roomId: string) => void;
}

export const DedicatedStudentLogin: React.FC<Props> = ({
  initialRoomId = "dronacharya-gr10-phy",
  onJoinSuccess,
}) => {
  // Extract query parameters if provided
  const queryParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const urlSid = queryParams?.get("sid") || "21SCHOLARX";
  const urlRoom = queryParams?.get("room") || queryParams?.get("roomId") || initialRoomId;
  const urlCourse = queryParams?.get("course") || "Advanced Quantum Mechanics & Physics";
  const urlGrade = parseInt(queryParams?.get("grade") || "10", 10);
  const urlTeacher = queryParams?.get("teacher") || "Dr. Evelyn Vance";
  const urlRatio = queryParams?.get("ratio") || "1:4";

  // Pre-fill student ID (2-Digit Numeric + 8-Character Alphabet)
  const [studentId, setStudentId] = useState<string>(urlSid.toUpperCase());
  // Pre-fill password (last 4 characters of studentId)
  const [password, setPassword] = useState<string>(() => generatePassword(urlSid));
  const [studentName, setStudentName] = useState<string>("Sophia Chen");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Countdown timer to scheduled demo
  const [countdownSeconds, setCountdownSeconds] = useState<number>(180);

  // Audio/Video preview states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [isMicActive, setIsMicActive] = useState<boolean>(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micVolume, setMicVolume] = useState<number>(45);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Auto-sync password whenever student ID changes
  useEffect(() => {
    setPassword(generatePassword(studentId));
  }, [studentId]);

  // Countdown timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Camera preview setup
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let cancelled = false;

    async function startPreview() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 360 } },
            audio: true,
          });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          activeStream = stream;
          setLocalStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.info("[StudentCheckin] Camera preview dismissed or synthetic fallback active:", err);
      }
    }

    startPreview();

    return () => {
      cancelled = true;
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const toggleCamera = () => {
    setIsCameraActive((prev) => {
      const next = !prev;
      if (localStream) {
        localStream.getVideoTracks().forEach((t) => (t.enabled = next));
      }
      return next;
    });
  };

  const toggleMic = () => {
    setIsMicActive((prev) => {
      const next = !prev;
      if (localStream) {
        localStream.getAudioTracks().forEach((t) => (t.enabled = next));
      }
      return next;
    });
  };

  const handleJoinClass = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanSid = studentId.trim().toUpperCase() || "21SCHOLARX";
    const authUser: AuthUser = {
      id: `stu_${cleanSid}_${Date.now().toString(36)}`,
      name: studentName.trim() || "Sophia Chen",
      email: `${studentName.toLowerCase().replace(/\s+/g, ".")}@21k.family`,
      role: "student",
      avatarColor: "#0082FF",
      gradeLevel: urlGrade,
      section: "A",
      studentCode: cleanSid,
    };

    onJoinSuccess(authUser, urlRoom);
  };

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-canvas overflow-y-auto">
      {/* Background Ambience Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl bg-slate-900/90 border border-white/10 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl flex flex-col md:flex-row text-slate-100 z-10">
        {/* Left Side: Live Video Greenroom & Hardware Test */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10 bg-slate-950/70">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                21K School Student Portal
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1">
              Live Demo Class Check-In
            </h1>
            <p className="text-xs text-slate-400 mb-5">
              Confirm your pre-filled student credentials and test your webcam before entering the interactive lecture hall.
            </p>

            {/* Live Video Preview Box */}
            <div className="relative aspect-video rounded-2xl bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center shadow-inner group mb-4">
              {isCameraActive && localStream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
                  <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400">
                    <VideoOff className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium">Camera Disabled (Audio Only)</span>
                </div>
              )}

              {/* Hardware Quick Action Controls */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleMic}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      isMicActive ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40" : "bg-rose-600/30 text-rose-300 border border-rose-500/40"
                    }`}
                    title={isMicActive ? "Mute Microphone" : "Unmute Microphone"}
                  >
                    {isMicActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={toggleCamera}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      isCameraActive ? "bg-blue-600/30 text-blue-300 border border-blue-500/40" : "bg-rose-600/30 text-rose-300 border border-rose-500/40"
                    }`}
                    title={isCameraActive ? "Turn Off Camera" : "Turn On Camera"}
                  >
                    {isCameraActive ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Mic Volume Level */}
                <div className="flex items-center gap-1.5">
                  <Volume2 className="w-3 h-3 text-emerald-400" />
                  <div className="w-14 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-150"
                      style={{ width: `${isMicActive ? micVolume : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Subtitle & Speech Translation Notice */}
          <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-2xl flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-2xs font-bold text-cyan-200">
                AI Real-Time Speech Translation & Subtitles Active
              </div>
              <p className="text-2xs text-slate-400 leading-normal">
                Speak naturally in your preferred language. Two-way AI translation and live dual subtitles will automatically stream during class.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Pre-Filled Credentials & Scheduled Demo Card */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between bg-slate-900/50">
          <div>
            {/* Class Scheduled Time & Live Countdown Header */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-500/30 mb-5 flex items-center justify-between">
              <div>
                <span className="text-2xs uppercase font-bold text-blue-300 tracking-wider font-mono block">
                  Scheduled Live Demo ({urlRatio})
                </span>
                <span className="text-xs font-bold text-white">
                  {urlCourse}
                </span>
                <span className="text-2xs text-slate-300 block">
                  Instructor: <strong className="text-white">{urlTeacher}</strong> · Grade {urlGrade}
                </span>
              </div>

              <div className="text-right shrink-0 pl-2">
                <span className="text-2xs uppercase font-bold text-amber-300 tracking-wider font-mono block">
                  Starts In
                </span>
                <span className="text-sm font-mono font-black text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-500/30">
                  {formatCountdown(countdownSeconds)}
                </span>
              </div>
            </div>

            {/* Pre-Filled Student Form */}
            <form onSubmit={handleJoinClass} className="space-y-4">
              {/* Student ID (2-Digit Numeric + 8-Character Alphabet) */}
              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>Student ID (2-Digit + 8-Char Alpha)</span>
                  </span>
                  <span className="text-2xs text-emerald-400 font-mono font-normal flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Pre-Filled Credentials</span>
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/15 focus:border-blue-500 font-mono text-sm text-white font-bold tracking-wider outline-none transition"
                    placeholder="e.g. 21SCHOLARX"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-2xs font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    ID
                  </div>
                </div>
              </div>

              {/* Password (Last 4 Digits of Student ID Auto-Fill) */}
              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Password (Last 4 Digits Auto-Filled)</span>
                  </span>
                  <span className="text-2xs text-indigo-300 font-mono font-normal">
                    Auto-Resolved ({password})
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/15 focus:border-indigo-500 font-mono text-sm text-white font-bold tracking-widest outline-none transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-2xs text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Student Display Name */}
              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Scholar Full Name
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/15 focus:border-cyan-500 text-sm text-white font-semibold outline-none transition"
                  placeholder="e.g. Sophia Chen"
                  required
                />
              </div>

              {/* Submit CTA Button */}
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-extrabold text-sm shadow-xl shadow-cyan-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
              >
                <LogIn className="w-4 h-4 text-white" />
                <span>Enter 21K School Demo Class</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Security & Verification Footer */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-2xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>AES-256 E2EE WebRTC Mesh</span>
            </span>
            <span className="font-mono text-slate-500">Room: {urlRoom}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
