# Next feature families: people, filings, outcomes

**Date**: 2026-08-02
**Status**: three families built and committed, unpushed; see §0
**Scope**: `ddbx-site`, plus one required `ddbx-data` endpoint (§2.1)

---

## 0. Status

**Three of the six families are built, verified and committed. Nothing is
pushed** — see §0.4, which is the only thing here that needs you.

| # | Family | State |
|---|---|---|
| 1 | Congress member + committee pages | **Built.** 45 URLs on ddbx.us (§2) |
| 2 | Per-filing permanent pages | **Built.** 310 URLs on ddbx.uk (§3) |
| 3 | Weekly digest URLs | **Built.** 35 URLs, archive backfilled (§4) |
| 4 | Outcomes study | **Do not build yet.** The data is not there (§5) |
| 5 | Index membership hubs | Specified, not built (§6) |
| 6 | Director person pages | Blocked on a posture decision you own (§7) |

Roughly **390 new indexable URLs**. `ddbx.uk` goes 318 → 650, `ddbx.us`
189 → 234.

### 0.1 What shipped

**`ddbx-data` (deployed, live).** Three additive endpoints, no wire-format
break, no consumer breakage:

- `GET /api/directors/usg/:bioguide` — the member detail `/api/markets` has
  advertised since the USG market was added and which **404'd**. That was a
  standing contract bug independent of this work.
- `GET /api/gov-members` — the tracked-member directory (75 members). Not
  `/api/directors/usg`: that path is swallowed by the UK `/api/directors/:id`
  route registered ~4,500 lines earlier, which matches it with `id="usg"` and
  answers "not found".
- `GET /api/gov-committees` — the committees the rating engine models a
  jurisdiction for, published so the site states the scorer's lane instead of a
  hand-copied one.
- `GET /api/weekly-digests` — the digest archive index.

**`ddbx-site` (committed, NOT pushed).** Three page families, each with a
shared ESM module, React pages, pre-render Functions, `seo.js` entries,
middleware skip-list entries and sitemap blocks.

### 0.2 Three things the data said that this plan got wrong

Each of these changed what was built, and each was found by checking rather
than by reasoning.

1. **The jurisdiction model is House-only.** `JURISDICTION_SIC` covers 11 House
   committees; no Senate committee has a lane. So a senator's `in_lane_count`
   is 0 **because the question was never asked**, and 26 of the 75 members are
   in that position. Publishing "none of their purchases were in their lane"
   for them would state a fact about our coverage as a fact about a named
   legislator. A `jurisdiction_modelled` flag now carries the distinction all
   the way to the page, and the committee family is 11 pages rather than the
   116 the raw roster would have produced.
2. **The outcomes study is not buildable.** §5 recommended leading with the
   Netherlands: 11,908 disclosures back to 2006. The NL feed carries **zero
   performance data** — `MARKET_CONFIG.NL.performance` is `false`, and a
   200-row sample has no `live_performance` on any row. There is no price
   history for Euronext Amsterdam in the system to compute returns from. The
   only corpus with marks is UK, at 797 rows over five months. Details and what
   would change it in §5.
3. **The weekly archive was two weeks deep, not twenty.** Digests are built
   lazily on request and stored, and nothing had ever asked for an old one.
   Backfilled through the endpoint's own build-and-store path.

### 0.3 Two judgement calls made without you

**The discretion-mode boundary on filing pages** (§3.4). These pages could
carry the full written analysis; that would hand away what the app is for. The
tempting workaround — analysis for the crawler, blur for the visitor — is
cloaking. So the boundary is one both see: facts, rating, the six-point
checklist, cluster and buy style, what happened next, and the third-party
sources cited. The thesis, evidence detail and risks stay in the app. It
follows the precedent `/company/:key` already set. Reversing it is a one-file
change in `shared/filings.js`, whose header argues the case in full.

**Publishing pages about named legislators at all** (§2.4). The mitigation is
that every qualification renders *above* the numbers rather than under them.
Pelosi's page states that 100% of the purchases were filed for a spouse
account; a member whose 361 companies came from bulk account filings is tagged
as such in the directory. If you would rather not publish these, the sitemap
block and four routes come out cleanly.

