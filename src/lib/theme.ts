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

/** Keep <html>'s inline background in step with the theme.
 *
 *  This exists because of the first-paint seed in index.html, not because of
 *  iOS. The seed sets `documentElement.style.backgroundColor` before the
 *  stylesheet parses, so the first frame is the right tone — and no CSS rule in
 *  globals.css paints `html` at all. Without this the seeded value would stick
 *  for the life of the page and the canvas would keep the colour it had at
 *  load while the body flipped underneath it.
 *
 *  Deliberately does NOT touch <body>. iOS 26 Safari samples the body's
 *  background for its toolbar tint and re-tints on CSS recalc — the `.dark`
 *  class flip — but not on a direct JS style mutation. So the body's paint has
 *  to stay CSS-driven (globals.css) to keep working; an inline override would
 *  shadow the rule that is doing the job. */
function syncRootBackground(theme: Theme): void {
  document.documentElement.style.backgroundColor = THEME_COLOR[theme];
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
 *  The class flip is what actually repaints the page AND what iOS 26 Safari
 *  re-samples for its toolbar tint (via `body` in globals.css). The other two
 *  are bookkeeping: <html>'s inline seed has to be kept current, and the meta
 *  covers older iOS and Android Chrome, which do still honour it. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  syncRootBackground(theme);
  syncThemeColorMeta(theme);
}
