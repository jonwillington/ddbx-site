/** The chip system — one shape, one hairline rule, three sizes, one label
 *  treatment. Mirrors `DesignSystem/DdbxChip.swift` in the iOS app, which
 *  consolidated ~30 hand-rolled call-sites onto a single set of tokens.
 *
 *  Before this the web had the same sprawl the app did: some chips bordered
 *  and some not, rounded-md next to rounded-full, four font sizes, and the
 *  rating badges sized as fixed-width boxes that squeezed their own labels
 *  against the edge. A row of them read as a pile of unrelated objects.
 *
 *  Compose a chip as: CHIP_BASE + a CHIP_SIZE + a border colour + a tint.
 */

/** Uppercase mono label. The face resolves through Tailwind's `--font-mono`
 *  (declared in styles/globals.css), so swapping the stack for a bundled face
 *  later is a one-line change there and no call-site moves — the same
 *  indirection iOS keeps behind `Font.chipLabel`.
 *
 *  Casing is a CSS transform, not a string change: the authored labels stay
 *  sentence-case, so screen readers say "Significant" rather than spelling out
 *  capitals — the same reason iOS uses `.textCase` over uppercased strings.
 *
 *  Tracking is 0.05em: iOS's 0.5pt at its 10–12pt chip sizes works out at
 *  ~0.045em, and `tracking-wider` is the nearest Tailwind step. */
export const CHIP_LABEL = "font-mono font-semibold uppercase tracking-wider";

/** Shape, layout and border *width* — everything a chip has regardless of
 *  colour or size. Capsule throughout, matching iOS's `.capsule` default.
 *
 *  The border colour is deliberately absent: two border-colour utilities in
 *  one class string resolve by stylesheet order, not by which one the caller
 *  wrote last, so a colour baked in here would beat some callers' overrides
 *  and lose to others. The width lives here so bordered and borderless chips
 *  stay exactly the same height. Pair with CHIP_HAIRLINE. */
export const CHIP_BASE = `inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full border ${CHIP_LABEL}`;

/** The universal hairline: the chip's own label colour at 25%.
 *
 *  Deriving the border from `currentColor` rather than naming a colour per
 *  chip is what makes the set read as one system while still differentiating
 *  each chip — a green momentum chip gets a green hairline, a violet options
 *  chip a violet one, with no per-chip border table to keep in sync. Pale
 *  tints (which previously dissolved into the row) gain a defined edge, and
 *  chips that already had a border keep roughly the weight they had. */
export const CHIP_HAIRLINE = "border-current/25";

/** Hairline for chips with a *solid* fill, where the label is the contrasting
 *  colour rather than the tint. CHIP_HAIRLINE would draw a light rim inside a
 *  dark pill (or vice-versa) and read as a highlight, not an edge; a soft
 *  black works on both the dark-brown light-mode fill and the pale dark-mode
 *  one. */
export const CHIP_HAIRLINE_FILLED = "border-black/15";

/** Three sizes, matching iOS's `DdbxChipSize` small/regular/large.
 *
 *  Padding and type travel together because they have to: the rating badges
 *  used to set `md:px-0` inside a fixed `md:w-28`, so a long label like
 *  SIGNIFICANT ran to the pill's edge with no breathing room. Sizing a chip
 *  now means picking one of these, and the side padding comes with it.
 *
 *  Each step sits ~1px below the Instrument Sans size it replaced — uppercase
 *  mono has a wider advance, the same compensation iOS made when its chips
 *  moved to SF Mono. */
export const CHIP_SIZE = {
  /** Dense in-row markers: cluster, party, chamber, options, comment counts. */
  sm: "px-2 py-0.5 text-[10px] leading-4",
  /** The default. Standalone markers, ± performance pills, mid-tier ratings. */
  md: "px-2.5 py-0.5 text-[11px] leading-4",
  /** Emphasis — the top rating tier only. */
  lg: "px-3 py-1 text-[12px] leading-4",
} as const;

export type ChipSize = keyof typeof CHIP_SIZE;

/** The common case: base + hairline + size, ready for a tint class. */
export const chip = (size: ChipSize = "sm") =>
  `${CHIP_BASE} ${CHIP_HAIRLINE} ${CHIP_SIZE[size]}`;
