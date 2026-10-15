import React, { useEffect, useState } from "react";
import { Loader2, Mail, ArrowLeft, FlaskConical, ShieldCheck, School, GraduationCap, Eye, Briefcase, Shield, Users } from "lucide-react";
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

/** One-tap test sign-in per role (dev only; the server refuses these when dummy sign-in is off). */
const QUICK: Array<{ id: string; label: string; Icon: React.ComponentType<{ className?: string }>; tone: string }> = [
  { id: "tch-vance", label: "Teacher", Icon: School, tone: "border-blue-500/40 bg-blue-600/15 text-blue-100" },
  { id: "stu-10SOPHIACH", label: "Student", Icon: GraduationCap, tone: "border-cyan-500/40 bg-cyan-600/15 text-cyan-100" },
  { id: "par-lchen", label: "Parent", Icon: Users, tone: "border-amber-500/40 bg-amber-600/15 text-amber-100" },
  { id: "sales-1", label: "Admissions", Icon: Briefcase, tone: "border-emerald-500/40 bg-emerald-600/15 text-emerald-100" },
  { id: "audit-1", label: "Auditor", Icon: Eye, tone: "border-purple-500/40 bg-purple-600/15 text-purple-100" },
  { id: "admin-1", label: "Admin", Icon: Shield, tone: "border-rose-500/40 bg-rose-600/15 text-rose-100" },
];

/**
 * One sign-in screen for everyone: email and password (set up by the school office), an email code
 * when the school runs its own mail server, and test accounts while testing.
 */
export const SignInScreen: React.FC<Props> = ({ onSignedIn, error, classContext }) => {
  const [providers, setProviders] = useState<{ password: boolean; emailOtp: boolean; dev: boolean; devPasscode?: boolean } | null>(null);
  /** Staging only: test accounts sit behind a passcode (kept in memory for this tab) */
  const [passcode, setPasscode] = useState("");
  const [passcodeOk, setPasscodeOk] = useState(false);
  const [accounts, setAccounts] = useState<AuthUser[]>([]);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"password" | "email" | "code">("password");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(error || null);

  const loadAccounts = async (pass: string) => {
    const res = await fetch("/api/auth/dev/accounts", { headers: pass ? { "x-dev-passcode": pass } : undefined });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error || "Couldn't load the test accounts.");
    setAccounts(body.accounts || []);
    setPasscodeOk(true);
  };

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => {
        if (!(r.headers.get("content-type") || "").includes("application/json")) throw new Error("not the app server");
        return r.json();
      })
      .then((p) => {
        setProviders(p);
        if (p.dev && !p.devPasscode) loadAccounts("").catch(() => {});
      })
      .catch(() => setMessage("Can't reach the school server. Check your connection, or that this is the right web address."));
  }, []);

  const post = async (url: string, body: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(passcode ? { "x-dev-passcode": passcode } : {}) },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Something went wrong");
    return json;
  };

  const unlockTestAccounts = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("passcode");
    setMessage(null);
    try {
      await loadAccounts(passcode);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setBusy(null);
    }
  };

  const passwordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("password");
    setMessage(null);
    try {
      const r = await post("/api/auth/password/login", { email, password });
      setPassword("");
      onSignedIn({ ...r.user, mustChangePassword: r.mustChangePassword });
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setBusy(null);
    }
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
    <div className="fixed inset-0 overflow-y-auto bg-canvas text-slate-100">
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

            {step === "password" ? (
              <form onSubmit={passwordSignIn} className="space-y-2.5">
                <label htmlFor="signin-email" className="block text-sm text-slate-300">
                  Email
                </label>
                <input
                  id="signin-email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl bg-slate-950 border border-white/15 focus:border-blue-500 outline-none px-3 py-2.5 text-sm text-white placeholder-slate-500"
                />
                <label htmlFor="signin-password" className="block text-sm text-slate-300">
                  Password
                </label>
                <input
                  id="signin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-white/15 focus:border-blue-500 outline-none px-3 py-2.5 text-sm text-white"
                />
                <button type="submit" disabled={busy === "password"} className="btn-primary w-full">
                  {busy === "password" && <Loader2 className="w-4 h-4 animate-spin" />} Sign in
                </button>
                {providers?.emailOtp && (
                  <button type="button" onClick={() => setStep("email")} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> Email me a sign-in code instead
                  </button>
                )}
              </form>
            ) : step === "email" ? (
              <form onSubmit={sendCode} className="space-y-2.5">
                <label htmlFor="signin-email" className="block text-sm text-slate-300">
                  Email me a sign-in code
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
                <button type="button" onClick={() => setStep("password")} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Use my password
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

            <p className="text-2xs text-slate-500 flex gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Forgot your password, or don't have one yet? Ask your school office: they can give you a new one.
            </p>
          </div>

          {providers?.dev && providers.devPasscode && !passcodeOk && (
            <form onSubmit={unlockTestAccounts} className="rounded-3xl border border-amber-500/30 bg-amber-500/[0.06] p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-200">
                <FlaskConical className="w-4 h-4" />
                <span className="text-sm font-semibold">Test accounts</span>
                <span className="text-2xs text-amber-200/70">staging only</span>
              </div>
              <label className="block text-xs text-slate-300" htmlFor="dev-passcode">
                Testing passcode
              </label>
              <div className="flex gap-2">
                <input
                  id="dev-passcode"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  autoComplete="off"
                  className="flex-1 min-w-0 h-11 rounded-xl bg-slate-950 border border-white/15 focus:border-amber-400 outline-none px-3 text-sm text-white"
                />
                <button type="submit" disabled={!passcode || busy === "passcode"} className="h-11 px-4 rounded-xl bg-amber-500 text-slate-950 text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-1.5">
                  {busy === "passcode" && <Loader2 className="w-4 h-4 animate-spin" />} Unlock
                </button>
              </div>
            </form>
          )}

          {providers?.dev && grouped.length > 0 && (
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/[0.06] p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-200">
                <FlaskConical className="w-4 h-4" />
                <span className="text-sm font-semibold">Test accounts</span>
                <span className="text-2xs text-amber-200/70">{providers.devPasscode ? "staging only" : "dummy sign-in · off in production"}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {QUICK.filter((q) => accounts.some((a) => a.id === q.id)).map(({ id, label, Icon, tone }) => {
                  const acct = accounts.find((a) => a.id === id)!;
                  return (
                    <button key={id} onClick={() => devSignIn(id)} disabled={!!busy} className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs ${tone} hover:brightness-125 disabled:opacity-60`}>
                      {busy === id ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Icon className="w-4 h-4 shrink-0" />}
                      <span className="min-w-0">
                        <span className="block font-semibold">{label}</span>
                        <span className="block text-2xs text-slate-400 truncate">{acct.name}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {grouped.map((g) => (
                <div key={g.role}>
                  <div className="text-2xs uppercase tracking-wider text-slate-400 mb-1.5">{ROLE_LABEL[g.role] || g.role}</div>
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
