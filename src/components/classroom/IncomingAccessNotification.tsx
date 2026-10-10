import React from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  ShieldAlert,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  Check,
  X,
  Share2,
  ChevronRight,
} from "lucide-react";
import { DeviceType } from "../../types";

export const IncomingAccessNotification: React.FC = () => {
  const {
    incomingAccessRequest,
    incomingAccessOffer,
    respondRemoteAccess,
    dismissIncomingPrompt,
    currentRole,
  } = useClassroom();

  if (!incomingAccessRequest && !incomingAccessOffer) return null;

  const getDeviceIcon = (type: DeviceType) => {
    switch (type) {
      case "phone":
        return <Smartphone className="w-5 h-5 text-brand-cyan" />;
      case "tablet":
        return <Tablet className="w-5 h-5 text-brand-cyan" />;
      case "desktop":
        return <Monitor className="w-5 h-5 text-brand-cyan" />;
      default:
        return <Laptop className="w-5 h-5 text-brand-cyan" />;
    }
  };

  return (
    <div className="fixed bottom-20 right-6 z-50 flex flex-col gap-3 max-w-md w-full animate-in slide-in-from-bottom-5 duration-200">
      {/* 1. Student Receiving Remote Access Request */}
      {incomingAccessRequest && (
        <div className="p-4 rounded-2xl bg-brand-navy-deep border-2 border-brand-cyan shadow-2xl text-white font-sans">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-brand-navy shrink-0">
              {getDeviceIcon(incomingAccessRequest.deviceType)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-mono uppercase tracking-wider text-brand-cyan font-bold">
                  Incoming Remote Request
                </span>
                <span className="text-2xs text-slate-400 font-mono">
                  {incomingAccessRequest.requestedAt}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white mt-0.5">
                {incomingAccessRequest.requesterName} is requesting remote access
              </h4>
              <p className="text-2xs text-slate-300 mt-1">
                Target: <strong>{incomingAccessRequest.deviceModel}</strong> ({incomingAccessRequest.deviceType.toUpperCase()})
                <br />
                Permission tier:{" "}
                <span className="text-amber-300 font-bold uppercase">
                  {incomingAccessRequest.accessLevel.replace("_", " ")}
                </span>
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => respondRemoteAccess(incomingAccessRequest.id, true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Grant ({incomingAccessRequest.accessLevel === "full_control" ? "Full Control" : "Access"})</span>
                </button>

                {incomingAccessRequest.accessLevel === "full_control" && (
                  <button
                    onClick={() => respondRemoteAccess(incomingAccessRequest.id, true, "annotate")}
                    className="py-1.5 px-2.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white text-2xs font-bold transition-all cursor-pointer"
                    title="Downgrade to Annotate Only"
                  >
                    Annotate Only
                  </button>
                )}

                <button
                  onClick={() => respondRemoteAccess(incomingAccessRequest.id, false)}
                  className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all cursor-pointer"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Teacher Receiving Student Access Offer */}
      {incomingAccessOffer && (
        <div className="p-4 rounded-2xl bg-brand-navy-deep border-2 border-emerald-500 shadow-2xl text-white font-sans">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  Device Access Offered
                </span>
                <span className="text-2xs text-slate-400 font-mono">
                  {incomingAccessOffer.requestedAt}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white mt-0.5">
                {incomingAccessOffer.studentName} offered device access!
              </h4>
              <p className="text-2xs text-slate-300 mt-1">
                Device: <strong>{incomingAccessOffer.deviceModel}</strong> ({incomingAccessOffer.deviceType.toUpperCase()})
                <br />
                Granted Tier:{" "}
                <span className="text-cyan-300 font-bold uppercase">
                  {incomingAccessOffer.accessLevel.replace("_", " ")}
                </span>
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => respondRemoteAccess(incomingAccessOffer.id, true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accept & Open Tab</span>
                </button>
                <button
                  onClick={() => respondRemoteAccess(incomingAccessOffer.id, false)}
                  className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
