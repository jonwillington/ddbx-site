# Daily editions: one permanent page per trading day

**Date**: 2026-09-16
**Status**: built on branch `worktree-agent-a2acbaf1cc09bded5`, not pushed, not
deployed. `npm run build` clean; render pass done; Functions exercised under
`wrangler pages dev` with spoofed hosts.
**Scope**: `ddbx-site` only. No `ddbx-data` change was needed; one is
recommended (§6).

---

## 0. What shipped

Six routes, one page file, one shared module, six thin Functions.

| Route | What | Indexed |
|---|---|---|
| `/daily` | UK archive index, every trading day with filings, grouped by month | yes |
| `/daily/:date` | One UK trading day | yes, when it has at least one filing |
| `/today` | 302 to the latest UK trading day's edition | no (`x-robots-tag: noindex`) |
| `/us/daily` | US archive index | yes, on ddbx.us |
| `/us/daily/:date` | One US trading day | yes, on ddbx.us |
| `/us/today` | 302 to the latest US trading day | no |

An edition carries, in a numbered run: the day in numbers (four tiles),
the read (the stored daily summary, headline + body + index line), an
Insider Index slot (renders only when the module exists, §4), where the
money went (biggest buy as a `BoardRow`, cluster activity), every filing
(`BoardRow` list, largest first, each row linking to `/dealings/:id` or
`/us/dealings/:id`). Then the standing copy: what this is, terms on the page,
read next (the trading days either side), and the `AppCtaBand` with its own
copy (`dailyCta`).

A URL that names no edition (weekend, exchange holiday, future date, a date
before the record, not a date) renders a signpost: why there is none, and
cards to the nearest day that has one. Never indexed.

Files:

- `shared/days.js` + `.d.ts`: the calendar (static UK/US closure maps),
  URL shape, labels, the edition model, the sentences, and the two fetches
  (`fetchEdition`, `fetchArchive`) both renderers share
- `shared/daily-prerender.js`: `handleArchive`, `handleEdition`, `handleToday`
- `functions/daily/index.js`, `functions/daily/[date].js`, `functions/today.js`,
  `functions/us/daily/index.js`, `functions/us/daily/[date].js`,
  `functions/us/today.js`: one-line wrappers
- `src/pages/daily.tsx`: `DailyIndexPage`, `DailyEditionPage`, `TodayRedirect`
- `src/lib/insider-index-slot.ts`: the guarded adapter (§4)
- Edited, appended at the end of each list: `src/App.tsx` (six routes),
  `shared/seo.js` (title/description branches, `/daily` and `/today` in
  `UK_US_ONLY_PREFIXES`), `functions/_middleware.js` (skip list),
  `functions/sitemap.xml.js` (`dailyEntries`), `src/lib/site-nav.ts` (footer
  link, not in the masthead dropdown), `src/components/seo/cta-copy.ts`

---

## 1. What the data said, and what it changed

Everything below was checked against the live API on 2026-09-16, not
reasoned about.

### 1.1 `/api/daily-summary` has no archive walk, so the edition is not built on it

The endpoint answers one `?date=` at a time and 404s for a day it has nothing
for. There is no list endpoint. Probing every weekday from 2026-03-01:

| | First summary | Rows | Missing weekdays after the first |
|---|---|---|---|
| UK | 2026-05-11 | 90 | 25 May and 31 Aug (bank holidays), 16 Sep (today, not yet written) |
| US | 2026-06-01 | 64 | 19 Jun, 3 Jul, 7 Sep (NYSE holidays) **and** 26 Jun, 10 Jul, 17 Jul, 20 Jul, 22 Jul, 24 Jul, 31 Jul, 7 Aug, 14 Aug, 21 Aug, and today |

So the UK summary archive is complete from 11 May; the US one is complete
from about 24 August and has a run of missing Fridays through the summer
(worth a look in ddbx-data: the `us daily-summary cron` line in
`worker/index.ts` around L8365, or those Fridays had no rows). The UK
dealings feed, meanwhile, goes back to 9 March. The first 40 UK trading days
on record have filings and no summary.

