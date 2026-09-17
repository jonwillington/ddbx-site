import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MIN_STOCK_MEMBERS,
  MIN_STOCK_ROWS,
  laneSentence,
  memberLaneLine,
  publishedStocks,
  readStocks,
  relatedTickers,
  stockMeetsBar,
  stockPublished,
  stockRollup,
  stockVerdict,
} from "../shared/congress-stocks.js";

// A /api/gov-stocks entry, as ddbx-data's getGovStocks writes it.
function entry(ticker, over = {}) {
  return {
    ticker,
    company: `${ticker} Inc. - Common Stock`,
    sector_normalized: "Technology",
    members: MIN_STOCK_MEMBERS,
    purchases: MIN_STOCK_ROWS,
    filings: MIN_STOCK_ROWS,
    in_lane_members: 0,
    first_disclosed: "2025-01-02",
    last_disclosed: "2026-09-01",
    is_fund: false,
    buyers: [],
    ...over,
  };
}

const body = (stocks) => ({
  as_of: "2026-09-14",
  corpus: { members: 76, purchases: 5118, tickers: stocks.length },
  stocks,
});

/* ─── Floor admission ─────────────────────────────────────────────────────── */

test("the bar admits at exactly the floor and not one below either axis", () => {
  assert.equal(stockMeetsBar(entry("AT")), true);
  assert.equal(
    stockMeetsBar(entry("FEWM", { members: MIN_STOCK_MEMBERS - 1 })),
    false,
  );
  assert.equal(
    stockMeetsBar(entry("FEWR", { purchases: MIN_STOCK_ROWS - 1 })),
    false,
  );
  assert.equal(stockMeetsBar(null), false);
});

test("the bar reads purchases, not a rollup's rows", () => {
  // The old roster shape was { members, rows }. An entry carrying only `rows`
  // must not slip through as though the purchase count were met.
  assert.equal(stockMeetsBar({ members: 20, rows: 50 }), false);
});

/* ─── ETF exclusion ──────────────────────────────────────────────────────── */

test("a fund over the bar meets it but is not published", () => {
  const ibit = entry("IBIT", { members: 9, purchases: 30, is_fund: true });

  assert.equal(stockMeetsBar(ibit), true);
  assert.equal(stockPublished(ibit), false);
});

test("hub, sitemap and related names all leave funds out", () => {
  const stocks = [
    entry("MSFT", {
      members: 26,
      purchases: 100,
      buyers: [{ id: "A", purchases: 1, lane: "out", via: null }],
    }),
    entry("IVV", {
      members: 8,
      purchases: 20,
      is_fund: true,
      buyers: [{ id: "A", purchases: 1, lane: "unclassified", via: null }],
    }),
    entry("OTIS", { members: 2, purchases: 3 }),
  ];
  const read = readStocks(body(stocks));

  assert.equal(read.state, "ok");
  assert.deepEqual(
    read.published.map((e) => e.ticker),
    ["MSFT"],
  );
  assert.deepEqual(
    publishedStocks(stocks).map((e) => e.ticker),
    ["MSFT"],
  );
  assert.deepEqual(
    relatedTickers(stocks, "OTIS").map((e) => e.ticker),
    ["MSFT"],
  );
});

/* ─── Failure versus empty ───────────────────────────────────────────────── */

test("no body, an error body or the wrong shape is failed, never empty", () => {
  assert.deepEqual(readStocks(null), { state: "failed" });
  assert.deepEqual(readStocks(undefined), { state: "failed" });
  assert.deepEqual(readStocks({ error: "D1_ERROR" }), { state: "failed" });
  assert.deepEqual(readStocks({ stocks: "nope", corpus: {} }), {
    state: "failed",
  });
  // The deleted snapshot's shape is not a roster either.
  assert.deepEqual(readStocks([{ t: "MSFT", m: 26, r: 100 }]), {
    state: "failed",
  });
});

