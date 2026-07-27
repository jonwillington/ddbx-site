# Family: BROKERS

## Routes reviewed
- `/brokers` (+ legacy `/compare`) — `src/pages/compare.tsx`
- `/brokers/:slug` — `src/pages/broker-detail.tsx`
- `/brokers/best-for/:category` — `src/pages/broker-category.tsx`
- `/brokers/compare/:pair` — `src/pages/broker-comparison.tsx`

## Files read
`src/pages/compare.tsx`, `src/pages/broker-detail.tsx`, `src/pages/broker-category.tsx`,
`src/pages/broker-comparison.tsx`, `src/components/brokers/broker-page-ui.tsx`,
`src/components/brokers/broker-aside.tsx`, `src/components/brokers/broker-inline.tsx`,
`src/components/brokers/broker-ui.tsx`, `src/components/brokers/broker-reviews-promo.tsx`,
`src/components/seo/{page-shell,app-cta-band,cta-copy,section,related-cards,skeletons,seo-rail}.tsx`,
`src/lib/brokers.ts`, `src/lib/site-nav.ts`, `src/layouts/default.tsx` (mobile CTA block),
`functions/brokers/best-for/[category].js`, `functions/brokers/compare/[pair].js`,
`functions/_middleware.js`, `functions/sitemap.xml.js`, `shared/broker-categories.js`,
`shared/broker-comparisons.js`, `shared/seo.js` (broker branches), `src/App.tsx` (routes),
plus `git show 2048451` for the four broker diffs.

---

### Prior claims — held / refuted

- **[held] BrokerDisclosure unconditional on `/brokers`** — `compare.tsx:255` renders
  `<BrokerDisclosure className="mb-5" />` in the document, outside the `brokers &&`
  branch and outside the error branch, so it is on screen before the grid, the mobile
  cards, or any `BrokerVisitLink`. Confirmed new in `2048451` (the diff adds it; the
  old header had none).
- **[held] BrokerDisclosure unconditional on `/brokers/:slug`** — `broker-detail.tsx:220`,
  in the flow above the review sheet, i.e. above the mobile visit bar and the sticky
  panel. The loading and not-found branches render no affiliate links, so the gap
  there is harmless.
- **[held, with one exception] Disclosure wherever affiliate links appear** — the two
  guides put it in the shell's `notice` slot, which renders *above* the loading
  boundary (`broker-category.tsx:155`, `broker-comparison.tsx:258`, shell
  `page-shell.tsx:137-139`), so it can never arrive after the CTAs. The rail carries
  its own (`broker-aside.tsx:117`, `:272`). Exception: `BrokerInline` (mobile company
  pages) hand-rolls a shorter notice — `"Ad · Capital at risk. We may earn a
  commission."` (`broker-inline.tsx:98-101`) — dropping the "doesn't affect what you
  pay, or how we rank" clause that `BROKER_DISCLOSURE` carries everywhere else. It is
  a disclosure, just not *the* disclosure.
- **[held] ASA-risky category intros rewritten** — `git show 2048451 -- shared/broker-categories.js`
  confirms both edits, and both now describe what the page shows: the ISA intro no
  longer promises a pot-size cost model that doesn't exist on the category page
  (`broker-categories.js:129`), and the lowest-cost intro now says outright "The order
  below is editorial, not a cost ranking" (`:212`) instead of claiming the ordering is
  by modelled total cost. The category prose still carries no authored numbers, and
  `whyWeRank()` (`:275-280`) is substantiable as written.
- **[held] Family uses `SeoPageShell` with correct order and loading suppression** —
  for the two guide routes only (`broker-category.tsx:140-161`,
  `broker-comparison.tsx:245-264`): crumbs → eyebrow → h1 → standfirst → notice →
  children, `loading={brokers === null}`, band+footnote suppressed while loading.
- **[REFUTED] Family uses the shell** — `/brokers` still hand-rolls its header
  (`compare.tsx:238-250`), reproducing the shell's eyebrow and h1 class strings
  verbatim from `page-shell.tsx:113-123`, with no crumbs. `/brokers/:slug` also
  hand-rolls (`broker-detail.tsx:197-221`) and has **no eyebrow at all**. Two of four
  routes in the family are off the shell.
