# Family: LEADERBOARD (biggest-buys)

## Routes reviewed

- `/biggest-buys` (rolling, canonical)
- `/biggest-buys/:year` (archive; `/biggest-buys/2026` today)
- `/biggest-buys/<not-a-year>` (invalid-year branch)
- `ddbx.us` variants of all of the above
- `/sitemap.xml` (year-board entries)

## Files read

- `src/pages/biggest-buys.tsx`
- `functions/biggest-buys/[[route]].js`
- `shared/leaderboard.js`, `shared/leaderboard.d.ts`
- `shared/dealings-feed.js`, `shared/prerender.js`, `shared/sectors.js` (`windowStart`), `shared/seo.js`
- `functions/sitemap.xml.js`, `functions/_middleware.js`
- `src/components/seo/{page-shell,skeletons,section,related-cards,stat-tiles,meter-bar,tracking-notice,cta-copy,app-cta-band,seo-rail}.tsx|ts`
- `src/components/{sector-ui,cluster-chip}.tsx`
- `src/types/ddbx.ts` (`LivePerformance`)
- `../ddbx-data/worker/db/{live-performance.ts,queries.ts,us-queries.ts,gov-queries.ts,types.ts}`
- Comparators: `src/pages/{sectors,sector,reports,report,learn,companies}.tsx` (footnote usage)
- `git show 2048451`

---

## Prior claims — held / refuted

**[held] Family uses SeoPageShell with correct order and loading suppression.**
`biggest-buys.tsx:266-326` composes `SeoPageShell` for the live board and
`:232-251` for the invalid-year branch. No hand-rolled header remains. The
shell owns ordering (`page-shell.tsx:139-164`), so the pre-rebuild bug (band in
the middle of the document, methodology + archive published below it) is
structurally impossible now — the band is emitted after `{children}` by
construction. `loading={rows === null}` (`:280`) suppresses band + footnote.

**[held] Real SeoSkeleton matching layout (not a generic pulse block).**
`biggest-buys.tsx:301-306` passes `stat-tiles` (rows=4) + `ranked-board`
(rows=`TOP_N`=25), and `TOP_N` is the real cap, exactly what
`skeletons.tsx:39-42` asks for. **Partial miss** — see module 7: the skeleton
omits the ~28px column-header row that sits between the tiles and the `<ol>`
in the loaded layout (`biggest-buys.tsx:380-390`), and it draws the meter
inside the middle column whereas the loaded row spans it across all three
(`:628-632`). Structure is right; two small height/shape deltas remain.

**[held] Eyebrow present and family-correct.**
`biggest-buys.tsx:238` and `:279` — `eyebrow="Leaderboard"`, matching the
memory's stated family list. Mono brown via `page-shell.tsx:113-119`. The
pre-render mirrors it as a styled `<p>` at `[[route]].js:190,192`, so the
crawler sees the same kicker.

**[held] Terminal AppCtaBand (not mid-page) with non-converged family copy.**
`leaderboardCta` is a function (`cta-copy.ts:53-68`) and branches on `year`:
the closed-year board gets "The {year} board is closed. The next one is being
written now." and the rolling board gets "The next one on this list will buzz
your phone." Bodies do not converge with the sector/learn/reports bodies —
the leaderboard body sells scale-triggered alerts, as the module docstring
claims. `gaLabel` is year-scoped (`biggest-buys.tsx:274`). House style holds:
the claim is timeliness ("the day it files"), never performance.

**[held] RelatedCards instead of bare link lists.**
Year archive uses `RelatedCards` at `:499` (and `:249` on the invalid-year
branch). **Partially refuted** — the mobile onward-links block at `:423-441`
is a hand-rolled tile grid using `R.tile`, not `RelatedCards`. It's not a bare
underlined list so it doesn't violate the letter of the rule, but it is a
second onward-link vocabulary on the same page as the first. See module 12.

