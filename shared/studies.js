// Living studies — /research and /research/:slug.
//
// Plain ESM at the root, imported by both src/pages/research.tsx and
// functions/research/[[route]].js, for the reason every board module gives: a
// study whose pre-rendered verdict differs from its hydrated verdict is worse
// than no study. Here that matters more than on a board, because the whole
// point of the page is to be the thing a reader cites.
//
// ---------------------------------------------------------------------------
// What a living study is
// ---------------------------------------------------------------------------
//
// An evergreen research question answered from the live corpus on every load,
// under one standing rule: a conclusion is published only once the sample
// makes it defensible, and until then the page says exactly what is missing
// and when it should exist. Three states, and the difference between them is
// the design:
//
//   waiting   — at least one compared cell is under MIN_CELL. No rate is
//               printed for that cell (the same posture as the director pages,
//               which show a count but never divide it into a percentage until
//               MIN_RESOLVED_FOR_RATE). The page states how many more marked
//               purchases the cell needs, how many are already filed and
//               waiting to reach the horizon, and the date the cell should
//               clear — computed from that queue, or from the recent arrival
//               rate when the queue alone is not enough.
//   open      — every compared cell clears the floor, and the difference
//               between them is inside what chance would produce. That is a
//               finding, and it is stated as one: too close to call at this
//               sample, with the point estimates and the sample size a gap of
//               that size would need.
//   answered  — every compared cell clears the floor and the gap is one the
//               test puts under SIGNIFICANCE. The page states the direction.
//
// ---------------------------------------------------------------------------
// The measurement, and why it is what it is
// ---------------------------------------------------------------------------
//
// The only per-purchase mark the API carries today is `live_performance`: the
// share's return from an anchor close to the latest cached close, beside the
// benchmark's return over the same window. The fixed-horizon `outcomes` table
// in ddbx-data (30/90/180/365/730 days, with a benchmark leg) is not on the
// wire per event, only as per-director aggregates. So:
//
//   - Alpha is read through `buyAlpha` (shared/leaderboard.js): the disclosure
//     anchor where the disclosure-day close is on file, the trade anchor where
//     it is not. Same rule as every board, so the same purchase carries the
//     same mark on every page. PERCENT on the wire, ratio in here.
//   - The outcome each cell is scored on is the BEAT RATE: the share of its
//     purchases whose alpha is above zero. "Did the price go up" describes the
//     market (two thirds of purchases rose over this period); "did it beat the
//     index over the identical window" is roughly a coin flip across the whole
//     record and so says something about the purchase. That is the framing the
//     director pages moved to on 2026-09-16 (commit a1b9431), and a study that
//     used a different one would contradict them.
//   - A purchase enters the sample only once it has had MIN_HORIZON_DAYS on
//     the clock from its anchor to the mark's `as_of`. The mark is to the
//     latest close, so an older purchase has had longer — the horizon is a
//     minimum, not a fixed window, and every page says so. 90 days is the
//     first horizon in the site's published 3/6/12/24-month vocabulary, and it
//     is the longest one the corpus can currently fill: at 180 days the UK
//     holds 83 marked purchases in total, which clears nothing.
//   - The median alpha per cell is reported beside the beat rate, but the
//     verdict is taken on the rate. A median is a different claim with a
//     different test, and a page with two verdicts has none.
//
// Nothing here names a person. Cells are roles, size bands and cluster
// membership; the filings behind each cell are one click away on the boards
// that list them.

import { buyAlpha, buyValue, isEligibleBuy } from "./leaderboard.js";
import { inRole } from "./roles.js";
import { median } from "./boards.js";
import { trackingSinceLabel } from "./tracking.js";

// ---------------------------------------------------------------------------
// Thresholds. Every one of these is printed on the page rather than applied
// quietly, and each has a reason next to it.
// ---------------------------------------------------------------------------

/** Days a purchase must have had between its anchor and the mark before it
 *  counts. See the header: the first published horizon, and the longest the
 *  corpus can fill today. */
export const MIN_HORIZON_DAYS = 90;