- **[REFUTED] Real skeleton matching layout** — true for the guides
  (`broker-category.tsx:439-486`, `broker-comparison.tsx:621-646`: real rail-grid
  geometry, real row count, house `Skeleton` primitive), but `/brokers`
  (`compare.tsx:589-602`) and `/brokers/:slug` (`broker-detail.tsx:97-112`) are still
  generic `animate-pulse` blocks on `bg-surface` / `bg-foreground/10` — the two
  off-house tints the rebuild was supposed to eliminate. See Bug 4 for the specific
  mismatch on `/brokers`.
- **[held] Eyebrow present and family-correct** — "Broker guide" on all three
  guide/hub routes (`compare.tsx:240`, `broker-category.tsx:151`,
  `broker-comparison.tsx:256`). Missing on `/brokers/:slug`.
- **[held] Terminal `AppCtaBand`, non-converged copy, quiet on guides** —
  `brokerGuideCta` (`cta-copy.ts:85-88`) is the only family body that leads on
  "whichever broker you pick", makes no performance claim, and both call sites pass
  `media: "none"` (`broker-category.tsx:149`, `broker-comparison.tsx:254`). The band
  is terminal in both cases (shell renders it after `children`), with
  `BrokerComplianceNote` below it in a separate ruled block
  (`broker-category.tsx:282-284`, `broker-comparison.tsx:390-392`). `/brokers` has no
  band, which the shell's own doc sanctions (`page-shell.tsx:70-72`).
- **[held on guides / REFUTED on the review]** `RelatedCards` — guides use it for both
  onward blocks (`broker-category.tsx:253`, `:266`; `broker-comparison.tsx:363`, `:375`).
  `/brokers/:slug` still ships a bare "More reviews" link list
  (`broker-detail.tsx:283-298`) and `/brokers` ships no onward links to the guides at all.
- **[held] Pre-render ↔ React parity (no inversions)** — every fact in
  `functions/brokers/best-for/[category].js` is on the React page: the Ad line (`:83`
  vs `notice`), all `intro` paragraphs (`:71-76` vs standfirst + `:162-166`),
  `whyWeRank` (`:86-91` vs `:172-180`), rank + name + pick line + the three charges
  per broker (`:63-67` vs `RankedBroker` + `FeeTiles`), `whatToLookFor` (`:78-80` vs
  `:237-249`). Same for the head-to-head: `shortVerdict`, crossover sentence,
  `whyThisPair`, differences table and `verdict` are all on both sides
  (`[pair].js:95-114` vs `broker-comparison.tsx:268-357`), and the crossover figure
  formats identically on both (`£${pot.toLocaleString("en-GB")}` vs `fmtMoneyRound`,
  which is the same string for an already-rounded integer). No fact reaches the
  crawler that the reader doesn't get. One cosmetic disagreement in Bug 6.
- **[n/a to this family]** leaderboard baseline, learn jurisdiction, sector row cap,
  report byline, index pre-renders. One adjacent item: **ddbx.us does not sell UK
  brokers in the rail** holds by construction for this family — `SeoRail` branches on
  `marketId` (`seo-rail.tsx:48-62`) and every broker route is UK-only and canonicalises
  to ddbx.uk (`shared/seo.js:499-503`).

---

### Per-module verdicts

**`/brokers` — `src/pages/compare.tsx`**

1. Header cluster (eyebrow/h1/standfirst) — **REDESIGN** — `compare.tsx:238-250` — move
   onto `SeoPageShell` with `cta={false}`, `width="wide"`, `notice={<BrokerDisclosure />}`;
   the current block is a copy-paste of the shell's own markup and will drift from it.
2. `BrokerDisclosure` — **KEEP** — `compare.tsx:255`.
3. Filter bar (search + `ChipSelect` + chips + Reset) — **KEEP** — `compare.tsx:283-336`.
   Best version of itself; speaks the deals-screen grammar deliberately.
