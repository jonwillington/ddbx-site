import type { ReactNode } from "react";

import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { chip } from "@/components/chip";
import { MARKETS, marketForPath } from "@/lib/markets/registry";
import { useMediaQuery } from "@/lib/use-media-query";

/** Routes that render `MarketPage` and therefore reserve space for this badge.
 *  Everything else — the SEO pages, company pages, broker pages — lays out its
 *  own heading at the top of the content column with nothing set aside.
 *
 *  This set alone was not enough. A market whose dashboard lives at a path
 *  rather than at the root of its own domain — /nl, /kr, /congress — never
 *  matched, so its `topNotice` was declared and then never rendered anywhere.
 *  `MARKETS[].route` is checked alongside, which is the same list the navbar
 *  switcher walks. */
const MARKET_HOME_PATHS = new Set([
  "/",
  "/contact",
  "/privacy",
  "/cookies",
  "/terms",
]);

/** Persistent beta/advisory badge that floats below the navbar. Lives above
 *  the route boundary so it doesn't remount when navigating between markets —
 *  switching between two beta markets crossfades the copy in place, and
 *  entering/leaving a beta market animates the badge in or out. */
export function BetaTag() {
  const { pathname } = useLocation();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const market = marketForPath(pathname);
  // The badge is positioned to tuck inside the market hero's framed panel
  // (`top-28`, centred) and the hero reserves top space for it via
  // `hasTopNotice`. No other route has that panel — so on the SEO pages
  // (/companies, /biggest-buys, /sectors, /learn/*) the pill was landing on top
  // of the h1, which is where "Every UK company with director dealings" ended
  // up wearing a BETA badge across its middle. Restrict it to the dashboard.
  const path = pathname.replace(/\/+$/, "") || "/";
  // `/report/:month` also renders MarketHomePage (it opens the recap modal
  // over the dashboard).
  const onMarketHome =
    MARKET_HOME_PATHS.has(path) ||
    MARKETS.some((m) => m.route === path) ||
    path.startsWith("/report/");
  const notice = onMarketHome ? (market.config.topNotice ?? null) : null;
  /* Markets with a right-hand drawer (news / channel perf) reserve a fixed
   * w-80 rail from lg up (`lg:mr-80` in DefaultLayout), so the hero panel is
   * centred on the *content area*, not the viewport. Mirror that: shift the
   * badge's centreline left by half the rail (10rem) at lg+ so it stays
   * centred over the hero rather than drifting toward the rail. */
  const hasDrawer = !!(
    market.config.fetchNews || market.config.supportsChannelPerformance
  );

  // `displayed` lags `notice` on exit so the badge can finish its slide-out
  // animation while still rendering the old copy. On re-entry / swap we
  // update displayed immediately and bump the textKey so the inner span
  // crossfades.
  const [displayed, setDisplayed] = useState<ReactNode>(notice);
  // Latched alongside `displayed` so the slide-out keeps the alignment of the
  // market it's exiting from instead of jumping to the next market's.
  const [displayedDrawer, setDisplayedDrawer] = useState<boolean>(hasDrawer);
  // Always start false so the entrance transition has a "from" frame to
  // animate out of — the rAF below flips it true after the first paint.
  const [present, setPresent] = useState<boolean>(false);
  const [textKey, setTextKey] = useState(0);
  const exitTimer = useRef<number | null>(null);

  useEffect(() => {
    if (exitTimer.current) {
      window.clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
    if (notice) {
      if (notice !== displayed) {
        setDisplayed(notice);
        setTextKey((k) => k + 1);
      }
      setDisplayedDrawer(hasDrawer);
      // Defer to next frame so the browser commits the off-screen
      // (`present=false`) state before transitioning to on-screen — without
      // this, the badge appears already in place on mount and the slide-down
      // is skipped.
      const id = window.requestAnimationFrame(() => setPresent(true));

      return () => window.cancelAnimationFrame(id);
    }
    setPresent(false);
    exitTimer.current = window.setTimeout(() => {
      setDisplayed(null);
    }, 520);

    return () => {
      if (exitTimer.current) {
        window.clearTimeout(exitTimer.current);
        exitTimer.current = null;
      }
    };
  }, [notice, displayed, hasDrawer]);

  if (!displayed) return null;

  return (
    <>
      <style>{`
        @keyframes beta-tag-text-in {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: none; }
        }
        .beta-tag-text { animation: beta-tag-text-in 280ms ease-out both; }
      `}</style>
      <div
        aria-live="polite"
        className={`absolute top-[80px] md:top-28 z-30 items-center gap-2 rounded-full border border-amber-300/40 bg-amber-100/85 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800/60 backdrop-blur-sm px-3.5 py-1 text-sm shadow-sm will-change-transform pointer-events-auto ${
          isDesktop
            ? // Centred over the hero's framed panel (top edge ~97px from md
              // up, so top-28 tucks the pill just inside it). On drawer
              // markets the panel is centred on the content area — shift the
              // centreline left by half the w-80 rail at lg+ to match.
              `inline-flex ${displayedDrawer ? "left-1/2 lg:left-[calc(50%-10rem)]" : "left-1/2"}`
            : "flex justify-center left-4 right-4"
        }`}
        style={{
          transform: isDesktop
            ? `translate(-50%, ${present ? "0" : "-200%"})`
            : `translateY(${present ? "0" : "-160%"})`,
          opacity: present ? 1 : 0,
          transition:
            "transform 480ms cubic-bezier(0.16, 0.84, 0.34, 1), opacity 320ms ease-out",
        }}
      >
        <span
          className={`${chip()} bg-amber-500/25 text-amber-900 dark:text-amber-200`}
        >
          Beta
        </span>
        <span key={textKey} className="beta-tag-text">
          {displayed}
        </span>
      </div>
    </>
  );
}
