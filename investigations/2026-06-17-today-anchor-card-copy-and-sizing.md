# Report: "Scanning today's market for deals" + smaller, better-aligned Today cards

**Date:** 2026-06-17
**Status:** Proposal for review (no code changed)
**Surface:** The "Today" section at the top of every market page — the LIVE
anchor card plus the deal cards beside it.

---

## 1. What's being proposed

Two changes, in the order you framed them:

1. **Copy:** change the live headline from
   `Scanning the market for deals` → **`Scanning today's market for deals`**.
2. **Layout:** with the copy settled, shrink the cards and tighten the
   alignment so the anchor card reads as a true peer of the deal cards
   rather than a taller, looser block.

The second depends on the first only loosely — the real coupling is that
"today's" makes the headline *longer*, which on a narrow card wraps to more
lines and makes the card *taller*, working against "smaller cards." So if we
take the copy, we should also drop the headline font size to keep the card
from growing. They're a package.

---

## 2. Where this lives (the moving parts)

| Concern | File | Lines |
|---|---|---|
| Headline / eyebrow / sub strings (the `open` state) | `src/components/market/market-anchor-card.tsx` | `describeStatus`, 153–164 |
| Anchor card shell (border, padding, live wash) | `src/components/market/market-anchor-card.tsx` | `MarketAnchorCard`, 59–72 |
| **Shared** panel body (eyebrow + headline + sub) | `src/components/market/market-anchor-card.tsx` | `MarketAnchorPanel`, 77–104 |
| Deal card | `src/components/market/market-today-hero.tsx` | `TodayCard`, 213–299 |
| Grid / carousel container | `src/components/market/market-today-hero.tsx` | `TODAY_CAROUSEL_CLASS`, 59–63 |
| Loading skeleton (must track the deal card) | `src/components/market/market-today-hero.tsx` | `TodayCardSkeleton`, 472–489 |
| Empty-day large panel (also uses `MarketAnchorPanel`) | `src/components/market/market-today-hero.tsx` | `EmptyDayContainer`, 305–343 |
| Per-market close times | `src/lib/markets/{uk,us,sweden,netherlands}.tsx` | `session:` field |

The single most important fact for implementation: **`MarketAnchorPanel` is
shared.** It renders both (a) the small in-grid anchor card on busy days and
(b) the big 50%-width hero panel on empty days (`p-6 md:p-8`). The headline
size `text-[28px] md:text-[34px]` lives *in that shared panel*. So you cannot
shrink the busy-day card's headline without also shrinking the empty-day
hero unless you parametrise the panel. See §5.

---

## 3. The copy change

Only one string moves:

```diff
- headline: "Scanning the market for deals",
+ headline: "Scanning today's market for deals",
```

at `market-anchor-card.tsx:156`. Use a real apostrophe (`’`) to match the
codebase (see `New Year’s Eve` at `market-status.ts:48`), i.e.
`"Scanning today’s market for deals"`.

### Does it hold up across all markets and states?

**States** — the headline is *only* shown when the market is `open` (live).
Every other state has its own headline and is untouched:

| State | Headline | Touched? |
|---|---|---|
| Open / live | **Scanning today's market for deals** | ✅ changed |
| Pre-open | `Market opens in 14m` | no |
| Holiday | `Closed for Christmas Day` | no |
| Weekend | `Markets closed for the weekend` | no |
| After-hours | `The market has closed` | no |

So "today's" is unambiguous — it only ever appears while today's session is
actually running. No "today's market" showing on a Saturday.

**Markets** — the copy is hardcoded English for every market (locale only
drives the *date* line, `formatToday`, not the headline). The anchor card
renders for **UK, US, SE, NL**; **Congress has no session and no anchor card**
(`congress.tsx`), so it's unaffected. "today's market" reads correctly for all
four exchange markets.

**Empty-but-open edge case** — early in a session with zero filings yet, the
anchor shows in `EmptyDayContainer` with `isLive: true`. "Scanning today's
market for deals" with nothing found yet is still correct (it's *scanning*),
so the copy survives the empty case too.

**Risk: length.** "today's" adds ~8 characters. At the in-grid card's real
widths — `w-[72%]` of viewport on mobile, ~1/3 width at `2xl` (3-up grid) —
the 28px headline already wraps to ~3 lines; the longer string can push a 4th
line on the narrowest cards. That is the lever the layout change pulls on.

---

## 4. The layout change — why cards are bigger than they need to be today

Two structural reasons the anchor card looks oversized and unaligned next to
the deal cards:

1. **The headline is huge and stretches.** `MarketAnchorPanel` renders the
   headline at `text-[28px] md:text-[34px]` with `flex-1`
   (`market-anchor-card.tsx:94`). `flex-1` makes the headline area *expand to
   fill the card's height*, pinning the "CLOSES AT 16:30" sub to the bottom.
   Meanwhile the deal card is **top-aligned** — logo, company, value all
   stack from the top, with empty space at the bottom. So in the same grid
   row, the anchor's content is bottom-anchored and the deal's is
   top-anchored: they don't share a baseline, which is what reads as
   "unaligned."

2. **The anchor is the tallest cell, so it sets the row height.** CSS grid
   stretches every cell to the tallest. Under discretion mode the deal card
   has no summary (`!DISCRETION_ENABLED && dealing.summary`,
   `market-today-hero.tsx:292`), so it's short: logo (48px) + company + value.
   The anchor, with its 34px headline, is taller — so it forces every deal
   card to stretch to match it. Shrink the anchor and the *whole row* gets
   shorter. That's the "cards can be smaller" win you're pointing at.

### Recommended direction: make the anchor a structural peer of the deal card

