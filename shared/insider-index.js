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
//   2. Calendar. London Stock Exchange sessions (shared/exchange-calendar.js):
//      weekends and England and Wales bank holidays are not days, so neither
//      has a reading and neither sits inside a window as a quiet day. A
//      disclosure dated on a closed day (none so far) counts on the next
//      session, when the market could act on it.
//
//   3. Window. Each reading covers the twenty sessions ending on its date,
//      inclusive. Four weeks: long enough that one busy Tuesday does not
//      swing it, short enough that a month of quiet shows.
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
//   5. The pool. A reading on day d is judged against the readings on record
//      up to and including d, the most recent LOOKBACK of them. Nothing after
//      d is in it, so a permalink computed today says what it said on the day,
//      backfills aside.
//
//   6. Combined measure. Inside the pool, each of the three components is
//      ranked (ties counted half) and every day's three ranks are averaged.
//      That average is the day's combined measure. It is a common scale for
//      the whole pool, which is what lets step 7 compare days.
//
//   7. Index. The share of the other days in the pool whose combined measure
//      is below day d's, ties counted half, as 0 to 100, rounded. So "higher
//      than on 82% of earlier trading days" is a direct count, and because it
//      is a rank of days, the five tiers each hold about a fifth of them.
//
//      The first build (2026-09-16, never published) stopped at step 6 and
//      called the average of the three component ranks the index. An average
//      of percentiles is not a percentile: it bunches towards 50, so "lower
//      than on 95% of days" overstated how rare a low reading was and the
//      outer tiers held fewer days than a fifth. The method as written here is
//      v1, the first to publish; METHOD_VERSION moves when any rule does.
//
//   8. Publication. A reading is published once MIN_HISTORY earlier readings
//      exist to rank against, and once its day is over: day D publishes at
//      PUBLISH_HOUR (London) on the calendar day after D. Checked against
//      D1 on 2026-09-17: 820 of 825 purchases since April reached the record
//      on their disclosure day, the last of them by 19:00 London; the other
//      five came one or two days late. Before the cutoff the latest reading is
//      the previous session's, and a permalink for the day is a not-found
//      that says when the reading lands.
//
//   9. Comparisons. "The busiest since 3 June" means no reading between
//      3 June and this one was as high; "since readings began" means none
//      was. A comparison is only made across a gap of a week or more.
//
// Readings are recomputed from the full record each time they are asked
// for, so a filing that arrives late (a backfill, a corrected RNS, the one
// purchase in two hundred that lands a day late) can move a past reading.
// That is the honest posture: the alternative, a stored figure that never
// changes, would be a reading of what we knew rather than of what happened.
// The page says readings may be revised. The investigation lists a data-side
// endpoint that would freeze readings if that trade-off is ever wanted.

import { buyValue, isEligibleBuy } from "./leaderboard.js";
import { TRACKING_SINCE_DATE } from "./tracking.js";
import {
  addDays,
  isDateSlug,
  isTradingDay,
  nextTradingDay,
  prevTradingDay,
  tradingDaysBetween,
} from "./exchange-calendar.js";

/** The method the readings are computed with. Printed on the page and on
 *  every dated reading; bump it when any rule in the header changes. */
export const METHOD_VERSION = 1;
export const METHOD_LABEL = `v${METHOD_VERSION}`;

/** Sessions in one reading's window. */
export const WINDOW_DAYS = 20;

/** Readings needed before a rank means anything. Eight weeks. */
export const MIN_HISTORY = 40;

/** How far back a reading is ranked. One trading year; the record is shorter
 *  than that today, so every reading ranks against everything before it. */
export const LOOKBACK = 250;

/** The hour, London time, on the calendar day after a session at which that
 *  session's reading publishes. See point 8 above for the arrival data. */
export const PUBLISH_HOUR = 7;

/** The per-purchase cap on the value component, in the market's own
 *  currency. See point 4 above for why the UK line is where it is. The US
 *  figure is the same percentile on that feed and is inert until the market
 *  is switched on. */
export const VALUE_CAP = { UK: 250_000, US: 1_000_000 };

/** Markets the index is published for. */
export const INDEX_MARKETS = ["UK"];

export const INDEX_PATH = "/insider-index";

/** The five reading tiers, lowest first. Each covers a fifth of the scale,
 *  and since the index is a rank of days, about a fifth of days land in each.
 *  `label` is the word the page prints; `phrase` completes "Insider buying
 *  is …". */
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

