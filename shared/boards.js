// Three derived boards over the same dealings window: best-performing buys,
// most-active companies, and cluster buying.
//
// Plain ESM at the root, imported by both the React pages and the pre-render
// Functions, for the reason shared/leaderboard.js states: a board whose
// pre-rendered order differs from its hydrated order is worse than no board.
//
// Eligibility, value, alpha and return all come from shared/leaderboard.js
// rather than being re-derived here. These pages rank the SAME corpus the
// biggest-buys board ranks, only grouped differently, and two pages publishing
// different rules for one corpus is how a methodology stops being believed.

import {
  buyAlpha,
  buyValue,
  isEligibleBuy,
  isInsiderFiler,
  MAX_PER_COMPANY,
} from "./leaderboard.js";

// Re-exported rather than redefined: it belongs next to isEligibleBuy, which
// applies it, and a second copy here is a second thing to keep in step.
export { isInsiderFiler };

/** Rows on a board. Matches leaderboard.js TOP_N deliberately. */
export const TOP_N = 25;

/** Eligible AND filed by an insider.
 *
 *  `isEligibleBuy` folds the insider-filer test in as of 2026-08-19, so this is
 *  now just an alias for it. Kept as a named function because every ranking
 *  below reads better for saying what it means, and because if the two tests
 *  ever need to come apart again this is where that happens. */
function qualifies(d, market) {
  return isEligibleBuy(d, market);
}

/** The issuer's stable identity.
 *
 *  NOT the ticker on US. EDAP TMS SA files under CIK 0001041934 with two
 *  different tickers in one week — `EDAP` and `FOCL`, a re-ticker caught
 *  mid-flight — and grouping on the symbol split one eight-filing cluster into
 *  two board rows showing the same company name twice. The CIK is the identity
 *  EDGAR actually assigns; the symbol is a label that changes.
 *
 *  UK has no such identifier in the feed, and its tickers are stable, so the
 *  symbol is the key there. */
function issuerKey(d, market) {
  if (market === "US") return d?.issuer_cik || d?.ticker || "";

  return d?.ticker || "";
}

// ---------------------------------------------------------------------------
// Best-performing buys
// ---------------------------------------------------------------------------

/** Purchases below this are excluded from the performance board, in the
 *  market's own currency and never converted.
 *
 *  This is the difference between a board and an artefact. Ranked on alpha with
 *  no floor, the UK top twelve for the year to 2026-08-19 contains a £1,958
 *  purchase, a £3,000 one and a £3,007 one — three of the twelve are sums a
 *  director would not notice losing, sitting above six-figure purchases,
 *  because a token buy in an illiquid microcap swings further than a real one.
 *  Ranking those as "the best-performing insider buys" answers nothing.
 *
 *  £50,000 is an editorial line, not a derived one, so the page publishes the
 *  number rather than applying it quietly. It leaves 273 eligible UK rows with
 *  a performance mark — comfortably more than the 25 a board needs. */
export const MIN_BOARD_VALUE = 50_000;

/** The eligible-and-marked predicate the performance board ranks over.
 *
 *  Exported so a page can draw the field the board was picked from without
 *  restating the rule. The floor is deliberately NOT part of it: a stage that
 *  shows the purchases below £50,000 as the population the board excludes has
 *  to be able to ask which rows have a mark separately from whether they clear
 *  the line. */
export function hasBoardMark(d, market) {
  return qualifies(d, market) && buyAlpha(d) != null;
}

/** Rank eligible purchases by alpha, best first.
 *
 *  Alpha, not raw return, and the distinction is the whole page: a board ranked
 *  on return in a rising market is a list of who happened to buy before the
 *  index went up. Alpha is the purchase's own move minus the market's over the
 *  same period, so it ranks the decision rather than the weather.
 *
 *  Applies the same per-company cap as the biggest-buys board and for the same
 *  reason — the UK top twelve by alpha is three Hays rows and three Robert
 *  Walters rows, a recruitment-sector rally wearing the clothes of a stock-picking
 *  leaderboard. Returns `{ rows, suppressed, considered }`; `considered` is how
 *  many rows cleared eligibility, the floor and the need for a mark, so the page
 *  can state its own denominator. */