/** Marked purchases a cell needs before its beat rate is stated at all.
 *
 *  Thirty is where a 95% interval on a beat rate near the coin-flip base rate
 *  narrows to about ±17 points, which is the widest interval that can still
 *  exclude "no better than the market" for a cell that is genuinely doing
 *  well. Below it the interval covers most of the axis and the rate is an
 *  anecdote with a percent sign on it. Slightly above the role hubs' 25-filing
 *  bar and well above the director pages' 4, because a cell here is a claim
 *  about a KIND of purchase, and that claim outlives any one filing. */
export const MIN_CELL = 30;

/** Two-sided p-value under which a gap between two cells is called real. */
export const SIGNIFICANCE = 0.05;

/** Purchases below this are left out of the role and cluster studies, in the
 *  market's own currency and never converted.
 *
 *  These are the pipeline's own co-buyer floors (worker/db/queries.ts and
 *  us-queries.ts, mirrored in shared/boards.js countsTowardCluster): a
 *  purchase under them does not count toward a cluster on any surface in the
 *  product, so a cluster study that admitted them would be scoring purchases
 *  the cluster definition itself excludes. The role study uses the same line
 *  so the two studies share a universe. The size study applies NO floor: size
 *  is the variable, and the smallest band is the one the question is about. */
export const STUDY_FLOOR = { UK: 10_000, US: 25_000 };

/** Weeks of recent filings the arrival rate is taken over. */
export const ARRIVAL_WEEKS = 8;

// ---------------------------------------------------------------------------
// The studies
// ---------------------------------------------------------------------------

/** Value bands, per market. Market-relative because the feeds are: the US feed
 *  is pre-filtered upstream and carries almost nothing under $50,000, so the
 *  UK's lowest band would be empty there and its highest would hold most of
 *  the corpus. Each ladder steps by roughly five times, and the bands are
 *  printed on the page. */
const SIZE_BANDS = {
  UK: [
    {
      id: "under-10k",
      label: "Under £10,000",
      noun: "under £10,000",
      lo: 0,
      hi: 10_000,
    },
    {
      id: "10k-50k",
      label: "£10,000 to £50,000",
      noun: "of £10,000 to £50,000",
      lo: 10_000,
      hi: 50_000,
    },
    {
      id: "50k-250k",
      label: "£50,000 to £250,000",
      noun: "of £50,000 to £250,000",
      lo: 50_000,
      hi: 250_000,
    },
    {
      id: "250k-up",
      label: "£250,000 and over",
      noun: "of £250,000 and over",
      lo: 250_000,
      hi: Infinity,
    },
  ],
  US: [
    {
      id: "under-100k",
      label: "Under $100,000",
      noun: "under $100,000",
      lo: 0,
      hi: 100_000,
    },
    {
      id: "100k-500k",
      label: "$100,000 to $500,000",
      noun: "of $100,000 to $500,000",
      lo: 100_000,
      hi: 500_000,
    },
    {
      id: "500k-up",
      label: "$500,000 and over",
      noun: "of $500,000 and over",
      lo: 500_000,
      hi: Infinity,
    },
  ],
};

const bandCells = (market) =>
  (SIZE_BANDS[market] ?? SIZE_BANDS.UK).map((b) => ({
    id: b.id,
    label: b.label,
    noun: `purchases ${b.noun}`,
    test: (d) => buyValue(d) >= b.lo && buyValue(d) < b.hi,
  }));

/** Whether a row carries the pipeline's cluster annotation. Per row, as the
 *  pipeline asserts it: this is NOT the episode grouping in shared/boards.js
 *  (which warns at length about how not to build it), because the question
 *  here is about the purchase, not the cluster — was this buy made while at
 *  least one other insider was buying the same company, on the pipeline's own
 *  definition. The annotation answers exactly that. */
const inCluster = (d) => Number(d?.cluster?.count ?? 0) >= 2;
const inTier = (d, tier) => inCluster(d) && d?.cluster?.tier === tier;

