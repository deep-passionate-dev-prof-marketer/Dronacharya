import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MonitorUp, Users, MessageSquareText, Presentation } from "lucide-react";
import type { Participant } from "../../../types";
import { bestFit, tilesPerPage } from "./bestFit";
import { WhiteboardCanvas } from "../WhiteboardCanvas";

export type Presentation =
  | { kind: "screen"; presenter: Participant; localStream?: MediaStream | null }
  | { kind: "whiteboard" }
  | null;

interface Props {
  participants: Participant[];
  renderTile: (p: Participant) => React.ReactNode;
  pinnedId: string | null;
  presentation: Presentation;
  /** < 1024px: swipeable panes (details · stage · people) instead of a single gallery */
  compact: boolean;
  detailsPane: React.ReactNode;
}

/** The person the stage should focus on when it can only show one: pinned → active speaker → teacher → anyone. */
function pickFocus(ps: Participant[], pinnedId: string | null): Participant | undefined {
  return (
    ps.find((p) => p.id === pinnedId) ||
    ps.find((p) => !p.isLocal && p.isSpeaking) ||
    ps.find((p) => p.role === "instructor") ||
    ps.find((p) => !p.isLocal) ||
    ps[0]
  );
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

// ------------------------------------------------------------------ gallery
export const GalleryGrid: React.FC<{ participants: Participant[]; renderTile: Props["renderTile"] }> = ({ participants, renderTile }) => {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const [page, setPage] = useState(0);
  // Self view moves to the end in bigger classes so classmates/teacher come first
  const ordered = useMemo(() => {
    if (participants.length <= 4) return participants;
    return [...participants.filter((p) => !p.isLocal), ...participants.filter((p) => p.isLocal)];
  }, [participants]);
  const perPage = w && h ? tilesPerPage(w, h) : 25;
  const pages = Math.max(1, Math.ceil(ordered.length / perPage));
  const current = Math.min(page, pages - 1);
  const visible = ordered.slice(current * perPage, current * perPage + perPage);
  const fit = bestFit(visible.length, w, h);

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div ref={ref} className="flex-1 min-h-0 flex flex-wrap content-center justify-center gap-2">
        {w > 0 &&
          visible.map((p) => (
            <div key={p.id} style={{ width: fit.tileW, height: fit.tileH }} className="shrink-0">
              {renderTile(p)}
            </div>
          ))}
      </div>
      {pages > 1 && (
        <div className="absolute inset-y-0 inset-x-0 flex items-center justify-between pointer-events-none px-1">
          <button
            onClick={() => setPage(Math.max(0, current - 1))}
            disabled={current === 0}
            className="pointer-events-auto h-10 w-10 rounded-full bg-slate-900/90 border border-white/15 text-white flex items-center justify-center disabled:opacity-0"
            aria-label="Previous participants"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setPage(Math.min(pages - 1, current + 1))}
            disabled={current >= pages - 1}
            className="pointer-events-auto h-10 w-10 rounded-full bg-slate-900/90 border border-white/15 text-white flex items-center justify-center disabled:opacity-0"
            aria-label="Next participants"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
      {pages > 1 && (
        <div className="text-center text-[11px] text-slate-400 pt-1">
          Page {current + 1} of {pages} · {ordered.length} people
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ presented content
const ScreenView: React.FC<{ presenter: Participant; localStream?: MediaStream | null }> = ({ presenter, localStream }) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (presenter.isLocal && localStream) {
      el.srcObject = localStream;
      el.play().catch(() => {});
      return;
    }
    return presenter.attachScreen?.(el);
  }, [presenter.attachScreen, presenter.isLocal, localStream]);
  return (
    <div className="relative w-full h-full rounded-2xl bg-black border border-white/10 overflow-hidden">
      <video ref={ref} autoPlay playsInline muted className="w-full h-full object-contain" />
      <span className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 text-[11px] text-slate-200">
        <MonitorUp className="w-3.5 h-3.5 text-emerald-400" />
        {presenter.isLocal ? "You are presenting" : `${presenter.name} is presenting`}
      </span>
    </div>
  );
};

/** Draggable picture-in-picture that snaps to the nearest corner. */
const Pip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [corner, setCorner] = useState<"br" | "bl" | "tr" | "tl">("br");
  const drag = useRef<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
  };
  const onUp = (e: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current = null;
    const parent = boxRef.current?.parentElement?.getBoundingClientRect();
    if (parent) {
      const right = e.clientX > parent.left + parent.width / 2;
      const bottom = e.clientY > parent.top + parent.height / 2;
      setCorner(`${bottom ? "b" : "t"}${right ? "r" : "l"}` as typeof corner);
    }
    setOffset({ x: 0, y: 0 });
  };
  const pos = { br: "bottom-3 right-3", bl: "bottom-3 left-3", tr: "top-3 right-3", tl: "top-3 left-3" }[corner];
  return (
    <div
      ref={boxRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      className={`absolute ${pos} z-20 w-[34%] max-w-[260px] min-w-[120px] aspect-video rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/20 touch-none cursor-grab active:cursor-grabbing ${drag.current ? "" : "transition-[top,right,bottom,left]"}`}
    >
      {children}
    </div>
  );
};

const Filmstrip: React.FC<{ participants: Participant[]; renderTile: Props["renderTile"] }> = ({ participants, renderTile }) =>
  participants.length ? (
    <div className="h-24 shrink-0 flex gap-2 overflow-x-auto no-scrollbar snap-x">
      {participants.map((p) => (
        <div key={p.id} className="h-full aspect-video shrink-0 snap-start">
          {renderTile(p)}
        </div>
      ))}
    </div>
  ) : null;

const PresentationStage: React.FC<{ presentation: NonNullable<Presentation>; pip?: React.ReactNode }> = ({ presentation, pip }) => (
  <div className="relative flex-1 min-h-0">
    {presentation.kind === "whiteboard" ? (
      <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 flex flex-col">
        <WhiteboardCanvas variant="stage" />
      </div>
    ) : (
      <ScreenView presenter={presentation.presenter} localStream={presentation.localStream} />
    )}
    {pip && <Pip>{pip}</Pip>}
  </div>
);

// ------------------------------------------------------------------ main layout
export const StageLayout: React.FC<Props> = ({ participants, renderTile, pinnedId, presentation, compact, detailsPane }) => {
  const focus = pickFocus(participants, pinnedId);
  // While something is presented, the teacher (or focus person) stays visible as a picture-in-picture
  const pipTile = focus ? renderTile(focus) : null;

  if (compact) {
    return (
      <MobileStagePager
        detailsPane={detailsPane}
        stagePane={
          presentation ? (
            <PresentationStage presentation={presentation} pip={pipTile} />
          ) : (
            <div className="relative flex-1 min-h-0 flex">
              {focus ? <div className="flex-1 min-h-0">{renderTile(focus)}</div> : null}
              {/* Your own camera stays visible in a corner while the teacher fills the screen */}
              {participants.find((p) => p.isLocal && p.id !== focus?.id) && (
                <Pip>{renderTile(participants.find((p) => p.isLocal)!)}</Pip>
              )}
            </div>
          )
        }
        peoplePane={
          <div className="grid grid-cols-2 gap-2 content-start">
            {participants.map((p) => (
              <div key={p.id} className="aspect-video">
                {renderTile(p)}
              </div>
            ))}
          </div>
        }
        peopleCount={participants.length}
      />
    );
  }

  if (presentation) {
    const others = participants.filter((p) => p.id !== focus?.id);
    return (
      <div className="flex-1 min-h-0 flex flex-col gap-2">
        <PresentationStage presentation={presentation} pip={pipTile} />
        <Filmstrip participants={others} renderTile={renderTile} />
      </div>
    );
  }

  if (pinnedId && focus && participants.length > 1) {
    return (
      <div className="flex-1 min-h-0 flex flex-col gap-2">
        <div className="flex-1 min-h-0">{renderTile(focus)}</div>
        <Filmstrip participants={participants.filter((p) => p.id !== focus.id)} renderTile={renderTile} />
      </div>
    );
  }

  return <GalleryGrid participants={participants} renderTile={renderTile} />;
};

// ------------------------------------------------------------------ phones & tablets
const PANES = [
  { key: "details", label: "Transcript", icon: MessageSquareText },
  { key: "stage", label: "Class", icon: Presentation },
  { key: "people", label: "People", icon: Users },
] as const;

const MobileStagePager: React.FC<{ detailsPane: React.ReactNode; stagePane: React.ReactNode; peoplePane: React.ReactNode; peopleCount: number }> = ({
  detailsPane,
  stagePane,
  peoplePane,
  peopleCount,
}) => {
  const scroller = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(1);
  const activeRef = useRef(1);

  // Start on the class itself, and stay on the current pane through resizes/rotation
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const snap = () => {
      if (el.clientWidth) el.scrollLeft = activeRef.current * el.clientWidth;
    };
    snap();
    const ro = new ResizeObserver(snap);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const go = (i: number) => scroller.current?.scrollTo({ left: i * scroller.current.clientWidth, behavior: "smooth" });

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-center gap-1 pb-2" role="tablist" aria-label="Class panes">
        {PANES.map((p, i) => {
          const Icon = p.icon;
          return (
            <button
              key={p.key}
              role="tab"
              aria-selected={active === i}
              onClick={() => go(i)}
              className={`h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                active === i ? "bg-white/15 text-white" : "text-slate-400"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {p.label}
              {p.key === "people" && <span className="text-slate-400">{peopleCount}</span>}
            </button>
          );
        })}
      </div>
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (!el.clientWidth) return;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          activeRef.current = i;
          setActive(i);
        }}
        className="flex-1 min-h-0 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory no-scrollbar overscroll-x-contain"
      >
        {/* All panes stay mounted while swiping, so video and audio never restart */}
        <section className="w-full shrink-0 snap-center overflow-y-auto px-0.5" aria-label="Transcript and class details">
          {detailsPane}
        </section>
        <section className="w-full shrink-0 snap-center flex flex-col min-h-0 px-0.5" aria-label="Class stage">
          {stagePane}
        </section>
        <section className="w-full shrink-0 snap-center overflow-y-auto px-0.5" aria-label="Participants">
          {peoplePane}
        </section>
      </div>
    </div>
  );
};
