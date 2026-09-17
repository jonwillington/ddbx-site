// Living studies — /research and /us/research, index and /:slug.
//
// Plain ESM at the root, imported by both src/pages/research.tsx and
// shared/research-prerender.js, for the reason every board module gives: a
// study whose pre-rendered verdict differs from its hydrated verdict is worse
// than no study. Here that matters more than on a board, because the whole
// point of the page is to be the thing a reader cites.
//
// ---------------------------------------------------------------------------
// What a living study is
// ---------------------------------------------------------------------------
//
// An evergreen research question answered from the record on every load,
// under one standing rule: a conclusion is published only once the sample
// makes it defensible, and until then the page says exactly what is missing
// and when it should exist. Three states:
//
//   waiting   — at least one compared cell is under MIN_CELL purchases or
//               MIN_COMPANIES companies. No rate is printed for that cell. The
//               page states what the cell has, what it needs, and the date it
//               should clear, from the purchases already filed and waiting to
//               reach the horizon, or from the recent arrival rate when those
//               alone are not enough. A waiting study is noindexed and kept
//               out of the sitemap: its content is a promise, not a result.
//   open      — every compared cell clears both floors, and the company-
//               clustered test does not put the difference under SIGNIFICANCE.
//               Stated as a finding: too close to call at this sample, with
//               the estimate, its interval and what a gap that size would need.
//   answered  — the clustered test clears SIGNIFICANCE. The page states the
//               direction and nothing stronger: that the cells differed over
//               this record by more than chance would produce, allowing for
//               purchases in the same company moving together.
//
// ---------------------------------------------------------------------------
// The measurement (review round, 17 September 2026)
// ---------------------------------------------------------------------------
//
// The first build scored each purchase on `live_performance`, the return to
// the LATEST close. A March purchase had six months on that clock and a June
// one had three, so a gap between two cells was partly a gap in how long each
// cell's purchases had been held. It is gone. Every purchase is now scored on
// one fixed window:
//
//   - HORIZON_DAYS = 90 from the DISCLOSURE-day close (the first price a reader
//     could have paid), against the market index over the identical 90 days.
//     The rows come from ddbx-data's `outcomes` table via /api/outcomes, which
//     computes both legs from stored closes and flags what looks wrong rather
//     than dropping it. 90 rather than 180 because on 17 September 2026 the
//     180-day slice held 104 UK purchases and no US ones, which clears
//     nothing; 90 held 634 UK and 714 US.
//   - A purchase counts only once its 90 days have elapsed AND its outcome
//     row is clean. Rows flagged `extreme` (a move outside 0.34x-3x, usually an
//     unadjusted split), `stale_exit` / `stale_entry` (the price series stops
//     more than ten days short, so the share's window is shorter than the
//     index's) or `no_bench` are left out, and counted on the page.
//   - The outcome per purchase is whether its abnormal return was above zero:
//     the BEAT RATE framing the director pages use (commit a1b9431). Median
//     and mean abnormal return are shown beside it, not judged.
//
// ---------------------------------------------------------------------------
// The inference
// ---------------------------------------------------------------------------
//
// Purchases are not independent. Several directors of one company buying in
// one fortnight share every day of their 90-day window, and one insider's
// repeat purchases share most of theirs. A test that counts each purchase as
// an independent coin tells a reader 150 purchases of evidence when the
// honest number is closer to the 55 companies behind them. So:
//
//   - Every comparison is an OLS regression of the 0/1 beat indicator on one
//     regressor, with a CLUSTER-ROBUST (sandwich) variance clustered on the
//     issuer, the CR1 small-sample factor, and a t reference on G - 1 degrees
//     of freedom (G = companies in the test). With a 0/1 regressor the slope
//     IS the difference in beat rates; with an ordered band index it is the
//     linear trend, the clustered equivalent of a Cochran-Armitage test.
//     Clustering on the issuer nests the cluster-buying episodes (an episode
//     is one company), so it allows for same-episode correlation too.
//   - Each cell's 95% interval is a Wilson interval on the cell's EFFECTIVE
//     sample: purchases divided by the cell's design effect (clustered
//     variance over naive, floored at one).
//   - Floors are set in companies as well as purchases, and "what it would
//     take" is stated in both.
//
// Closed-form and deterministic throughout: the Worker and the browser must
// reach one verdict from one set of rows.
//
// Nothing here names a person. Cells are roles, size bands and cluster
// membership; the filings behind each cell are one click away on the boards
// that list them.

import { buyValue, isEligibleBuy } from "./leaderboard.js";
import { inRole } from "./roles.js";
import { median } from "./boards.js";
import { trackingSinceLabel, TRACKING_SINCE_DATE } from "./tracking.js";

// ---------------------------------------------------------------------------
// Thresholds. Every one of these is printed on the page rather than applied
// quietly, and each has a reason next to it.
// ---------------------------------------------------------------------------

/** The one window every purchase is measured over. See the header. */
export const HORIZON_DAYS = 90;

/** The close the window starts from. See the header. */
export const OUTCOME_ANCHOR = "disclosed";

/** Outcome flags that keep a purchase out of the sample. */
export const EXCLUDED_FLAGS = ["extreme", "stale_exit", "stale_entry", "no_bench"];

/** Resolved purchases a cell needs before its beat rate is stated.
 *
 *  Thirty is where a 95% interval on a rate near the coin-flip base narrows to
 *  about ±17 points with independent purchases, the widest interval that can
 *  still exclude "no better than the market" for a cell doing well. With
 *  clustered purchases the interval is wider than that, which is what the
 *  company floor below is for. */
export const MIN_CELL = 30;

/** Distinct companies a cell needs before its beat rate is stated.
 *
 *  Twenty, because the variance here is estimated from companies, not
 *  purchases, and a cluster-robust variance is unreliable with few clusters:
 *  the practitioner guidance (Cameron and Miller, 2015) puts the danger zone
 *  below roughly 20 to 50 clusters, where tests reject too often. Two cells of
 *  20 put at least 40 companies into every comparison, and the t reference on
 *  G - 1 degrees of freedom covers some of the rest. A cell of 30 purchases
 *  from 6 companies is six observations, and this is the floor that says so. */
export const MIN_COMPANIES = 20;

/** Two-sided p-value under which a difference or trend is called real. */
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

/** Where the studies read from: the whole record, not the boards' rolling
 *  twelve months, so a well-aged purchase is never dropped for being old. */
export const STUDY_SINCE = TRACKING_SINCE_DATE;

// ---------------------------------------------------------------------------
// The studies
// ---------------------------------------------------------------------------

/** Value bands, per market, stepping by four to five times.
 *
 *  UK: the ladder the first build published. US: re-cut on 17 September 2026
 *  when the studies moved to the whole Form 4 record (`view=all`), which runs
 *  from a few hundred dollars (the median resolved purchase is about $30,000)
 *  rather than the curated feed's $50,000 floor. The edges were set so each
 *  band holds enough companies to reach the floor on that record. */
