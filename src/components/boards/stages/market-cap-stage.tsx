/** The size ladder: every company we can place, by what it is worth and what
 *  its insiders bought.
 *
 *  The page's argument is that the three bands are lines drawn on a continuum,
 *  not three separate markets, so the stage shows the continuum: the whole
 *  placed population on two log scales — market value across, value bought up
 *  — with the two band thresholds drawn as rules through it and three
 *  constant-share diagonals for scale. Nothing is ever drawn as a share of a
 *  whole: the unplaced companies are absent, and a pie would quietly claim
 *  they were not.
 *
 *  ONE arrangement, since 2026-09-06. The second — "by band", the same marks
 *  gathered into strips along the same axis — was this picture with its value
 *  axis taken away, which is a picture that says less rather than something
 *  else. The band totals it existed to state are figures, so they are stated
 *  as figures: the page carries them in its stat tiles, where a reader can
 *  read them off rather than infer them from the depth of a column.
 *
 *  Monochrome on purpose. This board has no direction to state — a market
 *  value is not a gain — and the two stage tones mean ahead and behind
 *  everywhere else on the site.
 *
 *  Rows come only from `rollup.bands[*].companies`, which `bandFor` has
 *  already gated. The stage never re-derives a band, never reads
 *  `stats_currency` and never divides a cap by 100; read the header of
 *  shared/cap-bands.js for why that last one is the trap.
 */
import type { BandRollup, IndexedCompany } from "../../../../shared/cap-bands";
import type { StageContext, StageMode, StagePad } from "../stage-panel";
import type { Side } from "../stage-marks";

import { memo, useMemo } from "react";

import { median } from "../../../../shared/boards.js";
import { BANDS } from "../../../../shared/cap-bands.js";
import { formatMoney } from "../../../../shared/sectors.js";
import { dateLabel } from "../board-model";
import { StageFigures } from "../stage-figures";
import { StageNotice } from "../stage-notice";
import {
  DotField,
  exactMoney,
  LogoDisc,
  moneyTicks,
  placeLabels,
  RuleWithLabel,
  StageAxis,
  StageLabel,
  StageMark,
} from "../stage-marks";
import { BoardStagePanel } from "../stage-panel";

import { cleanCompanyName, companyPath, displayTicker } from "@/lib/company";

type Mode = "size";

interface CapMarket {
  id: "UK" | "US";
  label: string;
  symbol: string;
}

/** One placed company: everything the stage draws, and nothing it doesn't. */
interface CapRow {
  key: string;
  name: string;
  ticker: string;
  /** Market value, in the market's own currency. Never converted. */
  cap: number;
  value: number;
  deals: number;
  last: string | null;
  sector: string | null;
  slug: string;
}

interface Dot {
  row: CapRow;
  x: number;
  y: number;
}

const MODES: ReadonlyArray<StageMode<Mode>> = [
  { id: "size", label: "By size" },
];

/** A wider left gutter than the default: the value axis prints money. The
 *  narrow pad buys its extra top strip from the gutter, because a phone needs
 *  the two axis notes on two lines and has no width to give the ticks. */
const PAD = (W: number): StagePad =>
  W < 560 ? { l: 48, r: 18, t: 100, b: 40 } : { l: 64, r: 24, t: 84, b: 44 };

const DOT_R = 3.5;
const DOT_FILL = "rgba(255,255,255,0.30)";
const DOT_EDGE = "rgba(255,255,255,0.45)";
const NAMED_R = 13;

/** A logo's own radius plus its ring, kept between the outermost mark and the
 *  panel's edge so the largest company on the board is drawn whole. */
const EDGE = NAMED_R + 6;

/** Where along its own line a share diagonal will try to carry its label,
 *  nearest the sparse lower-left end first. */
const LABEL_STOPS = [
  0.06, 0.14, 0.22, 0.3, 0.38, 0.46, 0.54, 0.62, 0.7, 0.78, 0.86, 0.94,
];