The plan had the summary as the spine. It is now a **lead an edition may or
may not carry**: the edition is built from the dealings feed (one
`since=date&before=date+1&fields=lite` call, both bounds on `disclosed_date`,
so it is exactly the rows announced that day), and the summary is fetched
alongside with its own three-way status (`ok` / `none` / `failed`). A day
without a summary says so, and says when summaries began. This is the same
shape the weekly family found: its archive was two weeks deep and had to be
built from the endpoint's own path, and here the endpoint has no path at all.

Model strings on the stored rows: `claude-opus-4-6`, `claude-sonnet-4-6`,
`manual-in-session`, `in-chat-manual-backfill-2026-06-08`. Not printed
anywhere; noted so nobody is surprised.

### 1.2 The archive and the sitemap enumerate days from the feed

`fetchArchive` walks the lite feed from a month before the market's floor
(`fetchDealingsWindow`, two pages for UK) and `groupByDay` rolls it up by
`disclosed_date`, trading days only. Result today:

| | Trading days with filings | Purchases | Span | Days with no rated row |
|---|---|---|---|---|
| UK | 127 | 1,036 | 9 Mar to 16 Sep 2026 | 9 |
| US | 83 | 959 | 13 May to 15 Sep 2026 | 5 |

Zero rows were stranded on a weekend or holiday in either market, so the
"trading days only" rule costs nothing today. It is still applied: a filing
time-stamped to a Saturday would otherwise produce an archive row that leads
to a "market was closed" page.

The sitemap under `wrangler pages dev` emits 128 `/daily` URLs on ddbx.uk
(index + 127 days) and 85 `/us/daily` URLs on ddbx.us. `lastmod` is the day.

### 1.3 The 1000-row cap

Confirmed binding: the UK feed since March is 1,036 rows, so the archive
walk is two pages. `fetchDealingsWindow` reports `complete`; the index says
"the oldest days may be missing" when it is false, and the sitemap publishes
what it has (a partial window loses only the oldest days, every one of which
is a real page, so unlike the boards it does not publish nothing).

### 1.4 US is supported

`/api/daily-summary?market=US` exists, cites `us_dealings` ids, and
`total_value_gbp` holds dollars (documented in `worker/db/queries.ts`).
`/api/us-dealings` honours `since`, `before`, `fields=lite`. `/us/dealings/:id`
exists on the site. So `/us/daily/:date` is live on this branch. Two US
caveats stated on the page or here:

- The US default feed view is the curated one (13 rows on 15 Sep against a
  Form 4 firehose), so "every filing" on a US edition means every filing the
  feed presents, which is what the boards and the market home already mean.
- The 10%-owner filers are **not** excluded from an edition (they are from
  the boards via `isInsiderFiler`). The US archive's first day, 13 May, is
  one company, three rows, $100m: an outside holder. See §7.

### 1.5 The summary narrative carries HTML

