# Download pages — uplift to the research-page grammar

_2026-09-12. Analysis and work structure for bringing `/download`,
`/download/ios`, `/download/android` (and the `/us` and `/zh-hk` editions)
onto the design language the board pages, record pages and /how-it-works now
share. Written before any code changed; the agent briefs at the end are the
spec._

## Method

Rendered `/download/ios`, `/how-it-works`, `/company/jmat` and `/biggest-buys`
from the working tree against the live API (1440px desktop, 520px phone
proxy) and read them side by side, then read every file under
`src/components/download/*`, `src/pages/download.tsx` and the components the
research pages are built from. Screenshots are in the session scratchpad,
not the repo.

The reference grammar, in one paragraph. A page opens with a **hero object**
that carries the claim, the h1 and the page's live figures together (dark
`BoardStagePanel` + `StageFigures` + `StageNotice` on the boards; the light
hairline panel of `how-it-works/hero-stage.tsx`; verdict `StatTiles` under
the h1 on the record pages). Lists that sell are **rows**, never cards:
`BoardRow` for data (56px logo, 18/20px name, aligned tabular columns, a
sparkline in the visual track), `RowList`/`Row` for prose. One purchase
stated in full is a **specimen card** (`LatestBuyCard`, `SpecimenCard`).
Sections are ruled, numbered and left-set. Type is three species
(`EYEBROW` / `KICKER` / `CAPTION` in `how-it-works/shared.tsx`) and body is
16px. **Nothing moves** unless it is a live proof object on its own clock;
nothing fades in on scroll. Every visual sits in a hairline panel on the
page ground; no full-bleed bands, no edge dissolves. The terminal ask is
the contained dark `AppCtaBand`.

## What already matches — leave alone

- **`SectionHeader`** (ruled kicker + counter + display h2, left-set). This
  is the device `SeoSection` was levelled off, and `/api` and `/mcp` share
  it. Keep it as the page's section opener.
- **The film** (`story-film.tsx`): contained 4:5 panel, copy beside it,
  plays only in view. Tenet 1 done properly.
- **The tour** (`app-tour.tsx`): seven beats, alternating handset/copy on a
  timestamp rail, each visual in a tinted well; mobile snap carousel. It is
  the page's most-iterated section and structurally sound. One cosmetic fix
  only (finding 6).
- **`DownloadRail`**: same shell as `SeoRail`, the ask held on screen. Fine.
- **`StatTiles`** was itself levelled off `stat-band.tsx`, so the figures
  already share a spec with the record pages; what changes is *where* they
  sit (finding 1).
- The copy dictionary (`src/lib/download/copy.tsx`) and the market/locale
  routing in the page. None of the findings touch a string's *content*.

## Findings

Numbered in page order. Each names the rule it breaks and the fix.

### 1. Hero — a framed stage around the one thing that must not be framed

`download-hero.tsx` puts the live notification stack inside a bordered
tonal panel (`md:rounded-3xl md:border md:bg-[#f1ede6]`), bobs it on a 7s
`dlh-float` keyframe, and on mobile dissolves the panel's top and bottom
edges with two gradients. The three live figures sit *outside* the hero as
three floating cards, and are withheld until the fetch lands so the page
jumps when they arrive.

Rules broken: tenet 1 (no edge fades; message and proof are separate
objects but the stack is not wrapped — the market hero's three same-day
rejections established that "NOTHING gets wrapped around the notification
stack"), tenet 4 (motion belongs to proof objects on their own clock; a
perpetual float is unsynced decoration), static-page rule 6 (loading
states match the arrived geometry — the figures band appears from nothing).

Fix: make the download hero the market hero's twin.
- Message column left: `EYEBROW` (the trial chip becomes the eyebrow line,
  same copy), h1 at the existing 34/58 scale, standfirst, store badge (or
  `StoreUnavailable`), the locale link.
- **The live figures move into the message column** as a dl in the
  `StageFigures` form (mono 10px key over a 26px figure, light tokens), with
  the provenance line (`sourceLine`) under them as `CAPTION`. While loading,
  the dl reserves its height with two skeleton pairs, exactly as
  `StageFigures reserve` does. A figure that is zero is omitted, as now.
- Right column: `HeroNotificationStack` **bare** — no panel, no float, no
  handset — at the market hero's width.
- Backdrop: `HeroLiveGradient` from `market-hero.tsx` (export it), the one
  sanctioned animated atmosphere, because it is synced to the stack's tick.
- Delete `stat-band.tsx` (the page is its only consumer) and the
  `dlh-float` keyframes and the mobile dissolve layers.

