# Family: REPORTS

## Routes reviewed
- `/reports` (archive index)
- `/reports/:month` (a month's report, incl. the "no report for that month" state)

## Files read
- `src/pages/reports.tsx`
- `src/pages/report.tsx`
- `src/components/monthly/monthly-metrics.tsx`, `monthly-featured.tsx`, `monthly-clusters.tsx`, `monthly-performance.tsx`, `monthly-prose.tsx`, `monthly-utils.ts`
- `src/components/seo/page-shell.tsx`, `skeletons.tsx`, `section.tsx`, `related-cards.tsx`, `stat-tiles.tsx`, `meter-bar.tsx`, `app-cta-band.tsx`, `cta-copy.ts`, `tracking-notice.tsx`, `seo-rail.tsx`
- `src/components/brokers/broker-aside.tsx`, `src/components/market/market-row.tsx` (DeltaBadge), `src/components/document-title.tsx`
- `src/lib/performance/format.ts`, `src/lib/app-screenshots.ts`
- `functions/reports/index.js`, `functions/reports/[month].js`, `functions/_middleware.js`, `functions/sitemap.xml.js`
- `shared/months.js`, `shared/seo.js`
- `src/App.tsx` (route registration)

---

## Prior claims — held / refuted

- **[held]** *Family uses SeoPageShell with correct order and loading suppression.*
  Both routes compose `SeoPageShell` (`reports.tsx:137`, `report.tsx:196`, and the
  missing-state branch at `report.tsx:151`). No hand-rolled header survives. Order and
  loading suppression are enforced centrally at `page-shell.tsx:139-164` — while
  `loading`, children are replaced and the band + footnote are not rendered at all.
  `reports.tsx:149` passes `loading={months === null}`; `report.tsx:207` passes
  `loading={!summary}`.

- **[refuted, partially]** *Real SeoSkeleton matching layout (not a generic pulse block).*
  Both routes do use `SeoSkeleton` rather than a pulse block, but neither skeleton
  mirrors its loaded layout — see Bugs **B6** and **B7**. `/reports` loads into
  sheet → definition list → ruled list and shows a bare 3-row ruled list; the report
  page loads into prose → two tile rows → sections and shows one tile row → sections.

- **[held]** *Eyebrow present and family-correct.* `eyebrow="Monthly report"` on the
  index (`reports.tsx:145`), the report page (`report.tsx:205`) and the missing state
  (`report.tsx:163`). One stamp, consistent across the family. But see **D1** — the
  index immediately repeats the same visual treatment 90px lower, which devalues it.

- **[held]** *Terminal AppCtaBand (not mid-page) with non-converged family copy.*
  The band can only be terminal, because the shell owns its position
  (`page-shell.tsx:145-154`) and no page passes `cta={false}`. Copy is `reportsCta`
  (`cta-copy.ts:71-74`): "Read next month's report the day it lands." / "The archive is
  the record. The app is the running commentary: every rated disclosure as it files,
  plus the recap when the month closes." That body makes the recap-cycle claim, distinct
  from `sectorCta`'s live-feed claim and `leaderboardCta`'s alert claim. No convergence.
  House style holds: the claim is timeliness, not performance.

- **[held]** *RelatedCards instead of bare link lists.* `report.tsx:299` (neighbour
  months, `cols={2}`) and `report.tsx:175` (missing state, every month). No bare
  underlined link list remains except the two deliberate single "See every report" /
  "See the report archive" sentences (`report.tsx:300-305`, `report.tsx:178-183`), which
  are prose links, not a list.

- **[refuted]** *Pre-render ↔ React parity (no inversions).* No fact is crawler-only —
  every string in `functions/reports/*.js` has a visible counterpart. But three
  divergences exist where the two sides state the *same* fact differently: money
  rounding (**B2**), the report-page h1 (**B3**), and the newest month appearing twice
  in both (**B4**, symmetrical but wrong on both sides).

- **[held]** *Brokers: BrokerDisclosure unconditional.* Relevant here because the UK
  branch of `SeoRail` puts affiliate links on both report routes
  (`seo-rail.tsx:48-60` → `BrokerAside showAll`). `BrokerDisclosure` renders
  unconditionally in the loaded rail at `broker-aside.tsx:272`, followed by the
  "ranked editorially… not commission" line at `:273-277`. The affiliate ask stays grey
  (`ctaVariant="grey"`) so it does not compete with the band's filled button.

- **[held]** *ddbx.us does not sell UK brokers in the rail.* `reports.tsx:81-85` and
  `report.tsx:75-82` collapse `us`/`usg`/`djt` to `"us"`, and `seo-rail.tsx:48` only
  selects `BrokerAside` for `"uk"`. A US reader gets `AppPromoAside`.

- **[held]** *Report pages carry AI-assistance byline.* `Byline` at `report.tsx:319-333`,
  passed as the shell's `notice` (`report.tsx:208`), rendering "Published 1 July 2026 ·
  Drafted with AI assistance from disclosed filings. Not investment advice." Mirrored
  verbatim in the pre-render at `functions/reports/[month].js:169`.

- **[held]** *Empty US archive noindexed.* `functions/reports/index.js:161` returns
  `noindex(shell)` when `summaries.length === 0`; `[month].js:245` does the same when
  the API returns no summary. **But** the sitemap still advertises the URL — see **B1**.

- **[held]** *Index pre-render for /reports exists and owns the head.*
  `functions/reports/index.js:176-182` emits title, description, canonical and
  breadcrumbs via `renderInto`; `/reports` and `/reports/:month` are both on the
  middleware skip list (`functions/_middleware.js:97-98`), so there is exactly one
  `rel=canonical`.

- **[held]** *US currency hardcodes carry `TODO(us-reports)`.* `report.tsx:442-446`,
  `monthly-metrics.tsx:128-132`, `monthly-performance.tsx:70-74`, and an equivalent
  plain comment in `functions/reports/index.js:41-42`. Noted, not reopened — except
  that the pre-render comment makes a false claim about matching the SPA (**B2**).

---

## Per-module verdicts

### `/reports`

1. **SeoRail (right rail)** — **keep** — `reports.tsx:132-136` — none. Correct market
   branch, disclosure present, grey CTA so it doesn't fight the band.
2. **Shell header (eyebrow / h1 / standfirst)** — **keep** — `reports.tsx:145-151` — none.
   h1 `"UK director buying reports"` matches the pre-render h1 exactly
   (`functions/reports/index.js:122`), and the standfirst is byte-identical to
   `index.js:123`.
3. **TrackingNotice** — **cut** — `reports.tsx:148` — nothing on this page describes a
   twelve-month window; the archive is explicitly month-by-month. The line is inherited
   from the sector/leaderboard pages where it earns its place. Cut it here *and* from
   `functions/reports/index.js:124` in the same change (parity rule).
4. **`LatestReport` lead sheet** — **tune** — `reports.tsx:219-268` — three fixes: drop
   the hand-rolled "Latest report" eyebrow (**D1**), reserve the StatTiles height so the
   button stops jumping (**B5**), and stop repeating the month in the list below (**B4**).
5. **`LatestReport` StatTiles** — **keep** — `reports.tsx:244-257` — none. Correct house
   object, `Committed` marked `primary`, `cols={4}` matches four stats.
6. **"What's in every report" definition list** — **keep** — `reports.tsx:161-177` — none.
   This is the best module in the family: it's the only writing that tells a cold Google
   visitor what "clusters" and "alpha" buy them, it's kept verbatim in step with
   `functions/reports/index.js:74-95`, and the `13rem` rail grid is house grammar.
7. **"Every report" ruled list** — **tune** — `reports.tsx:183-207` — `sorted.slice(1)`
   so the promoted month isn't printed twice, and guard the empty `<time>` (**B8**).
8. **Empty-market state** — **keep** — `reports.tsx:153-157` — none. Thin, but the route
   is noindexed on the only host that hits it. (The sitemap is the problem, not this.)
9. **AppCtaBand** — **keep** — via `reports.tsx:138-144`, `screenshotSlot: "recap"` —
   none. `recap` is a real slot with landed shots (`app-screenshots.ts:9-11`), and it's
   the screen the page is actually selling.
10. **Footnote** — **keep** — `reports.tsx:146` — none. Matches
    `functions/reports/index.js:137`.
11. **Loading skeleton** — **redesign** — `reports.tsx:149` — see **B6**.

### `/reports/:month`

12. **Shell header + crumbs** — **tune** — `report.tsx:197`, `:217` — crumbs are right
    (`Reports / June 2026`); the h1 drops the market the pre-render states (**B3**).
13. **Byline (notice slot)** — **keep** — `report.tsx:319-333` — none.
14. **Intro `Prose`** — **keep** — `report.tsx:221-225` — none. 15px/85% is the right
    weight for a document opening, and it mirrors `paras()` in the pre-render.
15. **`MonthlyMetrics variant="page"`** — **keep** — `monthly-metrics.tsx:87-150` — none.
    Five headline tiles including `distinct_directors` (added specifically so the page
    says what the pre-render says) plus a conditional returns row. The
    "median exactly 0 is not a measured flat month" guard at `:105` is right.
16. **Market backdrop** — **keep** — `report.tsx:231-235` — none.
17. **Report card** — **tune** — `report.tsx:339-398` — the module itself is the
    strongest thing on the site (misses published beside hits, both marks stated). One
    fix: the two return figures in a single row use different minus glyphs (**B9**).
18. **`SectorTable`** — **redesign** — `report.tsx:402-470` — see **D2**. A `min-w-[520px]`
    five-column table inside an `overflow-x-auto` is the one horizontal scroll in the
    family, and it states the identical field set that `StyleSplit` renders two sections
    later as mobile-safe ruled rows. Concrete replacement: extract the `StyleSplit` row
    (name + count, right-set value, MeterBar, "median return · median alpha" caption) as
    a shared row component; render the table at `sm` and up, the rows below it. Nothing
    is lost — the table already carries a MeterBar in its value cell, so the two shapes
    already agree on their vocabulary.
19. **`StyleSplit`** — **keep** — `report.tsx:475-519` — none. This is the archetype the
    sector table should copy.
20. **Featured buys (`MonthlyFeatured openFirst`)** — **tune** — `monthly-featured.tsx:71`,
    `:215` — the cards are the modal's chrome (`border-black/[0.06] bg-surface/40`,
    arc cards `bg-background/60`) sitting on a document page whose every other block uses
    the house sheet/tile tokens. `openFirst` is correct and important — collapsed cards
    would keep the richest prose out of the document entirely. Fix: give the card the
    `bg-sheet` / `border-hairline` sheet and the arc highlights the borderless
    `rounded-xl bg-black/[0.035]` tile, i.e. reuse `StatTiles`.
