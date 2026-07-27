// Types for shared/leaderboard.js. See shared/seo.d.ts for why the module is
// plain ESM with its types declared alongside.

import type { Dealing, UsDealing } from "../src/types/ddbx";

export type LeaderboardMarket = "UK" | "US";
export type Buy = Dealing | UsDealing;

export declare const TOP_N: number;
export declare const MAX_PER_COMPANY: number;
/** First calendar year with stored filings. Mirrors TRACKING_SINCE_YEAR in
 *  src/components/seo/tracking-notice.tsx — move them together. */
export declare const BOARD_EARLIEST_YEAR: number;
/** Reader-facing statement of the ranking rules, rendered on every board. */
export declare const METHODOLOGY: string[];

export declare function isEligibleBuy(
  d: Buy | null | undefined,
  market: LeaderboardMarket,
): boolean;
export declare function buyValue(d: Buy | null | undefined): number;
export declare function buyPerson(d: Buy | null | undefined): string | null;
/** Ratio (0.012 = +1.2%), or null when unmeasured. */
export declare function buyAlpha(d: Buy | null | undefined): number | null;
export declare function buyReturn(d: Buy | null | undefined): number | null;

export declare function rankBuys(
  dealings: Buy[] | null | undefined,
  market: LeaderboardMarket,
  limit?: number,
): { rows: Buy[]; suppressed: Map<string, number> };

export declare function yearBounds(
  year: string | number | null | undefined,
): { since: string; until: string } | null;
export declare function leaderboardPath(year?: string | number | null): string;
/** `earliest` is anything whose first four characters are the year — a date
 *  string ("2026-01-01") or the year itself (BOARD_EARLIEST_YEAR). The current
 *  year is omitted until February: on 1 January its board is empty and the
 *  pre-render noindexes it, so neither the archive cards nor the sitemap should
 *  be advertising it yet. */
export declare function archiveYears(
  earliest: string | number | null | undefined,
  today: Date | string | number,
): number[];
