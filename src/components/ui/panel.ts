/** The light panel — a rounded, hairlined box on the page.
 *
 *  About 25 near-identical `rounded-2xl border border-hairline bg-…` recipes
 *  had grown across the site, with four lift shadows between them. This is
 *  the one recipe, derived from the most common of them:
 *
 *    sheet        bg-sheet / dark surface — the default card (research, learn,
 *                 how-it-works, broker pages, the insider-index method box)
 *    inset        white/70 / dark surface-secondary/40 — the quieter tile
 *                 (StatTiles, director figures, download pricing)
 *    translucent  sheet/95 + blur — a panel floating over content (the
 *                 discretion and waitlist overlays)
 *
 *  Sizes: `compact` px-4 py-3.5 (tiles), `roomy` p-5 (cards). Anything else,
 *  leave `size` off and pad at the call site. `lift` adds the card shadow.
 *
 *  Class-string helper, not a component: a panel is a box, with no structure
 *  of its own. Spec: investigations/2026-09-19-ui-standardisation.md §3.
 */

export type PanelVariant = "sheet" | "inset" | "translucent";
export type PanelSize = "compact" | "roomy";

const VARIANT: Record<PanelVariant, string> = {
  sheet: "bg-sheet dark:bg-surface",
  inset: "bg-white/70 dark:bg-surface-secondary/40",
  translucent: "bg-sheet/95 backdrop-blur-md dark:bg-surface/95",
};

const SIZE: Record<PanelSize, string> = {
  compact: "px-4 py-3.5",
  roomy: "p-5",
};

export function panel({
  variant = "sheet",
  size,
  lift = false,
}: {
  variant?: PanelVariant;
  size?: PanelSize;
  lift?: boolean;
} = {}): string {
  return [
    "rounded-card border border-rule",
    VARIANT[variant],
    size ? SIZE[size] : null,
    lift ? "shadow-lift" : null,
  ]
    .filter(Boolean)
    .join(" ");
}