### 0.4 The one thing that needs you

**`git push` publishes all of it.** ddbx-site auto-deploys to Cloudflare Pages
on push to `main`, so the three commits go live the moment they leave the
machine, and ~390 URLs start being indexed. That is outward-facing and slow to
unwind, so I have not pushed. The commits are on `main` locally:

```
bff89ad feat(weekly): give the weekly digest a URL, and an archive to sit in
37860ad feat(filings): give every analysed disclosure a permanent page
dec5640 feat(congress): member and committee pages, with the caveats above the numbers
```

`ddbx-data` **is** deployed — those changes are additive endpoints with no
consumer breakage, and the site's new pages need them regardless.

Your four uncommitted WIP files (`blurred-analysis-overlay.tsx`,
`market-hero.tsx`, `market-page.tsx`, `lib/markets/congress.tsx`) were in the
tree throughout and are untouched.

### 0.5 How it was verified

Under `wrangler pages dev` against the live API, not by typechecking — which is
how the 2026-07-26 batch found its real bugs, and it worked again. Checked for
every family: exactly one `rel=canonical` per page, correct titles and
descriptions, `noindex` on non-owning hosts / below-bar records / malformed
slugs, and sitemap counts matching what the pre-renders will actually index.

Rendered in a headless browser too, which caught five defects typechecking
could not: two `h1`s carrying the same member name, a no-committee case stating
the same absence twice, a committee lead sentence repeating the jurisdiction
clause already in its standfirst, a "+0.0% against +0.0%" outcome on a filing
disclosed the same day, and a weekly total tile disagreeing with the headline
above it by £30k.

---

## 1. The argument, and the numbers that constrain it

The site has ~308 indexable URLs on `ddbx.uk` and ~353 on `ddbx.us` across nine
families. All of it is *impression-earning*: pages that capture demand that
already exists. The 2026-07-26 plan was honest that only the glossary and the
leaderboards were plausibly *link-earning*, and in practice neither has earned
a link.

Three assets are absent from the sitemap entirely, and they are the three most
valuable things the platform holds: **people**, **individual filings**, and
**outcomes**.

### 1.1 What the API actually holds, measured 2026-08-02

Straight from `/api/coverage`. These numbers govern every scoping decision
below, and several of them are smaller than the pitch would like.

| Market | Disclosures | Open-market buys | Insiders | Issuers | History from |
|---|---|---|---|---|---|
| UK | 868 | 801 | 673 | 436 | 2026-03-09 |
| US | 1,905 | 1,174 | 875 | 593 | 2026-05-13 |
| NL | 11,908 | 6,142 | 1,004 | 115 | **2006-03-24** |
| SE | 3,689 | 2,268 | 1,420 | 507 | 2026-05-10 |
| USG | 4,824 | 4,794 | **75** | 1,053 | 2023-04-10 |

Totals: **23,194 disclosures**, 9,071 triage decisions, **921 full analyses**,
1.55m price observations.

Three consequences, all of which change what I would have proposed from
intuition:

- **Congress is 75 members, not 535.** The roster resolves against the full
  legislator list, but only 75 members have filings we hold. A "535 member
  pages" plan would have been 460 empty pages. Seventy-five pages with 4,824
  filings behind them is a good, defensible set; it is not a programmatic
  land-grab, and it should not be scoped as one.
- **UK history is five months.** `TRACKING_SINCE_LABEL` already says March 2026
  and the tracking notice is on every look-back page, which is the right
  posture. But it means the outcomes study (§5) cannot be "three years of UK
  director buys". The deep series is **NL, back to 2006** — 11,908 rows across
  20 years, and nobody on the site has ever looked at it.
- **921 analyses is the content bar for filing pages.** Not a number to invent:
  it is exactly the set of rows that carry writing nothing else on the web has.
  Everything else stays out of the index by construction (§3.3).

### 1.2 The mechanism, restated

Adding pages does not raise authority; links do. Of the six families here:

- **impression-earning** (capture existing demand): 1, 2, 5
- **link-earning** (things someone would cite): 3, 4
- **both**: 1, because "[member] stock trades" is both a high-volume query and
  the kind of page a news story links to

