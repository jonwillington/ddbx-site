// Types for shared/broker-comparisons.js. See shared/seo.d.ts for why the
// module is plain ESM with types declared alongside.

import type { BrokerOffer } from "../src/types/ddbx";

export interface BrokerComparison {
  /** "freetrade-vs-trading-212" — derived from the two broker slugs. */
  slug: string;
  /** Broker slug shown first. */
  a: string;
  /** Broker slug shown second. */
  b: string;
  title: string;
  description: string;
  /** Why this pair earned a page. Reviewable justification, not display copy
   *  by default — see the header comment in the .js. */
  whyThisPair: string;
  intro: string;
  /** The authored "which one should you pick" paragraph. The reason the page
   *  exists; everything else on it is assembled from data. */
  verdict: string;
}

export interface FeeCrossover {
  /** Balance in GBP at which the two platform charges are equal. */
  pot: number;
  cheaperBelow: BrokerOffer;
  cheaperAbove: BrokerOffer;
}

export declare const COMPARISONS: BrokerComparison[];
export declare const COMPARISON_SLUGS: string[];
export declare function pairSlug(a: string, b: string): string;
export declare function comparisonPath(slug: string): string;
export declare function comparisonBySlug(slug: string): BrokerComparison | null;
export declare function brokersForComparison(
  comparison: BrokerComparison | null,
  brokers: BrokerOffer[] | null | undefined,
): { a: BrokerOffer; b: BrokerOffer } | null;
export declare function feeCrossover(
  a: BrokerOffer | null | undefined,
  b: BrokerOffer | null | undefined,
): FeeCrossover | null;
