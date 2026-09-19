/** A marketing band — one section of a static selling page (/api, /mcp,
 *  /download and the download components): a centred 6xl column on the
 *  band rhythm, `py-14 md:py-20`.
 *
 *  Replaces the `SECTION` const those files each declared verbatim.
 *
 *  `gutter` is the `px-4 md:px-6` those consts carried. The layout's <main>
 *  already pads by the same amount, so text on these pages sits at 32/48px
 *  where the rest of the site sits at 16/24 — the "doubled gutter" in the
 *  spec (§4, §8.8). Whether to drop it is an open design call, so it stays on
 *  by default and nothing's inset moves; pass `gutter: false` once decided.
 *
 *  `y: false` drops the vertical rhythm for a band that sets its own (the app
 *  tour runs taller at md for its pinned phone).
 *
 *  Spec: investigations/2026-09-19-ui-standardisation.md §2.6, §3.
 */
export function band({
  gutter = true,
  y = true,
}: { gutter?: boolean; y?: boolean } = {}): string {
  return [
    "mx-auto max-w-6xl",
    gutter ? "px-4 md:px-6" : null,
    y ? "py-14 md:py-20" : null,
  ]
    .filter(Boolean)
    .join(" ");
}
