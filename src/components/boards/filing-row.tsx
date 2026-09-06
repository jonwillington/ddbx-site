/** What is left of the old per-filing row: the alpha badge.
 *
 *  `FilingRow` lived here until 2026-09-06. It drew /best-performing-buys and
 *  /roles/:slug with a three-column grid — a 1.5rem rail, everything else in a
 *  1fr middle track, and one figure on the right — which put the row's facts
 *  into an 11px dot-string at 50% ink and set the ranked figure at 26px against
 *  an 18px company name, a rule-5 inversion. Both pages moved to `BoardRow`,
 *  which shares one column spec with every other board, and the component went
 *  with the migration.
 *
 *  The file stays because `AlphaBadge` is not a row and has three other
 *  callers; the import path is what those pages know it by, so renaming the
 *  module would be a change to four files to fix a filename.
 */
import { DeltaBadge } from "@/components/market/market-row";

/** The alpha badge, for pages that show it inside a denser row.
 *
 *  Three states, not two. `null` is unmeasured; a figure that rounds to zero at
 *  one decimal place is measured and flat, and it gets neutral type rather than
 *  a badge. DeltaBadge colours and points its arrow on the sign alone, so a
 *  median alpha of +0.04pp renders as a green "▲ +0.0PP" — an arrow claiming a
 *  rise above a number saying there wasn't one. The 2026-08-02 round logged the
 *  same shape ("+0.0% against +0.0%") as a defect on the filing pages.
 *
 *  Contained here rather than fixed in DeltaBadge: that component is on the
 *  market rows, the drawer and /biggest-buys, and changing how every one of
 *  them renders a flat figure is a live-page decision, not a side effect of
 *  adding four pages. Noted as a follow-up in the round-three investigation. */
export function AlphaBadge({ ratio }: { ratio: number | null }) {
  if (ratio == null) {
    return (
      <span className="text-[13px] tabular-nums text-foreground/40">n/a</span>
    );
  }

  const pp = ratio * 100;

  if (Math.abs(pp) < 0.05) {
    return (
      <span className="text-[13px] tabular-nums text-foreground/50">0.0pp</span>
    );
  }

  return <DeltaBadge suffix="pp" value={pp} />;
}
