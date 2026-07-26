# /api — developer API surface (plan)

**Status:** plan only, nothing built.
**Date:** 2026-07-26

A new cross-market nav tab, **API**, at `/api`. A sales page for a data API we
have not committed to shipping, backed by a real interest form that writes to
D1. Pricing on request.

The unusual thing about this page is that the product it advertises mostly
*already exists* — `api.ddbx.uk` has been serving normalised, scored,
cross-market insider data over open CORS for months. What doesn't exist is
auth, quotas, a contract, or anyone paying for it. That gap is the whole
design problem: how much to imply without lying.

---

## 1. What we can honestly claim (verified 2026-07-26)

All figures below were pulled live from `api.ddbx.uk` today, not estimated.

### Coverage

| Market | Rows | Source | Wire type |
|---|---:|---|---|
| UK | 826 (all-time `dealings`) | RNS / PDMR notifications | `Dealing` |
| US | 1,761 in window (527 "interesting", 495 "signal", 533 triaged) | SEC Form 4 | `UsDealing` |
| NL | 11,905 | AFM, MAR Art. 19 | `EuDealing` |
| SE | 3,489 | Finansinspektionen | `EuDealing` |
| USG | dark-launched | House/Senate STOCK Act PTRs | `GovDealing` |
| DJT | dark-launched | Form 4, single-issuer | `UsDealing` |

EU total 15,394. Latest disclosure at time of writing: `2026-07-26T14:39:26Z`.

### Latency

`wrangler.toml` crons include `*/15 * * * *` — the scrape/ingest tick runs
every 15 minutes. **"New filings land within ~15 minutes of publication"** is
a defensible claim. Don't say "real-time" or "streaming".

### The payload — this is the actual product

Nobody else ships these fields. A single row from `/api/dealings` carries:

- `triage` — `{verdict, reason}`. An LLM screen with a **written rationale**,
  not a score. e.g. *"A £1,198 purchase of 1,000 shares by a Board Fellow at a
  closed-end fund is routine portfolio participation, not a conviction signal."*
- `analysis` — on rows that clear triage (105 of the most recent 200 UK rows
  carry one): `{rating, confidence, summary, thesis_points[],
  evidence_for[], evidence_against[], key_risks[], catalyst_window, checklist}`.
  `rating ∈ {significant, noteworthy, minor, routine}`.
- `cluster` — `{tier, count, window_days}`. Multiple insiders buying the same
  issuer inside a window.
- `buy_style` — `{kind, drawdown_from_high_pct, trailing_return_pct,
  window_days}`. Dip-buy vs momentum vs neutral.
- `live_performance` — `{return_pct_trade, return_pct_disclosed,
  alpha_pct_trade, alpha_pct_disclosed, as_of}`. **Alpha vs benchmark from both
  the trade date and the disclosure date** — the disclosure-date number is the
  one a follower could actually have captured.
- `sector_normalized` — one sector taxonomy across four jurisdictions.
- Currency/unit reconciliation — `price_pence` (native minor units),
  `price_native`, `value_gbp`, plus `/api/fx/gbp-per-usd`.

### Endpoint inventory (public, live, CORS-open today)

`worker/index.ts` mounts `app.use("/api/*", cors())`. Everything below is a
`GET` and unauthenticated right now.

| Path | Params |
|---|---|
| `/api/markets` | — (discovery; serialises `MARKET_CONFIG`) |
| `/api/dealings` | `rating`, `before`, `since`, `limit`, `include_quarantined` |
| `/api/dealings/:id` | — |
| `/api/us-dealings` | `before`, `since`, `limit`, `code`, `ticker`, `view=interesting\|signal\|penny\|all`, `includePenny` |
| `/api/eu-dealings` | `market=SE\|NL`, `view=signal\|all`, `before`, `since`, `limit` (≤500) |
| `/api/gov-dealings` | `view=signal\|all`, `ticker`, `limit` |
| `/api/djt-dealings` | `limit`, `reporter` |
| `/api/directors/:id`, `/api/directors/{us,se,nl}/:id` | — |
| `/api/companies` | `market=UK\|US` |
| `/api/company/:market/:key/{page,stats,timeline,news}` | — |
| `/api/prices/{history,latest,on}` | `ticker`, `days` (14–3650) |
| `/api/performance/prices-bundle` | — |
| `/api/fx/gbp-per-usd` | — |
| `/api/news/{uk,us,se,nl}` | — |
| `/api/daily-summary`, `/api/weekly-digest`, `/api/monthly-summary`, `/api/monthly-summaries` | `market` |
| `/api/portfolio`, `/api/index-quote`, `/api/brokers` | `market` |
| `/api/logo/{ticker,domain}/:key` | — |
| `/api/version` | — (`{latest, total}` over `dealings`) |

