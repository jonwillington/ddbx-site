# Static page rules

**Status:** in force. Written 2026-08-03.
**Supersedes nothing; absorbs** `2026-07-26-seo-page-design-uplift.md` (which
described the SEO family alone) and generalises it to every static page.

---

## Why this exists

`/api` is the best page on the site. It was built last, in one go, by someone
solving one page's problems, and everything it does well it does because of
decisions that were never written down anywhere another page could reach.
Meanwhile `/directors/:id` shipped a fabricated 0% hit rate over four em-dashes
and ended in whitespace, `/companies` ruled its last row a third of the way
across, and "Read next" was four inert text blocks.

The gap was never taste. It was that `/api`'s grammar lived only in `/api`.

This is that grammar, extracted. `SeoPageShell`, `SeoSection`, `StatTiles`,
`RelatedCards` and `SeoSkeleton` are the enforcement mechanism — the rules are
mostly descriptions of what those components already do, so following them is
usually a matter of composing them rather than reimplementing them.

Two of these rules are absolute. The rest are defaults with named exceptions.

---

## 1. Every static page is a selling tool. Never bare content. (ABSOLUTE)

A static page that renders only its data is a wasted page. Every one of them is
an entry point — the reader who lands on `/directors/dir-simon-borrows` got
there by searching a name, has never heard of ddbx, and will leave from the same
page unless it gives them a reason not to.

So every static page carries, below its data and above its footer:

- **What this is.** One short section explaining the product in the context of
  what the reader is looking at. Not a boilerplate paragraph — the director page
  explains disclosure rules, the sector page explains sector aggregates.
- **Educational material.** The terms on the page, defined, linking into
  `/learn` and `/how-it-works`. If the page shows a hit rate, it says what a hit
  rate is and what it isn't.
- **Somewhere to go.** A `RelatedCards` block. Never a bare link list.
- **The ask.** `SeoPageShell`'s terminal `AppCtaBand`, which the shell places
  after the last content section by construction.

The failure this prevents is specific and was live on four routes: content ends,
then 600px of whitespace, then the footer.

## 2. Never state a number you do not have. (ABSOLUTE)

An em-dash in a figure slot means "not applicable", "zero" and "failed to load"
all at once. A zero computed from an empty set is worse — it is a specific claim
made from no evidence, and on `/directors/:id` it was a specific claim about a
named person.

- A figure with no data says **"Not enough data yet"**, in words, at a size that
  reads as a sentence rather than as a number.
- If the figure will exist later, say **when**: "Performance stats will be
  available after 12 October 2026." Waiting is a state, and it usually has a
  computable date.
- Distinguish *empty* from *failed*. "No qualifying purchases this period" is a
  fact about the market; publishing it when the API is down is a lie. Every
  fetch needs a third state.
- Distinguish *this is zero* from *we have nothing to divide by*. `hit_rate_pct`
  arrives as a bare `0` in both cases; the page has to tell them apart before
  rendering.

## 3. Sectioning: ruled, numbered, left-set

`SeoSection`, two variants, both levelled off `/api`:

- **stacked** — a ruled opener, an optional mono `03 / 07` counter at the right
  end of the rule, then a display-scale title (26/34px at the 860px document
  measure; `/api` runs 34/46/58 at full width) with an optional aside under it.
- **rail** — heading in a 10rem left column, content at measure on the right.
  For reference material and methodology.

The counter is not decoration. A long page with no counter gives the reader no
sense of how much is left. Number the sections that make the argument; leave the
appendix (a reference table, a "Read next") outside the run — a counter on an
appendix implies it is part of the read.

**Never** a centred `max-w-2xl` heading-over-subheading stack. It is the single
loudest tell of a templated landing page and the reason `/download` read as
stock before `SectionHeader` replaced it.

## 4. Alternate the section structures

Six consecutive sections of the same shape read as a list even when they aren't
one. `/api` alternates deliberately: proof cards, then a feature grid, then a
terminal block, then a two-column reference, then a coverage grid, then an FAQ.
No two adjacent sections have the same internal geometry.

Applying this is mostly a matter of not reaching for the same component twice in
a row. If two neighbouring sections both want `RelatedCards`, one of them
probably wants to be prose.

## 5. Typographic weighting: three levels, and the subject is level one

The recurring bug, found on three surfaces in one sweep: **the row's subject set
lighter than the figure beside it.** On `/companies` the company name was
14.5px/85% opacity next to a 13.5px semibold total; on `/biggest-buys` the
company was set smaller than its own alpha chip.

A row is about the thing it names. So:

1. **Subject** — the name. Heaviest, largest, full ink.
2. **Figure** — semibold, tabular, coloured only when direction is meaningful.
3. **Caption** — ticker, counts, dates. Small, `foreground/45`.

Page-level scale is `SeoPageShell`'s: eyebrow (mono 11px, 0.16em, brand), h1
(34/44px at the document measure), standfirst (`body` 14px or `lede` 16.5px).
Both h1 species are levelled off `/api`'s hero; don't invent a third.

## 6. Loading states describe the page, not a generic list