**[held] Pre-render ↔ React parity (no inversions).**
Every fact in `[[route]].js` prerender has a visible React equivalent:
tracking caveat (`:195` ↔ `TrackingNotice` at `:289`), truncation caveat
(`:196` ↔ `:294-297`), summary line (`:197` ↔ `StatTiles` at `:349-374`), the
25 rows incl. person/date/value/alpha/worth-if-held (`:163-178` ↔ `BuyRow`),
suppressed-count caveat (`:206` ↔ `:409-417`), full `METHODOLOGY` (`:186-188`
↔ `:454-467`), year boards (`:209` ↔ `:494-501`), cross-links (`:210` ↔
`:423-441`). The column headers the pre-render names are now also on the React
page (`:380-390`) — that inversion is fixed. Two residual deltas, both
React-only extras (allowed): the meter-bar methodology line (`:457`) and the
`/reports` + `/learn` cross-links, which the pre-render's footer link row does
not carry (`[[route]].js:210` lists `/sectors`, `/companies`,
`/learn/open-market-buy`, `/learn/cluster-buying`).

**[held] Leaderboard "now worth" uses disclosure-close baseline** — *with a
stated caveat that is itself a copy bug.*

The prior claim is **real and verified**. `git show 2048451 --
src/pages/biggest-buys.tsx` shows the removed code:

```
-  const stockPct = d.live_performance?.return_pct_trade;
-  const worthNow = typeof stockPct === "number" && value > 0 ? value * (1 + stockPct / 100) : null;
```

replaced by `biggest-buys.tsx:535-536`:

```535:536:src/pages/biggest-buys.tsx
  const ret = buyReturn(d);
  const worthNow = ret != null && value > 0 ? value * (1 + ret) : null;
```

and `buyReturn` at `shared/leaderboard.js:98-103` reads
`lp.return_pct_disclosed ?? lp.return_pct_trade`. The pre-render uses the same
helper (`functions/biggest-buys/[[route]].js:160-161`), so both renderers now
compute the figure from the disclosure-day close. **Held.**

**The caveat (new finding, not a refutation of the claim):** the `??` is a
silent fallback to the *trade* anchor, and the published methodology states the
disclosure baseline unconditionally:

```161:161:shared/leaderboard.js
  "Performance is measured from the closing price on the day the purchase was disclosed — the first price a reader could have paid — not from the insider's own fill, and is marked against the most recent cached close rather than a live quote.",
```

The fallback can fire. `return_pct_disclosed` is derived from
`disclosed_close_pence` (UK: `ddbx-data/worker/db/queries.ts:238`) /
`disclosed_close` (US: `us-queries.ts:292`), which is nullable *independently*
of the fill price feeding `return_pct_trade`
(`stockEntryTrade: r.price_pence` / `parsed.price`). `LivePerformance` types
every field `number | null` (`src/types/ddbx.ts:500-506`;
`ddbx-data/worker/db/types.ts:494-500`) and `buildLivePerformance` computes the
two anchors separately (`live-performance.ts:158-169`) — nothing couples them.
A freshly-disclosed buy whose disclosure-day bar isn't cached yet renders
"worth £X if still held" and "Alpha since disclosure: +N.Npp" measured from the
insider's own fill, under a methodology sentence that explicitly says it isn't.

