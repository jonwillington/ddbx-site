# The Insider Index

**Date**: 2026-09-16
**Status**: built on branch `worktree-agent-a4b1fc1e4c25f1613`, not merged, not
deployed. Build passes. Two open decisions for Jon (§8) before it goes live.
**Scope**: `ddbx-site` only. No sibling repo touched. One data-side endpoint
specced, not needed to ship (§7).

---

## 0. What shipped

One daily number for how much UK insider buying there is, with a page for the
latest reading and a permalinked page for every trading day since the index
first published.

| URL | What it is | Indexed |
|---|---|---|
| `/insider-index` | The latest reading, the scale, the whole line, the components, the tiers, the formula, recent readings | yes, canonical on ddbx.uk |
| `/insider-index/:date` | One trading day's reading, the same line with that day marked, the days either side | yes, one per published trading day (79 today, ~250 a year) |

Both are UK on every host and fold onto `ddbx.uk` in `rel=canonical`, the way
`/brokers/*` and `/developers` do. `ddbx.eu` 301s to `ddbx.uk` (the path is in
`UK_US_ONLY_PREFIXES`). Weekend and out-of-range dates are `noindex` with a
named not-found state, never resolved to the nearest Friday.

The reading on 16 September 2026 at the time of writing: **5, very quiet**.
"UK directors are buying at a rate lower than on 95% of days on record." See
§8.1 before publishing that sentence.

### Files

New:

- `shared/insider-index.js` + `.d.ts`: the whole computation, the copy the
  three renderers share, and the URL shape. Header comment is the formula in
  full.
- `src/pages/insider-index.tsx`: both React pages (`InsiderIndexPage`,
  `InsiderIndexDatePage`), one shared `IndexDocument`.
- `src/components/insider-index/index-stage.tsx`: the dark panel: hero figure,
  five-segment meter, the line with tooltip and click-through.
- `functions/insider-index/index.js`, `functions/insider-index/[date].js`:
  crawler pre-renders, sharing `loadSeries`, `caveats`, `readingRows` and
  `methodologyHtml` exported from the index Function.
- `investigations/2026-09-16-insider-index.md` (this).

Edited, each an append at the end of its list:

- `shared/seo.js`: import, `UK_US_ONLY_PREFIXES` entry, two path helpers,
  title and description branches, canonical fold onto ddbx.uk.
- `functions/_middleware.js`: two skip-list entries.
- `functions/sitemap.xml.js`: `insiderIndexEntries(host)` and its push.
- `src/lib/site-nav.ts`: `RESEARCH_PATHS` entry, a UK-pinned research link
  (`nav: true`, appended after the divider).
- `src/App.tsx`: import and two routes.
- `src/lib/dealings-window.ts`: prefetch regex includes the two routes.
- `src/components/seo/cta-copy.ts`: `insiderIndexCta`.

---

## 1. What the data said, and how it changed the plan

Checked against the live API on 2026-09-16, not reasoned about.

### 1.1 There are no sells. "Net buying" cannot be computed.

The brief was net insider buying, buys minus sells, Fear & Greed for insiders.
Every one of the 1,021 UK rows and 960 US rows the site can fetch is a buy.
`/api/dealings` serves a `dealings` table that is buy-only by construction
(`ddbx-data/worker/pipeline/buy-style.ts` says so in a comment; the scraper
stores PDMR purchases only). `/api/us-dealings` serves Form 4 transaction code
`P` alone. `getMonthlyTxCounts` in `queries.ts` does sum a `sells` column, and
the monthly-report prompt has a whole paragraph telling the model that figure
is always zero and must never be mentioned.

So the index is **buying intensity against its own record**, not net buying.
The page says this in the first line under the figure, in the methodology, in
the meta description and in the pre-render. A low reading means directors are
buying less, not that they are selling. Building a "net" index over this feed
would have been a formula on top of a lie.

### 1.2 US is not publishable from the feed the site can reach.

