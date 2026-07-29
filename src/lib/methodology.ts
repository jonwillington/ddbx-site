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
import type { RatingChecklist } from "@/types/ddbx";

/** Pre-formatted strings a `passLine` interpolates. Every value has already
 *  been through the caller's price/value formatter — this module does no
 *  number formatting, because the market that owns the filing owns its
 *  currency. */
export interface CheckContext {
  name: string;
  /** "Chief Executive", "CFO" — omitted when the filing doesn't name one. */
  role?: string;
  company: string;
  /** Per-share entry price. Null when the filing is unpriced. */
  price: string | null;
  /** Total value of the purchase. */
  value: string;
}

export interface MethodologyCheck {
  key: keyof RatingChecklist;
  label: string;
  question: string;
  body: string;
  detail: string;
  passLine: (c: CheckContext) => string;
}

/** The six checks, in the order they're scored. */
export const CHECKS: MethodologyCheck[] = [
  {
    key: "open_market_buy",
    label: "Open-market buy",
    question: "Was it an open-market buy?",
    body: "They paid for the shares themselves on the open market. Not an option grant, a vesting, or an internal transfer.",
    detail:
      "This is the check that does the most work, because it throws away the most. A vesting, a scheme release, a placing and an option exercise all appear on the wire as an insider acquiring shares, and none of them means the insider chose to buy at today’s price. Only a purchase made with their own money, at the price anyone else could have paid, tells you anything about what they think the shares are worth.",
    passLine: (c) =>
      c.price
        ? `${c.name} paid ${c.price} a share on the open market — ${c.value} of their own money.`
        : `${c.name} put ${c.value} of their own money in on the open market.`,
  },
  {
    key: "senior_insider",
    label: "Senior insider",
    question: "Was it a senior insider?",
    body: "The buyer is a CEO, CFO, or a board member close to the business, not a junior name on the register.",
    detail:
      "Disclosure rules catch a wide net — company secretaries, divisional managers, and in some markets the people closely associated with them. They file the same form as the chief executive. The check asks whether this particular buyer is close enough to the business to be acting on something more than the share price, which usually means the board and the finance function.",
    passLine: (c) =>
      c.role
        ? `${c.name} is ${c.role} at ${c.company} — close enough to see the whole picture.`
        : `${c.name} is a senior insider at ${c.company}.`,
  },
  {
    key: "meaningful_conviction",
    label: "Meaningful conviction",
    question: "Did they show real conviction?",
    body: "The amount is large relative to what they earn, so it reads as a real commitment rather than a token.",
    detail:
      "Size on its own says very little: a hundred thousand pounds is a rounding error to one chief executive and a year’s pay to another. The check weighs the purchase against what the buyer plausibly earns and already holds, so a large buy at a small company can clear it while a larger one at a mega-cap does not.",
    passLine: (c) => `${c.value} of personal capital. That is not a token.`,
  },
  {
    key: "no_alternative_explanation",
    label: "No scheme or plan",
    question: "Was the timing their own call?",
    body: "Nothing mechanical explains the timing: no dividend reinvestment, no pre-arranged trading plan, no contractual or tax deadline.",
    detail:
      "A trade that was going to happen anyway carries no information. Pre-arranged plans — a 10b5-1 in the US, a savings scheme in the UK — set the date months in advance, and a shareholding requirement written into a contract forces the buy regardless of what the insider thinks. The check looks for anything that would have produced this purchase on this day without a decision behind it.",
    passLine: () =>
      "Nothing mechanical explains the timing — no plan, no scheme, no deadline forcing it.",
  },
  {
    key: "supporting_context_found",
    label: "Supporting context",
    question: "Does the context hold up?",
    body: "Either there is news that makes the timing make sense, or nothing public argues against it. A buy in a quiet period can be the strongest kind.",
    detail:
      "This is not a demand for a catalyst. It asks whether the public record is consistent with the purchase — recent results, guidance, sector news, the share price’s own history. A buy the week after a well-received set of results reads differently from one made into a profit warning, and a buy with no news at all around it is often the most interesting of the three.",
    passLine: (c) =>
      `The timing holds up against everything public about ${c.company}.`,
  },
  {
    key: "no_major_counter_signal",
    label: "No major counter-signal",
    question: "Is the picture otherwise clean?",
    body: "Nothing serious points the other way: no other insiders selling at the same time, no open investigation, no sign the business is still getting worse.",
    detail:
      "One insider buying while three sell is not a signal, it is a disagreement. The check sweeps for the things that would undercut the buy whatever its own merits — concurrent disposals by colleagues, a regulatory investigation, an accounting problem, a business still deteriorating on its own numbers.",
    passLine: () =>
      "No insiders selling against it, no open investigation, nothing pointing the other way.",
  },
];

export const CHECK_COUNT = CHECKS.length;

/** The same number, spelled, for running prose. Interpolating CHECK_COUNT into
 *  a sentence produces "the 6 checks" and "all 6", which is a numeral where
 *  house style — and ordinary English — wants a word. Use CHECK_COUNT only
 *  where a figure is genuinely wanted ("4/6 met"). */
export const CHECK_COUNT_WORD = "six";

/** The four ratings, best first. Mirrors `RATINGS` in
 *  ddbx-data/worker/pipeline/analyze.ts. */
export const RATING_SCALE: { rating: string; meaning: string }[] = [
  {
    rating: "significant",
    meaning:
      "All six checks clear. The top of the scale, and deliberately hard to reach — a buy that misses even one is capped below this.",
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
      "Disclosed, but not informative — the housekeeping that makes up most of what gets filed.",
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
 *  and the reason the diagram draws it as a funnel: almost everything filed is
 *  housekeeping, and a product that showed you all of it would be worse than
 *  useless. */
export const PIPELINE: PipelineStage[] = [
  {
    id: "watch",
    label: "Watch",
    title: "Every disclosure, read from the primary source",
    body: "We read the regulator’s own feed — the exchange announcement or the filing itself — never a third-party summary of it. The pipeline runs every fifteen minutes through the trading day, so a new disclosure reaches the site within minutes of being published rather than the next morning.",
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
    body: "What is left gets the long read: recent company news, the filing history, what the insider has done before, and the case against the buy alongside the case for it. Every piece of evidence has to carry a working link to its source or it is dropped — an unsourced claim never reaches the page.",
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
    body: "Every rated buy is followed from its disclosure-day close and scored against the index, so the rating can be checked against the outcome rather than left as an opinion. The checks are not fixed: as the record builds, what each one looks for gets adjusted, and a buy’s rating can change.",
    meta: "Measured against the index",
  },
];

/** The narrowing the diagram draws, as labels rather than invented numbers.
 *  We publish no attrition figures and shouldn’t imply one — the widths in the
 *  funnel are illustrative, and the labels are what the reader takes away.
 *
 *  Kept short deliberately: they are set inside the tapering bands, and the
 *  last band is narrow, so a longer phrase ("Rated and published") truncates
 *  to an ellipsis at the exact point the figure is trying to make. */
export const FUNNEL_STOPS = [
  "Everything filed",
  "Open-market buys",
  "Worth reading",
  "Rated",
];

/** Canonical route for the published methodology. Imported rather than typed
 *  out at each of the half-dozen call sites that link to it. */
export const HOW_IT_WORKS_PATH = "/how-it-works";
