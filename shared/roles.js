// Role hubs: who was buying, grouped by the job they filed under.
//
// Plain ESM at the root so src/pages/role.tsx and functions/roles/[slug].js
// classify identically. Same reason as shared/leaderboard.js: a page whose
// pre-rendered membership differs from its hydrated membership is worse than
// no page, and here the membership IS the claim — "CEOs bought these" is only
// true if the classifier says so both times.
//
// ---------------------------------------------------------------------------
// Why this is 300 lines and not a lookup table
// ---------------------------------------------------------------------------
//
// The two feeds describe roles in completely different ways, and neither is a
// clean enum:
//
//   UK  — `director.role` is uncontrolled free text filed by the company. 919
//         rows in the year to 2026-08-19 carry one, across 151 distinct
//         strings. The head is canonical ("Non-Executive Director" ×271,
//         "Chief Executive Officer" ×87) and the tail is prose ("Interim
//         Creative Director and Executive Director", "Acting Revenue Officer
//         West").
//
//   US  — `reporter.roles` is a real enum (director | officer |
//         ten_percent_owner | other) with a free-text `officer_title` beside
//         it. Structurally better, and describing a different board culture.
//
// Three things make a naive `role.includes("ceo")` actively wrong:
//
//   1. PCA FILINGS NAME SOMEONE ELSE'S JOB. "Person closely associated with
//      Will Hoy, CFO" is not a CFO buying shares — it is a CFO's connected
//      party buying shares, which is a materially weaker signal and, on a page
//      headed "CFO purchases", a false statement about a named person. ~40 UK
//      rows are PCA filings and most of them spell out the associated
//      person's title. They are excluded from every bucket, never
//      reclassified into one. Same class of error as the spouse-account
//      caveat on the Congress member pages.
//
//   2. CHAIR AND NON-EXECUTIVE DIRECTOR OVERLAP, GENUINELY. "Non-Executive
//      Chair" (29), "Non-Executive Director and Chairman" (13) and "Chair and
//      Non-Executive Director" (2) are both things at once. First-match
//      bucketing silently picks one, and then the buckets stop summing to the
//      corpus in a way nobody can see. Buckets here are NON-EXCLUSIVE and the
//      pages say so.
//
//   3. A COMMITTEE CHAIR IS NOT THE CHAIR. "Non-Executive Chair of Audit and
//      Risk Committee" chairs a committee; the company's chair is a different
//      person. Counting them together overstates a bucket whose whole point is
//      that it is a small number of powerful people.
//
// And one thing that makes cross-market bucketing wrong: a UK non-executive
// director and a US Form 4 "director" are not the same office. UK NED is a
// MAR/UK-governance concept with an independence expectation; the Form 4 flag
// means only that the filer sits on the board. So `chair` and
// `non-executive-director` are UK-only buckets. Mapping them across would make
// the US numbers up.

/** Below this many qualifying filings in the window, a role hub is a stub.
 *  Higher than the sector bar (5) because these pages carry a classification
 *  claim as well as a count — a four-row page asserting a taxonomy is a worse
 *  trade than no page. */
export const MIN_FILINGS = 25;

/** Below this many MARKED purchases, a group's median mark is not a comparison.
 *
 *  A separate floor from MIN_FILINGS because it gates a different quantity. A
 *  group can clear 25 filings and carry four performance marks: the newest
 *  purchases have none by construction, and a bucket whose filings are recent
 *  is a bucket whose median is taken over a handful. Ranking the groups on a
 *  median of four against a median of 289 puts a name at the top of the page
 *  on the strength of four purchases. The verdict line ranks over this floor;
 *  the columns are still drawn, because being drawn is a claim about counts,
 *  not about outcomes. */
export const MIN_MARKED = 10;

/** How many filings a hub lists, and how many companies it ranks. */
export const TOP_FILINGS = 25;
export const TOP_COMPANIES = 12;

/** The published buckets.
 *
 *  `markets` is the honest part: `chair` and `non-executive-director` describe
 *  UK board structure and are not published on ddbx.us (see the header). Each
 *  entry carries the definition the page prints — the rule and the words are
 *  the same object, so a bucket cannot quietly change what it means.
 */
