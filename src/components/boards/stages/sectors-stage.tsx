/** The sector board's proof object: every disclosed purchase of the year as
 *  one dot, in a lane per sector.
 *
 *  The index's question is two questions — where did the money go, and did it
 *  work — and the ranked list below can only answer them one row at a time.
 *  Eleven lanes answer both at once. In "Where the money went" each lane is a
 *  strip of dots on a log money scale, so a sector's spread is visible next to
 *  its neighbours' and the £11m purchase and the £11 purchase are both on the
 *  picture. In "Whether it worked" the same dots slide onto alpha, the lanes
 *  re-sort by their median, and each lane gains a median tick that says how
 *  many buys it was drawn from.
 *
 *  Two things this deliberately does not do. It encodes nothing in length or
 *  area: the sectors span 146:1 by value and the companies inside them 1,470:1,
 *  so a bar chart would leave nine sectors reading as empty and a treemap
 *  would claim the eleven are a whole, which they are not — the sectors below
 *  the publishing bar are missing from it. And it never places a buy with no
 *  performance mark at zero: those park in a labelled strip under the plot
 *  with their count, because "we don't know yet" and "it went nowhere" are
 *  different facts.
 *
 *  The frame is BoardStagePanel and the material is stage-marks; what lives
 *  here is what only this board does — the lanes, the two scales, the
 *  beeswarm, and the sentences the picture is allowed to state.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";
import type { SectorRollupRow } from "../../../../shared/sectors";
import type { Linking } from "../board-model";
import type { StageContext, StageMode, StagePad } from "../stage-panel";
import type { ReactNode } from "react";
import type { SectorMarket } from "@/components/sector-ui";

import { useEffect, useMemo } from "react";

import { buyAlpha } from "../../../../shared/leaderboard.js";
import {
  cleanCompanyName,
  dealValue,
  formatMoney,
  formatSignedPct,
  median,
  sectorByLabel,
  sectorPath,
  CONCENTRATION_THRESHOLD,
} from "../../../../shared/sectors.js";
import { direction } from "../board-model";
import { BoardStagePanel } from "../stage-panel";
import {
  alphaTicks,
  exactMoney,
  moneyTicks,
  DotField,
  LogoDisc,
  SignedAxis,
  StageAxis,
  StageLabel,
  StageMark,
  stageTone,
} from "../stage-marks";

import { displayTicker } from "@/lib/company";

type Mode = "value" | "outcome";

const MODES: ReadonlyArray<StageMode<Mode>> = [
  { id: "value", label: "Where the money went" },
  { id: "outcome", label: "Whether it worked" },
];

/** The gutter carries a sector name and a count under it, which needs real
 *  width. A phone has none to give, so below this the names move inside the
 *  lanes and the dots take the rest of the height. */
const GUTTER_FROM = 640;

/** The lane's own label strip, when there is no gutter. */
const LABEL_STRIP = 14;

const PAD = (W: number): StagePad => ({
  l: W < GUTTER_FROM ? 24 : 160,
  r: 24,
  t: 68,
  b: 44,
});

const DOT_R = 2.5;

/** One purchase, undirected. The value mode states no result, so it carries no
 *  colour — the design language's rule that colour means something. */
const NEUTRAL = "rgba(255,255,255,0.35)";

const HALO = {
  paintOrder: "stroke",
  stroke: "var(--stage-bg)",
  strokeLinejoin: "round" as const,
  strokeWidth: 4,
};

/** Ratio → "+20%". The list below this stage prints percentages, so the axis
 *  does too; "pp" on the chart and "%" in the table is one page speaking two
 *  languages about the same figure. */
function pctTick(v: number): string {
  return v === 0 ? "level" : `${v > 0 ? "+" : ""}${Math.round(v * 100)}%`;
}

function isDecade(v: number): boolean {
  return Math.abs(Math.log10(v) - Math.round(Math.log10(v))) < 1e-9;
}

