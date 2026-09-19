/** Glass — the floating translucent material (design-language tenet 2).
 *
 *  `glass()` is the navbar's recipe, which is canonical: a cream fill at 60%
 *  under a heavy blur with a saturation boost (so what passes underneath
 *  reads as material, not mud), and a hairline edge. Shadow is `shadow-float`.
 *  For the shell page header, cookie banner, overlays, the companies rail
 *  and the broker bottom bar as the chrome sweep reaches them.
 *
 *  `glass('stage')` is the same idea on the fixed-dark board-stage ground: a
 *  near-opaque warm-black fill with a white hairline — the stage tooltip.
 *
 *  Material only: radius, padding and position stay at the call site.
 *  Spec: investigations/2026-09-19-ui-standardisation.md §3.
 */
export type GlassTone = "page" | "stage";

const GLASS: Record<GlassTone, string> = {
  page: "border border-black/[0.07] bg-page/60 shadow-float backdrop-blur-2xl backdrop-saturate-[2.5] dark:border-white/[0.09] dark:bg-background/60",
  stage:
    "border border-white/12 bg-[#241b12]/95 text-white shadow-xl backdrop-blur-md",
};

export const glass = (tone: GlassTone = "page"): string => GLASS[tone];
