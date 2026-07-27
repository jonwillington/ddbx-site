import type {
  IChartApi,
  MouseEventParams,
  SeriesMarker,
  Time,
} from "lightweight-charts";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaSeries,
  ColorType,
  LineStyle,
  LineType,
  TrackingModeExitMode,
  createChart,
  createSeriesMarkers,
} from "lightweight-charts";

import { Terminal } from "./terminal";

/** "One issuer, six insiders, ninety days" — the page's one picture.
 *
 *  Everything else on `/api` argues in fields and prose, which is right for a
 *  reference and poor for the pitch: the reason to buy this feed is that
 *  insider buying CLUSTERS into weakness, and a cluster is a shape, not a
 *  sentence. So this draws the shape once, and it draws it with the same chart
 *  engine and the same colour grammar as the app.
 *
 *  Rendered with lightweight-charts, matching `components/mini-price-chart.tsx`
 *  (the deal-drawer chart). A hand-rolled SVG shipped here first and was wrong
 *  on both counts: it read as a different product, and it painted the whole
 *  series in one brand amber, so the markers sat on a line the same colour as
 *  themselves and the buys were invisible.
 *
 *  Colour follows the app's rule, not decoration:
 *   - NEUTRAL grey before the first disclosure. Nothing is known yet, so the
 *     line makes no claim.
 *   - GREEN from the first disclosure on, because the position is up from
 *     there. Read from `--positive`, the same token the app's charts use for a
 *     winning position.
 *  Two Area series rather than one, sharing the bar at the join so the line is
 *  continuous. If the illustration is ever edited to end BELOW the first buy,
 *  the second segment has to switch to `--negative` or the chart starts lying.
 *
 *  ⚠ The series is SYNTHETIC and must stay labelled as such, in the panel
 *  chrome and in the caption. Every other number on this page is a real API
 *  response; this one cannot be, because no single real issuer illustrates the
 *  pattern this cleanly, and quietly implying one did would poison the rows
 *  that ARE real. The `Illustrative` chip is load-bearing, not decoration.
 *
 *  Also deliberately absent: any claim that we ship the price series. We don't
 *  sell price bars (Yahoo-sourced, not licensed for redistribution — see
 *  investigations/2026-07-26-api-product-surface.md §1). The pitch is that the
 *  rows carry the disclosures, the sizes and the cluster; the price line is
 *  yours.
 *
 *  Colours resolve dark and are not branched on theme. The route pins `.dark`,
 *  so a light branch here would be a branch that never runs.
 */

const SESSIONS = 90;
const CHART_HEIGHT = 320;

/** Illustrative close series: a long slide into a trough around session 44,
 *  then a recovery that finishes above where it started.
 *
 *  The first version was a closed form — two straight ramps plus stacked
 *  sines — and it looked like one: equal ripples on a visible period, no
 *  gaps, the same calm in the capitulation as in the recovery, and a 45-day
 *  rally that never once retraced. A chart that synthetic undercuts the chip
 *  next to it: "illustrative" should mean "not a real issuer", not "not a
 *  real market".
 *
 *  So the shape is authored the way a price actually moves: swing anchors —
 *  lower highs and failed bounces on the way down, a capitulation gap into
 *  the trough, pullbacks and a stall inside the recovery — interpolated and
 *  then roughened with small seeded noise, snapped to half-penny ticks.
 *  The anchors are the editable part; the trough must stay at an index the
 *  BUYS straddle, and the last anchor must stay above the price at FIRST or
 *  the green segment starts lying (see the colour rule above).
 *
 *  Deterministic by construction — fixed anchors, fixed seed — so it cannot
 *  differ between renders. */
const ANCHORS: Array<[session: number, price: number]> = [
  [0, 118],
  [6, 113.5],
  [11, 115.5], // failed bounce — the first lower high
  [18, 104],
  [24, 106.5], // second bounce, weaker
  [29, 96],
  [34, 88],
  [38, 79.5],
  [41, 83.5], // dead-cat before the flush
  [44, 73], // capitulation low; BUYS straddle this index
  [47, 79],
  [50, 76.5], // retest of the low
  [55, 88],
  [60, 97],
  [63, 92.5], // first pullback of the recovery
  [68, 104],
  [72, 115],
  [75, 110.5], // second pullback
  [80, 126],
  [84, 133.5],
  [87, 143],
  [89, 148],
];