export const STUDIES = [
  {
    slug: "ceo-vs-cfo",
    short: "CEO versus CFO",
    title: "Do finance chiefs’ purchases beat chief executives’ purchases?",
    /** The one-line version for the index and the SERP. */
    summary:
      "Chief executives and finance directors buy their own shares for different reasons. Which purchase has gone on to beat the market more often?",
    standfirst:
      "The chief executive sees the whole business. The finance director sees the numbers first. When each buys shares in their own company, the question is which purchase has gone on to beat the market more often, measured over the identical window against the index.",
    /** Whether STUDY_FLOOR applies. */
    floor: true,
    cells: () => [
      {
        id: "cfo",
        label: "Chief financial officers",
        noun: "purchases by chief financial officers",
        test: (d, market) =>
          inRole(d, market, "chief-financial-officer") &&
          !inRole(d, market, "chief-executive"),
      },
      {
        id: "ceo",
        label: "Chief executives",
        noun: "purchases by chief executives",
        test: (d, market) =>
          inRole(d, market, "chief-executive") &&
          !inRole(d, market, "chief-financial-officer"),
      },
    ],
    compare: ["cfo", "ceo"],
    /** Where the filings behind the cells are listed by name. */
    boards: [
      { to: "/roles/chief-financial-officer", title: "CFO purchases" },
      { to: "/roles/chief-executive", title: "CEO purchases" },
    ],
    method: [
      "Roles are read from the job title filed with each disclosure, using the same classifier as the role pages: a title naming a chief executive or a chief financial officer, including the group, interim, deputy and divisional forms. A filing by someone closely associated with the insider is excluded rather than counted under the insider’s title.",
      "A person filed under both titles at once is left out of both cells. There are very few, and a purchase cannot be evidence for one side of a comparison and the other.",
    ],
    caveats: [
      "Chief executives file more purchases than finance directors in every market we record, so the CEO cell clears the floor first and the CFO cell is the one to watch. A verdict that waited only on the larger cell would be a verdict about chief executives alone.",
      "The two cells are not matched on anything else. If finance directors happen to buy at smaller companies, or in different sectors, that difference travels with them into the comparison.",
    ],
  },
  {
    slug: "does-size-matter",
    short: "Does size matter",
    title: "Does the size of an insider’s purchase predict how it does?",
    summary:
      "A small cheque and a large one are disclosed the same way. Whether the larger purchase has gone on to beat the market more often is a question the disclosures can answer once enough have had time to work out.",
    standfirst:
      "A £5,000 purchase and a £500,000 purchase arrive as the same kind of filing. The larger one is usually read as the stronger signal, on the grounds that the insider has more to lose. Whether it has actually beaten the market more often is what this page keeps recomputing.",
    floor: false,
    cells: bandCells,
    /** Largest band against smallest. Set per market, since the ladders are. */
    compare: (market) => {
      const bands = SIZE_BANDS[market] ?? SIZE_BANDS.UK;

      return [bands[bands.length - 1].id, bands[0].id];
    },
    boards: [
      { to: "/biggest-buys", title: "The biggest buys" },
      { to: "/best-performing-buys", title: "The best performing" },
    ],
    method: [
      "Purchases are banded by the value disclosed, in the market’s own currency and never converted. The bands step by roughly five times and are printed in the table; they are an editorial line, not a derived one.",
      "The verdict compares the largest band with the smallest. The bands between are shown so the shape of the whole ladder is visible, but a claim that outcome rises with size is tested at its two ends.",
      "No value floor is applied to this study, unlike the role and cluster studies. The smallest purchases are the subject of the question, not noise around it.",
    ],
    caveats: [
      "Value is the purchase, not the stake. A £20,000 purchase is a rounding error for one director and a year’s salary for another, and the disclosure does not say which.",
      "Small purchases are concentrated in small companies, whose shares move further in both directions. A wider spread of outcomes in the smallest band is partly that.",
    ],
  },
  {
    slug: "the-cluster-effect",
    short: "The cluster effect",
    title: "Do purchases made inside a cluster beat purchases made alone?",
    summary:
      "Several insiders buying the same company within a fortnight is the most-followed pattern in this data. Whether it has beaten a lone purchase, against the index, is what this page keeps recomputing.",
    standfirst:
      "Several insiders buying the same company within a fortnight is the pattern readers of these filings follow most closely, on the reasoning that people with the same information reaching the same decision is stronger evidence than one of them reaching it. This page tests that against the index.",
    floor: true,
    cells: () => [
      {
        id: "cluster",
        label: "Inside a cluster",
        noun: "purchases made inside a cluster",
        test: (d) => inCluster(d),
      },
      {
        id: "strong",
        label: "Strong cluster, within 14 days",
        noun: "purchases inside a strong cluster",
        nested: "cluster",
        test: (d) => inTier(d, "strong"),
      },
      {
        id: "soft",
        label: "Soft cluster, within 30 days",
        noun: "purchases inside a soft cluster",
        nested: "cluster",
        test: (d) => inTier(d, "soft"),
      },
      {
        id: "lone",
        label: "Lone purchases",
        noun: "lone purchases",
        test: (d) => !inCluster(d),
      },
    ],
    compare: ["cluster", "lone"],
    boards: [{ to: "/cluster-buys", title: "Cluster buying" }],
    method: [
      "A purchase is inside a cluster when the pipeline’s own annotation says so: at least one other insider bought the same company within 14 days of it (strong) or 30 days (soft), each of them above the co-buyer floor. The annotation is read per purchase, never reconstructed from the rows around it.",
      "The verdict compares every clustered purchase, either tier, with every lone one. The two tiers are shown beneath the cluster cell so the reader can see how the cell is made up, and they are not compared separately.",
      "Purchases under the co-buyer floor are excluded from both cells. A purchase the cluster definition itself does not count cannot be evidence about clusters.",
    ],
    caveats: [
      "Purchases inside one cluster are not independent of each other: they are the same company in the same fortnight, and they rise and fall together. The cell counts purchases, and the companies behind them are stated beside the count, because the second number is the honest size of the sample.",
      "Investment trusts and other closed-end vehicles never carry a cluster annotation, by design, so several trust directors buying in the same week sit in the lone cell. That is a known bias toward the lone cell, not an oversight.",
    ],
  },
];

