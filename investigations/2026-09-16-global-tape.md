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

---

## Review round, 17 September 2026

An outside review raised five findings. I checked each one against the code and
the live API before changing anything. All five were right. Findings 1 and 4
went further than the review said.

### 1. EU transaction identity: fixed

**What was wrong.** `euLegKey` grouped rows by issuer, reporter, ISIN, nature,
disclosed day, PCA, programme and amendment. Two separate notifications from
one person on the same day therefore became one row, with their volume and
value added together. §2 and §3.8 above said this was "the dashboards' key".
It wasn't: the dashboards leave out the day. It also isn't the right key for a
list of filings.

**What a real notification looks like** (500 rows per market, `view=all`):

- **NL.** The row id is `mar-nl-{meldingid}-{leg}`, and the meldingid is the
  AFM's own notification id. Griffith at Tetragon (1 Sept) is one meldingid
  with two purchase legs (5,767 @ 14.05 and 6,141 @ 14.10 USD). Borgions at
  argenx (7 Sept) filed **two** meldingids on the same day. Each one is an
  exercise pair: a purchase leg at 309.20 and a sale leg (1,500 @ 862.12 and
  47 @ 881.35). The old key showed this as two rows of 1,547 shares. It is
  really four rows.
- **SE.** FI publishes no notification id. Every leg of one notification
  shares the same publication time, to the second. Across 324 distinct
  timestamps, no timestamp was shared by two (issuer, reporter) pairs.
  Helmersson at ITAB is one notification (15:31:14) reporting buys on the 11th,
  14th and 16th. Arnhult at Corem filed at 17:45:32 (310,000 shares, traded on
  the 4th) and again at 23:44:20 (64,697 + 125,000, traded on the 7th and 8th).
  That is two rows. The old key showed one row of 499,697 shares.
- **Also found:** FI keeps a corrected notification's original with status
  `Reviderad`. The correction arrives as a new row with `is_amendment`. 43 of
  500 SE rows were revised originals. On 16 Sept a Skanska grant of 252 shares
  showed up as 504 (the correction plus its own original), next to a separate
  252 from the first version.

**What changed.** The grouping key is now the notification (NL: meldingid; SE:
the publication time) plus ISIN, nature, PCA, programme and amendment. Trade
date is deliberately not part of the key, because one notification can cover
several days. A row with no provable notification is never merged with
anything. `Reviderad` rows are dropped. The latest trade date names the row.
All of this is written up in the `LEGS` / `SUPERSEDED` header of
`shared/tape.js`, and the real rows are fixtures in `tests/tape.test.mjs`.

**What this affects.** Sweden's 200 raw rows now make 132 tape rows. The day
rule counts, the "N filings from M markets" line, the clock panel's "filings
today", the pre-render's description count and the "N legs" flag all count
notifications now. The /se and /nl dashboards still group more loosely, on
purpose; they were not edited.

### 2. Links on non-owning domains: fixed

Rows now link through `tapeRowHref(row, hostname)`. It uses the row's market to
look up `MARKET_HOST_BY_ID` in `shared/seo.js`, the same map `marketHref` uses.
The link stays relative only on the domain that owns that market, and stays a
path on local and preview hosts. It is keyed on the market rather than the
path, because `canonicalUrlFor("/dealings/x", "ddbx.us")` resolves to ddbx.us
while `functions/dealings/[id].js` only indexes that page on ddbx.uk. The
pre-render uses the same helper and always writes absolute URLs. Korean rows
now carry `/kr` from the normaliser, so the pre-render links them as well.

### 3. Outage recovery: fixed

The poll logic has moved into `shared/tape-state.js` as pure functions, and
`use-tape.ts` now only runs the timer and the fetches. If a poll brings rows
while the page is empty, it draws them straight away. That covers the first
load, recovery after a full outage, and a first load where every feed came
back empty. When one market is down, the page names it as missing. If it comes
back after rows are already showing, its filings go into the pending count
and the market is named as "back" until the reader shows them. If a feed fails
after it has loaded, it keeps its rows and is named as stale.

### 4. Completeness wording: fixed

The page no longer says "Every insider filing". The standfirst, the
pre-render, the meta description, each market's `included` line, the reading
section and the methodology now say what each line carries:

- UK: open-market purchases only, shown once rated or set aside. This is
  newly stated: `/api/dealings` holds a filing back while it waits on
  analysis, for up to two days.
- US: the dashboard's set of direct, off-plan purchases of $50k or more.
- Korea: purchases of about £25k or more, by individuals only. Also newly
  stated: the API leaves out institutional filers.
- Sweden and the Netherlands: every notification.

The MCP card also claimed "the same five feeds". The connector has no Korea,
so the card now says "UK, US and European insider buying".

### 5. Other figures: checked

See the "What this affects" paragraph under finding 1. Separately, the
`TAPE_LIMITS` comment and §3.3 above said the EU endpoint caps a page at 200.
On 17 Sept it returned 500 when asked for 500 (Korea still caps at 200). The
tape still asks for 200 from Sweden, so GT4 (Sweden binds at about 7 days) is
unchanged. It is now an open decision rather than an endpoint limit.

### Still open

- The Netherlands has **no rows** on the tape today. Its newest filing is from
  7 Sept, and the floor is 12 Sept (see §5.3). The clock cell shows the date,
  but the standfirst names the Netherlands as a market on the tape.
- GT2 (Korea floor), GT3 (Korea links to `/kr`) and GT4 are unchanged.
- Not verified: the pre-render under `wrangler pages dev` (only covered by the
  unit tests on the helper), absolute links in a browser on a production host,
  and the recovered/stale notices on screen (covered by state tests, not a
  render).
