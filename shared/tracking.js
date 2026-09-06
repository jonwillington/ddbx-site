/** Coverage floor for look-back SEO pages (sectors, leaderboards, reports).
 *
 *  Plain ESM so Pages Functions and the SPA share one sentence. The React
 *  `TrackingNotice` / `StageNotice` components and every pre-render that
 *  claims "twelve months" must read from here — otherwise the crawler and the
 *  reader disagree about how much history we actually hold.
 */

/** First calendar year with stored filings. */
export const TRACKING_SINCE_YEAR = 2026;

/** Human form used in the notice copy. The UK value, which is also the
 *  default. Update with TRACKING_SINCE_YEAR if the backfill ever reaches
 *  further back. */
export const TRACKING_SINCE_LABEL = "March 2026";

/** The label is not global: the markets came online at different times, and
 *  a US board that says "March 2026" claims two months of filings we never
 *  recorded. Keyed by lower-case market id; anything unlisted falls back to
 *  the UK label. Dates are the first stored disclosure per market as read
 *  from the coverage endpoint (src/lib/coverage.ts holds the snapshot). NL's
 *  one-off historical load is deliberately not here — that page says
 *  "records from", never "tracking since". */
export const TRACKING_SINCE_LABEL_BY_MARKET = {
  uk: TRACKING_SINCE_LABEL,
  us: "May 2026",
  usg: "May 2026",
  djt: "May 2026",
  se: "May 2026",
};

/** First day of the first month with stored filings. Time axes start here
 *  rather than twelve months back: half a chart of empty months before the
 *  first filing reads as a quiet market, not as a young archive. */
export const TRACKING_SINCE_DATE = "2026-03-01";

/** The label for a market, defaulting to UK. Accepts either case. */
export function trackingSinceLabel(marketId) {
  const key = String(marketId ?? "uk").toLowerCase();

  return TRACKING_SINCE_LABEL_BY_MARKET[key] ?? TRACKING_SINCE_LABEL;
}

/** The honesty line, for a market. Identical wording on every consumer on
 *  purpose; only the month changes. */
export function trackingNotice(marketId) {
  return `ddbx started recording disclosures in ${trackingSinceLabel(marketId)}, so periods described as a full year cover only the filings since then.`;
}

/** The UK sentence, kept for the consumers that predate the per-market form. */
export const TRACKING_NOTICE = trackingNotice("uk");
