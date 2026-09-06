/** The field on one axis: /best-performing-buys' proof object.
 *
 *  A board of 25 ranked on alpha invites one question it cannot normally
 *  answer — "and the ones you left out?" — so this draws them. Every eligible
 *  purchase old enough to carry a mark is one dot, placed at its alpha on a
 *  single horizontal scale with the level line in it. The board's best few sit
 *  above the band as logos, at their own alpha, each tied back down to where it
 *  really is.
 *
 *  ONE AXIS, ONE MEANING (2026-09-06). Until this rewrite the stage drew two
 *  incompatible pictures on one pair of axes: the board at its RANK across the
 *  right seventy per cent, the field in a dune around the centre of the left
 *  thirty where x meant nothing at all, and a second arrangement where x meant
 *  amount spent. Three x-semantics in one frame, and alpha — the only honest
 *  shared dimension — spent on the axis a reader reads last. The ranking itself
 *  was never drawn here at all; it is the list below, which is HTML, links, and
 *  indexable, and which now carries a bar. So the stage keeps the one job the
 *  list cannot do: showing the 25 being picked out of the field.
 *
 *  Height carries no meaning. Dots are stacked off the band's centre line only
 *  where they would otherwise be drawn on top of each other, deterministically —
 *  same data, same picture — so the shape of the band is the distribution and
 *  nothing else. The axis says so under it, in words, rather than leaving it to
 *  the caption.
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
  LogoDisc,
  placeLabels,
  RuleWithLabel,
  SignedAxis,
  StageLabel,
  StageMark,
  stageTone,
} from "../stage-marks";

import { companyPath, displayTicker } from "@/lib/company";

/** One arrangement. The second one used to sort the same marks by amount
 *  spent, which answers a methodology question rather than a reader's — and
 *  its one genuine finding, how many purchases the floor holds back, is a
 *  sentence, so it moved to the floor caveat under the list. With a single
 *  mode `BoardStagePanel` draws no toggle. */
type Mode = "alpha";

const MODES: ReadonlyArray<StageMode<Mode>> = [
  { id: "alpha", label: "By alpha" },
];

/** A strip, not a chart: the alpha ticks are under the plot rather than beside
 *  it, so the side gutters only have to hold half of the widest tick label.
 *  The top gutter carries two rows of caption — the median's above the band
 *  labels — and the bottom one the ticks plus the note under them. */
const PAD: StagePad = { l: 28, r: 28, t: 52, b: 46 };

/** How far a disc may be nudged off its true alpha to clear its neighbour.
 *  The clamp is the guarantee: a logo never travels far enough for the axis
 *  under it to become a lie, and where it has moved at all the stem points
 *  back at the position it was actually measured at. */
const NUDGE_X = 12;
const NUDGE_Y = 8;

/** One eligible marked purchase. No name, no link and no tooltip: there is
 *  nothing to say about one dot in a band of 283, and 283 hit targets would
 *  make the marks that matter harder to reach. */
interface FieldPoint {
  id: string;
  alpha: number;
}

interface Placed {
  row: BoardRow;
  /** Where its alpha actually is. The stem is drawn to this, not to `x`. */
  tx: number;
  x: number;
  y: number;
  r: number;
}

/** Every eligible purchase with a mark that clears the floor — the board
 *  included, because the band is the population the board was picked out of
 *  and a band with the 25 removed is a different set from the one the caption
 *  counts. The predicate is `rankByAlpha`'s eligibility test, so the length is
 *  exactly the `considered` the page states. */
function fieldPoints(
  dealings: Array<Dealing | UsDealing>,
  market: "UK" | "US",
): FieldPoint[] {
  const out: FieldPoint[] = [];

  dealings.forEach((d, i) => {
    if (!hasBoardMark(d, market)) return;
    if (buyValue(d) < MIN_BOARD_VALUE) return;
    const alpha = buyAlpha(d);

    if (alpha == null) return;
    out.push({ id: `fd-${d.id ?? `${d.ticker ?? ""}-${i}`}`, alpha });
  });

  return out;
}

/** The alphas of every eligible marked purchase that clears the floor — the
 *  board's own denominator, and the population every figure on this page is
 *  taken over.
 *
 *  Exported because the number is stated twice: as a figure beside the object
 *  ("median of all 283") and in the stage's own caption and band labels. It is
 *  computed once, by the page, and handed down; two computations of the same
 *  statistic are two chances to print different ones. */
export function eligibleAlphas(
  dealings: Array<Dealing | UsDealing>,
  market: "UK" | "US",
): number[] {
  return fieldPoints(dealings, market).map((f) => f.alpha);
}

