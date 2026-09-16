/** The tape's data: five feeds, one merge, a minute-long poll, and the two
 *  rules that keep the list still.
 *
 *  RULE ONE: the view never moves on its own. A poll that finds new filings
 *  does not put them in the list; it puts them in `pending` and the page
 *  draws a count the reader can press. Rows already on the page are updated
 *  in place (a rating landing on a filing shown ten minutes ago is welcome)
 *  but never reordered, added or removed by the clock.
 *
 *  RULE TWO: what was shown stays shown. `mergeTape` cuts the tape at the
 *  oldest day every feed still covers in full, and that floor creeps forward
 *  as new filings push old ones off a feed's page. If the list followed the
 *  floor, a reader who scrolled to Wednesday would watch Wednesday vanish.
 *  So `held` keeps every row ever shown this visit and only `pending` reads
 *  the floor.
 *
 *  A feed that fails on a later poll keeps its previous rows: the reader is
 *  told the market is stale, not shown a tape with a country missing from it.
 *
 *  "Since you last looked" is a localStorage instant per browser. It is read
 *  once on mount and written on the way out (pagehide and unmount), so the
 *  marker describes the PREVIOUS visit for the whole of this one rather than
 *  jumping to "just now" the moment the page loads.
 */
import type { TapeFeeds, TapeMarketId, TapeRow } from "../../../shared/tape";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchTapeFeeds, mergeTape } from "../../../shared/tape.js";

import { API_BASE } from "@/lib/api";

const POLL_MS = 60_000;
const LAST_SEEN_KEY = "ddbx.tape.lastSeen";

export interface TapeState {
  /** Null until the first fetch settles. */
  feeds: TapeFeeds | null;
  /** Rows on the page, newest first. */
  rows: TapeRow[];
  /** New rows a poll found, not yet on the page. */
  pending: TapeRow[];
  /** The tape's oldest full day, ISO, or null when every feed was exhausted. */
  floor: string | null;
  /** Which feeds set that floor. */
  binding: TapeMarketId[];
  /** Feeds that failed on the FIRST load. */
  failed: TapeMarketId[];
  /** Feeds that loaded once and have failed since. */
  stale: TapeMarketId[];
  /** Every feed failed on the first load, so there is no tape at all. */
  down: boolean;
  /** When the last successful poll settled. */
  refreshedAt: number | null;
  /** The previous visit's instant, ms, or null on a first visit. */
  lastSeenAt: number | null;
}

function readLastSeen(): number | null {
  try {
    const v = window.localStorage.getItem(LAST_SEEN_KEY);
    const n = v == null ? NaN : Number(v);

    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function writeLastSeen(ms: number): void {
  try {
    window.localStorage.setItem(LAST_SEEN_KEY, String(ms));
  } catch {
    /* private mode; the marker is a convenience */
  }
}

export function useTape(): TapeState & {
  showPending: () => void;
} {
  const [state, setState] = useState<TapeState>(() => ({
    feeds: null,
    rows: [],
    pending: [],
    floor: null,
    binding: [],
    failed: [],
    stale: [],
    down: false,
    refreshedAt: null,
    lastSeenAt: typeof window === "undefined" ? null : readLastSeen(),
  }));
  const held = useRef<Map<string, TapeRow>>(new Map());
  const lastGood = useRef<TapeFeeds | null>(null);

  const apply = useCallback((fresh: TapeFeeds, first: boolean) => {
    // Patch failed feeds with their last good page so a blip never blanks a
    // market, and remember which ones are running on old data.
    const feeds = { ...fresh };
    const stale: TapeMarketId[] = [];
    const failed: TapeMarketId[] = [];

    for (const id of Object.keys(feeds) as TapeMarketId[]) {
      if (feeds[id].status === "ok") continue;
      const prev = lastGood.current?.[id];

      if (prev && prev.status === "ok") {
        feeds[id] = prev;
        stale.push(id);
      } else failed.push(id);
    }

    const okCount = Object.values(feeds).filter(
      (f) => f.status === "ok",
    ).length;

    if (okCount === 0) {
      setState((s) => ({
        ...s,
        feeds: first ? fresh : s.feeds,
        down: first,
        failed,
      }));

      return;
    }

    lastGood.current = feeds;
    const merged = mergeTape(feeds);

    if (first) {
      for (const r of merged.rows) held.current.set(r.key, r);
      setState((s) => ({
        ...s,
        feeds,
        rows: merged.rows,
        pending: [],
        floor: merged.floor,
        binding: merged.binding,
        failed,
        stale,
        down: false,
        refreshedAt: Date.now(),
      }));

      return;
    }

    const pending: TapeRow[] = [];

    for (const r of merged.rows) {
      if (held.current.has(r.key)) held.current.set(r.key, r);
      else pending.push(r);
    }

    setState((s) => ({
      ...s,
      feeds,
      // Same order as before, same keys, fresh data.
      rows: s.rows.map((r) => held.current.get(r.key) ?? r),
      pending,
      floor: merged.floor,
      binding: merged.binding,
      failed,
      stale,
      refreshedAt: Date.now(),
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const run = async (first: boolean) => {
      try {
        const fresh = await fetchTapeFeeds({ apiBase: API_BASE });

        if (!cancelled) apply(fresh, first);
      } catch {
        if (!cancelled && first) setState((s) => ({ ...s, down: true }));
      }
    };

    const schedule = () => {
      timer = window.setTimeout(async () => {
        // Skip a tick in a background tab; the next one after focus catches up.
        if (document.visibilityState === "visible") await run(false);
        if (!cancelled) schedule();
      }, POLL_MS);
    };

    run(true).then(() => {
      if (!cancelled) schedule();
    });

    const leave = () => writeLastSeen(Date.now());

    window.addEventListener("pagehide", leave);

    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [apply]);

  const showPending = useCallback(() => {
    setState((s) => {
      if (s.pending.length === 0) return s;
      for (const r of s.pending) held.current.set(r.key, r);
      const rows = [...s.pending, ...s.rows];

      // The merged order is the tape's order; a new row that arrived with an
      // older instant than the top row still belongs where its time puts it.
      rows.sort((a, b) =>
        a.disclosedDate !== b.disclosedDate
          ? a.disclosedDate < b.disclosedDate
            ? 1
            : -1
          : b.at - a.at,
      );

      return { ...s, rows, pending: [] };
    });
  }, []);

  return { ...state, showPending };
}
