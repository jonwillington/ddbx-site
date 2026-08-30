/** Real filings, curated, for /how-it-works.
 *
 *  The page used to describe the six checks and four ratings entirely in the
 *  abstract — eighteen consecutive paragraphs about tests with nothing to look
 *  at. The infrastructure for the concrete version already existed: every
 *  check in shared/methodology.js carries a `passLine` that narrates a real
 *  filing's verdict, and every filing has a permanent URL. This file is the
 *  cast of real filings the page runs through that machinery:
 *
 *    specimen  — one filing that cleared all six checks, threaded through the
 *                whole page: introduced at the top, verdict-narrated under
 *                each check, measured live at the bottom.
 *    counters  — for each check, a real filing that FAILED it, with one line
 *                on why. The strongest form of each check is contrast.
 *    ratings   — one real filing per rating, so the scale is four linked
 *                examples rather than four abstract definitions.
 *    tracked   — the two filings the "what we can measure" section fetches
 *                LIVE (src/lib/api.ts) to show a real measured return. Only
 *                identity and static facts live here; the alpha is never
 *                embedded, because a copied number is stale the day after.
 *
 *  ---------------------------------------------------------------------------
 *  Truth boundaries — read before editing
 *  ---------------------------------------------------------------------------
 *
 *  Every fact below is copied from the filing's own API row on `curatedAt`,
 *  and every `line` is a compression of that row's published
 *  `rating_rationale` — not editorial invention. The static-page rule "never
 *  state a number you do not have" is satisfied because these numbers WERE
 *  had, from production, on that date; the facts that appear (name, role,
 *  value, price, date) are properties of the filing and do not change.
 *
 *  What CAN change is the verdict: the checklist moves by design (see the
 *  LIMITS card on the page), so a rating or a check result may be re-scored
 *  after curation. That is why every example links to its live filing page —
 *  the reader can always see the current verdict — and why anything live
 *  (alpha, as-of dates) is fetched, never copied here. If a curated filing's
 *  rating changes materially, re-curate rather than let the page argue with
 *  its own product.
 *
 *  Markets: only UK and US carry the analysis layer, so only they have
 *  examples. `examplesFor` returns null elsewhere and every example surface
 *  on the page gates on that, the same way the walkthrough runs without
 *  worked-example lines on SE/NL.
 */
import type { Rating, RatingChecklist } from "@/types/ddbx";
import type { CheckContext } from "@/lib/methodology";

/** One curated filing: static facts plus one line of why it's here. */
export interface ExampleFiling {
  /** Wire id — `d-…` (UK) or `f4-…` (US). The tracked pair is fetched by it. */
  id: string;
  /** Site-relative filing permalink (shared/filings.js · filings-us.js). */
  path: string;
  company: string;
  ticker: string;
  name: string;
  role?: string;
  /** Trade date, ISO YYYY-MM-DD. */
  date: string;
  /** Pre-formatted, market-native: "£99,997" / "$2.5m". */
  value: string;
  /** Pre-formatted per-share price. Null when the filing is unpriced. */
  price?: string | null;
  /** Rating at curation. For tracked filings this is only the fallback —
   *  the live fetch's rating wins when it answers. */
  rating: Rating;
  /** One sentence on why this filing illustrates its slot. */
  line: string;
}

export interface MethodologyExamples {
  /** The date the facts below were read from the API. */
  curatedAt: string;
  specimen: ExampleFiling;
  /** Per-check, a real filing that failed it. A check with no clean, honest
   *  counter-example in the corpus is simply absent (US supporting-context:
   *  no filing in the window failed it pivotally) — absent beats forced. */
  counters: Partial<Record<keyof RatingChecklist, ExampleFiling>>;
  ratings: Partial<Record<Rating, ExampleFiling>>;
  /** Fetched live by the measured section. First entry is the specimen. */
  tracked: ExampleFiling[];
}

/** The specimen as the `passLine` machinery wants it. Strings are already
 *  formatted (CheckContext does no number formatting by design). */