Pagination is already a real cursor: pass the oldest `disclosed_date` you've
seen as `before`. Cache-Control headers are already set per-endpoint.

### Competitive frame

- **Quiver Quantitative** sells Form 4 / congressional data from ~$25/mo, API
  tier ~$75/mo. Raw filings, US-only.
- **2iQ Research** is the enterprise incumbent — 60,000 stocks globally,
  opaque enterprise pricing, sold to institutions.

The gap: nobody sells *scored, benchmarked, cross-market* insider data at a
mid-market price. That is the entire pitch, and it happens to be true.

---

## 2. Positioning

> **Not a filings firehose. A scored signal feed.**

Three pillars, in this order:

1. **One schema, four jurisdictions.** UK RNS, SEC Form 4, Swedish FI, Dutch
   AFM — normalised into one wire format with one sector taxonomy and
   reconciled currency units. Parsing four regulators yourself is months of
   work and the reason 2iQ can charge what it charges.
2. **Scored, not raw.** Every row carries a triage verdict *with a written
   reason*. The ones that matter carry evidence for and against, key risks and
   a catalyst window. You get a judgement you can read, not a number you have
   to trust.
3. **Benchmarked from day one.** Alpha vs index from both trade date and
   disclosure date, updated daily. You can see what following the signal
   would actually have returned before you build anything.

Supporting: cluster detection, buy-style classification, ~15-minute latency,
cursor pagination, edge-cached, CORS-open.

---

## 3. Honesty posture — read this before building

The brief is "give the impression we will [offer an API]". The line I'd draw:

**Do:** frame the whole page as **private beta / request access**.
- Docs preview badged **"Draft spec v0 · subject to change"**.
- CTA is *"Request access"*, never *"Get your API key"*.
- Rate limits shown as **indicative**.
- Tier names with contents but no numbers (see §4.7).

**Don't:**
- **No mention of a free tier, public sandbox, or open endpoint.** See §9's
  copy rule — this is a hard constraint, not a preference.
- No self-serve key issuance or console mockup.
- No fake "trusted by" logos, no invented uptime SLA, no status-page link.
- No dashboard screenshot of a product that doesn't exist.
- No published price. You said on-request; posting a number and then
  negotiating away from it is worse than not posting one.

Why this is the *stronger* sell, not the weaker one: "private beta, pricing on
request, spec subject to change" is how serious data vendors actually sell.
A self-serve signup page for a product with no backend produces bounced,
annoyed, unqualified traffic and burns the brand with exactly the audience
you want. Scarcity framing also justifies the missing price.

### Two real risks to resolve before signing anyone

1. **Data licensing.** SEC Form 4 is public domain — fine. UK RNS content is
   currently sourced via sharecast (`siteConfig.links.source`); commercial
   *redistribution* of that is a licensing question. Swedish FI and Dutch AFM
   registers are public but have their own reuse terms. The LLM-generated
   analysis is ours and unambiguously sellable; the underlying disclosure
   prose is not automatically.
2. **Yahoo-sourced prices.** `/api/prices/*` and
   `/api/performance/prices-bundle` are backed by Yahoo Finance bars, which
   are explicitly not licensed for redistribution. **Exclude these from the
   commercial pitch** or swap the source before selling them. Derived
   `live_performance` figures are a greyer area than raw bars but should be
   described as ours, computed from licensed inputs, once inputs are fixed.

Neither blocks building the page. Both block invoicing.

---

## 4. Page design

> Design section below is the reconciled output of a dedicated design pass over
> the codebase (Fable, 2026-07-26). Where it contradicts a first-pass instinct,
> the codebase-grounded reading won — noted inline.

### 4.-1 DECIDED: the page is permanently dark

Jon, 2026-07-26: *"it would be nice for it to always be in a dark theme — it's
technical."* Agreed, and it resolves cleanly. But it has four consequences that
have to be designed for, not discovered.

**a. The closer inverts — and this is a feature.** The site's grammar is *one
contrasting object on the page, and that object is the ask*. On an all-dark
page that principle doesn't break, it flips: the request-access band becomes
**cream** (`bg-[#f5f0e8]` or the warmer `#f1ede6`) against the dark page, with
near-black ink and a `BUTTON_FILLED` submit. Same rule, inverted polarity. The
form field skin therefore reverts to the *light* spec — the search-pill
precedent (`focus:border-[#5a4128]/50`) rather than the amber-on-dark variant.

**b. The whole light column of §4.9 falls away.** No `#e7e0d4` / `#e8e0d5` /
`#e0d8cc` hairlines, no `#faf6ef` / `#f1ede6` band creams — except inside the
inverted closer. The page builds from the `.dark` tokens: bg
`oklch(22% 0.022 55)`, surface 26%, surface-secondary 30%, border 38%,
separator 34%, muted 67%, fg `oklch(93% 0.012 78)`. Kickers go amber `#eec584`
rather than brown `#5a4128`. **This roughly halves the spec** — one palette,
not two.

