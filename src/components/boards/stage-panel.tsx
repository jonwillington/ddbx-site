/** The frame a board's proof object is drawn in, and nothing about what is
 *  drawn in it.
 *
 *  Extracted from the /biggest-buys stage (2026-09-05) so the six boards that
 *  followed it could share a hero without sharing its subject. The line drawn
 *  here is deliberate: the panel owns the object — the dark rounded container,
 *  the header row with the toggle in it, the measured width and the height it
 *  implies, which of one or two modes is showing and which one the board opens
 *  on, what is active, where the tooltip hangs and how far it may travel, the
 *  loading skeleton, and the caption strip. It owns no discs, no money, no
 *  alpha and no rule about any of them. A page's own stage file keeps its
 *  model, its scales, its layouts and its words.
 *
 *  The mode never changes on its own. Until 2026-09-06 the panel advanced from
 *  the first arrangement to the second on a 2.6s timer, on the theory that the
 *  re-sort was the hook. It read as a page that would not hold still: a reader
 *  parsing the opening picture had it replaced mid-sentence, and the toggle
 *  they had not yet noticed was what had moved it. A board whose second
 *  arrangement is the stronger opener names it in `initialMode` and offers the
 *  first through the caption's text button instead.
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

import { Skeleton } from "../skeleton";

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
  /** Sets the mode. Handed to the caption so a text button there can offer the
   *  other arrangement without the reader having to find the toggle. */
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
  disabled,
  onChoose,
}: {
  modes: ReadonlyArray<StageMode<M>>;
  mode: M;
  /** True while the board is loading. The toggle is rendered rather than
   *  withheld — it is part of the arrived geometry — but pressing it before
   *  there is anything to re-arrange only re-labels an empty frame. */
  disabled: boolean;
  onChoose: (m: M) => void;
}) {
  return (
    <div className="flex rounded-full border border-white/12 bg-white/[0.06] p-0.5 backdrop-blur-md">
      {modes.map((m) => (
        <button
          key={m.id}
          aria-pressed={mode === m.id}
          className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium tracking-[-0.005em] transition-colors disabled:pointer-events-none disabled:opacity-40 ${
            mode === m.id
              ? "bg-white text-[#1a140d]"
              : "text-white/65 hover:text-white"
          }`}
          disabled={disabled}
          type="button"
          onClick={() => onChoose(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

/** The stand-in for the picture, at the exact height and inside the exact pad
 *  the arrived board will use.
 *
 *  Until 2026-09-06 this was `<div className="animate-pulse" style={{height}}/>`
 *  — an empty dark void, pulsing nothing, for the second or two a board takes
 *  to arrive. The geometry was already right (H is computed whether or not the
 *  data is there); what was missing was anything inside it.
 *
 *  Two shapes cover all seven boards, because there are only two things a
 *  stage draws: a field with marks scattered in it, and a list of rows. It is
 *  a hint, not a preview — five hairlines and a few stubs, no dots. A skeleton
 *  that guessed at the marks would be drawing a finding nobody has computed
 *  yet, which is the second static-page rule wearing a different hat. */
function StageSkeleton({
  W,
  H,
  pad,
  shape,
  rows,
}: {
  W: number;
  H: number;
  pad: StagePad;
  shape: "field" | "rows";
  rows: number;
}) {
  const innerW = Math.max(0, W - pad.l - pad.r);
  const innerH = Math.max(0, H - pad.t - pad.b);

  if (shape === "rows") {
    const n = Math.max(1, rows);
    const rowH = innerH / n;
    // A 25-row board gives each row about 20px, so the disc is sized off the
    // row rather than fixed — an oversized circle would spill across the
    // hairline it is meant to sit inside.
    const disc = Math.max(8, Math.min(22, rowH - 6));

    return (
      <div aria-hidden style={{ height: H, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: pad.l,
            top: pad.t,
            width: innerW,
            height: innerH,
          }}
        >
          {Array.from({ length: n }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-white/[0.06] last:border-b-0"
              style={{ height: rowH }}
            >
              <Skeleton circle h={disc} w={disc} />
              <Skeleton className="h-[11px] w-1/3" />
              <Skeleton className="ml-auto h-[11px] w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const lines = 5;

  return (
    <div aria-hidden style={{ height: H, position: "relative" }}>
      {Array.from({ length: lines }, (_, i) => {
        const y = pad.t + (innerH * i) / (lines - 1);

        return (
          <div key={i}>
            <div
              style={{
                position: "absolute",
                left: pad.l,
                top: y,
                width: innerW,
                height: 1,
                background: "rgb(255 255 255 / 0.05)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: Math.max(8, pad.l - 52),
                top: y - 4,
              }}
            >
              <Skeleton className="h-[9px] w-[44px]" />
            </div>
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: pad.l + Math.max(0, innerW / 2 - 66),
          top: H - pad.b + 14,
        }}
      >
        <Skeleton className="h-[12px] w-[132px]" />
      </div>
    </div>
  );
}

export interface BoardStagePanelProps<M extends string> {
  /** The page's eyebrow, h1, standfirst and figures. Required: whenever the
   *  panel is mounted the document's h1 lives inside it. */
  header: ReactNode;
  /** One or two. One means no toggle. */
  modes: ReadonlyArray<StageMode<M>>;
  /** Which arrangement the board opens on. Defaults to the first mode. A page
   *  whose second arrangement is the stronger opener names it here rather than
   *  reordering the toggle, so the toggle still reads in narrative order. */
  initialMode?: M;
  height?: (W: number) => number;
  /** A function form lets a page widen its left gutter only from a
   *  breakpoint, for lane labels that a phone has no room for. */
  pad?: StagePad | ((W: number) => StagePad);
  /** The header still renders; the chart and the tooltip do not, and the
   *  caption strip holds a reserved line. The skeleton stands at the arrived
   *  height, inside the arrived pad, so nothing below it moves when the data
   *  lands. */
  loading: boolean;
  /** Which stand-in the loading state draws. "field" is the default because
   *  five of the seven boards scatter marks in a padded field; "rows" is for
   *  the boards that are a ranked list. */
  skeletonShape?: "field" | "rows";
  /** How many rows the "rows" stand-in draws. Pass the board's real cap so the
   *  stand-in and the arrived list have the same row height. */
  skeletonRows?: number;
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
  initialMode,
  height = defaultHeight,
  pad = DEFAULT_PAD,
  loading,
  skeletonShape = "field",
  skeletonRows = 8,
  linking,
  svgLabel,
  caption,
  renderTip,
  children,
}: BoardStagePanelProps<M>) {
  const [ref, width] = useMeasuredWidth<HTMLDivElement>();
  // Read once. A reader who changes the system setting mid-visit is not worth
  // a media-query listener here, and the marks that consume it only read it as
  // "may I transition", which is a per-mount answer.
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
  );
  const hasToggle = modes.length > 1;
  // The guard is load-bearing rather than defensive: /roles drops to a
  // single-mode toggle when it has no alpha to draw yet, and a page naming the
  // mode that just disappeared would otherwise open on nothing.
  const [mode, setMode] = useState<M>(() =>
    initialMode && modes.some((m) => m.id === initialMode)
      ? initialMode
      : modes[0].id,
  );
  const [tip, setTip] = useState<{ id: string; anchor: TipAnchor } | null>(
    null,
  );
  const [ownActive, setOwnActive] = useState<string | null>(null);

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
    choose: (m: M) => setMode(m),
  };

  return (
    <StageCtx.Provider value={ctx as unknown as StageContext<string>}>
      <div ref={ref} className={PANEL}>
        <div className={HEADER_GRID}>
          <div className="min-w-0">{header}</div>
          {hasToggle ? (
            <div className="flex lg:justify-end">
              <Toggle
                disabled={loading}
                mode={mode}
                modes={modes}
                onChoose={ctx.choose}
              />
            </div>
          ) : null}
        </div>

        {loading ? (
          <StageSkeleton
            H={H}
            W={W}
            pad={padRef.current}
            rows={skeletonRows}
            shape={skeletonShape}
          />
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

        {/* The strip is reserved, not withheld. Rendering it only once the
            caption has words to say made the panel grow by a row the moment
            the data landed, which moved everything below the stage. */}
        {caption ? (
          <div className={CAPTION}>
            {loading ? (
              <Skeleton className="h-[13px] w-3/5 max-w-[420px]" />
            ) : (
              caption(ctx)
            )}
          </div>
        ) : null}
      </div>
    </StageCtx.Provider>
  );
}
