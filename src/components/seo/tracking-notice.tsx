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
 *
 *  The month differs per market (the US feed started in May 2026), so pass
 *  `marketId` wherever the page knows it; the default is the UK line. The
 *  labels and the sentence live in shared/tracking.js so Pages Functions
 *  (sector / leaderboard / report pre-renders) can print the same words.
 *
 *  This is the light-ground form for document pages. Board pages put the same
 *  sentence inside the stage header — see `StageNotice` in
 *  src/components/boards/stage-notice.tsx.
 */

export {
  TRACKING_SINCE_LABEL,
  TRACKING_SINCE_YEAR,
  TRACKING_NOTICE,
  trackingNotice,
  trackingSinceLabel,
} from "../../../shared/tracking.js";

import { trackingNotice } from "../../../shared/tracking.js";

export function TrackingNotice({
  className = "",
  marketId,
}: {
  className?: string;
  marketId?: string | null;
}) {
  return (
    <p
      className={`text-[12.5px] leading-[1.5] text-foreground/45 ${className}`}
    >
      {trackingNotice(marketId)}
    </p>
  );
}
