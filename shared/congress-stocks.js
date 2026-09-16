// Congress by stock: the ticker pages under /congress/stocks. Slugs, the
// publishing bar, the rollup over one ticker's purchases, and every sentence
// both renderers say about it.
//
// Plain ESM at the repo root for the reason shared/congress.js is: the React
// pages and the Pages Functions both need it, and a crawler reading a
// different verdict from the visitor is a page arguing with itself.
//
// ---------------------------------------------------------------------------
// What this family is
// ---------------------------------------------------------------------------
//
// The Congress family reads one way today: a member, then what they bought.
// These pages reverse it. A reader who searches "congress nvidia stock" wants
// the issuer first: who in Congress bought it, when, in what bands, and
// whether any of them sit on a committee whose jurisdiction covers the
// company. The rows are the same STOCK Act filings the member pages draw on,
// grouped the other way.
//
// The three rules from shared/congress.js apply unchanged, and one more is
// added because the subject changed:
//
// RULE 1 — BANDS, NEVER POINTS. Every money figure here is a floor-to-ceiling
// pair. `amount_mid` never reaches a reader; the band ladder below groups by
// the disclosed band itself, never by a midpoint.
//
// RULE 2 — DISTINGUISH WHAT WE DON'T MODEL FROM WHAT DIDN'T HAPPEN. The lane
// is modelled for House committees only, and only where we hold a sector for
// the issuer. `laneRollup()` keeps three counts apart — in lane, out of lane,
// and not computed — and `laneSentence()` is the only place allowed to phrase
// them. A page must never say "none of these members oversee the sector" when
// the honest sentence is "we did not ask".
//
// RULE 3 — JURISDICTION, NEVER KNOWLEDGE. "Sits on a committee overseeing the
// sector" is a fact of public record. Nothing here may say or imply that a
// purchase was informed by it.
//
// RULE 4 — PURCHASES ONLY, SAID OUT LOUD. PTRs disclose sales too, but the
// pipeline ingests purchases and drops everything else at the door
// (ddbx-data worker/pipeline/us-gov/ingest.ts). A page titled "who traded
// Nvidia" that shows only buys is misleading by omission, so the family is
// titled and written as "who bought", and `PURCHASES_ONLY_NOTE` is on every
// page. Adding sales is a data-side change, specified in the investigation.

import { band, listSentence, memberNoun } from "./congress.js";

/* ─── The bar ────────────────────────────────────────────────────────────── */

/** A ticker page needs this many DISTINCT MEMBERS to be indexed. Five, not
 *  three: with three the page is a coincidence and the verdict has nothing to
 *  weigh. At five the current corpus publishes 98 of 1,082 tickers, which is
 *  a set Google can take seriously and a set a reader can too. */
export const MIN_STOCK_MEMBERS = 5;

/** And this many purchase rows. Ten is the floor for a band ladder that
 *  shows a shape and a lag figure that is a median rather than a coin. Below
 *  either bar the page still renders (a link must not 404) with an honest
 *  not-enough-data state, noindex and no sitemap entry, and crosses the bar
 *  on its own as filings arrive. */
export const MIN_STOCK_ROWS = 10;

/** Tickers bought by fewer members than this are not in the roster at all.
 *  Their pages still resolve live; they are just not listed on the index. */
export const ROSTER_MIN_MEMBERS = 2;

/** Cap on the purchases table. The rollup above it always covers every row. */
export const STOCK_ROWS = 40;

/** The most members drawn as their own row on the roll-call timeline; the
 *  rest share a final row so a widely-held name is a chart, not a wall. */
export const ROLL_CALL_ROWS = 18;

/** Purchases are fetched at the feed's own ceiling. No ticker is near it
 *  (NVDA, the most-bought, has 109 rows) but the page checks and says so. */
export const STOCK_FETCH_LIMIT = 500;

/** Takes either a rollup (members as a list) or a roster entry shape
 *  ({ members: n, rows: n }); the sitemap and the page apply one bar. */
export function stockMeetsBar(s) {
  if (!s) return false;
  const members = Array.isArray(s.members) ? s.members.length : s.members;

  return members >= MIN_STOCK_MEMBERS && s.rows >= MIN_STOCK_ROWS;
}

