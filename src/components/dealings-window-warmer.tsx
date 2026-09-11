/** Starts the rolling dealings window before anyone needs it.
 *
 *  Two triggers, both feeding the one cached promise in
 *  src/lib/dealings-window.ts, so neither can cause a second download:
 *
 *  - INTENT. A pointer over, a finger on, or keyboard focus on any link to a
 *    page that reads the window (the sector pages, the boards, a company).
 *    Hover gives a desktop click a few hundred milliseconds' head start and
 *    touchstart gives a tap about a hundred — against a ~200KB edge-cached
 *    response, usually enough for the page to open on its data.
 *  - IDLE. Once the first page has settled, fetch it anyway, so the first
 *    click into any of those pages lands on data already in memory. Skipped
 *    when the reader has asked to save data or is on a 2G connection: a
 *    download they may never use is not ours to spend on their plan.
 *
 *  One document-level listener rather than a prop on every link, so the
 *  navbar menu, RelatedCards, the company rows and any link added later all
 *  prefetch without knowing this exists.
 */
import { useEffect } from "react";

import {
  prefetchDealingsWindow,
  readsDealingsWindow,
} from "@/lib/dealings-window";

/** After the first page has had its own requests to itself. */
const IDLE_DELAY_MS = 2500;

/** The same-origin path a pointer or focus is on, or null. Reads the
 *  attribute rather than `.href` because the board stages draw their links as
 *  SVG `<a>` elements, whose `href` is an SVGAnimatedString, not a URL. */
function linkPath(target: EventTarget | null): string | null {
  const anchor = target instanceof Element ? target.closest("a[href]") : null;
  const href = anchor?.getAttribute("href");

  if (!href) return null;
  try {
    const url = new URL(href, window.location.href);

    return url.origin === window.location.origin ? url.pathname : null;
  } catch {
    return null;
  }
}

function constrained(): boolean {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;

  return (
    !!connection?.saveData ||
    connection?.effectiveType === "2g" ||
    connection?.effectiveType === "slow-2g"
  );
}

export function DealingsWindowWarmer() {
  useEffect(() => {
    const onIntent = (event: Event) => {
      const path = linkPath(event.target);

      if (path && readsDealingsWindow(path)) prefetchDealingsWindow();
    };

    document.addEventListener("pointerover", onIntent, { passive: true });
    document.addEventListener("touchstart", onIntent, { passive: true });
    document.addEventListener("focusin", onIntent);

    // Safari has no requestIdleCallback; a zero timeout after the delay is
    // close enough, since the delay already let the page's own work go first.
    const hasIdle = typeof window.requestIdleCallback === "function";
    let idle: number | null = null;
    const timer = constrained()
      ? null
      : window.setTimeout(() => {
          const run = () => prefetchDealingsWindow();

          idle = hasIdle
            ? window.requestIdleCallback(run, { timeout: 5000 })
            : window.setTimeout(run, 0);
        }, IDLE_DELAY_MS);

    return () => {
      document.removeEventListener("pointerover", onIntent);
      document.removeEventListener("touchstart", onIntent);
      document.removeEventListener("focusin", onIntent);
      if (timer != null) window.clearTimeout(timer);
      if (idle != null) {
        if (hasIdle) window.cancelIdleCallback(idle);
        else window.clearTimeout(idle);
      }
    };
  }, []);

  return null;
}
