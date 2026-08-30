/** Theme primitives shared by the global switch and any route that pins a
 *  theme of its own.
 *
 *  Extracted from `components/theme-switch.tsx` when `/api` became a
 *  permanently-dark route: the page has to paint the same dark as the rest of
 *  the site and repaint Safari's chrome the same way, and a second copy of the
 *  hex values would be a drift bug waiting to happen (they're already mirrored
 *  by the first-paint seed in index.html).
 *
 *  The model, unchanged: `.dark` on <html> drives the palette, `localStorage`
 *  key "theme" holds an explicit user choice, and absence of that key means
 *  "follow the OS".
 */

export type Theme = "light" | "dark";

/** The real page background per theme, as plain hex. This is the ONE source of
 *  truth for every surface iOS Safari samples its chrome from — the meta tag,
 *  the <html> paint and the <body> paint all come from here.
 *
 *  Light is the cream the layout paints (#f5f0e8), NOT HeroUI's white
 *  `--background`.
 *
 *  Dark is `--background` resolved: `oklch(22% 0.022 55)` = #231811. It used to
 *  say #170d06 here, described as "oklch(17% .022 55)" — a value the token has
 *  not held for some time. That drift was the bug behind the stuck bottom
 *  toolbar: the status bar took the meta (#170d06) while the toolbar sampled
 *  the body's real paint (#231811), so the two bars were painting different
 *  colours from different sources, and only one of those sources was being
 *  told about the flip.
 *
 *  Kept in sync with the first-paint seed in index.html and with
 *  `body`/`.dark body` in globals.css. If --background moves, this moves. */
export const THEME_COLOR: Record<Theme, string> = {
  light: "#f5f0e8",
  dark: "#231811",
};

/** Repaint Safari's status bar + bottom toolbar to match the active theme.
 *
 *  Two gotchas this works around:
 *  1. Hand Safari a hardcoded hex, never a computed value. The palette is oklch
 *     and `getComputedStyle` can return an `oklch()`/`color()` string that
 *     Safari's theme-color parser rejects outright — when that happens Safari
 *     keeps the previous bar colour, so the bars appear "stuck" on theme flip.
 *     A literal hex is always valid and always applied.
 *  2. Safari only repaints when the theme-color meta node is (re)inserted, not
 *     when an existing node's `content` mutates — so replace the node wholesale
 *     on every theme flip. */
export function syncThemeColorMeta(theme: Theme): void {
  document.querySelector('meta[name="theme-color"]')?.remove();
  const meta = document.createElement("meta");

  meta.name = "theme-color";
  meta.content = THEME_COLOR[theme];
  document.head.appendChild(meta);
}

/** Paint the themed ground directly onto <html> and <body>, as a literal hex.
 *
 *  iOS 26 Safari ignores `theme-color` and tints BOTH toolbars by sampling the
 *  page itself: the root/body background, or a fixed element covering the
 *  relevant viewport edge. globals.css already paints the body per theme, so in
 *  principle the class flip is enough — in practice the bottom toolbar kept the
 *  colour it had at first load while the top one tracked the flip, because:
 *
 *  - the body's dark paint is `var(--background)`, an oklch value resolved
 *    through a custom property. Safari's chrome sampler is not the same code
 *    path as the compositor, and it does not reliably re-resolve that on a
 *    class change — an explicit inline hex on the element it samples is a
 *    direct mutation it cannot miss; and
 *  - the bottom edge is covered on mobile by the fixed download CTA's scrim
 *    (layouts/default.tsx), so `html` needs the paint too rather than relying
 *    on the body alone being what gets sampled.
 *
 *  Inline styles rather than CSS because the point is the explicit per-flip
 *  mutation. The stylesheet keeps its own rules as the first-paint default for
 *  the frames before this runs. */
function paintChromeSurfaces(theme: Theme): void {
  const hex = THEME_COLOR[theme];

  document.documentElement.style.backgroundColor = hex;
  document.body.style.backgroundColor = hex;
}

/** The theme the site would show right now if nothing pinned it: the user's
 *  saved choice, else the OS preference. */
export function resolveAmbientTheme(): Theme {
  const saved = localStorage.getItem("theme") as Theme | null;

  if (saved === "light" || saved === "dark") return saved;

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Paint a theme. Deliberately does NOT touch localStorage — persisting is the
 *  switch's job, and a pinned route must never overwrite what the visitor
 *  chose for the rest of the site.
 *
 *  Three steps, and all three are load-bearing on iOS: the class drives the
 *  palette, the explicit hex on html/body is what Safari's chrome sampler
 *  actually reads (see paintChromeSurfaces), and the meta covers older iOS and
 *  Android Chrome, which do honour it. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  paintChromeSurfaces(theme);
  syncThemeColorMeta(theme);
}