const SIZE_BANDS = {
  UK: [
    { id: "under-10k", label: "Under £10,000", noun: "under £10,000", lo: 0, hi: 10_000 },
    { id: "10k-50k", label: "£10,000 to £50,000", noun: "of £10,000 to £50,000", lo: 10_000, hi: 50_000 },
    { id: "50k-250k", label: "£50,000 to £250,000", noun: "of £50,000 to £250,000", lo: 50_000, hi: 250_000 },
    { id: "250k-up", label: "£250,000 and over", noun: "of £250,000 and over", lo: 250_000, hi: Infinity },
  ],
  US: [
    { id: "under-25k", label: "Under $25,000", noun: "under $25,000", lo: 0, hi: 25_000 },
    { id: "25k-100k", label: "$25,000 to $100,000", noun: "of $25,000 to $100,000", lo: 25_000, hi: 100_000 },
    { id: "100k-500k", label: "$100,000 to $500,000", noun: "of $100,000 to $500,000", lo: 100_000, hi: 500_000 },
    { id: "500k-up", label: "$500,000 and over", noun: "of $500,000 and over", lo: 500_000, hi: Infinity },
  ],
};

const bandsFor = (market) => SIZE_BANDS[market] ?? SIZE_BANDS.UK;

const bandCells = (market) =>
  bandsFor(market).map((b) => ({
    id: b.id,
    label: b.label,
    noun: `purchases ${b.noun}`,
    test: (p) => p.value >= b.lo && p.value < b.hi,
  }));

/** Whether a purchase carries the pipeline's cluster annotation. Per row, as
 *  the pipeline asserts it: NOT the episode grouping in shared/boards.js,
 *  because the question here is about the purchase — was this buy made while
 *  at least one other insider was buying the same company, on the pipeline's
 *  own definition. */
const inCluster = (d) => Number(d?.cluster?.count ?? 0) >= 2;
const inTier = (d, tier) => inCluster(d) && d?.cluster?.tier === tier;

