// Daily editions: one dated, permanent page per trading day.
//
// Plain ESM at the repo root, same reason as shared/weeks.js next to it: the
// React page (src/pages/daily.tsx), the crawler pre-renders (functions/daily/*,
// functions/us/daily/*), the /today redirects and the sitemap all need the
// same calendar, the same URL shape and the same sentences, and none of them
// can import another's module graph.
//
// ---------------------------------------------------------------------------
// Why this family exists
// ---------------------------------------------------------------------------
//
// "Today" on the market home is a scrolling list that is gone tomorrow. The
// data behind it is not: every disclosure has a disclosed_date, the daily
// summary is stored per date, and the ratings are permanent. A day is the
// natural unit of the product (the push notification, the close-of-day recap)
// and it had no URL. /daily/2026-09-15 is that URL.
//
// ---------------------------------------------------------------------------
// Four decisions worth not re-litigating
// ---------------------------------------------------------------------------
//
// 1. THE EDITION IS BUILT FROM THE DEALINGS FEED, NOT FROM THE SUMMARY TABLE.
//    /api/daily-summary has no list endpoint and no archive walk — it answers
//    one date at a time and 404s for a day it has nothing for. Probed on
//    2026-09-16: UK summaries exist for every trading day from 2026-05-11
//    (90 rows), US from 2026-06-01 with a run of missing Fridays through the
//    summer. The dealings feed goes back to March. So the archive index and
//    the sitemap enumerate DAYS WITH FILINGS from the feed (one paged window,
//    edge-cached like every board), and the summary is a lead that a day may
//    or may not have. A day without one still gets its page; it says so.
//    Both read the same population with the same day key: every row the API
//    holds (US `view=all`, not the curated $50k+ feed), bucketed by the day
//    it was DISCLOSED. The archive once post-filtered on trade date and so
//    dropped late disclosures of old trades that the dated page still showed
//    (BMA on 16 Sep 2026: traded in March, filed in September).
//
// 2. THE MARKET COMES FROM THE PATH, NOT THE HOST. /daily/* is UK and
//    /us/daily/* is US on every domain, exactly as /dealings/:id and
//    /us/dealings/:id are. A date is not an id, but the same argument applies:
//    /daily/2026-09-15 meaning one thing on ddbx.uk and another on ddbx.us is
//    not a contract worth having. The pre-render noindexes the off-host copy.
//    (The weekly family chose host-based routing; see the investigation doc
//    for the trade-off.)
//
// 3. THE CALENDAR IS STATIC, AND THERE IS ONE OF IT. src/lib/bank-holidays.ts
//    fetches gov.uk at runtime, which a Pages Function and a sitemap cannot
//    do per request without a cache we do not have. The closure maps live in
//    shared/exchange-calendar.js, which the Insider Index reads too; the
//    yearly chore of adding a year is done there.
//
// 4. /today REDIRECTS. An undated page that changes at midnight is a canonical
//    that rots daily (the weekly module's argument). /today and /us/today 302
//    to the latest trading day's dated URL and are never indexed.

import { fetchDealingsWindow } from "./dealings-feed.js";
import {
  addDays,
  closureReason,
  isDateSlug,
  isTradingDay,
  nextTradingDay,
  prevTradingDay,
  UK_CLOSURES,
  US_CLOSURES,
} from "./exchange-calendar.js";
import { buyValue, isInsiderFiler } from "./leaderboard.js";
import { filingFamily } from "./filing-family.js";
import { TRACKING_SINCE_DATE } from "./tracking.js";

// The calendar lives in shared/exchange-calendar.js, shared with the Insider
// Index. Re-exported so the page and the pre-render keep one import site.
export {
  addDays,
  closureReason,
  isDateSlug,
  isTradingDay,
  nextTradingDay,
  prevTradingDay,
};

/* ─── Markets ────────────────────────────────────────────────────────────── */