/** The calendar day of a disclosure. Some feeds carry a time. */
const dayOf = (iso) => String(iso ?? "").slice(0, 10);

/** A session the index has a reading for: a real date the exchange was open.
 *  "2026-02-31", a Saturday and the summer bank holiday are all false. */
export function isIndexDay(iso, market = "UK") {
  return isDateSlug(iso) && isTradingDay(iso, market);
}

/** The London date and hour of an instant. Disclosures are dated in UK time
 *  and a reading's day has to agree with the RNS clock, not the reader's. */
function londonClock(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
  };
}

/** Today's date in London, as ISO. */
export function todayLondon(now = new Date()) {
  return londonClock(now).date;
}

/** The latest session whose reading has published at `now`: the last session
 *  on or before yesterday once London passes PUBLISH_HOUR, the day before
 *  that until then. */
export function publishedThrough(now = new Date(), market = "UK") {
  const { date, hour } = londonClock(now);
  const last = addDays(date, hour >= PUBLISH_HOUR ? -1 : -2);

  return isTradingDay(last, market) ? last : prevTradingDay(last, market);
}

/** When the reading for session `date` publishes: `{ date, hour }` in London,
 *  the calendar day after it at PUBLISH_HOUR. */
export function publishesAt(date) {
  return { date: addDays(date, 1), hour: PUBLISH_HOUR };
}

