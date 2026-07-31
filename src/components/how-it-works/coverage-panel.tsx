/** The volume the method has actually been applied to.
 *
 *  A methodology page is a claim about process, and a claim about process is
 *  worth exactly as much as the corpus it has run over. /how-it-works spent
 *  its first life describing six checks, four ratings and a fifteen-minute
 *  cadence without naming one quantity, so a reader had no way to tell whether
 *  any of it had touched four hundred filings or four hundred thousand. This
 *  is that missing paragraph, drawn.
 *
 *  Everything here is counted at request time (src/lib/coverage.ts → the
 *  /api/coverage endpoint), which is the only design decision on this file
 *  that matters. Numbers typed into a page are wrong within a week and stay
 *  wrong for a year; numbers counted from the tables can only ever be what the
 *  tables hold.
 *
 *  ---------------------------------------------------------------------------
 *  Why the feed table exists at all
 *  ---------------------------------------------------------------------------
 *
 *  The tempting version of this section is four big figures and nothing else.
 *  It would look better and it would be misleading, because the headline
 *  number is a sum over five feeds that do not mean the same thing: a US,
 *  Swedish or Dutch row is one transaction line of a filing that may hold
 *  several, and a congressional row is an amount band. Publishing the total
 *  without the split invites exactly the reading the total cannot support.
 *
 *  So the split is not an appendix to the headline, it is the argument: five
 *  disclosure feeds, in their own formats, each with its own filer vocabulary
 *  and its own start date. That is the interesting fact about this dataset,
 *  and the flags carry it faster than a paragraph would.
 */
import type { FlagComponent } from "country-flag-icons/react/3x2";
import type { CoverageSource } from "@/lib/coverage";
import type { CoverageMarketId, CoverageResponse } from "@/types/ddbx";

import { GB, NL, SE, US } from "country-flag-icons/react/3x2";

import { MeterBar } from "@/components/seo/meter-bar";
import { StatTiles } from "@/components/seo/stat-tiles";
import { FEEDS, FEED_ORDER, count, monthLabel } from "@/lib/coverage";

const RULE = "border-hairline dark:border-separator";

/** Flags are per feed, not per country: the congressional corpus flies the US
 *  flag because it is a US disclosure regime, and sits under its own name so
 *  it is never confused with the Form 4 feed above it. */
const FLAGS: Record<CoverageMarketId, FlagComponent> = {
  UK: GB,
  US: US,
  NL: NL,
  SE: SE,
  USG: US,
};

/** The four figures the page leads on.
 *
 *  Chosen for what they evidence rather than for size, which is why the price
 *  panel is here (every return on the site is computed from it, so its depth
 *  is the honest limit on any performance claim) and the money totals are not
 *  (unaudited sums over columns with known basis problems: see the endpoint). */
export function CoverageTiles({
  data,
  source,
}: {
  data: CoverageResponse;
  source: CoverageSource;
}) {
  const { totals, prices } = data;

  return (
    <StatTiles
      className="mt-6"
      cols={4}
      note={
        <>
          {/* Never "counted as you read this". The endpoint is edge-cached for
              six hours, so the honest claim is the timestamp the count was
              taken, which the response carries for exactly this purpose. */}
          {source === "snapshot" ? (
            <>
              Counted {monthLabel(data.generated_at)}. A stored reading rather
              than a fresh one: the live count did not come back.
            </>
          ) : (
            <>
              Counted from the database, most recently in{" "}
              {monthLabel(data.generated_at)}.
            </>
          )}{" "}
          A disclosure record is one row as its regulator filed it, not one
          trade: the feeds below are not like-for-like and the total is not a
          count of purchases.
        </>
      }
      stats={[
        {
          label: "Disclosure records",
          value: count(totals.disclosures),
          primary: true,
        },
        { label: "Sorting decisions", value: count(totals.triage_decisions) },
        { label: "Written analyses", value: count(totals.analyses) },
        { label: "Daily closing prices", value: count(prices.observations) },
      ]}
    />
  );
}

/** The five feeds, each with its own counts and its own start date.
 *
 *  Two columns of hairline-topped cells rather than cards: the section above
 *  already spends its card budget on the tiles, and a grid of bordered boxes
 *  under a grid of bordered boxes is how a document starts looking like a
 *  dashboard. Same reasoning as the API page's market grid, inverted for a
 *  light document surface. */