21. **Clusters (`MonthlyClusters variant="page"`)** — **keep** — `report.tsx:276-284` —
    none. The explanatory sentence, the company names under the tickers, and the links
    to `/company/:key` are all present and all mirrored in the pre-render
    (`[month].js:158-165`). The insider count is only a superscript badge, but the
    section's own opening sentence explains what it counts.
22. **Performance section** — **keep** — `report.tsx:286-295` — none. `defaultUniverse="every_buy"`
    deliberately overrides the server's flattering default (`monthly-performance.tsx:36-41`)
    — exactly the right editorial call for a published page, and `statVariant="tiles"`
    puts the three results in house tiles.
23. **"More reports" RelatedCards** — **keep** — `report.tsx:297-307`, `:556-584` — none.
    Newer/older neighbours rather than the full list is the right call past a dozen months.
24. **AppCtaBand** — **keep** — `report.tsx:198-204` — none.
25. **Footnote** — **keep** — `report.tsx:206` — none.
26. **Loading skeleton** — **tune** — `report.tsx:209-214` — see **B7**.
27. **Missing-report state** — **tune** — `report.tsx:143-187` — it renders a full dark
    conversion band on what is effectively a 404, and carries no footnote. Lower the ask:
    pass `cta={false}` or at minimum drop the screenshot (`media: "none"`). Also,
    `months` starts as `[]` (`report.tsx:86`) so the RelatedCards grid pops in after the
    "See the report archive" line has already rendered.

