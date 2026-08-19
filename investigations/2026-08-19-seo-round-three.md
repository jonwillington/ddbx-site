# SEO round three: derived hubs, and the data-side items behind them

**Date**: 2026-08-19
**Status**: Tier 2 and most of Tier 3 shipped. §3.1 built and deployed, §3.4
built, §3.3 still open, §3.2 blocked on a business decision (§5)
**Scope**: `ddbx-site`, plus three optional `ddbx-data` follow-ups (§3)

Follows `2026-07-26-seo-expansion-plan.md` (nine families) and
`2026-08-02-next-features-plan.md` (three more, now pushed and live). Twelve
families exist. This covers what is left that is worth building.

---

## 0.0 What shipped, and the one thing that needs you

**Four families built, 14 new URLs, nothing committed.** `ddbx.uk` goes to 8 new
URLs, `ddbx.us` to 6 (the two UK-only role buckets don't exist there).

| Family | Routes | UK | US |
|---|---|---|---|
| Best-performing buys | `/best-performing-buys` | ✓ | ✓ |
| Most-active companies | `/most-active-companies` | ✓ | ✓ |
| Cluster buying | `/cluster-buys` | ✓ | ✓ |
| Role hubs | `/roles`, `/roles/:slug` | 4 buckets | 2 buckets |

New modules: `shared/boards.js`, `shared/roles.js` (+ `.d.ts` each),
`src/components/boards/{board-feed.ts,filing-row.tsx}`, four pages, four
pre-render Functions. Edited: `shared/seo.js`, `functions/_middleware.js`,
`functions/sitemap.xml.js`, `src/App.tsx`, `src/components/seo/cta-copy.ts`.

Pushed to `main` on 2026-08-19, which auto-deploys to Cloudflare Pages, so the
14 URLs are live. The same commit applies the insider-filer test to
`/biggest-buys` (§0.5.1).

**Verified under `wrangler pages dev` against the live API**, not by
typechecking — which is how the two previous rounds found their real bugs, and
it worked again (§0.5). For all 14 URLs: exactly one `rel=canonical`,
correct per-host titles, `noindex` on preview hosts and on `/roles/chair` under
ddbx.us, a 301 from ddbx.eu, and every sitemap URL confirmed indexable.
Rendered headless too: one `h1` each, 25 rows each, no JS errors, and on the
cluster board all 25 headline insider counts equal the names listed beneath
them. `tsc` clean; `eslint` clean on every new file (the five repo-wide lint
errors are pre-existing, in `market-page.tsx` and `director.tsx`).

---

## 0. What checking changed

Four things, each found against the live API rather than by reasoning, and each
of which changed the scope that was approved.

### 0.1 `/methodology` and `/coverage` are already built

They are sections of `/how-it-works`, which has a seven-item section rail —
coverage, pipeline, checks, ratings, sources, what we can measure, where it
stops — and consumes `/api/coverage` in full (`CoverageTiles`, `FeedGrid`,
`OutcomeCoverage`, and the research panel). `shared/methodology.js` already
feeds the six checks into it.

Splitting either into its own URL would publish duplicate content against our
own strongest E-E-A-T page and split the signal. **Both are cut.** If the
argument was that these pages should be more citable, that is a job for
`/how-it-works` itself, not for two new URLs.

### 0.2 Role hubs are buildable today, without `ddbx-data`

Scoped as a Tier 3 item on the basis that `director.role` is uncontrolled free
text. It is free text, but far more tractable than that implies:

- **919/919 UK rows carry a role.**
- **151 distinct strings**, with a very heavy head: Non-Executive Director
  (271), Director (97), Chief Executive Officer (87), Chief Financial Officer
  (39), Non-Executive Chair (29), Independent Non-Executive Director (28).
- A crude five-bucket regex classifies **~92%** on the first pass (76 of 919
  unmatched).

So it is a `shared/roles.js` normalisation module, in the same dependency-free
ESM shape as `shared/sectors.js`, not a data-side change. **Moved to Tier 2.**

Two traps that a naive bucketer gets wrong, and both would state something
false about a named person:

1. **PCA filings.** `Person Closely Associated with Chief Executive Officer`
   appears 4 times and matches `/chief executive/`. A PCA filing is not a CEO
   buying. These must be excluded from the role bucket, not counted in it —
   the same class of error as the Pelosi spouse-account caveat in the Congress
   family. Note EU rows carry an explicit `is_closely_associated` flag; UK
   carries the fact only in the role string.
2. **Chair/NED overlap.** `Non-Executive Chair`, `Non-Executive Chairman` and
   `Chairman and Non-Executive Director` are genuinely both. First-match
   ordering silently picks one and the counts stop summing to the corpus.
   Buckets must be non-exclusive, and the page must say so.

### 0.3 Market-cap bands beat index-membership hubs

§6 of the 2026-08-02 plan specced `index_membership` for `/indices/ftse-100`
etc. Two problems with leading on that:

- **FTSE 100/250 constituent lists are FTSE Russell's licensed IP**, as S&P 500
  is S&P DJI's. Republishing a constituent list as a page is a licensing
  question, not just an engineering one. That was never flagged.
- It needs a new table and a **quarterly maintenance commitment** tied to index
  review dates.

Meanwhile `company_stats.market_cap` **already exists** — migration 031, per
`(market, key)`, refreshed daily from Yahoo, native major units after a
per-market correction. Size-band hubs (`/large-cap`, `/mid-cap`, `/small-cap`)
capture a near-identical query intent, carry no licensing exposure, need no new
table and no maintenance calendar.

The one gap: `market_cap` is served per company (`/api/company/:market/:key/stats`)
and `/api/companies` returns only `key, company, deals, last_trade_date,
analysed, total_value`. A bulk read needs one additive endpoint (§3.1).

**Recommendation: build cap bands, keep index hubs specced and deprioritised.**

### 0.4 The 1000-row cap is now binding

`/api/dealings?since=2026-01-01&limit=1000` returns **919 rows** in August. The
July plan predicted we would hit `DEALINGS_MAX_LIMIT` this year and we are
weeks away. `shared/dealings-feed.js` already pages backwards with the `before`
cursor and reports `complete: false`, so nothing breaks silently — but every
family below inherits that truncation disclosure, and the year-archive case
makes an aggregate endpoint the right answer (§3.3).

---

### 0.5 Five things the build found that the plan didn't

Each was found by running the code against live data, and each changed what
shipped.

1. **A 10% owner was about to top a board about management.** All twelve
   Republic Services purchases in a 300-row US sample — $155m, the second
   largest filing count on the activity board — are Cascade Investment L.L.C.,
   a holder with no officer post and no seat. `isInsiderFiler()` excludes
   filers whose *only* Form 4 role is `ten_percent_owner`, and it lives **inside
   `isEligibleBuy`** so every surface agrees — the four new boards,
   `/biggest-buys`, and the live examples on the glossary entries. Before this,
   the Cascade purchases were eligible for `/biggest-buys` and took second
   place on it. A filer who is a director *and* crosses 10% still counts: TXO
   Partners sits at #4 on the US board with roles `["director",
   "ten_percent_owner"]`, verified against live data.
2. **One company, two tickers, two board rows.** EDAP TMS SA files under CIK
   0001041934 as both `EDAP` and `FOCL` in the same week. Grouping on the
   symbol split one eight-filing cluster into two rows showing the same company
   name twice. US grouping is now keyed on `issuer_cik`.
3. **The cluster annotation has a floor, and copying it was mandatory.**
   ddbx-data counts a co-buyer only above £10,000 (UK) or $25,000 direct and
   non-10b5-1 (US). Counting naively gave Marshalls six insiders where the
   pipeline says three — and the filing pages, the drawer chip and both apps
   all say three. `countsTowardCluster()` mirrors both predicates, which took
   UK disagreement with the pipeline from 4 rows in 25 to 1, and only downward.
4. **A headline the page couldn't evidence.** Savills showed six insiders above
   a truncated list of five names, then — after the floor landed — seven names
   under a headline of six. Both directions read as a defect. The names line
   now lists exactly the buyers the count counts, unwrapped, and all 25 rows
   reconcile.
5. **`missing` means two different things.** 148 of 300 US rows have no
   `officer_title`. That is not a gap in the filing, it is a filer who is a
   board member or 10% owner and holds no officer post — reporting it as "no
   role filed" would publish our taxonomy's shape as a defect in EDGAR.
   `missingRoleLabel()` carries the distinction to the page.

---

## 1. Data verified (live API, 2026-08-19)

UK, `since=2026-01-01`, 919 rows:

| Field | Coverage | Notes |
|---|---|---|
| `sector_normalized` | 919/919 | |
| `value_gbp` | 919/919 | |
| `triage` | 914/919 | |
| `is_open_market_buy` | 903/919 | UK only; US is pre-filtered upstream |
| `live_performance` | **898/919** | |
| `analysis` | 366/919 | the triage gate, as expected |
| `cluster` | **302/919** | `{tier, count, window_days}` |
| `accumulation_run` | 126/919 | `{seq, n_buys, total_gbp, first_date, …}` |

Distinct UK issuers: **462**. Most active: MTLN.L (16), STAF.L (11), N91.L (11),
UTL.L (11), JAR.L (10).

Other markets (500-row samples):

| Market | `live_performance` | `cluster` | Value field |
|---|---|---|---|
| US | 460/500 | 187/500 | `value` (USD) |
| SE | none | 143/500 | none — `price` × `volume`, SEK |
| NL | none | 133/500 | none — `price` × `volume`, EUR |

Consequences: the performance board is **UK + US** (as the sector hubs and
leaderboards already are). The cluster board *could* span four markets, but
SE/NL carry no value field and no analysis, so ranking them by size means
computing `price × volume` in two more currencies. **Ship cluster on UK + US**
and leave EU out until there is a reason.

`/api/coverage` (cron-refreshed, six-hour edge cache) is the source for any
corpus-level statement: UK 964 disclosures / 469 issuers, US 2,566 / 780,
NL 11,966 back to 2006, SE 4,004, USG 4,975. Totals: 24,475 disclosures,
1,157 analyses, 2.8M price observations.

---

## 2. Tier 2 — build now, site only

Four families. Each follows the established five-step wiring: route in
`src/App.tsx`, shape predicate + copy in `shared/seo.js`, a pre-render Function
under `functions/`, a sitemap block with a content bar, and the `SeoPageShell`
composition from `2026-08-03-static-page-rules.md`.

### 2.1 `/best-performing-buys` — UK + US

Was in the original plan (§7) and never built. 898/919 UK and 460/500 US rows
carry `live_performance`.

Non-negotiable, because this is the family most likely to read as advice:

- **Read via `toRatio()`.** `live_performance.*_pct_*` are percentages
  (−2.425 = −2.43%) while `median_alpha` is a ratio. This has already produced
  a 100× error once, on the sector hubs.
- Rank on `alpha_pct_trade`, not raw return — otherwise the board is a list of
  whoever bought into a rising market.
- State `as_of` (the latest **cached** close, currently 2026-08-18), the
  past-performance disclaimer, and no forward-looking language.
- Cap entries per issuer, as `/biggest-buys` does, and disclose the cap.

### 2.2 `/most-active-companies` — UK + US

Company-level, so it sidesteps the named-person ranking that removed
`/most-active-directors` from the July scope. 462 UK issuers.

The honest problem to design around: the head is shallow (16 filings) and the
tail is one filing deep. A bar of **≥3 filings in the window** keeps it a
ranking rather than a directory, and the page should say what the bar is.
Links straight into `/company/:key`, which is the internal-link argument for
the 368-page enrichment case (§3.4).

### 2.3 `/cluster-buys` — UK + US

302 UK and 187 US rows carry `cluster`, shaped `{tier, count, window_days}`,
`tier ∈ {strong, …}`.

This is the family with the strongest claim to being *ours*: cluster buying is
a concept in our own rubric, it already has a glossary entry
(`/learn/cluster-buying`) and a section on every filing page. The hub closes
the loop — concept, live examples, individual filings — which is the internal
linking the July plan said the sitemap was doing instead.

Filter to `tier = "strong"` for the ranked board and state the window (14 days).

### 2.4 Role hubs — `/roles/:slug`, UK + US

Per §0.2. `shared/roles.js` holds the taxonomy; buckets are non-exclusive and
PCA filings are excluded, not reclassified.

Initial slugs, each clearing a ≥25-filing bar on the UK corpus:
`chief-executive`, `chief-financial-officer`, `chair`,
`non-executive-director`. "CEO buys own shares" is the query this exists for.

Each page states its own bucket definition — which title strings map into it,
and that PCA filings are excluded — because a role hub that does not is
asserting a classification it has not shown.

---

## 3. Tier 3 — needs `ddbx-data`

Cross-repo, so under the coordination rules in `~/CLAUDE.md`. All three are
**additive**: no wire-format change, no consumer breakage.

### 3.0 The ddbx-data tree, and how it was cleared

`ddbx-data` was on `feat/fallers-feed` with **327 lines of uncommitted work**
across five files — `worker/index.ts`, `worker/llm/prompts.ts`,
`monthly-summary.ts`, `social-tweet-copy.ts` and 213 lines in
`trade-og-image.ts`, plus an untracked `investigations/2026-08-04-uk-size-gate.md`.

`npm run deploy` ships the working tree, not a commit, and there is no staging.
Deploying to add one endpoint would push all of that to production at the same
time. Worse, both §3.1 and §3.3 need `worker/index.ts`, which is one of the
dirty files — so the change cannot even be committed separately from the WIP
it would sit on top of.

**Resolved 2026-08-19.** That work is now committed and pushed in three
commits — the size-gate pre-registration on its own, the OG-card and
monthly-prose work as authored, and then §3.1. `npm run typecheck` passes.
`npm run deploy` shipped all of it, so the OG-card redesign and the monthly
prompt change are live alongside the API field.

§3.3 (the aggregate endpoint) is still open — the `before` cursor covers the
1,000-row cap today and every board discloses truncation, so it is a
performance item rather than a correctness one.

### 3.1 Bulk company stats → cap-band hubs — BUILT AND LIVE

`/api/companies` now carries `sector_normalized`, `market_cap` and
`stats_currency`, all additive and nullable (cache key bumped to v3). Coverage
on live D1: UK 462 rows with sector on 462 and cap on 433; US 348 rows with
sector on 347 and cap on 337.

On the site: `/market-cap` plus `/market-cap/{large,mid,small}`, on both hosts
— 8 URLs, from **one** call each rather than a thousand dealing rows.
Thresholds are the conventional £/$10bn and £/$2bn lines, market-relative and
printed on every page rather than applied quietly.

**The unit trap, which is why this needed a module.** `stats_currency`
describes the PRICE QUOTE, not the cap. 422 of the 433 capped UK issuers report
`GBp` — prices in pence — while the cap beside it is already in POUNDS. Anglo
American arrives as 41,048,702,976 GBp, meaning £41bn; dividing by 100 to
"convert pence" is wrong by two orders of magnitude in the direction that looks
plausible. Verified against Anglo American, Aberdeen, Shoe Zone and Hargreaves
Services before any threshold was written. And the currency is not always the
market's: 10 UK issuers report in EUR or USD, so they are left unbanded and the
page says so rather than an exchange rate being invented.

One honest seam: these pages count from the company index, which has no
filer-role join, so a US purchase by a 10% holder is included here and excluded
from the boards. Republic Services is the visible case. The methodology says so;
closing it properly is a ddbx-data change.

### 3.1b The original §3.1 note

One additive endpoint returning `(key, market_cap, currency)` per company, or
`market_cap` added to `/api/companies` alongside the `sector_normalized` field
§8.3 of the July plan already wanted. Cheapest item here, and it unlocks
`/large-cap`, `/mid-cap`, `/small-cap` per market with no licensing exposure
and no maintenance calendar.

Band thresholds are an editorial call and must be stated on the page. They are
also market-relative: a £2bn UK company is mid-cap, a $2bn US company is small.

### 3.2 US broker directory

`/api/brokers?market=US` returns `unknown broker market: US`. `ddbx.us` has
~234 URLs and **zero commercial pages** — the entire affiliate business is
UK-only.

Engineering is close to free: `worker/data/uk-brokers.ts` is generated from
`investigations/broker-comparison/dataset.json`, so a US edition is the same
generator plus a market branch on the route. **The cost is entirely editorial**
— research and verify ~15 US brokers, and sign up to US affiliate programmes.
That is a business decision, not a build.

Largest revenue expansion available. Not startable without a decision.

### 3.3 Aggregate endpoint for the leaderboard families

§0.4. Paging with `before` works today and is what the families will ship on.
A purpose-built aggregate endpoint is the right answer once year archives
matter.

### 3.4 The 368 company pages

Still unresolved after two rounds; still the largest thin-content exposure, and
helpful-content demotion is site-wide, so it taxes everything above.

The enrich case is now much stronger than when it was first raised: filing
pages, sector hubs, the glossary and three of the four families in §2 all link
*into* company pages. Adding filing cadence, sector context, peer comparison
and glossary anchors would turn them into real pages. `market_cap` and
`sector_normalized` on `/api/companies` (§3.1) is most of what that needs.

Recommendation unchanged from 2026-08-02: **enrich, do not noindex.** Still not
a call to take unilaterally.

### 3.4a What was built instead — company context

`shared/company-context.js`, rendered by both `src/pages/company.tsx` and
`functions/company/[key].js`. Every thin page now carries an **In context**
section: how the buying was spread over time, which sector the issuer's own
filings put it in, where it ranks in that sector's disclosed buying, six peers,
and links into the boards. All of it computed from the twelve-month window the
sector hubs already read, so it needed no `ddbx-data` change.

The section is dropped wholesale when nothing is computable, and the cadence
line is omitted for a single filing rather than printing "1 purchase over 0
days".

Three things the build had to get right, each caught by running it:

- **Peers are the issuers NEAREST in the ranking, not the sector's biggest.**
  Top-six peers would have stamped one identical list across all 155 UK
  industrials pages — the enrichment meant to fix thin content reproducing it.
  Neighbours give 155 issuers 155 distinct lists, verified.
- **A sentence that claimed a reason it could not know.** The unranked case
  read "peers have seen disclosed buying more recently", which put Republic
  Services under that sentence on a page listing 39 purchases: all 39 are its
  10% holder, excluded by `isEligibleBuy` but still counted in the API summary
  the tiles render. Now it states the sector fact and claims no link.
- **US pages ranked nothing and listed themselves as a peer.** Rows group by
  `issuer_cik`, the company page is keyed on the ticker, so the self-match never
  fired. Fixed by matching both: US went from 0 ranked to 120 of 130, and
  self-references from many to zero across both markets.

### 3.5 Index membership — specced, deprioritised

Kept from §6 of the 2026-08-02 plan, behind §3.1, with the FTSE Russell / S&P
DJI licensing question in §0.3 answered before any of it is built.

---

## 4. Not doing

- **`/methodology`, `/coverage`** — §0.1, already `/how-it-works`.
- **Cluster and performance boards on SE/NL** — no value field, no performance
  data, two more currencies (§1).
- **`/most-active-directors`** — named-person ranking; the line held twice
  already.
- **Role hubs below the filing bar** — a `/roles/chief-investment-officer` on
  three filings is a thin page with a person's name on it.

---

## 4.5 Follow-ups this work created

Small, real, none blocking the push.

- **`DeltaBadge` renders a flat figure as a green "▲ +0.0PP"** — an arrow
  claiming a rise above a number saying there wasn't one. The new pages route
  around it via `AlphaBadge`, but the component is on the market rows, the
  drawer and `/biggest-buys`. The 2026-08-02 round logged the same shape as a
  defect on the filing pages; it is still unfixed at source.
- **Every `noindex` page serves the static UK title.** `/roles/chair` on
  ddbx.us reads `ddbx · Director Dealings — UK Insider Transactions`, and so
  does `/learn/pdmr` on ddbx.us and `/sectors/nonsense` on ddbx.uk. Pre-existing
  and consistent site-wide, because `noindex(shell)` returns before any head
  rewrite. Low stakes — the pages aren't indexed — but it is a UK title on a US
  host and one shared fix would cover every family.
- **The US feed carries `ticker: "NONE"`** on 9 of 300 sampled rows. Filtered
  out here by the issuer-key fallback; worth a look upstream.
- **`/api/dealings` is at 919 of a 1,000-row cap** for UK year-to-date (§0.4).
  The `before` cursor covers it and every board discloses truncation, but the
  cliff arrives within weeks.

---

## 5. Open questions

1. **US brokers** (§3.2) — commit editorially, or leave `ddbx.us` non-commercial?
   The only Tier 3 item still untouched.
2. **The 368 company pages** (§3.4) — enrich, noindex, or knowingly keep. Third
   time of asking.
3. **Cap-band thresholds** (§3.1) — shipped at the conventional £/$10bn and
   £/$2bn lines and printed on every page. Change them in `shared/cap-bands.js`
   if you'd rather they sat elsewhere.
4. **Search Console.** Still not connected. Fifteen families in, the honest
   answer to "which of these works" is still nobody knows, and every
   prioritisation in this document would be sharper with a month of data.
