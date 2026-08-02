// Types for shared/weeks.js. See shared/seo.d.ts for why the module is plain
// ESM with its types declared alongside.

import type { WeeklyCard, WeeklyDigest } from "../src/types/ddbx";

/** One row of GET /api/weekly-digests — summary columns, no digest body. */
export interface WeekIndexEntry {
  market: string;
  week_start: string;
  week_end: string;
  card_count: number;
  buy_count: number;
}

export declare function weekStartOf(iso: string): string | null;
export declare function isWeekSlug(slug: string): boolean;
export declare function weekPath(weekStart: string): string;
export declare function weekFromPath(path: string): string | null;
export declare function weekLabel(start: string, end?: string): string;
export declare function weekShort(start: string): string;
export declare function numbersCard(
  digest: WeeklyDigest | null | undefined,
): WeeklyCard | null;
export declare function weekLeadSentence(
  digest: WeeklyDigest,
  marketLabel: string,
): string;
export declare function archiveLeadSentence(
  weeks: WeekIndexEntry[],
  marketLabel: string,
): string;
export declare function weekMeetsBar(
  digest: WeeklyDigest | null | undefined,
): boolean;
