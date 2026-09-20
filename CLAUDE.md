# Director Dealings (ddbx.uk) — website Claude Code context

> **⚠ Production system across three repos.** This site, the API
> (`ddbx-data`), and the iOS app share wire-format types, API endpoint
> contracts, and `MARKET_CONFIG` capability flags. Read
> [`~/CLAUDE.md`](../CLAUDE.md) ("Coordinating changes") **before**
> renaming types, changing API params, or adding filter axes — the
> sibling consumers don't fail loudly and there is no staging.

This repo is the public website. The data platform (Cloudflare Worker, D1,
scraping/triage/analysis pipeline) was split out into the `ddbx-data` repo
on 2026-05-10. If you're looking for `worker/`, it lives there now.

## Sibling repos

Cloned alongside this one in the same parent dir:

- `../ddbx-data/` — backend platform, the canonical source for `Dealing` types
- `../ddbx-ios-app/` — iOS app consuming the same API; useful for
  `investigations/multi-market/` strategy docs and as the reference for
  Performance feature ports (see `src/lib/performance/*`)

See `~/CLAUDE.md` for the system-wide map.

## Working convention: "I'll make a list" vs "build"

When Jon says "I will make a list" (or similar), he'll add points one
message at a time — **just record them** in a running numbered list, no
research or implementation. When he says **"build"**, do the research,
join the recorded points together, and deliver. Full rule in
[`~/CLAUDE.md`](../CLAUDE.md) ("Working convention").

## Editorial house style source

Canonical house-style writing rules are defined in
`../ddbx-data/worker/llm/prompts.ts` as `HOUSE_STYLE_RULES`.

When changing reader-facing copy constraints in this repo, reference that
constant so wording stays aligned with API-generated recaps and analysis copy.
If you need to change the rules themselves, update `ddbx-data` first, then
apply matching wording updates here.

## URLs

| Purpose | URL |
|---|---|
| Frontend (this repo) | https://ddbx.uk |
| Worker / API base (ddbx-data repo) | https://api.ddbx.uk |
| API dealings | https://api.ddbx.uk/api/dealings |

## Stack

- React + Vite + Tailwind v4 + HeroUI v3, deployed to Cloudflare Pages
- Consumes the public API at `https://api.ddbx.uk/api/*` (set `VITE_API_BASE`
  to override in dev/preview)

## Type sharing with `ddbx-data`

The frontend keeps a copy of the canonical `Dealing` types at
`src/types/ddbx.ts`. The canonical version lives in `ddbx-data/worker/db/types.ts`.

```bash
npm run sync:types     # copy ddbx-data/worker/db/types.ts -> src/types/ddbx.ts
npm run check:types    # CI-friendly drift check (exits non-zero if out of sync)
```

Both scripts assume `ddbx-data` is cloned alongside `ddbx-site`. Override with
`DDBX_DATA_PATH=/path/to/ddbx-data`.

**Workflow**: when you change types in `ddbx-data`, run `npm run sync:types`
here in the same change cycle. CI runs `check:types` to catch drift.

## Static page rules — read before building or restyling a page

`investigations/2026-08-03-static-page-rules.md` is the house grammar for every
static page, extracted from `/api` (the reference implementation). Ten rules;
two of them absolute:

1. **Never bare content.** Every static page is a selling tool: it carries a
   "what this is" section, educational material, `RelatedCards` and the
   terminal ask, below its data.
2. **Never state a number you do not have.** No em-dash in a figure slot, no
   zero computed from an empty set. Say "Not enough data yet", and say when it
   will exist. Empty and failed are different states.

The rest cover sectioning, section alternation, typographic weighting, loading
states that match the arrived geometry, grids whose rules finish, shared column
specs, everything-specific-is-a-link, colour that carries meaning, and back vs
crumbs. There is a checklist at the foot of the doc.

Enforcement lives in `src/components/seo/*` (`SeoPageShell`, `SeoSection`,
`StatTiles`, `RelatedCards`, `SeoSkeleton`) plus `BackLink` — compose those
rather than reimplementing them.

## Design language — read before restyling any surface

