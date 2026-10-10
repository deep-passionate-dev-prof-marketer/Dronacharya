import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cx } from "./cx";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Side panel on wide screens, bottom sheet on phones. Escape or the backdrop closes it; focus moves
 * into it, stays inside while it's open, and returns to where it was.
 */
export const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "md" | "lg" | "xl";
}> = ({ open, onClose, title, description, children, footer, width = "lg" }) => {
  const panel = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  React.useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first || panel.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "Tab" && panel.current) {
        const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const [a, z] = [items[0], items[items.length - 1]];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      before?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fadeIn" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          "absolute flex flex-col bg-surface-overlay border-line-strong shadow-overlay outline-none",
          "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl border-t animate-sheetUp pb-[env(safe-area-inset-bottom)]",
          "md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:max-h-none md:h-full md:rounded-none md:border-t-0 md:border-l md:animate-fadeIn",
          width === "md" ? "md:w-[420px]" : width === "lg" ? "md:w-[560px]" : "md:w-[760px]"
        )}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-line">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold text-ink leading-snug">
              {title}
            </h2>
            {description && <div className="mt-0.5 text-xs text-ink-3">{description}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-ink-3 hover:text-ink hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-line flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};