export const DAILY_MARKETS = {
  UK: {
    id: "UK",
    marketId: "uk",
    label: "UK",
    noun: "directors",
    currency: "GBP",
    timeZone: "Europe/London",
    host: "ddbx.uk",
    exchange: "the London Stock Exchange",
    /** When the close-of-day summary is normally written, in local time. */
    summaryTime: "around 5.30pm London time",
    closures: UK_CLOSURES,
    /** First day the archive can hold. UK filings are stored from March. */
    since: TRACKING_SINCE_DATE,
    prefix: "",
  },
  US: {
    id: "US",
    marketId: "us",
    label: "US",
    noun: "insiders",
    currency: "USD",
    timeZone: "America/New_York",
    host: "ddbx.us",
    exchange: "the US exchanges",
    summaryTime: "after the New York close",
    closures: US_CLOSURES,
    /** The Form 4 feed came online in May 2026 (shared/tracking.js). */
    since: "2026-05-01",
    prefix: "/us",
  },
};

/** Accepts "UK" / "US" in either case; anything else is UK. */
export function dailyMarket(market) {
  return String(market ?? "").toUpperCase() === "US"
    ? DAILY_MARKETS.US
    : DAILY_MARKETS.UK;
}

/* ─── Dates ──────────────────────────────────────────────────────────────── */

const dow = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay();

/** Today's date in the market's own time zone. Intl is available in the
 *  browser and in Workers, and "en-CA" formats as ISO without locale
 *  punctuation (the trick market-utils.ts already relies on). */
