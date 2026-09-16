/** The one chart a living study draws: each cell’s beat rate as a dot with
 *  its 95% interval, on one axis from 0 to 100%, against the rate for every
 *  purchase in scope.
 *
 *  Form before colour (dataviz method). The reader’s job is to compare a
 *  handful of proportions and see how sure each one is, which is a dot-and-
 *  interval plot: one row per cell, the point estimate as a mark, the interval
 *  as a line through it, one reference line for the whole population. Not a
 *  bar chart, because a bar from zero to 64% draws the 64% as a quantity when
 *  the quantity that matters is its distance from the reference and the width
 *  of its interval. Not a second panel for the median alpha, because one view
 *  is the rule unless the second says something new, and the table below
 *  carries the median where it can be read against its n.
 *
 *  One hue. Nothing here is a series: the rows are categories on one measure,
 *  so identity comes from the row label and colour carries no meaning at all.
 *  The mark is the brand accent on light ground and its tan step on dark;
 *  text wears text tokens, never the mark’s colour.
 *
 *  A cell under the floor gets no dot and no interval, in line with the
 *  director pages: the count is shown, the rate is not. What it gets instead
 *  is a meter of its count toward the floor, drawn on a lighter step of the
 *  same hue, which is a quantity a reader can read off (rule 9): 21 of 30 is
 *  70% of the way to a rate, and that is what the row says.
 *
 *  HTML, not SVG. Every row is a grid line with a label column and a track,
 *  and the marks are positioned by percentage inside the track, so the chart
 *  reflows at phone width without its type scaling with it.
 */
import type { StudyCell } from "../../../shared/studies";

import { MIN_CELL, pct } from "../../../shared/studies.js";

const TICKS = [0, 25, 50, 75, 100];

export function CellChart({
  cells,
  compareIds,
  reference,
  referenceLabel,
}: {
  cells: StudyCell[];
  /** The two cells the verdict compares. Their marks are drawn at full
   *  strength; a breakdown cell is drawn lighter. */
  compareIds: string[];
  /** The whole-population beat rate, as a ratio. Null while the population
   *  itself is under the floor, in which case no line is drawn. */
  reference: number | null;
  referenceLabel: string;
}) {
  return (
    <figure className="rounded-2xl border border-hairline bg-sheet p-4 sm:p-6 dark:border-white/[0.07] dark:bg-surface">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/45">
          Share that beat the index, with 95% interval
        </span>
        {reference != null ? (
          <span className="text-[12px] text-foreground/55">
            <span
              aria-hidden
              className="mr-1.5 inline-block h-3 w-px translate-y-[2px] bg-foreground/50"
            />
            {referenceLabel} {pct(reference)}
          </span>
        ) : null}
      </figcaption>

      <div className="mt-5">
        {cells.map((c) => (
          <CellRow
            key={c.id}
            cell={c}
            emphasis={compareIds.includes(c.id)}
            reference={reference}
          />
        ))}

        {/* The axis, under the track column only. */}
        <div className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] gap-x-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          <span />
          <div className="relative h-5 border-t border-hairline dark:border-separator">
            {TICKS.map((t) => (
              <span
                key={t}
                className="absolute top-1 -translate-x-1/2 font-mono text-[10px] tabular-nums text-foreground/40"
                style={{ left: `${t}%` }}
              >
                {t}%
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

function CellRow({
  cell,
  emphasis,
  reference,
}: {
  cell: StudyCell;
  emphasis: boolean;
  reference: number | null;
}) {
  const stated = cell.beatRate != null && cell.interval != null;
  const title = stated
    ? `${cell.label}: ${pct(cell.beatRate)} of ${cell.n} beat the index (95% interval ${pct(cell.interval!.lo)} to ${pct(cell.interval!.hi)})`
    : `${cell.label}: ${cell.n} of the ${MIN_CELL} purchases needed before a rate is stated`;

  return (
    <div
      className={`grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-center gap-x-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] ${
        cell.nested ? "py-1.5" : "py-2.5"
      }`}
      title={title}
    >
      <div className={`min-w-0 ${cell.nested ? "pl-4" : ""}`}>
        <p
          className={`leading-[1.3] ${
            cell.nested
              ? "text-[12.5px] text-foreground/60"
              : "text-[14px] font-medium text-foreground"
          }`}
        >
          {cell.label}
        </p>
        <p className="mt-0.5 font-mono text-[10.5px] tabular-nums tracking-[0.04em] text-foreground/45">
          {stated
            ? `n ${cell.n} · ${cell.companies} ${cell.companies === 1 ? "company" : "companies"}`
            : `${cell.n} of ${MIN_CELL} needed`}
        </p>
      </div>

      {/* The track: a hairline baseline at mid-height, the reference line
          through it, and the mark on top. */}
      <div className="relative h-8">
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-px bg-hairline dark:bg-separator"
        />
        {reference != null ? (
          <span
            aria-hidden
            className="absolute inset-y-0 w-px bg-foreground/35"
            style={{ left: `${reference * 100}%` }}
          />
        ) : null}

        {stated ? (
          <>
            {/* Interval: a 2px line, rounded, with the surface showing
                through at the reference so the two never read as one mark. */}
            <span
              aria-hidden
              className={`absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full ${
                emphasis
                  ? "bg-brand-brown/45 dark:bg-brand-tan/50"
                  : "bg-brand-brown/25 dark:bg-brand-tan/30"
              }`}
              style={{
                left: `${cell.interval!.lo * 100}%`,
                width: `${(cell.interval!.hi - cell.interval!.lo) * 100}%`,
              }}
            />
            {/* The mark: 10px on the compared cells, 8px on a breakdown, each
                with a 2px surface ring so it stays legible across the
                reference line. */}
            <span
              aria-hidden
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-sheet dark:ring-surface ${
                emphasis
                  ? "h-[11px] w-[11px] bg-brand-brown dark:bg-brand-tan"
                  : "h-[9px] w-[9px] bg-brand-brown/70 dark:bg-brand-tan/70"
              }`}
              style={{ left: `${cell.beatRate! * 100}%` }}
            />
            {/* The value, in ink, placed clear of the interval on whichever
                side has room. */}
            <span
              className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[13px] font-semibold tabular-nums tracking-[-0.01em] text-foreground ${
                cell.interval!.hi > 0.8 ? "-translate-x-full pr-2.5" : "pl-2.5"
              }`}
              style={{
                left: `${(cell.interval!.hi > 0.8 ? cell.interval!.lo : cell.interval!.hi) * 100}%`,
              }}
            >
              {pct(cell.beatRate)}
            </span>
          </>
        ) : (
          <>
            {/* Under the floor: the count toward it, on a lighter step of
                the same hue, from the same zero the axis starts at. Its scale
                is the floor, not the axis: 30 purchases is the full track. */}
            <span
              aria-hidden
              className="absolute top-1/2 h-[7px] -translate-y-1/2 rounded-[3px] bg-brand-brown/[0.14] dark:bg-brand-tan/[0.18]"
              style={{
                left: 0,
                width: `${Math.min(100, (cell.n / MIN_CELL) * 100)}%`,
              }}
            />
            {/* Placed after the meter's end while there is room, and before
                it once there is not: a label that runs past the track is the
                one thing a phone-width chart must not do. */}
            <span
              className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[12px] text-foreground/55 ${
                cell.n / MIN_CELL > 0.5 ? "-translate-x-full pr-2.5" : "pl-2.5"
              }`}
              style={{
                left: `${Math.min(100, (cell.n / MIN_CELL) * 100)}%`,
              }}
            >
              rate appears at {MIN_CELL}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