/* ─── Slugs ──────────────────────────────────────────────────────────────── */

/** Lower-cased ticker, dot kept: "BRK.B" -> "brk.b". The PTR ticker is the
 *  identity the feed filters on, so the slug is that ticker and nothing
 *  cleverer. */
export const stockSlug = (ticker) => String(ticker ?? "").toLowerCase();

/** The ticker out of a slug, or null when it is not a ticker shape. Bounded
 *  and character-limited so "/congress/stocks/nancy-pelosi" is a clean
 *  not-found rather than a feed query. */
export function tickerFromSlug(slug) {
  const t = String(slug ?? "").trim().toUpperCase();

  return /^[A-Z0-9][A-Z0-9.\-]{0,9}$/.test(t) ? t : null;
}

export const STOCKS_INDEX_PATH = "/congress/stocks";
export const stockPath = (ticker) => `${STOCKS_INDEX_PATH}/${stockSlug(ticker)}`;

/* ─── Names ──────────────────────────────────────────────────────────────── */

/** A PTR asset description, cut back to the issuer.
 *
 *  Filers write "NVIDIA Corporation - Common Stock", "Alphabet Inc. - Class A
 *  Common Stock", "Visa Inc." and "Microsoft Corp (MSFT)" for the same kind of
 *  thing. The share class and the ticker are not the name. */
export function cleanIssuer(name) {
  let out = String(name ?? "").trim();

  for (;;) {
    const next = out
      .replace(
        /\s*(?:[-–—]\s*)?(class\s+[a-z]\s+)?(common|ordinary|capital)?\s*(stock|shares?)\s*$/i,
        "",
      )
      .replace(/\s*\((?:[A-Z0-9.\-]{1,10})\)\s*$/, "")
      .replace(/\s*-\s*$/, "")
      .trim();

    if (next === out || next === "") return out;
    out = next;
  }
}

/** Committees from the roster minus subcommittees, which carry no
 *  jurisdiction. Same filter as the member page's `toSummary`. */
export const fullCommittees = (committees) =>
  (committees ?? []).filter((c) => !/^Subcommittee\b/i.test(c));

/* ─── The rollup ─────────────────────────────────────────────────────────── */

const DAY = 864e5;

function daysBetween(a, b) {
  const t0 = Date.parse(`${String(a).slice(0, 10)}T00:00:00Z`);
  const t1 = Date.parse(`${String(b).slice(0, 10)}T00:00:00Z`);

  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return null;

  return Math.round((t1 - t0) / DAY);
}

export function median(values) {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);

  if (xs.length === 0) return null;
  const mid = Math.floor(xs.length / 2);

  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

