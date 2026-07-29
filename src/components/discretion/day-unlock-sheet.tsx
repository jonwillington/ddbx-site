import { Drawer } from "vaul";
import { LockClosedIcon } from "@heroicons/react/20/solid";

import { StoreGlyph } from "@/components/store-glyph";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import { CloseButton } from "@/components/close-button";
import { CompanyLogo } from "@/components/company-logo";

/** Mobile bottom sheet behind a collapsed (older-than-free-window) day.
 *  On phones the teaser card opens this instead of jumping straight to the
 *  App Store: it shows every company that dealt that day, each padlocked
 *  (same logo-with-lock treatment as BlurredAnalysisOverlay), says plainly
 *  why the day is gated, and hands over one App Store CTA. Mobile-only —
 *  desktop teasers stay a straight App Store link. */
export function DayUnlockSheet({
  open,
  onClose,
  tickers,
  dealCount,
  dateLabel,
  appHref,
}: {
  open: boolean;
  onClose: () => void;
  /** Every unique company from the day — the sheet shows them all. */
  tickers: string[];
  dealCount: number;
  /** e.g. "Friday 17 July" */
  dateLabel: string;
  appHref: string;
}) {
  return (
    <Drawer.Root
      handleOnly
      direction="bottom"
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Drawer.Content className="unlock-confirm-sheet fixed bottom-2 inset-x-2 z-50 rounded-2xl border border-black/10 bg-background shadow-2xl outline-none dark:border-white/10">
          <div className="flex shrink-0 justify-center pb-1 pt-3">
            <Drawer.Handle className="!w-10 !bg-black/15 dark:!bg-white/20" />
          </div>
          <div className="relative px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 text-center">
            <CloseButton
              className="absolute right-3 top-2"
              data-ga-event="cta_day_unlock_close"
              data-ga-label="Day unlock sheet close"
              onClick={onClose}
            />

            {/* Every company from the day, padlocked — the reader sees
                exactly what they'd be unlocking, not an abstract pitch. */}
            <div className="mx-auto mt-4 flex max-w-[18rem] flex-wrap justify-center gap-x-3 gap-y-3.5">
              {tickers.map((t) => (
                <span key={t} className="relative inline-block">
                  <CompanyLogo size={44} ticker={t} />
                  <span className="absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-ink text-white ring-2 ring-background dark:bg-white dark:text-ink">
                    <LockClosedIcon className="h-2.5 w-2.5" />
                  </span>
                </span>
              ))}
            </div>

            <Drawer.Title className="mt-4 text-lg font-semibold tracking-[-0.02em]">
              {dealCount === 1 ? "This deal is" : "These deals are"} in the app
            </Drawer.Title>
            <Drawer.Description className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted">
              The website keeps the most recent days free. {dateLabel} is past
              that window, so the{" "}
              {dealCount === 1
                ? "deal it holds lives"
                : `${dealCount} deals it holds live`}{" "}
              in the DDBX app, with what each director paid and our read on
              every buy that cleared checks.
            </Drawer.Description>

            <a
              className={`mt-5 flex w-full items-center justify-center gap-2 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-5 py-3.5 text-sm font-semibold transition-colors`}
              data-ga-event="cta_day_unlock_open_app"
              data-ga-label={`Day unlock · ${dateLabel}`}
              href={appHref}
              rel="noopener noreferrer"
              target="_blank"
            >
              <StoreGlyph className="h-4 w-4 shrink-0" />
              Start your free trial
            </a>
            <p className="mt-2.5 text-[11px] text-muted/70">
              Free for 7 days, cancel any time.
            </p>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
