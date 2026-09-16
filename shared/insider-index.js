// The Insider Index: one daily number for how much insider buying there is,
// measured against its own record.
//
// Plain ESM at the repo root, for the reason shared/boards.js and
// shared/weeks.js give: the React page, the crawler pre-render Functions and
// the daily edition all print the same reading, and a number that differs
// between the tab and the crawler is a number nobody should trust. Nothing in
// here reads a browser or a Worker global; give it dealings and a date and it
// answers.
//
// ---------------------------------------------------------------------------
// What the data allowed, and what it did not
// ---------------------------------------------------------------------------
//
// The brief was "net insider buying", buys minus sells, Fear & Greed for
// insiders. The feeds do not carry sells. The UK `dealings` table is buy-only
// by construction (worker/pipeline/buy-style.ts says so in as many words: the
// scraper stores PDMR purchases and nothing else), and /api/us-dealings serves
// Form 4 transaction code P alone. Every one of the 1,021 UK rows and 960 US
// rows fetched on 2026-09-16 was a buy. So "net" is not a quantity this data
// can produce, and an index that claimed to be one would be a lie with a
// formula under it.
//
// What the data CAN say is how much buying there is compared with how much
// there usually is. That is the index: the last twenty trading days of
// disclosed open-market purchases, ranked against every earlier twenty-day
// window on record. It is a barometer of activity, not of sentiment in the
// buy-minus-sell sense, and the page says so.
//
// UK only, for now. The US feed the site can reach is a curated view rather
// than the population: /api/coverage counts 2,433 US open-market buys since
// May and the feed returns 960 of them, floored at $50,000, with a July that
// runs at a fifth of August's rate. An index over a subset measures the
// curation as much as the market. `market` is a parameter throughout so the
// US switches on with one constant when a population feed exists; see the
// investigation for the endpoint spec.
//
// ---------------------------------------------------------------------------
// The formula, in full
// ---------------------------------------------------------------------------
//
//   1. Universe. Disclosed open-market purchases by insiders, the same test
//      every board uses (`isEligibleBuy` in shared/leaderboard.js): UK rows
//      classified `is_open_market_buy === true`, so allotments, vesting,
//      option exercises and placings are out, and rows not yet priced are
//      left out rather than assumed. Keyed on `disclosed_date`, the day the
//      market learned of the purchase.
//
//   2. Calendar. Trading days are Monday to Friday. Nothing is disclosed at
//      the weekend (0 of 1,007 rows), so a weekend date has no reading.
//      Bank holidays are ordinary zero days inside a window; they cost a
//      window a twentieth of its length and are not corrected for.
//
//   3. Window. Each reading covers the twenty trading days ending on its
//      date, inclusive. Four weeks: long enough that one busy Tuesday does
//      not swing it, short enough that a month of quiet shows.
//
//   4. Three components per window:
//        count    — purchases disclosed in the window
//        breadth  — distinct issuers bought in the window
//        value    — the sum of purchase values, each purchase first capped at
//                   VALUE_CAP (£250,000 for the UK)
//      Value is capped per transaction because the distribution is a cliff:
//      the median UK purchase is £24,000, the 90th percentile £199,000, and
//      the largest single purchase in the record (£11.4m) is 9.9% of six
//      months of buying by itself. Uncapped, the index would be a chart of
//      whichever founder wrote the biggest cheque. £250,000 is an editorial
//      line, not a derived one: roughly one purchase in ten is above it.
//
//   5. Rank. Each component's reading is expressed as a percentile against
//      the same component over the trailing LOOKBACK readings, itself
//      included: the share of earlier windows it exceeds, with ties counted
//      half. So a count percentile of 82 means "more purchases than in 82%
//      of the twenty-day windows on record".
//
//   6. Index. The mean of the three percentiles, rounded to a whole number.
//      0 to 100; 50 is the middle of the record by construction. Count and
//      breadth carry the same weight as value deliberately: a wide, small
//      wave of buying is the pattern this site exists to notice.
//
//   7. Publication. A reading is published once MIN_HISTORY earlier readings
//      exist to rank against. Before that the components are computed and
//      the index is withheld, with the date it will exist stated.
//
//   8. Comparisons. "The busiest since 3 June" means no reading between
//      3 June and this one was as high; "since readings began" means none
//      was. A comparison is only made across a gap of a week or more.
//
// Readings are recomputed from the full record each time they are asked
// for, so a filing that arrives late (a backfill, a corrected RNS) can move a
// past reading by a point. That is the honest posture: the alternative, a
// stored figure that never changes, would be a reading of what we knew rather
// than of what happened. The investigation lists a data-side endpoint that
// would freeze readings if that trade-off is ever wanted.