const mostCommon = (counts) =>
  [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

/** One member's relationship to the issuer's sector.
 *
 *  "in"          sits on a mapped committee whose sectors include the issuer's
 *  "out"         sits on at least one mapped committee; none covers the sector
 *  "unmodelled"  none of their full committees is one we map (every senator)
 *  "nosector"    we hold no sector for the issuer, so nobody was asked
 *
 *  Four values, not a boolean, because rule 2 is about the difference between
 *  the last three. */
export function memberLane(committees, sector, lanes) {
  if (!sector) return { lane: "nosector", via: [] };
  const mapped = fullCommittees(committees).filter((c) => lanes.has(c));

  if (mapped.length === 0) return { lane: "unmodelled", via: [] };
  const via = mapped.filter((c) => (lanes.get(c) ?? []).includes(sector));

  return { lane: via.length ? "in" : "out", via };
}

/** Everything the page says about one ticker, from its purchase rows.
 *
 *  `rows` is /api/gov-dealings?view=all&ticker=X — every purchase we hold for
 *  the ticker, newest first. `lanes` is committee -> sectors from
 *  /api/gov-committees; pass an empty Map and every member is "unmodelled",
 *  which is the honest reading when the lane map failed to load.
 *
 *  Returns null for no rows: nothing here can be said about an empty set. */
export function stockRollup(ticker, rows, lanes) {
  const all = (rows ?? []).filter((r) => r && r.ticker === ticker);

  if (all.length === 0) return null;

  const names = new Map();
  const sectors = new Map();
  const filings = new Set();
  const lateFilings = new Set();
  const byMember = new Map();
  const lags = [];
  let totalMin = 0;
  let totalMax = 0;
  let selfCount = 0;
  let optionRows = 0;
  let clustered = 0;
  const marks = [];

  for (const r of all) {
    names.set(r.company, (names.get(r.company) ?? 0) + 1);
    if (r.sector_normalized) {
      sectors.set(r.sector_normalized, (sectors.get(r.sector_normalized) ?? 0) + 1);
    }
    filings.add(r.filing_id);
    if (r.is_late) lateFilings.add(r.filing_id);
    totalMin += r.amount_min ?? 0;
    totalMax += r.amount_max ?? 0;
    if (r.owner === "self") selfCount += 1;
    if (r.asset_type === "option") optionRows += 1;
    if (r.cluster) clustered += 1;
    const lag = daysBetween(r.trade_date, r.disclosed_date);

    if (lag != null && lag >= 0) lags.push(lag);
    const perf = r.live_performance;

    if (perf && perf.return_pct_disclosed != null) {
      marks.push({
        ret: perf.return_pct_disclosed,
        alpha: perf.alpha_pct_disclosed,
        as_of: perf.as_of,
      });
    }

    const id = r.reporter?.id ?? r.reporter?.name ?? "unknown";
    const m = byMember.get(id) ?? {
      id,
      name: r.reporter?.name ?? "Unnamed filer",
      chamber: r.reporter?.chamber ?? "house",
      party: r.reporter?.party,
      state: r.reporter?.state,
      district: r.reporter?.district,
      photo_url: r.reporter?.photo_url,
      committees: fullCommittees(r.reporter?.committees),
      rows: 0,
      filings: new Set(),
      total_min: 0,
      total_max: 0,
      self: 0,
      first: r.disclosed_date,
      last: r.disclosed_date,
      dates: [],
    };

    m.rows += 1;
    m.filings.add(r.filing_id);
    m.total_min += r.amount_min ?? 0;
    m.total_max += r.amount_max ?? 0;
    if (r.owner === "self") m.self += 1;
    if (r.disclosed_date < m.first) m.first = r.disclosed_date;
    if (r.disclosed_date > m.last) m.last = r.disclosed_date;
    m.dates.push(r.disclosed_date);
    byMember.set(id, m);
  }

  const sector = mostCommon(sectors);
  const laneMap = lanes instanceof Map ? lanes : new Map();
  const members = [...byMember.values()]
    .map((m) => ({
      ...m,
      filings: m.filings.size,
      ...memberLane(m.committees, sector, laneMap),
    }))
    .sort((a, b) => b.rows - a.rows || (a.last < b.last ? 1 : -1));

  // Newest first is the feed's order; the first row is the latest purchase.
  const latest = all[0];
  const first = all[all.length - 1].disclosed_date;
  const last = all[0].disclosed_date;

  const lane = {
    sectorKnown: !!sector,
    in: members.filter((m) => m.lane === "in").length,
    out: members.filter((m) => m.lane === "out").length,
    unmodelled: members.filter((m) => m.lane === "unmodelled").length,
    /** Mapped committees covering the sector, with who sits on them. */
    committees: [...laneMap.entries()]
      .filter(([, sectors]) => sector && sectors.includes(sector))
      .map(([committee]) => ({
        committee,
        members: members.filter((m) => m.via.includes(committee)),
      })),
  };

  const alphas = marks.filter((m) => m.alpha != null);

  return {
    ticker,
    company: cleanIssuer(mostCommon(names) ?? ticker),
    sector,
    rows: all.length,
    filings: filings.size,
    members,
    house: members.filter((m) => m.chamber === "house").length,
    senate: members.filter((m) => m.chamber === "senate").length,
    total_min: totalMin,
    total_max: totalMax,
    first_disclosed: first,
    last_disclosed: last,
    latest,
    self_count: selfCount,
    late_filings: lateFilings.size,
    option_rows: optionRows,
    clustered,
    lag: { median: median(lags), n: lags.length },
    lane,
    bands: bandLadder(all),
    outcome:
      marks.length === 0
        ? null
        : {
            measured: marks.length,
            median_return_pct: median(marks.map((m) => m.ret)),
            compared: alphas.length,
            ahead: alphas.filter((m) => m.alpha > 0).length,
            as_of: marks.map((m) => m.as_of).filter(Boolean).sort().pop() ?? null,
          },
    /** True when the feed handed back its ceiling, so the figures are a floor. */
    truncated: all.length >= STOCK_FETCH_LIMIT,
  };
}

/** Purchases grouped by the band they were disclosed in, smallest first.
 *  The one chart on the page that is native to the data: PTRs disclose a
 *  band, so the distribution of bands is a fact and a midpoint histogram
 *  would not be. */
export function bandLadder(rows) {
  const tiers = new Map();

  for (const r of rows ?? []) {
    const lo = r.amount_min ?? 0;
    const hi = r.amount_max ?? 0;
    const key = `${lo}:${hi}`;
    const t = tiers.get(key) ?? { min: lo, max: hi, count: 0 };

    t.count += 1;
    tiers.set(key, t);
  }

  return [...tiers.values()].sort((a, b) => a.min - b.min || a.max - b.max);
}

/* ─── Formatting ─────────────────────────────────────────────────────────── */

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

/** "September 2026" from an ISO date, for sentences about a span. */
export function monthYear(iso) {
  const s = String(iso ?? "");
  const m = Number(s.slice(5, 7));

  if (!m || s.length < 7) return s;

  return `${MONTHS[m - 1]} ${s.slice(0, 4)}`;
}

/** "1 September 2026" from an ISO date. */
export function longDate(iso) {
  const s = String(iso ?? "");
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));

  if (!m || !d) return s;

  return `${d} ${MONTHS[m - 1]} ${s.slice(0, 4)}`;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Sector as it reads in a sentence: "health care", "technology". */