export function specimenContext(s: ExampleFiling): CheckContext {
  return {
    name: s.name,
    role: s.role,
    company: s.company,
    price: s.price ?? null,
    value: s.value,
  };
}

// ── UK ──────────────────────────────────────────────────────────────────────

const UK_SPECIMEN: ExampleFiling = {
  id: "d-cef58cdd7c2299e9",
  path: "/dealings/d-cef58cdd7c2299e9",
  company: "Vistry Group",
  ticker: "VTY.L",
  name: "Adam Daniels",
  role: "Chief Executive Officer",
  date: "2026-07-15",
  value: "£99,997",
  price: "260.6p",
  rating: "significant",
  line: "A newly appointed CEO’s first open-market purchase, near the 52-week low, one week after a trading update he wrote himself.",
};

const UK_EXAMPLES: MethodologyExamples = {
  curatedAt: "2026-08-30",
  specimen: UK_SPECIMEN,
  counters: {
    open_market_buy: {
      id: "d-d87fd7c32ae7b87d",
      path: "/dealings/d-d87fd7c32ae7b87d",
      company: "Tesco",
      ticker: "TSCO.L",
      name: "Stewart Gilliland",
      role: "Non-Executive Director",
      date: "2026-07-02",
      value: "£3,200",
      rating: "routine",
      line: "A Tesco non-executive’s £3,200 acquisition read as a dividend-reinvestment plan at work: shares arriving on a schedule, not by decision.",
    },
    senior_insider: {
      id: "d-82e3c43f603feaf6",
      path: "/dealings/d-82e3c43f603feaf6",
      company: "Domino’s Pizza Group",
      ticker: "DOM.L",
      name: "Ian Bull",
      role: "Chair",
      date: "2026-08-10",
      value: "£31,495",
      rating: "noteworthy",
      line: "Domino’s chair bought days after strong results, but a non-executive chair sits a step back from the business this check wants its buyer inside.",
    },
    meaningful_conviction: {
      id: "d-d80dd7fddb9f209e",
      path: "/dealings/d-d80dd7fddb9f209e",
      company: "AB Dynamics",
      ticker: "ABDP.L",
      name: "Sarah Matthews-DeMers",
      role: "Chief Executive Officer",
      date: "2026-08-20",
      value: "£16,087",
      rating: "noteworthy",
      line: "AB Dynamics’ CEO bought at a multi-year low, but £16k against roughly £1.4m of pay is a token, and it capped the rating.",
    },
    no_alternative_explanation: {
      id: "d-4e8226af6141df75",
      path: "/dealings/d-4e8226af6141df75",
      company: "Ninety One",
      ticker: "N91.L",
      name: "Hendrik du Toit / Kim McFarland",
      date: "2026-08-18",
      value: "£46,205",
      rating: "noteworthy",
      line: "Ninety One’s founder-CEO’s £46k purchase was the ninth in a programmatic run through a family trust: accumulation on a schedule, not a timed call.",
    },
    supporting_context_found: {
      id: "d-fd598f213ce48ad5",
      path: "/dealings/d-fd598f213ce48ad5",
      company: "Greencore Group",
      ticker: "GNC.L",
      name: "Leslie Van de Walle",
      role: "Non-Executive Chair",
      date: "2026-03-26",
      value: "£103,630",
      rating: "noteworthy",
      line: "Greencore’s chair put £104k in, but grocery deflation argued against freshly repriced contracts, and this check withheld its yes.",
    },
    no_major_counter_signal: {
      id: "d-9add4952f1e4b534",
      path: "/dealings/d-9add4952f1e4b534",
      company: "Sirius Real Estate",
      ticker: "SRE.L",
      name: "Andrew Coombs",
      role: "Chief Executive Officer",
      date: "2026-08-17",
      value: "£239,875",
      rating: "noteworthy",
      line: "Sirius Real Estate’s CEO bought £240k twelve days after selling £510k at a higher price. A buy just after a bigger sell fails this check whatever its own merits.",
    },
  },
  ratings: {
    significant: {
      id: "d-351b7df7a3ca5a7e",
      path: "/dealings/d-351b7df7a3ca5a7e",
      company: "Supreme",
      ticker: "SUP.L",
      name: "Sandy Chadha",
      role: "Chief Executive Officer",
      date: "2026-07-20",
      value: "£659,055",
      rating: "significant",
      line: "A founder-CEO reversed eight months of selling to buy £659k near 52-week lows. All six cleared.",
    },
    noteworthy: {
      id: "d-fd598f213ce48ad5",
      path: "/dealings/d-fd598f213ce48ad5",
      company: "Greencore Group",
      ticker: "GNC.L",
      name: "Leslie Van de Walle",
      role: "Non-Executive Chair",
      date: "2026-03-26",
      value: "£103,630",
      rating: "noteworthy",
      line: "A meaningful £104k commitment by the chair that cleared five of six; the context check withheld its yes.",
    },
    minor: {
      id: "d-adef347e7380147c",
      path: "/dealings/d-adef347e7380147c",
      company: "Canal+",
      ticker: "CAN.L",
      name: "Elias Masilela",
      role: "Non-Executive Director",
      date: "2026-08-13",
      value: "£13,289",
      rating: "minor",
      line: "£13k by a newly joined non-executive, two months into the role: a skin-in-the-game gesture, not a conviction signal.",
    },
    routine: {
      id: "d-d87fd7c32ae7b87d",
      path: "/dealings/d-d87fd7c32ae7b87d",
      company: "Tesco",
      ticker: "TSCO.L",
      name: "Stewart Gilliland",
      role: "Non-Executive Director",
      date: "2026-07-02",
      value: "£3,200",
      rating: "routine",
      line: "£3,200 arriving on a dividend-reinvestment schedule. Disclosed, and saying nothing.",
    },
  },
  tracked: [
    UK_SPECIMEN,
    {
      id: "d-b1109e2d2c2ba76b",
      path: "/dealings/d-b1109e2d2c2ba76b",
      company: "Safestore Holdings",
      ticker: "SAFE.L",
      name: "Frederic Vecchioli",
      role: "Chief Executive Officer",
      date: "2026-06-24",
      value: "£301,290",
      price: "602.58p",
      rating: "significant",
      line: "A founder-CEO’s £301k purchase near the 52-week low, two weeks after results showed a return to earnings growth.",
    },
  ],
};

