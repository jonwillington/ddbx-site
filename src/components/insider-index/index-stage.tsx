/** The Insider Index's proof object: the reading, the scale it sits on, and
 *  the line of every reading before it.
 *
 *  One dark panel, in the board-stage material (`.board-stage` in
 *  globals.css), because the seven boards taught the site that the object is
 *  the argument and the title names it. Inside it, three things and nothing
 *  else:
 *
 *    1. The hero figure. The reading, at 72px, in the same sans as the rest
 *       of the page (the dataviz rule: a display face on the number reads as
 *       decoration). Proportional figures, not tabular, at this size.
 *    2. The scale. A five-segment meter from 0 to 100 with the reading's
 *       position on it, so a 3 reads as "at the very quiet end" before the
 *       words say so. Filled to the reading in one hue; the unfilled track is
 *       the same hue at a lower step, never a second colour.
 *    3. The line. Every published reading, one series, 2px, with the tier
 *       boundaries as hairlines and the tier names in the right gutter. A
 *       single series needs no legend; the title names it.
 *
 *  Colour carries no verdict here, on purpose. A busy index is not good news
 *  and a quiet one is not bad, and the site's green and red mean "the shares
 *  went up" and "the shares went down". So the line, the fill and the meter
 *  are all brand amber on the dark ground, and the direction of the last
 *  week is stated in words in the caption rather than coloured.
 *
 *  Every point on the line is a link: hovering shows the day's reading in a
 *  tooltip, clicking goes to that day's permalink. That is the eighth
 *  static-page rule (everything specific is a link) applied to a chart. The
 *  table under the panel is the WCAG twin of the picture: the same readings,
 *  as rows, reachable without a pointer.
 */
import type { Reading } from "../../../shared/insider-index";
import type { ReactNode } from "react";

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  dateLabel,
  indexPath,
  publishable,
  shortDateLabel,
  TIERS,
  WINDOW_DAYS,
} from "../../../shared/insider-index.js";
import { formatMoney } from "../../../shared/sectors.js";
import { Skeleton } from "../skeleton";
import { useMeasuredWidth } from "../boards/board-model";

const PANEL =
  "board-stage relative overflow-hidden rounded-[28px] border border-white/10 text-white shadow-[0_24px_60px_-30px_rgba(40,25,10,0.55)]";

/** The one hue on the panel. */
const INK = "var(--color-brand-amber)";

const PAD = { l: 40, r: 88, t: 24, b: 36 };
const PAD_NARROW = { l: 34, r: 16, t: 24, b: 36 };

const TIP =
  "pointer-events-none absolute z-20 min-w-[200px] rounded-xl border border-white/12 bg-[#241b12]/95 px-3 py-2 text-[12px] leading-[1.45] text-white shadow-xl backdrop-blur-md";

function chartHeight(W: number): number {
  return W < 520 ? 280 : 320;
}

export function IndexStage({
  header,
  all,
  focusDate,
  symbol,
  caption,
}: {
  /** The page's eyebrow, h1 and standfirst. The document's h1 lives here. */
  header: ReactNode;
  /** Every reading, or null while loading. */
  all: Reading[] | null;
  /** The reading the figure states. The latest on the undated page; the
   *  URL's date on a permalink. */
  focusDate: string | null;
  symbol: string;
  /** The finding, in the strip under the chart. */
  caption?: ReactNode;
}) {
  const rows = useMemo(() => publishable(all), [all]);
  const focus = rows.find((r) => r.date === focusDate) ?? null;

  return (
    <div className={PANEL}>
      <div className="grid gap-x-12 gap-y-8 px-6 pt-7 sm:px-8 sm:pt-9 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start">
        <div className="min-w-0">{header}</div>
        <HeroReading loading={all === null} reading={focus} />
      </div>

      <div className="px-6 pt-8 sm:px-8">
        <Meter loading={all === null} score={focus?.score ?? null} />
      </div>

      <div className="mt-6">
        {all === null ? (
          <ChartSkeleton />
        ) : rows.length > 0 ? (
          <Chart focusDate={focusDate} rows={rows} symbol={symbol} />
        ) : null}
      </div>

      {caption ? (
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-white/10 px-5 py-3.5 text-[12.5px] leading-[1.5] text-white/65">
          {caption}
        </div>
      ) : null}
    </div>
  );
}

/* ─── The figure ────────────────────────────────────────────────────────── */