export const STUDIES = [
  {
    slug: "ceo-vs-cfo",
    short: "CEO versus CFO",
    title: "Do finance chiefs’ purchases beat chief executives’ purchases?",
    /** The one-line version for the index and the SERP. */
    summary:
      "Chief executives and finance directors buy their own shares for different reasons. Which purchase has gone on to beat the market more often over the following 90 days?",
    standfirst:
      "The chief executive sees the whole business. The finance director sees the numbers first. When each buys shares in their own company, the question is which purchase has gone on to beat the market more often, measured over the same 90 days against the index.",
    /** Whether STUDY_FLOOR applies. */
    floor: true,
    /** "difference" compares two cells; "trend" tests an ordered ladder. */
    test: "difference",
    cells: () => [
      {
        id: "cfo",
        label: "Chief financial officers",
        noun: "purchases by chief financial officers",
        test: (p, market) =>
          inRole(p.row, market, "chief-financial-officer") &&
          !inRole(p.row, market, "chief-executive"),
      },
      {
        id: "ceo",
        label: "Chief executives",
        noun: "purchases by chief executives",
        test: (p, market) =>
          inRole(p.row, market, "chief-executive") &&
          !inRole(p.row, market, "chief-financial-officer"),
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
      "Chief executives file more purchases than finance directors in every market we record, so the CEO cell clears the floors first and the CFO cell is the one to watch. A verdict that waited only on the larger cell would be a verdict about chief executives alone.",
      "The two cells are not matched on anything else. If finance directors happen to buy at smaller companies, or in different sectors, that difference travels with them into the comparison.",
    ],
  },
  {
    slug: "does-size-matter",
    short: "Does size matter",
    title: "Does the size of an insider’s purchase predict how it does?",
    summary:
      "A small cheque and a large one are disclosed the same way. Whether larger purchases have gone on to beat the market more often over 90 days is a question the disclosures can answer once enough have had time to work out.",
    standfirst:
      "A small purchase and a very large one arrive as the same kind of filing. The larger one is usually read as the stronger signal, on the grounds that the insider has more to lose. Whether larger purchases have actually beaten the market more often is what this page keeps recomputing.",
    floor: false,
    test: "trend",
    cells: bandCells,
    /** Every band, smallest first: the trend test reads the whole ladder. */
    compare: (market) => bandsFor(market).map((b) => b.id),
    boards: [
      { to: "/biggest-buys", title: "The biggest buys" },
      { to: "/best-performing-buys", title: "The best performing" },
    ],
    method: [
      "Purchases are banded by the value disclosed, in the market’s own currency and never converted. The bands step by four to five times and are printed in the table; they are an editorial line, not a derived one.",
      "The verdict is a trend test across every band in order, not a comparison of the two ends: it asks whether the share beating the index tends to move in one direction as size goes up. A significant trend says the ladder leans one way overall. It does not say every step up in size does better than the one below it, and the table shows where it does not.",
      "No value floor is applied to this study, unlike the role and cluster studies. The smallest purchases are the subject of the question, not noise around it.",
    ],
    caveats: [
      "Value is the purchase, not the stake. A £20,000 purchase is a rounding error for one director and a year’s salary for another, and the disclosure does not say which.",
      "Small purchases are concentrated in small companies, whose shares move further in both directions. Any difference between the bands is partly a difference between the companies in them.",
    ],
  },
  {
    slug: "the-cluster-effect",
    short: "The cluster effect",
    title: "Do purchases made inside a cluster beat purchases made alone?",
    summary:
      "Several insiders buying the same company within a fortnight is the most-followed pattern in this data. Whether it has beaten a lone purchase against the index, over the same 90 days, is what this page keeps recomputing.",
    standfirst:
      "Several insiders buying the same company within a fortnight is the pattern readers of these filings follow most closely, on the reasoning that people with the same information reaching the same decision is stronger evidence than one of them reaching it. This page tests that against the index.",
    floor: true,
    test: "difference",
    cells: () => [
      {
        id: "cluster",
        label: "Inside a cluster",
        noun: "purchases made inside a cluster",
        test: (p) => inCluster(p.row),
      },
      {
        id: "strong",
        label: "Strong cluster, within 14 days",
        noun: "purchases inside a strong cluster",
        nested: "cluster",
        test: (p) => inTier(p.row, "strong"),
      },
      {
        id: "soft",
        label: "Soft cluster, within 30 days",
        noun: "purchases inside a soft cluster",
        nested: "cluster",
        test: (p) => inTier(p.row, "soft"),
      },
      {
        id: "lone",
        label: "Lone purchases",
        noun: "lone purchases",
        test: (p) => !inCluster(p.row),
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
      "Purchases inside one cluster share a company and most of their 90 days, so they rise and fall together. The test allows for that by treating each company, not each purchase, as the unit of evidence, which is why the companies column sits beside every count.",
      "Purchases in different companies over the same weeks are not fully independent either: a sector that had a good quarter lifts every purchase in it. Measuring against the index removes the market’s move, not a sector’s.",
      "Investment trusts and other closed-end vehicles never carry a cluster annotation, by design, so several trust directors buying in the same week sit in the lone cell. That is a known bias toward the lone cell, not an oversight.",
    ],
  },
];

export const STUDY_SLUGS = STUDIES.map((s) => s.slug);

export function studyBySlug(slug) {
  return STUDIES.find((s) => s.slug === String(slug ?? "")) ?? null;
}

// ---------------------------------------------------------------------------
// Paths. Path-based, not host-based: /research is UK and /us/research is US
// on any host, each canonical on its owning domain (ddbx.uk / ddbx.us).
// ---------------------------------------------------------------------------

export const RESEARCH_INDEX_PATH = "/research";

const RESEARCH_BASE = { UK: "/research", US: "/us/research" };

export const RESEARCH_HOST = { UK: "ddbx.uk", US: "ddbx.us" };

export function researchIndexPath(market = "UK") {
  return RESEARCH_BASE[market] ?? RESEARCH_BASE.UK;
}

export function studyPath(slug, market = "UK") {
  const base = researchIndexPath(market);

  return slug ? `${base}/${slug}` : base;
}

/** The market a research path belongs to, and the study it names. `study` is
 *  null for the index, `undefined` for a slug the module does not know, and
 *  the whole result is null for a path outside the family. */
export function parseResearchPath(pathname) {
  const path = String(pathname ?? "").replace(/\/+$/, "");
  const m = /^(\/us)?\/research(?:\/([^/]+))?$/.exec(path);

  if (!m) return null;
  const market = m[1] ? "US" : "UK";

  if (!m[2]) return { market, study: null };
  let slug;

  try {
    slug = decodeURIComponent(m[2]);
  } catch {
    slug = m[2];
  }

  return { market, study: studyBySlug(slug) ?? undefined };
}

export function studyCanonical(slug, market) {
  return `https://${RESEARCH_HOST[market] ?? RESEARCH_HOST.UK}${studyPath(slug, market)}`;
}

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

// ---------------------------------------------------------------------------
// Fetching. Both renderers call these, the browser through its in-memory
// cache (src/lib/study-inputs.ts), the Function with Cloudflare's.
// ---------------------------------------------------------------------------

/** The dealings request a study page reads: the whole record from STUDY_SINCE,
 *  bounded on the disclosure date (the date the outcome is anchored on), and
 *  for the US the whole Form 4 record rather than the curated feed. Exported
 *  so the hover prefetch asks for exactly the same window. */
export function studyWindow(market) {
  return {
    market,
    since: STUDY_SINCE,
    view: market === "US" ? "all" : null,
    windowOn: "disclosed",
  };
}

/** One slice of /api/outcomes. Returns `{ ok, body }`; `ok` false on any
 *  failure, which the pages render as "couldn't load", never as an empty
 *  study. */
export async function fetchOutcomes({
  apiBase,
  market,
  fetchImpl = fetch,
  cf = null,
}) {
  const qs = new URLSearchParams({
    market,
    horizon: String(HORIZON_DAYS),
    anchor: OUTCOME_ANCHOR,
  });

  try {
    const res = await fetchImpl(`${apiBase}/outcomes?${qs}`, {
      headers: { accept: "application/json" },
      ...(cf ? { cf } : {}),
    });

    if (!res.ok) return { ok: false, body: null };
    const body = await res.json();

    if (!Array.isArray(body?.outcomes)) return { ok: false, body: null };

    return { ok: true, body };
  } catch {
    return { ok: false, body: null };
  }
}

// ---------------------------------------------------------------------------
// The purchases
// ---------------------------------------------------------------------------

/** The issuer's stable identity, the unit the variance is clustered on.
 *  Mirrors issuerKey in shared/boards.js: US groups on the CIK because one
 *  issuer files under two tickers; UK on the ticker. */
function issuerKey(d, market) {
  if (market === "US") return d?.issuer_cik || d?.ticker || "";

  return d?.ticker || "";
}

const day = (iso) => String(iso ?? "").slice(0, 10);

/** The feed rows as purchases, keyed the way /api/outcomes keys events.
 *
 *  UK: one row, one purchase, keyed on the dealing id.
 *  US: one Form 4 purchase is (filing, transaction code, reporter), and a
 *  filing with several fills arrives as several rows. They are one purchase:
 *  counting a thirty-fill order thirty times would hand one insider thirty
 *  votes. Value is summed; the representative row is the one carrying the
 *  largest cluster count (the rows share a filer, an issuer and a title).
 *  Only direct holdings outside 10b5-1 plans, which is the population the
 *  outcomes pass computes: a purchase it never scores cannot be queued. */
export function toPurchases(dealings, market) {
  const byKey = new Map();

  for (const d of dealings ?? []) {
    if (!isEligibleBuy(d, market)) continue;
    if (market === "US" && (d.direct_indirect !== "D" || d.aff_10b5_one)) {
      continue;
    }
    const key =
      market === "US"
        ? `${d.filing_id}|${d.transaction_code}|${d.reporter?.cik ?? ""}`
        : String(d.id);
    const date = day(d.disclosed_date || d.trade_date);
    const hit = byKey.get(key);

    if (!hit) {
      byKey.set(key, {
        key,
        company: issuerKey(d, market),
        date,
        value: buyValue(d),
        row: d,
      });
      continue;
    }
    hit.value += buyValue(d);
    if (date > hit.date) hit.date = date;
    if (Number(d?.cluster?.count ?? 0) > Number(hit.row?.cluster?.count ?? 0)) {
      hit.row = d;
    }
  }

  return [...byKey.values()];
}

/** Attach each purchase's outcome and status.
 *
 *    resolved  — clean 90-day outcome: `beat` and `alpha` (a RATIO) are set.
 *    flagged   — an outcome row exists but carries an EXCLUDED_FLAGS flag.
 *    unpriced  — the 90 days have elapsed and no outcome row exists: the
 *                closes needed are not on file.
 *    pending   — the 90 days have not elapsed. `maturesOn` is when they do.
 */
function withOutcomes(purchases, outcomes, todayIso) {
  const byId = new Map((outcomes ?? []).map((o) => [String(o.event_id), o]));

  return purchases.map((p) => {
    const o = byId.get(p.key);
    const date = o?.anchor_date ? day(o.anchor_date) : p.date;
    const maturesOn = addDays(date, HORIZON_DAYS);

    if (o) {
      const flags = Array.isArray(o.flags)
        ? o.flags
        : String(o.flags ?? "").split(",").filter(Boolean);
      const bad = flags.filter((f) => EXCLUDED_FLAGS.includes(f));

      if (bad.length > 0 || o.abnormal_return_pct == null) {
        return { ...p, date, maturesOn, status: "flagged", flags: bad };
      }

      return {
        ...p,
        date,
        maturesOn,
        status: "resolved",
        alpha: Number(o.abnormal_return_pct) / 100,
        beat: Number(o.abnormal_return_pct) > 0,
        exitDate: day(o.exit_date),
      };
    }

    if (maturesOn && maturesOn > todayIso) {
      return { ...p, date, maturesOn, status: "pending" };
    }

    return { ...p, date, maturesOn, status: "unpriced" };
  });
}

// ---------------------------------------------------------------------------
// Statistics. Closed-form, deterministic, no randomness anywhere: the Worker
// and the browser must arrive at the same verdict from the same rows.
// ---------------------------------------------------------------------------

/** Wilson score interval for a proportion, as ratios. `n` may be fractional
 *  (an effective sample). Null when n is not positive. */
export function wilson(k, n, z = 1.96) {
  if (!(n > 0)) return null;
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;

  return { lo: Math.max(0, centre - half), hi: Math.min(1, centre + half) };
}

/** Standard normal CDF.
 *
 *  Abramowitz and Stegun 7.1.26 approximates erf, to about 1.5e-7, and
 *  Φ(x) = ½(1 + erf(x/√2)). The first build passed x where erf needs x/√2,
 *  which is Φ(x√2): every p-value came out far too small (a z of 2 read as
 *  p ≈ 0.005 instead of 0.046). Tested against Φ(1.96) and Φ(1). */
export function normCdf(x) {
  const u = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * u);
  const poly =
    t *
    (0.254829592 +
      t *
        (-0.284496736 +
          t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-u * u);

  return 0.5 * (1 + (x >= 0 ? erf : -erf));
}

/** ln Γ(z), Lanczos (g = 7, n = 9). */
function logGamma(z) {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];

  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  const x = z - 1;
  let a = c[0];
  const t = x + 7.5;

  for (let i = 1; i < 9; i++) a += c[i] / (x + i);

  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Continued fraction for the incomplete beta (Numerical Recipes, betacf). */
function betaCf(a, b, x) {
  const TINY = 1e-300;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);

  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a - 1 + m2) * (a + m2));

    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + 1 + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;

    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }

  return h;
}