Judge them accordingly. Do not measure the study on traffic in month one, and
do not measure the member pages on conversion.

---

## 2. Congress member and committee pages

The largest untapped demand on the site, and the one place where our record is
genuinely richer than the incumbents'.

### 2.0 Why this one first

`/congress` is a nine-line preview page (`src/pages/congress-preview.tsx`).
Behind it sits a `GovReporter` record carrying, per member: bioguide ID,
chamber, party, state, district, **full committee and subcommittee list**, a
public-domain portrait mirrored to R2, an authored biography, an
advisor-managed assessment with a sourced note, and a net-worth band. Per row
there is a `GovRatingExplain` with signed factors in plain English.

A real one, live today, on Richard McCormick (R-GA-7) buying L3Harris:

> "Sits on Armed Services, which has direct jurisdiction over industrials — the
> company is squarely in the member's lane."
> "Bought in the member's own name, not a spouse or dependent account."
> "Prolific trader — 62 buys on file, so any single name is more likely
> portfolio churn than a deliberate signal."

Capitol Trades and Quiver publish the trade. They do not publish that. The
committee-jurisdiction overlap is the differentiated content unit and it is
already generated, for free, on every row.

Note the third factor: the record argues *against* its own signal. That is the
house voice and it is worth protecting on these pages — a member page that
reads as an accusation is both worse journalism and worse SEO.

### 2.1 Required: a member endpoint in `ddbx-data`

`/api/markets` advertises `directorDetail: "/api/directors/usg/:id"`. **It
404s.** The route was never implemented; the discovery document has been lying
about it. This is a contract bug independent of anything here, and it needs
fixing regardless.

Add `GET /api/directors/usg/:bioguide` returning:

```
{ reporter: GovReporter,          // roster record incl. committees, bio, profile
  stats: { filings, first_disclosed, last_disclosed,
           total_min, total_max,  // disclosed band floor/ceiling, never a point estimate
           issuers, in_lane_count, late_count, self_count },
  top_tickers: [{ ticker, company, count, sector_normalized }],
  sectors:     [{ sector_normalized, count }],
  dealings:    GovDealing[] }     // newest first, capped
```

Everything is derivable from `us_gov_dealings` + the roster; no new tables. The
alternative — having the pre-render page the whole feed and group client-side —
does not work here: `/api/gov-dealings` caps at 500 rows and the `before`
cursor is a `disclosed_date`, so a member with 320 filings inside one window
cannot be reconstructed from the public feed. Verified: paging `view=all` with
the date cursor returns the same 500 rows indefinitely.

**Cross-repo note.** Additive route, no wire-format change, no consumer
breakage. Under `~/CLAUDE.md` rules this is a safe one-way addition, but it
deploys from the `feat/fallers-feed` branch, not `main`.

### 2.2 Routes

| Route | Host | Count |
|---|---|---|
| `/congress` | ddbx.us | 1 (exists, needs rebuilding onto the shell) |
| `/congress/:bioguide-slug` | ddbx.us | ~75, content-barred |
| `/congress/committees` | ddbx.us | 1 |
| `/congress/committees/:slug` | ddbx.us | ~15–25, content-barred |

Slug form: `/congress/nancy-pelosi-p000197`. Name for humans and for the query,
bioguide for identity, because names collide and change. Requests with the
right ID and a stale name 301 to the current slug.

**Content bar**: a member page needs ≥3 filings. Measured on the signal view,
that keeps ~12 of 34; on the full set it will be most of the 75. Members below
the bar render (a link must not 404) but carry `noindex` and stay out of the
sitemap — the same posture as an unknown glossary host.

**Committee pages** need ≥3 members *and* ≥10 filings. The raw committee list
has 116 distinct entries because it includes every subcommittee; publishing 116
pages off a 75-member corpus is exactly the doorway-page behaviour the broker
plan correctly refused. Curate the full committees only, and only the ones with
a real jurisdiction story: Armed Services, Financial Services, Energy and
Commerce, Appropriations, Foreign Affairs, Intelligence, Ways and Means, HELP,
Banking, Judiciary.

