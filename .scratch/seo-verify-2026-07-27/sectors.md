# SEO verify round — SECTORS

## Family: Sector hubs
## Routes reviewed: `/sectors`, `/sectors/:slug` (both hosts: ddbx.uk → UK, ddbx.us → US)

## Files read

- `src/pages/sectors.tsx`
- `src/pages/sector.tsx`
- `src/components/sector-ui.tsx`
- `functions/sectors/index.js`
- `functions/sectors/[slug].js`
- `shared/sectors.js`
- `shared/dealings-feed.js`, `shared/prerender.js`
- `src/components/seo/{page-shell,skeletons,section,related-cards,stat-tiles,meter-bar,cta-copy,tracking-notice,seo-rail,app-cta-band}.tsx|ts`
- `functions/_middleware.js` (skip list), `functions/sitemap.xml.js` (`sectorEntries`)
- Cross-checks: `functions/reports/index.js`, `functions/biggest-buys/[[route]].js`, `src/pages/{biggest-buys,report,reports,learn,companies}.tsx`, `src/lib/company.ts`, `src/components/brokers/broker-aside.tsx`

---

## Prior claims — held / refuted

**[held] Family uses `SeoPageShell` with correct order and loading suppression** — `src/pages/sectors.tsx:94-136` and `src/pages/sector.tsx:186-228` both compose the shell; crumbs only on the detail page (`sector.tsx:187`), which is right for a top-level index. `loading={rows === null}` on both, and `page-shell.tsx:139-164` suppresses band + footnote while loading. **One exception**: the unknown-sector branch at `sector.tsx:157-169` returns a hand-rolled `<p>` inside a bare `DefaultLayout` — no shell, no eyebrow, no rail, no onward cards. `learn.tsx:178-182` handles the same "we haven't got that one" case *through* the shell, so this is the family's one remaining hand-rolled header.

**[refuted] Real `SeoSkeleton` matching layout (not a generic pulse block)** — the variant is real, the match is not.
- `/sectors`: `sectors.tsx:127` passes `<SeoSkeleton rows={11} variant="ruled-list" />`, but the loaded body is `StatTiles` (`sectors.tsx:156`, ~64px + a note line) → `SectorComparisonHeader` (`sector-ui.tsx:109`) → the 11-row list. The skeleton draws only the list, so ~110px of tiles and the column header pop in above the rows on arrival. `biggest-buys.tsx:301-305` gets this right for the identical shape (`stat-tiles` + board), which makes `/sectors` the odd one out rather than a judgement call.
- `/sectors/:slug`: `sector.tsx:216-222` stacks `stat-tiles(5)` + `ruled-list(20)` + `ruled-list(12)` = ~2,300px of skeleton for a page that, below the bar-clearing minimum of 5 buys, may render 3 company rows and 5 filings. `TOP_COMPANIES`/`RECENT_BUYS` are caps, not counts — passing them as "the real row count" inverts the convention's intent. It also omits the `leadSentence` paragraph (`sector.tsx:245`) and both `SeoSection` headings, so two ruled lists render as one undifferentiated 32-row stack and then split into two titled sections.

**[held] Eyebrow present and family-correct** — `"Sector hub"` on both (`sectors.tsx:102`, `sector.tsx:195`), rendered as the mono brown kicker by `page-shell.tsx:113-119`.

**[held, with a caveat] Terminal `AppCtaBand`, non-converged family copy** — placement is structural now (shell owns it), so mid-page is impossible. `sectorCta()` (`cta-copy.ts:39-49`) does not converge with `learnCta`/`leaderboardCta`/`reportsCta` — its secondary claim is the live feed, which is distinct. Caveat: `body` is a single constant for the index *and* all 11 sector pages; only the headline interpolates `sector`. A reader who lands on two sector pages reads the same paragraph twice. That is within-family repetition, which the stated rule doesn't forbid, but it is the cheapest available differentiation and it's unused.

**[held] `RelatedCards` instead of bare link lists** — `sectors.tsx:203-236` ("Where to look next", 4 cols, market-gated) and `sector.tsx:363-372` ("Other sectors", 3 cols, ranked by value with a figure in each description). No bare underlined lists remain; the two inline links that survive (`sectors.tsx:142-148`, `sector.tsx:234-236`) are prose links inside empty-state sentences, which is the correct shape for that.

