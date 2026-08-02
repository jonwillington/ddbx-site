// Types for shared/filings.js. See shared/seo.d.ts for why the module is plain
// ESM with its types declared alongside.

import type { Dealing } from "../src/types/ddbx";
import type { CheckContext } from "./methodology";

export interface CitedSource {
  headline: string;
  label: string;
  url: string;
}

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
export declare function analysisShape(d: Dealing): AnalysisShape | null;

export declare function filingMeetsBar(d: Dealing | null | undefined): boolean;
export declare function filingPath(id: string): string;
export declare function filingIdFromPath(path: string): string | null;

export declare function money(value: number, currency?: string): string;
export declare function sharePrice(d: Dealing): string;
export declare function shares(n: number): string;
export declare function disclosureLagDays(d: Dealing): number | null;
export declare function signedPct(pct: number | null | undefined): string | null;

export declare function filingLeadSentence(d: Dealing): string;
export declare function outcomeSentence(d: Dealing): string | null;
export declare function clusterSentence(d: Dealing): string | null;
export declare function styleSentence(d: Dealing): string | null;
export declare function citedSources(d: Dealing): CitedSource[];
export declare function cleanName(name: string): string;
export declare function awaitingOutcome(d: Dealing): boolean;
