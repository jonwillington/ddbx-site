/** Twelve months of closes for one company, with every disclosed insider buy
 *  plotted on the line.
 *
 *  The company page is a record, and until now the record had no picture: a
 *  table said four directors bought at £4.73 and nothing on the page said what
 *  the price did before or after. This is that missing sentence, drawn — and it
 *  is the only place on the page where the buys and the price appear in the
 *  same frame, which is the whole argument the product makes.
 *
 *  Sized from a measured container width rather than a stretched viewBox. The
 *  download page's sparkline can get away with `preserveAspectRatio="none"`
 *  because it draws nothing but a stroke; this one draws round markers, and a
 *  non-uniform scale turns every one of them into an ellipse.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { buyValue } from "../../../shared/leaderboard.js";

import { Skeleton } from "@/components/skeleton";
import { api } from "@/lib/api";
import { localeFor, moneyShort, SYMBOL } from "@/lib/company-format";

/** Directional pair, read through the theme so both modes resolve. Applied via
 *  `style` rather than as SVG presentation attributes — var() substitution in a
 *  presentation attribute is not reliable across browsers. */
const UP = "var(--positive)";
const DOWN = "var(--negative)";

/** Marker ink by rating (`rating`). The chart could draw every buy
 *  identically, but the rating IS the product — inking by it means the graphic
 *  teaches the scale in passing (a solid, heavy ring is a conviction buy; a
 *  hollow one is a disclosure we didn't think worth writing up) instead of
 *  being a finance widget any site could ship. Kept to one hue at three
 *  strengths: this page spends its colour on price direction, and a second
 *  palette here would compete with it.
 *
 *  Inside the company page's dark stage the theme tokens are wrong in both
 *  modes — the panel is #1a140d whatever the page is — so the chart takes the
 *  stage's own fixed pair and white inks instead (see `.board-stage`). */
const PALETTE = {
  light: {
    up: UP,
    down: DOWN,
    rating: {
      significant: { ink: "#5a4128", ring: 2.4 },
      noteworthy: { ink: "rgba(90,65,40,0.62)", ring: 2 },
      minor: { ink: "rgba(90,65,40,0.62)", ring: 2 },
    } as Record<string, { ink: string; ring: number }>,
    unrated: { ink: "rgba(90,65,40,0.3)", ring: 1.5 },
    r: 4.5,
    halo: null,
    labels: false,
    core: "text-sheet dark:text-surface",
    drop: "text-foreground/15",
    axis: "fill-foreground/40",
    price: "text-foreground",
    quiet: "text-foreground/45",
    keyRated: "border-brand-brown bg-sheet dark:bg-surface",
    keyUnrated: "border-brand-brown/30 bg-sheet dark:bg-surface",
  },
  dark: {
    up: "var(--stage-pos)",
    down: "var(--stage-neg)",
    rating: {
      significant: { ink: "#ffffff", ring: 3 },
      noteworthy: { ink: "#ffffff", ring: 2.5 },
      minor: { ink: "#ffffff", ring: 2.5 },
    } as Record<string, { ink: string; ring: number }>,
    unrated: { ink: "rgba(255,255,255,0.75)", ring: 2 },
    // On the stage the buys are the reason the chart is there (Jon,
    // 2026-09-19: "director buys need to be more prominent"): bigger rings,
    // a halo that lifts them off the line, and each one says what was paid.
    r: 6.5,
    halo: "fill-white/15",
    labels: true,
    core: "text-[#1a140d]",
    drop: "text-white/35",
    axis: "fill-white/40",
    price: "text-white",
    quiet: "text-white/45",
    keyRated: "border-white bg-[#1a140d]",
    keyUnrated: "border-white/40 bg-[#1a140d]",
  },
} as const;

const H = 220;
const PAD_T = 14;
const PAD_B = 26;
const PAD_R = 6;
const PAD_L = 6;

export interface PriceBar {
  date: string;
  /** Native MINOR units, as the API serves them. */
  close: number;
}

