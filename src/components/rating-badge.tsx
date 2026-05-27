import type { Rating } from "@/lib/api";

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

const STYLES: Record<BadgeRating, string> = {
  significant:
    "bg-[#8b4513]/18 text-[#6b2f0a] border-[#8b4513]/40 font-bold dark:bg-[#d4845a]/15 dark:text-[#e8a878] dark:border-[#d4845a]/35",
  noteworthy:
    "bg-[#6b5038]/14 text-[#4a3520] border-[#6b5038]/35 dark:bg-[#b8956e]/12 dark:text-[#c4a882] dark:border-[#b8956e]/30",
  minor: "bg-[#c0b4a6]/10 text-[#7e766c] border-[#c0b4a6]/40 font-normal",
  routine: "bg-transparent text-[#b0a898] border-[#d8d0c6]/60 font-normal",
  skipped:
    "bg-transparent text-[#a89e8c] border-[#d8d0c6]/45 font-normal dark:text-foreground/40",
};

// Size steps down by tier so the badge's physical prominence tapers evenly
// significant → noteworthy → minor → routine → skipped, reinforcing the
// colour/weight gradient above. Drives the mobile pill text and the md+ boxed
// badge's width / padding / text. (The Today cards force their own compact
// size via `!`-important overrides, so this only shapes the table/drawer
// badges.)
const SIZES: Record<BadgeRating, string> = {
  significant: "text-[11px] md:w-32 md:py-2 md:text-sm",
  noteworthy: "text-[11px] md:w-28 md:py-1.5 md:text-[13px]",
  minor: "text-[10px] md:w-24 md:py-1 md:text-xs",
  routine: "text-[10px] md:w-20 md:py-1 md:text-[11px]",
  skipped: "text-[10px] md:w-16 md:py-0.5 md:text-[10px]",
};

export function RatingBadge({
  rating,
  className,
}: {
  rating: BadgeRating;
  className?: string;
}) {
  const normalized: BadgeRating = LEGACY[rating as string] ?? rating;

  return (
    <span
      className={clsx(
        // Mobile: a light auto-width pill so it reads as a tag, not a block.
        // md+: a fixed-width boxed badge. Size (width/padding/text) comes from
        // SIZES so it tapers by tier.
        "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 font-medium md:rounded-md md:px-0 md:font-semibold",
        STYLES[normalized] ??
          "bg-neutral-500/15 text-neutral-400 border-neutral-500/30",
        SIZES[normalized],
        className,
      )}
    >
      {LABELS[normalized] ?? rating}
    </span>
  );
}