function HeroReading({
  reading,
  loading,
}: {
  reading: Reading | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div aria-hidden className="lg:justify-self-end lg:text-right">
        <Skeleton className="h-[11px] w-[88px] lg:ml-auto" />
        <Skeleton className="mt-3 h-[72px] w-[120px] lg:ml-auto" />
        <Skeleton className="mt-3 h-[15px] w-[140px] lg:ml-auto" />
      </div>
    );
  }
  if (!reading || reading.score == null || !reading.tier) {
    // The page says "not enough data yet" in prose; the slot reserves its
    // geometry and states no figure.
    return <div aria-hidden className="min-h-[120px]" />;
  }

  return (
    <div className="lg:justify-self-end lg:text-right">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
        Reading for {dateLabel(reading.date)}
      </p>
      {/* Proportional figures at this size: tabular-nums makes "121" loose. */}
      <p className="mt-1 text-[72px] font-semibold leading-none tracking-[-0.04em] text-white sm:text-[84px]">
        {reading.score}
      </p>
      <p className="mt-2 text-[16px] font-medium leading-[1.3] text-white/85">
        {reading.tier.label}
        <span className="text-white/45"> · out of 100</span>
      </p>
    </div>
  );
}

/* ─── The scale ─────────────────────────────────────────────────────────── */