export const ROLES = [
  {
    slug: "chief-executive",
    label: "Chief executive",
    plural: "Chief executives",
    /** Used in prose: "purchases by <noun>". */
    noun: "chief executives",
    markets: ["UK", "US"],
    blurb:
      "The chief executive is the insider with the most complete picture of a company's trading, and the one whose own money is least diversified away from it. Purchases filed under the role are the single most-watched line in any disclosure feed.",
    definition:
      "Anyone whose filed title names them as a chief executive: “Chief Executive Officer”, “CEO”, “Chief Executive” and the group, interim, deputy, incoming and divisional variants of each. A filing by a chief executive's connected party is not counted here.",
  },
  {
    slug: "chief-financial-officer",
    label: "Chief financial officer",
    plural: "Chief financial officers",
    noun: "chief financial officers",
    markets: ["UK", "US"],
    blurb:
      "The finance director sees the numbers before anyone outside the company does. A CFO buying in their own name is the purchase most often read as a statement about the forecast, rather than about the share price.",
    definition:
      "Anyone whose filed title names them as a chief financial officer or finance director, including the group, interim and divisional variants. A filing by a CFO's connected party is not counted here.",
  },
  {
    slug: "chair",
    label: "Chair",
    plural: "Chairs",
    noun: "chairs",
    markets: ["UK"],
    blurb:
      "The chair leads the board rather than the business, and is usually the largest individual shareholder among the non-executives. A chair adding to a holding is a governance signal more than an operational one.",
    definition:
      "Anyone filed as chair or chairman of the company or its board, whether executive, non-executive or deputy. Chairs of a board committee — audit, remuneration, nomination, risk — are not counted: that is a different job, and the company chair is someone else.",
  },
  {
    slug: "non-executive-director",
    label: "Non-executive director",
    plural: "Non-executive directors",
    noun: "non-executive directors",
    markets: ["UK"],
    blurb:
      "Non-executives are the largest group of filers by some distance, and the least involved in day-to-day trading. That cuts both ways: they see the board pack, but not the order book.",
    definition:
      "Anyone filed as a non-executive director, including independent non-executives and the senior independent director. Non-executive chairs appear here and under Chair — the two roles genuinely overlap, and the counts are not meant to sum.",
  },
];

export const ROLE_SLUGS = ROLES.map((r) => r.slug);

export function roleBySlug(slug) {
  return ROLES.find((r) => r.slug === String(slug ?? "")) ?? null;
}

export function rolePath(slug) {
  return `/roles/${slug}`;
}

/** Buckets published on a market. See the header on why this differs. */
export function rolesForMarket(market) {
  return ROLES.filter((r) => r.markets.includes(market));
}

/** Lowercase, collapse whitespace, and flatten the punctuation the feeds vary
 *  on: en/em dashes used as separators, "&" for "and", and the hyphen in
 *  "non-executive" (which is filed both ways). */
