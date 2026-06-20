/** Shared clock + lazy map layer for the hero "deal radar".
 *
 *  The map fills the hero background while the notification stack + headline
 *  float over it, so the two live at different z-layers. To keep them in
 *  lockstep, the clock lives in a hook the hero owns: it feeds the background
 *  map (`activeIndex`) and the foreground stack (`tick`) from one source, so the
 *  beacon and the front card are always the same deal.
 *
 *  Theme-reactive (follows the site's `.dark` class so the basemap matches the
 *  page) and respects prefers-reduced-motion (clock pauses, camera doesn't fly).
 *  The map lib is lazy-loaded so it never touches the mobile / initial bundle. */
import { Suspense, lazy, useEffect, useState } from "react";

import {
  dealsForMarket,
  mapConfigForMarket,
  type HeroDeal,
  type HeroMapConfig,
} from "./hero-deal-data";

const HeroDealMap = lazy(() => import("./hero-deal-map"));

/** Time each deal holds front-and-centre. A touch longer than the 2.6s camera
 *  flight so the beacon lands and ripples before the next deal arrives. */
const STEP_MS = 3400;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export type DealRadar = {
  deals: HeroDeal[];
  mapConfig: HeroMapConfig;
  /** Monotonic advance counter — drives the notification stack. */
  tick: number;
  /** `tick % deals.length` — the deal the map beacons. */
  activeIndex: number;
  /** Whether the page is in dark mode (basemap follows it). */
  isDark: boolean;
};

/** The shared radar clock. Pass `enabled=false` to skip the timer on markets
 *  that don't show the radar (NL/SE/Congress). */
export function useDealRadar(marketId?: string, enabled = true): DealRadar {
  const deals = dealsForMarket(marketId);
  const mapConfig = mapConfigForMarket(marketId);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return;
    const id = window.setInterval(() => setTick((t) => t + 1), STEP_MS);

    return () => window.clearInterval(id);
  }, [enabled]);

  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));

    sync();
    const obs = new MutationObserver(sync);

    obs.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => obs.disconnect();
  }, []);

  const activeIndex = ((tick % deals.length) + deals.length) % deals.length;

  return { deals, mapConfig, tick, activeIndex, isDark };
}

/** The lazy-loaded map, fitted to fill its (positioned) parent. */
export function HeroDealMapLayer({
  deals,
  mapConfig,
  activeIndex,
  isDark,
}: Pick<DealRadar, "deals" | "mapConfig" | "activeIndex" | "isDark">) {
  return (
    <Suspense fallback={null}>
      <HeroDealMap
        activeIndex={activeIndex}
        deals={deals}
        isDark={isDark}
        mapConfig={mapConfig}
      />
    </Suspense>
  );
}
