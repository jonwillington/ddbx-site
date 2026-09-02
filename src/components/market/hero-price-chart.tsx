/** One success story, drawn as it happened: the price the director bought
 *  into, the alert, and what the shares did next.
 *
 *  The hero's left half is the message; this is the right half's proof. It
 *  draws the real closes left to right, and the instant the line reaches the
 *  disclosure the notification beside it lands — same clock, one event (see
 *  `useDealRadar`). Then the continuation draws on in the positive colour,
 *  and when it reaches the end the outcome stamps in on the bar beneath
 *  the card (`HeroOutcomeBar`): "+135% in 107 days". That three-beat arc is the whole pitch — you got the alert,
 *  this is what followed, this is what it was worth.
 *
 *  It renders as a card nested inside the showcase panel — a curved thing in
 *  a curved thing — so the chart reads as an instrument the panel is holding
 *  rather than as loose ink on the panel's own ground. The plot is MEASURED
 *  rather than laid out in a fixed viewBox: the panel stretches to whatever
 *  height the message column happens to be, and a fixed aspect would either
 *  leave a band of dead card under the line or need `preserveAspectRatio`
 *  distortion to fill it. Points are computed in real pixels, so strokes stay
 *  true at every size.
 *
 *  What it deliberately is NOT:
 *
 *  - **No axis values, no tooltip.** The series are hand-authored shapes
 *    (`HeroDeal.series`), rebased and unitless. The grid is there to make the
 *    plot read as an instrument; putting numbers on it would be offering to
 *    reveal figures that were never real, and the static-page rule is that we
 *    never state one we don't have. Every number the reader actually reads is
 *    in the notification body, where it's a disclosed amount. This is the one
 *    chart on the site that skips the hover layer, and that's why.
 *
 *  The ONE figure it does state is the since-figure in the legend: the move
 *  from the alert point to the end of the drawn window, computed from the
 *  series itself and rounded to a whole percent. The series are authored from
 *  the real filings, so the figure is exactly as real as the shape — and
 *  because it's derived from the same points the line is drawn from, the
 *  number and the picture cannot disagree. It lands only after the muted
 *  continuation has finished drawing: the chart shows what followed first,
 *  then says it.
 *
 *  Colour carries one meaning only: the buy-style caption borrows the exact
 *  blue/emerald `BuyStyleChip` uses, so "contrarian" reads the same here as
 *  it does on a filing row. The line itself stays brand ink in both themes —
 *  a green line would imply the outcome the copy is careful not to claim.
 *
 *  Motion is pure CSS keyed off the shared timing constants, so the drawing
 *  cannot drift out of step with the notification: the parent re-mounts this
 *  on each cycle and the animations play once. Under prefers-reduced-motion
 *  it renders finished, markers and all.
 */
import type { HeroDeal } from "./hero-deal-data";

import { useId, useLayoutEffect, useRef, useState } from "react";

import { alertIndexOf, outcomeOf } from "./hero-deal-data";
import { DRAW_MS, POST_MS } from "./hero-deal-radar";

/** Inset from the measured plot box, in px. Top keeps the marker and the
 *  line's extremes off the grid's edge; the bottom seats the event labels
 *  under the plot — "The alert" on ordinary filings, "Traded"/"Filed" on a
 *  late Congress one — so every chart is self-captioned at the point itself. */
const INSET_X = 3;
const INSET_T = 12;
const INSET_B = 24;

/** Minimum span the y-axis covers, in rebased points. Without it a quiet
 *  series fills the same vertical space as a violent one, and every deal
 *  looks equally dramatic. */
const MIN_SPAN = 22;

/** Grid divisions. Unlabelled by design — see the note above about numbers. */
const GRID_ROWS = 4;
const GRID_COLS = 6;

/** Tallest the drawn band may get, as a fraction of the plot's width. The
 *  panel stretches to the message column, so the plot box can end up markedly
 *  portrait; mapping the full price span onto the full height there turns an
 *  ordinary drawdown into a cliff and a steady climb into a rocket. Past this
 *  the band stops growing and centres in the box, and the grid carries the
 *  rest — which is exactly what a real chart looks like when the price
 *  doesn't use its whole range. */
const MAX_BAND_ASPECT = 0.78;

/** Fallback box for the first paint, before the plot has been measured.
 *  useLayoutEffect corrects it before the browser paints, so this is never
 *  seen; it only keeps the first render from dividing by zero. */
const DEFAULT_BOX = { w: 272, h: 240 };