**c. The terminal blocks stop being insets.** They were the dark object on a
cream page; now they need to separate from a dark page. Push them one step
darker than the surface — `bg-[oklch(17%_0.02_55)]` on an
`oklch(22% 0.022 55)` page — and lean on the `border-white/10` header rule.
This is why the lightness ladder in `globals.css` was widened (+5L at
background to +9L at border): use it.

**d. Two implementation gotchas, both real.**

- **Theme is a plain `.dark` class** on `documentElement` plus a `localStorage`
  key, set by `src/components/theme-switch.tsx`. No next-themes, no provider
  (`src/provider.tsx` is a passthrough). So force-dark is: add `.dark` on
  mount, **restore the user's actual preference on unmount**. Client-side
  navigation away from `/api` must not strand the rest of the site in dark.
- **iOS Safari toolbars.** iOS 26 ignores `theme-color` and tints its status
  bar and bottom toolbar from the `body` background-color; `ThemeSwitch` also
  has to *replace the meta node wholesale* (mutating `content` doesn't
  repaint) and must pass a literal hex, because Safari rejects `oklch()`.
  A force-dark route has to do both — set `body` background and re-insert
  `<meta name="theme-color" content="#170d06">` — or an iPhone shows a cream
  toolbar above a dark page. `syncThemeColorMeta` in `theme-switch.tsx`
  already encodes the correct technique; reuse it, don't re-derive it.

**e. Hide the theme switch on this route.** The navbar already reads
`useLocation`. A toggle that visibly does nothing is worse than no toggle.

### 4.0 Template and donors

`src/pages/download.tsx` is the structural template. Two further grammars get
borrowed rather than reinvented:

- `src/components/brokers/broker-page-ui.tsx` — the **ruled-document** idiom.
  `PageSection` is `grid gap-x-10 border-t sm:grid-cols-[10rem_minmax(0,1fr)] py-8`
  (heading left, content right) with `R.*` tokens (`R.rule =
  "border-[#e8e0d5] dark:border-separator"`, `R.body = "text-[14px]
  leading-[1.65] text-foreground/70"`). This is exactly how an endpoint
  reference should be composed — one `PageSection` per endpoint group.
- `src/components/market/market-faq.tsx` — two-column FAQ with a **sticky left
  title block** (`md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]`), native
  `<details>`, hairline rules, `PlusIcon` rotating 45°. Use this, **not**
  `DownloadFaq`'s centred stack — more editorial, better for this audience.

Import as-is, do not rebuild:

| Component | Path | Use |
|---|---|---|
| `SectionHeader` | `download/section-header.tsx` | Ruled/numbered/left-set headers; takes `tone="dark"` |
| `Reveal`, `CountUp` | `download/reveal.tsx` | Scroll-in; reduced-motion + print already solved |
| `StatBand` | `download/stat-band.tsx` | Full-bleed cream proof strip |
| `StatTiles` | `seo/stat-tiles.tsx` | Label-over-value tiles, `primary`/`tone` props |
| `AppCtaBand` | `seo/app-cta-band.tsx` | **Geometry donor** for the closing band |
| `TickerPill` | `ticker-pill.tsx` | **This IS the inline-code treatment** — `rounded bg-[#e8e0d5] px-1.5 font-mono text-[11px] font-semibold tabular-nums` |
| `chip()`, `CHIP_*` | `chip.ts` | Method badges, eyebrows |
| `BUTTON_*` | `button.ts` | Every pressable thing |

Table styling precedent: the Fills table at `src/lib/markets/us.tsx:598` —
`w-full text-sm`, thead `text-xs text-muted` with `font-normal` th, rows
`border-t border-black/[0.04] dark:border-white/[0.06]`, `tabular-nums`,
right-aligned numerics.

Two traps found in the codebase:

- `src/components/primitives.ts` — the gradient `title()`/`subtitle()` tv()
  variants are **dead HeroUI-template DNA** (pink/cyan gradients). No current
  marketing page uses them. Don't resurrect.
- `src/lib/markets/us.tsx:625` (also `netherlands.tsx:447`, `sweden.tsx:536`)
  has a debug JSON viewer using `text-slate-100` — the one cold-grey off-note
  in the codebase. Precedent that code blocks exist; **not** a template.

### 4.1–4.7 Section order