- `/api/coverage` counts **2,433** US open-market buys since 13 May; the paged
  `/api/us-dealings` feed returns **960** (complete, `before`-cursor walked to
  the end). The default view is curated and floored at $50,000 (the smallest
  value in the feed is exactly 50,000).
- July 2026 runs at 11 to 19 filings a week against 135 in the second week of
  August. An index over that series would show a July trough that is a
  coverage artefact, and the module cannot tell the difference.
- Coverage starts 13 May, so with a 20-day window and 40 readings of history
  the first US reading would be late August: three weeks of index, no
  seasonality yet.

The module takes `market` throughout and `VALUE_CAP.US` is set, so switching
the US on is one constant (`INDEX_MARKETS`) once a population feed exists
(§7). Passing `"US"` today produces numbers that should not be printed, and
the daily-editions agent was told so.

### 1.3 The value distribution is a cliff, so value is capped per purchase.

UK eligible purchases (1,007 of 1,021 rows; the 14 excluded are
`is_open_market_buy: null`, unpriced):

| p10 | p25 | median | p75 | p90 | p95 | p99 | max |
|---|---|---|---|---|---|---|---|
| £5.0k | £10.5k | £23.8k | £65k | £199k | £385k | £1.42m | £11.4m |

The single largest purchase is 9.9% of six months of buying; the top five are
22.7%. Uncapped, the value component is a chart of whichever founder wrote the
biggest cheque that month. **Each purchase is capped at £250,000** before it is
summed (about one purchase in ten exceeds the cap). This is an editorial line,
published on the page next to the formula so it can be checked. Count and
breadth are not capped; they cannot be dominated by one row.

### 1.4 Disclosures land Monday to Friday only.

0 of 1,007 eligible rows are disclosed on a Saturday or Sunday. Trading days
are therefore weekdays; a weekend date has no reading and a weekend permalink
is a not-found. Bank holidays are inside windows as zero days, uncorrected: a
holiday costs a window a twentieth of its length, which is under the noise.

### 1.5 The record is short and the index is a rank, so early readings are fragile.

UK disclosures run from 9 March 2026. The first full 20-day window ends 3
April; 40 readings later the index first publishes on **29 May 2026**. 79
readings exist today. Every reading ranks against everything before it (the
250-window lookback is longer than the record), so the first published days
were ranked against 40 windows and the latest against 118. This is stated on
the page ("published once 40 earlier windows exist") and in the module.

### 1.6 Readings move after the fact, and it was observed doing so.

Between two renders twenty minutes apart the 16 September reading went from
3 to 5 (85 purchases to 88) as the morning's filings landed. Separately, the
week of 14 September created 55 rows of which only 18 are disclosed that week:
37 were backfilled to earlier dates. Readings are recomputed from the full
record each time, keyed on `disclosed_date`, so a backfill moves past
readings by a point or two. The page says so. The alternative (freezing a
reading at the moment it was first computed) would be a record of what we knew
rather than what happened; §7 specs the endpoint that would offer that if it
is ever wanted.

### 1.7 The current reading is at the floor, and it may be partly the feed.

UK disclosures per week, eligible rows, by disclosure date:

```
Aug 03: 43   Aug 10: 37   Aug 17: 32   Aug 24: 16   Aug 31: 10   Sep 07: 26   Sep 14: 18*
```

(*partial week.) The late-August cliff is either a genuine lull (closed
periods ahead of September results for June year-ends, plus the holiday) or an
ingest shortfall that the 14 September backfill is still filling. The page
cannot distinguish these and neither can I from the outside. `feedGap()`
catches the case where the feed stops entirely (no disclosure for 3+ trading
days prints a caveat), but it cannot catch a feed running at half rate. **This
is the top open decision (§8.1).**

---

## 2. Methodology, in full and reproducible

The formula is in the header of `shared/insider-index.js` and stated on the
page. Repeated here so the doc stands alone.

