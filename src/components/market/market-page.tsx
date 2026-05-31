import type {
  ChartMode,
  MarketConfig,
  MarketDealing,
  MarketStats,
  NewsPayload,
  SignalFilterValue,
} from "@/lib/markets/types";

import { CalendarDaysIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DailySummarySheet } from "./daily-summary-banner";
import { MarketChartModeToggle } from "./market-chart-mode-toggle";
import { MarketDetailDrawer } from "./market-detail-drawer";
import { MarketExplainerSheet } from "./market-explainer-sheet";
import { MarketFilterBar, type MarketViewMode } from "./market-filter-bar";
import { MarketHero } from "./market-hero";
import { MarketIntroBanner, useIntroDismissed } from "./market-intro-banner";
import {
  MarketDayHeader,
  MarketDaySummaryRow,
  MarketRow,
  MarketRowHeader,
  MarketRowSkeleton,
} from "./market-row";
import { type SparkBar } from "./market-row-spark";
import { MarketTodayDrawer } from "./market-today-drawer";
import { MarketTodayEmpty } from "./market-today-empty";
import { MarketTodayHero } from "./market-today-hero";
import {
  bucketByMonth,
  compareByReturnDesc,
  todayKeyIso,
} from "./market-utils";

import { isSignalDealing } from "@/lib/markets/types";
import DefaultLayout from "@/layouts/default";
import { api } from "@/lib/api";
import {
  modeFromAxes,
  useDashboardMetricMode,
} from "@/lib/dashboard-metric-mode";
import { useDailySummaries } from "@/lib/markets/use-daily-summaries";

/** How many of today's skipped rows to show before the "Show all" toggle.
 *  A busy US Form 4 day can disclose dozens; the standalone Today block sits
 *  above the historical table, so without a cap it would push that table off
 *  the page. */