The same `?? *_trade` fallback is a deliberate site-wide convention and is
documented as such elsewhere — `shared/sectors.js:326-328` ("Falls back to the
trade anchor only when disclosure is missing") and
`src/lib/performance/channel-summary.ts:175,183`. So the *code* is consistent
with the house rule; the *published methodology* is the thing that overstates.
`buyAlpha` (`shared/leaderboard.js:91-96`) has the identical fallback under a
column literally headed "Alpha since disclosure"
(`biggest-buys.tsx:388`, `:610`; `[[route]].js:204`).

**Verdict: claim held; methodology copy needs one clause.**

**[held] Year boards in the sitemap.**
`functions/sitemap.xml.js:298-304` pushes `archiveYears(BOARD_EARLIEST_YEAR,
new Date()).map(leaderboardPath)` for every host in `COMPANY_MARKET_BY_HOST`
(ddbx.uk + ddbx.us). Derived from the same helper the page's archive cards use
(`biggest-buys.tsx:201`), so the two can't disagree. See Bug 3 for the
new-year edge.

**[held] Route owns its whole `<head>`; middleware skip list correct.**
`functions/_middleware.js:101-102` skips both `/biggest-buys` and
`/biggest-buys/`, and `[[route]].js` sets title/description/canonical/OG/
breadcrumbs via `renderInto` (`:260-279`). No double-canonical.
`isForeignResearchPath` 301s the route off ddbx.eu (`shared/seo.js:129-147`).

**[held, and deliberate] Insider names in the pre-render.**
Unlike the sector pre-renders (rubric hard constraint 3), the leaderboard
pre-render *does* publish insider names (`[[route]].js:170`, "Bought by"
column). This is not an inconsistency to fix: the React page shows the same
names (`biggest-buys.tsx:576-583`) so parity holds, and the page docstring
(`:8-12`) reasons it explicitly — this ranks transactions and names the filer,
which is what the disclosure itself is; it deliberately does not rank people.
Flagging so a future reviewer doesn't "fix" it.

**[n/a to this family]** Brokers disclosure, learn jurisdiction, sector 1000-row
cap messaging, ddbx.us broker rail, report AI byline, `/sectors` `/learn`
`/reports` index pre-renders. One note on the rail: `SeoRail` correctly gates
the UK broker directory (`seo-rail.tsx:48-62`), so `/biggest-buys` on ddbx.us
gets the app rail, not UK brokers — that claim holds here too.

**[refuted] Shell order complete — the family's terminal ruled footnote is
missing.** See Bug 1.

---

## Per-module verdicts

1. **`SeoRail` (right rail)** — **keep** — `biggest-buys.tsx:261-265` — none.
   Correct market gate, `placement="biggest_buys_rail"` distinguishes rail from
   band in GA, and `AppPromoAside` self-filters the link to the page it's on
   (`seo-rail.tsx:92-96`). Only nit is shared, not local: `seo-rail.tsx:99,100,
   107` hardcode `#e8e0d5`/`#faf7f2` where `border-hairline` / `bg-sheet` tokens
   exist.

2. **Breadcrumbs** — **keep** — `biggest-buys.tsx:267-271` — none. Present on
   year boards only (correct: the rolling board is root), mirrored as
   BreadcrumbList JSON-LD in `[[route]].js:264-269`.

3. **Eyebrow "Leaderboard"** — **keep** — `biggest-buys.tsx:279` — none.

4. **H1 + standfirst** — **keep** — `biggest-buys.tsx:307-325` — none. H1 and
   standfirst match the pre-render word for word (`[[route]].js:193-194`),
   including the `/learn/open-market-buy` link inside the standfirst. `periodLabel`
   is computed identically on both sides (`:256` / `:254`).

5. **Notice block** (methodology anchor + `TrackingNotice` + truncation caveat)
   — **tune** — `biggest-buys.tsx:282-299` — the `#methodology` anchor renders
   during loading (the shell puts `notice` outside the loading branch,
   `page-shell.tsx:137`), so for the duration of the fetch the first screenful
   carries a link to a section that does not exist in the DOM. Gate the anchor
   line on `rows !== null`, or move it into the `StatTiles` note.

6. **Truncation caveat (`!complete`)** — **keep** — `biggest-buys.tsx:290-298`
   — none. Risk-amber well (`CAVEAT`, `:74-75`) using the `bg-risk` token, not a
   local hex; wording matches the pre-render (`[[route]].js:196`). The
   underlying paging is real (`shared/dealings-feed.js`). But see Bug 2 for how
   `complete` behaves on a *failed* fetch.

7. **Loading skeleton** — **tune** — `src/components/seo/skeletons.tsx:69-89`
   vs `biggest-buys.tsx:376-390` — the loaded layout inserts a column-header row
   (`mt-8 pb-2.5`, ~28px) between the stat tiles and the `<ol>`; the
   `ranked-board` skeleton goes straight from `mt-8 border-t` into rows, so the
   whole board jumps up ~28px on arrival. Add a header-height spacer to the
   `ranked-board` variant (it is the only consumer). Secondary: the skeleton's
   meter sits inside the middle column (`skeletons.tsx:79`) whereas the loaded
   meter spans all three (`biggest-buys.tsx:628-632`).

8. **`StatTiles` (Purchases / Combined value / Companies / Median alpha)** —
   **tune** — `biggest-buys.tsx:349-374` — the median-alpha tile has no
   sample-size qualifier. `summary.medianAlpha` (`:177-194`) is taken from
   `alphas.filter(a => a != null)`, which on a board of 25 can be a handful of
   rows — recent purchases have no mark. The sector pages state exactly this
   ("N of M buys have a performance mark; the median is taken from those",
   `sector-ui.tsx:223-225`); the leaderboard is the family that dropped it.
   Extend the existing `note` (`:352`) with the alpha count. Same gap in the
   pre-render's `summaryLine` (`[[route]].js:123`) — fix both in one change per
   the parity rule.

9. **Column header row** — **keep** — `biggest-buys.tsx:380-390` — none. This is
   the parity repair the commit claims; `aria-hidden` is correct because each
   row states its own label (`:610`).

10. **`BuyRow`** — **keep** — `biggest-buys.tsx:507-637` — none, structurally.
    This is the best version of itself and speaks the house vocabulary the
    uplift doc §2 asks for: `CompanyLogo`, `TickerPill`, `DeltaBadge`,
    `ClusterChip`, `MeterBar`, mono tabular rank with podium ink, whole-row link
    target, `text-positive`/`text-negative` via `DeltaBadge` rather than local
    emerald/rose. Two sub-nits below rather than a downgrade:
    - **tune** — `:595-600` — "Cluster of 3" is the whole framing a cold visitor
      gets; the pre-render says "Part of a cluster of 3 insiders"
      (`[[route]].js:167`). The chip's tooltip carries the explanation, which is
      hover-only. Append "insiders" to the visible text.
    - **tune** — `:604-608` — the value has no screen-reader label while the
      alpha does (`:610`). "£4.2m" is announced bare inside a very long link
      label. Add `<span class="sr-only">Value bought: </span>`.

11. **Suppressed-entries caveat** — **keep** — `biggest-buys.tsx:409-417` —
    none. Stated editorial rule rather than a silent filter, as
    `shared/leaderboard.js:105-115` argues; mirrored at `[[route]].js:206`.

12. **Mobile cross-links nav** — **move** (and fold into `RelatedCards`) —
    `biggest-buys.tsx:421-441` — it sits *between* the board and the methodology
    section, so on a phone the reading order is board → onward links →
    methodology → year boards → CTA. The onward-links module is interrupting the
    document instead of closing it, and it is a second card vocabulary
    (`R.tile`) beside `RelatedCards` on the same page. Fix: move below the
    "Boards by year" section and render with
    `<RelatedCards cols={2} items={CROSS_LINKS.map(...)} />` — `RelatedCards`
    already supports `title` + `description` (`related-cards.tsx:15-21`), and
    `CROSS_LINKS` (`:88-97`) is already shaped that way (`label`/`hint`). That
    also drops the `lg:hidden` special case: the tiles are useful on desktop
    too, and the rail's link list is a different, quieter object.

13. **Methodology section** — **keep** — `biggest-buys.tsx:443-492` — none for
    the module. `SeoSection variant="rail"` is the right shape, the copy is
    imported from the code that enforces it (`METHODOLOGY`), and the glossary
    links give the section an exit. Content bug in one bullet — see Bug 4.

14. **`LogoDevAttribution` placement** — **move** —
    `biggest-buys.tsx:491` — it currently hangs off the end of the methodology
    section. `/companies` puts the same attribution in the shell footnote and
    explains why (`companies.tsx:135-139`). Move it into the footnote added by
    Bug 1's fix so the licence link is in the same place on every logo-bearing
    page.

15. **"Boards by year" `RelatedCards`** — **keep** — `biggest-buys.tsx:494-501`
    — none. Bidirectional (the year board links back to the rolling one,
    `:203-211`), gated on `BOARD_EARLIEST_YEAR` so no empty-board promises, and
    mirrored in the pre-render (`[[route]].js:142-152`).

16. **`AppCtaBand`** — **keep** — `biggest-buys.tsx:272-278` — none.
    Terminal by construction, `screenshotSlot: "cluster"` is a valid slot
    (`app-screenshots.ts:51`) and is contextually right for a board whose rows
    carry cluster chips.

17. **Ruled footnote** — **redesign (missing module)** — `biggest-buys.tsx:266`
    — see Bug 1.

18. **Empty-board state** — **tune** — `biggest-buys.tsx:327-346` — the copy is
    good (explains the qualification rule, offers the rolling board from a year
    board), but it is unconditionally a factual claim and is also what an API
    failure renders. See Bug 2.

19. **Invalid-year state** — **keep** — `biggest-buys.tsx:224-254` — none. Full
    shell rather than a bare paragraph, `cta={false}`, hands over every board
    that does exist, and the pre-render `noindex`es the same URL
    (`[[route]].js:231`).

20. **Pre-render document** — **keep** — `functions/biggest-buys/[[route]].js`
    — none structurally. `[[route]]` catch-all, shared ranking module, mirrored
    `cleanCompany`/`cleanInsider`/`TRACKING_CAVEAT` helpers with comments
    explaining the duplication. `noindex` on non-production host, >1 segment,
    invalid year, unknown market, empty board. Bug 3 covers the one behaviour
    worth changing.

---

## Bugs (correctness / compliance / parity)

**Bug 1 — the leaderboard is the only SEO family with no shell footnote, and
it is the family with the most performance figures on screen.**
`biggest-buys.tsx:266-326` passes no `footnote`. Every sibling does:
`sectors.tsx:103`, `sector.tsx:196`, `reports.tsx:146`, `report.tsx:206`,
`learn.tsx:151,219`, `companies.tsx:135`. Three of those footnotes carry "Past
performance is not a reliable indicator of future results." On the leaderboard
that sentence exists only as the tail of `METHODOLOGY` item 9
(`shared/leaderboard.js:164`) — the ninth bullet of a nine-bullet list, in a
rail section, *above* the CTA band. Meanwhile the page prints
"worth £X if still held" on up to 25 rows plus a median-alpha tile. The shell
grammar puts small print at the true bottom for exactly this reason
(`page-shell.tsx:5-11`). Fix: add a footnote stating the marked-to-cached-close
basis, the "worth if still held" assumption, and the past-performance line, and
fold `LogoDevAttribution` into it (module 14).

**Bug 2 — an API failure renders as "no qualifying purchases in this period".**
`biggest-buys.tsx:134-135` initialises `complete` to `true`;
`:155` handles a fetch rejection with `setRows([])` and never touches
`complete`. So a network error or a 5xx produces `ranked.length === 0`,
`complete === true`, and the page states "No qualifying open-market purchases
in this period" (`:328-346`) as fact, with no error affordance and no retry.
The information to distinguish the two cases is already in hand —
`fetchDealingsWindow` returns `complete: false` when it broke out on `!res.ok`
(`shared/dealings-feed.js:57`) — but the `.catch` bypasses it. Fix:
`.catch(() => live && (setRows([]), setComplete(false)))` and branch the empty
state on `complete` ("We couldn't load the board just now" vs "No qualifying
purchases").

**Bug 3 — the same conflation makes the pre-render `noindex` a page that is
meant to rank, during any API blip.**
`[[route]].js:249-252` noindexes whenever `rows.length === 0`, which is correct
for a genuinely empty board and wrong for a failed fetch — and Googlebot
hitting the site during a Worker/API incident is exactly when this fires.
`complete` is already destructured at `:238` and unused for this decision. Fix:
`if (rows.length === 0 && complete) return noindex(shell);` — when the fetch
failed, serve the shell untouched rather than actively telling Google to drop
an indexed URL.

**Bug 4 — the published methodology overstates the disclosure baseline.**
`shared/leaderboard.js:161` says performance is measured from the disclosure-day
close "not from the insider's own fill", full stop. `buyReturn`/`buyAlpha`
(`:91-103`) fall back to `*_pct_trade` when the disclosure anchor is null, which
is possible whenever `disclosed_close(_pence)` isn't cached
(`ddbx-data/worker/db/queries.ts:238`, `us-queries.ts:292`,
`live-performance.ts:158-169`; every `LivePerformance` field is independently
nullable, `src/types/ddbx.ts:500-506`). `shared/sectors.js:326-328` documents
the identical fallback honestly; the leaderboard's reader-facing copy does not.
Fix (one clause, both renderers automatically since the text is shared): append
"…rather than a live quote. Where the disclosure-day close isn't yet priced,
the insider's own fill is used instead." Alternatively make the leaderboard
strict (`lp.return_pct_disclosed` only, `n/a` otherwise) — cleaner given the
column is *headed* "Alpha since disclosure", at the cost of more `n/a` rows on
recent buys.

**Bug 5 — on 1 January the sitemap and the archive cards advertise a board the
pre-render will refuse to index.**
`archiveYears(earliest, today)` counts down from `new Date().getFullYear()`
(`shared/leaderboard.js:182-192`), so `/biggest-buys/2027` enters
`functions/sitemap.xml.js:298-304` and `biggest-buys.tsx:212-218` at midnight on
1 Jan 2027, when the board has ~0 rows and `[[route]].js:252` noindexes it. The
sitemap's own comment says this is "the one thing the sitemap must not do"
(`sitemap.xml.js:294-297`). Fix: have `archiveYears` drop the current year until
some point in it (a month floor, or gate on row count where the caller has the
data).

**Bug 6 — rolling-window semantics are `disclosed_date` on the wire and
`trade_date` locally.** `fetchDealingsWindow` sends `since` to an API that
filters `disclosed_date >= since` (`ddbx-data/worker/db/queries.ts:314-315`)
and then filters the result on `trade_date` (`shared/dealings-feed.js:102-103`).
For the year boards this is right (a 2026 trade disclosed in 2027 is still
fetched and kept). For the rolling board it silently drops a purchase traded 13
months ago but disclosed last week — a real UK pattern. Low severity and
arguably matching the copy ("purchases … of the last twelve months"), but it is
undocumented at the call site (`biggest-buys.tsx:140`) and worth a comment
either way.

**Non-bugs, recorded so they don't get re-litigated:**
- Insider names in the leaderboard pre-render are deliberate and parity-correct
  (see prior-claims section) — not the sector-page privacy decision.
- "worth if still held" on a closed-year archive board marks to the *latest*
  cached close, not the year-end close. That is what `METHODOLOGY` item 8 says
  it does (`shared/leaderboard.js:163`), so it is consistent, if a slightly odd
  reading of an archive page.
- `summary.companies` collapses null tickers into one bucket
  (`biggest-buys.tsx:186`), and so does the pre-render (`[[route]].js:110`).
  Consistent, and eligible rows always carry a ticker in practice.

---

## Ranked top-5 (effort: S/M/L)

1. **Add the shell footnote (Bug 1).** **S.** The family's only page without
   one, and the one publishing 25 "worth £X if still held" figures plus a
   median alpha. Past-performance + valuation-basis small print belongs at the
   true bottom, below the band, per the shell's own contract. Fold
   `LogoDevAttribution` in while there.

2. **Stop rendering an API failure as "no qualifying purchases" (Bugs 2 + 3).**
   **S.** Two-line React fix (`setComplete(false)` in the `.catch`, branch the
   empty state) and a one-line Function fix (`&& complete` on the noindex
   guard). Currently an outage tells readers there were no big buys and tells
   Google to drop the URL.

3. **Qualify the median-alpha tile with its sample size (module 8).** **S.**
   `sector-ui.tsx:223-225` already states "N of M buys have a performance mark"
   — the leaderboard shows the same statistic with no denominator. Update the
   `StatTiles` note and `summaryLine` in the pre-render together (parity rule).

4. **Fix the methodology's disclosure-baseline claim (Bug 4).** **S** for the
   copy clause, **M** if you make the leaderboard strict instead. The prior
   round's fix is real; the sentence describing it is now the inaccurate part,
   and it sits under a column literally headed "Alpha since disclosure".

5. **Move the onward-links block below the year archive and render it with
   `RelatedCards` (module 12).** **S.** Removes the page's second card
   vocabulary, closes the document instead of interrupting it, and makes the
   links available on desktop too. Bundle the `ranked-board` skeleton's
   missing header-row spacer (module 7) into the same change.