1. **Hero — cream, not dark.** A framed stage like `DownloadHero`'s:
   `rounded-3xl border border-black/[0.08] bg-[#f1ede6] dark:border-white/[0.08]
   dark:bg-[oklch(19%_0.022_55)]`, two-col `lg:grid-cols-[1fr_460px]`. Left:
   eyebrow chip "Developer API · UK / US / SE / NL", h1
   `text-[34px] lg:text-[54px] font-semibold leading-[1.05] tracking-tight`,
   `BUTTON_FILLED` *Request access* + `BUTTON_GHOST` *Read the reference*
   (both anchor-scroll). Right: **the terminal card** (§4.8) sitting inside the
   cream frame the way the notification stack sits in the download hero.
2. **Proof strip** — `StatBand` verbatim (`${FULL_BLEED} border-y
   border-[#e7e0d4] bg-[#faf6ef] dark:border-border/50
   dark:bg-surface-secondary/20`). 3–4 **computed** figures plus a provenance
   `sourceLine`: *"Primary regulatory sources — RNS, EDGAR, AFM, FI — never a
   third-party summary."* That answers the quant buyer's first question in the
   site's own device.
3. **01 · The data.** `SectionHeader` + a 3-up card grid in the winner-card
   skin. This is the money section: triage with written reasons, both-sides
   analysis, live performance marks, cluster detection, one normalised schema.
   Include one real annotated JSON response with callouts on `triage`,
   `analysis`, `cluster`, `buy_style`, `live_performance`.
4. **02 · The reference.** Broker `PageSection` rows, one per group (Dealings ·
   Analysis · Prices · News). Each right column: endpoint table (Method · Path
   · Returns), then one worked example — request line, params as a `<dl>`
   (`dt` in `font-mono font-medium`, `dd text-foreground/70`), then a terminal
   block with trimmed JSON. Close with a quiet *"Full reference shipped with
   access."* — sells the gate without a wall.
5. **03 · Coverage.** Four ruled rows (`learn.tsx` index idiom, `border-b
   border-[#e8e0d5] py-5`) — UK / US / SE / NL, each with name, source + since
   date in `R.body`, and a compact `StatTiles` row. Cross-market is the
   differentiator; it earns its own section rather than a footnote.
6. **FAQ.** `MarketFaq` two-col pattern. Content: licensing and redistribution,
   latency, history depth, rate limits, schema stability, how amendments and
   restatements are handled, and *"is this advice"* (no).
7. **04 · Request access — the dark band, with the form inside it.**
   ⚠ This merges what was originally planned as two sections. Correct call:
   the site's grammar is *cream is the record, the one recurring dark object is
   the ask*. Spending dark at the top and again at the bottom devalues both.
   Clone `AppCtaBand` geometry: `${FULL_BLEED} bg-[#1a140d] text-white
   dark:bg-[oklch(17%_0.02_55)]`, inner `mx-auto max-w-[1280px] px-4 py-16
   md:py-24`, grid `lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] gap-12`.
   Left: amber mono kicker, white headline, and the pricing posture stated
   plainly in copy — *"Pricing is quoted per use case — tell us what you're
   building."* Right: the form (§5).

**On tiers:** stating three tier *shapes* with contents and no numbers still
holds as a way to make "on request" read as considered rather than evasive —
but do **not** reuse `PricingCard`. `src/lib/pricing.ts` is App Store
subscription pricing mirrored from StoreKit and must not leak onto this page.
If tiers appear at all, they're plain ruled rows in the band's left column.

### 4.8 The terminal block — the page's signature object

Used in the hero and every code sample.

- Container: `rounded-2xl bg-[#1a140d] dark:bg-[oklch(17%_0.02_55)] shadow-sm
  overflow-hidden`
- Header bar — **no macOS traffic lights** (cliché, and the site never does
  skeuomorphism). A hairline row `flex items-baseline justify-between border-b
  border-white/10 px-4 py-2.5`: left `font-mono text-[11px] font-semibold
  uppercase tracking-[0.16em] text-[#eec584]` → `GET /api/dealings`; right
  `font-mono text-[11px] tabular-nums text-white/40` → `200 OK · 142 ms`.
  That is `SectionHeader`'s kicker/counter grammar transposed onto dark, so
  the object reads as ddbx rather than as a docs widget.
- Body: `overflow-x-auto p-4 font-mono text-[12.5px] leading-[1.6]`, base ink
  `text-[#f5f0e8]/90` — the page cream as the text colour, a closed loop.
- **Syntax palette, brand hues only**, hand-tokenised spans (no highlight
  library for a handful of static snippets): keys `#ad9479`, strings
  `#eec584`, numbers `#e8a878`, punctuation `white/40`, comments `white/35`.
  ⚠ Correction to first pass: **numbers are NOT `--positive` green.**
  Green/red mean money moved. At most one green value where it is honestly
  directional (a `return_pct`).
