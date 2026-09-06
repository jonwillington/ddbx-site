/** The size ladder: every company we can place, by what it is worth and what
 *  its insiders bought.
 *
 *  The page's argument is that the three bands are lines drawn on a continuum,
 *  not three separate markets, so the stage has to show the continuum first.
 *  "By size" is the whole placed population on two log scales — market value
 *  across, value bought up — with the two band thresholds drawn as rules
 *  through it and three constant-share diagonals for scale. "By band" keeps
 *  the same size axis and lets every company fall into a strip along it, so
 *  the picture becomes one distribution with the same two rules cutting it and
 *  the bands named over their regions. Nothing is ever drawn as a share of a
 *  whole: the unplaced companies are absent from both arrangements, and a pie
 *  would quietly claim they were not.
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
import type {
  BandRollup,
  BandRow,
  IndexedCompany,
} from "../../../../shared/cap-bands";
import type { Linking } from "../board-model";
import type { StageContext, StageMode, StagePad } from "../stage-panel";
import type { Side } from "../stage-marks";

import { memo, useMemo } from "react";

import { median } from "../../../../shared/boards.js";
import {
  bandMeetsBar,
  bandPath,
  BANDS,
  MIN_COMPANIES,
} from "../../../../shared/cap-bands.js";
import { formatMoney } from "../../../../shared/sectors.js";
import { dateLabel } from "../board-model";
import { StageFigures } from "../stage-figures";
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

type Mode = "size" | "band";

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
  { id: "band", label: "By band" },
];

/** A wider left gutter than the default: the value axis prints money. */
const PAD: StagePad = { l: 64, r: 24, t: 84, b: 44 };

const DOT_R = 3.5;
const DOT_FILL = "rgba(255,255,255,0.30)";
const DOT_EDGE = "rgba(255,255,255,0.45)";
const NAMED_R = 13;

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
  const x0 = plot.x0 + 16;
  const x1 = plot.x1 - 16;
  const y0 = plot.y0 + 16;
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

/** The same companies, dropped onto one axis.
 *
 *  Binned by market value and stacked upward from a baseline, so height is
 *  density rather than a second quantity — there is no y scale in this mode
 *  and nothing is labelled as though there were. A named company takes four
 *  slots and sits at the top of its column, because a logo buried in a stack
 *  of dots is a logo nobody can click. */
function bandLayout(
  rows: CapRow[],
  sc: Scales,
  named: Set<string>,
  baseline: number,
  ceiling: number,
): Dot[] {
  const binW = Math.max(7, (sc.plot.x1 - sc.plot.x0) / 64);
  const bins = new Map<number, CapRow[]>();

  for (const row of [...rows].sort((a, b) => a.cap - b.cap)) {
    const bin = Math.round(sc.x(row.cap) / binW);
    const held = bins.get(bin);

    if (held) held.push(row);
    else bins.set(bin, [row]);
  }

  const units = (row: CapRow) => (named.has(row.key) ? 4 : 1);
  let tallest = 1;

  for (const list of bins.values()) {
    tallest = Math.max(
      tallest,
      list.reduce((n, row) => n + units(row), 0),
    );
  }

  const step = Math.min(7.5, Math.max(2, (baseline - ceiling) / tallest));
  const out: Dot[] = [];

  for (const [bin, list] of bins) {
    const ordered = [...list].sort(
      (a, b) => Number(named.has(a.key)) - Number(named.has(b.key)),
    );
    let used = 0;

    for (const row of ordered) {
      const u = units(row);

      out.push({
        row,
        x: bin * binW,
        y: baseline - (used + u / 2) * step,
      });
      used += u;
    }
  }

  return out;
}

interface Region {
  row: BandRow;
  x0: number;
  x1: number;
}

/** Where each band sits on the size axis, clipped to the companies we hold.
 *  A band whose thresholds fall outside the drawn range gets no region rather
 *  than a sliver at an edge. */
