import type { ChartMode } from "@/lib/markets/types";

import { useEffect, useMemo, useRef, useState } from "react";

import { deltaStyle } from "./market-utils";

export interface SparkBar {
  /** ISO `YYYY-MM-DD`. */
  date: string;
  /** Close in whatever raw unit the API returns (`close_pence`). Units only
   *  need to be consistent within a single bars array — the sparkline
   *  rebases at the anchor so absolute scale never matters. */
  close: number;
}

interface MarketRowSparkProps {
  bars?: SparkBar[];
  benchmarkBars?: SparkBar[];
  /** Trade date on the wire row. Sparkline anchors here when
   *  `chartMode.anchor === "trade"`. */
  tradeDate: string;
  disclosedDate: string;
  chartMode: ChartMode;
  width?: number;
  height?: number;
}

/** Minimum percentage-point span the y-axis covers. Without this, a 0.5pp
 *  wobble visually fills the same vertical space as a 5pp move because the
 *  axis auto-fits the data. Clamping the half-span enforces "flatter looks
 *  flatter" — tiny ranges use a fraction of the height. */
const MIN_RANGE_PP = 6;

/** How long the polyline takes to ease into a new state (chart-mode toggle,
 *  fresh poll). Picked to feel smooth without lagging behind the user. */
const ANIM_DURATION_MS = 280;

/** Inline post-trade trend line. Tiny by design — colour communicates the
 *  current bias (green up / red down), shape gives a hint of the path.
 *  No tooltip, no axis labels — the full chart already lives in the
 *  detail drawer. */
export function MarketRowSpark({
  bars,
  benchmarkBars,
  tradeDate,
  disclosedDate,
  chartMode,
  width = 80,
  height = 22,
}: MarketRowSparkProps) {
  const empty = (
    <span className="text-[10px] text-muted/40 tabular-nums">—</span>
  );

  // Memoise so the rAF tween only fires when an actual input changes —
  // otherwise every parent re-render would hand the hook a new array
  // reference and the tween would restart on every animation frame.
  const layout = useMemo(
    () =>
      computeLayout({
        bars,
        benchmarkBars,
        tradeDate,
        disclosedDate,
        chartMode,
        width,
        height,
      }),
    [
      bars,
      benchmarkBars,
      tradeDate,
      disclosedDate,
      chartMode.axis,
      chartMode.anchor,
      width,
      height,
    ],
  );
  const easedPoints = useAnimatedPoints(layout?.points ?? null);

  if (!layout) return empty;

  const { baselineY, cutoffX, postCount, lineColor } = layout;
  const points = easedPoints ?? layout.points;
  const pointsString = points
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      className="overflow-visible block"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <line
        stroke="currentColor"
        strokeDasharray="2 2"
        strokeOpacity={0.15}
        strokeWidth={0.5}
        x1={0}
        x2={width}
        y1={baselineY}
        y2={baselineY}
        style={{ transition: "y 200ms ease-in-out" }}
      />
      {postCount < 2 && (
        <line
          stroke="currentColor"
          strokeDasharray="2 2"
          strokeOpacity={0.35}
          strokeWidth={0.75}
          x1={cutoffX}
          x2={cutoffX}
          y1={0}
          y2={height}
        />
      )}
      <polyline
        fill="none"
        points={pointsString}
        stroke={lineColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.25}
        style={{ transition: "stroke 200ms ease-in-out" }}
      />
    </svg>
  );
}

interface SparkLayout {
  /** Polyline vertices as [x, y] pairs in SVG units. */
  points: [number, number][];
  baselineY: number;
  cutoffX: number;
  /** Bars strictly after the anchor — when < 2 we widen the window and
   *  draw the dashed cutoff so the curve doesn't collapse to a single dot. */
  postCount: number;
  /** CSS colour for the line — green up / red down based on last value. */
  lineColor: string;
}

/** Pure layout pass — derives every numeric the SVG needs from the bars
 *  + chart mode. Pulled out of the render function so the easing hook can
 *  treat the result as a deterministic target. */
