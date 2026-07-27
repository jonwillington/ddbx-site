/** Coverage floor for look-back SEO pages (sectors, leaderboards, reports).
 *
 *  Plain ESM so Pages Functions and the SPA share one sentence. The React
 *  `TrackingNotice` component and every pre-render that claims "twelve months"
 *  must read from here — otherwise the crawler and the reader disagree about
 *  how much history we actually hold.
 */

/** First calendar year with stored filings. */
export const TRACKING_SINCE_YEAR = 2026;

/** Human form used in the notice copy. Update with TRACKING_SINCE_YEAR if the
 *  backfill ever reaches further back. */
export const TRACKING_SINCE_LABEL = "March 2026";

/** The honesty line. Identical on every consumer on purpose. */
export const TRACKING_NOTICE = `ddbx started recording disclosures in ${TRACKING_SINCE_LABEL}, so periods described as a full year cover only the filings since then.`;
