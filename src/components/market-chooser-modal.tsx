import type { FlagComponent } from "country-flag-icons/react/3x2";

import { AppModal } from "@/components/app-modal";

/** One destination cell in the chooser. Generic on purpose: the same modal
 *  surfaces our per-market social accounts today and will surface per-market
 *  app-store links next — pass whatever `href` the cell should open. */
export interface MarketChoice {
  id: string;
  /** Country / region flag for the cell. */
  Flag?: FlagComponent;
  /** Primary label, e.g. "ddbx.uk". */
  label: string;
  /** Secondary line, e.g. "UK director dealings · @ddbxuk". */
  description?: string;
  /** Destination — opened in a new tab. */
  href: string;
}

/** A small "pick your market" modal — one cell per region, each linking out in
 *  a new tab. Built to be reused wherever we localise by market (social
 *  accounts, app-store links, …) so the breadth of markets is always one tap
 *  away. Data-driven: callers supply the title + the list of choices. */
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {choices.map((c) => (
          <a
            key={c.id}
            className="group flex flex-col gap-3 rounded-xl border border-black/10 bg-black/[0.02] p-4 transition-colors hover:border-[#5a4128]/40 hover:bg-[#5a4128]/[0.05] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-[#ad9479]/40 dark:hover:bg-[#ad9479]/[0.07]"
            href={c.href}
            rel="noopener noreferrer"
            target="_blank"
            onClick={onClose}
          >
            {c.Flag && (
              <c.Flag
                className="h-6 w-9 rounded-[3px] object-cover shadow-sm ring-1 ring-black/10 dark:ring-white/10"
                title=""
              />
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold">{c.label}</div>
              {c.description && (
                <div className="mt-0.5 text-xs leading-snug text-muted">
                  {c.description}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </AppModal>
  );
}
