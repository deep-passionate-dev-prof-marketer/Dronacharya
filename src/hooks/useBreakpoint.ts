import { useEffect, useState } from "react";

/**
 * Layout tiers used across the shell:
 * - mobile:  < 768px  (phones, small tablets in portrait) - drawer nav, bottom tab bar, single pane
 * - tablet:  768-1279 (tablets, small laptops)            - icon rail, stacked/tabbed classroom panes
 * - desktop: >= 1280  (laptops & monitors)                 - expanded sidebar, side-by-side panes
 */
export type Breakpoint = "mobile" | "tablet" | "desktop";

const compute = (): Breakpoint => {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  return w < 768 ? "mobile" : w < 1280 ? "tablet" : "desktop";
};

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(compute);
  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setBp(compute()));
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  return bp;
}
