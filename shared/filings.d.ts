// Types for shared/filings.js. See shared/seo.d.ts for why the module is plain
// ESM with its types declared alongside.

import type { Dealing, UsDealing } from "../src/types/ddbx";
import type { CheckContext } from "./methodology";

/** A filing from either market.
 *
 *  Used by the helpers in this file that are genuinely market-blind: they read
 *  only `analysis`, `cluster`, `buy_style`, `live_performance`, `shares` and
 *  the two dates, and those are one wire contract across UK and US by design
 *  (ddbx-data worker/db/types.ts says so explicitly of `UsDealing.analysis`).
 *
 *  The market-DEPENDENT helpers below — `sharePrice`, `checkContext`,
 *  `filingLeadSentence` — deliberately keep their `Dealing` signature. They are
 *  the UK family; the US counterparts live in shared/filings-us.js and the two
 *  are chosen between in shared/filing-family.js. Widening these to accept a
 *  `UsDealing` would let a US row reach a formatter that reads `value_gbp`,
 *  which is the failure the split exists to make impossible. */
export type AnyFiling = Dealing | UsDealing;

export declare const FILING_NOTICE: string;
export interface AnalysisShape {
  thesis: number;
  for: number;
  against: number;
  risks: number;
  window: string | null;
  confidence: number | null;
  sources: number;
}

export declare function checkContext(d: Dealing): CheckContext;
export declare function analysisShape(d: AnyFiling): AnalysisShape | null;

export declare function filingMeetsBar(d: AnyFiling | null | undefined): boolean;
export declare function filingPath(id: string): string;
export declare function filingIdFromPath(path: string): string | null;

export declare function money(value: number, currency?: string): string;
export declare function sharePrice(d: Dealing): string;
export declare function shares(n: number): string;
export declare function disclosureLagDays(d: AnyFiling): number | null;
export declare function signedPct(
  pct: number | null | undefined,
): string | null;

export declare function filingLeadSentence(d: Dealing): string;
export declare function outcomeSentence(d: AnyFiling): string | null;
export declare function clusterSentence(d: AnyFiling): string | null;
export declare function styleSentence(d: AnyFiling): string | null;
export interface EvidenceHeadline {
  direction: "for" | "against";
  headline: string;
  /** Citation text, or null on a point with no retrieved source. */
  label: string | null;
  url: string | null;
}

export declare function evidenceHeadlines(d: AnyFiling): EvidenceHeadline[];

export declare function cleanName(name: string): string;
export declare function awaitingOutcome(d: AnyFiling): boolean;
