import { useEffect } from "react";
import { protectionBus, reportSecurityEvent } from "./protectionBus";

const isEditable = (el: EventTarget | null) => {
  const node = el as HTMLElement | null;
  if (!node) return false;
  return Boolean(node.closest?.("input, textarea, [contenteditable='true'], .allow-select"));
};

/**
 * Deterrence for class content in the browser:
 *  - no right-click / drag / print / save shortcuts on class surfaces;
 *  - capture attempts we *can* see (PrintScreen, Windows snip shortcut, print, devtools, in-page
 *    screen capture) flash the forensic watermark and are logged for auditors.
 * Browsers cannot block OS or third-party recorders; the desktop app does that (content protection).
 */
export function useContentGuard(opts: { enabled: boolean; roomSlug: string; view: string; allowScreenShare: boolean }) {
  const { enabled, roomSlug, view, allowScreenShare } = opts;

  useEffect(() => {
    if (!enabled) return;
    const log = (type: string, detail?: string) => reportSecurityEvent(type, { roomSlug, view, detail });
    const flash = (type: string, detail?: string) => {
      protectionBus.flash(type);
      log(type, detail);
    };

    const onContextMenu = (e: MouseEvent) => {
      if (isEditable(e.target)) return;
      e.preventDefault();
    };
    const onDragStart = (e: DragEvent) => {
      if ((e.target as HTMLElement)?.closest?.("video, canvas, img")) e.preventDefault();
    };

    let metaShiftAt = 0;
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key?.toLowerCase();
      if (e.key === "PrintScreen") return flash("printscreen_key");
      if (mod && key === "p") {
        e.preventDefault();
        return flash("print_attempt", "Ctrl/Cmd+P");
      }
      if (mod && key === "s" && !isEditable(e.target)) {
        e.preventDefault();
        return log("save_attempt");
      }
      // F12, Ctrl+Shift+I/J/C, Cmd+Opt+I/J/C
      if (e.key === "F12" || (mod && (e.shiftKey || e.altKey) && ["i", "j", "c"].includes(key))) {
        e.preventDefault();
        return log("devtools_shortcut");
      }
      // Windows Win+Shift+S (Snipping Tool): we only see the modifiers before the OS takes focus
      if (e.shiftKey && (e.metaKey || e.key === "Meta" || e.key === "OS")) metaShiftAt = Date.now();
      // macOS Cmd+Shift+3/4/5 is handled by the OS; when the browser does see it, react
      if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) flash("snip_shortcut", `Cmd+Shift+${e.key}`);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      // Windows only delivers PrintScreen on keyup
      if (e.key === "PrintScreen") {
        flash("printscreen_key");
        try {
          navigator.clipboard?.writeText(" "); // overwrite the copied screenshot where the browser allows
        } catch {}
      }
    };
    const onBlur = () => {
      if (Date.now() - metaShiftAt < 1500) flash("snip_shortcut", "Win+Shift+S");
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") log("tab_hidden");
    };
    const onBeforePrint = () => flash("print_attempt", "print dialog");

    // In-page screen capture (another tab of ours, or an extension calling the API from this page)
    const md = navigator.mediaDevices as any;
    const originalGdm = md?.getDisplayMedia?.bind(md);
    if (md && originalGdm) {
      md.getDisplayMedia = (...args: any[]) => {
        // Our own Share button announces itself; anything else on this page is a capture attempt
        if (protectionBus.consumeOwnScreenShare()) log("screen_capture_api", allowScreenShare ? "host screen share" : "learner screen share");
        else flash("screen_capture_api", "getDisplayMedia");
        return originalGdm(...args);
      };
    }

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeprint", onBeforePrint);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeprint", onBeforePrint);
      if (md && originalGdm) md.getDisplayMedia = originalGdm;
    };
  }, [enabled, roomSlug, view, allowScreenShare]);
}
