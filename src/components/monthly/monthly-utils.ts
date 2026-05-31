// Shared presentation helpers for the monthly recap surface. Mirrors the
// deterministic styling rules the iOS MonthlyRetroView uses so a badge can
// never contradict the number behind it.

import type { MonthlyFeatureReason, MonthlyItemSentiment } from "@/types/ddbx";

/** "2026-05" → "May 2026". Falls back to the raw string if unparseable. */
export function monthLabel(month: string | null | undefined): string {
  if (!month) return "";
  const [y, m] = month.split("-").map((p) => Number(p));

  if (!y || !m || m < 1 || m > 12) return month;

  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** URL slug for the recap deep-link: "2026-05" → "may-2026". Falls back to the
 *  raw string if unparseable. Paired with {@link slugToMonth}. */
export function monthSlug(month: string | null | undefined): string {
  if (!month) return "";
  const [y, m] = month.split("-").map((p) => Number(p));

  if (!y || !m || m < 1 || m > 12) return month;

  return `${MONTH_NAMES[m - 1].toLowerCase()}-${y}`;
}

/** Inverse of {@link monthSlug}: "may-2026" → "2026-05". Returns null when the
 *  slug isn't a valid month-year so a junk URL just doesn't open a report. */
export function slugToMonth(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const match = slug.match(/^([a-z]+)-(\d{4})$/i);

  if (!match) return null;
  const idx = MONTH_NAMES.findIndex(
    (n) => n.toLowerCase() === match[1].toLowerCase(),
  );

  if (idx < 0) return null;

  return `${match[2]}-${String(idx + 1).padStart(2, "0")}`;
}

/** Short month name only: "2026-05" → "May". */
export function monthShort(month: string | null | undefined): string {
  if (!month) return "";
  const m = Number(month.split("-")[1]);

  return m >= 1 && m <= 12 ? MONTH_NAMES[m - 1] : month;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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
