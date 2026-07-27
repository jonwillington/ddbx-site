// Biggest-buys leaderboards, and the methodology they publish.
//
// Plain ESM at the root so src/pages/biggest-buys.tsx and
// functions/biggest-buys/[year].js rank identically — a leaderboard whose
// pre-rendered order differs from its hydrated order is worse than no
// leaderboard.
//
// ---------------------------------------------------------------------------
// Why the methodology is code, not a footnote
// ---------------------------------------------------------------------------
//
// "Biggest insider buys" sounds like a sort. It isn't, and every decision below
// changes the answer:
//
//   - A vesting event, an option exercise or a placing is not a purchase at
//     market price, and the largest disclosures are disproportionately those.
//     Ranking without filtering puts a share allotment at the top of a page
//     titled "biggest buys".
//   - The eligibility test is DIFFERENT per market, because the feeds are.
//     UK rows carry `is_open_market_buy`, set by comparing the filed price to
//     the trade-day close (759 of 786 UK rows in the year to 2026-07-26 are
//     confirmed true, 27 null for want of price data, none false). US rows
//     carry no such flag at all — every one of the 532 US rows in the same
//     window has it undefined — because the US feed is already filtered
//     upstream to Form 4 transaction code P (open-market purchase) with
//     acquired/disposed = A, no derivatives and no amendments. So UK needs a
//     strict flag check and US needs a code check, and a single shared rule
//     would either empty the US board or admit UK placings.
//   - Currency never mixes: each board is scoped to one market and its own
//     currency. There is no FX conversion here, and so no FX rate to be wrong
//     about.
//   - Performance is marked from the DISCLOSURE-day close, not the insider's
//     own fill, and against the latest CACHED close rather than a live price.
//
// METHODOLOGY below is the reader-facing statement of exactly this, rendered on
// every board. It is exported rather than written into each page so the words
// and the code can't drift.

/** Rows to show on a board. Long enough to be a reference, short enough that
 *  the tail isn't noise. */
export const TOP_N = 25;

import { TRACKING_SINCE_YEAR } from "./tracking.js";

/** First calendar year with stored filings — the floor for the year archive
 *  and for the sitemap's year URLs. Re-exports the shared tracking floor so
 *  the page, the pre-render and the sitemap cannot disagree. */
export const BOARD_EARLIEST_YEAR = TRACKING_SINCE_YEAR;

/** Whether a disclosed row counts as an open-market purchase for this market.
 *
 *  UK: the pipeline's own classification, and strictly `=== true`. A null means
 *  "no price data yet, innocent until proven guilty" — fine for a feed, wrong
 *  for a leaderboard, where an unconfirmed row could be a placing and would
 *  appear at the very top precisely because placings are large.
 *
 *  US: `is_open_market_buy` is not populated. The feed only ever serves
 *  transaction code P with acquired_disposed A, so the check is that the row
 *  really is what the feed promises rather than a re-derivation. */
export function isEligibleBuy(d, market) {
  if (!d) return false;
  if (market === "US") {
    return (
      d.transaction_code === "P" &&
      d.acquired_disposed === "A" &&
      !d.is_derivative &&
      !d.is_amendment
    );
  }

  return d.is_open_market_buy === true && d.tx_type === "buy";
}

/** Value in the market's own currency. UK rows carry `value_gbp`, US `value`. */
export function buyValue(d) {
  const n = Number(d?.value_gbp ?? d?.value);

  return isFinite(n) ? n : 0;
}

export function buyPerson(d) {
  return d?.director?.name ?? d?.reporter?.name ?? null;
}

/** `live_performance.*_pct_*` are PERCENTAGES (1.83 = +1.83%), unlike the
 *  monthly summary's ratios. Same trap documented in shared/sectors.js. */
export function buyAlpha(d) {
  const lp = d?.live_performance;
  const pct = lp?.alpha_pct_disclosed ?? lp?.alpha_pct_trade;

  return pct == null || !isFinite(Number(pct)) ? null : Number(pct) / 100;
}

export function buyReturn(d) {
  const lp = d?.live_performance;
  const pct = lp?.return_pct_disclosed ?? lp?.return_pct_trade;

  return pct == null || !isFinite(Number(pct)) ? null : Number(pct) / 100;
}

/** At most this many entries from any one issuer.
 *
 *  Without it the US board for 2026 is five rows of the same company: a single
 *  issuer filed the five largest US purchases of the year, worth $7.9bn of an
 *  $8.0bn sector total. Those rows are true, and a "biggest buys" page made
 *  entirely of one ticker still answers nothing — the question it exists to
 *  answer is what was notable across the market.
 *
 *  So the cap is a stated editorial rule, not a silent filter: rankBuys reports
 *  what it held back, and the page prints it. */
