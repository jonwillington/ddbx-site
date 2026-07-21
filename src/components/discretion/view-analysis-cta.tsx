import { ChevronRightIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";

import { chip } from "@/components/chip";

/** Action-cell affordance shown in place of the RatingBadge when discretion
 *  mode is on. The list intentionally stops revealing our signal (the rating)
 *  and instead nudges the user toward the high-intent moment: opening the
 *  drawer, where the analysis body is gated behind the app push. Purely a
 *  label — the whole row remains the click target, so this inherits the row's
 *  onClick rather than carrying its own. */
export function ViewAnalysisCta({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        // Stands in for the RatingBadge in the same column, so it carries the
        // same chip treatment — including the currentColor hairline, which is
        // why no border colour is named here.
        chip("md"),
        "bg-[#5a4128]/[0.07] text-[#5a4128]",
        "dark:bg-[#ad9479]/10 dark:text-[#ad9479]",
        className,
      )}
    >
      View analysis
      <ChevronRightIcon aria-hidden className="h-3 w-3 shrink-0" />
    </span>
  );
}