A skeleton whose geometry differs from what arrives is a **redraw wearing a
loading state**. `/companies` used to skeleton a one-column ruled list and then
render a three-column logo grid.

- Same grid, same rules, same leading circle size, same row height.
- The terminal CTA band is **suppressed** while loading (`SeoPageShell` does
  this). A dark full-bleed ask flashing above the fold and then being shoved
  1,500px down by arriving data was the family's worst loading behaviour.
- Anything above the skeleton boundary — the standfirst especially — must be
  present in both states. An absent paragraph that arrives with the data pushes
  the whole page down, and the shell cannot absorb that.
- Scroll-reveal (`Reveal`, `useInView`) is fade-and-rise, once, on entry, capped
  around 240ms of stagger across a row, and fully off under
  `prefers-reduced-motion`. There is no animation library and there should not
  be one.

## 7. Grids finish, and columns are shared

- **Rules must not stop mid-row.** A ruled grid with a short last row looks
  broken. Pad with `aria-hidden` filler cells carrying the same rule, one set
  per column count (the count is a media query, so it takes two sets).
- **Sibling tables share one column spec.** Under `table-auto` each table sizes
  its own columns from its own content, so `/api`'s Dealings and Context blocks
  put `Returns` 170px apart. Declare the tracks once and give every block the
  same ones, including any parameter list hanging beneath them.
- Prefer an explicit grid to CSS columns whenever rows carry aligned parts.

## 8. Everything specific is a link

If the page renders one concrete thing that has a URL, that thing is a link.
Applied 2026-08-03 to: `/biggest-buys` rows, cluster-panel rows, the company
page's filings table, sector "recent buys", and the market detail drawer — all
of which rendered a specific disclosure and offered no route to it.

Links look like links: a mark or logo, the title, and a trailing arrow that
nudges on hover. An arrow that only appears on hover cannot have told anyone the
card was a link. `RelatedCards` derives a mark from the destination path, so
this is free for existing callers.

Where a link would be dead, render nothing — not a disabled link. `/dealings/:id`
is a UK pipeline route, so US, SE and NL surfaces suppress it via
`MarketConfig.filingHref` returning null.

## 9. Colour carries meaning, never decoration

- `text-positive` / `text-negative` only, and only for direction. Green on a
  figure means it went up.
- One contrasting object per page, and that object is the ask. Two filled asks
  in one document is how a page starts reading as a funnel.
- A verdict is rendered at full strength both ways. A pass in 12%-tint green and
  a fail in grey reads as "passed" and "not assessed"; the app answers each
  check with a filled green circle or a filled red one, and the web does now too.
- Progress bars must encode a quantity a reader can read. A bar scaled to the
  largest item in the group encodes rank within the group and nothing else —
  removed from the cluster panel and the company cards for exactly this reason.
  `/biggest-buys` keeps its bar because that page IS a ranking and says so in its
  published methodology.

## 10. Back is not a breadcrumb

Crumbs are the site's structure and are always true. Back is the reader's own
history and is only honest when they arrived from inside the site. `BackLink`
tests `location.key !== "default"` and renders nothing otherwise; pass it to
`SeoPageShell`'s `back` slot unconditionally.

---

## Checklist for a new static page

- [ ] Composes `SeoPageShell` (eyebrow, crumbs, h1, standfirst, notice,
      content, band) and `SeoSection` — not a hand-rolled layout
- [ ] `back={<BackLink />}` if it is a record page
- [ ] Skeleton matches the arrived geometry; band suppressed while loading
- [ ] Every figure has an explicit no-data state, in words, with a date if one
      exists
- [ ] Empty ≠ failed on every fetch
- [ ] Sections numbered where they argue; alternating internal geometry
- [ ] Subject outweighs figure outweighs caption in every row
- [ ] Grid rules complete on the last row
- [ ] Every specific thing is a link, with a mark and a trailing arrow
- [ ] Carries a "what this is" section, educational material, `RelatedCards`,
      and the terminal ask

## Where the rules live in code

| Rule | Enforced by |
|---|---|
| Page order, terminal band, loading suppression | `src/components/seo/page-shell.tsx` |
| Section grammar, counters, both variants | `src/components/seo/section.tsx` |
| Figure treatment, no-data slot | `src/components/seo/stat-tiles.tsx` |
| Onward links, derived marks, arrows | `src/components/seo/related-cards.tsx` |
| Skeleton variants | `src/components/seo/skeletons.tsx` |
| Section opener at display scale | `src/components/download/section-header.tsx` |
| Scroll reveal | `src/components/download/reveal.tsx` |
| Back affordance | `src/components/back-link.tsx` |
| Filing URL per market | `MarketConfig.filingHref` in `src/lib/markets/types.ts` |

House type and colour conventions (eyebrow spec, the two h1 species, brand
tokens, curly apostrophes) are unchanged from the 2026-07-27 sweep and are
assumed here rather than restated.

Reader-facing copy rules are **not** here. They are canonical in
`../ddbx-data/worker/llm/prompts.ts` as `HOUSE_STYLE_RULES`, and apply to
hand-written page copy as much as to generated analysis: no em-dashes, no
padding phrases, plain declarative sentences with specific numbers.
