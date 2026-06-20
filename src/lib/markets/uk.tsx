// UkMarket — the UK RNS director-dealings plugin for <MarketPage />.
// Mounted at `/` (and the static pages) via UkPreviewPage; the legacy
// dashboard.tsx retired in Phase 2. UK-specific behaviour (Opus analysis
// rendering, FTSE benchmark, discretion gating, metric-mode toggle,
// skipped-cluster collapsing, LSE-status empty state) all hang off this
// MarketConfig — the shell in `components/market/` is market-agnostic.

import type {
  GatingInfo,
  MarketConfig,
  MarketDealing,
  MarketStats,
  Tone,
} from "@/lib/markets/types";
import type { Dealing, TriageVerdict } from "@/types/ddbx";

import { useEffect, useState } from "react";
import { InformationCircleIcon as InformationCircleOutlineIcon } from "@heroicons/react/24/outline";

import { normalisedDisplayName, stripTickerSuffix } from "@/lib/display-name";
import { defaultRatingHeroFilters } from "@/lib/markets/types";
import { AnalysisSection } from "@/components/analysis-section";
import { BlurredAnalysisOverlay } from "@/components/discretion/blurred-analysis-overlay";
import { DUMMY_ANALYSIS } from "@/components/discretion/dummy-analysis";
import { MiniPriceChart } from "@/components/mini-price-chart";
import { PositionCard, type PriceFormat } from "@/components/position-card";
import { RatingBadge } from "@/components/rating-badge";
import { api } from "@/lib/api";
import { UK_BANK_HOLIDAYS_SOURCE } from "@/lib/bank-holidays";
import { isSuggestedDealing } from "@/lib/dealing-classify";
import { useDiscretion } from "@/lib/discretion";
import { LSE } from "@/lib/market-status";

const FTSE_TICKER = "^FTAS";
const FTSE_LABEL = "FTSE";

/** GBP formatter bundle. RNS price_pence is already in pence and matches
 *  what /api/prices stores for LSE tickers, so quoteToValue = 0.01 and
 *  normalizeLivePrice is identity. */
const GBP_FORMAT: PriceFormat = {
  // Adaptive precision: blue-chips quote in hundreds/thousands of pence where
  // whole pence is right, but penny stocks need decimals — otherwise a 4.5p
  // close rounds to "5p" and an entry of 4.0p reads as a +25% move when the
  // actual return is +12.5%. Mirrors the mini-chart's decimal scaling. Trailing
  // zeros are stripped so large prices stay clean (5000p, not 5000.0p).
  formatPrice: (n) => {
    const a = Math.abs(n);
    const decimals = a < 1 ? 3 : a < 10 ? 2 : a < 100 ? 1 : 0;

    return `${parseFloat(n.toFixed(decimals))}p`;
  },
  formatValue: (n) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(n),
  quoteToValue: 0.01,
};

/* ─── Wire → MarketDealing normalization ─────────────────────────────── */

function describeAction(d: Dealing): { label: string; tone: Tone } {
  // The UK pipeline runs a triage pass too, but the page-level signal is
  // tx_type + is_open_market_buy. We surface the underlying verb here so
  // the Today drawer and detail header read naturally.
  if (d.tx_type === "buy") {
    if (d.is_open_market_buy === false) {
      return { label: "Director award / scheme", tone: "grant" };
    }

    return { label: "Director purchase", tone: "buy" };
  }

  return { label: "Director sale", tone: "sell" };
}

export function toMarketDealing(d: Dealing): MarketDealing<Dealing> {
  const action = describeAction(d);

  return {
    key: d.id,
    id: d.id,
    ticker: d.ticker,
    company: stripTickerSuffix(normalisedDisplayName(d.company), d.ticker),
    insiderName: normalisedDisplayName(d.director.name),
    insiderRole: d.director.role,
    disclosedDate: d.disclosed_date || d.trade_date,
    tradeDate: d.trade_date,
    // The dashboard's mute rule is "didn't pass the analyst filter" — i.e.
    // isSuggestedDealing. Match it so muted rows look the same as today.
    isPurchase: isSuggestedDealing(d),
    value: d.value_gbp,
    entryPrice: d.price_pence,
    shares: d.shares,
    legCount: 1,
    rating: d.analysis?.rating,
    triageVerdict: d.triage?.verdict,
    checklist: d.analysis?.checklist,
    summary: d.analysis?.summary,
    sector: d.sector_normalized ?? undefined,
    confidence: d.analysis?.confidence,
    catalystWindow: d.analysis?.catalyst_window,
    cluster: d.cluster ?? null,
    buyStyle: d.buy_style ?? null,
    livePerformance: d.live_performance ?? null,
    actionLabel: action.label,
    actionTone: action.tone,
    raw: d,
  };
}

