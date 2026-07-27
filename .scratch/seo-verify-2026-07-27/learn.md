# Family: LEARN (glossary)

## Routes reviewed
- `/learn` (index) — `LearnIndexPage`
- `/learn/:slug` (entry) — `LearnEntryPage`, incl. the not-found state and the
  foreign-host (non-owning domain) variant
- Pre-renders: `functions/learn/index.js`, `functions/learn/[slug].js`

## Files read
- `/Users/jonwillington/ddbx-site/src/pages/learn.tsx`
- `/Users/jonwillington/ddbx-site/functions/learn/index.js`
- `/Users/jonwillington/ddbx-site/functions/learn/[slug].js`
- `/Users/jonwillington/ddbx-site/shared/glossary.js` + `shared/glossary.d.ts`
- `/Users/jonwillington/ddbx-site/shared/leaderboard.js` (`isEligibleBuy`, `buyValue`, `buyPerson`)
- `/Users/jonwillington/ddbx-site/shared/sectors.js` (`windowStart`)
- `/Users/jonwillington/ddbx-site/src/components/seo/{page-shell,section,skeletons,related-cards,cta-copy,app-cta-band,seo-rail}.tsx|ts`
- `/Users/jonwillington/ddbx-site/src/components/{ticker-pill,sector-ui}.tsx`
- `/Users/jonwillington/ddbx-site/src/lib/{api.ts,dealing-dates.ts}`
- `/Users/jonwillington/ddbx-site/functions/_middleware.js`, `functions/sitemap.xml.js`
- `/Users/jonwillington/ddbx-site/src/App.tsx`
- Cross-repo: `../ddbx-data/worker/db/us-queries.ts` (default `view`)

---

## Prior claims — held / refuted

- **[held] Family uses `SeoPageShell` with correct order and loading suppression.**
  Both routes and the not-found state compose it (`learn.tsx:143`, `learn.tsx:177`,
  `learn.tsx:210`); no hand-rolled header survives. Order is enforced by the shell
  itself (`page-shell.tsx:90–162`). Loading suppression is *not exercised* — and
  correctly so: glossary content is static ESM, so neither route passes `loading`.
  The only async surface is `LiveExamples`, which owns its own section-level
  loading state. No mid-page band, no band above the fold.