/** One disclosed purchase, drawn as one dot.
 *
 *  Built from the SAME population `sectorRollup` counts — every row whose
 *  sector resolves, not the eligibility-filtered board set — so a lane's dots
 *  and the "309 buys" beside it are the same 309 things. `buildLayout` asserts
 *  that in development.
 */
export interface SectorBuy {
  id: string;
  slug: string;
  ticker: string;
  company: string;
  value: number;
  /** Ratio against the market since disclosure, or null with no mark yet. */
  alpha: number | null;
}

export function toSectorBuys(
  dealings: Array<Dealing | UsDealing>,
  slugs: Set<string>,
): SectorBuy[] {
  const out: SectorBuy[] = [];

  dealings.forEach((d, i) => {
    const sector = sectorByLabel(d.sector_normalized ?? "");

    if (!sector || !slugs.has(sector.slug)) return;
    const ticker = d.ticker ?? "";

    out.push({
      id: `${d.id ?? "buy"}-${i}`,
      slug: sector.slug,
      ticker,
      company: cleanCompanyName(d.company ?? "") || ticker,
      value: dealValue(d),
      alpha: buyAlpha(d),
    });
  });

  return out;
}

interface LaneDot {
  id: string;
  x: number;
  /** Relative to the lane's top: the lane group carries the vertical move. */
  y: number;
  fill?: string;
}

interface Lane {
  row: SectorRollupRow;
  top: number;
  /** Absolute y the dots sit around. */
  centre: number;
  height: number;
  dots: LaneDot[];
  medianX: number | null;
  beyondPos: number;
  beyondNeg: number;
  /** Where the tooltip hangs: the rightmost dot, or the median tick. */
  anchorX: number;
  concentration: { ticker: string; share: number; x: number } | null;
}

interface Layout {
  plot: { x0: number; x1: number; y0: number; y1: number };
  labelInset: number;
  lanes: Lane[];
  clip: number;
  xAlpha: (a: number) => number;
  moneyAt: Array<{ at: number; label: string }>;
  strip: { y: number; count: number; labelX: number } | null;
}

/** The whole picture, for one arrangement. Both modes are the same marks, so
 *  only the showing one is laid out; the move between them is the CSS
 *  transition on each mark, not a second set of coordinates. */
