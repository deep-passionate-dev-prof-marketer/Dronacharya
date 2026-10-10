import React from "react";
import { cx } from "./cx";

/** A button that opens a small panel under it. Closes on Escape, outside click, or `close()`. */
export const Popover: React.FC<{
  trigger: (p: { open: boolean; toggle: () => void; ref: React.Ref<HTMLButtonElement>; id: string }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "start" | "end";
  className?: string;
}> = ({ trigger, children, align = "start", className }) => {
  const [open, setOpen] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null);
  const btn = React.useRef<HTMLButtonElement>(null);
  const id = React.useId();
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const close = () => {
    setOpen(false);
    btn.current?.focus();
  };
  return (
    <div ref={root} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o), ref: btn, id })}
      {open && (
        <div
          id={id}
          className={cx(
            "absolute z-50 mt-2 min-w-56 max-w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line-strong bg-surface-overlay shadow-overlay p-2 animate-fadeIn",
            align === "end" ? "right-0" : "left-0",
            className
          )}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
};
