/** Shared clock for the hero "deal radar".
 *
 *  One cycle is one deal, and it has two beats rather than one. The price
 *  chart starts drawing at the top of the cycle; `DRAW_MS` later the line
 *  reaches the disclosure and the notification lands. Everything that reacts
 *  to an alert arriving — the stack, the arrival ripple, the phase advance of
 *  the header gradient — hangs off `tick`, which only moves on that second
 *  beat, so the alert cannot drift away from the moment on the chart that
 *  caused it.
 *
 *  `tick` starts at -1: on first paint no alert has landed yet, so the
 *  notification is not yet shown and the first cycle plays the arrival in
 *  full. A visitor who sees the hero once still sees the thing it's
 *  demonstrating.
 *
 *  The gap between the two counters is `pending`, and it's load-bearing:
 *  while a new price is drawing, the previous alert is already put away, so
 *  the panel never pairs one company's chart with another company's
 *  notification.
 *
 *  Respects prefers-reduced-motion: the clock never starts, `tick` is pinned
 *  at 0 so the first deal is fully present, and the chart renders finished.
 */
import { useEffect, useState } from "react";

import { dealsForMarket, type HeroDeal } from "./hero-deal-data";

/** Beat one: the line drawing in, up to the disclosure. Deliberately quick.
 *  It's an arrival, not a data load, and the notification is absent for the
 *  whole of it (see `pending`) — the alert should be on screen for most of
 *  the cycle, not most of the way through it. The wipe eases out, so the line
 *  snaps across and settles onto the buy rather than trundling. */
export const DRAW_MS = 1150;
/** Beat two, part one: the muted continuation past the buy. */
export const POST_MS = 850;
/** Beat two, part two: the notification holds still, to be read. The sample
 *  disclosures are the hero's sales pitch, and unread copy is wasted copy. */
export const HOLD_MS = 600000;
export const CYCLE_MS = DRAW_MS + POST_MS + HOLD_MS;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export type DealRadar = {
  deals: HeroDeal[];
  /** Monotonic cycle counter — increments when a new chart starts drawing.
   *  Re-mounts the chart so its one-shot animations replay. */
  cycle: number;
  /** Monotonic alert counter — increments when the line reaches the
   *  disclosure. Drives the notification stack, the ripple and the gradient.
   *  -1 before the first alert has landed. */
  tick: number;
  /** Whether the alert on screen belongs to the price being drawn. False for
   *  the whole draw phase — the previous alert has been put away and the next
   *  one hasn't landed — and the notification is faded out. Without it the
   *  panel would spend a quarter of every cycle showing one company's chart
   *  beside another company's alert. */
  pending: boolean;
  /** Whether any alert has landed yet at all. */
  landed: boolean;
  /** `tick % deals.length` — the deal the alert on screen belongs to. */
  activeIndex: number;
  /** `cycle % deals.length` — the deal the chart is currently drawing. Runs
   *  one ahead of `activeIndex` during the draw, which is the point: the
   *  previous alert is still on screen while the next price is being drawn,
   *  and it's replaced at the moment the line reaches the disclosure. */
  chartIndex: number;
};

/** The shared radar clock. Pass `enabled=false` to skip the timers on markets
 *  that don't show the showcase (NL/SE). */
export function useDealRadar(marketId?: string, enabled = true): DealRadar {
  const deals = dealsForMarket(marketId);

  const [cycle, setCycle] = useState(0);
  const [tick, setTick] = useState(-1);

  useEffect(() => {
    if (!enabled) return;
    if (prefersReducedMotion()) {
      setTick(0);

      return;
    }

    // The cycle counter is held in a local rather than derived inside the
    // state updater: scheduling the alert from inside an updater would arm
    // two timeouts under StrictMode's double invocation.
    let n = 0;
    let alertTimer = window.setTimeout(() => setTick(0), DRAW_MS);
    const id = window.setInterval(() => {
      n += 1;
      setCycle(n);
      window.clearTimeout(alertTimer);
      alertTimer = window.setTimeout(() => setTick(n), DRAW_MS);
    }, CYCLE_MS);

    return () => {
      window.clearInterval(id);
      window.clearTimeout(alertTimer);
    };
  }, [enabled]);

  const safeTick = Math.max(tick, 0);
  const wrap = (v: number) =>
    ((v % deals.length) + deals.length) % deals.length;

  return {
    deals,
    cycle,
    tick,
    pending: tick !== cycle,
    landed: tick >= 0,
    activeIndex: wrap(safeTick),
    chartIndex: wrap(cycle),
  };
}