const sectorWord = (s) => String(s ?? "").toLowerCase();

/* ─── The sentences ──────────────────────────────────────────────────────── */

/** Opening sentence and meta description, one function so the crawler and
 *  the reader get the same one. */
export function stockLeadSentence(s) {
  const span =
    monthYear(s.first_disclosed) === monthYear(s.last_disclosed)
      ? `in ${monthYear(s.last_disclosed)}`
      : `between ${monthYear(s.first_disclosed)} and ${monthYear(s.last_disclosed)}`;

  return `${plural(s.members.length, "member", "members")} of Congress ${s.members.length === 1 ? "has" : "have"} disclosed ${plural(s.rows, "purchase", "purchases")} of ${s.company} (${s.ticker}) ${span}, worth ${band(s.total_min, s.total_max)} at the disclosed bands.`;
}

/** The jurisdiction sentence. RULE 2 LIVES HERE: the three "no" cases are
 *  three different sentences, and only one of them is about the members. */
export function laneSentence(s) {
  const L = s.lane;
  const modelled = L.in + L.out;

  if (!L.sectorKnown) {
    return `We hold no sector for ${s.company}, so no committee lane is computed for any of these purchases.`;
  }
  if (modelled === 0) {
    return `None of the ${plural(s.members.length, "buyer", "buyers")} sits on a House committee we map a sector jurisdiction for, so no lane is computed. That is a fact about our coverage, not about them.`;
  }
  const tail =
    L.unmodelled > 0
      ? ` For the other ${plural(L.unmodelled, "member", "members")} no lane is computed, because we map House committees only.`
      : "";

  if (L.in === 0) {
    return `${modelled === s.members.length ? "None of the" : `None of the ${modelled}`} ${modelled === 1 ? "member" : "members"} whose committees we map ${modelled === 1 ? "sits" : "sit"} on one that oversees ${sectorWord(s.sector)}.${tail}`;
  }
  const who = listSentence(
    s.members.filter((m) => m.lane === "in").map((m) => m.name),
  );
  const via = listSentence(
    s.lane.committees
      .filter((c) => c.members.length > 0)
      .map((c) => shortCommitteeName(c.committee)),
  );

  return `${plural(L.in, "member", "members")} of the ${modelled} whose committees we map ${L.in === 1 ? "sits" : "sit"} on one that oversees ${sectorWord(s.sector)}: ${who}, via ${via}.${tail}`;
}