/** Regularised incomplete beta I_x(a, b). */
export function incompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log(1 - x),
  );

  return x < (a + 1) / (a + b + 2)
    ? (front * betaCf(a, b, x)) / a
    : 1 - (front * betaCf(b, a, 1 - x)) / b;
}

/** Two-sided p-value for a t statistic on `df` degrees of freedom. */
export function tTwoSidedP(t, df) {
  if (!isFinite(t)) return 0;
  if (!(df > 0)) return 1;

  return Math.max(0, Math.min(1, incompleteBeta(df / (df + t * t), df / 2, 0.5)));
}

/** The critical t for a two-sided 95% interval, by bisection on tTwoSidedP. */
export function tCritical(df, alpha = SIGNIFICANCE) {
  if (!(df > 0)) return Infinity;
  let lo = 0;
  let hi = 1000;

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;

    if (tTwoSidedP(mid, df) > alpha) lo = mid;
    else hi = mid;
  }

  return (lo + hi) / 2;
}

/** OLS of y on one regressor x, with a cluster-robust (sandwich) variance.
 *
 *  `obs` is `[{ x, y, g }]`, `g` the cluster (the issuer). Returns the slope,
 *  its CR1 standard error (G/(G-1) · (N-1)/(N-2), as Stata and statsmodels
 *  apply it), the homoskedastic naive standard error for comparison, the
 *  cluster count, and a two-sided p on G - 1 degrees of freedom. Null when the
 *  regressor does not vary or there are fewer than two clusters.
 *
 *  With x in {0, 1} the slope is exactly the difference in means between the
 *  two groups; with x an ordered band score it is the linear trend. */
export function clusteredSlope(obs) {
  const rows = (obs ?? []).filter(
    (o) => isFinite(o?.x) && isFinite(o?.y) && o?.g != null,
  );
  const n = rows.length;

  if (n < 3) return null;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;

  for (const { x, y } of rows) {
    sx += x;
    sy += y;
    sxx += x * x;
    sxy += x * y;
  }
  const det = n * sxx - sx * sx;

  if (!(det > 1e-12)) return null;
  // (X'X)^-1 = [[sxx, -sx], [-sx, n]] / det
  const i00 = sxx / det;
  const i01 = -sx / det;
  const i11 = n / det;
  const b0 = i00 * sy + i01 * sxy;
  const b1 = i01 * sy + i11 * sxy;

  const scores = new Map();
  let ssr = 0;

  for (const { x, y, g } of rows) {
    const u = y - b0 - b1 * x;
    const s = scores.get(g) ?? [0, 0];

    s[0] += u;
    s[1] += x * u;
    scores.set(g, s);
    ssr += u * u;
  }
  const clusters = scores.size;

  if (clusters < 2) return null;
  // Meat M = Σ_g s_g s_g'; the slope's variance is row 1 of inv · M · inv.
  let m00 = 0;
  let m01 = 0;
  let m11 = 0;

  for (const [s0, s1] of scores.values()) {
    m00 += s0 * s0;
    m01 += s0 * s1;
    m11 += s1 * s1;
  }
  const r0 = i01;
  const r1 = i11;
  const vSlope = r0 * r0 * m00 + 2 * r0 * r1 * m01 + r1 * r1 * m11;
  const cr1 = (clusters / (clusters - 1)) * ((n - 1) / (n - 2));
  const se = Math.sqrt(Math.max(0, cr1 * vSlope));
  const seNaive = Math.sqrt(Math.max(0, (ssr / (n - 2)) * i11));
  const df = clusters - 1;
  const t = se > 0 ? b1 / se : b1 === 0 ? 0 : Infinity;
  const crit = tCritical(df);

  return {
    estimate: b1,
    intercept: b0,
    se,
    seNaive,
    n,
    clusters,
    df,
    t,
    p: se > 0 ? tTwoSidedP(t, df) : b1 === 0 ? 1 : 0,
    interval: { lo: b1 - crit * se, hi: b1 + crit * se },
  };
}

/** A proportion's design effect: its cluster-robust variance over the
 *  independent-purchases variance, floored at one. `obs` is `[{ y, g }]`. */
export function designEffect(obs) {
  const n = obs.length;

  if (n < 2) return 1;
  const p = obs.reduce((s, o) => s + o.y, 0) / n;
  const naive = (p * (1 - p)) / n;

  if (!(naive > 0)) return 1;
  const sums = new Map();

  for (const { y, g } of obs) sums.set(g, (sums.get(g) ?? 0) + (y - p));
  const clusters = sums.size;

  if (clusters < 2) return n;
  let meat = 0;

  for (const s of sums.values()) meat += s * s;
  const clustered = ((clusters / (clusters - 1)) * meat) / (n * n);

  return Math.max(1, clustered / naive);
}

