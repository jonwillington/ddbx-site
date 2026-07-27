// Month formatting and the recap URL slug, shared between the app and the edge.
//
// These four functions were already correct in
// src/components/monthly/monthly-utils.ts. They move here because the report
// pre-render (functions/reports/[month].js) has to turn "may-2026" back into
// "2026-05" to call the API, and Pages Functions can't import .ts or resolve
// the "@/" alias. Duplicating the parser into the Function is how the URL shape
// and the route quietly drift apart — a slug the SPA accepts but the crawler
// pre-render rejects would serve an empty shell to search engines and a full
// page to everyone else, which is the one failure mode a pre-render exists to
// prevent.
//
// monthly-utils.ts now re-exports from here, so there is still one definition
// and every existing import keeps working.
//
// It also holds REPORT_CONTENTS, the archive's "what's in every report"
// explainer, for the same reason: the page and the pre-render have to state it
// word for word, and two copies of a five-entry prose block is a drift waiting
// to happen.

export const MONTH_NAMES = [
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

/** "2026-05" → "May 2026". Falls back to the raw string if unparseable. */
export function monthLabel(month) {
  if (!month) return "";
  const [y, m] = String(month).split("-").map(Number);

  if (!y || !m || m < 1 || m > 12) return month;

  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** Short month name only: "2026-05" → "May". */
export function monthShort(month) {
  if (!month) return "";
  const m = Number(String(month).split("-")[1]);

  return m >= 1 && m <= 12 ? MONTH_NAMES[m - 1] : month;
}

/** URL slug for the recap deep-link: "2026-05" → "may-2026". Falls back to the
 *  raw string if unparseable. Paired with {@link slugToMonth}. */
export function monthSlug(month) {
  if (!month) return "";
  const [y, m] = String(month).split("-").map(Number);

  if (!y || !m || m < 1 || m > 12) return month;

  return `${MONTH_NAMES[m - 1].toLowerCase()}-${y}`;
}

/** Inverse of {@link monthSlug}: "may-2026" → "2026-05". Returns null when the
 *  slug isn't a valid month-year so a junk URL just doesn't open a report. */
export function slugToMonth(slug) {
  if (!slug) return null;
  const match = String(slug).match(/^([a-z]+)-(\d{4})$/i);

  if (!match) return null;
  const idx = MONTH_NAMES.findIndex(
    (n) => n.toLowerCase() === match[1].toLowerCase(),
  );

  if (idx < 0) return null;

  return `${match[2]}-${String(idx + 1).padStart(2, "0")}`;
}

/** Canonical path for a month's report. The archive lives at /reports/<slug>;
 *  /report/<slug> (singular) is the older deep-link that opens the recap as a
 *  modal over the market home and canonicalises here. */
export function reportPath(month) {
  return `/reports/${monthSlug(month)}`;
}

/** What a reader gets for the click on /reports. Every line names something the
 *  report page actually renders — the metrics band, the report card, the
 *  featured write-ups, the sector and style tables, the cluster roster.
 *
 *  Read by both src/pages/reports.tsx and functions/reports/index.js so the
 *  crawler and the reader are given the same explainer. */
export const REPORT_CONTENTS = [
  {
    label: "The month in numbers",
    description:
      "How many purchases were disclosed, what they were worth, and how many companies and individual insiders they covered.",
  },
  {
    label: "A report card on the last one",
    description:
      "Every buy we featured the previous month, re-marked against the latest close — the ones that went wrong published beside the ones that didn’t.",
  },
  {
    label: "The standout buys, written up",
    description:
      "A handful of purchases in full: what happened, whether the value has already gone, and whether there is still a case.",
  },
  {
    label: "Where the money went",
    description:
      "The month split by sector and by buy style, with the median return and the median alpha against the benchmark for each slice.",
  },
  {
    label: "Clusters",
    description:
      "The companies where two or more insiders bought in the same month — the pattern that reads least like a one-off.",
  },
];