/** mulberry32 — a tiny seeded PRNG, so the roughness is fixed at build time. */
function mulberry32(seed: number): () => number {
  let a = seed | 0;

  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRICES = (() => {
  const rand = mulberry32(11);
  // Box–Muller: uniform pairs -> standard normal, for bell-shaped daily noise.
  const gauss = () => {
    const u = Math.max(rand(), 1e-9);

    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };

  const out: number[] = [];
  let seg = 0;

  for (let i = 0; i < SESSIONS; i += 1) {
    while (seg < ANCHORS.length - 2 && ANCHORS[seg + 1][0] <= i) seg += 1;
    const [s0, p0] = ANCHORS[seg];
    const [s1, p1] = ANCHORS[seg + 1];
    const base = p0 + (p1 - p0) * ((i - s0) / (s1 - s0));
    // Rougher while it's falling apart than while it's grinding back — the
    // asymmetry is half of what makes a drawdown look like one. Anchor
    // sessions stay exact so the trough and the endpoint can't drift.
    const isAnchor = i === s0 || i === s1;
    const vol = isAnchor ? 0 : i <= 44 ? 0.011 : 0.007;
    const noisy = base * (1 + vol * gauss());

    // Half-penny ticks: real small-cap closes are discrete, not continuous.
    out.push(Math.round(noisy * 2) / 2);
  }

  return out;
})();

/** Session index -> ISO date. Fixed start so the axis never moves. */
const START = Date.UTC(2026, 1, 2);
const DATES = Array.from({ length: SESSIONS }, (_, i) =>
  new Date(START + i * 86_400_000).toISOString().slice(0, 10),
);

interface Buy {
  /** Index into PRICES. */
  i: number;
  who: string;
  /** Thousands of pounds. */
  value: number;
}

/** Eight disclosures from six people over 26 sessions, straddling the trough.
 *  Deliberately dense: "lots of insiders, all at once, while it was falling"
 *  is the entire argument, and three tidy markers do not make that case.
 *
 *  `who` doubles as the identity key behind the "six insiders" count in the
 *  section heading, so two entries sharing a role read as the same person
 *  buying twice (the CEO and an NED both do). Editing a role therefore edits
 *  the headline number: keep the distinct count at six or change both. */
const BUYS: Buy[] = [
  { i: 30, who: "Chief Executive", value: 240 },
  { i: 33, who: "Chief Financial Officer", value: 180 },
  { i: 36, who: "Non-executive director", value: 120 },
  { i: 41, who: "Chair", value: 420 },
  { i: 44, who: "Chief Executive", value: 300 },
  { i: 48, who: "Non-executive director", value: 150 },
  { i: 52, who: "Chief Operating Officer", value: 260 },
  { i: 56, who: "Company secretary", value: 200 },
];

const FIRST = BUYS[0].i;
const LAST_BUY = BUYS[BUYS.length - 1].i;
const TOTAL = BUYS.reduce((a, b) => a + b.value, 0);
const INSIDERS = new Set(BUYS.map((b) => b.who)).size;
const SINCE_FIRST =
  ((PRICES[SESSIONS - 1] - PRICES[FIRST]) / PRICES[FIRST]) * 100;

/** Running total after each buy, held flat until the next one. Drawn as a
 *  stepped area on its own scale pinned to the bottom of the pane, which is
 *  the volume-pane idiom every trader already reads. */
const SPEND = (() => {
  const out: { time: Time; value: number }[] = [];
  let cum = 0;
  let k = 0;

  for (let i = 0; i < SESSIONS; i += 1) {
    while (k < BUYS.length && BUYS[k].i === i) {
      cum += BUYS[k].value;
      k += 1;
    }
    out.push({ time: DATES[i] as Time, value: cum });
  }

  return out;
})();

const NEUTRAL_LINE = "rgba(255,255,255,0.4)";
const NEUTRAL_FILL = "rgba(255,255,255,0.07)";
const SPEND_LINE = "#ad9479";
const SPEND_FILL = "rgba(173,148,121,0.15)";

/** What `--positive` holds today, as sRGB channels. */
const UP_FALLBACK = "92,216,74";

/** The chart's green, as `r,g,b`, read from the theme once per build.
 *
 *  It cannot simply be `var(--positive)`: these are canvas values, and
 *  lightweight-charts parses the colour string itself, handling hex/rgb/hsl
 *  only, while the token is authored in oklch. So the token is round-tripped
 *  through a 1x1 canvas, which both converts it to sRGB and leaves the channels
 *  separate, so the 20% area fill can be built from the same value. */
function upChannels(): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--positive")
    .trim();
  const ctx = document.createElement("canvas").getContext("2d");

  if (!raw || !ctx) return UP_FALLBACK;

  // A colour the canvas cannot parse is ignored, leaving the sentinel behind.
  ctx.fillStyle = "#000000";
  ctx.fillStyle = raw;
  if (ctx.fillStyle === "#000000") return UP_FALLBACK;

  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

  return `${r},${g},${b}`;
}