- **[refuted, minor] Real `SeoSkeleton` matching layout (not a generic pulse block).**
  `SeoSkeleton` is never imported by `learn.tsx`. The one loading state is
  hand-rolled at `learn.tsx:384–399`. In fairness it is *not* a generic pulse
  block — it is row-shaped, mirrors the loaded row (22px circle, two text lines,
  right-aligned value), and matches better than `variant="ruled-list"` would
  (that variant carries a `h-[3px]` MeterBar line these rows don't have, and an
  `mt-10` this section doesn't want). But `skeletons.tsx:19` explicitly names
  "learn examples" as a `ruled-list` consumer, so the documented convention and
  the code already disagree. Fix by amending the comment or adding a rows-only
  variant — not by forcing the wrong shape in.

- **[held] Eyebrow present and family-correct.**
  `const EYEBROW = "Glossary"` (`learn.tsx:68`), passed on index, entry and
  not-found. Renders as the mono brand-brown kicker (`page-shell.tsx:113–119`).

- **[held] Terminal `AppCtaBand` (not mid-page) with non-converged family copy.**
  Band is emitted by the shell after `children` and before the footnote
  (`page-shell.tsx:145–161`). Index uses `learnIndexCta`; entries use
  `entry.cta ?? learnCta(...)` (`learn.tsx:196`). Bodies genuinely diverge:
  the glossary sells recognition (`cta-copy.ts:28`), sectors sell the live feed,
  leaderboard sells scale-triggered alerts, reports sell the recap cycle. Three
  entries carry hand-written overrides (`closed-period`, `rule-10b5-1`,
  `stock-act` — `glossary.js:145`, `:290`, `:318`), which is the family's best
  copy and the right call on the three entries with no live-data module.
  House style holds: no return promises, claim is timeliness/completeness.

- **[held] `RelatedCards` instead of bare link lists.**
  `learn.tsx:281`. The "Sources" block is *still* a bare underlined list
  (`learn.tsx:303–316`) and should stay that way — those are external primary
  instruments with `rel="nofollow noopener"`, not onward internal doors.

- **[held with two drifts] Pre-render ↔ React parity.**
  Every fact in `functions/learn/[slug].js` is visible in React in the same
  order: h1, "Last reviewed", `oneLiner` sheet, body paragraphs, Related,
  Sources, footnote. Same for the index (h1, standfirst, group headings, entry
  titles + descriptions, footnote). No inversions. Two drifts, both listed
  under Bugs: related-link *label* text (title vs term) and related-link
  *targets* on `ddbx.eu`.

- **[HELD — verified hard] Learn live examples follow the entry's jurisdiction, not the host.**
  Full chain, all entry-derived, no host input anywhere in the data path:
  - `learn.tsx:275` — `<LiveExamples owner={entry.owner} …>`; the prop's own
    doc comment at `learn.tsx:337` says "The ENTRY's owner. Not the host's".
  - `learn.tsx:340` — `const market = MARKET[owner]`, where `MARKET`
    (`learn.tsx:73–76`) maps `uk → {id:"UK", symbol:"£"}`, `us → {id:"US", symbol:"$"}`.
  - `learn.tsx:346–349` — feed branches on `market.id`: `api.usDealings` vs
    `api.dealingsWindow`. `API_BASE` is a single origin for all three domains,
    so the endpoint choice is the only market selector and it is entry-driven.
  - `learn.tsx:363` — `isEligibleBuy(d, market.id)`, so the per-market
    eligibility rule (UK flag check vs US Form 4 code check,
    `leaderboard.js:64–76`) also follows the entry.
  - `learn.tsx:452` — `money(buyValue(d), market.symbol)`, so currency follows
    the entry too. No `useSectorMarket()` / `marketForPath()` call exists in
    this file.
  Concretely: `ddbx.uk/learn/form-4` renders `$` Form 4 rows, and
  `ddbx.us/learn/pdmr` renders `£` RNS rows. The claim holds.
  **Caveat:** the same entry-owner value is also wired into the *rail* and the
  *CTA store links* (`learn.tsx:206`, `:215`), which is over-application — see
  Bug 2. The claim as written is about examples and it holds; the rule leaked
  one component too far.

- **[held] Index pre-render for `/learn`.**
  `functions/learn/index.js` owns the whole `<head>` (title, description,
  canonical, preview noindex) and renders every group + entry title +
  description as links. `/learn` and `/learn/:slug` are both on the middleware
  skip list (`_middleware.js:103–104`). Sitemap lists `/learn` for `ddbx.uk`
  and `ddbx.us` (`sitemap.xml.js:64`, `:73`) and per-owner entry URLs
  (`sitemap.xml.js:310`) — `ddbx.eu` correctly gets neither.

- **[n/a]** Brokers disclosure, leaderboard baseline, sector 1000-row cap,
  report AI byline — other families.

---

## Per-module verdicts

### `/learn` (index)

1. **`SeoRail` (index)** — **keep** — `learn.tsx:138` — resolves market from the
   *host* (`ownerForHost(host) === "us" ? "us" : "uk"`), which is the correct
   rule for a commercial rail. Note this is the exact opposite of what the entry
   page does (Bug 2) — the index is the one that's right.
2. **Shell header (eyebrow / h1 / standfirst)** — **keep** — `learn.tsx:143–155` —
   `standfirstSize="lede"` is the right call on a contents page that opens with
   a thesis, and the string is byte-identical to `functions/learn/index.js:28`.
3. **`EntryList` grouped ruled list** — **keep** — `learn.tsx:94–129` — full-row
   link target with hover tint, 17px title over a 62ch description, two groups
   from `GROUPS`. Correct form for a ten-item contents page; the uplift doc
   agreed (§5.3 "already right"). One nit: the group heading at `learn.tsx:101`
   re-implements the mono-uppercase eyebrow at `text-foreground/45` — a second
   instance of the eyebrow style in a file that already gets one from the shell.
   Not worth a fix on its own; fold into any future `tokens.ts` sweep.
4. **`AppCtaBand` (index)** — **keep** — `learn.tsx:144–149` + `cta-copy.ts:33` —
   `screenshotSlot: "today"` is deliberate here and reads fine against "watch it
   live", though `app-cta-band.tsx:64–68` warns the `today` captures were taken
   at a weekend and can show a "Markets closed" empty state. Worth an eyeball
   once real screenshots land; not a code defect.
5. **Footnote** — **keep** — `learn.tsx:69` — matches the pre-render's closing
   line exactly (`functions/learn/index.js:48`).
6. **`functions/learn/index.js`** — **keep** — owns the full head, noindexes
   preview hosts and `ddbx.eu`, renders every spoke link.

### `/learn/:slug` (entry)

7. **Crumbs** — **keep** — `learn.tsx:211` — `Learn / {term}`, last crumb plain
   with `aria-current`. Matches the pre-render's `breadcrumbs` JSON-LD
   (`functions/learn/[slug].js:117–120`).
8. **Eyebrow + h1** — **keep** — `learn.tsx:243` renders `entry.title`, same
   string the pre-render puts in the h1 (`[slug].js:64`). No h1 disagreement
   here (unlike the company page).
9. **Notice block — "Last reviewed" + foreign canonical card** — **tune** —
   `learn.tsx:220–242` — the canonical card is good: linked, in a sheet, not
   set as a caption. But with no `standfirst` on this route the h1 is followed
   immediately by 11px grey "Last reviewed 26 July 2026" before any prose. The
   date is a provenance signal, not a standfirst. Move it below the `oneLiner`
   sheet (and mirror the move in `[slug].js:65`, which does the same thing) so
   the h1 lands on the definition. Also `foreign` is `false` on `ddbx.eu` — see
   Bug 4.
10. **`oneLiner` definition sheet** — **keep** — `learn.tsx:248–250` — the best
    module in the family. Liftable single sentence in a sheet, tokens only
    (`bg-sheet` / `border-hairline` + dark pair), and the pre-render renders the
    same sentence in the same position with the same border treatment
    (`[slug].js:66`).
11. **Body prose (lede + rest)** — **keep** — `learn.tsx:252–269` — 16.5px/85%
    lede stepping down to 15px/80%, 64ch measure. This is the uplift doc's §5.3
    ask, delivered. Text matches `entry.body` in both renderers.
12. **`LiveExamples`** — **redesign (data layer only; presentation is keep)** —
    `learn.tsx:330–416`. The row grammar is right — `CompanyLogo` 22px,
    `TickerPill`, `ClusterChip`, cleaned insider name with `title`, truncation,
    right-aligned semibold tabular money, `LogoDevAttribution`, and a deliberate
    no-MeterBar decision that is correctly argued in the header comment. The
    *selection* is wrong on the UK "recent" path (Bug 1), the sort key
    contradicts the displayed date (Bug 3), and the section vanishing after a
    6-row skeleton is a layout shift (Bug 5). Fix the three and this becomes a
    keep.
13. **`RelatedCards`** — **tune** — `learn.tsx:279–299` — right component, right
    owner-aware URL logic, and using `e.term` over `e.title` for the card label
    is the correct editorial call. Two notes: the owner-aware branch is
    currently dead code (no entry today relates across owners — UK entries
    relate only to UK, US only to US), so it is untested; and the label differs
    from the pre-render's (Bug 7).
14. **Sources** — **keep** — `learn.tsx:301–318` — bare list is correct for
    external primary instruments; `nofollow noopener noreferrer` + `target`
    present; the `aside` ("The primary instrument, not our summary of it.") is
    good copy. Only 3 of 10 entries carry sources, which `glossary.js:52–54`
    argues for explicitly — omission over padding. Agreed.
15. **`AppCtaBand` (entry)** — **keep** — `learn.tsx:212–217` — `gaLabel` is
    per-slug so conversion is attributable per entry; `ctaSlot` varies
    (`alert` / `cluster` / default `analysis`) and the three hand-written
    overrides are the strongest copy in the family. `stock-act`'s "Congress
    files in weeks. Company insiders file in days." is honest about what we
    *don't* publish — exactly right.
16. **Footnote** — **keep** — same string both renderers.
17. **Not-found state** — **keep** — `learn.tsx:169–186` — hands the reader the
    full contents page instead of an apology, keeps the shell furniture, so no
    layout jump. No CTA band and no footnote here, which is defensible (the list
    *is* the onward path). Minor: it reuses `placement="learn_index_rail"`, so
    dead-slug rail conversions are indistinguishable from real index ones in GA.
18. **`SeoRail` (entry)** — **redesign** — `learn.tsx:206` — market follows the
    *entry*, not the reader. See Bug 2. One-line fix.
19. **`functions/learn/[slug].js`** — **keep** — the ownership enforcement
    (render + canonical + noindex off-owner, `[slug].js:92–111`) is the most
    valuable thing in this family and it is correct. Renders every React fact
    in React's order.

---

## Bugs (correctness / compliance / parity)

**Bug 1 — UK `liveData: "recent"` is unfiltered, so "purchases" headings can show sells and scheme awards. (HIGH)**
`learn.tsx:358–368`: `kind === "clusters"` filters on `d.cluster`,
`kind === "open-market"` filters on `isEligibleBuy`, and `"recent"` filters on
**nothing**. For UK entries the pool is `api.dealingsWindow(...)`
(`api.ts:162`), which returns raw `Dealing` rows — `tx_type: "buy" | "sell"`
(`types/ddbx.ts:425`) plus scheme awards where `is_open_market_buy === false`.
Every other UK consumer filters: `markets/uk.tsx:528` does
`.filter(d => d.tx_type === "buy" && d.is_open_market_buy !== false)`.
Affected entries: `pdmr` ("**Recent PDMR purchases**"),
`what-a-director-buy-signals` ("**Recent purchases**"), and to a lesser degree
`rns-announcements` / `mar-article-19` (whose headings say "announcements" /
"disclosures", so they're defensible — though a disposal rendered as a bare
money figure under a page about buying still misleads).
This is self-refuting content: `/learn/open-market-buy` argues at length that
distinguishing a genuine purchase from an award "matters most" and that a
leaderboard skipping the step "would be topped by share allotments" — and the
sibling entry then prints exactly that. The US path is safe by accident:
`/api/us-dealings` defaults to `view: "interesting"`
(`../ddbx-data/worker/db/us-queries.ts:138`), which is code P + acquired +
direct + non-10b5-1 + non-derivative.
**Fix:** filter `"recent"` to buys for UK — either `isEligibleBuy(d, "UK")`
(strict, drops unpriced rows) or the softer feed rule
`d.tx_type === "buy" && d.is_open_market_buy !== false`. Given these are
illustrative examples rather than a ranking, the softer rule is the better fit;
the strict one would empty a quiet week.

**Bug 2 — the rail's market follows the entry's jurisdiction, so `ddbx.us` gets the UK affiliate broker directory. (HIGH, compliance-adjacent)**
`learn.tsx:206`: `marketId={entry.owner === "us" ? "us" : "uk"}`.
`SeoRail` treats `"uk"` as "render `BrokerAside`" (`seo-rail.tsx:48–60`), and
its own header comment (`seo-rail.tsx:18–23`) states the rule this breaks:
"the affiliate directory is UK-only editorial … dropping it onto ddbx.us would
fill the rail with platforms a US reader can't use." `company.tsx:406` records
the same defect being fixed on the company page — "it was selling UK platforms
to US readers." The entry page reintroduces it.
Consequences both ways:
- `ddbx.us/learn/{pdmr, mar-article-19, closed-period, rns-announcements,
  open-market-buy, cluster-buying, what-a-director-buy-signals}` — 7 of 10
  entries — render UK affiliate broker links to a US audience. These URLs are
  noindexed, so the traffic is inbound-link/typed only, but the FCA/ASA posture
  on affiliate promotion to a non-UK audience is not something to leave to low
  volume.
- `ddbx.uk/learn/{form-4, rule-10b5-1, stock-act}` drop the UK broker rail
  entirely and show the US app rail (with a `/us` home link and US App Store
  buttons) to a UK reader — lost affiliate revenue and the wrong store listing.
The index gets this right (`learn.tsx:134`, host-derived), as do
`sectors.tsx:90`, `sector.tsx:182` and `reports.tsx:133` (all
`useSectorMarket()`/host-derived).
**Fix:** `learn.tsx:206` → `marketId={owner === "us" ? "us" : "uk"}` (the host
owner already computed at `learn.tsx:166`). The entry-owner rule governs the
*data* (per the file header, point 2); the rail is furniture for the reader.
The CTA band's `marketId` at `learn.tsx:215` is a genuinely closer call — the
UK app doesn't cover Form 4, so offering the US app on `/learn/form-4` is
arguably right — leave it, but decide it deliberately rather than by
inheritance, and add a comment saying which rule applies where.

**Bug 3 — examples are sorted by `trade_date` but display `disclosed_date`, so the dates render out of order. (MEDIUM)**
`learn.tsx:366`: `.sort((a, b) => (a.trade_date < b.trade_date ? 1 : -1))`.
`learn.tsx:447`: the row prints `formatDisclosedCompact(d.disclosed_date)`.
UK disclosure lags the trade by days and US Form 4 by up to two business days,
so the visible date column will frequently not be monotonic under a heading
that says "the six most recent". The window itself
(`windowStart` → `?since=`) is a `disclosed_date` bound (`api.ts:158–165`), so
the sort key disagrees with both the filter and the display.
`compareDealingsNewestFirst` (`dealing-dates.ts:1–13`) already exists, keys on
`disclosed_date` with a `trade_date` tie-break, and is the canonical helper.
The current comparator also has no tie-break and returns `-1` for equal values,
which is not a stable comparator.
**Fix:** `.sort(compareDealingsNewestFirst)`.

**Bug 4 — on `ddbx.eu` the reader gets no canonical pointer, and related links diverge from the pre-render. (MEDIUM-LOW, parity)**
`learn.tsx:191`: `const foreign = owner !== null && owner !== entry.owner`.
`ownerForHost("ddbx.eu")` returns `null` (`glossary.js:375–384`), so `foreign`
is `false` and the "canonical version lives on ddbx.uk" card never renders —
even though `functions/learn/[slug].js:92–111` *does* noindex and canonicalise
that exact request. The one reader who most needs the pointer to the real copy
is the one who doesn't get it.
Same guard at `learn.tsx:288`: related links stay relative on `ddbx.eu`, so the
reader is kept on noindexed duplicates, while `[slug].js:53` unconditionally
emits absolute `https://{OWNER_HOST}` links. Crawler and reader are handed
different link targets at the same URL — the precise failure mode the
`[slug].js` header comment sets out to avoid.
**Fix:** treat `owner === null` as foreign for both the notice and the related
links, i.e. `const foreign = owner !== entry.owner` and
`e.owner !== owner ? canonicalUrlForEntry(e) : learnPath(e.slug)`.

**Bug 5 — `LiveExamples` renders six skeleton rows and can then unmount entirely. (MEDIUM-LOW, CLS)**
`learn.tsx:375`: `if (!loading && examples.length === 0) return null;`.
Gating the heading is the right call (a heading over nothing is worse), but the
sequence is: reserve ~300px of skeleton → resolve → collapse to zero, dragging
Related, the dark band and the footnote upward. Most likely on
`kind: "clusters"` (`cluster-buying`) in a quiet week and on any API failure,
where `.catch()` sets `[]` (`learn.tsx:351`) and produces the same collapse.
**Fix:** don't render the skeleton until the fetch resolves with rows, or
render the section only after a non-empty result. A section that appears late
is better than one that appears and then disappears.

**Bug 6 — example dates carry no year on a twelve-month window. (LOW)**
`formatDisclosedParts` (`dealing-dates.ts:25–30`) formats weekday + day + month
only — correct for the drawer it was written for, ambiguous on a page whose
pool spans 12 months, where "Sat 26 Jul" could be either July.

**Bug 7 — related-link labels differ between pre-render and React. (LOW, parity)**
`[slug].js:53` uses `entry.title` ("MAR Article 19: managers' transactions
explained"); `learn.tsx:292` uses `entry.term` ("MAR Article 19"), plus a
description the pre-render doesn't carry. The React choice is better UI and is
argued in a comment. Not a facts-hidden-from-readers violation, but the two
renderers publish different anchor text for the same internal links, which is
the kind of drift the parity rule exists to prevent. Cheapest resolution: put
`term` in the pre-render's anchor and `title` in its `title` attribute, so both
surfaces agree.

**Bug 8 — 1,000-row fetch to display six rows. (LOW, perf)**
`learn.tsx:348–349` requests `limit: 1000` on every entry with `liveData`.
Justified for `clusters` (rare) and `open-market` (needs a wide net); wasteful
for `recent`, where the newest 20 would do. Note the `windowStart` cap warning
(`sectors.js:384–389`) does *not* bite here — the response is newest-first and
only the newest six are used, so a single un-paged request is correct.

**Bug 9 — `SeoSkeleton` documents a "learn examples" consumer that doesn't exist. (LOW, convention)**
`skeletons.tsx:19` lists learn examples under `ruled-list`; `learn.tsx` imports
the raw `Skeleton` primitive instead. Reconcile one way or the other.

**Bug 10 — the US aside slightly overclaims. (LOW, copy)**
`learn.tsx:379`: "The six most recent from the last twelve months." On
`/learn/form-4` the pool is the API's default `view: "interesting"` — code P,
direct, non-10b5-1, ≥ $50k (`../ddbx-data/worker/db/us-queries.ts:55–61`) — so
it is the six most recent *notable* purchases, not the six most recent Form 4
purchases. Either pass `view: "all"` and filter locally, or say "notable".

---

## Ranked top-5 (effort: S/M/L)

1. **Filter the UK `"recent"` pool to purchases** (Bug 1) — **S**.
   One `.filter()` at `learn.tsx:360`. Highest severity: two entries currently
   print disposals and scheme awards under headings that say "purchases", on
   the same site whose `/learn/open-market-buy` entry says that is the single
   worst thing you can do with this data.
2. **Make the entry rail follow the host, not the entry** (Bug 2) — **S**.
   One identifier at `learn.tsx:206`. Removes UK affiliate broker promotion from
   `ddbx.us` (a defect explicitly fixed on the company page and re-introduced
   here) and restores the broker rail for UK readers on the three US entries.
   While there, comment the deliberate split: data follows the entry, commercial
   furniture follows the reader.
3. **Sort examples with `compareDealingsNewestFirst`** (Bug 3) — **S**.
   One import swap at `learn.tsx:366`; makes the visible date column monotonic
   and the comparator stable.
4. **Stop `LiveExamples` collapsing after its skeleton, and treat `ddbx.eu` as foreign** (Bugs 5 + 4) — **S/M**.
   Two independent small changes, grouped because both are "the third host / the
   empty case was not walked". The eu half also closes the last pre-render ↔
   React link-target divergence in the family.
5. **Copy and convention polish** (Bugs 6, 7, 9, 10 + module 9's date placement) — **S**.
   Add the year to example dates, align related-link anchor text across
   renderers, reconcile the `SeoSkeleton` comment, qualify the US aside, and
   move "Last reviewed" below the `oneLiner` sheet in both renderers.

**Overall:** the shell migration held. Ordering, eyebrow, terminal band,
per-entry CTA overrides, `RelatedCards`, the ownership/canonicalisation rule and
pre-render parity are all in good shape, and the `oneLiner` sheet plus the
lede-weighted prose make this the best-reading family of the six. Everything
above is in the data layer of one component and one prop on one line — no
module here needs its shape changed.
