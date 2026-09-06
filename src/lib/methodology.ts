/** How ddbx turns a disclosure into a rating — the canonical description.
 *
 *  The six-point check is the whole product explanation, and until this file
 *  existed it was written out four separate times: the full-screen walkthrough
 *  (market-explainer-experience), the Congress-era drawer
 *  (market-explainer-sheet), the per-filing checklist inside a deal drawer
 *  (rating-checklist-view), and three loose paraphrases in prose. All four
 *  disagreed. "No alternative explanation" was a question in one, a noun in
 *  another and an entirely different sentence in the third — so a reader who
 *  saw the walkthrough and then opened a filing was shown two descriptions of
 *  the same test and had no way to know they were the same test.
 *
 *  So: one array, three shapes of text per check, and every surface picks the
 *  shape its layout wants rather than writing its own words.
 *
 *    label     — two or three words. Checklist rows, table legends, the
 *                pass/fail column. Matches the iOS RatingChecklist labels.
 *    question  — the same check asked. Walkthrough scene titles, and the
 *                headings on /how-it-works.
 *    body      — one or two sentences of plain prose. The shared explanation.
 *    detail    — why the check earns its place. Expandable rows, methodology.
 *    passLine  — narrates the verdict for one specific filing that cleared it.
 *
 *  ---------------------------------------------------------------------------
 *  Truth boundaries
 *  ---------------------------------------------------------------------------
 *
 *  The keys mirror `RatingChecklist` in ddbx-data/worker/db/types.ts and the
 *  order mirrors `CHECKLIST_KEYS` in worker/pipeline/analyze.ts — same order,
 *  same meaning, and the wording here has to stay true to what that prompt
 *  actually asks. If a check changes meaning in ddbx-data, it changes here in
 *  the same cycle or the site is describing a product that no longer exists.
 *
 *  The pipeline stages below are likewise descriptions of real behaviour, not
 *  marketing: the 15-minute cadence is the quarter-hourly cron in
 *  ddbx-data/wrangler.toml, the triage gate is worker/pipeline/triage.ts, the
 *  all-six-to-be-significant rule is the backstop in analyze.ts, and the
 *  source-URL requirement is `isEvidence()` in the same file. Nothing here
 *  claims a capability the pipeline doesn't have — see HOUSE_STYLE_RULES in
 *  ddbx-data/worker/llm/prompts.ts for why that matters more than it reads.
 */
/* The six checks now live in shared/methodology.js so the Pages Functions can
 * read them too — a pre-render that wrote its own labels would be the fifth
 * copy of a list this file exists to keep singular. Re-exported here so every
 * consumer of `@/lib/methodology` is unaffected. */
export type { CheckContext, MethodologyCheck } from "../../shared/methodology";
export {
  CHECKS,
  CHECK_COUNT,
  /** The same number, spelled, for running prose. Interpolating CHECK_COUNT
   *  into a sentence produces "the 6 checks" and "all 6", which is a numeral
   *  where house style — and ordinary English — wants a word. Use CHECK_COUNT
   *  only where a figure is genuinely wanted ("4/6 met"). */
  CHECK_COUNT_WORD,
} from "../../shared/methodology.js";

/** The four ratings, best first. Mirrors `RATINGS` in
 *  ddbx-data/worker/pipeline/analyze.ts. */
export const RATING_SCALE: { rating: string; meaning: string }[] = [
  {
    rating: "significant",
    meaning:
      "All six checks clear. The top of the scale, and deliberately hard to reach, a buy that misses even one is capped below this.",
  },
  {
    rating: "noteworthy",
    meaning:
      "Most of the picture holds up, but something is missing or ambiguous. Worth reading; not the strongest thing we saw that week.",
  },
  {
    rating: "minor",
    meaning:
      "A real purchase with a real decision behind it, but small, or by someone far enough from the business that it says little.",
  },
  {
    rating: "routine",
    meaning:
      "Disclosed, but not informative, the housekeeping that makes up most of what gets filed.",
  },
];

export interface PipelineStage {
  id: string;
  /** One-word node label for the diagram. */
  label: string;
  /** The stage as a sentence. Section headings on /how-it-works. */
  title: string;
  body: string;
  /** Quiet qualifier under the node — cadence, or what survives it. */
  meta: string;
}

/** Filing to rating, in six stages.
 *
 *  Ordered as the Worker actually runs them (scrape → classify → triage →
 *  analyse → rate → track). The narrowing is the point of the whole sequence
 *  and the reason /how-it-works draws it to scale in its hero: almost
 *  everything filed is housekeeping, and a product that showed you all of it
 *  would be worse than useless. */
export const PIPELINE: PipelineStage[] = [
  {
    id: "watch",
    label: "Watch",
    title: "Every disclosure, read from the primary source",
    body: "We read the regulator’s own feed, the exchange announcement or the filing itself, never a third-party summary of it. The pipeline runs every fifteen minutes through the trading day, so a new disclosure reaches the site within minutes of being published rather than the next morning.",
    meta: "Every 15 minutes",
  },
  {
    id: "classify",
    label: "Classify",
    title: "Separate the purchases from everything else",
    body: "Most of what an insider files is not a decision to buy. Awards, vestings, option exercises, placings, scheme releases and disposals all arrive in the same feed and are pulled out here. Only a purchase made on the open market, with the insider’s own money, goes any further.",
    meta: "Purchases only",
  },
  {
    id: "triage",
    label: "Triage",
    title: "Decide which purchases are worth reading properly",
    body: "A fast first pass weighs each surviving buy against its context: how senior the buyer is, how large the purchase is relative to the company and to them, whether other insiders have been buying the same stock, and how the shares have done lately. Most filings stop here, and a set of fixed rules can override the pass upward so a large buy by a chief executive is never quietly dropped.",
    meta: "Most filings stop here",
  },
  {
    id: "analyse",
    label: "Analyse",
    title: "Read the survivors against the record",
    body: "What is left gets the long read: recent company news, the filing history, what the insider has done before, and the case against the buy alongside the case for it. Every piece of evidence has to carry a working link to its source or it is dropped, an unsourced claim never reaches the page.",
    meta: "For and against",
  },
  {
    id: "rate",
    label: "Rate",
    title: "Score it against the six checks",
    body: "The six checks are applied one at a time and the result is a rating from significant down to routine, published with the reasoning that produced it. A buy has to clear all six to be rated significant; miss one and it is capped below, whatever else is in its favour.",
    meta: "Six checks, one rating",
  },
  {
    id: "track",
    label: "Track",
    title: "Then measure what actually happened",
    body: "Every open-market buy on the rated markets is followed from its disclosure-day close and scored against the index, so a rating can be checked against the buys it passed over as well as the ones it kept. The checks are not fixed: as the record builds, what each one looks for gets adjusted, and a buy’s rating can change.",
    meta: "Measured against the index",
  },
];

/** Canonical route for the published methodology. Imported rather than typed
 *  out at each of the half-dozen call sites that link to it. */
export const HOW_IT_WORKS_PATH = "/how-it-works";