/** Classical Cochran-Armitage trend statistic (z) for a 0/1 outcome across
 *  ordered groups, scores 0..k-1. `table` is `[{ beats, n }]`. Kept as the
 *  reference the clustered trend reduces to when every purchase is its own
 *  company; the verdict uses clusteredSlope. */
export function cochranArmitageZ(table) {
  const N = table.reduce((s, r) => s + r.n, 0);
  const R = table.reduce((s, r) => s + r.beats, 0);

  if (!(N > 0)) return 0;
  const pbar = R / N;
  let T = 0;
  let s1 = 0;
  let s2 = 0;

  table.forEach((r, i) => {
    T += i * (r.beats - r.n * pbar);
    s1 += r.n * i * i;
    s2 += r.n * i;
  });
  const v = pbar * (1 - pbar) * (s1 - (s2 * s2) / N);

  return v > 0 ? T / Math.sqrt(v) : 0;
}

/** Purchases per cell for a gap of this size to be called at SIGNIFICANCE with
 *  80% power, inflated by the design effect the clustered test observed. The
 *  standard two-proportion formula, rounded up; null when the gap is zero. */
export function sampleForGap(p1, p2, deff = 1) {
  const diff = Math.abs(p1 - p2);

  if (!(diff > 0)) return null;
  const z = 1.959964 + 0.841621;

  return Math.ceil(
    (Math.max(1, deff) * z * z * (p1 * (1 - p1) + p2 * (1 - p2))) /
      (diff * diff),
  );
}

/** Deterministic 53-bit string hash (cyrb53), as 12 hex characters. The same
 *  in the Worker and the browser, no crypto API needed. */
export function shortHash(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);

    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);

  return n.toString(16).padStart(14, "0").slice(-12);
}

/** The dataset version a citation carries: the latest exit date in the sample
 *  plus a hash of the sample itself, every resolved purchase as
 *  `key:cells:abnormal return to 4dp`, sorted. Two readers on different days
 *  who see the same version saw the same study. */
export function datasetVersion(sample) {
  const lines = sample
    .map((s) => `${s.key}:${(s.cells ?? []).join("+")}:${(s.alpha * 100).toFixed(4)}`)
    .sort();
  const asOf =
    sample
      .map((s) => s.exitDate)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;
  const hash = shortHash(lines.join("\n"));

  return { asOf, hash, count: lines.length, id: `${asOf ?? "none"}.${hash}` };
}

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

function cellStats(resolved) {
  const n = resolved.length;
  const beats = resolved.filter((p) => p.beat).length;
  const companies = new Set(resolved.map((p) => p.company)).size;
  const alphas = resolved.map((p) => p.alpha);
  const stated = n >= MIN_CELL && companies >= MIN_COMPANIES;
  const deff = designEffect(
    resolved.map((p) => ({ y: p.beat ? 1 : 0, g: p.company })),
  );
  const nEff = n / deff;

  return {
    n,
    beats,
    companies,
    designEffect: deff,
    /** Null under either floor: not "unknown", but "not stated". */
    beatRate: stated ? beats / n : null,
    interval: stated ? wilson((beats / n) * nEff, nEff) : null,
    medianAlpha: stated ? median(alphas) : null,
    meanAlpha: stated ? alphas.reduce((s, a) => s + a, 0) / n : null,
  };
}

/** Of the purchases whose 90 days have elapsed, the share with a clean
 *  outcome. A queue of pending purchases will not all resolve, and a date
 *  computed as if they would is a promise the page cannot keep. */
function resolutionYield(universe) {
  const matured = universe.filter((p) => p.status !== "pending").length;
  const resolved = universe.filter((p) => p.status === "resolved").length;

  return matured > 0 ? resolved / matured : 1;
}

/** When a cell under a floor should clear both.
 *
 *  First the QUEUE: purchases in the cell whose 90 days have not elapsed,
 *  each maturing on a known date, counted at the market's resolution yield.
 *  Walked in maturity order until the expected purchases and companies both
 *  reach their floors; the date is the maturity of the one that gets there.
 *  If the queue runs out first, the remainder is projected from the cell's
 *  arrivals over the last ARRIVAL_WEEKS (purchases, and companies new to the
 *  cell), plus the 90 days those arrivals will then need. A cell with no
 *  recent arrivals of what it lacks gets no date. */
function clearance(cellPurchases, todayIso, yieldRate) {
  const resolved = cellPurchases.filter((p) => p.status === "resolved");
  const seen = new Set(resolved.map((p) => p.company));
  const needN = Math.max(0, MIN_CELL - resolved.length);
  const needC = Math.max(0, MIN_COMPANIES - seen.size);

  if (needN === 0 && needC === 0) return null;

  const queue = cellPurchases
    .filter((p) => p.status === "pending")
    .sort((a, b) => (a.maturesOn < b.maturesOn ? -1 : a.maturesOn > b.maturesOn ? 1 : 0));

  let expN = resolved.length;
  let expC = seen.size;
  const queued = new Set(seen);

  for (const p of queue) {
    expN += yieldRate;
    if (!queued.has(p.company)) {
      queued.add(p.company);
      expC += yieldRate;
    }
    if (expN >= MIN_CELL && expC >= MIN_COMPANIES) {
      return {
        needed: needN,
        neededCompanies: needC,
        queued: queue.length,
        clearsOn: p.maturesOn,
        fromQueue: true,
      };
    }
  }

  const recentSince = addDays(todayIso, -ARRIVAL_WEEKS * 7);
  const before = new Set(
    cellPurchases.filter((p) => p.date < recentSince).map((p) => p.company),
  );
  const recent = cellPurchases.filter(
    (p) => p.date >= recentSince && p.date <= todayIso,
  );
  const ratePurchases = (recent.length * yieldRate) / ARRIVAL_WEEKS;
  const rateCompanies =
    (new Set(recent.map((p) => p.company).filter((c) => !before.has(c))).size *
      yieldRate) /
    ARRIVAL_WEEKS;
  const remN = Math.max(0, MIN_CELL - expN);
  const remC = Math.max(0, MIN_COMPANIES - expC);
  const weeks = Math.max(
    remN > 0 ? (ratePurchases > 0 ? remN / ratePurchases : Infinity) : 0,
    remC > 0 ? (rateCompanies > 0 ? remC / rateCompanies : Infinity) : 0,
  );

  if (!isFinite(weeks)) {
    return {
      needed: needN,
      neededCompanies: needC,
      queued: queue.length,
      clearsOn: null,
      fromQueue: false,
    };
  }

  // Filed after the last queued purchase at the earliest, and never before
  // today: a projection that starts in the past is not a projection.
  const lastFiled = addDays(todayIso, Math.ceil(weeks * 7));

  return {
    needed: needN,
    neededCompanies: needC,
    queued: queue.length,
    clearsOn: addDays(lastFiled, HORIZON_DAYS),
    fromQueue: false,
  };
}

