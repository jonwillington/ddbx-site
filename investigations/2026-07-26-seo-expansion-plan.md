# SEO expansion: broker long-tail, glossary, sector hubs, leaderboards

**Date**: 2026-07-26
**Status**: all nine families built and verified, uncommitted — see §0
**Scope**: `ddbx-site` only, with one optional `ddbx-data` follow-up (§8.3)

---

## 0. Implementation status

Two external reviews landed on this plan; §0.2 records what they changed. The
sections below §1 are the **original proposal**, kept as written so the
reasoning is auditable — where §0 and a later section disagree, §0 is current.

### 0.1 Built and verified

Nothing is committed. All work sits uncommitted in the working tree alongside
pre-existing WIP (§0.4).

| # | Item | Verification |
|---|---|---|
| 1 | **`offer_expires` gate** — `isOfferLive()` in `src/lib/brokers.ts`, applied at all 7 offer render sites | Two expired offers (interactive investor, exp. 30 Jun; Wealthify, exp. 28 Jun) now suppressed; IG's future-dated offer and 9 open-ended offers unaffected |
| 2 | **5 broker category pages** — `/brokers/best-for/{beginners,isa,funds,lowest-cost,sipp}` | All 5 clear the ≥3-broker bar; every broker has an authored pick line; ranking order verified in the pre-render |
| 3 | **6 broker comparisons** — `/brokers/compare/*` | All 6 resolve both platforms; fee crossover computes (AJ Bell vs ii → **£28,752**); differences table correctly hides the 8 fields the pair agrees on |
| 4 | **Footer internal links** — `src/lib/site-nav.ts` + `FooterNav` | 4 market-aware columns; broker links pinned to `ddbx.uk` to match `canonicalUrlFor` |
| 5 | **Monthly reports as real URLs** — `/reports` + `/reports/:month` | June 2026 pre-renders with headline, intro, macro note, sector table and report card; unknown months noindex |

**Sitemap** now emits **287 URLs** on `ddbx.uk` (was 270): +5 categories,
+6 comparisons, +2 report months, +`/reports`.

**Regression-checked**: `/`, `/brokers`, `/compare`, `/companies`,
`/company/mtln`, `/download`, `/portfolio`, `/congress` all still resolve with
exactly one `rel=canonical` and their correct titles.

Two bugs were found by *running* the Functions under `wrangler pages dev`,
neither of which typechecking would have caught:

- **Duplicate canonicals.** `_middleware.js` appends `rel=canonical` to every
  page; a route with its own pre-render Function then gets a second one, and a
  page with conflicting canonicals has both ignored. Fixed by extending the
  middleware's skip list — the same reason `/t/`, `/company/` and `/companies`
  were already on it.
- **Preview builds indexable.** Because those routes skip the middleware, they
  also skipped its `isProductionHost` noindex — a `*.pages.dev` build would
  have served indexable pages canonicalising to `ddbx.uk`. Each pre-render
  Function now applies the check itself.

### 0.2 What the reviews changed

- **JSON-LD scope cut to `BreadcrumbList`.** The original §8.2 called it "real
  rich-result upside for near-zero work" — wrong. FAQPage isn't available to
  sites like ours, a bare `ItemList` doesn't produce a carousel, and
  `Review`/`Product` on affiliate pages is a policy risk. Rationale recorded in
  `shared/prerender.js`.
- **`/most-active-directors` dropped** from the leaderboard scope: it's
  named-person ranking, i.e. the privacy surface §1 explicitly deferred.
- **Ordering changed.** Reports moved ahead of everything except brokers,
  because the asset already exists and only lacked a URL. Glossary moved last:
  a "what is a PDMR" page is the *most* commodity thing here, so the reviewer
  suggestion to lead with it would have inverted the quality argument.
- **Broker wedge sharpened** from generic comparison SEO toward the categories
  we can defend, since the raw `X vs Y` SERPs are BrokerChooser/MSE territory.
- **Promo registry dropped.** Both reviews called it premature and they were
  right — `broker-page-ui.tsx` extracts only what two pages actually shared.

