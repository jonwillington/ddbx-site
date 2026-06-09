import type { Rating } from "@/lib/api";

import { CheckCircleIcon as CheckCircleSolidIcon } from "@heroicons/react/20/solid";
import { CheckCircleIcon as CheckCircleOutlineIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

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
//   significant → FILLED: solid brown bg, white label, filled check, no border
//   noteworthy  → OUTLINED: transparent bg, brown label + 1px border, outline check
//   minor/routine/skipped → soft tint: 12% bg, no icon, no border
// Base colours match iOS: sig #6b2f0a / dark #e8a878; note #4a3520 / dark #c4a882;
// minor #7e766c; routine #b0a898.
const STYLES: Record<BadgeRating, string> = {
  significant:
    "bg-[#6b2f0a] text-white border-transparent dark:bg-[#e8a878] dark:text-[#3a1d08]",
  noteworthy:
    "bg-transparent text-[#4a3520] border-[#4a3520] dark:text-[#c4a882] dark:border-[#c4a882]",
  minor: "bg-[#7e766c]/12 text-[#7e766c] border-transparent font-normal",
  routine: "bg-[#b0a898]/12 text-[#b0a898] border-transparent font-normal",
  skipped:
    "bg-transparent text-[#a89e8c] border-[#d8d0c6]/45 font-normal dark:text-foreground/40",
};

// Check-circle icon per tier — filled for significant, outline for noteworthy,
// none for the quieter tiers (mirrors iOS checkmark.circle.fill / .circle).
const ICON: Partial<Record<BadgeRating, "solid" | "outline">> = {
  significant: "solid",
  noteworthy: "outline",
};

// Size steps down by tier so the badge's physical prominence tapers evenly
// significant → noteworthy → minor → routine → skipped, reinforcing the
// colour/weight gradient above. Drives the mobile pill text and the md+ boxed
// badge's width / padding / text. (The Today cards force their own compact
// size via `!`-important overrides, so this only shapes the table/drawer
// badges.)
const SIZES: Record<BadgeRating, string> = {
  significant: "text-[10px] md:w-28 md:py-1.5 md:text-[13px]",
  noteworthy: "text-[10px] md:w-24 md:py-1 md:text-xs",
  minor: "text-[10px] md:w-20 md:py-0.5 md:text-[11px]",
  routine: "text-[9px] md:w-16 md:py-0.5 md:text-[10px]",
  skipped: "text-[9px] md:w-14 md:py-0.5 md:text-[10px]",
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
        // Mobile: a light auto-width pill so it reads as a tag, not a block.
        // md+: a fixed-width boxed badge. Size (width/padding/text) comes from
        // SIZES so it tapers by tier.
        "inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 font-medium md:px-0 md:font-semibold",
        STYLES[normalized] ??
          "bg-neutral-500/15 text-neutral-400 border-neutral-500/30",
        SIZES[normalized],
        className,
      )}
    >
      {icon === "solid" && (
        <CheckCircleSolidIcon className="h-3 w-3 shrink-0" aria-hidden />
      )}
      {icon === "outline" && (
        <CheckCircleOutlineIcon
          className="h-3 w-3 shrink-0"
          aria-hidden
        />
      )}
      {LABELS[normalized] ?? rating}
    </span>
  );
}
