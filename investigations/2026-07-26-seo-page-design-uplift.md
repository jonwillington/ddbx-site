# SEO page design uplift — proposal

**Date:** 2026-07-26 · **Scope:** the five page families shipped in `ae02ac7`
("feat(seo): sector hubs, leaderboards, glossary, broker guides, report
archive"), plus the "Check out director dealings at these companies" module on
the company page. Design thinking only — no code changed.

The brief, in the owner's words: *"we made a lot of these pages for SEO
purposes but there's no reason they need to look like shit — think about how,
without an existing design language for them, we can uplift them and make them
feel like a proper part of the site."*

---

## 1. Inventory: what shipped, and how much it shares

| Family | Routes | Page file | Shared furniture used |
|---|---|---|---|
| Sector hubs | `/sectors`, `/sectors/:slug` | `src/pages/sectors.tsx`, `src/pages/sector.tsx` | `src/components/sector-ui.tsx` (`R` tokens, `SectorFigures`, `money`, `signedPct`, `alphaClass`), `shared/sectors.js` |
| Leaderboard | `/biggest-buys`, `/biggest-buys/:year` | `src/pages/biggest-buys.tsx` | imports sector-ui's `R`/`money`/`alphaClass`; ranking in `shared/leaderboard.js` |
| Glossary | `/learn`, `/learn/:slug` | `src/pages/learn.tsx` | sector-ui `R` + `money`; content in `shared/glossary.js` |
| Broker guides | `/brokers/best-for/:category`, `/brokers/compare/:pair` | `src/pages/broker-category.tsx`, `src/pages/broker-comparison.tsx` | `src/components/brokers/broker-page-ui.tsx` (`R` sheet/rule/tile tokens, `PageSection`), broker-ui chips/logos |
| Report archive | `/reports`, `/reports/:month` | `src/pages/reports.tsx`, `src/pages/report.tsx` | own local `R` copy; `shared/months.js` |
| Entity-card grid | foot of `/company/:key` | `src/components/company/more-companies.tsx` | `CompanyLogo`, hand-rolled card |

Two observations:

1. **The broker guides are already fine.** They inherit the broker-review
   composition (`PageSection` two-column ruled grid, sheet/tile tokens, logos,
   fee tables) from `broker-page-ui.tsx`, which was lifted verbatim from
   `broker-detail.tsx`. They read as part of the `/brokers` publication and
   need only the terminal CTA treatment (§5.5). The problem families are
   **sectors, leaderboard, learn, reports** — the ones that lean on
   `sector-ui.tsx`'s minimal `R` and nothing else.
2. **There are now FOUR near-identical `R` token maps** — `company.tsx:39`
   (`C`), `broker-page-ui.tsx:27`, `sector-ui.tsx:15`, and local copies in
   `reports.tsx:24` / `companies.tsx:13`. They agree on `rule`/`label`/`body`
   but only the company/broker ones carry `sheet` and `tile`. The SEO pages
   were built from the *subset* — which is precisely why they look like
   unstyled data dumps: they have the small print of the design language and
   none of its furniture.

What the four problem families use today: hairline rules, one heading size,
grey 13–14px metric runs, underline-on-hover links. What they never touch:
sheets, tiles, chips (`chip()` / `DeltaBadge`), the ticker pill, company
logos, sparklines, the mono uppercase eyebrow, the dark conversion band, the
positive/negative colour system, any button. The uplift is mostly "let these
pages speak the rest of the vocabulary", not inventing a new one.

---

## 2. The site's design vocabulary (extracted from the finished surfaces)

Sources: the deals table (`src/components/market/market-row.tsx`), company
page (`src/pages/company.tsx`), broker review (`src/pages/broker-detail.tsx` +
`broker-page-ui.tsx`), download landing (`src/components/download/*`), tokens
(`src/components/{button,chip}.ts`, `src/styles/globals.css`).

**Ground & surfaces**
- Page ground: warm ivory `#f5f0e8` (body, `globals.css:86`); dark mode warm
  charcoal `oklch(22% 0.022 55)`.
- **Sheet** (the primary card): `rounded-2xl border border-[#e8e0d5]
  bg-[#faf7f2] shadow-[0_1px_2px_rgba(90,65,40,0.03)] dark:border-white/[0.07]
  dark:bg-surface`. A slightly-lighter card on the cream ground with a warm
  1px shadow — the company hero, broker review, and stats panels all sit in
  it.
- **Tile** (a stat cell inside a sheet or on the ground): `rounded-xl
  bg-black/[0.035] dark:bg-white/[0.05]` — no border, just a tint well.
  Company page metrics `dl` is a `grid grid-cols-2 sm:grid-cols-4` of these.
- **Hairline rule**: `border-[#e8e0d5] dark:border-separator`. Table cell
  borders use the quieter `border-black/[0.06] dark:border-white/[0.06]`.
- **The dark band** (conversion surface): `FULL_BLEED bg-[#1a140d] text-white
  dark:bg-[oklch(17%_0.02_55)]` (`company-app-pitch.tsx:139`). The change of
  surface is the signal that the page has stopped reporting and started
  asking.

**Type**
- Face: Instrument Sans; mono (SF Mono stack) is reserved for chip labels,
  tickers, eyebrows and rank digits.
- Page h1: `text-[30px] sm:text-[38px] font-semibold leading-[1.1]
  tracking-[-0.02em] text-balance` — the SEO pages already have this right.
- Section h2: `text-[17px] font-semibold tracking-[-0.015em]`.
- Body: `text-[14px]–[14.5px] leading-[1.65–1.7] text-foreground/70`.
- Label / small print: `text-[11px] text-foreground/50`.
- **Eyebrow / kicker** (the loudest brand tell): `font-mono text-[11px]
  font-semibold uppercase tracking-[0.16em]` in **brand brown**
  `text-[#5a4128] dark:text-[#ad9479]`, or `text-[#eec584]` on the dark band
  (`download/section-header.tsx:46`, `company-app-pitch.tsx:145`).
- Numbers are always `tabular-nums`; money via the shared `money()` format
  (`£37m`, `$1.2bn`).

**Colour roles**
- Brand brown accent: `#5a4128` light / `#ad9479` dark (kickers, focus rings,
  calendar chips). Amber `#eec584` on dark surfaces.
- Directional: **only** `--color-positive` / `--color-negative`
  (`text-positive`, `text-negative`) — canonical green/red pair tuned for both
  modes. `sector-ui.tsx`'s `alphaClass` currently uses
  `emerald-700/rose-700`, which is exactly the "local emerald" the token
  comment in `globals.css:22-28` forbids. Fixing that alone is a brand repair.
- Risk amber `--color-risk` for caveats that are warnings.
- Buttons: near-black `#1a140d` fill, `rounded-lg`, sentence case
  (`button.ts`); chips: capsule, mono uppercase, hairline `border-current/25`
  (`chip.ts`). *Chips are read, buttons are pressed* — the two never share a
  shape.

**Recurring objects the SEO pages don't yet use**
- **Ticker pill**: `font-mono text-[11px] font-semibold px-1.5 rounded
  bg-[#e8e0d5] dark:bg-surface-secondary` (inline in `market-row.tsx:1019`,
  duplicated 4×) — the site's monogram for "this is an instrument".
- **`CompanyLogo`** (32/28px bubble) and **`InsiderAvatar`** (initials
  fallback).
- **`DeltaBadge`** (`market-row.tsx:398`): the ▲/▼ chip whose fill scales
  with magnitude via `deltaStyle` — THE way a return is displayed.
- **`MarketRowSpark`**: 80×22 inline sparkline.
- **`SectionHeader`** (download): ruled + kicker + `01 / 06` numbering +
  display-scale left-set headline — "newspaper grammar".
- **`PageSection`** (brokers/company): `sm:grid-cols-[10rem_minmax(0,1fr)]`
  ruled two-column section — heading in the left rail, content right.
- **`StatBand`** (download): full-bleed tinted strip of 3 big derived numbers
  over a provenance line.
- Calendar chips, `WeekendBreak`, overlapping logo stacks (`-space-x-1.5` +
  `ring-2`) — table-as-timeline idioms.

**Spacing rhythm**: sections open with `border-t` + `pt-7/py-8`, `mt-10/12`
between; content column `max-w-[860px]` on document pages, `max-w-[1280px]`
shell. Mobile: tables collapse to logo + name + one number per row; grids drop
to 1–2 columns; drawers become bottom sheets.

---

## 3. Diagnosis: why these pages read as unfinished

Named failures, mapped to causes:

1. **Undifferentiated metric runs** (`SectorFigures`,
   `sector-ui.tsx:97-107`): four numbers in one 13px `foreground/60` line.
   Nothing is primary; "median alpha +0.9%" — the only number the page's own
   header says matters — renders at the same weight as "139 companies". The
   finished surfaces never do this: company page puts each metric in a tile
   with an 11px label over a 15.5px semibold value; the deals table puts the
   return in a `DeltaBadge`.
2. **No visual identity per row.** Sector rows and leaderboard rows carry no
   logo, no ticker pill, no chip — the objects that make the deals table
   recognisably ddbx. A leaderboard about companies that never shows a company
   logo is anonymous.
3. **Long-name overflow.** `cleanCompanyName` (`src/lib/company.ts:41`)
   strips only the *final* trailing parenthetical (the regex isn't global),
   so "Jardine Matheson Holdings Ltd (Singapore Reg) (JAR)" loses the ticker
   paren and keeps "(Singapore Reg)" — and insider strings like "1947
   Trustee Limited (trustee for 1947 Trust benefiting Executive Directors)"
   aren't cleaned at all. The rows use `items-baseline`
   + wrap rather than `min-w-0 truncate`, so a long string reflows the row.
4. **Repeated entities un-grouped.** `rankBuys` caps at `MAX_PER_COMPANY = 3`
   (`shared/leaderboard.js`), so the same issuer can legitimately hold up to
   three ranks with nothing visually tying them together.
5. **No data visualisation where the data begs.** A ranked-by-value board IS a
   bar chart; a sector rollup IS a bar chart. Rendering both as text-only
   rows spends the site's strongest asset (real, computed numbers) at its
   weakest volume.
6. **Dead ends.** Learn entries end on three bare links + footer. Sectors and
   leaderboard end on small print. Not one of the four families asks for the
   install — on a site whose stated purpose for these pages is the funnel.
7. **Local colour**: `alphaClass` uses emerald/rose instead of
   `text-positive`/`text-negative`.

None of these require new design language. Every fix below is "apply an
existing object".

---

## 4. The shared SEO page shell

New directory `src/components/seo/`, four primitives. The goal: a sector hub,
a leaderboard, a learn entry and a report index should be **compositions of
the same shell**, differing only in their middle sections — the way every
`/brokers/*` page is a composition of `PageSection`.

### 4.1 `SeoPageShell` — `src/components/seo/page-shell.tsx`

```tsx
<SeoPageShell
  kicker="Sector hub"                     // family name, mono eyebrow
  crumbs={[{ label: "Sectors", to: "/sectors" }]}  // optional; last item = plain text
  title="Health care — UK insider buying"
  standfirst={sector.framing}
  cta={{ headline: "…", body: "…", gaLabel: "sector_health-care" }}  // see §4.3; `false` to opt out
  footnote="Rolling twelve months. Median alpha is measured…"        // small print, ruled top
>
  {children /* SeoSection stack */}
</SeoPageShell>
```

Anatomy, top to bottom (all inside the existing `DefaultLayout`,
`max-w-[860px]` column — the measure is right, keep it):

```
  SECTORS / Health care                      ← crumbs, R.label, exists today
  SECTOR HUB                                 ← NEW: mono eyebrow, #5a4128/#ad9479,
                                                tracking-[0.16em] — the one-line
                                                brand stamp every family gets
  Health care — UK insider buying            ← h1, unchanged scale
  Standfirst at 62ch, foreground/70          ← unchanged
  ── children (SeoSection stack) ──
  ── AppCtaBand (full-bleed dark)  ──        ← NEW terminal, §4.3
  ── footnote small print, border-t ──
```

The eyebrow is the cheapest possible identity fix: it's already what the
download page, company pitch and iOS app use to introduce a section, and no
scraped/AI content farm page has one. One line of mono brown caps instantly
files the page in the site's family.

Also: the shell owns the **loading skeleton** (accepts `loading` + a
`skeleton` variant per archetype) so the four families stop hand-rolling
`animate-pulse` blocks of different heights.

### 4.2 `SeoSection` — same file

Replace the three private `Section` components (`sector.tsx:263`,
inline in `biggest-buys.tsx:174`, `learn.tsx:147`) with one:

```tsx
<SeoSection title="Companies insiders backed" aside="Ranked by value bought">
```

- Default: `border-t R.rule pt-7 mt-10`, h2 at `17px` — exactly today's
  `Section`, so migration is mechanical.
- `variant="rail"`: the broker/company `sm:grid-cols-[10rem_minmax(0,1fr)]`
  two-column grid, for prose-heavy pages (learn entries, methodology). This
  is what makes a learn entry read like the broker reviews — heading in the
  left rail, prose at measure on the right — instead of a stacked blog post.
- `aside` slot renders under the title in `R.note` (12px/45) — where
  "Ranked by value bought" or entry counts live, instead of cluttering the h2.

### 4.3 `AppCtaBand` — `src/components/seo/app-cta-band.tsx`

The terminal conversion block — the owner's item 3, generalised from
`CompanyAppPitch` (`src/components/company/company-app-pitch.tsx`), which is
already the best-designed object in this problem space. Extract its left
column and band treatment; leave `CompanyAppPitch` itself alone (it keeps the
notification stack + screen roller, which need per-company data).

Anatomy — full-bleed dark band, two columns on `lg`:

```
┌────────────────────────────────────────────────────────────────────┐
│  bg #1a140d (dark mode: oklch(17% 0.02 55))     FULL_BLEED         │
│                                                                    │
│  THE APP                        ┌──────────────────────┐           │
│  (mono, #eec584)                │  phone screenshot in │           │
│                                 │  DeviceFrame, or the │           │
│  Get the alert before           │  QR block on desktop │           │
│  the market reads the filing.   │  (qr-install.tsx)    │           │
│  (30→40px, white, -0.02em)      └──────────────────────┘           │
│                                                                    │
│  Every disclosure, rated and pushed…  (16px, white/65, 36em)       │
│                                                                    │
│  [ App Store ] [ Google Play ]   ← StoreButtons, white fill,      │
│  Free for 7 days, cancel any time.   BUTTON_RADIUS, text #1a140d   │
└────────────────────────────────────────────────────────────────────┘
```

Props:

```tsx
interface AppCtaBandProps {
  kicker?: string;              // default "The app"
  headline: ReactNode;          // REQUIRED — per-family copy, see below
  body: ReactNode;
  gaLabel: string;              // → StoreButtons gaEvent="cta_seo_band"
  marketId: "uk" | "us";        // store links + app icon
  media?: "screenshot" | "qr" | "none";   // right column; default "screenshot"
  screenshotSlot?: string;      // app-screenshots.ts slot; default "dashboard"
}
```

- **Copy slots per family** (defaults live beside the component so pages can
  drop it in with two props):
  - Learn entry: headline `"Stop reading about {term}. Get pinged when it
    happens."` body: the app pushes every rated filing with the thesis
    attached. *(Each glossary entry may also override with a term-specific
    line via a `cta` field in `shared/glossary.js` — a closed-period entry
    saying "Know the moment the window reopens" sells harder than a generic
    line.)*
  - Sector hub: `"Follow {sector} insiders in real time."`
  - Leaderboard: `"The next one on this list will buzz your phone."`
  - Reports: `"Read next month's report the day it lands."`
- **Dark mode**: the band is already a dark surface; in dark theme it steps
  *darker than the page* (`oklch(17% 0.02 55)` vs page L22) exactly as
  `CompanyAppPitch` does, so the "surface change = mode change" signal
  survives the toggle. Amber kicker `#eec584` and `white/65` body work
  unchanged in both.
  - **Mobile**: single column; media column drops (`media="qr"` renders
  nothing on touch devices — a QR on a phone is a mirror), StoreButtons stack
  full-width, `py-14` → `py-10`. `useDevicePlatform` already picks the right
  single store button.
- **Where it terminates**: every learn entry and learn index, `/sectors`,
  `/sectors/:slug`, `/biggest-buys[/:year]`, `/reports`, `/reports/:month`,
  and the two broker guide families (`media="none"` there — an affiliate page
  ending in an app pitch should stay quiet, and the brokers pages already
  carry affiliate CTAs; putting a screenshot phone next to a "visit
  Hargreaves Lansdown" button is two competing asks).
  **Not** on `/company/:key` — `CompanyAppPitch` already owns that page.
- Placement rule: after the last content section, **before** the methodology
  footnote — small print reads as the caption of the whole page and belongs
  at the true bottom.

### 4.4 Two data-display primitives

**`StatTiles` — `src/components/seo/stat-tiles.tsx`.** The company-page
metrics `dl` (`company.tsx:402`), extracted:

```tsx
<StatTiles
  stats={[
    { label: "Buys", value: "309" },
    { label: "Value", value: "£37m", primary: true },
    { label: "Companies", value: "139" },
    { label: "Median alpha", value: "+0.9%", tone: "positive" },  // | "negative"
  ]}
  note="97% of that value is TEP alone."   // optional caveat line, R.note
/>
```

Each stat: `R.tile px-3.5 py-3`, label `text-[11px] text-foreground/50`,
value `text-[15.5px] font-semibold tabular-nums tracking-[-0.01em]`
(`primary` bumps to `text-[19px]`; `tone` maps to
`text-positive`/`text-negative`). Grid `grid-cols-2 sm:grid-cols-4`.
This *is* the fix for the undifferentiated metric run: label-over-value
tiles are how every finished ddbx surface states a number.

**`MeterBar` — `src/components/seo/meter-bar.tsx`.** The missing
data-visualisation, deliberately humble — a proportion bar, not a chart lib:

```tsx
<MeterBar value={rowValue} max={maxValueOnPage} tone="brand" />
```

Renders `h-[3px] rounded-full` track `bg-black/[0.05] dark:bg-white/[0.07]`
with a fill `bg-[#5a4128]/60 dark:bg-[#ad9479]/60` (`tone="brand"`), width
`value/max`. Zero dependencies, works in a 14px-tall row, `aria-hidden`
(the number beside it is the accessible value), `min-width 2px` so small
values stay visible. Used by sector rows (§5.1), leaderboard rows (§5.2)
and the entity cards (§5.4). A stack of ruled rows each carrying a MeterBar
**is** a labelled horizontal bar chart — the data viz these pages beg for,
built from a 20-line component.

Also promote the **ticker pill** out of `market-row.tsx` into
`src/components/ticker-pill.tsx` (it's inlined 4× there and about to gain
four more call-sites): `font-mono text-[11px] font-semibold px-1.5 rounded
bg-[#e8e0d5] dark:bg-surface-secondary`.

---

## 5. Archetype redesigns

### 5.1 The stat-row list — sector hubs

**`/sectors` index.** Keep the ruled list (it's the right form for 11 rows on
a document page) but re-weight each row so it has a primary number, an
identity, and a bar:

```
────────────────────────────────────────────────────────────────────
Health care                                              ▲ +2.1%    ← name 16px semibold;
309 buys · 139 companies                        £37m               DeltaBadge top-right
▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░  ← MeterBar, value / max sector
────────────────────────────────────────────────────────────────────
Technology                                               ▼ −1.7%
41 buys · 12 companies                          £8.0bn
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
⚠ 99% of that value is one issuer.              ← R.note + risk-amber dot,
────────────────────────────────────────────────  not plain grey
```

Concretely, per `<li>` (replacing `SectorFigures` on the index):
- Row 1: sector name (link, `text-[16px] font-semibold`) left; **median
  alpha as a `DeltaBadge`** right (`suffix="pp"`-less, it's a %). This is the
  page's own thesis — "has it worked" — finally displayed as the site
  displays returns. `alphaClass` dies; `DeltaBadge`'s `deltaStyle` gives the
  magnitude-scaled fill and correct dark-mode pair for free.
- Row 2: secondary run `309 buys · 139 companies` (`R.label`, 12px) left;
  **value `£37m` in `text-[15px] font-semibold tabular-nums`** right — the
  size number gets the weight the finished surfaces give money.
- Row 3: `MeterBar` of value vs the largest sector — the index becomes a
  readable bar chart of where the money went, which is the page's headline
  promise ("where are insiders putting money").
- Concentration caveat: keep, but prefix a 6px `bg-risk` dot and set at
  `R.note` — it's a warning, and the palette has a colour whose entire job
  is "caveat, not verdict" (`--color-risk`, `globals.css:20`).
- Hover: whole row is the link target (`block` Link wrapping the three rows),
  `hover:bg-black/[0.03] dark:hover:bg-white/5` like every table row on the
  site — not underline-on-name.

**`/sectors/:slug` detail.**
- The figures tile (`sector.tsx:161`) → **`StatTiles`** with `Value` as
  `primary` and `Median alpha` toned. The methodology sentence stays under
  it as the `note`.
- **"Companies insiders backed"** → each row gains `CompanyLogo size={28}` +
  `TickerPill`, value right in `text-[14px] font-semibold`, and a `MeterBar`
  under the row scaled to the sector's top company. `min-w-0 truncate` on
  the name span (see §5.2 for the name-cleaning fix). 20 ruled rows with
  logos and bars = the exact grammar of the deals table, at document width.
- **"Recent buys"** → same rows plus the ticker pill; alpha stays but as
  plain `text-positive/negative` text (a `DeltaBadge` per row ×12 next to the
  companies list's badges would be chip soup; the badge marks the *sector's*
  number, text marks the evidence).
- **"Other sectors"** → replace the bare link column with a chip rail:
  `chip("md")`-styled links (capsule, mono caps, hairline) wrapping in a
  `flex flex-wrap gap-1.5`. Eleven capsule chips read as navigation
  furniture; eleven underlined text lines read as a sitemap dump. (These are
  links, not labels — but a *navigation* capsule is precedented by the A–Z
  rail on `/companies`; use that rail's `rounded-lg` box style if the
  chip-shape objection wins. Either way: boxes, not a list.)
- Then `AppCtaBand`, then footnote.

Mobile: rows already stack fine; `DeltaBadge` and value share the right edge
(`flex-col items-end gap-0.5` under `sm`). `StatTiles` goes `grid-cols-2`.

Dark mode: nothing new — every token named has a `dark:` half already proven
on the company page.

### 5.2 The ranked leaderboard — `/biggest-buys`

The board becomes a **bar-chart-shaped table with identities**. Target row:

```
      ┌────────────────────────────────────────────────────────────────┐
  01  │ ◉ Jardine Matheson Holdings   JAR                    £96m     │
      │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░  ▲ +12.4%       │
      │   1947 Trustee Limited · 14 Mar 2026 · STRONG CLUSTER         │
      └────────────────────────────────────────────────────────────────┘
  02  │ ◉ Wise                        WISE                   £41m     │
      │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░  ▼ −3.1%        │
      │   …                                                            │
```

Element by element:

- **Rank**: `font-mono text-[15px] tabular-nums` in a fixed `w-8` gutter,
  zero-padded (`01`…`25`), `text-foreground/30` — except ranks 1–3 at
  `text-foreground` full ink. No medals, no gold: the download page's
  `01 / 06` numbering already set the idiom, and restraint is the brand. The
  current 12px/35% digit is set quieter than the small print — on a page
  whose *sort key is the rank*, the rank must be legible.
- **Identity**: `CompanyLogo size={28}` + company name
  (`text-[14.5px] font-medium`, **`min-w-0 truncate`** — the fix for Jardine
  Matheson blowing out the row) + `TickerPill`. Full name available on
  hover via `title`.
- **Value**: right-aligned `text-[15px] font-semibold tabular-nums` — today's
  treatment, kept.
- **MeterBar** spanning the identity column, scaled to rank 1's value. 25
  rows of these = the value distribution at a glance; the fact that #1 is
  often 3× #5 is the story text alone can't tell.
- **Alpha**: `DeltaBadge` at the bar's right end (it's the second axis:
  "was it smart money"). On mobile it moves under the value.
- **Insider line**: `R.label`, **one line, `truncate`**. Add a
  `cleanInsiderName()` next to `cleanCompanyName` in `src/lib/company.ts`
  that drops a trailing parenthetical over ~20 chars — "1947 Trustee Limited
  (trustee for 1947 Trust benefiting Executive Directors)" → "1947 Trustee
  Limited", full string in `title`. The parenthetical is legally interesting
  and visually fatal; the tooltip keeps it honest. Cluster tier stops being
  prose ("strong cluster" mid-sentence) and becomes the existing
  **`ClusterChip`** (`src/components/cluster-chip.tsx`) after the date.
- **Repeated entities**: keep one row per filing (the file-level comment's
  reasoning is right — grouping answers a different question), but when a
  ticker already appeared above: swap the logo for a `text-foreground/30`
  `↳` glyph in the logo slot and append a `R.label` marker `2nd entry` after
  the pill. The eye then reads repeats as echoes rather than re-counting the
  same company. The existing `suppressed` footnote stays.
- Row hover links to the company page (whole row), matching §5.1.
- **Methodology**: move "How this is put together" into a
  `SeoSection variant="rail"` — methodology-as-left-rail-document is exactly
  the broker-review composition, and it visually signals "this is editorial
  with rules", the page's differentiator.
- Terminal: `AppCtaBand` ("The next one on this list will buzz your phone."),
  then the year-archive links restyled as the same box-link rail as §5.1's
  other-sectors, then small print.

Mobile: rank gutter shrinks to `w-6`, insider line clamps, `DeltaBadge`
drops under the value on the right edge; the MeterBar spans full row width
under the identity line. Nothing horizontal-scrolls.

### 5.3 The prose page — `/learn`

The writing is approved; the composition changes at the edges only.

- **Entry page**: put the body in `SeoSection variant="rail"`-style measure —
  actually simpler: keep the current stacked prose (it's clean) but add the
  family eyebrow (`LEARN`) via the shell, and set the first paragraph at
  `text-[16.5px] leading-[1.6] text-foreground/85` (the company page's
  standfirst treatment, `company.tsx:415`) so the entry opens with a stated
  thesis instead of eight identical grey paragraphs.
- **`LiveExamples`** rows: add `CompanyLogo size={24}` + `TickerPill`,
  money right-aligned semibold — the same 3-line diff as §5.1's recent buys.
  This section is the page's moat ("the definition, then this week's real
  filings") and currently looks like footnotes.
- **Related** → **`RelatedCards`** (`src/components/seo/related-cards.tsx`):
  a `grid gap-2 sm:grid-cols-3` of tile-cards — `R.tile px-4 py-3.5`, entry
  title at `text-[13.5px] font-medium`, description `line-clamp-2` at
  `R.note`, hover per `more-companies.tsx:90` (border darkens, bg lifts).
  Three labelled doors instead of three underlines. Reused by `/reports`
  index (month cards: month name + headline clamp) and the learn index
  itself if wanted.
- Then **`AppCtaBand`** — the whole reason the family exists. Learn entries
  get the per-entry `cta` override from `shared/glossary.js` (§4.3) because
  a concept-specific promise ("Know the moment the window reopens") is the
  strongest copy on the site's most-read cold pages.
- **Index**: entries list gains nothing but the eyebrow and terminal band —
  title-over-description ruled rows are already right for a contents page.

### 5.4 The entity-card grid — "Check out director dealings at these companies"

(`src/components/company/more-companies.tsx`, between the dark THE APP band
and the FAQ.)

**Why nobody clicks today**: the only variable is `N buys` — a count with no
size, no time, no outcome. "Why do I wanna look at this?" has four honest
answers, in order of pull:

| Candidate | Available today? | Where |
|---|---|---|
| **Recency of last buy** | **Yes** — `last_trade_date` is already in `CompanyIndexEntry` (`api.ts:21`) and already fetched | free |
| **Has written analysis** | **Yes** — `analysed` count, already fetched | free |
| **Total value purchased** | **No** — `/api/companies` returns no value; per-card `companyPage()` calls would be 8 extra bundle fetches | needs ddbx-data: add `total_value` + `currency` to the companies index (`SUM(value_gbp)` in the same GROUP BY that produces `deals`; trivial, backwards-compatible — additive field, safe under the cross-repo contract since iOS doesn't consume `/api/companies`) |
| Return/alpha, sparkline, cluster, rating mix | No — needs per-ticker `live_performance` or price history; 8× `/prices/history` calls for a footer module is not worth it | defer; if ever, add `median_alpha` to the same index roll-up rather than fetch client-side |

**Recommendation**: ship in two phases; the card design is built for phase 2
but degrades cleanly to phase 1.

**Phase 1 (no API change)** — recency is the hook:

```
┌──────────────────────────────────┐
│ ◉  Jardine Matheson      3d ago │   ← logo 32 · name line-clamp-2 ·
│    Holdings                      │     recency chip top-right
│  ──────────────────────────────  │   ← hairline
│  JAR   4 buys · 2 rated      →  │   ← TickerPill · counts · arrow on hover
└──────────────────────────────────┘
```

- **Truncation fix**: name gets `line-clamp-2` (two lines budgeted in the
  card height) instead of `truncate`, plus `title` attr. `cleanCompanyName`
  learns to strip trailing parentheticals *repeatedly* (loop the existing
  regex) so "(Singapore Reg) (JAR)" fully cleans — same helper change as
  §5.2.
- **Recency chip**: `chip("sm")` with tiered tone — bought within 7 days:
  `bg-positive/10 text-positive` "3d ago"; within 30: neutral tint "2w ago";
  older: no chip (absence is information). Relative-date helper exists in
  spirit in `dealing-dates.ts`. This is the "why now" the module lacks.
- **`2 rated`** from `analysed` — tells the reader there's a written thesis
  behind the door, which is the actual product.
- Card chrome: keep the existing sheet-ish treatment
  (`rounded-xl border-[#e8e0d5] bg-[#faf7f2]`, hover border-darken +
  bg-white) — it's already correct, just under-filled.

**Phase 2 (after ddbx-data adds `total_value`)** — value becomes the primary
number and the card grows a bar:

```
┌──────────────────────────────────┐
│ ◉  Jardine Matheson      3d ago │
│    Holdings                      │
│  £96m  bought                    │   ← 19px semibold tabular; the reason
│  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░          │   ← MeterBar vs max card in the rail
│  JAR   4 buys · 2 rated      →  │
└──────────────────────────────────┘
```

**Container**: 4×2 grid is right on desktop — the module is a footer rail,
not a destination, and eight equal doors is the correct rhetoric; a mini
leaderboard here would compete with the actual table above. But: on mobile
the current `grid` collapses to **eight stacked full-width cards ≈ two
screens of scroll between the CTA band and the FAQ** — that's the worst
surface today. Change mobile to `grid-cols-2` with the compact phase-1 card
(logo, clamped name, recency chip, counts) or cap at 4 below `sm`.
Selection: once value arrives, sort by
`analysed desc, total_value desc, recency` (today's sort with value replacing
raw deal count) — biggest-money doors first.

Dark mode: existing `dark:` classes on the card already correct; recency chip
uses `positive` token pair; MeterBar per §4.4.

### 5.5 Broker guides & report archive — light touch

- `/brokers/best-for/*` and `/brokers/compare/*`: already composed correctly.
  Add: family eyebrow ("BROKER GUIDE") above the h1 for consistency, and the
  `media="none"` `AppCtaBand` variant *below* the methodology/disclaimer
  block — quiet copy ("See which insiders trade on the platform you pick").
  Nothing else; do not re-skin working affiliate surfaces.
- `/reports` index: month rows → `RelatedCards`-style tiles (month, headline
  clamp, 2-col) or keep ruled rows + eyebrow + terminal band. Recommend the
  latter first (cheap), tiles when there are >6 months to show.
- `/reports/:month` (`report.tsx`): it already inherits the monthly-report
  composition (`src/components/monthly/*` — metrics, charts, prose); it
  needs only the shell's eyebrow + terminal `AppCtaBand`.

---

## 6. Component ledger

**Reused as-is** (no changes): `DeltaBadge` (`market-row.tsx` — consider
re-exporting from a neutral path), `CompanyLogo`, `ClusterChip`, `chip()` /
`CHIP_*`, `BUTTON_RADIUS` / `BUTTON_FILLED`, `StoreButtons`, `FULL_BLEED`,
`Tooltip`, `Skeleton`, `DeviceFrame`, `useDevicePlatform`,
`appShotSrc`.

**Existing, needs a variant or extraction**:
- `Section` (3 private copies) → `SeoSection` with `variant="rail"` (§4.2).
- `CompanyAppPitch` left column + band → extracted into `AppCtaBand`;
  `CompanyAppPitch` then composes `AppCtaBand` internally or stays parallel
  (either is fine; don't block the band on the refactor).
- Ticker pill (4 inline copies in `market-row.tsx`) → `TickerPill`.
- `cleanCompanyName` → strip long trailing parentheticals; new
  `cleanInsiderName` beside it (`src/lib/company.ts`).
- `alphaClass` (`sector-ui.tsx:70`) → rewrite onto `text-positive` /
  `text-negative`; better, delete it where `DeltaBadge` takes over.
- The `R`/`C` token sprawl (4 copies) → one `src/components/tokens.ts`
  exporting `SHEET`, `TILE`, `RULE`, `LABEL`, `BODY`, `NOTE`, `EYEBROW`.
  Do this opportunistically as files are touched, not as a big-bang rename.

**Genuinely new** (all in `src/components/seo/`):
- `SeoPageShell` — kicker/crumbs/title/standfirst/cta/footnote (§4.1).
- `SeoSection` — ruled section, default + rail variants (§4.2).
- `AppCtaBand` — terminal dark conversion band (§4.3).
- `StatTiles` — labelled stat grid, `primary`/`tone` per stat (§4.4).
- `MeterBar` — 3px proportion bar, brand fill (§4.4).
- `RelatedCards` — tile-card grid for onward links (§5.3).

Everything above is presentational; no wire-format or endpoint contract is
touched except the additive `/api/companies` field (§5.4), which only the
site consumes.

---

## 7. Dark mode & mobile (summary of the rules used throughout)

- Every colour named in §4–5 is a token pair already proven in production:
  sheet/tile/rule pairs from `company.tsx:39`, brand brown `#5a4128 →
  #ad9479`, band `#1a140d → oklch(17% 0.02 55)`, directional
  `text-positive/negative` (bright pair in dark via `globals.css:118`).
  MeterBar's brand fill at /60 alpha keeps contrast on both grounds.
  Nothing in this proposal introduces a hex without a `dark:` partner.
- Mobile: document pages stay single-column (`max-w-[860px]` already
  collapses); rows keep `min-w-0 truncate` + right-aligned number stacks
  (`flex-col items-end`); grids: StatTiles 2-col, RelatedCards 1-col,
  entity cards 2-col compact; AppCtaBand stacks with media hidden; MeterBars
  span full width. No horizontal scrolling anywhere; nothing depends on
  hover (tooltips degrade to `title`, hover-arrows are decorative).

---

## 8. How these pages earn their SEO keep while funnelling

- **Text parity is the constraint.** Crawlers get pre-rendered HTML from
  `functions/*` (sectors, biggest-buys, learn, reports mirror their words
  from `shared/*.js`). Every §5 change is presentation around the *same
  strings* — names, figures, methodology, caveats all still render as text.
  StatTiles/DeltaBadge/MeterBar re-clothe numbers, they don't move them into
  images. Rule for implementation: **if a fact is in the Functions
  pre-render today, it must remain visible text in the hydrated page.**
- The `AppCtaBand` adds no keyword dilution: one h-less headline (use a `p`,
  not a heading element, so the document outline stays about the topic),
  `aria`-clean store links, and it sits after the content, so it can't
  cannibalise the above-the-fold answer that earns the ranking.
- The uplift itself is an SEO play: time-on-page and internal-click-through
  (logos, chip rails, RelatedCards, entity cards are all *internal links
  made more clickable*) are the behavioural signals these thin-ish pages
  need, and the crawl graph gets denser without a single new URL.
- Discretion posture unchanged: none of these surfaces show analysis text,
  so nothing new needs gating; the band sells exactly what the gate already
  points at.

---

## 9. Sequencing

Ordered by visual-credibility-per-effort; each step ships alone.

1. **`AppCtaBand` + wire into learn/sectors/biggest-buys/reports** (§4.3).
   One new component, four one-line drop-ins; converts the family's dead
   ends into the funnel it was built for. *The single highest-value change.*
2. **Leaderboard rows** (§5.2): logos, TickerPill, truncation +
   `cleanInsiderName`, rank re-weight, DeltaBadge, MeterBar. The most
   linkable page becomes the most shareable one.
3. **Sector index + detail** (§5.1): DeltaBadge/value re-weight, MeterBars,
   StatTiles on the detail figures, logos in the companies list, risk-amber
   caveats.
4. **Eyebrow + shell adoption** (§4.1): mechanical migration of the four
   families onto `SeoPageShell`/`SeoSection`; fold the broker guides' and
   reports' eyebrows in here.
5. **Entity cards phase 1** (§5.4): recency chip, `analysed`, line-clamp,
   mobile 2-col. No API work.
6. **Learn polish** (§5.3): opening-para weight, LiveExamples logos,
   RelatedCards.
7. **Entity cards phase 2** — *blocked on ddbx-data*: add `total_value` +
   `currency` to `/api/companies` (additive; site-only consumer), then the
   value-led card + MeterBar, and switch the module's sort to value.
8. Long tail: token consolidation (`tokens.ts`), TickerPill extraction
   sweep, reports-index tiles when month count justifies it.

**Data the API doesn't return today** (all optional, none blocking §1–6):
`/api/companies` per-issuer `total_value`/`currency` (step 7); per-issuer
`median_alpha` in the same index if entity cards ever want a return figure;
per-sector *historical* series (only needed if sector pages ever want real
sparklines — MeterBars deliberately don't).
