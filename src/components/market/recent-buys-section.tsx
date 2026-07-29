import type { MarketDealing } from "@/lib/markets/types";
import type { PriceFormat } from "@/components/position-card";

import { useState } from "react";
import {
  ChevronRightIcon,
  InformationCircleIcon,
} from "@heroicons/react/20/solid";

const MAX_VISIBLE = 8;

/** Other recent insider buys on the same ticker, surfaced inside the
 *  detail drawer. Framed as buys only — disposals/sells aren't covered
 *  uniformly across markets, so showing "trades" would be misleading.
 *  Time scope is "everything ddbx has on file for this market"; an
 *  inline tooltip on the heading communicates that.
 *
 *  When `onSelect` is supplied each row becomes a button that re-targets
 *  the open drawer at that buy, so the reader can jump straight to its
 *  analysis without closing and hunting for it in the table. */
export function RecentBuysSection<W>({
  currentDealing,
  allDealings,
  fmt,
  locale = "en-GB",
  formatTickerDisplay,
  onSelect,
}: {
  currentDealing: MarketDealing<W>;
  allDealings: MarketDealing<W>[];
  fmt: PriceFormat;
  locale?: string;
  formatTickerDisplay?: (ticker: string) => string;
  onSelect?: (dealing: MarketDealing<W>) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!currentDealing.ticker) return null;

  const ticker = currentDealing.ticker.toUpperCase();
  const tickerDisplay = formatTickerDisplay
    ? formatTickerDisplay(currentDealing.ticker)
    : currentDealing.ticker;

  const buys = allDealings
    .filter(
      (d) =>
        d.key !== currentDealing.key &&
        d.actionTone === "buy" &&
        d.ticker.toUpperCase() === ticker,
    )
    .sort((a, b) => (a.disclosedDate < b.disclosedDate ? 1 : -1));

  const visible = buys.slice(0, MAX_VISIBLE);
  const hiddenCount = buys.length - visible.length;
  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // The heading label + info tooltip, shared by the empty state (static) and
  // the populated state (inside the accordion toggle button).
  const headingLabel = (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
      Other recent buys on {tickerDisplay}
      <span className="group/tip relative inline-flex cursor-default items-center">
        <InformationCircleIcon className="h-3.5 w-3.5 shrink-0 text-muted/50 transition-colors group-hover/tip:text-muted/80" />
        <span
          className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 w-64
          rounded-lg bg-[#1e1a16] px-3 py-2.5 text-xs leading-relaxed text-[#e8e2da]
          opacity-0 shadow-2xl transition-opacity duration-150
          group-hover/tip:opacity-100 dark:bg-[#e8e2da] dark:text-[#1e1a16]"
        >
          Insider buys recorded by ddbx since we began tracking this market.
          Sells aren&apos;t covered comprehensively, so this list is buys only.
        </span>
      </span>
    </span>
  );

  if (buys.length === 0) {
    return (
      <section>
        <div className="mb-3">{headingLabel}</div>
        <p className="text-sm text-muted italic">
          No other insider buys recorded for {tickerDisplay} in our data.
        </p>
      </section>
    );
  }

  return (
    <section>
      {/* Collapsed by default — a long flat list eats too much drawer height,
          so it lives behind an accordion that summarises the count. */}
      <button
        aria-expanded={open}
        className="flex w-full items-baseline justify-between gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-brown/40 dark:focus-visible:ring-brand-tan/40"
        type="button"
        onClick={() => setOpen((o) => !o)}
      >
        {headingLabel}
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted tabular-nums">
          {buys.length} buy{buys.length === 1 ? "" : "s"}
          <ChevronRightIcon
            className={`h-4 w-4 text-muted/60 transition-transform duration-200 ${
              open ? "rotate-90" : ""
            }`}
          />
        </span>
      </button>

      {open && (
        <ul className="mt-3 divide-y divide-black/[0.06] dark:divide-white/[0.08] border-y border-black/[0.06] dark:border-white/[0.08]">
          {visible.map((d) => {
            const content = (
              <>
                <span className="w-24 shrink-0 font-mono text-xs text-muted tabular-nums">
                  {dateFmt.format(new Date(d.disclosedDate))}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {d.insiderName}
                  {d.insiderRole && (
                    <span className="text-muted"> · {d.insiderRole}</span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums">
                  {d.value != null ? fmt.formatValue(d.value) : "—"}
                </span>
              </>
            );

            return (
              <li key={d.key}>
                {onSelect ? (
                  <button
                    className="group flex w-full items-baseline gap-3 py-2 text-left text-sm transition-colors hover:bg-black/[0.03] dark:hover:bg-white/5"
                    type="button"
                    onClick={() => onSelect(d)}
                  >
                    {content}
                    <ChevronRightIcon className="h-4 w-4 shrink-0 self-center text-muted/40 transition-colors group-hover:text-muted/80" />
                  </button>
                ) : (
                  <div className="flex items-baseline gap-3 py-2 text-sm">
                    {content}
                  </div>
                )}
              </li>
            );
          })}
          {hiddenCount > 0 && (
            <li className="py-2 text-xs text-muted">
              + {hiddenCount} more not shown.
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
