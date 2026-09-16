# Living studies: /research and the three first questions

**Date**: 2026-09-16
**Status**: built on a worktree branch, not merged, not deployed. Build passes; render pass done; the pre-render Function exercised under node with a stub `HTMLRewriter`, not under `wrangler pages dev`.
**Scope**: `ddbx-site` only. One data-side endpoint is specified in §8 and nothing here depends on it.

Follows §5 of `2026-08-02-next-features-plan.md`, which said "do not build the outcomes study yet" because the UK series was five months old and 797 rows deep. This is the version of that idea that survives the objection: a page that computes on every load and holds its conclusion until the sample can carry it, so it is publishable at any corpus size, including this one.

---

## 1. What was built

Two routes, one shared module, one pre-render Function.

| URL | What it is |
|---|---|
| `/research` | Index: the three questions, each with its current state, the shared rules, the dataset today |
| `/research/ceo-vs-cfo` | Do finance chiefs’ purchases beat chief executives’ purchases? |
| `/research/does-size-matter` | Does the size of an insider’s purchase predict how it does? |
| `/research/the-cluster-effect` | Do purchases made inside a cluster beat purchases made alone? |

All four exist on `ddbx.uk` and `ddbx.us` (the module is market-parameterised the way every board is; `ddbx.eu` 301s to `ddbx.uk` via `UK_US_ONLY_PREFIXES`).

Files:

- `shared/studies.js` + `.d.ts`: the study definitions, thresholds, statistics, verdict logic and every sentence that states a number. Both renderers read it.
- `src/pages/research.tsx`: `ResearchIndexPage`, `StudyPage`.
- `src/components/research/cell-chart.tsx`: the dot-and-interval chart.
- `src/components/research/study-objects.tsx`: verdict panel, cells table, citation block, rule list, dataset facts.
- `functions/research/[[route]].js`: crawler pre-render for index and studies.
- Plumbing, each appended at the end of its list: `shared/seo.js` (prefix, title, description), `functions/_middleware.js` (skip list), `functions/sitemap.xml.js` (index + three slugs, UK and US), `src/lib/site-nav.ts` (`RESEARCH_PATHS`, "Living studies" after the divider in the Research menu), `src/App.tsx` (two routes), `src/components/seo/related-cards.tsx` (`/research` gets the beaker mark), `src/components/seo/cta-copy.ts` (`studyCta`).

Each study page: the question as h1, a lede standfirst, the tracking notice, the verdict panel (state tag, headline, detail, computed/prices-to line), a contents strip, then five numbered sections: the cells (chart + table + where the filings are listed), how it is measured, what this cannot tell you, the dataset, cite this page. Then "What this is", `RelatedCards`, the app band. Nothing on any page names a person.

## 2. Data facts checked on 2026-09-16

Read via `shared/dealings-feed.js` with the `before` cursor, `fields=lite`, `since=2025-09-16`:

| | UK | US |
|---|---|---|
| Rows (window complete) | 1,022 | 960 |
| Oldest disclosed | 2026-03-09 | 2026-05-13 |
| `isEligibleBuy` | 1,008 | 836 |
| With `live_performance` alpha | 999 | 821 |
| ...of which disclosure-anchored | 993 | 796 |
| Aged ≥ 30 days | 910 | 587 |
| Aged ≥ 60 days | 766 | 347 |
| **Aged ≥ 90 days** | **574** | **287** |
| Aged ≥ 120 days | 370 | 57 |
| Aged ≥ 180 days | 83 | 1 |

Three things about the marks that fix the design:

1. **`live_performance` is the only per-purchase mark on the wire, and it is not a fixed horizon.** It is the return from an anchor close (disclosure-day close where on file, else trade) to the latest cached close, beside the benchmark's over the same window (`^FTAS` UK, `^GSPC` US), recomputed on every read. `as_of` ranged 2026-09-08 to 2026-09-16 across the UK rows.
2. **`performance[]` (the fixed 90/180/365/730 horizons in `Dealing`) is empty on every row**, lite or full. The fixed-horizon marks with a benchmark leg live in ddbx-data's `outcomes` table (`/api/coverage` reports 7,976 rows over 2,554 events: 2,554 at 30d, 1,425 at 90d, 126 at 180d, 9 at 365d) and reach the wire only as per-director aggregates (`beat_rate_pct`, `avg_abnormal_by_horizon`). `/__outcomes/summary` exists but is an admin route. So a public page cannot read a fixed-horizon, benchmarked outcome per event today. See §8.
3. **The UK corpus crossed the 1,000-row cap this week** (the first page returns exactly 1,000; the window holds 1,022). `fetchDealingsWindow` pages it; the pages disclose `complete: false` when it does not.

## 3. The measurement

Shared by all three studies, printed on every page as `METHODOLOGY`:

- Universe: `isEligibleBuy` (open-market, insider-filed, same test as every board), with a `buyAlpha` mark, and **at least 90 days** from the mark's anchor date to its `as_of`. `anchorDate` follows `buyAlpha`'s own preference (disclosure date where the disclosure-anchored alpha exists, else trade date) so a purchase is aged from the day its mark starts.
- Outcome per cell: the **beat rate**, share of purchases with alpha > 0. This is the framing commit `a1b9431` moved the director pages to the same morning ("beating the index, not going up"; base rate 55.7% UK / 61.8% US per `db/outcome-aggregates.ts`), and a study on a different framing would contradict the pages it links to. Median and mean alpha are shown beside each rate, not judged.
- Per cell: n, distinct companies, beats, Wilson 95% interval, median alpha, mean alpha. Rate, interval and medians are `null` under the floor: not unknown, not stated.
- Verdict between the two compared cells: pooled two-proportion z-test, two-sided, called at p < 0.05. When both cells clear the floor and the gap is not called, the page states the point estimates, p, and the per-cell n a gap of that size would need (standard two-proportion sample-size formula at 80% power).
- Everything closed-form and deterministic. No bootstrap, no randomness: the Worker and the browser must reach one verdict from one set of rows.

Per study:

- **CEO vs CFO.** Cells via `shared/roles.js` `inRole` (PCA filings excluded, committee chairs not chairs, the same classifier as `/roles`). A row in both buckets is excluded from both (one UK row today). £10k / $25k floor. Compares CFO against CEO.
- **Does size matter.** No floor. UK bands: under £10k, £10k–£50k, £50k–£250k, £250k and over. US bands: under $100k, $100k–$500k, $500k and over (the US feed carries almost nothing under $50k: 10th percentile of marked US value is $63k). Compares the top band against the bottom; the middle bands are shown, not tested.
- **The cluster effect.** Per-row `cluster.count ≥ 2` as the pipeline asserts it, never the episode grouping in `shared/boards.js` (its header warns about that, and the question here is about the purchase, not the episode). Cells: inside a cluster (either tier), strong (nested), soft (nested), lone. £10k / $25k floor, which is the pipeline's own co-buyer floor, so a purchase the cluster definition does not count is not evidence about clusters. Compares cluster against lone.

## 4. Thresholds, and why

| Threshold | Value | Reason |
|---|---|---|
| `MIN_HORIZON_DAYS` | 90 | First horizon in the site's 3/6/12/24-month vocabulary, and the longest the corpus can fill: at 180 days the UK holds 83 marked purchases in total, US 1. At 60 days more rows qualify (766 UK) but two months is a mark on a quarter that has not reported. |
| `MIN_CELL` | 30 | Where a Wilson interval on a near-coin-flip rate narrows to about ±17pp, the widest interval that can still exclude "no better than the market" for a cell doing well. Above the role hubs' 25-filing bar because a cell is a claim about a kind of purchase, not a count. The director pages' 4 is for a count that is shown but not divided; this floor gates the same operation. |
| `SIGNIFICANCE` | 0.05 | Conventional; printed on the page as "under 5%". |
| `STUDY_FLOOR` | £10,000 / $25,000 | The pipeline's cluster co-buyer floors (`countsTowardCluster`), already published on `/cluster-buys` and the filing pages. Not the £50k board floor: that line exists to keep token buys off a ranking, and here a cell of token buys is a cell, not a row. |
| `ARRIVAL_WEEKS` | 8 | Long enough to smooth a quiet fortnight, short enough that a change in filing rate shows up within the quarter. |