function Meter({ score, loading }: { score: number | null; loading: boolean }) {
  const pct = score == null ? null : Math.max(0, Math.min(100, score));

  return (
    <div>
      <div
        aria-hidden={pct == null}
        aria-label={pct == null ? undefined : `${pct} out of 100`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={pct ?? undefined}
        className="relative grid grid-cols-5 gap-[2px]"
        role="meter"
      >
        {TIERS.map((t) => {
          // How much of this fifth the reading covers, 0..1.
          const fill =
            pct == null ? 0 : Math.max(0, Math.min(1, (pct - t.min) / 20));

          return (
            <div
              key={t.id}
              className="relative h-[7px] overflow-hidden rounded-full"
              style={{ background: "rgba(238,197,132,0.16)" }}
            >
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${fill * 100}%`, background: INK }}
                />
              )}
            </div>
          );
        })}
        {pct != null ? (
          <div
            aria-hidden
            className="absolute -top-[5px] h-[17px] w-[3px] rounded-full bg-white shadow-[0_0_0_2px_var(--stage-bg)]"
            style={{ left: `calc(${pct}% - 1.5px)` }}
          />
        ) : null}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-[2px] font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
        {TIERS.map((t, i) => (
          <span
            key={t.id}
            className={`truncate ${
              i === 0 || i === TIERS.length - 1 ? "" : "hidden sm:inline"
            } ${i === TIERS.length - 1 ? "text-right" : ""}`}
          >
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── The line ──────────────────────────────────────────────────────────── */

interface Pt {
  x: number;
  y: number;
  r: Reading;
}

function ChartSkeleton() {
  const H = 300;

  return (
    <div aria-hidden className="relative" style={{ height: H }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="absolute left-8 right-8 h-px bg-white/[0.06]"
          style={{ top: PAD.t + ((H - PAD.t - PAD.b) * i) / 4 }}
        />
      ))}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <Skeleton className="h-[12px] w-[132px]" />
      </div>
    </div>
  );
}

function Chart({
  rows,
  focusDate,
  symbol,
}: {
  rows: Reading[];
  focusDate: string | null;
  symbol: string;
}) {
  const navigate = useNavigate();
  const [ref, width] = useMeasuredWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const W = Math.max(300, width);
  const H = chartHeight(W);
  const narrow = W < 520;
  const pad = narrow ? PAD_NARROW : PAD;
  const plot = { x0: pad.l, x1: W - pad.r, y0: pad.t, y1: H - pad.b };
  const plotW = Math.max(1, plot.x1 - plot.x0);
  const plotH = Math.max(1, plot.y1 - plot.y0);

  const pts: Pt[] = useMemo(
    () =>
      rows.map((r, i) => ({
        x:
          plot.x0 +
          (rows.length === 1 ? plotW / 2 : (i * plotW) / (rows.length - 1)),
        y: plot.y1 - ((r.score ?? 0) / 100) * plotH,
        r,
      })),
    [rows, plot.x0, plot.y1, plotW, plotH],
  );

  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const area = pts.length
    ? `${line} L${pts[pts.length - 1].x.toFixed(1)} ${plot.y1} L${pts[0].x.toFixed(1)} ${plot.y1} Z`
    : "";

  // One tick per month, at the first published reading of it. A month whose
  // tick would sit on top of the previous one (the record opened on 29 May,
  // so "May" and "Jun" were two pixels apart) yields to the newer month.
  const months = pts
    .filter(
      (p, i) =>
        i === 0 || p.r.date.slice(0, 7) !== pts[i - 1].r.date.slice(0, 7),
    )
    .filter((p, i, arr) => i === arr.length - 1 || arr[i + 1].x - p.x > 36);

  const focusIdx = focusDate ? rows.findIndex((r) => r.date === focusDate) : -1;
  const focusPt = focusIdx >= 0 ? pts[focusIdx] : null;
  const hoverPt = hover != null ? pts[hover] : null;

  const nearest = (clientX: number, el: SVGSVGElement) => {
    const box = el.getBoundingClientRect();
    const x = clientX - box.left;
    let best = 0;
    let bestD = Infinity;

    pts.forEach((p, i) => {
      const d = Math.abs(p.x - x);

      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });

    return best;
  };

  const yFor = (v: number) => plot.y1 - (v / 100) * plotH;

  const tip = hoverPt;
  // The tooltip hangs to the right of the point until that would leave the
  // panel, then flips left.
  const tipLeft = tip ? (tip.x > W * 0.6 ? tip.x - 216 : tip.x + 14) : 0;
  const tipTop = tip ? Math.max(8, Math.min(H - 96, tip.y - 40)) : 0;

  return (
    <div ref={ref} className="relative">
      <svg
        aria-label={`The index, one reading per trading day, ${rows.length} readings from ${dateLabel(rows[0].date)} to ${dateLabel(rows[rows.length - 1].date)}. Hover or tap a point for the day, or use the table below.`}
        className="block w-full touch-pan-y select-none"
        height={H}
        role="img"
        width={W}
        onClick={(e) => {
          const i = nearest(e.clientX, e.currentTarget);

          navigate(indexPath(rows[i].date));
        }}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => setHover(nearest(e.clientX, e.currentTarget))}
      >
        {/* Tier rules: solid hairlines, one step off the ground, and the
            band names in the right gutter where there is one. */}
        {[0, 20, 40, 60, 80, 100].map((v) => (
          <line
            key={v}
            stroke="rgba(255,255,255,0.09)"
            strokeWidth={1}
            x1={plot.x0}
            x2={plot.x1}
            y1={yFor(v)}
            y2={yFor(v)}
          />
        ))}
        {[0, 50, 100].map((v) => (
          <text
            key={`y-${v}`}
            fill="rgba(255,255,255,0.4)"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontSize={10}
            textAnchor="end"
            x={plot.x0 - 8}
            y={yFor(v) + 3.5}
          >
            {v}
          </text>
        ))}
        {narrow
          ? null
          : TIERS.map((t) => (
              <text
                key={t.id}
                fill="rgba(255,255,255,0.4)"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontSize={10}
                letterSpacing="0.08em"
                x={plot.x1 + 10}
                y={yFor(t.min + 10) + 3.5}
              >
                {t.label.toUpperCase()}
              </text>
            ))}

        {/* Month ticks. */}
        {months.map((p) => (
          <g key={p.r.date}>
            <line
              stroke="rgba(255,255,255,0.12)"
              x1={p.x}
              x2={p.x}
              y1={plot.y1}
              y2={plot.y1 + 5}
            />
            <text
              fill="rgba(255,255,255,0.45)"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize={10}
              textAnchor={p === months[0] ? "start" : "middle"}
              x={p.x}
              y={plot.y1 + 18}
            >
              {shortDateLabel(p.r.date).slice(-3)}
            </text>
          </g>
        ))}

        {/* The series: a wash to the baseline and the line over it. */}
        <path d={area} fill={INK} fillOpacity={0.1} />
        <path
          d={line}
          fill="none"
          stroke={INK}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />

        {/* Crosshair on hover. */}
        {hoverPt ? (
          <line
            stroke="rgba(255,255,255,0.25)"
            x1={hoverPt.x}
            x2={hoverPt.x}
            y1={plot.y0}
            y2={plot.y1}
          />
        ) : null}

        {/* The reading the page states, ringed in the ground so it reads as
            punched out of the line rather than sitting on it. */}
        {focusPt ? (
          <g>
            <line
              stroke="rgba(255,255,255,0.18)"
              strokeDasharray="none"
              x1={focusPt.x}
              x2={focusPt.x}
              y1={focusPt.y + 6}
              y2={plot.y1}
            />
            <circle
              cx={focusPt.x}
              cy={focusPt.y}
              fill="var(--stage-bg)"
              r={7}
            />
            <circle cx={focusPt.x} cy={focusPt.y} fill={INK} r={5} />
          </g>
        ) : null}
        {hoverPt && hoverPt !== focusPt ? (
          <g>
            <circle
              cx={hoverPt.x}
              cy={hoverPt.y}
              fill="var(--stage-bg)"
              r={6}
            />
            <circle cx={hoverPt.x} cy={hoverPt.y} fill="#fff" r={4} />
          </g>
        ) : null}
      </svg>

      {tip && tip.r.tier ? (
        <div className={TIP} style={{ left: tipLeft, top: tipTop }}>
          <p className="font-medium">
            {dateLabel(tip.r.date)}
            <span className="text-white/55"> · {tip.r.tier.label}</span>
          </p>
          <p className="mt-0.5 text-[15px] font-semibold leading-tight">
            {tip.r.score}
            <span className="text-[11px] font-normal text-white/50">
              {" "}
              / 100
            </span>
          </p>
          <p className="mt-1 text-white/65">
            {tip.r.count} purchases · {tip.r.breadth} companies ·{" "}
            {formatMoney(tip.r.value, symbol)} capped, over {WINDOW_DAYS} days
          </p>
          <p className="mt-1 text-white/45">Click for this day’s page</p>
        </div>
      ) : null}
    </div>
  );
}
