/** The company's most recent purchase, stated in full.
 *
 *  The /how-it-works specimen card's grammar, brought to the record page it
 *  was always closest to: a label band carrying the verdict, the person large,
 *  the trade as four labelled cells, then one paragraph and the door to the
 *  filing. The company page had every one of those facts and set them in a
 *  13.5px table row, which is how a page with one filing on it (most of the
 *  368) read as empty: its whole subject was a single line of small type.
 *
 *  Differences from the specimen, each for a reason:
 *
 *  - No logo in the "who" band. The company's mark heads the sheet this card
 *    sits on, and a second copy 200px lower would say "a different company".
 *  - The fill is the stat tiles' (white/70 on the sheet), not the specimen's
 *    `bg-sheet`. This card sits INSIDE the document sheet, and a sheet-on-sheet
 *    panel reads as a hole; the tiles already solved that one level up.
 *  - A fourth cell for the outcome, when the purchase has a mark. It is the
 *    only coloured figure on the card, and colour here means direction.
 *
 *  The page does the formatting and passes facts in, so this stays a layout:
 *  the company page's money and date formatters are market-aware and live
 *  there. */
import type { ReactNode } from "react";
import type { Rating } from "@/lib/api";

import { Link } from "react-router-dom";

import { RatingBadge } from "@/components/rating-badge";
import { EYEBROW, KICKER, RULE } from "@/components/how-it-works/shared";

export interface LatestBuyFact {
  label: string;
  value: ReactNode;
  tone?: "positive" | "negative";
  /** A line under the figure: the alpha under a return. */
  note?: ReactNode;
}

/** Vertical hairlines between cells: two columns on a phone, three or four
 *  from `sm`. Whole literals so Tailwind can see them (as in specimen-card). */
function cellRule(index: number): string {
  const across =
    index === 0
      ? ""
      : index % 2 === 1
        ? `border-l ${RULE} pl-4 sm:pl-6`
        : `sm:border-l ${RULE} sm:pl-6`;
  const down =
    index > 1 ? `mt-6 border-t ${RULE} pt-6 sm:mt-0 sm:border-t-0 sm:pt-0` : "";

  return `${across} ${down}`.trim();
}

export function LatestBuyCard({
  eyebrow,
  facts,
  filingHref,
  name,
  nameHref,
  rating,
  role,
  summary,
}: {
  eyebrow: string;
  facts: LatestBuyFact[];
  filingHref: string | null;
  name: string;
  nameHref: string | null;
  rating: Rating | null;
  role: string;
  /** The analysis one-liner. Omitted, not replaced, on an unrated purchase:
   *  there is no honest sentence to put in its place. */
  summary: string | null;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-white/70 px-5 py-6 dark:border-border/60 dark:bg-surface-secondary/40 sm:px-7 sm:py-7">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <p className={EYEBROW}>{eyebrow}</p>
        {rating ? <RatingBadge rating={rating} /> : null}
      </div>

      <div className={`mt-5 border-t ${RULE} pt-5`}>
        {nameHref ? (
          <Link
            className="text-[26px] font-semibold leading-[1.1] tracking-[-0.025em] text-foreground underline-offset-[5px] hover:underline sm:text-[30px]"
            to={nameHref}
          >
            {name}
          </Link>
        ) : (
          <p className="text-[26px] font-semibold leading-[1.1] tracking-[-0.025em] text-foreground sm:text-[30px]">
            {name}
          </p>
        )}
        {role ? (
          <p className="mt-1.5 text-[16px] leading-[1.4] text-foreground/60">
            {role}
          </p>
        ) : null}
      </div>

      <div
        className={`mt-6 grid grid-cols-2 gap-x-4 border-t ${RULE} pt-6 sm:gap-x-6 ${
          facts.length >= 4
            ? "sm:grid-cols-4"
            : facts.length === 3
              ? "sm:grid-cols-3"
              : ""
        }`}
      >
        {facts.map((fact, i) => (
          <div key={fact.label} className={`min-w-0 ${cellRule(i)}`}>
            <p className={`${KICKER} text-foreground/45`}>{fact.label}</p>
            <p
              className={`mt-2 text-[20px] font-medium leading-[1.2] tracking-[-0.01em] tabular-nums sm:text-[22px] ${
                fact.tone === "positive"
                  ? "text-positive"
                  : fact.tone === "negative"
                    ? "text-negative"
                    : "text-foreground"
              }`}
            >
              {fact.value}
            </p>
            {fact.note ? (
              <p className="mt-1.5 text-[12.5px] leading-[1.4] text-foreground/50">
                {fact.note}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {summary || filingHref ? (
        <div className={`mt-6 border-t ${RULE} pt-6`}>
          {summary ? (
            <p className="max-w-[66ch] text-[16px] leading-[1.65] text-foreground/80">
              {summary}
            </p>
          ) : null}
          {filingHref ? (
            <Link
              className={`${summary ? "mt-4 " : ""}inline-block text-[16px] font-medium text-foreground underline decoration-foreground/30 underline-offset-[5px] transition-colors hover:decoration-foreground`}
              to={filingHref}
            >
              See the filing
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
