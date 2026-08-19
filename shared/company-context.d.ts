// Types for shared/company-context.js. See shared/seo.d.ts for why the module
// is plain ESM with its types declared alongside.

import type { Dealing, UsDealing } from "../src/types/ddbx";
import type { Sector } from "./sectors";

export type ContextMarket = "UK" | "US";
export type ContextDeal = Dealing | UsDealing;

export declare const MAX_PEERS: number;

export interface SectorPeer {
  key: string;
  ticker: string;
  company: string;
  filings: number;
  value: number;
}

export interface SectorStanding {
  sector: Sector;
  /** Issuers in the sector with disclosed buying in the window. */
  companies: number;
  filings: number;
  value: number;
  /** 1-based, or null when this issuer has no filing inside the window. */
  rank: number | null;
  /** The issuers nearest this one in the ranking — see peersAround. */
  peers: SectorPeer[];
}

/** Modal sector across the company's own rows, or null. */
export declare function sectorForDeals(
  deals: ContextDeal[] | null | undefined,
): Sector | null;

/** Null whenever there is nothing honest to say; renderers drop the section. */
export declare function sectorStanding(
  deals: ContextDeal[] | null | undefined,
  windowDeals: ContextDeal[] | null | undefined,
  market: ContextMarket,
  ownKey: string | null | undefined,
): SectorStanding | null;

export declare function standingSentence(
  standing: SectorStanding | null | undefined,
  market: ContextMarket,
): string | null;

export interface Cadence {
  deals: number;
  days: number;
  people: number | null;
}

/** Null for a single filing — "1 purchase over 0 days" is a figure computed
 *  from nothing, which the static-page rules ban outright. */
export declare function cadence(
  summary:
    | {
        deals?: number | null;
        people?: number | null;
        first_trade_date?: string | null;
        last_trade_date?: string | null;
      }
    | null
    | undefined,
): Cadence | null;

export declare function cadenceSentence(
  c: Cadence | null | undefined,
  market: ContextMarket,
): string | null;
