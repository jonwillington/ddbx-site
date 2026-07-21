import type {
  IChartApi,
  ISeriesApi,
  MouseEventParams,
  SeriesMarker,
  Time,
} from "lightweight-charts";
import type { PriceFormat } from "@/components/position-card";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaSeries,
  ColorType,
  LineStyle,
  TrackingModeExitMode,
  createChart,
  createSeriesMarkers,
} from "lightweight-charts";

import { api } from "@/lib/api";
import { barForDate, sanitiseBars } from "@/lib/prices";

type Period = "around" | "ytd" | "max";

const PERIODS: { key: Period; label: string }[] = [
  { key: "around", label: "Around buy" },
  { key: "ytd", label: "YTD" },
  { key: "max", label: "Max" },
];

/** How many calendar days of pre-buy context to include on the "Around buy"
 *  tab. Gives the reader a sense of where the price was heading when the
 *  director stepped in. */
const PRE_BUY_CONTEXT_DAYS = 5;

const CHART_HEIGHT = 168;

/** Bar depth requested per ticker. Matches `historyDays` in the iOS deal
 *  detail view so both clients cut "Max" to the same window. */
const HISTORY_DAYS = 1825;

/** Marker `size` multipliers. lightweight-charts scales a circle's radius by
 *  `clamp(barSpacing, 12, 30) · size · 0.8`; with only a handful of bars the
 *  spacing caps at 30, so the default size 1 renders an oversized ~24px dot
 *  that dominates the line. ~0.5 brings the trade/disclosure markers down to
 *  a restrained ~12px. */
const TRADE_MARKER_SIZE = 0.6;
const DISCLOSED_MARKER_SIZE = 0.5;

/** Inline price chart for one dealing. Renders via TradingView's
 *  lightweight-charts (Canvas) — gives crisp lines, built-in crosshair,
 *  proper time axis with date labels, and clean marker support out of the
 *  box. Period switcher narrows the on-screen window (Around buy / YTD /
 *  Max); markers highlight the trade and disclosure dates so the reader
 *  can see the gap between when the deal happened and when it surfaced. */