/** The next session to publish after `now`, and when it lands. */
export function nextPublication(now = new Date(), market = "UK") {
  const date = nextTradingDay(publishedThrough(now, market), market);

  return date ? { session: date, ...publishesAt(date) } : null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "16 September 2026". */
export function dateLabel(iso) {
  if (!isDateSlug(iso)) return String(iso ?? "");

  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}

/** "16 Sep". */
export function shortDateLabel(iso) {
  if (!isDateSlug(iso)) return String(iso ?? "");

  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1].slice(0, 3)}`;
}

/** "16 September", the year dropped for a sentence about this year. */
export function dayMonthLabel(iso) {
  if (!isDateSlug(iso)) return String(iso ?? "");

  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
}

/** "7am on 18 September", for "the reading lands at …". */
export function publishLabel(date) {
  const at = publishesAt(date);

  return `${at.hour}am on ${dayMonthLabel(at.date)}`;
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

export const indexPath = (date) => (date ? `${INDEX_PATH}/${date}` : INDEX_PATH);

/** "2026-09-16" -> true only for a real LSE session. A weekend, a bank
 *  holiday or 31 February is a clean not-found rather than a page that
 *  silently shows another day. */
export const isIndexSlug = (slug) => isIndexDay(String(slug ?? ""), "UK");

/** "/insider-index/2026-09-16" -> "2026-09-16", or null. */
export function indexDateFromPath(path) {
  const m = String(path ?? "").match(/^\/insider-index\/([^/]+)$/);

  if (!m) return null;
  let slug;

  try {
    slug = decodeURIComponent(m[1]);
  } catch {
    return null;
  }

  return isIndexSlug(slug) ? slug : null;
}

// ---------------------------------------------------------------------------
// The computation
// ---------------------------------------------------------------------------

/** Is this row in the index's universe? The boards' own test, re-exported
 *  under the name this page uses so the two cannot drift. */
export function isIndexPurchase(d, market) {
  return isEligibleBuy(d, market) && isDateSlug(dayOf(d?.disclosed_date));
}

/** The session a disclosure counts on: its own day, or the next session when
 *  it was dated on a day the exchange was shut. */
function sessionOf(d, market) {
  const day = dayOf(d.disclosed_date);

  return isTradingDay(day, market) ? day : nextTradingDay(day, market);
}

/** Per session: purchases, capped value, and the issuers bought. */
export function dailyTotals(dealings, market) {
  const cap = VALUE_CAP[market] ?? Infinity;
  const days = new Map();

  for (const d of dealings ?? []) {
    if (!isIndexPurchase(d, market)) continue;
    const date = sessionOf(d, market);

    if (!date) continue;
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

/** percentileRank for every value of `pool` at once, in pool order.
 *  O(n log n) rather than n calls of O(n), since the index ranks a whole
 *  pool for every reading. */
function ranksWithin(pool) {
  const n = pool.length;

  if (n < 2) return pool.map(() => null);
  const sorted = [...pool].sort((a, b) => a - b);
  // First index >= x, and first index > x.
  const bound = (x, strict) => {
    let lo = 0;
    let hi = n;

    while (lo < hi) {
      const mid = (lo + hi) >> 1;

      if (strict ? sorted[mid] <= x : sorted[mid] < x) lo = mid + 1;
      else hi = mid;
    }

    return lo;
  };

  return pool.map((x) => {
    const below = bound(x, false);
    const equal = bound(x, true) - below - 1;

    return ((below + equal * 0.5) / (n - 1)) * 100;
  });
}

/** Every day's combined measure within one pool: the mean of its three
 *  component ranks, all ranked inside the same pool. Exported for the tests,
 *  which check the index against a direct count of these. */
export function combinedMeasures(counts, breadths, values) {
  const c = ranksWithin(counts);
  const b = ranksWithin(breadths);
  const v = ranksWithin(values);

  return c.map((x, i) => (x == null ? null : (x + b[i] + v[i]) / 3));
}

/** The first disclosure date the index can start counting from: the first
 *  session on or after the tracking floor, or the first disclosed session if
 *  that is later. */
function firstDay(days, market) {
  const dates = [...days.keys()].sort();
  const floor = isTradingDay(TRACKING_SINCE_DATE, market)
    ? TRACKING_SINCE_DATE
    : nextTradingDay(TRACKING_SINCE_DATE, market);

  if (dates.length === 0) return floor;

  return dates[0] > floor ? dates[0] : floor;
}

/** Every reading from the first full window to `to`, ascending.
 *
 *  `to` defaults to the last published session (publishedThrough), and is
 *  never later than it: a window that runs into a session still in progress,
 *  or into the future, would state a reading of days whose filings have not
 *  all arrived. A reading exists for every session in range whether or not
 *  the index is published for it; `score` is null until MIN_HISTORY earlier
 *  readings exist. */
export function series(dealings, market = "UK", opts = {}) {
  const days = dailyTotals(dealings, market);
  const through = publishedThrough(opts.now, market);
  const to = opts.to && opts.to < through ? opts.to : through;
  const from = opts.from ?? firstDay(days, market);
  const calendar = from && to ? tradingDaysBetween(from, to, market) : [];
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
    const history = n - 1 - start; // readings before this one, in the pool
    let countPct = null;
    let breadthPct = null;
    let valuePct = null;
    let combined = null;
    let pct = null;
    let score = null;

    if (history >= MIN_HISTORY) {
      const poolCounts = counts.slice(start);
      const poolBreadths = breadths.slice(start);
      const poolValues = values.slice(start);
      const measures = combinedMeasures(poolCounts, poolBreadths, poolValues);

      countPct = percentileRank(count, poolCounts);
      breadthPct = percentileRank(breadth, poolBreadths);
      valuePct = percentileRank(value, poolValues);
      combined = measures[measures.length - 1];
      pct = percentileRank(combined, measures);
      score = Math.round(pct);
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
      /** Mean of the three component ranks, 0 to 100. Not the index. */
      combined,
      /** The index before rounding: the share of other days in the pool
       *  whose combined measure is lower, ties half. */
      pct,
      score,
      tier: tierFor(score),
      /** Readings before this one that it was ranked against. */
      history,
    });
  }

  return out;
}

/** The reading for one session, or null when the date has none: not a
 *  session, before the first full window, or not yet published at
 *  `opts.now`. */
export function readingForDate(dealings, date, market = "UK", opts = {}) {
  if (!isIndexDay(date, market)) return null;
  if (date > publishedThrough(opts.now, market)) return null;
  const all = series(dealings, market, { ...opts, to: date });

  return all.find((r) => r.date === date) ?? null;
}

/** Everything a page or an edition needs to print one day's reading, in one
 *  call, or null when the date has no published reading. This is the shape
 *  the daily edition consumes; keep it additive.
 *
 *  Null for a session still in progress: the reading for day D exists from
 *  PUBLISH_HOUR on the day after. An edition for today should say when it
 *  lands (`publishesAt`) rather than print yesterday's as today's. */
export function readingSummary(dealings, date, market = "UK", opts = {}) {
  if (!isIndexDay(date, market)) return null;
  if (date > publishedThrough(opts.now, market)) return null;
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
    method: METHOD_LABEL,
  };
}

/** The most recent disclosure date in the rows, or null. */
export function lastDisclosed(dealings, market = "UK") {
  let last = null;

  for (const d of dealings ?? []) {
    if (!isIndexPurchase(d, market)) continue;
    const day = dayOf(d.disclosed_date);

    if (!last || day > last) last = day;
  }

  return last;
}

/** Sessions between the last disclosure on record and `to`. A gap of
 *  FEED_GAP_LIMIT or more is a feed that has stopped rather than a market
 *  that has, and the page says so instead of printing a falling reading. */
export function feedGap(dealings, to, market = "UK") {
  const last = lastDisclosed(dealings, market);

  if (!last || !to || last >= to) return 0;

  return Math.max(0, tradingDaysBetween(last, to, market).length - 1);
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
 *  session MIN_HISTORY readings after the first. Null once it has. */
export function publishFrom(all, market = "UK") {
  if (!all?.length) return null;
  if (all.some(readingMeetsBar)) return null;
  let date = all[0].date;

  for (let i = 0; i < MIN_HISTORY; i++) date = nextTradingDay(date, market);

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

/** The reading a week (five sessions) earlier, for a change figure. */
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
 *  daily edition. Never states a number the reading does not hold: the
 *  percentage is the index itself, which is the share of earlier sessions in
 *  its pool with less buying on the combined measure. */
export function readingSentence(all, index, market = "UK") {
  const rows = all ?? [];
  const r = rows[index];

  if (!readingMeetsBar(r)) return null;
  const noun = NOUN[market] ?? "insiders";
  const high = r.score >= 50;
  const pct = high ? Math.round(r.score) : Math.round(100 - r.score);
  const cmp = sinceComparison(rows, index);
  // The pool is the whole record until it is longer than LOOKBACK.
  const span =
    r.history >= LOOKBACK
      ? "earlier trading days in the past year"
      : "earlier trading days on record";
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
    return `${LABEL[market] ?? market} ${noun} are buying more than on half of ${span} and less than on the other half${tail}.`;
  }

  return `${LABEL[market] ?? market} ${noun} are buying ${high ? "more" : "less"} than on ${pct}% of ${span}${tail}.`;
}

/** What the window held, in words: "118 purchases by UK directors across 84
 *  companies in the 20 sessions to 16 September". */
export function windowSentence(r, market = "UK") {
  if (!r) return "";
  const noun = NOUN[market] ?? "insiders";
  const companies = r.breadth === 1 ? "company" : "companies";

  return `${r.count} ${r.count === 1 ? "purchase" : "purchases"} by ${LABEL[market] ?? market} ${noun} across ${r.breadth} ${companies} in the ${WINDOW_DAYS} sessions to ${dayMonthLabel(r.date)}.`;
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
  `Each reading covers the ${WINDOW_DAYS} London Stock Exchange sessions ending on its date. Weekends and bank holidays are not sessions: they have no reading, and they are not counted as quiet days inside a window.`,
  "Three things are measured in each window: how many purchases were disclosed, how many different companies were bought, and how much was spent.",
  "Before the value is added up, every purchase is capped at £250,000. The median UK director purchase is £24,000 and one purchase in ten is above the cap; the largest on record is £11.4m, which uncapped would be a tenth of six months of buying on its own. The cap is an editorial line, published here so it can be checked.",
  `A reading is judged against every reading on record up to its own day, up to a year of them. Within that record each of the three measures is ranked, with ties counted half, and each day's three ranks are averaged into one combined measure.`,
  "The index is the share of those earlier days whose combined measure was lower, from 0 to 100. A reading of 82 means more buying than on 82% of earlier trading days on record, counted directly, so about a fifth of days fall in each of the five tiers. Count and breadth weigh the same as money, deliberately: a wide wave of small purchases is the pattern worth noticing, and a single large cheque is not.",
  `A reading is published once ${MIN_HISTORY} earlier readings exist to rank it against, eight weeks of them. Readings before that are held back rather than ranked against too little.`,
  `A day's reading is published at ${PUBLISH_HOUR}am London time the next morning, once that day's filings are in. Until then the latest reading is the previous session's. The date on a reading is the disclosure date, the day the market was told.`,
  "The index measures how much buying there is against how much there usually is. It is not net of selling: the feeds carry purchases only, so no selling is counted, and a low reading means directors are buying less, not that they are selling.",
  `Readings may be revised. They are recomputed from the full record each time, so a filing that reaches the record late, or a backfill of filings that were missed, can move a past reading. The method is ${METHOD_LABEL}; if it changes, the version changes with it.`,
];
