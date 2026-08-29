// Conversion-focused app-install landing pages — one per market × platform:
//   /download            /download/ios            /download/android      (UK)
//   /us/download         /us/download/ios         /us/download/android   (US)
//
// The bare `/download` route sniffs the visitor's device and renders that
// platform; the explicit /ios and /android routes force one, which is what ad
// campaigns and store-specific SEO need to land on. Market still resolves the
// way it does everywhere else on the site — host- and path-aware via
// `marketForPath` — so ddbx.us/download is the US page without a /us prefix.
//
// Single job: get the visitor to install and start the free trial. Intentionally
// PUBLIC and ungated — it does NOT import @/lib/discretion, so the winner proof
// is always shown in full (the data is the hook here). Returns are shown, so the
// page carries a past-performance / not-advice note.
//
// The page is built to ship BEFORE the app screenshots exist: every screen slot
// falls back to a styled placeholder (see @/lib/app-screenshots and
// `DeviceFrame`), so dropping PNGs into public/app-shots/ lights it up with no
// code change.
//
// LOCALES. The same component serves /download (English) and /zh-hk/download
// (Traditional Chinese, UK app only). Every string on the page comes from
// @/lib/download/copy — market copy via `landingCopy`, page furniture via the
// `DownloadCopyProvider` the child components read. The provider wraps
// DefaultLayout rather than sitting inside it, so the layout's floating mobile
// install bar — this page's primary tap target on a phone — is localised too.
import type { Stat } from "@/components/download/stat-band";
import type { AppPlatform } from "@/lib/app-screenshots";
import type {
  DownloadLocale,
  LandingCopy,
  StatNouns,
} from "@/lib/download/copy";
import type { Analysis, Dealing, UsDealing, UsReporter } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { StoreBadgeImg } from "@/components/app-store-badge";
import {
  BUTTON_FILLED,
  BUTTON_GHOST,
  BUTTON_RADIUS,
} from "@/components/button";
import { CompanyLogo } from "@/components/company-logo";
import { AppTour } from "@/components/download/app-tour";
import { DownloadFaq } from "@/components/download/download-faq";
import { DownloadRail } from "@/components/download/download-rail";
import {
  DownloadHero,
  StoreUnavailable,
} from "@/components/download/download-hero";
import { IncludedList, PricingCard } from "@/components/download/pricing-card";
import { QrInstall } from "@/components/download/qr-install";
import { CountUp, Reveal } from "@/components/download/reveal";
import { SectionHeader } from "@/components/download/section-header";
import { StatBand } from "@/components/download/stat-band";
import { StoreButtons } from "@/components/store-buttons";
import { FULL_BLEED } from "@/components/full-bleed";
import DefaultLayout from "@/layouts/default";
import { api } from "@/lib/api";
import { STORE_LABEL } from "@/lib/app-screenshots";
import {
  APP_STORE_URLS,
  PLAY_STORE_URLS,
  appStoreUrlForMarketId,
  playStoreUrlForMarketId,
  storeUrlForMarketId,
} from "@/lib/app-store";
import { displayCompany } from "@/lib/display-name";
import {
  altLocalePath,
  CHROME,
  DownloadCopyProvider,
  hasLocale,
  landingCopy,
  localeForPath,
  useDownloadCopy,
} from "@/lib/download/copy";
import { marketForPath } from "@/lib/markets/registry";
import { PRICING } from "@/lib/pricing";
import { useDevicePlatform } from "@/lib/use-device-platform";

type MarketId = "uk" | "us";

/** The page's one section box. Shared verbatim with `pages/api.tsx` — the two
 *  pages use the same `SectionHeader` grammar and must sit on the same grid. */
const SECTION = "mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20";

// Credibility guardrails for the winners wall. The wall is social proof, so it
// must read as "smart money", not a penny-stock pump screen.
//   - Returns outside [MIN, MAX] are dropped: < MIN isn't a compelling "winner";
//     > MAX is almost always a data glitch (illiquid micro-cap, unadjusted
//     split) and a +4000% next to a chart torpedoes trust.
//   - Sub-floor share prices are excluded — penny/sub-dollar names have
//     unreliable cached prices and aren't a credible insider signal.
const MIN_RETURN_PCT = 5;
const MAX_RETURN_PCT = 300;
const US_PRICE_FLOOR_USD = 1;
const UK_PRICE_FLOOR_GBP = 0.05;
/** Pull a bigger shortlist than we show, then keep the best survivors after the
 *  chart-bar recompute drops any whose price history contradicts the headline. */