function buildLayout(
  rows: SectorRollupRow[],
  buys: SectorBuy[],
  W: number,
  H: number,
  pad: StagePad,
  mode: Mode,
  symbol: string,
  locale: string,
): Layout {
  const plot = { x0: pad.l, x1: W - pad.r, y0: pad.t, y1: H - pad.b };
  const plotW = Math.max(1, plot.x1 - plot.x0);
  const laneH = (plot.y1 - plot.y0) / Math.max(1, rows.length);
  const labelInset = W < GUTTER_FROM ? LABEL_STRIP : 0;
  const amp = Math.max(2, (laneH - labelInset) * 0.28);
  const step = Math.min(5, Math.max(2, amp / 2.5));

  // Value order is the rollup's own; outcome order is by median, and a sector
  // with nothing to measure sorts last rather than at zero.
  const order =
    mode === "value"
      ? rows
      : [...rows].sort((a, b) => {
          if (a.medianAlpha == null) return b.medianAlpha == null ? 0 : 1;
          if (b.medianAlpha == null) return -1;

          return b.medianAlpha - a.medianAlpha;
        });
  const indexBySlug = new Map(order.map((r, i) => [r.sector.slug, i]));

  const positive = buys.map((b) => b.value).filter((v) => v > 0);
  const lo = (positive.length ? Math.min(...positive) : 1) * 0.82;
  const hi = (positive.length ? Math.max(...positive) : 10) * 1.25;
  const logSpan = Math.log(hi) - Math.log(lo) || 1;
  // A row filed without a value is clamped to the floor rather than dropped:
  // it is one of the purchases the lane's count is made of.
  const xValue = (v: number) =>
    plot.x0 + ((Math.log(Math.max(v, lo)) - Math.log(lo)) / logSpan) * plotW;

  // Clipped, not scaled to the extreme: one +340% holding would push every
  // median on the board into a thumbnail's width of the centre.
  const mags = buys
    .map((b) => b.alpha)
    .filter((a): a is number => a != null)
    .map(Math.abs)
    .sort((a, b) => a - b);
  const p99 = mags.length
    ? mags[Math.min(mags.length - 1, Math.floor(mags.length * 0.99))]
    : 0;
  const clip = Math.max(0.2, Math.ceil(p99 / 0.1) * 0.1);
  const xAlpha = (a: number) =>
    plot.x0 +
    ((Math.max(-clip, Math.min(clip, a)) + clip) / (2 * clip)) * plotW;

  const unmarked =
    mode === "outcome" ? buys.filter((b) => b.alpha == null).length : 0;
  const stripY = plot.y1 + 13;
  const stripStep = Math.min(
    6,
    Math.max(2, (plotW - 150) / Math.max(1, unmarked)),
  );
  let stripK = 0;

  const byLane = new Map<string, SectorBuy[]>();

  for (const b of buys) {
    const list = byLane.get(b.slug);

    if (list) list.push(b);
    else byLane.set(b.slug, [b]);
  }

  const lanes: Lane[] = order.map((row) => {
    const slug = row.sector.slug;
    const items = byLane.get(slug) ?? [];
    const top = plot.y0 + (indexBySlug.get(slug) ?? 0) * laneH;
    const centre = top + labelInset + (laneH - labelInset) / 2;
    const bins = new Map<number, number>();
    const dots: LaneDot[] = [];
    let rightmost = plot.x0;

    for (const b of items) {
      if (mode === "outcome" && b.alpha == null) {
        dots.push({
          id: b.id,
          x: plot.x0 + 4 + stripK * stripStep,
          y: stripY - top,
          fill: NEUTRAL,
        });
        stripK += 1;
        continue;
      }
      const x = mode === "value" ? xValue(b.value) : xAlpha(b.alpha ?? 0);
      // Beeswarmed by x-bin so a hundred purchases at the same amount read as
      // a hundred rather than as one dot. Deterministic: same feed, same
      // picture, and the dot a reader hovered is where they left it.
      const bin = Math.round(x / 5);
      const k = bins.get(bin) ?? 0;
      const sign = k % 2 === 1 ? 1 : -1;
      const dy = Math.max(-amp, Math.min(amp, sign * Math.ceil(k / 2) * step));

      bins.set(bin, k + 1);
      dots.push({
        id: b.id,
        x,
        y: centre + dy - top,
        fill: mode === "outcome" ? stageTone(direction(b.alpha)) : undefined,
      });
      if (x > rightmost) rightmost = x;
    }

    const medianX = row.medianAlpha == null ? null : xAlpha(row.medianAlpha);
    const concentrated =
      row.topCompany != null &&
      row.topCompanyShare != null &&
      row.topCompanyShare > CONCENTRATION_THRESHOLD;

    return {
      row,
      top,
      centre,
      height: laneH,
      dots,
      medianX,
      beyondPos: items.filter((b) => b.alpha != null && b.alpha > clip).length,
      beyondNeg: items.filter((b) => b.alpha != null && b.alpha < -clip).length,
      anchorX: mode === "value" ? rightmost : (medianX ?? xAlpha(0)),
      concentration:
        mode === "value" && concentrated
          ? {
              ticker: row.topCompany as string,
              share: row.topCompanyShare as number,
              x: Math.min(rightmost + 16, plot.x1 - 12),
            }
          : null,
    };
  });

  const ticks = moneyTicks(lo, hi);
  const shown = ticks.length > 9 ? ticks.filter(isDecade) : ticks;

  return {
    plot,
    labelInset,
    lanes,
    clip,
    xAlpha,
    moneyAt: shown.map((v) => ({
      at: xValue(v),
      // formatMoney renders anything under £1,000 as "£0k", which on a scale
      // whose floor is £10.90 is the one tick a reader would check.
      label: v < 1000 ? exactMoney(v, symbol, locale) : formatMoney(v, symbol),
    })),
    strip:
      mode === "outcome" && unmarked > 0
        ? {
            y: stripY,
            count: unmarked,
            labelX: Math.min(
              plot.x0 + 12 + unmarked * stripStep,
              plot.x1 - 110,
            ),
          }
        : null,
  };
}

