/** The page-level verdict — the one object a reader looks at before deciding
 *  whether to read anything else.
 *
 *  Modelled on the quiet variant of the genre (a dot, a verdict, a sentence, a
 *  timestamp) rather than the full-bleed green bar, because on a cream page the
 *  saturated bar reads as an alert banner: the thing you put up when something
 *  is WRONG. Using it to say "fine" spends the loudest object on the page on
 *  the least urgent message, and leaves nothing louder for the day it breaks.
 *
 *  The timestamp is not decoration. It is the claim that makes the rest of the
 *  page checkable, so it ticks in real time — a status page whose "last
 *  checked" stamp is frozen is indistinguishable from one that never checked.
 */
import { useEffect, useState } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

import {
  BANNER_BODY,
  BANNER_HEADLINE,
  STATE_DOT,
  STATE_TEXT,
} from "@/components/status/status-tokens";
import { type OverallState, timeAgo } from "@/lib/status";

/** Re-renders once a second so the relative stamp stays honest. Cheap: one
 *  interval for the page, and only this component subscribes. */
function useTick(active: boolean) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);

    return () => window.clearInterval(id);
  }, [active]);
}

export function StatusBanner({
  state,
  lastRun,
  running,
  onRefresh,
}: {
  state: OverallState;
  lastRun: number | null;
  running: boolean;
  onRefresh: () => void;
}) {
  useTick(lastRun != null);

  return (
    <div className="mt-6 rounded-2xl border border-hairline bg-sheet p-5 dark:border-separator dark:bg-white/[0.03] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="relative mt-[7px] flex size-2.5 shrink-0"
          >
            {/* The ping is suppressed while checking and while down: an
                animation that reads as "live and healthy" is the wrong
                affordance on both. */}
            {state === "operational" ? (
              <span
                className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${STATE_DOT[state]} motion-reduce:hidden`}
              />
            ) : null}
            <span
              className={`relative inline-flex size-2.5 rounded-full ${STATE_DOT[state]}`}
            />
          </span>

          <div className="min-w-0">
            <h2
              className={`text-[17px] font-semibold leading-[1.25] tracking-[-0.015em] ${STATE_TEXT[state]}`}
            >
              {BANNER_HEADLINE[state]}
            </h2>
            <p className="mt-1.5 max-w-[58ch] text-[13.5px] leading-[1.55] text-foreground/70">
              {BANNER_BODY[state]}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span
            aria-live="polite"
            className="text-[11.5px] tabular-nums text-foreground/45"
          >
            {lastRun == null ? "Checking…" : `Checked ${timeAgo(lastRun)}`}
          </span>
          <button
            aria-label="Re-run the checks now"
            className="rounded-full border border-hairline p-1.5 text-foreground/55 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/40 disabled:opacity-40 dark:border-separator"
            disabled={running}
            type="button"
            onClick={onRefresh}
          >
            <ArrowPathIcon
              className={`size-3.5 ${running ? "animate-spin motion-reduce:animate-none" : ""}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
