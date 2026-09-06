/** The hero's proof object: the board's 25 purchases as one picture.
 *
 *  Two arrangements of the same marks. "By amount" packs them as discs whose
 *  area is what was spent — the £53m the board adds up to, drawn to scale and
 *  made of the actual companies. "By outcome" sends the same discs to a
 *  scatter: amount across, performance against the index up, with a stem from
 *  every disc to the zero line so the distance from level is drawn rather
 *  than inferred. The move from one to the other is the hook — "who spent the
 *  most" re-sorts itself into "who was right" — so the page opens on the
 *  first and advances to the second once, unless the reader has already
 *  reached for the toggle or asked for reduced motion.
 *
 *  A dark contained panel (design language, tenet 1): the visual is an object
 *  on the page, not a backdrop, and the message column beside it never sits
 *  on top of it. Colours are fixed for the dark surface rather than read
 *  through the theme, because the panel is dark in both modes.
 *
 *  This is now the BESPOKE renderer for one board, composed from the shared
 *  kit (2026-09-05): `BoardStagePanel` is the frame, `stage-marks` the
 *  material. What stayed here is what only this page does — packing money,
 *  scattering it against alpha, choosing which discs earn a name, and the
 *  three sentences the picture is allowed to state. The drawn output did not
 *  change in the extraction, and it is not meant to.
 */
import type { BoardRow, Linking } from "./board-model";
import type { StageContext, StageMode, StagePad } from "./stage-panel";
import type { Side } from "./stage-marks";
import type { ReactNode } from "react";

import { useMemo } from "react";

import { moneyPair, moneyDelta } from "../../../shared/leaderboard.js";
import { formatMoney } from "../../../shared/sectors.js";

import { dateLabel, signedPp, summarise } from "./board-model";
import { BoardStagePanel } from "./stage-panel";
import {
  alphaTicks,
  fitPacked,
  LogoDisc,
  moneyTicks,
  packCircles,
  placeLabels,
  SignedAxis,
  StageLabel,
  StageMark,
  stageTone,
} from "./stage-marks";

type Mode = "size" | "outcome";

interface Placed {
  row: BoardRow;
  x: number;
  y: number;
  r: number;
}

const MODES: ReadonlyArray<StageMode<Mode>> = [
  { id: "size", label: "By amount" },
  { id: "outcome", label: "By outcome" },
];

/** The money axis is priced from £100k to £100m however small this board's
 *  smallest purchase happens to be, so the ticks mean the same thing on the
 *  rolling board and on a thin archive year. */
const MONEY_DECADES: [number, number] = [1e5, 1e8];

function sizeLayout(rows: BoardRow[], W: number, H: number): Placed[] {
  return fitPacked(
    packCircles(rows.map((row) => ({ row, r: Math.sqrt(row.value) }))),
    W,
    H,
  );
}

interface Scales {
  x: (v: number) => number;
  y: (a: number) => number;
  vmin: number;
  vmax: number;
  amin: number;
  amax: number;
  zeroY: number;
}

function outcomeScales(
  rows: BoardRow[],
  W: number,
  H: number,
  pad: StagePad,
): Scales {
  const values = rows.map((r) => r.value);
  const alphas = rows.map((r) => r.alpha).filter((a): a is number => a != null);
  const vmin = Math.min(...values) * 0.82;
  const vmax = Math.max(...values) * 1.25;
  const lo = Math.min(-0.1, ...alphas);
  const hi = Math.max(0.1, ...alphas);
  const span = hi - lo;
  const amin = lo - span * 0.14;
  const amax = hi + span * 0.14;
  const x = (v: number) =>
    pad.l +
    ((Math.log(v) - Math.log(vmin)) / (Math.log(vmax) - Math.log(vmin))) *
      (W - pad.l - pad.r);
  const y = (a: number) =>
    pad.t + ((amax - a) / (amax - amin)) * (H - pad.t - pad.b);

  return { x, y, vmin, vmax, amin, amax, zeroY: y(0) };
}

function outcomeLayout(
  rows: BoardRow[],
  W: number,
  H: number,
  pad: StagePad,
  sc: Scales,
): Placed[] {
  const rmax = Math.max(...rows.map((r) => Math.sqrt(r.value)));
  const marked = rows.filter((r) => r.alpha != null);
  const unmarked = rows.filter((r) => r.alpha == null);
  const pts: Placed[] = marked.map((row) => ({
    row,
    x: sc.x(row.value),
    y: sc.y(row.alpha ?? 0),
    r: (W < 520 ? 7 : 9) + (W < 520 ? 8 : 11) * (Math.sqrt(row.value) / rmax),
  }));

  // Two identical purchases (same company, same day, same size) would draw
  // as one disc. Ease overlapping discs apart by at most a few pixels — the
  // reader must still be able to trust the alpha they sit on.
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
  pts.forEach((p) => {
    const ox = sc.x(p.row.value);
    const oy = sc.y(p.row.alpha ?? 0);

    p.x = Math.max(ox - 12, Math.min(ox + 12, p.x));
    p.y = Math.max(oy - 8, Math.min(oy + 8, p.y));
  });

  // No mark yet: a quiet row along the bottom edge, so a purchase disclosed
  // this week is still on the picture without asserting a result.
  unmarked.forEach((row, i) => {
    pts.push({ row, x: W - pad.r - 18 - i * 30, y: H - pad.b + 16, r: 9 });
  });

  return pts;
}