function normalise(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[‐-―]/g, "-")
    .replace(/&/g, " and ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A filing made by someone connected to an insider rather than by the insider.
 *
 *  Matched BEFORE any bucket, and returned as an exclusion rather than a
 *  bucket, because these strings routinely contain the associated person's
 *  title verbatim — "PCA of CFO Mark Fryer", "Person Closely Associated
 *  (spouse of CFO)", "Person closely associated with Non-Executive Director
 *  Stephen Young". Every one of those matches a bucket pattern and none of
 *  them is that person buying.
 *
 *  The UK feed carries this only in the role string. EU rows have an explicit
 *  `is_closely_associated` flag; US Form 4 has no PCA concept at all
 *  (connected holdings surface as `direct_indirect: "I"`, which is a different
 *  question and deliberately not treated as one here). */
function isCloselyAssociated(role) {
  return /person(s)? closely associated|closely associated with|\bpca\b|spouse of/.test(
    role,
  );
}

/** Chair of a board committee, not of the company.
 *
 *  Only fires when the chair mention is itself qualified by a committee — so
 *  "Chair of the Board" and a bare "Chair" pass through, and "Non-Executive
 *  Chair of Audit and Risk Committee" does not. */
function isCommitteeChairOnly(role) {
  if (!/chair/.test(role)) return false;

  // Strip the committee-qualified mentions; if any chair mention survives, the
  // filer chairs something else as well and belongs in the bucket.
  const withoutCommittee = role.replace(
    /chair(man|woman|person)?\s+of\s+(the\s+)?(?!board\b)[^,;]*?\b(committee|audit|remuneration|nomination|nominations|risk|esg)\b[^,;]*/g,
    "",
  );

  return !/chair/.test(withoutCommittee);
}

const PATTERNS = {
  "chief-executive": /chief executive|\bceo\b/,
  "chief-financial-officer":
    /chief financial officer|\bcfo\b|finance director/,
  chair: /chair(man|woman|person)?\b/,
  "non-executive-director":
    /non-?\s?executive|senior independent director|^independent director$/,
};

/** Classify one filed role string.
 *
 *  Returns `{ closelyAssociated, buckets }`. Buckets are NON-EXCLUSIVE: a
 *  non-executive chair is in two of them, deliberately (see header note 2).
 *  A PCA filing returns no buckets at all. */
export function classifyRole(role) {
  const text = normalise(role);

  if (!text) return { closelyAssociated: false, buckets: [] };
  if (isCloselyAssociated(text))
    return { closelyAssociated: true, buckets: [] };

  const buckets = [];

  for (const [slug, pattern] of Object.entries(PATTERNS)) {
    if (!pattern.test(text)) continue;
    if (slug === "chair" && isCommitteeChairOnly(text)) continue;
    buckets.push(slug);
  }

  return { closelyAssociated: false, buckets };
}

/** The filed role on a row, whichever market it came from.
 *
 *  UK puts it on `director.role`. US has the enum on `reporter.roles` and the
 *  free text on `reporter.officer_title`; only the free text can distinguish a
 *  CEO from any other officer, so that is what gets classified. */
export function filedRole(d, market) {
  if (market === "US") return d?.reporter?.officer_title ?? "";

  return d?.director?.role ?? "";
}

/** Whether a row belongs in a bucket. */
export function inRole(d, market, slug) {
  return classifyRole(filedRole(d, market)).buckets.includes(slug);
}

/** How the corpus split, for the page to state rather than imply.
 *
 *  Counts every row once against each of: classified into at least one bucket,
 *  excluded as a connected-party filing, carrying a role we do not bucket, and
 *  carrying no role for us to read. These four sum to the corpus; the
 *  per-bucket counts do not, and that is the point.
 *
 *  `missing` means something different per market, which is why it is labelled
 *  by the caller and not here. A UK row with no `director.role` is a gap in the
 *  filing. A US row with no `officer_title` is not: it is a filer who is a
 *  board member or a 10% owner and holds no officer post at all — 148 of a
 *  300-row sample. Calling that "no role filed" on a US page would report our
 *  own taxonomy's shape as a defect in EDGAR. */
export function roleCoverage(dealings, market) {
  let classified = 0;
  let closelyAssociated = 0;
  let unbucketed = 0;
  let missing = 0;

  for (const d of dealings ?? []) {
    const role = filedRole(d, market);

    if (!normalise(role)) {
      missing += 1;
      continue;
    }
    const { closelyAssociated: pca, buckets } = classifyRole(role);

    if (pca) closelyAssociated += 1;
    else if (buckets.length > 0) classified += 1;
    else unbucketed += 1;
  }

  return {
    total: (dealings ?? []).length,
    classified,
    closelyAssociated,
    unbucketed,
    missing,
  };
}

/** The sentence describing `roleCoverage.missing`, which is a different fact in
 *  each market. See the note on roleCoverage. */
export function missingRoleLabel(market) {
  return market === "US"
    ? "filed by a board member or 10% owner holding no officer post"
    : "filed without a job title";
}

/** Published methodology. Rendered on every role hub, by both renderers.
 *
 *  The eligibility and performance lines are deliberately the same claims
 *  shared/leaderboard.js publishes — these hubs rank the same rows under a
 *  different grouping, and two pages stating different rules for the same
 *  corpus is how a methodology stops being believed. */
export const METHODOLOGY = [
  "Roles are read from the job title filed with each disclosure. In the UK that title is free text written by the company, so it is matched against a published pattern rather than looked up in a list — the pattern for this page is stated above.",
  "Filings made by someone closely associated with an insider — a spouse, a trust, a connected company — are excluded, even when the filing spells out the insider's job title. A chief executive's connected party buying shares is not a chief executive buying shares.",
  "A person can hold more than one of these roles, and many do: a non-executive chair is counted under both Chair and Non-executive director. The role pages are not slices of one pie and their totals are not meant to add up to the market.",
  "Chairs of a board committee are not counted as the chair. Audit, remuneration, nomination and risk committee chairs are non-executive directors, and the company's chair is someone else.",
  "US filings use the Form 4 officer title, which has no equivalent of the UK's non-executive director or company chair. Those two pages are published for the UK only rather than approximated from a different governance model.",
  "Only open-market purchases count, on the same test the rest of the site uses: UK rows must be classified as open-market buys against the trade-day close, and US rows come from a feed already restricted to Form 4 transaction code P.",
  "Performance is measured from the closing price on the day the purchase was disclosed, marked against the most recent cached close rather than a live quote. Past performance is not a reliable indicator of future results.",
];