import { buyValue, isEligibleBuy } from "./leaderboard.js";
import { TRACKING_SINCE_DATE } from "./tracking.js";

/** Trading days in one reading's window. */
export const WINDOW_DAYS = 20;

/** Readings needed before a percentile means anything. Eight weeks. */
export const MIN_HISTORY = 40;

/** How far back a reading is ranked. One trading year; the record is shorter
 *  than that today, so every reading ranks against everything before it. */
export const LOOKBACK = 250;

/** The per-purchase cap on the value component, in the market's own
 *  currency. See point 4 above for why the UK line is where it is. The US
 *  figure is the same percentile on that feed and is inert until the market
 *  is switched on. */
export const VALUE_CAP = { UK: 250_000, US: 1_000_000 };

/** Markets the index is published for. */
export const INDEX_MARKETS = ["UK"];

export const INDEX_PATH = "/insider-index";

/** The five reading tiers, lowest first. Each covers a fifth of the scale,
 *  and since the index is a percentile mean, roughly a fifth of days land in
 *  each. `label` is the word the page prints; `phrase` completes "Insider
 *  buying is …". */
export const TIERS = [
  { id: "very-quiet", min: 0, label: "Very quiet", phrase: "very quiet" },
  { id: "quiet", min: 20, label: "Quiet", phrase: "quiet" },
  { id: "normal", min: 40, label: "Normal", phrase: "about normal" },
  { id: "busy", min: 60, label: "Busy", phrase: "busy" },
  { id: "very-busy", min: 80, label: "Very busy", phrase: "very busy" },
];

export function tierFor(score) {
  if (score == null || !isFinite(score)) return null;
  let tier = TIERS[0];

  for (const t of TIERS) if (score >= t.min) tier = t;

  return tier;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Parse an ISO date as UTC midnight, or null. */
function utc(iso) {
  if (!ISO.test(String(iso ?? ""))) return null;
  const d = new Date(`${iso}T00:00:00Z`);

  return Number.isNaN(d.getTime()) ? null : d;
}

const toIso = (d) => d.toISOString().slice(0, 10);

export function isWeekday(iso) {
  const d = utc(iso);

  if (!d) return false;
  const day = d.getUTCDay();

  return day >= 1 && day <= 5;
}

/** The trading day before `iso` (or `iso` itself when it is one and
 *  `inclusive`). */
export function prevWeekday(iso, inclusive = false) {
  const d = utc(iso);

  if (!d) return null;
  if (!inclusive) d.setUTCDate(d.getUTCDate() - 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() - 1);
  }

  return toIso(d);
}

export function nextWeekday(iso, inclusive = false) {
  const d = utc(iso);

  if (!d) return null;
  if (!inclusive) d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }

  return toIso(d);
}

/** Every trading day from `from` to `to`, inclusive, ascending. */
export function weekdaysBetween(from, to) {
  const out = [];
  const end = utc(to);
  let d = utc(from);

  if (!d || !end) return out;
  for (; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay();

    if (day >= 1 && day <= 5) out.push(toIso(d));
  }

  return out;
}

/** Today's date in London, as ISO. Disclosures are dated in UK time and the
 *  reading for "today" has to agree with the RNS clock, not the reader's. */