4. "N of M platforms" count — **KEEP** — `compare.tsx:338-340`.
5. Desktop comparison grid — **TUNE** — `compare.tsx:344` — it sits on `bg-white`
   while the whole rest of the tree uses `R.sheet` (`bg-sheet`), and
   `broker-detail.tsx:44-47` states white is reserved for the raised buy panel. Swap
   to `bg-sheet` so the hub matches the publication it heads.
6. Top picks (mobile only) — **KEEP** — `compare.tsx:267-278`.
7. Mobile broker cards — **TUNE** — `compare.tsx:528-578` — every other broker surface
   shows a live `OfferBadge`; the mobile card is the only one that hides the sign-up
   offer, which is the click-worthy fact on a phone.
8. Loading skeleton — **REDESIGN** — `compare.tsx:589-602` — see Bug 4.
9. Onward links to the guides — **MISSING (add)** — the hub links to 19 reviews and to
   nothing else. `/brokers/best-for/*` and `/brokers/compare/*` are reachable only from
   the footer and from each other. A `RelatedCards` block ("Guides", "Head to head")
   under the grid is the cheapest crawl-graph win in the family.
10. `BrokerComplianceNote` — **KEEP** — `compare.tsx:481`.
11. No `AppCtaBand` — **KEEP** — sanctioned by `page-shell.tsx:70-72`; the affiliate
    grid owns the page end.

**`/brokers/:slug` — `src/pages/broker-detail.tsx`**

12. Breadcrumb + "Updated" line — **TUNE** — `broker-detail.tsx:197-214` — no family
    eyebrow; add "Broker review" (or move the whole header onto the shell).
13. `BrokerDisclosure` — **KEEP** — `broker-detail.tsx:220`.
14. `ReviewHeader` + fact tiles + ratings line — **KEEP** — `:426-482`. House tile
    vocabulary, attributed scores, no composite. Best version of itself.
15. Verdict / app shots / cost / platform / offer / FAQ sections — **KEEP** —
    `:236-279`. The cost section (`:581-671`) with the pot toggle and `CostBars` is
    the strongest module in the family.
16. "More reviews" — **REDESIGN** — `:281-300` — the last bare link list in the family.
    Make it `RelatedCards` and include the two or three guides this platform actually
    appears in (`CATEGORIES.filter(c => b.badges.includes(c.badge))`), which is also
    the missing hub→guide link in the other direction.
17. Loading skeleton — **REDESIGN** — `:97-112` — hand-rolled `animate-pulse` on
    `bg-foreground/10`; should use the house `Skeleton` primitive at the real geometry
    (sheet + rail grid), the way the guides now do.
18. Sticky buy panel / mobile visit bar — **KEEP** — `:354-415`, `:812-832`.
19. FAQ JSON-LD — **TUNE** — `:272-277` — client-only, on a route with no pre-render
    (Bug 2). Emit it from a Function alongside the review body.

**`/brokers/best-for/:category` — `src/pages/broker-category.tsx`**

20. Shell + crumbs + eyebrow + standfirst + notice — **KEEP** — `:140-161`.
21. Trailing intro paragraphs — **KEEP** — `:162-166`.
22. "Why we rank platforms" — **KEEP** — `:171-181`. Correctly suppressed at zero
    brokers rather than rendering "we hold 0 platforms".
23. "Our ranking" (`RankedBroker` + badge chip + `FeeTiles` + `VerifiedNote`) —
    **KEEP** — `:207-229`, `:297-363`. The badge-on-every-row substantiation is the
    right ASA posture and shouldn't be softened.
24. "Side by side" `ComparisonTable` — **KEEP** — `:231-233`, `:375-433`. Sticky first
    column, per-category columns, weight only on directly-rankable cells.
25. "What to look for" — **KEEP** — `:237-249`.
26. "Head to head" / "Other guides" `RelatedCards` — **KEEP** — `:251-276`.
27. `CategorySkeleton` — **TUNE** — `:439-486` — draws four ruled sections for a page
    that renders six, and takes its row count from `category.order.length` (editorial)
    rather than from what will actually be eligible. Both are small under-draws;
    `rows` is the best estimate available pre-fetch, so only the section count is
    worth fixing.