export function FeedGrid({ data }: { data: CoverageResponse }) {
  const rows = FEED_ORDER.map((id) =>
    data.markets.find((m) => m.market === id),
  ).filter((m): m is CoverageResponse["markets"][number] => Boolean(m));

  const max = Math.max(...rows.map((r) => r.disclosures), 1);

  return (
    <div className="mt-6 grid gap-x-8 gap-y-7 sm:grid-cols-2">
      {rows.map((row) => {
        const feed = FEEDS[row.market];
        const Flag = FLAGS[row.market];

        return (
          <div key={row.market} className={`border-t ${RULE} pt-4`}>
            <div className="flex items-center gap-2.5">
              {/* Decorative: the feed's name is the very next element, so a
                  screen reader announcing the flag would read the country
                  twice. `title` on a country-flag-icons component lands on the
                  <svg> as an unknown attribute and gives neither a tooltip nor
                  an accessible name, so it was doing nothing anyway. */}
              <Flag
                aria-hidden
                className="h-4 w-6 shrink-0 rounded-[2px] ring-1 ring-black/10 dark:ring-white/15"
              />
              <p className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
                {feed.name}
              </p>
            </div>

            <p className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-brown dark:text-brand-tan">
              {feed.source}
            </p>

            <div className="mt-3 flex items-baseline justify-between gap-3">
              <p className="text-[19px] font-semibold tabular-nums leading-none tracking-[-0.01em] text-foreground">
                {count(row.disclosures)}
              </p>
              <p className="text-[11.5px] leading-none text-foreground/45">
                records
              </p>
            </div>
            {/* Scaled to the largest feed on the page, so the bars say
                "the Dutch register dwarfs the UK one", which is true and not
                obvious, rather than restating each number as a length. */}
            <MeterBar className="mt-2" max={max} value={row.disclosures} />

            <dl className="mt-3 space-y-1 text-[12.5px] leading-[1.5] text-foreground/55">
              {row.open_market_buys != null ? (
                <Row
                  label="Open-market buys"
                  value={count(row.open_market_buys)}
                />
              ) : null}
              <Row label={feed.filer} value={count(row.insiders)} />
              <Row label="Issuers" value={count(row.issuers)} />
              <Row
                label="Records from"
                value={monthLabel(row.first_disclosed)}
              />
            </dl>

            {feed.note ? (
              <p className="mt-2.5 text-[12px] leading-[1.5] text-foreground/45">
                {feed.note}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="min-w-0 truncate">{label}</dt>
      <dd className="shrink-0 tabular-nums text-foreground/80">{value}</dd>
    </div>
  );
}

/** How much of the corpus has a measured outcome, by horizon.
 *
 *  This is the section a marketing page would leave out. Post-event returns
 *  exist for a small fraction of the disclosures counted above, and almost all
 *  of that is at thirty days: the one-year column is six events, which is not
 *  evidence of anything and is shown anyway.
 *
 *  Publishing it is not modesty, it is the load-bearing caveat for every
 *  performance figure elsewhere on the site. A reader who sees the horizon
 *  taper understands in one glance why the record is described as short, and
 *  the number climbs on its own as the pipeline keeps running. */
export function OutcomeCoverage({ data }: { data: CoverageResponse }) {
  const horizons = data.outcomes.horizons.filter((h) => h.events > 0);

  // Nothing to draw rather than a stray hairline under the sentence that
  // introduces the table.
  if (!horizons.length) return null;

  const max = Math.max(...horizons.map((h) => h.events), 1);

  return (
    <div className={`mt-5 border-t ${RULE}`}>
      {horizons.map((h) => (
        <div
          key={h.horizon_days}
          className={`grid grid-cols-[5.5rem_minmax(0,1fr)_4.5rem] items-center gap-4 border-b ${RULE} py-3`}
        >
          {/* Sentence case: this is a row label in a numeric table, and the
              house rule is no uppercase table headers. */}
          <p className="text-[13px] tabular-nums text-foreground/55">
            {h.horizon_days} days
          </p>
          <MeterBar max={max} value={h.events} />
          <p className="text-right text-[13.5px] font-medium tabular-nums text-foreground/80">
            {count(h.events)}
          </p>
        </div>
      ))}
    </div>
  );
}
