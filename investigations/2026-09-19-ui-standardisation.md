# UI standardisation — tokens, primitives, migration (2026-09-19)

Status: **v2, signed off by Jon 2026-09-19** (reviewer's §8 recommendations
accepted; 7 and 8 settle on the render pass). Steps 0, 1 and 6 landed on
`ui/standardise`; sweeps pending. v2 folds in
an independent review (Fable, 2026-09-19) — see §9; where it overrode v1 the
section says so.

Source: four read-only audits of `src/` (type, spacing/layout, surfaces/colour,
component duplication), 2026-09-19. Raw notes kept out of the repo; the
figures below are theirs, spot-checked where marked ✔.

This doc does **not** replace the two rulebooks. It is the mechanism that
enforces them:

- `2026-08-03-static-page-rules.md` — page anatomy
- `2026-08-30-design-language.md` — visual treatment

Principle for every mapping below: **consolidate, don't redesign.** Each old
value snaps to the nearest canonical step; target visual delta ≤2px except
where called out in §7.

---

## 1. What's wrong, in numbers

| Axis | Today | Target |
|---|---|---|
| Font sizes | ~80 distinct size tokens; ~1,220 arbitrary `text-[Npx]` vs 365 Tailwind | ~12 named classes |
| Tracking | 30 values | 5 |
| Leading | 33 values | ~5 (baked into the steps) |
| Radius | 29 values | 5 tokens |
| Hairlines | 3 systems (`border-hairline`, raw `black/[0.06]`, raw `white/10`), `RULE` const redeclared ~18× | 2 tokens |
| Page h1 | ~9 sizings | 2 species (docs already say so) |
| Eyebrow / uppercase labels | 152 `uppercase tracking-*` in 87 files (109 mono), 10 trackings | 1 utility + component |
| Dark stage shell | same class string pasted into 9 files, + 5 other dark grounds | 1 component |
| Glass | 6 recipes | 1 (+1 on-stage) |
| Light panels | ~25 near-identical rounded-2xl/xl recipes, 4 lift shadows | 1 helper, 3 variants |
| Segmented controls | 11 implementations, none shared | 1 component |
| Store CTAs | 3 parallel systems | 1 component |
| Full-bleed | 5 techniques | 2 helpers |
| Section rhythm | mt-8 / mt-9 / mt-10 / mt-12 / py-14 by page family | 4 tiers |

Root cause: `@theme` in `src/styles/globals.css` defines fonts and a handful of
colours only — no size, tracking, radius, shadow or spacing-role tokens — and
`SectionEyebrow` takes its styling from the caller, so nothing enforces the
documented specs.

## 2. Tokens (`src/styles/globals.css` `@theme`)

### 2.1 Type ramp (v2 — revised after review)

Mechanism (Tailwind 4.1.11): `--text-*` tokens can carry `--line-height`,
`--letter-spacing` and `--font-weight`, but **not** font-family, text-transform
or responsive steps. So plain steps are `@theme` tokens; `eyebrow`, `micro` and
the two display species are `@utility` blocks (nested `@media` allowed, they get
`sm:`/`dark:`/`shell:` variants and sort in the utilities layer — unlike the
unlayered `.dl-lift`, which beats `hidden`). Weight is **not** baked into display.