28. Terminal band (`brokerGuideCta`, `media:"none"`) — **KEEP** — `:145-150`.
29. `BrokerComplianceNote` below the band — **KEEP** — `:282-284`.
30. `BrokerAside` rail with page-local picks — **KEEP except one bug** — `:131-138`;
    the "All platforms" list inside it is Bug 1.

**`/brokers/compare/:pair` — `src/pages/broker-comparison.tsx`**

31. Shell + notice — **KEEP** — `:245-264`.
32. "Our verdict" answer tile + jump link — **KEEP** — `:268-285`. Right module in the
    right place: the answer above the fold, the argument below.
33. Pair columns (`BrokerColumn`) — **KEEP** — `:307-310`, `:400-429`.
34. `CrossoverCallout` — **KEEP** — `:312`, `:437-462`. Genuinely computed, clearly
    fenced off from the promo tiles. See Bug 7 for the prose that depends on it.
35. "Why this pair" / "Where they differ" / "What each costs a year" / "Pros and cons"
    / "Which should you pick" — **KEEP** — `:314-357`. Document order (facts →
    arithmetic → argument → verdict) is correct.
36. "More comparisons" → "Guides these two appear in" — **TUNE** — `:361-384` — see
    Bug 5 (orphan heading, and a wrong heading in the no-pair branch).
37. `ComparisonSkeleton` — **KEEP** — `:621-646`.
38. Terminal band + compliance note — **KEEP** — `:250-255`, `:390-392`.

---

### Bugs (correctness / compliance / parity)

1. **Expired sign-up offers are advertised in the rail's "All platforms" list.**
   `broker-aside.tsx:256` gates on `b.offer_headline &&` where every other offer
   render on the site goes through `isOfferLive()` — including the pick cards eight
   lines above it (`:218`) and the identical list in `BrokerNavAside` (`:100`).
   `isOfferLive` exists precisely because "advertising a dead offer on a page built to
   rank for commercial queries is an ASA problem" (`src/lib/brokers.ts:104-116`). This
   rail renders with `showAll` on `/brokers/best-for/*`, `/brokers/compare/*`, the
   company pages and every UK `SeoRail` page — i.e. the widest offer surface on the
   site is the one that skips the predicate. One-word fix.
2. **`/brokers/:slug` has no pre-render Function.** `functions/brokers/` contains only
   `best-for/` and `compare/`, and the middleware skip list (`_middleware.js:91-107`)
   lists both but not `/brokers/:slug` — so the review pages get a rewritten `<head>`
   and an empty `#root`. Those are 19 of the ~30 broker URLs in the sitemap
   (`sitemap.xml.js:105-108`), they carry the FAQ schema, the fee schedule and the
   verdict, and the two page types one level *deeper* under the same prefix are
   pre-rendered. Whatever justified the guides' Functions applies at least as strongly
   here.
3. **The mobile app CTA competes with the affiliate ask on three of four routes.**
   `DefaultLayout` floats a persistent "Start your free trial" bar on mobile
   (`default.tsx:616-664`) unless `hideMobileCta` is passed. `broker-detail.tsx:192`
   passes it; `compare.tsx:235`, `broker-category.tsx:127` and
   `broker-comparison.tsx:232` do not. So on a phone, `RankedBroker`'s full-width
   "Visit X" button (`broker-category.tsx:356-361`) sits under a pinned app CTA —
   exactly the two-asks-in-one-viewport case that `media: "none"` was chosen to avoid
   on the desktop band (`app-cta-band.tsx:60-63`). The desktop half of the constraint
   is enforced carefully and the mobile half is unenforced.
4. **`/brokers` skeleton doesn't match the loaded page.** `compare.tsx:589-602` draws
   two 128px pick cards, one 40px bar and six 56px rows. The pick cards are
   `lg:hidden` in the real layout (`:268`), so on desktop the skeleton shows two
   objects that never appear; the grid loads ~19 rows at ~76px each behind an
   80px-tall filter bar. Net effect is a redraw, which is the behaviour the skeleton
   rebuild set out to kill.