/** What the £50,000 floor actually costs this period.
 *
 *  `below` is every marked eligible purchase under the floor; `heldBack` is
 *  the ones that would have ranked without it. The two are different claims
 *  and the page states whichever it has: a floor that excludes purchases none
 *  of which would have made the board changes nothing, and saying it "holds
 *  back 0" would say neither thing.
 *
 *  `cutoffAlpha` is the board's last place, and only when the board is full —
 *  a board of eighteen has room, so everything below the floor would otherwise
 *  rank. Lives here rather than on the page because it is the same eligibility
 *  test as the field, one line apart. */
export function floorEffect(
  dealings: Array<Dealing | UsDealing>,
  market: "UK" | "US",
  cutoffAlpha: number | null,
): { below: number; heldBack: number } {
  let below = 0;
  let heldBack = 0;

  for (const d of dealings) {
    if (!hasBoardMark(d, market)) continue;
    if (buyValue(d) >= MIN_BOARD_VALUE) continue;
    const alpha = buyAlpha(d);

    if (alpha == null) continue;
    below += 1;
    if (cutoffAlpha == null || alpha > cutoffAlpha) heldBack += 1;
  }

  return { below, heldBack };
}

interface Strip {
  /** Alpha to a pixel. The only scale on the picture. */
  x: (a: number) => number;
  amin: number;
  amax: number;
  plot: { x0: number; x1: number; y0: number; y1: number };
  /** The row the logos ride on. */
  logoY: number;
  discR: number;
  /** The dot band's centre line and how far off it a dot may be stacked. */
  bandCy: number;
  bandHalf: number;
}

function buildStrip(
  rows: BoardRow[],
  field: FieldPoint[],
  W: number,
  H: number,
  pad: StagePad,
  wide: boolean,
): Strip {
  const plot = { x0: pad.l, x1: W - pad.r, y0: pad.t, y1: H - pad.b };
  // Zero is always in the domain, so the level line is always on the picture.
  const alphas = [
    0,
    ...field.map((f) => f.alpha),
    ...rows.map((r) => r.alpha ?? 0),
  ];
  const lo = Math.min(...alphas);
  const hi = Math.max(...alphas);
  const span = Math.max(hi - lo, 0.04);
  const amin = lo - span * 0.06;
  const amax = hi + span * 0.06;

  const discR = wide ? 13 : 9;
  const logoY = plot.y0 + discR + 8;
  const bandHalf = Math.max(
    10,
    Math.min(40, (plot.y1 - 6 - (logoY + discR + 18)) / 2),
  );

  return {
    x: (a) => plot.x0 + ((a - amin) / (amax - amin)) * (plot.x1 - plot.x0),
    amin,
    amax,
    plot,
    logoY,
    discR,
    bandCy: plot.y1 - 6 - bandHalf,
    bandHalf,
  };
}

/** The band: bin on the pixel the alpha lands on, then step alternately either
 *  side of the centre line. Deterministic — same data, same picture, no jitter —
 *  so the shape is the distribution rather than a texture. A bin four pixels
 *  wide is a hair over one dot's diameter, which is what makes the stacking
 *  mean "these two would have collided" rather than "these two are near". */
function swarm(
  field: FieldPoint[],
  st: Strip,
): Array<{ id: string; x: number; y: number }> {
  const perBin = new Map<number, number>();

  return [...field]
    .sort((a, b) => b.alpha - a.alpha || a.id.localeCompare(b.id))
    .map((f) => {
      const x = st.x(f.alpha);
      const bin = Math.round(x / 4);
      const k = perBin.get(bin) ?? 0;

      perBin.set(bin, k + 1);
      const off = Math.ceil(k / 2) * 3.4 * (k % 2 === 1 ? 1 : -1);

      return {
        id: f.id,
        x,
        y: st.bandCy + Math.max(-st.bandHalf, Math.min(st.bandHalf, off)),
      };
    });
}

/** The named few, at their own alpha along one row, eased apart where two sit
 *  on near-identical marks. Ten discs rather than twenty-five: logos are an
 *  attractor, not an enumeration, and the enumeration is the list below. */
function logoLayout(rows: BoardRow[], st: Strip): Placed[] {
  const pts: Placed[] = rows.map((row) => {
    const tx = st.x(row.alpha ?? 0);

    return { row, tx, x: tx, y: st.logoY, r: st.discR };
  });

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
  for (const p of pts) {
    p.x = Math.max(p.tx - NUDGE_X, Math.min(p.tx + NUDGE_X, p.x));
    p.y = Math.max(st.logoY - NUDGE_Y, Math.min(st.logoY + NUDGE_Y, p.y));
  }

  return pts;
}

