/** Primary-button tokens — the counterpart to components/chip.ts.
 *
 *  Chips and buttons had converged on the same brown and similar radii, so a
 *  SIGNIFICANT rating pill and a "Get the app" CTA read as the same kind of
 *  object. They aren't: a chip is a label you read, a button is a thing you
 *  press. The two now separate on both axes at once —
 *
 *      chip    → capsule, brown/tinted, hairline border, uppercase mono
 *      button  → rounded-lg, near-black, solid fill, sentence case
 *
 *  Only the fill and the radius live here. Padding, type scale and width stay
 *  at the call-sites: the CTAs range from a compact navbar pill to a
 *  full-width sticky install bar, and there's no single size that fits them.
 *  What matters for consistency is that none of them are brown any more.
 */

/** Radius for every button. Deliberately not `rounded-full` — the capsule now
 *  belongs to chips alone. */
export const BUTTON_RADIUS = "rounded-lg";

/** Solid primary fill. Near-black rather than pure black: `ink` (--color-ink)
 *  carries a trace of the palette's warmth, so it sits in the brand family
 *  without reading as brown. It's already the palette's near-black — dark-mode
 *  buttons have always used it as their *label* colour against white.
 *
 *  The hover step has no token of its own; it exists only here.
 *
 *  Dark mode keeps the existing inversion (white fill, near-black label),
 *  which was never brown and needs no change. */
export const BUTTON_FILLED =
  "bg-ink text-white hover:bg-[#2a2118] dark:bg-white dark:text-ink dark:hover:bg-white/90";

/** Ghost / secondary fill — the quiet counterpart to BUTTON_FILLED. A tint of
 *  the same near-black rather than the old brown capsule, so a secondary CTA
 *  reads as "the same button, turned down" instead of a different species.
 *  Pairs with BUTTON_RADIUS like every other button. */
export const BUTTON_GHOST =
  "bg-ink/[0.07] text-ink hover:bg-ink/[0.12] dark:bg-white/10 dark:text-white dark:hover:bg-white/[0.16]";

/** As BUTTON_FILLED, but the hover is driven by a parent `.group` — for the
 *  card layouts where the whole tile is the link and the button is a span. */
export const BUTTON_FILLED_GROUP =
  "bg-ink text-white group-hover:bg-[#2a2118] dark:bg-white dark:text-ink dark:group-hover:bg-white/90";

/** The chosen segment of a segmented control / tab bar / range picker.
 *  No hover — the selected state isn't a hover target, and these sit inside a
 *  track that supplies its own radius. */
export const BUTTON_SELECTED =
  "bg-ink text-white dark:bg-white dark:text-ink";