export function rankByAlpha(dealings, market, limit = TOP_N) {
  const eligible = (dealings ?? []).filter(
    (d) => hasBoardMark(d, market) && buyValue(d) >= MIN_BOARD_VALUE,
  );

  const ordered = [...eligible].sort((a, b) => buyAlpha(b) - buyAlpha(a));
  const perCompany = new Map();
  const suppressed = new Map();
  const rows = [];

  for (const d of ordered) {
    if (rows.length >= limit) break;
    const key = issuerKey(d, market);
    const used = perCompany.get(key) ?? 0;

    if (key && used >= MAX_PER_COMPANY) {
      // Keyed by issuer for the cap, but reported by ticker: the page prints
      // this and "0001041934 (2 more)" means nothing to a reader.
      const label = d.ticker ?? key;

      suppressed.set(label, (suppressed.get(label) ?? 0) + 1);
      continue;
    }
    perCompany.set(key, used + 1);
    rows.push(d);
  }

  return { rows, suppressed, considered: eligible.length };
}

export const PERFORMANCE_METHODOLOGY = [
  "The board is ranked by alpha, not by return. Alpha is the purchase's own move minus the market's move over the same period, stated in percentage points — a buy up 8% while the index rose 5% has alpha of +3. Ranking on raw return in a rising market would just list whoever bought earliest.",
  `Purchases below £50,000 — or $50,000 on the US board, never converted between the two — are excluded. A token purchase in a thinly traded company swings much further than a real one, and without a floor the board fills with sums too small for the buyer to notice.`,
  "Only open-market purchases count. Share allotments, vesting, option exercises and placings are disclosed the same way but are not purchases at a market price.",
  "Performance is measured from the closing price on the day the purchase was disclosed — the first price a reader could have paid — wherever that close is on file, and from the trade-day close when it is not. Either way it is marked against the most recent cached close, not a live quote.",
  "No more than three purchases from any single company appear. Without the cap the board reads as a stock-picking ranking when it is really one sector having a good quarter; where entries are held back, the count is shown.",
  "A purchase only appears once it has a performance mark, so the most recent buys are absent by construction. This is a board of buys that have had time to work out, which is not the same as a board of the best decisions.",
  "Past performance is not a reliable indicator of future results. Nothing here is a recommendation, and the ranking is of what has already happened to a share price.",
];

// ---------------------------------------------------------------------------
// Most-active companies
// ---------------------------------------------------------------------------

/** Below this many qualifying purchases in the window, an issuer is not
 *  "active" — it is an issuer that had a buy. The UK window holds 462 distinct
 *  issuers and the median one has a single filing, so without a bar this page
 *  is the company index sorted differently. */
export const MIN_COMPANY_FILINGS = 3;

/** Roll the window up by issuer.
 *
 *  Counts DISTINCT INSIDERS as well as filings, because they answer different
 *  questions and the difference is the interesting part: sixteen purchases from
 *  one determined chief executive is a conviction story, and sixteen from nine
 *  different people is a board-wide one. A page headed "most active" that shows
 *  only the filing count cannot tell them apart. */
export function companyRollup(dealings, market) {
  const byTicker = new Map();

  for (const d of dealings ?? []) {
    if (!qualifies(d, market)) continue;
    const key = issuerKey(d, market);

    if (!key) continue;

    let row = byTicker.get(key);

    if (!row) {
      row = {
        ticker: d.ticker ?? key,
        company: d.company ?? d.ticker ?? key,
        filings: 0,
        value: 0,
        insiders: new Map(),
        alphas: [],
        firstDate: null,
        lastDate: null,
        peakCluster: 0,
      };
      byTicker.set(key, row);
    }

    row.filings += 1;
    row.value += buyValue(d);

    const person = d?.director?.name ?? d?.reporter?.name ?? null;

    if (person) row.insiders.set(person, (row.insiders.get(person) ?? 0) + 1);

    const alpha = buyAlpha(d);

    if (alpha != null) row.alphas.push(alpha);

    const date = d.trade_date ?? d.disclosed_date ?? null;

    if (date) {
      if (!row.firstDate || date < row.firstDate) row.firstDate = date;
      if (!row.lastDate || date > row.lastDate) row.lastDate = date;
    }

    const count = Number(d?.cluster?.count ?? 0);

    if (count > row.peakCluster) row.peakCluster = count;
  }

  return [...byTicker.values()].map((row) => {
    // COUNTS ONLY. How many purchases each insider made, largest run first,
    // and no name ever leaves this module — the shape of the buying is what
    // the boards need, and who did it is the profile-of-a-person surface the
    // plan defers until the privacy handling is thought through.
    const insiderFilings = [...row.insiders.values()].sort((a, b) => b - a);

    return {
      ...row,
      insiders: row.insiders.size,
      insiderFilings,
      /** Purchases whose filer we could not name, so the runs above add up. */
      unattributed:
        row.filings - insiderFilings.reduce((sum, n) => sum + n, 0),
      medianAlpha: median(row.alphas),
      alphaCount: row.alphas.length,
    };
  });
}

