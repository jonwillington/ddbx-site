/** "We started tracking in March 2026" — the honesty line for the look-back pages.
 *
 *  The sector hubs, the leaderboards and the report archive all describe
 *  themselves as covering "the last twelve months". They don't, and can't: the
 *  pipeline's first stored disclosures are from March 2026, so a page read in
 *  July 2026 is showing about five months of filings under a twelve-month
 *  heading. Left unsaid, every derived figure on those pages — a sector total, a
 *  median alpha, a "biggest buy of the year" — is quietly overstated as a claim
 *  about a period we weren't watching.
 *
 *  Saying so costs nothing and is the difference between a number that informs
 *  and one that's accurate about its own data while being misleading about the
 *  world. Same reasoning as the concentration caveat on the sector rows.
 */

/** First year with stored filings. Gates the leaderboard's year archive — a
 *  "Biggest buys of 2025" link is a promise of an empty board. */
export const TRACKING_SINCE_YEAR = 2026;

/** Human form, used in the notice copy. Update both together if the backfill
 *  ever reaches further back. */
export const TRACKING_SINCE_LABEL = "March 2026";

export function TrackingNotice({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-[12.5px] leading-[1.5] text-foreground/45 ${className}`}
    >
      ddbx started recording disclosures in {TRACKING_SINCE_LABEL}, so periods
      described as a full year cover only the filings since then.
    </p>
  );
}
