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
 *  positive/negative palette (see performance-chart.tsx). null → muted. */
export function returnTextClass(ratio: number | null | undefined): string {
  if (ratio == null || ratio === 0) return "text-muted";

  return ratio > 0
    ? "text-[#1e6b18] dark:text-[#5cd84a]"
    : "text-[#8b2020] dark:text-[#e84d4d]";
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
        className:
          "bg-[#1e6b18]/12 text-[#1e6b18] dark:bg-[#5cd84a]/15 dark:text-[#5cd84a]",
      };
    case "worst_performer":
      return {
        label: "Biggest faller",
        className:
          "bg-[#8b2020]/12 text-[#8b2020] dark:bg-[#e84d4d]/15 dark:text-[#e84d4d]",
      };
    case "spike_faded":
      return {
        label: "Spike faded",
        className:
          "bg-[#8b2020]/10 text-[#8b2020] dark:bg-[#e84d4d]/12 dark:text-[#e84d4d]",
      };
    case "cluster":
      return {
        label: "Cluster buy",
        className:
          "bg-[#5a4128]/12 text-[#5a4128] dark:bg-[#ad9479]/15 dark:text-[#ad9479]",
      };
    case "most_interesting":
    default:
      return {
        label: "Most interesting",
        className:
          "bg-[#5a4128]/12 text-[#5a4128] dark:bg-[#ad9479]/15 dark:text-[#ad9479]",
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
