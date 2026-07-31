/** The volume figures on /how-it-works, and the rules for stating them.
 *
 *  The methodology page describes six checks, four ratings and a fifteen-minute
 *  cadence, and for its first life it did that without naming a single
 *  quantity. That is the one thing a reader deciding whether to trust a method
 *  actually wants: a process described over four hundred filings and the same
 *  process described over four hundred thousand are not the same claim.
 *
 *  Two ways to put numbers on a page, and only one of them survives contact
 *  with a year of neglect:
 *
 *    1. Type them into the JSX. Wrong within a week (the UK feed moved by one
 *       row between two queries while this was being written), and wrong
 *       silently, because nothing fails when a paragraph goes stale.
 *
 *    2. Count them at request time and render what came back.
 *
 *  So the page reads `GET /api/coverage`, which is COUNT() over the real
 *  tables behind a six-hour edge cache. `SNAPSHOT` below exists only so the
 *  first paint, the crawler pre-render and any API outage still show real
 *  figures rather than a row of dashes: it is a measurement, dated, not a
 *  fallback invented to look plausible.
 *
 *  ---------------------------------------------------------------------------
 *  What these numbers are not
 *  ---------------------------------------------------------------------------
 *
 *  `disclosures` is rows, not trades, and the feeds are not like-for-like: a
 *  US, Swedish or Dutch row is one transaction line of a filing that may hold
 *  several, and a congressional row is an amount band. Summing them and calling
 *  the result "trades we've analysed" would be the exact overstatement this
 *  module exists to prevent, so the total is labelled disclosure records
 *  everywhere it appears and the per-feed split is always shown next to it.
 *
 *  `open_market_buys` is a floor, not the other half of a partition. The flag
 *  is set by a classifier that runs after ingest, so an unreached row counts
 *  the same as a rejected one: the UK feed reports 862 records against 796
 *  confirmed buys, and the 66 are "not confirmed on-market" rather than
 *  "confirmed not a buy". Copy must not render that gap as rejections.
 *
 *  The same discipline applies to the date window: NL reaches back to 2006
 *  because of a one-off historical load, not because anything was watched in
 *  2006. That is why the column says "records from" and never "tracking since".
 */
import type { CoverageMarketId, CoverageResponse } from "@/types/ddbx";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";

/** Counted from production D1 on 2026-07-31. Refresh by curling the endpoint
 *  this file's hook already calls:
 *
 *      curl -s https://api.ddbx.uk/api/coverage | python3 -m json.tool
 *
 *  It is deliberately a real reading rather than round numbers. Nothing here
 *  is load-bearing once the fetch lands, and every figure it holds was true at
 *  the date above, so a stale snapshot understates rather than inflates: the
 *  corpus only grows. */
export const SNAPSHOT: CoverageResponse = {
  generated_at: "2026-07-31T09:52:55.812Z",
  markets: [
    {
      market: "UK",
      disclosures: 862,
      open_market_buys: 796,
      insiders: 670,
      issuers: 435,
      first_disclosed: "2026-03-09",
      last_disclosed: "2026-07-31",
    },
    {
      market: "US",
      disclosures: 1883,
      open_market_buys: 1159,
      insiders: 865,
      issuers: 587,
      first_disclosed: "2026-05-13",
      last_disclosed: "2026-07-30",
    },
    {
      market: "NL",
      disclosures: 11908,
      open_market_buys: 6142,
      insiders: 1004,
      issuers: 115,
      first_disclosed: "2006-03-24T00:00:00Z",
      last_disclosed: "2026-07-30T00:00:00Z",
    },
    {
      market: "SE",
      disclosures: 3676,
      open_market_buys: 2258,
      insiders: 1415,
      issuers: 506,
      first_disclosed: "2026-05-10T01:07:52Z",
      last_disclosed: "2026-07-31T10:16:55Z",
    },
    {
      market: "USG",
      disclosures: 4823,
      open_market_buys: 4793,
      insiders: 75,
      issuers: 1053,
      first_disclosed: "2023-04-10",
      last_disclosed: "2026-07-21",
    },
  ],
  totals: {
    disclosures: 23152,
    triage_decisions: 9059,
    triage_llm: 4236,
    analyses: 917,
    insiders: 4029,
    issuers: 2696,
    pipeline_runs: 11101,
  },
  prices: {
    observations: 1545584,
    tickers: 1786,
    first_date: "2016-06-27",
    last_date: "2026-07-31",
  },
  outcomes: {
    rows: 3437,
    events: 1428,
    horizons: [
      { horizon_days: 30, events: 1428 },
      { horizon_days: 90, events: 316 },
      { horizon_days: 180, events: 9 },
      { horizon_days: 365, events: 6 },
    ],
  },
  research: {
    filings: 417207,
    transactions: 797774,
    insiders: 33064,
    issuers: 7668,
    price_bars: 6858395,
    price_tickers: 6760,
    outcomes: 1887619,
    first_filing: "2019-01-02",
    last_filing: "2026-03-31",
  },
};

