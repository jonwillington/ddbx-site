/** The tape's data: five feeds, one merge, a minute-long poll.
 *
 *  What the reader sees after each poll (the pending buffer, stale and
 *  missing markets, outage and recovery) is decided by the pure functions in
 *  shared/tape-state.js, which carry the two rules that keep the list still
 *  and are tested in tests/tape.test.mjs. This hook owns only the timer, the
 *  fetch and the storage.
 *
 *  "Since you last looked" is a localStorage instant per browser. It is read
 *  once on mount and written on the way out (pagehide and unmount), so the
 *  marker describes the PREVIOUS visit for the whole of this one rather than
 *  jumping to "just now" the moment the page loads.
 */
import type { TapeState } from "../../../shared/tape-state";

import { useCallback, useEffect, useState } from "react";

import { fetchTapeFeeds } from "../../../shared/tape.js";
import {
  applyTapeFeeds,
  failTapePoll,
  initialTapeState,
  showPendingTape,
} from "../../../shared/tape-state.js";

import { API_BASE } from "@/lib/api";

export type { TapeState };

const POLL_MS = 60_000;
const LAST_SEEN_KEY = "ddbx.tape.lastSeen";

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
  const [state, setState] = useState<TapeState>(() =>
    initialTapeState(typeof window === "undefined" ? null : readLastSeen()),
  );

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const run = async () => {
      try {
        const fresh = await fetchTapeFeeds({ apiBase: API_BASE });
        const now = Date.now();

        if (!cancelled) setState((s) => applyTapeFeeds(s, fresh, now));
      } catch {
        if (!cancelled) setState(failTapePoll);
      }
    };

    const schedule = () => {
      timer = window.setTimeout(async () => {
        // Skip a tick in a background tab; the next one after focus catches up.
        if (document.visibilityState === "visible") await run();
        if (!cancelled) schedule();
      }, POLL_MS);
    };

    run().then(() => {
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
  }, []);

  const showPending = useCallback(() => setState(showPendingTape), []);

  return { ...state, showPending };
}