/** What the page needs to know before it draws a heading over this chart. */
export interface PriceSeries {
  /** null while in flight. */
  bars: PriceBar[] | null;
  failed: boolean;
  /** Settled, and there is nothing plottable — the section should not render
   *  at all. A ruled "Price" heading with a caption about markers, sitting over
   *  whitespace, is the thin-page failure mode this exists to prevent. */
  unavailable: boolean;
}

/** Twelve months of closes for one ticker.
 *
 *  Lifted out of the chart so the company page can decide whether to render the
 *  Price section *before* it renders the section's heading. The chart still
 *  owns the drawing; the page owns the frame around it. */
export function useCompanyPriceBars(tickerKey: string | null): PriceSeries {
  const [bars, setBars] = useState<PriceBar[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!tickerKey) return;
    let live = true;

    setBars(null);
    setFailed(false);
    api
      .priceHistory(tickerKey, 365)
      .then((raw) => {
        if (!live) return;
        setBars(raw.map((b) => ({ date: b.date, close: b.close_pence })));
      })
      .catch(() => live && setFailed(true));

    return () => {
      live = false;
    };
  }, [tickerKey]);

  return {
    bars,
    failed,
    // A company with no cached price history is common enough (recent
    // listings, suspended lines) that this must resolve to "no section"
    // rather than to an error.
    unavailable: failed || (bars != null && bars.length < 2),
  };
}

/** A buy to mark, resolved onto the series. */
interface Mark {
  x: number;
  y: number;
  date: string;
  label: string;
  /** Ring colour + weight, by how the buy was rated. */
  ink: string;
  ring: number;
  /** What was paid, in major units; 0 when the filing states no value. */
  amount: number;
}

/** Closes arrive in native MINOR units — pence for LSE issuers, cents for US
 *  ones (see the note on `price_pence` in the API). Always /100, never an FX
 *  conversion. */
const toMajor = (minor: number) => minor / 100;

/** The latest close and the change across the window, in major units — what
 *  the chart's own header states, for a caller that states it elsewhere (the
 *  company stage's figures). Null until there are two closes to compare. */
export function seriesSummary(
  bars: PriceBar[] | null,
): { last: number; changePct: number } | null {
  if (!bars || bars.length < 2) return null;
  const first = toMajor(bars[0].close);
  const last = toMajor(bars[bars.length - 1].close);

  if (!(first > 0) || !(last > 0)) return null;

  return { last, changePct: ((last - first) / first) * 100 };
}

export function fmtPrice(major: number, currency: string): string {
  const sym = SYMBOL[currency] ?? "";
  // Sub-penny stocks are real on AIM (ARK trades at £0.0075) — a 2dp format
  // would render the entire axis as "£0.01".
  const dp = major < 0.1 ? 4 : major < 10 ? 2 : 0;

  return `${sym}${major.toFixed(dp)}`;
}