// ── US ──────────────────────────────────────────────────────────────────────

const US_SPECIMEN: ExampleFiling = {
  id: "f4-0001193125-26-344586-1-0",
  path: "/us/dealings/f4-0001193125-26-344586-1-0",
  company: "Aptiv",
  ticker: "APTV",
  name: "Kevin P Clark",
  role: "Chair & Chief Executive Officer",
  date: "2026-08-10",
  value: "$2.5m",
  price: "$48.89",
  rating: "significant",
  line: "A $2.5m buy by the chair and CEO at a 52-week low, six days after a 17% earnings-day fall, and a first open-market purchase in at least two years.",
};

const US_EXAMPLES: MethodologyExamples = {
  curatedAt: "2026-08-30",
  specimen: US_SPECIMEN,
  counters: {
    open_market_buy: {
      id: "f4-0001236030-26-000008-1-0",
      path: "/us/dealings/f4-0001236030-26-000008-1-0",
      company: "CEL-SCI",
      ticker: "CVM",
      name: "Geert Kersten",
      role: "Chief Executive Officer",
      date: "2026-08-25",
      value: "$138,000",
      rating: "minor",
      line: "CEL-SCI’s CEO put $138k in, but a Form 4 footnote showed restricted stock bought directly from the company, not at an open-market price.",
    },
    senior_insider: {
      id: "f4-0001475597-26-000217-1-1",
      path: "/us/dealings/f4-0001475597-26-000217-1-1",
      company: "Founder Group",
      ticker: "FGL",
      name: "HRT Financial LP",
      role: "10% owner",
      date: "2026-08-25",
      value: "$52,212",
      rating: "routine",
      line: "The “insider” here was a market-making firm past the 10% ownership threshold: a balance sheet, not a person close to the business.",
    },
    meaningful_conviction: {
      id: "f4-0001493152-26-040234-1-0",
      path: "/us/dealings/f4-0001493152-26-040234-1-0",
      company: "Venu Holding",
      ticker: "VENU",
      name: "Jay Roth",
      role: "Chief Executive Officer",
      date: "2026-08-25",
      value: "$1,898",
      rating: "routine",
      line: "A CEO with an eight-figure stake bought $1,898 of stock. Repeated tiny buys read as optics, not commitment.",
    },
    no_alternative_explanation: {
      id: "f4-0001741576-26-000008-1-0",
      path: "/us/dealings/f4-0001741576-26-000008-1-0",
      company: "Keurig Dr Pepper",
      ticker: "KDP",
      name: "Aaron Alt",
      role: "Director",
      date: "2026-08-25",
      value: "$250,247",
      rating: "noteworthy",
      line: "A new Keurig Dr Pepper director bought $250k eleven days after joining the board: the shape of a share-ownership-guideline purchase, not a timed call.",
    },
    no_major_counter_signal: {
      id: "f4-0000947871-26-000787-1-0",
      path: "/us/dealings/f4-0000947871-26-000787-1-0",
      company: "Embecta",
      ticker: "EMBC",
      name: "Jeffrey Mann",
      role: "Officer",
      date: "2026-08-12",
      value: "$99,800",
      rating: "noteworthy",
      line: "An Embecta officer bought $100k in a rare four-insider cluster, but an active securities class action kept this check from clearing.",
    },
  },
  ratings: {
    significant: {
      id: "f4-0001193125-26-365628-1-0",
      path: "/us/dealings/f4-0001193125-26-365628-1-0",
      company: "TTM Technologies",
      ticker: "TTMI",
      name: "Edwin Roks",
      role: "Chief Executive Officer",
      date: "2026-08-25",
      value: "$1.1m",
      rating: "significant",
      line: "A CEO’s first open-market buy, within a day of the board chair’s own, into a post-earnings pullback. All six cleared.",
    },
    noteworthy: {
      id: "f4-0001741576-26-000008-1-0",
      path: "/us/dealings/f4-0001741576-26-000008-1-0",
      company: "Keurig Dr Pepper",
      ticker: "KDP",
      name: "Aaron Alt",
      role: "Director",
      date: "2026-08-25",
      value: "$250,247",
      rating: "noteworthy",
      line: "A real $250k commitment that cleared five of six; the timing had a mechanical explanation.",
    },
    minor: {
      id: "f4-0001236030-26-000008-1-0",
      path: "/us/dealings/f4-0001236030-26-000008-1-0",
      company: "CEL-SCI",
      ticker: "CVM",
      name: "Geert Kersten",
      role: "Chief Executive Officer",
      date: "2026-08-25",
      value: "$138,000",
      rating: "minor",
      line: "A real $138k commitment by the CEO, but not at an open-market price.",
    },
    routine: {
      id: "f4-0001493152-26-040234-1-0",
      path: "/us/dealings/f4-0001493152-26-040234-1-0",
      company: "Venu Holding",
      ticker: "VENU",
      name: "Jay Roth",
      role: "Chief Executive Officer",
      date: "2026-08-25",
      value: "$1,898",
      rating: "routine",
      line: "$1,898 by the CEO, one of a string of near-identical tiny buys. Disclosed, and saying nothing.",
    },
  },
  tracked: [
    US_SPECIMEN,
    {
      id: "f4-0001088011-26-000006-1-0",
      path: "/us/dealings/f4-0001088011-26-000006-1-0",
      company: "Carvana",
      ticker: "CVNA",
      name: "Michael Maroone",
      role: "Director",
      date: "2026-07-31",
      value: "$1.5m",
      rating: "noteworthy",
      line: "A director’s $1.5m open-market purchase, disclosed the same week.",
    },
  ],
};

/** Examples for the two rated markets; null everywhere else, and every
 *  example surface on /how-it-works must gate on that null. */
export function examplesFor(marketId: string): MethodologyExamples | null {
  if (marketId === "us") return US_EXAMPLES;
  if (marketId === "uk") return UK_EXAMPLES;

  return null;
}
