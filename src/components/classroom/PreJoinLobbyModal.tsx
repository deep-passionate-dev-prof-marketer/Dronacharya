import React, { useState, useEffect, useRef } from "react";
import { UserRole, AuthUser } from "../../types";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  GraduationCap,
  Users,
  Eye,
  Zap,
  ArrowRight,
  Shield,
  Volume2,
  Sparkles,
  Link2,
} from "lucide-react";

interface Props {
  initialRole?: UserRole;
  initialRoomId?: string;
  onJoinSuccess: (user: AuthUser, roomId: string) => void;
}

export const PreJoinLobbyModal: React.FC<Props> = ({
  initialRole = "instructor",
  initialRoomId = "dronacharya-gr10-phy",
  onJoinSuccess,
}) => {
  // Compute initial state synchronously from URL query and pathname
  const [selectedRole, setSelectedRole] = useState<UserRole>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlRole = params.get("role")?.toLowerCase();
      if (urlRole === "student") return "student";
      if (urlRole === "teacher" || urlRole === "instructor") return "instructor";
      if (urlRole === "auditor") return "auditor";
      if (urlRole === "sales" || urlRole === "sales_rep") return "sales_rep";

      // If joining via /room/:slug, default to student
      const pathMatch = window.location.pathname.match(/\/(?:room|s)\/([^/?#]+)/);
      if (pathMatch) return "student";
    }
    return initialRole;
  });

  const [displayName, setDisplayName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlRole = params.get("role")?.toLowerCase();
      const pathMatch = window.location.pathname.match(/\/(?:room|s)\/([^/?#]+)/);
      if (urlRole === "student" || (!urlRole && pathMatch)) return "Sophia Chen";
      if (urlRole === "auditor") return "Inspector Marcus Thorne";
      if (urlRole === "sales" || urlRole === "sales_rep") return "Senior Admissions Officer";
    }
    return initialRole === "student" ? "Sophia Chen" : "Dr. Evelyn Vance";
  });

  const [targetRoomId, setTargetRoomId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get("room") || params.get("roomId") || params.get("join") || params.get("meet");
      const pathMatch = window.location.pathname.match(/\/(?:room|s)\/([^/?#]+)/);
      const pathRoom = pathMatch ? decodeURIComponent(pathMatch[1]) : null;
      if (urlRoom || pathRoom) return (urlRoom || pathRoom)!;
    }
    return initialRoomId;
  });

  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [isMicActive, setIsMicActive] = useState<boolean>(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micVolume, setMicVolume] = useState<number>(0);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Sync URL search params & path changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get("room") || params.get("roomId") || params.get("join") || params.get("meet");
      const urlRole = params.get("role")?.toLowerCase();
      const pathMatch = window.location.pathname.match(/\/(?:room|s)\/([^/?#]+)/);
      const pathRoom = pathMatch ? decodeURIComponent(pathMatch[1]) : null;

      const effectiveRoom = urlRoom || pathRoom;
      if (effectiveRoom) {
        setTargetRoomId(effectiveRoom);
      }

      if (urlRole === "student" || (!urlRole && pathRoom && selectedRole !== "student")) {
        setSelectedRole("student");
        setDisplayName((prev) => (prev === "Dr. Evelyn Vance" ? "Sophia Chen" : prev));
      } else if (urlRole === "teacher" || urlRole === "instructor") {
        setSelectedRole("instructor");
        setDisplayName((prev) => (prev === "Sophia Chen" ? "Dr. Evelyn Vance" : prev));
      } else if (urlRole === "auditor") {
        setSelectedRole("auditor");
        setDisplayName("Inspector Marcus Thorne");
      } else if (urlRole === "sales" || urlRole === "sales_rep") {
        setSelectedRole("sales_rep");
        setDisplayName("Senior Admissions Officer");
      }
    }
  }, [initialRole, initialRoomId]);

  // Request camera & microphone for greenroom preview
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    async function setupPreview() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        });

        if (!isCancelled) {
          setLocalStream(stream);
          if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = stream;
          }

          // Setup Audio Visualizer Meter
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              const audioCtx = new AudioCtx();
              audioContextRef.current = audioCtx;
              const source = audioCtx.createMediaStreamSource(stream);
              const analyser = audioCtx.createAnalyser();
              analyser.fftSize = 32;
              source.connect(analyser);

              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              const interval = setInterval(() => {
                if (isCancelled) {
                  clearInterval(interval);
                  return;
                }
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const avg = sum / dataArray.length;
                setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
              }, 100);
            }
          } catch {}
        }
      } catch (err) {
        console.info("[PreJoin] Camera/Mic preview dismissed or unavailable:", err);
      }
    }

    setupPreview();

    return () => {
      isCancelled = true;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsCameraActive(!isCameraActive);
    }
  };

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsMicActive(!isMicActive);
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    if (role === "instructor" && displayName === "Sophia Chen") {
      setDisplayName("Dr. Evelyn Vance");
    } else if (role === "student" && displayName === "Dr. Evelyn Vance") {
      setDisplayName("Sophia Chen");
    } else if (role === "auditor") {
      setDisplayName("Inspector Marcus Thorne");
    } else if (role === "sales_rep") {
      setDisplayName("Senior Admissions Officer");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const user: AuthUser = {
      id: `${selectedRole}-${Date.now().toString(36)}`,
      name: displayName.trim() || (selectedRole === "instructor" ? "Teacher" : "Student"),
      email: `${displayName.toLowerCase().replace(/\s+/g, ".")}@21k.school`,
      role: selectedRole,
      avatarColor: selectedRole === "instructor" ? "#003872" : selectedRole === "student" ? "#0082FF" : "#8b5cf6",
      department: selectedRole === "instructor" ? "Physics & STEM" : undefined,
      gradeLevel: selectedRole === "student" ? 10 : undefined,
    };

    onJoinSuccess(user, targetRoomId.trim() || "dronacharya-gr10-phy");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070b14]/95 backdrop-blur-xl overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row text-slate-100">
        {/* Left Column: Live Video/Audio Greenroom Preview */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10 bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-400 font-mono">
                WebRTC Greenroom
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
              Check Your Audio & Video
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Preview how you look and sound before entering the live classroom stage.
            </p>
          </div>

          {/* Video Preview Card */}
          <div className="relative aspect-video rounded-2xl bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center shadow-inner group">
            {isCameraActive && localStream ? (
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-3">
                  <VideoOff className="w-7 h-7" />
                </div>
                <p className="text-xs font-semibold text-slate-300">Camera Turned Off</p>
              </div>
            )}

            {/* Bottom Controls on Preview */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-20">
              {/* Mic Level Wave */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-xs">
                <Volume2 className={`w-3.5 h-3.5 ${micVolume > 10 ? "text-emerald-400" : "text-slate-400"}`} />
                <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-75"
                    style={{ width: `${isMicActive ? micVolume : 0}%` }}
                  />
                </div>
              </div>

              {/* Hardware Toggles */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`p-2.5 rounded-xl transition-all shadow-md ${
                    isMicActive
                      ? "bg-white/10 text-white hover:bg-white/20"
                      : "bg-rose-600 text-white shadow-rose-600/40"
                  }`}
                  title={isMicActive ? "Mute Microphone" : "Unmute Microphone"}
                >
                  {isMicActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`p-2.5 rounded-xl transition-all shadow-md ${
                    isCameraActive
                      ? "bg-white/10 text-white hover:bg-white/20"
                      : "bg-rose-600 text-white shadow-rose-600/40"
                  }`}
                  title={isCameraActive ? "Turn Off Camera" : "Turn On Camera"}
                >
                  {isCameraActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>End-to-End Encrypted WebRTC Mesh · &lt;20ms SLA</span>
          </div>
        </div>

        {/* Right Column: Role Choice, Name, & Join Form */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm font-bold text-white tracking-wide">Select Your Role:</span>
            </div>

            {/* Role Switcher Grid */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              <button
                type="button"
                onClick={() => handleRoleSelect("instructor")}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  selectedRole === "instructor"
                    ? "bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-500"
                    : "bg-slate-950/40 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <GraduationCap className={`w-5 h-5 ${selectedRole === "instructor" ? "text-amber-400" : "text-slate-400"}`} />
                  {selectedRole === "instructor" && <span className="w-2 h-2 rounded-full bg-blue-400" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Teacher / Faculty</h4>
                  <p className="text-[10px] text-slate-400">Classroom Host & Controls</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect("student")}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  selectedRole === "student"
                    ? "bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-500"
                    : "bg-slate-950/40 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Users className={`w-5 h-5 ${selectedRole === "student" ? "text-cyan-400" : "text-slate-400"}`} />
                  {selectedRole === "student" && <span className="w-2 h-2 rounded-full bg-blue-400" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Student / Scholar</h4>
                  <p className="text-[10px] text-slate-400">Interactive Learner</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect("auditor")}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                  selectedRole === "auditor"
                    ? "bg-purple-600/20 border-purple-500 text-white ring-1 ring-purple-500"
                    : "bg-slate-950/40 border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                <Eye className="w-4 h-4 text-purple-400 shrink-0" />
                <div className="truncate">
                  <h4 className="text-xs font-bold text-white">Auditor</h4>
                  <p className="text-[9px] text-slate-400">Compliance Inspector</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect("sales_rep")}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                  selectedRole === "sales_rep"
                    ? "bg-amber-600/20 border-amber-500 text-white ring-1 ring-amber-500"
                    : "bg-slate-950/40 border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="truncate">
                  <h4 className="text-xs font-bold text-white">Sales & CRM</h4>
                  <p className="text-[9px] text-slate-400">1:1 Breakout Pitch</p>
                </div>
              </button>
            </div>

            {/* Join Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Your Display Name:
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Classroom Room Code:</span>
                  <span className="text-[10px] text-cyan-400 font-mono">Shared across peers</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={targetRoomId}
                    onChange={(e) => setTargetRoomId(e.target.value)}
                    placeholder="e.g. dronacharya-live or math-101"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-cyan-300 font-mono placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Link2 className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold text-sm transition-all shadow-xl shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Enter Live Classroom as {selectedRole === "instructor" ? "Teacher" : selectedRole === "student" ? "Student" : selectedRole}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            <span>Invite link will be generated inside the stage for instant peer connection.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
