/** The field and the board: /best-performing-buys' proof object.
 *
 *  A board of 25 ranked on alpha invites one question it cannot normally
 *  answer — "and the ones you left out?" — so this draws them. Every eligible
 *  purchase with a performance mark is on the picture: the 25 as logo discs,
 *  the rest of the field as a dot each, and, once the second arrangement
 *  arrives, the purchases the £50,000 floor holds back as fainter dots again.
 *  Field dots plus board discs is the number the page states as its
 *  denominator, which is the point: the reader can see the board being picked.
 *
 *  Alpha is the vertical axis in BOTH arrangements, on one linear scale
 *  spanning the whole field, so the level line is always on the picture and
 *  the board sits visibly in its tail. Only the horizontal changes — rank in
 *  the first, amount spent in the second — so every mark travels sideways and
 *  can be followed across.
 *
 *  Two things this deliberately does not draw. Disc area encodes nothing: the
 *  board's purchases span 71x on the UK feed and 2,111x on the US one, and a
 *  ranking on alpha that sized its marks by money would be ranking one thing
 *  and picturing another. And no statistic is ever taken over the 25 — how
 *  many of a set selected for beating the market beat the market is not a
 *  finding. The band labels count the whole field, and they arrive here as
 *  words the page computed, not as anything the axis worked out.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";
import type { BoardRow, Linking } from "../board-model";
import type { StageContext, StageMode, StagePad } from "../stage-panel";
import type { ReactNode } from "react";

import { useMemo } from "react";

import {
  hasBoardMark,
  MIN_BOARD_VALUE,
  TOP_N,
} from "../../../../shared/boards.js";
import {
  buyAlpha,
  buyValue,
  moneyPair,
} from "../../../../shared/leaderboard.js";
import { formatMoney } from "../../../../shared/sectors.js";
import { filingPath } from "../../../../shared/filings.js";
import { dateLabel, direction, signedPp } from "../board-model";
import { BoardStagePanel } from "../stage-panel";
import {
  alphaTicks,
  DotField,
  exactMoney,
  LogoDisc,
  moneyTicks,
  placeLabels,
  RuleWithLabel,
  SignedAxis,
  StageLabel,
  StageMark,
  stageTone,
} from "../stage-marks";

import { cleanCompanyName, companyPath, displayTicker } from "@/lib/company";

type Mode = "alpha" | "amount";

const MODES: ReadonlyArray<StageMode<Mode>> = [
  { id: "alpha", label: "By alpha" },
  { id: "amount", label: "By amount" },
];

/** A wider left gutter than the default: the alpha ticks run to three digits
 *  and a sign on a field that reaches +119pp. */
const PAD: StagePad = { l: 64, r: 24, t: 68, b: 52 };

/** The field rail takes the left third in the first arrangement; the board
 *  gets the rest. */
const RAIL_FRACTION = 0.3;

/** One eligible marked purchase that is not on the board. No name, no link and
 *  no tooltip: there is nothing to say about one dot in a dune of 258, and 258
 *  hit targets would make the 25 that matter harder to reach. */
interface FieldPoint {
  id: string;
  value: number;
  alpha: number;
}

/** A marked purchase below the floor. Exactly one of these is ever named. */
interface GhostPoint extends FieldPoint {
  ticker: string;
  company: string;
  filingId: string | null;
}

interface Placed {
  row: BoardRow;
  x: number;
  y: number;
  r: number;
}

/** Under a hundred thousand the rounded form is wrong rather than coarse:
 *  formatMoney prints £9,100 as "£9k", £1,958 as "£2k" and the £10 end of this
 *  page's axis as "£0k" — a zero standing where a real number is. */
function moneyLabel(v: number, symbol: string, locale: string): string {
  return v < 100_000 ? exactMoney(v, symbol, locale) : formatMoney(v, symbol);
}

/** Money ticks thinned to what the axis can letter. The domain runs from a
 *  £10.90 purchase to a £4.8m one, which is seven decades of 1-2-5 ticks and
 *  far more labels than a phone has room for; drop to decades, then to every
 *  other decade, rather than letting them collide. */
function thinTicks(values: number[], max: number): number[] {
  if (values.length <= max) return values;
  const decades = values.filter(
    (v) => Math.abs(Math.log10(v) - Math.round(Math.log10(v))) < 1e-9,
  );

  if (decades.length <= max) return decades;
  const step = Math.ceil(decades.length / max);

  return decades.filter((_, i) => i % step === 0);
}

