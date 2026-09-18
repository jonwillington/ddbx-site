# Sidebar shell layout: audit and adoption plan

**Date:** 2026-09-18
**Branch:** `experiment/sidebar-nav` (worktree `.claude/worktrees/sidebar-nav`), commits `74b3a39`, `12790ae`, `6e42667`
**Status:** Experiment. Not merged or deployed. Production ships the floating top bar.
**Toggle:** `?nav=sidebar | top | reset`, persisted in localStorage `ddbx.nav.override`, env default `VITE_NAV_MODE` (code default `top`).

---

## 1. Summary

We built an app-shell desktop layout as an alternative to the floating top bar. A left navigation rail sits on a darker frame, and the page lives in one rounded sheet. It applies from 1280px (xl) up. Below that, the site is unchanged.

The shell looks right and gives content more width than today at every desktop size. It is **not ready to trial on live traffic**. To keep the sheet uncluttered, the experiment hides every fixed right-hand rail, and that removes three things the site depends on:

- **Revenue:** the UK broker picks on `/brokers`, `/compare`, the best-for pages and the head-to-head pages. These are the highest-earning pages.
- **Conversion:** the install and broker asks on filing pages (`/t/*`, where shared links land), director pages, the SEO, Learn and board pages, and the download pages.
- **Proof:** the Performance and News channel on the market dashboards.

A page-by-page audit found four small bugs, six pieces of right-rail content that need a new home, seven layout issues, and eight design decisions that are Jon's to make. One bug, the dashboard's sticky month header, also affects the current top-bar layout.

**Recommendation:** fix the four bugs, rehome the revenue and conversion content, then tidy the spacing. After that, trial the shell behind the flag, measured on total affiliate click-outs and `store_click`.

---

## 2. What was built

| Piece | File | Behaviour |
|---|---|---|
| Mode flag | `src/lib/nav-mode.ts` | Resolves `NAV_SIDEBAR` with the same precedence as discretion mode (URL, then localStorage, then env). Adds `.nav-sidebar` to `<html>`. |
| Shared nav model | `src/components/navbar.tsx` | `useNavModel()` extracted from `Navbar`. The top bar and the rail build from one item list, so market gating (Brokers UK-only, Stories UK/US, and so on) cannot drift. |
| Rail | `src/components/side-nav.tsx` | 252px, fixed, bare on the frame. Holds the logo, theme switch, market picker, items with heroicons, disclosures that open in place (the active one starts open), and a standing Download CTA. |
| Shell | `src/layouts/default.tsx` | At xl the frame colour is `#ebe3d6` light and `#0e0c0a` dark. `main` and the footer are wrapped in a sheet (`xl:mx-3 xl:my-3`, cream, `overflow-clip`). The top bar is hidden. |
| Persistent frame | `src/styles/globals.css` (`.shell-frame`) | A fixed rounded rect whose 100vmax box-shadow paints the frame. The page keeps window scrolling, so sticky elements, scroll listeners and anchors all still work, and the sheet's four corners hold at every scroll position. z-index 35: above sticky page chrome, below the rail (40) and modals (50). |
| Offsets | `globals.css` | `--nav-h` is 12px under the shell at xl, so flush-seated sticky bars sit under the frame's top edge. |
| Rails | `globals.css` | `aside.fixed.right-0 { display: none }` under the shell at xl. **This is the source of most of the findings below.** |

The sheet is 1164px at a 1440px viewport and 1004px at 1280px. The old rail layout gave 1120px and 960px. The shell is never narrower than what it replaces.

---

## 3. Method

An Opus agent audited every route family against the running worktree. It rendered pages with headless Chrome at 1440×900 (and 1280 where width mattered), in both `?nav=sidebar` and `?nav=top`, and used a CDP script for scrolled states. It then read the relevant components. It worked against the house grammar in `investigations/2026-08-03-static-page-rules.md` and `investigations/2026-08-30-design-language.md`. It made no edits.

Screenshots are in the session scratchpad (`scratchpad/audit/*.png`) and are not committed.

---

## 4. Findings

### 4.1 Bugs (all small)

**B1. Each rail and its mobile twin both disappear at xl.** The rail components render as `hidden lg:flex fixed right-0`, and each has an in-flow mobile twin marked `lg:hidden`. The CSS override hides the rail, and the twin is still hidden, so the content is gone at every width from 1280 up.
- Affected: the top-pick cards on `/compare` and `/brokers` (`compare.tsx:288`, `:633`), `BrokerInline` on company pages (`company.tsx:727`, `:1180`), the app tour (`app-tour.tsx:334`), and the market channel.
- Fix: add `@custom-variant shell (&:where(.nav-sidebar *));` to `globals.css`. Give the rails `shell:xl:hidden` (`seo-rail.tsx:103`, `download-rail.tsx:59`, `broker-aside.tsx:47`, `:186`, `market-channel.tsx:158`) and the twins `lg:hidden shell:xl:block`. Delete the `aside.fixed.right-0` rule. This covers about 40 routes.