/** Compute one study.
 *
 *  `dealings` is the studyWindow() feed; `outcomes` the /api/outcomes rows for
 *  the same market. `today` is passed so the two renderers, and any test, can
 *  agree on it. */
export function computeStudy(study, dealings, outcomes, market, today = new Date()) {
  const todayIso = isoDay(today);
  const all = withOutcomes(toPurchases(dealings, market), outcomes, todayIso);
  const universe = all.filter(
    (p) => !study.floor || p.value >= (STUDY_FLOOR[market] ?? 0),
  );
  const resolved = universe.filter((p) => p.status === "resolved");
  const yieldRate = resolutionYield(universe);

  const cellDefs = study.cells(market);
  const membership = new Map();
  const cells = cellDefs.map((def) => {
    const inCell = universe.filter((p) => def.test(p, market));

    for (const p of inCell) {
      if (p.status !== "resolved" || def.nested) continue;
      const list = membership.get(p.key) ?? [];

      list.push(def.id);
      membership.set(p.key, list);
    }

    return {
      id: def.id,
      label: def.label,
      noun: def.noun ?? def.label.toLowerCase(),
      nested: def.nested ?? null,
      pending: inCell.filter((p) => p.status === "pending").length,
      ...cellStats(inCell.filter((p) => p.status === "resolved")),
      clearance: clearance(inCell, todayIso, yieldRate),
      /** Kept for the test; not serialised by either renderer. */
      _resolved: inCell.filter((p) => p.status === "resolved"),
    };
  });

  const overall = cellStats(resolved);
  const compareIds =
    typeof study.compare === "function" ? study.compare(market) : study.compare;
  const compared = compareIds.map((id) => cells.find((c) => c.id === id));

  const recentSince = addDays(todayIso, -ARRIVAL_WEEKS * 7);
  const arrivalsWeekly =
    universe.filter((p) => p.date >= recentSince && p.date <= todayIso).length /
    ARRIVAL_WEEKS;

  const sample = resolved.map((p) => ({
    key: p.key,
    cells: membership.get(p.key) ?? [],
    alpha: p.alpha,
    exitDate: p.exitDate,
  }));
  const dataset = datasetVersion(sample);

  const test = testFor(study, compared);
  const verdict = verdictFor(study, compared, test);

  for (const c of cells) delete c._resolved;

  return {
    slug: study.slug,
    market,
    computedOn: todayIso,
    horizonDays: HORIZON_DAYS,
    asOf: dataset.asOf,
    dataset,
    universe: {
      eligible: all.length,
      inScope: universe.length,
      scored: resolved.length,
      companies: overall.companies,
      beatRate: overall.beatRate,
      pending: universe.filter((p) => p.status === "pending").length,
      flagged: universe.filter((p) => p.status === "flagged").length,
      unpriced: universe.filter((p) => p.status === "unpriced").length,
      resolutionYield: yieldRate,
      arrivalsWeekly,
    },
    cells,
    compareIds,
    kind: study.test,
    test,
    verdict,
    indexable: verdict.state !== "waiting",
  };
}

/** The clustered test over the compared cells. Difference: x is 1 for the
 *  first cell and 0 for the second. Trend: x is the band's position. */
function testFor(study, compared) {
  if (compared.some((c) => !c)) return null;
  const obs = [];

  compared.forEach((c, i) => {
    const x = study.test === "trend" ? i : i === 0 ? 1 : 0;

    for (const p of c._resolved) {
      obs.push({ x, y: p.beat ? 1 : 0, g: p.company });
    }
  });
  const fit = clusteredSlope(obs);

  if (!fit) return null;
  const deff =
    fit.seNaive > 0 ? Math.max(1, (fit.se * fit.se) / (fit.seNaive * fit.seNaive)) : 1;

  return { ...fit, designEffect: deff };
}

/** The verdict. See the header for the three states. For a difference, the
 *  first compared cell is the one the question is about (the CFO, the
 *  cluster); for a trend the cells run smallest to largest. */
function verdictFor(study, compared, test) {
  if (compared.length < 2 || compared.some((c) => !c)) {
    return { state: "waiting", missing: [] };
  }

  const missing = compared.filter((c) => c.clearance);

  if (missing.length > 0 || !test) {
    return {
      state: "waiting",
      missing: missing.map((c) => ({
        id: c.id,
        label: c.label,
        n: c.n,
        companies: c.companies,
        ...c.clearance,
      })),
    };
  }

  const called = test.p < SIGNIFICANCE;

  if (study.test === "trend") {
    return {
      state: called ? "answered" : "open",
      p: test.p,
      slope: test.estimate,
      direction: test.estimate > 0 ? "up" : test.estimate < 0 ? "down" : null,
    };
  }

  const [a, b] = compared;
  const gap = a.beatRate - b.beatRate;

  if (called) {
    return {
      state: "answered",
      p: test.p,
      gap,
      leader: gap > 0 ? a.id : b.id,
      trailer: gap > 0 ? b.id : a.id,
    };
  }

  const needed = sampleForGap(a.beatRate, b.beatRate, test.designEffect);
  const perCompany = test.n / test.clusters;

  return {
    state: "open",
    p: test.p,
    gap,
    leader: gap > 0 ? a.id : gap < 0 ? b.id : null,
    /** Per cell, for a gap this size to be called, allowing for clustering. */
    neededPerCell: needed,
    /** The same, in companies, at today's purchases per company. */
    neededCompaniesPerCell: needed ? Math.ceil(needed / perCompany) : null,
  };
}

// ---------------------------------------------------------------------------
// Words. Both renderers print these, so the numbers a study states are typed
// out in one place. Each sentence claims what its test establishes and no
// more: a difference or trend over this record, beyond what company-clustered
// chance would produce. Never a cause, never a forecast.
// ---------------------------------------------------------------------------

export const pct = (ratio) =>
  ratio == null ? "n/a" : `${Math.round(ratio * 100)}%`;

export const signedPp = (ratio) =>
  ratio == null
    ? "n/a"
    : `${ratio > 0 ? "+" : ""}${(ratio * 100).toFixed(1)}pp`;

const points = (ratio) => `${Math.abs(Math.round(ratio * 100))} points`;

/** 10041 -> "10,041". Explicit rather than toLocaleString, for the same
 *  reason the dates are. */
export const num = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const plural = (n, one, many) => `${num(n)} ${n === 1 ? one : many}`;

const capitalise = (s) =>
  String(s).charAt(0).toUpperCase() + String(s).slice(1);