export function todayInMarket(market, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: dailyMarket(market).timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** The day /today resolves to: today if the market is open today, else the
 *  last day it was. On a trading morning that is today's edition, in
 *  progress, which is the honest answer — see `dayStatus`. */
export function latestEditionDate(market, now = new Date()) {
  const today = todayInMarket(market, now);

  return isTradingDay(today, market) ? today : prevTradingDay(today, market);
}

/** What kind of day a URL names, decided before any fetch.
 *
 *    "before"  — earlier than the archive (we were not recording)
 *    "closed"  — weekend or exchange holiday
 *    "future"  — after today in the market's zone
 *    "today"   — a trading day still in progress
 *    "past"    — a completed trading day
 *
 *  Only "past" and "today" have an edition. The rest render a signpost to the
 *  nearest one and are never indexed. */
export function dayStatus(iso, market, now = new Date()) {
  const m = dailyMarket(market);

  if (iso < m.since) return "before";
  if (!isTradingDay(iso, market)) return "closed";
  const today = todayInMarket(market, now);

  if (iso > today) return "future";

  return iso === today ? "today" : "past";
}

/** The edition a reader should be sent to from a day that has none: the
 *  trading day before a closure, the latest for a future date, the first
 *  for one before the record. */
export function nearestEditionDate(iso, market, now = new Date()) {
  const status = dayStatus(iso, market, now);

  if (status === "past" || status === "today") return iso;
  if (status === "future") return latestEditionDate(market, now);
  if (status === "before") {
    const m = dailyMarket(market);

    return isTradingDay(m.since, market)
      ? m.since
      : nextTradingDay(m.since, market);
  }
  const prev = prevTradingDay(iso, market);
  const latest = latestEditionDate(market, now);

  return prev && latest && prev > latest ? latest : prev;
}

/* ─── URLs ───────────────────────────────────────────────────────────────── */

export const dailyIndexPath = (market) => `${dailyMarket(market).prefix}/daily`;

export const dailyPath = (market, iso) =>
  `${dailyMarket(market).prefix}/daily/${iso}`;

export const todayPath = (market) => `${dailyMarket(market).prefix}/today`;

/** "/daily" -> { market: "UK", date: null }; "/us/daily/2026-09-15" ->
 *  { market: "US", date: "2026-09-15" }; anything else, or a date that is not
 *  a real date, -> null. */
export function dailyFromPath(path) {
  const m = String(path ?? "").match(/^(\/us)?\/daily(?:\/([^/]+))?$/);

  if (!m) return null;
  const market = m[1] ? "US" : "UK";

  if (m[2] == null) return { market, date: null };
  const slug = decodeURIComponent(m[2]);

  return isDateSlug(slug) ? { market, date: slug } : null;
}

export const isTodayPath = (path) => path === "/today" || path === "/us/today";

/* ─── Labels ─────────────────────────────────────────────────────────────── */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

const dayOf = (iso) => Number(String(iso).slice(8, 10));
const monthOf = (iso) => MONTHS[Number(String(iso).slice(5, 7)) - 1] ?? "";
const yearOf = (iso) => String(iso).slice(0, 4);

/** "Tuesday 15 September 2026". */
export const dayLabel = (iso) =>
  `${WEEKDAYS[dow(iso)]} ${dayOf(iso)} ${monthOf(iso)} ${yearOf(iso)}`;

/** "15 September 2026", for a crumb or a title where the weekday is noise. */
export const dateLabel = (iso) =>
  `${dayOf(iso)} ${monthOf(iso)} ${yearOf(iso)}`;

/** "Tue 15 Sept", for a prev/next control. */
export const dayShort = (iso) =>
  `${WEEKDAYS[dow(iso)].slice(0, 3)} ${dayOf(iso)} ${monthOf(iso).slice(0, 3)}`;

/** "September 2026", for the archive's month headings. */
export const monthHeading = (iso) => `${monthOf(iso)} ${yearOf(iso)}`;

/* ─── Money ──────────────────────────────────────────────────────────────── */

const SYMBOL = { GBP: "£", USD: "$" };

/** Same rounding as shared/filings.js `money`, with a bn step for a day total
 *  that could plausibly reach it on the US side. */
export function dayMoney(value, currency) {
  const sym = SYMBOL[currency] ?? "";
  const v = Math.abs(Number(value) || 0);

  if (v >= 1_000_000_000) return `${sym}${(v / 1_000_000_000).toFixed(1)}bn`;
  if (v >= 1_000_000) {
    const m = v / 1_000_000;

    return `${sym}${m >= 100 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}m`;
  }
  if (v >= 1_000) return `${sym}${Math.round(v / 1_000)}k`;

  return `${sym}${Math.round(v).toLocaleString("en-GB")}`;
}

/* ─── Verdicts ───────────────────────────────────────────────────────────── */

const RATED = new Set(["significant", "noteworthy", "minor"]);

/** True for the rows the app counts as signal: rated significant, noteworthy
 *  or minor. "routine" is a written verdict too, but it is the verdict that
 *  the purchase is not informative, so it does not count. */
export const isRated = (d) => RATED.has(d?.analysis?.rating);

/** The US analysis floor. Triage reads the curated population
 *  (INTERESTING_MIN_VALUE_USD in ddbx-data worker/db/us-queries.ts, $50k and
 *  up) plus a handful of strategy matches below it, so an unscreened US row
 *  under this line is not waiting for anything: it will not be screened.
 *  The UK has no floor; every row is triaged. */
export const US_SCREEN_FLOOR = 50_000;

/** True for an unscreened row that never will be, as opposed to one the
 *  pipeline has not reached yet. */
const belowFloor = (d, market) =>
  dailyMarket(market).id === "US" &&
  !d?.triage?.verdict &&
  !d?.analysis?.rating &&
  buyValue(d) < US_SCREEN_FLOOR;

/** One line per filing, from the rating alone.
 *
 *  Short on purpose. The rating's meaning is published in full on
 *  /how-it-works (RATING_SCALE in src/lib/methodology.ts); this is the
 *  one-clause version a row can carry. The unrated cases say WHY there is no
 *  rating rather than leaving the slot blank — "not analysed", "below the
 *  floor" and "not yet analysed" are different facts and a reader can act on
 *  the difference. */
export function verdictLine(d, market = "UK") {
  const rating = d?.analysis?.rating;

  if (rating === "significant") return "Significant. Cleared all six checks.";
  if (rating === "noteworthy")
    return "Noteworthy. Most of the picture holds up.";
  if (rating === "minor") return "Minor. A real purchase, but a small signal.";
  if (rating === "routine") return "Routine. Disclosed, not informative.";
  const triage = d?.triage?.verdict;

  if (triage === "skip") return "Not analysed. Screened out at triage.";
  if (triage === "maybe" || triage === "promising")
    return "Cleared triage. Analysis pending.";
  if (belowFloor(d, market))
    return "Not screened. Below the $50k analysis floor.";

  return "Not yet screened.";
}

/** The word alone, for a fact cell. */
export function verdictWord(d, market = "UK") {
  const rating = d?.analysis?.rating;

  if (rating) return rating.charAt(0).toUpperCase() + rating.slice(1);
  if (d?.triage?.verdict === "skip") return "Skipped";

  return belowFloor(d, market) ? "Unscreened" : "Pending";
}

/** A US Form 4 filed by someone whose only relationship to the company is a
 *  10% stake: usually an investment vehicle, not someone running the business.
 *  The edition lists them (it reads the whole record) but marks them, and the
 *  biggest-buy slot is for insiders only, the same test the boards apply
 *  (`isInsiderFiler`, shared/leaderboard.js). Always false for the UK. */
export const isHolderOnly = (d, market) =>
  !isInsiderFiler(d, dailyMarket(market).id);

/* ─── The model ──────────────────────────────────────────────────────────── */

/** Who filed. UK rows carry `director`, US rows `reporter`; the filing
 *  families already know the difference. */
export function insiderOf(d, market) {
  return filingFamily(market).insider(d);
}

/** Where the filing's own page is. */
export function filingHref(d, market) {
  return d?.id ? filingFamily(market).path(d.id) : null;
}

/** The day a row belongs to: its disclosed_date as a calendar day. Some feeds
 *  carry a time on it (shared/dealings-feed.js), so the edition, the archive
 *  and the sitemap all key on the first ten characters through this one
 *  function rather than comparing the raw field three different ways. */
export const disclosedDay = (d) => String(d?.disclosed_date ?? "").slice(0, 10);

/** Everything an edition states, computed once from the day's rows.
 *
 *  `filings` is the day's rows largest first — a day is read by its biggest
 *  cheque. `biggest` is the largest filed by an insider: a US 10%-holder's
 *  purchase stays on the list, marked, but does not take the slot
 *  (`isHolderOnly`). `holders` counts those rows so the sentences can say
 *  they are in the totals. `clusters` groups the rows the
 *  pipeline annotated as part of a cluster by issuer, carrying the row's OWN
 *  annotation (`cluster.count` is a rolling per-row count, not a cluster
 *  identity — see the header of shared/boards.js — so the page states what the
 *  row states and never sums it). */
export function editionModel(dealings, market, date) {
  const m = dailyMarket(market);
  const rows = (dealings ?? []).filter((d) => disclosedDay(d) === date);
  const filings = [...rows].sort((a, b) => buyValue(b) - buyValue(a));
  const value = filings.reduce((sum, d) => sum + buyValue(d), 0);
  const rated = filings.filter(isRated).length;
  const companies = new Set(filings.map((d) => d.ticker ?? d.company)).size;
  const holders = filings.filter((d) => isHolderOnly(d, m.id)).length;

  const byIssuer = new Map();

  for (const d of filings) {
    if (!d?.cluster) continue;
    const key = d.ticker ?? d.company;

    if (!key) continue;
    let group = byIssuer.get(key);

    if (!group) {
      group = {
        ticker: d.ticker ?? "",
        company: d.company ?? d.ticker ?? "",
        tier: d.cluster.tier ?? null,
        count: Number(d.cluster.count ?? 0),
        windowDays: Number(d.cluster.window_days ?? 0),
        rows: [],
      };
      byIssuer.set(key, group);
    }
    group.rows.push(d);
    group.count = Math.max(group.count, Number(d.cluster.count ?? 0));
    if (d.cluster.tier === "strong") group.tier = "strong";
  }

  return {
    date,
    market: m.id,
    currency: m.currency,
    filings,
    count: filings.length,
    value,
    rated,
    companies,
    holders,
    biggest: filings.find((d) => !isHolderOnly(d, m.id)) ?? null,
    clusters: [...byIssuer.values()].sort((a, b) => b.count - a.count),
  };
}

/** Filings a day needs, alongside at least one rated row, to be indexable
 *  without a close-of-day summary. */
export const INDEX_MIN_FILINGS = 3;

/** Whether a day earns an indexable page.
 *
 *  A day is a document when it has the close-of-day summary (a written read
 *  of the day), or when it has enough filings to be read on its own: at least
 *  INDEX_MIN_FILINGS, one of them rated. One unrated filing is a row on the
 *  archive, not a page for a search engine. Thinner days still render and
 *  are still linked from the archive and their neighbours; they are noindexed
 *  and left out of the sitemap, and cross the bar on their own when the
 *  summary lands or a rated filing does.
 *
 *  Takes an EditionModel or an ArchiveDay (both carry `count` and `rated`). */
export function editionMeetsBar(day, hasSummary = false) {
  if (hasSummary) return true;

  return (day?.count ?? 0) >= INDEX_MIN_FILINGS && (day?.rated ?? 0) >= 1;
}

/** The index narrative on a summary, as plain text.
 *
 *  The model occasionally writes an anchor into it ("pulled lower by <a
 *  href='#'>weak UK payroll data</a>", 2026-09-15). Rendered escaped that is
 *  a tag on the page; rendered raw it is markup we did not write. Neither is
 *  acceptable, so the tags go and the words stay. */
export function overviewNarrative(summary) {
  const text = summary?.market_overview?.narrative;

  return text ? String(text).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "";
}

/** The summary body with the filing ids taken out.
 *
 *  The US read cites its filings inline by id ("(IDs
 *  f4-0001628280-26-062057-1-0 and f4-...-1-1)", 2026-09-15). An accession
 *  number in a paragraph is for the pipeline, not a reader, and the cited
 *  filings are listed and linked under the read (`citedFilings`), so a
 *  parenthesis made only of ids goes, and a bare id left in a sentence
 *  goes with it. */
const FILING_ID = String.raw`(?:f4-[\w-]+|d-[0-9a-f]{16})`;
const ID_PAREN = new RegExp(
  String.raw`\s*\((?:IDs?:?\s*)?${FILING_ID}(?:(?:,\s*|\s+and\s+|,\s*and\s+)${FILING_ID})*\)`,
  "g",
);
const BARE_ID = new RegExp(String.raw`\s*\b${FILING_ID}\b`, "g");

export function summaryBody(summary) {
  return String(summary?.body ?? "")
    .replace(/\r\n/g, "\n")
    .replace(ID_PAREN, "")
    .replace(BARE_ID, "");
}

/** The filings a summary cites, as rows an edition can link.
 *
 *  `cited` is hydrated per filing LEG (a US tranche purchase is cited as
 *  -1-0 and -1-1), while the edition's rows are collapsed to one per trade.
 *  So each cited leg is matched to the edition row it belongs to (by id, then
 *  by filing, reporter and trade date) and each row is listed once, in the
 *  order the summary cites them, carrying the collapsed total. A cited row
 *  that is not on the day's list (a summary can name an earlier purchase) is
 *  kept as the cited row itself, so every citation still links somewhere.
 *
 *  Returns `{ rows, ids }`: `ids` is the set of edition row ids that were
 *  cited, for marking them on the full list. */
export function citedFilings(model, cited) {
  const filings = model?.filings ?? [];
  const byId = new Map(filings.map((d) => [d.id, d]));
  const groupKey = (d) =>
    d?.filing_id
      ? `${d.filing_id}|${d.reporter?.cik ?? ""}|${d.trade_date ?? ""}`
      : null;
  const byGroup = new Map();

  for (const d of filings) {
    const k = groupKey(d);

    if (k && !byGroup.has(k)) byGroup.set(k, d);
  }

  const rows = [];
  const seen = new Set();

  for (const c of cited ?? []) {
    const k = groupKey(c);
    const row = byId.get(c?.id) ?? (k ? byGroup.get(k) : null) ?? c;
    const key = row?.id ?? k;

    if (!row || !key || seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }

  return {
    rows,
    ids: new Set(rows.filter((r) => byId.has(r.id)).map((r) => r.id)),
  };
}

/** The buyers on a cluster group, each named once. Two tranches of one
 *  purchase are two rows with one name, and "DeSantis Damon, DeSantis
 *  Damon" reads as a defect. Keeps the first row for each name so the link
 *  goes to that filing. */
export function clusterBuyers(group, market) {
  const seen = new Map();

  for (const d of group?.rows ?? []) {
    const name = insiderOf(d, market).name;

    if (name && !seen.has(name)) seen.set(name, d);
  }

  return [...seen.entries()].map(([name, row]) => ({ name, row }));
}

/* ─── The sentences ──────────────────────────────────────────────────────── */

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** The edition's opening sentence, and its meta description. Deterministic,
 *  from the day's own numbers — the summary's headline is rendered a few lines
 *  down and restating it here would be the same voice twice. */
export function editionLeadSentence(model, status = "past") {
  const m = dailyMarket(model.market);
  const when = dayLabel(model.date);

  if (model.count === 0) {
    return status === "today"
      ? `Nothing disclosed by ${m.label} ${m.noun} so far today, ${when}. The feed is read every fifteen minutes through the session.`
      : `No open-market purchases were disclosed by ${m.label} ${m.noun} on ${when}.`;
  }

  const sofar = status === "today" ? " so far" : "";
  const ratedBit =
    model.rated > 0
      ? `, ${plural(model.rated, "of them rated", "of them rated")}`
      : ", none of them rated";

  // US totals include 10%-holder filings (the edition reads the whole record),
  // so the sentence that states the totals says so.
  const holdersBit =
    (model.holders ?? 0) > 0
      ? ` ${model.holders === model.count ? (model.count === 1 ? "It was" : "All were") : `${model.holders} ${model.holders === 1 ? "was" : "were"}`} filed by ${model.holders === 1 ? "a 10% holder" : "10% holders"} with no board seat or office.`
      : "";

  return `${plural(model.count, "open-market purchase", "open-market purchases")} disclosed by ${m.label} ${m.noun} on ${when}${sofar}: ${dayMoney(model.value, model.currency)} across ${plural(model.companies, "company", "companies")}${ratedBit}.${holdersBit}`;
}

/** The archive index's opening sentence. */
export function archiveLeadSentence(days, market) {
  const m = dailyMarket(market);

  if (!days?.length) return `${m.label} insider buying, one page per trading day.`;
  const filings = days.reduce((n, d) => n + d.count, 0);
  const first = days[days.length - 1].date;
  const last = days[0].date;
  const span =
    monthOf(first) === monthOf(last) && yearOf(first) === yearOf(last)
      ? `${monthOf(last)} ${yearOf(last)}`
      : yearOf(first) === yearOf(last)
        ? `${monthOf(first)} to ${monthOf(last)} ${yearOf(last)}`
        : `${monthOf(first)} ${yearOf(first)} to ${monthOf(last)} ${yearOf(last)}`;

  return `${plural(days.length, "trading day", "trading days")} of ${m.label} insider buying, ${filings.toLocaleString("en-GB")} disclosed purchases in total, covering ${span}.`;
}

/** Why a day has no edition, for the signpost page. */
export function closedSentence(iso, market, status) {
  const m = dailyMarket(market);

  if (status === "closed") {
    const reason = closureReason(iso, market);

    return reason?.kind === "holiday"
      ? `${m.exchange.charAt(0).toUpperCase() + m.exchange.slice(1)} was closed on ${dayLabel(iso)} for ${reason.name}, so there is no edition for that day.`
      : `${dayLabel(iso)} was a weekend. ${m.exchange.charAt(0).toUpperCase() + m.exchange.slice(1)} was closed and nothing was disclosed.`;
  }
  if (status === "future")
    return `${dayLabel(iso)} has not happened yet. The edition is written on the day.`;
  if (status === "before")
    return `ddbx started recording ${m.label} disclosures in ${monthOf(m.since)} ${yearOf(m.since)}, so there is no edition for ${dayLabel(iso)}.`;

  return "";
}

/* ─── The archive ────────────────────────────────────────────────────────── */

/** Roll a window of rows up by disclosed day, newest first. Only trading days
 *  are listed: a filing time-stamped to a Saturday is real but the page for a
 *  Saturday says the market was closed, and an archive row that leads to that
 *  page is a broken link with extra steps. Those rows are counted in
 *  `stranded` so the caller can say so. */
export function groupByDay(dealings, market) {
  const m = dailyMarket(market);
  const byDay = new Map();
  let stranded = 0;

  for (const d of dealings ?? []) {
    const date = disclosedDay(d);

    if (!isDateSlug(date) || date < m.since) continue;
    if (!isTradingDay(date, market)) {
      stranded += 1;
      continue;
    }
    let row = byDay.get(date);

    if (!row) {
      row = { date, count: 0, value: 0, rated: 0, companies: new Set() };
      byDay.set(date, row);
    }
    row.count += 1;
    row.value += buyValue(d);
    if (isRated(d)) row.rated += 1;
    row.companies.add(d.ticker ?? d.company);
  }

  const days = [...byDay.values()]
    .map((r) => ({ ...r, companies: r.companies.size }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return { days, stranded };
}

/* ─── Fetching ───────────────────────────────────────────────────────────── */

const FEED = { UK: "dealings", US: "us-dealings" };

/** The population an edition reads, as query parameters. The US route serves
 *  the curated $50k-and-up set when no view is named; an edition is the day's
 *  whole record, so it names `all`. The UK has no server view. Both fetches
 *  below take it from here so the edition and the archive cannot read two
 *  different populations again. */
export const EDITION_VIEW = { UK: null, US: "all" };

/** One day's rows plus its summary, in one call shape for both renderers.
 *
 *  The day window is `since=date&before=date+1`: both are disclosed_date
 *  bounds on the API (`before` exclusive), so this is exactly the rows
 *  announced that day, lite (the analysis shrinks to its rating, which is all
 *  the verdict line needs). The summary is fetched separately because it is a
 *  different table with its own 404 semantics: a 404 there is "no lead
 *  written", not a failure, and the page has to tell those apart.
 *
 *  `status.dealings` is "ok" or "failed"; `status.summary` is "ok", "none" or
 *  "failed". A failed dealings fetch is a failed page. */
export async function fetchEdition({
  apiBase,
  market,
  date,
  fetchImpl = fetch,
  cf = null,
}) {
  const m = dailyMarket(market);
  const feed = FEED[m.id];
  const init = {
    headers: { accept: "application/json" },
    ...(cf ? { cf } : {}),
  };
  const qs = new URLSearchParams({
    since: date,
    before: addDays(date, 1),
    fields: "lite",
    limit: "1000",
  });

  if (EDITION_VIEW[m.id]) qs.set("view", EDITION_VIEW[m.id]);

  const [dealingsRes, summaryRes] = await Promise.all([
    fetchImpl(`${apiBase}/${feed}?${qs}`, init).catch(() => null),
    fetchImpl(
      `${apiBase}/daily-summary?market=${m.id}&date=${date}`,
      init,
    ).catch(() => null),
  ]);

  let dealings = [];
  let dealingsStatus = "failed";
  let httpStatus = 0;

  if (dealingsRes) {
    httpStatus = dealingsRes.status;
    if (dealingsRes.ok) {
      const body = await dealingsRes.json().catch(() => null);

      if (body && Array.isArray(body.dealings)) {
        dealings = body.dealings;
        dealingsStatus = "ok";
      }
    }
  }

  let summary = null;
  let cited = [];
  let summaryStatus = "failed";

  if (summaryRes) {
    if (summaryRes.status === 404) summaryStatus = "none";
    else if (summaryRes.ok) {
      const body = await summaryRes.json().catch(() => null);

      if (body?.summary) {
        summary = body.summary;
        cited = Array.isArray(body.cited) ? body.cited : [];
        summaryStatus = "ok";
      }
    }
  }

  return {
    model: editionModel(dealings, m.id, date),
    summary,
    cited,
    status: { dealings: dealingsStatus, summary: summaryStatus, http: httpStatus },
  };
}

/** Every day with filings since the market's archive floor. One paged walk
 *  of the feed, the same one the boards make, but over the edition's
 *  population (`EDITION_VIEW`) and windowed on the DISCLOSED day, so a day on
 *  the archive counts exactly the rows its dated page lists.
 *
 *  `complete` is false when the page budget ran out, in which case the OLDEST
 *  days are the ones missing. `failed` is true when nothing came back and the
 *  walk did not finish: that is an outage, not an empty archive, and the
 *  callers must not say "no editions yet" over it. */
export async function fetchArchive({
  apiBase,
  market,
  fetchImpl = fetch,
  cf = null,
}) {
  const m = dailyMarket(market);
  const { dealings, complete } = await fetchDealingsWindow({
    apiBase,
    market: m.id,
    since: m.since,
    view: EDITION_VIEW[m.id],
    windowOn: "disclosed",
    fetchImpl,
    cf,
  });
  const { days, stranded } = groupByDay(dealings, m.id);

  return { days, stranded, complete, failed: !complete && dealings.length === 0 };
}

/** Whether a close-of-day summary exists for a date: true, false, or null
 *  when the answer could not be had (a 5xx or a thrown fetch). */
export async function summaryExists({
  apiBase,
  market,
  date,
  fetchImpl = fetch,
  cf = null,
}) {
  const m = dailyMarket(market);

  try {
    const res = await fetchImpl(
      `${apiBase}/daily-summary?market=${m.id}&date=${date}`,
      { headers: { accept: "application/json" }, ...(cf ? { cf } : {}) },
    );

    if (res.status === 404) return false;
    if (!res.ok) return null;
    const body = await res.json().catch(() => null);

    return body?.summary ? true : null;
  } catch {
    return null;
  }
}

/** The days the sitemap may advertise: every archive day that meets
 *  `editionMeetsBar`, so no URL is listed that its pre-render then noindexes.
 *
 *  The filings half of the bar is known from the archive walk. The summary
 *  half has no list endpoint, so it is asked per day, and only of the days
 *  that need it: thin days, and today. Today is never listed on filings
 *  alone — an in-progress edition read by a crawler at 09:00 is two rows and
 *  no read — and joins once its summary lands. A summary check that fails is
 *  treated as "no": leaving a day out of one sitemap generation costs nothing,
 *  listing a noindexed one is the thing the sitemap must not do.
 *
 *  Returns `{ days, complete, failed }` with `days` newest first. */
export async function sitemapDays({
  apiBase,
  market,
  now = new Date(),
  fetchImpl = fetch,
  cf = null,
  summaryCf = cf,
}) {
  const m = dailyMarket(market);
  const today = todayInMarket(m.id, now);
  const archive = await fetchArchive({ apiBase, market: m.id, fetchImpl, cf });
  const checks = archive.days.map(async (day) => {
    if (day.date > today) return null;
    if (day.date !== today && editionMeetsBar(day)) return day;
    const has = await summaryExists({
      apiBase,
      market: m.id,
      date: day.date,
      fetchImpl,
      cf: summaryCf,
    });

    return has === true ? day : null;
  });
  const days = (await Promise.all(checks)).filter(Boolean);

  return { days, complete: archive.complete, failed: archive.failed };
}
