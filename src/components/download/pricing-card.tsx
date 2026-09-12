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
 *
 *  ---------------------------------------------------------------------------
 *  Why it is a specimen card now (2026-09-12)
 *  ---------------------------------------------------------------------------
 *
 *  The card's shape was right and its typography was not the house's: three
 *  bands of centred type under a left-set `SectionHeader`, which reads as two
 *  unrelated layouts stacked. So it is re-set on the grammar `LatestBuyCard`
 *  and `SpecimenCard` share — a label band with the badge to its right, a
 *  hairline, the facts as labelled cells divided by vertical hairlines, a
 *  hairline, one closing paragraph — and is flush left top to bottom. The one
 *  object on this page that states a purchase in full is now drawn like every
 *  other one on the site.
 *
 *  The trial line is the band's eyebrow rather than a heading, because the
 *  figures below it are the card's subject: what the reader is looking for is
 *  the two numbers, and the free week is the frame around them.
 */
import {
  CAPTION,
  EYEBROW,
  EYEBROW_QUIET,
  KICKER,
  RULE,
} from "@/components/how-it-works/shared";
import { useDownloadCopy } from "@/lib/download/copy";
import {
  annualPerMonth,
  annualSavingPct,
  formatPrice,
  type MarketPricing,
} from "@/lib/pricing";

/** The wall between the two tiers. A vertical hairline from `sm`, where the
 *  cells sit side by side; stacked on a phone it becomes the horizontal rule
 *  above the second tier, because a vertical rule between stacked blocks has
 *  nothing to divide. Whole literals so Tailwind can see them (as in
 *  `latest-buy.tsx`). */
function cellRule(index: number): string {
  return index === 0
    ? ""
    : `mt-5 border-t ${RULE} pt-5 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0`;
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
    <div className="max-w-lg rounded-2xl border border-hairline bg-white/70 px-5 py-6 dark:border-border/60 dark:bg-surface-secondary/40 sm:px-7 sm:py-7">
      <div className="flex items-center justify-between gap-x-4">
        <p className={EYEBROW}>{t.freeForDays(pricing.trialDays)}</p>
        {/* A promotion has to say it is one, in the same object as the numbers
            it applies to. Left implicit, a visitor who comes back after it ends
            reads the higher price as a bait-and-switch. On the eyebrow's own
            row, the way LatestBuyCard sets its rating badge. */}
        {pricing.promotional ? (
          <span
            className={`shrink-0 rounded-full bg-brand-brown/10 px-2.5 py-1 ${KICKER} text-brand-brown dark:bg-brand-tan/15 dark:text-brand-tan`}
          >
            {t.limitedTime}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[16px] leading-[1.5] text-foreground/70">
        {t.fullAccessNote}
      </p>

      <div
        className={`mt-6 grid border-t ${RULE} pt-6 sm:grid-cols-2 sm:gap-x-6`}
      >
        <div className={`min-w-0 ${cellRule(0)}`}>
          <p className={`${KICKER} text-foreground/45`}>{t.monthly}</p>
          <p className="mt-2 text-[26px] font-semibold leading-[1.1] tracking-[-0.025em] tabular-nums text-foreground sm:text-[30px]">
            {formatPrice(pricing, pricing.monthly)}
          </p>
          <p className={`mt-1.5 ${CAPTION}`}>{t.perMonth}</p>
        </div>

        <div className={`min-w-0 ${cellRule(1)}`}>
          {/* Inline with the tier label, not floated into the corner — as an
              absolute pill it collided with the figure below it. */}
          <p
            className={`flex flex-wrap items-center gap-2 ${KICKER} text-foreground/45`}
          >
            {t.annual}
            {saving > 0 ? (
              <span className="rounded-full bg-positive/12 px-2 py-0.5 tabular-nums text-positive">
                {t.savePct(saving)}
              </span>
            ) : null}
          </p>
          <p className="mt-2 text-[26px] font-semibold leading-[1.1] tracking-[-0.025em] tabular-nums text-foreground sm:text-[30px]">
            {formatPrice(pricing, annualPerMonth(pricing))}
          </p>
          <p className={`mt-1.5 tabular-nums ${CAPTION}`}>
            {t.perMonthBilledYearly(formatPrice(pricing, pricing.annual))}
          </p>
        </div>
      </div>

      <p className={`mt-6 border-t ${RULE} pt-5 ${CAPTION}`}>
        {t.billedThrough(storeLabel, pricing.code)}
      </p>
    </div>
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
 *  they came for should find it here rather than guess whether it's included.
 *
 *  Ruled rows, not ticked bullets. The ticked disc means "this check cleared"
 *  everywhere else on the site and the mark vocabulary is exclusive, so nine
 *  ticks here would be nine verdicts on claims nothing has verified. The
 *  pipeline ledger's "What leaves" column is the species: hairlines between
 *  one-line items, at the body size rather than a caption's. Nine full
 *  `RowList` rows would be right in kind and a thousand pixels tall. */
export function IncludedList({ benefits }: { benefits: string[] }) {
  const t = useDownloadCopy();

  if (benefits.length === 0) return null;

  return (
    <div>
      <p className={EYEBROW_QUIET}>{t.everythingIncluded}</p>
      <ul className={`mt-5 border-t ${RULE}`}>
        {benefits.map((b) => (
          <li
            key={b}
            className={`border-b ${RULE} py-3.5 text-[16px] leading-[1.4] text-foreground/85 sm:text-[17px]`}
          >
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