/** "p = 0.07", "p = 0.003", "p < 0.001". */
export function pValue(p) {
  if (p < 0.001) return "p < 0.001";
  if (p < 0.01) return `p = ${p.toFixed(3)}`;

  return `p = ${p.toFixed(2)}`;
}

/** The headline sentence for a study in its current state. Short enough to
 *  set at display scale. */
export function verdictHeadline(result) {
  const { verdict, cells, kind, compareIds } = result;
  const byId = (id) => cells.find((c) => c.id === id);

  if (verdict.state === "waiting") {
    const short =
      verdict.missing.length === 1 ? byId(verdict.missing[0].id) : null;

    return short
      ? `Not enough ${short.noun} yet to say`
      : "Not enough purchases yet to say";
  }

  if (kind === "trend") {
    const first = byId(compareIds[0]);
    const last = byId(compareIds[compareIds.length - 1]);

    if (verdict.state === "answered" && verdict.direction === "up") {
      return `Larger purchases have tended to beat the index more often: ${pct(first.beatRate)} in the smallest band, ${pct(last.beatRate)} in the largest`;
    }
    if (verdict.state === "answered" && verdict.direction === "down") {
      return `Larger purchases have tended to beat the index less often: ${pct(first.beatRate)} in the smallest band, ${pct(last.beatRate)} in the largest`;
    }

    return "No trend with size that chance could not produce at this sample";
  }

  const lead = byId(verdict.leader);
  const trail = byId(verdict.trailer ?? null);

  if (verdict.state === "answered" && lead && trail) {
    return `${capitalise(lead.noun)} have beaten the index more often than ${trail.noun}: ${pct(lead.beatRate)} to ${pct(trail.beatRate)}`;
  }

  return "Too close to call at this sample";
}