Subcommittees are deliberately excluded. They inflate the count, they split the
signal, and "Subcommittee on Primary Health and Retirement Security stock
trades" is not a query.

### 2.3 What goes on a member page

1. Identity block: portrait, name, party/state/district chip, chamber, bio.
2. **The lane**: their committees, with the sectors each has jurisdiction over,
   and the count of their filings that fall in-lane. This is the page's reason
   to exist and it belongs above the fold.
3. Filing table: date, ticker, company, disclosed band, owner, in-lane flag,
   performance since disclosure.
4. Most-traded issuers and sector mix.
5. Disclosure-quality facts: late filings, self vs spouse, advisor-managed
   status where assessed, with the sourced note.
6. Related: their committees, the members they overlap with, `/learn/stock-act`.

### 2.4 Editorial and legal posture

These are public officials and legally mandated public filings, so the privacy
objection that deferred director pages does not transfer. It is not zero risk
either. Rules:

- **Bands, never point estimates.** PTR amounts are ranges. Every figure on
  these pages is "$1,001–$15,000" or a stated floor/ceiling sum. Nothing on the
  page may present a midpoint as the amount traded.
- **No accusation.** In-lane is stated as a fact about jurisdiction, never as a
  claim about knowledge or intent. The generated `rating_explain` already gets
  this right; hand-written copy must match it.
- **Spouse and dependent trades are labelled and never attributed** to the
  member as a decision.
- **Late filings are stated, not editorialised.**
- **Advisor-managed members are marked prominently.** A member whose portfolio
  is run under discretion has a page that would otherwise read as a series of
  deliberate choices they did not make. `GovMemberProfile.advisor_managed`
  exists precisely for this and the page must lead with it when true.
- Portraits are public-domain congressional photographs served from our own R2
  mirror; keep the attribution line.

---

## 3. Per-filing permanent pages

### 3.1 What exists

`/dealings/:id` is a route that renders the UK market page. `GET
/api/dealings/:id` works and returns the full record — director, company,
shares, price, value, analysis, evidence, performance. The URL exists, the data
exists, and no page joins them.

### 3.2 The shape

One disclosure, one permanent URL:

- What was bought, by whom, in what role, for how much, on what date, and how
  many days elapsed between trade and disclosure.
- The analysis: rating with its checklist, thesis, evidence for **and against**,
  key risks, catalyst window.
- Cluster context: who else bought this issuer inside the window.
- Buy style: leaning into a drawdown or chasing strength, with the numbers that
  decided it.
- **What happened next**: return and alpha from the trade date and from the
  disclosure date, as of the last cached close, updating as the outcome
  resolves.

That last section is what makes this not thin programmatic content. The page
has writing nothing else on the web has, *and* a section that changes over
time, so it stays worth re-crawling for years.

It is also the best AI-citation unit on the site. When an assistant is asked
"has anyone at [company] been buying", the citable object is a stable factual
page about one event — not a dashboard.

### 3.3 Indexing bar — the important part

**Index only rows carrying a full analysis.** 921 today across all markets,
growing at the rate the pipeline analyses.

This inverts the usual programmatic-SEO risk. The bar is not a heuristic
someone tuned; it is "does this page contain original writing", answered by the
data model. Unrated rows still render at their URL — a link must not 404 — with
`noindex` and no sitemap entry. If the analysis arrives later, the page becomes
indexable on its own, with no code change.

It also caps the exposure. 921 substantial pages against 368 thin company pages
(§8) is a ratio that improves the site's average, which is the opposite of what
every previous page family did.

### 3.4 Canonical and host

Filing pages live on the host that owns their market: UK on `ddbx.uk`, US on
`ddbx.us`, Congress filings link to the member page rather than getting their
own URL (the PTR is a filing of many rows; the row is not the story, the member
is). NL/SE stay out until `ddbx.eu` is more than a waitlist.

---

## 4. Weekly digest URLs

The cheapest real win here.

`/api/weekly-digest` returns a fully-authored editorial object — typed cards
(`week_in_numbers`, `not_alone`, sector slices, price arcs), each with eyebrow,
headline, subhead and stats. Live example: *"£2.44m of insider buying / 30
insider buys across 27 companies, from 28 insiders"* and *"2 insiders bought
Ninety One this week / £1.43m between them, across 2 filings"*.

