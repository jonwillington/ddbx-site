# Congress by stock: `/congress/stocks` and `/congress/stocks/:ticker`

**Date**: 2026-09-16
**Status**: built on branch `worktree-agent-acbcfbe698257f905`, not pushed, not
deployed. Build passes; render pass done; pre-render Functions and sitemap
exercised under local Pages emulation (see §7).
**Scope**: `ddbx-site` only. One data-side endpoint is specified (§8) and
stubbed with a generated roster until it exists.

---

## 1. What this is

The Congress family read one way: a member, then what they bought
(`/congress/members/:slug`), or a committee, then who on it bought
(`/congress/committees/:slug`). These pages reverse it. `/congress/stocks/nvda`
answers "who in Congress bought Nvidia": the members (linking to their pages),
when they bought, in what disclosed bands, whether any of them sit on a
committee whose modelled lane covers the issuer, how long disclosure took, the
most recent purchase, and a one-paragraph verdict in the company-verdict
pattern. `/congress/stocks` is the hub: the names bought by the most members,
a live "filed most recently" strip, and every ticker with a page.

Programmatic SEO is the point. Title template
`{Company} ({TICKER}) stock purchases by members of Congress`, description
built from the same lead sentence the reader sees, a sitemap entry for every
ticker above the floor, related tickers by shared buyers.

**URLs (ddbx.us only, like the rest of `/congress/*`)**

| Route | Count today |
|---|---|
| `/congress/stocks` | 1 |
| `/congress/stocks/:ticker` (indexable) | **98** |
| `/congress/stocks/:ticker` (renders, noindex, no sitemap) | every other ticker with a purchase on record (1,082 total; 523 listed in the roster) |

Served on ddbx.uk or ddbx.eu the pages render and are noindexed, same as the
member pages.

## 2. The floor, and how many pages clear it today

A ticker page is indexed when it has **at least 5 distinct members and at
least 10 purchase rows** (`MIN_STOCK_MEMBERS`, `MIN_STOCK_ROWS` in
`shared/congress-stocks.js`). Below that the page still renders, a link never
404s, but it carries a "Not enough data yet" panel instead of a verdict, no
charts, `noindex`, and no sitemap entry. It crosses the bar on its own as
filings arrive.

Distribution measured against the live API on 2026-09-16 by
`node scripts/congress-stocks-roster.mjs --dry` (76 members, 5,116 purchase
rows, 1,082 distinct tickers, corpus as of 2026-09-14):

| Floor (members, rows) | Tickers clearing it |
|---|---|
| ≥2, ≥5 | 274 |
| ≥3, ≥5 | 243 |
| ≥3, ≥10 | 111 |
| ≥4, ≥10 | 106 |
| **≥5, ≥10** | **98** |
| ≥5, ≥15 | 56 |
| ≥8, ≥20 | 30 |

Top of the published set: MSFT (26 members, 100 purchases, 5 in lane), AMZN
(24, 82, 0), AAPL (24, 73, 2), NVDA (22, 109, 0), META (20, 53, 2), AVGO
(19, 44, 0), UNH (19, 42, 5), HD (15, 38, 0), V (15, 38, 5), JPM (15, 28, 4),
GOOGL (14, 35, 1), NFLX (14, 27, 0).

Why 5 and 10 rather than 3 and 5: at three members the page is a coincidence
and the verdict has nothing to weigh; at five the concentration clause, the
lane split and the account mix all have a denominator. Ten rows is the floor
for a band ladder that shows a shape and a lag that is a median rather than a
coin toss. 98 pages is a set Google can take seriously; 243 would include a
lot of "3 members, 5 purchases, nothing to say".

## 3. What the data said that changed the plan

Three things, each found by checking rather than reasoning.

1. **There are no sales.** The brief asked for "buys versus sells over time".
   The pipeline ingests purchases only and drops sales, exchanges and
   everything else at the door (`ddbx-data
   worker/pipeline/us-gov/ingest.ts`, `isReplicableBuy` / the 2026 asset
   filter). `/api/gov-dealings?view=all` returns 500 rows, all
   `transaction_type: "purchase"`. So the family is titled and written as
   "who bought", never "who traded", and every page carries
   `PURCHASES_ONLY_NOTE` as the lead of its "How to read this" panel:
   "These pages show purchases only. Congressional filings disclose sales
   too, but we do not yet hold them, so nothing here says whether a member
   later sold." Adding sales is a data-side change (§8).

