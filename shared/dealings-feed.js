// Windowed dealings fetch that survives the API's page cap.
//
// `/api/dealings` and `/api/us-dealings` honour `limit` only up to
// DEALINGS_MAX_LIMIT = 1000 (ddbx-data/worker/db/queries.ts). One request
// covers today's windows — 786 UK rows and 532 US in the year to 2026-07-26 —
// but UK crosses 1000 during 2026, and a full calendar-year archive will cross
// it sooner. At that point a single request silently returns a TRUNCATED set,
// and truncation is invisible: the board still renders, still looks complete,
// and is simply missing the oldest part of the window. On a page titled
// "biggest buys of 2026" that's a wrong answer presented as a right one.
//
// So this pages backwards with the `before` cursor (an exclusive
// disclosed_date bound) until the window is covered, and reports whether it
// actually finished. Callers surface `complete: false` rather than pretending.
//
// Plain fetch and plain ESM so the browser and the Worker share one
// implementation.
//
// Lite by default (2026-09-11). Every caller is a window aggregate — the
// sector hubs, the boards, the company page's sector context and their
// pre-renders — and none of them reads the written analysis, which was 83% of
// each row. `fields=lite` asks the API to drop it (analysis shrinks to its
// rating) and is edge-cached there for five minutes: ~200KB gzipped a page
// instead of 1.1-1.4MB, and a cache hit instead of a 2-4s D1 read. Pass
// `lite: false` for a caller that ever needs the prose.

const PAGE = 1000;
/** Hard stop, so a cursor that stops advancing can't loop forever. 10 pages is
 *  10,000 rows — far beyond any window we render. */
const MAX_PAGES = 10;

const FEED = { UK: "dealings", US: "us-dealings" };

/** Fetch every disclosed row in [since, until], paging as needed.
 *
 *  Returns `{ dealings, complete }`. `complete` is false when the page budget
 *  ran out before the window was covered — the caller should say so rather
 *  than present a partial ranking as a full one. */
export async function fetchDealingsWindow({
  apiBase,
  market,
  since,
  until = null,
  fetchImpl = fetch,
  cf = null,
  lite = true,
}) {
  const feed = FEED[market];

  if (!feed) return { dealings: [], complete: false };

  const seen = new Map();
  let cursor = null;
  let complete = false;

  for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex++) {
    const qs = new URLSearchParams({ since, limit: String(PAGE) });

    if (lite) qs.set("fields", "lite");

    if (cursor) qs.set("before", cursor);

    const res = await fetchImpl(`${apiBase}/${feed}?${qs}`, {
      headers: { accept: "application/json" },
      ...(cf ? { cf } : {}),
    });

    if (!res.ok) break;
    const body = await res.json();
    const rows = body.dealings ?? [];

    if (rows.length === 0) {
      complete = true;
      break;
    }

    // De-dupe by id: `before` is an exclusive bound on disclosed_date, not on
    // row identity, so several rows sharing the oldest date in a page can come
    // back again on the next one.
    for (const row of rows) {
      const key = row.id ?? `${row.ticker}-${row.trade_date}-${row.shares}`;

      if (!seen.has(key)) seen.set(key, row);
    }

    if (rows.length < PAGE) {
      complete = true;
      break;
    }

    const oldest = rows
      .map((r) => r.disclosed_date)
      .filter(Boolean)
      .sort()[0];

    // No usable cursor, or it didn't move — stop rather than re-request the
    // same page until the budget runs out.
    if (!oldest || oldest === cursor) {
      complete = true;
      break;
    }
    cursor = oldest;

    // Already past the start of the window.
    if (cursor <= since) {
      complete = true;
      break;
    }
  }

  let dealings = [...seen.values()];

  if (until) dealings = dealings.filter((d) => (d.trade_date ?? "") <= until);
  dealings = dealings.filter((d) => (d.trade_date ?? "") >= since);

  return { dealings, complete };
}
