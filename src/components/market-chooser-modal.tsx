import type { FlagComponent } from "country-flag-icons/react/3x2";

import { ArrowUpRightIcon } from "@heroicons/react/20/solid";

import { AppModal } from "@/components/app-modal";
import { chip } from "@/components/chip";

/** One destination cell in the chooser. Generic on purpose: the same modal
 *  surfaces our per-market social accounts today and will surface per-market
 *  app-store links next — pass whatever `href` the cell should open. */
export interface MarketChoice {
  id: string;
  /** Country / region flag (rendered as a small decorative badge). */
  Flag?: FlagComponent;
  /** Primary brand mark for this market row (app icon / logo). */
  logoSrc?: string;
  /** Primary label, e.g. "ddbx.uk". */
  label: string;
  /** Secondary line, e.g. "UK director dealings · @ddbxuk". */
  description?: string;
  /** Destination — opened in a new tab. Omit for `comingSoon` cells. */
  href?: string;
  /** When true the cell is a disabled "Coming soon" placeholder (no link). */
  comingSoon?: boolean;
}

/** A small "pick your market" modal — one full-width cell per region, each
 *  linking out in a new tab. Built to be reused wherever we localise by market
 *  (social accounts, app-store links, …) so the breadth of markets is always
 *  one tap away. Data-driven: callers supply the title + list of choices, and
 *  can mark not-yet-live markets `comingSoon`. */
export function MarketChooserModal({
  open,
  onClose,
  title,
  subtitle,
  choices,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  choices: MarketChoice[];
}) {
  return (
    <AppModal
      maxWidthClass="max-w-md"
      open={open}
      subtitle={subtitle}
      title={title}
      onClose={onClose}
    >
      <div className="flex flex-col gap-2">
        {choices.map((c) => {
          const inner = (
            <>
              <div className="relative shrink-0">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-[#f3eee6] p-1.5 shadow-sm dark:border-white/15 dark:bg-[#17120d]">
                  {c.logoSrc ? (
                    <img
                      alt=""
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                      src={c.logoSrc}
                    />
                  ) : c.Flag ? (
                    <c.Flag
                      className="h-8 w-8 rounded-full object-cover"
                      title=""
                    />
                  ) : null}
                </div>
                {c.Flag && c.logoSrc && (
                  <span className="absolute -bottom-1 -right-1 overflow-hidden rounded-full border border-black/10 bg-[#f3eee6] p-0.5 shadow-sm dark:border-white/15 dark:bg-[#1b1510]">
                    <c.Flag
                      className="h-[14px] w-[14px] rounded-full object-cover"
                      title=""
                    />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{c.label}</div>
                {c.description && (
                  <div className="mt-0.5 text-xs leading-snug text-muted">
                    {c.description}
                  </div>
                )}
              </div>
            </>
          );

          if (c.comingSoon || !c.href) {
            return (
              <div
                key={c.id}
                aria-disabled="true"
                className="flex items-center gap-3 rounded-xl border border-black/[0.06] bg-black/[0.01] p-3.5 opacity-60 dark:border-white/[0.06] dark:bg-white/[0.035]"
              >
                {inner}
                <span className={`${chip()} shrink-0 text-muted`}>
                  Coming soon
                </span>
              </div>
            );
          }

          return (
            <a
              key={c.id}
              className="group flex items-center gap-3 rounded-xl border border-black/10 bg-black/[0.02] p-3.5 transition-colors hover:border-[#5a4128]/40 hover:bg-[#5a4128]/[0.05] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-[#ad9479]/40 dark:hover:bg-[#ad9479]/[0.07]"
              data-ga-event="cta_chooser_open_store"
              data-ga-label={c.id}
              href={c.href}
              rel="noopener noreferrer"
              target="_blank"
              onClick={onClose}
            >
              {inner}
              <ArrowUpRightIcon className="h-4 w-4 shrink-0 text-muted/40 transition-colors group-hover:text-[#5a4128] dark:group-hover:text-[#ad9479]" />
            </a>
          );
        })}
      </div>
    </AppModal>
  );
}
