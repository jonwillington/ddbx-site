// Types for shared/filing-family.js. See that file's header for the contract:
// this interface is the ONLY market-dependent surface the filing page may use,
// and a new market-dependent fact gets added here with both implementations at
// once.

import type { CheckContext } from "./methodology";
import type { AnyFiling } from "./filings";

export interface FilingFamily {
  marketId: "uk" | "us";
  /** Public host this market's pages are served from. */
  host: string;
  currency: "GBP" | "USD";
  path: (id: string) => string;
  idFromPath: (path: string) => string | null;
  /** The consideration, from whichever field this market stores it in.
   *  Null when the filing does not state one. */
  value: (d: AnyFiling) => number | null;
  money: (value: number | null | undefined) => string;
  /** Null on a footnote-priced US leg. */
  sharePrice: (d: AnyFiling) => string | null;
  insider: (d: AnyFiling) => { name: string; role: string | null };
  leadSentence: (d: AnyFiling) => string;
  checkContext: (d: AnyFiling) => CheckContext;
  transactionLabel: (d: AnyFiling) => string;
  ogImage: (id: string) => string;
}

/** Anything not explicitly "US" resolves to the UK family. */
export declare function filingFamily(market: string | null | undefined): FilingFamily;
