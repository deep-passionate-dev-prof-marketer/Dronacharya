import React, { useState, useEffect, useRef } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Gamepad2,
  Users,
  Compass,
  Sparkles,
  Play,
  Volume2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Video,
  Mic,
} from "lucide-react";

interface PeerPlayer {
  id: string;
  studentId: string;
  name: string;
  x: number;
  y: number;
  color: string;
  direction: "left" | "right" | "up" | "down";
}

export const GamifiedWaitingLobby: React.FC<{ onEnterClassroom: () => void }> = ({
  onEnterClassroom,
}) => {
  const { currentUser, classStatus, roomTitle, roomId } = useClassroom();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Student player position on map
  const [playerX, setPlayerX] = useState<number>(360);
  const [playerY, setPlayerY] = useState<number>(240);
  const [playerDir, setPlayerDir] = useState<"left" | "right" | "up" | "down">("down");

  // Countdown timer to scheduled demo
  const [countdownSeconds, setCountdownSeconds] = useState<number>(180);

  // Simulated peer waiting students roaming the Minecraft campus
  const [peerStudents, setPeerStudents] = useState<PeerPlayer[]>([
    {
      id: "p1",
      studentId: "10QUANTUMA",
      name: "Liam O'Connor",
      x: 200,
      y: 180,
      color: "#38bdf8",
      direction: "right",
    },
    {
      id: "p2",
      studentId: "08ROBOTICS",
      name: "Aria Thorne",
      x: 520,
      y: 190,
      color: "#ec4899",
      direction: "left",
    },
    {
      id: "p3",
      studentId: "09STEAMPAL",
      name: "Marcus Vance",
      x: 360,
      y: 380,
      color: "#10b981",
      direction: "up",
    },
  ]);

  // Tick countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard navigation for player avatar (WASD / Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 16;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        setPlayerY((prev) => Math.max(90, prev - step));
        setPlayerDir("up");
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        setPlayerY((prev) => Math.min(420, prev + step));
        setPlayerDir("down");
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        setPlayerX((prev) => Math.max(80, prev - step));
        setPlayerDir("left");
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        setPlayerX((prev) => Math.min(680, prev + step));
        setPlayerDir("right");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Roaming AI bot peers in lobby
  useEffect(() => {
    const roam = setInterval(() => {
      setPeerStudents((prev) =>
        prev.map((peer) => {
          const dx = (Math.random() - 0.5) * 20;
          const dy = (Math.random() - 0.5) * 20;
          return {
            ...peer,
            x: Math.max(100, Math.min(660, peer.x + dx)),
            y: Math.max(100, Math.min(400, peer.y + dy)),
            direction: dx > 0 ? "right" : "left",
          };
        })
      );
    }, 1800);
    return () => clearInterval(roam);
  }, []);

  // Canvas Voxel/Isometric Campus Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas dimensions
    const width = canvas.width;
    const height = canvas.height;

    // 1. Draw Ground (Isometric Green Campus Lawn + Cobblestone Paths)
    ctx.fillStyle = "#0c1729";
    ctx.fillRect(0, 0, width, height);

    // Grid grass tiles
    ctx.strokeStyle = "rgba(30, 58, 102, 0.3)";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Cobblestone Main Walkway
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(320, 60, 80, 380);
    ctx.fillRect(120, 220, 480, 60);

    // 2. School Campus Zones (Voxel Buildings)
    const drawBuilding = (
      bx: number,
      by: number,
      bw: number,
      bh: number,
      title: string,
      color: string,
      accent: string
    ) => {
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(bx + 6, by + 6, bw, bh);

      // Building Base
      ctx.fillStyle = color;
      ctx.fillRect(bx, by, bw, bh);

      // Roof Border (Voxel style)
      ctx.fillStyle = accent;
      ctx.fillRect(bx, by, bw, 8);
      ctx.fillRect(bx, by, 8, bh);

      // Door
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(bx + bw / 2 - 12, by + bh - 24, 24, 24);

      // Signboard
      ctx.fillStyle = "#0284c7";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(title, bx + bw / 2, by - 8);
    };

    // Science Lab
    drawBuilding(80, 80, 140, 100, "Quantum STEM Lab", "#1e1b4b", "#6366f1");
    // Library
    drawBuilding(500, 80, 140, 100, "21K Digital Library", "#0f372e", "#10b981");
    // Robotics Arena
    drawBuilding(80, 310, 140, 100, "Robotics Arena", "#3b1717", "#f43f5e");
    // Amphitheater
    drawBuilding(500, 310, 140, 100, "Lecture Hall", "#312e81", "#8b5cf6");

    // Central Fountain / Campus Logo
    ctx.fillStyle = "#0284c7";
    ctx.beginPath();
    ctx.arc(360, 250, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("21K", 360, 254);

    // 3. Render Other Waiting Students
    peerStudents.forEach((peer) => {
      // Voxel Shadow
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.ellipse(peer.x, peer.y + 16, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Minecraft Voxel Body
      ctx.fillStyle = peer.color;
      ctx.fillRect(peer.x - 8, peer.y - 12, 16, 20); // Torso

      // Head
      ctx.fillStyle = "#fcd34d";
      ctx.fillRect(peer.x - 7, peer.y - 26, 14, 14);

      // Hair
      ctx.fillStyle = "#451a03";
      ctx.fillRect(peer.x - 7, peer.y - 28, 14, 4);

      // Floating Overhead Nameplate (User specified format: [ID] Name)
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      const tagText = `[${peer.studentId}] ${peer.name}`;
      ctx.font = "bold 9px monospace";
      const tagWidth = ctx.measureText(tagText).width;
      ctx.fillRect(peer.x - tagWidth / 2 - 4, peer.y - 42, tagWidth + 8, 14);
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.strokeRect(peer.x - tagWidth / 2 - 4, peer.y - 42, tagWidth + 8, 14);

      ctx.fillStyle = "#38bdf8";
      ctx.fillText(tagText, peer.x, peer.y - 32);
    });

    // 4. Render Local Player (Your Avatar)
    const mySid = (currentUser as any)?.studentId || "21SCHOLARX";
    const myName = currentUser?.name || "Sophia Chen";

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath();
    ctx.ellipse(playerX, playerY + 16, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Voxel Body (21K School Blazer in Royal Blue)
    ctx.fillStyle = "#0082FF";
    ctx.fillRect(playerX - 9, playerY - 14, 18, 22);

    // School Backpack
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(playerX - 6, playerY - 10, 12, 14);

    // Head
    ctx.fillStyle = "#fde047";
    ctx.fillRect(playerX - 8, playerY - 28, 16, 14);

    // Hair
    ctx.fillStyle = "#1e1b4b";
    ctx.fillRect(playerX - 8, playerY - 31, 16, 5);

    // Player Crown / Hero Ring
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.strokeRect(playerX - 10, playerY - 33, 20, 20);

    // Floating Overhead Nameplate for Local User (with glowing border)
    const myTag = `[${mySid}] ${myName} (YOU)`;
    ctx.font = "bold 10px monospace";
    const myTagWidth = ctx.measureText(myTag).width;

    ctx.fillStyle = "rgba(2, 6, 23, 0.95)";
    ctx.fillRect(playerX - myTagWidth / 2 - 6, playerY - 48, myTagWidth + 12, 16);
    ctx.strokeStyle = "#38bdf8";
    ctx.strokeRect(playerX - myTagWidth / 2 - 6, playerY - 48, myTagWidth + 12, 16);

    ctx.fillStyle = "#38bdf8";
    ctx.fillText(myTag, playerX, playerY - 36);
  }, [playerX, playerY, peerStudents, currentUser]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 720;
    const y = ((e.clientY - rect.top) / rect.height) * 480;
    setPlayerX(Math.max(80, Math.min(660, Math.round(x))));
    setPlayerY(Math.max(80, Math.min(420, Math.round(y))));
  };

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#070b14] overflow-hidden select-none">
      {/* Top Lobby Metaverse HUD Bar */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-600/30">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-sm font-black text-white tracking-wide uppercase font-mono">
                21K School Gamified Waiting Lobby
              </h2>
            </div>
            <p className="text-[11px] text-slate-400">
              Interactive Minecraft Voxel Campus · Explore with <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">W</kbd><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">A</kbd><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">S</kbd><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">D</kbd> or Click to Walk
            </p>
          </div>
        </div>

        {/* Live Class Countdown Timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-300">
            <Clock className="w-4 h-4 animate-spin text-amber-400" />
            <div className="text-right">
              <span className="text-[9px] uppercase font-bold text-amber-400/80 block leading-none">
                Demo Starts In
              </span>
              <span className="text-xs font-mono font-black text-amber-300">
                {formatCountdown(countdownSeconds)}
              </span>
            </div>
          </div>

          {/* Quick Jump to Classroom Stage Button */}
          <button
            onClick={onEnterClassroom}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Enter Live Classroom</span>
          </button>
        </div>
      </div>

      {/* Main Minecraft Interactive Voxel Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center p-2 sm:p-4 bg-[#050811] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={720}
          height={480}
          onClick={handleCanvasClick}
          className="rounded-3xl border border-white/10 shadow-2xl max-w-full max-h-full object-contain cursor-crosshair bg-slate-950"
        />

        {/* Bottom Floating Control Tips Pill */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl flex items-center gap-4 text-xs text-slate-300 shadow-xl pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Player: <strong className="text-cyan-300">{currentUser?.name || "Sophia Chen"}</strong></span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-[11px] border-l border-white/10 pl-3">
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            <span>4 Scholars Waiting in Lobby</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-slate-400 text-[11px] border-l border-white/10 pl-3">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Real-Time Dual Translation Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