### 0.3 Second batch — also built and verified

| # | Item | Verification |
|---|---|---|
| 6 | **Sector hubs** — `/sectors` + `/sectors/:slug`, 11 ICB sectors, both markets | Rollup verified against live data on UK and US; concentration disclosed; unknown slugs noindex |
| 7 | **Leaderboards** — `/biggest-buys` + `/biggest-buys/:year`, both markets | 25 rows, methodology in the pre-render, per-company cap disclosed, invalid years noindex |
| 8 | **Glossary** — `/learn` + 10 entries, jurisdiction-owned | Each entry indexable on exactly one host, canonical always points home, sitemaps disjoint |

**Sitemap now**: `ddbx.uk` **308** URLs, `ddbx.us` **353**, `ddbx.eu` 7
(was 270 / ~300 / 7).

Three data problems these families surfaced, none of which typechecking or a
build would have caught:

- **A 100× unit error.** `live_performance.*_pct_*` are PERCENTAGES (1.83 =
  +1.83%) while the monthly summary's `median_alpha` is a RATIO (−0.0027 =
  −0.27%) — two conventions for the same idea in one API. Read as ratios, the
  first sector medians came out as "+993%" and "−1695%". `toRatio()` already
  existed in `lib/performance/channel-summary.ts`; `shared/sectors.js` now
  mirrors it and documents the trap.
- **Sector totals that are one company.** US technology over the year to
  2026-07-26 is $8.0bn, of which **$7.9bn is a single issuer (SVRE)** across
  five filings. True, and a useless description of a sector. The rollup now
  computes the largest issuer's share and the page states it whenever it
  exceeds 40% — which fires on 7 of 11 sectors in each market.
- **Market-specific buy eligibility.** UK rows carry `is_open_market_buy`
  (759/786 true). US rows **don't carry it at all** — all 532 undefined — because
  the US feed is pre-filtered upstream to Form 4 code `P`. A single shared rule
  would have emptied the US board or admitted UK placings, so
  `isEligibleBuy()` branches by market and the published methodology says why.

Two further judgement calls worth reviewing:

- **The leaderboard caps entries at 3 per company.** Without it the US 2026
  board was five consecutive rows of the same issuer. The cap is disclosed on
  the page ("SVRE had 2 further qualifying purchases") rather than applied
  silently.
- **`DEALINGS_MAX_LIMIT = 1000` is now handled**, not just noted.
  `shared/dealings-feed.js` pages backwards with the `before` cursor and returns
  `complete: false` if it runs out of budget; the page then says the ranking may
  be incomplete. Truncation was otherwise invisible — the board renders and
  looks finished.

### 0.4 The glossary canonicalisation call

§5 left this open; it's now decided, and it's the one editorial decision made
without you. **Every entry has exactly one owning domain.** UK/EU regulatory
terms (PDMR, MAR Article 19, RNS, closed periods) live on `ddbx.uk`; US ones
(Form 4, STOCK Act, Rule 10b5-1) on `ddbx.us`. Jurisdiction-free concepts —
open-market vs vesting, cluster buying, reading a director buy — would have been
the duplicates, so they get a single owner (UK) and the other market links to
them rather than restating them.

