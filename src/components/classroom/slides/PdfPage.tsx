import React from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

/** pdf.js loads on first use (it's large), with its worker served from this site */
let pdfjs: Promise<typeof import("pdfjs-dist")> | null = null;
function loadPdfjs() {
  if (!pdfjs) {
    pdfjs = Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]).then(([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = (worker as any).default;
      return lib;
    });
  }
  return pdfjs;
}

const docs = new Map<string, Promise<PDFDocumentProxy>>();
/** One download per deck per page load */
export function loadDeck(materialId: string) {
  if (!docs.has(materialId)) {
    const p = loadPdfjs().then(
      (lib) =>
        lib.getDocument({
          url: `/api/materials/${encodeURIComponent(materialId)}/download`,
          withCredentials: true,
          // Never run code from a PDF
          isEvalSupported: false,
          enableXfa: false,
        }).promise
    );
    p.catch(() => docs.delete(materialId));
    docs.set(materialId, p);
  }
  return docs.get(materialId)!;
}

/**
 * One page of a PDF deck, fitted to its box and sharp on high-density screens. Reports the page
 * count once the deck has loaded.
 */
export const PdfPage: React.FC<{ materialId: string; page: number; onPageCount?: (n: number) => void; className?: string; label?: string }> = ({
  materialId,
  page,
  onPageCount,
  className = "",
  label,
}) => {
  const box = React.useRef<HTMLDivElement>(null);
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const [state, setState] = React.useState<"loading" | "ready" | "error">("loading");
  const [size, setSize] = React.useState({ w: 0, h: 0 });

  React.useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    if (!size.w || !size.h) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    setState((s) => (s === "ready" ? s : "loading"));
    loadDeck(materialId)
      .then(async (doc) => {
        if (cancelled) return;
        onPageCount?.(doc.numPages);
        const p = await doc.getPage(Math.min(Math.max(1, page), doc.numPages));
        if (cancelled || !canvas.current) return;
        const base = p.getViewport({ scale: 1 });
        const scale = Math.min(size.w / base.width, size.h / base.height);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const vp = p.getViewport({ scale: scale * dpr });
        const c = canvas.current;
        c.width = Math.floor(vp.width);
        c.height = Math.floor(vp.height);
        c.style.width = `${Math.floor(vp.width / dpr)}px`;
        c.style.height = `${Math.floor(vp.height / dpr)}px`;
        task = p.render({ canvasContext: c.getContext("2d")!, viewport: vp });
        await task.promise;
        if (!cancelled) setState("ready");
      })
      .catch((err) => {
        if (!cancelled && err?.name !== "RenderingCancelledException") setState("error");
      });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [materialId, page, size.w, size.h]);

  return (
    <div ref={box} className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}>
      <canvas ref={canvas} role="img" aria-label={label || `Slide ${page}`} className={`rounded-lg shadow-2xl bg-white ${state === "ready" ? "" : "opacity-0"}`} />
      {state === "loading" && <span className="absolute w-8 h-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" aria-label="Loading slide" />}
      {state === "error" && <p className="absolute text-sm text-ink-3 text-center px-4">Couldn't open this slide deck. It may have been removed from the library.</p>}
    </div>
  );
};
