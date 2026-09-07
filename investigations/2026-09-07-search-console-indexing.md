# Search Console: why pages aren't indexed — 2026-09-07

Report as given:

| Reason | Source | Pages |
|---|---|---|
| Excluded by 'noindex' tag | Website | 395 |
| Alternative page with proper canonical | Website | 23 |
| Page with redirect | Website | 2 |
| Duplicate, Google chose different canonical than user | Google systems | 27 |
| Crawled - currently not indexed | Google systems | 5 |

Three of those five rows are the site working as designed. Two were bugs.

## What was measured first

Every URL in all three sitemaps (1,136 of them: ddbx.uk 764, ddbx.us 367,
ddbx.eu 5) was fetched as Googlebot and checked for status, `robots` and
`rel=canonical`:

- 1,136 × HTTP 200
- 0 carrying a `noindex`
- 1,136 × exactly one `rel=canonical`
- 0 whose canonical pointed anywhere but at itself

So the sitemap is not the problem, and nothing we advertise contradicts
itself. Everything below concerns URLs Google reached some other way.

## The rows that are correct

**Excluded by 'noindex' — 395.** This is the publishing bar doing its job.
`filingMeetsBar` (shared/filings.js) indexes a disclosure only once it
carries a written analysis — 921 rows out of ~23,000 — and the sector, role
and broker families have equivalent bars. Every one of those pages still
*renders* at its URL, carries `noindex, follow`, and is absent from the
sitemap; a link is never broken and a page crosses the bar on its own if an
analysis lands later. The site links to all of them, so Google finds them,
so they are counted. A large number here is the expected shape of a site
that publishes selectively, not a fault. (One real defect was inflating it —
see "Transient noindex" below.)

**Alternative page with proper canonical — 23.** The deliberate folds:
`/api` → `/developers`, `/compare` → `/brokers`, `/report/<slug>` →
`/reports/<slug>`, the dashboard aliases, and the cross-domain pairs
(`ddbx.uk/us` → `ddbx.us/`). All verified live and pointing where intended.

**Page with redirect — 2.** The retired performance pages in
`public/_redirects`.

## Bug 1 — two `rel=canonical` tags on slash and case variants

Cloudflare Pages serves `/companies/` and `/companies` as the same document.
The middleware's skip list — the list of routes whose own pre-render Function
owns the `<head>` — matched the path *exactly*, so the slashed form fell
through it. Both passes then ran, and both **append** to `<head>`:

```
GET https://ddbx.uk/companies/
  <link rel="canonical" href="https://ddbx.uk/companies">   ← the Function
  <link rel="canonical" href="https://ddbx.uk/companies/">  ← the middleware
```

A page with two conflicting canonicals has both ignored, and Google picks one
of its own — which is precisely the wording of the "Duplicate, Google chose
different canonical than user" bucket. Reproduced live on 15 of 17 routes
tested: `/sectors/`, `/sectors/technology/`, `/reports/`, `/roles/`,
`/learn/`, `/learn/pdmr/`, `/weekly/`, `/how-it-works/`, `/market-cap/`,
`/cluster-buys/`, `/best-performing-buys/`, `/most-active-companies/`,
`/companies/`, and the mixed-case `/Companies` and `/Sectors`.

Routes with no pre-render Function had the milder half of the same bug: the
middleware's canonical echoed whatever it was asked with, so `/brokers/`
declared *itself* canonical and competed with `/brokers`.

The middleware's own header comment predicted this failure exactly. What it
did not anticipate is that an exact-match list has more ways to be missed
than entries to maintain.

**Fixed three ways, deliberately overlapping:**

1. `stripTrailingSlash` in shared/seo.js, applied by the middleware as a 301
   before anything else runs. The duplicate URL space stops existing rather
   than being annotated. Combined with the ddbx.eu research redirect so a URL
   needing both still gets one hop, not a chain.
2. The skip list is matched against a lowercased path, closing `/Companies`.
3. **The backstop that makes the class structurally impossible:** the
   middleware now watches its own output stream for a `link[rel=canonical]`
   and, if one is already there, adds neither a canonical nor the `og:url`
   that would disagree with it. Handlers fire in document order and
   `Element.onEndTag` fires after the element's children, so a canonical
   anywhere in `<head>` is seen before `</head>` — verified against the real
   workerd runtime, not assumed. The hand-maintained skip list can now be
   wrong without costing a page its canonical.

## Bug 2 — transient `noindex`

Seven Functions emitted a hard `noindex` when the API fetch merely *failed*:

```js
if (!res.ok) return noindex(shell);   // 503 during a Worker deploy → noindex
```

A `noindex` served on a bad minute is cached by Google for weeks. A page that
has been indexed for months drops out because the Worker was restarting when
Googlebot arrived, and nothing anywhere fails loudly. The largest family
exposed to it was `/company/:key` — 368 live pages behind one `if (!data)`.

The board Functions had already reached the right rule independently
(`complete ? noindex(shell) : shell` in best-performing-buys.js). That rule
is now shared, as `unresolved(shell, status)` in shared/prerender.js: a 4xx
is an answer and earns a `noindex`; a 5xx, a timeout or a thrown fetch is not
an answer, so serve the plain shell and let the next crawl re-read it.
`fetchJsonWithStatus` exists because `fetchJson` returning `null` could not
tell a 404 from a 503.

Applied to: `/dealings/:id`, `/us/dealings/:id`, `/weekly`, `/weekly/:week`,
`/congress/members`, `/reports/:month`, `/company/:key`.

## Still open — the soft-404 space

The SPA has **no catch-all route** and `public/_redirects` ends in a
`/* → /index.html 200` fallback, so *every* unmatched URL answers 200 with a
byte-identical empty shell, indexable, self-canonicalled:

```
/this-page-does-not-exist   200  canonical → itself   (no robots tag)
/another-nonsense-url       200  canonical → itself   (identical document)
/directors/999999           200  canonical → itself
/dealings/x/                200  canonical → itself
```

This is an unbounded space of identical pages, which is what "Crawled –
currently not indexed" (5) is, and it can feed the duplicate bucket too.

It is left alone on purpose. The fix needs the edge to know which paths the
router accepts, and the only honest way to do that is a route allowlist in
shared/seo.js mirroring the 70 `<Route>`s in src/App.tsx. That list would
drift, and it drifts in the dangerous direction: a route added to App.tsx and
forgotten here is a **good page silently noindexed**. Worth doing only with a
CI check that extracts the paths from App.tsx and fails on any route the list
does not cover — the same shape as `check:types`. Five URLs today does not
force the decision.

## Verification

Local `wrangler pages dev` against the production build, Host header spoofed
per domain. Nineteen UK routes and four US routes: every one returns exactly
one `rel=canonical` and one `og:url`, correct title, correct `robots`.
`/companies/`, `/brokers/`, `/sectors/technology/`, `/how-it-works/` and
`/learn/pdmr/` all 301 to the slashless form; `ddbx.eu/sectors/` makes the
single hop to `ddbx.uk/sectors`; `/Companies` returns one canonical pointing
at `/companies`; `/account-deletion` keeps its `noindex`; the `/download`
hreflang trio survives the new guard.

## After deploying

Search Console will not re-check on its own quickly. Use **Validate fix** on
the "Duplicate, Google chose different canonical than user" row — that is the
one this work targets. Expect the noindex count to stay roughly where it is:
it is mostly the publishing bar, and that is the intended state.