**B2. The cookie banner is off-centre.** `setRailPresent(drawerRight)` (`default.tsx:450`) still reports a rail, so the banner keeps `lg:right-80` and centres at x≈560 instead of the sheet centre at x≈846.
- Fix: report `drawerRight && !NAV_SIDEBAR` at xl.

**B3. The dashboard month header pins in the wrong place.** This bug also exists in production. `market-page.tsx:1624` hard-codes `top: 64 + filterBarHeight`. In the shell (`--nav-h` 12px) the header pins 52px below the filter bar, and feed rows scroll visibly through the gap. In top mode the bar is 72px, so it already drifts by 8px.
- Fix: `calc(var(--nav-h) + ${filterBarHeight}px)`.

**B4. Story pages open the Research group.** `/stories` is still listed in `RESEARCH_PATHS` (`site-nav.ts:111`). On `/stories` and `/stories/:id` the rail opens both Research and Stories and overflows, and the top bar marks Research active.
- Fix: remove the entry.

### 4.2 Content to rehome, highest value first

| # | Content | Where it was lost | Recommended home | Effort |
|---|---|---|---|---|
| R1 | UK broker picks (**revenue**) | `/brokers`, `/compare`, `/brokers/best-for/*`, `/brokers/compare/*` | Show the existing pick cards via B1. Add an inline picks strip under the standfirst on category and comparison pages (`broker-category.tsx:137`, `broker-comparison.tsx:243`). Optionally a sticky 17rem in-sheet column from 1440 up. | S–M |
| R2 | Broker or app ask on filing and director pages (**conversion**) | `/t/*`, `/dealings/*`, `/us/t/*`, `/directors/*`. Shared links land here. The page is now an 860px article with about 150px of empty ground each side. | A sticky in-flow panel, the pattern company pages already use: `shell:xl:grid-cols-[minmax(0,1fr)_17rem]`. UK gets the top broker pick plus `BrokerDisclosure`; US gets the app card. (`filing.tsx:248`, `:516`, `director.tsx:483`) | M |
| R3 | SEO rail on the research, Learn and board families (**revenue, UK**) | `/companies`, `/sectors*`, `/market-cap*`, `/roles*`, the boards, `/insider-index*`, `/reports*`, `/weekly*`, `/daily*`, `/learn*`, `/how-it-works` | One shared inline "Start investing" block (two top picks plus disclosure) in a `SeoPageShell` slot before `RelatedCards`. US needs nothing; the rail CTA covers it. | M (one component) |
| R4 | Download rail (**conversion**) | `/download*` (6 routes plus `/zh-hk`) | The rail CTA must take the route's platform and translated copy (`useDownloadCopy`). Today it is device-sniffed and English, so it shows App Store on `/download/android` and English on `/zh-hk`. Optionally add a slim sticky in-sheet install bar after the hero. (`download.tsx:579`, `side-nav.tsx`) | M |
| R5 | Market channel: Performance and News (**proof**) | All dashboards. `variant="inline"` returns null at xl and the aside is hidden. | A two-card row in the sheet under the hero (`market-page.tsx:1285`, `:2005`, `market-channel.tsx:153`). See decision D2. | M |
| R6 | Broker review switcher (**navigation**) | `/brokers/:slug` | An "Other reviews" row list at the foot of the review. | S |

Company pages keep most of their revenue: the in-flow "Buy AZN with Freetrade" panel survives. The Congress family loses only the US app rail, which the rail CTA replaces. The status, contact and legal pages need no change.

### 4.3 Layout issues

- **L1. Hero dead space.** `MarketHero` (`market-hero.tsx:627`) combines `md:min-h-[58svh] xl:min-h-[560px]`, `md:py-16`, `m-auto` centring and `pt-8` on `main`. That leaves about 95px above the hero card on the UK, US and download pages, and more on NL/SE. Fix: `shell:xl:min-h-0 shell:xl:pt-2`, seat the card about 24px below the sheet top, and pass `hasRightDrawer && !NAV_SIDEBAR` so the two-column hero uses its lg rules.
- **L2. Beta tag.** `beta-tag.tsx:117` is centred on the viewport, with `lg:left-[calc(50%-10rem)]` on drawer markets. It sits at x≈560 over a hero centred at x≈846. Fix: `shell:xl:left-[calc(50%+126px)]`, or render it inside the sheet.
- **L3. 96px offsets.** These leave an 84px gap under the sheet top. `xl:top-24` is at `company.tsx:1185` and `:1260`. `lg:top-24` is at `broker-detail.tsx:397`. `md:top-24` is at `market-faq.tsx:41` and `api-faq.tsx:36`. `scroll-mt-24` is at `seo/section.tsx:77`, `:115` and `broker-detail.tsx:370`. Fix: `shell:xl:top-6` and `shell:xl:scroll-mt-6`. Do not fold these into `--nav-clear`; the comment in `globals.css` excludes them deliberately.
- **L4. Filter box edges.** `market-page.tsx:1382` uses `-mx-4 md:-mx-6`, so the box runs to the sheet's edges and its `rounded-t-xl` corners meet the sheet's 20px radius. Fix: `shell:xl:mx-0`, an inset panel in line with contained-not-blended.
- **L5. Footer is a box inside the sheet.** It is a raised rounded box with a shadow and a FooterTrail wash, sitting inside the rounded sheet. See D3.
- **L6. Double frames.** The light hero and stage panels on how-it-works, download and the dashboard hero read as a card on a card. The dark board stages hold up. See D4.
- **L7. The rail reloads the page on every click.** It uses plain `<a href>`, so each click repaints the rail and closes any open group. That is tolerable in a top bar but breaks the app-shell feel. Fix: use a router `Link` when `marketHref()` is same-host. M.