/** Most-active issuers: filings first, then distinct insiders, then value.
 *
 *  Filings lead because that is what "active" names. Distinct insiders breaks
 *  the tie ahead of value so that, between two issuers with four purchases
 *  each, the one where four different people bought ranks above the one where
 *  a single person bought four times. */
export function rankCompanies(dealings, market, limit = TOP_N) {
  const rows = companyRollup(dealings, market).filter(
    (r) => r.filings >= MIN_COMPANY_FILINGS,
  );

  rows.sort(
    (a, b) =>
      b.filings - a.filings ||
      b.insiders - a.insiders ||
      b.value - a.value ||
      a.ticker.localeCompare(b.ticker),
  );

  return { rows: rows.slice(0, limit), qualifying: rows.length };
}

export const ACTIVITY_METHODOLOGY = [
  "Companies are ranked by how many qualifying purchases were disclosed in the window, then by how many different insiders made them, then by total value. Two issuers with the same number of purchases are separated by how broad the buying was, not by how large.",
  "Only open-market purchases count, on the same test the rest of the site uses. Share allotments, vesting and placings are excluded, so an issuer that ran a big share award does not appear here for it.",
  "An issuer needs at least three qualifying purchases to be listed. Most companies in any window have exactly one, and a ranking that included them would be the company index in a different order.",
  "This ranks companies, not people. Where one insider made several of the purchases, the distinct-insider count says so — that is the difference between one person's conviction and a board acting together.",
  "Values are in the market's own currency and are never converted, so no exchange rate is involved.",
  "Being bought heavily is not the same as being a good investment, and this page is not ranked by performance. Where a median performance figure is shown it covers only the purchases old enough to have a mark.",
];

// ---------------------------------------------------------------------------
// Cluster buying
// ---------------------------------------------------------------------------

/** A cluster episode is a (company, window) event, NOT a company.
 *
 *  This is the trap the whole family turns on. `cluster` is a per-row, rolling
 *  annotation computed at read time in ddbx-data: `count` is the number of
 *  DISTINCT insiders who bought that issuer within ±14 days (strong tier) or
 *  ±30 days (soft) of that particular row, the row's own insider included, so
 *  the smallest cluster is 2.
 *
 *  It is not a cluster identity, and rows of one issuer carry different counts
 *  — 20 of the 102 UK issuers with any cluster row vary across their own rows.
 *  Two ways of grouping it are wrong, both of them the obvious ones:
 *
 *    - GROUPING BY ISSUER AND SUMMING. Metlen has 16 cluster-annotated rows in
 *      the window, five of them the same chief executive buying repeatedly.
 *      Presented as "16 purchases by a cluster of insiders" that is a quarter
 *      of ordinary accumulation dressed up as a co-ordinated event.
 *    - STITCHING CONSECUTIVE ROWS INTO A RUN. Hercules has four distinct buyers
 *      across a month, but the annotation never asserts more than 3 within any
 *      ±14 days. Stitching the month together and counting four would state a
 *      breadth the pipeline never found.
 *
 *  So this takes the PEAK the pipeline actually asserted: the highest `count`
 *  on any of an issuer's rows, and the filings sitting inside that row's own
 *  window. The claim the page then makes — "N insiders bought within a
 *  fortnight" — is the annotation's claim, not a reconstruction of it.
 *
 *  Note closed-end investment trusts and VCTs never carry a cluster at all:
 *  ddbx-data suppresses them, because several trust directors buying near NAV
 *  in a fortnight is board housekeeping rather than conviction. That
 *  suppression is a feature of this board and it is published on the page. */
export const CLUSTER_TIERS = { strong: 14, soft: 30 };

/** Whether a purchase counts toward a cluster's insider count.
 *
 *  MIRRORS THE PIPELINE'S OWN CO-BUYER PREDICATE, and it has to, or this page
 *  contradicts every other surface in the product. ddbx-data does not count all
 *  co-buyers: each market applies a per-filing floor and some quality tests
 *  before an insider counts toward cluster breadth, on the grounds that a £2,000
 *  purchase is not evidence of conviction.
 *
 *  Counting naively instead of mirroring produces exactly the failure this file
 *  warns about elsewhere. Six different people bought Marshalls between 5 and 13
 *  May; three of them bought less than £10,000, so the pipeline says three and a
 *  naive count says six. The filing pages, the drawer chip and both apps all say
 *  three. A board headlining six would be the only surface in the product
 *  disagreeing with the others about a company a reader can look up.
 *
 *  UK (worker/db/queries.ts, UK_CLUSTER_OTHERS): at least £10,000, classified as
 *  an open-market buy, not quarantined — quarantined rows never reach the wire
 *  format, so that test is already satisfied by anything we can see here.
 *
 *  US (worker/db/us-queries.ts): at least $25,000, held directly rather than
 *  indirectly, and not under a 10b5-1 plan. The floor there is applied per
 *  FILING, summed across its rows, where this tests each row on its own — a
 *  filing split into two $15,000 legs counts for the pipeline and not for us.
 *  Rare, and it errs toward under-counting, which is the safe direction for a
 *  figure the page asks a reader to verify. */