1. **Universe.** `isEligibleBuy(d, "UK")` from `shared/leaderboard.js`: the
   same test every board applies. `is_open_market_buy === true` and
   `tx_type === "buy"`. Allotments, vesting, exercises, placings and unpriced
   rows are out. Keyed on `disclosed_date`.
2. **Calendar.** Monday to Friday. Start: the first weekday on or after
   `TRACKING_SINCE_DATE` (2026-03-01), or the first disclosed row if later
   (2026-03-09). End: today in Europe/London, never later.
3. **Window.** `WINDOW_DAYS = 20` trading days ending on the reading's date,
   inclusive.
4. **Components** per window: `count` (purchases), `breadth` (distinct
   `ticker`s), `value` (sum of `min(value_gbp, 250_000)`).
5. **Rank.** Each component's percentile within the trailing `LOOKBACK = 250`
   readings including itself: `(below + 0.5 × ties) / (n − 1) × 100`. Null
   with fewer than `MIN_HISTORY = 40` earlier readings.
6. **Index.** `round((countPct + breadthPct + valuePct) / 3)`. 0 to 100; 50 is
   the middle of the record by construction. Equal weights, deliberately: a
   wide wave of small purchases is the pattern the site exists to notice.
7. **Tiers.** Fifths: Very quiet 0-19, Quiet 20-39, Normal 40-59, Busy 60-79,
   Very busy 80-100. Because the index is a percentile mean, roughly a fifth
   of days land in each.
8. **Comparisons.** "The busiest since 3 June" = no reading between 3 June and
   this one was as high (as low, below 50). Only made across a gap of 5+
   readings. "Since readings began" when nothing earlier was as extreme.
   `weekChange` = points versus five readings earlier.

Reproduce from a shell:

```sh
node --input-type=module -e '
import { fetchDealingsWindow } from "./shared/dealings-feed.js";
import { series, readingSummary, latestReading } from "./shared/insider-index.js";
const { dealings } = await fetchDealingsWindow({ apiBase: "https://api.ddbx.uk/api", market: "UK", since: "2025-09-16" });
const all = series(dealings, "UK");
console.log(latestReading(all));
console.log(readingSummary(dealings, "2026-07-02"));
'
```

`readingForDate(dealings, date)` computes with `to: date`, so a permalink's
reading uses only rows disclosed on or before its date and matches the same
date inside the full series exactly (checked: 2026-07-15 gives 77 both ways).

### What was tried and not kept

- **Z-scores mapped through a logistic.** Same shape, harder to explain.
  "Higher than on 82% of days on record" is a sentence a reader can check;
  "1.3 standard deviations" is not.
- **Uncapped value.** See §1.3.
- **Trailing-median baseline with a fixed neutral.** Needs a full year to
  mean anything; the record is six months old.
- **A second chart of the raw daily counts.** Jon's principle: a second view
  has to say something new. The tooltip states count, breadth and capped value
  for any day; the components section states them for the focused day.

---

## 3. The page

Composed from `SeoPageShell` (wide, `titleInHero`), `SeoSection` (four
numbered, one appendix), `StatTiles`, `RowList`/`Row`, `RelatedCards`,
`BackLink` on the dated page, `AppCtaBand` via the shell. Dark
`board-stage` panel for the proof object, per the design language.

Top to bottom:

1. **Stage.** Eyebrow, h1, the reading sentence (or the standfirst before the
   index has published), `StageNotice`. Right: "Reading for 16 September
   2026", the figure at 72/84px, tier. Then the five-segment meter, filled to
   the reading in brand amber with the track a lower step of the same hue.
   Then the line: every published reading, tier rules as solid hairlines,
   tier names in the right gutter (dropped under 520px, where 0/50/100 carry
   it), month ticks, the focused day ringed. Hover: crosshair + tooltip with
   date, reading, tier, count, breadth, capped value. Click: that day's
   permalink. Caption: the window sentence, the week change, readings count.