/** Constant-share diagonals. On log-log scales a fixed fraction of a company
 *  is a straight line, which is the cheapest way to show that the same
 *  purchase means something different at each end of the axis. */
const SHARES: Array<{ share: number; label: string }> = [
  { share: 0.01, label: "1% of the company" },
  { share: 0.001, label: "0.1% of the company" },
  { share: 0.0001, label: "0.01% of the company" },
];

/** Mono uppercase, the one caption recipe on this stage. */
const NOTE = "font-mono uppercase";

/** What the two axes are, in the two places a reader looks for it. */
const X_NOTE = "market value today →";
const Y_NOTE = "value bought ↑";

function bn(value: number, symbol: string): string {
  return `${symbol}${value / 1_000_000_000}bn`;
}

/** The band's own thresholds in words, from BANDS rather than typed out. */
function thresholdWords(
  band: (typeof BANDS)[number],
  market: "UK" | "US",
  symbol: string,
): string {
  const min = band.min[market];
  const max = band.max[market];

  if (max == null) return `${bn(min, symbol)} or more`;
  if (!min) return `under ${bn(max, symbol)}`;

  return `${bn(min, symbol)} to ${bn(max, symbol)}`;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Money in a figure slot. `formatMoney` renders anything under a thousand as
 *  "£0k", which is a rounded zero standing in for a real small number — the
 *  one thing a figure slot may never say. */
function spend(value: number, symbol: string, locale: string): string {
  return value < 1000
    ? exactMoney(value, symbol, locale)
    : formatMoney(value, symbol);
}

/** The placed companies, in one flat list.
 *
 *  Only from the rollup's own buckets, so banding happens once, in the module
 *  that owns the currency rules. A placed company with no value on file is
 *  left out rather than drawn at the floor of a value axis it has no place
 *  on; the caption counts what that costs. */
function toCapRows(rollup: BandRollup): CapRow[] {
  const out: CapRow[] = [];

  for (const row of rollup.bands) {
    for (const company of row.companies as IndexedCompany[]) {
      const cap = Number(company.market_cap);
      const value = Number(company.total_value ?? 0);

      if (!isFinite(cap) || cap <= 0) continue;
      if (!isFinite(value) || value <= 0) continue;

      out.push({
        key: company.key,
        name: cleanCompanyName(company.company) || displayTicker(company.key),
        ticker: displayTicker(company.key),
        cap,
        value,
        deals: company.deals ?? 0,
        last: company.last_trade_date ?? null,
        sector: company.sector_normalized ?? null,
        slug: row.band.slug,
      });
    }
  }

  return out;
}

/** How many companies the ladder can draw. The page gates its hero on this,
 *  because a stage of no dots is not a picture of anything. */
export function placedCount(rollup: BandRollup): number {
  return toCapRows(rollup).length;
}

/** Every company the rollup placed in a band, drawable or not. The difference
 *  from `placedCount` is what the caption has to account for. */
function bandedCount(rollup: BandRollup): number {
  return rollup.bands.reduce((n, row) => n + row.count, 0);
}

/** The few companies that get a logo and a name: the largest purchase in each
 *  band, the one that bought the largest slice of itself, and the largest
 *  company on the board. Deduped, so a company that leads twice is drawn
 *  once. Ordered by what was spent, which is the priority the labeller
 *  works down. */
function pickNamed(rows: CapRow[]): CapRow[] {
  if (rows.length === 0) return [];
  const byBand = new Map<string, CapRow>();

  for (const row of rows) {
    const held = byBand.get(row.slug);

    if (!held || row.value > held.value) byBand.set(row.slug, row);
  }

  const topShare = rows.reduce((best, row) =>
    row.value / row.cap > best.value / best.cap ? row : best,
  );
  const topCap = rows.reduce((best, row) => (row.cap > best.cap ? row : best));
  const seen = new Set<string>();
  const picked: CapRow[] = [];

  for (const row of [...byBand.values(), topShare, topCap]) {
    if (seen.has(row.key)) continue;
    seen.add(row.key);
    picked.push(row);
  }

  return picked.sort((a, b) => b.value - a.value);
}

interface Scales {
  x: (cap: number) => number;
  y: (value: number) => number;
  capMin: number;
  capMax: number;
  vMin: number;
  vMax: number;
  plot: { x0: number; x1: number; y0: number; y1: number };
}

/** Both axes are log and both domains are the data's own: no clamp, because a
 *  clamp on this stage would be a company hidden at an edge. */
function scalesFor(
  rows: CapRow[],
  W: number,
  H: number,
  pad: StagePad,
): Scales {
  const caps = rows.map((r) => r.cap);
  const values = rows.map((r) => r.value);
  const capMin = Math.min(...caps);
  const capMax = Math.max(...caps);
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  const plot = { x0: pad.l, x1: W - pad.r, y0: pad.t, y1: H - pad.b };
  // Inset by a whole logo: the biggest company on the board sits at the top of
  // the cap axis, and a disc drawn half outside the panel is a company the
  // reader cannot identify or click.
  const x0 = plot.x0 + EDGE;
  const x1 = plot.x1 - EDGE;
  const y0 = plot.y0 + EDGE;
  const y1 = plot.y1 - 24;
  const spanC = Math.log(capMax) - Math.log(capMin) || 1;
  const spanV = Math.log(vMax) - Math.log(vMin) || 1;

  return {
    x: (cap) => x0 + ((Math.log(cap) - Math.log(capMin)) / spanC) * (x1 - x0),
    y: (v) => y1 - ((Math.log(v) - Math.log(vMin)) / spanV) * (y1 - y0),
    capMin,
    capMax,
    vMin,
    vMax,
    plot,
  };
}

function sizeLayout(rows: CapRow[], sc: Scales): Dot[] {
  return rows.map((row) => ({ row, x: sc.x(row.cap), y: sc.y(row.value) }));
}

/** Roughly how wide a company's name label runs: the labeller's own width
 *  function, so the space a name is given and the space kept clear for it are
 *  the same number. */
function labelWidth(text: string): number {
  return Math.max(text.length * 6.6, 86) + 4;
}

/** Roughly how wide a mono caption runs, for deciding whether it fits. Better
 *  to drop a caption than to overlap two. Mono 10px tracked at 0.12em measures
 *  a shade over 7px a character; the estimate rounds up, because the cost of
 *  guessing low is two captions on top of each other. */
function noteWidth(text: string): number {
  return text.length * 7.2 + 6;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function boxesOverlap(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

/** A text box as something `placeLabels` understands: a chain of circles down
 *  its spine. The labeller takes circular obstacles because everything it was
 *  written for was a disc, and a caption it cannot see is a caption a company
 *  name will land on. */
function boxObstacles(b: Box): Array<{ x: number; y: number; r: number }> {
  const r = b.h / 2;
  const out: Array<{ x: number; y: number; r: number }> = [];

  for (let x = b.x + r; x <= b.x + b.w - r + 0.01; x += r) {
    out.push({ x, y: b.y + r, r });
  }

  return out;
}

/** A round number in a tick slot.
 *
 *  `formatMoney` is the figure-slot formatter and prints everything under a
 *  thousand as "£0k" and everything from £500 to £1,400 as "£1k" — on a log
 *  value axis that starts in the hundreds that produced "£1k, £1k, £0k" down
 *  the bottom of the ladder: a repeated tick and a zero the scale cannot
 *  reach. Ticks are 1, 2 and 5 in a decade by construction, so they can be
 *  printed exactly at every size, and they are. */
function tickMoney(value: number, symbol: string): string {
  const unit = (n: number) =>
    n >= 10 ? String(Math.round(n)) : String(+n.toFixed(1));

  if (value >= 1e9) return `${symbol}${unit(value / 1e9)}bn`;
  if (value >= 1e6) return `${symbol}${unit(value / 1e6)}m`;
  if (value >= 1000) return `${symbol}${unit(value / 1000)}k`;

  return `${symbol}${Math.round(value)}`;
}

interface Tick {
  v: number;
  at: number;
  label: string;
}

/** The ticks of one axis, at the finest spacing that still reads.
 *
 *  Three candidate sets — every 1/2/5, decades only, alternate decades — and
 *  the first whose labels clear each other wins, so the axis thins in whole
 *  steps rather than dropping an arbitrary rule out of the middle. Two ticks
 *  that print the same words are one tick: the duplicate goes, whatever the
 *  formatter did. */
function axisTicks(
  values: number[],
  at: (v: number) => number,
  symbol: string,
  gap: (t: Tick) => number,
): Tick[] {
  const all: Tick[] = [];

  for (const v of values) {
    const label = tickMoney(v, symbol);

    if (all.length > 0 && all[all.length - 1].label === label) continue;
    all.push({ v, at: at(v), label });
  }

  const decades = all.filter((t) => Number.isInteger(Math.log10(t.v)));
  const fits = (set: Tick[]) =>
    set.every((t, i) => {
      if (i === 0) return true;
      const prev = set[i - 1];

      return Math.abs(t.at - prev.at) >= (gap(t) + gap(prev)) / 2;
    });

  const alternate = decades.filter(
    (_, i) => (decades.length - 1 - i) % 2 === 0,
  );

  for (const set of [all, decades, alternate]) {
    if (set.length <= 1 || fits(set)) return set;
  }

  // Nothing regular fits: keep what the axis has room for, from the left.
  const out: Tick[] = [];

  for (const t of decades) {
    const prev = out[out.length - 1];

    if (prev && Math.abs(t.at - prev.at) < (gap(t) + gap(prev)) / 2) continue;
    out.push(t);
  }

  return out;
}

function AxisNote({
  x,
  y,
  text,
  anchor = "start",
  fill = "rgba(255,255,255,0.4)",
}: {
  x: number;
  y: number;
  text: string;
  anchor?: "start" | "end";
  fill?: string;
}) {
  return (
    <text
      className={NOTE}
      fill={fill}
      fontSize={10}
      letterSpacing="0.12em"
      textAnchor={anchor}
      x={x}
      y={y}
    >
      {text}
    </text>
  );
}

/** The population layer, held apart from everything that reacts to a pointer:
 *  four hundred dots must not be rebuilt because the reader crossed a logo. */
const Population = memo(function Population({
  dots,
}: {
  dots: Array<{ id: string; x: number; y: number }>;
}) {
  return (
    <>
      <DotField dots={dots} fill={DOT_FILL} r={DOT_R} />
      {/* DotField has no stroke of its own, and a 3.5px dot on this ground
          needs an edge to stay a dot. A second hollow pass is the whole
          difference. */}
      <DotField
        dots={dots.map((d) => ({ ...d, hollow: true }))}
        fill={DOT_EDGE}
        r={DOT_R}
      />
    </>
  );
});

function StageBody({
  ctx,
  rows,
  market,
  locale,
}: {
  ctx: StageContext<Mode>;
  rows: CapRow[];
  market: CapMarket;
  locale: string;
}) {
  const { W, H, pad, active } = ctx;
  const symbol = market.symbol;

  const sc = useMemo(() => scalesFor(rows, W, H, pad), [rows, W, H, pad]);
  const named = useMemo(() => pickNamed(rows), [rows]);
  const namedKeys = useMemo(
    () => new Set(named.map((row) => row.key)),
    [named],
  );

  const dots = useMemo(() => sizeLayout(rows, sc), [rows, sc]);
  const narrow = W < 560;
  const notesShareALine =
    noteWidth(X_NOTE) + noteWidth(Y_NOTE) + 24 <= sc.plot.x1 - sc.plot.x0;

  const population = useMemo(
    () =>
      dots
        .filter((d) => !namedKeys.has(d.row.key))
        .map((d) => ({ id: d.row.key, x: d.x, y: d.y })),
    [dots, namedKeys],
  );

  const namedDots = useMemo(() => {
    const at = new Map(dots.map((d) => [d.row.key, d] as const));

    return named
      .map((row) => at.get(row.key))
      .filter((d): d is Dot => d != null);
  }, [dots, named]);

  // Ticks thin themselves to the width they have: labels that would touch are
  // a worse axis than an axis with fewer rules on it.
  const xTicks = useMemo(
    () =>
      axisTicks(
        moneyTicks(sc.capMin, sc.capMax, { decades: [1e6, 1e11] }),
        sc.x,
        symbol,
        (t) => noteWidth(t.label) + 34,
      ),
    [sc, symbol],
  );
  const yTicks = useMemo(
    () =>
      axisTicks(
        moneyTicks(sc.vMin, sc.vMax, { decades: [1e2, 1e9] }),
        sc.y,
        symbol,
        () => 30,
      ),
    [sc, symbol],
  );

  // The two thresholds, drawn only where they actually fall inside the range
  // of companies on the board.
  const rules = BANDS.filter((band) => {
    const min = band.min[market.id];

    return min > 0 && min > sc.capMin && min < sc.capMax;
  }).map((band) => ({ band, x: sc.x(band.min[market.id]) }));

  // Each band's caption sits over its own region, anchored at that region's
  // right edge. A region too narrow for the thresholds keeps the band's name,
  // because a published band the reader cannot identify is the worse fault —
  // and the rule under the caption and the size axis both say where it ends.
  const captions = useMemo(() => {
    const out: Array<{ x: number; text: string }> = [];
    let left = sc.plot.x0;

    for (const band of [...BANDS].reverse()) {
      const min = band.min[market.id];
      const max = band.max[market.id];
      const edge =
        max == null || max >= sc.capMax
          ? sc.plot.x1
          : max > sc.capMin
            ? sc.x(max)
            : null;

      if (edge == null || min >= sc.capMax) continue;
      const full = `${band.label.toLowerCase()} · ${thresholdWords(band, market.id, symbol)}`;
      const text = [full, band.label.toLowerCase()].find(
        (t) => edge - left >= noteWidth(t),
      );

      if (text) out.push({ x: edge - 6, text });
      left = edge;
    }

    return out;
  }, [sc, market.id, symbol]);

  // The share diagonals carry their labels on themselves, low down the line
  // where the population thins, rather than at the top of the plot: the band
  // captions own that strip, and two label systems in one strip is what made
  // "1% of the company" read as part of a band header. A line that can't find
  // room for its own label isn't drawn — an unexplained diagonal is furniture,
  // not scale.
  const diagonals = useMemo(() => {
    const out: Array<{
      label: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      at: Box;
    }> = [];
    // The named few are placed first and cannot move: a company's name is a
    // link to that company, and a share diagonal's caption can slide along its
    // own line. Reserve the whole span a name might take on either side of its
    // logo rather than the side the labeller happened to choose.
    const taken: Box[] = named.flatMap((row) => {
      const d = dots.find((dot) => dot.row.key === row.key);

      if (!d) return [];
      const reach = NAMED_R + 8 + labelWidth(row.name);

      return [{ x: d.x - reach, y: d.y - 36, w: reach * 2, h: 54 }];
    });

    // A phone fits one of these legibly. Three labels 130px wide in a 210px
    // plot is not a scale, it is a paragraph laid over the population.
    for (const { share, label } of narrow ? SHARES.slice(0, 1) : SHARES) {
      const c0 = Math.max(sc.capMin, sc.vMin / share);
      const c1 = Math.min(sc.capMax, sc.vMax / share);

      if (!(c1 > c0 * 1.2)) continue;
      const x1 = sc.x(c0);
      const y1 = sc.y(share * c0);
      const x2 = sc.x(c1);
      const y2 = sc.y(share * c1);
      const w = noteWidth(label);
      // Above the line and below it at each stop, and whichever of those the
      // fewest companies are sitting in wins: the population is the thing the
      // label has to share the plot with, and the emptiest patch on a line is
      // not somewhere a formula can predict.
      const at = LABEL_STOPS.flatMap((t) => {
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;

        return [
          { x: px + 8, y: py - 21, w, h: 15 },
          { x: px + 8, y: py + 6, w, h: 15 },
        ];
      })
        .filter(
          (box) =>
            box.x >= sc.plot.x0 + 4 &&
            box.x + box.w <= sc.plot.x1 - 4 &&
            box.y >= sc.plot.y0 + 6 &&
            box.y + box.h <= sc.plot.y1 - 6 &&
            !taken.some((b) => boxesOverlap(box, b)),
        )
        .map((box) => ({
          box,
          hits: dots.filter(
            (d) =>
              d.x + DOT_R > box.x &&
              d.x - DOT_R < box.x + box.w &&
              d.y + DOT_R > box.y &&
              d.y - DOT_R < box.y + box.h,
          ).length,
        }))
        .sort((a, b) => a.hits - b.hits)
        // A caption with a handful of companies written through it is worse
        // than no caption, and a line nobody can read the meaning of is worse
        // than no line: both go.
        .find((c) => c.hits <= 1)?.box;

      if (!at) continue;
      taken.push(at);
      out.push({ label, x1, y1, x2, y2, at });
    }

    return out;
  }, [sc, dots, named, narrow]);

  // Named companies are labelled from where they sit on the ladder, so the
  // label geometry does not change when the marks travel to the strip. The
  // diagonals' captions are obstacles like any dot: a company name written
  // through "0.1% of the company" costs both of them.
  const labelled = useMemo(() => {
    if (named.length === 0) return new Map<string, Side>();
    const at = new Map(dots.map((d) => [d.row.key, d] as const));
    const cands = named
      .map((row) => {
        const p = at.get(row.key);

        return p
          ? { id: row.key, x: p.x, y: p.y, r: NAMED_R, text: row.name }
          : null;
      })
      .filter((c): c is NonNullable<typeof c> => c != null);

    return placeLabels(cands, {
      obstacles: [
        ...dots.map((d) => ({ x: d.x, y: d.y, r: DOT_R })),
        ...diagonals.flatMap((d) => boxObstacles(d.at)),
        // The strip over the plot is spoken for. A name placed "above" a mark
        // near the top of the ladder would otherwise be written across the
        // axis notes, which is what it did on a phone.
        ...boxObstacles({
          x: sc.plot.x0 - 40,
          y: sc.plot.y0 - 48,
          w: W - sc.plot.x0 + 40,
          h: 46,
        }),
      ],
      xMin: pad.l,
      xMax: W - 10,
      cap: W < 520 ? 2 : W < 760 ? 3 : 5,
      width: (c) => labelWidth(c.text),
    });
  }, [named, dots, diagonals, sc, pad, W]);

  if (rows.length === 0) return null;

  return (
    <>
      <StageAxis plot={sc.plot} x={xTicks} />
      <AxisNote anchor="end" text={X_NOTE} x={sc.plot.x1} y={sc.plot.y0 - 26} />

      {/* The value axis, the share diagonals and the band captions. One
          system naming the three bands, not two: the strip that named them a
          second time is gone. */}
      <g>
        <StageAxis plot={sc.plot} y={yTicks} />
        {/* Both notes on one line where they clear each other, stacked where
            they do not — a phone has neither the width nor a second axis it
            can do without. */}
        <AxisNote
          text={Y_NOTE}
          x={sc.plot.x0}
          y={sc.plot.y0 - (notesShareALine ? 26 : 42)}
        />
        {captions.map((c) => (
          <AxisNote
            key={c.text}
            anchor="end"
            fill="rgba(255,255,255,0.45)"
            text={c.text}
            x={c.x}
            y={sc.plot.y0 - 10}
          />
        ))}
        {diagonals.map((d) => (
          <line
            key={d.label}
            stroke="rgba(255,255,255,0.10)"
            x1={d.x1}
            x2={d.x2}
            y1={d.y1}
            y2={d.y2}
          />
        ))}
      </g>

      {/* The band lines: the cuts the page argues are lines on a continuum,
          drawn through the continuum itself. */}
      {/* Three regions, two rules: the top band's caption has no line to hang
          on, so all three are drawn together below and every rule's own label
          slot is left empty rather than captioning two of them differently. */}
      {rules.map((rule) => (
        <RuleWithLabel
          key={rule.band.slug}
          label=""
          x={rule.x}
          y0={sc.plot.y0}
          y1={sc.plot.y1}
        />
      ))}

      <Population dots={population} />

      {/* The diagonals' own captions, over the population rather than under
          it: a dot drawn on top of the word is the word gone. */}
      <g>
        {diagonals.map((d) => (
          <text
            key={d.label}
            className={NOTE}
            fill="rgba(255,255,255,0.42)"
            fontSize={10}
            letterSpacing="0.12em"
            paintOrder="stroke"
            stroke="var(--stage-bg)"
            strokeLinejoin="round"
            strokeWidth={5}
            x={d.at.x}
            y={d.at.y + d.at.h - 3}
          >
            {d.label}
          </text>
        ))}
      </g>

      {/* The named few: a logo apiece, and a name while the ladder is up. */}
      {namedDots.map((d) => (
        <StageMark
          key={d.row.key}
          anchor={{ x: d.x, y: d.y, r: NAMED_R }}
          ariaLabel={`${d.row.name}, ${spend(d.row.value, symbol, locale)} bought, valued at ${formatMoney(d.row.cap, symbol)}`}
          hit={{ shape: "circle", r: NAMED_R + 8 }}
          href={companyPath(d.row.key)}
          id={d.row.key}
          x={d.x}
          y={d.y}
        >
          <LogoDisc
            active={active === d.row.key}
            clipId={`mc-${d.row.key}`}
            edge={DOT_EDGE}
            r={NAMED_R}
            ticker={d.row.key}
          />
          {labelled.has(d.row.key) ? (
            <StageLabel
              visible
              r={NAMED_R}
              side={labelled.get(d.row.key) ?? "right"}
              sub={spend(d.row.value, symbol, locale)}
              text={d.row.name}
            />
          ) : null}
        </StageMark>
      ))}
    </>
  );
}

export function MarketCapStage({
  rollup,
  market,
  locale,
  loading,
}: {
  rollup: BandRollup;
  market: CapMarket;
  locale: string;
  /** The index is in flight. The header still stands; the chart does not. */
  loading: boolean;
}) {
  const symbol = market.symbol;
  const rows = useMemo(() => toCapRows(rollup), [rollup]);
  const byKey = useMemo(
    () => new Map(rows.map((row) => [row.key, row] as const)),
    [rows],
  );
  const placed = rows.length;
  const banded = bandedCount(rollup);
  // Everything the rollup could not band: no market value on file, or a value
  // in a currency we will not convert. Exactly the two counts the exclusion
  // sentence under the stage states.
  const notPlaced = Math.max(0, rollup.total - banded);
  // A banded company with nothing on file to plot. Zero in practice, and the
  // caption says so rather than quietly losing it.
  const dropped = Math.max(0, banded - placed);

  const totalValue = rows.reduce((n, row) => n + row.value, 0);
  const totalDeals = rows.reduce((n, row) => n + row.deals, 0);
  const top = rows.reduce(
    (best, row) => (best && best.value >= row.value ? best : row),
    rows[0],
  );
  const topShare = totalValue > 0 && top ? top.value / totalValue : 0;

  const figures = useMemo(() => {
    if (placed === 0) return [];
    const midCap = median(rows.map((r) => r.cap));

    return [
      { k: "Companies placed", v: String(placed) },
      { k: "Purchases", v: String(totalDeals) },
      { k: "Value bought", v: spend(totalValue, symbol, locale) },
      ...(midCap == null
        ? []
        : [{ k: "Median size", v: spend(midCap, symbol, locale) }]),
    ];
  }, [placed, totalDeals, totalValue, rows, symbol, locale]);

  // Which band lines the picture actually carries, for the sentence that
  // describes the picture to a reader who cannot see it.
  const drawnRules = BANDS.filter((band) => {
    const min = band.min[market.id];

    return (
      min > 0 &&
      rows.some((row) => row.cap < min) &&
      rows.some((row) => row.cap >= min)
    );
  }).map((band) => bn(band.min[market.id], symbol));

  const header = (
    <>
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
        By size
      </p>
      <h1 className="mt-3 max-w-[22ch] text-balance text-[34px] font-normal leading-[1.02] tracking-[-0.03em] text-white sm:text-[46px] lg:text-[54px]">
        {market.label} insider buying by company size
      </h1>
      <p className="mt-5 max-w-[58ch] text-[15px] leading-[1.55] tracking-[-0.004em] text-white/65 sm:text-[16px]">
        The same disclosed buying, split by how big the company is. A chief
        executive putting {symbol}100,000 into a {symbol}20bn company and into a{" "}
        {symbol}50m one are not the same act, and the size of the business is
        most of the difference.
      </p>
      <StageFigures items={figures} reserve={loading} />
      <StageNotice marketId={market.id} />
    </>
  );

  return (
    <BoardStagePanel<Mode>
      caption={() => (
        <p>
          <span className="font-semibold text-white">
            {placed} of {rollup.total} companies placed by market value today
          </span>
          , one dot each
          {notPlaced > 0 ? (
            <>
              ; {notPlaced} aren’t on the ladder, with no market value on file
              or a value in another currency
            </>
          ) : null}
          .
          {dropped > 0 ? (
            <>
              {" "}
              A further {plural(dropped, "company has", "companies have")} no
              value on file to plot.
            </>
          ) : null}
          {topShare >= 0.3 && top ? (
            <>
              {" "}
              {spend(top.value, symbol, locale)} of the{" "}
              {spend(totalValue, symbol, locale)} is {top.name} alone.
            </>
          ) : null}
        </p>
      )}
      header={header}
      loading={loading}
      modes={MODES}
      pad={PAD}
      renderTip={(id) => {
        const row = byKey.get(id);

        if (!row) return null;
        const share = row.value / row.cap;

        return (
          <>
            <div className="font-semibold">
              {row.name}{" "}
              <span className="font-mono text-[10px] font-normal text-white/50">
                {row.ticker}
              </span>
            </div>
            <div className="mt-1 tabular-nums">
              {spend(row.value, symbol, locale)} bought over{" "}
              {plural(row.deals, "purchase", "purchases")}
              {row.last ? ` · last ${dateLabel(row.last, locale)}` : ""}
            </div>
            <div className="text-[11px] text-white/55">
              valued at {formatMoney(row.cap, symbol)} today ·{" "}
              {share >= 0.0001
                ? `${(share * 100).toFixed(2)}% of the company`
                : "under 0.01% of the company"}
            </div>
            {row.sector ? (
              <div className="text-[11px] text-white/55">{row.sector}</div>
            ) : null}
          </>
        );
      }}
      svgLabel={() =>
        `${placed} companies placed by market value across and value bought up${
          drawnRules.length > 0
            ? `, with the ${drawnRules.join(" and ")} band lines drawn`
            : ""
        }`
      }
    >
      {(ctx) => (
        <StageBody ctx={ctx} locale={locale} market={market} rows={rows} />
      )}
    </BoardStagePanel>
  );
}