---

## Bugs (correctness / compliance / parity)

**B1 — the sitemap advertises a URL the pre-render noindexes (ddbx.us).**
`functions/sitemap.xml.js:70` hardcodes `/reports` into the `ddbx.us` route list, but
`functions/reports/index.js:158-161` returns `noindex(shell)` when the market has no
summaries — which is ddbx.us today, by that Function's own comment. The sitemap file
states the rule it is breaking, at `sitemap.xml.js:294-297`: *"advertising a URL we then
decline to index is the one thing the sitemap must not do."* The data needed to fix it is
already fetched — `reportEntries(host)` runs at `:306`. Move `/reports` out of the static
`ROUTES_BY_HOST` list and push it only when `reportEntries(host)` is non-empty.
Effort: **S**.

**B2 — pre-render and page round money differently.**
`functions/reports/index.js:43-54` and `[month].js:36-47` define `money()` as: ≥10m →
whole millions (`£37m`), 1–10m → one decimal, otherwise whole thousands (`£350k`).
`formatGbp(v, {compact:true})` (`src/lib/performance/format.ts:24-27`) always emits one
decimal (`£37.4m`, `£350.0k`). So the crawler and the reader are given different figures
for the same fact, in the hero facts line (`index.js:103` vs `reports.tsx:251`), the
sector table's Value column (`[month].js:110` vs `report.tsx:447`) and the style split
(`[month].js:126` vs `report.tsx:501`). The comment at `functions/reports/index.js:41`
asserts the opposite ("matching [month].js and the SPA's formatGbp") — that half of it is
false. Pick one rounding and delete the other. Effort: **S**.