Why the floor is on the compared cells only: a breakdown cell (strong/soft) under the floor is shown as a meter of its count, and never blocks the verdict, because it is not compared.

## 5. Sample sizes per cell today

From `node run-studies.mjs` at 2026-09-16 (morning fetch). The browser render later the same day showed slightly larger cells (UK CEO 69, sample 563) because `as_of` had advanced for more rows: that is the page doing what it says.

**UK, `ddbx.uk`**

| Study | Cell | n | Companies | Beat rate | 95% | Median alpha | State |
|---|---|---|---|---|---|---|---|
| CEO vs CFO | Chief financial officers | 21 | 19 | not stated | | | **waiting**: 9 needed, 19 queued, 9th matures 28 Oct 2026 |
| | Chief executives | 67 | 56 | 61% | 49–72% | +3.8pp | clears |
| Size | Under £10,000 | 135 | 92 | 50% | 42–59% | +1.2pp | compared |
| | £10,000 to £50,000 | 247 | 176 | 59% | 53–65% | +2.6pp | |
| | £50,000 to £250,000 | 128 | 103 | 57% | 48–65% | +2.2pp | |
| | £250,000 and over | 39 | 25 | 72% | 56–83% | +8.8pp | compared |
| | *verdict* | | | | | | **answered**: 72% to 50%, p = 0.0008 |
| Cluster | Inside a cluster | 151 | 55 | 64% | 56–71% | +7.8pp | compared |
| | Strong (nested) | 127 | 49 | 62% | 54–70% | +7.6pp | |
| | Soft (nested) | 24 | 13 | not stated | | | under floor, 6 needed, 21 Oct 2026 |
| | Lone purchases | 263 | 208 | 57% | 51–63% | +1.5pp | compared |
| | *verdict* | | | | | | **open**: gap 6pp, p = 0.08, would need ~985 per cell |

Universe (floor studies): 781 in scope, 414 scored, 255 companies, 60% beat the index, 23.75 arrivals per week. Size study (no floor): 1,008 in scope, 549 scored, 305 companies, 57%.

**US, `ddbx.us`**

| Study | Cell | n | Companies | Beat rate | 95% | Median alpha | State |
|---|---|---|---|---|---|---|---|
| CEO vs CFO | Chief financial officers | 14 | 14 | not stated | | | **waiting**: 16 needed, 31 queued, 16th matures 15 Nov 2026 |
| | Chief executives | 56 | 37 | 64% | 51–76% | +2.4pp | clears |
| Size | Under $100,000 | 86 | 66 | 59% | 49–69% | +3.7pp | compared |
| | $100,000 to $500,000 | 136 | 90 | 63% | 55–71% | +5.0pp | |
| | $500,000 and over | 53 | 37 | 51% | 38–64% | +0.7pp | compared |
| | *verdict* | | | | | | **open**: gap −8pp, p = 0.17, would need ~552 per cell |
| Cluster | Inside a cluster | 106 | 42 | 53% | 43–62% | +1.2pp | compared |
| | Strong (nested) | 95 | 37 | 52% | 42–61% | +1.0pp | |
| | Soft (nested) | 11 | 8 | not stated | | | under floor, 19 needed, projected 28 Dec 2026 from rate |
| | Lone purchases | 169 | 118 | 64% | 56–71% | +4.6pp | compared |
| | *verdict* | | | | | | **answered**: lone 64% to cluster 53%, p = 0.01 |