export const STUDY_SLUGS = STUDIES.map((s) => s.slug);

export function studyBySlug(slug) {
  return STUDIES.find((s) => s.slug === String(slug ?? "")) ?? null;
}

export function studyPath(slug) {
  return slug ? `/research/${slug}` : "/research";
}

export const RESEARCH_INDEX_PATH = "/research";

// ---------------------------------------------------------------------------
// Dates. Explicit rather than Intl, so the Worker and the browser print the
// same string for the same day.
// ---------------------------------------------------------------------------

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2026-09-16" -> "16 September 2026". */
export function longDate(iso) {
  const s = String(iso ?? "").slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);

  if (!m) return s;

  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** Today as ISO, from a Date or an ISO string. */
export function isoDay(today) {
  if (typeof today === "string") return today.slice(0, 10);

  return new Date(today ?? Date.now()).toISOString().slice(0, 10);
}

function addDays(iso, days) {
  const t = Date.parse(String(iso).slice(0, 10));

  if (!isFinite(t)) return null;

  return new Date(t + days * 86_400_000).toISOString().slice(0, 10);
}

/** Whole days from `b` to `a`. Infinity when either is unparseable, so an age
 *  test excludes the row rather than admitting it. */
function daysBetween(a, b) {
  const x = Date.parse(String(a ?? "").slice(0, 10));
  const y = Date.parse(String(b ?? "").slice(0, 10));

  if (!isFinite(x) || !isFinite(y)) return Infinity;

  return Math.round((x - y) / 86_400_000);
}

// ---------------------------------------------------------------------------
// The sample
// ---------------------------------------------------------------------------

/** The date the purchase’s mark is anchored on. `buyAlpha` prefers the
 *  disclosure anchor and falls back to the trade anchor, so the age of the
 *  mark has to be measured from the same date, or a purchase disclosed late
 *  would be aged from a day its mark does not start on. */
export function anchorDate(d) {
  const lp = d?.live_performance;

  if (lp?.alpha_pct_disclosed != null && d?.disclosed_date)
    return d.disclosed_date;

  return d?.trade_date ?? d?.disclosed_date ?? null;
}

