# Next feature families: people, filings, outcomes

**Date**: 2026-08-02
**Status**: in progress — see §0 for what is built
**Scope**: `ddbx-site`, plus one required `ddbx-data` endpoint (§2.1)

---

## 0. Status

| # | Family | State |
|---|---|---|
| 1 | Congress member + committee pages | see §2 |
| 2 | Per-filing permanent pages | see §3 |
| 3 | Weekly digest URLs | see §4 |
| 4 | Outcomes study | see §5 |
| 5 | Index membership hubs | specified, not built (§6) |
| 6 | Director person pages | blocked on a posture decision (§7) |

This section is updated as work lands. Everything below §1 is the plan as
written; where §0 and a later section disagree, §0 is current.

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

## 5. The outcomes study

The authority play, and the one page here a journalist might cite.

### 5.1 The honest version

The pitch writes itself as "do director buys beat the market?" The data does
not yet support the version of that sentence anyone would want to publish for
the UK: **UK history starts 2026-03-09**, five months and 801 open-market buys.
A performance study over five months is a weather report.

Two options, and the second is better:

**(a) Publish the UK study with the window stated.** Honest, small, and the
tracking notice already carries the caveat. It will read as thin to exactly the
audience it is meant to impress.

**(b) Lead with the Netherlands.** 11,908 disclosures, 6,142 open-market buys,
**back to 2006** — through the financial crisis, the recovery, COVID and the
rate shock. That is a real series and it is sitting unused because NL is a
waitlist market on the front end. A study titled *"Twenty years of insider
buying on Euronext Amsterdam"* is a substantially better artefact than anything
the UK corpus can currently support, and it makes the case for the product
without depending on the market we sell.

Recommend (b), with the UK and US as a stated-window appendix that grows into
the lead over time.

### 5.2 Constraints

- Full methodology on the page: universe, exclusions, benchmark, how alpha is
  computed from trade date vs disclosure date, and what a follower could
  actually have captured.
- Survivorship and delisting handled explicitly, or stated as unhandled.
- `live_performance` is as of the last **cached** close, not live. Say so.
- Past-performance disclaimer, no forward-looking language.
- Stable canonical, refreshed quarterly, with a visible "last updated".
- **Watch the unit trap.** `live_performance.*_pct_*` are percentages; the
  monthly summary's `median_alpha` is a ratio. Two conventions for one idea in
  one API — this already produced a 100× error on the sector hubs. Use
  `toRatio()`; do not hand-roll the conversion.

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

1. **Search Console.** Nothing here is measurable without it, and the honest
   answer to "which of the nine existing families works" is currently "nobody
   knows". This is the highest-value input available and it costs nothing.
2. **NL as the study subject** (§5.1) — leading with a market we do not sell
   is unusual. It is also the only 20-year series we have.
3. **Director pages** (§7) — the posture, not the build.
4. **The 368 company pages** (§8) — enrich, noindex, or knowingly keep.
