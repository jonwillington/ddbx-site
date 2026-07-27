# Family: COMPANIES

## Routes reviewed
- `/companies` (hub) — `src/pages/companies.tsx` + `functions/companies.js`
- `/company/:key` (~575 URLs, the family's long tail) — `src/pages/company.tsx` +
  `functions/company/[key].js`, judged on SEO-shell adoption, thin-page
  degradation and footer modules only (not the dealing drawer / drawer gating)

## Files read
- `src/pages/companies.tsx`
- `src/pages/company.tsx`
- `src/components/company/more-companies.tsx`
- `src/components/company/company-app-pitch.tsx`
- `src/components/company/price-chart.tsx` (SEO-relevant part: `PriceSeries.unavailable`)
- `functions/companies.js`
- `functions/company/[key].js`
- `functions/company/[market]/[key].js`
- `functions/sitemap.xml.js`, `functions/_middleware.js`, `functions/sectors/index.js` (comparator)
- `shared/prerender.js`
- `src/components/seo/{page-shell,skeletons,cta-copy,related-cards,stat-tiles,meter-bar,app-cta-band,seo-rail}.tsx|ts`
- `src/lib/company.ts`, `src/lib/api.ts` (`CompanyIndexEntry`), `src/layouts/default.tsx`

---

## Prior claims — held / refuted

**[held] Family uses `SeoPageShell` with correct order and loading suppression — for `/companies` only.**
`companies.tsx:128-159` composes the shell properly: `eyebrow="Company index"`
(`:134`), title (`:157`), standfirst (`:108-112`), `loading={companies === null}`
(`:154`), `skeleton` (`:155`), `cta` (`:129-133`), `footnote` (`:136-153`). The
shell suppresses band + footnote while loading (`page-shell.tsx:139-164`), so the
dark band cannot flash above the fold. Correct.

**[refuted, scoped] `/company/:key` is not on the shell and has no eyebrow.**
`company.tsx` hand-rolls its breadcrumb (`:416-433`) and header (`:442-456`).
Not using `SeoPageShell` here is defensible — the page is a sheet + sticky-panel
composition the 860px shell can't express — but the **eyebrow is simply absent**,
and this is the only SEO route in the whole site without one. Grep confirms every
other family stamps itself (`sectors.tsx:102`, `sector.tsx:195`,
`biggest-buys.tsx:238,279`, `learn.tsx:150,178,218`, `reports.tsx:145`,
`report.tsx:163,205`, `broker-category.tsx:151`, `broker-comparison.tsx:256`,
`companies.tsx:134`). The family stamp is missing on the ~575 highest-volume
cold-landing URLs in the family — exactly the pages the eyebrow argument was
written for.

**[held] Real `SeoSkeleton`, not a generic pulse block — but the wrong variant on `/companies`.**
`companies.tsx:155` passes a real `SeoSkeleton`, and `company.tsx:694-814` is a
genuinely excellent bespoke skeleton (sheet, logo, 4 tiles at true 64px, section
rules, reserved 17rem panel, reserved 104px `BrokerInline` slot at `:787`). But
the `/companies` skeleton is structurally a different page from what loads — see
module 10 below. Held on quality, refuted on match.

**[held] Eyebrow present and family-correct** — on `/companies`. See above for `/company/:key`.

**[held] Terminal `AppCtaBand`, non-converged copy.** `companiesCta`
(`cta-copy.ts:77-80`) makes its own secondary claim ("you can check this list, or
the app can check it for you") — distinct from the sector/leaderboard/reports/learn
bodies. It renders last-but-one via the shell. Held. (One copy bug — see Bug 3.)

**[held] `RelatedCards` instead of bare link lists.** The companies family
doesn't use `RelatedCards`, but it doesn't need to: `MoreCompanies`
(`more-companies.tsx:202-264`) is a richer tile-card grid using the same
`border-hairline bg-sheet` chrome, plus logo, value, recency chip, MeterBar and
ticker pill. That is the "labelled door" idea done better, not skipped. The one
residual bare link list is the terminal nav at `company.tsx:646-675` (3 links) —
acceptable as a footer nav.

**[refuted] Pre-render ↔ React parity (no inversions).** Two concrete breaks, both
on `/companies`. See Bug 1 (name-cleaning drift produces crawler-visible text the
reader never sees) and Bug 2 (head-tag bailout). `/company/:key` parity is clean.

**[held] Thin-page degradation.** Extensive and well done on `/company/:key`:
`onIndex` swaps the misleading "Browse every company" label (`:392`, `:663-665`);
the Price section is suppressed wholesale when no series exists
(`:499`, `price-chart.tsx:46-49`); `hasPanel` collapses the grid to one column
rather than leaving a 17rem hole (`:397-398`, `:436-438`); `panelFacts` returns
`[]` rather than a stack of em dashes (`:841`); `StatsSection` returns null
(`:1071`); the Rating column is dropped when nothing is rated (`:940-943`);
`CompanyAppPitch` returns null with no disclosures (`company-app-pitch.tsx:121`);
`companies.tsx:50-53,108-110` distinguishes fetch failure from an empty market so
the page can never publish "0 companies…". Best-in-family.

**[held, with a hole] Contextual `more-companies` (not the same 8 cards on every page).**
`pickCompanies` (`more-companies.tsx:90-144`) is genuinely three-stranded: 3
most-analysed (constant across pages), 3 alphabetical neighbours (unique per page),
2 hash-rotated (`:137-141`, FNV-1a). So 5 of 8 vary per page. Claim holds. The hole
is Bug 4: the strands aren't filtered to the content bar, so they link out to pages
the index and sitemap deliberately exclude.

**[held] ddbx.us does not sell UK brokers in the rail.** Both routes go through
`SeoRail` (`companies.tsx:122-126`, `company.tsx:315-319,408-412`,
`company.tsx:710-714`), which gates `BrokerAside` on `marketId === "uk"`
(`seo-rail.tsx:48`). The `CompanyPanel` no-broker branch (`company.tsx:884-908`)
also correctly sells completeness rather than the band's live claim.

**[n/a for this family]** Brokers disclosure, leaderboard baseline, learn
jurisdiction, sector 1000-row cap, report AI byline, `/sectors|/learn|/reports`
index pre-renders.

**Open decision — company h1 disagreement: still present, no concrete bug found.**
`functions/company/[key].js:261` renders `"{Name} ({TICKER}) director dealings"`;
`company.tsx:446` renders `{Name}` with ticker + noun in the subtitle at `:449-451`.
Every fact in the pre-render h1 is visible text on the hydrated page, just split
across h1 and the line under it — so hard-constraint 1 is satisfied and I am **not**
reopening it. Noted as still open, with the `:255-260` comment intact.

---

## Per-module verdicts

### `/companies`

1. **`SeoRail`** — **keep** — `companies.tsx:122-126`. Market-correct, self-loading,
   `drawerRight` gutter matches every page it links to. Fix: none. (One token nit
   lives in the shared component — see module 24.)

2. **Shell header (eyebrow / h1 / standfirst)** — **tune** — `companies.tsx:108-112`.
   `standfirst` is `undefined` while `companies === null`, so on load a 2-line
   paragraph appears between the h1 and the content and pushes everything down —
   the one CLS the shell can't absorb because it sits *above* the skeleton
   boundary (`page-shell.tsx:125-139`). Fix: render a fixed-height placeholder
   standfirst while loading, or state the sentence without the count
   ("Every company whose directors have bought shares, with the filings, ratings
   and stats for each") and append the count only once known.

3. **Search field + match count** — **keep** — `companies.tsx:162-180`. `sr-only`
   label, `type="search"`, brand focus ring, live match count only when a query is
   typed. Correct. Fix: none.

4. **Sticky A–Z nav** — **tune** — `companies.tsx:186-196`. Right idea (on a
   ~575-row index the alphabet is the only navigation). Two issues: (a) up to 27
   `rounded-lg` boxes wrap to 3–4 rows on a 375px viewport and, being `sticky
   top-16`, permanently occupy ~120px of a 660px viewport; (b) the anchors are
   plain `<a href="#X">` with no `aria-current` and no indication of where you are.
   Fix: below `sm`, make the rail a single horizontally-scrolling row
   (`flex-nowrap overflow-x-auto`), which keeps it one line tall.

5. **Letter sections + company rows** — **tune** — `companies.tsx:206-254`. Rows
   speak proper house vocabulary now: `CompanyLogo`, `TickerPill`, `min-w-0
   truncate`, right-aligned `tabular-nums` money. The problem is the conditional at
   `:241-248`: `total_value` is optional on the wire (`api.ts:30-33`), so within one
   3-column grid some rows carry a money figure and some carry nothing, with no
   explanation for the gap. Fix: when `total_value` is absent, render the row's
   secondary figure in the money slot (or render an explicit `—` in the same
   `tabular-nums` slot) so the column edge stays true.

6. **No-match empty state** — **keep** — `companies.tsx:199-204`. Names the query,
   suggests the ticker, explains the naming convention. Good copy, no dead end.
   Fix: none.

7. **Failed state** — **tune** — `companies.tsx:108-109, 160`. The standfirst copy is
   honest and well judged ("a network hiccup rather than an empty market"). But
   `failed` renders `null` children, so the page becomes: h1 → error line → dark
   CTA band → footnote. There is no retry and no onward link — a total dead end
   under a heading promising an index. Fix: in the failed branch render a
   `RelatedCards` set (market home, `/sectors`, `/biggest-buys`, `/learn`) so the
   error page still leads somewhere.

8. **`AppCtaBand` (`companiesCta`)** — **tune** — `cta-copy.ts:77-80`. Terminal
   placement and non-converged body are right; the copy is broken on ddbx.us. See
   Bug 3.

9. **Footnote + Logo.dev attribution** — **keep** — `companies.tsx:136-153`. States
   the content bar in reader-facing text (which is where the `meetsContentBar`
   decision at `:29-30` should be explained), and the `<a>`-inside-`<p>` workaround
   for `LogoDevAttribution` is correctly reasoned. Fix: none.

10. **Loading skeleton** — **redesign** — `companies.tsx:155`. `<SeoSkeleton
    rows={10} variant="ruled-list" />` renders a single-column list of 10 rows,
    each with a title bar, a subtitle bar and a **3px MeterBar**
    (`skeletons.tsx:52-67`). The loaded page has: a search input, a sticky
    alphabet rail, then `sm:grid-cols-2 xl:grid-cols-3` letter sections of rows
    with a 22px round logo and no meter bar (`:217-252`). Nothing about the
    skeleton's geometry survives the fill — this is the "generic pulse block"
    failure in a nicer costume, and it is the only page in the family whose
    skeleton is a different *layout*, not just a different row count. Fix: add an
    `az-index` variant (or inline the skeleton): a 40px input row, a one-line chip
    rail, then two letter blocks of 6 rows in the same 2/3-col grid with a 22px
    circle leading each row.

11. **Pre-render `functions/companies.js`** — **redesign** — the injected list and
    head copy are right in shape (this is genuinely the hub in the hub-and-spoke),
    but the file re-implements `apexHost`, `esc`, `setContent`, the head rewrite
    and `cleanCompany` privately rather than importing `shared/prerender.js` —
    the exact duplication that `functions/company/[key].js:20-24` and
    `shared/prerender.js:1-15` were written to stop, and it has already drifted
    (Bug 1) and already diverged on failure posture (Bug 2). Fix: rewrite onto
    `fetchJson` / `page` / `renderInto` / `noindex`, which also gets it
    BreadcrumbList JSON-LD for free — the hub is currently the only pre-rendered
    page in the family emitting none, while `[key].js:304-308` names it as a
    breadcrumb node.

### `/company/:key`

12. **Breadcrumb + "Updated" line** — **keep** — `company.tsx:416-433`, `:98-105`.
    `lastUpdated()` picking the freshest of the three feeds instead of
    `last_trade_date` is exactly right for a crawled surface, and the note about
    sitemap `<lastmod>` deliberately answering a different question is correct.
    Fix: none.

13. **Sheet header (logo / h1 / ticker line)** — **tune** — `company.tsx:442-456`.
    Add the family eyebrow above the h1 — `<p class="font-mono text-[11px]
    font-semibold uppercase tracking-[0.16em] text-brand-brown
    dark:text-brand-tan">Company record</p>` (the exact spec at
    `page-shell.tsx:113-119`). One line, no layout risk, closes the only
    eyebrow hole in the family.

14. **`StatTiles`** — **keep** — `company.tsx:374-388, 455`. Four tiles, `primary`
    on total value, `"0 of 3"` instead of an em dash for Rated (`:385-387`), and
    the reasoning for four-not-five is sound. Fix: none.

15. **Standfirst paragraph** — **keep** — `company.tsx:459-489`. Mirrors
    `leadSentence` in the pre-render (`[key].js:151-177`) and the meta description
    verbatim; singular/plural and first/last-date branches all handled. Fix: none.

16. **Price section** — **keep** — `company.tsx:499-515`. Suppressed entirely when
    unavailable rather than leaving a heading over whitespace. The chart carries no
    facts that aren't also in the table below it, so no parity exposure. Fix: none.

17. **`DealsTable`** — **keep** — `company.tsx:933-1044`. Parity with the
    pre-render table (`[key].js:229-237`) holds on date / person / role / value;
    React adds shares and rating, which is the safe direction. Fix: none.

18. **Sticky `CompanyPanel`** — **keep** — `company.tsx:851-929`. Panel/StatsSection
    split (`:1052-1054`, `:826-827`) stops market cap and previous close being
    printed twice in one screen; the US branch sells completeness, deliberately not
    the band's live claim. Fix: none.

19. **`CompanyAppPitch`** — **keep** — `company-app-pitch.tsx:129-186`. Uses this
    company's real disclosures as the alert copy, `RATED` set matches the product's
    own definition of a signal (`:63-65`), 0.16em kicker matches the family spec,
    claim is timeliness not performance. Placement at `company.tsx:633-640` puts it
    *before* `MoreCompanies` and the FAQ rather than terminal — a documented
    deviation (`:627-632`) with sound reasoning (the FAQ is reference material; a
    reader shouldn't have to climb an accordion to reach the sell). Keeping.

20. **`MoreCompanies`** — **tune** — `more-companies.tsx:146-267`. Design is strong
    and the three-strand selection solves the "same 8 cards everywhere" problem.
    Three defects, all in the degraded path or the selection: Bug 4 (links below
    the content bar), Bug 5 (duplicated "N buys" and dead MeterBars when
    `total_value` is missing), and no loading state at all — `rows === null` →
    `picked = []` → `return null` (`:169-176`), so an entire 2×4 card grid pops in
    below the dark band and shoves the FAQ down. Fix for the last: render eight
    fixed-height card shells while `rows === null`.

21. **`MarketFaq`** — **keep** — `company.tsx:644`, `companyFaq` at `:173-237`.
    Mirrors `faq()` in `[key].js:192-221` word for word; the "text not FAQPage
    schema" reasoning at `[key].js:186-191` is right. Fix: none. (Standing risk:
    two hand-maintained copies of five paragraphs. Worth a comment cross-reference
    if it ever drifts.)

22. **Terminal link nav** — **keep** — `company.tsx:646-675`. Three bare underlined
    links, but they follow a tile-card grid and a dark band; converting them to
    cards would be a third card treatment in 600px. The `onIndex` label swap
    (`:663-665`) is a genuinely thoughtful thin-page fix. Fix: none.

23. **`CompanySkeleton`** — **keep** — `company.tsx:694-814`. The best skeleton in
    the family: real sheet, 48px logo circle, four 64px tiles, both section rules
    at their true `10rem` rail geometry, a reserved sticky panel, and a reserved
    `BrokerInline` height below `lg`. Fix: none.

### Shared furniture touched by this family

24. **`SeoRail`** — **tune** — `seo-rail.tsx:99, 100, 107, 121`. Raw hexes
    (`border-[#e8e0d5]`, `bg-[#faf7f2]`, `bg-[#1a140d]`, `hover:bg-[#2a2118]`)
    where the rebuilt family now uses `border-hairline`, `bg-sheet`, `bg-ink`
    (`more-companies.tsx:209`, `app-cta-band.tsx:84`, `company.tsx:899`). Not a
    rendering bug — same values — but the last hex holdout in furniture the whole
    SEO family mounts. Fix: swap to the tokens.

25. **`MeterBar` / `StatTiles` / `RelatedCards` / `AppCtaBand` / `SeoPageShell` /
    `SeoSkeleton`** — **keep**. All correctly tokenised (`text-positive`,
    `bg-brand-brown/60 dark:bg-brand-tan/60`, `bg-ink`), all dark-mode paired,
    `MeterBar` is `aria-hidden` with a `max(2px, …)` floor
    (`meter-bar.tsx:37-40`), `AppCtaBand`'s headline is a `<p>` not a heading
    (`app-cta-band.tsx:98`, reasoning at `:27-29`). Fix: none.

---

## Bugs (correctness / compliance / parity)

**Bug 1 — parity: `/companies` pre-render strips company names differently from React.**
`functions/companies.js:37-41` is a **single-pass** `cleanCompany`. Both
`src/lib/company.ts:41-60` and `functions/company/[key].js:58-72` **loop**, with
comments in each explaining exactly why (names carry two trailing parentheticals).
So for "Jardine Matheson Holdings Ltd (Singapore Reg) (JAR)" the crawler is served
`Jardine Matheson Holdings Ltd (Singapore Reg)` (`:62`) while the reader sees
`Jardine Matheson Holdings Ltd` (`companies.tsx:230`) — and the company's own page
title says the same third thing again. This also perturbs the pre-render's
alphabetical sort (`:56-59`) versus React's grouping/sort
(`companies.tsx:90, 96-98`). This is text drift between crawler and reader on the
family hub, and it's the second time this exact regex has drifted — the
`[key].js:52-57` comment is a post-mortem of the first time.
*Fix: import `cleanCompanyName`'s loop, or better, delete the private copy and
take the helpers from `shared/prerender.js`.*

**Bug 2 — SEO: an API blip on `/companies` serves the static UK homepage `<head>` with no canonical.**
`functions/companies.js:120` returns the bare `shell` when the fetch fails. But
`/companies` is on the middleware skip list (`_middleware.js:94`), so nothing else
sets the head — the response ships `index.html`'s static
`<title>ddbx · Director Dealings — UK Insider Transactions</title>`
(`index.html:50`), the static UK description, **no `rel=canonical`, no `og:url`,
and no noindex**. On ddbx.us that's the US company index served under a UK title
with no canonical. The sibling index pre-render takes the opposite posture:
`functions/sectors/index.js:106, 111, 129` returns `noindex(shell)` on every
no-data path.
*Fix: `return noindex(shell)` on the bailout — the URL is legitimate but a shell
with the wrong market's title is not worth indexing.*

**Bug 3 — copy: the `/companies` CTA band says "director" on ddbx.us.**
`cta-copy.ts:79`: *"a push the day any **director** on it buys"*. The page
immediately above it computes the market noun (`companies.tsx:104-105`) and
renders "Every **US** company with **insider trading**" plus "…companies whose
**insiders** have bought shares". So on ddbx.us the terminal ask contradicts the
h1 and standfirst two screens up. Every other market-sensitive line in this family
branches; this one doesn't, and `sectorCta` (`cta-copy.ts:44-48`) avoids the issue
by staying generic.
*Fix: make `companiesCta` a function of `marketId` (like `learnCta` /
`sectorCta` / `leaderboardCta` already are) and say "director"/"insider"
accordingly.*

**Bug 4 — internal linking: `MoreCompanies` links to pages the index and sitemap deliberately exclude.**
`more-companies.tsx:159-162` fetches `api.companies(market)` and applies **no**
content-bar filter, unlike `companies.tsx:62`, `functions/companies.js:109-111`
and `functions/sitemap.xml.js:242` — all three of which apply
`c.deals >= 2 || c.analysed > 0`. Per `sitemap.xml.js:207-217`, 55% of UK issuers
have exactly one dealing. So the module mounted at the foot of every company page
(and at `company.tsx:338-341`, the 404 state) spends its alphabetical-neighbour
and hash-rotation strands pointing crawlers and readers at one-row pages the site
has decided are thin — undermining both the content bar and the module's own "why
do I want to look at this" premise, since such a card reads "1 buy".
*Fix: `.filter(meetsContentBar)` before `pickCompanies`, from a single shared
predicate. Worth extracting `meetsContentBar` to `src/lib/company.ts` +
`shared/`, given it now exists in four places.*

**Bug 5 — `MoreCompanies` degrades badly when `total_value` is absent.**
`total_value` is optional on the wire (`api.ts:30-33`: "a cached response can
still arrive without it"). When it is:
- `:224-229` falls back to `"{deals} buys"` as the card's *primary* 15px figure,
  and `:255-258` **also** prints `"{deals} buys"` on the ticker line — the same
  string twice on one card.
- `top` is `0` (`:182`), so `top > 0` (`:244`) suppresses every bar; with a
  *partial* rollout the bars compare only the cards that have a value, and the
  ones that don't render nothing where a bar should be, reading as "zero" rather
  than "unknown".
- `pickCompanies`'s tie-breaks (`:110-112`) silently degrade to `analysed`,
  then raw `deals`.
*Fix: when `total_value` is missing, make the secondary line carry rating info
only (`"{analysed} rated"`, or nothing) so the count is never printed twice, and
suppress the bar per-card rather than per-group.*

---

## Ranked top-5 (effort: S/M/L)

1. **Bug 1 — restore the name-cleaning loop in `functions/companies.js`** (S).
   Hard-constraint-1 parity break on the family hub, and a repeat of a
   documented past regression. One-line-ish fix; do it by importing from
   `shared/prerender.js` so it can't drift a third time.
2. **Bug 4 — filter `MoreCompanies` to the content bar** (S).
   The module is mounted on ~575 pages; today it is the site's largest source of
   internal links into pages the index, the sitemap and the pre-render all agree
   are too thin to publish.
3. **Bug 3 + Bug 2 — market-aware `companiesCta`, and `noindex` the `/companies` bailout** (S).
   Two independent one-liners, both on the hub: the band currently says "director"
   to US readers, and an API blip serves the US index under a UK title with no
   canonical.
4. **Module 10 — replace the `/companies` skeleton with one that matches the page** (M).
   The only page in the family whose skeleton is a different layout from what
   loads (single ruled column with meter bars → search box + sticky alphabet +
   2/3-col logo grid). Needs a new `SeoSkeleton` variant or an inline skeleton.
5. **Module 13 + Bug 5 — eyebrow on `/company/:key`, and fix the `MoreCompanies` no-value path** (S).
   The eyebrow is one line and closes the family's only stamp hole on its
   highest-volume route; the no-value path currently prints "4 buys" twice on the
   same card.

**Explicitly not raised:** the company h1 disagreement
(`functions/company/[key].js:255-261` vs `company.tsx:446`) — still present, still
parity-clean (every pre-render h1 fact is visible text on the hydrated page), and
still an owner decision. Left alone per the rubric.
