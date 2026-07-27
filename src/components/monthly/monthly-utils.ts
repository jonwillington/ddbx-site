// Shared presentation helpers for the monthly recap surface. Mirrors the
// deterministic styling rules the iOS MonthlyRetroView uses so a badge can
// never contradict the number behind it.

import type { MonthlyFeatureReason, MonthlyItemSentiment } from "@/types/ddbx";

// monthLabel / monthSlug / slugToMonth / monthShort moved to shared/months.js
// so the report pre-render Function can parse the same URL slug this module
// generates — Pages Functions can't import .ts or resolve the "@/" alias, and a
// second copy of the parser is how the route and the crawler's view of it drift
// apart. Re-exported here so every existing import site is untouched.
export {
  monthLabel,
  monthShort,
  monthSlug,
  reportPath,
  slugToMonth,
} from "../../../shared/months.js";

/** Sort key so featured cards read positive → neutral → negative, matching
 *  the iOS ordering. */
export function sentimentOrder(s: MonthlyItemSentiment): number {
  return s === "positive" ? 0 : s === "neutral" ? 1 : 2;
}

/** Tailwind text colour for a return value, using the site's canonical
 *  positive/negative tokens. null → muted.
 *
 *  These were four bracketed hexes (#1e6b18 / #5cd84a / #8b2020 / #e84d4d) —
 *  which are exactly the light and dark values `--positive` / `--negative`
 *  carry, so the token form renders identically and stops this module drifting
 *  the day the palette moves. */
export function returnTextClass(ratio: number | null | undefined): string {
  if (ratio == null || ratio === 0) return "text-muted";

  return ratio > 0 ? "text-positive" : "text-negative";
}

/** Human label + tint for the "why featured" award badge. */
export function featureBadge(reason: MonthlyFeatureReason): {
  label: string;
  className: string;
} {
  switch (reason) {
    case "best_performer":
      return {
        label: "Top performer",
        className: "bg-positive/12 text-positive dark:bg-positive/15",
      };
    case "worst_performer":
      return {
        label: "Biggest faller",
        className: "bg-negative/12 text-negative dark:bg-negative/15",
      };
    case "spike_faded":
      return {
        label: "Spike faded",
        className: "bg-negative/10 text-negative dark:bg-negative/12",
      };
    case "cluster":
      return {
        label: "Cluster buy",
        className:
          "bg-brand-brown/12 text-brand-brown dark:bg-brand-tan/15 dark:text-brand-tan",
      };
    case "most_interesting":
    default:
      return {
        label: "Most interesting",
        className:
          "bg-brand-brown/12 text-brand-brown dark:bg-brand-tan/15 dark:text-brand-tan",
      };
  }
}

/** Minimal inline `**bold**` renderer. The narrative fields carry light
 *  markdown emphasis only; anything else is shown verbatim. Returns an array
 *  of strings / <strong> nodes ready to splat into JSX. */
export function renderBold(text: string): (string | { bold: string })[] {
  const out: (string | { bold: string })[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    out.push({ bold: match[1] });
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));

  return out;
}
