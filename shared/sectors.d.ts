// Types for shared/sectors.js. See shared/seo.d.ts for why the module is plain
// ESM with its types declared alongside.

import type { Dealing, SectorNormalized, UsDealing } from "../src/types/ddbx";

export interface Sector {
  /** URL segment, e.g. "consumer-discretionary". */
  slug: string;
  /** The SectorNormalized value the API emits. */
  label: SectorNormalized;
  /** One line on what insider buying in this sector tends to look like. */
  framing: string;
}

export interface SectorRollupRow {
  sector: Sector;
  buys: number;
  /** Total in the market's own currency — GBP on UK rows, USD on US. */
  value: number;
  companies: number;
  people: number;
  /** Ratios (0.012 = +1.2%), or null when nothing is measurable yet. */
  medianAlpha: number | null;
  medianReturn: number | null;
  medianDeal: number | null;
  /** Ticker contributing the most value, and its share of the total (0–1). */
  topCompany: string | null;
  topCompanyShare: number | null;
}

export declare const MIN_BUYS: number;
export declare const CONCENTRATION_THRESHOLD: number;
export declare const SECTORS: Sector[];
export declare const SECTOR_SLUGS: string[];
export declare function sectorBySlug(slug: string): Sector | null;
export declare function sectorByLabel(label: string): Sector | null;
export declare function sectorPath(slug: string): string;
export declare function dealValue(d: Dealing | UsDealing): number;
export declare function dealPerson(d: Dealing | UsDealing): string | null;
export declare function median(values: Array<number | null>): number | null;
export declare function sectorRollup(
  dealings: Array<Dealing | UsDealing> | null | undefined,
): SectorRollupRow[];
export declare function sectorMeetsBar(row: SectorRollupRow | null): boolean;
export declare function windowStart(today: Date | string | number): string;
