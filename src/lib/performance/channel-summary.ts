// Channel performance summary — a lightweight read of the performance stats
// that the full /portfolio backtest computes in detail.
//
// Every dealing carries a server-precomputed `livePerformance` (return +
// alpha vs the market) plus a `buyStyle` tag, so no price fetches are needed
// here. The rows themselves come from the market's `fetchChannelDealings`
// (one request covering the 90-day window the iOS app leads with — the
// page's own load only reaches back ~a month), falling back to the page's
// in-memory dealings if that fetch fails. From those rows this mirrors the
// headline surfaces — the beating-the-index verdict, winners-only top
// performers, the sector leaderboard, and the contrarian/momentum style race.
// The page stays the destination for the interactive backtest; the channel is
// the teaser that points at it (and, under discretion mode, at the app).

import type { MarketDealing } from "@/lib/markets/types";
import type { PerformanceUniverse } from "@/lib/performance/types";

/** One pick in the top-contributors strip. */
export interface ChannelContributor {
  id: string;
  ticker: string;
  company: string;
  /** Since-disclosure return as a ratio (0.12 = +12%). */
  returnPct: number;
  /** Alpha vs the market benchmark as a ratio. null when unknown. */
  alphaPct: number | null;
}

/** One row of the sector leaderboard. */
export interface ChannelSector {
  sector: string;
  dealCount: number;
  /** Mean since-disclosure alpha across the sector's buys, as a ratio. */
  meanAlphaPct: number;
}

/** One lane of the buy-style race. */
export interface ChannelStyle {
  kind: "contrarian" | "momentum" | "neutral";
  dealCount: number;
  /** Mean since-disclosure return across the lane's buys, as a ratio. */
  meanReturnPct: number;
}

export interface ChannelPerformanceSummary {
  /** Number of buys that fed the headline (had a live return). */
  sampleSize: number;
  /** Mean since-disclosure return of the picks, as a ratio. null when empty. */
  picksReturnPct: number | null;
  /** Implied benchmark return over the same picks, as a ratio. null when empty. */
  benchmarkReturnPct: number | null;
  /** Mean alpha (picks − benchmark), as a ratio. null when empty. */
  alphaPct: number | null;
  /** Buys whose since-disclosure alpha beat the market (alpha > 0). */
  marketBeatCount: number;
  /** Buys with a known alpha — the denominator for the beat rate. */
  marketBeatTotal: number;
  /** Latest disclosure date (ISO `YYYY-MM-DD`) among the windowed buys, for the
   *  "Updated …" caption. null when the window is empty. */
  lastUpdated: string | null;
  /** Which quality slice the headline reflects — the app shows whichever rated
   *  slice beat the market by most, so the label can name it honestly. */
  headlineUniverse: PerformanceUniverse;
  contributors: ChannelContributor[];
  sectors: ChannelSector[];
  styles: ChannelStyle[];
}

const MAX_CONTRIBUTORS = 6;
const MAX_SECTORS = 5;

/** The channel follows the iOS Analysis window default: 90 days, chosen there
 *  because it carries roughly 6× the alpha of a 30-day window and is the
 *  shortest window where picks beat the market more often than not. The page's
 *  default dealings fetch only holds ~a month of history, so markets supply a
 *  dedicated `fetchChannelDealings` covering this window (see MarketConfig). */
export const CHANNEL_WINDOW_DAYS = 90;
/** iOS `minDaysHeldForBest`: a buy younger than this can't headline the top
 *  performers — day-old spikes aren't a track record. Relaxes when no pick is
 *  old enough, exactly like the app. */
export const MIN_DAYS_HELD_FOR_TOP = 7;

/** ISO `YYYY-MM-DD` for the day `days` ago (inclusive window lower bound). */
function isoDaysAgo(days: number): string {
  const d = new Date();

  d.setDate(d.getDate() - days);

  return d.toISOString().slice(0, 10);
}
/** A sector needs at least this many buys before it earns a leaderboard row —
 *  one lucky pick shouldn't crown an industry. */