Universe: 836 in scope, 275 scored, 159 companies, 60%, 59.9 arrivals per week.

## 6. What the data said that changed the plan

1. **180 days was the horizon I wanted and 90 is the one that exists.** 83 UK rows at six months; nothing clears. The page says "at least 90 days" everywhere and the limits section says older purchases have had longer.
2. **One study is waiting, one is answered, one is too close to call, on the UK corpus today.** That is the best possible test of the three-state design and it happened without being arranged. The CFO cell (21) is the honest one to lead the index with: the page states the 9 needed, the 19 in the queue, and the maturation date of the 9th.
3. **The size study answers, but the ladder is not monotonic.** 50 / 59 / 57 / 72. The verdict is an ends test and says so; a reader can see the middle. A trend test (Cochran-Armitage) would be the stricter claim and is an open decision (§9).
4. **The US cluster study answers the opposite way to the UK point estimate.** Lone 64% to cluster 53% in the US (p = 0.01); cluster 64% to lone 57% in the UK (p = 0.08). Both are true of their samples. The independence caveat (cluster purchases are the same company in the same fortnight; 106 US cluster purchases are 42 companies) is printed as the first limit on that page, and the companies column sits beside n in every table for that reason.
5. **The both-roles exclusion costs one UK row** (a filer titled as both CEO and CFO). Cheap, and it removes a purchase that would otherwise count on both sides.
6. **`as_of` moves through the day.** The morning node run and the afternoon browser render disagreed by a few rows per cell. The page prints the computed date and the prices-to date on the verdict panel and in the citation line for exactly this reason.
7. **The scratchpad and port 4179 are shared with the sibling agents.** A screenshot script of mine was overwritten and the preview server was killed mid-pass; I moved to unique filenames and port 4193. Not a product finding, but it is why the render pass took two attempts.

## 7. Verified and not verified

Verified:

- `npm run build` (tsc + vite) passes. `eslint --fix` run on every new file; zero errors, prettier applied. The eight `css-syntax-error` warnings in the build are HeroUI's `.slider__thumb` rules, pre-existing.
- `shared/studies.js` unit-run under node against the live corpus for both markets (`run-studies.mjs`); the tables in §5 are its output.
- `shared/seo.js` resolves `/research` and the three slugs to the right title, description and canonical on both hosts; an unknown slug gets the shell title; `isForeignResearchPath` is true on `ddbx.eu`.
- `functions/research/[[route]].js` executed under node with a stub `HTMLRewriter` for index, two studies and an unknown slug on both hosts: correct titles, canonicals, no `noindex` on real pages, `noindex` on the unknown slug, bodies of 5–11KB with the verdict sentence, the cells table, the methodology and the citation line.
- Headless Chrome render pass at 1280 and 520 against `vite preview` with the live API: index, all three studies, both widths, read as PNGs. Two defects found and fixed: the under-floor label ran past the track on a long meter (now flips to the left past 50%), and the table's mono headers collided at phone width (min-width raised, cell padding added). Nested labels wrap rather than truncate.

Not verified:

- `wrangler pages dev` against the built site. The Function was run under node, not the Workers runtime; `HTMLRewriter` behaviour was stubbed. Every other module it imports is one the existing Functions already run.
- Dark mode. Classes follow the family's existing pairs (`dark:bg-surface`, `dark:border-white/[0.07]`, `dark:fill-brand-tan` style tokens) but no dark screenshot was taken.
- The hover title on chart rows (`title` attribute per row) exists but was not exercised.
- Sitemap output: the entries are appended by the same helper the pages use, but `/sitemap.xml` was not fetched from a Pages runtime.
- Clipboard copy in the citation block (needs a secure context and a real click).

## 8. Data-side needs

None blocking. One additive endpoint would let the studies use fixed horizons with a benchmark leg instead of the rolling `live_performance` mark, which is the single largest methodological improvement available:

