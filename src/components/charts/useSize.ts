import React from "react";

/** Width of an element, kept up to date (charts redraw to fit their card). */
export function useWidth<T extends HTMLElement>(fallback = 600) {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(fallback);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth || fallback);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(120, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, width] as const;
}