/** The marks, inside the panel's svg.
 *
 *  A component rather than the panel's render prop run inline, because the
 *  packing is 25 discs against 360 candidate angles each and it must not be
 *  redone every time a pointer moves over a row. */
function StageBody({
  ctx,
  rows,
  symbol,
  benchmark,
  summary,
}: {
  ctx: StageContext<Mode>;
  rows: BoardRow[];
  symbol: string;
  benchmark: string;
  summary: ReturnType<typeof summarise>;
}) {
  const { W, H, pad, mode, active } = ctx;

  const scales = useMemo(
    () => outcomeScales(rows, W, H, pad),
    [rows, W, H, pad],
  );
  const layout = useMemo(
    () =>
      mode === "size"
        ? sizeLayout(rows, W, H)
        : outcomeLayout(rows, W, H, pad, scales),
    [rows, W, H, pad, mode, scales],
  );

  const featuredIds = useMemo(
    () =>
      new Set(
        [rows[0], summary.best, summary.worst]
          .filter((r): r is BoardRow => Boolean(r))
          .map((r) => r.id),
      ),
    [rows, summary],
  );

  // Which discs get a name in the outcome view: the biggest purchase, then
  // the largest moves either way, one label per company, as many as fit
  // without a label landing on another label or another disc. Narrow stages
  // stop at three so the picture stays a picture.
  const labelled = useMemo(() => {
    if (mode !== "outcome" || !layout.length) return new Map<string, Side>();
    const byId = new Map(layout.map((p) => [p.row.id, p] as const));
    const order = [
      rows[0],
      ...[...rows]
        .filter((r) => r.alpha != null)
        .sort((a, b) => Math.abs(b.alpha ?? 0) - Math.abs(a.alpha ?? 0)),
    ].filter((r) => r && r.alpha != null && Math.abs(r.alpha) >= 0.08);
    // Full names for the three the caption talks about; everything else is
    // named by its ticker, which is short enough to sit between neighbours.
    const cands = order
      .map((r) => {
        const p = byId.get(r.id);

        if (!p) return null;
        const featured = featuredIds.has(r.id);

        return {
          id: r.id,
          key: r.ticker,
          x: p.x,
          y: p.y,
          r: p.r,
          featured,
          text: featured ? r.company : r.ticker.replace(/\.[A-Z]+$/, ""),
        };
      })
      .filter((c): c is NonNullable<typeof c> => c != null);

    return placeLabels(cands, {
      obstacles: layout,
      xMin: pad.l,
      xMax: W + 6,
      cap: W < 520 ? 3 : W < 760 ? 6 : W < 1000 ? 9 : 14,
      // The money line under the name ("£996k → £1.1m") is usually the wider
      // of the two, so a ticker label is never narrower than it.
      width: (c) => Math.max(c.text.length * (c.featured ? 6.6 : 6.4), 86) + 4,
    });
  }, [mode, rows, layout, W, pad, featuredIds]);

  const zeroY = scales.zeroY;

  return (
    <>
      {/* Outcome-only furniture, faded rather than mounted so the
        discs travel over it as it arrives. */}
      <g
        className="transition-opacity duration-700"
        style={{ opacity: mode === "outcome" ? 1 : 0 }}
      >
        <SignedAxis
          crossLabel="amount spent →"
          crossTicks={moneyTicks(scales.vmin, scales.vmax, {
            decades: MONEY_DECADES,
          }).map((v) => ({ at: scales.x(v), label: formatMoney(v, symbol) }))}
          labelGutter={pad.l - 10}
          negLabel={<>trailed it · {summary.behind}</>}
          plot={{ x0: pad.l, x1: W - pad.r, y0: pad.t, y1: H - pad.b }}
          posLabel={<>beat the market · {summary.ahead}</>}
          scale={scales.y}
          ticks={alphaTicks(scales.amin, scales.amax)}
        />
      </g>

      {/* Stems: one per disc, from the disc to the zero line. */}
      <g
        className="transition-opacity duration-500"
        style={{ opacity: mode === "outcome" ? 1 : 0 }}
      >
        {layout
          .filter((p) => p.row.alpha != null)
          .map((p) => (
            <g
              key={p.row.id}
              className="board-stage-move"
              style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
            >
              <line
                stroke={stageTone(p.row.dir)}
                strokeOpacity={active && active !== p.row.id ? 0.25 : 0.7}
                strokeWidth={2}
                y2={zeroY - p.y}
              />
            </g>
          ))}
      </g>

      {/* The discs. Position on the outer group (CSS transform, so it
        transitions), identity and hit target inside. */}
      <g>
        {layout.map((p) => (
          <StageMark
            key={p.row.id}
            anchor={{ x: p.x, y: p.y, r: p.r }}
            ariaLabel={`${p.row.company}, ${formatMoney(p.row.value, symbol)}, ${signedPp(p.row.alpha)} vs ${benchmark}`}
            hit={{ shape: "circle", r: p.r + 8 }}
            id={p.row.id}
            x={p.x}
            y={p.y}
          >
            <LogoDisc
              active={active === p.row.id}
              clipId={`bs-${p.row.id}`}
              edge={stageTone(p.row.dir)}
              r={p.r}
              ticker={p.row.ticker}
            />
            {labelled.has(p.row.id) ? (
              <StageLabel
                r={p.r}
                side={labelled.get(p.row.id) ?? "right"}
                sub={
                  p.row.worthNow != null
                    ? moneyPair(p.row.value, p.row.worthNow, symbol).join(" → ")
                    : formatMoney(p.row.value, symbol)
                }
                text={
                  featuredIds.has(p.row.id)
                    ? p.row.company
                    : p.row.ticker.replace(/\.[A-Z]+$/, "")
                }
                visible={mode === "outcome"}
              />
            ) : null}
          </StageMark>
        ))}
      </g>
    </>
  );
}