| Class | Kind | Spec | Absorbs |
|---|---|---|---|
| `micro` | @utility | mono 10 / 600 / UPPER / 0.14em / lh 1 | 8.5–10.5 labels, chip sm, chart axes |
| `eyebrow` | @utility | mono 11 / 600 / UPPER / 0.16em | uppercase labels (152 sites, 10 trackings) |
| `text-caption` | token | 11 / 1.45 — shipped at 11; **revisit on the render pass** | 11 (×194), 11.5, `text-xs` (×112) |
| `text-small` | token | shipped at 12.5 / 1.5; 13 is the alternative — render both | 12, 12.5, 13 |
| `text-body` | token | 14 / 1.6 | 13.5, 14, 14.5, `text-sm` |
| `text-num` | token | 13 / 600 + `tabular-nums` | table figures (234 tabular-nums sites) |
| `text-lede` | token | 16 / 1.55 / −0.005em (15 below sm) | 15, 15.5, 16, 16.5, regular-weight 17 prose |
| `text-title` | token | 17 / 600 / 1.3 / −0.015em | card h3s |
| `text-heading` | @utility | 26 → sm: 34 / 1.08 / −0.025em | section h2s 20–30, `text-3xl` |
| `display-doc` | @utility | 34 → sm: 44 / 1.05 / −0.028em, weight 600 | SeoPageShell and every document h1 (rulebook §5) |
| `display-stage` | @utility | 34 → sm: 44 → lg: 54 / 1.02 / −0.03em, weight 400 | dark-stage h1s; **filing stage capped at 44** (long subjects wrap) |
| `text-figure-xl` | @utility | 72 → 84 / 600 / 1 / −0.04em | hero numbers |

v1 had `lede` and `lede-lg` (merged — 17px regular collided with `title`
17/600), no `num`, and a single `display` that would have grown every document
h1 by 10px at lg. Caption was 12 in v1; 11px is the single biggest population and
snapping it to 12 on feed rows and tables is a density regression, so split
eyebrow sites out first and render before choosing. 13.5→14 lands on
report/mcp/broker-comparison tables (+3.7% column width); 12.5→13 on the
search-palette chips and tape — render both at 520px.

Tracking collapses to −0.005 / −0.015 / −0.025 / −0.035 / +0.16em. Chip
`tracking-wider` stays (chips are their own system in `chip.ts`). Button and nav
label type is undefined today (`button.ts` leaves it to call sites) — add it to
`button.ts`, not the ramp.

Responsive rule: step at `sm:` only (70+ uses already; `md:` type bumps are a
legacy family in market-explainer / market-page / daily-summary-banner).

### 2.2 Colour

New tokens for values currently hard-coded:

| Token | Value | Replaces |
|---|---|---|
| `--color-page` | `#fcfbf9` | raw `[#fcfbf9]` ×38 |
| `--color-ink-hover` | `#2a2118` | `BUTTON_FILLED` hover |
| `--color-live` | `#2E7D32` / dark `#7BBE7F` | "live" greens in 4 files |
| (existing) `positive` / `negative` | — | `[#1e6b18]`, `[#8b2020]`, `[#5cd84a]`, `[#e84d4d]` (~11 each) and emerald/rose direction colours |
| (dark mode) | — | `@theme` colours can't switch on `.dark`: `page` and `live` need the `var(--x)` cascade that `positive`/`negative` use. Check each `bg-[#fcfbf9]` keeps its dark sibling |
| TBD names | `#f3ecdf` ×18, `#d8c4af` ×13, `#d8d0c6` ×8, CompanyLogo `#f1ebe2`/`#d0c8be` | name during migration once roles are clear |

### 2.3 Rules (hairlines)

- `border-rule` = `border-hairline dark:border-separator` (52 uses; ~20 `RULE` consts).
  Absorbs the ~18 `RULE` constants, raw `black/[0.06–0.08]`, `divide-black/[0.06]`,
  and the 7 alternative dark pairings.
- `border-rule-stage` = `white/10`. Absorbs `white/[0.06–0.08]` on dark grounds.

### 2.4 Radius

| Token | Value | For |
|---|---|---|
| `rounded-mark` | 3px | bars, ticks, micro marks |
| `rounded-control` | 8px (= `lg`) | buttons, inputs, small tiles |
| `rounded-card` | 16px (= `2xl`) | cards, panels, modals, shell |
| `rounded-stage` | 28px | dark stages, bands |
| `rounded-full` | — | pills, logos, avatars |

App icons keep a proportional radius (scale factor), not a token.

### 2.5 Shadows