/** Days the mark covers: anchor to the latest close it was taken at. */
export function markAgeDays(d) {
  const lp = d?.live_performance;

  if (!lp?.as_of) return -Infinity;
  const age = daysBetween(lp.as_of, anchorDate(d));

  return isFinite(age) ? age : -Infinity;
}

/** The issuer’s stable identity, for the distinct-company count. Mirrors
 *  issuerKey in shared/boards.js, which is not exported: US groups on the CIK
 *  because one issuer files under two tickers; UK on the ticker. */
function issuerKey(d, market) {
  if (market === "US") return d?.issuer_cik || d?.ticker || "";

  return d?.ticker || "";
}

/** Whether a row is in a study’s universe before any horizon test: an
 *  eligible open-market purchase by an insider, above the study’s floor. */
function inUniverse(study, d, market) {
  if (!isEligibleBuy(d, market)) return false;
  if (study.floor && buyValue(d) < (STUDY_FLOOR[market] ?? 0)) return false;

  return true;
}

/** Marked, and old enough to count. */
export function isScored(d) {
  return buyAlpha(d) != null && markAgeDays(d) >= MIN_HORIZON_DAYS;
}

// ---------------------------------------------------------------------------
// Statistics. Closed-form, deterministic, no randomness anywhere: the Worker
// and the browser must arrive at the same verdict from the same rows.
// ---------------------------------------------------------------------------

/** Wilson score interval for a proportion, as ratios. Null when n is 0. */
export function wilson(k, n, z = 1.96) {
  if (!(n > 0)) return null;
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;

  return { lo: Math.max(0, centre - half), hi: Math.min(1, centre + half) };
}

/** Standard normal CDF, Abramowitz and Stegun 7.1.26. Accurate to ~1e-7,
 *  which is far inside anything a p-value here turns on. */
function normCdf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const poly =
    t *
    (0.254829592 +
      t *
        (-0.284496736 +
          t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-x * x);

  return 0.5 * (1 + (x >= 0 ? erf : -erf));
}

/** Two-sided p-value for the difference of two proportions, pooled z-test. */
export function twoProportionP(k1, n1, k2, n2) {
  if (!(n1 > 0) || !(n2 > 0)) return 1;
  const p = (k1 + k2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));

  if (!(se > 0)) return 1;
  const z = Math.abs(k1 / n1 - k2 / n2) / se;

  return Math.max(0, Math.min(1, 2 * (1 - normCdf(z))));
}

/** Purchases per cell needed for a gap of the observed size to be called at
 *  SIGNIFICANCE with 80% power. The honest answer to "how much more data would
 *  settle this": the standard two-proportion sample-size formula, rounded up,
 *  or null when the observed gap is zero. */
export function sampleForGap(p1, p2) {
  const diff = Math.abs(p1 - p2);

  if (!(diff > 0)) return null;
  const z = 1.959964 + 0.841621;

  return Math.ceil((z * z * (p1 * (1 - p1) + p2 * (1 - p2))) / (diff * diff));
}

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

function cellStats(rows, market) {
  const alphas = rows.map((d) => buyAlpha(d));
  const beats = alphas.filter((a) => a > 0).length;
  const n = rows.length;

  return {
    n,
    beats,
    companies: new Set(rows.map((d) => issuerKey(d, market))).size,
    /** Null under the floor: not "unknown", but "not stated". */
    beatRate: n >= MIN_CELL ? beats / n : null,
    interval: n >= MIN_CELL ? wilson(beats, n) : null,
    medianAlpha: n >= MIN_CELL ? median(alphas) : null,
    meanAlpha:
      n >= MIN_CELL ? alphas.reduce((s, a) => s + a, 0) / n : null,
  };
}

/** When a cell under the floor should clear it.
 *
 *  Two sources, used in order. First the QUEUE: purchases already in the cell
 *  that have not yet had MIN_HORIZON_DAYS on the clock, each of which matures
 *  on a known date. If the queue alone carries the cell over the floor, the
 *  date is the day the last needed one matures, and it is a date rather than
 *  a forecast. If it does not, the remainder is projected from the cell’s
 *  ARRIVAL RATE over the last ARRIVAL_WEEKS, plus the horizon those arrivals
 *  will then need. A cell that is not currently receiving filings gets no
 *  date, and the page says so. */
