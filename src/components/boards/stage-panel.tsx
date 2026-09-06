/** The frame a board's proof object is drawn in, and nothing about what is
 *  drawn in it.
 *
 *  Extracted from the /biggest-buys stage (2026-09-05) so the six boards that
 *  followed it could share a hero without sharing its subject. The line drawn
 *  here is deliberate: the panel owns the object — the dark rounded container,
 *  the header row with the toggle in it, the measured width and the height it
 *  implies, which of one or two modes is showing and the single advance from
 *  the first to the second, what is active, where the tooltip hangs and how
 *  far it may travel, the loading pulse, and the caption strip. It owns no
 *  discs, no money, no alpha and no rule about any of them. A page's own stage
 *  file keeps its model, its scales, its layouts and its words.
 *
 *  Three of the six boards draw no circle packing and no signed scatter at
 *  all, which is the test this split has to pass: what is here is a frame, not
 *  the biggest-buys stage with holes cut in it.
 *
 *  The marks reach the panel through a context rather than through props.
 *  A mark five levels inside a page's own layout code still has to be able to
 *  set the active id and raise a tooltip, and threading two callbacks through
 *  every layer of a page's furniture is how those callbacks end up half
 *  wired — the /biggest-buys tooltip was anchored to the page rather than the
 *  chart for exactly that reason before 3dd23cc.
 */
import type { ReactNode } from "react";
import type { Linking } from "./board-model";

import { createContext, useContext, useEffect, useRef, useState } from "react";

import { useMeasuredWidth } from "./board-model";

export interface StagePad {
  l: number;
  r: number;
  t: number;
  b: number;
}

/** Where a tooltip hangs from. `r` is a clamp OFFSET rather than a radius —
 *  a disc passes its radius, a lane or a row passes half its height — so the
 *  tip clears the mark it describes whatever shape the mark is. */
export interface TipAnchor {
  x: number;
  y: number;
  r: number;
}

export interface StageMode<M extends string> {
  id: M;
  /** The toggle's text: "By amount", "By outcome", "How many", "When". */
  label: string;
}

export interface StageContext<M extends string> {
  W: number;
  H: number;
  pad: StagePad;
  mode: M;
  /** prefers-reduced-motion, read once. */
  reduced: boolean;
  /** An opaque page-defined string — a filing id, a ticker, a sector slug, a
   *  role. The panel never interprets it, it only compares it. */
  active: string | null;
  setActive: (id: string | null) => void;
  showTip: (id: string, anchor: TipAnchor) => void;
  hideTip: () => void;
  /** Sets the mode AND marks the panel touched, so the one auto-advance never
   *  moves the picture out from under a reader who has already chosen. */
  choose: (mode: M) => void;
}

/** The object itself. Rounded, hairline, dark in both themes — the design
 *  language's contained-not-blended tenet, and the reason the colours inside
 *  are fixed rather than read through the theme. */
const PANEL =
  "board-stage relative overflow-hidden rounded-[28px] border border-white/10 text-white shadow-[0_24px_60px_-30px_rgba(40,25,10,0.55)]";

/** Message column left, toggle right, both sitting on the chart's baseline. */
const HEADER_GRID =
  "grid gap-x-12 gap-y-6 px-6 pt-7 sm:px-8 sm:pt-9 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end";

/** The finding, in words, inside the object rather than under it. */
const CAPTION =
  "flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-white/10 px-5 py-3.5 text-[12.5px] leading-[1.5] text-white/65";

/** HTML over the SVG, and never under the pointer. */
const TIP =
  "pointer-events-none absolute z-20 min-w-[190px] rounded-xl border border-white/12 bg-[#241b12]/95 px-3 py-2 text-[12px] leading-[1.45] text-white shadow-xl backdrop-blur-md";

const DEFAULT_PAD: StagePad = { l: 56, r: 24, t: 68, b: 44 };

/** Wide enough to be an object, short enough that the rows below it are on
 *  the same screen. */
function defaultHeight(W: number): number {
  return Math.round(Math.min(660, Math.max(440, W * 0.56)));
}

const StageCtx = createContext<StageContext<string> | null>(null);

/** For StageMark, DotField and any page furniture that needs to set the
 *  active id without being handed it. */
export function useStage<M extends string = string>(): StageContext<M> {
  const ctx = useContext(StageCtx);

  if (!ctx) {
    throw new Error("useStage() was called outside a <BoardStagePanel>");
  }

  // The mode union is the page's own; the context is stored mode-blind, and
  // the panel is the only thing that ever writes it.
  return ctx as unknown as StageContext<M>;
}