function Body({
  ctx,
  rows,
  field,
  bandLabels,
  fieldMedian,
  marketId,
  benchmark,
}: {
  ctx: StageContext<Mode>;
  rows: BoardRow[];
  field: FieldPoint[];
  bandLabels: { pos: string; posShort: string; neg: string };
  fieldMedian: number | null;
  marketId: "UK" | "US";
  benchmark: string;
}) {
  const { W, H, pad, active } = ctx;
  const wide = W >= 520;

  const st = useMemo(
    () => buildStrip(rows, field, W, H, pad, wide),
    [rows, field, W, H, pad, wide],
  );
  // The board's best few. Not all 25: at r=13 the top twenty-five would need
  // more clear width than the highest alphas span, and the clamp would then be
  // holding discs on top of one another rather than off each other.
  const named = useMemo(
    () => rows.slice(0, Math.min(rows.length, wide ? 10 : 6)),
    [rows, wide],
  );
  const layout = useMemo(() => logoLayout(named, st), [named, st]);
  const dots = useMemo(() => swarm(field, st), [field, st]);

  // The top three carry their company name. More than three on a strip this
  // short is a row of overstruck text, and the list below names all 25.
  const labels = useMemo(
    () =>
      placeLabels(
        layout.map((p) => ({
          id: p.row.id,
          key: p.row.ticker,
          x: p.x,
          y: p.y,
          r: p.r,
          text: p.row.company,
          sub: signedPp(p.row.alpha),
        })),
        {
          obstacles: layout,
          xMin: pad.l,
          xMax: W - 6,
          cap: wide ? 3 : 1,
          // Never "above": the row of discs sits a few pixels under the plot's
          // top edge, and a label stacked over one lands in the band captions.
          sides: ["right", "left"],
          // Both lines, not just the name: a three-letter ticker under a figure
          // like "+121.0pp" is a wide label, and measuring only the name is how
          // one came to be drawn over the company beside it.
          width: (c) =>
            Math.max(c.text.length * 6.7, (c.sub?.length ?? 0) * 6.2) + 6,
        },
      ),
    [layout, pad.l, W, wide],
  );

  const bandTop = st.bandCy - st.bandHalf;
  const medianX = fieldMedian == null ? null : st.x(fieldMedian);
  // Uppercase mono at 10px with 0.12em tracking measures about 7.2px a
  // character on the rendered panel; the note is sized off that rather than
  // measured, because there is nothing to measure until it is drawn.
  const note = wide
    ? "one dot per purchase · height carries no meaning"
    : "height carries no meaning";

  return (
    <>
      {/* Bands collapsed to nothing: a tint over half the plot is a field, and
          the design language asks for the colour to be contained. Here it is
          the level line, the two band labels and the hairlines under them that
          carry the sides. /sectors retired its bands the same way. */}
      <SignedAxis
        bands={{ from: st.plot.y0, to: st.plot.y0 }}
        negLabel={bandLabels.neg}
        orientation="vertical"
        plot={st.plot}
        posLabel={wide ? bandLabels.pos : bandLabels.posShort}
        scale={st.x}
        ticks={alphaTicks(st.amin, st.amax)}
      />

      {/* One hairline under each band label, the width of the side it names.
          Alpha is the horizontal axis here, so each runs from the level line to
          its own end of the plot and the reader can see which half is which
          without reading a number. */}
      <rect
        fill="var(--stage-pos)"
        fillOpacity={0.55}
        height={2}
        width={Math.max(0, st.plot.x1 - st.x(0))}
        x={st.x(0)}
        y={st.plot.y0 - 6}
      />
      <rect
        fill="var(--stage-neg)"
        fillOpacity={0.55}
        height={2}
        width={Math.max(0, st.x(0) - st.plot.x0)}
        x={st.plot.x0}
        y={st.plot.y0 - 6}
      />

      {/* The field's median, ticked. Raised a line above the plot so its
          caption sits over the band labels rather than into them: the median
          of a field like this one lands near the level line, which is exactly
          where those two labels meet. */}
      {medianX == null ? null : (
        <RuleWithLabel
          dashed
          anchor={medianX > (st.plot.x0 + st.plot.x1) / 2 ? "end" : "start"}
          label={`field median ${signedPp(fieldMedian)}`}
          x={medianX}
          y0={st.plot.y0 - 14}
          y1={st.plot.y1}
        />
      )}

      {/* What the other dimension is not. Under the axis rather than over it:
          the top of this strip is two rows of caption deep already, and the
          reader meets this line while their eye is still on the ticks. */}
      <text
        className="font-mono uppercase"
        fill="rgba(255,255,255,0.4)"
        fontSize={10}
        letterSpacing="0.12em"
        x={st.plot.x0}
        y={st.plot.y1 + 34}
      >
        {note}
      </text>

      {/* The field the board was picked from, the board included. */}
      <DotField
        dots={dots}
        fill="rgba(255,255,255,0.45)"
        move={false}
        r={1.8}
      />

      {/* Each named disc back to where its alpha actually is. Where the disc
          has not moved this is a plumb line; where it has, it leans, which is
          the correction being shown rather than hidden. */}
      <g>
        {layout.map((p) => (
          <line
            key={`stem-${p.row.id}`}
            stroke="rgba(255,255,255,0.18)"
            x1={p.x}
            x2={p.tx}
            y1={p.y + p.r + 3}
            y2={bandTop}
          />
        ))}
      </g>

      <g>
        {layout.map((p) => {
          const href =
            marketId === "UK"
              ? p.row.raw.id
                ? filingPath(p.row.raw.id)
                : undefined
              : companyPath(p.row.ticker);
          const side = labels.get(p.row.id);

          return (
            <StageMark
              key={p.row.id}
              anchor={{ x: p.x, y: p.y, r: p.r }}
              ariaLabel={`${p.row.company}, ${signedPp(p.row.alpha)} vs ${benchmark}`}
              hit={{ shape: "circle", r: p.r + 8 }}
              href={href}
              id={p.row.id}
              move={false}
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
    </>
  );
}

/** A strip, not a chart. Short enough that the ranked list below it is on the
 *  same screen, which is the point: the picture is the field, the list is the
 *  board, and reading one against the other is the whole page. */
function stripHeight(W: number): number {
  return Math.round(Math.min(320, Math.max(240, W * 0.26)));
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
  /** The whole fetched window, which the field comes out of. */
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

  const field = useMemo(
    () => fieldPoints(dealings ?? [], marketId),
    [dealings, marketId],
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
  const denominator = complete ? String(considered) : `at least ${considered}`;

  const bandLabels = {
    pos: complete
      ? `${tally.pos} of ${considered} eligible ahead`
      : `at least ${tally.pos} eligible ahead`,
    // The same claim on a phone, where the full one runs past the half of the
    // plot it belongs to. "Eligible" is the word that goes: the caption under
    // the picture still says which purchases these are, and the counts stay
    // whole.
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

  // "pp" spelled out once, here, on the figure the reader meets first. It is
  // the unit every number on this page is in and it is not a word anybody
  // arrives knowing.
  const medianPp = fieldMedian == null ? 0 : Math.abs(fieldMedian * 100);

  return (
    <BoardStagePanel<Mode>
      caption={() =>
        rows == null ? null : (
          <p>
            <span className="font-semibold text-white">
              The {rows.length} best of {denominator} purchases old enough to be
              measured.
            </span>{" "}
            {complete ? (
              <>
                {tally.pos} of them are ahead of the market and {tally.neg}{" "}
                behind.{" "}
              </>
            ) : (
              <>
                At least {tally.pos} are ahead of the market and at least{" "}
                {tally.neg} behind.{" "}
              </>
            )}
            {fieldMedian == null ? null : medianPp < 0.05 ? (
              <>The median purchase is level with the index. </>
            ) : (
              <>
                The median is {signedPp(fieldMedian)}, or {medianPp.toFixed(1)}{" "}
                percentage points {fieldMedian > 0 ? "ahead of" : "behind"} the
                index.{" "}
              </>
            )}
            {full && cutoffAlpha != null ? (
              <>The board starts at {signedPp(cutoffAlpha)}.</>
            ) : null}
          </p>
        )
      }
      header={header}
      height={stripHeight}
      linking={linking}
      loading={rows === null}
      modes={MODES}
      pad={PAD}
      renderTip={(id) => {
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
              ) : (
                <>
                  {" · "}
                  {formatMoney(tip.value, symbol)}
                </>
              )}
            </div>
          </>
        );
      }}
      skeletonShape="field"
      svgLabel={() =>
        rows == null
          ? ""
          : `${denominator} eligible purchases that have had time to be measured, each a dot at its alpha against ${benchmark} on one horizontal scale, with the best of the ${rows.length} on the board marked by logo`
      }
    >
      {(ctx) =>
        rows == null ? null : (
          <Body
            bandLabels={bandLabels}
            benchmark={benchmark}
            ctx={ctx}
            field={field}
            fieldMedian={fieldMedian}
            marketId={marketId}
            rows={rows}
          />
        )
      }
    </BoardStagePanel>
  );
}
