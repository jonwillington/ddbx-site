// The tape's poll state, as pure functions, so the rules that keep the list
// still can be tested without React (tests/tape.test.mjs). The hook in
// src/components/tape/use-tape.ts owns the timer and the storage; every
// decision about what the reader sees is made here.
//
// RULE ONE: the view never moves on its own. A poll that finds new filings
// does not put them in the list; it puts them in `pending` and the page draws
// a count the reader can press. Rows already on the page are updated in place
// (a rating landing on a filing shown ten minutes ago is welcome) but never
// reordered, added or removed by the clock.
//
// The exception is a page with NOTHING on it. An empty list cannot move under
// anyone, so the first poll that brings rows draws them, whether that is the
// first load, the first answer after every feed failed, or the first rows
// after every feed answered empty. Before 17 September an outage on the first
// load left the outage screen up for good and filed the recovered tape under
// "new filings" behind it.
//
// RULE TWO: what was shown stays shown. `mergeTape` cuts the tape at the
// oldest day every feed still covers in full, and that floor creeps forward as
// new filings push old ones off a feed's page. Only `pending` reads the floor;
// a row on the page stays on the page for the visit.
//
// A feed that fails after it has loaded keeps its previous rows and is named
// as stale. A feed that has never loaded is named as missing. A missing feed
// that comes back while the page already holds rows goes to `pending` like
// any other new filing, and is named as `recovered` until the reader presses
// the pill, so its arrival is never silent.

import { compareTapeRows, mergeTape } from "./tape.js";

export function initialTapeState(lastSeenAt = null) {
  return {
    feeds: null,
    lastGood: null,
    rows: [],
    pending: [],
    floor: null,
    binding: [],
    failed: [],
    stale: [],
    recovered: [],
    down: false,
    refreshedAt: null,
    lastSeenAt,
  };
}

/** Fold one poll's feeds into the state. `now` is the settle instant. */
export function applyTapeFeeds(state, fresh, now) {
  // Patch failed feeds with their last good page so a blip never blanks a
  // market, and remember which ones are running on old data.
  const feeds = { ...fresh };
  const stale = [];
  const failed = [];

  for (const id of Object.keys(feeds)) {
    if (feeds[id].status === "ok") continue;
    const prev = state.lastGood?.[id];

    if (prev && prev.status === "ok") {
      feeds[id] = prev;
      stale.push(id);
    } else failed.push(id);
  }

  const ok = Object.keys(feeds).filter((id) => feeds[id].status === "ok");

  // No market has ever answered (a market that had would have been patched
  // in above), so there is nothing on the page and nothing to keep.
  if (ok.length === 0) {
    return { ...state, feeds: fresh, failed, stale: [], down: true };
  }

  const merged = mergeTape(feeds);
  const base = {
    ...state,
    feeds,
    lastGood: feeds,
    floor: merged.floor,
    binding: merged.binding,
    failed,
    stale,
    down: false,
    refreshedAt: now,
  };

  if (state.rows.length === 0) {
    return { ...base, rows: merged.rows, pending: [], recovered: [] };
  }

  const latest = new Map(merged.rows.map((r) => [r.key, r]));
  const shown = new Set(state.rows.map((r) => r.key));
  const pending = merged.rows.filter((r) => !shown.has(r.key));
  const pendingMarkets = new Set(pending.map((r) => r.market));
  const recovered = [
    ...new Set([
      ...state.recovered,
      ...state.failed.filter((id) => ok.includes(id)),
    ]),
  ].filter((id) => pendingMarkets.has(id));

  return {
    ...base,
    // Same order as before, same keys, fresh data.
    rows: state.rows.map((r) => latest.get(r.key) ?? r),
    pending,
    recovered,
  };
}

/** A poll that threw before it could report per feed. */
export function failTapePoll(state) {
  return state.rows.length === 0 && state.lastGood == null
    ? { ...state, down: true }
    : state;
}

/** The reader pressed the pill. */
export function showPendingTape(state) {
  if (state.pending.length === 0) return state;

  // The merged order is the tape's order; a new row that arrived with an older
  // instant than the top row still belongs where its time puts it.
  const rows = [...state.pending, ...state.rows].sort(compareTapeRows);

  return { ...state, rows, pending: [], recovered: [] };
}
