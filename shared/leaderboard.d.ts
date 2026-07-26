// Types for shared/leaderboard.js. See shared/seo.d.ts for why the module is
// plain ESM with its types declared alongside.

import type { Dealing, UsDealing } from "../src/types/ddbx";

export type LeaderboardMarket = "UK" | "US";
export type Buy = Dealing | UsDealing;

export declare const TOP_N: number;
export declare const MAX_PER_COMPANY: number;
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
export declare function archiveYears(
  earliest: string | null | undefined,
  today: Date | string | number,
): number[];