const WINNERS_SHORTLIST = 18;
const WINNERS_SHOWN = 6;
/** History window the stat band is computed over. Wide enough that a quiet
 *  fortnight doesn't make the numbers look thin. */
const STATS_WINDOW_DAYS = 90;

/** Whole-pound / whole-dollar money, in the reader's locale. Built per load
 *  rather than at module scope because the locale is a property of the route
 *  now, not of the bundle. */
function moneyFormatter(lang: string, currency: "GBP" | "USD") {
  return new Intl.NumberFormat(lang, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

/** `2026-07-24` -> `24 Jul 2026` / `2026年7月24日`. Falls back to the raw
 *  string rather than printing "Invalid Date" if the wire ever hands us
 *  something else.
 *
 *  Fixed to UTC: the wire dates are calendar days, not instants, so a reader
 *  west of London would otherwise see them a day early. */
function formatAsOf(iso: string, lang: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(d.getTime())) return iso;

  return new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** Ratings that count as "we flagged this" — everything above `routine`.
 *  Matches the Signal definition used across the site and the apps. */
const SIGNAL_RATINGS = new Set(["significant", "noteworthy", "minor"]);

function isSignal(analysis?: Analysis | null): boolean {
  return !!analysis?.rating && SIGNAL_RATINGS.has(analysis.rating);
}

// ---------------------------------------------------------------------------
// Data selection — normalised so the page is market-blind
// ---------------------------------------------------------------------------

/** A single winner card's data, normalised away from the per-market wire row so
 *  one `WinnerCard` renders both UK `Dealing`s and US `UsDealing`s. */
interface Winner {
  id: string;
  ticker: string;
  company: string;
  returnPct: number;
  asOf?: string | null;
  buyerName: string;
  buyerRole?: string;
  /** e.g. "Bought £4,071 of shares at £0.04" / "Bought $120,000 at $14.20". */
  metaLine: string;
  /** Trade date — the bars fetch anchors the trend line here. */
  tradeDate: string;
  bars?: { date: string; close: number }[];
  /** Index into `bars` of the first close on/after the trade date — the moment
   *  the director bought. Everything left of it is the run-up they bought into
   *  (drawn grey); everything right is the part that's actually the pitch. */
  buyIndex?: number;
}

/** ISO date `n` days before today (UTC date part). */
function isoDaysAgo(n: number): string {
  const t = new Date();

  t.setUTCDate(t.getUTCDate() - n);

  return t.toISOString().slice(0, 10);
}

/** Generic candidate-shortlist picker over any wire row. Prefers the last 30
 *  days; if that window is thin (markets go quiet), widens to 90 so the wall is
 *  never embarrassingly empty. Sorted by trade-anchored return, best first,
 *  deduped to one company. Excludes sub-`priceFloor` penny names (unreliable
 *  prices) and obviously-glitched returns. This is only a SHORTLIST — the final
 *  displayed return is recomputed from the chart bars (see the page effect) so
 *  the headline number and the trend line can never disagree. */
function pickWinners<T>(
  items: T[],
  want: number,
  cfg: {
    isBuy: (x: T) => boolean;
    getReturn: (x: T) => number | null | undefined;
    getPrice: (x: T) => number | null | undefined;
    getTicker: (x: T) => string;
    getTradeDate: (x: T) => string;
    toWinner: (x: T) => Winner;
  },
  priceFloor: number,
): Winner[] {
  const build = (windowDays: number): Winner[] => {
    const since = isoDaysAgo(windowDays);
    const ranked = items
      .filter((x) => {
        const r = cfg.getReturn(x);

        return (
          cfg.isBuy(x) &&
          cfg.getTradeDate(x) >= since &&
          (cfg.getPrice(x) ?? 0) >= priceFloor &&
          typeof r === "number" &&
          r > MIN_RETURN_PCT &&
          r <= MAX_RETURN_PCT
        );
      })
      .sort(
        (a, b) => (cfg.getReturn(b) as number) - (cfg.getReturn(a) as number),
      );

    const seen = new Set<string>();
    const out: Winner[] = [];

    for (const x of ranked) {
      const key = cfg.getTicker(x).toUpperCase();

      if (seen.has(key)) continue;
      seen.add(key);
      out.push(cfg.toWinner(x));
    }

    return out;
  };

  const recent = build(30);

  if (recent.length >= Math.min(want, 4)) return recent.slice(0, want);

  return build(90).slice(0, want);
}

/** The three numbers in the stat band, computed from the SAME feed the winners
 *  come from — one request, and nothing hand-typed. See `StatBand` for why that
 *  matters. */
function feedStats<T>(
  items: T[],
  cfg: {
    getDisclosedDate: (x: T) => string;
    getTicker: (x: T) => string;
    getAnalysis: (x: T) => Analysis | null | undefined;
  },
  nouns: StatNouns,
): Stat[] {
  const since30 = isoDaysAgo(30);
  const last30 = items.filter((x) => cfg.getDisclosedDate(x) >= since30);
  const companies = new Set(
    items.map((x) => cfg.getTicker(x).toUpperCase()).filter(Boolean),
  );
  const signal = items.filter((x) => isSignal(cfg.getAnalysis(x))).length;

  return [
    { ...nouns.filings, value: last30.length },
    { ...nouns.companies, value: companies.size },
    { ...nouns.signal, value: signal },
  ].filter((s) => s.value > 0);
}

interface MarketData {
  winners: Winner[];
  stats: Stat[];
}

/** What a loader needs from the locale: the market's own prose (stat nouns,
 *  the winner card's "bought" sentence) and the tag its numbers format under. */
interface LoadCtx {
  copy: LandingCopy;
  lang: string;
}

async function loadUk(want: number, ctx: LoadCtx): Promise<MarketData> {
  const dealings = await api.dealingsWindow(
    isoDaysAgo(STATS_WINDOW_DAYS),
    1000,
  );
  const gbp0 = moneyFormatter(ctx.lang, "GBP");

  return {
    winners: pickWinners<Dealing>(
      dealings,
      want,
      {
        isBuy: (d) => d.tx_type === "buy" && d.is_open_market_buy !== false,
        getReturn: (d) => d.live_performance?.return_pct_trade,
        getPrice: (d) => d.price_pence / 100,
        getTicker: (d) => d.ticker,
        getTradeDate: (d) => d.trade_date,
        toWinner: (d) => ({
          id: d.id,
          ticker: d.ticker,
          company: displayCompany(d.company, d.ticker),
          returnPct: d.live_performance!.return_pct_trade as number,
          asOf: d.live_performance?.as_of,
          buyerName: d.director.name,
          buyerRole: d.director.role || undefined,
          metaLine: ctx.copy.boughtShares(
            gbp0.format(d.value_gbp),
            `£${(d.price_pence / 100).toFixed(2)}`,
          ),
          tradeDate: d.trade_date,
        }),
      },
      UK_PRICE_FLOOR_GBP,
    ),
    stats: feedStats<Dealing>(
      dealings,
      {
        getDisclosedDate: (d) => d.disclosed_date,
        getTicker: (d) => d.ticker,
        getAnalysis: (d) => d.analysis,
      },
      ctx.copy.statNouns(STATS_WINDOW_DAYS),
    ),
  };
}

/** Flatten a US reporter's multi-checkbox roles into one short label. */
function usRoleLabel(r: UsReporter): string | undefined {
  if (r.officer_title) return r.officer_title;
  if (r.roles.includes("officer")) return "Officer";
  if (r.roles.includes("director")) return "Director";
  if (r.roles.includes("ten_percent_owner")) return "10% owner";

  return undefined;
}

/** The US market has no non-English edition (see lib/download/copy), so the
 *  share-count fallback below stays an English sentence rather than earning a
 *  slot in `LandingCopy` that only one locale would ever fill. */
function usMetaLine(
  d: UsDealing,
  copy: LandingCopy,
  usd0: Intl.NumberFormat,
): string {
  if (d.value != null && d.price != null) {
    return copy.boughtShares(usd0.format(d.value), `$${d.price.toFixed(2)}`);
  }

  return `Bought ${d.shares.toLocaleString("en-US")} shares`;
}

async function loadUs(want: number, ctx: LoadCtx): Promise<MarketData> {
  const { dealings } = await api.usDealings({
    view: "all",
    since: isoDaysAgo(STATS_WINDOW_DAYS),
    // Without an explicit limit the endpoint caps at its 200-row default, so
    // the `since` window silently truncated to whatever the newest 200 Form 4
    // rows covered — a few days, not 90. That left six candidate tickers, of
    // which only two survived the price-history recompute, and the wall
    // rendered two cards. 1000 is the endpoint's ceiling; UK already asks for
    // the same via dealingsWindow.
    limit: 1000,
  });
  const usd0 = moneyFormatter(ctx.lang, "USD");

  return {
    winners: pickWinners<UsDealing>(
      dealings,
      want,
      {
        // Form 4 code "P" + acquired = an open-market purchase by an insider.
        isBuy: (d) => d.transaction_code === "P" && d.acquired_disposed === "A",
        getReturn: (d) => d.live_performance?.return_pct_trade,
        getPrice: (d) => d.price,
        getTicker: (d) => d.ticker,
        getTradeDate: (d) => d.trade_date,
        toWinner: (d) => ({
          id: d.id,
          ticker: d.ticker,
          company: d.company,
          returnPct: d.live_performance!.return_pct_trade as number,
          asOf: d.live_performance?.as_of,
          buyerName: d.reporter.name,
          buyerRole: usRoleLabel(d.reporter),
          metaLine: usMetaLine(d, ctx.copy, usd0),
          tradeDate: d.trade_date,
        }),
      },
      US_PRICE_FLOOR_USD,
    ),
    stats: feedStats<UsDealing>(
      dealings,
      {
        getDisclosedDate: (d) => d.disclosed_date,
        getTicker: (d) => d.ticker,
        getAnalysis: (d) => d.analysis,
      },
      ctx.copy.statNouns(STATS_WINDOW_DAYS),
    ),
  };
}

// ---------------------------------------------------------------------------
// Trend chart — the "going up" line
// ---------------------------------------------------------------------------

/** Area-filled trend line, rebased to 0% at the CLOSE ON THE DAY OF THE BUY, so
 *  the zero line is literally the price the director paid.
 *
 *  The chart is deliberately two-toned. A line that simply starts at the buy
 *  can't show that the buy was a decision — it looks like the stock was born
 *  the day we started drawing it. So the run-up *into* the purchase is drawn as
 *  a flat grey lead-in, the buy is marked, and only the part that happened
 *  after the director committed their own money carries colour and fill. That's
 *  the claim the card is making, drawn rather than asserted.
 *
 *  Pure SVG, no axes — it's a feeling, not a dashboard. `preserveAspectRatio`
 *  is off, so the viewBox stretches horizontally by however much the card is
 *  wider than 320px. Strokes escape that with `vectorEffect`; the buy marker
 *  can't (SVG has no non-scaling radius), so it's an HTML dot positioned in
 *  percentages over the chart instead — round at every card width, where the
 *  ellipse it replaced was only round if the card happened to be exactly as
 *  many times wider than the viewBox as the viewBox is wide relative to tall. */
function TrendChart({
  bars,
  buyIndex = 0,
  id,
}: {
  bars: { date: string; close: number }[];
  buyIndex?: number;
  id: string;
}) {
  const layout = useMemo(() => {
    if (!bars || bars.length < 2) return null;
    const w = 320;
    const h = 96;
    const pad = 5;
    // Clamp: a corrupt index must never produce a NaN path.
    const bi = Math.min(Math.max(buyIndex, 0), bars.length - 1);
    const base = bars[bi].close;

    if (!base) return null;
    const pct = bars.map((b) => ((b.close - base) / base) * 100);
    const min = Math.min(...pct, 0);
    const max = Math.max(...pct, 0);
    const range = Math.max(max - min, 1);
    const pts = pct.map((p, i) => {
      const x = pad + (i / (pct.length - 1)) * (w - 2 * pad);
      const y = pad + (1 - (p - min) / range) * (h - 2 * pad);

      return [x, y] as const;
    });
    const path = (from: number, to: number) =>
      pts
        .slice(from, to + 1)
        .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
        .join(" ");

    // The lead-in stops ON the buy point so the two strokes meet with no gap.
    const pre = bi > 0 ? path(0, bi) : null;
    const post = path(bi, pts.length - 1);
    // Fill only under the post-buy leg — the grey lead-in is context, and
    // filling it would give the run-up the same visual weight as the result.
    const postArea = `${post} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[bi][0].toFixed(1)},${h} Z`;
    const up = pct[pct.length - 1] >= 0;

    return { w, h, pre, post, postArea, up, buy: pts[bi] };
  }, [bars, buyIndex]);

  if (!layout) {
    return <div aria-hidden className="h-[96px] w-full" />;
  }

  const { w, h, pre, post, postArea, up, buy } = layout;
  // Applied via `style`, not as presentation attributes: a var() reference is
  // only reliably substituted in a CSS declaration, and inline style is one.
  const color = up ? "var(--positive)" : "var(--negative)";

  return (
    <div className="relative">
      <svg
        aria-hidden="true"
        className="block w-full"
        height={h}
        preserveAspectRatio="none"
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
      >
        <defs>
          <linearGradient id={`tg-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.22 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        <path d={postArea} fill={`url(#tg-${id})`} />

        {/* Before the buy — grey, unfilled, quiet. */}
        {pre ? (
          <path
            className="text-ink/25 dark:text-white/25"
            d={pre}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        {/* The buy itself, part one: a hairline dropped to the baseline. */}
        {pre ? (
          <line
            className="text-ink/20 dark:text-white/20"
            stroke="currentColor"
            strokeDasharray="3 3"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            x1={buy[0]}
            x2={buy[0]}
            y1={buy[1]}
            y2={h}
          />
        ) : null}

        {/* After the buy — the pitch. */}
        <path
          d={post}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          style={{ stroke: color }}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Part two: the ringed dot on the buy point. HTML rather than an SVG
          circle, positioned in percentages of the same viewBox coordinates the
          path uses — the horizontal stretch moves it to the right place and
          leaves its size alone, so it's round on a 260px card and a 420px one. */}
      {pre ? (
        <span
          aria-hidden
          className="absolute h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white dark:bg-ink"
          style={{
            left: `${(buy[0] / w) * 100}%`,
            top: `${(buy[1] / h) * 100}%`,
            borderColor: color,
          }}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Winner card
// ---------------------------------------------------------------------------

function WinnerCard({
  winner,
  appUrl,
  gaPrefix,
  delay,
}: {
  winner: Winner;
  appUrl: string;
  gaPrefix: string;
  delay: number;
}) {
  const { ticker, company, returnPct, asOf, buyerName, buyerRole, metaLine } =
    winner;
  const t = useDownloadCopy();

  // h-full on both the wrapper and the card: <Reveal> is the grid item, so
  // without it the card stops at its own content height and the "View analysis"
  // buttons stop lining up across a row.
  return (
    <Reveal className="h-full" delay={delay}>
      <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-hairline bg-white/70 p-5 shadow-sm transition-shadow hover:shadow-md dark:border-border/60 dark:bg-surface-secondary/40">
        <div className="flex items-center gap-3">
          <CompanyLogo size={40} ticker={ticker} />
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{company}</p>
            <p className="truncate text-xs text-foreground/50">{ticker}</p>
          </div>
          <div className="ml-auto text-right">
            {/* Counts up on scroll — the number IS the pitch, so it earns the
                extra beat of attention that motion buys. */}
            <p className="text-2xl font-semibold text-positive">
              <CountUp decimals={1} prefix="+" suffix="%" value={returnPct} />
            </p>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/45">
              {t.sinceTheBuy}
            </p>
          </div>
        </div>

        <div className="my-4">
          {winner.bars ? (
            <TrendChart
              bars={winner.bars}
              buyIndex={winner.buyIndex}
              id={winner.id}
            />
          ) : (
            <div aria-hidden className="h-[96px] w-full" />
          )}
          {/* Reads the two-tone line for anyone who doesn't infer it. Only
              shown when there IS a grey leg to explain. */}
          {winner.bars && (winner.buyIndex ?? 0) > 0 ? (
            <p className="mt-2 flex items-center gap-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/40">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-px w-3.5 bg-foreground/30" />
                {t.legendBefore}
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-[2px] w-3.5 rounded-full bg-positive"
                />
                {t.legendAfter}
              </span>
            </p>
          ) : null}
        </div>

        <p className="text-sm text-foreground/70">
          <span className="font-medium text-foreground/90">{buyerName}</span>
          {buyerRole ? (
            <span className="text-foreground/55"> · {buyerRole}</span>
          ) : null}
        </p>
        <p className="mt-1 text-sm text-foreground/55">{metaLine}</p>
        {asOf ? (
          <p className="mt-2 text-[11px] text-foreground/40">
            {t.pricesAsOf(formatAsOf(asOf, t.lang))}
          </p>
        ) : null}

        {/* The full analysis (the "why") lives in the app — this nudges the tap.
            Labelled per-ticker so GA shows which winners pull installs.
            `mt-auto` on the wrapper pins it to the card's bottom edge, so the
            row's buttons align even when a director's role wraps to two lines. */}
        <div className="mt-auto pt-4">
          <a
            className={`inline-flex items-center gap-1.5 ${BUTTON_RADIUS} ${BUTTON_GHOST} px-3.5 py-2 text-[13px] font-medium transition-colors`}
            data-ga-event="cta_download_lp"
            data-ga-label={`${gaPrefix} card analysis · ${ticker}`}
            href={appUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {t.viewAnalysis}
            <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// Per-market config
// ---------------------------------------------------------------------------

/** A market's page: its prose (from the locale dictionary) plus the three
 *  things that are structural rather than editorial. */
interface LandingConfig extends LandingCopy {
  marketId: MarketId;
  gaPrefix: string;
  load: (want: number, ctx: LoadCtx) => Promise<MarketData>;
}

/** Everything about a market that is NOT copy. Kept apart from the dictionary
 *  so adding a language never means restating which loader a market uses. */
const MARKET_SHELL: Record<
  MarketId,
  {
    gaPrefix: string;
    load: (want: number, ctx: LoadCtx) => Promise<MarketData>;
  }
> = {
  uk: { gaPrefix: "LP", load: loadUk },
  us: { gaPrefix: "LP US", load: loadUs },
};

function configFor(locale: DownloadLocale, market: MarketId): LandingConfig {
  return {
    marketId: market,
    ...MARKET_SHELL[market],
    ...landingCopy(locale, market),
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DownloadPage({
  /** Set by the /download/ios and /download/android routes. Omitted on the bare
   *  /download route, which falls back to sniffing the device (and to iOS on
   *  desktop, where there's nothing to sniff and the App Store is the larger
   *  listing). */
  platform: forcedPlatform,
}: {
  platform?: AppPlatform;
} = {}) {
  // Resolve the market the same way the rest of the site does — host- and
  // path-aware (ddbx.us -> US, ddbx.uk -> UK; the /us/download route forces US
  // on any host). A fixed per-route prop would show UK content on the US host.
  const { pathname } = useLocation();
  const market: MarketId = marketForPath(pathname).id === "us" ? "us" : "uk";
  // The /zh-hk prefix is the only thing that selects a language — never an
  // Accept-Language sniff, which would make the English URL non-deterministic
  // for crawlers and give the reader no link to share. `hasLocale` is the guard
  // for the one case the routes can't prevent: ddbx.us resolves every path to
  // the US market, and there is no Chinese US edition, so a Chinese route
  // reached on that host falls back to English rather than rendering English
  // prose inside a zh-HK document.
  const requested = localeForPath(pathname);
  const locale: DownloadLocale = hasLocale(requested, market)
    ? requested
    : "en";
  const t = CHROME[locale];
  // Memoised because the fetch effect below keys on it: `configFor` builds a
  // fresh object every call, so an unmemoised value would re-run the load on
  // every render, forever.
  const cfg = useMemo(() => configFor(locale, market), [locale, market]);
  const detected = useDevicePlatform();
  const platform: AppPlatform = forcedPlatform ?? detected ?? "ios";
  const pricing = PRICING[market];

  // The store this exact market × platform pair installs from. `undefined`
  // means we don't have a listing yet (US on Google Play) — the page then runs
  // in "not yet" mode rather than linking somewhere misleading.
  const storeHref =
    platform === "android"
      ? playStoreUrlForMarketId(market)
      : appStoreUrlForMarketId(market);
  const available = !!storeHref;

  // Where the winner cards' "View analysis" links go: the visitor's real store
  // if there is one, otherwise this market's own App Store listing — right
  // product even when it's the wrong platform. Never another market's app.
  const cardAppUrl =
    storeHref ??
    storeUrlForMarketId(market, detected) ??
    appStoreUrlForMarketId(market) ??
    APP_STORE_URLS.uk;

  // The sibling-platform page keeps the reader's language: an /zh-hk visitor
  // told "there's an Android version" must not be dropped onto the English one.
  const prefix = `${locale === "zh-HK" ? "/zh-hk" : ""}${market === "us" ? "/us" : ""}`;
  const otherPath = `${prefix}/download/${platform === "ios" ? "android" : "ios"}`;
  // The same page in the other language, platform preserved. Null for US,
  // which has no Chinese edition — the link is simply not rendered there.
  const altPath = altLocalePath(pathname, market);

  // `<html lang>` for client-side navigations. functions/_middleware.js already
  // stamps the right value on the served shell, but a React-Router move from
  // /download to /zh-hk/download never touches the document — leaving a page of
  // Chinese declared as English to screen readers and to translation prompts.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.lang;

    root.lang = t.lang;

    return () => {
      root.lang = previous;
    };
  }, [t.lang]);

  const [data, setData] = useState<MarketData | null>(null);

  useEffect(() => {
    let live = true;

    setData(null);
    (async () => {
      try {
        // One feed fetch powers the winners shortlist, the stat band and the
        // hero's live count; only the price histories are extra requests.
        const loaded = await cfg.load(WINNERS_SHORTLIST, {
          copy: cfg,
          lang: t.lang,
        });

        if (!live) return;

        const withBars = await Promise.all(
          loaded.winners.map(async (wn) => {
            try {
              // 120d covers trades up to the 90d fallback window plus a buffer.
              const raw = await api.priceHistory(wn.ticker, 120);
              const all = raw.map((b) => ({
                date: b.date,
                close: b.close_pence,
              }));
              const firstAfter = all.findIndex((b) => b.date >= wn.tradeDate);

              if (firstAfter < 0) return null;
              const post = all.slice(firstAfter);

              if (post.length < 2) return null;

              // Show a lead-in *into* the buy, but never let it dominate: the
              // card is selling what happened after, so the grey run-up is
              // capped at roughly half the post-buy span (and at least a
              // fortnight of trading, so the marker isn't jammed against the
              // left edge on a very recent buy).
              const leadIn = Math.min(
                firstAfter,
                Math.max(10, Math.round(post.length * 0.5)),
              );
              const bars = all.slice(firstAfter - leadIn);
              const buyIndex = leadIn;
              const base = bars[buyIndex].close;
              const last = bars[bars.length - 1].close;

              if (!base) return null;
              // Recompute the headline return from the SAME bars the chart
              // draws (trade-day close -> latest close) so the number and the
              // line are one measurement and can never contradict.
              const returnPct = ((last - base) / base) * 100;

              return { ...wn, bars, buyIndex, returnPct };
            } catch {
              return null;
            }
          }),
        );

        // Keep only credible, still-rising winners; show the best survivors.
        const winners = withBars
          .flatMap((w) => (w ? [w] : []))
          .filter(
            (w) =>
              w.returnPct >= MIN_RETURN_PCT && w.returnPct <= MAX_RETURN_PCT,
          )
          .sort((a, b) => b.returnPct - a.returnPct)
          .slice(0, WINNERS_SHOWN);

        if (live) setData({ ...loaded, winners });
      } catch {
        if (live) setData({ winners: [], stats: [] });
      }
    })();

    return () => {
      live = false;
    };
  }, [cfg, t.lang]);

  return (
    // The provider wraps DefaultLayout rather than sitting inside it: the
    // layout renders the floating mobile install bar, which is the one tappable
    // CTA on a phone and has to speak the page's language.
    <DownloadCopyProvider value={t}>
      {/* drawerRight reserves lg:mr-80 for the fixed install rail — the same
          pairing every other page in the section uses. The FULL_BLEED bands
          below stay correct inside it: the band's centre lands on the narrowed
          column's centre, its left overhang is clipped by the layout root and
          its right runs under the rail (see /company/:key, which does the
          same). */}
      <DefaultLayout drawerRight>
        <DownloadRail
          gaLabel={cfg.gaPrefix}
          marketId={cfg.marketId}
          platform={platform}
        />

        <DownloadHero
          altLocale={
            altPath
              ? {
                  href: altPath,
                  label: t.altLocaleLabel,
                  // The label is written in the language it links TO, so the
                  // tag is the OTHER locale's, not this page's.
                  lang: CHROME[locale === "zh-HK" ? "en" : "zh-HK"].lang,
                }
              : undefined
          }
          gaLabel={cfg.gaPrefix}
          headline={cfg.heroHeadline}
          marketId={cfg.marketId}
          platform={platform}
          storeHref={storeHref}
          sub={cfg.heroSub}
          trialDays={pricing.trialDays}
          unavailableSlot={
            <StoreUnavailable
              alternatives={[
                {
                  label: t.storeUnavailableAlts.us,
                  href: APP_STORE_URLS.us,
                  gaLabel: "US Android → US iOS",
                },
                {
                  label: t.storeUnavailableAlts.uk,
                  href: PLAY_STORE_URLS.uk,
                  gaLabel: "US Android → UK Play",
                },
              ]}
              message={t.storeUnavailable}
            />
          }
        />

        {data && data.stats.length > 0 ? (
          <StatBand sourceLine={cfg.sourceLine} stats={data.stats} />
        ) : null}

        <AppTour
          beats={cfg.beats}
          heading={cfg.tourHeading}
          index={1}
          kicker={t.tourKicker}
          marketId={cfg.marketId}
          platform={platform}
          sub={cfg.tourSub}
          total={4}
        />

        {/* ---- Winners wall ----
             Full-bleed: the cream band is the page changing surface under you,
             not a card sitting on it. */}
        <section
          className={`${FULL_BLEED} border-y border-hairline bg-sheet dark:border-border/50 dark:bg-surface-secondary/20`}
        >
          <div className={SECTION}>
            <SectionHeader
              index={2}
              kicker={cfg.proofKicker}
              sub={cfg.winnersSub}
              title={cfg.winnersHeading}
              total={4}
            />

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data === null
                ? Array.from({ length: 6 }, (_, i) => (
                    <div
                      key={i}
                      className="h-[280px] animate-pulse rounded-3xl border border-hairline bg-white/40 dark:border-border/60 dark:bg-surface-secondary/30"
                    />
                  ))
                : data.winners.map((w, i) => (
                    <WinnerCard
                      key={w.id}
                      appUrl={cardAppUrl}
                      delay={(i % 3) * 90}
                      gaPrefix={cfg.gaPrefix}
                      winner={w}
                    />
                  ))}
            </div>

            {available && data && data.winners.length > 0 ? (
              <Reveal className="mt-12 flex flex-col items-center gap-2.5">
                <StoreButtons
                  buttonClassName={`inline-flex items-center justify-center gap-2.5 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-7 py-3.5 text-base font-semibold shadow-md transition-[background-color,box-shadow] hover:shadow-lg`}
                  gaEvent="cta_download_lp"
                  gaLabel={`${cfg.gaPrefix} winners`}
                  glyphClassName="h-[17px] w-[17px] shrink-0"
                  marketId={cfg.marketId}
                  platform={platform}
                />
                <p className="text-sm text-foreground/55">
                  {cfg.winnersCtaSub(pricing.trialDays)}
                </p>
              </Reveal>
            ) : null}
          </div>
        </section>

        {/* ---- Price + objections ----
             Two columns from lg: the card on the left, what it buys on the
             right. Stacked, the card was a narrow ribbon down the left of an
             otherwise empty screen with a nine-item list trailing off it. */}
        <section className={SECTION}>
          <SectionHeader
            index={3}
            kicker={t.priceKicker}
            sub={t.priceSub}
            title={t.priceTitle}
            total={4}
          />

          <div className="mt-10 grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <PricingCard pricing={pricing} storeLabel={STORE_LABEL[platform]} />
            <IncludedList benefits={cfg.benefits} />
          </div>

          {/* Answers, not a wall — kept to a readable measure rather than run
              out to the full two-column width above it. */}
          <div className="mt-16 max-w-3xl">
            <DownloadFaq
              items={t.faq({
                market,
                buyerNoun: cfg.buyerNoun,
                sourceLine: cfg.sourceLine,
                pricing,
                platform,
                otherPath,
              })}
            />
          </div>
        </section>

        {/* ---- Final CTA ---- */}
        <section
          className={`${FULL_BLEED} bg-ink text-white dark:bg-[oklch(17%_0.02_55)]`}
        >
          <div className={SECTION}>
            <SectionHeader
              align="center"
              index={4}
              kicker={t.getAppKicker}
              sub={cfg.finalSub(pricing.trialDays)}
              title={t.finalTitle(cfg.buyerNoun)}
              tone="dark"
              total={4}
            />

            <Reveal delay={120}>
              {/* One column, not a row. The badge block and the QR block have
                  no shared baseline and no matching height, so side by side
                  they read as two things that failed to line up. Centred: this
                  is the page's last word and there is nothing beside it to
                  align to. */}
              <div className="mt-10 flex flex-col items-center gap-8">
                {available ? (
                  <div className="flex flex-col items-center gap-3">
                    <a
                      aria-label={t.getOnStore(STORE_LABEL[platform])}
                      className="dl-lift inline-block"
                      data-ga-event="cta_download_lp"
                      data-ga-label={`${cfg.gaPrefix} footer · ${platform}`}
                      href={storeHref}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <StoreBadgeImg size="lg" store={platform} />
                    </a>
                    <p className="text-sm text-white/55">
                      {t.freeForDaysCancel(pricing.trialDays)}
                    </p>
                  </div>
                ) : null}

                {/* Desktop only: nothing on this page is tappable-to-install
                    on a laptop, and nobody retypes a URL on their phone. */}
                {available && detected === null ? (
                  <div className="hidden sm:block">
                    <QrInstall
                      caption={t.scanToOpen(STORE_LABEL[platform])}
                      captionClassName="text-white/55"
                      url={storeHref!}
                    />
                  </div>
                ) : null}
              </div>
            </Reveal>

            <p className="mx-auto mt-14 max-w-[64ch] text-center text-xs leading-relaxed text-white/35">
              {t.returnsDisclaimer(cfg.buyerNoun)}
            </p>
          </div>
        </section>
      </DefaultLayout>
    </DownloadCopyProvider>
  );
}
