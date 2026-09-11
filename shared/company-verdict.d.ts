// Types for shared/company-verdict.js. See shared/seo.d.ts for why the module
// is plain ESM with its types declared alongside.

import type { Dealing, UsDealing } from "../src/types/ddbx";

export declare const INDEX_LABEL: Record<"UK" | "US", string>;

export interface BuysOutcome {
  /** Every purchase passed in. */
  count: number;
  /** Purchases with a price mark — the ones the money figures cover. */
  measured: number;
  paid: number;
  /** `paid` at the latest close, if never sold. */
  worth: number;
  /** Purchases with an alpha; the denominator for `ahead`. */
  compared: number;
  ahead: number;
  /** The single alpha, as a ratio, when `compared` is 1. */
  alpha: number | null;
}

export declare function buysOutcome(
  deals: Array<Dealing | UsDealing> | null | undefined,
): BuysOutcome | null;

export declare function shortMoney(value: number, symbol: string): string;

export declare function outcomeSentence(
  outcome: BuysOutcome | null,
  market: "UK" | "US",
  symbol: string,
): string | null;