function clearance(cellRows, todayIso) {
  const scored = cellRows.filter(isScored);
  const needed = Math.max(0, MIN_CELL - scored.length);

  if (needed === 0) return null;

  const queue = cellRows
    .filter((d) => !isScored(d))
    .map((d) => addDays(anchorDate(d), MIN_HORIZON_DAYS))
    .filter((iso) => iso && iso > todayIso)
    .sort();

  const recentSince = addDays(todayIso, -ARRIVAL_WEEKS * 7);
  const recent = cellRows.filter((d) => {
    const a = anchorDate(d);

    return a && a >= recentSince && a <= todayIso;
  }).length;
  const rateWeekly = recent / ARRIVAL_WEEKS;

  if (queue.length >= needed) {
    return {
      needed,
      queued: queue.length,
      rateWeekly,
      clearsOn: queue[needed - 1],
      fromQueue: true,
    };
  }

  const remaining = needed - queue.length;

  if (!(rateWeekly > 0)) {
    return {
      needed,
      queued: queue.length,
      rateWeekly,
      clearsOn: null,
      fromQueue: false,
    };
  }

  const lastFiled = addDays(todayIso, Math.ceil((remaining / rateWeekly) * 7));

  return {
    needed,
    queued: queue.length,
    rateWeekly,
    clearsOn: addDays(lastFiled, MIN_HORIZON_DAYS),
    fromQueue: false,
  };
}

/** Compute one study over a dealings window.
 *
 *  Returns everything both renderers print: the universe, the cells with
 *  their counts and (above the floor) their rates, the verdict, and the dates
 *  the page states. `today` is passed so the two renderers, and any test, can
 *  agree on it. */
export function computeStudy(study, dealings, market, today = new Date()) {
  const todayIso = isoDay(today);
  const rows = dealings ?? [];
  const universe = rows.filter((d) => inUniverse(study, d, market));
  const scored = universe.filter(isScored);

  const cellDefs = study.cells(market);
  const cells = cellDefs.map((def) => {
    const cellRows = universe.filter((d) => def.test(d, market));
    const cellScored = cellRows.filter(isScored);

    return {
      id: def.id,
      label: def.label,
      noun: def.noun ?? def.label.toLowerCase(),
      nested: def.nested ?? null,
      ...cellStats(cellScored, market),
      clearance: clearance(cellRows, todayIso),
    };
  });

  const all = cellStats(scored, market);
  const compareIds =
    typeof study.compare === "function"
      ? study.compare(market)
      : study.compare;
  const compared = compareIds.map((id) => cells.find((c) => c.id === id));

  const asOf =
    scored
      .map((d) => d.live_performance?.as_of)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  const recentSince = addDays(todayIso, -ARRIVAL_WEEKS * 7);
  const arrivalsWeekly =
    universe.filter((d) => {
      const a = anchorDate(d);

      return a && a >= recentSince && a <= todayIso;
    }).length / ARRIVAL_WEEKS;

  return {
    slug: study.slug,
    market,
    computedOn: todayIso,
    asOf,
    universe: {
      eligible: rows.filter((d) => isEligibleBuy(d, market)).length,
      inScope: universe.length,
      scored: scored.length,
      companies: all.companies,
      beatRate: all.n >= MIN_CELL ? all.beats / all.n : null,
      arrivalsWeekly,
    },
    cells,
    compareIds,
    verdict: verdictFor(compared),
  };
}

/** The verdict, from the two compared cells. See the header for the three
 *  states. `a` is the cell the question is about (the CFO, the largest band,
 *  the cluster); `b` is what it is measured against. */
function verdictFor([a, b]) {
  if (!a || !b) return { state: "waiting", missing: [] };

  const missing = [a, b].filter((c) => c.clearance);

  if (missing.length > 0) {
    return {
      state: "waiting",
      missing: missing.map((c) => ({
        id: c.id,
        label: c.label,
        n: c.n,
        ...c.clearance,
      })),
    };
  }

  const p = twoProportionP(a.beats, a.n, b.beats, b.n);
  const gap = a.beatRate - b.beatRate;

  if (p < SIGNIFICANCE) {
    return {
      state: "answered",
      p,
      gap,
      leader: gap > 0 ? a.id : b.id,
      trailer: gap > 0 ? b.id : a.id,
    };
  }

  return {
    state: "open",
    p,
    gap,
    leader: gap > 0 ? a.id : gap < 0 ? b.id : null,
    /** Per cell, for a gap this size to be called. */
    neededPerCell: sampleForGap(a.beatRate, b.beatRate),
  };
}