- Language tabs (curl / Python / JavaScript): segmented control on a
  `rounded-lg bg-white/[0.06] p-0.5` track, active segment `bg-white
  text-[#1a140d]`, labels `font-mono text-[11px] uppercase tracking-wider`.

### 4.9 Visual tokens (verified)

- Page body literally `#f5f0e8` (globals.css:86); `--background`
  `oklch(96.5% 0.010 78)`; dark `oklch(22% 0.022 55)`.
- Ink `oklch(20% 0.010 65)`; muted `oklch(46% 0.022 65)`.
- Near-black `#1a140d` (hover `#2a2118`); accent brown `text-[#5a4128]` /
  `dark:text-[#ad9479]`, tint `bg-[#5a4128]/10 dark:bg-[#ad9479]/15`;
  amber-on-dark `#eec584`.
- Hairlines: `#e7e0d4` (bands) · `#e8e0d5` (ruled docs) · `#e0d8cc` (cards).
- Band creams: `#faf6ef` (proof strips) · `#faf7f2` (sheets) · `#f1ede6`
  (hero stage).
- Card: `rounded-3xl border border-[#e0d8cc] bg-white/70 p-5 shadow-sm
  dark:border-border/60 dark:bg-surface-secondary/40`.
- Kicker: `font-mono text-[11px] font-semibold uppercase tracking-[0.16em]
  text-[#5a4128] dark:text-[#ad9479]`.
- **Radii ladder:** chips `rounded-full` · buttons `rounded-lg` · sheets
  `rounded-2xl` · marketing cards `rounded-3xl`.
- **Shadows:** near-none. `shadow-sm` + `hover:shadow-md` is the ceiling.
- Layout: `DefaultLayout` wraps in `mx-auto w-full max-w-[1280px] px-4 md:px-6`;
  full-width bands via `FULL_BLEED` (`src/components/full-bleed.ts`) + inner
  `mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20`.
- **`--font-mono` already exists** — SF Mono-first system stack, deliberately
  chosen to match the iOS app's chips. **No new font load.** Bundling a code
  face would make this page's mono disagree with every chip on the site.

**Method badge — brown, not green.** Every public endpoint is `GET`, and
green/red are spoken for by returns. So:
`${CHIP_BASE} ${CHIP_HAIRLINE} ${CHIP_SIZE.sm} bg-[#5a4128]/10 text-[#5a4128]
dark:bg-[#ad9479]/15 dark:text-[#ad9479]`. Paths render in the `TickerPill`
skin.

### 4.10 What would be wrong here

1. **A dark full-page hero.** Dark belongs to the terminal blocks and the
   single closing band. Spending it at the top guts the ask.
2. **Any stock highlighter theme** (Prism, Shiki defaults, Dracula, Monokai).
   The palette contains **zero cold hues** — no blue, violet or cyan anywhere.
   A stock theme will look pasted in.
3. **Green/red for anything but money.** Not "GET is green", not success ticks.
4. **Gradient meshes, glass, glow.** Gradients here are exclusively functional
   scrims.
5. **Chip/button confusion.** Chips are read, buttons are pressed —
   `button.ts`'s docblock exists because they once converged.
6. **Hand-typed stats.** `StatBand`'s docblock encodes the house rule: every
   number is computed from a real fetch. A typed "50,000+ filings!" would be
   the only dishonest number on the site.
7. **Hype tone.** House style (`HOUSE_STYLE_RULES` in
   `~/ddbx-data/worker/llm/prompts.ts`) is plain and sentence-case. *"Every
   filing, decoded, over the wire"* beats *"Supercharge your alpha."* No
   emoji, no exclamation marks.

**Motion.** Reuse `Reveal`. One flourish worth its weight: the hero terminal
block streaming in once on first paint, gated behind `prefers-reduced-motion`.

---

## 5. The interest form

### Frontend

No real form exists on the site today — no `<form>`, no HeroUI Input/Textarea,
just two native search pills (`src/components/market/market-filter-bar.tsx:107`
and `src/pages/compare.tsx:291`). So this is genuinely new UI, built from
native elements on the existing precedent. It lives in the **right column of
the dark closing band** (§4.7), not as its own cream section.

- Field: `w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3
  text-[15px] text-white placeholder:text-white/40 focus:border-[#eec584]/60
  focus:outline-none transition-colors`. The border-on-focus with no ring
  extends the search-pill precedent (which uses `focus:border-[#5a4128]/50`)
  onto dark. Rectangular, not capsule — it's a form, not a search.
- Labels above: `font-mono text-[11px] font-semibold uppercase tracking-wider
  text-white/45`.
- Fields: name*, work email*, company, "what are you building"
  `<textarea rows=4>`, use case* (fund/quant · fintech/brokerage ·
  research/media · personal · other), estimated volume.
