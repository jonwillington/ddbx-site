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