export function todayLondon(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "16 September 2026". */
export function dateLabel(iso) {
  if (!ISO.test(String(iso ?? ""))) return String(iso ?? "");

  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}

/** "16 Sep". */
export function shortDateLabel(iso) {
  if (!ISO.test(String(iso ?? ""))) return String(iso ?? "");

  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1].slice(0, 3)}`;
}

/** "16 September", the year dropped for a sentence about this year. */
export function dayMonthLabel(iso) {
  if (!ISO.test(String(iso ?? ""))) return String(iso ?? "");

  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

export const indexPath = (date) => (date ? `${INDEX_PATH}/${date}` : INDEX_PATH);

/** "2026-09-16" -> true only for a real trading day. A weekend slug is a
 *  clean not-found rather than a page that silently shows the Friday. */
export const isIndexSlug = (slug) => isWeekday(String(slug ?? ""));

/** "/insider-index/2026-09-16" -> "2026-09-16", or null. */
export function indexDateFromPath(path) {
  const m = String(path ?? "").match(/^\/insider-index\/([^/]+)$/);

  if (!m) return null;
  const slug = decodeURIComponent(m[1]);

  return isIndexSlug(slug) ? slug : null;
}

// ---------------------------------------------------------------------------
// The computation
// ---------------------------------------------------------------------------

/** Is this row in the index's universe? The boards' own test, re-exported
 *  under the name this page uses so the two cannot drift. */
export function isIndexPurchase(d, market) {
  return isEligibleBuy(d, market) && isWeekday(d?.disclosed_date);
}

/** Per disclosure day: purchases, capped value, and the issuers bought. */
export function dailyTotals(dealings, market) {
  const cap = VALUE_CAP[market] ?? Infinity;
  const days = new Map();

  for (const d of dealings ?? []) {
    if (!isIndexPurchase(d, market)) continue;
    const date = d.disclosed_date;
    let row = days.get(date);

    if (!row) {
      row = { date, count: 0, value: 0, issuers: new Set() };
      days.set(date, row);
    }
    row.count += 1;
    row.value += Math.min(cap, Math.max(0, buyValue(d)));
    const key = market === "US" ? d.issuer_cik || d.ticker : d.ticker;

    if (key) row.issuers.add(key);
  }

  return days;
}

/** Percentile of `x` within `pool` (which contains x itself once): the share
 *  of the OTHER values it exceeds, ties counted half. Null with nothing to
 *  rank against. */
export function percentileRank(x, pool) {
  const others = pool.length - 1;

  if (others <= 0) return null;
  let below = 0;
  let equal = -1; // x is in the pool once; do not count it against itself

  for (const v of pool) {
    if (v < x) below += 1;
    else if (v === x) equal += 1;
  }

  return ((below + equal * 0.5) / others) * 100;
}

/** The first disclosure date the index can start counting from: the first
 *  weekday on or after the tracking floor, or the first disclosed row if that
 *  is later. */
function firstDay(days) {
  const dates = [...days.keys()].sort();
  const floor = nextWeekday(TRACKING_SINCE_DATE, true);

  if (dates.length === 0) return floor;

  return dates[0] > floor ? dates[0] : floor;
}

/** Every reading from the first full window to `to`, ascending.
 *
 *  `to` defaults to today in London. A reading exists for every trading day
 *  in range whether or not the index is published for it; `score` is null
 *  until MIN_HISTORY earlier readings exist. Dates past `to` are never
 *  produced, so a future permalink resolves to nothing rather than to a
 *  window of zeros. */
export function series(dealings, market = "UK", opts = {}) {
  const days = dailyTotals(dealings, market);
  const today = todayLondon(opts.now);
  // Never past today: a window in the future is a window of zeros, and a
  // reading of "nothing was bought" about days that have not happened is the
  // one thing this module must not produce.
  const to = opts.to && opts.to < today ? opts.to : today;
  const from = opts.from ?? firstDay(days);
  const calendar = weekdaysBetween(from, to);
  const out = [];
  const counts = [];
  const breadths = [];
  const values = [];

  for (let i = WINDOW_DAYS - 1; i < calendar.length; i++) {
    const window = calendar.slice(i - WINDOW_DAYS + 1, i + 1);
    let count = 0;
    let value = 0;
    const issuers = new Set();

    for (const date of window) {
      const row = days.get(date);

      if (!row) continue;
      count += row.count;
      value += row.value;
      for (const k of row.issuers) issuers.add(k);
    }
    const breadth = issuers.size;

    counts.push(count);
    breadths.push(breadth);
    values.push(value);

    const n = counts.length;
    const start = Math.max(0, n - LOOKBACK);
    const history = n - 1 - start; // readings before this one, in the lookback
    let score = null;
    let countPct = null;
    let breadthPct = null;
    let valuePct = null;

    if (history >= MIN_HISTORY) {
      countPct = percentileRank(count, counts.slice(start));
      breadthPct = percentileRank(breadth, breadths.slice(start));
      valuePct = percentileRank(value, values.slice(start));
      score = Math.round((countPct + breadthPct + valuePct) / 3);
    }

    out.push({
      date: calendar[i],
      windowStart: window[0],
      count,
      breadth,
      value,
      countPct,
      breadthPct,
      valuePct,
      score,
      tier: tierFor(score),
      /** Readings before this one that it was ranked against. */
      history,
    });
  }

  return out;
}

/** The reading for one trading day, or null when the date has none: a
 *  weekend, a date before the first full window, or a date after `to`. */
export function readingForDate(dealings, date, market = "UK", opts = {}) {
  if (!isWeekday(date)) return null;
  if (date > todayLondon(opts.now)) return null;
  const all = series(dealings, market, { ...opts, to: date });

  return all.find((r) => r.date === date) ?? null;
}

/** Everything a page or an edition needs to print one day's reading, in one
 *  call, or null when the date has no published reading. This is the shape
 *  the daily edition consumes; keep it additive. */
export function readingSummary(dealings, date, market = "UK", opts = {}) {
  if (!isWeekday(date)) return null;
  if (date > todayLondon(opts.now)) return null;
  const all = series(dealings, market, { ...opts, to: date });
  const index = all.findIndex((r) => r.date === date);
  const r = index >= 0 ? all[index] : null;

  if (!readingMeetsBar(r)) return null;

  return {
    date: r.date,
    market,
    score: r.score,
    tier: r.tier,
    sentence: readingSentence(all, index, market),
    windowSentence: windowSentence(r, market),
    comparison: sinceComparison(all, index),
    weekChange: weekChange(all, index),
    count: r.count,
    breadth: r.breadth,
    value: r.value,
    windowStart: r.windowStart,
    path: indexPath(r.date),
  };
}

/** The most recent disclosure date in the rows, or null. */
export function lastDisclosed(dealings, market = "UK") {
  let last = null;

  for (const d of dealings ?? []) {
    if (!isIndexPurchase(d, market)) continue;
    if (!last || d.disclosed_date > last) last = d.disclosed_date;
  }

  return last;
}

/** Trading days between the last disclosure on record and `to`. A gap of
 *  FEED_GAP_LIMIT or more is a feed that has stopped rather than a market
 *  that has, and the page says so instead of printing a falling reading. */
export function feedGap(dealings, to, market = "UK") {
  const last = lastDisclosed(dealings, market);

  if (!last || !to || last >= to) return 0;

  return Math.max(0, weekdaysBetween(last, to).length - 1);
}

export const FEED_GAP_LIMIT = 3;

/** A reading the page may publish. */
export const readingMeetsBar = (r) => !!r && r.score != null;

/** The dated readings that may be published, ascending. */
export const publishable = (all) => (all ?? []).filter(readingMeetsBar);

/** The latest publishable reading, or null. */
export function latestReading(all) {
  const rows = publishable(all);

  return rows.length ? rows[rows.length - 1] : null;
}

/** When the index will first publish, given a series that has not yet: the
 *  trading day MIN_HISTORY readings after the first. Null once it has. */
export function publishFrom(all) {
  if (!all?.length) return null;
  if (all.some(readingMeetsBar)) return null;
  let date = all[0].date;

  for (let i = 0; i < MIN_HISTORY; i++) date = nextWeekday(date);

  return date;
}

// ---------------------------------------------------------------------------
// Comparisons and sentences
// ---------------------------------------------------------------------------

/** A comparison is only worth making across at least this many readings. */
const MIN_GAP = 5;

/** "Highest since <date>" or "lowest since <date>" for the reading at
 *  `index`, or null when the gap is under a week.
 *
 *  Direction follows the reading's side of the scale: at or above 50 the
 *  question is how long since it was this busy; below, how long since it was
 *  this quiet. `since` is null when nothing earlier in the published record
 *  was as extreme. */
export function sinceComparison(all, index) {
  const rows = all ?? [];
  const r = rows[index];

  if (!readingMeetsBar(r)) return null;
  const high = r.score >= 50;
  let j = index - 1;

  for (; j >= 0; j--) {
    const prev = rows[j];

    if (!readingMeetsBar(prev)) break;
    if (high ? prev.score >= r.score : prev.score <= r.score) break;
  }
  const gap = index - j;
  const matched = j >= 0 && readingMeetsBar(rows[j]);

  if (gap < MIN_GAP) return null;
  const first = rows.find(readingMeetsBar);

  return {
    direction: high ? "high" : "low",
    since: matched ? rows[j].date : null,
    began: first ? first.date : null,
    gap,
  };
}

/** The reading a week (five trading days) earlier, for a change figure. */
export function weekChange(all, index) {
  const rows = all ?? [];
  const r = rows[index];
  const prev = rows[index - MIN_GAP];

  if (!readingMeetsBar(r) || !readingMeetsBar(prev)) return null;

  return r.score - prev.score;
}

const NOUN = { UK: "directors", US: "insiders" };
const LABEL = { UK: "UK", US: "US" };

/** The reading in one sentence, for the hero, the meta description and the
 *  daily edition. Never states a number the reading does not hold. */
export function readingSentence(all, index, market = "UK") {
  const rows = all ?? [];
  const r = rows[index];

  if (!readingMeetsBar(r)) return null;
  const noun = NOUN[market] ?? "insiders";
  const high = r.score >= 50;
  const pct = high ? Math.round(r.score) : Math.round(100 - r.score);
  const cmp = sinceComparison(rows, index);
  let tail = "";

  if (cmp) {
    const word = cmp.direction === "high" ? "busiest" : "quietest";

    tail = cmp.since
      ? `, the ${word} since ${dayMonthLabel(cmp.since)}`
      : cmp.began
        ? `, the ${word} since readings began on ${dayMonthLabel(cmp.began)}`
        : "";
  }

  if (r.score === 50) {
    return `${LABEL[market] ?? market} ${noun} are buying at a rate in the middle of the record${tail}.`;
  }

  return `${LABEL[market] ?? market} ${noun} are buying at a rate ${high ? "higher" : "lower"} than on ${pct}% of days on record${tail}.`;
}

/** What the window held, in words: "118 purchases across 84 companies in the
 *  20 trading days to 16 September". */
export function windowSentence(r, market = "UK") {
  if (!r) return "";
  const noun = NOUN[market] ?? "insiders";
  const companies = r.breadth === 1 ? "company" : "companies";

  return `${r.count} ${r.count === 1 ? "purchase" : "purchases"} by ${LABEL[market] ?? market} ${noun} across ${r.breadth} ${companies} in the ${WINDOW_DAYS} trading days to ${dayMonthLabel(r.date)}.`;
}

/** Meta description for the undated page. */
export function indexLeadSentence(all, market = "UK") {
  const rows = all ?? [];
  const latest = latestReading(rows);

  if (!latest) {
    return `One daily number for how much ${LABEL[market] ?? market} insider buying there is, measured against its own record.`;
  }
  const i = rows.indexOf(latest);

  return `The ${LABEL[market] ?? market} Insider Index reads ${latest.score} on ${dateLabel(latest.date)}, ${latest.tier.phrase}. ${readingSentence(rows, i, market) ?? ""}`;
}

/** Meta description for a dated page. */
export function dateLeadSentence(all, index, market = "UK") {
  const r = (all ?? [])[index];

  if (!readingMeetsBar(r)) return null;

  return `The ${LABEL[market] ?? market} Insider Index read ${r.score} on ${dateLabel(r.date)}, ${r.tier.phrase}. ${readingSentence(all, index, market) ?? ""} ${windowSentence(r, market)}`;
}

// ---------------------------------------------------------------------------
// The published methodology, rendered on the page by both renderers
// ---------------------------------------------------------------------------

export const INDEX_METHODOLOGY = [
  "The index counts disclosed open-market purchases by insiders, the same test every board on this site applies. Share allotments, vesting, option exercises and placings are disclosed the same way but are not purchases at a market price, and they are left out. So are rows that cannot yet be priced.",
  `Each reading covers the ${WINDOW_DAYS} trading days ending on its date, Monday to Friday. Nothing is disclosed at the weekend, so a weekend has no reading. Bank holidays count as ordinary quiet days inside a window.`,
  "Three things are measured in each window: how many purchases were disclosed, how many different companies were bought, and how much was spent.",
  "Before the value is added up, every purchase is capped at £250,000. The median UK director purchase is £24,000 and one purchase in ten is above the cap; the largest on record is £11.4m, which uncapped would be a tenth of six months of buying on its own. The cap is an editorial line, published here so it can be checked.",
  `Each of the three is ranked against the same measure over every earlier window on record, up to a year of them: the share of earlier windows it beats, with ties counted half. A count rank of 82 means more purchases than in 82% of windows on record.`,
  "The index is the average of the three ranks, rounded. It runs from 0 to 100, and 50 is the middle of the record by construction. Count and breadth weigh the same as money, deliberately: a wide wave of small purchases is the pattern worth noticing, and a single large cheque is not.",
  `A reading is published once ${MIN_HISTORY} earlier readings exist to rank it against, eight weeks of them. Readings before that are held back rather than ranked against too little.`,
  "The index measures how much buying there is against how much there usually is. It is not net of selling: the feeds carry purchases only, so no selling is counted, and a low reading means directors are buying less, not that they are selling.",
  "Readings are recomputed from the full record each time, so a filing that arrives late can move a past reading by a point. The date on a reading is the disclosure date, the day the market was told.",
];
