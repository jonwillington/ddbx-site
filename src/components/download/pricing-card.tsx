/** The price, stated plainly, next to the CTA.
 *
 *  The site had no price on it anywhere before this. That's the single biggest
 *  unanswered objection on an install page: a visitor who suspects a hidden
 *  cost either bounces or installs and churns on the paywall. Putting it here —
 *  above the final CTA, not in the footer — trades a few installs for
 *  materially better trial→subscribe conversion.
 *
 *  Values come from `@/lib/pricing`, which is mirrored by hand from the store
 *  products. Read the warning at the top of that file before changing a number.
 */
import { Reveal } from "./reveal";

import { useDownloadCopy } from "@/lib/download/copy";
import {
  annualPerMonth,
  annualSavingPct,
  formatPrice,
  type MarketPricing,
} from "@/lib/pricing";

/** Inline tick. Sized and baseline-nudged to sit with a 14.5px line rather
 *  than floating above it, which a raw heroicon at this size does. */
function CheckMark() {
  return (
    <svg
      aria-hidden="true"
      className="mt-[3px] h-4 w-4 shrink-0 text-positive"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.4}
      viewBox="0 0 24 24"
    >
      <path d="m5 13 4.5 4.5L19 7" />
    </svg>
  );
}

export function PricingCard({
  pricing,
  storeLabel,
}: {
  pricing: MarketPricing;
  /** "App Store" / "Google Play" — whose billing actually takes the money. */
  storeLabel: string;
}) {
  const saving = annualSavingPct(pricing);
  const t = useDownloadCopy();

  return (
    // Left-set, not centred: the section header above it is left-set now, and
    // a centred card under a left-set headline reads as two unrelated layouts.
    <Reveal className="max-w-lg">
      <div className="overflow-hidden rounded-3xl border border-hairline bg-white/70 shadow-sm dark:border-border/60 dark:bg-surface-secondary/40">
        <div className="border-b border-hairline bg-sheet px-6 py-5 text-center dark:border-border/50 dark:bg-surface-secondary/30">
          <p className="text-lg font-semibold">
            {t.freeForDays(pricing.trialDays)}
          </p>
          <p className="mt-1 text-sm text-foreground/55">{t.fullAccessNote}</p>
        </div>

        <div className="grid divide-y divide-hairline dark:divide-border/50 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="px-6 py-6 text-center">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/45">
              {t.monthly}
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
              {formatPrice(pricing, pricing.monthly)}
            </p>
            <p className="mt-1 text-sm text-foreground/50">{t.perMonth}</p>
          </div>
          <div className="px-6 py-6 text-center">
            {/* Inline with the tier label, not floated into the corner — as an
                absolute pill it collided with the centred "Annual". */}
            <p className="flex items-center justify-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/45">
              {t.annual}
              {saving > 0 ? (
                <span className="rounded-full bg-positive/12 px-2 py-0.5 text-[10px] tabular-nums text-positive">
                  {t.savePct(saving)}
                </span>
              ) : null}
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
              {formatPrice(pricing, annualPerMonth(pricing))}
            </p>
            <p className="mt-1 text-sm tabular-nums text-foreground/50">
              {t.perMonthBilledYearly(formatPrice(pricing, pricing.annual))}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-foreground/40">
        {t.billedThrough(storeLabel, pricing.code)}
      </p>
    </Reveal>
  );
}

/** Everything the one subscription covers, in full.
 *
 *  This used to hang off the bottom of the price card, which made the section
 *  a single narrow column with nine list items running down it and the whole
 *  right half of the page empty. It sits beside the price now: a price with
 *  nothing next to it is read as a cost, and the same price *alongside* the
 *  list of what it buys is read as a trade.
 *
 *  The list is exhaustive on purpose — a visitor scanning for the one feature
 *  they came for should find it here rather than guess whether it's included. */
export function IncludedList({ benefits }: { benefits: string[] }) {
  const t = useDownloadCopy();

  if (benefits.length === 0) return null;

  return (
    <Reveal delay={90}>
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/45">
        {t.everythingIncluded}
      </p>
      <ul className="mt-5 space-y-3.5">
        {benefits.map((b) => (
          <li key={b} className="flex gap-3 text-[15px] leading-snug">
            <CheckMark />
            <span className="text-foreground/75">{b}</span>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