// ---------------------------------------------------------------------------
// Words. Both renderers print these, so the numbers a study states are typed
// out in one place.
// ---------------------------------------------------------------------------

export const pct = (ratio) =>
  ratio == null ? "n/a" : `${Math.round(ratio * 100)}%`;

export const signedPp = (ratio) =>
  ratio == null
    ? "n/a"
    : `${ratio > 0 ? "+" : ""}${(ratio * 100).toFixed(1)}pp`;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** The headline sentence for a study in its current state. Short enough to
 *  set at display scale. */
export function verdictHeadline(result) {
  const { verdict, cells } = result;
  const byId = (id) => cells.find((c) => c.id === id);

  if (verdict.state === "waiting") {
    const short = verdict.missing.length === 1 ? byId(verdict.missing[0].id) : null;

    return short
      ? `Not enough ${short.noun} yet to say`
      : "Not enough purchases yet to say";
  }

  const lead = byId(verdict.leader);
  const trail = byId(verdict.trailer ?? null);

  if (verdict.state === "answered" && lead && trail) {
    return `${capitalise(lead.noun)} have beaten the index more often than ${trail.noun}: ${pct(lead.beatRate)} to ${pct(trail.beatRate)}`;
  }

  return "Too close to call at this sample";
}

const capitalise = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

/** The supporting paragraph under the headline: what was measured, with the
 *  numbers, and in the waiting state exactly what is missing and when. */
export function verdictDetail(result, market) {
  const { verdict, cells, compareIds, universe } = result;
  const byId = (id) => cells.find((c) => c.id === id);
  const [a, b] = compareIds.map(byId);

  if (verdict.state === "waiting") {
    const parts = verdict.missing.map((m) => {
      const have = `${m.label} have ${plural(m.n, "marked purchase", "marked purchases")} with at least ${MIN_HORIZON_DAYS} days on the clock, and the rate appears at ${MIN_CELL}.`;

      const queued =
        m.queued === 0
          ? "None are"
          : `${plural(m.queued, "more is", "more are")}`;

      if (m.clearsOn && m.fromQueue) {
        return `${have} ${queued} already filed and waiting to reach that horizon; the ${ordinal(m.needed)} of them does so on ${longDate(m.clearsOn)}, which is when this cell should clear.`;
      }
      if (m.clearsOn) {
        return `${have} ${queued} filed and waiting to reach that horizon, which is not enough on its own. At the recent rate of ${m.rateWeekly.toFixed(1)} a week, the cell should clear around ${longDate(m.clearsOn)}.`;
      }

      return `${have} ${queued} filed and waiting to reach that horizon, and none have been filed in the last ${ARRIVAL_WEEKS} weeks, so there is no date to give.`;
    });

    const ready = [a, b].filter((c) => c && !c.clearance);
    const readyLine = ready.length
      ? ` ${ready.map((c) => `${capitalise(c.noun)} already clear it, with ${c.n}.`).join(" ")}`
      : "";

    return `${parts.join(" ")}${readyLine}`;
  }

  const base = `Across all ${universe.scored} ${market === "US" ? "insider" : "director"} purchases in scope, ${pct(universe.beatRate)} beat the index.`;
  const pair = `${capitalise(a.noun)}: ${pct(a.beatRate)} of ${a.n} beat it, median alpha ${signedPp(a.medianAlpha)}. ${capitalise(b.noun)}: ${pct(b.beatRate)} of ${b.n}, median alpha ${signedPp(b.medianAlpha)}.`;

  if (verdict.state === "answered") {
    return `${pair} A gap this size would come up by chance about ${chanceIn(verdict.p)}. ${base}`;
  }

  const need = verdict.neededPerCell
    ? ` To call a gap of ${Math.abs(Math.round(verdict.gap * 100))} points, each cell would need about ${verdict.neededPerCell} purchases; the smaller has ${Math.min(a.n, b.n)}.`
    : "";

  return `${pair} The difference is inside what chance would produce at this sample (p = ${verdict.p.toFixed(2)}).${need} ${base}`;
}

