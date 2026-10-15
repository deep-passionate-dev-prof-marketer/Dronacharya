import React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cx } from "./cx";

/**
 * In-app toasts and confirmation dialogs, instead of the browser's alert()/confirm()/prompt()
 * (which block the page, can't be styled, and are suppressed in some embedded browsers).
 *
 *   toast("Link copied")                       toast("Couldn't save", "critical")
 *   if (await confirmDialog({ title: "End the class for everyone?", confirmLabel: "End class", tone: "critical" })) …
 *
 * <FeedbackHost /> is mounted once at the app root.
 */
type ToastTone = "good" | "critical" | "neutral";
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}
interface ConfirmRequest {
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "critical" | "accent";
  /** Ask for a line of text instead of yes/no */
  input?: { placeholder?: string; initial?: string; maxLength?: number };
  resolve: (ok: boolean, value?: string) => void;
}

let toastId = 0;
const toastSubs = new Set<(t: ToastItem) => void>();
const confirmSubs = new Set<(c: ConfirmRequest) => void>();

export function toast(message: string, tone: ToastTone = "good") {
  const item = { id: ++toastId, message, tone };
  toastSubs.forEach((fn) => fn(item));
}

export function confirmDialog(opts: Omit<ConfirmRequest, "resolve">): Promise<boolean> {
  // Nothing mounted (shouldn't happen): fall back to the browser so the action isn't silently lost
  if (!confirmSubs.size) return Promise.resolve(window.confirm(opts.title));
  return new Promise((resolve) => confirmSubs.forEach((fn) => fn({ ...opts, resolve })));
}

/** Asks for a line of text in the app (null if cancelled or empty) */
export function promptDialog(opts: { title: string; body?: React.ReactNode; placeholder?: string; initial?: string; confirmLabel?: string; maxLength?: number }): Promise<string | null> {
  if (!confirmSubs.size) return Promise.resolve(window.prompt(opts.title, opts.initial || ""));
  return new Promise((resolve) =>
    confirmSubs.forEach((fn) =>
      fn({
        title: opts.title,
        body: opts.body,
        confirmLabel: opts.confirmLabel || "OK",
        input: { placeholder: opts.placeholder, initial: opts.initial, maxLength: opts.maxLength },
        resolve: (ok, value) => resolve(ok && value?.trim() ? value.trim() : null),
      })
    )
  );
}

/** Copies text, with a toast either way (and the text shown if the clipboard is blocked). */
export async function copyText(text: string, done = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    toast(done);
    return true;
  } catch {
    toast(`Couldn't copy automatically. Select and copy: ${text}`, "neutral");
    return false;
  }
}

export const FeedbackHost: React.FC = () => {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const [confirm, setConfirm] = React.useState<ConfirmRequest | null>(null);
  const [inputValue, setInputValue] = React.useState("");
  const confirmBtn = React.useRef<HTMLButtonElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onToast = (t: ToastItem) => {
      setToasts((list) => [...list.slice(-3), t]);
      setTimeout(() => setToasts((list) => list.filter((x) => x.id !== t.id)), t.tone === "critical" ? 7000 : 4000);
    };
    const onConfirm = (c: ConfirmRequest) =>
      setConfirm((cur) => {
        cur?.resolve(false);
        return c;
      });
    toastSubs.add(onToast);
    confirmSubs.add(onConfirm);
    return () => {
      toastSubs.delete(onToast);
      confirmSubs.delete(onConfirm);
    };
  }, []);

  React.useEffect(() => {
    if (!confirm) return;
    const before = document.activeElement as HTMLElement | null;
    setInputValue(confirm.input?.initial || "");
    if (confirm.input) setTimeout(() => inputRef.current?.focus(), 0);
    else confirmBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirm]);

  const close = (ok: boolean) => {
    confirm?.resolve(ok, inputValue);
    setConfirm(null);
  };

  return createPortal(
    <>
      <div className="fixed z-[90] bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm flex flex-col gap-2 pointer-events-none" aria-live="polite">
        {toasts.map((t) => {
          const Icon = t.tone === "good" ? CheckCircle2 : t.tone === "critical" ? AlertTriangle : Info;
          return (
            <div
              key={t.id}
              role={t.tone === "critical" ? "alert" : "status"}
              className={cx(
                "pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm shadow-2xl animate-fadeIn bg-surface-raised text-ink break-words",
                t.tone === "critical" ? "border-critical/50" : t.tone === "good" ? "border-good/40" : "border-line-strong"
              )}
            >
              <Icon className={cx("w-4 h-4 mt-0.5 shrink-0", t.tone === "critical" ? "text-critical" : t.tone === "good" ? "text-good" : "text-ink-3")} />
              <span className="flex-1 min-w-0">{t.message}</span>
              <button onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))} className="p-0.5 rounded text-ink-3 hover:text-ink" aria-label="Dismiss">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      {confirm && (
        <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 animate-fadeIn" onClick={() => close(false)} aria-hidden="true" />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl border border-line-strong bg-surface-raised p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl animate-sheetUp sm:animate-fadeIn"
          >
            <h2 id="confirm-title" className="text-base font-bold text-ink">
              {confirm.title}
            </h2>
            {confirm.body && <div className="mt-2 text-sm text-ink-3">{confirm.body}</div>}
            {confirm.input && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  close(true);
                }}
              >
                <label htmlFor="feedback-prompt" className="sr-only">
                  {confirm.title}
                </label>
                <input
                  id="feedback-prompt"
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={confirm.input.placeholder}
                  maxLength={confirm.input.maxLength || 200}
                  className="mt-3 w-full min-h-11 rounded-xl bg-surface-sunken border border-line-strong focus:border-accent outline-none px-3 text-sm text-ink placeholder:text-ink-3"
                />
              </form>
            )}
            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button onClick={() => close(false)} className="min-h-11 px-4 rounded-xl border border-line-strong text-sm font-semibold text-ink-2 hover:bg-white/5">
                {confirm.cancelLabel || "Cancel"}
              </button>
              <button
                ref={confirmBtn}
                onClick={() => close(true)}
                className={cx(
                  "min-h-11 px-4 rounded-xl text-sm font-semibold text-white",
                  confirm.tone === "critical" ? "bg-rose-600 hover:bg-rose-500" : "bg-blue-600 hover:bg-blue-500"
                )}
              >
                {confirm.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};