const TODAY_SKIPPED_CAP = 8;

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
  const [internalSelectedKey, setInternalSelectedKey] = useState<string | null>(
    null,
  );
  const controlled = selectedKeyProp !== undefined;
  const selectedKey = controlled
    ? (selectedKeyProp ?? null)
    : internalSelectedKey;
  const setSelectedKey = useCallback(
    (key: string | null) => {
      if (!controlled) setInternalSelectedKey(key);
      onSelectionChange?.(key);
    },
    [controlled, onSelectionChange],
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
  /** When non-null, the daily-summary sheet is open for this date. */
  const [openSummaryDate, setOpenSummaryDate] = useState<string | null>(null);
  /** "What are we looking for?" explainer sheet, opened from the hero. */
  const [explainerOpen, setExplainerOpen] = useState(false);

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

  /* ───────── Data loading ─────────────────────────────────────────────── */

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

    return base;
  }, [searchedDealings, heroPredicate, signalFilter, config.isSignal]);

  const todayIso = useMemo(
    () => todayKeyIso(config.session?.timeZone),
    [config.session?.timeZone],
  );

  const todayDealings = useMemo(
    () =>
      searchedDealings.filter((d) => d.disclosedDate.slice(0, 10) === todayIso),
    [searchedDealings, todayIso],
  );

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
      bucketByMonth(filteredDealings, todayIso, {
        locale: config.locale,
        isSkipped: config.isSkipped,
        currentPriceOf: stockCurrentForDealing,
      }),
    [
      filteredDealings,
      todayIso,
      config.locale,
      config.isSkipped,
      stockCurrentForDealing,
    ],
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
      setOpenMonths(new Set(monthBuckets.map((m) => m.key)));
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
      if (!anchorsOnDisclosure) return d.entryPrice ?? undefined;
      const bars = stockBars[d.ticker];
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

  const byGain = useMemo(() => {
    return filteredDealings
      .map((d) => {
        const current = stockCurrent(d.ticker);

        if (d.entryPrice == null || current == null || d.entryPrice <= 0)
          return null;
        const pct = ((current - d.entryPrice) / d.entryPrice) * 100;

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
        const current = stockCurrent(d.ticker);
        const returnPct =
          d.entryPrice != null && current != null && d.entryPrice > 0
            ? ((current - d.entryPrice) / d.entryPrice) * 100
            : null;

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

  // One dealing row with the shared table props bound — used by every day
  // group (the Today group + the month/day buckets). The by-gain list keeps
  // its own inline row because it shows the date column (no hideDate).
  const renderDayRow = (d: MarketDealing<W>) => (
    <MarketRow
      key={d.key}
      hideDate
      RowActionCell={config.RowActionCell}
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
      onSelect={() => setSelectedKey(d.key)}
    />
  );

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
    <DefaultLayout drawerRight={hasNewsSource}>
      <section className="pb-8 space-y-6">
        {/* Shared hero — first content under the navbar. Perf moved to
            /performance; the old title + description block is dropped
            because the hero IS the page heading. Per-market beta notice
            renders via <BetaTag/> in App.tsx so it persists across route
            changes instead of remounting with each MarketHero. */}
        <MarketHero
          hasTopNotice={!!config.topNotice}
          marketLabel={config.marketLabel}
          onExplain={() => setExplainerOpen(true)}
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
                    ? "bg-[#6b5038]/15 text-[#4a3520] dark:text-[#c4a882]"
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
            centre instead of tucked into a sidebar. */}
        <MarketTodayHero
          TodayEmpty={TodayEmptyComponent}
          fmt={config.priceFormat}
          formatTickerDisplay={config.formatTickerDisplay}
          holidays={config.holidays}
          isMuted={config.isRowMuted}
          loading={loading && dealings.length === 0}
          locale={config.locale}
          recentBest={recentBestPerformingDealings}
          recentBestReady={pricesLoaded}
          selectedKey={selectedKey}
          session={config.session}
          showLogo={logosEnabled}
          todayDealings={todayDealings}
          todayIso={todayIso}
          onSelect={(d) => setSelectedKey(d.key)}
        />

        {/* Today's skipped (muted) filings. The analysed ones surface as cards
            in the hero above; their low-signal tail renders here as ordinary
            table rows. Deliberately sits above the filter bar so it stays part
            of "Today" — always visible and never narrowed by the Signal /
            Strength controls, which govern only the historical table below. */}
        {todaySkipped.length > 0 && (
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
            className="sticky top-[64px] z-20 bg-[#faf7f2] dark:bg-surface rounded-t-xl border-b border-[#e8e0d5]/50 dark:border-separator/30 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]"
          >
            <MarketFilterBar
              heroFilterId={heroFilterId}
              heroFilters={config.heroFilters?.map((f) => ({
                id: f.id,
                label: f.label,
              }))}
              search={search}
              signalFilter={signalFilter}
              trailing={chartModeToggle}
              viewMode={viewMode}
              onHeroFilterChange={setHeroFilterId}
              onSearch={setSearch}
              onSignalFilterChange={setSignalFilter}
              onViewMode={setViewMode}
            />
          </div>
        )}

        {emptyState}

        {/* By-gain view */}
        {filteredDealings.length > 0 && viewMode === "by-gain" && (
          <div className="bg-[#faf7f2] dark:bg-surface rounded-b-xl animate-content-in -mt-6">
            <MarketRowHeader
              benchmarkLabel={config.benchmarkLabel}
              chartMode={chartMode}
              valueColumnClass={config.priceFormat.valueColumnClass}
            />
            <div className="divide-y divide-black/[0.06] dark:divide-separator overflow-hidden rounded-b-xl">
              {byGain.map(({ dealing: d }) => (
                <MarketRow
                  key={d.key}
                  RowActionCell={config.RowActionCell}
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
                  onSelect={() => setSelectedKey(d.key)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Chronological / month + day buckets */}
        {filteredDealings.length > 0 && viewMode === "chronological" && (
          <div className="space-y-6 animate-content-in -mt-6">
            {monthBuckets.map((month, monthIdx) => {
              const monthOpen = openMonths?.has(month.key) ?? false;

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
                              {isIntroDay ? (
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
                                    {day.suggested.map(renderDayRow)}
                                  </div>
                                  {day.skipped.length > 0 && (
                                    <div className="divide-y divide-black/[0.06] border-t border-black/[0.06] dark:divide-separator dark:border-separator">
                                      {day.skipped.map(renderDayRow)}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  {day.suggested.map(renderDayRow)}
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

        {stats?.debugBreakdown && (
          <div className="text-xs text-muted text-center">
            <div className="text-[10px] opacity-70">{stats.debugBreakdown}</div>
          </div>
        )}
      </section>

      <MarketTodayDrawer
        news={hasNewsSource ? news : undefined}
        newsFooterNote={config.newsFooterNote}
        newsHeading={config.newsHeading}
      />

      <MarketDetailDrawer
        AnalysisOverlay={config.AnalysisOverlay}
        DetailBody={config.DetailBody}
        DetailPosition={config.DetailPosition}
        DummyDetailBody={config.DummyDetailBody}
        allDealings={dealings}
        dealing={selectedDealing}
        fmt={config.priceFormat}
        formatTickerDisplay={config.formatTickerDisplay}
        gating={gating}
        locale={config.locale}
        showLogo={logosEnabled}
        onClose={() => setSelectedKey(null)}
        onSelectDealing={(d) => setSelectedKey(d.key)}
      />

      <MarketExplainerSheet
        marketId={config.id}
        open={explainerOpen}
        onClose={() => setExplainerOpen(false)}
      />

      <DailySummarySheet
        date={openSummaryDate}
        onClose={() => setOpenSummaryDate(null)}
        onSelectDeal={(deal) => {
          // UK MarketDealing.key === dealing.id; this surface is UK-only
          // because /api/daily-summary is UK-only.
          setOpenSummaryDate(null);
          setSelectedKey(deal.id);
        }}
      />
    </DefaultLayout>
  );
}
