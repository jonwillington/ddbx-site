// Types for shared/congress-stocks.js. See shared/seo.d.ts for why the module
// is plain ESM with its types declared alongside.

import type {
  GovChamber,
  GovDealing,
  SectorNormalized,
} from "../src/types/ddbx";

export declare const MIN_STOCK_MEMBERS: number;
export declare const MIN_STOCK_ROWS: number;
export declare const STOCK_ROWS: number;
export declare const ROLL_CALL_ROWS: number;
export declare const STOCK_FETCH_LIMIT: number;
export declare const STOCKS_INDEX_PATH: string;
export declare const STOCKS_API_PATH: string;
export declare const PURCHASES_ONLY_NOTE: string;

/* ─── Consumed wire shape: GET /api/gov-stocks ───────────────────────────────
 *
 * Declared HERE rather than imported from src/types/ddbx.ts because the
 * canonical types (ddbx-data worker/db/types.ts: GovStockLane, GovStockBuyer,
 * GovStockSummary, GovStocksResponse) land with the ddbx-data branch
 * feat/congress-stock-roster, and `check:types` diffs against the sibling
 * checkout. Once that merges: `npm run sync:types`, then replace these four
 * with imports from ../src/types/ddbx. */

export type GovStockLane = "in" | "out" | "unmodelled" | "unclassified";

export interface GovStockBuyer {
  id: string;
  purchases: number;
  lane: GovStockLane;
  via: string | null;
}

export interface GovStockSummary {
  ticker: string;
  company: string;
  sector_normalized: SectorNormalized | null;
  members: number;
  purchases: number;
  filings: number;
  in_lane_members: number;
  first_disclosed: string;
  last_disclosed: string;
  is_fund: boolean;
  buyers: GovStockBuyer[];
}

export interface GovStocksResponse {
  as_of: string | null;
  corpus: { members: number; purchases: number; tickers: number };
  stocks: GovStockSummary[];
}

/** A roster read into one of three states; see readStocks. */
export type StocksRead =
  | { state: "failed" }
  | { state: "empty"; roster: GovStocksResponse }
  | {
      state: "ok";
      roster: GovStocksResponse;
      published: GovStockSummary[];
    };

/** One member's lane for the issuer: the server's four values, plus
 *  "pending" for a purchase newer than the roster read (rule 2). */
export type StockLane = GovStockLane | "pending";

export interface StockMember {
  id: string;
  name: string;
  chamber: GovChamber;
  party?: "D" | "R" | "I";
  state?: string;
  district?: number;
  photo_url?: string;
  /** Full committees only. */
  committees: string[];
  rows: number;
  filings: number;
  total_min: number;
  total_max: number;
  self: number;
  first: string;
  last: string;
  /** Disclosed dates of every purchase, for the roll-call timeline. */
  dates: string[];
  lane: StockLane;
  /** The committee the server says the member is in lane through. */
  via: string[];
}

export interface BandTier {
  min: number;
  max: number;
  count: number;
}

export interface StockRollup {
  ticker: string;
  company: string;
  sector: SectorNormalized | null;
  rows: number;
  filings: number;
  members: StockMember[];
  house: number;
  senate: number;
  total_min: number;
  total_max: number;
  first_disclosed: string;
  last_disclosed: string;
  latest: GovDealing;
  self_count: number;
  late_filings: number;
  option_rows: number;
  clustered: number;
  lag: { median: number | null; n: number };
  lane: {
    classified: boolean;
    in: number;
    out: number;
    unmodelled: number;
    pending: number;
    committees: { committee: string; members: StockMember[] }[];
  };
  bands: BandTier[];
  truncated: boolean;
}

export declare function stockMeetsBar(
  entry: { members: number; purchases: number } | null,
): boolean;
export declare function stockPublished(entry: GovStockSummary | null): boolean;
export declare function stockSlug(ticker: string): string;
export declare function tickerFromSlug(slug: string): string | null;
export declare function stockPath(ticker: string): string;
export declare function cleanIssuer(name: string): string;
export declare function fullCommittees(committees?: string[]): string[];
export declare function median(values: number[]): number | null;
export declare function stockRollup(
  ticker: string,
  rows: GovDealing[],
  entry: GovStockSummary | null,
): StockRollup | null;
export declare function bandLadder(rows: GovDealing[]): BandTier[];
export declare function monthYear(iso: string): string;
export declare function longDate(iso: string): string;
export declare function stockLeadSentence(s: StockRollup): string;
export declare function laneSentence(s: StockRollup): string;
export declare function shortCommitteeName(committee: string): string;
export declare function memberLaneLine(m: StockMember): string;
export declare function concentrationSentence(s: StockRollup): string | null;
export declare function stockVerdict(s: StockRollup): string;
export declare function belowBarSentence(s: StockRollup): string;
export declare function optionsNote(s: StockRollup): string | null;
export declare function truncatedNote(s: StockRollup): string | null;
export declare function clusterNote(s: StockRollup): string | null;
export declare function readStocks(body: unknown): StocksRead;
export declare function publishedStocks(
  stocks: GovStockSummary[],
): GovStockSummary[];
export declare function stockEntry(
  stocks: GovStockSummary[],
  ticker: string,
): GovStockSummary | null;
export declare function fundCount(stocks: GovStockSummary[]): number;
export declare function relatedTickers(
  stocks: GovStockSummary[],
  ticker: string,
  n?: number,
): (GovStockSummary & { shared: number })[];
export declare function stocksIndexLead(roster: GovStocksResponse): string;