/** "Energy and Commerce" from the full committee name. Local copy of
 *  shared/congress.js' shortCommittee so this file's sentences do not depend
 *  on a second import for one string. */
export function shortCommitteeName(committee) {
  return String(committee ?? "")
    .replace(/^House\s+Committee\s+on\s+/i, "")
    .replace(/^Senate\s+Committee\s+on\s+/i, "")
    .replace(/^Permanent\s+Select\s+Committee\s+on\s+/i, "");
}

/** One member's lane, as a row caption. Same four cases as memberLane. */
export function memberLaneLine(m, sector) {
  switch (m.lane) {
    case "in":
      return `Sits on ${listSentence(m.via.map(shortCommitteeName))}, which oversees ${sectorWord(sector)}.`;
    case "out":
      return `Committees mapped; none oversees ${sectorWord(sector)}.`;
    case "unmodelled":
      return m.chamber === "senate"
        ? "No lane computed: we map House committees only."
        : "No lane computed: none of their committees is one we map.";
    default:
      return "No lane computed: we hold no sector for this issuer.";
  }
}

/** Concentration note, or null when the buying is spread. */
export function concentrationSentence(s) {
  const top = s.members[0];

  if (!top || s.members.length < 2) return null;
  const share = Math.round((top.rows / s.rows) * 100);

  if (share < 40) return null;

  return `${share}% of the purchases (${top.rows} of ${s.rows}) come from one member, ${top.name}, so this is closer to one member's habit than a pattern across Congress.`;
}

/** How the purchases have done since disclosure, over the ones with a mark.
 *  Null when none has one, and the renderer says so rather than nothing. */
export function outcomeSentence(s) {
  const o = s.outcome;

  if (!o) return null;
  const med = o.median_return_pct;
  const medBit =
    med == null
      ? ""
      : Math.abs(med) < 0.05
        ? " the median purchase is flat"
        : ` the median purchase is ${Math.abs(med).toFixed(1)}% ${med > 0 ? "up" : "down"}`;
  const subject =
    o.measured === s.rows
      ? `all ${o.measured} purchases`
      : `the ${o.measured} of ${s.rows} purchases with a price mark`;
  const ahead =
    o.compared === 0
      ? ""
      : o.compared === o.ahead
        ? ` and ${o.compared === 1 ? "it is" : "all of them are"} ahead of the S&P 500`
        : o.ahead === 0
          ? ` and ${o.compared === 1 ? "it is not" : "none of them is"} ahead of the S&P 500`
          : ` and ${o.ahead} of the ${o.compared} compared ${o.ahead === 1 ? "is" : "are"} ahead of the S&P 500`;

  return `Measured from the close on the day each filing was published, across ${subject},${medBit}${ahead}.`;
}

/** The verdict: one paragraph, in the company-verdict pattern. Says what
 *  the pattern is, what the lane says, who filed it, how long disclosure
 *  took, how the purchases have done, and what the latest was. Every clause
 *  is computed; a clause with nothing behind it is dropped, never padded. */
export function stockVerdict(s) {
  const parts = [];
  const conc = concentrationSentence(s);

  if (conc) {
    parts.push(conc);
  } else if (s.members.length >= 2) {
    const top = s.members[0];
    const share = Math.round((top.rows / s.rows) * 100);
    const chambers =
      s.house && s.senate
        ? `, ${plural(s.house, "in the House", "in the House")} and ${s.senate} in the Senate`
        : s.senate
          ? ", all senators"
          : "";

    parts.push(
      `No single member accounts for more than ${share}% of the purchases; the buying is spread across ${s.members.length} members${chambers}.`,
    );
  }

  parts.push(laneSentence(s));

  const other = s.rows - s.self_count;

  if (other > 0) {
    parts.push(
      `${plural(other, "purchase", "purchases")} (${Math.round((other / s.rows) * 100)}%) ${other === 1 ? "was" : "were"} filed for a spouse, joint or dependent account rather than in a member's own name.`,
    );
  }

  if (s.lag.median != null) {
    const late =
      s.late_filings > 0
        ? `; ${plural(s.late_filings, "filing", "filings")} came after the STOCK Act's 45-day window`
        : "";

    parts.push(
      `Disclosure took a median of ${plural(Math.round(s.lag.median), "day", "days")} from trade to filing${late}.`,
    );
  }

  const outcome = outcomeSentence(s);

  parts.push(
    outcome ??
      "No purchase here carries a price mark yet, so we say nothing about how they have done.",
  );

  if (s.latest) {
    parts.push(
      `The most recent was filed on ${longDate(s.latest.disclosed_date)} by ${memberNoun(s.latest.reporter?.chamber)} ${s.latest.reporter?.name ?? "an unnamed filer"}.`,
    );
  }

  return parts.join(" ");
}

