import { ChevronRightIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";

import { BUTTON_GHOST, BUTTON_RADIUS } from "@/components/button";

/** Action-cell affordance shown in place of the RatingBadge when discretion
 *  mode is on. The list intentionally stops revealing our signal (the rating)
 *  and instead nudges the user toward the high-intent moment: opening the
 *  drawer, where the analysis body is gated behind the app push.
 *
 *  Styled as a proper (ghost) button, not a chip: a chip is a label you
 *  read, a button is a thing you press (see components/button.ts), and this
 *  one is pressed thirty times a page. Rendered as a span — the whole row is
 *  the actual click target, so this inherits the row's onClick rather than
 *  nesting a button in a button. */
export function ViewAnalysisCta({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 whitespace-nowrap px-3 py-1.5 text-xs font-medium",
        BUTTON_RADIUS,
        BUTTON_GHOST,
        className,
      )}
    >
      View analysis
      <ChevronRightIcon aria-hidden className="h-3.5 w-3.5 shrink-0" />
    </span>
  );
}
