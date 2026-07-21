import { chip } from "@/components/chip";

/** Chamber chip for Congress rows — House / Senate. Neutral styling (the party
 *  chip already carries the blue/red, so chamber stays monochrome to avoid
 *  colour overload). Shape and label treatment come from CHIP_BASE /
 *  CHIP_LABEL so the chips read as siblings. Returns null when chamber is
 *  unknown, so callers can drop it in unconditionally. */

const LABEL: Record<string, string> = { house: "House", senate: "Senate" };

export function ChamberChip({
  chamber,
  className = "",
}: {
  chamber?: string | null;
  className?: string;
}) {
  const label = chamber ? LABEL[chamber] : undefined;

  if (!label) return null;

  return (
    <span
      className={`${chip()} bg-foreground/[0.04] text-foreground/60 ${className}`}
    >
      {label}
    </span>
  );
}
