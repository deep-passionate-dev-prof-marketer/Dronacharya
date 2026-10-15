import React from "react";
import { ChevronLeft, ChevronRight, Loader2, MonitorUp, MonitorX, NotebookPen, Presentation, Upload, X } from "lucide-react";
import { useClassroom } from "../../../context/ClassroomContext";
import { attachClassContent, padStore, savePad, slidesStore, stopSlides, updateSlides, useStore } from "../../../services/classSlides";
import { useResource } from "../../../services/apiClient";
import { uploadMaterial } from "../../materials/Library";
import { toast } from "../../ui/Feedback";
import { PdfPage } from "./PdfPage";

interface Deck {
  id: string;
  title: string;
  classTitle: string | null;
  course: string | null;
  createdAt: string;
}

/** Keeps the shared stores pointed at the class on screen */
export function useClassContent() {
  const { roomId, inClass } = useClassroom();
  React.useEffect(() => {
    attachClassContent(inClass ? roomId : "");
  }, [roomId, inClass]);
}

/**
 * Dock tab "Slides & notes": the deck the class is following (hosts turn pages, learners follow
 * or browse on their own), and the teacher's notes pad (hosts write, everyone reads live).
 */
export const SlidesAndNotes: React.FC = () => {
  useClassContent();
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-4 bg-canvas">
      <SlidesPanel />
      <NotesPad />
    </div>
  );
};

const SlidesPanel: React.FC = () => {
  const { classHost, roomId } = useClassroom();
  const isHost = Boolean(classHost?.isHost);
  const slides = useStore(slidesStore);
  const [browse, setBrowse] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [uploadPct, setUploadPct] = React.useState<number | null>(null);
  const decks = useResource<{ materials: Deck[] }>(isHost ? "/api/materials?kind=slides" : null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => setBrowse(null), [slides?.materialId]);

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    const err = await fn();
    setBusy(false);
    if (err) toast(err, "critical");
  };
  const go = (page: number) => run(() => updateSlides({ page }));
  const upload = async (file: File) => {
    setUploadPct(0);
    const r = await uploadMaterial(file, { roomSlug: roomId, kind: "slides", title: file.name.replace(/\.pdf$/i, "") }, setUploadPct);
    setUploadPct(null);
    if (!r.ok) return toast(r.error, "critical");
    decks.reload();
    await run(() => updateSlides({ materialId: r.material.id }));
  };

  const page = browse ?? slides?.page ?? 1;
  const count = slides?.pageCount || null;

  return (
    <section aria-labelledby="slides-h" className="rounded-2xl border border-white/10 bg-slate-900/60 p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id="slides-h" className="text-sm font-semibold text-white flex items-center gap-1.5 min-w-0">
          <Presentation className="w-4 h-4 text-blue-300 shrink-0" />
          <span className="truncate">{slides ? slides.title : "Slides"}</span>
        </h3>
        {isHost && slides && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => run(() => updateSlides({ onStage: !slides.onStage }))}
              className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 ${slides.onStage ? "bg-blue-600 text-white" : "bg-white/10 text-slate-200"}`}
              aria-pressed={slides.onStage}
              title={slides.onStage ? "Showing on everyone's main stage" : "Show on everyone's main stage"}
            >
              {slides.onStage ? <MonitorX className="w-3.5 h-3.5" /> : <MonitorUp className="w-3.5 h-3.5" />}
              {slides.onStage ? "On stage" : "Show on stage"}
            </button>
            <button onClick={() => run(stopSlides)} className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 inline-flex items-center justify-center" aria-label="Stop presenting">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {slides ? (
        <>
          <div className="aspect-video w-full rounded-xl bg-black/40">
            <PdfPage
              materialId={slides.materialId}
              page={page}
              onPageCount={(n) => {
                if (isHost && slides.pageCount !== n) updateSlides({ pageCount: n });
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            {isHost ? (
              <>
                <button onClick={() => go(slides.page - 1)} disabled={busy || slides.page <= 1} className="h-10 px-3 rounded-xl bg-white/10 text-white disabled:opacity-40 inline-flex items-center gap-1 text-sm" aria-label="Previous slide">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <span className="text-xs text-slate-300 tabular-nums">
                  {slides.page}
                  {count ? ` / ${count}` : ""}
                </span>
                <button onClick={() => go(slides.page + 1)} disabled={busy || (count !== null && slides.page >= count)} className="h-10 px-3 rounded-xl bg-blue-600 text-white disabled:opacity-40 inline-flex items-center gap-1 text-sm" aria-label="Next slide">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : browse === null ? (
              <>
                <span className="text-xs text-slate-400">Following your teacher · slide {slides.page}{count ? ` of ${count}` : ""}</span>
                <button onClick={() => setBrowse(slides.page)} className="h-9 px-3 rounded-xl bg-white/10 text-white text-xs font-semibold">
                  Browse on my own
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <button onClick={() => setBrowse(Math.max(1, page - 1))} disabled={page <= 1} className="h-9 w-9 rounded-xl bg-white/10 text-white disabled:opacity-40 inline-flex items-center justify-center" aria-label="Previous slide">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-300 tabular-nums px-1">
                    {page}
                    {count ? ` / ${count}` : ""}
                  </span>
                  <button onClick={() => setBrowse(count ? Math.min(count, page + 1) : page + 1)} disabled={count !== null && page >= count} className="h-9 w-9 rounded-xl bg-white/10 text-white disabled:opacity-40 inline-flex items-center justify-center" aria-label="Next slide">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={() => setBrowse(null)} className="h-9 px-3 rounded-xl bg-blue-600 text-white text-xs font-semibold">
                  Back to teacher's slide
                </button>
              </>
            )}
          </div>
        </>
      ) : isHost ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-400">Present a PDF deck: everyone follows your page, and late joiners land on it.</p>
          {decks.data && decks.data.materials.length > 0 && (
            <ul className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {decks.data.materials.map((d) => (
                <li key={d.id}>
                  <button onClick={() => run(() => updateSlides({ materialId: d.id }))} disabled={busy} className="w-full text-left rounded-xl border border-white/10 hover:bg-white/5 px-3 py-2">
                    <span className="block text-sm text-white truncate">{d.title}</span>
                    <span className="block text-2xs text-slate-400 truncate">{d.classTitle || d.course || "Library"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) upload(f);
            }}
          />
          <button onClick={() => fileInput.current?.click()} disabled={uploadPct !== null} className="h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-70">
            {uploadPct !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploadPct !== null ? `Uploading ${uploadPct}%` : "Upload a PDF deck"}
          </button>
          <p className="text-2xs text-slate-500">PowerPoint or Google Slides: export as PDF first. The deck is also added to this class's library.</p>
        </div>
      ) : (
        <p className="text-sm text-slate-400">Your teacher hasn't shared slides yet. They'll appear here.</p>
      )}
    </section>
  );
};

const NotesPad: React.FC = () => {
  const { classHost } = useClassroom();
  const isHost = Boolean(classHost?.isHost);
  const pad = useStore(padStore);
  const [draft, setDraft] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const text = draft ?? pad.content;

  // Hosts' typing is saved a second after they pause (and when they leave the box)
  const flush = async (value: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setSaving("saving");
    const err = await savePad(value);
    setSaving(err ? "error" : "saved");
    if (err) toast(err, "critical");
    else setDraft((d) => (d === value ? null : d));
  };
  const onChange = (v: string) => {
    setDraft(v);
    setSaving("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(v), 1000);
  };
  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <section aria-labelledby="pad-h" className="rounded-2xl border border-white/10 bg-slate-900/60 p-3 flex flex-col gap-2 min-h-[14rem]">
      <div className="flex items-center justify-between">
        <h3 id="pad-h" className="text-sm font-semibold text-white flex items-center gap-1.5">
          <NotebookPen className="w-4 h-4 text-amber-300" /> Class notes
        </h3>
        <span className="text-2xs text-slate-400" aria-live="polite">
          {isHost
            ? saving === "saving"
              ? "Saving…"
              : saving === "error"
              ? "Not saved"
              : saving === "saved"
              ? "Saved"
              : draft !== null
              ? "Editing…"
              : ""
            : pad.updatedAt
            ? `Updated ${new Date(pad.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : ""}
        </span>
      </div>
      {isHost ? (
        <>
          <label htmlFor="class-pad" className="sr-only">
            Class notes (everyone in class can read these)
          </label>
          <textarea
            id="class-pad"
            value={text}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => draft !== null && flush(draft)}
            maxLength={20000}
            placeholder="Key points, homework, links… Learners see this live, and it's kept with the class recording."
            className="flex-1 min-h-[10rem] w-full rounded-xl bg-slate-950 border border-white/15 focus:border-blue-500 outline-none px-3 py-2.5 text-sm text-white placeholder-slate-500 resize-y"
          />
        </>
      ) : text ? (
        <div className="text-sm text-slate-200 whitespace-pre-wrap break-words rounded-xl bg-slate-950/60 border border-white/10 px-3 py-2.5">{text}</div>
      ) : (
        <p className="text-sm text-slate-400">Your teacher's notes appear here as they write them.</p>
      )}
    </section>
  );
};

