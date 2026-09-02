#!/usr/bin/env node
// Regenerate the price series behind the hero "success stories"
// (src/components/market/hero-deal-data.ts) from real closes.
//
// Each hero deal is a real filing, and the chart beside its notification
// draws the real closes around it: a run-up before the disclosure, the alert,
// then what the price did next, ending on the outcome the panel states
// ("+135% in 107 days"). The figure is derived from the same points the line
// is drawn from, so the two cannot disagree — which is why the series are
// snapshotted into the data file rather than fetched at runtime (the hero
// must never have a loading state) and why they come from here rather than
// being hand-drawn.
//
//   node scripts/hero-deal-series.mjs            # prints one block per deal
//
// Paste each block over the matching deal's `series` / `buyIndex` /
// `filedIndex` / `disclosedDate` / `asOf` fields. Re-run whenever the cast
// changes or the snapshot is stale enough that the "as of" date looks old.
//
// Window rules (also documented on HeroDeal):
//   - `pre` closes before the trade, so the alert lands about a quarter of
//     the way across and the outcome gets the width;
//   - the continuation runs to the latest close, capped at `postCap` closes
//     so a year-old filing still puts its alert on the visible left;
//   - a trade disclosed within MIN_GAP closes collapses onto its disclosure
//     (one marker, at the day the alert fired); a longer gap keeps both, the
//     way a late Congressional PTR should.
// Values are rebased so the disclosure close is 100 — the chart is
// unitless and only the shape and the derived return are load-bearing.

const API_BASE = process.env.VITE_API_BASE || "https://api.ddbx.uk";

/** id → { ticker (as /api/prices knows it), tradeDate, disclosedDate,
 *  postCap? } — the cast in hero-deal-data.ts, by deal id. */
const CAST = {
  // UK
  has: { ticker: "HAS.L", tradeDate: "2026-05-14", disclosedDate: "2026-05-18" },
  eman: { ticker: "EMAN.L", tradeDate: "2026-03-13", disclosedDate: "2026-03-16" },
  sfor: { ticker: "SFOR.L", tradeDate: "2026-03-24", disclosedDate: "2026-03-26" },
  tlw: { ticker: "TLW.L", tradeDate: "2026-06-15", disclosedDate: "2026-06-17" },
  // US
  smwb: { ticker: "SMWB", tradeDate: "2026-05-19", disclosedDate: "2026-05-20" },
  niq: { ticker: "NIQ", tradeDate: "2026-05-18", disclosedDate: "2026-05-18" },
  via: { ticker: "VIA", tradeDate: "2026-06-09", disclosedDate: "2026-06-11" },
  gshd: { ticker: "GSHD", tradeDate: "2026-05-15", disclosedDate: "2026-05-15" },
  // Congress — older filings, so a year-long continuation is capped.
  mu: { ticker: "MU", tradeDate: "2026-02-03", disclosedDate: "2026-02-03" },
  pltr: { ticker: "PLTR", tradeDate: "2025-01-21", disclosedDate: "2025-01-22", postCap: 250 },
  googl: { ticker: "GOOGL", tradeDate: "2025-01-14", disclosedDate: "2025-01-14", postCap: 250 },
  nvda: { ticker: "NVDA", tradeDate: "2025-01-14", disclosedDate: "2025-01-14", postCap: 250 },
};

const DEFAULT_POST_CAP = 120;
const MIN_PRE = 30;
const MIN_GAP = 5;

async function history(ticker) {
  const res = await fetch(
    `${API_BASE}/api/prices/history?ticker=${encodeURIComponent(ticker)}&days=700`,
  );

  if (!res.ok) throw new Error(`${ticker}: ${res.status}`);
  const { bars } = await res.json();

  return bars;
}

for (const [id, c] of Object.entries(CAST)) {
  const bars = await history(c.ticker);
  const at = (d) => bars.findIndex((b) => b.date >= d);
  const ti = at(c.tradeDate);
  const di = at(c.disclosedDate);

  if (ti < 0 || di < 0) throw new Error(`${id}: dates outside history`);
  const post = Math.min(bars.length - 1 - di, c.postCap ?? DEFAULT_POST_CAP);
  const pre = Math.max(MIN_PRE, Math.round(post / 3));
  const start = Math.max(0, ti - pre);
  const win = bars.slice(start, di + post + 1);
  const base = bars[di].close_pence;
  const series = win.map((b) => Math.round((b.close_pence / base) * 1000) / 10);
  const filedIndex = di - start;
  const buyIndex = di - ti < MIN_GAP ? filedIndex : ti - start;
  const pct = Math.trunc(
    ((series[series.length - 1] - series[filedIndex]) / series[filedIndex]) *
      100,
  );
  const days = Math.round(
    (Date.parse(win[win.length - 1].date) - Date.parse(bars[di].date)) / 864e5,
  );

  console.log(`// ${id}: ${c.ticker} — ${pct > 0 ? "+" : ""}${pct}% in ${days} days`);
  console.log(`    buyIndex: ${buyIndex},`);
  if (filedIndex !== buyIndex) console.log(`    filedIndex: ${filedIndex},`);
  console.log(`    disclosedDate: "${bars[di].date}",`);
  console.log(`    asOf: "${win[win.length - 1].date}",`);
  console.log(`    series: [${series.join(", ")}],`);
  console.log();
}
