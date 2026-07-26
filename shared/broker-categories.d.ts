// Types for shared/broker-categories.js. Same arrangement as shared/seo.d.ts:
// the module itself is plain ESM so Pages Functions can import it, and the TS
// side stays checked through this declaration file.

import type { BrokerBadge, BrokerOffer } from "../src/types/ddbx";

export type ColumnId =
  | "platformFee"
  | "ukDealing"
  | "usDealing"
  | "fx"
  | "isa"
  | "sipp"
  | "lisa"
  | "funds"
  | "investmentTrusts"
  | "fractional"
  | "usShares";

export interface BrokerCategory {
  /** URL segment, e.g. "isa" for /brokers/best-for/isa. */
  slug: string;
  /** The badge that decides which brokers are eligible for this page. */
  badge: BrokerBadge;
  h1: string;
  /** Fed to shared/seo.js, so it reaches the tab, the OG card and the SERP. */
  title: string;
  description: string;
  /** Opening prose, one string per paragraph. */
  intro: string[];
  whatToLookFor: string[];
  /** Which comparison columns matter for this category, in display order. */
  columns: ColumnId[];
  /** Editorial ranking by broker slug. Eligibility comes from the badge; this
   *  only decides sequence. */
  order: string[];
  /** Broker slug -> one-line "who should pick this". Deliberately carries no
   *  figures — see the header comment in the .js. */
  picks: Record<string, string>;
}

export declare const MIN_BROKERS: number;
export declare const COLUMNS: Record<ColumnId, string>;
export declare const CATEGORIES: BrokerCategory[];
export declare const CATEGORY_SLUGS: string[];
export declare function categoryBySlug(slug: string): BrokerCategory | null;
export declare function categoryPath(slug: string): string;
export declare function brokersForCategory(
  category: BrokerCategory | null,
  brokers: BrokerOffer[] | null | undefined,
): BrokerOffer[];
export declare function categoryMeetsBar(
  category: BrokerCategory | null,
  brokers: BrokerOffer[] | null | undefined,
): boolean;
