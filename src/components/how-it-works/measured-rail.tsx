/** The horizon rail: how much measured evidence exists, and how fast it runs out.
 *
 *  ---------------------------------------------------------------------------
 *  The bar this replaces
 *  ---------------------------------------------------------------------------
 *
 *  `OutcomeCoverage` (coverage-panel.tsx, since deleted) drew one MeterBar per horizon scaled
 *  to the LARGEST horizon on the page. That maximum is not a quantity — it is
 *  whichever sibling happened to win — so the bars said "this row is a quarter
 *  of that row" and nothing about how much of the corpus is actually measured.
 *  The board review struck the same encoding on /biggest-buys for the same
 *  reason.
 *
 *  Here every horizon is drawn against ONE denominator that means something:
 *  the number of buys with any measured outcome at all (`outcomes.events`,
 *  a COUNT DISTINCT over the outcomes table). So each column is a share of the
 *  same population, five identical empty frames filled to different levels,
 *  and the answer to "how much of this do we actually know?" is the amount of
 *  brown in the frame. The 30-day column fills its frame because every measured
 *  buy has a 30-day figure by construction; that is the fact, not a coincidence
 *  of scaling.
 *
 *  The count label is pinned to the TOP OF ITS OWN FILL rather than to the top
 *  of the panel, so the figures fall down a staircase alongside the fills and
 *  the thinning is told twice — once as area, once as a descending row of
 *  numbers. That is the whole two-second read.
 *
 *  ---------------------------------------------------------------------------
 *  Truth rules this object has to keep
 *  ---------------------------------------------------------------------------
 *
 *  - A horizon with no events is not drawn (an empty frame with a "0" over it
 *    would be a measurement claim we do not have). If NO horizon has events,
 *    the whole panel is replaced by a sentence saying so — empty and failed are
 *    different states, and this one is empty.
 *  - Fills have a 3px floor. A single event against a 2,232 denominator is
 *    0.04% of the height, which rounds to nothing and reads as missing data
 *    rather than as one measurement. The floor is stated on the panel; the
 *    exact count sits above every column, so nothing is decoded from a length.
 *  - Nothing is interpolated. The columns are the four or five horizons the
 *    outcomes table actually stores, in order, and no line connects their tops:
 *    the population between two horizons is not a number we hold.
 *
 *  ---------------------------------------------------------------------------
 *  The specimen on the axis
 *  ---------------------------------------------------------------------------
 *
 *  The page threads one real filing through every section. Here it sits under
 *  the axis at the horizon it has actually reached — computed from its trade
 *  date at render, never stored — so the abstract taper gets one concrete
 *  reading: this purchase is old enough for the first column and not the
 *  second, and the date its next figure arrives is arithmetic anyone can check.
 *  That is also how this section answers "say when the number will exist"
 *  without inventing one.
 */
import type { ExampleFiling } from "@/lib/methodology-examples";
import type { CoverageResponse } from "@/types/ddbx";

import {
  CAPTION,
  EYEBROW,
  PANEL,
  RULE,
  shortDate,
} from "@/components/how-it-works/shared";
import { SpecimenMark } from "@/components/how-it-works/specimen-mark";
import { count } from "@/lib/coverage";

/** Whole days between an ISO date and today, in UTC so the answer does not
 *  change with the reader's timezone. Negative dates (a future trade date,
 *  which the feeds do occasionally publish) clamp to zero. */
function daysSince(iso: string): number {
  const then = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

  if (!Number.isFinite(then)) return 0;
  const now = Date.now();

  return Math.max(0, Math.floor((now - then) / 86_400_000));
}

function plusDays(iso: string, days: number): string {
  const then = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

  return new Date(then + days * 86_400_000).toISOString().slice(0, 10);
}

/** The specimen's sentence, built from its own trade date and the horizons the
 *  table actually stores. Three shapes, because a filing can be too young for
 *  any horizon, between two, or past the last one. */
function specimenLine(
  specimen: ExampleFiling,
  age: number,
  days: number[],
): string {
  const cleared = days.filter((d) => d <= age);
  const next = days.find((d) => d > age);
  const head = `The worked example, ${specimen.company}, was bought ${age} ${
    age === 1 ? "day" : "days"
  } ago.`;

  if (cleared.length === 0) {
    const first = days[0];

    return `${head} It is too young to have been measured at all: its first figure lands at ${first} days, on ${shortDate(
      plusDays(specimen.date, first),
    )}.`;
  }
  const last = cleared[cleared.length - 1];

  if (next == null) {
    return `${head} It has a figure at every horizon above, ${last} days included.`;
  }

  return `${head} It has a figure at ${last} days and reaches ${next} on ${shortDate(
    plusDays(specimen.date, next),
  )}, which is when its next one exists.`;
}

