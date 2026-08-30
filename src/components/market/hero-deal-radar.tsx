/** Shared clock for the hero "deal radar".
 *
 *  The showcase panel's company queue and the notification stack both advance
 *  on this clock, so the highlighted logo and the front card are always the
 *  same deal. (A MapLibre basemap used to hang off this hook too — the panel
 *  dropped it, so the hook is now just the curated deals plus a monotonic
 *  counter.) Respects prefers-reduced-motion: the clock never starts, and
 *  every consumer rests on the first deal. */
import { useEffect, useState } from "react";

import { dealsForMarket, type HeroDeal } from "./hero-deal-data";

/** Time each deal holds front-and-centre. Long enough to actually read the
 *  notification's two-line copy — the sample disclosures are the hero's sales
 *  pitch, and unread copy is wasted copy. */
const STEP_MS = 5000;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export type DealRadar = {
  deals: HeroDeal[];
  /** Monotonic advance counter — drives the notification stack. */
  tick: number;
  /** `tick % deals.length` — the deal the queue highlights. */
  activeIndex: number;
};

/** The shared radar clock. Pass `enabled=false` to skip the timer on markets
 *  that don't show the showcase (NL/SE). */
export function useDealRadar(marketId?: string, enabled = true): DealRadar {
  const deals = dealsForMarket(marketId);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return;
    const id = window.setInterval(() => setTick((t) => t + 1), STEP_MS);

    return () => window.clearInterval(id);
  }, [enabled]);

  const activeIndex = ((tick % deals.length) + deals.length) % deals.length;

  return { deals, tick, activeIndex };
}