5. **Orphan / mislabelled subheading on the head-to-head.**
   `broker-comparison.tsx:374` renders the `"Guides these two appear in"` paragraph
   unconditionally, but `RelatedCards` returns `null` on an empty list
   (`related-cards.tsx:38`) — so a pair whose platforms carry no category badge gets a
   heading with nothing under it. In the `!pair` branch the same heading sits above
   `CATEGORIES.slice(0, 3)` (`:229`), which are not guides "these two" appear in.
6. **`BreadcrumbList` disagrees with the visible breadcrumb.** The pre-renders emit
   `"UK platforms"` as the first crumb (`[category].js:137`, `[pair].js:146`) while
   the hydrated page shows `"Broker reviews"` (`broker-category.tsx:142`,
   `broker-comparison.tsx:247`). Structured-data guidance is that the markup matches
   what the reader sees; pick one string in `shared/` and use it on both sides.
7. **Authored verdict copy depends on a conditionally-rendered figure.**
   `broker-comparisons.js:83` ("above the crossover figure on this page") and `:85`
   ("the crossover figure above is the answer") are unconditional prose, but
   `CrossoverCallout` renders nothing unless exactly one side is flat-fee and the
   other percentage (`broker-comparisons.js:184-209`, used at
   `broker-comparison.tsx:312`). It resolves today for AJ Bell vs ii, but a fee-model
   change in ddbx-data silently turns the verdict into a reference to nothing. Either
   fall back to a sentence that stands alone, or assert the pairing in the data.
8. **Token literals where tokens exist.** `compare.tsx:150` `bg-[#f5f0e8]` is the page
   ground (`--color-background`); `compare.tsx:311`, `:491`, `broker-aside.tsx:101`,
   `:257`, `broker-ui.tsx:115`, `:293`, `:338`, `broker-detail.tsx:363` repeat
   `#d8c4af` / `#e7d4bf` as dark-mode brand ink where `brand-tan` is the declared
   token (`globals.css:42`), and `broker-ui.tsx:75` hardcodes `#d0c8be` for what is
   the hairline. None of these are `emerald`/`rose` violations — the directional pair
   is correctly `text-positive` / `text-negative` throughout — but `globals.css:36`
   asks for tokens over new bracketed literals.
9. **Internal links to the legacy alias.** `broker-reviews-promo.tsx:87` and `:130`
   point at `/compare`, which canonicalises to `/brokers` (`shared/seo.js:519`), and
   do it with `target="_blank"` on an internal link. Point them at `/brokers`.

---

### Ranked top-5 (effort)

1. **Route every offer render through `isOfferLive`** — `broker-aside.tsx:256`. **S.**
   Compliance, one line, widest surface in the family.
2. **Pre-render `/brokers/:slug`** — new `functions/brokers/[slug].js` + skip-list
   entry, mirroring the category Function (name, tagline, fee facts, verdict, FAQ
   schema). **L.** It is the largest block of indexable broker URLs and the only one
   invisible without JS.
3. **Pass `hideMobileCta` on `/brokers`, `/brokers/best-for/*`, `/brokers/compare/*`** —
   `compare.tsx:235`, `broker-category.tsx:127`, `broker-comparison.tsx:232`. **S.**
   Enforces the locked "affiliate ask and app CTA must not compete" rule on the
   viewport where it's currently broken.
4. **Move `/brokers` onto `SeoPageShell`, with a real skeleton and a guides
   `RelatedCards` block** — `compare.tsx:238-250`, `:589-602`, and a new block under
   the grid. **M.** Kills the duplicated header markup, fixes the phantom-card
   skeleton, and gives the hub its only onward path into the pages it heads.
5. **Rebuild the review page's tail** — `broker-detail.tsx:281-300` to `RelatedCards`
   including the guides this platform appears in, `:97-112` onto the house `Skeleton`,
   and a "Broker review" eyebrow at `:197`. **M.** Brings the last off-shell route
   into the family grammar and closes the guide→review→guide loop.
