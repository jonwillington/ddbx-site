// Types for shared/filings-us.js — the US half of the per-filing family. See
// that file's header for why it is a separate module rather than a branch, and
// shared/seo.d.ts for why these modules are plain ESM with types alongside.

import type { UsDealing } from "../src/types/ddbx";
import type { CheckContext } from "./methodology";

export declare const usFilingPath: (id: string) => string;
export declare function usFilingIdFromPath(path: string): string | null;

export declare const usMoney: (value: number | null | undefined) => string;

/** Null when the leg is footnote-priced rather than stating a price, which a
 *  US filing may be and a UK one is not. Callers must render the gap. */
export declare function usSharePrice(d: UsDealing): string | null;

export declare function usInsider(d: UsDealing): {
  name: string;
  role: string | null;
};

export declare function usTransactionLabel(d: UsDealing): string;
export declare function usFilingLeadSentence(d: UsDealing): string;
export declare function usCheckContext(d: UsDealing): CheckContext;