/** Slides on the main stage (when the host puts them there): follows the host's page; hosts can turn pages here too */
export const SlidesStage: React.FC = () => {
  useClassContent();
  const { classHost } = useClassroom();
  const slides = useStore(slidesStore);
  if (!slides) return null;
  const isHost = Boolean(classHost?.isHost);
  return (
    <div className="relative w-full h-full bg-black/60 rounded-2xl p-2">
      <PdfPage materialId={slides.materialId} page={slides.page} label={`${slides.title}, slide ${slides.page}`} />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-2 py-1 rounded-xl bg-slate-950/80 border border-white/10">
        {isHost && (
          <button onClick={() => updateSlides({ page: slides.page - 1 })} disabled={slides.page <= 1} className="h-8 w-8 rounded-lg hover:bg-white/10 text-white disabled:opacity-40 inline-flex items-center justify-center" aria-label="Previous slide">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <span className="text-xs text-slate-200 tabular-nums px-1">
          {slides.page}
          {slides.pageCount ? ` / ${slides.pageCount}` : ""}
        </span>
        {isHost && (
          <button onClick={() => updateSlides({ page: slides.page + 1 })} disabled={slides.pageCount !== null && slides.page >= slides.pageCount} className="h-8 w-8 rounded-lg hover:bg-white/10 text-white disabled:opacity-40 inline-flex items-center justify-center" aria-label="Next slide">
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
