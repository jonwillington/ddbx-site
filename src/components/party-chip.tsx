/** Party affiliation chip for Congress rows — Dem (blue) / Rep (red) / Ind
 *  (neutral). Same rounded-md/px-2/text-[11px] shape as ClusterChip so the
 *  name-column chips read as siblings. Returns null when party is unknown
 *  (unresolved filer), so callers can drop it in unconditionally. */

type Party = "D" | "R" | "I";

const STYLE: Record<Party, string> = {
  D: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  R: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  I: "border-foreground/20 bg-foreground/5 text-foreground/60",
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
    <span
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium ${STYLE[party]} ${className}`}
    >
      {LABEL[party]}
    </span>
  );
}
