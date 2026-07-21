import type { Rating } from "@/lib/api";

import { CheckCircleIcon as CheckCircleSolidIcon } from "@heroicons/react/20/solid";
import { CheckCircleIcon as CheckCircleOutlineIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

import {
  CHIP_BASE,
  CHIP_HAIRLINE,
  CHIP_HAIRLINE_FILLED,
  CHIP_SIZE,
  type ChipSize,
} from "@/components/chip";

/** Badge tier — the analyst ratings plus "skipped" (unanalysed rows), which
 *  sits below routine as the smallest step in the size + colour taper. */
type BadgeRating = Rating | "skipped";

// Legacy rating values from before migration 003 — map to new labels.
const LEGACY: Record<string, Rating> = {
  very_interesting: "significant",
  interesting: "noteworthy",
  somewhat: "minor",
  not_interesting: "routine",
};

const LABELS: Record<BadgeRating, string> = {
  significant: "Significant",
  noteworthy: "Noteworthy",
  minor: "Minor",
  routine: "Routine",
  skipped: "Skipped",
};

// Three visual tiers mirroring the iOS app (Theme.ratingColor + ratingBadge):
//   significant → FILLED: solid brown bg, contrasting label, filled check
//   noteworthy  → OUTLINED: transparent bg, brown label, outline check
//   minor/routine/skipped → soft tint, no icon
// Base colours match iOS: sig #6b2f0a / dark #e8a878; note #4a3520 / dark #c4a882;
// minor #7e766c; routine #b0a898.
//
// Tint + label colour only. Every tier's hairline now derives from its own
// label colour via CHIP_HAIRLINE, which is what lets the quiet tiers keep a
// defined edge without a per-tier border table — the filled top tier is the
// one exception (see BORDER below).
const STYLES: Record<BadgeRating, string> = {
  significant: "bg-[#6b2f0a] text-white dark:bg-[#e8a878] dark:text-[#3a1d08]",
  noteworthy: "bg-transparent text-[#4a3520] dark:text-[#c4a882]",
  minor: "bg-[#7e766c]/12 text-[#7e766c]",
  routine: "bg-[#b0a898]/12 text-[#b0a898]",
  skipped: "bg-transparent text-[#a89e8c] dark:text-foreground/40",
};

// Only the filled tier opts out of the currentColor hairline: its label is
// white (or near-black in dark mode), so a 25% rim would read as an inner
// highlight rather than an edge.
const BORDER: Record<BadgeRating, string> = {
  significant: CHIP_HAIRLINE_FILLED,
  noteworthy: CHIP_HAIRLINE,
  minor: CHIP_HAIRLINE,
  routine: CHIP_HAIRLINE,
  skipped: CHIP_HAIRLINE,
};

// Check-circle icon per tier — filled for significant, outline for noteworthy,
// none for the quieter tiers (mirrors iOS checkmark.circle.fill / .circle).
const ICON: Partial<Record<BadgeRating, "solid" | "outline">> = {
  significant: "solid",
  noteworthy: "outline",
};

// Size steps down by tier so the badge's physical prominence tapers evenly
// significant → noteworthy → minor → routine → skipped, reinforcing the
// colour gradient above.
//
// These used to be fixed md:w-28/24/20/16/14 boxes with md:px-0, which is why
// a long label like SIGNIFICANT ran flush to the pill's edge — there was no
// side padding to give, only a width the label had to fit inside. They're now
// the shared CHIP_SIZE steps, so a rating badge is padded exactly like every
// other chip and sizes to its own label. The Action column loses its uniform
// width blocks; the tier still reads from type size, colour and icon.
const SIZES: Record<BadgeRating, ChipSize> = {
  significant: "lg",
  noteworthy: "md",
  minor: "sm",
  routine: "sm",
  skipped: "sm",
};

export function RatingBadge({
  rating,
  className,
}: {
  rating: BadgeRating;
  className?: string;
}) {
  const normalized: BadgeRating = LEGACY[rating as string] ?? rating;
  const icon = ICON[normalized];

  return (
    <span
      className={clsx(
        CHIP_BASE,
        BORDER[normalized] ?? CHIP_HAIRLINE,
        CHIP_SIZE[SIZES[normalized] ?? "sm"],
        STYLES[normalized] ?? "bg-neutral-500/15 text-neutral-400",
        className,
      )}
    >
      {icon === "solid" && (
        <CheckCircleSolidIcon aria-hidden className="h-3 w-3 shrink-0" />
      )}
      {icon === "outline" && (
        <CheckCircleOutlineIcon aria-hidden className="h-3 w-3 shrink-0" />
      )}
      {LABELS[normalized] ?? rating}
    </span>
  );
}
