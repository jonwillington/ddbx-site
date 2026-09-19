/** A marketing band — one section of a static selling page (/api, /mcp,
 *  /download and the download components): a centred 6xl column on the
 *  band rhythm, `py-14 md:py-20`.
 *
 *  Replaces the `SECTION` const those files each declared verbatim.
 *
 *  No horizontal gutter of its own: the layout's <main> already pads
 *  `px-4 md:px-6`, and the old consts' second gutter put these pages' text at
 *  32/48px against 16/24 everywhere else. Dropped 2026-09-19 (Jon, spec §8.8).
 *
 *  `y: false` drops the vertical rhythm for a band that sets its own (the app
 *  tour runs taller at md for its pinned phone).
 *
 *  Spec: investigations/2026-09-19-ui-standardisation.md §2.6, §3.
 */
export function band({ y = true }: { y?: boolean } = {}): string {
  return ["mx-auto max-w-6xl", y ? "py-14 md:py-20" : null]
    .filter(Boolean)
    .join(" ");
}
