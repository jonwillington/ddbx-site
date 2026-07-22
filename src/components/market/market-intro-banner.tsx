import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import { CloseButton } from "@/components/close-button";

/** localStorage flag so the intro only nudges first-time visitors — once
 *  dismissed it stays gone across reloads. POC: web-only, generic across
 *  markets (the six-point check is shared), shown once on the first dated
 *  day-group in the chronological list. */
const DISMISS_KEY = "ddbx.intro.significant.dismissed";

function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** Dismissal state lifted out of the banner so the parent can react: once
 *  dismissed it not only hides the banner but unwraps the grouped panel
 *  back into a plain day-group (no tint, ring, or inset). */
export function useIntroDismissed() {
  const [dismissed, setDismissed] = useState(readDismissed);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode / storage disabled — just hide for this session */
    }
  };

  return { dismissed, dismiss };
}

/** One-time explainer that doubles as the curved header of the "signal"
 *  group in the chronological list — the first place the rated rows appear
 *  without context. Tells a newcomer what the daily scoring does and why
 *  some filings are grouped while the rest read as skipped, and taps through
 *  to the full "What are we looking for?" methodology sheet. Presentational:
 *  dismissal lives in useIntroDismissed so the parent can unwrap the panel. */
export function MarketIntroBanner({
  onExplain,
  onDismiss,
}: {
  onExplain?: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="relative bg-[#faf7f2] px-4 py-3.5 dark:bg-white/[0.03] md:px-5">
      <div className="flex items-start gap-3 pr-6">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-foreground/70 dark:bg-white/[0.08] dark:text-foreground/70">
          <ExclamationCircleIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug text-foreground">
            Worth a closer look
          </p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
            Each day we score new insider buys against a six-point check. The
            ones that rate are grouped here; everything else is listed below as
            skipped.{" "}
            {onExplain && (
              <button
                className="font-medium text-foreground underline decoration-from-font underline-offset-2 hover:opacity-70"
                data-ga-event="cta_intro_what_we_look_for"
                data-ga-label="What we look for"
                onClick={onExplain}
              >
                What we look for
              </button>
            )}
          </p>
        </div>
      </div>
      <CloseButton
        aria-label="Dismiss"
        className="absolute right-2 top-2"
        data-ga-event="cta_intro_dismiss"
        data-ga-label="Dismiss intro banner"
        size="sm"
        onClick={onDismiss}
      />
    </div>
  );
}