`shadow-lift` (cards; replaces 4 near-identical lift shadows), `shadow-float`
(glass chrome, modals), `shadow-stage` (the 28px stage shadow).

### 2.6 Spacing roles

Not tokens — conventions enforced by the primitives in §3.

| Tier | Class | Absorbs |
|---|---|---|
| band | `py-14 md:py-20` | marketing bands (py-14/20/24) |
| section | `mt-12` (+ `pt-5` over a rule) | mt-12, mt-14, SeoSection stacked |
| block | `mt-10` | mt-8, mt-9, mt-10 between blocks |
| group | `mt-6` | mt-5/6/7 |
| stack | `gap-3` | 2.5/3/3.5 |
| tight | `gap-1.5` | 1/1.5/2 in meta lines |

Arbitrary pixel nudges (`py-[2–7px]`, `mt-[3/4/7px]`, `ml-[17px]`…) snap to the
scale. Legitimate arbitrary values stay: safe-area `max()`, shell geometry
(`pl-[236px]`, `pr-[300px]`), `mt-[0.65em]` baseline alignment.

### 2.7 Axes v1 missed (token now — the sweeps touch these sites anyway)

- **Icons**: h-3 ×116, h-4 ×84, h-5 ×35, h-6 ×18 — an undocumented 4-step scale; name it.
- **Motion**: duration-200 ×19, 150 ×10, 300/500 ×8, 700 ×4, plus CSS 140/180/320/620ms → `fast`/`base`/`slow`.
- **Focus**: 126 `focus-visible` vs 66 `outline-none` — one ring recipe; audit the `outline-none` sites for missing replacements.
- **Z-index**: 10/20/40/50 plus z-34, z-[34], z-[60], z-[70], z-[100]; globals documents 34/35/40/50 → named layers.
- **Touch targets**: 3× h-11 vs 7× h-9 on tappable controls → 44px minimum on phone.
- **Number formatting**: 22 files call `Intl` directly → one `lib/format`.
- **Class merging**: decide a strategy (tailwind-merge or not) before primitives accept `className`.

## 3. Primitives (v2 — helpers first)

House pattern is class-string helpers (`button.ts`, `chip.ts`). v1 made
everything a component; the review showed `<Panel variant×size×lift>` is 12
combinations of prop soup and `<Prose>`/`<Band>`/`<FullBleed>` wrap no structure.
Rule: **helper unless there is structure or behaviour.**

Every component spreads `...rest` onto its root and accepts `className` — the
contract has to carry `@container` (9 uses, 6 how-it-works files), `shell:`
(20 uses, 7 files) and `data-ga-*` (166 attrs, 34 files).

**Helpers** (`src/components/ui/*.ts`)

| Helper | Absorbs |
|---|---|
| `panel({ variant, size, lift })` | ~25 light-panel recipes, `.board-panel`, `CARD`/`PANEL_CLASS` consts (market-plans, uk-home-spotlights, channel-performance, winners, congress). compact `px-4 py-3.5`, roomy `p-5` |
| `band()` | `SECTION` const in api, mcp, download, winners-board, story-film, app-tour |
| `FULL_BLEED` (exists) + `SCROLL_BLEED` | hand-rolled `w-screen -translate-x-1/2`, `-mx-4 md:-mx-6`, scroll-bleed ×5 |
| `glass()` / `glass('stage')` | navbar recipe canonical; shell-page-header, cookie banner, discretion overlays, companies rail, broker bottom bar; stage tooltip + toggle |
| `max-w-measure` via `--container-measure: 62ch` | `max-w-[62ch]` ×144 — no component |
| `chip({ tone: up\|down\|neutral })` | hand-rolled chips: lib/markets/us.tsx, search-palette `AwayTag`, daily-summary-banner `StatChip`, study-objects `StateTag`, compare, congress, buy-style-chip, party-chip |

**Components** (`src/components/ui/*.tsx`)