/** The three layers, out of the one fetch the page already makes.
 *
 *  `hasBoardMark` is the board's eligibility test WITHOUT its floor, which is
 *  why shared/boards.js exports it separately: this stage has to ask which
 *  purchases carry a mark before it asks which of them clear £50,000, because
 *  the ones that don't are a layer it draws rather than a set it discards. */
function splitField(
  dealings: Array<Dealing | UsDealing>,
  board: BoardRow[],
  market: "UK" | "US",
): { field: FieldPoint[]; ghosts: GhostPoint[] } {
  const onBoard = new Set(board.map((r) => r.raw));
  const field: FieldPoint[] = [];
  const ghosts: GhostPoint[] = [];

  dealings.forEach((d, i) => {
    if (!hasBoardMark(d, market)) return;
    const alpha = buyAlpha(d);

    if (alpha == null) return;
    const value = buyValue(d);
    const key = d.id ?? `${d.ticker ?? ""}-${i}`;

    if (value < MIN_BOARD_VALUE) {
      ghosts.push({
        id: `gh-${key}`,
        value,
        alpha,
        ticker: d.ticker ?? "",
        company: cleanCompanyName(d.company ?? "") || (d.ticker ?? ""),
        filingId: d.id ?? null,
      });

      return;
    }
    if (onBoard.has(d)) return;
    field.push({ id: `fd-${key}`, value, alpha });
  });

  return { field, ghosts };
}

/** The alphas of every eligible marked purchase that clears the floor — the
 *  board's own denominator, and the population every figure on this page is
 *  taken over.
 *
 *  Exported because the number is stated twice: as a figure beside the object
 *  ("median of all 283") and in the stage's own caption and band labels. It is
 *  computed once, by the page, and handed down; two computations of the same
 *  statistic are two chances to print different ones. The predicate is
 *  `rankByAlpha`'s eligibility test, so `.length` is exactly the `considered`
 *  that module reports. */
export function eligibleAlphas(
  dealings: Array<Dealing | UsDealing>,
  market: "UK" | "US",
): number[] {
  const out: number[] = [];

  for (const d of dealings) {
    if (!hasBoardMark(d, market)) continue;
    if (buyValue(d) < MIN_BOARD_VALUE) continue;
    const a = buyAlpha(d);

    if (a != null) out.push(a);
  }

  return out;
}

interface Scales {
  /** Amount spent, log. */
  x: (v: number) => number;
  /** Alpha, linear, and the same in both arrangements. */
  y: (a: number) => number;
  /** Rank position, first arrangement: rank 1 leftmost. */
  rankX: (i: number, n: number) => number;
  vmin: number;
  vmax: number;
  amin: number;
  amax: number;
  plot: { x0: number; x1: number; y0: number; y1: number };
  railRight: number;
  railCx: number;
  railHalf: number;
}

function buildScales(
  rows: BoardRow[],
  field: FieldPoint[],
  ghosts: GhostPoint[],
  namedGhost: GhostPoint | null,
  W: number,
  H: number,
  pad: StagePad,
): Scales {
  const plot = { x0: pad.l, x1: W - pad.r, y0: pad.t, y1: H - pad.b };
  // Zero is always in the domain, so the level line is always on the picture.
  // The named ghost is in it too, because it is the one sub-floor purchase the
  // stage points at by name and a label has to sit where its number says.
  const alphas = [
    0,
    ...field.map((f) => f.alpha),
    ...rows.map((r) => r.alpha ?? 0),
    ...(namedGhost ? [namedGhost.alpha] : []),
  ];
  const lo = Math.min(...alphas);
  const hi = Math.max(...alphas);
  const span = Math.max(hi - lo, 0.04);
  const amin = lo - span * 0.08;
  const amax = hi + span * 0.08;

  const values = [
    ...field.map((f) => f.value),
    ...rows.map((r) => r.value),
    ...ghosts.map((g) => g.value),
  ];
  const vmin = Math.max(1, Math.min(...values) * 0.82);
  const vmax = Math.max(Math.max(...values) * 1.25, vmin * 4);
  const lspan = Math.log(vmax) - Math.log(vmin);

  const railRight = plot.x0 + (plot.x1 - plot.x0) * RAIL_FRACTION;
  const railCx = (plot.x0 + railRight) / 2;
  const gap = W < 520 ? 16 : 34;
  const rankFrom = railRight + gap;
  const rankTo = plot.x1 - 8;

  return {
    x: (v) =>
      plot.x0 +
      ((Math.log(Math.max(v, vmin)) - Math.log(vmin)) / lspan) *
        (plot.x1 - plot.x0),
    y: (a) => plot.y0 + ((amax - a) / (amax - amin)) * (plot.y1 - plot.y0),
    rankX: (i, n) =>
      n > 1 ? rankFrom + (i * (rankTo - rankFrom)) / (n - 1) : rankFrom,
    vmin,
    vmax,
    amin,
    amax,
    plot,
    railRight,
    railCx,
    railHalf: Math.max(8, (railRight - plot.x0) / 2 - 6),
  };
}

