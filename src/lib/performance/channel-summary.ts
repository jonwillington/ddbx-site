// Channel performance summary — a lightweight, fetch-free read of the
// performance stats that the full /portfolio backtest computes in detail.
//
// The home page already holds every dealing in memory, and each one carries a
// server-precomputed `livePerformance` (return + alpha vs the market) plus a
// `buyStyle` tag. That's enough to mirror the four headline performance
// surfaces — picks-vs-benchmark alpha, top contributors, the sector
// leaderboard, and the contrarian/momentum style race — in the right-hand
// channel without a single extra request. The page stays the destination for
// the interactive backtest; the channel is the teaser that points at it (and,
// under discretion mode, at the app).

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
/** The channel mirrors the iOS Highlights digest, which is pinned to the last
 *  30 days by disclosure date (anchored to today). Windowing here is what makes
 *  the web numbers match the app — without it we'd average every loaded buy. */
const WINDOW_DAYS = 30;

/** ISO `YYYY-MM-DD` for the inclusive lower bound of the 30-day window. */
function windowCutoffISO(): string {
  const d = new Date();

  d.setDate(d.getDate() - WINDOW_DAYS);

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

/** Build the channel's performance summary from the dealings already loaded.
 *  Considers genuine buys only (`isPurchase`) that carry a live return. */
export function buildChannelPerformance(
  dealings: MarketDealing[],
): ChannelPerformanceSummary {
  // Match the app: buys disclosed in the last 30 days (inclusive lower bound,
  // no upper bound), carrying a live return. ISO dates sort lexicographically.
  const cutoff = windowCutoffISO();
  const buys = dealings.filter(
    (d) =>
      d.isPurchase &&
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

  // Top contributors by since-disclosure return, within the headline slice so
  // the named picks match the headline number.
  const contributors: ChannelContributor[] = [...headlineBuys]
    .sort((a, b) => returnOf(b)! - returnOf(a)!)
    .slice(0, MAX_CONTRIBUTORS)
    .map((d) => ({
      id: d.id,
      ticker: d.ticker,
      company: d.company,
      returnPct: returnOf(d)!,
      alphaPct: alphaOf(d),
    }));

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

/** True when there's enough signal to bother showing the Performance tab. */
export function hasChannelPerformance(
  summary: ChannelPerformanceSummary | undefined,
): summary is ChannelPerformanceSummary {
  return !!summary && summary.sampleSize > 0;
}