export function MiniPriceChart({
  tickerForApi,
  tickerForDisplay,
  tradeDate,
  disclosedDate,
  entryPrice,
  fmt,
  normalizeClose,
  muted = false,
  showFigures = true,
}: {
  tickerForApi: string;
  tickerForDisplay: string;
  tradeDate: string;
  /** Disclosure date (regulator-receipt). When present and distinct from
   *  the trade date, the chart renders a second marker so the reader can
   *  see how long the news took to surface. */
  disclosedDate?: string;
  /** Per-share quote price on the trade date — must be in the same unit
   *  the chart will render closes in (after `normalizeClose`). */
  entryPrice: number;
  fmt: PriceFormat;
  /** Map a raw `close_pence` API value to the rendered quote unit. UK
   *  defaults to identity (prices are already pence). US passes a USD
   *  converter because Yahoo's USD bars land as cents-times-FX in the
   *  prices table while Form 4's `price` is in major-dollars. */
  normalizeClose?: (closePence: number, date: string) => number | null;
  /** When true, the line + headline render in neutral ink instead of
   *  buy-green / sell-red. Used for non-open-market trades (awards, schemes,
   *  placings) where the movement is real but the "winner / loser" framing
   *  would mislead. Mirrors the iOS MiniPriceChart `isMuted` flag. */
  muted?: boolean;
  /** Set false when the chart sits inside the merged price card, where the
   *  position tiles already carry Entry / Now / Return. The chart then shows
   *  only what it alone knows — the period range and the marker key. Without
   *  this the same three figures rendered twice, inches apart, which is the
   *  duplication iOS removed in b64f22f. */
  showFigures?: boolean;
}) {
  const [period, setPeriod] = useState<Period>("around");
  const [allBars, setAllBars] = useState<{ date: string; close: number }[]>([]);
  // Price + date under the crosshair while the user scrubs (hover on desktop,
  // touch-drag on mobile via tracking mode). null when the pointer is away.
  const [scrub, setScrub] = useState<{ value: number; time: string } | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const normalize = normalizeClose ?? ((n: number) => n);

  useEffect(() => {
    if (!tickerForApi) {
      setAllBars([]);

      return;
    }
    setAllBars([]);
    api
      // Five years, matching iOS's historyDays. At 365 the "Max" tab was a
      // one-year max, which for an older holding is not the shape of the
      // story — the buy sat at the very left edge with nothing before it.
      .priceHistory(tickerForApi, HISTORY_DAYS)
      .then((bars) =>
        setAllBars(
          // sanitiseBars drops non-positive / corrupt closes and collapses
          // same-day duplicates before anything downstream sees them — the
          // Low/High readout and the return both read straight off this.
          sanitiseBars(
            bars
              .map((b) => ({
                date: b.date,
                close: normalize(b.close_pence, b.date),
              }))
              .filter(
                (b): b is { date: string; close: number } => b.close != null,
              ),
          ),
        ),
      )
      .catch(() => {});
    // normalize intentionally excluded — it's a per-market closure that
    // would otherwise trigger a refetch on every render.
  }, [tickerForApi]);

  const bars = useMemo(() => {
    if (period === "around") {
      const cutoff = (() => {
        const t = new Date(tradeDate);

        t.setDate(t.getDate() - PRE_BUY_CONTEXT_DAYS);

        return t.toISOString().slice(0, 10);
      })();

      return allBars.filter((b) => b.date >= cutoff);
    }
    if (period === "ytd")
      return allBars.filter(
        (b) => b.date >= `${new Date().getFullYear()}-01-01`,
      );

    return allBars;
  }, [allBars, period, tradeDate]);

  /** The series as plotted. When disclosure post-dates the last close the
   *  line is extended flat out to that date, so the disclosure marker has a
   *  line to sit on instead of being silently dropped while its legend entry
   *  still rendered. Mirrors `postTradePoints` in the iOS chart (631f634);
   *  gated on having a real line already so we never fabricate one. */
  const plotted = useMemo(() => {
    if (bars.length < 2) return bars;
    const last = bars[bars.length - 1];

    if (disclosedDate && disclosedDate > last.date) {
      return [...bars, { date: disclosedDate, close: last.close }];
    }

    return bars;
  }, [bars, disclosedDate]);

  /** Resolved once and shared by the canvas and the legend below, so the
   *  key can never advertise a marker the chart didn't draw. */
  const placement = useMemo(() => {
    const sameDay = !disclosedDate || disclosedDate === tradeDate;

    return {
      sameDay,
      tradeBar: barForDate(plotted, tradeDate),
      discBar: sameDay ? null : barForDate(plotted, disclosedDate),
    };
  }, [plotted, tradeDate, disclosedDate]);

  const lastBar = allBars[allBars.length - 1];
  // entryPrice can arrive as 0 on a malformed filing; guard the divisor
  // rather than rendering an Infinity return.
  const hasReturn = lastBar != null && entryPrice > 0;
  const returnPct = hasReturn
    ? ((lastBar.close - entryPrice) / entryPrice) * 100
    : 0;
  // Sub-0.05% moves read as noise, not a win or a loss — iOS renders them
  // in neutral ink so a -0.0% deal doesn't flash red.
  const flat = Math.abs(returnPct) < 0.05;
  const up = hasReturn ? lastBar.close >= entryPrice : true;

  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const upText = "text-[#1e6b18] dark:text-[#5cd84a]";
  const downText = "text-[#8b2020] dark:text-[#e84d4d]";
  // Non-open-market trades drop the green/red framing — the price path is
  // real but the director didn't buy at the entry price, so the movement
  // isn't a "win".
  const neutral = muted || flat;
  const trendText = neutral ? "text-foreground/60" : up ? upText : downText;

  const lineColor = neutral
    ? isDark
      ? "rgba(255,255,255,0.5)"
      : "rgba(0,0,0,0.45)"
    : up
      ? isDark
        ? "#5cd84a"
        : "#1e6b18"
      : isDark
        ? "#e84d4d"
        : "#8b2020";
  const fillColor = neutral
    ? isDark
      ? "rgba(255,255,255,0.08)"
      : "rgba(0,0,0,0.05)"
    : up
      ? isDark
        ? "rgba(92,216,74,0.18)"
        : "rgba(30,107,24,0.12)"
      : isDark
        ? "rgba(232,77,77,0.18)"
        : "rgba(139,32,32,0.12)";

  // Lightweight-charts owns the canvas; create on mount + when bars or
  // theme change, tear down on unmount. We always render the container
  // div so the ref is stable across the loading→loaded transition.
  useEffect(() => {
    const container = containerRef.current;

    if (!container || plotted.length < 2) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: CHART_HEIGHT,
      autoSize: false,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)",
        fontSize: 10,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      timeScale: {
        borderVisible: false,
        // fixLeftEdge/fixRightEdge force the *whole* first/last bar to stay
        // visible, which re-imposes a half-bar-spacing margin and clamps the
        // setVisibleLogicalRange pin below back inward. Pan/zoom are off, so we
        // don't need them — leave them false and let the logical range run the
        // line flush to both edges.
        fixLeftEdge: false,
        fixRightEdge: false,
        rightOffset: 0,
      },
      rightPriceScale: {
        borderVisible: false,
        visible: false,
      },
      leftPriceScale: { visible: false },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
          style: LineStyle.Dashed,
          labelVisible: true,
          labelBackgroundColor: isDark ? "#1a1a1a" : "#5a4128",
        },
        horzLine: {
          width: 1,
          color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
          style: LineStyle.Dashed,
          labelVisible: false,
        },
      },
      handleScroll: false,
      handleScale: false,
      // Pan/zoom are off, so on touch a press-and-drag drives the crosshair
      // (scrub) instead of scrolling; lift the finger to clear it.
      trackingMode: { exitMode: TrackingModeExitMode.OnTouchEnd },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: fillColor,
      bottomColor: "rgba(0,0,0,0)",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: isDark ? "#1a1a1a" : "#ffffff",
    });

    series.setData(
      plotted.map((b) => ({ time: b.date as Time, value: b.close })),
    );

    // Director's paid price — faint dotted baseline. Kept subtle so the
    // price action stays the main visual.
    series.createPriceLine({
      price: entryPrice,
      color: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.22)",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: false,
      title: "",
    });

    // Trade + disclosure markers, seated on the bars `placement` resolved —
    // exact day, else the nearest *prior* close, so a weekend or bank-holiday
    // event anchors to the last price the market knew rather than drifting
    // into the next session's move. Text labels are dropped: the dates live
    // in the legend row above.
    const markers: SeriesMarker<Time>[] = [];

    if (placement.tradeBar) {
      markers.push({
        time: placement.tradeBar.date as Time,
        position: "inBar",
        color: lineColor,
        shape: "circle",
        size: TRADE_MARKER_SIZE,
      });
    }
    if (placement.discBar) {
      markers.push({
        time: placement.discBar.date as Time,
        position: "inBar",
        color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
        shape: "circle",
        size: DISCLOSED_MARKER_SIZE,
      });
    }
    if (markers.length > 0) {
      createSeriesMarkers(series, markers);
    }

    // lightweight-charts centers each bar and leaves a half-bar-spacing margin
    // at each edge (its `fitContent` default). With the handful of bars on
    // "Around buy" the bar spacing is huge, so that margin becomes a big inset
    // and the plot reads as floating rather than running edge-to-edge. Pin the
    // visible logical range to the first/last bar instead: flush on the left
    // (no marker there), with ~a marker's width on the right so the disclosure
    // dot on the latest bar isn't clipped at the canvas boundary.
    //
    // This must run *after* layout — calling it synchronously here doesn't
    // stick, because the library re-fits on its first paint and again whenever
    // the ResizeObserver applies a new width. So pin in a rAF and re-pin on
    // every resize.
    const lastIdx = plotted.length - 1;
    const pinRange = () => {
      const w = container.clientWidth;
      const rightPad = w > 0 ? (16 * lastIdx) / w : 0;

      chart
        .timeScale()
        .setVisibleLogicalRange({ from: 0, to: lastIdx + rightPad });
    };

    requestAnimationFrame(pinRange);

    chartRef.current = chart;
    seriesRef.current = series;

    // Scrub readout — report the close under the crosshair as the user hovers
    // (desktop) or drags (mobile). seriesData holds the bar at the pointer;
    // an undefined time means the pointer left the plot, so clear.
    const onCrosshairMove = (param: MouseEventParams<Time>) => {
      const data = param.time ? param.seriesData.get(series) : undefined;
      const value =
        data && "value" in data ? (data.value as number) : undefined;

      setScrub(value != null ? { value, time: String(param.time) } : null);
    };

    chart.subscribeCrosshairMove(onCrosshairMove);

    const ro = new ResizeObserver(() => {
      const c = containerRef.current;

      if (c && chartRef.current) {
        chartRef.current.applyOptions({ width: c.clientWidth });
        // applyOptions re-fits the time scale, so re-pin to the edges after.
        pinRange();
      }
    });

    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      setScrub(null);
    };
  }, [plotted, placement, entryPrice, lineColor, fillColor, isDark]);

  const visiblePrices = bars.map((b) => b.close);
  const periodHigh = visiblePrices.length ? Math.max(...visiblePrices) : null;
  const periodLow = visiblePrices.length ? Math.min(...visiblePrices) : null;
  const nowPrice = lastBar?.close ?? null;

  const formatShort = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  const tradeLabel = formatShort(tradeDate);
  // Only key a marker the canvas actually drew. `placement.discBar` is null
  // when disclosure shares the trade's day (one dot, relabelled) or when it
  // resolved to no bar at all.
  const disclosedLabel = placement.discBar ? formatShort(disclosedDate!) : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-[10px] text-muted uppercase tracking-wider font-medium">
          {tickerForDisplay}
        </span>
        {hasReturn && showFigures && (
          <span
            className={`text-[10px] font-semibold tabular-nums ${trendText}`}
          >
            {returnPct >= 0 ? "+" : ""}
            {returnPct.toFixed(1)}% since buy
          </span>
        )}
      </div>

      <div className="flex gap-1 shrink-0">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
              period === key
                ? "border-[#5a4128]/50 bg-[#5a4128]/10 text-[#5a4128] dark:text-[#a88c6e]"
                : "border-black/10 dark:border-white/10 text-muted hover:border-[#5a4128]/30"
            }`}
            onClick={() => setPeriod(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {nowPrice !== null && (
        <div className="flex items-center gap-3 shrink-0 border-t border-black/[0.07] dark:border-white/[0.07] pt-2">
          {showFigures && (
            <>
              <span className="text-[10px] text-muted">
                Entry{" "}
                <span className="font-mono tabular-nums text-foreground/70">
                  {fmt.formatPrice(entryPrice)}
                </span>
              </span>
              <span className="text-[10px] text-muted">
                Now{" "}
                <span
                  className={`font-mono tabular-nums font-semibold ${trendText}`}
                >
                  {fmt.formatPrice(nowPrice)}
                </span>
              </span>
            </>
          )}
          {periodHigh !== null && periodLow !== null && (
            <span className="text-[10px] text-muted ml-auto">
              <span className="font-mono tabular-nums">
                {fmt.formatPrice(periodLow)}
              </span>
              <span className="opacity-40 mx-0.5">–</span>
              <span className="font-mono tabular-nums">
                {fmt.formatPrice(periodHigh)}
              </span>
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 shrink-0 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: lineColor }}
          />
          {placement.sameDay && disclosedDate ? "Traded & disclosed" : "Trade"}{" "}
          <span className="tabular-nums">{tradeLabel}</span>
        </span>
        {disclosedLabel && (
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full bg-foreground/40"
            />
            Disclosed <span className="tabular-nums">{disclosedLabel}</span>
          </span>
        )}
      </div>

      {/* Bleed past the card's p-4 so the plot runs edge-to-edge. The meta
          rows above stay padded; only the canvas reaches the card borders. */}
      <div className="relative -mx-4" style={{ height: CHART_HEIGHT }}>
        {plotted.length >= 2 ? (
          <div ref={containerRef} className="h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-xs text-muted/50">
              {allBars.length === 0
                ? "Loading chart…"
                : "No data for this period"}
            </span>
          </div>
        )}
        {scrub && (
          <div className="pointer-events-none absolute left-4 top-1 z-10 flex items-baseline gap-2 rounded-md border border-black/[0.06] bg-background/90 px-2 py-1 shadow-sm backdrop-blur-sm dark:border-white/[0.08]">
            <span className="text-[10px] text-muted tabular-nums">
              {formatShort(scrub.time)}
            </span>
            <span
              className={`font-mono text-[12px] font-semibold tabular-nums ${
                muted
                  ? "text-foreground/60"
                  : scrub.value >= entryPrice
                    ? upText
                    : downText
              }`}
            >
              {fmt.formatPrice(scrub.value)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
