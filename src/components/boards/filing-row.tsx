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
import { Delta } from "@/components/ui/delta";

/** Alpha in pp, for pages that show it inside a denser row. Plain text since
 *  2026-09-19 (returns are never chips) — the name is what four callers know
 *  it by.
 *
 *  Three states, not two. `null` is unmeasured; a figure that rounds to zero at
 *  one decimal place is measured and flat, and `<Delta>` gives it neutral ink
 *  and no sign — the 2026-08-02 round logged "+0.0% against +0.0%" as a defect
 *  on the filing pages. */
export function AlphaBadge({ ratio }: { ratio: number | null }) {
  return (
    <Delta
      ratio
      fallback={
        <span className="text-num tabular-nums font-normal text-foreground/40">
          n/a
        </span>
      }
      size="num"
      suffix="pp"
      value={ratio}
    />
  );
}