type Pt = { x: number; y: number };

function layout(series: number[], w: number, h: number, insetB: number): Pt[] {
  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const mid = (lo + hi) / 2;
  const span = Math.max(hi - lo, MIN_SPAN);
  const top = mid + span / 2;
  const innerW = Math.max(w - INSET_X * 2, 1);
  const availH = Math.max(h - INSET_T - insetB, 1);
  const bandH = Math.min(availH, innerW * MAX_BAND_ASPECT);
  const bandTop = INSET_T + (availH - bandH) / 2;

  return series.map((v, i) => ({
    x: INSET_X + (i * innerW) / (series.length - 1),
    y: bandTop + ((top - v) / span) * bandH,
  }));
}

const pathFrom = (pts: Pt[]) =>
  pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

const CAPTION = {
  contrarian: {
    label: "Bought into weakness",
    tint: "text-blue-700 dark:text-blue-300",
  },
  momentum: {
    label: "Bought into strength",
    tint: "text-emerald-700 dark:text-emerald-300",
  },
} as const;

export function HeroPriceChart({ deal }: { deal: HeroDeal }) {
  // Sanitised because these land inside url(#…) fragment references.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  // Congress filings disclose weeks after the trade, so they carry two
  // markers and the distance between them is the point. Everywhere else the
  // trade and the disclosure are the same moment on this scale.
  const twoMarkers = deal.filedIndex !== undefined;

  const plotRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState(DEFAULT_BOX);

  useLayoutEffect(() => {
    const el = plotRef.current;

    if (!el) return;
    const measure = () =>
      setBox({
        w: Math.max(el.clientWidth, 1),
        h: Math.max(el.clientHeight, 1),
      });

    measure();
    const ro = new ResizeObserver(measure);

    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const { w, h } = box;
  const pts = layout(deal.series, w, h, INSET_B);
  const alertIdx = alertIndexOf(deal);
  const alertPt = pts[alertIdx];
  const buyPt = pts[deal.buyIndex];
  const floor = h - INSET_B;

  // Whether the continuation may take the positive colour: only when the
  // outcome the bar beneath states is itself positive.
  const up = outcomeOf(deal).pct > 0;

  const pre = pathFrom(pts.slice(0, alertIdx + 1));
  const post = pathFrom(pts.slice(alertIdx));
  const lastPt = pts[pts.length - 1];
  const area = `${pre} L${alertPt.x.toFixed(2)} ${floor} L${INSET_X} ${floor} Z`;
  const postArea = `${post} L${lastPt.x.toFixed(2)} ${floor} L${alertPt.x.toFixed(2)} ${floor} Z`;

  // The trade marker lands when the drawing line passes it, which is the end
  // of the draw everywhere except Congress, where it's partway through.
  const buyDelay = twoMarkers ? (DRAW_MS * deal.buyIndex) / alertIdx : DRAW_MS;
  const caption = deal.buyStyle ? CAPTION[deal.buyStyle] : null;

  return (
    <figure
      className="hpc m-0 flex h-full flex-col overflow-hidden rounded-2xl px-3.5 pb-2.5 pt-2.5"
      style={
        {
          "--hpc-draw": `${DRAW_MS}ms`,
          "--hpc-post": `${POST_MS}ms`,
          "--hpc-buy-delay": `${Math.round(buyDelay)}ms`,
        } as React.CSSProperties
      }
    >
      <style>{`
        .hpc {
          /* Brand ink, not a directional green: the line must not pre-empt
             the outcome the copy declines to claim. */
          --hpc-line: var(--color-brand-brown);
          /* What followed the alert. Positive only when the outcome is. */
          --hpc-after: ${up ? "var(--color-positive)" : "var(--color-brand-brown)"};
          --hpc-after-opacity: ${up ? 1 : 0.4};
          /* The card's own fill. Marker rings use it, so a marker sitting on
             the line reads as punched out of it rather than outlined. */
          --hpc-fill: #fffdfa;
          --hpc-edge: var(--color-hairline);
          --hpc-grid: rgba(90, 65, 40, 0.055);
          background: var(--hpc-fill);
          border: 1px solid var(--hpc-edge);
        }
        :is(.dark) .hpc {
          --hpc-line: var(--color-brand-amber);
          --hpc-after: ${up ? "var(--color-positive)" : "var(--color-brand-amber)"};
          /* One step up from the recessed panel behind it, so the nesting
             reads as a card on a surface rather than a hole in a hole. */
          --hpc-fill: oklch(22.5% 0.021 55);
          --hpc-edge: rgba(255, 255, 255, 0.07);
          --hpc-grid: rgba(255, 255, 255, 0.05);
        }

        /* Left-to-right reveal. A clip wipe rather than stroke-dashoffset so
           the line and the area under it are uncovered by the same edge —
           the leading edge IS the tip of the line, which is what drawing
           looks like. Eased out rather than linear: it snaps across and
           settles onto the buy instead of trundling. */
        .hpc-wipe {
          transform: scaleX(0);
          animation: hpc-wipe var(--hpc-draw) cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .hpc-wipe-post {
          transform: scaleX(0);
          animation: hpc-wipe var(--hpc-post) cubic-bezier(0.33, 1, 0.68, 1)
                     var(--hpc-draw) forwards;
        }
        @keyframes hpc-wipe { to { transform: scaleX(1); } }

        /* The area under the line is revealed by the same wipe, which gives it
           a hard vertical leading edge — fine on a hairline stroke, a visible
           cut on a filled shape. Ramping its opacity across the draw hides the
           edge while it's crossing open ground; by the time the fill is at
           full strength the edge has reached the buy and stopped. */
        .hpc-area { opacity: 0; animation: hpc-area var(--hpc-draw) ease-in forwards; }
        @keyframes hpc-area { to { opacity: 1; } }

        /* Markers and the crosshair arrive with the line that reaches them,
           then rest. */
        .hpc-pop {
          opacity: 0;
          animation: hpc-pop 340ms cubic-bezier(0.34, 1.56, 0.64, 1) var(--hpc-buy-delay) forwards;
          transform-box: fill-box;
          transform-origin: center;
        }
        .hpc-pop-alert { animation-delay: var(--hpc-draw); }
        @keyframes hpc-pop {
          0%   { opacity: 0; transform: scale(0.2); }
          100% { opacity: 1; transform: scale(1); }
        }
        .hpc-fade {
          opacity: 0;
          animation: hpc-fade 360ms ease-out var(--hpc-buy-delay) forwards;
        }
        .hpc-fade-alert { animation-delay: var(--hpc-draw); }
        @keyframes hpc-fade { to { opacity: 1; } }
        /* The fill under the continuation ramps in with its wipe, for the
           same reason the run-up's does (a hard leading edge on a filled
           shape reads as a cut). */
        .hpc-area-post {
          opacity: 0;
          animation: hpc-area var(--hpc-post) ease-in var(--hpc-draw) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .hpc-wipe, .hpc-wipe-post { transform: scaleX(1); animation: none; }
          .hpc-area, .hpc-area-post, .hpc-pop, .hpc-fade {
            opacity: 1; transform: none; animation: none;
          }
        }
      `}</style>

      <figcaption className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-foreground/75">
          {deal.symbol}
        </span>
        {caption && (
          <span
            className={`hpc-fade ${twoMarkers ? "hpc-fade-alert" : ""} text-[10px] font-medium ${caption.tint}`}
          >
            {caption.label}
          </span>
        )}
      </figcaption>

      <div ref={plotRef} className="min-h-0 flex-1">
        <svg
          aria-hidden
          className="block h-full w-full"
          viewBox={`0 0 ${w} ${h}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`fill${uid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--hpc-line)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--hpc-line)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`after${uid}`} x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--hpc-after)"
                stopOpacity={up ? 0.18 : 0.08}
              />
              <stop
                offset="100%"
                stopColor="var(--hpc-after)"
                stopOpacity="0"
              />
            </linearGradient>
            <clipPath id={`pre${uid}`}>
              <rect
                className="hpc-wipe"
                height={h}
                style={{ transformOrigin: `${INSET_X}px 0px` }}
                width={Math.max(alertPt.x - INSET_X, 0)}
                x={INSET_X}
                y="0"
              />
            </clipPath>
            <clipPath id={`post${uid}`}>
              <rect
                className="hpc-wipe-post"
                height={h}
                style={{ transformOrigin: `${alertPt.x}px 0px` }}
                width={Math.max(w - alertPt.x, 0)}
                x={alertPt.x}
                y="0"
              />
            </clipPath>
          </defs>

          {/* Unlabelled grid. It is here to make the plot read as an
              instrument, not to be measured against. */}
          <g stroke="var(--hpc-grid)" strokeWidth="1">
            {Array.from({ length: GRID_ROWS + 1 }, (_, i) => {
              const y = INSET_T + ((floor - INSET_T) * i) / GRID_ROWS;

              return <line key={`r${i}`} x1={0} x2={w} y1={y} y2={y} />;
            })}
            {Array.from({ length: GRID_COLS + 1 }, (_, i) => {
              const x = (w * i) / GRID_COLS;

              return (
                <line key={`c${i}`} x1={x} x2={x} y1={INSET_T} y2={floor} />
              );
            })}
          </g>

          {/* What happened next — the story's second beat. Drawn in the
              positive colour with its own fill when the outcome is positive,
              muted ink when it isn't. */}
          <g clipPath={`url(#post${uid})`}>
            <path
              className="hpc-area-post"
              d={postArea}
              fill={`url(#after${uid})`}
            />
            <path
              d={post}
              fill="none"
              stroke="var(--hpc-after)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="var(--hpc-after-opacity)"
              strokeWidth="2"
            />
          </g>

          <g clipPath={`url(#pre${uid})`}>
            <path className="hpc-area" d={area} fill={`url(#fill${uid})`} />
            <path
              d={pre}
              fill="none"
              stroke="var(--hpc-line)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </g>

          {/* Crosshair on the buy: the price paid carried across the rest of
              the window (so the continuation reads against it without a
              number being stated) and a drop to the foot of the plot. */}
          <g
            className={`hpc-fade ${twoMarkers ? "" : "hpc-fade-alert"}`}
            stroke="var(--hpc-line)"
            strokeDasharray="2 4"
            strokeOpacity="0.45"
            strokeWidth="1"
          >
            <line x1={buyPt.x} x2={w} y1={buyPt.y} y2={buyPt.y} />
            <line x1={buyPt.x} x2={buyPt.x} y1={buyPt.y} y2={floor} />
          </g>

          {/* Trade. On Congress filings this is the earlier of two events, and
              it lands hollow — nobody could act on it yet. */}
          <circle
            className="hpc-pop"
            cx={buyPt.x}
            cy={buyPt.y}
            fill={twoMarkers ? "var(--hpc-fill)" : "var(--hpc-line)"}
            r="4"
            stroke={twoMarkers ? "var(--hpc-line)" : "var(--hpc-fill)"}
            strokeWidth="2"
          />

          {/* Ordinary filings caption the marker at the point itself, the way
              late Congress charts label "Traded"/"Filed" — the moment the
              panel exists to show shouldn't need a legend lookup. Clamped so
              a buy near the window's edge keeps its label on the plot. */}
          {!twoMarkers && (
            <text
              className="hpc-fade hpc-fade-alert"
              fill="currentColor"
              fontSize="9"
              opacity="0.5"
              textAnchor="middle"
              x={Math.min(Math.max(buyPt.x, 18), w - 18)}
              y={floor + 20}
            >
              The alert
            </text>
          )}

          {twoMarkers && (
            <>
              <line
                className="hpc-fade hpc-fade-alert"
                stroke="var(--hpc-line)"
                strokeDasharray="1 3"
                strokeOpacity="0.45"
                strokeWidth="1"
                x1={buyPt.x}
                x2={alertPt.x}
                y1={floor + 8}
                y2={floor + 8}
              />
              <text
                className="hpc-fade"
                fill="currentColor"
                fontSize="9"
                opacity="0.5"
                textAnchor="middle"
                x={buyPt.x}
                y={floor + 20}
              >
                Traded
              </text>
              <text
                className="hpc-fade hpc-fade-alert"
                fill="currentColor"
                fontSize="9"
                opacity="0.5"
                textAnchor="middle"
                x={Math.min(alertPt.x, w - 14)}
                y={floor + 20}
              >
                Filed
              </text>
              {/* Disclosure: the point the alert actually fires on. */}
              <circle
                className="hpc-pop hpc-pop-alert"
                cx={alertPt.x}
                cy={alertPt.y}
                fill="var(--hpc-line)"
                r="4"
                stroke="var(--hpc-fill)"
                strokeWidth="2"
              />
            </>
          )}
        </svg>
      </div>

      {/* Legend for the continuation. The figures it adds up to live on
          the outcome bar beneath the card, where they get the width. */}
      <div className="mt-2 flex items-center gap-1.5 text-[9.5px] font-medium uppercase tracking-wider text-foreground/40">
        <span
          aria-hidden
          className="h-[2px] w-3.5 rounded-full"
          style={{
            background: "var(--hpc-after)",
            opacity: "var(--hpc-after-opacity)",
          }}
        />
        Since the alert
      </div>
    </figure>
  );
}