function regionsFor(
  rollup: BandRollup,
  market: "UK" | "US",
  sc: Scales,
): Region[] {
  const out: Region[] = [];

  for (const row of rollup.bands) {
    if (row.count === 0) continue;
    const lo = Math.max(row.band.min[market] || 0, sc.capMin);
    const ceiling = row.band.max[market];
    const hi = Math.min(ceiling == null ? sc.capMax : ceiling, sc.capMax);

    if (hi <= lo) continue;
    const x0 = sc.x(lo);
    const x1 = sc.x(hi);

    if (x1 - x0 < 46) continue;
    out.push({ row, x0, x1 });
  }

  return out;
}

/** The words a band header says, in the tooltip and to a screen reader
 *  alike. A band under the bar states that it is under the bar. */
function bandWords(row: BandRow, symbol: string): string {
  if (!bandMeetsBar(row)) {
    return `${row.band.plural}: too few to publish, ${plural(row.count, "company", "companies")}`;
  }
  const value =
    row.value > 0 ? `, ${formatMoney(row.value, symbol)} bought` : "";

  return `${row.band.plural}: ${plural(row.count, "company", "companies")}, ${plural(row.deals, "purchase", "purchases")}${value}`;
}

/** Roughly how wide a mono caption runs, for deciding whether it fits. Better
 *  to drop a caption than to overlap two. */