/** The field as a dune around the rail's centre line: bin the alpha, then step
 *  alternately either side of centre. Deterministic — same data, same picture,
 *  no jitter — so the shape is the distribution rather than a texture. */
function swarm(
  field: FieldPoint[],
  sc: Scales,
): Array<{ id: string; x: number; y: number }> {
  const perBin = new Map<number, number>();

  return [...field]
    .sort((a, b) => b.alpha - a.alpha || a.id.localeCompare(b.id))
    .map((f) => {
      const bin = Math.round(f.alpha / 0.02);
      const k = perBin.get(bin) ?? 0;

      perBin.set(bin, k + 1);
      const off = Math.ceil(k / 2) * 3.2 * (k % 2 === 1 ? 1 : -1);

      return {
        id: f.id,
        x: sc.railCx + Math.max(-sc.railHalf, Math.min(sc.railHalf, off)),
        y: sc.y(f.alpha),
      };
    });
}

/** The board's 25, at their rank or their amount, eased apart where two sit on
 *  near-identical alphas. The clamp is the guarantee: a disc never travels far
 *  enough from its true position for the axis under it to become a lie. */
function boardLayout(
  rows: BoardRow[],
  mode: Mode,
  sc: Scales,
  r: number,
): Placed[] {
  const target = rows.map((row, i) => ({
    tx: mode === "alpha" ? sc.rankX(i, rows.length) : sc.x(row.value),
    ty: sc.y(row.alpha ?? 0),
  }));
  const pts: Placed[] = rows.map((row, i) => ({
    row,
    x: target[i].tx,
    y: target[i].ty,
    r,
  }));

  for (let it = 0; it < 30; it++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i];
        const b = pts[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        const min = a.r + b.r + 2;

        if (d >= min) continue;
        if (d < 0.01) {
          dx = 1;
          dy = 0;
          d = 1;
        }
        const push = (min - d) / 2;

        a.x -= (dx / d) * push;
        a.y -= (dy / d) * push;
        b.x += (dx / d) * push;
        b.y += (dy / d) * push;
      }
    }
  }
  pts.forEach((p, i) => {
    p.x = Math.max(target[i].tx - 12, Math.min(target[i].tx + 12, p.x));
    p.y = Math.max(target[i].ty - 8, Math.min(target[i].ty + 8, p.y));
  });

  return pts;
}

