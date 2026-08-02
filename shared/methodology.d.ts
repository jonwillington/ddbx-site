// Types for shared/methodology.js. See shared/seo.d.ts for why the module is
// plain ESM with its types declared alongside.

import type { RatingChecklist } from "../src/types/ddbx";

/** Pre-formatted strings a `passLine` interpolates. Every value has already
 *  been through the caller's price/value formatter — this module does no
 *  number formatting, because the market that owns the filing owns its
 *  currency. */
export interface CheckContext {
  name: string;
  /** "Chief Executive", "CFO" — omitted when the filing doesn't name one. */
  role?: string;
  company: string;
  /** Per-share entry price. Null when the filing is unpriced. */
  price: string | null;
  /** Total value of the purchase. */
  value: string;
}

export interface MethodologyCheck {
  key: keyof RatingChecklist;
  label: string;
  question: string;
  body: string;
  detail: string;
  passLine: (c: CheckContext) => string;
}

export declare const CHECKS: MethodologyCheck[];
export declare const CHECK_COUNT: number;
export declare const CHECK_COUNT_WORD: string;
