// Types for shared/cap-bands.js. See shared/seo.d.ts for why the module is
// plain ESM with its types declared alongside.

export type BandMarket = "UK" | "US";

/** A row of /api/companies. `market_cap` and `stats_currency` were added on
 *  2026-08-19; both are nullable. Read the module header before touching the
 *  currency — "GBp" means the PRICE is in pence, the cap is already pounds. */
export interface IndexedCompany {
  key: string;
  company: string;
  deals: number;
  last_trade_date: string | null;
  analysed: number;
  total_value: number | null;
  sector_normalized?: string | null;
  market_cap?: number | null;
  stats_currency?: string | null;
}

export interface Band {
  slug: string;
  label: string;
  plural: string;
  /** Inclusive floor per market, in the market's own currency. */
  min: Record<BandMarket, number>;
  /** Exclusive ceiling, or null for the top band. */
  max: Record<BandMarket, number | null>;
  blurb: string;
}

export interface BandRow {
  band: Band;
  companies: IndexedCompany[];
  count: number;
  deals: number;
  value: number;
}

export interface BandRollup {
  bands: BandRow[];
  total: number;
  /** Issuers with no market value on file. */
  noCap: number;
  /** Issuers reporting in a currency other than the market's own. */
  foreignCurrency: number;
}

export declare const BANDS: Band[];
export declare const BAND_SLUGS: string[];
export declare const MIN_COMPANIES: number;
export declare const TOP_COMPANIES: number;
export declare const METHODOLOGY: string[];

export declare function bandBySlug(
  slug: string | null | undefined,
): Band | null;
export declare function bandPath(slug?: string | null): string;
/** Null for a missing cap and for a cap in another currency — both are "we
 *  don't know", not "small". */
export declare function bandFor(
  company: IndexedCompany | null | undefined,
  market: BandMarket,
): Band | null;
export declare function bandRollup(
  companies: IndexedCompany[] | null | undefined,
  market: BandMarket,
): BandRollup;
export declare function bandMeetsBar(row: BandRow | null | undefined): boolean;
export declare function thresholdSentence(
  band: Band,
  market: BandMarket,
): string;
/** Null when the rollup set nothing aside. */
export declare function exclusionSentence(
  rollup: BandRollup,
  market: BandMarket,
): string | null;