function Body({
  ctx,
  rows,
  field,
  ghosts,
  namedGhost,
  bandLabels,
  cutoffAlpha,
  marketId,
  symbol,
  locale,
  benchmark,
}: {
  ctx: StageContext<Mode>;
  rows: BoardRow[];
  field: FieldPoint[];
  ghosts: GhostPoint[];
  namedGhost: GhostPoint | null;
  bandLabels: { pos: string; posShort: string; neg: string };
  cutoffAlpha: number | null;
  marketId: "UK" | "US";
  symbol: string;
  locale: string;
  benchmark: string;
}) {
  const { W, H, pad, mode, active } = ctx;
  const amount = mode === "amount";
  const wide = W >= 520;
  const discR = wide ? 13 : 9;

  const sc = useMemo(
    () => buildScales(rows, field, ghosts, namedGhost, W, H, pad),
    [rows, field, ghosts, namedGhost, W, H, pad],
  );
  const layout = useMemo(
    () => boardLayout(rows, mode, sc, discR),
    [rows, mode, sc, discR],
  );
  const dune = useMemo(() => swarm(field, sc), [field, sc]);
  const fieldDots = useMemo(
    () =>
      amount
        ? field.map((f) => ({ id: f.id, x: sc.x(f.value), y: sc.y(f.alpha) }))
        : dune,
    [amount, field, dune, sc],
  );
  // Sub-floor purchases keep their amount position in both arrangements —
  // they only exist in the second one — and their alpha is clamped into the
  // plot, because a token buy in a microcap swings further than the field's
  // scale is drawn for.
  const ghostDots = useMemo(
    () =>
      ghosts.map((g) => ({
        id: g.id,
        x: sc.x(g.value),
        y: Math.max(sc.plot.y0 + 2, Math.min(sc.plot.y1 - 2, sc.y(g.alpha))),
      })),
    [ghosts, sc],
  );

  const worst = useMemo(
    () =>
      field.reduce<FieldPoint | null>(
        (low, f) => (low == null || f.alpha < low.alpha ? f : low),
        null,
      ),
    [field],
  );
  const worstDot = useMemo(
    () => (worst ? (fieldDots.find((d) => d.id === worst.id) ?? null) : null),
    [worst, fieldDots],
  );

  const ghostAt = useMemo(
    () =>
      namedGhost
        ? { x: sc.x(namedGhost.value), y: sc.y(namedGhost.alpha) }
        : null,
    [namedGhost, sc],
  );

  // Named marks: the top three, the one named sub-floor purchase and the
  // field's worst — the ends of what the page is claiming. Every one of them
  // goes through the same placement, the ghost included: it was the label
  // drawn outside it that ended up written across the board's own names.
  // One label per company, and none placed at all where it would land on a
  // disc, on the ghost's ring, or on another label.
  const named = useMemo(() => {
    const placedById = new Map(layout.map((p) => [p.row.id, p] as const));
    const cands = rows
      .slice(0, 3)
      .map((r) => {
        const p = placedById.get(r.id);

        return p
          ? {
              id: r.id,
              key: r.ticker,
              x: p.x,
              y: p.y,
              r: p.r,
              text: r.company,
              sub: signedPp(r.alpha),
            }
          : null;
      })
      .filter((c): c is NonNullable<typeof c> => c != null);

    if (amount && namedGhost && ghostAt) {
      cands.push({
        id: namedGhost.id,
        key: namedGhost.id,
        x: ghostAt.x,
        y: ghostAt.y,
        r: 6,
        text: displayTicker(namedGhost.ticker),
        sub: `${exactMoney(namedGhost.value, symbol, locale)} · ${signedPp(namedGhost.alpha)}`,
      });
    }
    if (worst && worstDot) {
      cands.push({
        id: "field-worst",
        key: "field-worst",
        x: worstDot.x,
        y: worstDot.y,
        r: 3,
        text: "the worst eligible purchase",
        sub: signedPp(worst.alpha),
      });
    }

    return placeLabels(cands, {
      obstacles: amount && ghostAt ? [...layout, { ...ghostAt, r: 9 }] : layout,
      xMin: pad.l,
      xMax: W - 6,
      cap: wide ? 5 : 2,
      // No "above" on a phone: the highest mark on this stage sits a few
      // pixels under the plot's top edge, and a label stacked over it lands
      // in the axis captions rather than on the picture.
      sides: wide ? undefined : ["right", "left"],
      // Both lines, not just the name: a three-letter ticker under a figure
      // like "£3,007 · +121.0pp" is a wide label, and measuring only the name
      // is how one came to be drawn over the company beside it. Measuring
      // both also retires the old 86px floor, which was the estimate standing
      // in for the figure and which made a short name too wide to place at
      // the right-hand end of a phone.
      width: (c) =>
        Math.max(c.text.length * 6.7, (c.sub?.length ?? 0) * 6.2) + 6,
    });
  }, [
    rows,
    layout,
    worst,
    worstDot,
    amount,
    namedGhost,
    ghostAt,
    symbol,
    locale,
    wide,
    W,
    pad,
  ]);

  const floorX = sc.x(MIN_BOARD_VALUE);
  const cutoffY = cutoffAlpha == null ? null : sc.y(cutoffAlpha);
  const worstSide = named.get("field-worst");
  const ghostSide = namedGhost ? named.get(namedGhost.id) : undefined;

  // The floor's caption sits above the plot, not inside it: at the wall's own
  // x it is in the middle of the board, and the discs are drawn after it and
  // paint their backing rings straight over it. Above the plot there are two
  // occupied places — the band label at the left, the cross label at the
  // right — so the caption takes whichever side of its rule clears them, and
  // steps up a line rather than run into the band label.
  //
  // Widths are estimated in characters because the text is monospaced: 7.2px
  // is the 10px cell plus the 0.12em tracking these captions carry, measured
  // off the rendered panel.
  const CH = 7.2;
  const posLabel = wide ? bandLabels.pos : bandLabels.posShort;
  const crossLabel = amount ? "amount spent →" : `ranked 1 → ${rows.length}`;
  // One line rather than the component's stacked pair: `sublabel` is drawn
  // ABOVE `label`, which would put "nothing below it ranks" over the thing it
  // is about.
  const floorCaption = `${exactMoney(MIN_BOARD_VALUE, symbol, locale)} floor${
    wide ? " · nothing below it ranks" : ""
  }`;
  const floorCapW = floorCaption.length * CH;
  const floorAnchor =
    floorX + 6 + floorCapW <= sc.plot.x1 - crossLabel.length * CH - 12
      ? "start"
      : ("end" as const);
  const floorFrom =
    floorAnchor === "start" ? floorX + 6 : floorX - 6 - floorCapW;
  // 48px of clearance, not the 1px that "does not overlap" would allow: two
  // captions on one line a hair apart read as one sentence.
  const floorRaise =
    floorFrom < sc.plot.x0 + posLabel.length * CH + 48 ? 14 : 0;

  return (
    <>
      {/* The bands are collapsed to nothing and replaced by the two hairlines
          below, in both arrangements. A tint over half the plot is a field,
          and the design language asks for the colour to be contained: here it
          is the dots, the disc rings, the level line and the two labels that
          carry the sides. /sectors retired its bands the same way. */}
      <SignedAxis
        bands={{ from: sc.plot.x0, to: sc.plot.x0 }}
        crossLabel={crossLabel}
        crossTicks={
          amount
            ? thinTicks(
                moneyTicks(sc.vmin, sc.vmax),
                Math.max(3, Math.floor((sc.plot.x1 - sc.plot.x0) / 78)),
              ).map((v) => ({
                at: sc.x(v),
                label: moneyLabel(v, symbol, locale),
              }))
            : undefined
        }
        labelGutter={pad.l - 10}
        negLabel={bandLabels.neg}
        plot={sc.plot}
        posLabel={posLabel}
        scale={sc.y}
        ticks={alphaTicks(sc.amin, sc.amax)}
      />

      {/* One hairline under each band label, the width of the side it names.
          Alpha is the vertical axis here, so both sides are the full width of
          the plot: the ahead line rides the top of the picture and the behind
          line its floor, with the level line between them. */}
      <rect
        fill="var(--stage-pos)"
        fillOpacity={0.55}
        height={2}
        width={Math.max(0, sc.plot.x1 - sc.plot.x0)}
        x={sc.plot.x0}
        y={sc.plot.y0 - 6}
      />
      <rect
        fill="var(--stage-neg)"
        fillOpacity={0.55}
        height={2}
        width={Math.max(0, sc.plot.x1 - sc.plot.x0)}
        x={sc.plot.x0}
        y={sc.plot.y1 - 4}
      />

      {/* The floor, and where the board's last place sits. Faded rather than
          mounted, so the marks travel over it as it arrives. */}
      <g
        className="transition-opacity duration-700"
        style={{ opacity: amount ? 1 : 0 }}
      >
        <rect
          fill="rgba(255,255,255,0.04)"
          height={sc.plot.y1 - sc.plot.y0}
          width={Math.max(0, floorX - sc.plot.x0)}
          x={sc.plot.x0}
          y={sc.plot.y0}
        />
        <RuleWithLabel
          anchor={floorAnchor}
          label={floorCaption}
          x={floorX}
          y0={sc.plot.y0 - floorRaise}
          y1={sc.plot.y1}
        />
        {cutoffY == null ? null : (
          <>
            <line
              stroke="rgba(255,255,255,0.28)"
              strokeDasharray="3 4"
              x1={sc.plot.x0}
              x2={sc.plot.x1}
              y1={cutoffY}
              y2={cutoffY}
            />
            {/* At the left end of its rule, where the board is not: the
                board's own discs sit at the right of this arrangement and
                are drawn after this line, so a caption over there is painted
                out by their backing rings. */}
            <text
              className="font-mono uppercase"
              fill="rgba(255,255,255,0.45)"
              fontSize={10}
              letterSpacing="0.12em"
              paintOrder="stroke"
              stroke="var(--stage-bg)"
              strokeLinejoin="round"
              strokeWidth={4}
              textAnchor="start"
              x={sc.plot.x0 + 4}
              y={cutoffY - 7}
            >
              {/* The figure only where the caption has room for it: on a
                  phone the board's own discs reach this far left, and a
                  number half-covered by a logo is worse than no number. */}
              board starts here{wide ? ` · ${signedPp(cutoffAlpha)}` : ""}
            </text>
          </>
        )}
      </g>

      {/* Held back by the floor. Present only in the second arrangement, where
          the wall they sit behind is drawn. */}
      <g
        className="transition-opacity duration-500"
        style={{ opacity: amount ? 1 : 0 }}
      >
        <DotField
          dots={ghostDots}
          fill="rgba(255,255,255,0.22)"
          move={false}
          r={1.6}
        />
      </g>

      {/* The field the board was picked from. */}
      <DotField dots={fieldDots} fill="rgba(255,255,255,0.45)" r={1.8} />

      {worst && worstDot && worstSide ? (
        <g
          className="board-stage-move"
          style={{
            transform: `translate(${worstDot.x}px, ${worstDot.y}px)`,
            transition: "transform 900ms cubic-bezier(.2,.8,.2,1)",
          }}
        >
          <StageLabel
            r={3}
            side={worstSide}
            sub={signedPp(worst.alpha)}
            text="the worst eligible purchase"
          />
        </g>
      ) : null}

      <g>
        {layout.map((p) => {
          const href =
            marketId === "UK"
              ? p.row.raw.id
                ? filingPath(p.row.raw.id)
                : undefined
              : companyPath(p.row.ticker);
          const side = named.get(p.row.id);

          return (
            <StageMark
              key={p.row.id}
              anchor={{ x: p.x, y: p.y, r: p.r }}
              ariaLabel={`${p.row.company}, ${signedPp(p.row.alpha)} vs ${benchmark}, ${formatMoney(p.row.value, symbol)}`}
              hit={{ shape: "circle", r: p.r + 8 }}
              href={href}
              id={p.row.id}
              x={p.x}
              y={p.y}
            >
              <LogoDisc
                active={active === p.row.id}
                clipId={`bp-${p.row.id}`}
                edge={stageTone(p.row.dir)}
                r={p.r}
                ticker={p.row.ticker}
              />
              {side ? (
                <StageLabel
                  r={p.r}
                  side={side}
                  sub={signedPp(p.row.alpha)}
                  text={p.row.company}
                />
              ) : null}
            </StageMark>
          );
        })}
      </g>

      {/* The one named ghost: the best purchase the floor holds back. */}
      {namedGhost ? (
        // `visibility` as well as opacity: an invisible mark that is still in
        // the tab order hands a keyboard reader a link to a purchase the
        // picture is not currently making a claim about.
        <g
          style={{
            opacity: amount ? 1 : 0,
            visibility: amount ? "visible" : "hidden",
            transition: "opacity 500ms, visibility 500ms",
          }}
        >
          <StageMark
            ariaLabel={`${namedGhost.company}, ${signedPp(namedGhost.alpha)} vs ${benchmark}, ${exactMoney(namedGhost.value, symbol, locale)}, below the floor`}
            hit={{ shape: "circle", r: 14 }}
            href={
              namedGhost.filingId ? filingPath(namedGhost.filingId) : undefined
            }
            id={namedGhost.id}
            move={false}
            x={sc.x(namedGhost.value)}
            y={sc.y(namedGhost.alpha)}
          >
            <circle
              fill="none"
              r={6}
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={1.5}
            />
            {ghostSide ? (
              <StageLabel
                r={6}
                side={ghostSide}
                sub={`${exactMoney(namedGhost.value, symbol, locale)} · ${signedPp(namedGhost.alpha)}`}
                text={displayTicker(namedGhost.ticker)}
              />
            ) : null}
          </StageMark>
        </g>
      ) : null}
    </>
  );
}

