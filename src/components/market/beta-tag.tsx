import type { ReactNode } from "react";

import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { chip } from "@/components/chip";
import { marketForPath } from "@/lib/markets/registry";
import { useMediaQuery } from "@/lib/use-media-query";

/** Persistent beta/advisory badge that floats below the navbar. Lives above
 *  the route boundary so it doesn't remount when navigating between markets —
 *  switching between two beta markets crossfades the copy in place, and
 *  entering/leaving a beta market animates the badge in or out. */
export function BetaTag() {
  const { pathname } = useLocation();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const market = marketForPath(pathname);
  const notice = market.config.topNotice ?? null;

  // `displayed` lags `notice` on exit so the badge can finish its slide-out
  // animation while still rendering the old copy. On re-entry / swap we
  // update displayed immediately and bump the textKey so the inner span
  // crossfades.
  const [displayed, setDisplayed] = useState<ReactNode>(notice);
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
  }, [notice, displayed]);

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
        className={`absolute top-[80px] md:top-[88px] z-30 items-center gap-2 rounded-full border border-amber-300/40 bg-amber-100/85 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800/60 backdrop-blur-sm px-3.5 py-1 text-sm shadow-sm will-change-transform pointer-events-auto ${
          isDesktop
            ? "inline-flex left-[max(1rem,calc((100vw-1280px)/2+1.5rem))]"
            : "flex justify-center left-4 right-4"
        }`}
        style={{
          transform: isDesktop
            ? `translateY(${present ? "0" : "-160%"})`
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