The `market_overview.narrative` for 15 Sep reads "...pulled lower by `<a
href='#'>weak UK payroll data</a>`". The React page renders text, so the
tag showed literally on the first render pass. `overviewNarrative()` in
`shared/days.js` strips tags; both renderers use it. Worth a prompt fix in
ddbx-data so the model stops writing anchors.

### 1.6 Two tranches, one name

CELH on 15 Sep: DeSantis Damon filed two legs, so the cluster row read
"DeSantis Damon, DeSantis Damon today". `clusterBuyers()` names each buyer
once and links the first leg.

---

## 2. Decisions

1. **The market comes from the path, not the host.** `/daily/*` is UK and
   `/us/daily/*` is US on every domain, the filing-page rule
   (`/dealings/:id`, `/us/dealings/:id`). The weekly family chose host-based
   routing (`/weekly` on ddbx.us is US). Both are defensible; the brief
   asked for `/us/daily/:date`, and a date, like an id, should not mean two
   things on two hosts. Consequences: the pre-render noindexes the off-host
   copy (`ddbx.us/daily/2026-09-15` is noindexed; `ddbx.uk/us/daily/...`
   likewise), `seoForPath` reads the market from the path, the footer link
   is built from `home.id`, and ddbx.eu 301s `/daily` and `/today` to
   ddbx.uk.
2. **`/today` redirects.** An undated page that changes at midnight is a
   canonical that rots daily (the weekly module's argument). Edge 302 with a
   five-minute cache and `x-robots-tag: noindex`; the SPA's `<Navigate>`
   covers client-side arrivals. On a trading morning it lands on today's
   edition in progress, which says "so far" and "session in progress".
3. **The bar is one filing.** A trading day with nothing filed renders
   (two sections: the numbers sentence and the read) but is noindexed and
   absent from the sitemap. It crosses the bar on its own once a filing
   lands.
4. **The calendar is static.** `src/lib/bank-holidays.ts` fetches gov.uk at
   runtime; a Function and a sitemap cannot. England and Wales bank holidays
   to 2028 and NYSE holidays to 2027 are seeded in `shared/days.js` (the NYSE
   list mirrors `src/lib/markets/us.tsx`). This is a yearly chore, now in
   two places for the US; see §7.
5. **Verdict lines come from the rating alone**, in one clause each, with
   the unrated cases distinguished ("Not analysed. Screened out at triage."
   vs "Cleared triage. Analysis pending." vs "Not yet screened."). The
   filing page publishes the rating and the checklist; the edition publishes
   less than that. Discretion is off in production, so nothing here is
   behind a blur.
6. **Cluster counts are printed as the row states them**, never summed:
   `cluster.count` is a rolling per-row annotation (the `shared/boards.js`
   argument). The page says so under the list.

---

## 3. Verified

- `npm run build` (tsc + vite) clean; eslint clean on the new files.
- `shared/days.js` unit-run with node against the live API: paths, statuses,
  nearest-edition logic, both archives, five editions (UK past, UK first
  summary day, US, UK quiet day, UK today).
- Render pass, headless Chrome, `vite preview` on a private port (the shared
  port another agent's preview was on served their build, which is why the
  first pass came back blank): `/daily/2026-09-15` at 520 and 1280,
  `/daily` at both, `/daily/2026-09-13` (weekend signpost), `/daily/2026-04-01`
  (quiet day), `/us/daily/2026-09-15`, `/today` (redirects to 16 Sep, in
  progress). Looked at every PNG. Fixed what it found (§1.5, §1.6, and the
  quiet day saying "nothing" in three sections).
- Functions under `wrangler pages dev dist` with `Host:` spoofed:
  - `ddbx.uk/daily/2026-09-15`: 200, title, canonical
    `https://ddbx.uk/daily/2026-09-15`, BreadcrumbList, body with the read
    and the filings table
  - `ddbx.uk/daily`: 200, canonical, index body
  - `ddbx.uk/today`: 302 to `/daily/2026-09-16`, `x-robots-tag: noindex`
  - `ddbx.uk/daily/2026-09-13` and `/daily/2026-04-01`: noindex, follow
  - `ddbx.us/daily/2026-09-15`: noindex (wrong host for the UK family)
  - `ddbx.us/us/daily/2026-09-15`: 200, canonical on ddbx.us
  - `ddbx.us/us/today`: 302 to `/us/daily/2026-09-16`
  - `ddbx.eu/daily/2026-09-15`: 301 to ddbx.uk
  - sitemaps: 128 daily URLs on ddbx.uk, 85 on ddbx.us

## 4. Not verified

- **The Insider Index slot has never rendered.** `shared/insider-index.js`
  is on another branch. The adapter (`src/lib/insider-index-slot.ts`) reaches
  it through `import.meta.glob("../../shared/insider-index.js")`, which is an
  empty object until the file exists and a lazy chunk once it does, so this
  branch builds alone and the slot lights up on merge with no change here.
  Contract, per the index's author: `readingSummary(dealings, date, "UK")`
  over the **rolling twelve-month UK window** (`loadDealingsWindow(rollingWindow("UK"))`,
  lite rows fine), returning `{ score, tier: { label, phrase }, sentence,
  windowSentence, weekChange, path }` or null; UK only, no US reading. The
  window is only fetched when the module exists. The slot renders a score,
  tier, the two sentences, the "not net of selling" caveat and a link to
  `path`. **After merge: render `/daily/2026-09-15` and look at section 03.**
  The pre-render does not include the slot (the Function would need the
  twelve-month window per request; decide after seeing it hydrated).
- Dark mode not screenshotted (house tokens throughout).
- The `/today` redirect at the London/New York midnight boundary is
  reasoned (Intl in the market's zone, both edge and SPA), not observed.
- The sitemap was generated locally; on Pages the same Function runs with
  the same fetches, but the daily walk adds two paged calls to a Function
  that already makes several. Watch the first live `/sitemap.xml` timing.
- Nothing pushed, nothing deployed.

---

## 5. Data-side needs (none blocking)

1. **A daily-summary list endpoint**, `GET /api/daily-summaries?market=UK`
   returning `[{ date, headline, total_count, total_value, created_at }]`
   newest first. The archive index could then show each day's headline
   beside its numbers, which is the row a reader would actually scan. Today
   that would be 127 fetches, so the index shows numbers only.
2. **Strip HTML from `market_overview.narrative`** at generation (§1.5). The
   site strips it defensively; the app may not.
3. **The missing US Friday summaries** (§1.1): check whether the cron skipped
   or those days had no rows.

## 6. Recommended, not required

Backfill UK summaries for 9 March to 8 May (40 trading days). The filings
exist; `synthesizeDailySummary(env, date, rows)` in
`worker/pipeline/daily-summary.ts` takes a date. The editions for those days
render today with "No summary was written for this day" and would fill in
with no site change.

---

## 7. Open decisions for Jon

1. **Path-based vs host-based market** (§2.1). This branch follows the
   filing pages; the weekly, reports and board families follow the host.
   If you would rather `/daily` on ddbx.us were the US family, the change is
   in `dailyMarket`/`dailyFromPath` and the two `MARKET_BY_HOST`-style checks
   in the Functions, and the `/us/daily` routes become aliases. Decide before
   Google indexes either.
2. **10%-owner filers on US editions.** Shown today (the feed shows them,
   and "every filing announced that day" is the promise). The boards hide
   them. A US edition's biggest buy can therefore be an institution
   rebalancing. Options: exclude via `isInsiderFiler` (edition disagrees with
   the feed), or mark the row ("10% holder") and leave the biggest-buy slot to
   insiders only.
3. **Whether today's in-progress edition belongs in the sitemap.** It is
   there now (with today's date as `lastmod`) because it has filings and the
   URL is permanent; a crawler that reads it at 09:00 gets two rows and no
   summary and re-reads later. Dropping it until the summary lands is a
   one-line change in `dailyEntries`.
4. **Masthead.** "Daily editions" is in the footer's Research column only.
   The dropdown is a curated seven; adding an eighth is a design call.
5. **The static holiday calendar** (§2.4) is now the third copy of the NYSE
   list and the first static copy of the UK one. A yearly reminder, or a
   build-time fetch into `shared/`, is the fix; neither is done.

---

## Review round, 17 September 2026

Seven findings from an external review. I checked each one against the code
and the live API before fixing it. This section overrides the parts above
that it contradicts: the "one filing" bar (§0, §2.3), the US "curated feed"
caveat (§1.4), open decisions 2, 3 and 5 (§7), and the calendar location
(§2.4).

### 1. The archive disagreed with the dated edition: fixed (two causes, not one)

Checked every archive day against its own edition on the live API
(`api.ddbx.uk`). Before the fix, 4 days disagreed. After it, none did (UK
127 days, US 87 days, counts and rated counts both).

- **Cause A, the 13 vs 14 case.** `fetchArchive` walked
  `fetchDealingsWindow`, which by default drops rows by **trade date** (it
  used the archive floor minus 31 days). A late disclosure of an old trade
  showed up on the dated page (a disclosed-date window) but was missing from
  the archive. US 16 Sep: BMA, traded 2026-03-19, filed 2026-09-16. UK
  24 Aug: PCTN.L, traded 2024-03-13. Fix: `windowOn: "disclosed"` and the
  real floor.
- **Cause B, found while checking the fix.** `fetchDealingsWindow` set its
  next page cursor to the oldest `disclosed_date` on a full page and asked for
  rows `before` that date. The API treats `before` as **exclusive**, so any
  row on the boundary day that didn't fit on the earlier page was never read.
  With the whole US record: 19 Aug listed 17 of its 52 filings, 8 Jul 12 of
  29, 19 May 5 of 39. UK 13 Mar listed 8 of 10. The boards were exposed too.
  Fixed in the shared walk on `growth/shared-window` (944897a): the cursor is
  now `addDays(oldest, 1)`, and a full page that adds no new ids stops with
  `complete: false`. This branch is rebased onto it. The stopgap refill that
  briefly lived in `fetchArchive` is gone, and the check still finds 0
  mismatches across 127 UK and 87 US days.
- The edition, the archive and the sitemap now all bucket rows by
  `disclosedDay()` (the first ten characters of `disclosed_date`).

### 2. US claimed the whole record but read the curated feed: fixed

`EDITION_VIEW = { UK: null, US: "all" }` now drives both fetches. What
`view=all` actually holds (probed 1 to 16 Sep, 537 rows): every row is
`P/A/D`, not under a 10b5-1 plan, and not a derivative. The ingest already
stores only open-market direct purchases, so "every open-market purchase"
is true. The US "What this is" copy now says "made directly and not under a
pre-arranged 10b5-1 plan, whatever its size". 15 Sep grows from 13 filings
to 67, and the US archive from 959 to 3,218 purchases.

Two copy problems came in with the wider population, and both are fixed:

- 316 of the 537 rows have no triage. Most are under the $50k triage floor
  and will never be screened, so "Not yet screened" was false for them.
  `verdictLine`/`verdictWord` now say "Not screened. Below the $50k analysis
  floor." / "Unscreened", and the Terms section explains the floor. A
  $50k-plus row with no triage still says "Not yet screened". Some of those
  are probably penny or placement fills that won't be screened either, and
  the lite rows don't carry `is_open_market_buy`, so the page can't tell them
  apart.
- **DE2 resolved as Jon decided.** Filers who are only 10% holders
  (`isHolderOnly`, which is `!isInsiderFiler`, the boards' own test) stay on
  the list and in the totals, marked "No board seat or office". The
  biggest-buy slot is now "Biggest buy by an insider" and skips them. If a
  day has only holder filings, the slot says so. The lead sentence reports
  them ("7 were filed by 10% holders with no board seat or office") because
  its totals include them.

### 3. Outage vs empty archive: fixed

`fetchArchive` now returns `failed` (the walk didn't finish and returned
nothing). The index shows the fault message for it, and "No editions yet"
only for a finished walk that found nothing. A partial walk keeps its
"oldest days may be missing" note, and the lead sentence (which states a
total) is held back. Rendered against an unreachable API: the fault message
shows, not the empty state.

### 4. Summary citations: fixed

`citedFilings(model, cited)` matches each cited leg to its edition row (by
id, else by filing, reporter and trade date), removes duplicates, and keeps
the order the summary cites them in. A citation that isn't on that day's list
still links to its own row. The read now has a "Filings this read cites"
list, each entry linking to the filing page. On the full list, cited rows are
marked "Cited in the read". The pre-render carries both. `summaryBody()`
strips the inline accession ids the US read writes into its prose ("(IDs
f4-…-1-0 and f4-…-1-1)"), since the list now does that job.

### 5. Indexability bar: fixed, and DE3 resolved

`editionMeetsBar(day, hasSummary)`: a day is indexable if it has a summary,
or 3+ filings with at least 1 rated. If the filings alone miss the bar and
the summary fetch failed, the pre-render serves the plain shell rather than a
noindex. `sitemapDays()` asks for the summary only for thin days and today.
Today goes in only once its summary exists, and a failed check counts as
"no". Under `wrangler pages dev`: 121 UK days plus the index, 86 US days plus
the index. 4 Sep (2 filings, has a summary) is in the sitemap and indexed.
15 Apr (8 filings, none rated) and 10 Mar are noindexed and not in the
sitemap. The US sitemap took about 10s locally, cold, because `view=all` is
not edge-cached by the API.

### 6. US nav mismatch: fixed

The footer link now picks `/us/daily` for any market `MARKET_HOST_BY_ID`
assigns to ddbx.us (US, Congress, DJT), not just id `us`. I reasoned this
through and didn't render the Congress or DJT footer.

### 7. One calendar: done

`shared/days.js` imports the closures and date helpers from
`shared/exchange-calendar.js` and re-exports them. Its own copies are gone.

### Tests

`tests/days.test.mjs` (9 tests) covers: a late disclosure stays on its
announcement day; the archive and the edition agree across a page boundary
that falls mid-day (1,300 rows; the walk alone returns 1,217); a timestamped
`disclosed_date` buckets the same in both; US fetches send `view=all`; an
outage vs an empty archive; the bar; the sitemap leaves out thin days and
leaves out today until its summary lands; holders are excluded from biggest
buy; id stripping and citation merging. `npm test` 19/19 after the rebase, `tsc` clean,
`npm run build` clean (the HeroUI slider CSS warnings were already there).

### Still open

- **The US archive will hit the page budget.** `view=all` adds about 1,400
  rows a month and `MAX_PAGES` is 10 (10,000 rows). The archive is 4 pages
  now, so it will go `complete: false` around next spring. It is also 4 to 7
  uncached D1 reads for the index page and the sitemap. The lasting fix is a
  per-day counts endpoint in ddbx-data (it could also cover the
  summary-existence check, alongside the list endpoint in §5.1).
- A single day over 1,000 rows would get cut off in `fetchEdition`. The
  busiest day seen is 67, so this is not handled.
- Dark mode not screenshotted. Pages rendered: `/daily`,
  `/daily/2026-09-15`, `/us/daily`, `/us/daily/2026-09-15` at 1440 and 520,
  plus `/daily` at 520 during an outage.

### Insider Index slot, revised contract (same day)

The index branch changed `readingSummary`: it is now null for day D until
7am London on D+1, it takes `{ now }`, it returns `method`, and the index
window is bounded by disclosed day (`indexWindow`). `src/lib/insider-index-slot.ts`
now returns `{ kind: "reading" }` or `{ kind: "pending", landsAt }`, or null
for nothing to show:

- **Pending** is decided before any fetch, when the date is after
  `publishedThrough(now)`. The section says "The Insider Index reading for
  17 September 2026 lands at 7am on 18 September…", using the module's own
  `publishLabel`, and links to `/insider-index`. It is not treated as a
  failure or a missing number.
- **Reading** fetches `indexWindow(now, "UK")` through `fetchDealingsWindow`
  (disclosed-day window) and renders the module's `sentence` and
  `windowSentence` unchanged, plus `Method v1`.
- Checked with the index module temporarily copied into this tree (not
  committed): `/daily/2026-09-16` rendered the reading (2, Very quiet) and
  `/daily/2026-09-17` rendered the pending notice.
