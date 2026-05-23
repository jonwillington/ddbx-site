import type {
  IChartApi,
  ISeriesApi,
  SeriesMarker,
  Time,
} from "lightweight-charts";
import type { PriceFormat } from "@/components/position-card";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaSeries,
  ColorType,
  LineStyle,
  createChart,
  createSeriesMarkers,
} from "lightweight-charts";

import { api } from "@/lib/api";

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
}) {
  const [period, setPeriod] = useState<Period>("around");
  const [allBars, setAllBars] = useState<{ date: string; close: number }[]>([]);
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
      .priceHistory(tickerForApi, 365)
      .then((bars) =>
        setAllBars(
          bars
            .map((b) => ({
              date: b.date,
              close: normalize(b.close_pence, b.date),
            }))
            .filter(
              (b): b is { date: string; close: number } => b.close != null,
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

  const lastBar = allBars[allBars.length - 1];
  const up = lastBar ? lastBar.close >= entryPrice : true;
  const returnPct = lastBar
    ? ((lastBar.close - entryPrice) / entryPrice) * 100
    : 0;

  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const upText = "text-[#1e6b18] dark:text-[#5cd84a]";
  const downText = "text-[#8b2020] dark:text-[#e84d4d]";

  const lineColor = up
    ? isDark
      ? "#5cd84a"
      : "#1e6b18"
    : isDark
      ? "#e84d4d"
      : "#8b2020";
  const fillColor = up
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

    if (!container || bars.length < 2) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: CHART_HEIGHT,
      autoSize: false,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)",
        fontSize: 10,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        rightOffset: 2,
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
          color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)",
          style: LineStyle.Dashed,
          labelVisible: true,
        },
        horzLine: {
          width: 1,
          color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)",
          style: LineStyle.Dashed,
          labelVisible: false,
        },
      },
      handleScroll: false,
      handleScale: false,
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

    series.setData(bars.map((b) => ({ time: b.date as Time, value: b.close })));

    // Director's paid price — dashed horizontal baseline.
    series.createPriceLine({
      price: entryPrice,
      color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: "",
    });

    // Trade + disclosure markers. lightweight-charts snaps each marker
    // to the first bar at-or-after the requested date, matching how
    // weekend disclosures land on the next trading-day bar.
    const markers: SeriesMarker<Time>[] = [];
    const tradeBar = bars.find((b) => b.date >= tradeDate);

    if (tradeBar) {
      markers.push({
        time: tradeBar.date as Time,
        position: "aboveBar",
        color: lineColor,
        shape: "circle",
        text: "Trade",
      });
    }
    if (disclosedDate && disclosedDate !== tradeDate) {
      const discBar = bars.find((b) => b.date >= disclosedDate);

      if (discBar) {
        markers.push({
          time: discBar.date as Time,
          position: "aboveBar",
          color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)",
          shape: "arrowDown",
          text: "Disclosed",
        });
      }
    }
    if (markers.length > 0) {
      createSeriesMarkers(series, markers);
    }

    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      const c = containerRef.current;

      if (c && chartRef.current) {
        chartRef.current.applyOptions({ width: c.clientWidth });
      }
    });

    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [
    bars,
    entryPrice,
    tradeDate,
    disclosedDate,
    lineColor,
    fillColor,
    isDark,
  ]);

  const visiblePrices = bars.map((b) => b.close);
  const periodHigh = visiblePrices.length ? Math.max(...visiblePrices) : null;
  const periodLow = visiblePrices.length ? Math.min(...visiblePrices) : null;
  const nowPrice = lastBar?.close ?? null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-[10px] text-muted uppercase tracking-wider font-medium">
          {tickerForDisplay}
        </span>
        {lastBar && (
          <span
            className={`text-[10px] font-semibold tabular-nums ${up ? upText : downText}`}
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
                ? "border-[#6b5038]/50 bg-[#6b5038]/10 text-[#6b5038] dark:text-[#a8804e]"
                : "border-black/10 dark:border-white/10 text-muted hover:border-[#6b5038]/30"
            }`}
            onClick={() => setPeriod(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {nowPrice !== null && (
        <div className="flex items-center gap-3 shrink-0 border-t border-black/[0.07] dark:border-white/[0.07] pt-2">
          <span className="text-[10px] text-muted">
            Entry{" "}
            <span className="font-mono tabular-nums text-foreground/70">
              {fmt.formatPrice(entryPrice)}
            </span>
          </span>
          <span className="text-[10px] text-muted">
            Now{" "}
            <span
              className={`font-mono tabular-nums font-semibold ${up ? upText : downText}`}
            >
              {fmt.formatPrice(nowPrice)}
            </span>
          </span>
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

      <div className="relative w-full" style={{ height: CHART_HEIGHT }}>
        {bars.length >= 2 ? (
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
      </div>
    </div>
  );
}
