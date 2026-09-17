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
//
// Two opt-ins (2026-09-17), both defaulting to the boards' behaviour:
//
// - `view` passes through to `/api/us-dealings`. With no view that route serves
//   the curated population ($50k and over, no 10b5-1 plans): right for a board
//   ranking the interesting buys, wrong for anything that says "every filing".
//   `view: "all"` asks for the record. UK has no server view and ignores it.
// - `windowOn` picks which date the returned window is bounded by. The API's
//   `since`/`before` are disclosed_date bounds, but the boards rank by trade
//   date, so by default the rows are post-filtered on trade_date. A page keyed
//   on the day a filing was ANNOUNCED (a dated edition, a daily index) must
//   filter on disclosed_date instead, or a late disclosure of an old trade
//   drops out of the window while still appearing on the dated page.

const PAGE = 1000;
/** Hard stop, so a cursor that stops advancing can't loop forever. 10 pages is
 *  10,000 rows — far beyond any window we render. */
const MAX_PAGES = 10;

const FEED = { UK: "dealings", US: "us-dealings" };

/** The ISO calendar day after `iso`. */
function addDay(iso) {
  const d = new Date(`${iso}T00:00:00Z`);

  d.setUTCDate(d.getUTCDate() + 1);

  return d.toISOString().slice(0, 10);
}

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
  view = null,
  windowOn = "trade",
}) {
  const feed = FEED[market];

  if (!feed) return { dealings: [], complete: false };

  const seen = new Map();
  let cursor = null;
  let complete = false;

  for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex++) {
    const qs = new URLSearchParams({ since, limit: String(PAGE) });

    if (lite) qs.set("fields", "lite");

    if (view && market === "US") qs.set("view", view);

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

    // `before` is an EXCLUSIVE, date-only bound (`disclosed_date < before`).
    // Paging with `before=<oldest date on the page>` would skip every row on
    // that date the page had no room for, so the cursor is the day AFTER the
    // oldest date: the boundary day is read again whole and the id de-dupe
    // absorbs the repeats. (Lost rows measured 2026-09-17: UK 13 March read 8
    // of 10; US view=all 19 August read 17 of 52.)
    let added = 0;

    for (const row of rows) {
      const key = row.id ?? `${row.ticker}-${row.trade_date}-${row.shares}`;

      if (!seen.has(key)) {
        seen.set(key, row);
        added += 1;
      }
    }

    if (rows.length < PAGE) {
      complete = true;
      break;
    }

    const oldest = rows
      .map((r) => String(r.disclosed_date ?? "").slice(0, 10))
      .filter(Boolean)
      .sort()[0];

    // No usable cursor, or a full page that added nothing new (one day holds
    // more rows than a page): stop, and do NOT call the window complete.
    if (!oldest || added === 0) break;

    // The page reached before the start of the window, so every day from
    // `since` onward has been read whole.
    if (oldest < since) {
      complete = true;
      break;
    }
    cursor = addDay(oldest);
  }

  let dealings = [...seen.values()];
  // disclosed_date carries a time on some feeds; the window is by calendar day.
  const dateOf =
    windowOn === "disclosed"
      ? (d) => String(d.disclosed_date ?? "").slice(0, 10)
      : (d) => d.trade_date ?? "";

  if (until) dealings = dealings.filter((d) => dateOf(d) <= until);
  dealings = dealings.filter((d) => dateOf(d) >= since);

  return { dealings, complete };
}
