import React, { useEffect, useState } from "react";
import { Apple, Monitor, ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import { SchoolLogo } from "../brand/SchoolLogo";

interface Downloads {
  version: string | null;
  mac: string | null;
  windows: string | null;
}

function detectOs(): "mac" | "windows" | "other" {
  const ua = navigator.userAgent;
  if (/Macintosh|Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua)) return "mac";
  if (/Windows/.test(ua)) return "windows";
  return "other";
}

/** Public page: get the desktop classroom app (needed for classes that block screen recording). */
export const DownloadPage: React.FC = () => {
  const [data, setData] = useState<Downloads | null>(null);
  const [error, setError] = useState(false);
  const os = detectOs();

  useEffect(() => {
    fetch("/api/desktop/downloads")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const options = [
    { key: "mac" as const, label: "macOS", sub: "macOS 12 or later", icon: Apple, href: data?.mac },
    { key: "windows" as const, label: "Windows", sub: "Windows 10 (2004) or later", icon: Monitor, href: data?.windows },
  ].sort((a, b) => Number(b.key === os) - Number(a.key === os));

  return (
    <div className="fixed inset-0 overflow-y-auto bg-canvas text-slate-100">
      <div className="min-h-full flex items-start sm:items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-5">
          <div className="flex justify-center">
            <SchoolLogo size="md" systemName="Dronacharya" theme="dark" />
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 sm:p-6 space-y-4">
            <div>
              <h1 className="text-xl font-bold text-white">21K School Classroom app</h1>
              <p className="text-sm text-slate-400 mt-1">
                Some classes can only be joined from the desktop app. It works like the website, and it keeps class content from being screen-recorded or captured.
              </p>
            </div>

            {!data && !error && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Checking available downloads…
              </div>
            )}

            {(data || error) && (
              <ul className="space-y-2">
                {options.map(({ key, label, sub, icon: Icon, href }) => (
                  <li key={key}>
                    {href ? (
                      <a href={href} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-4 py-3">
                        <Icon className="w-5 h-5 text-slate-200" />
                        <span className="flex-1">
                          <span className="block text-sm font-semibold text-white">Download for {label}</span>
                          <span className="block text-2xs text-slate-400">
                            {sub}
                            {data?.version ? ` · version ${data.version}` : ""}
                          </span>
                        </span>
                        {key === os && <span className="text-2xs px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-200 border border-blue-500/30">This computer</span>}
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 opacity-70">
                        <Icon className="w-5 h-5 text-slate-400" />
                        <span className="flex-1">
                          <span className="block text-sm font-semibold text-slate-300">{label}</span>
                          <span className="block text-2xs text-slate-500">Not published yet. Please ask your school for the installer.</span>
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {os === "other" && <p className="text-xs text-amber-200">The desktop app runs on Windows and Mac computers. Phones and tablets can't join classes that require it.</p>}

            <ol className="text-xs text-slate-400 space-y-1 list-decimal pl-4">
              <li>Install the app and open it.</li>
              <li>Sign in with the same account you use on the website.</li>
              <li>Open your class from the app (or paste the class link into it).</li>
            </ol>
            <p className="text-2xs text-slate-500 flex gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> On Windows, screenshots and screen recorders see a blank window. On Mac, screenshots and most recording tools do too.
            </p>
          </div>
          <a href="/" className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to 21K School
          </a>
        </div>
      </div>
    </div>
  );
};