export function BestPerformingStage({
  board,
  dealings,
  considered,
  fieldAlphas,
  fieldMedian,
  complete,
  marketId,
  symbol,
  locale,
  benchmark,
  header,
  linking,
}: {
  /** The ranked board. Null while the window is in flight. */
  board: BoardRow[] | null;
  /** The whole fetched window, which the field and the ghosts come out of. */
  dealings: Array<Dealing | UsDealing> | null;
  /** Eligible purchases with a mark that clear the floor — the board's own
   *  denominator, computed by the same module that ranks it. */
  considered: number;
  /** Those purchases' alphas, from `eligibleAlphas`, and their median. Both
   *  arrive from the page rather than being worked out here: the page states
   *  the median as a figure, this object letters the counts under the same
   *  claim, and the two have to be the same arithmetic. `fieldMedian` is null
   *  when the window is truncated, where a median of a partial field is a
   *  number about the fetch rather than about the market. */
  fieldAlphas: number[];
  fieldMedian: number | null;
  /** False when the window is truncated, in which case every population count
   *  on this stage is a floor rather than a total. */
  complete: boolean;
  marketId: "UK" | "US";
  symbol: string;
  locale: string;
  /** "the FTSE All-Share" / "the S&P 500". */
  benchmark: string;
  /** Eyebrow, h1, standfirst and figures, set inside the object. */
  header: ReactNode;
  linking: Linking;
}) {
  const rows = board && board.length ? board : null;

  const { field, ghosts } = useMemo(
    () => splitField(dealings ?? [], rows ?? [], marketId),
    [dealings, rows, marketId],
  );

  const namedGhost = useMemo(
    () =>
      ghosts.reduce<GhostPoint | null>(
        (best, g) => (best == null || g.alpha > best.alpha ? g : best),
        null,
      ),
    [ghosts],
  );

  // Every figure below counts the WHOLE field, the board included. A statistic
  // taken over the 25 would be a statistic about a set selected for the thing
  // it measures.
  const tally = useMemo(() => {
    let pos = 0;
    let neg = 0;

    for (const a of fieldAlphas) {
      const dir = direction(a);

      if (dir === "pos") pos += 1;
      if (dir === "neg") neg += 1;
    }

    return { pos, neg };
  }, [fieldAlphas]);

  const cutoffAlpha = rows ? (rows[rows.length - 1].alpha ?? null) : null;
  const full = rows != null && rows.length >= TOP_N;
  const heldBack = full
    ? ghosts.filter((g) => cutoffAlpha != null && g.alpha > cutoffAlpha).length
    : ghosts.length;
  const maxValue = rows ? Math.max(...rows.map((r) => r.value)) : 0;
  const bestCost = rows ? rows[0].value : 0;
  const floorLabel = exactMoney(MIN_BOARD_VALUE, symbol, locale);
  const denominator = complete ? String(considered) : `at least ${considered}`;

  const bandLabels = {
    pos: complete
      ? `${tally.pos} of ${considered} eligible ahead`
      : `at least ${tally.pos} eligible ahead`,
    // The same claim on a phone, where the full one runs into the cross
    // label. "Eligible" is the word that goes: the caption under the picture
    // still says which purchases these are, and the counts stay whole.
    posShort: complete
      ? `${tally.pos} of ${considered} ahead`
      : `at least ${tally.pos} ahead`,
    neg: complete
      ? `${tally.neg} of ${considered} behind`
      : `at least ${tally.neg} behind`,
  };

  const byId = useMemo(
    () => new Map((rows ?? []).map((r) => [r.id, r] as const)),
    [rows],
  );

  return (
    <BoardStagePanel<Mode>
      caption={(ctx) =>
        rows == null ? null : ctx.mode === "alpha" ? (
          <p>
            <span className="font-semibold text-white">
              The {rows.length} best of {denominator} eligible purchases.
            </span>{" "}
            {fieldMedian != null ? (
              <>
                The median of all {considered} is {signedPp(fieldMedian)}
                {full && cutoffAlpha != null
                  ? `; the board starts at ${signedPp(cutoffAlpha)}`
                  : ""}
                .{" "}
              </>
            ) : full && cutoffAlpha != null ? (
              <>The board starts at {signedPp(cutoffAlpha)}. </>
            ) : null}
            <button
              className="text-white/80 underline decoration-white/30 underline-offset-4 hover:text-white"
              type="button"
              onClick={() => ctx.choose("amount")}
            >
              See what they cost →
            </button>
          </p>
        ) : namedGhost && heldBack === 0 ? (
          // A real zero, and a different statement from an empty set: there
          // are purchases below the floor, and every one of them did worse
          // than the board's last place. "Holds back 0" would say neither.
          <p>
            <span className="font-semibold text-white">
              The {floorLabel} floor changes nothing on today’s board
            </span>
            . The {ghosts.length} purchases below it all did worse than its last
            place, the best of them{" "}
            {moneyLabel(namedGhost.value, symbol, locale)} for{" "}
            {signedPp(namedGhost.alpha)}. The board’s largest purchase is{" "}
            {formatMoney(maxValue, symbol)}; its best cost{" "}
            {moneyLabel(bestCost, symbol, locale)}.
          </p>
        ) : namedGhost ? (
          <p>
            <span className="font-semibold text-white">
              The {floorLabel} floor holds back{" "}
              {complete ? heldBack : `at least ${heldBack}`} purchases that
              would otherwise rank here
            </span>
            , the best of them {moneyLabel(namedGhost.value, symbol, locale)}{" "}
            for {signedPp(namedGhost.alpha)}. The board’s largest purchase is{" "}
            {formatMoney(maxValue, symbol)}; its best cost{" "}
            {moneyLabel(bestCost, symbol, locale)}.
          </p>
        ) : (
          <p>
            <span className="font-semibold text-white">
              No purchase with a mark fell below the {floorLabel} floor this
              period
            </span>
            , so the floor changes nothing here today. The board’s largest
            purchase is {formatMoney(maxValue, symbol)}; its best cost{" "}
            {moneyLabel(bestCost, symbol, locale)}.
          </p>
        )
      }
      header={header}
      linking={linking}
      loading={rows === null}
      modes={MODES}
      pad={PAD}
      renderTip={(id) => {
        if (namedGhost && id === namedGhost.id) {
          return (
            <>
              <div className="font-semibold">
                {namedGhost.company}{" "}
                <span className="font-mono text-[10px] font-normal text-white/50">
                  {displayTicker(namedGhost.ticker)}
                </span>
              </div>
              <div className="mt-1 tabular-nums">
                {exactMoney(namedGhost.value, symbol, locale)} ·{" "}
                {signedPp(namedGhost.alpha)}
              </div>
              <div className="text-[11px] text-white/55">
                below the {floorLabel} floor
              </div>
            </>
          );
        }
        const tip = byId.get(id);

        if (!tip) return null;

        return (
          <>
            <div className="font-semibold">
              {tip.company}{" "}
              <span className="font-mono text-[10px] font-normal text-white/50">
                {displayTicker(tip.ticker)}
              </span>
            </div>
            <div className="text-[11px] text-white/55">
              {tip.person ?? "Undisclosed"}
              {tip.role ? ` · ${tip.role}` : ""} ·{" "}
              {dateLabel(tip.disclosedDate, locale)}
            </div>
            <div className="mt-1 tabular-nums">
              <span style={{ color: stageTone(tip.dir) }}>
                {signedPp(tip.alpha)} vs {benchmark}
              </span>
              {tip.worthNow != null ? (
                <>
                  {" · "}
                  {moneyPair(tip.value, tip.worthNow, symbol).join(" → ")}
                </>
              ) : null}
            </div>
          </>
        );
      }}
      svgLabel={(mode) =>
        rows == null
          ? ""
          : mode === "alpha"
            ? `${rows.length} of ${denominator} eligible purchases that have had time to be measured, ranked by alpha against ${benchmark}, with the rest of the field beside them`
            : `The same purchases by amount spent, with the ${floorLabel} floor drawn and the purchases it holds back`
      }
    >
      {(ctx) =>
        rows == null ? null : (
          <Body
            bandLabels={bandLabels}
            benchmark={benchmark}
            ctx={ctx}
            cutoffAlpha={cutoffAlpha}
            field={field}
            ghosts={ghosts}
            locale={locale}
            marketId={marketId}
            namedGhost={namedGhost}
            rows={rows}
            symbol={symbol}
          />
        )
      }
    </BoardStagePanel>
  );
}