function fmtDay(iso: string, market: string): string {
  try {
    return new Intl.DateTimeFormat(localeFor(market), {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fmtMonth(iso: string, market: string): string {
  try {
    return new Intl.DateTimeFormat(localeFor(market), {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function useMeasuredWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;

    if (!el) return;
    const measure = () => setW(el.clientWidth);

    measure();
    const ro = new ResizeObserver(measure);

    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  return [ref, w] as const;
}

export function CompanyPriceChart({
  tickerKey,
  currency,
  deals,
  market,
  series,
  theme = "light",
  height = H,
  header = true,
}: {
  /** Storage key ("ARK.L" / "FCNCA") — what the prices endpoint speaks. */
  tickerKey: string;
  currency: string;
  /** Disclosed buys, plotted as markers. */
  deals: Array<Dealing | UsDealing>;
  market: string;
  /** From `useCompanyPriceBars`, called by the page so it can drop the whole
   *  section when there's no series to draw. */
  series: PriceSeries;
  /** "dark" when drawn inside the company stage. */
  theme?: "light" | "dark";
  height?: number;
  /** False when the price and its change are stated beside the chart
   *  already, as the company stage's figures do. */
  header?: boolean;
}) {
  const { bars, unavailable } = series;
  const P = PALETTE[theme];
  const H = height;
  const [box, width] = useMeasuredWidth();

  if (unavailable) return null;

  // House skeleton, not a private pulse: the page skeleton this hands over
  // from uses the same primitive, so the two don't pulse out of step.
  //
  // It carries the measuring ref too. The layout effect runs once, on the
  // first render, and it used to be this bare skeleton that rendered first:
  // the ref was never attached, the width stayed 0, and every chart drew at
  // the 640px fallback whatever the column (unnoticed while the column was
  // about that wide).
  if (!bars) {
    return (
      <div ref={box}>
        <Skeleton className="w-full rounded-xl" h={H} />
      </div>
    );
  }

  const w = width || 640;
  const closes = bars.map((b) => toMajor(b.close));
  const lo = Math.min(...closes);
  const hi = Math.max(...closes);
  const range = Math.max(hi - lo, Number.EPSILON);
  const first = closes[0];
  const last = closes[closes.length - 1];
  const changePct = first ? ((last - first) / first) * 100 : 0;
  const color = changePct >= 0 ? P.up : P.down;

  const xAt = (i: number) =>
    PAD_L + (i / (bars.length - 1)) * (w - PAD_L - PAD_R);
  // Headroom for the value labels, so a buy at the year's high isn't cut off.
  const padT = P.labels ? PAD_T + 30 : PAD_T;
  const yAt = (major: number) =>
    padT + (1 - (major - lo) / range) * (H - padT - PAD_B);

  const pts = closes.map((c, i) => [xAt(i), yAt(c)] as const);
  const line = pts
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  // Snap each buy onto the nearest bar at or after its trade date. Buys older
  // than the window simply don't appear — the chart is the last 12 months, and
  // clamping them to the left edge would put a marker at a price that isn't
  // the one the director paid.
  const marks: Mark[] = [];

  for (const d of deals) {
    // `findIndex` alone put every pre-window buy on the first bar: the first
    // close is always "at or after" a trade older than the window.
    if (d.trade_date < bars[0].date) continue;
    const i = bars.findIndex((b) => b.date >= d.trade_date);

    if (i < 0) continue;
    const rating = d.analysis?.rating;
    const { ink, ring } = (rating && P.rating[rating]) || P.unrated;

    marks.push({
      x: xAt(i),
      y: yAt(closes[i]),
      date: d.trade_date,
      label: `${market === "UK" ? "Director" : "Insider"} buy, ${fmtDay(d.trade_date, market)}${
        rating ? `, rated ${rating}` : ""
      }`,
      ink,
      ring,
      amount: buyValue(d),
    });
  }

  // Several buys on the same day or week share one label, summed, so a
  // cluster reads as one figure rather than overprinted ones.
  const LABEL_GAP = 44;
  const labels: Array<{ x: number; y: number; text: string }> = [];

  if (P.labels) {
    const sorted = [...marks].sort((a, b) => a.x - b.x);
    let group: Mark[] = [];
    const flush = () => {
      if (!group.length) return;
      const top = group.reduce((a, b) => (b.y < a.y ? b : a));
      const total = group.reduce((sum, m) => sum + m.amount, 0);
      const money =
        total > 0
          ? moneyShort(total, market === "UK" ? "GBP" : currency)
          : null;
      const text =
        group.length > 1
          ? `${group.length} buys${money ? ` · ${money}` : ""}`
          : money;

      // A buy with no stated value gets no label rather than a dash.
      if (text) {
        labels.push({
          x: Math.min(Math.max(top.x, PAD_L + 50), w - PAD_R - 50),
          y: top.y - P.r - 22,
          text,
        });
      }
      group = [];
    };

    for (const m of sorted) {
      if (group.length && m.x - group[group.length - 1].x > LABEL_GAP) flush();
      group.push(m);
    }
    flush();
  }

  return (
    <div ref={box}>
      <div className={header ? "flex items-baseline gap-3" : "sr-only"}>
        <p
          className={`text-[22px] font-semibold leading-none tracking-[-0.015em] tabular-nums ${P.price}`}
        >
          {fmtPrice(last, currency)}
        </p>
        <p
          className="text-[13.5px] font-semibold tabular-nums"
          style={{ color }}
        >
          {changePct >= 0 ? "+" : ""}
          {changePct.toFixed(1)}%
        </p>
        <p className={`text-[12px] ${P.quiet}`}>past 12 months</p>
      </div>

      <svg
        aria-label={`${tickerKey} share price over the past 12 months, with ${marks.length} disclosed ${market === "UK" ? "director" : "insider"} ${marks.length === 1 ? "buy" : "buys"} marked`}
        className={`${header ? "mt-3" : ""} block w-full`}
        height={H}
        role="img"
        viewBox={`0 0 ${w} ${H}`}
        width={w}
      >
        {/* No area fill. The gradient that sat under the line was a fade
            into the page, which the design language rules out (tenet 1:
            contained, not blended); the line and the markers carry it. */}
        <path
          d={line}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          style={{ stroke: color }}
        />

        {/* Buy markers. Drawn after the line so they sit on top of it, and
            with a page-coloured core so overlapping buys in a cluster still
            read as separate events rather than one blob. */}
        {marks.map((m) => (
          <g key={`${m.date}-${m.x.toFixed(1)}`}>
            <title>{m.label}</title>
            <line
              className={P.drop}
              stroke="currentColor"
              strokeDasharray="2 3"
              strokeWidth={1}
              x1={m.x}
              x2={m.x}
              y1={m.y}
              y2={H - PAD_B}
            />
            {P.halo && (
              <circle className={P.halo} cx={m.x} cy={m.y} r={P.r + 5} />
            )}
            <circle
              className={P.core}
              cx={m.x}
              cy={m.y}
              fill="currentColor"
              r={P.r}
              stroke={m.ink}
              strokeWidth={m.ring}
            />
          </g>
        ))}

        {/* A solid pill, not bare text: the label sits over the line, and
            white on the stage is the loudest mark the panel has. Width is
            estimated from the glyph count; tabular figures keep it close. */}
        {labels.map((l) => {
          const pw = l.text.length * 6.9 + 16;

          return (
            <g key={`${l.x.toFixed(1)}-${l.text}`}>
              <rect
                className="fill-white"
                height={20}
                rx={10}
                width={pw}
                x={l.x - pw / 2}
                y={l.y - 10}
              />
              <text
                className="fill-[#1a140d] font-semibold tabular-nums"
                dominantBaseline="central"
                fontSize={11.5}
                textAnchor="middle"
                x={l.x}
                y={l.y + 0.5}
              >
                {l.text}
              </text>
            </g>
          );
        })}

        {/* Endpoint labels instead of a y-axis: two numbers carry the range,
            and gridlines would make a document page look like a terminal. */}
        <text className={P.axis} fontSize={11} x={PAD_L} y={H - PAD_B + 16}>
          {fmtMonth(bars[0].date, market)}
        </text>
        <text
          className={P.axis}
          fontSize={11}
          textAnchor="end"
          x={w - PAD_R}
          y={H - PAD_B + 16}
        >
          {fmtMonth(bars[bars.length - 1].date, market)}
        </text>
      </svg>

      <div
        className={`mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11.5px] ${P.quiet}`}
      >
        {marks.length > 0 && (
          <>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={`h-2.5 w-2.5 rounded-full border-[2.4px] ${P.keyRated}`}
              />
              Rated buy
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={`h-2.5 w-2.5 rounded-full border-[1.5px] ${P.keyUnrated}`}
              />
              Unrated
            </span>
          </>
        )}
        <span>
          Range {fmtPrice(lo, currency)} – {fmtPrice(hi, currency)}
        </span>
      </div>

      {marks.length > 0 && theme === "light" && (
        <p className="mt-2 text-[12px] leading-[1.6] text-foreground/45">
          Every disclosed buy, plotted at the close on the day it was made.
          Ratings are ours, not the company&rsquo;s.
        </p>
      )}
    </div>
  );
}