2. **Rule line** under the stage: "Buying against its own record, not net of
   selling. How it is calculated ↓", plus caveats (partial fetch, feed gap,
   "this is 2 July; the latest is 5 on 16 September").
3. **01 What the reading is made of.** Three `StatTiles`, each with its rank
   in words ("above only 5% of windows"). Note states the cap and the window
   dates. "Not enough data yet" with the publish date if the index has not
   published.
4. **02 How to read it.** The five tiers as tenet-3 rows, top tier first, the
   current tier marked "· today".
5. **03 Recent readings / Days either side.** Undated: 15 most recent as a
   ruled list of links (date, count · companies, reading, tier). Dated:
   `RelatedCards` for the day after, the day before, today.
6. **04 How it is calculated.** Rail variant. The formula in a mono panel,
   then `INDEX_METHODOLOGY` (nine lines, shared with the pre-render).
7. **What this is.** Prose, links into `/learn/open-market-buy`,
   `/learn/closed-period`, `/learn/pdmr`, `/how-it-works`.
8. `RelatedCards` (weekly, cluster buys, most active, what a director buy
   signals), then the terminal band.

Colour carries no verdict on the page: a busy index is not good news and a
quiet one is not bad, and the site's green and red mean price direction. So
the line, the fill and the meter are one hue. Dataviz skill loaded before the
chart was drawn; single series, so no categorical palette to validate.

---

## 4. Verified

- `npm run build` (tsc + vite) passes. `eslint` clean on every new file and
  every edited file.
- Module run in node against the live API: 119 readings from 3 April, 79
  published from 29 May; future dates return null; a weekend returns null; a
  permalink computed as-of equals the same date in the full series.
- Pre-render helpers (`loadSeries`, `caveats`, `readingRows`,
  `methodologyHtml`, `dateLeadSentence`, `indexLeadSentence`) run in node
  against the live API and produce the expected strings.
- `seoForPath` / `canonicalUrlFor`: correct title and description for both
  routes on ddbx.uk and ddbx.us; both canonicalise to ddbx.uk; a weekend slug
  falls through to the market title (and the Function noindexes it);
  `isForeignResearchPath` is true on ddbx.eu.
- Headless Chrome render pass on the production build (`vite preview`):
  `/insider-index` at 1280 and 520, `/insider-index/2026-07-02` at 1280 and
  520, `/insider-index/2026-07-04` (a Saturday) at 1280 and 520. Fixed from
  the pass: May/Jun tick collision, the not-found crumb printing "invalid", a
  dead expression.