/** "one time in twenty", "one time in three hundred". */
function chanceIn(p) {
  if (!(p > 0)) return "less than one time in a thousand";
  const inv = Math.round(1 / p);

  if (inv >= 1000) return "less than one time in a thousand";
  if (inv >= 100) return `about one time in ${Math.round(inv / 50) * 50}`;

  return `about one time in ${inv}`;
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;

  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function waitingLine(m) {
  const lacks = [
    m.needed > 0 ? plural(m.needed, "more resolved purchase", "more resolved purchases") : null,
    m.neededCompanies > 0
      ? plural(m.neededCompanies, "more company", "more companies")
      : null,
  ]
    .filter(Boolean)
    .join(" and ");
  const have = `${m.label} have ${plural(m.n, "purchase", "purchases")} with a resolved ${HORIZON_DAYS}-day outcome, across ${plural(m.companies, "company", "companies")}. A rate is stated at ${MIN_CELL} purchases across ${MIN_COMPANIES} companies, so the cell needs ${lacks}.`;
  const queued =
    m.queued === 0
      ? "None are"
      : plural(m.queued, "more is", "more are");

  if (m.clearsOn && m.fromQueue) {
    return `${have} ${queued} already filed and waiting for their ${HORIZON_DAYS} days to pass; at the share of past purchases that resolved cleanly, enough should have by ${longDate(m.clearsOn)}.`;
  }
  if (m.clearsOn) {
    return `${have} ${queued} filed and waiting for their ${HORIZON_DAYS} days, which is not enough on its own. At the rate purchases have arrived over the last ${ARRIVAL_WEEKS} weeks, the cell should clear around ${longDate(m.clearsOn)}.`;
  }

  return `${have} ${queued} filed and waiting, and too few have arrived in the last ${ARRIVAL_WEEKS} weeks to project a date.`;
}

/** The supporting paragraph under the headline: what was measured, with the
 *  numbers, and in the waiting state exactly what is missing and when. */
export function verdictDetail(result, market) {
  const { verdict, cells, compareIds, universe, test, kind } = result;
  const byId = (id) => cells.find((c) => c.id === id);
  const compared = compareIds.map(byId);

  if (verdict.state === "waiting") {
    const parts = verdict.missing.map(waitingLine);
    const ready = compared.filter((c) => c && !c.clearance);
    const readyLine =
      ready.length > 0 && kind !== "trend"
        ? ` ${ready.map((c) => `${capitalise(c.noun)} already clear both floors, with ${c.n} across ${c.companies} companies.`).join(" ")}`
        : "";

    return `${parts.join(" ")}${readyLine}`;
  }

  const noun = market === "US" ? "insider" : "director";
  const base = `Across all ${num(universe.scored)} ${noun} purchases in scope, ${pct(universe.beatRate)} beat the index over their ${HORIZON_DAYS} days.`;
  const clustering = `The test treats each company, not each purchase, as the unit of evidence (${num(test.clusters)} companies), because purchases in one company move together.`;

  if (kind === "trend") {
    const ladder = compared
      .map((c) => `${c.label.toLowerCase()} ${pct(c.beatRate)} of ${c.n}`)
      .join(", ");
    const slope = `The fitted trend is ${signedPp(verdict.slope)} per band, with a 95% interval of ${signedPp(test.interval.lo)} to ${signedPp(test.interval.hi)}.`;

    if (verdict.state === "answered") {
      return `Beat rates by band: ${ladder}. ${slope} If size made no difference, a trend at least this steep would turn up ${chanceIn(verdict.p)} (${pValue(verdict.p)}). ${clustering} A trend is the overall lean of the ladder, not a promise that each step up does better. ${base}`;
    }

    return `Beat rates by band: ${ladder}. ${slope} That interval includes no trend at all (${pValue(verdict.p)}), so at this sample the bands cannot be told apart from chance. ${clustering} ${base}`;
  }

  const [a, b] = compared;
  const pair = `${capitalise(a.noun)}: ${pct(a.beatRate)} of ${a.n} beat it, across ${a.companies} companies, median abnormal return ${signedPp(a.medianAlpha)}. ${capitalise(b.noun)}: ${pct(b.beatRate)} of ${b.n}, across ${b.companies} companies, median ${signedPp(b.medianAlpha)}.`;
  const gapLine = `The gap is ${signedPp(verdict.gap)}, with a 95% interval of ${signedPp(test.interval.lo)} to ${signedPp(test.interval.hi)}.`;

  if (verdict.state === "answered") {
    return `${pair} ${gapLine} If there were no real difference, a gap at least this large would turn up ${chanceIn(verdict.p)} (${pValue(verdict.p)}). ${clustering} ${base}`;
  }

  const need = verdict.neededPerCell
    ? ` To call a gap of ${points(verdict.gap)}, each cell would need about ${num(verdict.neededPerCell)} resolved purchases, about ${num(verdict.neededCompaniesPerCell)} companies at today’s mix; the smaller has ${num(Math.min(a.n, b.n))}.`
    : "";

  return `${pair} ${gapLine} That interval includes no difference at all (${pValue(verdict.p)}).${need} ${clustering} ${base}`;
}

/** The short state label the index shows beside each study. */
export function stateLabel(result) {
  const { verdict } = result;

  if (verdict.state === "answered") return "Answered";
  if (verdict.state === "open") return "Too close to call";

  return "Not enough data yet";
}

/** The measurement line under a verdict: horizon, dates, floors. */
export function measurementLine(result) {
  return `Computed ${longDate(result.computedOn)}${result.asOf ? ` · outcomes resolved to ${longDate(result.asOf)}` : ""} · ${HORIZON_DAYS}-day window · rates from ${MIN_CELL} purchases and ${MIN_COMPANIES} companies`;
}

/** One sentence on the dataset, for the note every study carries. */
export function datasetSentence(result, market) {
  const { universe, asOf } = result;
  const noun = market === "US" ? "insider" : "director";
  const left = [
    universe.flagged > 0
      ? `${universe.flagged} whose price series stops short or jumps implausibly`
      : null,
    universe.unpriced > 0
      ? `${universe.unpriced} with no closing prices on file for the window`
      : null,
  ].filter(Boolean);

  return `${num(universe.scored)} ${noun} purchases with a resolved ${HORIZON_DAYS}-day outcome, across ${num(universe.companies)} companies, out of ${num(universe.inScope)} in scope and ${num(universe.eligible)} open-market purchases recorded since ${trackingSinceLabel(market)}. ${plural(universe.pending, "more is", "more are")} waiting for their ${HORIZON_DAYS} days to pass.${left.length > 0 ? ` Left out: ${left.join(", and ")}.` : ""} Outcomes resolved to ${asOf ? longDate(asOf) : "no date yet"}; recomputed on every load.`;
}

/** The citation the page prints. `accessed` is the reader’s date. */
export function citation(study, result, accessed) {
  const url = studyCanonical(study.slug, result.market);
  const { dataset } = result;

  return {
    title: study.title,
    url,
    computedOn: longDate(result.computedOn),
    asOf: result.asOf ? longDate(result.asOf) : null,
    accessed: longDate(isoDay(accessed)),
    version: dataset.id,
    sample: dataset.count,
    /** One line, for copying. */
    line: `ddbx (${result.computedOn.slice(0, 4)}). ${study.title} ${url}. Dataset ${dataset.id}: ${HORIZON_DAYS}-day outcomes of ${num(dataset.count)} purchases${result.asOf ? `, resolved to ${longDate(result.asOf)}` : ""}. Computed ${longDate(result.computedOn)}. Accessed ${longDate(isoDay(accessed))}.`,
  };
}

/** The index's rules, shared with the React index. */
export function indexRules() {
  return [
    "A study is a question about kinds of purchase, never people: a role, a size band, whether the purchase was made inside a cluster.",
    `Every purchase is measured over the same ${HORIZON_DAYS} days from the close on the day it was disclosed, against the index over the identical window. A purchase counts once its ${HORIZON_DAYS} days have passed; newer ones are in the queue, not the sample.`,
    `A cell states its beat rate, the share of its purchases that beat the index, only once it holds ${MIN_CELL} resolved purchases across ${MIN_COMPANIES} companies. Below that it shows its count and the date it should clear.`,
    "Purchases in the same company move together, so every test counts companies, not purchases, as the unit of evidence. When a difference is one that chance would produce at this sample, the page says so rather than picking a winner.",
    "Everything is recomputed on every load. Each page prints the date its outcomes run to and a dataset version, so a citation carries exactly what it was computed from.",
  ];
}

/** The floor line both renderers print when a study applies STUDY_FLOOR. */
export function floorLine(market, floor) {
  return `Purchases under ${market === "US" ? "$" : "£"}${num(floor)} are left out. That is the pipeline’s own co-buyer floor, the line under which a purchase does not count toward a cluster anywhere on the site, and the role study uses the same line so the two share a universe.`;
}

/** Limits every study shares, printed after its own. */
export const SHARED_LIMITS = [
  `Ninety days is one window. A purchase that lagged the index for three months and led it for a year counts as a miss here, and the page does not say what happens after day ${HORIZON_DAYS}.`,
  "Beating the index is a yes or no. A purchase that beat it by half a point counts the same as one that beat it by forty, which is why the median abnormal return sits beside every rate, and why a rate is not a return.",
  "Purchases whose price series stops short are left out, and a share that stops trading is often one that did badly. If those purchases fall more in one cell than another, the cells’ rates are flattered unevenly; the dataset section counts them.",
  "A difference between two kinds of purchase is not a cause. The cells differ in the companies, sectors and months they come from, and none of that is held equal.",
];

/** Published methodology shared by every study, rendered by both renderers.
 *  The per-study lines come from each entry’s `method`. */
export const METHODOLOGY = [
  "Only open-market purchases by insiders count, on the same test every board on the site applies: UK rows classified as open-market buys against the trade-day close; US rows from the whole Form 4 record restricted to transaction code P, direct holdings, no 10b5-1 trading plan, and no filer whose only role is a ten-percent holding. A US filing with several fills counts once.",
  `Every purchase is measured over the same ${HORIZON_DAYS} days: from the closing price on the day it was disclosed, the first price a reader could have paid, to the close ${HORIZON_DAYS} days later. Its abnormal return is the share’s return minus the index’s over the identical window: the FTSE All-Share for UK purchases, the S&P 500 for US ones.`,
  `A purchase enters the sample only once its ${HORIZON_DAYS} days have passed and both closes are on file. Purchases whose price series stops more than ten days short of either end, whose price moves by more than three times in either direction (usually an unadjusted share split), or whose index closes are missing are left out and counted. Newer purchases are in the queue, not the sample.`,
  `A cell’s beat rate is the share of its purchases with an abnormal return above zero. It is stated only once the cell holds ${MIN_CELL} resolved purchases across at least ${MIN_COMPANIES} companies; below that the count is shown and the rate is not.`,
  "Purchases in the same company are not independent: they share a share price and most of a window. Every test and interval here treats the company as the unit of evidence, using a cluster-robust variance, so twenty purchases in one company weigh as what they are rather than as twenty separate results. Each cell’s interval is a Wilson interval on the cell’s effective sample after that adjustment.",
  `A difference, or a trend across ordered bands, is called real only when the company-clustered test puts the chance of one at least that large, if there were none, under ${Math.round(SIGNIFICANCE * 100)}%. When it does not, the page says too close to call and states the interval and what a gap of that size would need.`,
  "Median and mean abnormal return are reported beside each rate as context. The verdict is taken on the rate alone.",
  "Every figure is recomputed from the record on every load. Each page prints the date its outcomes run to and a dataset version, a fingerprint of exactly which purchases and outcomes it was computed from, so a citation can be checked against the page a reader later sees.",
  "Past performance is not a reliable indicator of future results. These pages describe what has already happened to share prices after a kind of purchase; they recommend nothing.",
];
