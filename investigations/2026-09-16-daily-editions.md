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
