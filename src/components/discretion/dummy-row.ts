// Synthetic dealing for blurred list rows. When discretion mode gates the
// older history, we don't blur the REAL row — that would leave the real
// ticker, company, value and performance sitting in the DOM for a scraper to
// lift straight through the CSS blur. Instead we render a MarketRow fed this
// dummy, so the only data on the page is fabricated. The structural fields
// (isPurchase, rating, legCount, dates) are copied from the real row so the
// blurred row keeps the exact same height — the list doesn't reflow, the
// "volume" of history stays visible, just unreadable.

import type { MarketDealing } from "@/lib/markets/types";

const TICKERS = [
  "GSK",
  "BARC",
  "RR",
  "VOD",
  "BP",
  "TSCO",
  "AZN",
  "LLOY",
  "DGE",
  "REL",
  "NG",
  "ULVR",
  "SHEL",
  "HSBA",
  "GLEN",
];
const COMPANIES = [
  "Helmsworth Industries plc",
  "Carrick & Vale Group plc",
  "Northgate Resources plc",
  "Brightmoor Holdings plc",
  "Ashford Pinnacle plc",
  "Wexford Capital plc",
  "Stonebridge Energy plc",
  "Larkfield Technologies plc",
  "Mereside Partners plc",
  "Foxglove Pharma plc",
  "Caldwell Logistics plc",
  "Penrose Materials plc",
];
const NAMES = [
  "J. Harrington",
  "S. Ellwood",
  "M. Castellane",
  "R. Pemberton",
  "A. Driscoll",
  "T. Fairbanks",
  "K. Lindqvist",
  "P. Ashworth",
  "C. Ravenscroft",
  "D. Whitlock",
];
const VALUES = [48_200, 126_500, 31_900, 214_000, 73_400, 9_800, 305_700, 57_300];
const RETURNS = [8.7, -4.1, 12.1, -1.2, 3.4, 5.9, -2.4, 1.8, 7.3, -3.5, 15.2, -6.8];
const ALPHAS = [4.2, -2.6, 9.8, 0.3, 1.1, 3.7, -1.4, 0.9, 5.5, -2.1, 11.0, -4.4];

/** Tiny stable hash so a given real key always maps to the same decoy — no
 *  flicker between renders, no `Math.random` (banned in this codebase). */
function hash(s: string): number {
  let h = 2166136261;

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return h >>> 0;
}

const pick = <T>(arr: T[], seed: number): T => arr[seed % arr.length];

/** Build a non-scrapeable stand-in that renders at the same height as `real`. */
export function makeDummyDealing<W>(real: MarketDealing<W>): MarketDealing<W> {
  const seed = hash(real.key);

  return {
    ...real,
    key: `blur-${real.key}`,
    id: `blur-${real.id}`,
    ticker: pick(TICKERS, seed),
    company: pick(COMPANIES, seed >> 3),
    insiderName: pick(NAMES, seed >> 5),
    insiderRole: real.insiderRole ? "Director" : undefined,
    insiderPhotoUrl: undefined,
    value: pick(VALUES, seed >> 7),
    entryPrice: 100 + (seed % 900),
    shares: 0,
    // Drop anything that could carry real identity/sector signal; keep the
    // layout-driving structural fields (isPurchase, rating, legCount, dates).
    sector: undefined,
    cluster: null,
    buyStyle: null,
    confidence: undefined,
    summary: undefined,
    checklist: undefined,
    livePerformance: {
      return_pct_trade: pick(RETURNS, seed >> 9),
      return_pct_disclosed: pick(RETURNS, seed >> 11),
      alpha_pct_trade: pick(ALPHAS, seed >> 9),
      alpha_pct_disclosed: pick(ALPHAS, seed >> 11),
      as_of: null,
    },
    // The row path never reads `raw` (market slots that do live in the drawer),
    // but keep the shape valid and empty so nothing real leaks through it.
    raw: {} as W,
  };
}
