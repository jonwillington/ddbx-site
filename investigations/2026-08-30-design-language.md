# The new design language — contained, not blended

*2026-08-30. The homepage hero + floating navbar are the reference
implementation; the rest of the site gets revamped against this grammar.
Companion to `2026-08-03-static-page-rules.md` (which stays in force — this
doc governs the visual treatment, that one the page anatomy).*

## Where this came from

The old app-market hero put the deal-radar map *behind* the message: a
full-bleed basemap, a left scrim to keep the headline legible, spotlight
washes on top of the scrim, and the App Store button stretched to the
notification stack's width because it was parented to the wrong column. Every
one of those was a symptom of one decision — making the visual a backdrop
instead of an object. When text needs a gradient to survive its own
background, the text and the background are fighting.

Reference points that shaped the replacement: Calendly's hero (clean space +
one contained product panel), Landbook's floating glass navbar, Litebox's
full-width hairline rows, and the iOS app's Performance clusters strip
(logo previews with an active highlight, advancing in sequence).

## The four tenets

1. **Contained, not blended.** Every visual lives in a defined rounded
   panel — hairline border, crisp edge, sitting *on* the page ground. The
   frame is the edge; no scrims, no edge fades, no dissolves melting a
   visual into the page. Contrast panels (dark object on the cream page,
   like the notification card on the map) are encouraged for emphasis.
   Corollary: text never sits on top of a busy visual. Message layer and
   proof layer are separate objects that never overlap.

2. **Floating glass chrome.** The navbar is a detached rounded capsule
   floating over the page with inset on every side — translucent fill,
   heavy blur with a saturation boost, hairline border, soft warm shadow.
   Content scrolls beneath it through the gutters. The same material
   (glass capsule) is reused for floating in-panel chrome, e.g. the hero
   showcase's company queue.

3. **Rows for lists** (the Litebox pattern — next to apply). Checklists
   and feature lists become full-width rows: hairline rules between rows,
   glyph + large heading left, quiet one-paragraph description right,
   generous vertical padding. Replaces small checkmark bullet stacks
   wherever a list is doing selling work.

4. **Type does the work.** The big headline scale we already have, on
   clean ground. Atmosphere is allowed but must be *sub-perceptual*: at
   most one very subtle warm gradient (see `.hero-ambient`), masked so it
   never presents an edge, and static — motion belongs to the contained
   proof objects, not the page.

## Reference implementation

- `src/components/market/market-hero.tsx` — the two-layer app-market hero:
  message column left, the live notification stack right — bare, big,
  badge avatar on, exactly the object mobile leads with. NO container
  around the stack: three same-day passes (full-bleed MapLibre basemap
  behind a scrim; the map contained in a panel; a dark radar panel with a
  logo-queue selector) each proved that every frame put around the stack
  competes with it. The maplibre-gl dependency went with the map. Don't
  reintroduce a map unless it can be the *whole* object at a size where
  geography is legible, and don't re-wrap the stack.
- `HeroLiveGradient` (in `market-hero.tsx`) — the header's motion: four
  warm gradient phase layers cross-fading on the notification clock, so
  the light morphs as each alert lands. It is a PAGE layer (w-screen
  break-out, running up behind the glass navbar), not a fill of the
  content column. This is the one sanctioned *animated* atmosphere, and
  only because it's synced to a live proof object's clock; anywhere
  without such a clock, atmosphere stays static.
- `NotificationPing` (same file) — the arrival ripple: a one-shot double
  ring expanding from behind the stack as each card lands. Held at a real
  notification's width (~380px), the stack + ripple is the whole visual.
- `src/components/navbar.tsx` + `src/layouts/default.tsx` — the floating
  glass bar and the sticky wrapper that gives it its inset.

Existing systems this extends (don't fork them): `src/components/button.ts`,
`src/components/chip.ts`, the type/colour conventions from the 2026-07-27
sweep, and the SEO shell components in `src/components/seo/*`.

## Checklist for revamping a page

- [ ] Is every visual (chart, map, screenshot, phone mock) inside a
      rounded hairline-bordered panel? No fades at its edges?
- [ ] Does any text sit on top of an image/map/chart? Move it off.
- [ ] Are buttons sized to their content (or a shared row width), never
      stretched to match an unrelated sibling?
- [ ] Selling lists: converted to full-width hairline rows (tenet 3)?
- [ ] Background: flat page colour, or at most one masked sub-perceptual
      wash. No stacked atmosphere layers. Animated only when synced to a
      live proof object's clock (see `HeroLiveGradient`).
- [ ] Chrome that floats uses the glass recipe (translucent fill +
      blur + saturate + hairline + soft shadow), not a new material.

## Not done yet

- ~~Litebox-style row treatment (tenet 3 has no built component yet)~~ —
  built 2026-08-31 as `src/components/row-list.tsx` (`RowList` + `Row`),
  first applied to the six checks on /how-it-works; the mobile winners list
  on the UK home page followed on 2026-09-03 (`winners-section.tsx`, cards →
  rows). The hero bullets and other selling lists still need converting.
- The wider page sweep (download pages, SEO pages) against the checklist
  above. /how-it-works done 2026-08-31: checks as tenet-3 rows with the
  worked examples + long "why" folded, thesis out of its grey panel and
  onto the type scale, measurement mechanics and grid caveats behind
  <details>. The download hero has lost its basemap + scrim but still
  frames its stage; NL/SE heroes now sit on the shared gradient (resting,
  since their clock never ticks).
