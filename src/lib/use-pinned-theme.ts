import { useEffect } from "react";

import { type Theme, applyTheme, resolveAmbientTheme } from "./theme";

/** Pin a theme for as long as the calling route is mounted, then hand the site
 *  back to whatever the visitor actually chose.
 *
 *  `/api` is permanently dark — it's a developer surface, and the terminal
 *  blocks that carry the page only work against the dark palette. But the site
 *  is one SPA: a client-side navigation away from a pinned route must not
 *  strand every other page in the pinned theme, and the pin must never be
 *  written to `localStorage` (that would silently rewrite the visitor's
 *  preference for the whole site just because they visited one page).
 *
 *  So: paint on mount, restore the ambient theme on unmount. Restoring reads
 *  the saved choice, falling back to the OS — the same resolution the switch
 *  itself does — so a visitor with no saved choice returns to following their
 *  system rather than being pinned to whatever they last saw.
 *
 *  While pinned, hide the theme toggle at the call site (see `Navbar`): a
 *  control that visibly does nothing is worse than no control. */
export function usePinnedTheme(theme: Theme): void {
  useEffect(() => {
    applyTheme(theme);

    return () => applyTheme(resolveAmbientTheme());
  }, [theme]);
}
