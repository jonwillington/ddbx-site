// Types for shared/insider-index.js. See shared/seo.d.ts for why the module
// is plain ESM with its types declared alongside.

import type { Dealing, UsDealing } from "../src/types/ddbx";

export type IndexMarket = "UK" | "US";
export type IndexRow = Dealing | UsDealing;

export declare const METHOD_VERSION: number;
/** "v1". */
export declare const METHOD_LABEL: string;
export declare const WINDOW_DAYS: number;
export declare const MIN_HISTORY: number;
export declare const LOOKBACK: number;
export declare const VALUE_CAP: Record<IndexMarket, number>;
export declare const INDEX_MARKETS: IndexMarket[];
/** fetchDealingsWindow options for the index's rows. */
export declare function indexWindow(
  now?: Date,
  market?: IndexMarket,
): { market: IndexMarket; since: string; windowOn: "disclosed" };
export declare const INDEX_PATH: string;
export declare const FEED_GAP_LIMIT: number;
/** London hour on the day after a session at which its reading publishes. */
export declare const PUBLISH_HOUR: number;
export declare const INDEX_METHODOLOGY: string[];

export interface Tier {
  id: "very-quiet" | "quiet" | "normal" | "busy" | "very-busy";
  /** Lowest score in the tier. */
  min: number;
  /** "Very quiet". */
  label: string;
  /** Completes "Insider buying is …". */
  phrase: string;
}

export declare const TIERS: Tier[];
export declare function tierFor(score: number | null | undefined): Tier | null;

export declare function isIndexDay(
  iso: string | null | undefined,
  market?: IndexMarket,
): boolean;
export declare function todayLondon(now?: Date): string;
export declare function dateLabel(iso: string): string;
export declare function shortDateLabel(iso: string): string;
export declare function dayMonthLabel(iso: string): string;
/** "7am on 18 September": when the reading for `date` publishes. */
export declare function publishLabel(date: string): string;

/** The latest session whose reading has published at `now`. */
export declare function publishedThrough(
  now?: Date,
  market?: IndexMarket,
): string;
export declare function publishesAt(date: string): {
  date: string;
  hour: number;
};
export declare function nextPublication(
  now?: Date,
  market?: IndexMarket,
): { session: string; date: string; hour: number } | null;

export declare function indexPath(date?: string | null): string;
export declare function isIndexSlug(slug: string): boolean;
export declare function indexDateFromPath(path: string): string | null;

export declare function isIndexPurchase(
  d: IndexRow | null | undefined,
  market: IndexMarket,
): boolean;

export interface DailyTotal {
  date: string;
  count: number;
  value: number;
  issuers: Set<string>;
}

export declare function dailyTotals(
  dealings: IndexRow[] | null | undefined,
  market: IndexMarket,
): Map<string, DailyTotal>;

export declare function percentileRank(
  x: number,
  pool: number[],
): number | null;

export declare function combinedMeasures(
  counts: number[],
  breadths: number[],
  values: number[],
): Array<number | null>;

export interface Reading {
  /** ISO trading day the reading is for. */
  date: string;
  /** First trading day of the window. */
  windowStart: string;
  count: number;
  breadth: number;
  /** Capped value, market currency. */
  value: number;
  countPct: number | null;
  breadthPct: number | null;
  valuePct: number | null;
  /** Mean of the three component ranks inside the pool. Not the index. */
  combined: number | null;
  /** The index unrounded: share of other days in the pool with a lower
   *  combined measure, ties half. */
  pct: number | null;
  /** 0 to 100, or null before MIN_HISTORY readings exist. */
  score: number | null;
  tier: Tier | null;
  /** Earlier readings this one was ranked against. */
  history: number;
}

export interface SeriesOptions {
  /** ISO. Defaults to the last published session; never later than it. */
  to?: string;
  /** ISO. Defaults to the first disclosure on or after the tracking floor. */
  from?: string;
  /** Clock override, for tests. */
  now?: Date;
}

export declare function series(
  dealings: IndexRow[] | null | undefined,
  market?: IndexMarket,
  opts?: SeriesOptions,
): Reading[];

export declare function readingForDate(
  dealings: IndexRow[] | null | undefined,
  date: string,
  market?: IndexMarket,
  opts?: SeriesOptions,
): Reading | null;

export interface Comparison {
  direction: "high" | "low";
  /** The last date as extreme, or null when none in the published record. */
  since: string | null;
  /** First published reading. */
  began: string | null;
  gap: number;
}

export interface ReadingSummary {
  date: string;
  market: IndexMarket;
  score: number;
  tier: Tier;
  sentence: string | null;
  windowSentence: string;
  comparison: Comparison | null;
  weekChange: number | null;
  count: number;
  breadth: number;
  value: number;
  windowStart: string;
  path: string;
  /** METHOD_LABEL at the time of computing, "v1". */
  method: string;
}

export declare function readingSummary(
  dealings: IndexRow[] | null | undefined,
  date: string,
  market?: IndexMarket,
  opts?: SeriesOptions,
): ReadingSummary | null;

export declare function lastDisclosed(
  dealings: IndexRow[] | null | undefined,
  market?: IndexMarket,
): string | null;
export declare function feedGap(
  dealings: IndexRow[] | null | undefined,
  to: string,
  market?: IndexMarket,
): number;

export declare function readingMeetsBar(r: Reading | null | undefined): boolean;
export declare function publishable(
  all: Reading[] | null | undefined,
): Reading[];
export declare function latestReading(
  all: Reading[] | null | undefined,
): Reading | null;
export declare function publishFrom(
  all: Reading[] | null | undefined,
  market?: IndexMarket,
): string | null;

export declare function sinceComparison(
  all: Reading[] | null | undefined,
  index: number,
): Comparison | null;
export declare function weekChange(
  all: Reading[] | null | undefined,
  index: number,
): number | null;
export declare function readingSentence(
  all: Reading[] | null | undefined,
  index: number,
  market?: IndexMarket,
): string | null;
export declare function windowSentence(
  r: Reading | null | undefined,
  market?: IndexMarket,
): string;
export declare function indexLeadSentence(
  all: Reading[] | null | undefined,
  market?: IndexMarket,
): string;
export declare function dateLeadSentence(
  all: Reading[] | null | undefined,
  index: number,
  market?: IndexMarket,
): string | null;
