import type {
  ChartMode,
  MarketConfig,
  MarketDealing,
  MarketStats,
  NewsPayload,
  SignalFilterValue,
} from "@/lib/markets/types";
import type { MonthlySummaryListItem } from "@/types/ddbx";

import { CalendarDaysIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { DailySummarySheet } from "./daily-summary-banner";
import { MarketChartModeToggle } from "./market-chart-mode-toggle";
import { MarketDetailDrawer } from "./market-detail-drawer";
import { MarketExplainerExperience } from "./market-explainer-experience";
import { MarketExplainerSheet } from "./market-explainer-sheet";
import { MarketFilterBar, type MarketViewMode } from "./market-filter-bar";
import { MarketHero } from "./market-hero";
import { MarketIntroBanner, useIntroDismissed } from "./market-intro-banner";
import {
  MarketClusterRow,
  MarketDayHeader,
  MarketDaySummaryRow,
  MarketRow,
  MarketRowHeader,
  MarketRowSkeleton,
  MemberClusterRow,
} from "./market-row";
import { type SparkBar } from "./market-row-spark";
import { MarketChannel } from "./market-channel";
import { MarketTodayEmpty } from "./market-today-empty";
import { MarketTodayHero } from "./market-today-hero";
import {
  bucketByMonth,
  buildUniversalFilters,
  compareByReturnDesc,
  computeRowMetric,
  groupByCompany,
  groupByPerson,
  latestPricesAsOf,
  livePerfValue,
  shortDate,
  todayKeyIso,
} from "./market-utils";

import {
  monthShort,
  monthSlug,
  slugToMonth,
} from "@/components/monthly/monthly-utils";
import { MonthlyRecapModal } from "@/components/monthly/monthly-recap-modal";
import { APP_STORE_URLS } from "@/lib/app-store";
import { buildChannelPerformance } from "@/lib/performance/channel-summary";
import { makeDummyDealing } from "@/components/discretion/dummy-row";
import { isSignalDealing } from "@/lib/markets/types";
import DefaultLayout from "@/layouts/default";
import { api } from "@/lib/api";
import {
  modeFromAxes,
  useDashboardMetricMode,
} from "@/lib/dashboard-metric-mode";
import { useDailySummaries } from "@/lib/markets/use-daily-summaries";
import {
  useSetUrlParams,
  useUrlFlag,
  useUrlParam,
} from "@/lib/use-url-overlay";

/** How many of today's skipped rows to show before the "Show all" toggle.
 *  A busy US Form 4 day can disclose dozens; the standalone Today block sits
 *  above the historical table, so without a cap it would push that table off
 *  the page. */
const TODAY_SKIPPED_CAP = 8;
/** Discretion mode: how many of the most recent disclosure days stay fully
 *  readable in the historical list. Older days blur behind fabricated rows. */
const REAL_HISTORY_DAYS = 2;
const FIRST_UNLOCK_CONFIRM =
  "Use today's free full analysis on this filing? You can unlock one full drawer per day on the web.";

/** The full shell that every market page mounts. Reads everything from
 *  MarketConfig — adding a new market means writing a new MarketConfig and
 *  pointing a route at `<MarketPage config={…} />`. Nothing in here should
 *  grow per-market branches. */
export function MarketPage<W>({
  config,
  selectedKey: selectedKeyProp,
  onSelectionChange,
}: {
  config: MarketConfig<W>;
  /** Optional controlled selection. When provided, MarketPage uses this
   *  instead of internal state and reports changes through
   *  onSelectionChange — lets a router-aware wrapper drive selection from
   *  the URL (e.g. /dealings/:id). */
  selectedKey?: string | null;
  onSelectionChange?: (key: string | null) => void;
}) {
  const [view, setView] = useState<string>(config.defaultView);
  const [viewMode, setViewMode] = useState<MarketViewMode>("chronological");
  const [search, setSearch] = useState("");
  const [dealings, setDealings] = useState<MarketDealing<W>[]>([]);
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  // Uncontrolled selection is URL-backed (`?deal=<key>`) so opening a dealing
  // deep-links, the back button closes the drawer, and GA logs each open. When
  // a parent controls selection (the /dealings/:id and director routes), it
  // owns the URL via the path and this param stays unused.
  const [urlDealKey, setUrlDealKey] = useUrlParam("deal");
  const setUrlParams = useSetUrlParams();
  const controlled = selectedKeyProp !== undefined;
  const selectedKey = controlled ? (selectedKeyProp ?? null) : urlDealKey;
  const setSelectedKey = useCallback(
    (key: string | null) => {
      if (!controlled) setUrlDealKey(key);
      onSelectionChange?.(key);
    },
    [controlled, onSelectionChange, setUrlDealKey],
  );
  const [openMonths, setOpenMonths] = useState<Set<string> | null>(null);
  /** Measured sticky filter-bar height (px). Used to keep month-header
   *  sticky offset vertically aligned at every breakpoint. */
  const [filterBarHeight, setFilterBarHeight] = useState(0);
  const filterBarRef = useRef<HTMLDivElement | null>(null);
  /** Expands the standalone "Also today" skipped block past TODAY_SKIPPED_CAP. */
  const [showAllTodaySkipped, setShowAllTodaySkipped] = useState(false);
  const [heroFilterId, setHeroFilterId] = useState<string | null>(
    config.defaultHeroFilter ?? config.heroFilters?.[0]?.id ?? null,
  );
  /** Top-level Signal/All filter. Composes with the Strength dropdown
   *  (heroFilterId): Signal narrows to rated rows, Strength narrows further
   *  inside Signal. When this is "all" the bar hides Strength entirely. */
  const [signalFilter, setSignalFilter] = useState<SignalFilterValue>(
    config.defaultSignalFilter ?? "signal",
  );
  /** Values for config-driven extra filter axes (e.g. Congress party), keyed
   *  by filter id. Seeded to each filter's "show everything" default. */
  const [extraFilterValues, setExtraFilterValues] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      (config.extraFilters ?? []).map((ef) => [ef.id, ef.defaultValue]),
    ),
  );
  /** When non-null, the daily-summary sheet is open for this date. URL-backed
   *  (`?day=YYYY-MM-DD`) so it deep-links and is tracked in GA. */
  const [openSummaryDate, setOpenSummaryDate] = useUrlParam("day");
  /** "What are we looking for?" explainer sheet, opened from the hero.
   *  URL-backed (`?panel=explainer`). */
  const [explainerOpen, setExplainerOpen] = useUrlFlag("panel", "explainer");
  /** Monthly recap modal, opened from the hero's "View the {month} report"
   *  CTA. The index is fetched on mount; an empty index hides the CTA, so the
   *  surface self-gates per market (UK-only today) without a config flag. */
  const [recapOpen, setRecapOpen] = useState(false);
  const [recapMonths, setRecapMonths] = useState<MonthlySummaryListItem[]>([]);
  /** Which month the recap modal should open at. Null → the latest. Set by the
   *  per-month "View Report" links so each opens its own month. */
  const [recapMonth, setRecapMonth] = useState<string | null>(null);

  // Global chart mode — drives the inline sparkline AND the right-most
  // Performance cell. Persisted in localStorage via the dashboard metric
  // mode hook (also gives us cross-tab sync). Replaces the older
  // per-market `useMetricMode`.
  const metric = useDashboardMetricMode(config.id);
  const chartMode: ChartMode = useMemo(
    () => ({ axis: metric.comparison, anchor: metric.anchor }),
    [metric.comparison, metric.anchor],
  );
  const setChartMode = useCallback(
    (next: ChartMode) => {
      metric.setMode(modeFromAxes(next.axis, next.anchor));
    },
    [metric],
  );
  const useGating = config.useGating;
  const gating = useGating ? useGating() : undefined;
  const previewMode = gating?.enabled === true;
  const unlocksLeftToday = previewMode
    ? Math.max(0, gating.freeQuota - gating.viewedCount)
    : 0;

  /** Live stock prices keyed by ticker — close_pence column raw values plus
   *  the price date, because US rows need dated FX conversion. */
  const [prices, setPrices] = useState<
    Record<string, { price: number; date?: string }>
  >({});
  /** Flips to true once the latest-prices fetch has resolved (or settled
   *  via catch). Drives the empty-day "Biggest gainers" grid: render a
   *  skeleton until we have prices in hand, then swap in the ranked
   *  cells in one shot — without this the cells materialize with
   *  value-sorted fallback ordering and then re-sort once prices land,
   *  producing a visible jump. */
  const [pricesLoaded, setPricesLoaded] = useState(false);
  /** Benchmark daily closes keyed by ISO date — raw values from the
   *  prices table (index points). */
  const [benchEntries, setBenchEntries] = useState<Record<string, number>>({});
  /** Benchmark daily closes as a sorted bar array — same data as
   *  benchEntries but kept as a list so the sparkline can walk it
   *  with a pointer. */
  const [benchmarkBars, setBenchmarkBars] = useState<SparkBar[]>([]);
  /** Per-ticker daily close history for the inline sparkline. Populated
   *  asynchronously as the per-ticker fetches resolve; the sparkline
   *  renders a `—` placeholder until its ticker lands. */
  const [stockBars, setStockBars] = useState<Record<string, SparkBar[]>>({});
  const [fxRates, setFxRates] = useState<Record<string, number>>({});

  const [news, setNews] = useState<NewsPayload | null>(
    config.fetchNews ? null : null,
  );
  const hasNewsSource = !!config.fetchNews;

  /** Condensed performance stats for the right-hand channel's Performance tab.
   *  Computed straight from the dealings already in memory (each carries a
   *  server-precomputed livePerformance), so the channel needs no extra fetch.
   *  Only built for markets that ship the backtest. */
  const supportsChannelPerf = !!config.supportsChannelPerformance;
  const channelPerformance = useMemo(
    () =>
      supportsChannelPerf ? buildChannelPerformance(dealings) : undefined,
    [supportsChannelPerf, dealings],
  );
  const channelAppHref = APP_STORE_URLS[config.id] ?? APP_STORE_URLS.uk;
  const channelPerfHref = config.id === "uk" ? "/portfolio" : "/performance";
  const channelDiscretion = gating?.enabled ?? false;

  /** API market param for monthly endpoints. UK omits it (the worker defaults
   *  to "UK"); other markets pass their uppercased id ("US" | "NL" | "SE"),
   *  matching MARKET_CONFIG's keys. */
  const apiMarket = config.id === "uk" ? undefined : config.id.toUpperCase();
  /** Latest available recap month — seeds the modal and the CTA label. */
  const latestRecapMonth = recapMonths[0]?.month ?? null;
  /** ISO "YYYY-MM" months that have a published recap — drives the per-month
   *  "View Report" links in the list. */
  const recapMonthSet = useMemo(
    () => new Set(recapMonths.map((m) => m.month)),
    [recapMonths],
  );
  /** Recap deep-linking lives on the UK home only (reports are UK-only today).
   *  The URL carries the month as a slug, e.g. /report/may-2026; opening the
   *  modal pushes that path and closing it restores "/". */
  const navigate = useNavigate();
  const { month: reportSlug } = useParams<{ month?: string }>();
  const recapDeepLink = config.id === "uk";

  /** Open the recap at a specific month (null → latest). On UK the URL is the
   *  source of truth — navigate and let the effect below open the modal — so a
   *  shared link, refresh and the browser back button all behave. */
  const openRecap = useCallback(
    (monthIso: string | null) => {
      const target = monthIso ?? latestRecapMonth;

      if (recapDeepLink && target) {
        navigate(`/report/${monthSlug(target)}`);

        return;
      }
      setRecapMonth(monthIso);
      setRecapOpen(true);
    },
    [navigate, recapDeepLink, latestRecapMonth],
  );

  /** Close the recap and drop the /report/* path back to the home route. */
  const closeRecap = useCallback(() => {
    if (recapDeepLink) {
      // Replace so Back lands on the pre-open page, not back into the recap.
      navigate("/", { replace: true });

      return;
    }
    setRecapOpen(false);
  }, [navigate, recapDeepLink]);

  // On UK, mirror the /report/<slug> path into the modal state. Covers fresh
  // loads, shared links, the CTA's navigate, and the back button (path clears →
  // modal closes). The modal fetches its own article, independent of the index.
  useEffect(() => {
    if (!recapDeepLink) return;
    const iso = reportSlug ? slugToMonth(reportSlug) : null;

    setRecapMonth(iso);
    setRecapOpen(iso != null);
  }, [recapDeepLink, reportSlug]);

  /* ───────── Data loading ─────────────────────────────────────────────── */

  // Probe the monthly-recap index once per market. Drives the hero CTA's
  // visibility (empty → no pill) and seeds the modal's first month.
  useEffect(() => {
    let cancelled = false;

    api
      .monthlySummaries(apiMarket)
      .then((r) => {
        if (!cancelled) setRecapMonths(r.summaries);
      })
      .catch(() => {
        if (!cancelled) setRecapMonths([]);
      });

    return () => {
      cancelled = true;
    };
  }, [apiMarket]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await config.fetchDealings({ view });

      setDealings(r.dealings);
      setStats(r.stats);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [config, view]);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll for fresh data — defaults to 30s. Markets with their own cadence
  // can override via pollIntervalMs (0 to disable entirely).
  useEffect(() => {
    const interval = config.pollIntervalMs ?? 30_000;

    if (!interval) return;
    const id = setInterval(() => {
      void load();
    }, interval);

    return () => clearInterval(id);
  }, [config.pollIntervalMs, load]);

  // Latest prices for every ticker on screen + the benchmark. One batched
  // call to /api/prices/latest — same shape across markets. Skipped
  // entirely when the market opted out via enableLivePrices=false (Sweden
  // today, because pipeline/prices.ts in the worker doesn't yet know how
  // to fetch SEK closes). Avoids spamming Yahoo with .ST symbols it'd
  // return nothing for.
  const livePricesEnabled = config.enableLivePrices !== false;
  const logosEnabled = config.enableLogos !== false;

  useEffect(() => {
    if (!livePricesEnabled || !config.usesGbpPerUsdFx) return;
    api
      .gbpPerUsdHistory(730)
      .then((rates) => {
        const map: Record<string, number> = {};

        for (const r of rates) map[r.date] = r.gbp_per_usd;
        setFxRates(map);
      })
      .catch(() => setFxRates({}));
  }, [config.usesGbpPerUsdFx, livePricesEnabled]);

  // Effective TodayEmpty slot — explicit `config.TodayEmpty` wins (bespoke
  // copy), otherwise the shared MarketTodayEmpty kicks in for any market
  // that declared a session + holiday source. Markets with neither fall
  // through to the generic "No filings yet" line further down.
  const TodayEmptyComponent = config.TodayEmpty
    ? config.TodayEmpty
    : config.session && config.holidays
      ? () => (
          <MarketTodayEmpty
            holidays={config.holidays!}
            session={config.session!}
          />
        )
      : undefined;

  useEffect(() => {
    if (!livePricesEnabled) {
      // Sweden today — flag ready straight away so the gainers grid
      // doesn't sit on a perpetual skeleton waiting for prices that
      // will never arrive.
      setPricesLoaded(true);

      return;
    }
    if (dealings.length === 0) return;
    const tickers = Array.from(
      new Set(dealings.map((d) => d.ticker).filter(Boolean)),
    );

    if (tickers.length === 0) return;
    api
      .latestPrices([...tickers, config.benchmarkTicker])
      .then((list) => {
        const map: Record<string, { price: number; date?: string }> = {};

        for (const p of list)
          map[p.ticker] = { price: p.price_pence, date: p.date };
        setPrices(map);
        setPricesLoaded(true);
      })
      .catch(() => {
        setPricesLoaded(true);
      });
  }, [dealings, config.benchmarkTicker, livePricesEnabled]);

  // Benchmark daily-close history — pre-loaded once per market. Kept in
  // two shapes: a date-keyed map for `benchmarkEntry()` lookups, and a
  // sorted bar array the sparkline walks with a pointer.
  useEffect(() => {
    if (!livePricesEnabled) return;
    if (config.usesGbpPerUsdFx && Object.keys(fxRates).length === 0) return;
    api
      .priceHistory(config.benchmarkTicker, 365)
      .then((bars) => {
        const map: Record<string, number> = {};
        const sparkBars: SparkBar[] = bars.map((b) => ({
          date: b.date,
          close:
            config.normalizeLivePrice(b.close_pence, b.date, fxRates) ??
            b.close_pence,
        }));

        for (const b of bars) {
          map[b.date] =
            config.normalizeLivePrice(b.close_pence, b.date, fxRates) ??
            b.close_pence;
        }
        setBenchEntries(map);
        setBenchmarkBars(sparkBars);
      })
      .catch(() => {});
  }, [config, fxRates, livePricesEnabled]);

  // Per-ticker daily-close history for the sparkline column. Fired in
  // parallel against /api/prices/history (worker checks D1 cache first,
  // falls back to Yahoo). Tracked via a ref so the effect only re-runs
  // when the dealings list itself changes — the setStockBars writes
  // would otherwise feedback-loop the effect.
  const stockBarsRequested = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!livePricesEnabled) return;
    if (config.usesGbpPerUsdFx && Object.keys(fxRates).length === 0) return;
    if (dealings.length === 0) return;
    const tickers = Array.from(
      new Set(dealings.map((d) => d.ticker).filter(Boolean)),
    );

    for (const ticker of tickers) {
      if (stockBarsRequested.current.has(ticker)) continue;
      stockBarsRequested.current.add(ticker);
      api
        .priceHistory(ticker, 365)
        .then((bars) => {
          const sparkBars: SparkBar[] = bars.map((b) => ({
            date: b.date,
            close:
              config.normalizeLivePrice(b.close_pence, b.date, fxRates) ??
              b.close_pence,
          }));

          setStockBars((prev) => ({ ...prev, [ticker]: sparkBars }));
        })
        .catch(() => {
          // Stash an empty array so we don't keep retrying a tombstone'd
          // ticker on every dealings poll.
          setStockBars((prev) => ({ ...prev, [ticker]: [] }));
        });
    }
  }, [dealings, livePricesEnabled, config, fxRates]);

  // News — optional. Refresh on the same cadence as the main poll so the
  // strip stays live.
  useEffect(() => {
    if (!config.fetchNews) return;
    let active = true;
    const fetchNews = () => {
      config.fetchNews!()
        .then((n) => {
          if (active) setNews(n);
        })
        .catch(() => {});
    };

    fetchNews();
    const interval = config.pollIntervalMs ?? 30_000;

    if (!interval)
      return () => {
        active = false;
      };
    const id = setInterval(fetchNews, interval);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [config]);

  /* ───────── Derived state ───────────────────────────────────────────── */

  // Filter pipeline:
  //   searchedDealings = dealings ∩ search    → drives the Today hero
  //   filteredDealings = searchedDealings ∩ Signal ∩ Strength → drives the table
  // Today is meant to stay the canonical "what happened today" surface — only
  // search narrows it. Signal/Strength are table-only controls (the filter bar
  // sits visually above the table, beneath the Today hero, to make that
  // boundary obvious).
  const heroPredicate = useMemo(() => {
    if (!config.heroFilters || !heroFilterId) return null;

    return (
      config.heroFilters.find((h) => h.id === heroFilterId)?.predicate ?? null
    );
  }, [config.heroFilters, heroFilterId]);

  const searchedDealings = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return dealings;

    return dealings.filter(
      (d) =>
        d.ticker.toLowerCase().includes(q) ||
        d.company.toLowerCase().includes(q) ||
        d.insiderName.toLowerCase().includes(q),
    );
  }, [dealings, search]);

  // Universal filters (Industry / Clusters / Trade size) injected for EVERY
  // market ahead of its own extra axes — they read shared MarketDealing fields
  // and self-gate on the data present. The list rebuilds as dealings load (the
  // Industry options derive from the sectors actually in the data).
  const allExtraFilters = useMemo(
    () => [
      ...buildUniversalFilters(
        dealings,
        config.priceFormat?.formatValue ??
          ((n: number) => `${Math.round(n / 1000)}k`),
      ),
      ...(config.extraFilters ?? []),
    ],
    [dealings, config.priceFormat, config.extraFilters],
  );

  /** Reset every drawer filter to its configured default ("show everything").
   *  Search stays — it's a separate, always-visible control. */
  const resetFilters = useCallback(() => {
    setViewMode("chronological");
    setSignalFilter(config.defaultSignalFilter ?? "signal");
    setHeroFilterId(
      config.defaultHeroFilter ?? config.heroFilters?.[0]?.id ?? null,
    );
    setExtraFilterValues(
      Object.fromEntries(allExtraFilters.map((ef) => [ef.id, ef.defaultValue])),
    );
  }, [
    config.defaultSignalFilter,
    config.defaultHeroFilter,
    config.heroFilters,
    allExtraFilters,
  ]);

  const filteredDealings = useMemo(() => {
    // Per-market Signal predicate; ratingless markets (NL/SE) override the
    // rating-based default with their own clean-buy heuristic.
    const signalPredicate = config.isSignal ?? isSignalDealing;
    let base =
      signalFilter === "signal"
        ? searchedDealings.filter(signalPredicate)
        : searchedDealings;

    // Strength only composes with Signal — when the top-level filter is
    // "all" the bar hides the Strength dropdown, so honouring its value
    // here would silently re-apply a hidden control.
    if (signalFilter === "signal" && heroPredicate) {
      base = base.filter(heroPredicate);
    }

    // Always-visible config-driven extra axes (e.g. Congress party). Skipped
    // when the value is the filter's "show everything" default.
    for (const ef of allExtraFilters) {
      const value = extraFilterValues[ef.id] ?? ef.defaultValue;

      if (value !== ef.defaultValue) {
        base = base.filter((d) => ef.predicate(value, d));
      }
    }

    return base;
  }, [
    searchedDealings,
    heroPredicate,
    signalFilter,
    config.isSignal,
    allExtraFilters,
    extraFilterValues,
  ]);

  const todayIso = useMemo(
    () => todayKeyIso(config.session?.timeZone),
    [config.session?.timeZone],
  );

  const todayDealings = useMemo(
    () =>
      searchedDealings.filter((d) => d.disclosedDate.slice(0, 10) === todayIso),
    [searchedDealings, todayIso],
  );

  // Today's above-routine count for the hero's live proof line. Same
  // predicate as the Signal view so the two numbers can't disagree.
  const todaySignalCount = useMemo(() => {
    const isSignal = config.isSignal ?? isSignalDealing;

    return todayDealings.filter((d) => isSignal(d)).length;
  }, [todayDealings, config.isSignal]);

  const stockCurrent = useCallback(
    (ticker: string): number | undefined => {
      const raw = prices[ticker];

      if (raw == null) return undefined;
      const normalized = config.normalizeLivePrice(
        raw.price,
        raw.date,
        fxRates,
      );

      return normalized ?? undefined;
    },
    [prices, config, fxRates],
  );
  const stockCurrentForDealing = useCallback(
    (d: MarketDealing<W>) => stockCurrent(d.ticker),
    [stockCurrent],
  );

  // Today's skipped (muted) filings. The analysed/primary ones surface as
  // cards in the Today hero; these render as ordinary rows under a "Today"
  // group at the top of the chronological table. Mirrors the hero's split
  // (isRowMuted, or non-purchase when a market declares no mute rule) so every
  // today filing lands in exactly one place. bucketByMonth excludes today, so
  // without this the skipped tail would have nowhere to go. Ordered by
  // mark-to-market return (biggest gainers first), same as the dated clusters.
  const todaySkipped = useMemo(() => {
    const isMuted = config.isRowMuted;

    return todayDealings
      .filter((d) => (isMuted ? isMuted(d) : !d.isPurchase))
      .sort(compareByReturnDesc(stockCurrentForDealing));
  }, [todayDealings, config.isRowMuted, stockCurrentForDealing]);

  const monthBuckets = useMemo(
    () =>
      // When the Today hero is suppressed, pass an empty todayIso so
      // bucketByMonth no longer holds today out — today's filings render as a
      // normal day in the month list instead of vanishing with the hero.
      bucketByMonth(filteredDealings, config.hideTodayHero ? "" : todayIso, {
        locale: config.locale,
        isSkipped: config.isSkipped,
        currentPriceOf: stockCurrentForDealing,
      }),
    [
      filteredDealings,
      todayIso,
      config.hideTodayHero,
      config.locale,
      config.isSkipped,
      stockCurrentForDealing,
    ],
  );

  // Freshness of the server-precomputed return badges — the latest close date
  // across the loaded dealings' live-performance snapshots. Surfaced as a
  // "Prices as of …" footer caption.
  const pricesAsOf = useMemo(
    () => latestPricesAsOf(filteredDealings),
    [filteredDealings],
  );

  // First dated day-group that actually has analysed ("Significant") rows.
  // The one-time intro strip rides on top of this day's rows — the first
  // place the badges appear without context. Skipped-only days don't count.
  const introDayKey = useMemo(() => {
    for (const m of monthBuckets) {
      for (const d of m.days) {
        if (d.suggested.length > 0) return d.key;
      }
    }

    return null;
  }, [monthBuckets]);

  // Once dismissed, the intro banner hides AND the grouped panel unwraps
  // back into a plain day-group (no tint/ring/inset). Lifted here so the
  // day render can react, not just the banner.
  const intro = useIntroDismissed();

  // Daily summaries — UK-only today. The hook collects the unique ISO
  // dates in the open months and fetches a per-date payload in parallel,
  // caching across remounts. Other markets get an empty map back and the
  // banner slot stays empty.
  const summaryDates = useMemo(() => {
    const dates = new Set<string>();

    for (const m of monthBuckets) {
      for (const d of m.days) {
        if (d.suggested.length > 0) dates.add(d.key);
      }
    }
    if (todayDealings.length > 0) dates.add(todayIso);

    return Array.from(dates);
  }, [monthBuckets, todayDealings, todayIso]);
  const dailySummaries = useDailySummaries(config.id, summaryDates);

  useEffect(() => {
    if (openMonths === null && monthBuckets.length > 0) {
      // Open only the most recent month; older months stay collapsed and
      // expand on click. Keeps the initial DOM (and the near-viewport logo
      // prefetch window) small instead of mounting every month's rows at
      // once. monthBuckets is most-recent-first, so [0] is the latest.
      setOpenMonths(new Set([monthBuckets[0].key]));
    }
  }, [monthBuckets, openMonths]);

  // Keep month sticky offset in sync with the actual filter-bar height.
  // The filter row grows/shrinks across breakpoints (mobile sheet vs desktop
  // inline controls), so hardcoded pixel offsets drift and look vertically off.
  useEffect(() => {
    const el = filterBarRef.current;

    if (!el) return;
    const read = () => setFilterBarHeight(el.getBoundingClientRect().height);

    read();
    const ro = new ResizeObserver(read);

    ro.observe(el);

    return () => ro.disconnect();
  }, [dealings.length]);

  // When the user picks the disclosure anchor we look up the benchmark
  // close on the disclosure date first (and fall back to trade-day).
  // Otherwise the older trade-day preference stands.
  const anchorsOnDisclosure = chartMode.anchor === "disclosure";
  const benchmarkEntry = useCallback(
    (d: MarketDealing<W>): number | undefined => {
      const tradeIso = d.tradeDate.slice(0, 10);
      const disclosedIso = d.disclosedDate.slice(0, 10);

      if (anchorsOnDisclosure) {
        return benchEntries[disclosedIso] ?? benchEntries[tradeIso];
      }

      return benchEntries[tradeIso] ?? benchEntries[disclosedIso];
    },
    [benchEntries, anchorsOnDisclosure],
  );

  // Stock entry price the Return % anchors at. When anchor=trade we use the
  // recorded execution price (what the insider actually paid). When
  // anchor=disclosure we want the close on the disclosure date instead, so
  // the displayed % matches what the sparkline rebases against — the
  // sparkline picks the first bar where `b.date >= anchor`, so we mirror
  // that here.
  const stockEntry = useCallback(
    (d: MarketDealing<W>): number | undefined => {
      const bars = stockBars[d.ticker];

      if (!anchorsOnDisclosure) {
        // Trade anchor: prefer the execution price. Markets that carry no
        // entry price (Congress PTRs disclose ranges, not an exact fill)
        // derive the close on/after the trade date from the fetched bars,
        // mirroring the disclosure-anchor path below.
        if (d.entryPrice != null) return d.entryPrice;
        const tradeIso = d.tradeDate.slice(0, 10);

        return bars?.find((b) => b.date >= tradeIso)?.close ?? undefined;
      }
      const disclosedIso = d.disclosedDate.slice(0, 10);
      const post = bars?.find((b) => b.date >= disclosedIso);

      return post?.close ?? d.entryPrice ?? undefined;
    },
    [stockBars, anchorsOnDisclosure],
  );

  // True when disclosure-anchored AND the bar we'd anchor at is also the
  // latest live close — i.e. the market has not yet produced a price after
  // disclosure (typical on weekends for Friday's disclosures). Return would
  // mechanically be 0% in this case, so the row shows "No data yet" instead
  // of a misleading green ▲ +0.0%. Bars-not-loaded falls through to false.
  const stockNoPosteriorData = useCallback(
    (d: MarketDealing<W>): boolean => {
      if (!anchorsOnDisclosure) return false;
      const liveDate = prices[d.ticker]?.date;

      if (!liveDate) return false;
      const bars = stockBars[d.ticker];
      const disclosedIso = d.disclosedDate.slice(0, 10);
      const post = bars?.find((b) => b.date >= disclosedIso);

      return post?.date === liveDate;
    },
    [anchorsOnDisclosure, prices, stockBars],
  );

  const benchmarkCurrentRaw = prices[config.benchmarkTicker];
  const benchmarkCurrent = benchmarkCurrentRaw
    ? (config.normalizeLivePrice(
        benchmarkCurrentRaw.price,
        benchmarkCurrentRaw.date,
        fxRates,
      ) ?? undefined)
    : undefined;

  // Cumulative return across a group of a member's trades — "how is the whole
  // basket doing". Value-weighted by each buy's (approximate) dollar size so a
  // $75k position counts more than an $8k one. Uses the same per-row metric as
  // the children (raw return, or alpha on the vs-market axis) so the master
  // row's number is directly comparable. Returns null when no priced legs.
  const aggregateReturn = useCallback(
    (group: MarketDealing<W>[]): number | null => {
      const showAlpha = chartMode.axis === "market";
      let weightSum = 0;
      let acc = 0;

      for (const d of group) {
        // Prefer the server snapshot (matches the active axis/anchor) so the
        // master number paints without waiting on the price fetch; fall back to
        // the client computation for any leg lacking a snapshot.
        let metric = livePerfValue(d.livePerformance, chartMode);

        if (metric == null) {
          const { stockPct, alpha } = computeRowMetric({
            stockEntry: stockEntry(d),
            stockCurrentMajor: stockCurrent(d.ticker),
            benchmarkEntry: benchmarkEntry(d),
            benchmarkCurrent,
          });

          metric = showAlpha ? alpha : stockPct;
        }
        const weight = d.value ?? 0;

        if (metric != null && weight > 0) {
          acc += metric * weight;
          weightSum += weight;
        }
      }

      return weightSum > 0 ? acc / weightSum : null;
    },
    [chartMode, stockEntry, stockCurrent, benchmarkEntry, benchmarkCurrent],
  );

  const byGain = useMemo(() => {
    return filteredDealings
      .map((d) => {
        // Prefer the server snapshot's trade-anchor return (the "gain since the
        // buy" this view ranks by) so the list orders + renders without a price
        // fetch; fall back to the client computation for uncached rows.
        let pct = d.livePerformance?.return_pct_trade ?? null;

        if (pct == null) {
          const current = stockCurrent(d.ticker);

          if (d.entryPrice == null || current == null || d.entryPrice <= 0)
            return null;
          pct = ((current - d.entryPrice) / d.entryPrice) * 100;
        }

        return { dealing: d, pct };
      })
      .filter((x): x is { dealing: MarketDealing<W>; pct: number } => x != null)
      .sort((a, b) => b.pct - a.pct);
  }, [filteredDealings, stockCurrent]);

  // Past-month best performers — feeds the right half of the Today
  // section when today has no filings (weekends, holidays, quiet days).
  // Looks back 30 days *excluding* today so the gains have room to mean
  // something — a 7-day window gave us a lot of low-single-digit moves.
  // Applies the same primary/skipped split rule the Today hero uses,
  // computes return-since-trade from the live price cache, and sorts by
  // gain descending. Items without a computable return fall back to the
  // end ordered by deal value, so the grid still fills out before
  // prices finish loading.
  const recentBestPerformingDealings = useMemo<
    { dealing: MarketDealing<W>; returnPct: number | null }[]
  >(() => {
    if (todayDealings.length > 0) return [];
    const cutoff = new Date(`${todayIso}T00:00:00Z`);

    cutoff.setUTCDate(cutoff.getUTCDate() - 30);
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    const inWindow = searchedDealings.filter((d) => {
      const iso = d.disclosedDate.slice(0, 10);

      if (iso >= todayIso || iso < cutoffIso) return false;

      return config.isRowMuted ? !config.isRowMuted(d) : d.isPurchase;
    });

    return inWindow
      .map((d) => {
        // Server snapshot's trade-anchor return first (renders the gainers grid
        // immediately), client computation as the fallback. Congress rows have
        // no entryPrice, so the snapshot is the only way they rank by gain.
        let returnPct = d.livePerformance?.return_pct_trade ?? null;

        if (returnPct == null) {
          const current = stockCurrent(d.ticker);

          returnPct =
            d.entryPrice != null && current != null && d.entryPrice > 0
              ? ((current - d.entryPrice) / d.entryPrice) * 100
              : null;
        }

        return { dealing: d, returnPct };
      })
      .sort((a, b) => {
        // Items with a return go first, ranked by gain; everything else
        // tail-sorted by value so we always have six cells on screen.
        if (a.returnPct != null && b.returnPct != null)
          return b.returnPct - a.returnPct;
        if (a.returnPct != null) return -1;
        if (b.returnPct != null) return 1;

        return (b.dealing.value ?? 0) - (a.dealing.value ?? 0);
      });
  }, [
    searchedDealings,
    todayDealings,
    todayIso,
    config.isRowMuted,
    stockCurrent,
  ]);

  // Drawer should open for any clicked dealing, even ones the active
  // signal/strength filter would hide — the Today hero surfaces skipped
  // rows that aren't in `filteredDealings` when signalFilter === "signal".
  const selectedDealing = useMemo(
    () =>
      selectedKey
        ? (dealings.find((d) => d.key === selectedKey) ?? null)
        : null,
    [dealings, selectedKey],
  );

  const chartModeToggle = (
    <MarketChartModeToggle
      stacked
      benchmarkLabel={config.benchmarkLabel}
      mode={chartMode}
      onChange={setChartMode}
    />
  );

  /* ───────── Handlers ────────────────────────────────────────────────── */

  const toggleMonth = (key: string) => {
    setOpenMonths((prev) => {
      const next = new Set(prev ?? []);

      if (next.has(key)) next.delete(key);
      else next.add(key);

      return next;
    });
  };

  /* ───────── Render ──────────────────────────────────────────────────── */

  // Discretion list-gating: keep the most recent couple of disclosure days
  // fully readable, blur everything older behind fabricated rows so the public
  // site only ever shows a sliver of real history — the rest is "open the app"
  // territory. Only the markets that opt into gating (UK today) are affected.
  const recentRealDays = useMemo(() => {
    const past = dealings
      .map((d) => d.disclosedDate.slice(0, 10))
      .filter((iso) => iso < todayIso);
    const distinct = [...new Set(past)].sort().reverse();

    return new Set(distinct.slice(0, REAL_HISTORY_DAYS));
  }, [dealings, todayIso]);

  const listGatingEnabled = gating?.enabled ?? false;
  const isRowGated = (d: MarketDealing<W>) => {
    if (!listGatingEnabled) return false;
    const day = d.disclosedDate.slice(0, 10);

    return day < todayIso && !recentRealDays.has(day);
  };

  // One dealing row with the shared table props bound — used by every day
  // group (the Today group + the month/day buckets). The by-gain list keeps
  // its own inline row because it shows the date column (no hideDate).
  // `indent` lines a row's logo up under a MemberClusterRow's avatar (the
  // master indents its portrait past an expand chevron). Defaulted off so the
  // bare `.map(renderDayRow)` call sites — where map passes an index, not a
  // boolean — stay un-indented.
  const renderRow = (
    d: MarketDealing<W>,
    indent = false,
    hideInsider = false,
  ) => {
    const blurred = isRowGated(d);
    // Render a fabricated stand-in (same height) so no real data hits the DOM.
    const rd = blurred ? makeDummyDealing(d) : d;
    const row = (
      <MarketRow
        key={rd.key}
        hideDate
        RowActionCell={config.RowActionCell}
        RowNameBadge={config.RowNameBadge}
        benchmarkBars={benchmarkBars}
        benchmarkCurrent={benchmarkCurrent}
        benchmarkEntry={benchmarkEntry(rd)}
        benchmarkLabel={config.benchmarkLabel}
        chartMode={chartMode}
        dealing={rd}
        fmt={config.priceFormat}
        formatTickerDisplay={config.formatTickerDisplay}
        hideInsider={hideInsider}
        indent={indent}
        isMuted={config.isRowMuted}
        locale={config.locale}
        noPosteriorData={blurred ? false : stockNoPosteriorData(d)}
        selected={!blurred && selectedKey === d.key}
        showLogo={logosEnabled}
        stockBars={blurred ? undefined : stockBars[d.ticker]}
        stockCurrentMajor={blurred ? undefined : stockCurrent(d.ticker)}
        stockEntry={blurred ? undefined : stockEntry(d)}
        onSelect={blurred ? () => {} : () => openDealing(d)}
      />
    );

    if (!blurred) return row;

    return (
      <div
        key={d.key}
        aria-hidden
        className="relative pointer-events-none select-none"
      >
        <div className="opacity-70 saturate-[0.7]">{row}</div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#faf7f2]/80 via-[#faf7f2]/35 to-[#faf7f2]/80 dark:from-surface/85 dark:via-surface/45 dark:to-surface/85" />
        <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-[#d8d0c6] bg-[#faf7f2]/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7a634b] dark:border-separator dark:bg-surface/95 dark:text-[#c9b49f]">
          App-only history
        </div>
      </div>
    );
  };
  const renderDayRow = (d: MarketDealing<W>) => renderRow(d);

  const openDealing = useCallback(
    (d: MarketDealing<W>) => {
      if (
        previewMode &&
        unlocksLeftToday > 0 &&
        (gating?.viewedCount ?? 0) === 0 &&
        typeof window !== "undefined"
      ) {
        const ok = window.confirm(FIRST_UNLOCK_CONFIRM);

        if (!ok) return;
      }
      setSelectedKey(d.key);
    },
    [gating?.viewedCount, previewMode, setSelectedKey, unlocksLeftToday],
  );

  // The prominent ("suggested") rows of a day. When the market opts into
  // company clustering, multiple same-company buys on the same day collapse
  // into one expandable MarketClusterRow (mirrors iOS ticker clustering);
  // otherwise each dealing renders as its own row. Skipped rows never cluster.
  const renderSuggestedRows = (rows: MarketDealing<W>[]) => {
    // Person-grouping wins when enabled: fold each member's buys for the day
    // into one MemberClusterRow (portrait → the companies they bought).
    if (config.clusterByPerson) {
      return groupByPerson(rows).map((group) => (
        <MemberClusterRow
          key={`person-${group.key}`}
          aggReturnPct={aggregateReturn(group.dealings)}
          aggShowAlpha={chartMode.axis === "market"}
          chamber={group.chamber}
          count={group.count}
          insiderName={group.insiderName}
          insiderPhotoUrl={group.insiderPhotoUrl}
          insiderRole={group.insiderRole}
          party={group.party}
          signalCount={
            group.dealings.filter(
              (d) =>
                d.triageVerdict === "promising" || d.triageVerdict === "maybe",
            ).length
          }
          totalValueLabel={
            group.totalValue != null
              ? config.priceFormat.formatValue(group.totalValue)
              : "—"
          }
        >
          {group.dealings.map((d) => renderRow(d, true, true))}
        </MemberClusterRow>
      ));
    }

    if (!config.clusterByCompany) return rows.map(renderDayRow);

    return groupByCompany(rows).map((group) =>
      group.count > 1 ? (
        <MarketClusterRow
          key={`cluster-${group.key}`}
          company={group.company}
          count={group.count}
          formatTickerDisplay={config.formatTickerDisplay}
          representative={group.representative}
          showLogo={logosEnabled}
          totalValueLabel={
            group.totalValue != null
              ? config.priceFormat.formatValue(group.totalValue)
              : "—"
          }
          valueColumnClass={config.priceFormat.valueColumnClass}
        >
          {group.dealings.map(renderDayRow)}
        </MarketClusterRow>
      ) : (
        renderDayRow(group.representative)
      ),
    );
  };

  const emptyState = filteredDealings.length === 0 &&
    todaySkipped.length === 0 &&
    !loading && (
      <div className="bg-[#faf7f2] dark:bg-surface rounded-xl px-4 py-10 text-center text-sm text-muted">
        {search.trim() ? (
          <>
            No filings match{" "}
            <span className="font-medium text-foreground/70">"{search}"</span>.{" "}
            <button
              className="text-foreground/70 underline underline-offset-2 hover:text-foreground"
              onClick={() => setSearch("")}
            >
              Clear search
            </button>
          </>
        ) : config.renderEmptyState ? (
          config.renderEmptyState({ view, stats, setView })
        ) : (
          <>No filings yet.</>
        )}
      </div>
    );

  return (
    <DefaultLayout drawerRight={hasNewsSource || supportsChannelPerf}>
      <section className="pb-8 space-y-6">
        {/* Shared hero — first content under the navbar. Perf moved to
            /performance; the old title + description block is dropped
            because the hero IS the page heading. Per-market beta notice
            renders via <BetaTag/> in App.tsx so it persists across route
            changes instead of remounting with each MarketHero. */}
        <MarketHero
          hasTopNotice={!!config.topNotice}
          headline={config.heroHeadline}
          marketLabel={config.marketLabel}
          primaryCtaHref={APP_STORE_URLS[config.id]}
          reportLabel={monthShort(latestRecapMonth)}
          subhead={config.heroSubhead}
          todayCount={todayDealings.length}
          todaySignalCount={todaySignalCount}
          onExplain={() => setExplainerOpen(true)}
          onViewReport={
            config.id !== "uk" && latestRecapMonth
              ? () => openRecap(latestRecapMonth)
              : undefined
          }
        />

        {config.views.length > 1 && (
          <div
            className="inline-flex rounded-full border border-separator bg-surface/40 p-1"
            role="tablist"
          >
            {config.views.map((v) => (
              <button
                key={v.id}
                aria-selected={view === v.id}
                className={`text-sm px-4 py-1.5 rounded-full transition-colors font-medium ${
                  view === v.id
                    ? "bg-[#5a4128]/15 text-[#3d2b1a] dark:text-[#ad9479]"
                    : "text-muted hover:text-foreground"
                }`}
                role="tab"
                onClick={() => setView(v.id)}
              >
                {v.label}
                {stats && (
                  <span className="ml-1 text-xs opacity-60 tabular-nums">
                    {stats.viewCounts[v.id] ?? 0}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {err && (
          <div className="rounded-lg border border-rose-300/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-2 text-sm text-rose-900 dark:text-rose-200">
            {err}
          </div>
        )}

        {/* Today hero — large, dominant section. Replaces both the old
            mobile-only inline Today card AND the right-drawer "Today's
            filings" half so the page reads top-down with today front-and-
            centre instead of tucked into a sidebar. Suppressed for low-volume
            markets (Congress) that read better without it. */}
        {!config.hideTodayHero && (
          <MarketTodayHero
            TodayEmpty={TodayEmptyComponent}
            fmt={config.priceFormat}
            formatTickerDisplay={config.formatTickerDisplay}
            holidays={config.holidays}
            isMuted={config.isRowMuted}
            loading={loading && dealings.length === 0}
            locale={config.locale}
            recentBest={recentBestPerformingDealings}
            // Ready as soon as we have real returns to rank by — which now arrive
            // with the dealings via live_performance, no price fetch needed. Falls
            // back to waiting on pricesLoaded for markets without snapshots
            // (EU/SE), so their grid still fills only once client prices land.
            recentBestReady={
              pricesLoaded ||
              recentBestPerformingDealings.some((e) => e.returnPct != null)
            }
            selectedKey={selectedKey}
            session={config.session}
            showLogo={logosEnabled}
            todayDealings={todayDealings}
            todayIso={todayIso}
            onSelect={openDealing}
          />
        )}

        {/* Mobile-only channel. The fixed right rail is hidden on phones, so
            Performance + News would otherwise be invisible there — surface the
            same tabbed channel inline, right under Today. */}
        <MarketChannel
          appHref={channelAppHref}
          discretionEnabled={channelDiscretion}
          news={hasNewsSource ? news : undefined}
          newsFooterNote={config.newsFooterNote}
          newsHeading={config.newsHeading}
          performance={channelPerformance}
          performanceHref={channelPerfHref}
          supportsPerformance={supportsChannelPerf}
          variant="inline"
        />

        {/* Today's skipped (muted) filings. The analysed ones surface as cards
            in the hero above; their low-signal tail renders here as ordinary
            table rows. Deliberately sits above the filter bar so it stays part
            of "Today" — always visible and never narrowed by the Signal /
            Strength controls, which govern only the historical table below. */}
        {!config.hideTodayHero && todaySkipped.length > 0 && (
          <section className="animate-content-in">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Also today · {todaySkipped.length} skipped
            </div>
            <div className="overflow-hidden rounded-xl bg-[#faf7f2] dark:bg-surface">
              <MarketRowHeader
                hideDate
                inset
                benchmarkLabel={config.benchmarkLabel}
                chartMode={chartMode}
                columnHelp={config.columnHelp}
                valueColumnClass={config.priceFormat.valueColumnClass}
              />
              {/* Contrast tray + white card mirrors the month/day cards in the
                  chronological table below, so the two sections read alike. */}
              <div className="bg-[#ece8e5] px-3 py-3 dark:bg-black/15">
                <div className="overflow-hidden rounded-xl bg-white divide-y divide-black/[0.06] dark:divide-separator dark:bg-surface-secondary">
                  {(showAllTodaySkipped
                    ? todaySkipped
                    : todaySkipped.slice(0, TODAY_SKIPPED_CAP)
                  ).map(renderDayRow)}
                  {todaySkipped.length > TODAY_SKIPPED_CAP && (
                    <button
                      className="w-full px-4 py-2.5 text-center text-xs font-medium text-muted transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                      onClick={() => setShowAllTodaySkipped((v) => !v)}
                    >
                      {showAllTodaySkipped
                        ? "Show fewer"
                        : `Show all ${todaySkipped.length} skipped`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {loading && filteredDealings.length === 0 && (
          <div className="bg-[#faf7f2] dark:bg-surface rounded-xl overflow-hidden animate-content-in">
            <MarketRowHeader
              benchmarkLabel={config.benchmarkLabel}
              chartMode={chartMode}
              columnHelp={config.columnHelp}
              valueColumnClass={config.priceFormat.valueColumnClass}
            />
            <div className="divide-y divide-black/[0.06] dark:divide-separator">
              {Array.from({ length: 8 }).map((_, i) => (
                <MarketRowSkeleton
                  key={i}
                  valueColumnClass={config.priceFormat.valueColumnClass}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sticky filter bar — single instance shared by both view bodies.
            Sits right beneath the navbar with rounded top + opaque bg so
            it doubles as the table's curved top edge AND masks anything
            scrolling beneath it. Stays visible when the hero filter
            narrows the list to zero so the user can switch back. */}
        {dealings.length > 0 && (
          <div
            ref={filterBarRef}
            className="sticky top-[64px] z-20 -mx-4 md:-mx-6 bg-[#faf7f2] dark:bg-surface rounded-t-xl border-b border-[#e8e0d5]/50 dark:border-separator/30 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]"
          >
            <MarketFilterBar
              extraFilterValues={extraFilterValues}
              extraFilters={allExtraFilters.map((ef) => ({
                id: ef.id,
                label: ef.label,
                question: ef.question,
                description: ef.description,
                kind: ef.kind,
                options: ef.options,
                defaultValue: ef.defaultValue,
              }))}
              heroFilterId={heroFilterId}
              heroFilters={config.heroFilters?.map((f) => ({
                id: f.id,
                label: f.label,
              }))}
              search={search}
              signalFilter={signalFilter}
              trailing={chartModeToggle}
              viewMode={viewMode}
              onExtraFilterChange={(id, value) =>
                setExtraFilterValues((prev) => ({ ...prev, [id]: value }))
              }
              onHeroFilterChange={setHeroFilterId}
              onReset={resetFilters}
              onSearch={setSearch}
              onSignalFilterChange={setSignalFilter}
              onViewMode={setViewMode}
            />
            {previewMode && (
              <div className="flex flex-wrap items-center gap-2 border-t border-[#e8e0d5]/70 px-4 py-2 dark:border-separator/40">
                <span className="inline-flex items-center rounded-full border border-[#d8d0c6] bg-[#f4eee6] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a634b] dark:border-separator dark:bg-white/[0.03] dark:text-[#c9b49f]">
                  Web preview
                </span>
                <span className="text-xs text-foreground/70">
                  {gating.freeQuota} full analysis per day on web
                </span>
                <span className="text-xs font-medium text-foreground/70">
                  {unlocksLeftToday > 0
                    ? `${unlocksLeftToday} unlock left today`
                    : "No unlocks left today"}
                </span>
              </div>
            )}
          </div>
        )}

        {emptyState}

        {/* By-gain view */}
        {filteredDealings.length > 0 && viewMode === "by-gain" && (
          <div className="bg-[#faf7f2] dark:bg-surface rounded-b-xl animate-content-in -mt-6 -mx-4 md:-mx-6">
            <MarketRowHeader
              benchmarkLabel={config.benchmarkLabel}
              chartMode={chartMode}
              columnHelp={config.columnHelp}
              valueColumnClass={config.priceFormat.valueColumnClass}
            />
            <div className="divide-y divide-black/[0.06] dark:divide-separator overflow-hidden rounded-b-xl">
              {byGain.map(({ dealing: d }) => (
                <MarketRow
                  key={d.key}
                  RowActionCell={config.RowActionCell}
                  RowNameBadge={config.RowNameBadge}
                  benchmarkBars={benchmarkBars}
                  benchmarkCurrent={benchmarkCurrent}
                  benchmarkEntry={benchmarkEntry(d)}
                  benchmarkLabel={config.benchmarkLabel}
                  chartMode={chartMode}
                  dealing={d}
                  fmt={config.priceFormat}
                  formatTickerDisplay={config.formatTickerDisplay}
                  isMuted={config.isRowMuted}
                  locale={config.locale}
                  noPosteriorData={stockNoPosteriorData(d)}
                  selected={selectedKey === d.key}
                  showLogo={logosEnabled}
                  stockBars={stockBars[d.ticker]}
                  stockCurrentMajor={stockCurrent(d.ticker)}
                  stockEntry={stockEntry(d)}
                  onSelect={() => openDealing(d)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Chronological / month + day buckets */}
        {filteredDealings.length > 0 && viewMode === "chronological" && (
          <div className="space-y-6 animate-content-in -mt-6 -mx-4 md:-mx-6">
            {monthBuckets.map((month, monthIdx) => {
              const monthOpen = openMonths?.has(month.key) ?? false;
              // bucketByMonth keys on "<MonthName>-<year>"; derive the ISO
              // "YYYY-MM" from any day in the bucket to match the recap index.
              const monthIso = month.days[0]?.key.slice(0, 7);
              const hasReport = !!monthIso && recapMonthSet.has(monthIso);

              return (
                <div key={month.key}>
                  <div
                    className={`sticky z-10 ${monthIdx === 0 ? "" : "pt-3"} bg-[#f5f0e8] dark:bg-background`}
                    style={{
                      top: `${64 + (filterBarHeight || 0)}px`,
                    }}
                  >
                    <button
                      className={`w-full flex items-center justify-between px-6 py-5 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors bg-[#faf7f2] dark:bg-surface ${monthIdx === 0 ? "" : "rounded-t-xl"} ${monthOpen ? "" : "rounded-b-xl"}`}
                      onClick={() => toggleMonth(month.key)}
                    >
                      <div className="flex items-center gap-3 text-left">
                        <CalendarDaysIcon className="w-5 h-5 text-muted shrink-0" />
                        <div className="text-xl font-semibold">
                          {month.label} {month.year}
                          {hasReport && (
                            <>
                              <span className="mx-2 text-muted">·</span>
                              <span
                                className="cursor-pointer text-sm font-medium text-[#5a4128] hover:underline dark:text-[#ad9479]"
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openRecap(monthIso!);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    openRecap(monthIso!);
                                  }
                                }}
                              >
                                View Report
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted">
                          {config.isSkipped
                            ? month.skippedCount > 0
                              ? `${month.suggestedCount} analysed · ${month.skippedCount} skipped`
                              : `${month.suggestedCount} analysed`
                            : `${month.count} ${month.count === 1 ? "filing" : "filings"}`}
                        </span>
                        <ChevronDownIcon
                          className={`w-5 h-5 text-muted shrink-0 transition-transform duration-200 ${monthOpen ? "rotate-180" : ""}`}
                        />
                      </div>
                    </button>
                  </div>
                  {monthOpen && (
                    <div className="bg-[#faf7f2] dark:bg-surface rounded-b-xl">
                      <MarketRowHeader
                        hideDate
                        inset
                        benchmarkLabel={config.benchmarkLabel}
                        chartMode={chartMode}
                        columnHelp={config.columnHelp}
                        valueColumnClass={config.priceFormat.valueColumnClass}
                      />
                      <div className="px-3 py-3 space-y-4 bg-[#ece8e5] dark:bg-black/15 rounded-b-xl">
                        {month.days.map((day) => {
                          const hasContent =
                            day.suggested.length > 0 || day.skipped.length > 0;

                          if (!hasContent) return null;

                          const isIntroDay =
                            day.key === introDayKey && !intro.dismissed;

                          return (
                            <div
                              key={day.key}
                              className={`rounded-xl overflow-hidden bg-white dark:bg-surface-secondary ${
                                isIntroDay
                                  ? ""
                                  : "divide-y divide-black/[0.06] dark:divide-separator"
                              }`}
                            >
                              <MarketDayHeader
                                day={day.day}
                                isoDate={day.key}
                                locale={config.locale}
                                skippedCount={day.skipped.length}
                                suggestedCount={day.suggested.length}
                                weekday={day.weekday}
                              />
                              {config.id === "uk" &&
                                dailySummaries.get(day.key) && (
                                  <MarketDaySummaryRow
                                    headline={
                                      dailySummaries.get(day.key)!.headline
                                    }
                                    isToday={day.key === todayIso}
                                    valueColumnClass={
                                      config.priceFormat.valueColumnClass
                                    }
                                    onOpen={() => setOpenSummaryDate(day.key)}
                                  />
                                )}
                              {config.clusterByPerson ? (
                                // Person-grouped markets (Congress): fold the
                                // WHOLE day — suggested + skipped — into one
                                // group per member, so a member never appears
                                // as both a cluster and loose rows. No corporate
                                // intro banner.
                                <>
                                  {renderSuggestedRows([
                                    ...day.suggested,
                                    ...day.skipped,
                                  ])}
                                </>
                              ) : isIntroDay ? (
                                <>
                                  {/* Grouped "signal" panel — the intro banner
                                      as a curved header wrapping the analysed
                                      rows on a tinted, ringed inset card, so a
                                      newcomer sees exactly which filings cleared
                                      the check. Skipped rows sit outside it. */}
                                  <div className="m-2 overflow-hidden rounded-xl bg-[#faf7f2] ring-1 ring-black/[0.07] divide-y divide-black/[0.06] dark:bg-white/[0.04] dark:ring-white/10 dark:divide-separator">
                                    <MarketIntroBanner
                                      onDismiss={intro.dismiss}
                                      onExplain={() => setExplainerOpen(true)}
                                    />
                                    {renderSuggestedRows(day.suggested)}
                                  </div>
                                  {day.skipped.length > 0 && (
                                    <div className="divide-y divide-black/[0.06] border-t border-black/[0.06] dark:divide-separator dark:border-separator">
                                      {day.skipped.map(renderDayRow)}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  {renderSuggestedRows(day.suggested)}
                                  {day.skipped.map(renderDayRow)}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {pricesAsOf && (
          <div className="text-center text-[11px] text-muted/70">
            Prices as of {shortDate(pricesAsOf, config.locale)}
          </div>
        )}

        {stats?.debugBreakdown && (
          <div className="text-xs text-muted text-center">
            <div className="text-[10px] opacity-70">{stats.debugBreakdown}</div>
          </div>
        )}
      </section>

      <MarketChannel
        appHref={channelAppHref}
        discretionEnabled={channelDiscretion}
        news={hasNewsSource ? news : undefined}
        newsFooterNote={config.newsFooterNote}
        newsHeading={config.newsHeading}
        performance={channelPerformance}
        performanceHref={channelPerfHref}
        supportsPerformance={supportsChannelPerf}
        variant="aside"
      />

      <MarketDetailDrawer
        AnalysisOverlay={config.AnalysisOverlay}
        DetailBody={config.DetailBody}
        DetailPosition={config.DetailPosition}
        DummyDetailBody={config.DummyDetailBody}
        allDealings={dealings}
        dealing={selectedDealing}
        detailFields={config.detailFields}
        fmt={config.priceFormat}
        formatTickerDisplay={config.formatTickerDisplay}
        gating={gating}
        insiderLabel={config.insiderLabel}
        locale={config.locale}
        showLogo={logosEnabled}
        onClose={() => setSelectedKey(null)}
        onSelectDealing={openDealing}
      />

      {/* "What are we looking for?" — checklist markets get the full-screen
          walkthrough (the six checks demonstrated on a real loaded filing);
          markets with their own signal model (Congress) keep their bespoke
          explainer body in the quiet drawer. */}
      {config.explainer ? (
        <MarketExplainerSheet
          explainer={config.explainer}
          explainerSubtitle={config.explainerSubtitle}
          marketId={config.id}
          open={explainerOpen}
          onClose={() => setExplainerOpen(false)}
        />
      ) : (
        <MarketExplainerExperience
          dealings={dealings}
          fmt={config.priceFormat}
          locale={config.locale}
          marketId={config.id}
          open={explainerOpen}
          showLogo={logosEnabled}
          onClose={() => setExplainerOpen(false)}
          onViewFiling={(key) => {
            // Swap panel → deal atomically. Two URL setters in the same tick
            // race and resurrect the cleared param (same gotcha as the
            // day → deal swap below). Controlled wrappers navigate to a
            // dealing path instead, which drops the query string itself.
            if (controlled) setExplainerOpen(false);
            else setUrlParams({ panel: null, deal: key });
            onSelectionChange?.(key);
          }}
        />
      )}

      <MonthlyRecapModal
        market={apiMarket}
        month={recapMonth ?? latestRecapMonth}
        open={recapOpen}
        onClose={closeRecap}
      />

      <DailySummarySheet
        date={openSummaryDate}
        onClose={() => setOpenSummaryDate(null)}
        onSelectDeal={(deal) => {
          // UK MarketDealing.key === dealing.id; this surface is UK-only
          // because /api/daily-summary is UK-only. Swap day → deal atomically
          // (two separate setters would race and leave ?day set).
          setUrlParams({ day: null, deal: deal.id });
        }}
      />
    </DefaultLayout>
  );
}