`investigations/2026-08-30-design-language.md` is the visual grammar the
site is being revamped against (the static-page rules doc governs page
anatomy; this governs treatment). Four tenets: contained-not-blended
(visuals in rounded hairline panels, no scrims/fades), floating glass
chrome (the navbar recipe), full-width hairline rows for selling lists,
and type on clean ground with at most one masked sub-perceptual wash.
Reference implementation: the app-market hero
(`src/components/market/market-hero.tsx` + `hero-deal-showcase.tsx`) and
the floating navbar.

## UI conventions — tokens, not literals (enforced)

Every font size, letter-spacing, radius, shadow and brand colour comes from the
token system in `src/styles/globals.css`. Spec and rationale:
`investigations/2026-09-19-ui-standardisation.md`. **Read it before building or
restyling any UI.** The rules:

1. **No new bracketed literals.** Not `text-[13px]`, `tracking-[0.14em]`,
   `leading-[1.55]`, `rounded-[20px]`, `shadow-[…]`, or a raw `#hex`. Use:
   - **Type:** `eyebrow` (mono 11 uppercase label), `micro` (mono 10 label),
     `text-chip` (chip sm), `text-caption`, `text-small`, `text-body`,
     `text-num` (table figures, with `tabular-nums`), `text-label` (button
     labels), `text-lede`, `text-title` (card h3, 17), `text-subheading`
     (row/card titles and small heads, 20→22), `text-heading` (section h2,
     26→34), `text-figure` (stage/tile figures, 26), `display-doc` (document
     h1, weight 600), `display-stage` / `display-stage-capped` (dark-stage h1,
     weight 400), `text-figure-xl`. Don't add tracking or
     leading on top of a step; it's baked in.
   - **Radius:** `rounded-mark` 3 / `rounded-control` 8 / `rounded-card` 16 /
     `rounded-stage` 28 / `rounded-full`. Nothing else.
   - **Shadow:** `shadow-lift` (cards), `shadow-float` (glass, modals),
     `shadow-stage`.
   - **Hairlines:** `border-rule` / `divide-rule` on the page,
     `border-rule-stage` on dark grounds. Don't declare a local `RULE` const, and don't use
     `border-black/[0.06]`.
   - **Colour:** `bg-page` (the cream, never `#fcfbf9`), `ink`,
     `ink-hover`, `hairline`, `sheet`, `brand-*`. Use `positive`/`negative`
     **only for direction** (up/down, gain/loss). Use `live` for
     status/open/operational, `party-dem`/`party-rep` for Congress party
     identity, `risk` for caveats. Never emerald/rose/green-*/red-*/blue-*.
   - **Measure:** `max-w-measure` (62ch), not `max-w-[62ch]`. (`max-w-prose` is Tailwind's 65ch.)
   - **Returns and deltas are plain text, never chips** (Jon, 2026-09-19).
     `+12.4%` / `−3.1%` renders as coloured `tabular-nums` text
     (`text-positive` / `text-negative`), with no filled pill, tinted wash or
     border behind it. Use the shared `<Delta>` (`src/components/ui/delta.tsx`)
     rather than formatting a sign by hand. Chips are for labels, not numbers.
2. **Spacing tiers.** Band `py-14 md:py-20`; section `mt-12` (+`pt-5` over a
   rule); block `mt-10`; group `mt-6`; stack `gap-3`; tight `gap-1.5`. No pixel
   nudges (`py-[3px]`, `ml-[17px]`). Arbitrary values are allowed only for
   safe-area `max()`, shell geometry and `em` baseline alignment.
3. **Reuse before you build.** Class-string helpers first, components only
   where there's structure or behaviour. The kit:
   - `src/components/ui/`: `panel()` (cards: sheet / inset / translucent),
     `band()` (marketing section), `glass()` / `glass("stage")`,
     `FULL_BLEED` / `SCROLL_BLEED` (bleed.ts), `NOTICE` (caveat callout),
     `<Eyebrow>` / `eyebrow()`, `<Stage>` / `StageFooter` / `StageTooltip`,
     `<StageHeader>`, and `<Delta>` (every return).
   - `button.ts`, `chip.ts`, `close-button.tsx`, `store-cta.tsx` (every app
     store button), `app-modal.tsx` (`ModalDialog`, `ModalBackdrop`),
     `skeleton.tsx`.
   - `seo/*`: `SeoPageShell` (including `error={{what}}` for failed loads)
     and `SeoSection` (including `more={{to,label}}` for "see all").
   - `boards/board-row.tsx`, `section-eyebrow.tsx`.

   Check these before writing a new eyebrow, panel, stage, chip, toggle,
   store button, modal, notice or row. If you find yourself pasting a class
   string a second time, it belongs in a helper.
4. **Components pass through.** Every shared component spreads `...rest` and
   accepts `className`. `data-ga-*`, `@container` and `shell:` classes must
   survive.
5. **Responsive type steps at `sm:`** (and `lg:` for stage display only). No
   new `md:` type bumps.
6. **The ratchet.** `npm run check:ui` (also in `npm test` and CI,
   `.github/workflows/ui-conventions.yml`) counts the literals above across
   `src/` and fails if any count rises. When a sweep lowers the counts, lock
   them in with `npm run check:ui -- --update`. It refuses to raise the
   baseline. If a new literal is genuinely needed, add it to `ALLOW` in
   `scripts/check-ui-conventions.mjs` with a reason. Don't hand-edit the
   baseline upwards.
7. **Look at it.** Any visual change gets a headless render at desktop and
   520px before it merges (see memory: headless screenshots). `main`
   auto-deploys; UI refactors go on a branch.

Migration of the ~1,200 existing literals is in progress (spec §6). When you
touch a file for any reason, migrate the literals in the lines you touch.

## UI patterns

- **Close/dismiss ("X") buttons**: ALWAYS use `CloseButton` from
  `src/components/close-button.tsx` — never hand-roll an `×` glyph or a
  one-off icon button. It's the canonical circular light-contrast fill
  with hover + focus-visible states. `size="sm"` for banners/toasts,
  default `md` for drawer/modal headers, `tone="dark"` for surfaces
  with a fixed dark background (e.g. the explainer walkthrough).
  Position via `className` (e.g. `absolute right-4 top-4`); GA
  `data-ga-*` attrs pass straight through.
- **Every source gets its favicon** (house rule, 2026-09-19). Wherever the
  site cites where something came from *as its own object* (a news
  publisher, an evidence item's source line, a filing link to
  RNS/SEC/AFM/FI/DART, a row in a story's Sources list), the source's favicon
  sits before its name. Use `NewsSourceLogo` from
  `src/components/news-source-logo.tsx`, never a hand-rolled `<img>` against
  the favicon service. With no URL on the wire, map the regulator/feed to its
  domain in the component's shared map rather than leaving the mark off.
  Store badges, share buttons and broker links are not sources (brokers carry
  their own logos).
  **Not inside body prose** (Jon, 2026-09-20). A citation *within* a
  paragraph is a link, not an object: a long read carries a dozen of them and
  a 12px coloured square mid-sentence a dozen times over turns the paragraph
  into confetti. Inline citations keep their underline and their `↗`; the
  numbered Sources section under the piece carries the marks. See
  `src/components/stories/story-body.tsx`.
- **Company logos always open the company page** (house rule, 2026-09-19).
  `CompanyLogo` does it by default — a real link where it stands alone, a
  `role="link"` span that takes the click where it sits inside a row that
  already links elsewhere. Don't wrap logos in your own company links. Pass
  `market` on surfaces that mix markets (SE/US tickers are both bare);
  `link={false}` only for a company page's own header and demo/teaser
  surfaces. SE/NL/KR resolve to no link (no company pages there). US issuers
  read from ddbx.uk link cross-domain via `companyHref` in `src/lib/company.ts`.
- Shared button/chip styling tokens live in `src/components/button.ts`
  and `src/components/chip.ts` — reuse them before inventing new fills.

## Download landing pages

Six routes (`/download`, `/download/ios`, `/download/android` and the same
under `/us`), one page: `src/pages/download.tsx` + `src/components/download/*`.
Full write-up in `investigations/2026-07-26-download-landing-pages.md`.

Two things to know before touching them:

- **`src/lib/pricing.ts` is the only place on the public web that states a
  price.** It's mirrored by hand from `ddbx-ios-app/Subscriptions.storekit`
  (a local StoreKit test config on the USA storefront) — confirm against App
  Store Connect / Play Console before trusting or changing a number.
- **App screenshots don't exist yet.** Every screen slot falls back to a styled
  placeholder; drop PNGs into `public/app-shots/<market>/<platform>/<slot>.png`
  (screen only, no device chrome — the bezel is CSS) and they light up with no
  code change. See `src/lib/app-screenshots.ts`.

## Smart App Banner (install trial)

Apple's system install bar, trialled from 2026-09-13 as an alternative to the
floating mobile CTA, which was not converting. All logic in
`src/lib/smart-banner.ts`; injected client-side from `src/main.tsx` before
React mounts.

**Three modes**, set by `VITE_SMART_BANNER` in `.env.production` (code default
`off`, production currently ships `on`):

- `off` — no banner.
- `on` — banner **and** the floating bar.
- `solo` — banner **instead of** the floating bar, for browsers that draw one
  (`rendersSmartBanner()`: iOS Safari, excluding CriOS/FxiOS/EdgiOS and the
  in-app WKWebViews in X/Facebook/Instagram/LinkedIn). This is the real A/B.
  A wrong sniff here leaves a phone with **no** install CTA at all.

**Toggle precedence** — same shape as discretion mode, deliberately:
1. URL: `?banner=on|off|solo|reset` (`reset` clears; the rest stick via
   localStorage `ddbx.smartbanner.override`)
2. localStorage
3. Env: `VITE_SMART_BANNER`

**Things that are load-bearing:**

- **The app id is derived from `APP_STORE_URLS`** (`/id(\d+)/`), never written
  down twice — a drifted id installs the wrong market's app.
- **No banner without a live listing.** SE/NL/KR resolve to no app id and get
  no tag. The UK-app fallback that `storeUrlForMarketId` is allowed to make for
  a button the visitor pressed is *not* allowed for chrome we inject.
- **`app-argument` only on routes our AASA claims** — `/t/*` and `/us/t/*`, per
  `public/.well-known/apple-app-site-association`. Extend `DEEP_LINKED` and the
  AASA together or the app gets a URL it has no route for.
- **There is no click signal.** Taps on Apple's banner never reach the page, so
  `store_click` cannot see them. The trial is read from two GA user properties
  set in `src/lib/cookie-consent.ts`: `smart_banner_mode` and
  `smart_banner_shown`. Compare `cta_floating_trial` / `store_click` rates
  between the `smart_banner_shown=yes` cohort and the rest.
- **Client-side injection is a bet.** Safari prefers this tag at parse time.
  If a device check shows it not rendering, the escape hatch is to emit the tag
  from `functions/_middleware.js` — at the cost of splitting the config between
  a Vite env file and a Cloudflare dashboard variable.

## Discretion mode (web gating)

The public website intentionally shows only a sliver of the data so the iOS
app remains the canonical surface. One flag governs every gating surface
(drawer + performance contributors) — flip it and everything follows.

**Toggle precedence** (highest wins):
1. URL: `?discretion=on|off|reset` — `reset` clears the override, the rest stick via localStorage. Lets you flip the live site from any browser without a redeploy.
2. localStorage: `ddbx.discretion.override` (written by the URL param).
3. Env: `VITE_DISCRETION_MODE` in `.env.production`.

The code default is `on`, but **production currently ships `off`** — set that
way deliberately on 2026-08-19 for a trial period (commit `22daf82`; revert
that commit alone to put the gate back). So the full unblurred UX is what
every visitor gets today. A browser that ever loaded `?discretion=on` still
has the gate pinned in localStorage until `?discretion=reset`, which is the
usual explanation for "the gate is still there".

Not every surface reads the flag automatically — the per-filing pages were
gated unconditionally until `AnalysisPreview` was wired up. When adding a
gating surface, key it on `DISCRETION_ENABLED` and check the others with
`rg DISCRETION_ENABLED src`.

- **Drawer cap**: the **first** deal opened today shows full analysis; subsequent drawers render dummy text (`src/components/discretion/dummy-analysis.ts`) under a CSS blur with a CTA overlay. Position card and price chart stay unblurred.
- **Performance contributors**: list past the first few names blurs to nudge installs.
- **List cap**: previously capped lists to 3 rows via `BlurredDealingRow`; component is gone and the cap is no longer enforced. `LIST_CAP=3` is still exported for future reuse.
- **Storage**: `localStorage` key `ddbx.discretion.viewState` shaped `{ date: "YYYY-MM-DD", viewedDealIds: string[] }`. Resets at UK midnight (Europe/London).
- **Module**: all logic lives in `src/lib/discretion.ts` (`useDiscretion` hook, `recordView`, `hasFullAccess`, `DISCRETION_ENABLED`).