Requests on a non-owning domain still render (a link shouldn't 404) but carry a
`noindex` and a canonical pointing home. Verified: `/learn/pdmr` is indexable on
`ddbx.uk` only, `/learn/form-4` on `ddbx.us` only, `ddbx.eu` publishes none, and
the three sitemaps are disjoint. No entry exists at two indexable URLs, so
there's no hreflang to maintain.

Reverse it by changing `owner` in `shared/glossary.js` — nothing else needs to
move.

### 0.5 Working-tree state

Your ~790 lines of uncommitted WIP (the `brandTitle()` refactor in
`shared/seo.js`, the download/company reworks) were in the tree when this
started. Nothing was committed, stashed, reset or checked out. The full
pre-existing diff is backed up at
`<scratchpad>/pre-seo-work-backup.patch` (1,862 lines).

New work is almost entirely new files. The files I edited that you were also
mid-flight in: `shared/seo.js` (additive branches, using your `brandTitle`),
`src/layouts/default.tsx` (one `<FooterNav />` call + the component),
`src/components/brokers/broker-aside.tsx` (two offer-gate call sites).

### 0.6 The decision waiting on you

**169 UK + 199 US company pages are live, indexable, and excluded only from the
sitemap.** `isIndexable()` noindexes exactly one path (`/account-deletion`), and
the company Function renders any key with ≥1 dealing. The sitemap's content bar
is a *discovery* control, not an *index* control — the code comment says this is
deliberate ("issuers cross it on their own as filings arrive").

That's 368 thin pages against 17 new ones from this work. It's the largest
thin-content exposure on the site and it predates every page family here.
Options: noindex below the bar, enrich them, or consciously keep the current
posture. I've deliberately not touched it — noindexing 368 live URLs is not a
call to make while you're away.

One smaller thing in the same vein: `src/pages/broker-detail.tsx` emits
`FAQPage` JSON-LD. That predates this work, but it contradicts the structured-data
posture adopted here (§0.2) — FAQ rich results aren't available to sites like
ours, so it's markup to maintain with nothing returned. Harmless, worth removing
when someone next touches that file.

---

## 1. What this is, and what it isn't

Four new page families, plus a shared promo kit so the conversion units on them
stay in one place:

| # | Family | Routes | Data source | New API work |
|---|---|---|---|---|
| 4 | Broker long-tail | `/brokers/best-for-:category`, `/brokers/:a-vs-:b` | `/api/brokers?market=UK` | none |
| 5 | Glossary | `/learn`, `/learn/:slug` | hand-authored | none |
| 6 | Sector hubs | `/sectors`, `/sectors/:slug` | `/api/dealings?since=…` | none (see §8.3) |
| 7 | Leaderboards | `/biggest-buys`, `/biggest-buys/:year`, `/most-active` | `/api/dealings?since=…` | none |

Be honest about the mechanism, because it changes what we optimise for:

- **Adding pages does not raise domain authority.** Links do. Of the four,
  only the glossary (#5) and the leaderboards (#7) are plausibly *link-earning*
  — they're the kind of page a forum post or a journalist cites. #4 and #6 are
  *impression-earning*: they capture existing demand on queries we currently
  don't have a page for.
- So the honest framing is: #4 and #6 grow traffic and internal link equity;
  #5 and #7 are the ones that might grow authority. Both are worth doing, but
  don't judge #5 on its traffic or #7 on its conversion.

**Non-goals**: director profile pages and Congress member pages (ideas #1–2
from the original list). They're the bigger prize but they're a different
shape of work — named-person pages with privacy obligations. Deliberately out
of this plan; revisit after.

---

## 2. What already exists (so we don't rebuild it)

The SEO machinery here is good. Everything below is another instance of an
existing pattern, not new infrastructure.

- **`shared/seo.js`** — dependency-free ESM, imported by *both* the SPA
  (`src/components/document-title.tsx`) and the edge
  (`functions/_middleware.js`). One route table drives the tab title, the OG
  card and the SERP. Every new route family adds a shape predicate + copy here.
- **`functions/_middleware.js`** — rewrites `<head>` per request before the
  HTML leaves Cloudflare. Handles title/description/OG/canonical/noindex.
- **`functions/company/[key].js`** — the pre-render pattern: fetch the same API
  bundle React uses, inject semantic HTML *into* `#root`, which React replaces
  on mount. Same URL, same facts, no user-agent sniffing. **Every new content
  page needs one of these** — the middleware only rewrites `<head>`, so without
  it a crawler sees an empty `<div id="root">`.
- **`functions/sitemap.xml.js`** — host-aware, API-backed, with a **content
  bar** (`deals >= 2 || analysed > 0`) that keeps thin pages out. That
  precedent should govern every family below.
- **`src/lib/brokers.ts`** — already holds `BADGE_LABELS` (10 categories),
  `estAnnualCost()`, and the FCA/ASA compliance copy (`BROKER_DISCLOSURE`,
  `BROKER_DISCLAIMERS`, `BROKER_METHODOLOGY`).

### Data confirmed available today (checked against live API, 2026-07-26)

- `/api/brokers?market=UK` → **19 brokers**, 9 distinct badges in use
  (`best_for_beginners` ×8, `best_for_isa` ×7, `best_for_funds` ×5,
  `lowest_cost` ×4, `best_for_sipp` ×3, `top_pick` ×2, `best_for_fractional` ×2,
  `best_for_us_stocks` ×2, `best_for_lisa` ×2), 5 with affiliate links.
  `market=US` returns `unknown broker market: US` — **UK only**.
- `/api/dealings?since=2026-01-01&limit=1000` → **786 UK buys YTD**, **786 with
  `sector_normalized`** (100%), **761 with `live_performance`** (97%).
  One edge-cacheable call powers both #6 and #7 with zero backend work.
- `SectorNormalized` is an 11-value ICB enum in
  `ddbx-data/worker/db/types.ts:273`.

---

## 3. Phase 0 — the shared promo kit (do this first)

Right now the conversion units are welded to the pages they were written for:

| Unit | Lives in | Problem |
|---|---|---|
| `CompanyAppPitch` | `components/company/company-app-pitch.tsx` (311 ln) | Great block — alert stack, "as the app lists them" panel, screenshot roller — but its props are `company`/`tickerKey`/`deals`. Unusable on a glossary page. |
| `ScreenRoller` | private fn inside the same file | Not exported at all. |
| `BrokerReviewsPromo` | `components/brokers/broker-reviews-promo.tsx` | Already has `card`/`bar` variants — closest thing to a reusable unit — but hard-codes `api.brokers("UK")` and the string "UK brokers". |
| `BrokerAside` / `BrokerInline` | `components/brokers/*` | Rail + inline units, currently market-page only. |
| `StoreButtons` + "Free for 7 days" | repeated inline | Same 6 lines copy-pasted across download and company pages. |
| `DeviceFrame`, `QrInstall`, `PricingCard`, `StatBand`, `SectionHeader`, `Reveal` | `components/download/*` | Generic components living under a page-specific folder. Nothing about them is download-only. |

Four new page families × these units = the copy-paste gets much worse unless we
fix it now.

### Proposed: `src/components/promo/`

```
src/components/promo/
  registry.ts        placement id -> unit + GA label. The only file a new page touches.
  promo-slot.tsx     <PromoSlot placement="glossary-footer" /> — the placement primitive
  app-pitch.tsx      generalised CompanyAppPitch: slots for eyebrow/headline/body,
                     optional alert feed, optional side panel, optional roller
  app-cta.tsx        compact store-buttons + trial line (the repeated 6 lines)
  screen-roller.tsx  extracted from company-app-pitch.tsx
  broker-promo.tsx   market-aware BrokerReviewsPromo, variants: card | bar | rail
  related-links.tsx  internal-link cluster (the SEO glue — see §7.2)
```

**The key move is `registry.ts`.** A page never imports a promo component
directly; it renders `<PromoSlot placement="…" />` and the registry decides
which unit appears there and what `data-ga-event`/`data-ga-label` it carries.
That means:

- changing which promo shows on sector hubs is a one-line registry edit;
- GA labelling is systematic instead of ad-hoc, so we can actually compare
  placement performance;
- a new page family gets promos by adding one registry entry.

**Migration**: `CompanyAppPitch` becomes a thin wrapper that builds the
company-specific props and renders `<AppPitch>`. `src/pages/company.tsx` and
`src/pages/download.tsx` keep working unchanged. Move
`components/download/{device-frame,section-header,stat-band,reveal,qr-install}`
to `components/promo/` (or a neutral `components/kit/`) and re-export from the
old paths for one commit to keep the diff readable.

**Effort**: M. This is refactor-only — no new pages, no visual change. Worth
landing and reviewing on its own before any SEO page lands on top of it.

> **Open question for review**: is `promo/` the right name given `related-links`
> is editorial rather than promotional? Alternative: `components/blocks/`.

---

## 4. Phase 1 — broker long-tail (#4)

Highest commercial value of the four; the affiliate revenue already justifies
the work, and the data is entirely in hand.

### 4a. Category pages — `/brokers/best-for-:category`

The `BrokerBadge` enum **is already the taxonomy**. Nine badges are in active
use, so nine pages, each a filter over the existing table:

`/brokers/best-for-beginners`, `-isa`, `-sipp`, `-lisa`, `-funds`,
`-us-stocks`, `-fractional-shares`, `-active-traders`, `/brokers/lowest-cost`

Each page: hand-written 2–3 paragraph intro (what to actually look for in this
category), the badge-filtered broker cards reusing `BrokerCard` from
`compare.tsx`, a comparison table of the fields that matter *for that category*
(ISA page leads on platform fee + `accounts.isa_note`; US-stocks page leads on
`fees.fx_fee_pct` + `assets.fractional_shares`), the `estAnnualCost()` model,
then the standard disclosure block.

**Only ship a category if ≥3 brokers carry the badge.** Today that rules out
`best_for_active_traders` (0) and keeps `best_for_fractional`/`best_for_us_stocks`/
`best_for_lisa` (2 each) below the bar — start with the 5 that clear it and let
the rest turn on automatically as badges are assigned.

### 4b. Comparison pages — `/brokers/:a-vs-:b`

19 brokers = 171 possible pairs. Publishing all 171 is textbook doorway-page
behaviour and would get the whole directory discounted. **Hand-curate ~15–20
pairs** in a shared module, chosen on real search demand (Freetrade vs
Trading 212, Hargreaves Lansdown vs AJ Bell, InvestEngine vs Vanguard, …).

Each page is generated from the two broker records: side-by-side fee table,
`estAnnualCost()` at all three `COST_POTS`, accounts/assets diff (only the rows
where they actually differ), pros/cons from each record, and a short
hand-written "who should pick which" verdict. That verdict is the difference
between a real page and a template — it's the one part we author.

### Where the content lives

Follow the `shared/seo.js` precedent exactly: a **dependency-free ESM module at
`shared/broker-categories.js`** (+ `.d.ts`) holding slug → title, intro copy,
badge filter, and the curated `vs` pair list. Imported by *both*
`src/pages/broker-category.tsx` and `functions/brokers/[slug].js`. One source of
truth, no build step, no duplication between the SPA and the pre-render.

### Compliance — non-negotiable

These are commercial pages under FCA/ASA scrutiny. Every one must carry
`BROKER_DISCLOSURE` **above the fold, not in the footer**, plus
`BROKER_DISCLAIMERS` and `BROKER_METHODOLOGY` from `src/lib/brokers.ts`.
Affiliate links keep `rel="sponsored"` via `brokerLinkRel()`. "Best for X"
claims must trace to an assigned editorial badge — we don't invent a superlative
because it makes a better title tag. Show `last_verified` prominently; it's both
a compliance signal and an E-E-A-T one.

**Effort**: M (category pages) + M (vs pages). ~14–20 new URLs on `ddbx.uk`.

---

## 5. Phase 2 — glossary (#5)

The authority play. `/learn` hub + `/learn/:slug` entries. Candidate first set:

`pdmr`, `rns-and-tr-1`, `form-4`, `stock-act`, `mar-article-19`,
`open-market-buy-vs-vesting`, `cluster-buying`, `what-a-director-buy-signals`,
`closed-period`

No API dependency, no drift risk, and — unlike everything else here — these are
pages other sites might link to. They also give us natural internal-link anchors
to drop into company, sector and dealing pages ("this was an
[open-market buy](/learn/open-market-buy-vs-vesting), not a vesting").

Content in **`shared/glossary.js`** (same pattern as §4): slug, term, one-line
definition, body as an array of paragraph strings, `related` slugs, `updated`
date. Consumed by `src/pages/learn.tsx` and `functions/learn/[slug].js`.

Two things make these good rather than filler:
1. **Link them to live data.** A PDMR page that ends with "the last 5 PDMR
   disclosures we've analysed" is a page; one that doesn't is a dictionary entry.
2. **YMYL/E-E-A-T.** Financial explainers need author attribution, a
   last-updated date, and sources. Cheap to add, and Google's helpful-content
   systems weight it.

> **Open question for review**: which domain owns `/learn`? The glossary is
> largely market-agnostic but `ddbx.uk`/`ddbx.us`/`ddbx.eu` all serve the same
> SPA, so without a decision we publish three copies of every entry and split
> our own signal. Options: (a) canonical everything to `ddbx.uk`; (b) per-market
> copy with per-host canonicals (Form 4 and the STOCK Act are genuinely US
> topics, MAR is genuinely UK/EU); (c) UK+US split, EU redirects to UK. I lean
> (b) — the terms really do differ by jurisdiction — but it's ~2× the authoring.

**Effort**: S per entry once the shell exists; S–M for the shell. Authoring
time dominates, not engineering.

---

## 6. Phase 3 — sector hubs (#6)

`/companies` is one flat list of several hundred issuers — every company page
hangs off a single index, which is poor crawl distribution and gives us no
mid-tail landing pages.

`/sectors` + `/sectors/:slug` over the 11 `SectorNormalized` values:
`/sectors/technology`, `/sectors/financials`, `/sectors/energy`, …

**Data**: `/api/dealings?since=<start-of-year>&limit=1000` — verified 786 UK
rows YTD, **100% carrying `sector_normalized`**. Group client-side (and in the
pre-render Function). No backend change needed today.

Each hub: the sector's recent buys, the companies within it ranked by activity,
aggregate stats (total value, distinct companies, distinct directors, share of
all buys), and links out to the company pages. Titles hit the real queries —
"UK technology director dealings".

Sector slug ↔ label mapping goes in **`shared/sectors.js`**, same pattern again.

> **Open question for review**: FTSE 100 / 250 / AIM hubs are a stronger query
> set than sectors ("FTSE 250 director dealings" has real volume), but index
> membership isn't in any API and changes quarterly. Options: (a) skip; (b)
> static constituent lists checked into this repo with a review reminder; (c)
> add index membership to `ddbx-data`. I'd ship sectors first — free — and treat
> index hubs as a separate decision once we see whether sector hubs rank.

**Effort**: M. 11 new URLs per market, plus a real fix to crawl depth.

---

## 7. Phase 4 — leaderboards (#7)

`/biggest-buys` (rolling 12 months, canonical), `/biggest-buys/:year` (archive),
`/most-active-directors`, `/best-performing-buys`.

Same single API call as §6. `live_performance` is present on **761 of 786** rows,
so the performance leaderboard is real rather than approximated.

These are the most link-baity pages we could ship and they update themselves.
Two constraints:

- **Past-performance disclaimer** on anything ranking by return, and be explicit
  that `live_performance` is as-of the latest *cached* close, not live.
- **`/biggest-buys` must be canonical, `/biggest-buys/2026` the archive** — not
  the reverse, or the canonical target moves every January.

### 7.1 The 1000-row cap

`DEALINGS_MAX_LIMIT = 1000` (`ddbx-data/worker/db/queries.ts:304`). We're at 786
UK rows for 2026 in July, so ~1,350 by December — **we hit the cap this year**.
Three options, cheapest first: paginate with the existing `before` cursor in the
pre-render Function; raise the constant; or add a purpose-built aggregate
endpoint. Paginating is fine for now, but the year-archive pages make an
aggregate endpoint the right long-term answer. Flagging it as a known cliff
rather than pretending it isn't there.

### 7.2 Internal linking (`related-links.tsx`)

This is where the four families stop being four silos. Every page gets a
related-links block from the promo registry:

- company page → its sector hub, its analysed-buy glossary terms, the brokers rail
- sector hub → its top companies, the leaderboard slice for that sector
- leaderboard → the companies and sectors it names
- glossary entry → related terms, plus live examples of the concept
- broker category → the sibling categories and the relevant `vs` pages

Right now the sitemap is doing work that internal links should be doing.

**Effort**: M.

---

## 8. Cross-cutting work

### 8.1 Per family, mechanical

1. Route in `src/App.tsx`.
2. Shape predicate + title/description in `shared/seo.js` (`seoForPath`), and
   canonical handling in `canonicalUrlFor` — including which host owns the family.
3. A pre-render Function under `functions/` modelled on `company/[key].js`.
4. Sitemap block in `functions/sitemap.xml.js`, with a content bar.
5. A `PromoSlot` placement in `promo/registry.ts`.

### 8.2 JSON-LD

Not in the codebase at all today, and it's cheap inside the pre-render
Functions where we're already emitting HTML: `Review`/`Product` on broker pages,
`FAQPage` on glossary entries, `ItemList` on leaderboards and sector hubs,
`BreadcrumbList` everywhere. Real rich-result upside for near-zero work.
Recommend doing it as part of Phase 1 so the pattern is set.

### 8.3 Optional `ddbx-data` follow-up

Adding `sector_normalized` to `/api/companies` would let the sector hubs and the
`/companies` index share one cheap call instead of pulling 1,000 dealing rows.
**Not required** — §6 works today without it. If we do it, it's a cross-repo
change under the rules in `~/CLAUDE.md`: additive field, back-compatible, no
consumer breakage.

### 8.4 Discretion mode

All four families are **public and ungated**, like `/compare` and `/download`.
They're acquisition surfaces; gating them defeats the point. Follow
`broker-reviews-promo.tsx`, which deliberately doesn't import `@/lib/discretion`.

---

## 9. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Thin/templated content at scale trips helpful-content demotion — and drags existing pages with it | **High** | Content bars everywhere (the sitemap precedent), hand-written intros and verdicts on every category and `vs` page, ≥3-broker minimum, curated `vs` list not the full 171 |
| FCA/ASA exposure on commercial broker pages | **High** | `BROKER_DISCLOSURE` above the fold, full disclaimer set, `rel="sponsored"`, badge-traceable claims, visible `last_verified` |
| Cross-domain duplication (3 hosts, same SPA) splits our own signal | **Medium** | Resolve §5's open question before any glossary page ships; extend `canonicalUrlFor` per family |
| Leaderboards read as investment advice | **Medium** | Past-performance disclaimer, "as-of cached close" wording, no forward-looking language |
| 1000-row API cap breaks year archives | **Medium** | §7.1 — paginate now, aggregate endpoint later |
| Phase 0 refactor regresses the download or company pages | **Low** | Refactor-only commit, wrappers preserve existing call sites, review before any SEO page lands on it |

---

## 10. Sequencing

| Order | Phase | Effort | New URLs | Rationale |
|---|---|---|---|---|
| 1 | **Phase 0** — promo kit | M | 0 | Everything else lands on it. Review in isolation. |
| 2 | **Phase 1** — brokers | M+M | ~14–20 | Highest commercial value, data fully in hand, sets the JSON-LD + shared-module patterns |
| 3 | **Phase 3** — sector hubs | M | ~11 | Free data, fixes crawl depth, low compliance surface |
| 4 | **Phase 4** — leaderboards | M | ~6 | Reuses Phase 3's data layer entirely |
| 5 | **Phase 2** — glossary | S/entry | ~9 | Last only because authoring time dominates; start writing in parallel from day one |

Roughly 40–46 new indexable URLs. Each phase is independently shippable and
independently revertible.

---

## 11. Questions for the reviewer

1. **Glossary canonicalisation** (§5) — one host, or per-market copy? This is
   the biggest unforced-error risk in the plan.
2. **`vs` page count** (§4b) — is ~15–20 the right ceiling, and should the pair
   list be picked from Search Console data rather than intuition?
3. **Index hubs vs sector hubs** (§6) — worth the static-list maintenance for
   the better query set, or sectors only?
4. **Promo kit naming/boundary** (§3) — `promo/` vs `blocks/`, and does
   `related-links` belong in it?
5. **Is Phase 0 worth blocking on?** Alternative: ship Phase 1 with the
   components as they are and refactor after, accepting one round of churn.
6. **Anything here we'd regret at 40+ new URLs** given the site currently has
   roughly a dozen hand-built pages plus the company set?