- **Markets of interest** as `aria-pressed` toggle chips reusing the
  `compare.tsx:308` filter-chip pattern, dark variant: active
  `border-[#eec584]/60 bg-[#eec584]/15 text-[#eec584]`, inactive
  `border-white/15 text-white/70`.
- Submit: the inverted band button — `${BUTTON_RADIUS} bg-white px-6 py-3.5
  text-[15px] font-semibold text-[#1a140d] hover:bg-white/90`, full width,
  label "Request pricing". `data-ga-event` / `data-ga-label` like every other
  CTA on the site.
- Under it, `text-[12.5px] text-white/50`: "We reply within two working days."
  Band-bottom small print in `text-xs text-white/35`: data licence + a
  not-investment-advice line.
- Inline validation, optimistic success state, no page navigation.

### Backend (ddbx-data — NOT a Pages function)

The design pass flagged "no form backend precedent in this repo, needs a Pages
function". That's right about ddbx-site and wrong about where this belongs.
The worker is the correct home and already has everything needed: D1 lives
there, `app.use("/api/*", cors())` already exposes the namespace, and there's
a verified `send_email` binding straight to Jon's inbox. A Pages function would
mean a second D1 binding and a second place to look for leads.

- **Migration** `worker/db/migrations/052-api-interest.sql` → table
  `api_interest`: `id, created_at, name, email, company, website, use_case,
  markets, volume_estimate, message, source_path, referrer, utm, ip_country,
  user_agent, status, notes`. `status ∈ {new, contacted, qualified, closed}`.
- **`POST /api/api-interest`** — public, no Firebase auth (unlike
  `/api/analysis-feedback`, which gates on `verifyFirebaseIdToken`). Validate
  email, require name/email/use_case, trim and cap every field server-side.
  Returns `{ok: true}`.
- **Anti-spam, layered:**
  1. Honeypot field (`company_url`) — silent reject if filled.
  2. Time-to-submit floor (reject < 2s).
  3. Per-IP rate limit.
  4. **Cloudflare Turnstile** — recommended. Free, same platform, ~10 lines,
     and this is a public unauthenticated write.
- **Notification:** send immediately via the existing `WINNERS_EMAIL`
  `send_email` binding (already verified to jonathanwillington@gmail.com, DKIM
  applied by Cloudflare — see `worker/pipeline/winners-email.ts`). Also add an
  "API interest (last 24h)" panel to `renderOperatorSectionsHtml` in
  `worker/pipeline/operator-digest.ts` so it lands in the daily digest.
- **Admin read:** `GET /__api-interest` (matching the existing `__` admin
  namespace).
- CORS is already handled by the blanket `app.use("/api/*", cors())`. Note
  that's allow-all origin; worth restricting to the ddbx origins for a POST.

### Cross-repo impact: none

This adds one route and one table. No wire-format change, no `MARKET_CONFIG`
change, no existing endpoint touched. **No `npm run sync:types`, no iOS or
Android model changes.** Clean per `~/CLAUDE.md`.

Deploy: apply the migration with
`wrangler d1 execute director-dealings --remote --file=…`, then
`npm run deploy` in ddbx-data.

---

## 6. Site wiring

- **Route** `/api` in `src/App.tsx`. Verified no collision — the site's own
  data lives on `api.ddbx.uk`, there is no `functions/api/` directory, and the
  `_redirects` SPA fallback is last.