function computeLayout({
  bars,
  benchmarkBars,
  tradeDate,
  disclosedDate,
  chartMode,
  width,
  height,
}: {
  bars: SparkBar[] | undefined;
  benchmarkBars: SparkBar[] | undefined;
  tradeDate: string;
  disclosedDate: string;
  chartMode: ChartMode;
  width: number;
  height: number;
}): SparkLayout | null {
  if (!bars || bars.length === 0) return null;

  const anchor =
    chartMode.anchor === "disclosure"
      ? disclosedDate.slice(0, 10)
      : tradeDate.slice(0, 10);

  // Prefer the post-anchor line. For same-day buys we often only have one
  // close after the trade/disclosure, so include a short pre-anchor lookback
  // and mark the cutoff instead of showing an empty trend cell.
  const postCount = bars.filter((b) => b.date >= anchor).length;
  const stockPost =
    postCount >= 2 ? bars.filter((b) => b.date >= anchor) : bars.slice(-28);

  if (stockPost.length < 2) return null;
  const anchorIdx = (() => {
    const idx = stockPost.findIndex((b) => b.date >= anchor);

    if (idx >= 0) return idx;

    return stockPost.length - 1;
  })();
  const stockBase = stockPost[anchorIdx]?.close ?? stockPost[0].close;

  if (stockBase <= 0) return null;

  // Compute the per-bar % series the line will visualise. Market axis
  // subtracts the benchmark's return over the same window so the line
  // tracks alpha rather than the raw stock.
  let series: number[];

  if (
    chartMode.axis === "market" &&
    benchmarkBars &&
    benchmarkBars.length >= 2
  ) {
    const benchBase = (() => {
      for (const b of benchmarkBars) if (b.date >= anchor) return b.close;

      return null;
    })();

    if (!benchBase || benchBase <= 0) {
      series = stockPost.map((b) => (b.close / stockBase - 1) * 100);
    } else {
      // Walk benchmark bars with a pointer so the lookup stays O(N+M)
      // rather than O(N·M).
      let bi = 0;
      let lastBenchClose = benchBase;

      series = stockPost.map((b) => {
        while (
          bi < benchmarkBars.length &&
          benchmarkBars[bi].date <= b.date
        ) {
          lastBenchClose = benchmarkBars[bi].close;
          bi++;
        }
        const stockPct = (b.close / stockBase - 1) * 100;
        const benchPct = (lastBenchClose / benchBase - 1) * 100;

        return stockPct - benchPct;
      });
    }
  } else {
    series = stockPost.map((b) => (b.close / stockBase - 1) * 100);
  }

  const n = series.length;
  const dataMin = Math.min(0, ...series);
  const dataMax = Math.max(0, ...series);
  // Clamp the half-span: small moves shouldn't be visually amplified.
  // Padding equally above and below keeps the zero baseline near the
  // vertical centre (visually closer to "flat") for small ranges.
  const halfSpan = Math.max(
    Math.max(Math.abs(dataMin), Math.abs(dataMax)),
    MIN_RANGE_PP / 2,
  );
  const min = -halfSpan;
  const max = halfSpan;
  const range = max - min || 1;

  const points: [number, number][] = series.map((v, i) => {
    const x = (i / (n - 1)) * width;
    const y = height - ((v - min) / range) * height;

    return [x, y];
  });

  const last = series[n - 1];
  const { text } = deltaStyle(last);
  const baselineY = height - ((0 - min) / range) * height;
  const cutoffX = (anchorIdx / (n - 1)) * width;

  return { points, baselineY, cutoffX, postCount, lineColor: text };
}

/** Eases the polyline vertices from the previously-rendered state toward
 *  the new target whenever `target` changes. Snaps (no animation) on first
 *  render and on length changes — interpolating between curves with
 *  different point counts produces visual noise that's worse than a
 *  clean cut. */
function useAnimatedPoints(
  target: [number, number][] | null,
): [number, number][] | null {
  const [current, setCurrent] = useState<[number, number][] | null>(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!target) {
      setCurrent(null);
      return;
    }
    if (!current || current.length !== target.length) {
      setCurrent(target);
      return;
    }
    if (pointsEqual(current, target)) return;

    const from = current;
    const start = performance.now();

    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / ANIM_DURATION_MS);
      const eased = easeInOutCubic(t);
      const next: [number, number][] = from.map(([fx, fy], i) => {
        const [tx, ty] = target[i];

        return [fx + (tx - fx) * eased, fy + (ty - fy) * eased];
      });

      setCurrent(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else rafRef.current = null;
    };

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // current is intentionally excluded — including it would re-fire the
    // effect on every animation frame and loop forever. We only kick off
    // a new tween when the upstream `target` actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return current;
}

function pointsEqual(
  a: [number, number][],
  b: [number, number][],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
  }

  return true;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
