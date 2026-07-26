/** Break a section out of `DefaultLayout`'s centred `max-w-[1280px]` column so
 *  it runs edge-to-edge.
 *
 *  The layout wraps every page in a capped, padded `<main>`, which is right for
 *  documents and wrong for a section that carries its own background — a dark
 *  CTA band or a cream proof wall reads as a floating card when it stops at the
 *  column edge, rather than as a band the page passes through.
 *
 *  `100vw` includes the classic scrollbar's width, so on platforms that reserve
 *  gutter space (Windows/Linux, and macOS with "always show scrollbars") this
 *  would overflow by ~15px and produce a horizontal scrollbar. The layout root
 *  carries `overflow-x-clip` to absorb that. `clip` rather than `hidden`
 *  deliberately: `hidden` would turn the root into a scroll container and break
 *  every `position: sticky` on the site (the broker rail, the company panel,
 *  the pinned phone in the app tour). `clip` doesn't, and it leaves
 *  `position: fixed` descendants alone since their containing block is the
 *  viewport, not this element.
 *
 *  Pair with an inner `mx-auto max-w-*` wrapper — this only moves the
 *  background, never the content measure. */
export const FULL_BLEED = "relative left-1/2 w-screen -translate-x-1/2";

/** Same break-out, but restoring the layout's own horizontal padding inside —
 *  for full-bleed sections whose content should still start where the column
 *  does on narrow screens. */
export const FULL_BLEED_PADDED = `${FULL_BLEED} px-4 md:px-6`;