test("a real answer with nothing over the bar is empty, not failed", () => {
  const read = readStocks(body([entry("OTIS", { members: 2, purchases: 3 })]));

  assert.equal(read.state, "empty");
  assert.equal(read.roster.stocks.length, 1);
});

test("a roster of only funds is empty: nothing to advertise", () => {
  const read = readStocks(
    body([entry("IBIT", { members: 9, purchases: 30, is_fund: true })]),
  );

  assert.equal(read.state, "empty");
});

test("an empty table is empty", () => {
  assert.equal(readStocks(body([])).state, "empty");
});

/* ─── The lane is the server's ───────────────────────────────────────────── */

const row = (id, name, over = {}) => ({
  id: `${id}-${Math.random()}`,
  ticker: "UNH",
  company: "UnitedHealth Group Incorporated Common Stock",
  sector_normalized: "Financials",
  filing_id: `f-${id}`,
  trade_date: "2026-08-01",
  disclosed_date: "2026-08-20",
  owner: "self",
  amount_min: 1001,
  amount_max: 15000,
  asset_type: "stock",
  reporter: { id, name, chamber: "house", committees: [] },
  live_performance: {
    return_pct_disclosed: 12.3,
    alpha_pct_disclosed: 4,
    as_of: "2026-09-14",
  },
  ...over,
});

test("the rollup takes each buyer's lane from the entry and computes none", () => {
  const rows = [
    row("A", "Rep A", {
      reporter: {
        id: "A",
        name: "Rep A",
        chamber: "house",
        committees: ["House Committee on Energy and Commerce"],
      },
    }),
    row("B", "Sen B", {
      reporter: { id: "B", name: "Sen B", chamber: "senate", committees: [] },
    }),
    row("C", "Rep C"),
  ];
  const e = entry("UNH", {
    buyers: [
      {
        id: "A",
        purchases: 1,
        lane: "in",
        via: "House Committee on Financial Services",
      },
      { id: "B", purchases: 1, lane: "unmodelled", via: null },
    ],
  });
  const s = stockRollup("UNH", rows, e);
  const byId = Object.fromEntries(s.members.map((m) => [m.id, m]));

  // A sits on Energy and Commerce, whose published sectors do not include
  // Financials; a sector-level check would have said "out". The server said
  // "in", via Financial Services, and that is what the page says.
  assert.equal(byId.A.lane, "in");
  assert.deepEqual(byId.A.via, ["House Committee on Financial Services"]);
  assert.equal(byId.B.lane, "unmodelled");
  // C bought after the roster was read: not guessed, not "out".
  assert.equal(byId.C.lane, "pending");
  assert.deepEqual(
    {
      in: s.lane.in,
      out: s.lane.out,
      unmodelled: s.lane.unmodelled,
      pending: s.lane.pending,
    },
    { in: 1, out: 0, unmodelled: 1, pending: 1 },
  );
  assert.match(laneSentence(s), /Rep A, via Financial Services/);
  assert.match(memberLaneLine(byId.C), /newer than our last committee check/);
});

test("an unclassified issuer says so rather than reporting nobody in lane", () => {
  const rows = [row("A", "Rep A")];
  const s = stockRollup(
    "UNH",
    rows,
    entry("UNH", {
      buyers: [{ id: "A", purchases: 1, lane: "unclassified", via: null }],
    }),
  );

  assert.equal(s.lane.classified, false);
  assert.match(laneSentence(s), /no industry code/);
});

/* ─── No live return in the verdict ──────────────────────────────────────── */

test("the verdict carries no return figure", () => {
  const rows = Array.from({ length: 12 }, (_, i) =>
    row(`M${i % 6}`, `Rep ${i % 6}`),
  );
  const s = stockRollup("UNH", rows, entry("UNH"));
  const verdict = stockVerdict(s);

  assert.equal("outcome" in s, false);
  assert.doesNotMatch(
    verdict,
    /%\s*(up|down)|S&P 500|since filing|price mark/i,
  );
});
