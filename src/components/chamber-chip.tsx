/** Chamber chip for Congress rows — House / Senate. Neutral styling (the party
 *  chip already carries the blue/red, so chamber stays monochrome to avoid
 *  colour overload). Same rounded-md/px-2/text-[11px] family as PartyChip /
 *  ClusterChip so the chips read as siblings. Returns null when chamber is
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
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md border border-foreground/20 bg-foreground/[0.04] px-2 py-0.5 text-[11px] font-medium text-foreground/60 ${className}`}
    >
      {label}
    </span>
  );
}