```
GET /api/outcomes?market=UK|US&horizon=90|180|365|730[&since=YYYY-MM-DD][&before=YYYY-MM-DD]
→ { horizon_days, as_of, outcomes: [
      { event_id, trade_date, disclosed_date, anchor: "trade"|"disclosed",
        return_pct, abnormal_return_pct | null, flags: string[] } ] }
```

- `event_id` is `dealings.id` (UK) / the Form 4 filing id (US), so the site can join back to the rows it already holds for roles, value, cluster and issuer.
- Both legs as PERCENTS on the wire (as `outcomes` stores them), documented as such, since the ratio/percent trap has bitten this site twice.
- `flags` carries `no_bench` so a missing benchmark leg is a gap, not a miss.
- Edge-cached like `fields=lite`; the 90-day slice for UK is ~1,400 rows today.

With that, `isScored` becomes "has a resolved 90-day outcome with a benchmark leg", the horizon becomes fixed rather than a minimum, and the limits section loses its longest caveat. `shared/studies.js` is written so that swap touches `anchorDate`/`markAgeDays`/`buyAlpha` call sites and nothing in the verdict or the words.

Second, cheaper: `/api/coverage` already reports per-horizon event counts across all markets; a per-market breakdown would let the index state "how many purchases reach 180 days" without a full window fetch.

## 9. Open decisions

1. **Ends test or trend test for the size study.** The verdict compares the largest band against the smallest, which is what "does size matter" most plainly asks, but the honest claim about a four-band ladder is a trend. A Cochran-Armitage trend test is closed-form and deterministic and would fit the module; it would also make the US size study's non-monotonic ladder (59 / 63 / 51) read as what it is.
2. **Whether the US pages should exist yet.** They compute correctly and the not-yet states are honest, but the US corpus is four months deep and its CFO cell has 14. The alternative is to publish `/research` on `ddbx.uk` only and 301 `ddbx.us/research` there until the US CFO cell clears (projected 15 November 2026). Built as both, because the module is market-blind and the honest state is the page's content.
3. **Where "Living studies" sits in the Research menu.** Appended after the divider with Monthly reports, to keep the merge clean and because a study is the record read as a whole. It could argue for a place above the divider as a hub.
4. **The 30-per-cell floor versus the size study's top band (39 UK).** The floor is cleared, but 39 purchases across 25 companies is the thinnest answered cell on the site. Raising `MIN_CELL` to 40 would put the size study into the waiting state today with an honest date. The floor is one constant.
5. **Rolling twelve-month window versus the whole record.** Every study reads `useBoardFeed`, the boards' rolling window. Identical to the whole record until March 2027, after which a study would silently drop its oldest, best-aged purchases. A study should read from `TRACKING_SINCE_DATE`; that is a one-line change in the page and the Function when the time comes, and the doc is the reminder.

## 10. Checklist against the static-page rules

- Composes `SeoPageShell` (eyebrow, crumbs, h1, lede standfirst, notice, sections, band), `SeoSection` stacked and rail alternating, `RelatedCards`, `StatTiles` on the index, `BackLink` on the study pages. Sections numbered 01–05 where they argue; "What this is" and the cards outside the run.
- Every figure has a no-data state in words with a date where one is computable: under-floor cells show n and "rate appears at 30; expected <date>"; the index dataset tiles fall back to "Not enough data yet" under 30 scored.
- Empty and failed are distinct: `complete: false` with no rows renders "couldn't load", never a finding; a partial window prints the under-count caveat.
- Skeletons stand at the arrived geometry (verdict sheet + contents strip + ruled sections; three selling rows on the index); band suppressed while loading by the shell.
- Colour: one hue on the chart; `text-positive`/`text-negative` only on signed alpha in the table; the one contrasting object is the app band.
- Everything specific is a link: study rows on the index, the boards behind each cell, the other studies, the glossary and method links.
- No em dashes in reader-facing copy; curly apostrophes throughout.