**B3 — the report page's h1 drops the market; the pre-render's h1 and title disagree.**
Pre-render h1 (`[month].js:167`): `"June 2026 UK insider buying report"`. React h1
(`report.tsx:217`): `"June 2026 insider buying report"`. Separately, the pre-render's own
`<title>` at `[month].js:249` uses `"director"` for UK while its h1 uses `"insider"`, so
on ddbx.uk one document says both. (`shared/seo.js:367` and the Function title do agree —
both produce "June 2026 director buying report (UK)" — so the title is fine; it's the h1
that's adrift.) This is *not* the company-page h1 disagreement the rubric fences off.
Fix both sides in one change. Effort: **S**.

**B4 — the newest month is published twice on `/reports`.**
`reports.tsx:159` promotes `sorted[0]` into the lead sheet; `reports.tsx:184` then maps
*all* of `sorted`, including `sorted[0]`, so the same month name and the identical
headline string appear twice within one scroll. The pre-render repeats the duplication
(`functions/reports/index.js:127-130` lead, `:106-115` rows). At today's n=2 the archive
reads as a stutter. Fix: `sorted.slice(1)` on both sides, with the section aside adjusted
(or keep the row and label it "featured above"). Effort: **S**.

**B5 — the lead sheet reserves no space for its figures, so the CTA jumps.**
`reports.tsx:243` renders `metrics ? <StatTiles/> : null`, and `metrics` comes from a
second request fired only after the index resolves (`reports.tsx:115-128`, with
`setLatest(null)` on every change). The tiles arrive ~64px tall and shove the "Read the …
report" button down. The component's doc comment at `reports.tsx:216-218` claims the sheet
"is laid out so their arrival fills a gap rather than pushing the button down the page" —
it isn't. Fix: render `<SeoSkeleton className="mt-5" rows={4} variant="stat-tiles" />` in
the null branch (same 64px tile height, `skeletons.tsx:117-131`). Effort: **S**.

**B6 — `/reports` skeleton doesn't resemble the loaded page.**
`reports.tsx:149` passes `<SeoSkeleton rows={3} variant="ruled-list" />`. The loaded page
is a ~280px bordered sheet, then a 5-row `13rem`-rail definition list, then the archive
rows. Three ruled rows stand in for none of that, and `rows={3}` is a guess at a count
that is knowable for the two static blocks. Fix: compose
`stat-tiles` (in a sheet-shaped wrapper) + `doc-sections rows={5}` +
`ruled-list rows={2}`, or add a `report-index` variant. Effort: **M**.

**B7 — report page skeleton is in the wrong order and one row short.**
`report.tsx:209-214` renders `stat-tiles rows={5}` then `doc-sections rows={4}`, but the
loaded page opens with `Prose` (`report.tsx:221-225`) *before* the metrics, and the
metrics are two tile rows (5 headline + up to 4 returns, `monthly-metrics.tsx:141-147`).
Fix: lead with three prose bars, then the two tile rows. Effort: **S**.

**B8 — empty `<time>` element.**
`publishedLabel` returns `""` for an unparseable `created_at` (`reports.tsx:271-282`), but
the caller only checks `m.created_at` truthiness (`reports.tsx:193`), so a junk timestamp
renders `<time dateTime="…"></time>`. Guard on the formatted string. Effort: **S**.

**B9 — two different minus glyphs in one report-card row.**
`formatSignedPct` uses the real minus U+2212 (`format.ts:9`) → "−7.8% at publication";
`DeltaBadge` uses `value.toFixed(1)`'s hyphen-minus (`market-row.tsx:423`) → "▼ -7.8%".
They sit 10px apart at `report.tsx:380-391`. Fix in `DeltaBadge` so every call site
benefits. Effort: **S**.

---

## Design findings (non-bugs)

**D1 — two identical mono-brown eyebrows within one screenful on `/reports`.**
The shell stamps "MONTHLY REPORT" (`page-shell.tsx:113-119`), then `LatestReport`
hand-rolls the exact same class string for "LATEST REPORT" (`reports.tsx:233`). The
eyebrow is the family stamp; repeating it as a card label 90px lower turns it into
generic decoration. Replace the inner one with `chip("sm")` or a plain
`text-[11px] text-foreground/50` label.

**D2 — `SectorTable` is the family's only horizontal scroll, and duplicates `StyleSplit`'s
shape problem for no reason.** See verdict 18.

**D3 — `TrackingNotice` is an orphan claim on the archive.** See verdict 3.

**D4 — the featured cards bring the recap modal's chrome onto a document page.** See
verdict 20. `monthly-performance.tsx:87` (`bg-surface/40` capsule track) and `:191` have
the same tell, though they're less prominent.

**D5 — dark mode / tokens: clean.** No `emerald`/`rose` and no bracketed hexes anywhere in
`src/pages/report.tsx`, `src/pages/reports.tsx` or `src/components/monthly/*`.
`returnTextClass` (`monthly-utils.ts:33-37`) and `returnClass` (`report.tsx:522-526`) both
resolve to `text-positive`/`text-negative` with 0 and null held neutral. `MeterBar` and
`StatTiles` carry their `dark:` halves. Nothing to do.

**D6 — new-user read.** The archive index is genuinely good on this axis: "What's in every
report" defines clusters, alpha and the report card before the reader has to click. The
month page is weaker — "Median alpha" appears as a bare column header at `report.tsx:429`
and the section aside above it (`report.tsx:249`) does define it, so this is acceptable;
"every_buy" universe labelling comes from the server. No action.

---

## Ranked top-5 (effort: S/M/L)

1. **Stop the sitemap advertising `/reports` on ddbx.us while the pre-render noindexes it**
   — `functions/sitemap.xml.js:70`. The one finding with a direct crawl-quality cost, and
   the file already fetches the data needed to gate it. **(S)**
2. **Fix the `/reports` lead: de-duplicate the newest month and reserve the StatTiles
   height** — `reports.tsx:159/184/243`. Two small edits that remove a visible stutter and
   the page's only layout shift, plus a doc comment that currently describes behaviour the
   code doesn't have. Pre-render must change with it. **(S)**
3. **Unify money rounding across pre-render and page** — `functions/reports/{index,[month]}.js`
   vs `src/lib/performance/format.ts:24-27`. Same fact, two numbers, and a comment
   asserting they match. **(S)**
4. **Redesign `SectorTable` to the `StyleSplit` row shape below `sm`** — `report.tsx:402-470`.
   Kills the family's only horizontal scroll and collapses two shapes for one field set
   into one. **(M)**
5. **Make both skeletons mirror their loaded layouts** — `reports.tsx:149`,
   `report.tsx:209-214`. The shell convention is explicit that a skeleton matches
   structure, heights and row counts; neither route currently does. **(S/M)**

Runners-up, in order: the `/reports/:month` h1 market drop (**B3**, S), the featured-card
chrome (**D4**, M), cutting the orphan TrackingNotice (**D3**, S), the mixed minus glyph
(**B9**, S), quietening the missing-report page's CTA band (verdict 27, S).
