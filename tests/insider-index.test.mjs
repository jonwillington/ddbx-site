import { test } from "node:test";
import assert from "node:assert/strict";

import { tradingDaysBetween } from "../shared/exchange-calendar.js";
import {
  combinedMeasures,
  indexDateFromPath,
  isIndexSlug,
  latestReading,
  LOOKBACK,
  MIN_HISTORY,
  percentileRank,
  publishable,
  publishedThrough,
  readingForDate,
  readingSentence,
  readingSummary,
  series,
  TIERS,
  WINDOW_DAYS,
} from "../shared/insider-index.js";

// A deterministic PRNG, so a failing band test fails the same way twice.
function rng(seed) {
  let s = seed >>> 0;

  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Synthetic UK purchases, 0 to 11 a session, over [from, to]. */
function synthetic(from, to, seed = 1) {
  const rand = rng(seed);
  const rows = [];
  let id = 0;

  for (const day of tradingDaysBetween(from, to, "UK")) {
    const n = Math.floor(rand() * 12);

    for (let k = 0; k < n; k++) {
      rows.push({
        id: String(id++),
        disclosed_date: day,
        trade_date: day,
        ticker: `T${Math.floor(rand() * 400)}.L`,
        tx_type: "buy",
        is_open_market_buy: true,
        value_gbp: Math.round(1000 + rand() * rand() * 600_000),
      });
    }
  }

  return rows;
}

const buy = (day, ticker = "ABC.L", value = 10_000) => ({
  id: `${day}-${ticker}-${value}`,
  disclosed_date: day,
  trade_date: day,
  ticker,
  tx_type: "buy",
  is_open_market_buy: true,
  value_gbp: value,
});

// A clock well past the synthetic record, so nothing is held back for being
// in progress unless a test says so. `upTo` ends the series with the record:
// sessions after the last synthetic row would be real zero days.
const LATER = { now: new Date("2028-12-01T12:00:00Z") };
const upTo = (to) => ({ ...LATER, to });

test("the index is a direct count: the share of other days in the pool with a lower combined measure", () => {
  const rows = synthetic("2026-03-02", "2027-09-30", 7);
  const all = series(rows, "UK", upTo("2027-09-30"));
  const published = publishable(all);

  assert.ok(published.length > 200);

  // A spread of readings, including ones whose pool is capped at LOOKBACK.
  for (const r of [published[0], published[60], published[published.length - 1]]) {
    const i = all.indexOf(r);
    const start = Math.max(0, i + 1 - LOOKBACK);
    const pool = all.slice(start, i + 1);
    const counts = pool.map((p) => p.count);
    const breadths = pool.map((p) => p.breadth);
    const values = pool.map((p) => p.value);

    // Brute force, one percentileRank at a time, no shared helper.
    const measures = pool.map(
      (p) =>
        (percentileRank(p.count, counts) +
          percentileRank(p.breadth, breadths) +
          percentileRank(p.value, values)) /
        3,
    );
    const mine = measures[measures.length - 1];
    const others = measures.slice(0, -1);
    const lower = others.filter((m) => m < mine).length;
    const tied = others.filter((m) => m === mine).length;
    const direct = ((lower + tied / 2) / others.length) * 100;

    assert.ok(Math.abs(r.pct - direct) < 1e-9, `${r.date}: ${r.pct} vs ${direct}`);
    assert.equal(r.score, Math.round(direct));

    // And the sentence's percentage is that count.
    const sentence = readingSentence(all, i, "UK");
    const stated = r.score >= 50 ? r.score : 100 - r.score;

    if (r.score !== 50) assert.match(sentence, new RegExp(` ${stated}% of `));
  }
});

test("combinedMeasures matches percentileRank averaged by hand", () => {
  const c = [3, 1, 4, 1, 5, 9, 2, 6];
  const b = [2, 7, 1, 8, 2, 8, 1, 8];
  const v = [10, 20, 30, 40, 50, 60, 70, 80];
  const got = combinedMeasures(c, b, v);

  got.forEach((m, i) => {
    const want =
      (percentileRank(c[i], c) + percentileRank(b[i], b) + percentileRank(v[i], v)) / 3;

    assert.ok(Math.abs(m - want) < 1e-9);
  });
});

test("the five tiers each hold about a fifth of days", () => {
  // Several independent records, so the check is about the method and not
  // about one lucky run of overlapping windows.
  const bands = [0, 0, 0, 0, 0];
  let n = 0;

  for (const seed of [11, 12, 13, 14]) {
    const all = series(synthetic("2026-03-02", "2028-06-30", seed), "UK", upTo("2028-06-30"));

    for (const r of publishable(all)) {
      const t = TIERS.findLastIndex((tier) => r.score >= tier.min);

      bands[t] += 1;
      n += 1;
    }
  }
  const shares = bands.map((b) => b / n);

  for (const share of shares) {
    assert.ok(share > 0.15 && share < 0.25, `tier shares ${shares.map((s) => s.toFixed(3))}`);
  }
});

test("the old average of percentiles would not have passed the band test", () => {
  // Guards the reason for the change: averaging three ranks bunches the
  // result towards the middle, so the outer tiers are thin.
  const all = series(synthetic("2026-03-02", "2028-06-30", 11), "UK", upTo("2028-06-30"));
  const rows = publishable(all);
  const outer = rows.filter((r) => r.combined < 20 || r.combined >= 80).length / rows.length;
  const outerNew = rows.filter((r) => r.score < 20 || r.score >= 80).length / rows.length;

  assert.ok(outer < outerNew, `old outer ${outer}, new outer ${outerNew}`);
});

test("a session still in progress has no reading, and publishes at 7am London the next day", () => {
  const rows = [
    ...synthetic("2026-03-02", "2026-09-16", 3),
    buy("2026-09-17", "LATE.L"),
  ];

  // 06:30 London on 17 September (BST): 16 September is not out yet.
  const early = { now: new Date("2026-09-17T05:30:00Z") };

  assert.equal(publishedThrough(early.now), "2026-09-15");
  assert.equal(readingSummary(rows, "2026-09-17", "UK", early), null);
  assert.equal(readingSummary(rows, "2026-09-16", "UK", early), null);
  assert.equal(readingForDate(rows, "2026-09-16", "UK", early), null);
  assert.equal(latestReading(series(rows, "UK", early)).date, "2026-09-15");
  assert.notEqual(readingSummary(rows, "2026-09-15", "UK", early), null);

  // 07:30 London: 16 September has published; 17 September still has not.
  const after = { now: new Date("2026-09-17T06:30:00Z") };

  assert.equal(latestReading(series(rows, "UK", after)).date, "2026-09-16");
  assert.notEqual(readingSummary(rows, "2026-09-16", "UK", after), null);
  assert.equal(readingSummary(rows, "2026-09-17", "UK", after), null);

  // Asking for a later `to` cannot get round the cutoff.
  const forced = series(rows, "UK", { ...after, to: "2026-09-30" });

  assert.equal(forced[forced.length - 1].date, "2026-09-16");

  // A Friday publishes on the Saturday morning.
  assert.equal(publishedThrough(new Date("2026-09-19T06:00:00Z")), "2026-09-18");
  assert.equal(publishedThrough(new Date("2026-09-19T05:59:00Z")), "2026-09-17");
});

test("a bank holiday has no reading and is not a quiet day inside a window", () => {
  const rows = [
    ...synthetic("2026-03-02", "2026-09-10", 5),
    buy("2026-08-31", "HOLIDAY.L", 50_000),
  ];
  const all = series(rows, "UK", LATER);

  assert.equal(all.find((r) => r.date === "2026-08-31"), undefined);
  assert.equal(readingForDate(rows, "2026-08-31", "UK", LATER), null);
  assert.equal(readingSummary(rows, "2026-08-31", "UK", LATER), null);

  // The window to 1 September is twenty sessions, none of them 31 August.
  const sept1 = all.find((r) => r.date === "2026-09-01");
  const sessions = tradingDaysBetween(sept1.windowStart, sept1.date, "UK");

  assert.equal(sessions.length, WINDOW_DAYS);
  assert.ok(!sessions.includes("2026-08-31"));

  // A disclosure dated on the holiday counts on the next session.
  const without = series(rows.slice(0, -1), "UK", LATER).find((r) => r.date === "2026-09-01");

  assert.equal(sept1.count, without.count + 1);
});

test("the index publishes only after MIN_HISTORY earlier readings", () => {
  const all = series(synthetic("2026-03-02", "2026-09-10", 9), "UK", LATER);
  const first = publishable(all)[0];

  assert.equal(all.indexOf(first), MIN_HISTORY);
  assert.equal(first.history, MIN_HISTORY);
});

test("dates that are not sessions are not index slugs", () => {
  assert.equal(isIndexSlug("2026-02-31"), false);
  assert.equal(isIndexSlug("2026-09-31"), false);
  assert.equal(isIndexSlug("2026-9-16"), false);
  assert.equal(isIndexSlug("2026-09-12"), false); // Saturday
  assert.equal(isIndexSlug("2026-08-31"), false); // summer bank holiday
  assert.equal(isIndexSlug("2026-09-16"), true);

  assert.equal(indexDateFromPath("/insider-index/2026-02-31"), null);
  assert.equal(indexDateFromPath("/insider-index/%E0%A4%A"), null);
  assert.equal(indexDateFromPath("/insider-index/2026-09-16"), "2026-09-16");

  const rows = synthetic("2026-03-02", "2026-09-10", 2);

  assert.equal(readingForDate(rows, "2026-02-31", "UK", LATER), null);
  assert.equal(readingSummary(rows, "2026-02-31", "UK", LATER), null);
});

test("a late disclosure of an old trade counts on its disclosure session, through the index's own fetch", async () => {
  const { fetchDealingsWindow } = await import("../shared/dealings-feed.js");
  const { indexWindow } = await import("../shared/insider-index.js");
  const history = synthetic("2026-03-02", "2026-09-16", 4);
  // Traded in June, told to the market on 15 September.
  const late = { ...buy("2026-09-15", "LATE.L", 40_000), id: "late", trade_date: "2026-06-02" };
  const rows = [...history, late];
  const fetchImpl = async () => ({ ok: true, json: async () => ({ dealings: rows }) });
  const now = new Date("2026-09-17T08:00:00Z");
  // The rolling window starts after the trade: a trade-date window drops it.
  const req = indexWindow(new Date("2027-06-10T12:00:00Z"), "UK");

  assert.equal(req.windowOn, "disclosed");
  assert.ok(late.trade_date < req.since && late.disclosed_date >= req.since);

  const byDisclosure = await fetchDealingsWindow({ apiBase: "x", ...req, fetchImpl });
  const byTrade = await fetchDealingsWindow({ apiBase: "x", ...req, windowOn: "trade", fetchImpl });

  assert.ok(byDisclosure.dealings.some((d) => d.id === "late"));
  assert.ok(!byTrade.dealings.some((d) => d.id === "late"));

  // And in the series it lands on 15 September, not on the trade date.
  const opts = { now, from: "2026-03-02" };
  const withLate = series(rows, "UK", opts);
  const without = series(history, "UK", opts);
  const on = (all, date) => all.find((r) => r.date === date);

  assert.equal(on(withLate, "2026-09-15").count, on(without, "2026-09-15").count + 1);
  assert.equal(on(withLate, "2026-06-02").count, on(without, "2026-06-02").count);
});