const money = (k: number) =>
  k >= 1000 ? `£${(k / 1000).toFixed(2)}m` : `£${k}k`;

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export function AccumulationChart() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  /** Close + date under the crosshair while scrubbing; null when away. */
  const [scrub, setScrub] = useState<{ value: number; time: string } | null>(
    null,
  );

  /** Buy at the scrubbed date, when the pointer is on one. */
  const scrubbedBuy = useMemo(
    () => (scrub ? BUYS.find((b) => DATES[b.i] === scrub.time) : undefined),
    [scrub],
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const up = upChannels();
    const upLine = `rgba(${up},1)`;
    const upFill = `rgba(${up},0.2)`;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: CHART_HEIGHT,
      autoSize: false,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255,255,255,0.4)",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        rightOffset: 0,
      },
      rightPriceScale: {
        borderVisible: false,
        visible: true,
        // Bottom quarter is reserved for the cumulative-spend overlay.
        scaleMargins: { top: 0.08, bottom: 0.28 },
      },
      leftPriceScale: { visible: false },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: "rgba(255,255,255,0.2)",
          style: LineStyle.Dashed,
          labelVisible: true,
          labelBackgroundColor: "#241c14",
        },
        horzLine: {
          width: 1,
          color: "rgba(255,255,255,0.2)",
          style: LineStyle.Dashed,
          labelVisible: false,
        },
      },
      handleScroll: false,
      handleScale: false,
      trackingMode: { exitMode: TrackingModeExitMode.OnTouchEnd },
    });

    const priceFormat = {
      type: "custom" as const,
      formatter: (v: number) => `${v.toFixed(0)}p`,
      minMove: 0.01,
    };

    // Segment one: before anyone has filed. Neutral, because nothing is known.
    const pre = chart.addSeries(AreaSeries, {
      lineColor: NEUTRAL_LINE,
      topColor: NEUTRAL_FILL,
      bottomColor: "rgba(0,0,0,0)",
      lineWidth: 2,
      priceFormat,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    pre.setData(
      PRICES.slice(0, FIRST + 1).map((v, i) => ({
        time: DATES[i] as Time,
        value: v,
      })),
    );

    // Segment two: from the first disclosure. Shares bar FIRST with `pre` so
    // the join is a continuous line rather than a visible seam.
    const post = chart.addSeries(AreaSeries, {
      lineColor: upLine,
      topColor: upFill,
      bottomColor: "rgba(0,0,0,0)",
      lineWidth: 2,
      priceFormat,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: "#241c14",
    });

    post.setData(
      PRICES.slice(FIRST).map((v, i) => ({
        time: DATES[FIRST + i] as Time,
        value: v,
      })),
    );

    // Cumulative spend, own scale, pinned to the bottom of the pane.
    const spend = chart.addSeries(AreaSeries, {
      lineColor: SPEND_LINE,
      topColor: SPEND_FILL,
      bottomColor: "rgba(0,0,0,0)",
      lineWidth: 1,
      lineType: LineType.WithSteps,
      priceScaleId: "spend",
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    spend.setData(SPEND);
    chart
      .priceScale("spend")
      .applyOptions({ scaleMargins: { top: 0.79, bottom: 0 } });

    // One arrow per disclosure, carrying its size. The label is what turns a
    // row of dots into "eight people spent £1.87m here".
    //
    // Labels are dropped on narrow canvases. Eight of them inside a 26-session
    // window need roughly 560px to lay out; below that lightweight-charts
    // stacks them on top of each other and the cluster becomes an unreadable
    // pile of digits. The arrows still show the cluster, the header still
    // shows the total, and a tap still gives the individual size.
    const LABEL_MIN_WIDTH = 560;
    const markersFor = (w: number): SeriesMarker<Time>[] =>
      BUYS.map((b) => ({
        time: DATES[b.i] as Time,
        position: "belowBar",
        color: upLine,
        shape: "arrowUp",
        size: 1.1,
        ...(w >= LABEL_MIN_WIDTH ? { text: money(b.value) } : {}),
      }));

    const markerApi = createSeriesMarkers(
      post,
      markersFor(container.clientWidth),
    );

    const onCrosshairMove = (param: MouseEventParams<Time>) => {
      const data = param.time
        ? (param.seriesData.get(post) ?? param.seriesData.get(pre))
        : undefined;
      const value =
        data && "value" in data ? (data.value as number) : undefined;

      setScrub(value != null ? { value, time: String(param.time) } : null);
    };

    chart.subscribeCrosshairMove(onCrosshairMove);
    chartRef.current = chart;

    // fitContent is not optional here. lightweight-charts keeps its own bar
    // spacing rather than fitting on setData, which left the pane showing only
    // the last ~30 sessions: the grey pre-disclosure segment and every marker
    // sat off the left edge, so the chart argued the exact opposite of the
    // section it illustrates. Run it after layout (rAF) and again on every
    // resize, since applyOptions({width}) re-derives the range.
    const fit = () => chart.timeScale().fitContent();

    requestAnimationFrame(fit);

    const ro = new ResizeObserver(() => {
      const c = containerRef.current;

      if (c && chartRef.current) {
        chartRef.current.applyOptions({ width: c.clientWidth });
        markerApi.setMarkers(markersFor(c.clientWidth));
        fit();
      }
    });

    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  return (
    <Terminal
      // Total only. "8 disclosures · £1.87m" is shrink-0, so on a phone it ate
      // the width the title needed and "One issuer · 90 days" truncated to
      // "ONE". The count already leads the readout row underneath.
      meta={money(TOTAL)}
      title={
        // Chip FIRST. The title truncates, and on a phone it truncates hard;
        // "Illustrative" is the one word here that cannot fall off the end.
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9.5px] uppercase tracking-[0.12em] text-white/50">
            Illustrative
          </span>
          One issuer · 90 days
        </span>
      }
      variant="bare"
    >
      {/* Scrub readout. Reserves its own height so the chart never shifts when
          the pointer enters or leaves the plot. */}
      <div className="flex min-h-[2.4rem] flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-white/[0.08] px-4 py-2.5 text-[12.5px]">
        {scrub ? (
          <>
            <span className="font-mono text-white/40">
              {shortDate(scrub.time)}
            </span>
            <span className="tabular-nums text-white">
              {scrub.value.toFixed(1)}p
            </span>
            {scrubbedBuy ? (
              <span className="text-positive">
                {scrubbedBuy.who} bought {money(scrubbedBuy.value)}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-white/40">
            {INSIDERS} insiders, {BUYS.length} disclosures over{" "}
            {LAST_BUY - FIRST} sessions, all of them into the drawdown.
          </span>
        )}
        <span className="ml-auto tabular-nums text-positive">
          +{SINCE_FIRST.toFixed(0)}% since the first disclosure
        </span>
      </div>

      <div ref={containerRef} className="w-full px-1 pb-1" />
    </Terminal>
  );
}
