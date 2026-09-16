#!/usr/bin/env node
// Regenerate the ticker roster behind /congress/stocks
// (shared/congress-stocks-roster.js) from the live member details.
//
// Why a snapshot exists at all. The public API can answer "every purchase of
// NVDA" (/api/gov-dealings?ticker=NVDA, full history, no cap that bites) but
// it cannot answer "every ticker, with how many members bought each": the
// feed is capped at 500 rows (about eight weeks of the raw stream) and the
// only complete per-ticker figures live in the 76 member-detail responses.
// Fetching 76 details on every index request, in a Pages Function or in the
// browser, is not a page. So the INDEX and the SITEMAP read this roster and
// every TICKER PAGE fetches its own rows live and applies the publishing bar
// to what it fetched, never to this file. The roster decides which pages are
// advertised; the live rows decide what a page says.
//
// The proper fix is a data-side aggregate (`GET /api/gov-tickers`, specified
// in investigations/2026-09-16-congress-stocks.md). When it lands, the index
// and the sitemap switch to it and this script goes.
//
//   node scripts/congress-stocks-roster.mjs        # rewrites the roster
//   node scripts/congress-stocks-roster.mjs --dry  # prints the distribution only
//
// The roster is the same aggregate shared/congress-stocks.js would compute
// from the rows, keyed the same way, so the two cannot disagree about a
// count — both are sums over the same member-detail `top_tickers`.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  cleanIssuer,
  MIN_STOCK_MEMBERS,
  MIN_STOCK_ROWS,
  ROSTER_MIN_MEMBERS,
  stockMeetsBar,
} from "../shared/congress-stocks.js";

const API_BASE = process.env.VITE_API_BASE || "https://api.ddbx.uk";
const DRY = process.argv.includes("--dry");
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "shared",
  "congress-stocks-roster.js",
);

async function json(path) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { accept: "application/json" },
  });

  if (!res.ok) throw new Error(`${path}: ${res.status}`);

  return res.json();
}

const { members } = await json("/gov-members");
const details = [];

for (let i = 0; i < members.length; i += 8) {
  const batch = members.slice(i, i + 8);
  const got = await Promise.all(
    batch.map((m) => json(`/directors/usg/${m.id}`).catch(() => null)),
  );

  details.push(...got.filter(Boolean));
}

// Aggregate the way a data-side endpoint would: one pass over every member's
// issuer list. A member's `top_tickers` is uncapped (verified 2026-09-16
// against stats.issuers on all 76), so the sums are exact.
const byTicker = new Map();
let corpusRows = 0;

for (const d of details) {
  corpusRows += d.stats.filings;
  for (const t of d.top_tickers) {
    const cur = byTicker.get(t.ticker) ?? {
      ticker: t.ticker,
      names: new Map(),
      sector: new Map(),
      members: 0,
      rows: 0,
      inLane: 0,
      ids: [],
    };

    cur.members += 1;
    cur.rows += t.count;
    if (t.in_lane) cur.inLane += 1;
    cur.ids.push(d.id);
    cur.names.set(t.company, (cur.names.get(t.company) ?? 0) + t.count);
    if (t.sector_normalized) {
      cur.sector.set(
        t.sector_normalized,
        (cur.sector.get(t.sector_normalized) ?? 0) + t.count,
      );
    }
    byTicker.set(t.ticker, cur);
  }
}

const mostCommon = (m) =>
  [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

// The dates come from the members' dealings arrays, which ARE capped (200),
// newest first, so `last` is exact. The ticker page states the real span from
// its own live rows; the roster's date only orders the index and stamps the
// sitemap.
const dates = new Map();

for (const d of details) {
  for (const row of d.dealings) {
    if (!row.ticker) continue;
    const cur = dates.get(row.ticker) ?? { last: null };

    if (!cur.last || row.disclosed_date > cur.last) cur.last = row.disclosed_date;
    dates.set(row.ticker, cur);
  }
}

const roster = [...byTicker.values()]
  .filter((t) => t.members >= ROSTER_MIN_MEMBERS)
  .map((t) => ({
    t: t.ticker,
    c: cleanIssuer(mostCommon(t.names) ?? t.ticker),
    s: mostCommon(t.sector),
    m: t.members,
    r: t.rows,
    l: t.inLane,
    last: dates.get(t.ticker)?.last ?? null,
    // Member ids only where a page will use them (related tickers are drawn
    // from the published set); below the bar they would double the file.
    ids: stockMeetsBar({ members: t.members, rows: t.rows }) ? t.ids.sort() : undefined,
  }))
  .sort((a, b) => b.m - a.m || b.r - a.r || a.t.localeCompare(b.t));

const published = roster.filter((e) =>
  stockMeetsBar({ members: e.m, rows: e.r }),
);
const asOf = details
  .map((d) => d.stats.last_disclosed)
  .filter(Boolean)
  .sort()
  .pop();

console.log(
  `members ${details.length} · rows ${corpusRows} · tickers ${byTicker.size} · roster (>=${ROSTER_MIN_MEMBERS} members) ${roster.length} · pages (>=${MIN_STOCK_MEMBERS} members, >=${MIN_STOCK_ROWS} purchases) ${published.length} · as of ${asOf}`,
);
for (const [m, r] of [
  [2, 5],
  [3, 5],
  [3, 10],
  [4, 10],
  [5, 10],
  [5, 15],
  [8, 20],
]) {
  const n = [...byTicker.values()].filter(
    (t) => t.members >= m && t.rows >= r,
  ).length;

  console.log(`  floor members>=${m} rows>=${r}: ${n}`);
}
console.log(
  published
    .slice(0, 12)
    .map((e) => `  ${e.t} ${e.c} · ${e.m} members · ${e.r} purchases · ${e.l} in lane`)
    .join("\n"),
);

if (DRY) process.exit(0);

const body = `// GENERATED by scripts/congress-stocks-roster.mjs — do not edit by hand.
//
// The ticker roster behind /congress/stocks: which tickers members of Congress
// have bought, how many members and purchases each has on record, and which
// clear the publishing bar. Read by the index page, its pre-render and the
// sitemap. The TICKER PAGES never read it — they fetch their own rows and
// apply the bar live. See the script header for why this is a snapshot.
//
// Regenerate: node scripts/congress-stocks-roster.mjs

/** Latest disclosure date in the corpus when this was generated. */
export const ROSTER_AS_OF = ${JSON.stringify(asOf)};

/** Tracked members and purchase rows in the corpus at generation. */
export const ROSTER_CORPUS = { members: ${details.length}, rows: ${corpusRows}, tickers: ${byTicker.size} };

/** One entry per ticker bought by at least ${ROSTER_MIN_MEMBERS} members.
 *  t ticker · c issuer name · s sector (ICB, or null when the SEC has no SIC
 *  for it) · m distinct members · r purchase rows · l members whose committee
 *  lane covers the issuer (server-computed, House only) · last disclosed ·
 *  ids member bioguides, published tickers only. */
export const ROSTER = ${JSON.stringify(roster)};
`;

writeFileSync(OUT, body);
console.log(`wrote ${OUT}`);