function noteWidth(text: string): number {
  return text.length * 6 + 8;
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
  rollup,
  market,
  locale,
}: {
  ctx: StageContext<Mode>;
  rows: CapRow[];
  rollup: BandRollup;
  market: CapMarket;
  locale: string;
}) {
  const { W, H, pad, mode, active } = ctx;
  const symbol = market.symbol;

  const sc = useMemo(() => scalesFor(rows, W, H, pad), [rows, W, H, pad]);
  const named = useMemo(() => pickNamed(rows), [rows]);
  const namedKeys = useMemo(
    () => new Set(named.map((row) => row.key)),
    [named],
  );

  const baseline = H - pad.b - 12;
  const headerY = Math.max(pad.t + 40, baseline - 172);

  const sizeDots = useMemo(() => sizeLayout(rows, sc), [rows, sc]);
  const bandDots = useMemo(
    () => bandLayout(rows, sc, namedKeys, baseline, headerY + 30),
    [rows, sc, namedKeys, baseline, headerY],
  );
  const dots = mode === "size" ? sizeDots : bandDots;

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

  // Named companies are labelled from where they sit on the ladder, so the
  // label geometry does not change when the marks travel to the strip.
  const labelled = useMemo(() => {
    if (named.length === 0) return new Map<string, Side>();
    const at = new Map(sizeDots.map((d) => [d.row.key, d] as const));
    const cands = named
      .map((row) => {
        const p = at.get(row.key);

        return p
          ? { id: row.key, x: p.x, y: p.y, r: NAMED_R, text: row.name }
          : null;
      })
      .filter((c): c is NonNullable<typeof c> => c != null);

    return placeLabels(cands, {
      obstacles: sizeDots.map((d) => ({ x: d.x, y: d.y, r: DOT_R })),
      xMin: pad.l,
      xMax: W - 6,
      cap: W < 520 ? 2 : W < 760 ? 3 : 5,
      width: (c) => Math.max(c.text.length * 6.6, 86) + 4,
    });
  }, [named, sizeDots, pad, W]);

  // A phone has room for a rule per decade and no more.
  const dense = W >= 700;
  const decadeOnly = (v: number) => Number.isInteger(Math.log10(v));
  const xTicks = useMemo(
    () =>
      moneyTicks(sc.capMin, sc.capMax, { decades: [1e6, 1e11] })
        .filter((v) => dense || decadeOnly(v))
        .map((v) => ({ at: sc.x(v), label: formatMoney(v, symbol) })),
    [sc, dense, symbol],
  );
  const yTicks = useMemo(
    () =>
      moneyTicks(sc.vMin, sc.vMax, { decades: [1e2, 1e9] })
        .filter((v) => dense || decadeOnly(v))
        .map((v) => ({ at: sc.y(v), label: formatMoney(v, symbol) })),
    [sc, dense, symbol],
  );

  const regions = useMemo(
    () => regionsFor(rollup, market.id, sc),
    [rollup, market.id, sc],
  );

  // The two thresholds, drawn only where they actually fall inside the range
  // of companies on the board.
  const rules = BANDS.filter((band) => {
    const min = band.min[market.id];

    return min > 0 && min > sc.capMin && min < sc.capMax;
  }).map((band) => ({ band, x: sc.x(band.min[market.id]) }));

  // Each band's caption sits over its own region, anchored at that region's
  // right edge, and is dropped rather than overlapped when there is no room.
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
      const text = `${band.label.toLowerCase()} · ${thresholdWords(band, market.id, symbol)}`;

      if (edge - left >= noteWidth(text)) out.push({ x: edge - 6, text });
      left = edge;
    }

    return out;
  }, [sc, market.id, symbol]);

  const diagonals = useMemo(
    () =>
      SHARES.map(({ share, label }) => {
        const c0 = Math.max(sc.capMin, sc.vMin / share);
        const c1 = Math.min(sc.capMax, sc.vMax / share);

        if (!(c1 > c0 * 1.2)) return null;

        return {
          label,
          x1: sc.x(c0),
          y1: sc.y(share * c0),
          x2: sc.x(c1),
          y2: sc.y(share * c1),
        };
      }).filter((d): d is NonNullable<typeof d> => d != null),
    [sc],
  );

  if (rows.length === 0) return null;

  return (
    <>
      {/* The size axis, in both arrangements: it is the one thing that does
          not move between them. */}
      <StageAxis plot={sc.plot} x={xTicks} />
      <AxisNote
        anchor="end"
        text="market value today →"
        x={sc.plot.x1}
        y={sc.plot.y0 - 26}
      />

      {/* The value axis and the share diagonals belong to the ladder only. */}
      <g
        className="transition-opacity duration-700"
        style={{ opacity: mode === "size" ? 1 : 0 }}
      >
        <StageAxis plot={sc.plot} y={yTicks} />
        <AxisNote text="value bought ↑" x={sc.plot.x0} y={sc.plot.y0 - 26} />
        {diagonals.map((d) => (
          <g key={d.label}>
            <line
              stroke="rgba(255,255,255,0.10)"
              x1={d.x1}
              x2={d.x2}
              y1={d.y1}
              y2={d.y2}
            />
            <text
              className="font-mono"
              fill="rgba(255,255,255,0.35)"
              fontSize={10}
              paintOrder="stroke"
              stroke="var(--stage-bg)"
              strokeLinejoin="round"
              strokeWidth={4}
              textAnchor="end"
              x={d.x2 - 4}
              y={d.y2 - 6}
            >
              {d.label}
            </text>
          </g>
        ))}
      </g>

      {/* The band lines. They cut both arrangements, which is the argument:
          the same continuum, the same two cuts. */}
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

      <Population dots={population} />

      {/* The band headers, over the regions, once the companies have gathered
          under them. */}
      <g
        className="transition-opacity duration-500"
        style={{
          opacity: mode === "band" ? 1 : 0,
          pointerEvents: mode === "band" ? undefined : "none",
        }}
      >
        {regions.map((region) => {
          const width = Math.min(region.x1 - region.x0 - 8, 280);
          const cx = (region.x0 + region.x1) / 2;
          const ok = bandMeetsBar(region.row);
          const title =
            width >= 150 ? region.row.band.plural : region.row.band.label;
          const counts = plural(region.row.count, "company", "companies");
          const meta = !ok
            ? `too few to publish · ${region.row.count}`
            : width >= 210 && region.row.value > 0
              ? `${counts} · ${plural(region.row.deals, "purchase", "purchases")} · ${formatMoney(region.row.value, symbol)}`
              : width >= 150 && region.row.value > 0
                ? `${counts} · ${formatMoney(region.row.value, symbol)}`
                : counts;

          return (
            <StageMark
              key={region.row.band.slug}
              anchor={{ x: cx, y: headerY, r: width / 2 }}
              ariaLabel={bandWords(region.row, symbol)}
              hit={{ shape: "rect", x: -width / 2, y: -28, w: width, h: 54 }}
              href={ok ? bandPath(region.row.band.slug) : undefined}
              id={region.row.band.slug}
              move={false}
              x={cx}
              y={headerY}
            >
              <text
                fill={ok ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.35)"}
                fontSize={15}
                fontWeight={500}
                paintOrder="stroke"
                stroke="var(--stage-bg)"
                strokeLinejoin="round"
                strokeWidth={4}
                textAnchor="middle"
              >
                {title}
              </text>
              <text
                className="font-mono"
                fill={ok ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.35)"}
                fontSize={11}
                paintOrder="stroke"
                stroke="var(--stage-bg)"
                strokeLinejoin="round"
                strokeWidth={4}
                textAnchor="middle"
                y={18}
              >
                {meta}
              </text>
            </StageMark>
          );
        })}
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
              r={NAMED_R}
              side={labelled.get(d.row.key) ?? "right"}
              sub={spend(d.row.value, symbol, locale)}
              text={d.row.name}
              visible={mode === "size"}
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
  linking,
}: {
  rollup: BandRollup;
  market: CapMarket;
  locale: string;
  /** The index is in flight. The header still stands; the chart does not. */
  loading: boolean;
  /** Hovering a band header tints that band's card below. */
  linking: Linking;
}) {
  const symbol = market.symbol;
  const rows = useMemo(() => toCapRows(rollup), [rollup]);
  const byKey = useMemo(
    () => new Map(rows.map((row) => [row.key, row] as const)),
    [rows],
  );
  const bySlug = useMemo(
    () => new Map(rollup.bands.map((row) => [row.band.slug, row] as const)),
    [rollup],
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
    </>
  );

  const small = bySlug.get("small");
  const large = bySlug.get("large");
  const belowBar = rollup.bands.filter(
    (row) => row.count > 0 && !bandMeetsBar(row),
  );

  return (
    <BoardStagePanel<Mode>
      caption={(ctx) =>
        ctx.mode === "size" ? (
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
                {formatMoney(top.value, symbol)} of the{" "}
                {formatMoney(totalValue, symbol)} is {top.name} alone.
              </>
            ) : null}{" "}
            <button
              className="text-white/80 underline decoration-white/30 underline-offset-4 hover:text-white"
              type="button"
              onClick={() => ctx.choose("band")}
            >
              See them by band →
            </button>
          </p>
        ) : small && large ? (
          <p>
            <span className="font-semibold text-white">
              {small.count} of the {placed} are small-caps
            </span>
            , with {formatMoney(small.value, symbol)} of the{" "}
            {formatMoney(totalValue, symbol)} bought; {large.count} large-caps
            account for {formatMoney(large.value, symbol)}.
            {belowBar.map((row) => (
              <span key={row.band.slug}>
                {" "}
                {row.band.label} has {row.count}, below the {MIN_COMPANIES} we
                publish a page from.
              </span>
            ))}
          </p>
        ) : null
      }
      header={header}
      linking={linking}
      loading={loading}
      modes={MODES}
      pad={PAD}
      renderTip={(id) => {
        const band = bySlug.get(id);

        if (band)
          return <div className="font-semibold">{bandWords(band, symbol)}</div>;
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
      svgLabel={(mode) =>
        mode === "size"
          ? `${placed} companies placed by market value across and value bought up${
              drawnRules.length > 0
                ? `, with the ${drawnRules.join(" and ")} band lines drawn`
                : ""
            }`
          : "The same companies gathered along the size axis into the three bands"
      }
    >
      {(ctx) => (
        <StageBody
          ctx={ctx}
          locale={locale}
          market={market}
          rollup={rollup}
          rows={rows}
        />
      )}
    </BoardStagePanel>
  );
}
