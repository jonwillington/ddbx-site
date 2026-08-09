// Types for shared/share-notification.js. See shared/seo.d.ts for why the
// module is plain ESM with its types declared alongside.

import type { Dealing } from "../src/types/ddbx";

export interface ShareNotification {
  /** Small-caps attention tag, from the rating. "NEW FILING" when unrated. */
  tag: string;
  /** Ticker + company, e.g. "STAF · Staffline Group". */
  lead: string;
  /** The purchase sentence plus one supporting fact. */
  body: string;
}

/** "2026-08-04" -> "4 Aug". */
export declare function shortDate(iso: string | null | undefined): string;

export declare function shareNotification(
  d: Dealing | null | undefined,
): ShareNotification | null;

export declare function shareNotificationLine(
  d: Dealing | null | undefined,
): string | null;