### 2. Winners wall — a card grid where the site has a row grammar

Six `WinnerCard`s in a `sm:grid-cols-2 lg:grid-cols-3` grid, each with a
40px logo, a count-up return, a bespoke `TrendChart`, three lines of
caption and its own "View analysis →" ghost button. The section runs as a
full-bleed cream band that, on this page, stops dead against the rail's
border (visible in the 1440px render). The loading state is six pulsing
280px rectangles. With fewer than one survivor the grid simply renders
empty.

This is a small best-performing-buys board and should be drawn as one.
Rules broken: tenet 3 (rows for lists that sell), Jon's 2026-09-06
principles (56px logos, aligned columns, name never truncated — the cards
truncate "Caledonia Mining Co…"), rule 2 (empty and failed are different
states and neither is silence), rule 6 (skeleton geometry), tenet 1 (the
full-bleed band — `AppCtaBand` and `CompanyAppPitch` were both pulled back
into the column for this exact reason).

Fix: new `src/components/download/winners-board.tsx`.
- `BoardRowHeader` + `BoardRowList` + `BoardRow`, `lead="rank"` (this list
  is ranked by return — the biggest-buys convention; the record pages'
  `date` lead is for a company's own chronology).
- Row: `logo` = `CompanyLogo size={56}`; `name` = company, `badge` =
  `TickerPill`; `secondary` = "Buyer · Role · Bought £X of shares at £Y"
  (the existing `metaLine`); `visual` = the sparkline; `figure` =
  `{ value: "+14.7%", unit: t.sinceTheBuy }`; one `fact` = the trade date.
- Sparkline: reuse `boards/buy-sparkline.tsx` if its `BoardRow`/`Bars`
  inputs can be built from the page's `Winner` (it needs `disclosedDate ||
  tradeDate`, `dir`, and `bars` as `{date, close}`); otherwise lift the
  page's `TrendChart` into the new file unchanged. Prefer reuse — one
  sparkline species on the site.
- Row target: `to` = the filing page (`filingPath(id)` UK /
  `usFilingPath(id)` US). See decision D2.
- Loading: `SeoSkeleton variant="board"` (or the rows skeleton) at
  `WINNERS_SHOWN` rows so the arrived list lands in the same box.
- Empty: a `CAPTION` sentence — "Not enough recent buys with a price
  history yet. The wall fills as directors disclose." (through
  `copy.tsx`, all three locales). Failed: the existing catch already
  yields `winners: []`; say the same sentence rather than nothing.
- The section sits on the page ground (no `FULL_BLEED`, no `bg-sheet`),
  under its `SectionHeader`, with the single store CTA under the list as
  now. No count-up.

### 3. Price — centred type inside a left-set page, and a bullet stack

`PricingCard` is a three-band card whose interior is centred, under a
left-set `SectionHeader`; `IncludedList` is nine 15px checkmark bullets —
the exact object tenet 3 names as the thing to replace. The card shape is
a good one; its typography is not the house's.

Fix in `pricing-card.tsx`:
- Re-set `PricingCard` on the specimen-card grammar (`LatestBuyCard` is the
  model): an `EYEBROW` band ("The price" + the LIMITED TIME `KICKER` badge
  right-aligned), a hairline, then the two tiers as **two labelled cells
  with a vertical hairline** — `KICKER` label over a 26/30px tabular
  figure with the per-month/billed line under it at `CAPTION` — then a
  hairline and the trial sentence + "billed through App Store" as the
  card's closing paragraph. Left-set throughout. Same fill as
  `LatestBuyCard` (`bg-white/70`, hairline border).
- `IncludedList` becomes a ruled list: the `EYEBROW_QUIET` heading, then
  each benefit as a 16–17px row separated by `DIVIDE` hairlines (the
  pipeline ledger's "What leaves" list is the species). No check glyphs —
  the ticked disc means "check cleared" on this site and the mark
  vocabulary is exclusive. Nine `RowList` `Row`s would be right in kind but
  a thousand pixels tall for one-line items; the ruled list is the
  lighter member of the same family.

### 4. FAQ — a fourth accordion species

`DownloadFaq` is its own `<details>` styling (16px medium summary, custom
chevron CSS). The record and market pages use `MarketFaq`; /how-it-works
uses `Fold`. Fix: render the FAQ through `MarketFaq` — it takes
`{ q, a }`-shaped items under its own "Common questions" eyebrow and
two-column layout, which also gives the FAQ the section rule it lacks
today (it currently hangs off the pricing section unlabelled). If
`MarketFaqItem` differs in shape, adapt at the call site; do not fork the
component. Delete `download-faq.tsx` if nothing else imports it (only
`copy.tsx`'s type import does — move `FaqItem` to `copy.tsx` or alias
`MarketFaqItem`).

### 5. Final CTA — the one dark band the site has already replaced

A full-bleed `bg-ink` band with a centred `SectionHeader` (the one
`align="center"` exception), badge, QR, and the returns disclaimer inside
it. The site's terminal ask is `AppCtaBand`: contained `rounded-[28px]`,
kicker/headline/body, `StoreButtons`, `media="qr"` on desktop. Both it and
`CompanyAppPitch` were moved from full-bleed to contained on the same
argument, and the render shows why: the band ends at the rail.

Fix: replace the section with `AppCtaBand`, `media="qr"`. Two additive
props on `AppCtaBand`: `platform` (the route's forced platform, passed to
`StoreButtons` — `/download/android` must show Play on desktop) and
`gaEvent`/`gaLabel` so the page keeps its `cta_download_lp` events. The
"Free for 7 days, cancel any time" line is hardcoded in the band; make it
a `note` prop with that default so the zh-HK edition can pass its own. The
returns disclaimer moves to the true foot of the page as `CAPTION` small
print (placement rule in `app-cta-band.tsx`: small print after the band).
The `align="center"` branch of `SectionHeader` loses its only caller;
leave the prop in place (harmless) or remove it in the same change.

### 6. Tour — one cosmetic

`BeatStage` is a borderless tint (`bg-black/[0.035]`). Tenet 1 asks for a
hairline edge on every visual's panel. Change the well to
`rounded-2xl border border-hairline bg-sheet dark:border-white/[0.07]
dark:bg-surface` (the `PANEL` token in `how-it-works/shared.tsx`). Nothing
else in `app-tour.tsx` changes.

### 7. Motion — scroll-reveal and count-up on a page whose neighbours have none

Every section on the page is wrapped in `Reveal` (fade-up on
intersection) and both the figures and the returns tick up with
`CountUp`. No board, record or methodology page does either; the only
motion they carry is a live proof object on its clock. The reveal is also
the single most recognisable landing-template tell. Fix: remove `Reveal`
and `CountUp` from the download page and its components. Keep
`reveal.tsx` itself — `/api`, `/mcp` and `api/market-grid.tsx` still
import it. Remove `dl-lift` from the page's badges (the hover scale is
the same family); the class stays in `globals.css` until its last caller
goes.

### 8. Type species and tokens

The download components restate the eyebrow spec inline
(`font-mono text-[11px] font-semibold uppercase tracking-[0.16em] …`)
about a dozen times, and each picks its own opacity. Replace with the
`EYEBROW` / `EYEBROW_QUIET` / `KICKER` / `CAPTION` / `RULE` / `DIVIDE` /
`PANEL` exports from `src/components/how-it-works/shared.tsx` — the
record pages already import from there, so it is the site's token file in
practice. Body copy on the page is 16.5/17px; leave it (the research pages
settled on 16, and a half-pixel is not worth a diff).

### 9. Phone

The hero's `min-h-[62svh]` is fine on a real phone (the tall headless
capture exaggerates it — not a bug). Three stacked stat cards cost ~450px
above the fold on a phone; folding them into the hero as a two-column dl
(finding 1) fixes that. `BoardRow` already has the phone arrangement
(rank · logo · subject · one tail figure; facts into the caption), so the
winners section needs no separate mobile design.

## Decisions for Jon

Defaults are what the briefs below assume. Say otherwise before the
agents start.

- **D1 — Hero becomes the market hero's twin** (bare stack, live gradient,
  figures in the message column, no panel). Default: yes.
- **D2 — Winner rows link to the filing page on the site**, not the store.
  Every row on the site navigates to its record; discretion mode is off so
  the filing page shows the full analysis; the section keeps its one store
  CTA under the list. The alternative keeps rows pointing at the App Store
  (today's "View analysis" behaviour), which is more direct for the funnel
  but makes these the only rows on the site that leave it. Default:
  filing page.
- **D3 — Remove scroll-reveal and count-up from /download.** Default: yes.
- **D4 — Tour stays as is** apart from the hairline well. Default: yes.
- **D5 — Terminal band becomes `AppCtaBand`**, so the numbered run ends at
  04 and the ask is unnumbered (the `SeoPageShell` convention). Default:
  yes.
- **D6 — Benefits as a ruled list rather than nine `Row`s.** Default: ruled
  list.

## Work structure

Five build agents in parallel, each owning files no other agent touches,
then one integration pass, then a render pass. Interfaces are fixed here
so the parallel work meets in the middle.

### Ground rules for every agent

- Read `investigations/2026-08-30-design-language.md`,
  `investigations/2026-08-03-static-page-rules.md` and this document
  before writing anything. Reuse `how-it-works/shared.tsx` tokens;
  compose `BoardRow`, `StatTiles`, `AppCtaBand`, `MarketFaq` — never
  re-draw them.
- **Every reader-facing string goes through `src/lib/download/copy.tsx`**
  and must be added to all three dictionaries (`en` UK, `en` US, `zh-HK`
  UK). No English literals in components.
- **Touch only your owned files.** The working tree has uncommitted
  changes from another session (`market-*.tsx`, `lib/api.ts`,
  `lib/markets/korea.tsx`, `company-logo.tsx`, `CLAUDE.md`). Do not stage
  them, do not `git add -A`, do not revert them.
- Do not change `SectionHeader` (`/api` and `/mcp` share it) or
  `reveal.tsx` (other pages import it).
- `src/lib/pricing.ts` numbers are not yours to change.
- The `/us/download/android` "not on this store yet" branch
  (`StoreUnavailable`) must survive every change.
- Dark mode is a first-class output; every new class carries its `dark:`
  pair.

### Agent A — Hero  (`download-hero.tsx`, `market-hero.tsx` export only)

Owns: `src/components/download/download-hero.tsx`. May add one `export` to
`src/components/market/market-hero.tsx` for `HeroLiveGradient` (no other
change there). Deletes `src/components/download/stat-band.tsx` **only in
the integration pass** (the page still imports its `Stat` type until then).

Build per finding 1. New props on `DownloadHero`:

```ts
figures: Array<{ k: string; value: number; label: string; suffix?: string }> | null;
// null = loading → reserve height with two skeleton pairs
sourceLine: string;
```

Message column: eyebrow (trial copy) → h1 → standfirst → figures dl →
provenance caption → store badge / `StoreUnavailable` → locale link.
Right column: bare `HeroNotificationStack`, same DOM order and `order`
trick as today (copy first in DOM, stack painted first on mobile).
Backdrop: `HeroLiveGradient tick={radar.tick}`. No panel, no float, no
dissolves, no `Reveal`, no `CountUp`.

Acceptance: renders at 1440 and 520 with and without figures; no element
overlaps the stack; `prefers-reduced-motion` freezes the gradient (it
already does upstream).

### Agent B — Winners board  (new `winners-board.tsx`)

Owns: `src/components/download/winners-board.tsx` (new). Read-only on
`boards/board-row.tsx`, `boards/buy-sparkline.tsx`, `boards/board-model.ts`,
`seo/skeletons.tsx`, `pages/biggest-buys.tsx` (the reference caller).

Props (the page maps its `Winner` into this — do not import from the page):

```ts
export interface WinnerRowData {
  id: string; ticker: string; company: string;
  returnPct: number; asOf?: string | null;
  buyerName: string; buyerRole?: string;
  metaLine: string; tradeDate: string;
  bars?: { date: string; close: number }[];
  buyIndex?: number;
}
export function WinnersBoard(props: {
  winners: WinnerRowData[] | null;   // null = loading
  marketId: "uk" | "us";
  platform: AppPlatform;
  gaPrefix: string;
  heading: ReactNode; sub: ReactNode; kicker: string;
  index: number; total: number;
  ctaSub: string;                    // under the store button
  emptyNote: string;                 // rule 2 sentence
  available: boolean;                // whether a store CTA is shown
  rowHref: (id: string) => string;   // filingPath / usFilingPath (D2)
})
```

Build per finding 2. Header via `SectionHeader`. Rows via
`BoardRowHeader` (`subject`, one fact "Bought", `visual` "Since the buy",
`figure` "Return") and `BoardRow` (`position`, `logo` 56, `name`, `badge`
`TickerPill`, `secondary`, `facts=[{label:'Bought', value: date}]`,
`visual`, `figure`). Prefer `BuySparkline`; if its inputs cannot be built
honestly from `WinnerRowData`, port the page's `TrendChart` into this file
verbatim and say so in the file header. Skeleton at `WINNERS_SHOWN` rows;
empty/failed state prints `emptyNote`. Store CTA under the list when
`available && winners.length > 0`, same `StoreButtons` call as today.

Acceptance: header and rows share the grid at 520 / 1024 / 1440; company
names wrap, never truncate; no `FULL_BLEED`, no `Reveal`, no `CountUp`.

### Agent C — Price, included list, FAQ  (`pricing-card.tsx`, `download-faq.tsx`)

Owns: `src/components/download/pricing-card.tsx`,
`src/components/download/download-faq.tsx`. Read-only on
`company/latest-buy.tsx`, `how-it-works/specimen-card.tsx`,
`how-it-works/pipeline-ledger.tsx`, `market/market-faq.tsx`.

Build per findings 3 and 4. `PricingCard` and `IncludedList` keep their
names and props. `DownloadFaq` becomes a thin wrapper that renders
`MarketFaq` (adapting `FaqItem` → `MarketFaqItem` if the shapes differ)
so the page's call site does not change; note in its header that it is a
compatibility shim to be inlined at integration if trivial.

Acceptance: the price section reads left-set top to bottom; two tier cells
with a vertical hairline at `sm`, stacked with a horizontal rule below;
no check glyphs anywhere; FAQ carries a rule and an eyebrow.

### Agent D — Terminal ask  (`seo/app-cta-band.tsx`)

Owns: `src/components/seo/app-cta-band.tsx`. Additive only — every
existing caller (`SeoPageShell`, broker guides) must render identically.

Add: `platform?: AppPlatform | null` (forwarded to `StoreButtons`),
`gaEvent?: string` (default `"cta_seo_band"`), `note?: ReactNode` (default
the current "Free for 7 days, cancel any time."). Nothing else.

Acceptance: `rg "AppCtaBand" src` callers unchanged; typecheck passes.

### Agent E — Tour well + tokens  (`app-tour.tsx`, `section-header.tsx` read-only)

Owns: `src/components/download/app-tour.tsx`,
`src/components/download/story-film.tsx`,
`src/components/download/download-rail.tsx`,
`src/components/download/qr-install.tsx`.

Finding 6 (the hairline well) and finding 8 (replace inline eyebrow /
kicker / caption specs with the `shared.tsx` tokens) in these four files.
Remove `Reveal` wrappers from `app-tour.tsx` and `story-film.tsx` (D3).
No layout or copy changes.

Acceptance: pixel-equivalent at 1440 except the well's edge and the
removed fade; `/__lab` not needed.

### Integration (one agent, after A–E land)

Owns: `src/pages/download.tsx`, `src/lib/download/copy.tsx`, deletion of
`stat-band.tsx` and (if shimmed away) `download-faq.tsx`.

1. Wire `DownloadHero figures/sourceLine`; delete the `StatBand` mount.
2. Replace the winners `<section>` with `WinnersBoard`, mapping `Winner` →
   `WinnerRowData` and passing `rowHref` per D2.
3. Replace the final `<section>` with `AppCtaBand media="qr"
   platform={platform} gaEvent="cta_download_lp" gaLabel={`${cfg.gaPrefix}
   footer`} note={…}`; move the returns disclaimer to a `CAPTION`
   paragraph after the band.
4. Renumber sections 01–04 (film, tour, winners, price); `total={4}`.
5. Strip every remaining `Reveal`, `CountUp`, `dl-lift`, `FULL_BLEED`,
   `SECTION`-with-band from the page.
6. Add the new strings to all three dictionaries in `copy.tsx`
   (`emptyNote`, the terminal `note`, any eyebrow text the hero now needs).
7. `npm run typecheck` / lint; then the render pass below.

Commit as one change (`feat(download): the install pages on the research
grammar`) with the six-route list in the body.

### Render pass (after integration, before commit)

Per `feedback_browser_pass`: nothing visual is done until it has been
looked at. Headless Chrome against `vite --port 5199` on the live API
(recipe in memory `reference_headless_screenshots`; 520px is the phone
proxy, virtual-time pauses on pending fetches).

Capture and read, light and dark:

- `/download/ios` 1440 and 520 — hero (stack bare, figures in column, no
  jump when they land), winners rows (header/rows aligned, names wrap),
  price cells, FAQ rule, contained band, disclaimer at the foot.
- `/download/android` 1440 — Play badge in hero, rail and band.
- `/us/download/ios` 1440 — US copy, USD figures, `$` sparklines.
- `/us/download/android` 1440 — `StoreUnavailable` in the hero; the band
  still offers the two real installs.
- `/zh-hk/download` 520 — every new string is Chinese, nothing English
  leaked.
- One capture with the API blackholed is not possible (virtual time
  hangs) — review the skeleton code paths by reading instead.

Report defects to the owning agent as *causes*, not value tweaks.

## Out of scope, noted

- The tour's seven beats, timestamps and copy (D4).
- `DownloadRail` content and the onward links.
- `pricing.ts` values, the promotional flag, store URLs.
- The film asset and its poster.
- The `/api` and `/mcp` pages, which share `SectionHeader` and `Reveal`
  and will be the next sweep.
