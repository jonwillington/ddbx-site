// Types for shared/congress-stocks.js. See shared/seo.d.ts for why the module
// is plain ESM with its types declared alongside.

import type { GovChamber, GovDealing, SectorNormalized } from "../src/types/ddbx";

export declare const MIN_STOCK_MEMBERS: number;
export declare const MIN_STOCK_ROWS: number;
export declare const ROSTER_MIN_MEMBERS: number;
export declare const STOCK_ROWS: number;
export declare const ROLL_CALL_ROWS: number;
export declare const STOCK_FETCH_LIMIT: number;
export declare const STOCKS_INDEX_PATH: string;
export declare const PURCHASES_ONLY_NOTE: string;

/** One member's relationship to the issuer's sector. Four values, not a
 *  boolean: the last three are different sentences (rule 2). */
export type StockLane = "in" | "out" | "unmodelled" | "nosector";

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
  /** The mapped committees through which the member is in lane. */
  via: string[];
}

export interface BandTier {
  min: number;
  max: number;
  count: number;
}

export interface StockOutcome {
  measured: number;
  median_return_pct: number | null;
  compared: number;
  ahead: number;
  as_of: string | null;
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
    sectorKnown: boolean;
    in: number;
    out: number;
    unmodelled: number;
    committees: { committee: string; members: StockMember[] }[];
  };
  bands: BandTier[];
  outcome: StockOutcome | null;
  truncated: boolean;
}

/** One roster entry, as scripts/congress-stocks-roster.mjs writes it. */
export interface RosterEntry {
  t: string;
  c: string;
  s: SectorNormalized | null;
  m: number;
  r: number;
  l: number;
  last: string | null;
  ids?: string[];
}

export declare function stockMeetsBar(
  s: StockRollup | { members: number; rows: number } | null,
): boolean;
export declare function stockSlug(ticker: string): string;
export declare function tickerFromSlug(slug: string): string | null;
export declare function stockPath(ticker: string): string;
export declare function cleanIssuer(name: string): string;
export declare function fullCommittees(committees?: string[]): string[];
export declare function median(values: number[]): number | null;
export declare function memberLane(
  committees: string[] | undefined,
  sector: SectorNormalized | null,
  lanes: Map<string, SectorNormalized[]>,
): { lane: StockLane; via: string[] };
export declare function stockRollup(
  ticker: string,
  rows: GovDealing[],
  lanes: Map<string, SectorNormalized[]>,
): StockRollup | null;
export declare function bandLadder(rows: GovDealing[]): BandTier[];
export declare function monthYear(iso: string): string;
export declare function longDate(iso: string): string;
export declare function stockLeadSentence(s: StockRollup): string;
export declare function laneSentence(s: StockRollup): string;
export declare function shortCommitteeName(committee: string): string;
export declare function memberLaneLine(
  m: StockMember,
  sector: SectorNormalized | null,
): string;
export declare function concentrationSentence(s: StockRollup): string | null;
export declare function outcomeSentence(s: StockRollup): string | null;
export declare function stockVerdict(s: StockRollup): string;
export declare function belowBarSentence(s: StockRollup): string;
export declare function optionsNote(s: StockRollup): string | null;
export declare function truncatedNote(s: StockRollup): string | null;
export declare function clusterNote(s: StockRollup): string | null;
export declare function publishedRoster(roster: RosterEntry[]): RosterEntry[];
export declare function rosterEntry(
  roster: RosterEntry[],
  ticker: string,
): RosterEntry | null;
export declare function relatedTickers(
  roster: RosterEntry[],
  ticker: string,
  n?: number,
): RosterEntry[];
export declare function stocksIndexLead(
  roster: RosterEntry[],
  corpus: { members: number; rows: number; tickers: number },
): string;