- The daily-editions agent has the adapter signature (`readingSummary`) and
  the input contract (the rolling UK window, not the day's rows).

## 5. Not verified

- **The pre-render Functions end to end** (`HTMLRewriter` is a Workers API).
  Their helpers ran in node; the `onRequestGet` handlers have not been
  exercised under `wrangler pages dev`. Same shape as `functions/weekly/*`,
  which is proven, but a typo in a template literal would only show there.
- **Sitemap output** for the same reason.
- **Hover and click on the chart.** Headless screenshots cannot hover. The
  code path is the same pattern as the board stages.
- **Dark theme.** The panel is dark in both themes; the page ground uses
  tokens. Not screenshotted.
- **The reading itself against reality** (§8.1).
- Nothing pushed, nothing deployed.

---

## 6. Why site-side computation is right for now, and its cost

The whole computation is one pass over the rolling window every page already
fetches (`useBoardFeed("UK")`, edge-cached lite rows, in-memory for five
minutes), so a reader arriving from `/cluster-buys` gets the index on the
first frame. The pre-render pays one cached fetch. No new endpoint, no cron,
no table, and the formula lives in one file that three renderers import.

Costs: every reader recomputes 119 windows (trivial); readings move with
backfills (§1.6); and the record is capped by `fetchDealingsWindow`'s ten-page
budget (10,000 rows), which at ~2,000 UK rows a year is five years away.

---

## 7. Data-side endpoint, specced, not required

Worth building when either of these is true: the US is to be switched on (it
needs a population feed the site cannot reach today), or Jon wants readings
frozen at first computation so a permalink never moves.

```
GET /api/insider-index?market=UK[&from=YYYY-MM-DD&to=YYYY-MM-DD]
GET /api/insider-index/:date?market=UK

200 {
  market: "UK",
  method: { version: 1, window_days: 20, min_history: 40, lookback: 250,
            value_cap: 250000 },
  readings: [{
    date, window_start, count, breadth, value_capped,
    count_pct, breadth_pct, value_pct, score, tier,
    computed_at            // when this row was first stored
  }],
  last_disclosed, generated_at
}
```

- Computed by the daily cron after ingest, from the **full** `dealings` table
  (not the curated view), one row per trading day per market, upserted only
  for the trailing `WINDOW_DAYS` + disclosure lag (say 30 trading days) so
  backfills revise recent readings and older ones freeze. `computed_at` says
  which.
- Port `series()` verbatim; the module is dependency-free ESM and the
  `types.ts` mirror would be the `readings[]` shape above (a cross-repo type
  change per `~/CLAUDE.md`, so ship additively).
- For the US, compute over the same `isInsiderFiler` + code-P population the
  boards use, with `value_cap` 1,000,000 (the feed's p90), and expose it only
  once the July coverage gap is explained.
- The site would then read this instead of computing, keeping
  `shared/insider-index.js` for the copy, the tiers and the sentences.

---

## 8. Open decisions for Jon

### 8.1 Is the late-August cliff real? (top decision)

The index will publish "5, very quiet, lower than on 95% of days on record" on
day one. If the 16-10-26 filings-a-week run from 24 August is a genuine lull
that is the correct and interesting reading. If the scraper ran short and is
being backfilled (55 rows created in the week of 14 September against 18
disclosed in it), the first thing the index says in public is an artefact.
Check the ingest logs for 24 August to 12 September before merging. If it was
a shortfall, the readings recover on their own as the backfill lands; nothing
in the code needs to change, but the launch should wait for it.

### 8.2 The £250,000 cap and the equal weights

Both are editorial and both are published. The cap is roughly p90. Equal
weights mean a busy day of small buys reads the same as a busy day of large
ones. An alternative is to weight count 50 / breadth 25 / value 25, on the
argument that breadth and count are near-duplicates (they correlate at 0.9 in
this record). I kept them equal because the page explains three measures
better than it explains weights, and because breadth is the one that catches
"many boards at once", which is the reading worth having.

### 8.3 Navigation placement

The index sits in the Research dropdown as an eighth item after the Monthly
reports divider, and in the footer. The dropdown was curated to seven. If
eight is one too many, drop `nav: true` and it stays reachable from the footer
and from `RelatedCards` on the weekly and cluster pages (not yet added to
those; a one-line addition each).

### 8.4 Should readings freeze?

Today a permalink can move by a point after a backfill (§1.6). Honest, and
stated. The alternative needs §7. My recommendation is to leave it until the
daily editions have quoted a reading that later moved and it mattered.

---

## Review round, 17 September 2026

An external review raised seven findings. Each was checked before it was
fixed; all seven held, one of them (hover prefetch) only in part. Method is
now **v1**, printed on the page, on every dated reading and in the pre-render.

### R1. The late-August trough: a real lull, not an ingest gap

Read-only SELECTs against D1 (`director-dealings`), 17 September, 05:30 UTC.

**When rows arrived.** For every eligible UK purchase disclosed since 8 April
(the first `pipeline_runs` row is 7 April), compare `created_at` (converted to
London) with `disclosed_date`:

| Arrived | Rows |
|---|---|
| Same London day as disclosure | 820 |
| Next day | 3 |
| Two days later | 2 |
| Backfilled on 15 Sep, 05:57 to 06:05 UTC | 35 (37 since March) |

Same-day arrivals run from 07:00 to 18:59 London; none later. The 15 September
backfill is the multi-director extraction fix in ddbx-data (`26dad96`,
"one announcement, one director"): co-buyers that the old prompt dropped. It
added rows disclosed from 18 March to **21 August** and **none** in the trough.
Rows created per week, split by whether they were disclosed in an earlier
week: 42/0, 42/0, 37/0, 31/0, 19/0, 15/0, 28/0 for the weeks of 27 July to
7 September, then 62/38 in the week of 14 September (the backfill). So the
"55 created against 18 disclosed" in §8.1 was the backfill landing, not the
trough filling in.

**An independent count of the market.** `uk_filing_volume` and `dealings_nsm`
hold the FCA National Storage Mechanism's own count of Director/PDMR
Shareholding notices, every type (buys, sells, grants), scraped separately
from our Investegate pipeline:

| Week of | NSM DSH notices | Our eligible buys | NSM notices with a matching dealing (±2 days) |
|---|---|---|---|
| 3 Aug | 176 | 42 | 30% |
| 10 Aug | 157 | 36 | 27% |
| 17 Aug | 127 | 32 | 26% |
| **24 Aug** | **91** | **17** | 20% |
| **31 Aug** (4 sessions) | **83** | **10** | 22% |
| 7 Sep | 124 | 26 | 22% |
| 14 Sep (3 sessions) | 83 | 22 | 30% |

The whole market's filings fell by 40 to 50% in the same fortnight.

**Pipeline health.** 15-minute runs in every week, with no gaps. The runs
with errors in the window were one Anthropic 524 and one 529 on company
profiles (not ingest), then Investegate 5xx from 21:00 on 11 September to
00:15 on 13 September, all outside market hours and cleared by the next run.
There was one more 502 at 14:01 on 16 September, cleared 15 minutes later. The
listing page itself was shorter: 3 to 13 items a scrape from 23 August to
8 September against 14 to 20 before. The 63 zero-item runs on 31 August and
1 September are the bank holiday, status ok.

**Verdict.** The trough is real: a late-summer lull plus the bank holiday.
Rows arrived on time, the backfill did not touch it, and an independent
census fell with it. There is one soft signal: the NSM match share dipped from
26 to 35% to 20 to 22%, which could be a sell-heavy mix around interim results
or a few missed buys. It is not big enough to move the tier. Nothing is
suppressed. The page now says readings may be revised after a late filing or a
backfill, which is what happened on 15 September.

One thing to confirm data-side: did the 15 September re-extraction cover every
multi-director filing since March, or only a sample? If it was a sample, the
`count` component steps up from 15 September (new filings now give one row per
co-buyer) against a history that only partly does. `breadth` is unaffected.

### R2. In-progress days no longer get a reading

`publishedThrough(now)`: session D publishes at `PUBLISH_HOUR` (7am London) on
the calendar day after D. From R1, that covers 820 of 825 live arrivals; the
other five revise the reading after it is published. `series()` never runs
past it, even with an explicit `to`. `readingForDate` and `readingSummary`
return null for a later session. The undated page says "The next reading, for
17 September, lands at 7am on 18 September". A permalink for a pending session
is titled "No reading for that day yet" and says when it lands. The pre-render
noindexes it. `feedGap` measures to `publishedThrough`, not today.

### R3. The score is now a percentile of days

The old index was `round(mean(countPct, breadthPct, valuePct))`. An average of
percentiles bunches towards 50, so "lower than on 95% of days" was not a count
of anything. v1:

1. pool(d) = d plus up to 249 sessions before it (nothing after d).
2. Inside the pool, rank each component for every day, ties half, and average
   each day's three ranks into its combined measure.
3. index(d) = the share of the other days in the pool whose combined measure is
   lower, ties half, rounded.

It still publishes after 40 earlier readings, so the first published date does
not move. Copy changed to match: the sentence is now "UK directors are buying
less than on 97% of earlier trading days on record". It says "in the past
year" once the pool is capped. The tier aside says "over a long record about a
fifth of days". The tier meanings, the formula panel and the methodology list
were rewritten. The component tiles still show each component's own rank
("above only 3% of windows"), which was always a true percentile.

On the live record the latest reading moved from 2 to 3. Across the 73
published readings the tiers split 24/9/10/15/15. That is not a fifth each,
because the record is short and made of overlapping windows. The synthetic
test shows the method gives fifths over four independent 28-month records.

### R4. LSE sessions

Windows are 20 sessions from `shared/exchange-calendar.js`. Weekends and
bank holidays get no reading and do not count as quiet days. A disclosure
dated on a closed day counts on the next session (there are none on record).
`isWeekday`, `prevWeekday`, `nextWeekday` and `weekdaysBetween` are removed.
`isIndexDay(iso, market)` and the calendar helpers replace them.

### R5. Date validation

`isIndexSlug` = `isDateSlug` and an LSE session. It rejects 31 February, 31
September, Saturdays and the summer bank holiday. `indexDateFromPath` also
survives a malformed percent-escape.

### R6. Keyboard

- The chart is one tab stop with a visible amber focus ring. Left and right
  arrows move the crosshair and tooltip, Home and End jump to the ends, Enter
  opens the day, Escape clears. A polite live region reads out the day.
- Section 03 on both pages now ends with **Every reading**: every published
  reading, grouped by month, each a real link with an `aria-label` ("15
  September 2026: 3, very quiet") and a visible focus outline. On a permalink
  the current day is marked with `aria-current="page"`. This replaces the old
  fallback of 15 dates.

### R7. Hover prefetch (partial)

The route was already in `WINDOW_PATH`. The bug was the market: the warmer
prefetched the host's market, so on ddbx.us a hover on an index link warmed
the US window, and the page reads UK. New `dealingsWindowMarketFor(path)`
returns "UK" for index paths. `readsDealingsWindow` is kept.

### Tests

`tests/insider-index.test.mjs`, 8 tests (`npm test`: 16 of 16 pass):

- the index equals a brute-force count over the pool, including when the pool
  is capped at 250, and the sentence's percentage is that count
- the tiers each hold 15 to 25% of days over four seeded records, and the old
  average has thinner outer tiers on the same data
- the publication cutoff at 06:30 and 07:30 London, a forced `to`, and Friday
  to Saturday
- a bank holiday has no reading, a window skips it, and a disclosure on it
  counts on the next session
- `MIN_HISTORY`, and date validation

`npx tsc --noEmit` and `npm run build` pass.

### Export changes (for the daily-editions branch)

- Removed: `isWeekday`, `prevWeekday`, `nextWeekday`, `weekdaysBetween`. The
  daily branch does not import them.
- Added: `METHOD_VERSION`, `METHOD_LABEL`, `PUBLISH_HOUR`, `isIndexDay`,
  `publishedThrough`, `publishesAt`, `nextPublication`, `publishLabel`,
  `combinedMeasures`. `Reading` gains `combined` and `pct`, and
  `ReadingSummary` gains `method`.
- Changed: `publishFrom(all, market?)`, and `readingSummary(dealings, date)`
  **returns null for a session before 7am London the next day**. An edition for
  today gets no index slot until the next morning.

### The reading at 7am on 17 September

Computed after rebasing onto `944897a` (the fix that stops page breaks dropping
rows). The window returns 1,039 UK rows, 1,025 of them eligible; D1 counts 1,030
eligible since March. Before 7am London, the latest reading is 15 September:
**3, very quiet**, 90 purchases across 66 companies, "less than on 97% of
earlier trading days on record". From 7am it is 16 September: **2, very
quiet**, 90 purchases across 64 companies, "less than on 98% of earlier
trading days on record", up 2 on the week, 74 published readings. The next
reading, for 17 September, lands at 7am on 18 September.
