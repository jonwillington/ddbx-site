import { LockClosedIcon } from "@heroicons/react/20/solid";

import { StoreCta } from "@/components/store-cta";
import { UnlockModal } from "@/components/discretion/unlock-modal";

/** Gate behind an app-only month in the chronological list. Older months
 *  stay visible as headers so the depth of the archive is obvious, but
 *  clicking one opens this instead of expanding: how many trades the month
 *  holds and one App Store CTA.
 *
 *  The sheet/modal chrome lives in `UnlockModal`, shared with the other gates. */
export function MonthUnlockModal({
  open,
  onClose,
  appHref,
  monthLabel,
  count,
}: {
  open: boolean;
  onClose: () => void;
  appHref: string;
  /** e.g. "June 2026". */
  monthLabel: string;
  /** Trades in the month; null when the site holds no rows for it. */
  count: number | null;
}) {
  const title = `${monthLabel} is in the app`;
  const message =
    count != null
      ? `Check out all ${count} trades from ${monthLabel.split(" ")[0]} in the app, every deal, what each director paid, and our analysis of the buys that cleared checks.`
      : `Check out every ${monthLabel.split(" ")[0]} trade in the app, every deal, what each director paid, and our analysis of the buys that cleared checks.`;

  return (
    <UnlockModal
      gaScope="month_unlock"
      message={message}
      open={open}
      title={title}
      onClose={onClose}
    >
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white dark:bg-white dark:text-ink">
        <LockClosedIcon className="h-5 w-5" />
      </span>
      <h2 className="mt-3 text-title">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted">
        {message}
      </p>
      <StoreCta
        block
        className="mt-5"
        data-ga-event="cta_month_unlock_open_app"
        data-ga-label={`Month unlock · ${monthLabel}`}
        href={appHref}
      >
        Start your free trial
      </StoreCta>
      <p className="mt-2.5 text-caption text-muted/70">
        Free for 7 days, cancel any time.
      </p>
    </UnlockModal>
  );
}