function Toggle<M extends string>({
  modes,
  mode,
  onChoose,
}: {
  modes: ReadonlyArray<StageMode<M>>;
  mode: M;
  onChoose: (m: M) => void;
}) {
  return (
    <div className="flex rounded-full border border-white/12 bg-white/[0.06] p-0.5 backdrop-blur-md">
      {modes.map((m) => (
        <button
          key={m.id}
          aria-pressed={mode === m.id}
          className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium tracking-[-0.005em] transition-colors ${
            mode === m.id
              ? "bg-white text-[#1a140d]"
              : "text-white/65 hover:text-white"
          }`}
          type="button"
          onClick={() => onChoose(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

export interface BoardStagePanelProps<M extends string> {
  /** The page's eyebrow, h1, standfirst and figures. Required: whenever the
   *  panel is mounted the document's h1 lives inside it. */
  header: ReactNode;
  /** One or two. One means no toggle and no advance. */
  modes: ReadonlyArray<StageMode<M>>;
  /** The single advance from the first mode to the last, once the board has
   *  arrived. `null` disables it. Skipped when the reader has already reached
   *  for the toggle, and never armed under reduced motion — which opens on
   *  the LAST mode instead, because the answer is worth more than the move. */
  advanceAfterMs?: number | null;
  height?: (W: number) => number;
  /** A function form lets a page widen its left gutter only from a
   *  breakpoint, for lane labels that a phone has no room for. */
  pad?: StagePad | ((W: number) => StagePad);
  /** The header still renders; the chart, the caption and the tooltip do
   *  not. The pulse stands at the arrived height so nothing below it moves
   *  when the data lands. */
  loading: boolean;
  /** When given, active state is the page's, so the stage and the rows under
   *  it highlight the same thing. */
  linking?: Linking;
  /** The svg's aria-label per mode — the only place a per-mode description
   *  lives, so there is one sentence to keep true rather than two. */
  svgLabel: (mode: M) => string;
  /** The finding sentence inside the strip under the chart. Handed `choose`
   *  so the first mode can offer the text button through to the second. */
  caption?: (ctx: StageContext<M>) => ReactNode;
  /** Tooltip CONTENT. The panel supplies the shell and the clamped position
   *  from the anchor the mark registered. */
  renderTip?: (id: string, ctx: StageContext<M>) => ReactNode;
  /** The marks and the furniture, rendered inside the svg. */
  children: (ctx: StageContext<M>) => ReactNode;
}

export function BoardStagePanel<M extends string>({
  header,
  modes,
  advanceAfterMs = 2600,
  height = defaultHeight,
  pad = DEFAULT_PAD,
  loading,
  linking,
  svgLabel,
  caption,
  renderTip,
  children,
}: BoardStagePanelProps<M>) {
  const [ref, width] = useMeasuredWidth<HTMLDivElement>();
  // Read once. A reader who changes the system setting mid-visit is not worth
  // a media-query listener here, and re-reading it every render made the
  // advance effect fire on an unrelated re-render.
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
  );
  const advanceTo = modes[modes.length - 1].id;
  const canAdvance = modes.length > 1;
  const [mode, setMode] = useState<M>(() =>
    reduced ? advanceTo : modes[0].id,
  );
  const touched = useRef(false);
  const [tip, setTip] = useState<{ id: string; anchor: TipAnchor } | null>(
    null,
  );
  const [ownActive, setOwnActive] = useState<string | null>(null);

  // Open on the first arrangement, then advance to the second once.
  useEffect(() => {
    if (loading || reduced || !canAdvance || advanceAfterMs == null) return;
    const t = window.setTimeout(() => {
      if (!touched.current) setMode(advanceTo);
    }, advanceAfterMs);

    return () => window.clearTimeout(t);
  }, [loading, reduced, canAdvance, advanceAfterMs, advanceTo]);

  // A tooltip is anchored where the mark was when the pointer reached it, so
  // it cannot survive the marks moving somewhere else.
  useEffect(() => setTip(null), [mode]);

  const W = Math.max(300, width);
  const H = height(W);
  // Held by value, not by identity. A page that passes the function form
  // rebuilds its pad on every render, and pad is a dependency of the layout
  // memos downstream — a fresh object would repack the whole stage every time
  // a pointer crossed a row.
  const nextPad = typeof pad === "function" ? pad(W) : pad;
  const padRef = useRef(nextPad);

  if (
    padRef.current.l !== nextPad.l ||
    padRef.current.r !== nextPad.r ||
    padRef.current.t !== nextPad.t ||
    padRef.current.b !== nextPad.b
  ) {
    padRef.current = nextPad;
  }
  const active = linking ? linking.activeId : ownActive;
  const setActive = linking ? linking.setActiveId : setOwnActive;

  // Rebuilt each render rather than memoised: every consumer is a child of
  // this render anyway, so a stable identity would buy nothing.
  const ctx: StageContext<M> = {
    W,
    H,
    pad: padRef.current,
    mode,
    reduced,
    active,
    setActive,
    showTip: (id, anchor) => setTip({ id, anchor }),
    hideTip: () => setTip(null),
    choose: (m: M) => {
      touched.current = true;
      setMode(m);
    },
  };

  return (
    <StageCtx.Provider value={ctx as unknown as StageContext<string>}>
      <div ref={ref} className={PANEL}>
        <div className={HEADER_GRID}>
          <div className="min-w-0">{header}</div>
          {canAdvance ? (
            <div className="flex lg:justify-end">
              <Toggle mode={mode} modes={modes} onChoose={ctx.choose} />
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="animate-pulse" style={{ height: H }} />
        ) : (
          <div className="relative">
            <svg
              aria-label={svgLabel(mode)}
              className="block"
              height={H}
              role="img"
              width={W}
            >
              {children(ctx)}
            </svg>
            {tip && renderTip ? (
              <div
                className={TIP}
                style={{
                  left: Math.min(
                    W - 210,
                    Math.max(8, tip.anchor.x + tip.anchor.r + 12),
                  ),
                  top: Math.max(8, tip.anchor.y - 30),
                }}
              >
                {renderTip(tip.id, ctx)}
              </div>
            ) : null}
          </div>
        )}

        {!loading && caption ? (
          <div className={CAPTION}>{caption(ctx)}</div>
        ) : null}
      </div>
    </StageCtx.Provider>
  );
}