/** "one time in twenty", "one time in three hundred". */
function chanceIn(p) {
  if (!(p > 0)) return "never";
  const inv = Math.round(1 / p);

  if (inv >= 1000) return "one time in a thousand or fewer";
  if (inv >= 100) return `one time in ${Math.round(inv / 50) * 50}`;

  return `one time in ${inv}`;
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;

  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/** The short state label the index shows beside each study. */
export function stateLabel(result) {
  const { verdict } = result;

  if (verdict.state === "answered") return "Answered";
  if (verdict.state === "open") return "Too close to call";
  const short = verdict.missing.reduce((s, m) => s + m.needed, 0);

  return `Waiting on ${plural(short, "purchase", "purchases")}`;
}

/** One sentence on the dataset, for the note every study carries. */
export function datasetSentence(result, market) {
  const { universe, asOf } = result;
  const noun = market === "US" ? "insider" : "director";

  return `${universe.scored} ${noun} purchases with a mark and at least ${MIN_HORIZON_DAYS} days on the clock, across ${universe.companies} companies, out of ${universe.inScope} in scope and ${universe.eligible} eligible open-market purchases recorded since ${trackingSinceLabel(market)}. Prices to ${asOf ? longDate(asOf) : "the latest cached close"}; recomputed on every load.`;
}

/** The citation the page prints. `accessed` is the reader’s date. */
export function citation(study, result, host, accessed) {
  const url = `https://${host}${studyPath(study.slug)}`;

  return {
    title: study.title,
    url,
    computedOn: longDate(result.computedOn),
    asOf: result.asOf ? longDate(result.asOf) : null,
    accessed: longDate(isoDay(accessed)),
    /** One line, for copying. */
    line: `ddbx (${result.computedOn.slice(0, 4)}). ${study.title} ${url}. Computed ${longDate(result.computedOn)}${result.asOf ? ` from prices to ${longDate(result.asOf)}` : ""}. Accessed ${longDate(isoDay(accessed))}.`,
  };
}

/** Published methodology shared by every study, rendered by both renderers.
 *  The per-study lines come from each entry’s `method`. */
export const METHODOLOGY = [
  "Only open-market purchases by insiders count, on the same test every board on the site applies: UK rows classified as open-market buys against the trade-day close, US rows from a feed restricted to Form 4 transaction code P, and no filer whose only role is a ten-percent holding.",
  `A purchase enters the sample once it has had at least ${MIN_HORIZON_DAYS} days between the close it is measured from and the latest close on file. The mark runs to that latest close, so an older purchase has had longer: the horizon is a minimum, not a fixed window.`,
  "Each purchase is measured from the closing price on the day it was disclosed, the first price a reader could have paid, or from the trade-day close where the disclosure-day close is not on file. Alpha is the share’s return minus the index’s over the identical window: the FTSE All-Share for UK purchases, the S&P 500 for US ones.",
  `A cell’s beat rate is the share of its purchases with alpha above zero. It is stated only once the cell holds ${MIN_CELL} purchases; below that the count is shown and the rate is not, because a percentage over a handful of purchases is an anecdote wearing a number.`,
  `Two cells are compared with a pooled two-proportion test, and the gap is called real only when the chance of seeing one that size by luck is under ${Math.round(SIGNIFICANCE * 100)}%. When both cells clear the floor and the gap is not called, the page says so, and states how many purchases per cell a gap of that size would need.`,
  "Median alpha is reported beside each rate as context. The verdict is taken on the rate alone.",
  "Every figure is recomputed from the live corpus on every load. Nothing is cached in the page, so the numbers a reader cites are the numbers on the day they read them, and the page states that day.",
  "Past performance is not a reliable indicator of future results. These pages describe what has already happened to a share price after a kind of purchase; they recommend nothing.",
];
