/** Label-over-value tiles — how every finished ddbx surface states a number.
 *
 *  Extracted from the company page's metrics block. The SEO list pages were
 *  setting their figures as a run of same-weight grey text
 *  ("309 buys   £37m   139 companies   median alpha +0.9%"), which gives the
 *  reader no way to tell which of the four they were meant to look at, and
 *  reads as a debug line rather than as a statistic. A tile per number, with
 *  the label small above and the figure heavy below, is the fix — and it's the
 *  treatment already used everywhere else on the site.
 *
 *  `primary` marks the one number the page is actually about; `tone` colours a
 *  return using the site's own `--positive`/`--negative` tokens.
 */
import type { ReactNode } from "react";

export interface StatTile {
  label: string;
  value: ReactNode;
  /** Sets the figure a size larger — one per group at most. */
  primary?: boolean;
  tone?: "positive" | "negative";
}

const COLS: Record<2 | 3 | 4 | 5, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
};

export function StatTiles({
  stats,
  note,
  cols = 4,
  className = "",
}: {
  stats: StatTile[];
  /** Caveat line under the tiles — a concentration warning, a sample-size
   *  note. Set in the same small grey as every other piece of small print. */
  note?: ReactNode;
  /** Columns at `sm` and up (always 2 below). Pass `stats.length` when it
   *  isn't 4 — a 5-stat group in a 4-col grid leaves one tile ragged on a
   *  row of its own. */
  cols?: 2 | 3 | 4 | 5;
  className?: string;
}) {
  return (
    <div className={className}>
      <dl className={`grid grid-cols-2 gap-2 ${COLS[cols]}`}>
        {stats.map((s) => (
          <div
            key={s.label}
            // The house tile: a borderless tint well, same object as the
            // company-page metrics this component was extracted from. (It
            // shipped with its own bordered variant first — which is how
            // /sectors/:slug ended up drawing tiles inside tiles.)
            className="rounded-xl bg-black/[0.035] px-3.5 py-3 dark:bg-white/[0.05]"
          >
            <dt className="text-[11px] leading-tight text-foreground/50">
              {s.label}
            </dt>
            <dd
              className={`mt-1 font-semibold tabular-nums tracking-[-0.01em] ${
                s.primary ? "text-[19px]" : "text-[15.5px]"
              } ${
                s.tone === "positive"
                  ? "text-positive"
                  : s.tone === "negative"
                    ? "text-negative"
                    : "text-foreground"
              }`}
            >
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
      {note ? (
        <p className="mt-2 text-[12px] leading-[1.5] text-foreground/45">
          {note}
        </p>
      ) : null}
    </div>
  );
}