- **`/developers` → `/api`**, a `301` in `public/_redirects` placed **above**
  the SPA fallback line (which the file's own comment says must stay last).
- **Navbar** `src/components/navbar.tsx:53` — add unconditionally (no market
  gating). ⚠ `showNav` requires more than one item, so adding API gives SE and
  NL a nav bar for the first time (Deals + API). Desirable, but it is a
  visible change to those markets.
- **Theme switch** — hide `ThemeSwitch` when `location.pathname === "/api"`
  (§4.-1e). The navbar already has `useLocation`.
- **SEO** — entry in `shared/seo.js`; add `/api` to `COMMON_ROUTES` in
  `functions/sitemap.xml.js`, and to `ROUTES_BY_HOST["ddbx.eu"]` which
  currently lists only `/`, `/nl`, `/performance`. Only `/api` goes in the
  sitemap; `/developers` is a redirect and must not be listed.
- **Not discretion-gated.** It's a sales page.
- **Cross-market by construction** — one page, no market prop. Market-awareness
  is limited to the coverage table listing UK / US / SE / NL / USG / DJT.

---

## 7. Worth doing alongside (small, high leverage)

- **`/api/openapi.json`** — a real OpenAPI 3.1 document served by the worker
  from a hand-written spec object. Costs an afternoon, makes "we have an API"
  *true* rather than implied, and lets the docs preview render from one source
  instead of hardcoded JSX. Strong recommend.
- `X-Ddbx-Api-Version` response header.
- Document the 429 / `Retry-After` shape even before enforcing it.

---

## 8. Decisions (2026-07-26)

### 8.1 Congress — INCLUDE

`/api/gov-dealings?view=signal|all&ticker=&limit=` is live and returns richer
data than expected. A verified row carries a `rating_explain` block:

```
{ "rating": "noteworthy", "rating_score": 3,
  "rating_explain": { "headline": "Noteworthy — in-lane buy worth a look.",
    "factors": [
      {"sign": "pos",     "text": "Sits on Armed Services, which has direct
                                   jurisdiction over industrials — the company
                                   is squarely in the member's lane."},
      {"sign": "pos",     "text": "Bought in the member's own name, not a
                                   spouse or dependent account."},
      {"sign": "neg",     "text": "Prolific trader — 62 buys on file, so any
                                   single name is more likely portfolio churn
                                   than a deliberate signal."},
      {"sign": "neutral", "text": "Small position — under $50k at the
                                   disclosed band floor."} ] } }
```

Committee-jurisdiction reasoning, own-name vs spouse-account detection, and a
prolific-trader base rate — signed for and against. Nobody else ships that.

USG is dark-launched (`MARKET_CONFIG.USG` capabilities are all `false`, no
client surfaces it), which turns into a selling point rather than a caveat:
**available over the API before it reaches the apps.** Same for DJT.

### 8.2 Routes — `/api` canonical, `/developers` redirects to it

Jon's call, and the right one: the nav label is "API", so the URL should be
`/api`. Matching label to path beats convention here.

- `/api` — canonical, indexable, the only entry in `functions/sitemap.xml.js`.
- `/developers` — `301 → /api` via `public/_redirects` (above the SPA
  fallback, which must stay last). Catches the habitual guess and the
  "developers" search term without splitting link equity.

The one theoretical cost: `ddbx.uk/api/*` can never proxy the worker. Low risk
— data lives on `api.ddbx.uk` by design, and a proxy would be versioned
(`/api/v1/*`) so it wouldn't collide with the bare page anyway.

### 8.3 Turnstile — YES

Free, same platform, ~10 lines, and this is the site's first public
unauthenticated write. Layer it on top of the honeypot and time-floor.

### 8.4 ddbx.eu — YES, include the tab

The page is cross-market by definition. `ROUTES_BY_HOST` in
`functions/sitemap.xml.js` currently gives ddbx.eu only `/`, `/nl`,
`/performance` — add `/api` there and to the other hosts.

### 8.5 Theme — permanently dark. See §4.-1.

---

## 9. Locking down the public API

> Jon: *"we really should authenticate our API so only we can use it???"*

The instinct is right, but one constraint has to be stated plainly first.

### You cannot make it "only us"

**The website is a public browser client.** Anything it sends to reach the API
is visible in devtools in about thirty seconds. Any key shipped to the browser
is public by construction — that's not a ddbx problem, it's how browsers work.
So "only we can use it" is not an achievable end state while ddbx.uk is a
public site that reads its own API.

What's achievable is making unauthorised use *expensive and unreliable*, which
is a different and more useful goal.

### Current state (verified)

Every read endpoint is called **anonymously by every client**:

- **ddbx-site** — `src/lib/api.ts:117` is a bare `fetch(\`${BASE}${path}\`)`.
  No headers at all.
- **iOS** — `Sources/DdbxApp/Core/APIClient.swift` sets
  `Authorization: Bearer <firebase idToken>` on **writes only** (`/follows`,
  feedback). Reads send nothing.
- **Android** — no header/interceptor code found.
- **9 Cloudflare Pages Functions** (`functions/company/[key].js`,
  `companies.js`, `sectors/[slug].js`, `reports/[month].js`,
  `brokers/*`, `biggest-buys/*`, `t/[id].js`, `sitemap.xml.js`) fetch
  `api.ddbx.uk` **at the edge to prerender crawler-facing HTML**. These have no
  user and can never carry a user token.

That last one is the real constraint. Gating reads breaks SEO across the whole
site, not just the app.

### The ladder

**Tier 0 — edge controls. Do this first; it may be all you need.**
Cloudflare rate limiting on `api.ddbx.uk/api/*` (per-IP, e.g. 100 req/min),
Bot Fight Mode, managed challenges for datacenter ASNs on the heavy list
endpoints. **Zero client changes, zero breakage, ships today.** Kills casual
scraping and makes commercial-scale harvesting impractical.

**Tier 1 — origin allowlist.** `worker/index.ts:275` is a bare
`app.use("/api/*", cors())` — allow-all. Restrict to `ddbx.uk`, `ddbx.us`,
`ddbx.eu` and localhost. Note this is a *browser-enforced* policy: it stops
other people's **websites** embedding your data, not curl. Cheap, near-zero
risk. Worth doing regardless.

**Tier 2 — client key, additive then enforced.** Add `X-Ddbx-Client` support;
accept requests without it during a grace period; ship site/iOS/Android builds
that send it; only then enforce. This is exactly the back-compatible sequence
`~/CLAUDE.md` mandates — add alongside → migrate consumers → remove old, never
the reverse. **The grace period is set by the slowest-updating client**, which
is App Store and Play installs in the field: realistically 3–6 months, and even
then some installs never update and will break. The web key stays public
regardless. Do this only when there's a reason.

**Tier 3 — Firebase-auth the reads.** `verifyFirebaseIdToken` already exists
and already gates writes. This is the only option that genuinely stops
anonymous harvesting — and it breaks the public website entirely, plus all 9
edge prerender functions. **Not viable** while ddbx.uk is a public site.

### What's actually exposed right now

Worth being precise, because it's worse than "the endpoint is open".

- **`DEALINGS_MAX_LIMIT = 1000`** (`worker/db/queries.ts:307`). UK total is 826
  rows. **One unauthenticated request returns the entire UK corpus** — every
  `analysis` block, every `thesis_points` array, every `evidence_for` /
  `evidence_against` / `key_risks`, every `triage.reason`. That is the most
  expensive output the pipeline produces, and it leaves in a single curl.
- `/api/eu-dealings` caps at 500 per page but has a `before` cursor, so the
  full 15,394-row EU corpus is a short loop.
- **`verifyFirebaseIdToken` gates six endpoints and all six are writes**
  (`/api/devices`, `/api/analysis-feedback`, `/api/follows`). **Zero read
  endpoints are authenticated.**
- **Discretion mode is bypassed entirely.** The website's whole gating premise
  is that non-app users see one full analysis per day and dummy text
  thereafter. `api.ddbx.uk` serves the real analysis for every row to anyone
  who asks. The gate is enforced in the client and nowhere else.

That last point is the one that matters. The product's core gating is
cosmetic at the API layer.

### The fix: split the payload, don't lock the endpoint

Locking the whole API breaks the site, the 9 edge prerender functions, and
every app install in the field. But **the entire list payload doesn't need
protecting — only the generated prose does.**

Split it:

| Tier | Fields | Who gets it |
|---|---|---|
| **Thin** (unauthenticated) | ticker, company, director, role, dates, shares, price, value, `rating` **label only**, `sector_normalized`, `cluster.tier` | Public web, edge prerender, crawlers |
| **Full** (authenticated) | `analysis.*` (summary, thesis_points, evidence_for/against, key_risks, checklist), `triage.reason`, `rating_explain.factors`, `buy_style.*`, `live_performance.*` | Apps, API customers |

The thin tier is **exactly what the public website is supposed to show
anyway** under discretion mode, and it's everything the SEO functions need.
So stripping prose for unauthenticated callers doesn't break the site — it
makes the server enforce the policy the client is currently enforcing alone.

### Sequencing (back-compatible, per `~/CLAUDE.md`)

**Phase 1 — today, zero client changes, zero breakage:**
1. Cloudflare rate limiting on `api.ddbx.uk/api/*`, per IP.
2. Bot Fight Mode; challenge datacenter ASNs on the list endpoints.
3. Tighten `app.use("/api/*", cors())` (`worker/index.ts:275`) from allow-all
   to the ddbx origins.
4. **Drop `DEALINGS_MAX_LIMIT` from 1000 to ~200** and cap EU at 200. No real
   client asks for more; it turns whole-corpus extraction into a long, visible,
   rate-limited crawl. Highest value per unit of effort on this list.

**Phase 2 — clients start identifying themselves.** iOS and Android already
hold a Firebase token and already send it on writes; extend `APIClient` to send
it on reads too. Server-side, accept and ignore. No behaviour change, no
breakage. Ship and wait for adoption.

**Phase 3 — enforce the split.** Once app adoption is high, the worker strips
the prose fields when there's no valid token. Web gets thin (which is what
discretion mode wants), apps get full, API customers get full via their own
key. Old app installs degrade to thin rather than breaking — they render the
same fields the web does.

Phase 1 is a deploy. Phases 2 and 3 are a cycle each and shouldn't block the
`/api` page shipping.

### Copy rule for the page

**Never reference the open endpoint, and never imply a free tier.** No "free
plan", no "public sandbox", no FAQ answer explaining what unauthenticated
callers can get. The page presents one thing: a licensed, authenticated,
supported data product, access by request. The current openness is an
operational gap to close (above), not a product tier to describe.
