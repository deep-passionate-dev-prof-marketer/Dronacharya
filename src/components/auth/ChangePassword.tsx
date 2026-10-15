import React, { useState } from "react";
import { KeyRound, Loader2, X } from "lucide-react";
import { api } from "../../services/apiClient";
import { toast } from "../ui/Feedback";

/**
 * Choose a new password. "forced": right after signing in with a temporary password (nothing else
 * until it's done). "dialog": from the account menu.
 */
export const ChangePassword: React.FC<{ mode: "forced" | "dialog"; name?: string; onDone: () => void; onCancel?: () => void; onSignOut?: () => void }> = ({
  mode,
  name,
  onDone,
  onCancel,
  onSignOut,
}) => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== again) return setError("The two new passwords don't match.");
    setBusy(true);
    const r = await api("POST", "/api/auth/password/change", { current, next });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast("Password changed. You're signed out on other devices.");
    onDone();
  };

  const input = "w-full rounded-xl bg-slate-950 border border-white/15 focus:border-blue-500 outline-none px-3 py-2.5 text-sm text-white";
  const form = (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-blue-300" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-white">{mode === "forced" ? `Choose your password${name ? `, ${name.split(" ")[0]}` : ""}` : "Change password"}</h1>
            <p className="text-sm text-slate-400">
              {mode === "forced" ? "You signed in with a temporary password from the school. Pick your own to continue." : "You'll stay signed in here; other devices are signed out."}
            </p>
          </div>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <label className="block text-sm text-slate-300" htmlFor="pw-current">
        {mode === "forced" ? "Temporary password" : "Current password"}
      </label>
      <input id="pw-current" type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={input} />
      <label className="block text-sm text-slate-300" htmlFor="pw-next">
        New password
      </label>
      <input id="pw-next" type="password" required minLength={10} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={input} aria-describedby="pw-rules" />
      <p id="pw-rules" className="text-2xs text-slate-400">
        At least 10 characters. A few unrelated words work well, e.g. “river-lamp-orbit-42”. Not your name or email.
      </p>
      <label className="block text-sm text-slate-300" htmlFor="pw-again">
        New password again
      </label>
      <input id="pw-again" type="password" required autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={input} />
      {error && (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save password
      </button>
      {onSignOut && (
        <button type="button" onClick={onSignOut} className="text-xs text-slate-400 hover:text-slate-200 mx-auto block">
          Sign out
        </button>
      )}
    </form>
  );

  if (mode === "forced") {
    return (
      <div className="fixed inset-0 overflow-y-auto bg-canvas text-slate-100">
        <div className="min-h-full flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-5 sm:p-6">{form}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Change password">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} aria-hidden="true" />
      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-white/10 bg-slate-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl animate-sheetUp sm:animate-fadeIn">{form}</div>
    </div>
  );
};
