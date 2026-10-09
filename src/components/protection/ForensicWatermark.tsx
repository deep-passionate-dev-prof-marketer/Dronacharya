import React, { useEffect, useMemo, useState } from "react";
import { protectionBus } from "./protectionBus";

interface Props {
  /** School id + session fingerprint, e.g. "10ABCDEFGH · 4F2A9C" */
  id: string;
}

/**
 * Always-on forensic watermark over class content. Browsers can't block or pre-detect screenshots,
 * so the viewer's id is always present (faint, tiled, slowly drifting so it can't be cropped out
 * cleanly) and turns fully visible for a few seconds when a capture attempt is detected.
 */
export const ForensicWatermark: React.FC<Props> = ({ id }) => {
  const [now, setNow] = useState(() => new Date());
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    const off = protectionBus.onFlash(() => {
      setFlash(true);
      setTimeout(() => setFlash(false), 5000);
    });
    return () => {
      clearInterval(t);
      off();
    };
  }, []);

  const stamp = now.toISOString().slice(0, 16).replace("T", " ");
  // Tile rendered as SVG so it scales crisply on any display density
  const tile = useMemo(() => {
    const text = `${id}  ·  ${stamp} UTC`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="220"><g transform="rotate(-24 210 110)"><text x="20" y="120" font-family="JetBrains Mono, monospace" font-size="15" font-weight="700" fill="white">${text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")}</text></g></svg>`;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  }, [id, stamp]);

  return (
    <div
      aria-hidden="true"
      data-forensic-watermark
      className="pointer-events-none absolute inset-0 z-[35] overflow-hidden select-none"
      style={{ mixBlendMode: "difference" }}
    >
      <div
        className="absolute -inset-[220px] animate-[wmDrift_90s_linear_infinite]"
        style={{ backgroundImage: tile, backgroundRepeat: "repeat", opacity: flash ? 0.55 : 0.07, transition: "opacity 300ms" }}
      />
      {flash && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
          <span className="inline-block px-4 py-2 rounded-xl bg-black/70 text-white font-mono font-bold text-lg sm:text-2xl tracking-wider">
            {id} · {stamp} UTC
          </span>
        </div>
      )}
    </div>
  );
};
