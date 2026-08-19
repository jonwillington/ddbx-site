// Types for shared/boards.js. See shared/seo.d.ts for why the module is plain
// ESM with its types declared alongside.

import type { Dealing, UsDealing } from "../src/types/ddbx";

export type BoardMarket = "UK" | "US";
export type Buy = Dealing | UsDealing;

export declare const TOP_N: number;
export declare const MIN_BOARD_VALUE: number;
export declare const MIN_COMPANY_FILINGS: number;
export declare const CLUSTER_TIERS: { strong: number; soft: number };

export declare const PERFORMANCE_METHODOLOGY: string[];
export declare const ACTIVITY_METHODOLOGY: string[];
export declare const CLUSTER_METHODOLOGY: string[];

/** False only for a US filer whose sole role is `ten_percent_owner`. */
export declare function isInsiderFiler(
  d: Buy | null | undefined,
  market: BoardMarket,
): boolean;

/** Mirrors the pipeline's own co-buyer predicate — £10k UK, $25k direct and
 *  non-10b5-1 US. See the module comment before changing either number. */
export declare function countsTowardCluster(
  d: Buy | null | undefined,
  market: BoardMarket,
): boolean;

export declare function rankByAlpha(
  dealings: Buy[] | null | undefined,
  market: BoardMarket,
  limit?: number,
): { rows: Buy[]; suppressed: Map<string, number>; considered: number };

export interface CompanyActivity {
  ticker: string;
  company: string;
  filings: number;
  value: number;
  /** Distinct people, not filings — the two answer different questions. */
  insiders: number;
  medianAlpha: number | null;
  alphaCount: number;
  firstDate: string | null;
  lastDate: string | null;
  peakCluster: number;
}

export declare function companyRollup(
  dealings: Buy[] | null | undefined,
  market: BoardMarket,
): CompanyActivity[];

export declare function rankCompanies(
  dealings: Buy[] | null | undefined,
  market: BoardMarket,
  limit?: number,
): { rows: CompanyActivity[]; qualifying: number };

export interface ClusterEpisode {
  ticker: string;
  company: string;
  tier: string;
  windowDays: number;
  /** The pipeline's count at the peak row. A cross-check, not the headline. */
  count: number;
  /** Insiders named by the filings shown. THIS is what the page states. */
  named: number;
  filings: number;
  value: number;
  medianAlpha: number | null;
  alphaCount: number;
  firstDate: string | null;
  lastDate: string | null;
  /** Days first to last filing. Can exceed 14 — the window is ±14. */
  spanDays: number;
  rows: Buy[];
}

export declare function clusterEpisodes(
  dealings: Buy[] | null | undefined,
  market: BoardMarket,
): ClusterEpisode[];

export declare function rankClusters(
  dealings: Buy[] | null | undefined,
  market: BoardMarket,
  limit?: number,
): {
  rows: ClusterEpisode[];
  qualifying: number;
  /** Soft-tier episodes excluded. */
  soft: number;
  /** Strong episodes whose other filings sit outside the fetched window. */
  partial: number;
};

export declare function median(
  values: Array<number | null | undefined> | null | undefined,
): number | null;

export declare function summarise(rows: Buy[] | null | undefined): {
  filings: number;
  value: number;
  companies: number;
  medianAlpha: number | null;
  alphaCount: number;
};
