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

/** The real page background per theme, as plain hex.
 *
 *  Light is the cream the layout paints (#f5f0e8), NOT HeroUI's white
 *  `--background`; dark is `--background` resolved (oklch(17% .022 55)).
 *  Kept in sync with the first-paint seed in index.html. */
export const THEME_COLOR: Record<Theme, string> = {
  light: "#f5f0e8",
  dark: "#170d06",
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
 *  Note the page background needs no work here: globals.css carries
 *  `body { background-color: #f5f0e8 }` and `.dark body { background-color:
 *  var(--background) }`, so the body follows the class. iOS 26 Safari samples
 *  its toolbars from that body colour, which is why the class flip is enough
 *  and only the meta needs an explicit nudge. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  syncThemeColorMeta(theme);
}
