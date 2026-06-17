import { ChevronRightIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";

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
        "inline-flex items-center justify-center gap-0.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-medium md:text-[11px]",
        "border-[#5a4128]/25 bg-[#5a4128]/[0.07] text-[#5a4128]",
        "dark:border-[#ad9479]/25 dark:bg-[#ad9479]/10 dark:text-[#ad9479]",
        className,
      )}
    >
      View analysis
      <ChevronRightIcon aria-hidden className="h-3 w-3 shrink-0" />
    </span>
  );
}
