// Types for shared/filings.js. See shared/seo.d.ts for why the module is plain
// ESM with its types declared alongside.

import type { Dealing, RatingChecklist } from "../src/types/ddbx";

export interface CitedSource {
  headline: string;
  label: string;
  url: string;
}

export declare const FILING_NOTICE: string;
export declare const CHECKLIST_LABELS: [keyof RatingChecklist, string][];

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
