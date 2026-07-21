import { chip } from "@/components/chip";

/** Party affiliation chip for Congress rows — Dem (blue) / Rep (red) / Ind
 *  (neutral). Shape and label treatment come from CHIP_BASE / CHIP_LABEL so the
 *  name-column chips read as siblings. Returns null when party is unknown
 *  (unresolved filer), so callers can drop it in unconditionally. */

type Party = "D" | "R" | "I";

// Tint + label colour only — the hairline derives from the label via
// CHIP_HAIRLINE, so each party gets its own border for free.
const STYLE: Record<Party, string> = {
  D: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  R: "bg-red-500/10 text-red-700 dark:text-red-300",
  I: "bg-foreground/5 text-foreground/60",
};

const LABEL: Record<Party, string> = { D: "Dem", R: "Rep", I: "Ind" };

export function PartyChip({
  party,
  className = "",
}: {
  party?: string | null;
  className?: string;
}) {
  if (party !== "D" && party !== "R" && party !== "I") return null;

  return (
    <span className={`${chip()} ${STYLE[party]} ${className}`}>
      {LABEL[party]}
    </span>
  );
}