The deal card's anatomy is: **[icon/logo 48px] → title → meta → value**, all
top-aligned, `p-4 md:p-5`. The cleanest "aligned nicer" is to give the anchor
card the *same anatomy and rhythm*:

- **Top-align, drop `flex-1`** on the headline so the anchor stacks from the
  top like the deal card (eyebrow → headline → sub), instead of pushing the
  sub to the bottom.
- **Shrink the headline** from `28/34px` to roughly the deal-card title scale
  (`text-[18px]`, maybe `text-[20px]`). This both absorbs the longer "today's"
  copy and stops the anchor being the row's height-driver.
- **Match padding** to the deal card (`p-4 md:p-5` instead of `p-5 md:p-6`).
- Keep the LIVE chrome (green border, wash, pulsing dot) — that's the anchor's
  identity and shouldn't be flattened.

Net effect: the anchor stops dictating a tall row, the deal cards shrink to
their natural content height, and everything tops out on the same line.

### Option sketch (busy-day in-grid anchor only)

```
 BEFORE (anchor, ~34px headline, flex-1)      AFTER (peer-aligned, ~18–20px)
 ┌────────────────────────────┐               ┌────────────────────────────┐
 │ ● LIVE                      │               │ ● LIVE                      │
 │                             │               │ Scanning today's market     │
 │ Scanning the market         │               │ for deals                   │
 │ for deals                   │               │ CLOSES AT 16:30             │
 │                             │               │                             │  ← shorter row
 │ CLOSES AT 16:30             │               └────────────────────────────┘
 └────────────────────────────┘
   tall, sub pinned to bottom                    compact, top-aligned, matches deal card
```

---

## 5. The trap: `MarketAnchorPanel` is shared with the empty-day hero

If you simply edit the headline size in `MarketAnchorPanel`, you also shrink
the big empty-day/weekend hero (`EmptyDayContainer`, `p-6 md:p-8`, 50% width),
where the large 34px headline is doing its job and has the room for it. That's
almost certainly **not** what you want.

Three ways to scope the shrink to just the busy-day card:

1. **`compact` / `size` prop on `MarketAnchorPanel`** (recommended). Pass
   `compact` from `MarketAnchorCard`; switch headline size, top-margins, and
   `flex-1` on/off by it. Empty-day caller keeps the large variant. One
   component, one prop, no duplication.
2. **Lift the headline size into `MarketAnchorCard`** and have the panel
   accept the class. More plumbing, same result.
3. **Duplicate** the small layout into `MarketAnchorCard`. Avoid — drifts.

Recommend (1).

---

## 6. Edge cases & follow-on work to not miss

- **Skeleton parity.** `TodayCardSkeleton` (472–489) hardcodes the deal-card
  padding/heights. If the deal cards shrink (e.g. padding change), update the
  skeleton in the same change or the layout jumps when data lands. The
  carousel/grid classes are deliberately shared for exactly this reason —
  keep that invariant.
- **Empty-day hero unchanged.** Confirm `EmptyDayContainer` still uses the
  *large* panel variant after the `compact` split — that's the
  weekend/holiday landing surface and should stay prominent.
- **Mobile carousel widths.** Cards are `w-[72%]` snap slots on mobile
  (`TODAY_CARD_SLOT_CLASS`). A smaller headline helps the longer "today's"
  copy fit in 2 lines here; sanity-check the narrowest real device.
- **3-up at `2xl`.** The grid goes `2xl:grid-cols-3`, the narrowest desktop
  card. This is where the longer headline is tightest — verify wrap there.
- **Per-market close times still correct.** The sub ("CLOSES AT 16:30") is
  market-specific and untouched: UK 16:30, US 16:00, SE 17:30, NL 17:30.
  Only UK has a half-day/early-close path
  (`Early close at 12:30 (Christmas Eve)`) — that string is longer, so
  whatever headline/sub sizing we pick must not clip it. Test the UK
  early-close branch specifically.
- **Pulsing dot vs. quiet states.** The live state uses the small pulsing dot
  (no 48px circle); the closed/pre-open states use a 28px icon circle
  (`StatusBullet`). If we align the anchor's top row to the deal card's 48px
  logo slot, decide whether the live dot should sit in a matching slot or stay
  as the bare pulse. Recommend keeping the bare pulse — forcing it into a
  48px circle would dull the "live" signal.
- **Discretion on vs. off.** With discretion **off**, deal cards gain a 2–3
  line summary (`market-today-hero.tsx:292`), making them *taller* than the
  anchor again — so the anchor won't be the height-driver in that mode. The
  shrink still helps (tighter anchor, consistent top alignment) but the
  "smaller row" benefit mostly shows under discretion **on**, which is the
  production default. Worth stating so the before/after is judged in the right
  mode.
- **Animation cascade.** Cards fade in staggered via `todayHeroDelay`
  (header → anchor → deals). Pure sizing/copy changes don't touch this, but if
  the anchor's internal structure changes, keep the single `animate-today-hero-item`
  wrapper so the stagger still applies once per card.

---

## 7. Recommendation

- **Take the copy** — `Scanning today’s market for deals`. It's correct in
  every state and market, only renders while live, and reads better.
- **Pair it with a `compact` variant of `MarketAnchorPanel`**: smaller
  headline (~18–20px), top-aligned (no `flex-1`), deal-card padding. This is
  what delivers "smaller cards, aligned nicer" — the anchor stops being the
  tallest cell and stops bottom-anchoring its sub.
- **Keep the empty-day hero large** via the prop split, keep the LIVE chrome,
  and update the skeleton in lockstep.

Smallest viable first step if we want to de-risk: ship the copy change alone
(one line), eyeball the wrap on mobile + 2xl, then do the `compact` panel as a
second pass. They're independently shippable.
```
