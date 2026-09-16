# The global tape: five markets, one list

**Date**: 2026-09-16
**Status**: built on branch `worktree-agent-a46cc083bed7a98f1`, not merged, not
deployed. Verified with `npm run build`, headless Chrome at 520 and 1280, and
`wrangler pages dev` for the crawler pre-render.
**URL**: `/tape` on every host, canonical `https://ddbx.uk/tape` (folded onto
ddbx.uk like `/developers`, `/mcp` and `/status`).

---

## 1. What was built

One page that merges the UK, US, Sweden, Netherlands and Korea feeds into a
single list, newest first, with a panel above it showing each exchange's local
clock, open/closed state and today's filing count, and a 24-hour band drawn in
the reader's own time zone so the staggered sessions are seen rather than
asserted. Every row carries the company logo with its market's flag badged on
it, the insider and role, the side in the site's directional colours, the size
in the currency the filing was made in, the time of day where one exists, and
the verdict where one exists.

Behaviour, per Jon's rules: one view, nothing cycles. The five feeds are
re-read once a minute; new filings are counted in a floating glass pill ("5 new
filings · show") and only merged when pressed. Rows already on the page are
updated in place (a rating landing later is welcome) and never reordered. A
"since you last looked" rule marks where the previous visit ended, from a
localStorage instant written on the way out of the page.

### Files

| File | Role |
|---|---|
| `shared/tape.js` (+ `.d.ts`) | The normaliser. Five wire shapes onto one `TapeRow`; the merge and its floor; formatting; the published methodology. Every market quirk is documented in its header. |
| `src/pages/tape.tsx` | The page: shell header, clock panel, tape, four sections, related cards, ask. |
| `src/components/tape/use-tape.ts` | Fetch, minute poll, pending buffer, stale/failed bookkeeping, last-seen instant. |
| `src/components/tape/world-clock.tsx` | Five cells + the 24-hour band. Sessions and holiday calendars imported from `src/lib/markets/*` (read only, not edited). |
| `src/components/tape/tape-list.tsx` | `BoardRow` rows with day rules, the since-marker, and the show-the-rest control. |
| `functions/tape.js` | Crawler pre-render from the same module: h1, standfirst, session hours, an 80-row table with day rules, what-this-is, coverage, reading, methodology, links. |
| `src/components/seo/cta-copy.ts` | `tapeCta` appended. |
| `shared/seo.js` | `isTapePath`: title, description, canonical fold to ddbx.uk. |
| `functions/_middleware.js` | `/tape` on the skip list (the Function owns its head). |
| `functions/sitemap.xml.js` | `/tape` under ddbx.uk, after `/status`. |
| `src/lib/site-nav.ts` | "Global tape" appended to the footer's Markets group, UK-pinned. |
| `src/App.tsx` | Route, appended. |

Nothing under `src/components/market/*` or `src/lib/markets/*` was edited.
`world-clock.tsx` imports `KRX_SESSION`, `NASDAQ_STOCKHOLM`,
`EURONEXT_AMSTERDAM`, `NYSE`, `LSE` and the three static holiday maps from
those files; all of those exports exist on the committed versions.

---

## 2. How the five feeds are normalised

One row shape:

```
key, market, company, ticker, logoTicker, logoDomain,
insider {name, role, pca}, side (buy|sell|other), action,
shares, price, value, currency, gbp (Korea only),
tradeDate, disclosedDate, at (sort instant, ms), atKind (published|seen|day),
rating, triage, cluster, flags[], href, legs, hasRatingLayer, ratingState
```

| Market | Feed | Side | Value | Time of day | Legs | Link |
|---|---|---|---|---|---|---|
| UK | `/api/dealings?limit=250&fields=lite` | `tx_type` (feed is buys) | `value_gbp`, or `price_native × shares` in the filing's own currency when it is not GBP (10/200 rows are USD/EUR) | none filed; `created_at` = when ddbx saw it, shown as "seen 07:18" | 1 | `/dealings/:id` |
| US | `/api/us-dealings?limit=250&view=interesting&fields=lite` | `transaction_code` P/S (feed is buys, even `view=all`) | `value` USD | none filed; `created_at` as "seen" | already collapsed by the API (`leg_count`) | `/us/dealings/:id` |
| SE | `/api/eu-dealings?market=SE&limit=200` | MAR `nature` prefix table (förvärv, avyttring, tilldelning, lösen …) | `price × volume`, null when footnoted; currency as filed (SEK, CAD on 10/200, GBP, EUR) | **real**: `disclosed_date` is a datetime | merged on (lei, reporter, isin, nature, day, pca, programme, amendment), the dashboards' key | `/se/directors/:name` |
| NL | `/api/eu-dealings?market=NL&limit=200` | Dutch prefix table (verwerving, vervreemding, uitoefening …) | as SE; EUR, USD, GBP, NOK | none: every `disclosed_date` is `T00:00:00Z` | as SE | `/nl/directors/:name` |
| KR | `/api/kr-dealings?limit=200&min_krw=43750000` | sign of `shares_change` (feed is buys) | `value_krw`, with the server's `value_gbp` as "≈ £38k" | none: `YYYYMMDD`; ingested once a day at 20:00 Seoul | 1 | none of its own; row goes to `/kr` |

Ordering: by `disclosedDate` desc, then `at` desc, then market order, then
key. Day-only rows carry their day's midnight, so within a date the timed rows
(Sweden, then the UK/US "seen" instants) come first and the Dutch and Korean
rows sit under them. No filing hour is invented for a market that records none.

Roles: US from `officer_title`, else the `roles` array ("Director and 10%
owner"); SE and NL through the same translation tables the dashboards use,
copied into `shared/tape.js` because the Function cannot import `.tsx`; Korea
from `role.label`, else a non-Hangul `position`. US names go through
`shared/us-names.js` so EDGAR's "TANNENBAUM LEONARD M" reads as a person.

Verdict states, decided **per row**: `rated` (RatingBadge), `skipped` (triage
set it aside), `reviewing` (triaged maybe/promising, analysis pending),
`unrated` (not yet triaged), and `no-layer` (Korea: shown as "Unrated market",
because it is a fact about the country, not the filing).

**The floor.** Each feed is a fixed page of its newest rows and the pages reach
back different distances (250 US rows is ten days; 200 NL rows is nine weeks).
Merged naively the tape's older days would show only the markets whose feeds
reach further back, which reads as "London was quiet". So the tape is cut at
the oldest day every full page still covers; a feed that came back with fewer
rows than asked has no more to give and does not bind, nor does one that
failed. The page names the binding market ("set today by Sweden"). What has
been shown never disappears when the floor creeps forward on a later poll.

---

## 3. What the data said that changed the plan

1. **Only Sweden files a time of day.** The brief said "sorted by announcement
   time". UK and US carry a date plus our ingest instant; NL is always
   midnight; KR is `YYYYMMDD`. The tape sorts on the best honest instant and
   labels its kind ("seen 07:18", "date only") instead of inventing hours.
2. **Sweden has ratings; the Netherlands does not, yet.** The brief assumed
   verdicts on UK/US only. Live: 41 of 300 SE rows rated (21 significant, 18
   noteworthy, 2 minor), 50 triaged; NL 82 triaged, 0 rated; KR nothing.
   So "unrated market" is Korea only and every other cell is decided per row.
3. **The EU and Korea endpoints cap at 200 rows** whatever `limit` says. The
   first version treated "fewer rows than asked" as exhausted and would have
   let Sweden's truncated page un-bind the floor. `fetchTapeFeeds` records the
   raw count and the count requested; a feed binds when they are equal.
4. **Sweden is the binding feed today, not the US.** 200 Swedish rows is
   about seven days (Skanska's employee representatives alone filed 15 grants
   on 16 September), so the tape spans 10–16 September, 246 rows on the day
   this was built.
5. **The Dutch feed's newest row was 7 September**, nine days old at build
   time. "Nothing filed yet today" would have implied a wait; the cell says
   "Latest filing 7 Sept" instead. Whether that is the AFM or our ingest is a
   data-side question (§5).
6. **Korea is read once a day** (`KR_INGEST_CRON = "0 11 * * *"`, 20:00
   Seoul). "Korea files while London sleeps" is true of the exchange session,
   which the band shows; the rows themselves land in one evening batch, which
   the coverage section says.
7. **The UK and US feeds are purchases only** (200/200 and 100/100 sampled,
   including `view=all` on US). Buy/sell on the tape is therefore a per-row
   fact plus a per-market statement about the feed, made in the coverage
   section rather than left for the reader to infer.
8. **EU notifications arrive as legs.** argenx's Global Head of Quality is two
   AFM rows on one notification (an exchange leg and a sale leg). Legs are
   merged on the dashboards' own key so the two surfaces agree on the count.

---

## 4. Verified vs not

Verified:

- `npm run build` (tsc + vite) passes; eslint clean on every new file after
  `--fix` (formatting only).
- Headless Chrome at 520 and 1280 against `vite preview`: clock panel, band,
  day rules, rows across SE/US/UK, verdict badges, phone caption fold, the
  orphan-cell fix, the Disclosed column no longer truncating.
- `wrangler pages dev dist` with `Host: ddbx.uk`: 200, one `<title>`, canonical
  `https://ddbx.uk/tape`, description "197 insider filings from 4 markets since
  12 Sept, newest first, led by …", 81 table rows with day rules, no `noindex`;
  on the preview host, `noindex` is emitted.
- The normaliser against the live API from node: five feeds, 246 merged rows,
  floor 2026-09-10, binding SE; role, side, currency and link samples per
  market inspected by hand (see `shared/tape.js` header for the counts).

Not verified:

- **The minute poll and the pending pill** with real new filings landing; the
  logic was exercised by reading, not by waiting for a Swedish filing.
- **The since-you-last-looked marker** across two real visits.
- **Dark mode** (tokens used throughout, no render pass).
- A weekend/holiday state of the band (dashed hollow bars).

Also verified, from a 14,000px capture: Korean rows on screen under the timed
rows ("date only", "Unrated market"), the Tuesday day rule, the show-the-rest
control (117 more), and the whole foot: reading section, numbered
methodology, four related cards, the ask band, and "Global tape" in the
footer's Markets column.
- Any host other than ddbx.uk for the middleware redirect chain.

---

## 5. Data-side needs (none built; specced only)

1. **A published time on UK and US rows.** RNS carries a publication time and
   EDGAR an acceptance datetime; neither reaches the wire. `disclosed_at` (ISO
   datetime, nullable, additive) on `Dealing` and `UsDealing` would let the
   tape say "07:00 London" instead of "seen 07:18". Additive, no consumer
   breaks.
2. **A Korea publication time**, or at least intraday ingest. DART lists a
   filing time; the once-a-day cron makes the Korea lane a nightly batch.
3. **Why the NL feed stops at 7 September.** Either the AFM register lags or
   the NL ingest has stalled; the tape can only report the last date.
4. **A KRX holiday calendar.** The other four markets have one in
   `src/lib/markets/*`; Korea's status is weekday-and-hours only.
5. **A per-filing page for Korea**, so a row can link to itself rather than to
   `/kr`.
6. **A `fields=lite` for EU rows** is not needed today (no analysis prose on
   most rows) but would matter if Swedish coverage grows.
7. **Higher page caps on `/api/eu-dealings` and `/api/kr-dealings`**, or a
   `before` cursor, so the binding market is not decided by a 200-row cap.

---

## 6. Open decisions

1. **US scope: `view=interesting` or `view=all`?** The tape uses the
   mechanical set the US dashboard uses ($50k+, no 10b5-1). `all` is still
   purchases only but drops the floor; it would triple the US rows and make
   the US the binding feed at about four days. The brief said "every filing";
   the dashboard's set was chosen so the two surfaces agree.
2. **Korea's floor.** The `/kr` dashboard's £25k floor is reused so the two
   Koreas match. Dropping it makes Korea a third of the tape by row count.
3. **Should a Korean row link to `/kr` at all?** Rule 8 says render nothing
   where a link would be dead; `/kr` is real but not specific, and BoardRow
   draws a chevron either way. A filing page (§5.5) settles it.
4. **Sweden binds the tape at seven days.** Acceptable as a tape; a reader
   wanting last month wants a different page. If the answer is longer, §5.7.
5. **Navigation.** The page is in the footer's Markets group only. The
   masthead's Research dropdown is UK/US research; the market switcher lists
   markets. A cross-market page fits neither and probably wants a slot of its
   own once there are two of them.