export function countsTowardCluster(d, market) {
  if (market === "US") {
    return (
      buyValue(d) >= 25_000 &&
      d?.direct_indirect === "D" &&
      !d?.aff_10b5_one
    );
  }

  return buyValue(d) >= 10_000 && d?.is_open_market_buy === true;
}

export function clusterEpisodes(dealings, market) {
  const eligible = (dealings ?? []).filter((d) => qualifies(d, market));
  const byTicker = new Map();

  for (const d of eligible) {
    if (!d?.cluster?.count) continue;
    const key = issuerKey(d, market);

    if (!key) continue;
    if (!byTicker.has(key)) byTicker.set(key, []);
    byTicker.get(key).push(d);
  }

  const episodes = [];

  for (const [, rows] of byTicker) {
    // The peak row: most insiders, and among equals the stronger (shorter)
    // window, so a ±14-day three beats a ±30-day three.
    const peak = rows.reduce((best, d) => {
      if (!best) return d;
      const a = Number(d.cluster.count);
      const b = Number(best.cluster.count);

      if (a !== b) return a > b ? d : best;

      return Number(d.cluster.window_days) < Number(best.cluster.window_days)
        ? d
        : best;
    }, null);

    const windowDays = Number(peak.cluster.window_days);
    const anchor = peak.trade_date ?? peak.disclosed_date ?? null;

    if (!anchor) continue;

    // The annotation's window is ±windowDays around the anchor, per
    // ddbx-data/worker/db/cluster.ts — not windowDays forward.
    const within = rows.filter((d) => {
      const date = d.trade_date ?? d.disclosed_date ?? null;

      return date ? Math.abs(daysBetween(date, anchor)) <= windowDays : false;
    });

    // Only the filings the pipeline would itself count toward breadth. See
    // countsTowardCluster — a purchase below the market's floor is shown in the
    // episode's filing list but does not make its buyer one of the insiders the
    // headline counts.
    const insiders = new Set(
      within
        .filter((d) => countsTowardCluster(d, market))
        .map((d) => d?.director?.name ?? d?.reporter?.name ?? null)
        .filter(Boolean),
    );
    const alphas = within.map((d) => buyAlpha(d)).filter((a) => a != null);
    const dates = within
      .map((d) => d.trade_date ?? d.disclosed_date)
      .filter(Boolean)
      .sort();

    episodes.push({
      ticker: peak.ticker ?? "",
      company: peak.company ?? peak.ticker ?? "",
      tier: peak.cluster.tier,
      windowDays,
      /** The pipeline's own distinct-insider count at the peak row.
       *
       *  A CROSS-CHECK, NOT THE HEADLINE. It can disagree with `named` in both
       *  directions. Lower, when this issuer files under two symbols and the
       *  pipeline counted each separately — EDAP TMS asserts 6 where eight
       *  different people are on the page. Higher, when the cluster's other
       *  filings fall outside the fetched window. */
      count: Number(peak.cluster.count),
      /** Distinct insiders named by the filings shown for this episode.
       *
       *  THIS is what the page states, because it is the only figure a reader
       *  can check against the rows underneath it. A headline of six above five
       *  listed names reads as a defect whether or not it is one. */
      named: insiders.size,
      /** Actual days from first to last filing in the episode. The window is
       *  ±14 days around an anchor, so a span can reach 28 — "within a
       *  fortnight" is true of the anchoring rule, not of every episode, and
       *  the row states its own span rather than the rule's. */
      spanDays:
        dates.length > 1
          ? Math.abs(daysBetween(dates[dates.length - 1], dates[0]))
          : 0,
      filings: within.length,
      value: within.reduce((sum, d) => sum + buyValue(d), 0),
      medianAlpha: median(alphas),
      alphaCount: alphas.length,
      firstDate: dates[0] ?? null,
      lastDate: dates[dates.length - 1] ?? null,
      rows: within,
    });
  }

  return episodes;
}

