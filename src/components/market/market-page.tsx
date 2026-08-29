import type {
  ChartMode,
  MarketConfig,
  MarketDealing,
  MarketStats,
  NewsPayload,
  SignalFilterValue,
} from "@/lib/markets/types";
import type { MonthlySummaryListItem } from "@/types/ddbx";

import {
  CalendarDaysIcon,
  ChevronDownIcon,
  LockClosedIcon,
  LockOpenIcon,
} from "@heroicons/react/24/outline";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  MemberAppTeaserRow,
  MemberClusterRow,
  WeekendBreak,
} from "./market-row";
import { type SparkBar } from "./market-row-spark";
import { MarketChannel } from "./market-channel";
import { MarketFaq } from "./market-faq";
import { MarketPlans } from "./market-plans";
import { WinnersSection } from "./winners-section";
import {
  bucketByMonth,
  buildUniversalFilters,
  computeRowMetric,
  groupByCompany,
  groupByPerson,
  latestPricesAsOf,
  livePerfValue,
  shortDate,
  todayKeyIso,
  weekendBetween,
} from "./market-utils";

import { BrokerReviewsPromo } from "@/components/brokers/broker-reviews-promo";
import { Skeleton } from "@/components/skeleton";
import { CollapsedDayTeaser } from "@/components/discretion/collapsed-day-teaser";
import { Tooltip } from "@/components/tooltip";
import {
  monthLabel,
  monthShort,
  monthSlug,
  slugToMonth,
} from "@/components/monthly/monthly-utils";
import { MonthUnlockModal } from "@/components/discretion/month-unlock-modal";
import { MonthlyRecapModal } from "@/components/monthly/monthly-recap-modal";
import { appHrefForMarket, appStoreUrlForMarketId } from "@/lib/app-store";
import { useDevicePlatform } from "@/lib/use-device-platform";
import { buildChannelPerformance } from "@/lib/performance/channel-summary";
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

/** Discretion mode: how many of the most recent disclosure days stay fully
 *  expanded in the historical list. Older days collapse to a single deal plus
 *  an "X more deals" row that nudges toward the app. */
const REAL_HISTORY_DAYS = 2;

/** Hand-drawn-style curved arrow after the timeline title — sweeps down
 *  toward the rows like a margin annotation, instead of the flat straight
 *  heroicon that read as UI chrome. */