**None of it has a URL.** This is precisely the position the monthly reports
were in before they were given `/reports` and `/reports/:month`, and the fix is
the same shape.

- `/weekly` — the current week, canonical.
- `/weekly/:week` — ISO week archive (`2026-W31`).

Canonical discipline copies `/biggest-buys`: the undated URL is canonical, the
dated one is the archive. Fifty-two URLs a year per market, each with genuinely
written content, and a strong freshness signal on a query set ("insider buying
this week") we are uniquely placed to answer.

---

## 5. The outcomes study — do not build it yet

**Recommendation reversed after checking the data.** This section originally
recommended leading with the Netherlands. That is not buildable, and the UK
alternative is not credible. Nothing was built.

### 5.1 Why the Netherlands does not work

The pitch was strong: 11,908 disclosures, 6,142 open-market buys, back to
2006, through the crisis, COVID and the rate shock. A twenty-year series
nobody on the site has ever looked at.

**The NL feed carries no performance data at all.**
`MARKET_CONFIG.NL.performance` is `false`, and a 200-row sample of
`/api/eu-dealings?market=NL` returns zero rows with `live_performance` and zero
with `performance`. The rows carry price and volume as filed, and nothing to
mark them against: there is no Euronext Amsterdam price history in the system,
and no benchmark series for it.

So the corpus is 11,908 records of what was bought and no record of what
happened next. A returns study needs the second half.

### 5.2 Why the UK alternative is not credible either

797 UK rows carry `live_performance`, over a window that starts 2026-03-09.
Five months. "Do director buys beat the market, measured over one summer" is a
weather report with a methodology section, and it would be published to exactly
the audience most able to notice.

The US corpus is shallower still (from 2026-05-13).

### 5.3 What would change it

In rough order of cost:

1. **Backfill Euronext Amsterdam price history in `ddbx-data`**, plus an AEX
   benchmark series, and mark the existing NL rows. This is the one that
   unlocks a genuinely distinctive artefact, and it is a data-platform project
   rather than a site one. It would also let NL graduate from waitlist market
   to one with a Performance surface.
2. **Wait.** The UK series reaches twelve months in March 2027 and two years in
   March 2028. A twelve-month study over ~2,000 buys is publishable; today's is
   not.
3. **A narrower question that five months can answer honestly**, which is the
   only version buildable this quarter: not "do director buys beat the market"
   but something the window genuinely covers, e.g. how the *rated* buys have
   done against the unrated ones, framed explicitly as a five-month read on the
   rating rather than on insider buying. Lower ceiling, but true.

I would take (1), sequenced as a `ddbx-data` piece of work, and not publish
anything until it lands. A weak study is worse than no study, because the whole
point of the page is to be the thing a journalist can cite.

### 5.4 If it is ever built, the constraints stand

- Full methodology on the page: universe, exclusions, benchmark, how alpha is
  computed from trade date versus disclosure date, and what a follower could
  actually have captured.
- Survivorship and delisting handled explicitly, or stated as unhandled.
- `live_performance` is as of the last **cached** close, not live.
- Past-performance disclaimer, no forward-looking language.
- Stable canonical, refreshed quarterly, visible "last updated".
- **The unit trap.** `live_performance.*_pct_*` are percentages; the monthly
  summary's `median_alpha` is a ratio. This already produced a 100× error on
  the sector hubs. Use `toRatio()`.

---

## 6. Index membership hubs — specified, not built

"FTSE 250 director dealings" is a better query set than sectors, and index
membership is in no API. This is the one place on the list where a new data
model clearly earns its keep.

- New table in `ddbx-data`: `index_membership(index_code, ticker, market,
  from_date, to_date)`. Quarterly refresh; FTSE reviews are scheduled events.
- Additive field or a join endpoint — no wire-format change to `Dealing`.
- Unlocks `/indices/ftse-100`, `/ftse-250`, `/aim`, `/sp-500`, `/nasdaq-100`
  on the site **and** a filter axis in both apps.

Sequence it after §2–§4: it needs a data-side change with a maintenance
commitment attached, and the others do not.

---

## 7. Director person pages — the decision that is owed

The 2026-07-26 plan deferred these as "named-person pages with privacy
obligations" and never came back to it. The blocker was never technical.

The corpus: 673 UK insiders, 875 US, 1,420 SE, 1,004 NL. Thousands of pages,
and they would strengthen every company page through internal linking.

A workable posture, for a decision rather than a drift:

1. Publish only what is in the statutory filing: name, role, issuer,
   transactions. No age, no address, no biography.
2. Index only above a materiality bar (≥3 filings, or one over a size
   threshold). Everyone else renders `noindex`.
3. A stated correction and erasure route, honoured, with the legal basis
   written down.
4. No performance ranking of individuals — that is where a public-record page
   turns into a scoreboard about a person.

`/directors/:id` already exists and is already excluded from the sitemap. The
change is to enrich it, apply the bar, and start listing it — not to build
something new.

I have not done this. It is the one item on the list that should be a decision
you take rather than one taken while you were away.

---

## 8. The standing liability

**368 company pages are live and indexable and were never resolved** (§0.6 of
the 2026-07-26 plan). Every family here lands on top of that. Helpful-content
demotion is site-wide, not per-page, so it is a tax on all of this work.

My recommendation is **enrich, don't noindex**: filing cadence, peer
comparison, sector context, glossary anchors, and the new per-filing pages
(§3) as internal links out. The data to make them real pages exists. Noindexing
368 live URLs is still not a call to make unilaterally, and I have not made it.

---

## 9. Deliberately not doing

- **More broker template families.** The directory is at the size where the
  next `X vs Y` page costs more in aggregate quality than it returns.
- **A public screener with crawlable facets.** The link-bait case is real; the
  infinite-URL-space risk is realer, and it would need a whitelist design
  before any of it ships.
- **`FAQPage` JSON-LD.** Already ruled out (§0.2 of the previous plan). Note
  `src/pages/broker-detail.tsx` still emits it and still should not.

---

## 10. Open questions

Ordered by what they block.

1. **Push or not** (§0.4). Three commits sit on local `main`; pushing
   auto-deploys ~390 URLs. Nothing else here matters until this is decided.
2. **Search Console.** Still the highest-value input available and it costs
   nothing. The honest answer to "which of the nine existing families works" is
   currently "nobody knows", and that is now true of twelve families. Every
   prioritisation call in this document would be sharper with a month of
   impression data behind it.
3. **The discretion boundary on filing pages** (§0.3, §3.4). Ratified or
   loosened. It is one file.
4. **Euronext Amsterdam price backfill** (§5.3) — the gate on the only genuinely
   link-earning page on the list.
5. **Director person pages** (§7) — the posture, not the build.
6. **The 368 company pages** (§8) — enrich, noindex, or knowingly keep. Now
   sitting under 310 filing pages that link into them, which strengthens the
   enrich case.

---

## 11. Follow-ups this work created

Small, real, and none of them blocking.

- **US filing pages.** `/dealings/:id` is UK-only because `/api/us-dealings`
  has no per-row detail route. Adding one in `ddbx-data` roughly doubles the
  family. The Function and the sitemap block name each other so both move
  together.
- **`/api/markets` still advertises endpoints that do not exist.** The USG
  `directorDetail` 404 is fixed; nothing has audited the rest of the discovery
  document against reality, and both apps read it.
- **Em dashes in `cta-copy.ts` and in `seo.js` titles** contradict
  `HOUSE_STYLE_RULES`, which bans them outright. The new copy uses parentheses
  in prose and keeps the em dash only as a title separator, matching the
  existing convention rather than unilaterally diverging. Worth one decision
  either way, applied across the site rather than per family.
- **`src/pages/broker-detail.tsx` still emits `FAQPage` JSON-LD**, which the
  2026-07-26 plan already ruled out. Still worth removing.
- **Weekly digests are built lazily**, so the archive is only as deep as it has
  been asked for. A cron that walks the last N weeks would keep it from going
  stale again; today it is correct only because it was backfilled by hand.