**[refuted] Pre-render ↔ React parity (no inversions)** — three distinct gaps, one of them a straight inversion of exactly the kind the last round claimed to have removed. See Bugs 1, 2 and 6.

**[held] Sector pages handle the 1000-row cap / truncation messaging** — `sectors.tsx:58`, `sector.tsx:85`, `functions/sectors/index.js:114` and `functions/sectors/[slug].js:129` all go through `fetchDealingsWindow`, and all four surface `complete: false` in matching words. **[refuted] for the sitemap**: `functions/sitemap.xml.js:188` still issues a single `?since=…&limit=1000` request and rolls that up — see Bug 3.

**[held] ddbx.us does not sell UK brokers in the rail** — `sectors.tsx:90` / `sector.tsx:183` pass `marketId={market.id === "US" ? "us" : "uk"}`, and `seo-rail.tsx:48-62` only returns `BrokerAside` for `"uk"`.

**[held, incidentally] `BrokerDisclosure` visible wherever affiliate links appear** — the UK sector rail is `BrokerAside`, which pins a `BrokerDisclosure` at `broker-aside.tsx:115-117`. No compliance gap introduced by the sector pages.

**[held] Index pre-render for `/sectors`** — `functions/sectors/index.js` owns the whole `<head>` via `renderInto`, and `/sectors` + `/sectors/:slug` are both on the middleware skip list (`functions/_middleware.js:99-100`).

*Not applicable to this family:* brokers FCA/ASA on `/brokers*`, leaderboard "now worth" baseline, learn jurisdiction, report AI byline.

---

## Per-module verdicts

### `/sectors`

