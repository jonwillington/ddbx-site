/** Default `AppCtaBand` copy per SEO page family.
 *
 *  Kept beside the component rather than inline at each call site so a page can
 *  terminate itself in two props, and so the copy across ~200 generated URLs
 *  can be retuned in one edit. Every line is written to follow the specific
 *  page it ends: the reader has just been told what a closed period is, or
 *  which sector directors are buying — the ask names that, then says what the
 *  app does that the page cannot.
 *
 *  House style (canonical rules: `HOUSE_STYLE_RULES` in
 *  ../ddbx-data/worker/llm/prompts.ts): plain, specific, no hype, no promise
 *  about returns. The app's claim is timeliness and completeness, never
 *  performance.
 */

/** Glossary entry. `term` is the entry's own noun ("a closed period"). */
export function learnCta(term: string): { headline: string; body: string } {
  return {
    headline: `Stop reading about ${term}. Get told when it happens.`,
    body: "Every disclosure lands in the app the day it files — rated, argued both ways, with the price history already attached. No filing feed to babysit.",
  };
}

/** Sector hub — index or a single sector. */
export function sectorCta(sector?: string): {
  headline: string;
  body: string;
} {
  return {
    headline: sector
      ? `Follow ${sector} insiders in real time.`
      : "Follow these insiders in real time.",
    body: "This page is a twelve-month look back. The app is the live version: every new disclosure pushed the day it files, with the analysis attached.",
  };
}

/** Biggest-buys leaderboard. */
export const leaderboardCta = {
  headline: "The next one on this list will buzz your phone.",
  body: "This ranking is history. The app tells you the day a buy this size files — with the rating, the full thesis and the price history already attached.",
};

/** Monthly report archive — index or a single month. */
export const reportsCta = {
  headline: "Read next month's report the day it lands.",
  body: "The archive is the record. The app is the running commentary: every rated disclosure as it files, plus the recap when the month closes.",
};