export const MAX_PER_COMPANY = 3;

/** Rank eligible purchases by value, largest first.
 *
 *  Individual filings, deliberately NOT grouped by company or cluster. Four
 *  directors buying the same issuer on the same day is four disclosures and
 *  appears as four rows; collapsing them would answer a different question
 *  ("biggest cluster") under the same heading. Each row carries its cluster
 *  tier where one exists, so the relationship is visible rather than silently
 *  merged.
 *
 *  Returns `{ rows, suppressed }` — `suppressed` maps ticker to how many
 *  further purchases the per-company cap held back, so the page can say so
 *  instead of quietly dropping them. */
export function rankBuys(dealings, market, limit = TOP_N) {
  const eligible = (dealings ?? [])
    .filter((d) => isEligibleBuy(d, market))
    .sort((a, b) => buyValue(b) - buyValue(a));

  const perCompany = new Map();
  const suppressed = new Map();
  const rows = [];

  for (const d of eligible) {
    if (rows.length >= limit) break;
    const key = d.ticker ?? "";
    const used = perCompany.get(key) ?? 0;

    if (key && used >= MAX_PER_COMPANY) {
      suppressed.set(key, (suppressed.get(key) ?? 0) + 1);
      continue;
    }
    perCompany.set(key, used + 1);
    rows.push(d);
  }

  return { rows, suppressed };
}

/** Published methodology. Rendered on every board, by both renderers. */
export const METHODOLOGY = [
  "Only open-market purchases count. Share allotments, vesting, option exercises and placings are disclosed the same way but aren't purchases at a market price, and they are frequently the largest disclosures — so including them would put a share award at the top of a page about buying.",
  "UK rows must be classified as open-market buys by comparing the filed price against that day's close. Rows we can't price yet are left out rather than assumed innocent. US rows come from a feed already restricted to Form 4 transaction code P, excluding derivatives and amendments.",
  "Each purchase is listed individually. Several insiders buying the same company on the same day appear as separate rows — that's several disclosures, not one large one. Where a purchase forms part of a cluster, it's marked.",
  "No more than three purchases from any single company appear on a board. One issuer filing the largest handful of the year would otherwise fill it and answer nothing; where entries are held back, the count is shown.",
  "Values are in the market's own currency and are never converted, so no exchange rate is involved.",
  "Performance is measured from the closing price on the day the purchase was disclosed — the first price a reader could have paid — wherever that close is on file. When it isn't, the trade-day close is used instead. Either way the figure is marked against the most recent cached close rather than a live quote.",
  "Alpha is the purchase's own return minus the market's return over the same period, stated in percentage points: a buy up 8% while the index rose 5% has alpha of +3. The board is ranked by the size of the purchase, never by alpha.",
  "“Worth if still held” applies the stock's own move since disclosure to the amount originally spent. It assumes the shares were never sold and counts no dividends, costs or tax — it's a scale, not a valuation of anyone's actual holding.",
  "Companies that have since delisted may stop being priced, so their entries can show no performance figure. Past performance is not a reliable indicator of future results.",
];

/** Calendar-year bounds, or null for the rolling board. */
export function yearBounds(year) {
  const y = Number(year);

  if (!Number.isInteger(y) || y < 2000 || y > 2100) return null;

  return { since: `${y}-01-01`, until: `${y}-12-31` };
}

export function leaderboardPath(year) {
  return year ? `/biggest-buys/${year}` : "/biggest-buys";
}

/** The current year joins the archive only once it has had a month to produce
 *  a board (0-indexed, so 1 is February).
 *
 *  At midnight on 1 January the new year's board has ~0 eligible rows, and the
 *  pre-render refuses to index an empty board. Offering it in the archive cards
 *  and in the sitemap would submit a URL we then tell Google to drop, which is
 *  the one thing the sitemap must not do. A month of filings is more than
 *  enough for a 25-row board. */
const CURRENT_YEAR_FROM_MONTH = 1;

/** Years worth offering an archive for: every year from the first with data up
 *  to the current one, except that the current year is held back until
 *  CURRENT_YEAR_FROM_MONTH. Passed `today` so callers stay testable. */
export function archiveYears(earliest, today) {
  const first = Number(String(earliest ?? "").slice(0, 4));
  const now = new Date(today);
  const last = now.getFullYear();

  if (!Number.isInteger(first) || first < 2000) return [];
  const out = [];
  const currentYearReady = now.getMonth() >= CURRENT_YEAR_FROM_MONTH;

  for (let y = last; y >= first; y--) {
    if (y === last && !currentYearReady) continue;
    out.push(y);
  }

  return out;
}
