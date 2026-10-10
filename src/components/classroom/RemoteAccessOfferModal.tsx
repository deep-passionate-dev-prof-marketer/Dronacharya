import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import { DeviceType, RemoteAccessLevel } from "../../types";
import {
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  Share2,
  Eye,
  PenTool,
  Terminal,
  X,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { DEVICE_METADATA_MAP } from "../../services/remoteAccessService";

export const RemoteAccessOfferModal: React.FC = () => {
  const {
    isOfferAccessModalOpen,
    setIsOfferAccessModalOpen,
    offerRemoteAccess,
    currentUser,
    authenticatedUser,
    participants,
    latestDeviceAudit,
  } = useClassroom();

  const [selectedLevel, setSelectedLevel] = useState<RemoteAccessLevel>("full_control");

  if (!isOfferAccessModalOpen) return null;

  const instructors = participants.filter((p) => p.role === "instructor");
  const primaryTeacher = instructors[0] || { id: "host-1", name: "Dr. Evelyn Vance" };

  const detectedDevice: DeviceType = latestDeviceAudit?.deviceType || (authenticatedUser?.deviceType as DeviceType) || "tablet";
  const detectedModel: string = latestDeviceAudit?.deviceModel || authenticatedUser?.deviceModel || 'Apple iPad Pro 13" (M4 Ultra Retina)';
  const detectedOs: string = latestDeviceAudit?.osName || authenticatedUser?.osName || "iPadOS 18.2";
  const screenRes: string = latestDeviceAudit?.screenResolution || "2064x2752 @2x";

  const handleSendOffer = () => {
    offerRemoteAccess(primaryTeacher.id, detectedDevice, selectedLevel, detectedModel);
  };

  const TIERS: Array<{ level: RemoteAccessLevel; label: string; icon: React.ComponentType<{ className?: string }>; color: string; desc: string }> = [
    {
      level: "full_control",
      label: "Full Remote Control",
      icon: Terminal,
      color: "border-cyan-500/50 bg-cyan-950/20 text-cyan-300",
      desc: "Allow teacher to write code, type equations, and click directly on your screen",
    },
    {
      level: "annotate",
      label: "Annotate Only",
      icon: PenTool,
      color: "border-amber-500/50 bg-amber-950/20 text-amber-300",
      desc: "Allow teacher to draw arrows, highlight mistakes, and mark corrections",
    },
    {
      level: "view_only",
      label: "View Only",
      icon: Eye,
      color: "border-emerald-500/50 bg-emerald-950/20 text-emerald-300",
      desc: "Teacher can only see your screen without making any modifications",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg rounded-2xl bg-surface-sunken border border-brand-navy shadow-2xl overflow-hidden flex flex-col font-sans text-white animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-brand-navy-deep border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-blue text-white">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Offer Device Access to Instructor</h3>
              <p className="text-xs text-slate-300">
                Directly share your screen and controls with {primaryTeacher.name}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOfferAccessModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Zero Question Device Auto-Detection Card */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Hardware Environment Auto-Detected
              </span>
              <span className="px-2 py-0.5 rounded text-2xs font-mono bg-cyan-950 border border-cyan-700/50 text-cyan-300 uppercase">
                {detectedDevice}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/20 text-cyan-300 shrink-0">
                {detectedDevice === "tablet" ? (
                  <Tablet className="w-6 h-6" />
                ) : detectedDevice === "phone" ? (
                  <Smartphone className="w-6 h-6" />
                ) : detectedDevice === "desktop" ? (
                  <Monitor className="w-6 h-6" />
                ) : (
                  <Laptop className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-white truncate">{detectedModel}</h4>
                <p className="text-2xs text-slate-400 mt-0.5">
                  {detectedOs} · {screenRes} · {latestDeviceAudit?.audioInputsCount || 1} Mics · {latestDeviceAudit?.videoInputsCount || 1} Cams
                </p>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-800 text-2xs text-slate-400 flex items-center justify-between">
              <span>Telemetry Auto-Audit Status:</span>
              <span className="text-emerald-400 font-semibold">100% Compliant (Zero-Friction Detection)</span>
            </div>
          </div>

          {/* 2. Maximum Permission Tier to Offer */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
              2. Permission Level to Grant
            </label>
            <div className="space-y-2">
              {TIERS.map((tier) => {
                const Icon = tier.icon;
                const isSelected = selectedLevel === tier.level;
                return (
                  <div
                    key={tier.level}
                    onClick={() => setSelectedLevel(tier.level)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? `${tier.color} ring-1 ring-white/20 shadow-md`
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-black/40 mt-0.5 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{tier.label}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <p className="text-2xs text-slate-300 mt-0.5">{tier.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Safety Notice */}
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 flex items-center gap-2.5 text-xs text-rose-200">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              You maintain 100% control. A red <strong>Emergency Revoke</strong> button will remain visible at the top of your screen to disconnect at any second.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-2xs text-slate-400 font-mono">
            Sending to: <span className="text-white font-bold">{primaryTeacher.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOfferAccessModalOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSendOffer}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Send Access Offer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
