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

export function StatTiles({
  stats,
  note,
  className = "",
}: {
  stats: StatTile[];
  /** Caveat line under the tiles — a concentration warning, a sample-size
   *  note. Set in the same small grey as every other piece of small print. */
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-black/[0.06] bg-black/[0.02] px-3.5 py-3 dark:border-white/[0.07] dark:bg-white/[0.03]"
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
