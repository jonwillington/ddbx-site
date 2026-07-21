/** Price-series hygiene + bar lookup, shared by the chart surfaces.
 *
 *  Ports `withoutIsolatedPriceOutliers` / `median` / `lastBarOnOrBefore`
 *  from the iOS app (`Features/Performance/PerformanceViewModel.swift`,
 *  commit fc74cfe). The web charts previously fed the API's bars straight
 *  into the renderer with only a null check, so a single corrupt close
 *  could spike the line and hijack the Low/High readout — the "$1.20 Low
 *  on a ~$21 stock" case that motivated the iOS guard.
 */

export interface PriceBar {
  date: string;
  close: number;
}

/** Median of a non-empty list. Returns 0 for empty input so callers'
 *  `> 0` guards short-circuit. */
export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);

  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

/** Drop points that sit orders of magnitude away from their local
 *  neighbours — a scale glitch in one bar (pence recorded as pounds, a
 *  stale cent value) rather than a real move.
 *
 *  Compares each point against the median of the `window` points either
 *  side, so a genuine trend is never flagged: it's the *isolation* that
 *  marks a bad bar, not the size of the jump. Deliberately conservative —
 *  non-positive values, edges, and points with fewer than two usable
 *  neighbours are kept, because at that density we can't tell a glitch
 *  from a thin series.
 */
export function withoutIsolatedPriceOutliers<T>(
  points: T[],
  value: (p: T) => number,
  { window = 3, factor = 8 }: { window?: number; factor?: number } = {},
): T[] {
  if (points.length < 3 || factor <= 1) return points;
  const values = points.map(value);
  const kept: T[] = [];

  for (let i = 0; i < points.length; i++) {
    const v = values[i];

    if (!(v > 0)) {
      kept.push(points[i]);
      continue;
    }
    const neighbours: number[] = [];
    const lo = Math.max(0, i - window);
    const hi = Math.min(points.length - 1, i + window);

    for (let j = lo; j <= hi; j++) {
      if (j !== i && values[j] > 0) neighbours.push(values[j]);
    }
    if (neighbours.length < 2) {
      kept.push(points[i]);
      continue;
    }
    const med = median(neighbours);

    if (!(med > 0)) {
      kept.push(points[i]);
      continue;
    }
    const r = v / med;

    // Isolated outlier — drop.
    if (r > factor || r < 1 / factor) continue;
    kept.push(points[i]);
  }

  return kept;
}

/** Parse, sort, de-duplicate and sanitise a close series in one pass.
 *  Same-day duplicates collapse to the last value (the API occasionally
 *  emits a provisional close alongside the settled one). */
export function sanitiseBars<T extends PriceBar>(bars: T[]): T[] {
  const byDate = new Map<string, T>();

  for (const b of bars) {
    if (!b.date || !Number.isFinite(b.close) || b.close <= 0) continue;
    byDate.set(b.date, b);
  }
  const sorted = [...byDate.values()].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );

  return withoutIsolatedPriceOutliers(sorted, (b) => b.close);
}

/** The close to seat a marker on for `date`: exact day, else the nearest
 *  *prior* trading close, else the nearest following one.
 *
 *  Prior-first is the point. A Friday trade disclosed over a bank-holiday
 *  weekend has no bar of its own; anchoring forward would seat the marker
 *  on the next session and attribute that session's move to the event.
 *  Anchoring backward reads as "the last price the market knew".
 *  Mirrors `closePrice(on:points:)` in the iOS MiniPriceChart.
 */
export function barForDate<T extends PriceBar>(
  bars: T[],
  date: string,
): T | null {
  if (bars.length === 0 || !date) return null;

  let prior: T | null = null;

  for (const b of bars) {
    if (b.date === date) return b;
    if (b.date < date) prior = b;
    else return prior ?? b;
  }

  return prior;
}