/** The not-enough-data state, in words, with when it will change. */
export function belowBarSentence(s) {
  return `We hold ${plural(s.rows, "purchase", "purchases")} of ${s.company} by ${plural(s.members.length, "member", "members")} of Congress. A stock gets a full page once at least ${MIN_STOCK_MEMBERS} members and ${MIN_STOCK_ROWS} purchases are on record, so this one is listed but not yet described. It crosses the bar on its own as filings arrive.`;
}

/** Options note, or null. An options row is a purchase in the filing's own
 *  terms and is counted; a reader should know how many of the rows are one. */
export function optionsNote(s) {
  if (!s.option_rows) return null;

  return `${plural(s.option_rows, "purchase", "purchases")} ${s.option_rows === 1 ? "is" : "are"} an options position rather than shares. ${s.option_rows === 1 ? "It is" : "They are"} counted in the figures.`;
}

/** Feed-ceiling note, or null. */
export function truncatedNote(s) {
  if (!s.truncated) return null;

  return `The feed returns at most ${STOCK_FETCH_LIMIT} rows and this ticker hit that ceiling, so every figure on this page is a floor.`;
}

/** Cross-member cluster note, or null. Stated as timing, never as intent. */
export function clusterNote(s) {
  if (!s.clustered) return null;

  return `${plural(s.clustered, "purchase", "purchases")} ${s.clustered === 1 ? "was" : "were"} disclosed within a month of another member's purchase of the same name.`;
}

/** The standing sentence for the family. On every page, in the body. */
export const PURCHASES_ONLY_NOTE =
  "These pages show purchases only. Congressional filings disclose sales too, but we do not yet hold them, so nothing here says whether a member later sold.";

/* ─── The roster (index and sitemap) ─────────────────────────────────────── */

/** Roster entries that clear the bar, in roster order (members, then rows). */
export const publishedRoster = (roster) =>
  (roster ?? []).filter((e) => stockMeetsBar({ members: e.m, rows: e.r }));

/** Roster entry for a ticker, or null. */
export const rosterEntry = (roster, ticker) =>
  (roster ?? []).find((e) => e.t === ticker) ?? null;

/** Related tickers: the published names bought by the most of the same
 *  members, then the same sector. Never the ticker itself; up to `n`. */
export function relatedTickers(roster, ticker, n = 4) {
  const me = rosterEntry(roster, ticker);
  const published = publishedRoster(roster).filter((e) => e.t !== ticker);

  if (!me) return published.slice(0, n);
  const mine = new Set(me.ids ?? []);

  return published
    .map((e) => ({
      e,
      shared: (e.ids ?? []).filter((id) => mine.has(id)).length,
      sector: me.s && e.s === me.s ? 1 : 0,
    }))
    .sort(
      (a, b) =>
        b.shared - a.shared || b.sector - a.sector || b.e.m - a.e.m,
    )
    .slice(0, n)
    .map((x) => x.e);
}

/** Index lead sentence and meta description. */
export function stocksIndexLead(roster, corpus) {
  const published = publishedRoster(roster).length;

  const n = (v) => Number(v).toLocaleString("en-US");

  return `${n(corpus.tickers)} stocks appear in the ${n(corpus.rows)} purchases disclosed by ${corpus.members} members of Congress on record. ${published} of them have been bought by at least ${MIN_STOCK_MEMBERS} members and have a page here: who bought, when, in what bands, and which buyers sit on a committee that oversees the sector.`;
}