1. **`SeoRail`** — **keep** — `sectors.tsx:89-93`. Market-branched correctly, `placement="sectors_rail"` distinct from `sector_rail`. No fix.
2. **Shell header (eyebrow / h1 / standfirst)** — **tune** — `sectors.tsx:128-135`. The standfirst uses the default `"body"` size (14px `foreground/70`), while the pre-render sets it at 16px (`functions/sectors/index.js:82`) and every other thesis-opening SEO page passes `standfirstSize="lede"` (`learn.tsx:153`, `report.tsx:216`, `broker-category.tsx:158`). Fix: add `standfirstSize="lede"`.
3. **Notice (`TrackingNotice` + truncation)** — **keep** — `sectors.tsx:114-126`. Correctly outside the loading boundary, correctly worded, and the truncation line matches the pre-render verbatim. No fix.
4. **Loading skeleton** — **tune** — `sectors.tsx:127`. Add the tiles: `<><SeoSkeleton rows={4} variant="stat-tiles" /><SeoSkeleton rows={11} variant="ruled-list" /></>`, mirroring `biggest-buys.tsx:301-305`.
5. **Empty state** — **keep** — `sectors.tsx:137-150`. Names the bar (`MIN_BUYS`), and routes to two live alternatives in prose. No fix. (Note it is also reachable on an API failure — that's Bug 4, and the fix belongs in the fetch handler, not here.)
6. **`StatTiles` totals + median-alpha note** — **keep** — `sectors.tsx:156-171`. `primary` on value, and the note pre-explains the column heading three lines below it rather than 900px away in the footnote. Best version of itself.
7. **`SectorComparisonHeader`** — **keep** — `sector-ui.tsx:109-119`. Shares `COMPARISON_GRID` with the row so a column can't drift from its heading; hidden below `sm` where the row restacks. No fix.
8. **Ranked rows (`SectorComparisonRow`, `MeterBar`, `DeltaBadge`)** — **keep** — `sector-ui.tsx:121-190`. Speaks the house vocabulary now: `DeltaBadge` for the alpha, `MeterBar` scaled to the page maximum, `text-positive`/`text-negative` via `alphaClass` (`sector-ui.tsx:69-82`) rather than local emerald/rose, `bg-risk` for the concentration dot. Padding sits on the `<Link>`, so the hover well and tap target cover the row.
9. **Concentration caveat copy** — **tune** — `sector-ui.tsx:183-185` and `functions/sectors/index.js:77`. Both render `topCompany`, which `sectorRollup` keys by **ticker** (`shared/sectors.js:313`), so the sentence reads "35% of that value is RIO alone." A bare ticker is jargon to a cold Google landing; on `/sectors/:slug` the company name is already in scope. Fix: carry `topCompanyName` alongside `topCompany` in the rollup and print the cleaned name with the ticker in a pill.
10. **"Where to look next" `RelatedCards`** — **keep** — `sectors.tsx:199-237`. Descriptions say what's behind each door, and the monthly-reports card is gated to UK so the US host doesn't promise a report it doesn't publish (`sectors.tsx:219-228`).
11. **`AppCtaBand`** — **keep** — via `sectors.tsx:95-101`. Terminal, `screenshotSlot="analysis"`, GA label distinct.
12. **Footnote** — **tune** — `sectors.tsx:103-112`. Restates the median-alpha methodology in different words from the pre-render and from `/sectors/:slug`: it drops "the first price a reader could have paid" and says "the middle result once every buy … is measured against the market" where the other three say "the middle buy's return against the market, measured from the disclosure-day close". Same facts, three wordings. Fix: reuse the `/sectors/:slug` sentence (`sector.tsx:252-255` = `functions/sectors/index.js:94`) verbatim.
13. **Pre-render `functions/sectors/index.js`** — **tune** — see Bugs 1, 2. Structure, ordering, noindex posture (`:106`, `:111`, `:129`) and canonical are all correct.

### `/sectors/:slug`

14. **Unknown-sector fallback** — **redesign** — `sector.tsx:157-169`. Replace the bare `DefaultLayout` + `<p>` with the shell, as `learn.tsx:178-182` already does: `eyebrow="Sector hub"`, an h1 along the lines of "We don't track that sector", and `RelatedCards` over `SECTORS` as the body. Costs ~10 lines and turns a dead end into the family's onward grid. (`noindex` is already applied at `functions/sectors/[slug].js:118`, so this is purely a reader fix.)
15. **Shell header (crumbs / eyebrow / h1)** — **keep** — `sector.tsx:186-195, 224-228`. Crumbs match the pre-render's `BreadcrumbList` (`functions/sectors/[slug].js:157-160`); h1 matches the pre-render h1 (`:82`) exactly.
16. **Standfirst (`sector.framing`)** — **tune** — `sector.tsx:223`. Same `standfirstSize` issue as module 2, and worse here: `framing` is the document's editorial thesis and renders in the same 14px grey as the `leadSentence` paragraph directly beneath it (`sector.tsx:245-247`, `R.body`). Two identical-weight grey paragraphs plus the notice stack under the h1 with no hierarchy. Fix: `standfirstSize="lede"`.
17. **Notice** — **keep** — `sector.tsx:205-215`. Matches the index and the pre-render.
18. **Loading skeleton** — **tune** — `sector.tsx:216-222`. Cap the list stand-ins well below `TOP_COMPANIES`/`RECENT_BUYS` (8 and 6 read closer to the median sector), and add the standfirst/lead paragraph bars so the tiles aren't the first thing under the h1 in the skeleton and the third thing on the loaded page.
19. **Below-bar state** — **keep** — `sector.tsx:230-238`. Honest, names the threshold, links onward. Matches the pre-render's `noindex` at `functions/sectors/[slug].js:146`.
20. **`leadSentence` paragraph** — **keep** — `sector.tsx:245-247`. This is the parity fix from the last round working exactly as intended: one `shared/sectors.js:204` function produces the meta description *and* the visible opening paragraph.
21. **`SectorFigures`** — **keep** — `sector-ui.tsx:198-260`. Five tiles at `cols={5}` (no ragged last tile), `primary` on value, tone on median alpha via the shared tokens, market-correct label ("Directors"/"Insiders"), and both caveat notes — concentration and the alpha sample size — carried in `note`. Both notes have matching pre-render lines (`functions/sectors/[slug].js:86, 89`).
22. **Methodology micro-note** — **keep** — `sector.tsx:251-256`. Verbatim match with the pre-render footnote.
23. **"Companies insiders backed"** — **keep** — `sector.tsx:258-299`. `CompanyLogo` + `TickerPill` + `MeterBar` scaled to the sector's own leader. `companyPath()` (`src/lib/company.ts:30`) and the pre-render's `/company/${displayTicker(t).toLowerCase()}` (`functions/sectors/[slug].js:70`) produce the same URL — verified against `tickerToSlug` (`company.ts:13-17`).
24. **"Recent buys"** — **keep** — `sector.tsx:301-355`. Insider names appear here and deliberately not in the pre-render, per the locked constraint. `ClusterChip`, `TickerPill`, disclosure-date formatting and `alphaClass` all house vocabulary. Note the alpha here is per-filing and read from `live_performance` as a percent (`sector.tsx:346-348` divides by 100 before `alphaClass`/`signedPct`), consistent with `toRatio` in `shared/sectors.js:260`.
25. **"Other sectors" `RelatedCards`** — **tune** — `sector.tsx:359-373`. Renders all ten siblings including ones below `MIN_BUYS`, whose pages are stubs and are `noindex`ed. A card reading "£3m across 4 buys" is an unqualified invitation to the "not enough to draw anything from" page. Fix: append " — not enough to publish" to the description (or sort the below-bar ones last) using `sectorMeetsBar(agg)`, which is already imported at `sector.tsx:25`.
26. **`LogoDevAttribution`** — **move** — `sector.tsx:375`. As a child it renders *above* the dark band, so 11px attribution small print sits between the onward cards and the conversion ask. The shell's rule is that small print is the caption of the whole page, below the band. `companies.tsx:135-138` solves the same problem by inlining the Logo.dev link into the `footnote` prop (the attribution component is a `<div>` and the footnote is a `<p>`, hence the inline form). Do the same here.
27. **`AppCtaBand` + footnote** — **keep** — `sector.tsx:188-203`. GA label carries the slug, so per-sector conversion is separable.
28. **Pre-render `functions/sectors/[slug].js`** — **tune** — see Bugs 2, 5.

### Shared

29. **`shared/sectors.js` aggregation** — **keep** — the disclosure-anchored alpha with a trade-date fallback (`:321-334`), the percent→ratio conversion (`:260`), `alphaCount` as a published sample size (`:357`), and concentration share (`:345-363`) are all correct and well argued in place. `formatMoney` has one edge (Bug 7).
30. **`shared/dealings-feed.js`** — **keep** for this family's purposes — the paging, de-dupe and `complete` reporting are sound. One cross-family note: the window filter at `:102-103` is applied on `trade_date` while the API `since`/`before` cursors run on `disclosed_date`, so a buy traded before the window but disclosed inside it is fetched and then dropped. Not a sectors bug per se; flagging because every figure on these pages depends on it.
31. **`functions/sitemap.xml.js` `sectorEntries`** — **redesign** — `:181-205`. See Bug 3.

---

## Bugs (correctness / compliance / parity)

**1. Parity inversion: `indexLeadSentence` is crawler-only.**
`functions/sectors/index.js:83` renders `indexLeadSentence(rows, market)` as a visible paragraph and reuses it as the meta description (`:138`). `src/pages/sectors.tsx` never imports it (imports at `:14-20`) and renders nothing equivalent — the "led by industrials at £37m" framing exists only for crawlers. This is precisely the class of defect the last round fixed on `/sectors/:slug` (`shared/sectors.js:202-203` documents that fix) and left unfixed one level up. Fix: import `indexLeadSentence` and render it as a paragraph above `StatTiles`, exactly as `sector.tsx:245` does with `leadSentence`.

**2. Both sector pre-renders omit the tracking-since caveat that the React pages carry.**
`TrackingNotice` ("ddbx started recording disclosures in March 2026, so periods described as a full year cover only the filings since then") renders on both React pages (`sectors.tsx:116`, `sector.tsx:207`). Neither `functions/sectors/index.js` nor `functions/sectors/[slug].js` contains that line — while `functions/reports/index.js:124` and `functions/biggest-buys/[[route]].js:105` both do. So the sectors family is the only look-back family whose crawler-visible document asserts "the last twelve months" with no disclosure that only ~five months are covered, and it is that text Google indexes and may surface. Fix: add the sentence to both pre-renders, next to the existing footnote paragraph. Because `TRACKING_SINCE_LABEL` lives in a `.tsx` the Functions can't import, move the constant into `shared/` (or a small `shared/tracking.js`) rather than hand-copying the string a fourth time.

**3. The sitemap advertises a sector set derived from a truncated feed.**
`functions/sitemap.xml.js:188` fetches `?since=…&limit=1000` in a single request and rolls that up, while the page, the pre-render and the `noindex` decision all go through `fetchDealingsWindow`. The comment at `:179-180` claims "same threshold the page and its pre-render apply, so a sector is never advertised here and withheld there" — that invariant holds only while the window fits in one page, and `shared/sectors.js:384-389` and `shared/dealings-feed.js:4-10` both state UK crosses 1000 during 2026. Past that point the sitemap rolls up a partial, disclosure-date-truncated feed: a quiet sector can drop out of the sitemap while its page is live and indexable, and (if truncation removes buys from a busier sector) the totals the two derive diverge. Fix: call `fetchDealingsWindow` here too, and skip emitting sector entries at all when `complete === false` rather than emitting a half-computed set.

**4. An API failure renders as a factual claim that no sectors are active.**
`sectors.tsx:66` and `sector.tsx:93` both do `.catch(() => live && setRows([]))`, leaving `complete` at its `true` default. The index then renders "No sector has reached 5 disclosed purchases in the last twelve months yet" (`sectors.tsx:138-150`) and the detail page renders "Fewer than 5 disclosed purchases in this sector over the last twelve months" (`sector.tsx:231-238`). Both are assertions about the data, produced by a network failure. (The non-`ok` path is better: `fetchDealingsWindow` returns `complete: false`, so the truncation notice at least appears alongside.) Fix: a third state — `setComplete(false)` in the `catch`, and gate the empty-state copy on `complete` so a failure reads "We couldn't load the filings" rather than "there aren't any".

**5. `/sectors/:slug` pre-render can emit "Top 0 by value bought".**
`functions/sectors/[slug].js:96` prints `Top ${ranked.length} by value bought`; React prints `Top ${Math.min(TOP_COMPANIES, companies.length)}` (`sector.tsx:259`). Both go to zero when every row in a sector lacks a ticker (`shared/sectors.js:311` and `sector.tsx:125` both skip tickerless rows while still counting them in `buys`). The pre-render at least suppresses the whole table when `companies` is empty (`:93-103`); React renders the heading over an empty `<ul>`. Low likelihood, but it's a divergence and a visible "Top 0". Fix: guard the React section on `companies.length > 0`.

**6. Footnote methodology is worded three ways across one family.**
`sectors.tsx:104-111` vs `sector.tsx:251-256` vs `functions/sectors/index.js:94` / `[slug].js:104`. The facts agree; only the index React copy drops "the first price a reader could have paid". Not a parity violation under the locked rule (no fact is missing), but it's the same claim written twice, and the shared-copy discipline the family otherwise keeps (`money`, `signedPct`, `leadSentence` all centralised in `shared/sectors.js`) argues for one string.

**7. `formatMoney` renders sub-£1k values as "£0k".**
`shared/sectors.js:183`: `${symbol}${Math.round(n / 1000)}k`. Sector totals won't hit this, but a single small filing can: a £480 purchase in the `/sectors/:slug` companies list (`sector.tsx:294`) or a recent-buys row (`sector.tsx:343`) prints "£0k". Fix: fall through to a plain rounded figure below ~£10k.

---

## Ranked top-5 (effort: S/M/L)

1. **Render `indexLeadSentence` on `/sectors`** (Bug 1) — **S**. The one true parity inversion left in the family, and the fix is an import plus a paragraph above `StatTiles`.
2. **Add the tracking-since caveat to both sector pre-renders** (Bug 2) — **S**. Sectors is the only look-back family missing it; the indexed document currently overstates its own coverage. Move `TRACKING_SINCE_LABEL` into `shared/` while doing it.
3. **Point `sectorEntries` at `fetchDealingsWindow`** (Bug 3) — **S/M**. The stated "never advertised here and withheld there" invariant is already false-in-waiting, and it fails silently and only in production.
4. **Fix the two skeletons** (modules 4 and 18) — **S**. Add `stat-tiles` to the `/sectors` skeleton (copy `biggest-buys.tsx:301-305`) and stop passing caps as row counts on `/sectors/:slug`.
5. **Distinguish "we couldn't load it" from "there's nothing here"** (Bug 4) — **S/M**. Both routes currently turn a network failure into an editorial claim.

*Just below the line:* shell the unknown-sector fallback (module 14, **S**), move `LogoDevAttribution` into the footnote (module 26, **S**), mark below-bar cards in "Other sectors" (module 25, **S**), and `standfirstSize="lede"` on both pages (modules 2, 16, **S**).
