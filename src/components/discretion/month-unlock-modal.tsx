import { useEffect } from "react";
import { createPortal } from "react-dom";
import { LockClosedIcon } from "@heroicons/react/20/solid";
import { Drawer } from "vaul";

import { StoreGlyph } from "@/components/store-glyph";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import { CloseButton } from "@/components/close-button";
import { useMediaQuery } from "@/lib/use-media-query";

/** Gate behind an app-only month in the chronological list. Older months
 *  stay visible as headers so the depth of the archive is obvious, but
 *  clicking one opens this instead of expanding: how many trades the month
 *  holds and one App Store CTA. Bottom sheet on mobile, centered modal on
 *  desktop — same chrome split the old unlock-confirm dialog used. */
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
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const title = `${monthLabel} is in the app`;
  const message =
    count != null
      ? `Check out all ${count} trades from ${monthLabel.split(" ")[0]} in the app — every deal, what each director paid, and our analysis of the buys that cleared checks.`
      : `Check out every ${monthLabel.split(" ")[0]} trade in the app — every deal, what each director paid, and our analysis of the buys that cleared checks.`;

  const body = (
    <>
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white dark:bg-white dark:text-ink">
        <LockClosedIcon className="h-5 w-5" />
      </span>
      <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em]">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted">
        {message}
      </p>
      <a
        className={`mt-5 flex w-full items-center justify-center gap-2 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-5 py-3.5 text-sm font-semibold transition-colors`}
        data-ga-event="cta_month_unlock_open_app"
        data-ga-label={`Month unlock · ${monthLabel}`}
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
    </>
  );

  // Desktop is a hand-rolled centered modal (vaul only does edge-anchored
  // drawers). Lock body scroll + escape-to-close while open.
  useEffect(() => {
    if (!isDesktop || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isDesktop, open, onClose]);

  if (!isDesktop) {
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
            <div className="relative px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 text-center">
              <CloseButton
                className="absolute right-3 top-2"
                data-ga-event="cta_month_unlock_close"
                data-ga-label="Month unlock close"
                onClick={onClose}
              />
              <Drawer.Title className="sr-only">{title}</Drawer.Title>
              <Drawer.Description className="sr-only">
                {message}
              </Drawer.Description>
              {body}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close"
        className="absolute inset-0 z-0 cursor-default bg-black/50"
        data-ga-event="cta_month_unlock_overlay_close"
        data-ga-label="Month unlock overlay close"
        tabIndex={-1}
        type="button"
        onClick={onClose}
      />
      <div
        aria-label={title}
        aria-modal="true"
        className="animate-content-in relative z-10 w-full max-w-sm rounded-2xl border border-black/10 bg-background px-6 py-6 text-center shadow-2xl outline-none dark:border-white/10"
        role="dialog"
      >
        <CloseButton
          className="absolute right-4 top-4"
          data-ga-event="cta_month_unlock_close"
          data-ga-label="Month unlock close"
          onClick={onClose}
        />
        {body}
      </div>
    </div>,
    document.body,
  );
}
