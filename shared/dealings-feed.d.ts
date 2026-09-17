// Types for shared/dealings-feed.js. See shared/seo.d.ts for why the module is
// plain ESM with its types declared alongside.

import type { Dealing, UsDealing } from "../src/types/ddbx";

export interface DealingsWindowOptions {
  /** `/api` base — API_BASE in the app, the absolute Worker URL in Functions. */
  apiBase: string;
  market: "UK" | "US";
  /** Inclusive ISO YYYY-MM-DD lower bound, on the date `windowOn` names. */
  since: string;
  /** Inclusive upper bound, or null for "up to now". */
  until?: string | null;
  fetchImpl?: typeof fetch;
  /** Cloudflare `cf` request options, when called from a Pages Function. */
  cf?: Record<string, unknown> | null;
  /** Ask for `fields=lite` rows: `analysis` cut to `{ rating }`, US
   *  `footnotes` dropped. Default true — every current caller is a window
   *  aggregate that never reads the prose. */
  lite?: boolean;
  /** US only: `/api/us-dealings` view. Omitted = the curated population
   *  ($50k+, no 10b5-1). `"all"` for anything that claims the whole record. */
  view?: "interesting" | "signal" | "all" | null;
  /** Which date bounds the returned window. Default `"trade"` (the boards).
   *  `"disclosed"` for pages keyed on the day a filing was announced. */
  windowOn?: "trade" | "disclosed";
}

export interface DealingsWindowResult {
  dealings: Array<Dealing | UsDealing>;
  /** False when the page budget ran out before the window was covered —
   *  callers must say so rather than present a partial ranking as a full one. */
  complete: boolean;
}

export declare function fetchDealingsWindow(
  options: DealingsWindowOptions,
): Promise<DealingsWindowResult>;
