import React, { useEffect, useState } from "react";
import { Loader2, Mail, ArrowLeft, FlaskConical, ShieldCheck } from "lucide-react";
import type { AuthUser } from "../../types";
import { SchoolLogo } from "../brand/SchoolLogo";

interface Props {
  onSignedIn: (user: AuthUser) => void;
  error?: string | null;
  /** Shown above the form when the person arrived via a class link */
  classContext?: React.ReactNode;
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  instructor: "Teachers",
  sales_rep: "Admissions & counselling",
  auditor: "Auditors",
  student: "Students",
  parent: "Parents",
};
const ROLE_ORDER = ["student", "parent", "instructor", "sales_rep", "auditor", "admin"];

/**
 * One sign-in screen for everyone. Staff use Google Workspace; learners and parents use Google or a
 * one-time email code. While testing, seeded dummy accounts can be used ("Test accounts").
 */
export const SignInScreen: React.FC<Props> = ({ onSignedIn, error, classContext }) => {
  const [providers, setProviders] = useState<{ google: boolean; emailOtp: boolean; dev: boolean } | null>(null);
  const [accounts, setAccounts] = useState<AuthUser[]>([]);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(error || null);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((p) => {
        setProviders(p);
        if (p.dev) fetch("/api/auth/dev/accounts").then((r) => r.json()).then((b) => setAccounts(b.accounts || []));
      })
      .catch(() => setMessage("Can't reach the school server. Check your connection."));
  }, []);

  const post = async (url: string, body: unknown) => {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Something went wrong");
    return json;
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("email");
    setMessage(null);
    try {
      const r = await post("/api/auth/otp/start", { email });
      setMessage(r.message);
      setStep("code");
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setBusy(null);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("code");
    setMessage(null);
    try {
      const r = await post("/api/auth/otp/verify", { email, code });
      onSignedIn(r.user);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setBusy(null);
    }
  };

  const devSignIn = async (id: string) => {
    setBusy(id);
    try {
      const r = await post("/api/auth/dev/login", { userId: id });
      onSignedIn(r.user);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setBusy(null);
    }
  };

  const grouped = ROLE_ORDER.map((role) => ({ role, list: accounts.filter((a) => a.role === role) })).filter((g) => g.list.length);

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#060a14] text-slate-100">
      <div className="min-h-full flex items-start sm:items-center justify-center px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="w-full max-w-md space-y-5">
          <div className="flex justify-center">
            <SchoolLogo size="md" systemName="Dronacharya" theme="dark" />
          </div>

          {classContext}

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 sm:p-6 space-y-4">
            <div>
              <h1 className="text-xl font-bold text-white">Sign in</h1>
              <p className="text-sm text-slate-400">Use your school account to continue.</p>
            </div>

            {message && <p className="text-sm rounded-xl px-3 py-2 bg-white/5 border border-white/10 text-slate-200">{message}</p>}

            {providers?.google && (
              <button
                onClick={() => (window.location.href = `/api/auth/google/start?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
                className="btn-ghost w-full bg-white text-slate-900 hover:bg-slate-100 border-transparent font-semibold"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
                  <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
                  <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
                  <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
                </svg>
                Continue with Google
              </button>
            )}

            {step === "email" ? (
              <form onSubmit={sendCode} className="space-y-2.5">
                <label htmlFor="signin-email" className="block text-sm text-slate-300">
                  Students & parents: email me a sign-in code
                </label>
                <input
                  id="signin-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl bg-slate-950 border border-white/15 focus:border-blue-500 outline-none px-3 py-2.5 text-sm text-white placeholder-slate-500"
                />
                <button type="submit" disabled={busy === "email"} className="btn-primary w-full">
                  {busy === "email" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Send code
                </button>
              </form>
            ) : (
              <form onSubmit={verifyCode} className="space-y-2.5">
                <label htmlFor="signin-code" className="block text-sm text-slate-300">
                  Enter the 6-digit code sent to {email}
                </label>
                <input
                  id="signin-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl bg-slate-950 border border-white/15 focus:border-blue-500 outline-none px-3 py-2.5 text-lg tracking-[0.4em] text-center font-mono text-white"
                />
                <button type="submit" disabled={busy === "code" || code.length !== 6} className="btn-primary w-full">
                  {busy === "code" && <Loader2 className="w-4 h-4 animate-spin" />} Sign in
                </button>
                <button type="button" onClick={() => setStep("email")} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Use a different email
                </button>
              </form>
            )}

            <p className="text-[11px] text-slate-500 flex gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Staff sign in with their school Google Workspace account.
            </p>
          </div>

          {providers?.dev && grouped.length > 0 && (
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/[0.06] p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-200">
                <FlaskConical className="w-4 h-4" />
                <span className="text-sm font-semibold">Test accounts</span>
                <span className="text-[11px] text-amber-200/70">dummy sign-in · disabled in production</span>
              </div>
              {grouped.map((g) => (
                <div key={g.role}>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">{ROLE_LABEL[g.role] || g.role}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.list.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => devSignIn(a.id)}
                        disabled={!!busy}
                        className="h-9 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 inline-flex items-center gap-1.5"
                      >
                        {busy === a.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