/** Strongest clusters first: most insiders, then combined value.
 *
 *  Strong tier only. A soft cluster is two insiders within a month, which is
 *  common enough that a board of them is a board of coincidences — the tier
 *  exists to mark a row, not to rank one.
 *
 *  Also requires that we can NAME at least two of the buyers. The annotation is
 *  computed in the database over the whole corpus, while these pages read a
 *  fetched window, so a cluster whose other filings fall before the window's
 *  start arrives here asserting five insiders with one filing to show for it —
 *  "KEMPER Corp, 5 insiders" above a list of one name. That is not false, but a
 *  board row that cannot exhibit its own claim is not evidence, and the reader
 *  cannot tell it apart from a bug. Held-back episodes are counted so the page
 *  can say how many. */
export function rankClusters(dealings, market, limit = TOP_N) {
  const all = clusterEpisodes(dealings, market);
  const strong = all.filter((e) => e.tier === "strong");
  const showable = strong.filter((e) => e.named >= 2);

  showable.sort(
    (a, b) =>
      b.named - a.named ||
      b.value - a.value ||
      a.ticker.localeCompare(b.ticker),
  );

  return {
    rows: showable.slice(0, limit),
    qualifying: showable.length,
    /** Soft-tier episodes excluded, for the page to disclose. */
    soft: all.length - strong.length,
    /** Strong episodes whose other filings sit outside the fetched window. */
    partial: strong.length - showable.length,
  };
}

export const CLUSTER_METHODOLOGY = [
  "A cluster is several different insiders buying the same company at about the same time. It is an event, not a company: a company that had a burst of buying in March and another in July has two of them, and the board lists the stronger. A whole season of buying at one issuer is not a cluster, and adding it up as though it were is the mistake this page is built to avoid.",
  "The number of insiders shown for each cluster is the number named in the purchases listed beneath it — a figure a reader can count rather than take on trust. Each episode is anchored on the filing with the most co-buyers and extends fourteen days either side of it, so an episode can span up to four weeks; the row states the days it actually covers.",
  "A co-buyer counts toward a cluster’s insider number only if their purchase was at least £10,000, or on the US board $25,000 held directly and not under a 10b5-1 plan. That is the same floor the filing pages and the app apply, so this page and the cluster chip on a filing never disagree.",
  "Only strong clusters are listed — two or more insiders within fourteen days of each other, the filer included. A softer thirty-day tier exists and is used to mark individual filings, but two people buying a month apart is common enough that ranking it would be ranking coincidence.",
  "Where a cluster's other purchases fall outside the period this page covers, it is left off rather than listed with fewer buyers than it claims. The count of those is shown below the board.",
  "Investment trusts, VCTs and other closed-end vehicles never appear. Several of their directors buying near net asset value in a fortnight is routine board housekeeping rather than a signal, and the pipeline suppresses the cluster on them deliberately.",
  "Only open-market purchases count, on the same test the rest of the site uses. A cluster made of share awards is not a cluster of purchases.",
  "Several insiders buying at once says they agree with each other. It does not say they are right, and clusters are not ranked here by how they subsequently performed.",
];

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Median of an array of numbers, ignoring null/undefined. Null when empty —
 *  which is a real state, and distinct from zero. Mirrors sectors.js. */
export function median(values) {
  const nums = (values ?? [])
    .filter((v) => v != null && isFinite(Number(v)))
    .map(Number)
    .sort((a, b) => a - b);

  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);

  return nums.length % 2 === 1
    ? nums[mid]
    : (nums[mid - 1] + nums[mid]) / 2;
}

/** Whole days from `b` to `a`. Both are ISO dates; anything unparseable gives
 *  Infinity so the caller's window test excludes it rather than admitting it. */
function daysBetween(a, b) {
  const x = Date.parse(String(a).slice(0, 10));
  const y = Date.parse(String(b).slice(0, 10));

  if (!isFinite(x) || !isFinite(y)) return Infinity;

  return Math.round((x - y) / 86_400_000);
}

/** What a set of ranked filings adds up to. Shared by the performance board and
 *  the role hubs, which state the same four facts above their tables. */
export function summarise(rows) {
  const alphas = (rows ?? []).map((d) => buyAlpha(d)).filter((a) => a != null);

  return {
    filings: (rows ?? []).length,
    value: (rows ?? []).reduce((sum, d) => sum + buyValue(d), 0),
    companies: new Set((rows ?? []).map((d) => d.ticker ?? "")).size,
    medianAlpha: median(alphas),
    alphaCount: alphas.length,
  };
}
