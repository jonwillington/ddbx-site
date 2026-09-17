// Types for shared/tape-state.js. See shared/seo.d.ts for why the module is
// plain ESM with its types declared alongside.

import type { TapeFeeds, TapeMarketId, TapeRow } from "./tape";

export interface TapeState {
  /** Null until the first fetch settles. */
  feeds: TapeFeeds | null;
  /** The last poll with at least one feed answering, failed feeds patched. */
  lastGood: TapeFeeds | null;
  /** Rows on the page, newest first. */
  rows: TapeRow[];
  /** New rows a poll found, not yet on the page. */
  pending: TapeRow[];
  /** The tape's oldest full day, ISO, or null when every feed was exhausted. */
  floor: string | null;
  /** Which feeds set that floor. */
  binding: TapeMarketId[];
  /** Feeds that have never loaded this visit. */
  failed: TapeMarketId[];
  /** Feeds that loaded once and failed on the latest poll. */
  stale: TapeMarketId[];
  /** Feeds that were missing and came back; their rows are in `pending`. */
  recovered: TapeMarketId[];
  /** No feed has answered and there is nothing on the page. */
  down: boolean;
  /** When the last successful poll settled. */
  refreshedAt: number | null;
  /** The previous visit's instant, ms, or null on a first visit. */
  lastSeenAt: number | null;
}

export declare function initialTapeState(lastSeenAt?: number | null): TapeState;
export declare function applyTapeFeeds(
  state: TapeState,
  fresh: TapeFeeds,
  now: number,
): TapeState;
export declare function failTapePoll(state: TapeState): TapeState;
export declare function showPendingTape(state: TapeState): TapeState;
