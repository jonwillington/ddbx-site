/** The tracking-since line, in the stage header.
 *
 *  Every board says "over the last twelve months" in 54px type and then puts
 *  the qualifier — recording only started in March 2026 — 500px further down,
 *  under the stage, at 45% opacity. Nobody reads it there. It belongs directly
 *  under the figures band it qualifies, on the same tokens the sector hub
 *  already uses for its issuer-concentration caveat: small, white/60, one
 *  line, not dismissible. A close button beside a footnote is more furniture
 *  than the footnote, and it would need a stored dismissal that outlives the
 *  reason for the notice.
 *
 *  Mount it after `<StageFigures reserve … />` in the stage `header`, and
 *  drop the below-stage `<TrackingNotice />` on the same page — one
 *  statement, not two. The wording is the shared sentence with a shorter
 *  lead-in; the month comes from shared/tracking.js and is per market.
 */

import { trackingSinceLabel } from "../../../shared/tracking.js";

export function StageNotice({
  className = "mt-3",
  marketId,
}: {
  className?: string;
  marketId?: string | null;
}) {
  return (
    <p
      className={`max-w-[48ch] text-[12.5px] leading-[1.5] text-white/60 ${className}`}
    >
      Recording started in {trackingSinceLabel(marketId)}, so a period described
      as a year covers only the filings since then.
    </p>
  );
}