export function HorizonRail({
  data,
  specimen,
}: {
  data: CoverageResponse;
  /** Optional: markets without an analysis layer have no curated filing, and
   *  the rail is still the honest picture of the corpus without one. */
  specimen?: ExampleFiling;
}) {
  // A horizon the table has no events for is not a zero to draw, it is a
  // measurement that does not exist.
  const horizons = data.outcomes.horizons
    .filter((h) => h.events > 0)
    .sort((a, b) => a.horizon_days - b.horizon_days);

  // Empty, not failed. `useCoverage` always renders a real reading, so there
  // is no third state to handle here.
  if (horizons.length === 0) {
    return (
      <p
        className={`mt-6 ${PANEL} px-5 py-4 text-[14px] leading-[1.65] text-foreground/70`}
      >
        Not enough data yet. No rated buy has run long enough to be scored
        against the index, so there is nothing here to show. The first figures
        appear once the earliest rated buys clear their shortest horizon.
      </p>
    );
  }

  // The one denominator every column is a share of: buys with any measured
  // outcome. `Math.max` against the horizons as well, so a future response
  // whose headline lags its own split can never produce a bar over 100%.
  const total = Math.max(
    data.outcomes.events,
    ...horizons.map((h) => h.events),
  );
  const days = horizons.map((h) => h.horizon_days);
  const shortest = days[0];
  const longest = horizons[horizons.length - 1];

  const age = specimen ? daysSince(specimen.date) : 0;
  // Which gap the specimen sits in: 0 = before the first column, n = past the
  // last. Between two columns it is centred on the boundary, which is all the
  // precision a column axis can carry — the real figure is in the sentence.
  const slot = specimen ? days.filter((d) => d <= age).length : 0;
  const markColumn =
    slot === 0
      ? { gridColumn: "1", justifySelf: "start" as const }
      : slot >= days.length
        ? { gridColumn: String(days.length), justifySelf: "end" as const }
        : { gridColumn: `${slot} / span 2`, justifySelf: "center" as const };

  const cols = { gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))` };

  return (
    <div className={`mt-6 ${PANEL} px-4 pb-4 pt-4 sm:px-5 sm:pb-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className={EYEBROW}>Buys with a measured return</p>
        {/* The frame height, named. Without this the empty part of each column
            is a shape rather than a quantity. */}
        <p className="text-[11.5px] leading-none text-foreground/45">
          Each frame is all {count(total)} we have measured
        </p>
      </div>

      {/* The drawing is decorative twice over — the counts and the horizon
          labels inside it are real text a screen reader reads in order — so
          only the tinted boxes are hidden, and the reading order is stated
          once here. */}
      <p className="sr-only">
        Buys with a measured return, by horizon, out of {count(total)} measured
        in all.
      </p>

      <div className="relative mt-9 h-[164px] sm:h-[196px]">
        {/* The top of every frame, drawn across the gaps so the five frames
            read as one shared ceiling rather than five separate maxima. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 border-t border-dashed border-black/15 dark:border-white/25"
        />
        <div className="grid h-full gap-2 sm:gap-3" style={cols}>
          {horizons.map((h) => {
            const pct = (h.events / total) * 100;
            // 3px floor: one event in two thousand is a third of a pixel, and
            // a bar that renders as nothing reads as missing rather than as
            // small. The count above it is the actual value.
            const height = `max(3px, ${pct}%)`;

            return (
              <div key={h.horizon_days} className="relative h-full">
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-t-[3px] bg-black/[0.04] dark:bg-white/[0.06]"
                />
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 rounded-t-[3px] bg-brand-brown/80 dark:bg-brand-tan/70"
                  style={{ height }}
                />
                {/* Pinned to the top of its own fill, not to the panel: the
                    numbers then descend the same staircase the fills do. */}
                <p
                  className="absolute inset-x-0 mb-[6px] text-center text-[12px] font-semibold tabular-nums leading-none tracking-[-0.01em] text-foreground"
                  style={{ bottom: height }}
                >
                  {count(h.events)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className={`mt-2 grid gap-2 border-t pt-2 sm:gap-3 ${RULE}`}
        style={cols}
      >
        {horizons.map((h) => (
          <p
            key={h.horizon_days}
            className="text-center text-[11.5px] leading-[1.35] tabular-nums text-foreground/55"
          >
            {h.horizon_days} days
          </p>
        ))}
      </div>

      {specimen ? (
        <div className="mt-2 grid gap-2 sm:gap-3" style={cols}>
          <div className="flex flex-col items-center" style={markColumn}>
            <span
              aria-hidden
              className="h-2.5 w-px bg-hairline dark:bg-separator"
            />
            <SpecimenMark className="mt-1" />
            <p className="mt-1 whitespace-nowrap text-[11px] leading-none tabular-nums text-foreground/55">
              {age} days
            </p>
          </div>
        </div>
      ) : null}

      <div className={`mt-4 border-t pt-3 ${RULE}`}>
        <p className="text-[13px] leading-[1.6] text-foreground/70">
          Every buy we have measured has a figure at {shortest} days, because
          that is the first horizon the pipeline scores. Only{" "}
          {count(longest.events)}{" "}
          {longest.events === 1 ? "buy has" : "buys have"} run for{" "}
          {longest.horizon_days} days.{" "}
          {specimen ? specimenLine(specimen, age, days) : ""}
        </p>
        <p className={`mt-2 ${CAPTION}`}>
          Columns are to scale against the frame. The shortest are drawn three
          pixels tall so they stay visible; the figure above each one is the
          count.
        </p>
      </div>
    </div>
  );
}
