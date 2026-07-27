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

import { Skeleton } from "@/components/skeleton";
import { api } from "@/lib/api";
import { localeFor, SYMBOL } from "@/lib/company-format";

/** Directional pair, read through the theme so both modes resolve. Applied via
 *  `style` rather than as SVG presentation attributes — var() substitution in a
 *  presentation attribute is not reliable across browsers. */
const UP = "var(--positive)";
const DOWN = "var(--negative)";

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
}

/** Marker ink by rating. The chart could draw every buy identically, but the
 *  rating IS the product — inking by it means the graphic teaches the scale in
 *  passing (a solid, heavy ring is a conviction buy; a hollow one is a
 *  disclosure we didn't think worth writing up) instead of being a finance
 *  widget any site could ship. Kept to one hue at three strengths: this page
 *  spends its colour on price direction, and a second palette here would
 *  compete with it. */
const RATING_INK: Record<string, { ink: string; ring: number }> = {
  significant: { ink: "#5a4128", ring: 2.4 },
  noteworthy: { ink: "rgba(90,65,40,0.62)", ring: 2 },
  minor: { ink: "rgba(90,65,40,0.62)", ring: 2 },
};
const UNRATED_INK = { ink: "rgba(90,65,40,0.3)", ring: 1.5 };

/** Closes arrive in native MINOR units — pence for LSE issuers, cents for US
 *  ones (see the note on `price_pence` in the API). Always /100, never an FX
 *  conversion. */
const toMajor = (minor: number) => minor / 100;

function fmtPrice(major: number, currency: string): string {
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
}) {
  const { bars, unavailable } = series;
  const [box, width] = useMeasuredWidth();

  if (unavailable) return null;

  // House skeleton, not a private pulse: the page skeleton this hands over
  // from uses the same primitive, so the two don't pulse out of step.
  if (!bars) return <Skeleton className="w-full rounded-xl" h={H} />;

  const w = width || 640;
  const closes = bars.map((b) => toMajor(b.close));
  const lo = Math.min(...closes);
  const hi = Math.max(...closes);
  const range = Math.max(hi - lo, Number.EPSILON);
  const first = closes[0];
  const last = closes[closes.length - 1];
  const changePct = first ? ((last - first) / first) * 100 : 0;
  const color = changePct >= 0 ? UP : DOWN;

  const xAt = (i: number) =>
    PAD_L + (i / (bars.length - 1)) * (w - PAD_L - PAD_R);
  const yAt = (major: number) =>
    PAD_T + (1 - (major - lo) / range) * (H - PAD_T - PAD_B);

  const pts = closes.map((c, i) => [xAt(i), yAt(c)] as const);
  const line = pts
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H - PAD_B} L${pts[0][0].toFixed(1)},${H - PAD_B} Z`;

  // Snap each buy onto the nearest bar at or after its trade date. Buys older
  // than the window simply don't appear — the chart is the last 12 months, and
  // clamping them to the left edge would put a marker at a price that isn't
  // the one the director paid.
  const marks: Mark[] = [];

  for (const d of deals) {
    const i = bars.findIndex((b) => b.date >= d.trade_date);

    if (i < 0) continue;
    const rating = d.analysis?.rating;
    const { ink, ring } = (rating && RATING_INK[rating]) || UNRATED_INK;

    marks.push({
      x: xAt(i),
      y: yAt(closes[i]),
      date: d.trade_date,
      label: `${market === "UK" ? "Director" : "Insider"} buy, ${fmtDay(d.trade_date, market)}${
        rating ? ` — rated ${rating}` : ""
      }`,
      ink,
      ring,
    });
  }

  return (
    <div ref={box}>
      <div className="flex items-baseline gap-3">
        <p className="text-[22px] font-semibold leading-none tracking-[-0.015em] tabular-nums text-foreground">
          {fmtPrice(last, currency)}
        </p>
        <p
          className="text-[13.5px] font-semibold tabular-nums"
          style={{ color }}
        >
          {changePct >= 0 ? "+" : ""}
          {changePct.toFixed(1)}%
        </p>
        <p className="text-[12px] text-foreground/45">past 12 months</p>
      </div>

      <svg
        aria-label={`${tickerKey} share price over the past 12 months, with ${marks.length} disclosed ${market === "UK" ? "director" : "insider"} ${marks.length === 1 ? "buy" : "buys"} marked`}
        className="mt-3 block w-full"
        height={H}
        role="img"
        viewBox={`0 0 ${w} ${H}`}
        width={w}
      >
        <defs>
          <linearGradient id={`cpc-${tickerKey}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopOpacity={0.18} style={{ stopColor: color }} />
            <stop offset="100%" stopOpacity={0} style={{ stopColor: color }} />
          </linearGradient>
        </defs>

        <path d={area} fill={`url(#cpc-${tickerKey})`} />
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
              className="text-foreground/15"
              stroke="currentColor"
              strokeDasharray="2 3"
              strokeWidth={1}
              x1={m.x}
              x2={m.x}
              y1={m.y}
              y2={H - PAD_B}
            />
            <circle
              className="text-sheet dark:text-surface"
              cx={m.x}
              cy={m.y}
              fill="currentColor"
              r={4.5}
              stroke={m.ink}
              strokeWidth={m.ring}
            />
          </g>
        ))}

        {/* Endpoint labels instead of a y-axis: two numbers carry the range,
            and gridlines would make a document page look like a terminal. */}
        <text
          className="fill-foreground/40"
          fontSize={11}
          x={PAD_L}
          y={H - PAD_B + 16}
        >
          {fmtMonth(bars[0].date, market)}
        </text>
        <text
          className="fill-foreground/40"
          fontSize={11}
          textAnchor="end"
          x={w - PAD_R}
          y={H - PAD_B + 16}
        >
          {fmtMonth(bars[bars.length - 1].date, market)}
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11.5px] text-foreground/45">
        {marks.length > 0 && (
          <>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full border-[2.4px] border-brand-brown bg-sheet dark:bg-surface"
              />
              Rated buy
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full border-[1.5px] border-brand-brown/30 bg-sheet dark:bg-surface"
              />
              Unrated
            </span>
          </>
        )}
        <span>
          Range {fmtPrice(lo, currency)} – {fmtPrice(hi, currency)}
        </span>
      </div>

      {marks.length > 0 && (
        <p className="mt-2 text-[12px] leading-[1.6] text-foreground/45">
          Every disclosed buy, plotted at the close on the day it was made.
          Ratings are ours, not the company&rsquo;s.
        </p>
      )}
    </div>
  );
}