### 4.4 Checked and fine

- `FULL_BLEED` (100vw) sections are clipped to exactly the sheet width and centred on it, so they render as sheet-width bands. The one exception is `/api`'s cream "Request access" band (`api.tsx:743`), which reads as a stripe across the dark sheet.
- The dark board stages fill the wider sheet well.
- The rail's dark mode and the frame's dark mode are coherent.
- Below 1280px nothing changes.

---

## 5. Decisions for Jon

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Right-hand column | (a) None anywhere; everything inline. (b) A sticky 17rem in-sheet column on conversion-heavy pages. | (b) for broker and filing pages from 1440 up; (a) everywhere else. A 17rem column costs about 300px and only fits comfortably from 1440. |
| D2 | Market channel | A row under the hero, a tab beside the feed toggle, or drop it (Performance has its own page). | A row under the hero. It is the performance proof. |
| D3 | Footer | Flat with a hairline `border-t`, or the raised box. Trim the link groups? | Flat. Keep every link group: they are the crawl graph, and the rail carries no markets, UK platforms or legal links. |
| D4 | Double frames | Strip the light hero panels' border and shadow under the shell, or accept a panel inside the sheet. | Strip the light ones; keep the dark stages. |
| D5 | Pinned dark pages (`/api`, `/developers`, `/mcp`) | Turn the whole frame and rail dark, or keep the frame light. | Keep the frame light and let only the sheet go dark. A whole-viewport flip on navigation is jarring. |
| D6 | Stories in the rail | A plain link, or a list capped at 3. | A plain link. |
| D7 | Sheet header row (crumbs left, primary action right, sticky) | A shell-only `headerAction` slot in `SeoPageShell`, or crumbs stay in the body. | Adopt it for company, filing, broker detail and `/brokers`. Not the dashboard, where the filter bar plays that role. |
| D8 | 860px articles (Learn, filing, stories, daily) | Keep them centred, or left-set them with a contents or related column on the right. | Keep them centred for now. Try an "On this page" contents list later. |

---

## 6. Implementation plan

All work stays on `experiment/sidebar-nav` behind the flag until Jon has reviewed it in a browser. Each phase gets a render pass at 1280 and 1440, light and dark, including scrolled states.

1. **Bugs (S each):** B1, B2, B3, B4. B3 and B4 also fix the top-bar layout and can be cherry-picked to `main` on their own.
2. **Rehome revenue and conversion:** R1, R2, R3, R4.
3. **Polish:** L1, L2, L3, L4.
4. **After decisions:** R5 (D2), L5 (D3), L6 (D4), D5, D6, D7, L7, R6.

Rough size: phases 1 and 3 are about a day together; phase 2 is one to two days; phase 4 depends on the decisions.

---

## 7. Measuring a trial

- The placement events `cta_seo_rail`, `cta_download_rail` and the broker rail labels stop firing in shell mode. Placement-level numbers cannot be compared across modes.
- Compare **totals**: outbound affiliate clicks and `store_click` per desktop session (viewport ≥1280), shell vs top.
- The mode needs to be visible to GA. Set a `nav_mode` user property, as the Smart App Banner trial does in `src/lib/cookie-consent.ts`.
- A real split needs a random assignment in `nav-mode.ts` rather than an opt-in URL flag. That is a separate decision, to be made once phases 1 to 3 have shipped.

---

## 8. Risks

- **Revenue regression** if the shell ships before R1 to R3. This is the blocking risk.
- **Two layouts to maintain.** New pages must be checked in both modes until one is retired. The shared `useNavModel()` keeps the nav items single-sourced, but spacing is not.
- **The `.shell-frame` z-index (35)** must stay below anything interactive that floats over the page edge. Modals, drawers and sheets sit at 50, which is fine. Any new fixed element between 35 and 40 needs checking against the frame.
- **Client-side flag.** `.nav-sidebar` is added at module evaluation, before React mounts, but the SSR and pre-render Functions output does not know the mode. Crawlers see the top-bar shape. That is acceptable while the shell is opt-in.
