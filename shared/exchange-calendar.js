// Exchange sessions for the Pages Functions and the browser alike.
//
// Static on purpose: src/lib/bank-holidays.ts fetches gov.uk at runtime, which
// a Pages Function and a sitemap cannot do per request without a cache we do
// not have. The LSE observes the England and Wales bank holidays; the NYSE
// list is published years ahead. Both are seeded to 2028 / 2027. When the year
// rolls over, add a year here (and to US_EXCHANGE_HOLIDAYS in
// src/lib/markets/us.tsx, which this mirrors).
//
// Extracted 2026-09-17 from shared/days.js so the daily editions and the
// Insider Index read one calendar rather than two copies.

/** England and Wales bank holidays (gov.uk/bank-holidays.json, read
 *  2026-09-16). The LSE closes on these and on weekends; there is no other
 *  scheduled closure. */
export const UK_CLOSURES = {
  "2026-01-01": "New Year’s Day",
  "2026-04-03": "Good Friday",
  "2026-04-06": "Easter Monday",
  "2026-05-04": "the early May bank holiday",
  "2026-05-25": "the spring bank holiday",
  "2026-08-31": "the summer bank holiday",
  "2026-12-25": "Christmas Day",
  "2026-12-28": "Boxing Day",
  "2027-01-01": "New Year’s Day",
  "2027-03-26": "Good Friday",
  "2027-03-29": "Easter Monday",
  "2027-05-03": "the early May bank holiday",
  "2027-05-31": "the spring bank holiday",
  "2027-08-30": "the summer bank holiday",
  "2027-12-27": "Christmas Day",
  "2027-12-28": "Boxing Day",
  "2028-01-03": "New Year’s Day",
  "2028-04-14": "Good Friday",
  "2028-04-17": "Easter Monday",
  "2028-05-01": "the early May bank holiday",
  "2028-05-29": "the spring bank holiday",
  "2028-08-28": "the summer bank holiday",
  "2028-12-25": "Christmas Day",
  "2028-12-26": "Boxing Day",
};

/** NYSE holidays. Mirrors US_EXCHANGE_HOLIDAYS in src/lib/markets/us.tsx. */
export const US_CLOSURES = {
  "2026-01-01": "New Year’s Day",
  "2026-01-19": "Martin Luther King Jr. Day",
  "2026-02-16": "Presidents’ Day",
  "2026-04-03": "Good Friday",
  "2026-05-25": "Memorial Day",
  "2026-06-19": "Juneteenth",
  "2026-07-03": "Independence Day (observed)",
  "2026-09-07": "Labor Day",
  "2026-11-26": "Thanksgiving",
  "2026-12-25": "Christmas Day",
  "2027-01-01": "New Year’s Day",
  "2027-01-18": "Martin Luther King Jr. Day",
  "2027-02-15": "Presidents’ Day",
  "2027-03-26": "Good Friday",
  "2027-05-31": "Memorial Day",
  "2027-06-18": "Juneteenth (observed)",
  "2027-07-05": "Independence Day (observed)",
  "2027-09-06": "Labor Day",
  "2027-11-25": "Thanksgiving",
  "2027-12-24": "Christmas Day (observed)",
};

const CLOSURES = { UK: UK_CLOSURES, US: US_CLOSURES };

/** "UK" / "US" in either case; anything else is UK. */
const marketKey = (market) =>
  String(market ?? "").toUpperCase() === "US" ? "US" : "UK";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-09-15" -> true only for a real calendar date in that exact form, so
 *  "2026-02-31" is rejected rather than rolled into March. */
export function isDateSlug(slug) {
  const s = String(slug ?? "");

  if (!ISO.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);

  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** ISO date `days` after `iso` (negative for before). Calendar days. */
export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);

  d.setUTCDate(d.getUTCDate() + days);

  return d.toISOString().slice(0, 10);
}

const dow = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay();

/** Why the market was shut on `iso`, or null on a trading day. */
export function closureReason(iso, market) {
  const day = dow(iso);

  if (day === 0 || day === 6) return { kind: "weekend" };
  const name = CLOSURES[marketKey(market)][iso];

  return name ? { kind: "holiday", name } : null;
}

export const isTradingDay = (iso, market) => closureReason(iso, market) == null;

/** The trading day before `iso`. Bounded so a bad calendar can't spin. */
export function prevTradingDay(iso, market) {
  let d = iso;

  for (let i = 0; i < 14; i++) {
    d = addDays(d, -1);
    if (isTradingDay(d, market)) return d;
  }

  return null;
}

export function nextTradingDay(iso, market) {
  let d = iso;

  for (let i = 0; i < 14; i++) {
    d = addDays(d, 1);
    if (isTradingDay(d, market)) return d;
  }

  return null;
}

/** Trading days in [from, to], ascending. */
export function tradingDaysBetween(from, to, market) {
  const out = [];

  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (isTradingDay(d, market)) out.push(d);
  }

  return out;
}