/** Where the rendered figures came from.
 *
 *  Three states, not two. The version of this hook that tracked a boolean
 *  `live` asserted "the count did not come back" on every first paint, before
 *  the request had resolved: a page calling its own numbers stale while the
 *  fetch was still in flight. "Pending" is a real state and has to be one
 *  here, because the copy differs in all three cases. */
export type CoverageSource = "pending" | "fetched" | "snapshot";

/** The snapshot, then the live counts when they arrive.
 *
 *  A failed fetch is not an error state: it leaves a dated measurement on
 *  screen, which is a perfectly honest thing for a methodology page to show,
 *  so there is never a spinner and never an empty figure. */
export function useCoverage(): {
  data: CoverageResponse;
  source: CoverageSource;
} {
  const [data, setData] = useState<CoverageResponse>(SNAPSHOT);
  const [source, setSource] = useState<CoverageSource>("pending");

  useEffect(() => {
    let cancelled = false;

    api
      .coverage()
      .then((next) => {
        if (cancelled) return;
        setData(next);
        setSource("fetched");
      })
      .catch(() => {
        // Deliberately quiet. The snapshot is already rendered and is true as
        // of its own date; the only thing that changes is what the note says.
        if (!cancelled) setSource("snapshot");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, source };
}

/** Thousands-separated, always. `1,545,584` reads as a quantity; `1545584`
 *  reads as an id, and `1.5M` throws away the precision that makes a counted
 *  figure more convincing than a rounded one. */
export const count = (n: number) => n.toLocaleString("en-GB");

/** The one place rounding is right: prose, where an exact seven-digit figure
 *  stops the sentence dead. Used for the research panel only.
 *
 *  Decides against the million BEFORE falling through to thousands: 999,600
 *  used to take the thousands branch and render the malformed "1000,000". */
export function approx(n: number): string {
  const millions = n / 1_000_000;

  if (millions >= 0.95) {
    const m =
      millions >= 10 ? Math.round(millions) : Number(millions.toFixed(1));

    return `${m} million`;
  }
  if (n >= 1_000) return count(Math.round(n / 1_000) * 1_000);

  return count(n);
}

/** "Mar 2026". Month precision on purpose: a day would imply the feed started
 *  on a particular morning, and for a backfilled market it did not.
 *
 *  Read off the ISO string rather than through a Date. `new Date("2026-03-01")`
 *  parses as UTC midnight and `toLocaleDateString` then renders it in the
 *  viewer's own zone, so every first-of-the-month showed as the month before
 *  for anyone west of UTC: a reader in New York was told we had been reading a
 *  feed a month longer than we had. */
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function monthLabel(iso: string | null): string {
  const m = /^(\d{4})-(\d{2})/.exec(iso ?? "");

  if (!m) return "—";

  return MONTHS[Number(m[2]) - 1] ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : "—";
}

/** Display metadata per feed.
 *
 *  `name` and `source` are deliberately word-identical to COVERAGE in
 *  src/components/api/market-grid.tsx, which publishes the same five feeds on
 *  /developers. Two public pages describing one dataset in two vocabularies is
 *  the exact micro-inconsistency that makes a site read as generated, and it
 *  had already happened once here (an "LSE regulatory announcements" against
 *  the developer page's "RNS · PDMR notifications"). If these strings change,
 *  they change in both files.
 *
 *  `note` is this page's own: /developers describes capability, and this page
 *  has to describe the caveat that comes with the number beside it. */
export const FEEDS: Record<
  CoverageMarketId,
  { name: string; source: string; filer: string; note?: string }
> = {
  UK: {
    name: "United Kingdom",
    source: "RNS · PDMR notifications",
    filer: "Directors and PDMRs",
  },
  US: {
    name: "United States",
    source: "SEC EDGAR · Form 4",
    filer: "Officers, directors, 10% holders",
  },
  NL: {
    name: "Netherlands",
    source: "AFM · MAR Article 19 register",
    filer: "PDMRs",
    note: "Seeded with the register’s own back history, so these records reach far further back than the live watch does.",
  },
  SE: {
    name: "Sweden",
    source: "Finansinspektionen · Insynsregister",
    filer: "PDMRs",
  },
  USG: {
    name: "US Congress",
    source: "STOCK Act · House and Senate PTRs",
    filer: "Members of Congress",
    note: "Amount bands rather than exact values, and sorted by fixed rules rather than by a model.",
  },
};

/** Feed order on the page: the two markets with an app, then the rest. */
export const FEED_ORDER: CoverageMarketId[] = ["UK", "US", "SE", "NL", "USG"];
