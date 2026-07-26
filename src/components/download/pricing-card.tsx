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
      className="mt-[3px] h-4 w-4 shrink-0 text-[#1f9d63] dark:text-[#3ad48c]"
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
  benefits = [],
}: {
  pricing: MarketPricing;
  /** "App Store" / "Google Play" — whose billing actually takes the money. */
  storeLabel: string;
  /** Everything the one subscription covers, in full. A price with nothing
   *  next to it is read as a cost; the same price under the list of what it
   *  buys is read as a trade. The list is exhaustive on purpose — a visitor
   *  scanning for the one feature they came for should find it here rather
   *  than guess whether it's included. */
  benefits?: string[];
}) {
  const saving = annualSavingPct(pricing);

  return (
    // Left-set, not centred: the section header above it is left-set now, and
    // a centred card under a left-set headline reads as two unrelated layouts.
    <Reveal className="max-w-lg">
      <div className="overflow-hidden rounded-3xl border border-[#e0d8cc] bg-white/70 shadow-sm dark:border-border/60 dark:bg-surface-secondary/40">
        <div className="border-b border-[#e7e0d4] bg-[#faf6ef] px-6 py-5 text-center dark:border-border/50 dark:bg-surface-secondary/30">
          <p className="text-lg font-semibold">
            Free for {pricing.trialDays} days
          </p>
          <p className="mt-1 text-sm text-foreground/55">
            Full access. Cancel any time before it ends and you pay nothing.
          </p>
        </div>

        <div className="grid divide-y divide-[#e7e0d4] dark:divide-border/50 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="px-6 py-6 text-center">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-foreground/45">
              Monthly
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {formatPrice(pricing, pricing.monthly)}
            </p>
            <p className="mt-1 text-sm text-foreground/50">per month</p>
          </div>
          <div className="px-6 py-6 text-center">
            {/* Inline with the tier label, not floated into the corner — as an
                absolute pill it collided with the centred "Annual". */}
            <p className="flex items-center justify-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-foreground/45">
              Annual
              {saving > 0 ? (
                <span className="rounded-full bg-[#1f9d63]/12 px-2 py-0.5 text-[10px] text-[#1f9d63] dark:bg-[#3ad48c]/15 dark:text-[#3ad48c]">
                  Save {saving}%
                </span>
              ) : null}
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {formatPrice(pricing, annualPerMonth(pricing))}
            </p>
            <p className="mt-1 text-sm text-foreground/50">
              per month, billed {formatPrice(pricing, pricing.annual)} yearly
            </p>
          </div>
        </div>

        {benefits.length > 0 ? (
          <div className="border-t border-[#e7e0d4] px-6 py-6 dark:border-border/50">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-foreground/45">
              Everything included
            </p>
            <ul className="mt-4 space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex gap-3 text-[14.5px] leading-snug">
                  <CheckMark />
                  <span className="text-foreground/75">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-foreground/40">
        Billed through {storeLabel}. Prices shown in {pricing.code} and may vary
        by territory — your store shows the exact amount before you confirm.
      </p>
    </Reveal>
  );
}
