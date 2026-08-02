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
 *
 *  ---------------------------------------------------------------------------
 *  Levelled off /api, 2026-08-02
 *  ---------------------------------------------------------------------------
 *
 *  These shipped as borderless tint wells with a plain 11px label and a 15.5px
 *  figure — quiet enough that a page's headline number carried no more weight
 *  than the caption under it. The /api page's proof cards are the house's
 *  finished version of the same object, and `download/stat-band.tsx` is that
 *  object already translated out of the dark palette. So the spec comes from
 *  there rather than being invented again:
 *
 *    card    rounded-2xl, hairline border, bg-white/70 (surface-secondary/40 dark)
 *    label   font-mono 11px semibold uppercase tracking-[0.16em]
 *    figure  26px (32px primary), semibold, leading-none, tabular-nums
 *
 *  The mono uppercase label is the load-bearing part. It is the same eyebrow
 *  spec the section kickers and the page eyebrows use, so a figure now reads as
 *  part of the same system as the headings around it instead of as a caption
 *  someone set in the body face.
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
            // The house tile, per /api and download/stat-band.tsx. Bordered
            // rather than a bare tint: the tint alone disappeared against the
            // page on the light palette, and the border is what makes a row of
            // these read as a set of objects rather than as banding.
            className="h-full rounded-2xl border border-hairline bg-white/70 px-4 py-3.5 dark:border-border/60 dark:bg-surface-secondary/40"
          >
            <dt className="font-mono text-[11px] font-semibold uppercase leading-tight tracking-[0.16em] text-foreground/45">
              {s.label}
            </dt>
            <dd
              className={`mt-2 font-semibold leading-none tabular-nums tracking-[-0.02em] ${
                s.primary ? "text-[32px]" : "text-[26px]"
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
        <p className="mt-3 text-[12.5px] leading-[1.45] text-foreground/50">
          {note}
        </p>
      ) : null}
    </div>
  );
}