export function BoardStage({
  rows,
  symbol,
  benchmark,
  locale,
  linking,
  header,
}: {
  /** Null while the board is loading. */
  rows: BoardRow[] | null;
  /** The page's message layer — eyebrow, h1, standfirst, figures — set
   *  inside the object above the chart. The toggle joins its row. */
  header?: ReactNode;
  symbol: string;
  /** "the FTSE All-Share" / "the S&P 500". */
  benchmark: string;
  locale: string;
  linking: Linking;
}) {
  const board = rows && rows.length ? rows : null;
  const summary = useMemo(() => (board ? summarise(board) : null), [board]);
  const byId = useMemo(
    () => new Map((board ?? []).map((r) => [r.id, r] as const)),
    [board],
  );

  // Only asked for while the board is drawn: the panel renders no svg, no
  // caption and no tooltip until it has one.
  const labels =
    board && summary
      ? {
          size: `${board.length} purchases drawn to scale, ${formatMoney(summary.total, symbol)} in total`,
          outcome: `Each purchase by amount spent and performance against ${benchmark} since disclosure`,
        }
      : null;

  return (
    <BoardStagePanel<Mode>
      caption={(ctx) =>
        board && summary ? (
          ctx.mode === "size" ? (
            <p>
              <span className="font-semibold text-white">
                {formatMoney(summary.total, symbol)} across {board.length}{" "}
                purchases
              </span>
              , drawn to scale.{" "}
              <button
                className="text-white/80 underline decoration-white/30 underline-offset-4 hover:text-white"
                type="button"
                onClick={() => ctx.choose("outcome")}
              >
                See who was right →
              </button>
            </p>
          ) : (
            <p>
              <span className="font-semibold text-white">
                {summary.ahead} of {board.length} are ahead of {benchmark}
              </span>{" "}
              since they were disclosed.
              {summary.best && summary.worst ? (
                <>
                  {" "}
                  {summary.best.company} is the standout at{" "}
                  {signedPp(summary.best.alpha)}; {summary.worst.company} is the
                  one that hurt, at {signedPp(summary.worst.alpha)}.
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
      renderTip={(id) => {
        const tip = byId.get(id);

        if (!tip) return null;

        return (
          <>
            <div className="font-semibold">
              {tip.company}{" "}
              <span className="font-mono text-[10px] font-normal text-white/50">
                {tip.ticker.replace(/\.[A-Z]+$/, "")}
              </span>
            </div>
            <div className="text-[11px] text-white/55">
              {tip.person ?? "Undisclosed"}
              {tip.role ? ` · ${tip.role}` : ""} ·{" "}
              {dateLabel(tip.tradeDate, locale)}
            </div>
            <div className="mt-1 tabular-nums">
              {tip.worthNow != null ? (
                <>
                  {moneyPair(tip.value, tip.worthNow, symbol).join(" → ")}{" "}
                  <span
                    style={{
                      color:
                        tip.dir === "pos"
                          ? "var(--stage-pos)"
                          : tip.dir === "neg"
                            ? "var(--stage-neg)"
                            : "rgba(255,255,255,0.6)",
                    }}
                  >
                    {moneyDelta(tip.value, tip.worthNow, symbol)} ·{" "}
                    {signedPp(tip.alpha)} vs index
                  </span>
                </>
              ) : (
                <>{formatMoney(tip.value, symbol)} · no mark yet</>
              )}
            </div>
          </>
        );
      }}
      svgLabel={(mode) => labels?.[mode] ?? ""}
    >
      {(ctx) =>
        board && summary ? (
          <StageBody
            benchmark={benchmark}
            ctx={ctx}
            rows={board}
            summary={summary}
            symbol={symbol}
          />
        ) : null
      }
    </BoardStagePanel>
  );
}