/** What the picture is allowed to say about itself. Counts of sector MEDIANS,
 *  never of buys: eleven medians being ahead is a much smaller claim than
 *  eleven hundred purchases being ahead, and it is the one the drawing
 *  supports. */
function summarise(rows: SectorRollupRow[]) {
  const withMedian = rows.filter((r) => r.medianAlpha != null);
  const sorted = [...withMedian].sort(
    (a, b) => (b.medianAlpha ?? 0) - (a.medianAlpha ?? 0),
  );

  return {
    value: rows.reduce((n, r) => n + r.value, 0),
    buys: rows.reduce((n, r) => n + r.buys, 0),
    ahead: withMedian.filter((r) => (r.medianAlpha ?? 0) > 0).length,
    behind: withMedian.filter((r) => (r.medianAlpha ?? 0) < 0).length,
    unmeasured: rows.length - withMedian.length,
    top: rows[0] ?? null,
    best: sorted[0] ?? null,
    worst: sorted[sorted.length - 1] ?? null,
  };
}

/** The marks, inside the panel's svg. A component rather than the render prop
 *  run inline, so a thousand dots are not re-binned every time a pointer
 *  crosses a lane. */
function StageBody({
  ctx,
  rows,
  buys,
  market,
  locale,
  summary,
}: {
  ctx: StageContext<Mode>;
  rows: SectorRollupRow[];
  buys: SectorBuy[];
  market: SectorMarket;
  locale: string;
  summary: ReturnType<typeof summarise>;
}) {
  const { W, H, pad, mode } = ctx;
  const outcome = mode === "outcome";
  const L = useMemo(
    () => buildLayout(rows, buys, W, H, pad, mode, market.symbol, locale),
    [rows, buys, W, H, pad, mode, market.symbol, locale],
  );
  const wide = W >= GUTTER_FROM;
  const clipLabel = `${Math.round(L.clip * 100)}%`;

  return (
    <>
      {/* Money furniture. Faded rather than mounted, so the dots travel over
          it as it arrives. */}
      <g
        className="transition-opacity duration-700"
        style={{ opacity: outcome ? 0 : 1 }}
      >
        <StageAxis
          plot={L.plot}
          x={L.moneyAt}
          xLabel="value of each purchase →"
        />
      </g>

      {/* Outcome furniture: the level line, the two bands, and the strip for
          the purchases that have no mark yet. */}
      <g
        className="transition-opacity duration-700"
        style={{ opacity: outcome ? 1 : 0 }}
      >
        <SignedAxis
          labelGutter={L.plot.y1 + 30}
          negLabel={`${summary.behind} behind`}
          orientation="vertical"
          plot={L.plot}
          posLabel={`${summary.ahead} of ${rows.length} sector medians ahead`}
          scale={L.xAlpha}
          tickLabel={pctTick}
          ticks={alphaTicks(-L.clip, L.clip)}
        />
        {L.strip ? (
          <text
            className="font-mono"
            fill="rgba(255,255,255,0.45)"
            fontSize={10}
            x={L.strip.labelX}
            y={L.strip.y + 3.5}
          >
            no mark yet · {L.strip.count}
          </text>
        ) : null}
      </g>

      {L.lanes.map((lane) => {
        const row = lane.row;
        const slug = row.sector.slug;
        const cy = lane.centre - lane.top;
        const tickH = (lane.height - L.labelInset) * 0.8;
        const medianText =
          row.medianAlpha == null
            ? null
            : `${formatSignedPct(row.medianAlpha)} · from ${row.alphaCount} buys`;
        // The median label sits to the right of its tick unless the right of
        // the lane is spoken for — by the plot edge, or by the count of the
        // buys that ran off it.
        const medianW = (medianText?.length ?? 0) * 6.1;
        const rightRoom =
          L.plot.x1 -
          (lane.beyondPos > 0 ? 116 : 6) -
          ((lane.medianX ?? 0) + 7);
        const leftRoom = (lane.medianX ?? 0) - 7 - L.plot.x0;
        const medianRight = medianW <= rightRoom || medianW > leftRoom;

        return (
          <StageMark
            key={slug}
            anchor={{ x: lane.anchorX, y: lane.centre, r: lane.height / 2 }}
            ariaLabel={`${row.sector.label}, ${row.buys} purchases across ${row.companies} companies, ${formatMoney(row.value, market.symbol)}${
              row.medianAlpha == null
                ? ""
                : `, median ${formatSignedPct(row.medianAlpha)} from ${row.alphaCount} buys`
            }`}
            hit={{
              shape: "rect",
              x: L.plot.x0,
              y: 0,
              w: L.plot.x1 - L.plot.x0,
              h: lane.height,
            }}
            href={sectorPath(slug)}
            id={slug}
            x={0}
            y={lane.top}
          >
            <DotField dots={lane.dots} fill={NEUTRAL} r={DOT_R} />

            {/* The sector's own name: in the gutter where there is one, inside
                the lane where there isn't. */}
            {wide ? (
              <>
                <text
                  fill="rgba(255,255,255,0.9)"
                  fontSize={13}
                  fontWeight={600}
                  textAnchor="end"
                  x={L.plot.x0 - 14}
                  y={cy - 2}
                >
                  {row.sector.label}
                </text>
                <text
                  className="font-mono"
                  fill="rgba(255,255,255,0.45)"
                  fontSize={10}
                  textAnchor="end"
                  x={L.plot.x0 - 14}
                  y={cy + 12}
                >
                  {row.buys} buys · {row.companies} companies
                </text>
              </>
            ) : (
              <text
                fill="rgba(255,255,255,0.9)"
                fontSize={11.5}
                fontWeight={600}
                x={L.plot.x0}
                y={10}
                {...HALO}
              >
                {row.sector.label}
                <tspan
                  className="font-mono"
                  fill="rgba(255,255,255,0.45)"
                  fontSize={9.5}
                  fontWeight={400}
                >
                  {" "}
                  · {row.buys} buys · {row.companies} companies
                </tspan>
              </text>
            )}

            {/* The one issuer that is most of a lane, named on the lane rather
                than in a footnote under it. */}
            <g
              className="transition-opacity duration-500"
              style={{ opacity: outcome ? 0 : 1 }}
            >
              {lane.concentration ? (
                <g
                  className="board-stage-move"
                  style={{
                    transform: `translate(${lane.concentration.x}px, ${cy}px)`,
                  }}
                >
                  <LogoDisc
                    clipId={`sector-lane-${slug}`}
                    edge={NEUTRAL}
                    r={9}
                    ticker={lane.concentration.ticker}
                  />
                  <StageLabel
                    r={9}
                    side="left"
                    text={`${displayTicker(lane.concentration.ticker)} · ${Math.round(lane.concentration.share * 100)}%`}
                    visible={!outcome}
                  />
                </g>
              ) : null}
            </g>

            {/* The middle of the drawn dots, with the sample it came from. */}
            <g
              className="transition-opacity duration-500"
              style={{ opacity: outcome ? 1 : 0 }}
            >
              {lane.medianX != null && medianText ? (
                <>
                  <line
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth={2}
                    x1={lane.medianX}
                    x2={lane.medianX}
                    y1={cy - tickH / 2}
                    y2={cy + tickH / 2}
                  />
                  <text
                    className="font-mono"
                    fill="rgba(255,255,255,0.85)"
                    fontSize={10.5}
                    textAnchor={medianRight ? "start" : "end"}
                    x={medianRight ? lane.medianX + 7 : lane.medianX - 7}
                    y={cy + 3.5}
                    {...HALO}
                  >
                    {medianText}
                  </text>
                </>
              ) : (
                <text
                  className="font-mono"
                  fill="rgba(255,255,255,0.4)"
                  fontSize={10}
                  x={L.plot.x0 + 8}
                  y={cy + 3.5}
                  {...HALO}
                >
                  no median yet
                </text>
              )}

              {/* The axis ends are a clip, not a maximum, so the purchases
                  past it are counted where they were cut off. */}
              {lane.beyondPos > 0 ? (
                <g>
                  <path
                    d={`M${L.plot.x1 - 9},${cy - 4} l4,4 l-4,4`}
                    fill="none"
                    stroke="rgba(255,255,255,0.65)"
                    strokeWidth={1.4}
                  />
                  <text
                    className="font-mono"
                    fill="rgba(255,255,255,0.5)"
                    fontSize={9.5}
                    textAnchor="end"
                    x={L.plot.x1 - 15}
                    y={cy + 3.5}
                    {...HALO}
                  >
                    {lane.beyondPos} beyond +{clipLabel}
                  </text>
                </g>
              ) : null}
              {lane.beyondNeg > 0 ? (
                <g>
                  <path
                    d={`M${L.plot.x0 + 9},${cy - 4} l-4,4 l4,4`}
                    fill="none"
                    stroke="rgba(255,255,255,0.65)"
                    strokeWidth={1.4}
                  />
                  <text
                    className="font-mono"
                    fill="rgba(255,255,255,0.5)"
                    fontSize={9.5}
                    x={L.plot.x0 + 15}
                    y={cy + 3.5}
                    {...HALO}
                  >
                    {lane.beyondNeg} beyond −{clipLabel}
                  </text>
                </g>
              ) : null}
            </g>
          </StageMark>
        );
      })}
    </>
  );
}

