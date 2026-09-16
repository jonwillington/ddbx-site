// The UK insider directory: one publishing bar, shared by the pre-render
// Function and the sitemap.
//
// Both have to apply the SAME test. The Congress family learned this first —
// see the note on `congressEntries` in functions/sitemap.xml.js: a URL that is
// advertised in the sitemap and then arrives carrying a noindex is worse than
// one that was never advertised, because it spends crawl budget to tell Google
// we did not mean it. So the bar lives here and nothing computes its own.
//
import { cleanCompanyName } from "./sectors.js";

// Data comes from GET /api/directors-index (one row per PERSON, spellings
// already pooled). Not /api/directors — that path is swallowed by
// /api/directors/:id in the Worker and answers "not found".

/** Publishable open-market buys a director needs before we advertise them.
 *
 *  Two, not one. A single-purchase page is a date, a price and four "not
 *  enough data yet" slots: honest for a reader who clicked through from that
 *  filing, and a poor landing page for someone who has never heard of ddbx —
 *  which is precisely who a sitemap entry invites. Two purchases is the point
 *  at which the page is about a PATTERN rather than about one trade. */
export const MIN_DIRECTOR_BUYS = 2;

/** …and at least one purchase whose horizon has resolved, so the page can
 *  state a return at all. Returns are measured at 90 days minimum, so a
 *  director who filed twice last month still has nothing to show and correctly
 *  says so. That page should exist — it does, and it resolves — but it should
 *  not be advertised as an answer to a search. */
export const MIN_DIRECTOR_RESOLVED = 1;

/** The bar, applied identically by the pre-render and the sitemap.
 *
 *  At the time of writing this publishes ~99 of 778 directors. That ratio is
 *  meant to rise on its own: horizons resolve with time, so the qualifying
 *  population grows without anyone changing this file. If it needs loosening
 *  later, loosen it HERE. */
export const directorMeetsBar = (d) =>
  !!d &&
  (d.buys ?? 0) >= MIN_DIRECTOR_BUYS &&
  (d.resolved ?? 0) >= MIN_DIRECTOR_RESOLVED;

/** Canonical path for a director page.
 *
 *  `/directors/:id` is the UK alias kept for back-compat; `/:market/directors/:id`
 *  is canonical for every other market. Ids are already URL-safe
 *  ("dir-hendrik-du-toit"), so unlike the Congress family there is no slug to
 *  build and nothing to keep in sync. */
export function directorPath(id, market = "uk") {
  const seg = encodeURIComponent(String(id ?? ""));

  return market && market !== "uk"
    ? `/${market}/directors/${seg}`
    : `/directors/${seg}`;
}

/** Ticker -> company-page slug. Mirrors `tickerToSlug` in src/lib/company.ts,
 *  which the app uses and the Functions cannot import — same reason
 *  `cleanCompanyName` is mirrored in shared/sectors.js. UK tickers are stored
 *  with the LSE's `.L` suffix and the slug drops it. */
export function companySlug(ticker) {
  return String(ticker ?? "").replace(/\.L$/i, "").toLowerCase();
}

/** The directory hub. */
export const DIRECTORS_INDEX_PATH = "/directors";

/** Rows to print in the pre-rendered filings table. The hydrated page shows
 *  every filing; a crawler needs enough to establish what the page is, not a
 *  duplicate of the whole list. */
export const DIRECTOR_ROWS = 12;

/** How many directors the index page lists. The rest are reachable from their
 *  own filings; the hub exists to give the crawler a path in, not to be a
 *  complete register. */
export const INDEX_ROWS = 200;

/** One line describing what this person's record is, in the same words the
 *  page uses. Shared so the crawler and the reader are told the same thing. */
export function directorLeadSentence(d) {
  if (!d) return "";
  // The API returns company names with the ticker appended
  // ("Ninety One (N91)"), which reads as a database field in a sentence.
  const where = d.company ? ` at ${cleanCompanyName(d.company)}` : "";
  const buys = `${d.buys} disclosed open-market ${d.buys === 1 ? "purchase" : "purchases"}`;
  const resolved =
    d.resolved > 0
      ? `${d.resolved} of them held long enough to measure a return`
      : "none held long enough to measure a return yet";

  return `${d.name}${where}: ${buys}, ${resolved}.`;
}

/** Sentence for the figure a director page leads on, or null when there is no
 *  figure to state. Mirrors MIN_RESOLVED_FOR_RATE on the React page: a rate
 *  over a handful of purchases is an anecdote with a percent sign on it, so the
 *  pre-render withholds it exactly where the page does. Gated on the BENCHMARK
 *  count, because the figure it introduces is the beat rate. */
export const MIN_RESOLVED_FOR_RATE = 4;

export function directorRateSentence(d) {
  if (!d || (d.benchmarked ?? 0) < MIN_RESOLVED_FOR_RATE) return null;

  return `Across ${d.benchmarked} purchases whose horizon has resolved.`;
}
