import React, { useState } from "react";
import { ScanFace, ShieldCheck, Loader2 } from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";

/**
 * Asks for consent before any engagement analytics run. Learners need a parent/guardian to confirm.
 * The choice is stored server-side (with time and device) and can be changed from the account menu.
 */
export const AnalyticsConsentModal: React.FC = () => {
  const { isAnalyticsConsentOpen, setIsAnalyticsConsentOpen, submitAnalyticsConsent, authenticatedUser, analyticsConsent } = useClassroom();
  const [guardianName, setGuardianName] = useState("");
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState<"yes" | "no" | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!isAnalyticsConsentOpen || !authenticatedUser) return null;
  const isStudent = authenticatedUser.role === "student";

  const decide = async (granted: boolean) => {
    setBusy(granted ? "yes" : "no");
    setError(await submitAnalyticsConsent(granted, isStudent ? { name: guardianName.trim(), attested } : undefined));
    setBusy(null);
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[94dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-6 space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-sheetUp sm:animate-fadeIn">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
            <ScanFace className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Class engagement analytics</h2>
            <p className="text-sm text-slate-400">{isStudent ? "A parent or guardian needs to decide this." : "Please choose whether to take part."}</p>
          </div>
        </div>

        <ul className="text-sm text-slate-300 space-y-2 list-disc pl-5">
          <li>Your camera image is analysed <strong className="text-white">on this device</strong> during class. Video is not uploaded for this.</li>
          <li>Every few seconds, estimates are sent to the school: attention, presence and expression-based signals such as focused, confused, tired or happy.</li>
          <li>Only the school's <strong className="text-white">auditors and quality analysts</strong> can see them. Teachers and classmates cannot.</li>
          <li>These are estimates, not diagnoses. They are used to improve teaching quality, not to grade anyone.</li>
          <li>You can change your choice any time from the account menu. Class works the same either way.</li>
        </ul>

        {isStudent && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2.5">
            <label className="block text-sm text-slate-200">
              Parent / guardian full name
              <input
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                className="mt-1 w-full rounded-lg bg-slate-950 border border-white/15 focus:border-blue-500 outline-none px-3 py-2 text-sm text-white"
                autoComplete="name"
              />
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-1 accent-blue-500" />
              I am this learner's parent or legal guardian and I agree to the above.
            </label>
          </div>
        )}

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <button onClick={() => decide(false)} disabled={!!busy} className="btn-ghost sm:flex-1">
            {busy === "no" && <Loader2 className="w-4 h-4 animate-spin" />} Don't allow
          </button>
          <button
            onClick={() => decide(true)}
            disabled={!!busy || (isStudent && (!guardianName.trim() || !attested))}
            className="btn-primary sm:flex-1"
          >
            {busy === "yes" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Allow
          </button>
        </div>
        {analyticsConsent !== "unknown" && (
          <button onClick={() => setIsAnalyticsConsentOpen(false)} className="text-xs text-slate-500 hover:text-slate-300 mx-auto block">
            Keep my current choice ({analyticsConsent})
          </button>
        )}
      </div>
    </div>
  );
};