export function SectorsStage({
  rows,
  buys,
  market,
  locale,
  linking,
  header,
}: {
  /** The publishable sectors, richest first. Null while the feed is in
   *  flight; the page passes no stage at all when there are none. */
  rows: SectorRollupRow[] | null;
  /** Every disclosed purchase in those sectors — one dot each. */
  buys: SectorBuy[];
  market: SectorMarket;
  locale: string;
  linking: Linking;
  /** The page's message layer — eyebrow, h1, standfirst, figures — set inside
   *  the object above the chart. The toggle joins its row. */
  header?: ReactNode;
}) {
  const board = rows && rows.length ? rows : null;
  const summary = useMemo(() => (board ? summarise(board) : null), [board]);
  const bySlug = useMemo(
    () => new Map((board ?? []).map((r) => [r.sector.slug, r] as const)),
    [board],
  );
  // The rollup names its largest issuer by ticker; the tooltip names it the
  // way the rest of the page does.
  const nameByTicker = useMemo(() => {
    const m = new Map<string, string>();

    for (const b of buys)
      if (b.ticker && !m.has(b.ticker)) m.set(b.ticker, b.company);

    return m;
  }, [buys]);

  // The lanes and the counts beside them have to be the same purchases, and
  // the median tick has to be the middle of the drawn dots. Both hold by
  // construction — the dots come from the population `sectorRollup` counts —
  // so this is the alarm for the day one of the two moves.
  useEffect(() => {
    if (!import.meta.env.DEV || !board) return;

    for (const row of board) {
      const items = buys.filter((b) => b.slug === row.sector.slug);
      const drawn = median(items.map((b) => b.alpha));

      if (items.length !== row.buys) {
        // eslint-disable-next-line no-console
        console.error(
          `SectorsStage: ${row.sector.slug} draws ${items.length} dots for ${row.buys} buys.`,
        );
      }
      if (drawn !== row.medianAlpha) {
        // eslint-disable-next-line no-console
        console.error(
          `SectorsStage: ${row.sector.slug} draws a median of ${drawn} against the row's ${row.medianAlpha}.`,
        );
      }
    }
  }, [board, buys]);

  return (
    <BoardStagePanel<Mode>
      caption={(ctx) =>
        board && summary ? (
          ctx.mode === "value" ? (
            <p>
              <span className="font-semibold text-white">
                {formatMoney(summary.value, market.symbol)} across{" "}
                {summary.buys} purchases in {board.length} sectors
              </span>
              , one dot each
              {summary.top
                ? `; ${summary.top.sector.label.toLowerCase()} is the largest at ${formatMoney(summary.top.value, market.symbol)}.`
                : "."}{" "}
              <button
                className="text-white/80 underline decoration-white/30 underline-offset-4 hover:text-white"
                type="button"
                onClick={() => ctx.choose("outcome")}
              >
                See whether it worked →
              </button>
            </p>
          ) : (
            <p>
              <span className="font-semibold text-white">
                {summary.ahead} of {board.length} sector medians are ahead of
                the market
              </span>
              ; {summary.behind} behind
              {summary.unmeasured > 0
                ? `, ${summary.unmeasured} without a median yet`
                : ""}
              .
              {summary.best &&
              summary.worst &&
              summary.best !== summary.worst ? (
                <>
                  {" "}
                  {summary.best.sector.label} leads at{" "}
                  {formatSignedPct(summary.best.medianAlpha)} from{" "}
                  {summary.best.alphaCount} buys; {summary.worst.sector.label}{" "}
                  trails at {formatSignedPct(summary.worst.medianAlpha)} from{" "}
                  {summary.worst.alphaCount} buys.
                </>
              ) : null}
            </p>
          )
        ) : null
      }
      header={header}
      linking={linking}
      loading={board === null || summary === null}
      modes={MODES}
      pad={PAD}
      renderTip={(id) => {
        const row = bySlug.get(id);

        if (!row) return null;
        const concentrated =
          row.topCompany != null &&
          row.topCompanyShare != null &&
          row.topCompanyShare > CONCENTRATION_THRESHOLD;

        return (
          <>
            <div className="font-semibold">{row.sector.label}</div>
            <div className="text-[11px] text-white/55">
              {row.buys} purchases · {row.companies} companies · {row.people}{" "}
              {market.noun}
            </div>
            <div className="mt-1 tabular-nums">
              {formatMoney(row.value, market.symbol)}
              {concentrated
                ? ` · ${Math.round((row.topCompanyShare ?? 0) * 100)}% ${
                    nameByTicker.get(row.topCompany as string) ??
                    displayTicker(row.topCompany as string)
                  }`
                : ""}
            </div>
            {/* Uncoloured: the sign carries it, and a green median beside a
                grey volume reads as a recommendation. */}
            {row.alphaCount > 0 ? (
              <div className="mt-1 text-[11px] text-white/70">
                median {formatSignedPct(row.medianAlpha)} vs the market · from{" "}
                {row.alphaCount} of {row.buys} buys
              </div>
            ) : null}
          </>
        );
      }}
      svgLabel={(mode) =>
        board && summary
          ? mode === "value"
            ? `${summary.buys} disclosed purchases in ${board.length} sectors, each placed by its value`
            : "The same purchases placed by their return against the market since disclosure, with each sector’s median marked"
          : ""
      }
    >
      {(ctx) =>
        board && summary ? (
          <StageBody
            buys={buys}
            ctx={ctx}
            locale={locale}
            market={market}
            rows={board}
            summary={summary}
          />
        ) : null
      }
    </BoardStagePanel>
  );
}