| Component | Absorbs | Risk |
|---|---|---|
| `<Stage>` + footer strip + tooltip | the stage `PANEL` string pasted into 9 files (stage-panel, filing-, company-, index-, hero-, story-stage, broker-detail, reports, how-it-works/previews/specimen), stage padding ×10, footer ×6, the oklch/`#1a140d` grounds. **Must keep the literal `board-stage`/`story-stage` classes** — globals.css shell CSS keys on them. Not a blanket `PANEL` replace: congress/stock-ui:57, how-it-works/shared:32, ratings-ladder:69 use the name for unrelated light panels | L |
| `<StageHeader eyebrow title dek figures notice>` | hand-built header stack in ~10 board/stage files | L |
| `<Eyebrow tone="brand\|quiet\|stage">` | the `eyebrow` utility + tone; `EYEBROW`/`EYEBROW_QUIET`/`KICKER` consts; `SectionEyebrow` becomes a wrapper | M |
| `<Segmented variant="pill\|tab">` | 10–11 implementations; 2 tablist vs 8 aria-pressed → one a11y model | M |
| `<StoreCta variant="button\|badge\|compact">` | `StoreButtons`, `StoreBadges`, 9 hand-rolled `StoreGlyph` buttons | M — conversion surface, GA attrs must survive |
| `AppModal` everywhere | unlock-modal, app-handoff-modal, app-coming-soon-modal | M |
| `SeoSection more={{to,label}}` | 6 "see all" link styles | L |
| `SeoPageShell error` | 9 hand-written "Couldn't load…" states | L |
| `DrawerBack` | the three in-drawer backs (§8.4) | L |
| `<Figures>` | **deferred to step 4+**: swallowing `StatTiles` (mandated SEO grammar) is high-risk | H |

## 4. Fix-in-passing (bugs and tenet breaks)

- **Doubled gutter** on `/download`, `/api`, `/mcp`, winners-board, story-film,
  app-tour (text inset 32/48px vs 16/24 elsewhere) ✔. **Design call, not a
  straight bug**: the api hero card sits at 16px with p-6, so its text is at 40px
  and the sections at 32 roughly line up with it. Removing the extra gutter puts
  body text flush with the card edge instead. Render first.
- **Design-language violations:** scroll-edge fades (market-channel,
  broker-aside ×3, market-detail-drawer:628); gradient + mask scrim on the mobile
  bar (layouts/default.tsx:807); background dissolve (api.tsx:351).
- **Shared pieces bypassed:** 3 hand-rolled × in search-palette (943, 1106,
  1145) → `CloseButton`; own skeletons in broker-aside:292 and search-palette:1243;
  own section headers (uk-home-spotlights:70, download/section-header,
  `SectionTitle` in account-deletion and layouts/default:135); account-deletion
  not on `SeoPageShell`.
- **Stale doc comment:** `seo/section.tsx:21` says `pt-7 mt-10`, code is `mt-12 pt-5`.

## 5. Dead code (delete first) ✔

No importers (only comment mentions):
`market/market-today-hero.tsx`, `market/market-today-empty.tsx` →
`today-empty-state.tsx` (its only caller), `company/latest-buy.tsx`.
Unused exports: `BoolValue`, `BrokerBuyBox`, `RatingsStrip`, `BrokerInline`
(broker-ui.tsx — hooks in that file are still used), `CountUp`
(download/reveal.tsx). **Keep** `how-it-works/previews/*` — loaded by glob in
lab-how-it-works.tsx. Fix the comment references in market-anchor-card.tsx:65,
pricing-card.tsx:48, lib/illustrations.ts:128.

## 6. Migration order (v2)

`main` auto-deploys, so "shippable per commit" means "live per commit". All
work happens on branches; each sweep passes a headless before/after render
(desktop + 520px per page family) before it merges.

0. Dead code.
1. **Tokens + utilities** (§2, incl. §2.7) in `globals.css` — additive, no visual change.
2. **Foundation** — helpers and `Stage`, `StageHeader`, `Eyebrow`, one agent,
   merged before any sweep starts. **Step 2 owns `globals.css`, `seo/*` and
   `layouts/default.tsx`; sweeps never touch them.** Anything a sweep needs there
   goes back to the foundation branch.
