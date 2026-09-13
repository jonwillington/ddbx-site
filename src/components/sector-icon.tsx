/** The mark an industry is referenced by — one glyph per ICB sector, defined
 *  once.
 *
 *  The eleven sectors are named in five places that have nothing else in
 *  common: the gutter of the sector stage, the ranked list under it, the
 *  onward cards at the foot of a sector page, a committee's remit on
 *  /us/congress, and the chip row on a filing. Before this they were eleven
 *  identical runs of text, and a reader scanning for "the mining one" had to
 *  read every row to find it. A glyph is the difference between a list you
 *  read and a list you scan, and it only works if Energy is the same flame
 *  wherever it turns up — which is why the map lives here rather than being
 *  chosen per surface.
 *
 *  Heroicons, in the two weights the site already draws with: solid for the
 *  small dense surfaces (a 13px gutter label, a list row), outline for the
 *  32px wells on the onward cards, where RelatedCards' own marks are outline
 *  and a solid sector glyph beside them would read as a different family.
 */
import type { ComponentType, SVGProps } from "react";

import {
  BoltIcon,
  BuildingLibraryIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  CubeIcon,
  FireIcon,
  HeartIcon,
  HomeModernIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SignalIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/solid";
import {
  BoltIcon as BoltLine,
  BuildingLibraryIcon as BuildingLibraryLine,
  Cog6ToothIcon as Cog6ToothLine,
  CpuChipIcon as CpuChipLine,
  CubeIcon as CubeLine,
  FireIcon as FireLine,
  HeartIcon as HeartLine,
  HomeModernIcon as HomeModernLine,
  ShoppingBagIcon as ShoppingBagLine,
  ShoppingCartIcon as ShoppingCartLine,
  SignalIcon as SignalLine,
  Squares2X2Icon as Squares2X2Line,
} from "@heroicons/react/24/outline";

import { SECTOR_SLUGS } from "../../shared/sectors.js";

export type SectorGlyph = ComponentType<SVGProps<SVGSVGElement>>;

export type GlyphWeight = "solid" | "line";

/** Slug → mark. Keyed by slug rather than label because the slug is the thing
 *  that survives a wording change to "Health Care". */
const GLYPHS: Record<string, Record<GlyphWeight, SectorGlyph>> = {
  "basic-materials": { solid: CubeIcon, line: CubeLine },
  "consumer-discretionary": { solid: ShoppingBagIcon, line: ShoppingBagLine },
  "consumer-staples": { solid: ShoppingCartIcon, line: ShoppingCartLine },
  energy: { solid: FireIcon, line: FireLine },
  financials: { solid: BuildingLibraryIcon, line: BuildingLibraryLine },
  "health-care": { solid: HeartIcon, line: HeartLine },
  industrials: { solid: Cog6ToothIcon, line: Cog6ToothLine },
  "real-estate": { solid: HomeModernIcon, line: HomeModernLine },
  technology: { solid: CpuChipIcon, line: CpuChipLine },
  telecommunications: { solid: SignalIcon, line: SignalLine },
  utilities: { solid: BoltIcon, line: BoltLine },
};

/** The generic sector mark, for a slug this map hasn't been taught. A grid of
 *  squares is what RelatedCards drew for every sector before this file, so an
 *  unmapped sector degrades to the old behaviour rather than to a gap. */
const FALLBACK: Record<GlyphWeight, SectorGlyph> = {
  solid: Squares2X2Icon,
  line: Squares2X2Line,
};

// A twelfth sector added to shared/sectors.js would otherwise reach production
// wearing the fallback, which is exactly the state this file exists to end.
if (import.meta.env.DEV) {
  const missing = SECTOR_SLUGS.filter((slug: string) => !GLYPHS[slug]);

  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`sector-icon: no glyph for ${missing.join(", ")}.`);
  }
}

export function sectorGlyph(
  slug: string,
  weight: GlyphWeight = "solid",
): SectorGlyph {
  return (GLYPHS[slug] ?? FALLBACK)[weight];
}

/** True when this path is one sector's page, so a caller drawing a mixed set
 *  of links can reach for the sector's own mark. */
export function sectorSlugFromPath(to: string): string | null {
  const match = /^\/sectors\/([a-z0-9-]+)/.exec(to.split(/[?#]/)[0]);

  return match ? match[1] : null;
}

/** The mark in HTML flow — a list row, a chip, a heading. Sized and coloured
 *  by the caller, `aria-hidden` always: the sector's name is beside it in
 *  every one of those places, and a screen reader announcing "cog, gear,
 *  Industrials" is noise. */
export function SectorIcon({
  slug,
  className,
  weight = "solid",
  strokeWidth,
}: {
  slug: string;
  className?: string;
  weight?: GlyphWeight;
  /** Outline weight only. */
  strokeWidth?: number;
}) {
  const Glyph = sectorGlyph(slug, weight);

  return <Glyph aria-hidden className={className} strokeWidth={strokeWidth} />;
}

/** The same mark inside a board stage's svg.
 *
 *  A nested `<svg>` with x/y/width/height, which is what heroicons hand back
 *  anyway: the alternative is a second copy of eleven path definitions that
 *  would then have to be kept in step with the first. */
export function SectorGlyphMark({
  slug,
  x,
  y,
  size = 13,
  fill = "currentColor",
  opacity,
}: {
  slug: string;
  x: number;
  y: number;
  size?: number;
  fill?: string;
  opacity?: number;
}) {
  const Glyph = sectorGlyph(slug, "solid");

  return (
    <Glyph
      aria-hidden
      fill={fill}
      height={size}
      opacity={opacity}
      width={size}
      x={x}
      y={y}
    />
  );
}