function TimelineSwoosh({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.2}
      viewBox="0 0 24 24"
    >
      {/* Curve starts up-left, bellies right, lands pointing straight down. */}
      <path d="M5.5 4c7 2.5 9.5 7.5 9.5 15" />
      <path d="M11 15.5l4 3.5 3.5-4" />
    </svg>
  );
}

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
  /** Mobile-only list tab. Markets that opt in via config.mobileWinners land
   *  on Winners (sentence cards from the channel window); the chronological
   *  feed is one tap away. Desktop ignores this — its view switch is the
   *  filter bar's viewMode above. */
  const [mobileTab, setMobileTab] = useState<"winners" | "chronological">(
    config.mobileWinners ? "winners" : "chronological",
  );
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
  /** Hard-gated teaser list (see MarketConfig.gatedSimpleRows) — active only
   *  while discretion gating is on; flipping preview off restores the full
   *  table. */
  const simpleGatedRows = !!config.gatedSimpleRows && previewMode;

  /** Live stock prices keyed by ticker — close_pence column raw values plus
   *  the price date, because US rows need dated FX conversion. */
  const [prices, setPrices] = useState<
    Record<string, { price: number; date?: string }>
  >({});
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
   *  Markets with a `fetchChannelDealings` get the full 90-day backtest window
   *  (the page's own dealings only reach back ~a month); the tab shows its
   *  skeleton until that fetch lands and only falls back to the in-memory
   *  dealings if it fails. Markets without the fetch use the old in-memory
   *  path directly. */
  const supportsChannelPerf = !!config.supportsChannelPerformance;
  const fetchChannelDealings = config.fetchChannelDealings;
  const [channelDealings, setChannelDealings] = useState<
    MarketDealing<W>[] | null
  >(null);
  const [channelFetchFailed, setChannelFetchFailed] = useState(false);

  useEffect(() => {
    if (!supportsChannelPerf || !fetchChannelDealings) return;
    let cancelled = false;

    fetchChannelDealings()
      .then((rows) => {
        if (!cancelled) setChannelDealings(rows);
      })
      .catch(() => {
        if (!cancelled) setChannelFetchFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [supportsChannelPerf, fetchChannelDealings]);

  const channelPerformance = useMemo(() => {
    if (!supportsChannelPerf) return undefined;
    if (fetchChannelDealings) {
      if (channelDealings)
        return buildChannelPerformance(channelDealings, { assumeBuys: true });
      // Window still loading: keep the skeleton rather than briefly showing
      // ~30 days of numbers under a 90-day caption.
      if (!channelFetchFailed) return undefined;
    }

    return buildChannelPerformance(dealings);
  }, [
    supportsChannelPerf,
    fetchChannelDealings,
    channelDealings,
    channelFetchFailed,
    dealings,
  ]);
  // Store link the in-app unlock CTAs point to, resolved for the visitor's
  // device (Android → Play, else App Store). When the market has no truthful
  // listing for this platform, the CTA lands on the market's /download page
  // — never another market's app.
  const platform = useDevicePlatform();
  const channelAppHref = appHrefForMarket(config.id, platform);
  const channelDiscretion = gating?.enabled ?? false;
  /** Contributor cards deep-link into the deal drawer. UK has a dedicated
   *  /dealings/:id route; other markets stay on their own page and open the
   *  drawer via the `?deal=` param (search-only Link keeps the pathname). */
  const channelDealHref = useCallback(
    (id: string) =>
      config.id === "uk"
        ? `/dealings/${id}`
        : `?deal=${encodeURIComponent(id)}`,
    [config.id],
  );

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

  useEffect(() => {
    if (!livePricesEnabled) return;
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
      })
      .catch(() => undefined);
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

  // Filter pipeline: search narrows the source rows first, then Signal,
  // Strength, and market-specific axes compose over that result for the one
  // unified filings grid.
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

  const monthBuckets = useMemo(
    () =>
      // Today belongs in the same chronological grid as every other filing.
      // Passing no excluded date prevents the bucketer from holding it out for
      // a separate hero treatment.
      bucketByMonth(filteredDealings, "", {
        locale: config.locale,
        isSkipped: config.isSkipped,
        currentPriceOf: stockCurrentForDealing,
      }),
    [filteredDealings, config.locale, config.isSkipped, stockCurrentForDealing],
  );

  // Months the recap index knows about but the dealings payload doesn't
  // reach (the fetch covers ~two months) — rendered as locked app-only
  // month headers below the real buckets so the archive's depth shows.
  const appOnlyMonths = useMemo(() => {
    const bucketIsos = new Set(
      monthBuckets.map((m) => m.days[0]?.key.slice(0, 7)),
    );

    return recapMonths.filter((r) => !bucketIsos.has(r.month));
  }, [monthBuckets, recapMonths]);

  // Month gate: a clicked month opens the "it's in the app" modal instead
  // of expanding. Newest month always expands; older months gate only
  // while discretion is on. {label, count} of the month awaiting the
  // modal; null when closed.
  const [unlockMonth, setUnlockMonth] = useState<{
    label: string;
    count: number | null;
  } | null>(null);

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

    return Array.from(dates);
  }, [monthBuckets]);
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

  // Trade-anchor return for one dealing — the server snapshot first (renders
  // without a price fetch, and matches what the app shows), the client
  // computation as the fallback. Shared by the by-gain ordering and the
  // collapsed-day teaser's "up +X%" headline so the two can't disagree.
  const returnPctOf = useCallback(
    (d: MarketDealing<W>): number | null => {
      const snapshot = d.livePerformance?.return_pct_trade ?? null;

      if (snapshot != null) return snapshot;
      const current = stockCurrent(d.ticker);

      if (d.entryPrice == null || current == null || d.entryPrice <= 0)
        return null;

      return ((current - d.entryPrice) / d.entryPrice) * 100;
    },
    [stockCurrent],
  );

  const byGain = useMemo(() => {
    return filteredDealings
      .map((d) => {
        const pct = returnPctOf(d);

        return pct == null ? null : { dealing: d, pct };
      })
      .filter((x): x is { dealing: MarketDealing<W>; pct: number } => x != null)
      .sort((a, b) => b.pct - a.pct);
  }, [filteredDealings, returnPctOf]);

  // Drawer should open for any clicked dealing, even ones the active
  // signal/strength filter would hide, including direct and shared links.
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
  const previewStatus =
    gating &&
    (() => {
      const tooltipText = previewMode
        ? `Web preview is on: you can open ${gating.freeQuota} full analysis${gating.freeQuota === 1 ? "" : "es"} per day on web. Use the app for unlimited full analysis.`
        : "Web preview is off: full analysis is unlocked on web.";

      return (
        <Tooltip className="inline-flex" content={tooltipText}>
          <button
            aria-label="Explain web preview mode"
            // px/py match the Filters sheet trigger so the two pills read as
            // one control row at the same height.
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors cursor-help ${
              previewMode
                ? "border-[#d8d0c6] bg-[#f4eee6] text-[#7a634b] dark:border-separator dark:bg-white/[0.03] dark:text-[#c9b49f]"
                : "border-positive/25 bg-positive/10 text-positive dark:border-positive/30 dark:bg-positive/10"
            }`}
            data-ga-event="cta_web_preview_explain"
            data-ga-label={`Web preview ${previewMode ? "on" : "off"}`}
            type="button"
          >
            {previewMode ? (
              <LockClosedIcon className="h-4 w-4 shrink-0" />
            ) : (
              <LockOpenIcon className="h-4 w-4 shrink-0" />
            )}
            <span>
              Web preview {previewMode ? "on" : "off"}
              {previewMode &&
                ` · ${
                  unlocksLeftToday > 0
                    ? `${unlocksLeftToday} unlock left`
                    : "no unlocks left"
                }`}
            </span>
          </button>
        </Tooltip>
      );
    })();

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
  // `indent` lines a row's logo up under a MemberClusterRow's avatar (the
  // master indents its portrait past an expand chevron). Defaulted off so the
  // bare `.map(renderDayRow)` call sites — where map passes an index, not a
  // boolean — stay un-indented.
  const renderRow = (
    d: MarketDealing<W>,
    indent = false,
    hideInsider = false,
  ) => (
    <MarketRow
      key={d.key}
      hideDate
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
      hideInsider={hideInsider}
      indent={indent}
      isMuted={config.isRowMuted}
      locale={config.locale}
      noPosteriorData={stockNoPosteriorData(d)}
      selected={selectedKey === d.key}
      showLegCount={config.showLegCount}
      showLogo={logosEnabled}
      stockBars={stockBars[d.ticker]}
      stockCurrentMajor={stockCurrent(d.ticker)}
      stockEntry={stockEntry(d)}
      onSelect={() => openDealing(d)}
    />
  );
  const renderDayRow = (d: MarketDealing<W>) => renderRow(d);

  // Discretion list collapse: keep the most recent REAL_HISTORY_DAYS disclosure
  // days fully expanded; older days collapse to a single deal + an "X more"
  // nudge row. Only active when discretion gating is on (UK teaser today).
  const recentRealDays = useMemo(() => {
    const past = dealings
      .map((d) => d.disclosedDate.slice(0, 10))
      .filter((iso) => iso < todayIso);

    return new Set(
      [...new Set(past)].sort().reverse().slice(0, REAL_HISTORY_DAYS),
    );
  }, [dealings, todayIso]);
  // Teaser-row markets (Congress) skip the collapse entirely: every day
  // renders the flat avatar → logos rows, which hide more than the collapsed
  // "N filings landed" card ever did.
  const isDayCollapsed = (dayKey: string) =>
    !simpleGatedRows &&
    (gating?.enabled ?? false) &&
    dayKey < todayIso &&
    !recentRealDays.has(dayKey);

  // The first click opens the analysis directly — no confirmation step. The
  // old UnlockConfirmModal asked ("Use today's free analysis?", store button
  // primary) BEFORE any analysis had been shown, which put the ask ahead of
  // the proof. The boundary is still legible: the drawer brackets the freebie
  // with FreeAnalysisNotice, and subsequent opens hit the gated overlay.
  const openDealing = useCallback(
    (d: MarketDealing<W>) => setSelectedKey(d.key),
    [setSelectedKey],
  );

  // The prominent ("suggested") rows of a day. When the market opts into
  // company clustering, multiple same-company buys on the same day collapse
  // into one expandable MarketClusterRow (mirrors iOS ticker clustering);
  // otherwise each dealing renders as its own row. Skipped rows never cluster.
  const renderSuggestedRows = (rows: MarketDealing<W>[]) => {
    // Person-grouping wins when enabled: fold each member's buys for the day
    // into one MemberClusterRow (portrait → the companies they bought).
    if (config.clusterByPerson) {
      // Hard-gated teaser mode (Congress): one flat row per member — avatar +
      // name, then the logos of what they bought — linking straight to the
      // app. No amounts, no performance, no drawer.
      if (simpleGatedRows) {
        return groupByPerson(rows).map((group) => (
          <MemberAppTeaserRow
            key={`teaser-${group.key}`}
            appHref={channelAppHref}
            chamber={group.chamber}
            insiderName={group.insiderName}
            insiderPhotoUrl={group.insiderPhotoUrl}
            insiderRole={group.insiderRole}
            party={group.party}
            tickers={Array.from(
              new Set(group.dealings.map((d) => d.ticker).filter(Boolean)),
            )}
          />
        ));
      }

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

    return renderCompanyGroups(rows);
  };

  /** Same-day same-ticker rows folded into one expandable cluster; singles
   *  render inline. Shared by the suggested rows AND (on company-clustered
   *  markets) the skipped rows — a wall of nine identical skipped Form 4s
   *  reads no better for being skipped. */
  const renderCompanyGroups = (rows: MarketDealing<W>[]) =>
    groupByCompany(rows).map((group) =>
      group.count > 1 ? (
        <MarketClusterRow
          key={`cluster-${group.key}`}
          company={group.company}
          count={group.count}
          formatTickerDisplay={config.formatTickerDisplay}
          representative={group.representative}
          showLegCount={config.showLegCount}
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

  /** Skipped rows stay flat unless the market clusters by company. */
  const renderSkippedRows = (rows: MarketDealing<W>[]) =>
    config.clusterByCompany
      ? renderCompanyGroups(rows)
      : rows.map(renderDayRow);

  const emptyState = filteredDealings.length === 0 && !loading && (
    <div className="bg-sheet dark:bg-surface rounded-xl px-4 py-10 text-center text-sm text-muted">
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
          bullets={config.heroBullets}
          hasRightDrawer={hasNewsSource || supportsChannelPerf}
          hasTopNotice={!!config.topNotice}
          headline={config.heroHeadline}
          marketId={config.id}
          marketLabel={config.marketLabel}
          primaryCtaHref={appStoreUrlForMarketId(config.id)}
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
                    ? "bg-brand-brown/15 text-[#3d2b1a] dark:text-brand-tan"
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

        {/* Mobile-only channel. The fixed right rail is hidden on phones, so
            Performance + News would otherwise be invisible there — surface the
            same tabbed channel inline before the filings grid. */}
        <MarketChannel
          appHref={channelAppHref}
          benchmarkLabel={config.channelBenchmarkLabel}
          dealHref={channelDealHref}
          discretionEnabled={channelDiscretion}
          formatStake={config.priceFormat.formatValue}
          news={hasNewsSource ? news : undefined}
          newsFooterNote={config.newsFooterNote}
          newsHeading={config.newsHeading}
          performance={channelPerformance}
          supportsPerformance={supportsChannelPerf}
          variant="inline"
        />

        {/* Loading skeleton mirrors the chronological layout the data lands
            in — month header bar, then the darker well with date-chip rail +
            white day cards — so nothing jumps when the rows paint. */}
        {loading && filteredDealings.length === 0 && (
          <div
            className={`bg-sheet dark:bg-surface rounded-xl overflow-hidden animate-content-in ${
              config.mobileWinners && mobileTab === "winners"
                ? "hidden md:block"
                : ""
            }`}
          >
            <div className="flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-3">
                <CalendarDaysIcon className="w-5 h-5 shrink-0 text-muted/40" />
                <Skeleton className="h-6 w-36 rounded" />
              </div>
              <Skeleton className="h-3 w-24 rounded" />
            </div>
            <div className="px-3 py-3 space-y-4 bg-[#ece8e5] dark:bg-black/15 rounded-b-xl">
              {[3, 2].map((rowCount, dayIdx) => (
                <div
                  key={dayIdx}
                  className="xl:grid xl:grid-cols-[3rem_minmax(0,1fr)] xl:items-start xl:gap-3"
                >
                  {/* Date chip — rail on xl, inline strip below. */}
                  <div className="hidden xl:block pt-2">
                    <Skeleton className="h-12 w-10 rounded-lg" />
                  </div>
                  <div className="mb-2 flex items-center gap-3 px-1 xl:hidden">
                    <Skeleton className="h-10 w-9 rounded-lg" />
                    <Skeleton className="h-3 w-10 rounded" />
                    <span
                      aria-hidden
                      className="h-px flex-1 bg-foreground/10"
                    />
                  </div>
                  <div className="rounded-xl overflow-hidden bg-white dark:bg-surface-secondary divide-y divide-black/[0.06] dark:divide-separator">
                    {Array.from({ length: rowCount }).map((_, i) => (
                      <MarketRowSkeleton
                        key={i}
                        hideDate
                        valueColumnClass={config.priceFormat.valueColumnClass}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* THE FILTER BAR AND THE LIST IT FILTERS, IN ONE BOX.
            A sticky element sticks for as long as its PARENT is on screen, and
            this one's parent was the whole page section — so once the reader
            scrolled past the last dealing the search field, the preview counter
            and the Filters button stayed pinned over the FAQ and the closing
            band, hovering above content none of them can act on. Wrapping the
            bar together with the two view bodies makes the list itself the
            stick range: the bar rides the table and releases the moment the
            table ends. No scroll listener, no measurement.
            `space-y-6` is the section's own rhythm, restated here because the
            wrapper now owns the gaps between these children (the `-mt-6` tucks
            on the view bodies cancel it to seat them under the bar). */}
        <div className="space-y-6">
          {/* Sticky filter bar — single instance shared by both view bodies.
            Sits right beneath the navbar with rounded top + opaque bg so
            it doubles as the table's curved top edge AND masks anything
            scrolling beneath it. Stays visible when the hero filter
            narrows the list to zero so the user can switch back. */}
          {/* Advance declarations. Rendered ABOVE the dealings feed when the
              market marks them as leading, because for a market with this
              disclosure regime the declaration is the event and the completed
              purchase that follows is only its receipt. Markets without a
              plans config render exactly as before. */}
          {config.plans?.leads ? (
            <MarketPlans
              emptyLabel={config.plans.emptyLabel}
              fetchPlans={config.plans.fetchPlans}
              formatValue={
                config.priceFormat?.formatValue ?? ((v: number) => String(v))
              }
              subtitle={config.plans.subtitle}
              title={config.plans.title}
            />
          ) : null}

          {dealings.length > 0 && (
            <div
              ref={filterBarRef}
              className="sticky top-[64px] z-20 -mx-4 md:-mx-6 bg-sheet dark:bg-surface rounded-t-xl border-b border-hairline/50 dark:border-separator/30 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]"
            >
              {/* Mobile list tabs — Winners (sentence cards from the channel
                window) vs the chronological feed. Rides inside the sticky
                wrapper so it inherits stickiness and the measured
                filterBarHeight keeps month-header offsets aligned. */}
              {config.mobileWinners && (
                <div
                  className="flex justify-center px-4 py-2.5 md:hidden"
                  role="tablist"
                >
                  <div className="inline-flex rounded-full border border-separator bg-surface/40 p-1">
                    {(
                      [
                        { id: "winners", label: "Winners" },
                        { id: "chronological", label: "Chronological" },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        aria-selected={mobileTab === t.id}
                        className={`text-sm px-4 py-1.5 rounded-full transition-colors font-medium ${
                          mobileTab === t.id
                            ? "bg-brand-brown/15 text-[#3d2b1a] dark:text-brand-tan"
                            : "text-muted hover:text-foreground"
                        }`}
                        data-ga-event="cta_home_list_tab"
                        data-ga-label={t.label}
                        role="tab"
                        onClick={() => setMobileTab(t.id)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Search + filters are hidden on mobile — the wrapper stays so the
                table keeps its rounded top edge and the -mt-6 tuck anchor. */}
              <div className="hidden md:block">
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
                  searchStatus={previewStatus}
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
              </div>
            </div>
          )}

          {/* Winners tab body — mobile only. Fed by the 90-day channel window
              (the page fetch only reaches ~a month), so it renders
              independently of the chronological list's loading state. */}
          {config.mobileWinners && mobileTab === "winners" && (
            <div className="animate-content-in md:hidden">
              <WinnersSection
                appHref={channelAppHref}
                dealHref={channelDealHref}
                dealings={channelDealings}
                failed={channelFetchFailed}
                formatValue={config.priceFormat.formatValue}
                onShowChronological={() => setMobileTab("chronological")}
              />
            </div>
          )}

          {/* The winners tab carries its own empty state, so the page-level
              one stays desktop-only while winners is active. */}
          {config.mobileWinners && mobileTab === "winners" ? (
            <div className="hidden md:block">{emptyState}</div>
          ) : (
            emptyState
          )}

          {/* By-gain view */}
          {filteredDealings.length > 0 && viewMode === "by-gain" && (
            <div className="bg-sheet dark:bg-surface rounded-b-xl animate-content-in -mt-6 -mx-4 md:-mx-6">
              <MarketRowHeader
                benchmarkLabel={config.benchmarkLabel}
                chartMode={chartMode}
                columnHelp={config.columnHelp}
                showLegCount={config.showLegCount}
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
                    showLegCount={config.showLegCount}
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

          {/* Chronological / month + day buckets. Stays mounted (just hidden)
              while the mobile Winners tab is active so switching back costs
              no refetch or scroll jank; desktop always sees it. */}
          {filteredDealings.length > 0 && viewMode === "chronological" && (
            <div
              className={`space-y-6 animate-content-in -mt-6 -mx-4 md:-mx-6 ${
                config.mobileWinners && mobileTab === "winners"
                  ? "hidden md:block"
                  : ""
              }`}
            >
              {monthBuckets.map((month, monthIdx) => {
                // Older months gate behind the app while discretion is on:
                // the header stays (the archive's depth is the point) but a
                // click opens the month-unlock modal instead of expanding.
                const monthGated = (gating?.enabled ?? false) && monthIdx > 0;
                const monthOpen =
                  !monthGated && (openMonths?.has(month.key) ?? false);
                // bucketByMonth keys on "<MonthName>-<year>"; derive the ISO
                // "YYYY-MM" from any day in the bucket to match the recap index.
                const monthIso = month.days[0]?.key.slice(0, 7);
                const hasReport = !!monthIso && recapMonthSet.has(monthIso);
                // Days that actually render something — used to slot the mobile
                // broker promo after the first two, so empty days (which render
                // nothing) don't throw the position off.
                const contentDays = month.days.filter(
                  (d) => d.suggested.length > 0 || d.skipped.length > 0,
                );

                return (
                  <div key={month.key}>
                    <div
                      className={`sticky z-10 ${monthIdx === 0 ? "" : "pt-3"} bg-[#f5f0e8] dark:bg-background`}
                      style={{
                        top: `${64 + (filterBarHeight || 0)}px`,
                      }}
                    >
                      {/* Two actions share this row: the row itself toggles (or
                        unlocks) the month, and "View report" opens the recap.
                        They can't nest — an interactive control inside a
                        <button> is invalid, and a screen reader folds the inner
                        label into the outer button's name. So the row action is
                        a real <button> stretched behind the content, and the
                        content layer is pointer-transparent except where the
                        second button opts back in. Both are real buttons, both
                        are tabbable, both show a focus ring. */}
                      <div
                        className={`relative w-full flex items-center justify-between px-6 py-5 bg-sheet dark:bg-surface ${monthIdx === 0 ? "" : "rounded-t-xl"} ${monthOpen ? "" : "rounded-b-xl"}`}
                      >
                        <button
                          aria-expanded={monthGated ? undefined : monthOpen}
                          className="absolute inset-0 rounded-[inherit] transition-colors outline-none hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-brown/40 dark:hover:bg-white/[0.03] dark:focus-visible:ring-brand-tan/40"
                          data-ga-event={
                            monthGated
                              ? "cta_month_unlock_open"
                              : "toggle_month"
                          }
                          data-ga-label={
                            monthGated
                              ? `${month.label} ${month.year} · ${month.count}`
                              : `${month.label} ${month.year}`
                          }
                          onClick={() =>
                            monthGated
                              ? setUnlockMonth({
                                  label: `${month.label} ${month.year}`,
                                  count: month.count,
                                })
                              : toggleMonth(month.key)
                          }
                        >
                          <span className="sr-only">
                            {monthGated
                              ? `Unlock ${month.label} ${month.year}`
                              : `${month.label} ${month.year}`}
                          </span>
                        </button>
                        <div className="pointer-events-none relative flex items-center gap-3 text-left">
                          <CalendarDaysIcon className="w-5 h-5 text-muted shrink-0" />
                          <div className="text-xl font-semibold">
                            {month.label} {month.year}
                            {hasReport && (
                              <>
                                <span className="mx-2 text-muted">·</span>
                                <button
                                  className="pointer-events-auto rounded-sm text-sm font-medium text-brand-brown outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:text-brand-tan dark:focus-visible:ring-brand-tan/40"
                                  data-ga-event="cta_view_month_report"
                                  data-ga-label={`View report ${monthIso}`}
                                  type="button"
                                  onClick={() => openRecap(monthIso!)}
                                >
                                  View report
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="pointer-events-none relative flex items-center gap-3 shrink-0">
                          <span className="text-xs text-muted">
                            {config.isSkipped
                              ? month.skippedCount > 0
                                ? `${month.suggestedCount} analysed · ${month.skippedCount} skipped`
                                : `${month.suggestedCount} analysed`
                              : `${month.count} ${month.count === 1 ? "filing" : "filings"}`}
                          </span>
                          {monthGated ? (
                            <LockClosedIcon className="w-4 h-4 text-muted shrink-0" />
                          ) : (
                            <ChevronDownIcon
                              className={`w-5 h-5 text-muted shrink-0 transition-transform duration-200 ${monthOpen ? "rotate-180" : ""}`}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    {monthOpen && (
                      <div className="bg-sheet dark:bg-surface rounded-b-xl">
                        {/* Teaser mode has no table columns to head — the rows
                          are flat avatar → logos links. */}
                        {!simpleGatedRows && (
                          <div className="xl:grid xl:grid-cols-[3rem_minmax(0,1fr)] xl:gap-3 xl:px-3 xl:bg-black/[0.04] dark:xl:bg-white/[0.05]">
                            <div className="hidden xl:flex items-center border-b border-black/[0.08] py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted/80 dark:border-white/[0.08]">
                              Date
                            </div>
                            <MarketRowHeader
                              hideDate
                              inset
                              benchmarkLabel={config.benchmarkLabel}
                              chartMode={chartMode}
                              columnHelp={config.columnHelp}
                              showLegCount={config.showLegCount}
                              valueColumnClass={
                                config.priceFormat.valueColumnClass
                              }
                            />
                          </div>
                        )}
                        <div className="px-3 py-3 space-y-4 bg-[#ece8e5] dark:bg-black/15 rounded-b-xl">
                          {/* Plain-English claim above the first day — names
                            the market's own insider term and the one fact
                            that matters: their own money. */}
                          {monthIdx === 0 && config.timelineTitle && (
                            <h2 className="px-1 pt-2 pb-1 text-xl font-semibold leading-snug tracking-[-0.02em] text-foreground/90 md:text-2xl">
                              {config.timelineTitle}
                              <TimelineSwoosh
                                aria-hidden
                                className="ml-2 inline h-6 w-6 translate-y-1 text-brand-brown/60 dark:text-brand-tan/70 md:h-7 md:w-7"
                              />
                            </h2>
                          )}
                          {contentDays.map((day, dayIdx) => {
                            const isIntroDay =
                              day.key === introDayKey && !intro.dismissed;
                            const collapsed = isDayCollapsed(day.key);
                            const collapsedDeals = collapsed
                              ? [...day.suggested, ...day.skipped]
                              : [];
                            // A gap that straddles Sat/Sun gets a labelled
                            // break so the timeline reads in trading weeks
                            // rather than one undifferentiated run of days.
                            const prevDay = contentDays[dayIdx - 1];
                            const weekendBreak =
                              prevDay != null &&
                              weekendBetween(prevDay.key, day.key);

                            return (
                              <Fragment key={day.key}>
                                {weekendBreak && <WeekendBreak />}
                                <div className="xl:grid xl:grid-cols-[3rem_minmax(0,1fr)] xl:items-start xl:gap-3">
                                  <MarketDayHeader
                                    day={day.day}
                                    isoDate={day.key}
                                    locale={config.locale}
                                    variant="rail"
                                    weekday={day.weekday}
                                  />
                                  {/* Below xl the date sits above the card on
                                    the well, mirroring the desktop rail, so
                                    the scroll reads as a dated timeline. */}
                                  <MarketDayHeader
                                    day={day.day}
                                    isoDate={day.key}
                                    locale={config.locale}
                                    weekday={day.weekday}
                                  />
                                  <div
                                    className={`rounded-xl overflow-hidden bg-white dark:bg-surface-secondary ${
                                      isIntroDay
                                        ? ""
                                        : "divide-y divide-black/[0.06] dark:divide-separator"
                                    }`}
                                  >
                                    {config.id === "uk" &&
                                      !collapsed &&
                                      dailySummaries.get(day.key) && (
                                        <MarketDaySummaryRow
                                          headline={
                                            dailySummaries.get(day.key)!
                                              .headline
                                          }
                                          isToday={day.key === todayIso}
                                          valueColumnClass={
                                            config.priceFormat.valueColumnClass
                                          }
                                          onOpen={() =>
                                            setOpenSummaryDate(day.key)
                                          }
                                        />
                                      )}
                                    {collapsed ? (
                                      // Older day under discretion: no real rows —
                                      // an avatar-group teaser card with one smart
                                      // headline (best gain → value → signal →
                                      // quantity) that links to the app.
                                      <CollapsedDayTeaser
                                        appHref={channelAppHref}
                                        deals={collapsedDeals}
                                        fmt={config.priceFormat}
                                        isSignal={
                                          config.isSignal ?? isSignalDealing
                                        }
                                        locale={config.locale}
                                        marketId={config.id}
                                        returnPctOf={returnPctOf}
                                        showLogo={logosEnabled}
                                        variant={dayIdx % 2}
                                      />
                                    ) : config.clusterByPerson ? (
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
                                        <div className="m-2 overflow-hidden rounded-xl bg-sheet ring-1 ring-black/[0.07] divide-y divide-black/[0.06] dark:bg-white/[0.04] dark:ring-white/10 dark:divide-separator">
                                          <MarketIntroBanner
                                            onDismiss={intro.dismiss}
                                            onExplain={() =>
                                              setExplainerOpen(true)
                                            }
                                          />
                                          {renderSuggestedRows(day.suggested)}
                                        </div>
                                        {day.skipped.length > 0 && (
                                          <div className="divide-y divide-black/[0.06] border-t border-black/[0.06] dark:divide-separator dark:border-separator">
                                            {renderSkippedRows(day.skipped)}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        {renderSuggestedRows(day.suggested)}
                                        {renderSkippedRows(day.skipped)}
                                      </>
                                    )}
                                  </div>
                                </div>
                                {/* Broker teaser slotted into the table after the
                                  first two days (UK only) — a thin one-line bar
                                  on all breakpoints, beside the right rail. */}
                                {monthIdx === 0 &&
                                  config.id === "uk" &&
                                  dayIdx === 1 && (
                                    <BrokerReviewsPromo
                                      className="hidden md:flex xl:ml-[3.75rem]"
                                      variant="bar"
                                    />
                                  )}
                              </Fragment>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Months the fetch doesn't reach — locked headers so the
                archive reads deeper than the free window. A click opens
                the same month-unlock modal, minus a count. */}
              {appOnlyMonths.map((r) => (
                <div key={r.month} className="pt-3">
                  {/* Same two-action row as the month headers above — see the
                    note there for why the row action is a stretched button
                    rather than a wrapper around the recap link. */}
                  <div className="relative w-full flex items-center justify-between rounded-xl px-6 py-5 bg-sheet dark:bg-surface">
                    <button
                      className="absolute inset-0 rounded-[inherit] transition-colors outline-none hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-brown/40 dark:hover:bg-white/[0.03] dark:focus-visible:ring-brand-tan/40"
                      data-ga-event="cta_month_unlock_open"
                      data-ga-label={`${monthLabel(r.month)} · app-only`}
                      onClick={() =>
                        setUnlockMonth({
                          label: monthLabel(r.month),
                          count: null,
                        })
                      }
                    >
                      <span className="sr-only">
                        Unlock {monthLabel(r.month)}
                      </span>
                    </button>
                    <div className="pointer-events-none relative flex items-center gap-3 text-left">
                      <CalendarDaysIcon className="w-5 h-5 text-muted shrink-0" />
                      <div className="text-xl font-semibold">
                        {monthLabel(r.month)}
                        <span className="mx-2 text-muted">·</span>
                        <button
                          className="pointer-events-auto rounded-sm text-sm font-medium text-brand-brown outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:text-brand-tan dark:focus-visible:ring-brand-tan/40"
                          data-ga-event="cta_view_month_report"
                          data-ga-label={`View report ${r.month}`}
                          type="button"
                          onClick={() => openRecap(r.month)}
                        >
                          View report
                        </button>
                      </div>
                    </div>
                    <div className="pointer-events-none relative flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted">In the app</span>
                      <LockClosedIcon className="w-4 h-4 text-muted shrink-0" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* ^ end of the filter bar's stick range. Anything below this line
            scrolls with the bar released. */}

        {pricesAsOf && (
          <div className="text-center text-[11px] text-muted/70">
            Prices as of {shortDate(pricesAsOf, config.locale)}
          </div>
        )}

        {config.plans && !config.plans.leads ? (
          <MarketPlans
            emptyLabel={config.plans.emptyLabel}
            fetchPlans={config.plans.fetchPlans}
            formatValue={
              config.priceFormat?.formatValue ?? ((v: number) => String(v))
            }
            subtitle={config.plans.subtitle}
            title={config.plans.title}
          />
        ) : null}

        <MarketFaq items={config.faq} />

        {/* Mobile-only UK broker teaser — relocated from under the hero: the
            comparison directory is a monetising detour, not the first thing a
            cold visitor needs. Desktop keeps its in-table bar + right rail. */}
        {config.id === "uk" && (
          <BrokerReviewsPromo
            className="md:hidden"
            gaLabel="market_post_faq_mobile"
          />
        )}

        {/* Company focus — cluster spotlights + top performers, computed from
            the already-loaded channel window. Config slot so the shell stays
            market-agnostic. */}
        {config.HomeSpotlights && (
          <config.HomeSpotlights
            dealings={channelDealings}
            failed={channelFetchFailed}
          />
        )}
      </section>

      <MarketChannel
        appHref={channelAppHref}
        benchmarkLabel={config.channelBenchmarkLabel}
        dealHref={channelDealHref}
        discretionEnabled={channelDiscretion}
        formatStake={config.priceFormat.formatValue}
        news={hasNewsSource ? news : undefined}
        newsFooterNote={config.newsFooterNote}
        newsHeading={config.newsHeading}
        performance={channelPerformance}
        supportsPerformance={supportsChannelPerf}
        variant="aside"
      />

      <MarketDetailDrawer
        AnalysisOverlay={config.AnalysisOverlay}
        DetailBody={config.DetailBody}
        DetailPosition={config.DetailPosition}
        DummyDetailBody={config.DummyDetailBody}
        allDealings={dealings}
        appHref={channelAppHref}
        dealing={selectedDealing}
        detailFields={config.detailFields}
        filingHref={config.filingHref}
        fmt={config.priceFormat}
        formatTickerDisplay={config.formatTickerDisplay}
        gating={gating}
        insiderLabel={config.insiderLabel}
        locale={config.locale}
        showLogo={logosEnabled}
        onClose={() => setSelectedKey(null)}
        onSelectDealing={openDealing}
      />

      <MonthUnlockModal
        appHref={channelAppHref}
        count={unlockMonth?.count ?? null}
        monthLabel={unlockMonth?.label ?? ""}
        open={unlockMonth != null}
        onClose={() => setUnlockMonth(null)}
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