3. **Surface-family sweeps**, parallel worktrees:
   - A. chrome — navbar, side-nav, search palette, cookie banner, modals, store CTAs
   - B. boards & stages — boards/*, insider-index, how-it-works stages, market hero
   - C. static pages — api, mcp, download, brokers, research, learn (**not**
     `how-it-works/shared.tsx`, which is B's)
   - D. record pages — filing, company, director, congress, market drawer, performance
4. **Behavioural components**: `Segmented`, `StoreCta`, then `Figures`.
5. **Rows** — last; needs a design call first (§8.5).
6. **Lint ratchet** in `npm test`: counts of `text-[Npx]`, `tracking-[…]`,
   `rounded-[…]`, raw `#fcfbf9` may not rise (allowlist for the legitimate
   cases). Not zero-tolerance. A new CI job, because `check-types.yml` skips
   without a secret.

## 7. Visible changes (the only ones >2px)

- Board `mt-9` → `mt-10`: +4px.
- Company pages `mt-8` → `mt-10`: +8px; drop the empty spacer div at company.tsx:971.
- Doubled gutter removed on download/api/mcp etc: −16px phone / −24px desktop.
- Stage h1s unify on `display-stage`: pages at 50/56/58 on lg move to 54; story
  stage (28→38→44) moves up; filing stage (26→34→40) moves to 34/44 and stops there.
  Document h1s stay at 34/44 (`display-doc`); `/mcp` (lg 56) and `/api` (lg 58)
  lose their lg bump.
- Body 13.5 → 14 on how-it-works.

## 8. Decisions for Jon (with the reviewer's recommendation)

1. **Ramp shape** — v2 has 12 classes incl. `num` and two display species.
   Reviewer: 9–10 plain steps plus the utilities, as above.
2. **`text-positive` outside direction** (status "operational", broker ticks,
   share "copied"). Reviewer: move these to `live`/neutral. Design-language §9 says
   green means direction only.
3. **TickerPill** is `rounded`, not a capsule. Reviewer: make it a capsule
   (`button.ts`: capsules are for labels), unless it is a code token set beside prose.
4. **In-drawer back arrows** (market-detail-drawer:342,
   market-explainer-experience:537, daily.tsx:583). Reviewer: keep them separate
   from BackLink, which is page-level (§10), and unify the three on a `DrawerBack`.
5. **Rows** (Winner/Featured/Pick/Member/Spotlight). Reviewer: add a compact
   40px BoardRow variant. 56px belongs to the stage grammar.
6. **Filing/story h1 moving up.** Reviewer: yes to the stage species, but cap
   filing at 44.
7. **Caption size**: 11 or 12? Decide after the render pass (§2.1).
8. **Doubled gutter**: remove it, or keep the text in line with the api hero card? Decide after the render pass (§4).

**Added by Jon, 2026-09-19:** returns and deltas render as plain coloured
text, not chips. One `<Delta value>` component (sign, %, `tabular-nums`,
positive/negative ink, no background) replaces every return chip, tinted wash
and `deltaStyle().bg` fill. It lands before the sweeps.

## 9. Review log

**Fable, 2026-09-19** — independent pass over v1 against the code. Held: 8 (now
9) stage pastes, doubled gutter, dead-code list, segmented count, 1,218
`text-[Npx]`, 62ch ×144, RULE ×20, stale section.tsx comment, company.tsx:971
spacer. Corrected: eyebrow population ~2× larger; hairline pairing 52 not 84;
`#fcfbf9` ×38. Changed the design: two display utilities (v1's single display
was wrong vs rulebook §5); helpers over components; `num` step, lede merged,
caption held for re-audit; §2.7 missed axes; file-ownership rule, branch +
render gate and ratchet lint in §6; `Figures` deferred.
