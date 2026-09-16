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