const MIN_SECTOR_DEALS = 2;
const STYLE_ORDER: ChannelStyle["kind"][] = [
  "contrarian",
  "momentum",
  "neutral",
];

function mean(values: number[]): number | null {
  if (values.length === 0) return null;

  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** A headline slice needs at least this many buys — one lucky pick shouldn't
 *  crown a universe. Mirrors the app's `subset.count >= 2` guard. */
const MIN_HEADLINE_DEALS = 2;
/** Rated slices the app tries for the headline, on top of the every-buy base. */
const HEADLINE_CANDIDATES: PerformanceUniverse[] = [
  "suggested",
  "noteworthy",
  "significant",
];

/** Universe membership off `MarketDealing.rating`, mirroring the full
 *  backtest's `matchesUniverse` / `isSuggestedDealing` (suggested = rated and
 *  not routine). NL/SE carry no ratings, so only `every_buy` ever matches. */
function inUniverse(d: MarketDealing, u: PerformanceUniverse): boolean {
  switch (u) {
    case "every_buy":
      return true;
    case "suggested":
      return d.rating != null && d.rating !== "routine";
    case "significant":
      return d.rating === "significant";
    case "noteworthy":
      return d.rating === "noteworthy";
  }
}

/** Best foot forward, like the app's Highlights headline: among the rated
 *  slices, take whichever beat the market by the widest mean alpha; fall back
 *  to every buy. `buys` are already the windowed purchases. */
function pickHeadlineUniverse(buys: MarketDealing[]): PerformanceUniverse {
  const sliceAlpha = (u: PerformanceUniverse): number | null => {
    const alphas = buys
      .filter((d) => inUniverse(d, u))
      .map(alphaOf)
      .filter((a): a is number => a != null && Number.isFinite(a));

    return alphas.length >= MIN_HEADLINE_DEALS ? mean(alphas) : null;
  };

  let best: PerformanceUniverse = "every_buy";
  let bestAlpha = sliceAlpha("every_buy") ?? -Infinity;

  for (const u of HEADLINE_CANDIDATES) {
    const a = sliceAlpha(u);

    if (a != null && a > bestAlpha) {
      best = u;
      bestAlpha = a;
    }
  }

  return best;
}

// `livePerformance` carries percentages (12.3 = +12.3%), per the canonical
// LivePerformance type. The channel renders through `formatSignedPct`, which
// takes ratios (0.123) — so normalise to ratios on the way in.
function toRatio(pct: number | null | undefined): number | null {
  return pct == null || !Number.isFinite(pct) ? null : pct / 100;
}

/** Prefer the disclosure anchor (what a reader who acted on the filing would
 *  have earned); fall back to the trade anchor when disclosure is missing.
 *  Returns a ratio (0.123 = +12.3%). */
function returnOf(d: MarketDealing): number | null {
  const lp = d.livePerformance;

  if (!lp) return null;

  return toRatio(lp.return_pct_disclosed ?? lp.return_pct_trade);
}

function alphaOf(d: MarketDealing): number | null {
  const lp = d.livePerformance;

  if (!lp) return null;

  return toRatio(lp.alpha_pct_disclosed ?? lp.alpha_pct_trade);
}

/** Build the channel's performance summary.
 *
 *  `assumeBuys` is for the dedicated channel fetch: those rows are already
 *  filtered to genuine open-market buys (placements/awards dropped, like iOS
 *  `isPlacement`), so every row joins the every-buy universe. Without it —
 *  the fallback over the page's own dealings — we keep the old `isPurchase`
 *  guard, which for UK narrows to analyst-suggested rows. */
export function buildChannelPerformance(
  dealings: MarketDealing[],
  opts: { assumeBuys?: boolean } = {},
): ChannelPerformanceSummary {
  // Match the app: buys disclosed inside the window (inclusive lower bound,
  // no upper bound), carrying a live return. ISO dates sort lexicographically.
  const cutoff = isoDaysAgo(CHANNEL_WINDOW_DAYS);
  const buys = dealings.filter(
    (d) =>
      (opts.assumeBuys || d.isPurchase) &&
      returnOf(d) != null &&
      d.disclosedDate.slice(0, 10) >= cutoff,
  );

  // "Updated …" date: the most recent disclosure among the windowed buys,
  // matching the app's `lastUpdatedISO = max(disclosedDate)`.
  const lastUpdated = buys.reduce<string | null>((latest, d) => {
    const day = d.disclosedDate.slice(0, 10);

    if (!day) return latest;

    return latest == null || day > latest ? day : latest;
  }, null);

  // Headline: like the app, name the rated slice that beat the market by most
  // (every-buy when nothing rated stands out), then run the equal-weight mean
  // return + alpha across just that slice. This is what lifts the numbers above
  // a flat average of every buy.
  const headlineUniverse = pickHeadlineUniverse(buys);
  const headlineBuys = buys.filter((d) => inUniverse(d, headlineUniverse));

  const returns = headlineBuys.map((d) => returnOf(d)!).filter(Number.isFinite);
  const alphas = headlineBuys
    .map((d) => alphaOf(d))
    .filter((a): a is number => a != null && Number.isFinite(a));

  const picksReturnPct = mean(returns);
  const alphaPct = mean(alphas);
  const benchmarkReturnPct =
    picksReturnPct != null && alphaPct != null
      ? picksReturnPct - alphaPct
      : null;

  // How often the picks beat the market, not just by how much. Counted over
  // the same headline slice with a known alpha.
  const marketBeatTotal = alphas.length;
  const marketBeatCount = alphas.filter((a) => a > 0).length;

  // Top performers, iOS Highlights-style: winners only (a "top performers"
  // strip must never show a name underwater), at least a week old so a one-day
  // spike can't headline (relaxed when nothing qualifies), one row per ticker,
  // within the headline slice so the named picks match the headline number.
  const winners = headlineBuys.filter((d) => returnOf(d)! > 0);
  const ageCutoff = isoDaysAgo(MIN_DAYS_HELD_FOR_TOP);
  const seasoned = winners.filter(
    (d) => d.disclosedDate.slice(0, 10) <= ageCutoff,
  );
  const pool = seasoned.length > 0 ? seasoned : winners;
  const seenTickers = new Set<string>();
  const contributors: ChannelContributor[] = [];

  for (const d of [...pool].sort((a, b) => returnOf(b)! - returnOf(a)!)) {
    if (seenTickers.has(d.ticker)) continue;
    seenTickers.add(d.ticker);
    contributors.push({
      id: d.id,
      ticker: d.ticker,
      company: d.company,
      returnPct: returnOf(d)!,
      alphaPct: alphaOf(d),
    });
    if (contributors.length >= MAX_CONTRIBUTORS) break;
  }

  // Sector leaderboard by mean alpha.
  const bySector = new Map<string, number[]>();

  for (const d of buys) {
    const a = alphaOf(d);

    if (!d.sector || a == null || !Number.isFinite(a)) continue;
    const arr = bySector.get(d.sector) ?? [];

    arr.push(a);
    bySector.set(d.sector, arr);
  }

  const sectors: ChannelSector[] = [...bySector.entries()]
    .filter(([, arr]) => arr.length >= MIN_SECTOR_DEALS)
    .map(([sector, arr]) => ({
      sector,
      dealCount: arr.length,
      meanAlphaPct: mean(arr)!,
    }))
    .sort((a, b) => b.meanAlphaPct - a.meanAlphaPct)
    .slice(0, MAX_SECTORS);

  // Buy-style race.
  const byStyle = new Map<ChannelStyle["kind"], number[]>();

  for (const d of buys) {
    const kind = d.buyStyle?.kind;

    if (!kind) continue;
    const arr = byStyle.get(kind) ?? [];

    arr.push(returnOf(d)!);
    byStyle.set(kind, arr);
  }

  const styles: ChannelStyle[] = STYLE_ORDER.filter((k) => byStyle.has(k)).map(
    (kind) => {
      const arr = byStyle.get(kind)!;

      return { kind, dealCount: arr.length, meanReturnPct: mean(arr)! };
    },
  );

  return {
    sampleSize: headlineBuys.length,
    picksReturnPct,
    benchmarkReturnPct,
    alphaPct,
    marketBeatCount,
    marketBeatTotal,
    lastUpdated,
    headlineUniverse,
    contributors,
    sectors,
    styles,
  };
}

/** One row of the homepage Winners tab — everything the sentence card states.
 *  Distinct from ChannelContributor: winners name the person and the stake,
 *  because the card is a sentence about a director, not a ticker strip. */
export interface WinnerDealing {
  id: string;
  ticker: string;
  company: string;
  insiderName: string;
  insiderRole?: string;
  /** Trade value in the market's major currency unit. null when unpriced. */
  value: number | null;
  /** Since-disclosure return as a ratio (0.12 = +12%). Always > 0 here. */
  returnPct: number;
  /** Whole days since disclosure, clamped to ≥ 1. */
  daysHeld: number;
  /** ISO `YYYY-MM-DD` disclosure date. */
  disclosedDate: string;
  /** Whether a written analysis exists for this filing. Winners are chosen on
   *  price alone, and the biggest movers are often rows the triage pass
   *  skipped — so a card can't promise "read the analysis" without checking. */
  analysed: boolean;
}

/** Winners for the homepage tab: windowed buys with a positive live return,
 *  one per ticker, best first. Same seasoning rule as the contributors strip —
 *  a buy younger than MIN_DAYS_HELD_FOR_TOP can't make the list unless nothing
 *  older qualifies. Rows without a live return never qualify, so the list can
 *  only state figures it actually has. */
export function buildWinners(
  dealings: MarketDealing[],
  limit = 8,
): WinnerDealing[] {
  const cutoff = isoDaysAgo(CHANNEL_WINDOW_DAYS);
  const winners = dealings.filter((d) => {
    const r = returnOf(d);

    return r != null && r > 0 && d.disclosedDate.slice(0, 10) >= cutoff;
  });
  const ageCutoff = isoDaysAgo(MIN_DAYS_HELD_FOR_TOP);
  const seasoned = winners.filter(
    (d) => d.disclosedDate.slice(0, 10) <= ageCutoff,
  );
  const pool = seasoned.length > 0 ? seasoned : winners;
  const todayMs = Date.parse(new Date().toISOString().slice(0, 10));
  const seenTickers = new Set<string>();
  const out: WinnerDealing[] = [];

  for (const d of [...pool].sort((a, b) => returnOf(b)! - returnOf(a)!)) {
    if (seenTickers.has(d.ticker)) continue;
    seenTickers.add(d.ticker);
    const disclosedDate = d.disclosedDate.slice(0, 10);
    const daysHeld = Math.max(
      1,
      Math.floor((todayMs - Date.parse(disclosedDate)) / 86_400_000),
    );

    out.push({
      id: d.id,
      ticker: d.ticker,
      company: d.company,
      insiderName: d.insiderName,
      insiderRole: d.insiderRole,
      value: d.value,
      returnPct: returnOf(d)!,
      daysHeld,
      disclosedDate,
      analysed: d.rating != null,
    });
    if (out.length >= limit) break;
  }

  return out;
}

/** True when there's enough signal to bother showing the Performance tab. */
export function hasChannelPerformance(
  summary: ChannelPerformanceSummary | undefined,
): summary is ChannelPerformanceSummary {
  return !!summary && summary.sampleSize > 0;
}