/* ─── Slot: RowActionCell (rating-only, mirrors UK row pattern) ──────── */

function UkRowActionCell({ dealing }: { dealing: MarketDealing<Dealing> }) {
  // Mirror UK's existing chip discipline: rating badge when an analysis is
  // attached, nothing otherwise. The market-row's muted state (driven by
  // isPurchase + rating) communicates "skipped / unanalysed" visually.
  if (!dealing.rating) {
    return <RatingBadge rating="skipped" />;
  }

  return <RatingBadge rating={dealing.rating} />;
}

/* ─── Slot: DetailPosition (entry / now / alpha + price chart) ──────── */

function UkDetailPosition({ dealing }: { dealing: MarketDealing<Dealing> }) {
  const d = dealing.raw;
  const ticker = d.ticker;
  const entryPrice = d.price_pence;
  const tradeDate = d.trade_date.slice(0, 10);
  // A buy the pipeline classified as not-open-market (award / scheme /
  // placing). The entry "price" wasn't paid at market, so the entry→now
  // return isn't a like-for-like gain. Mute the green "winner" framing and
  // explain why — same treatment as the iOS detail view (isPlacement).
  const isNonMarketBuy = d.is_open_market_buy === false;

  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [ftseEntry, setFtseEntry] = useState<number | null>(null);
  const [ftseCurrent, setFtseCurrent] = useState<number | null>(null);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;

    api
      .latestPrices([ticker, FTSE_TICKER])
      .then((rows) => {
        if (cancelled) return;
        const match = rows.find(
          (r) => r.ticker.toUpperCase() === ticker.toUpperCase(),
        );
        const ftse = rows.find((r) => r.ticker === FTSE_TICKER);

        setCurrentPrice(match?.price_pence ?? null);
        setFtseCurrent(ftse?.price_pence ?? null);
      })
      .catch(() => {
        if (!cancelled) setCurrentPrice(null);
      });

    return () => {
      cancelled = true;
    };
  }, [ticker]);

  useEffect(() => {
    let cancelled = false;

    api
      .priceHistory(FTSE_TICKER, 365)
      .then((bars) => {
        if (cancelled) return;
        const match = bars.find((b) => b.date === tradeDate);

        setFtseEntry(match?.close_pence ?? null);
      })
      .catch(() => {
        if (!cancelled) setFtseEntry(null);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  return (
    <div className="mb-4 space-y-4">
      {isNonMarketBuy && (
        <div
          className="flex gap-3 rounded-lg border border-blue-200/90 bg-blue-50/90 px-3.5 py-3 text-left dark:border-blue-900/50 dark:bg-blue-950/30"
          role="note"
        >
          <InformationCircleOutlineIcon
            aria-hidden
            className="w-5 h-5 shrink-0 text-blue-700 dark:text-blue-400 mt-0.5"
          />
          <p className="text-sm leading-relaxed text-blue-950/90 dark:text-blue-100/90">
            Non-market trade — the entry price reflects an award or scheme, not
            shares bought at market value, so the return below isn’t a
            like-for-like gain.
          </p>
        </div>
      )}
      {currentPrice != null && d.value_gbp != null && (
        <PositionCard
          benchmark={{
            entry: ftseEntry,
            current: ftseCurrent,
            label: FTSE_LABEL,
          }}
          current={currentPrice}
          entry={entryPrice}
          fmt={GBP_FORMAT}
          muted={isNonMarketBuy}
          originalValue={d.value_gbp}
          shares={d.shares}
        />
      )}
      <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] p-4">
        <MiniPriceChart
          disclosedDate={(d.disclosed_date || d.trade_date).slice(0, 10)}
          entryPrice={entryPrice}
          fmt={GBP_FORMAT}
          muted={isNonMarketBuy}
          tickerForApi={ticker}
          tickerForDisplay={ticker.replace(/\.L$/, "")}
          tradeDate={tradeDate}
        />
      </div>
    </div>
  );
}

/* ─── Slot: DetailBody (analysis or triage-only notice) ─────────────── */

const VERDICT_LABEL: Record<TriageVerdict, string> = {
  skip: "Skipped",
  maybe: "Maybe",
  promising: "Promising",
};

function UkTriageOnlyNotice({ triage }: { triage: Dealing["triage"] }) {
  // Mirrors DealingDetailPanel's TriageOnlyAnalysisNotice — small inline
  // version so we don't have to break apart that component yet. When the
  // dashboard.tsx fully retires we can move the canonical version here.
  const verdictLabel = triage?.verdict
    ? VERDICT_LABEL[triage.verdict]
    : "Screened";

  return (
    <div
      className="flex gap-3 rounded-lg border border-amber-200/90 bg-amber-50/95 px-3.5 py-3.5 text-left shadow-sm dark:border-amber-900/55 dark:bg-amber-950/35"
      role="note"
    >
      <InformationCircleOutlineIcon
        aria-hidden
        className="w-5 h-5 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
          No further analysis on this purchase
          <span className="font-normal font-mono text-xs text-amber-900/70 dark:text-amber-300/80 ml-2">
            ({verdictLabel})
          </span>
        </p>
        {triage?.reason ? (
          <p className="text-sm text-amber-950/95 dark:text-amber-100/90 mt-2 leading-relaxed">
            {triage.reason}
          </p>
        ) : (
          <p className="text-xs text-muted mt-2 italic">
            No triage explanation was stored for this purchase.
          </p>
        )}
      </div>
    </div>
  );
}

function UkDetailBody({ dealing }: { dealing: MarketDealing<Dealing> }) {
  const d = dealing.raw;
  const analysis = d.analysis;

  if (!analysis) return <UkTriageOnlyNotice triage={d.triage} />;

  return <AnalysisSection analysis={analysis} />;
}

/* ─── Slot: DummyDetailBody (gated drawer body) ──────────────────────── */

// Renders UkDetailBody but with the analysis replaced by a static stand-in.
// Behind the blur + overlay this just needs to look like real analysis at a
// glance — UkDetailBody handles the actual rendering.
function UkDummyDetailBody({ dealing }: { dealing: MarketDealing<Dealing> }) {
  const dummyDealing: MarketDealing<Dealing> = {
    ...dealing,
    raw: { ...dealing.raw, analysis: DUMMY_ANALYSIS },
  };

  return <UkDetailBody dealing={dummyDealing} />;
}

/* ─── Gating hook adapter ────────────────────────────────────────────── */

function useUkGating(): GatingInfo {
  const d = useDiscretion({ marketId: "uk", timeZone: LSE.timeZone });

  return {
    enabled: d.enabled,
    freeQuota: d.freeQuota,
    viewedCount: d.viewedCount,
    hasFullAccess: d.hasFullAccess,
    recordView: d.recordView,
  };
}

const UkAnalysisOverlay = () => (
  <BlurredAnalysisOverlay
    benefits={[
      "Full AI thesis, evidence, and risk breakdown on every filing",
      "Real-time alerts when a director buys",
      "Track each director's hit-rate across UK names",
    ]}
    body="You've used today's free web unlock. The app gives you the full breakdown on every UK filing."
  />
);

/* ─── MarketConfig ───────────────────────────────────────────────────── */

export const UkMarket: MarketConfig<Dealing> = {
  id: "uk",
  title: "UK director dealings (preview)",
  documentTitle: "ddbx · Director Dealings — UK Insider Transactions",
  heroHeadline: "Start following the money.",
  heroSubhead:
    "Every open-market share purchase by a UK company director, screened and rated the moment it's filed, so you catch the buys that matter as they land.",
  session: LSE,
  holidays: UK_BANK_HOLIDAYS_SOURCE,
  description: (
    <>
      LSE RNS-filed director purchases, screened by Opus into{" "}
      <strong className="text-foreground/75">Significant</strong>{" "}
      (high-conviction signals) and{" "}
      <strong className="text-foreground/75">Noteworthy</strong> (worth a look).{" "}
      <strong className="text-foreground/75">All</strong> shows every disclosed
      buy for spot-checking the noise floor.
    </>
  ),
  marketLabel: "UK",
  locale: "en-GB",
  priceFormat: GBP_FORMAT,
  // For LSE tickers /api/prices already stores pence (close_pence is literal
  // pence), and Dealing.price_pence is pence too, so the major unit on
  // MarketDealing.entryPrice is just pence — no conversion needed.
  normalizeLivePrice: (close_pence) => close_pence,
  benchmarkTicker: FTSE_TICKER,
  benchmarkLabel: FTSE_LABEL,
  columnHelp: {
    disclosed:
      "Date the dealing was announced to the market via an RNS filing.",
    ticker: "London Stock Exchange ticker (e.g. BARC.L).",
    company:
      "The company and the director (or other PDMR) who dealt in its shares.",
    value: "Total value of the trade in GBP.",
    trend:
      "Number of buys in this row, plus the share price's 1-year trend (trade date marked).",
    performance:
      "Share-price return since the trade — or alpha vs the FTSE All-Share when 'vs FTSE' is selected.",
    action: "Our analyst rating: significant, noteworthy, or skipped.",
  },
  formatTickerDisplay: (ticker) => ticker.replace(/\.L$/, ""),
  isRowMuted: (d) => !d.rating || !d.isPurchase,
  // Single view — UK doesn't have pipeline stages the way US does, so the
  // tab strip is hidden (MarketPage shows it only when len > 1).
  views: [{ id: "all", label: "All" }],
  defaultView: "all",
  heroFilters: defaultRatingHeroFilters<Dealing>(),
  defaultHeroFilter: "any",
  // Open on the full list rather than the curated Signal subset — readers see
  // every disclosure first and narrow to Signal themselves.
  defaultSignalFilter: "all",
  pollIntervalMs: 30_000,
  fetchNews: () => api.ukNews(),
  newsHeading: "UK market news",
  newsFooterNote:
    "Third-party headlines (FT, Reuters, BBC Business, Guardian Business); opens in a new tab.",
  async fetchDealings() {
    // api.dealings() unwraps to a flat Dealing[] (see lib/api.ts). UK loads
    // the whole list and lets the hero filter narrow client-side — matches
    // the live dashboard behaviour and keeps API surface unchanged.
    const all = await api.dealings();
    const stats: MarketStats = {
      total: all.length,
      viewCounts: { all: all.length },
      latestDisclosedLabel: (() => {
        if (all.length === 0) return undefined;
        const latest = all.reduce<string | null>((acc, d) => {
          const iso = d.disclosed_date || d.trade_date;

          if (!acc) return iso;

          return iso > acc ? iso : acc;
        }, null);

        return latest ? `Latest disclosure ${latest.slice(0, 10)}` : undefined;
      })(),
    };

    return { dealings: all.map(toMarketDealing), stats };
  },
  RowActionCell: UkRowActionCell,
  DetailBody: UkDetailBody,
  DetailPosition: UkDetailPosition,
  // Rows that didn't earn an Opus rating (or were rated routine-only) collapse
  // into a per-day cluster the user can expand. Mirrors the live dashboard's
  // "X analysed · Y skipped" split.
  isSkipped: (d) => !isSuggestedDealing(d.raw),
  // Fold multiple same-company buys disclosed on one day into a single
  // expandable cluster row — mirrors the iOS dashboard's ticker clustering so
  // a company several directors bought into reads as one row, not a wall.
  clusterByCompany: true,
  // Discretion gating: first drawer of the UK day is free; subsequent drawers
  // render the dummy body under a blur with a "use the app" overlay.
  useGating: useUkGating,
  supportsChannelPerformance: true,
  DummyDetailBody: UkDummyDetailBody,
  AnalysisOverlay: UkAnalysisOverlay,
  renderEmptyState: () => <>No UK disclosures stored yet.</>,
};