2. **The public feed cannot aggregate by ticker.** `/api/gov-dealings` caps at
   500 rows (about eight weeks of the raw stream; the `before` cursor was
   already known to be broken from the 2026-08-02 plan). `?ticker=X` works
   with full history and no cap that bites (NVDA, the most-bought, is 109
   rows). So a **ticker page fetches live and is exact**, but "every ticker
   with how many members bought it" exists nowhere on the API. The only
   complete per-ticker figures are the 76 member-detail responses'
   `top_tickers` (verified uncapped against `stats.issuers` on all 76).
   Fetching 76 details per index request, in a Pages Function or the
   browser, is not a page. So the index and the sitemap read a **generated
   roster** (`shared/congress-stocks-roster.js`, from
   `scripts/congress-stocks-roster.mjs`, precedent:
   `scripts/hero-deal-series.mjs`), stamped with the date it was summed and
   stated on the index ("Counts as of 14 September 2026"). The roster decides
   which pages are advertised; the live rows decide what a page says. A
   roster entry above the bar is above it live too (same rows summed), so a
   ticker is never advertised and then noindexed; a ticker that crosses the
   bar after the roster was built is indexable on arrival and simply not yet
   in the sitemap until the script is re-run. The proper fix is §8.1.

3. **Sector is SIC-derived and sometimes absent or odd.** `sector_normalized`
   comes from the SEC's SIC via the shared mapping. UnitedHealth is
   `Financials` (SIC 6324, insurance), so its lane is Financial Services, not
   Energy and Commerce. Several tickers have no sector at all (MSFT's roster
   entry had `sector_normalized: null` in some members' issuer lists; the page
   takes the most common non-null value across rows). Where no sector is
   held, `laneSentence` says so ("We hold no sector for X, so no committee
   lane is computed") rather than reporting zero in lane. This is a fourth
   lane state, added to the three the member pages have.

Two more worth noting. The member pages' "Companies filed on" list linked to
`/company/{ticker}`, which for most Congress tickers is a page that noindexes
itself (the Form 4 company index has 440 issuers; NVDA and MSFT are not in
it). Those links now go to `/congress/stocks/{ticker}`, which exists for
every ticker with a purchase, and the ticker page links to `/company/` only
when the ticker is in the US company index. And NVDA's median trade-to-filing
lag is 1 day, which looked wrong until the rows were read: 46 of its 109
purchases are Cleo Fields' and are filed promptly.

## 4. Honesty rules, and where they live

`shared/congress-stocks.js` carries the four rules in its header. The first
three are the member family's; the fourth is new.

1. **Bands, never points.** Every money figure is `band(min, max)`. The band
   ladder groups by the disclosed band itself; roll-call marks are sized by
   the band **floor**. `amount_mid` is never read.
2. **What we don't model vs what didn't happen.** `memberLane()` returns one
   of four states: `in`, `out`, `unmodelled` (no mapped committee; every
   senator), `nosector` (we hold no sector for the issuer). `laneSentence()`
   phrases them as three different sentences and is the only place allowed
   to. The verdict says "For the other 10 members no lane is computed,
   because we map House committees only", never "10 members are not in
   lane". `memberLaneLine()` does the same per row.
3. **Jurisdiction, never knowledge.** Copy says "sits on a committee that
   oversees technology". Nothing implies a purchase was informed.
4. **Purchases only, said out loud.** `PURCHASES_ONLY_NOTE` on every page.

The verdict (`stockVerdict()`) is one paragraph of computed clauses, each
dropped when it has nothing behind it: concentration or spread, lane,
account mix, disclosure lag and late filings, outcome since disclosure over
the rows that carry a mark (or "No purchase here carries a price mark yet"),
and the latest purchase. Real output for NVDA:

> 42% of the purchases (46 of 109) come from one member, Cleo Fields, so this
> is closer to one member's habit than a pattern across Congress. None of the
> 12 members whose committees we map sit on one that oversees technology. For
> the other 10 members no lane is computed, because we map House committees
> only. 28 purchases (26%) were filed for a spouse, joint or dependent
> account rather than in a member's own name. Disclosure took a median of 1
> day from trade to filing; 6 filings came after the STOCK Act's 45-day
> window. Measured from the close on the day each filing was published,
> across all 109 purchases, the median purchase is 21.9% up and 83 of the 109
> compared are ahead of the S&P 500. The most recent was filed on 1 September
> 2026 by Representative John J. McGuire III.

The lane check is sector-level (committee → sectors from
`/api/gov-committees`, the same check `congress-committee.tsx` makes). The
server's own `in_lane` on `top_tickers` is SIC-level via
`committeeJurisdictionDetail` and can differ at the margin; the roster
carries the server's count (`l`) and the index row's caption states that
one. See §9.

## 5. Presentation

Composed from `SeoPageShell` / `SeoSection` / `StatTiles` / `RelatedCards` /
`SeoSkeleton` / `BackLink`, rows on `BoardRow`. The order is fixed and the
verdict comes first: identity, lead, **verdict panel**, how to read this,
figures, then five numbered sections.

Two objects are new, both in `src/components/congress/stock-ui.tsx`, both
inside the house panel (contained, not blended):

- **Roll call** ("Who bought, and when"): one row per member in the order
  they first bought, one mark per purchase on the day it was disclosed,
  sized by the band floor, hollow for options. Month ticks, year rules.
  Members whose committee lane covers the issuer carry a `LANE` tag on the
  row label; the lane is a word, not a colour, because "in lane" has to be
  readable as words to mean anything. Past 18 rows the rest share a final
  row. The mark vocabulary deliberately does not reuse the boards'
  filled/hollow = beat/trailed meaning.
- **Band ladder** ("Disclosed bands"): purchases per disclosed band with a
  `MeterBar` relative to the largest tier. The one chart native to the data.

Then the members as `BoardRow` (portrait, name, party, seat; the lane line
as the second line; purchases, band, last filed as facts), the lane panel
(mapped committees covering the sector, who on them bought, counts of "out"
and "not computed" beneath), and the purchases table with the lag as a
column ("116 days · late").

The index leads with the 25 most widely bought as ranked `BoardRow`s (figure
= members), then a live "Filed most recently" strip from the feed (one row
per ticker, linking to its page whether or not it is above the bar), then
the 98 published names in a three-column ruled grid with filler cells so the
rules finish.

## 6. Files

New:

- `shared/congress-stocks.js` + `.d.ts`: floor, slugs, `cleanIssuer`,
  `stockRollup`, `memberLane`, `bandLadder`, every sentence, roster helpers.
- `shared/congress-stocks-roster.js` + `.d.ts`: **generated**, do not edit.
- `scripts/congress-stocks-roster.mjs`: regenerates the roster; `--dry`
  prints the distribution.
- `src/pages/congress-stock.tsx`, `src/pages/congress-stocks.tsx`.
- `src/components/congress/stock-ui.tsx`: `StockTitle`, `RollCall`,
  `BandLadder`, `StockMemberList`, `PurchasesTable`, `StockLanePanel`,
  `StockCell`.
- `functions/congress/stocks/[ticker].js`, `functions/congress/stocks/index.js`.

Edited (appended at the end of lists):

- `src/App.tsx` (two routes), `functions/_middleware.js` (skip list),
  `shared/seo.js` (SPA fallback title/description), `functions/sitemap.xml.js`
  (`congressStockEntries`, no fetch), `src/components/seo/cta-copy.ts`
  (`congressStockCta`).
- `src/components/congress/congress-ui.tsx` and
  `functions/congress/members/[slug].js`: issuer links now go to the stock
  page (see §3).
- `src/pages/congress-members.tsx`: "By stock" card in Read next.

## 7. Verified vs not

**Verified**

- `npm run build` (tsc + vite) passes. ESLint on the touched TSX files: 0
  errors (prettier warnings auto-fixed on the four new/edited files only).
- `shared/congress-stocks.js` unit-run with node against live rows for NVDA,
  MSFT, UNH, AMAT, OTIS: rollup, bar, lane split, lag, outcome, band ladder
  and every sentence printed and read. `cleanIssuer` checked on seven real
  asset descriptions.
- Roster generated from live data; distribution in §2.
- `shared/seo.js` fallbacks and canonical/indexable exercised with node for
  `/congress/stocks`, `/congress/stocks/nvda`, `/congress/stocks/brk.b`.
- Render pass, headless Chrome on the vite dev server against the live API,
  520 and 1280 wide, PNGs looked at: `/congress/stocks` (full length),
  `/congress/stocks/nvda` (full length, 6400px), `/congress/stocks/unh`
  (in-lane case, `LANE` tags), `/congress/stocks/otis` (below-bar state),
  `/congress/stocks/zzzzz` (not-found state). Two defects found and fixed
  from the PNGs: "1 days", and opening marks half-clipped against the label
  column (no left padding). Dark mode not captured.
- `node --check` on all five Functions files.
- The pre-render Functions under `wrangler pages dev dist` (wrangler 4.60)
  with a `Host: ddbx.us` header, against the live API:
  - `/congress/stocks/nvda`: 200, title "NVIDIA Corporation (NVDA) stock
    purchases by members of Congress", canonical
    `https://ddbx.us/congress/stocks/nvda`, h1 and "The verdict" in the body.
  - `/congress/stocks/brk.b`: the dotted slug resolves through the
    `[ticker]` segment; title and canonical correct.
  - `/congress/stocks/otis` (below bar) and `/congress/stocks/zzzzz`
    (no rows): `noindex, follow`, shell served (the shell's generic title,
    same as a below-bar member page).
  - `/congress/stocks/nvda` with `Host: ddbx.uk`: noindex.
  - `/congress/stocks`: title, canonical, roster table.
  - `/sitemap.xml` on ddbx.us: 99 `congress/stocks` URLs (index + 98), each
    ticker with its `lastmod`.
  - `/congress/members/josh-gottheimer-g000583`: issuer links now point at
    `/congress/stocks/msft`, `/v`, `/tsla`.

**Not verified**

- Behaviour on the live ddbx.us host (the above is local Pages emulation).
- Dark mode.

## 8. Data-side needs (ddbx-data, not built here)

1. **`GET /api/gov-tickers`**: the ticker aggregate. One row per ticker:
   `{ ticker, company, sector_normalized, members, rows, filings,
   in_lane_members, first_disclosed, last_disclosed, member_ids }`, computed
   in one pass over `us_gov_dealings` the way `getGovMembers` does for
   members. Cache an hour. When it lands: the index page, its pre-render and
   `congressStockEntries` in the sitemap switch to it, `relatedTickers`
   reads `member_ids` from it, and `scripts/congress-stocks-roster.mjs` +
   `shared/congress-stocks-roster.js` are deleted. The site-side shape is
   already the roster's (`t c s m r l last ids`), so the swap is a fetch and
   a field rename.
2. **Sales.** Ingest `sale_full` / `sale_partial` rows (the scrapers already
   parse them; `ingest.ts` drops them). Wire: `transaction_type` already
   carries the value; `acquired_disposed` too. The feed would need
   `?tx=all|purchase` with `purchase` the default so no consumer changes
   behaviour. Then the roll call gets a second mark and the verdict gets a
   "later sold" clause, and `PURCHASES_ONLY_NOTE` goes.
3. **Sector coverage.** Tickers with no SIC get no sector and therefore no
   lane. A fallback (ticker → sector via the prices/companies tables) would
   close the `nosector` state for the large caps.
4. Optional: `?ticker=` on `/api/gov-dealings` accepting a comma list, so a
   related-tickers strip could show live figures.

## 9. Open decisions

1. **The roster snapshot.** It is a generated file checked into the repo,
   like `hero-deal-data.ts`, and it is the reason the index can exist today.
   It goes stale between runs (the index says the as-of date; the ticker
   pages never read it). Options: accept and re-run the script with each
   site deploy until §8.1 lands; or hold the index and sitemap until §8.1
   and ship only the ticker pages (reachable from member pages). I built the
   former. **This is the decision to make.**
2. **The floor.** 5/10 gives 98 pages. 4/10 gives 106, 3/10 gives 111,
   3/5 gives 243. The constants are one line each.
3. **Lane check: sector-level (site) vs SIC-level (server).** The page
   computes the lane from `/api/gov-committees` sectors, as the committee
   page does; the roster carries the server's SIC-level `in_lane` count. The
   two can differ at the margin for one issuer. Publishing the server's
   per-row answer (`rating_explain` already states it in prose) would need
   a structured `in_lane` on `GovDealing`.
4. **Title wording.** "stock purchases by members of Congress" is honest
   about the purchases-only corpus; "stock trades" is what people search.
   Chosen honesty; revisit when sales land.
5. **ETFs in the live strip.** The "Filed most recently" strip shows whatever
   the feed shows, and this fortnight that is iShares, Tradr and Avantis
   ETFs. They have pages like any ticker. Whether ETFs should be excluded
   from the index (not from the record) is a taste call.
6. **Nav.** No masthead or footer link was added; the family is reachable
   from the member directory's Read next, every member page's issuer list,
   and the sitemap. A "By stock" entry in the Congress dashboard would need
   `src/lib/markets/congress.tsx`, which I did not touch.

---

## Review round, 17 September 2026

An external review raised four findings. All four held up when checked. This
section records what changed. Where it contradicts §2 to §9 above, this
section wins.

### 1. The roster snapshot is gone (§8.1 built, §9.1 decided)

The hub, its pre-render, the sitemap and the ticker page's bar now read
**`GET /api/gov-stocks`**, a new additive route in ddbx-data (branch
`feat/congress-stock-roster`, not merged or deployed).
`shared/congress-stocks-roster.js`, its `.d.ts` and
`scripts/congress-stocks-roster.mjs` are deleted.

- **Contract.** No params. It returns `{ as_of, corpus: { members, purchases,
  tickers }, stocks: GovStockSummary[] }`, with one entry per ticker that has
  a purchase: `ticker, company, sector_normalized, members, purchases,
  filings, in_lane_members, first_disclosed, last_disclosed, is_fund, buyers:
  [{ id, purchases, lane, via }]`. Stocks are sorted by members, then
  purchases, then ticker. `lane` is `in | out | unmodelled | unclassified`.
  It is edge-cached for an hour under the synthetic key
  `gov-stocks.ddbx.internal/v1`, with fresh `Cache-Control: max-age=3600` on
  a hit. The body is 447 KB raw and 36 KB gzipped.
- **The bar stays in the site.** The route returns counts, and
  `stockMeetsBar` / `stockPublished` in `shared/congress-stocks.js` apply
  5 members and 10 purchases. `/api/companies` does the same: the bar is an
  SEO judgement and should move without a Worker deploy.
- **One entry decides everything.** The ticker page's indexability now
  comes from the ticker's roster entry (`stockPublished(entry)`), not from
  the live rows. So the hub, the sitemap and the page cannot disagree. Counts
  only grow, so a stale hour can hold a newly qualifying ticker back as a
  stub. It can never advertise a ticker that then noindexes.
- **Failed is not empty.** `readStocks(body)` returns `failed`, `empty` or
  `ok`. The React hub renders "Couldn't load the stock list" on `failed` and
  "Not enough data yet" on `empty`. The pre-render serves the plain shell on
  `failed` (any status, because a 404 from a list route is an outage, not an
  answer) and noindexes on `empty`. The sitemap drops the family on either.
  The ticker page needs both fetches: if the roster fails, the page shows its
  failed state rather than guessing a bar or a lane.
- **Types.** The consumed shape is declared in `shared/congress-stocks.d.ts`,
  because `check:types` diffs against the sibling checkout. Once ddbx-data
  merges, run `npm run sync:types` and swap those declarations for imports.

Measured through `wrangler dev --remote` against production D1 (read-only):
76 members, 5,118 purchases and 1,082 tickers as of 14 September. 98
entries clear the bar, the same set the snapshot had, and none is a fund.
MSFT has 26 members, 100 purchases and 5 in lane. NVDA has 22, 109 and 0.
UNH has 19, 42 and 5. The endpoint's purchase count equals
`/api/gov-dealings?view=all&ticker=` for NVDA, UNH, V and IBIT.

### 2. One lane calculation (§4, §9.3)

The site no longer computes a lane. `memberLane()` and its
`/api/gov-committees` read are gone. Each buyer's lane comes from
`buyers[].lane` / `via`, which ddbx-data computes with
`committeeJurisdictionDetail` (SIC first, ICB fallback, in lane at a score of
0.5 or more), the same rule the member detail's `in_lane` uses. Consequences:

- The fourth state is renamed from `nosector` to `unclassified` (neither a
  SIC nor a sector is held). A fifth, site-only state, `pending`, covers a
  buyer whose purchase is newer than the cached roster. The page says the
  check has not reached that buyer yet and does not guess.
- The copy changed from "oversees technology" to "whose jurisdiction covers
  {company}". A SIC-level match is finer than the sector, so the sector
  phrase could name a sector the check never used.
- The lane panel lists only the committees the in-lane buyers are matched
  through. It no longer lists every committee whose sectors include the
  issuer, because that list was the sector-level recomputation.
- One reading worth knowing: Visa is `Industrials` by its SIC mapping, so the
  ICB fallback puts five buyers in lane via Transportation and Armed
  Services. That is the scorer's answer and it now shows on the page. If it
  looks wrong, the fix is in ddbx-data's SIC map, not here.

### 3. Returns out of the headline

- The verdict has no outcome clause. `outcomeSentence` and `rollup.outcome`
  are deleted, and a test asserts the verdict carries no return.
- The "Since filing" column in the purchases table stays, because it sits
  beside each row's filed date. Each figure now prints its span underneath
  ("136 days, to Sep 14"). The caption says rows are measured over different
  holding periods and are not a track record. The pre-render's footer says
  the same.
- **Not done: fixed horizons per stock.** `GovDealing` carries no
  `performance` rows, and fixed-horizon returns exist for Congress only per
  member (`gov_member_performance`, 30 and 90 days, matured only, computed by
  cron). A per-ticker version would be a cron-materialised table, not a
  request-path query. Until it exists the page states no aggregate return.

### 4. ETFs (CS5)

`is_fund` is decided server-side by `worker/pipeline/us-gov/funds.ts`. The
test is whether the majority of a ticker's filed names read as a fund. The
filer prefixes "Portfolio Rebalance" and "ETF " are stripped, and any name
saying "common stock" counts as a stock. It flags 34 tickers (IBIT, IVV,
SPYM, the iShares bond ETFs, the SPDR sector funds) and none of the single
stocks that the looser `congress-board.ts` regex catches ("Invesco Ltd
Common Stock", "ETF Ford Motor Company"). Funds are left out of the hub list,
the "Filed most recently" strip and the sitemap, and their pages noindex.
They still render, with a verdict if they clear the bar. The hub names how
many were left out. `congress-board.ts` still uses its own looser regex;
aligning it is a follow-up for whoever owns the weekly board.

CS2 (the floor) and CS4 (the title) are unchanged. Canonicals were checked:
`/congress/stocks*` resolves to the `usg` market, so it canonicalises to
ddbx.us like the member pages, and the Functions hardcode the same
`OWNING_HOST`.

### Verification

- Site: `npm test` passes 19 of 19, including 11 new tests in
  `tests/congress-stocks.test.mjs` covering floor admission, ETF exclusion,
  failed vs empty, the server lane with the pending state, and a verdict
  with no return. `npx tsc --noEmit` and `npm run build` are clean, and
  ESLint shows 0 errors on the touched TSX.
- Data: `npm run typecheck` is clean. ddbx-data has no test suite.
- Render pass (headless Chrome, Vite on 5204):
  - Hub and UNH ticker page at 1440 and 520, with Vite pointed at
    `wrangler dev --remote` on 8794 so the endpoint existed. Server lanes
    show via Financial Services, the recent strip has no ETFs, and each
    purchase row shows its holding period.
  - The hub's failure state at 1440 and 520, against the production API,
    where `/api/gov-stocks` is a 404 today.
- Not verified: the Functions under `wrangler pages dev`, because they
  hardcode `api.ddbx.uk`, where the route does not exist yet. Dark mode and
  the live ddbx.us host were also not checked.

### Post-merge order

1. Merge and deploy ddbx-data (`npm run deploy`). Check that
   `https://api.ddbx.uk/api/gov-stocks` returns 200.
2. In ddbx-site, run `npm run sync:types` and `npm run check:types`, then
   replace the local wire declarations in `shared/congress-stocks.d.ts` with
   imports.
3. Ship the site. **Not before step 1:** until the route exists, the hub
   shows its failure state and every ticker page shows "Couldn't load this
   stock".
