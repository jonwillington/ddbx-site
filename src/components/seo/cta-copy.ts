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
    body: "You now know the pattern. The app spots matching disclosures the day they file and pushes them to you.",
  };
}

/** Glossary index — the contents page has no single term to name. */
export const learnIndexCta = {
  headline: "Learn the pattern, then watch it live.",
  body: "The glossary explains the filings. The app shows you today’s: every rated buy the day it’s disclosed.",
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
    body: "This page is a twelve-month look back. The app is the live version, each new buy pushed the day it files, so the table above never goes stale on you.",
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
      body: "Buys this size still file every month. The app tells you the day each one lands, before it's a row on a year-end list.",
    };
  }

  return {
    headline: "The next one on this list will buzz your phone.",
    body: "This ranking is history by the time you read it. The app pushes a buy this size the day it files.",
  };
}

/** Monthly report archive — index or a single month. */
export const reportsCta = {
  headline: "Read next month’s report the day it lands.",
  body: "The archive is the record. The app is the running commentary, every disclosure as it files, plus the recap when the month closes.",
};

/** Company index — the hub for several hundred issuer pages. */
export function companiesCta(marketId: "uk" | "us" = "uk"): {
  headline: string;
  body: string;
} {
  const who = marketId === "us" ? "insider" : "director";

  return {
    headline: "Every company on this index, watched for you.",
    body: `You can check this list, or the app can watch it, a push the day any ${who} on it buys, already rated.`,
  };
}

/** A Congress member page. `name` is the member's, already formatted.
 *
 *  The one family whose ask has to be written defensively. Every other CTA here
 *  can promise to tell you when someone buys; on a page about a named
 *  legislator that framing tips into "follow this politician's trades", which
 *  is both a claim we do not make and a tone that turns a public-record page
 *  into a tip sheet. So the ask is about the FILING arriving, not about the
 *  person being worth following, and it names the disclosure lag — the one
 *  genuinely useful thing the app does here, since a PTR can land 45 days after
 *  the trade and nobody watching a website will catch it the day it posts. */
export function congressMemberCta(name: string): {
  headline: string;
  body: string;
} {
  return {
    headline: `Know when ${name} files, not weeks later.`,
    body: "Congressional filings can arrive up to 45 days after the trade and are published without notice. The app picks up each new disclosure the day it posts, with the committee context attached.",
  };
}

/** The member directory and the committee pages. */
export const congressIndexCta = {
  headline: "Every congressional filing, the day it posts.",
  body: "This directory is the record to date. The app watches the House Clerk and Senate feeds directly, so a new disclosure reaches you without you checking anything.",
};

/** Best-performing buys. The ask is deliberately the opposite of the page's
 *  subject: everything ranked here is already priced in, so the promise is
 *  about the next one rather than about repeating these. */
export const performanceBoardCta = {
  headline: "These already happened. The next ones haven’t.",
  body: "A purchase needs months on the clock before it can appear on a board like this. The app tells you the day one files, which is the only point at which the information is worth anything.",
};

/** Most-active companies. */
export const activityBoardCta = {
  headline: "Watch a company and hear about every buy in it.",
  body: "This board is a twelve-month count. In the app you can follow any of these companies and get each new disclosure as it files, with the rating attached.",
};

/** Cluster buying — the one board whose subject is a live signal rather than a
 *  retrospective, so the ask names the mechanism. */
export const clusterBoardCta = {
  headline: "Clusters are only useful while they’re forming.",
  body: "The app marks a cluster the moment the second insider files, not once it’s finished and sitting on a leaderboard. That is usually weeks earlier than a page like this can show it.",
};

/** Role hubs — index or a single role. */
export function roleCta(plural?: string): {
  headline: string;
  body: string;
} {
  return {
    headline: plural
      ? `Know when ${plural.toLowerCase()} buy, the day they file.`
      : "Know who’s buying, the day they file.",
    body: "This page is the last twelve months. The app pushes each new disclosure as it lands, with the buyer’s role and the six checks already applied.",
  };
}

/** Broker guides — deliberately quiet (`media: "none"`): these pages already
 *  carry an affiliate ask, and a phone screenshot next to a "visit broker"
 *  button is two competing asks in one viewport. */
export const brokerGuideCta = {
  headline: "See which directors are buying, on whichever platform you pick.",
  body: "ddbx records every disclosed director purchase and rates the ones that matter. Whichever broker you open an account with, the app tells you what insiders are doing the day they do it.",
};
