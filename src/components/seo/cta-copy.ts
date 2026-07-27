/** Default `AppCtaBand` copy per SEO page family.
 *
 *  Kept beside the component rather than inline at each call site so a page can
 *  terminate itself in two props, and so the copy across ~200 generated URLs
 *  can be retuned in one edit. Every line is written to follow the specific
 *  page it ends: the reader has just been told what a closed period is, or
 *  which sector directors are buying — the ask names that, then says what the
 *  app does that the page cannot.
 *
 *  One rule the first draft broke: the bodies must not converge. Four families
 *  once shared the same three-beat sentence ("this page is history → the app
 *  is live → rated, with the price history attached"), which read as one
 *  sentence written four times to anyone who visits two pages. Each body now
 *  makes a different secondary claim: the glossary sells recognition, the
 *  sectors sell the live feed, the leaderboard sells scale-triggered alerts,
 *  the reports sell the recap cycle.
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
    body: "You now know the pattern. The app spots it for you: every disclosure that matches lands as a push, rated, with the reasoning written out.",
  };
}

/** Glossary index — the contents page has no single term to name. */
export const learnIndexCta = {
  headline: "Learn the pattern, then watch it live.",
  body: "The glossary explains the filings. The app shows you today’s — every director buy rated the day it’s disclosed, with the thesis attached.",
};

/** Sector hub — index or a single sector. */
export function sectorCta(sector?: string): {
  headline: string;
  body: string;
} {
  return {
    headline: sector
      ? `Follow ${sector} insiders in real time.`
      : "Follow these insiders in real time.",
    body: "This page is a twelve-month look back. The app is the live version — each new buy pushed the day it files, already rated, so the table above never goes stale on you.",
  };
}

/** Biggest-buys leaderboard. Pass the year on archive boards — a closed year
 *  can't honestly promise "the next one on this list". */
export function leaderboardCta(year?: number | string): {
  headline: string;
  body: string;
} {
  if (year != null) {
    return {
      headline: `The ${year} board is closed. The next one is being written now.`,
      body: "Buys this size still file every month. The app tells you the day each one lands — before it's a row on a year-end list.",
    };
  }

  return {
    headline: "The next one on this list will buzz your phone.",
    body: "This ranking is history by the time you read it. The app pushes a buy this size the day it files, with the rating and the full thesis.",
  };
}

/** Monthly report archive — index or a single month. */
export const reportsCta = {
  headline: "Read next month’s report the day it lands.",
  body: "The archive is the record. The app is the running commentary: every rated disclosure as it files, plus the recap when the month closes.",
};

/** Company index — the hub for several hundred issuer pages. */
export const companiesCta = {
  headline: "Every company on this index, watched for you.",
  body: "You can check this list, or the app can check it for you — a push the day any director on it buys, with the rating and the reasoning attached.",
};

/** Broker guides — deliberately quiet (`media: "none"`): these pages already
 *  carry an affiliate ask, and a phone screenshot next to a "visit broker"
 *  button is two competing asks in one viewport. */
export const brokerGuideCta = {
  headline: "See which directors are buying, on whichever platform you pick.",
  body: "ddbx records every disclosed director purchase and rates the ones that matter. Whichever broker you open an account with, the app tells you what insiders are doing the day they do it.",
};
