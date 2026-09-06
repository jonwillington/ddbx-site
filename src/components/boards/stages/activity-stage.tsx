/** The activity board's proof object: 25 companies, one pip per purchase.
 *
 *  The page ranks issuers on how many purchases were disclosed, and the whole
 *  reason it is worth drawing is the column a count cannot show. Sixteen
 *  purchases from one determined chief executive and sixteen from nine
 *  different people are the same number and a different story, so the pips are
 *  GROUPED — one run per distinct insider, a wider gap between runs — and the
 *  shape of a row says which story it is before the number does.
 *
 *  Pips, not dots, deliberately. Across this family a small circle already
 *  means a purchase in a population (sectors, roles, best-performing) or a
 *  person (cluster). A pip is a tally stroke, which is exactly what "sixteen
 *  purchases from one person" is, and it keeps the vocabulary unambiguous.
 *
 *  Two arrangements. "By purchases" is the board order, with count rules to
 *  read the runs against. "By who bought" re-sorts by distinct insiders and
 *  brackets the result into labelled runs, so the ranks scramble and the
 *  reader can see that the busiest company is not always the broadest one.
 *
 *  MONOCHROME, without exception. This board is not ranked by performance and
 *  must not borrow the panel's ahead/behind pair to suggest that it is; a pip
 *  is never sized, tinted or spaced by value either. And no pip, label or
 *  tooltip line ever names a filer: insider identity enters this file only as
 *  the anonymous integers `companyRollup` hands over.
 */
import type { CompanyActivity } from "../../../../shared/boards";
import type { Linking } from "../board-model";
import type { StageContext, StageMode, StagePad } from "../stage-panel";
import type { ReactNode } from "react";

import { useMemo } from "react";

import { formatMoney } from "../../../../shared/sectors.js";
import { numberWord, signedPp } from "../board-model";
import { BoardStagePanel } from "../stage-panel";
import { LogoDisc, StageAxis, StageMark } from "../stage-marks";

import { shortDate } from "@/components/market/market-utils";
import { cleanCompanyName, companyPath, displayTicker } from "@/lib/company";

type Mode = "purchases" | "people";

const MODES: ReadonlyArray<StageMode<Mode>> = [
  { id: "purchases", label: "By purchases" },
  { id: "people", label: "By who bought" },
];

/** Rows are the full width of the plot, so the gutters are thin on both
 *  sides and the vertical padding only has to clear the count labels. */
const PAD: StagePad = { l: 24, r: 24, t: 40, b: 28 };

/** Taller than the packing stages: 25 rows have to fit as rows. */
function stageHeight(W: number): number {
  return Math.round(Math.min(760, Math.max(480, W * 0.62)));
}

/** Rank, logo and name, drawn inside the plot so the pips start at a single
 *  x on every row. A phone gets the ticker instead of the name. */
const RANK_X = 0;
const LOGO_CX = 22;
const NAME_X = 38;

function gutterWidth(W: number): number {
  return W < 520 ? 96 : W < 860 ? 168 : 210;
}

/** One pip is 3 x 10 at rest; both shrink rather than the run overflowing. */
const PIP_STEP = 8;
const PIP_W = 3;
const PIP_H = 10;

/** The extra advance at a group boundary, in slots: a 1.7x step gap. */
const GROUP_GAP = 0.7;

const HOLLOW_LEGEND = "hollow · filer not named";

interface Pip {
  at: number;
  hollow: boolean;
}

/** Where every pip sits, in slots from the start of the run.
 *
 *  Purchases whose filer could not be named are a final hollow group rather
 *  than a rounding error: the pips a reader can count have to add up to the
 *  filings the figures state, so they are drawn differently and never
 *  dropped or folded into somebody else's run. */
export function pipSlots(
  insiderFilings: number[],
  unattributed: number,
): Pip[] {
  const runs = [
    ...insiderFilings.map((n) => ({ n, hollow: false })),
    ...(unattributed > 0 ? [{ n: unattributed, hollow: true }] : []),
  ];
  const out: Pip[] = [];
  let at = 0;

  runs.forEach((run, i) => {
    if (i > 0) at += GROUP_GAP;
    for (let k = 0; k < run.n; k++) {
      out.push({ at, hollow: run.hollow });
      at += 1;
    }
  });

  return out;
}

/** Slots a row occupies, gaps included — what the step has to be sized to. */
function slotSpan(row: CompanyActivity): number {
  const groups =
    row.insiderFilings.length + (row.unattributed > 0 ? 1 : 0) || 1;

  return row.filings + GROUP_GAP * (groups - 1);
}

function PipRects({
  pipH,
  pipW,
  pips,
  step,
  y,
}: {
  pipH: number;
  pipW: number;
  pips: Pip[];
  step: number;
  y: number;
}) {
  const rx = Math.min(1.5, pipW / 2);
  const sw = Math.min(1, pipW / 3);

  return (
    <>
      {pips.map((p) =>
        p.hollow ? (
          <rect
            key={p.at}
            fill="none"
            height={pipH - sw}
            rx={rx}
            stroke="currentColor"
            strokeWidth={sw}
            width={pipW - sw}
            x={p.at * step + sw / 2}
            y={y + sw / 2}
          />
        ) : (
          <rect
            key={p.at}
            fill="currentColor"
            height={pipH}
            rx={rx}
            width={pipW}
            x={p.at * step}
            y={y}
          />
        ),
      )}
    </>
  );
}

/** The same run at list-row scale, standing in for the meter bar the row used
 *  to carry. A bar drew the filing count twice; this draws the count AND how
 *  many people made it, which is the one thing the row could not say. Colour
 *  comes from the parent, so the row keeps its foreground token and the stage
 *  keeps its white. */
export function PipRun({
  className = "",
  row,
}: {
  className?: string;
  row: CompanyActivity;
}) {
  const step = 5.5;
  const pipW = 2;
  const pipH = 7;
  const pips = pipSlots(row.insiderFilings, row.unattributed);
  const w = Math.ceil((pips[pips.length - 1]?.at ?? 0) * step + pipW) + 1;

  return (
    <svg
      aria-hidden
      className={className}
      height={pipH}
      preserveAspectRatio="xMinYMid meet"
      style={{ maxWidth: "100%" }}
      viewBox={`0 0 ${w} ${pipH}`}
      width={w}
    >
      <PipRects pipH={pipH} pipW={pipW} pips={pips} step={step} y={0} />
    </svg>
  );
}

export interface ActivityTotals {
  filings: number;
  value: number;
  /** The most distinct insiders any listed company had. */
  broadest: number;
}

export function activityTotals(rows: CompanyActivity[]): ActivityTotals {
  return {
    filings: rows.reduce((sum, r) => sum + r.filings, 0),
    value: rows.reduce((sum, r) => sum + r.value, 0),
    broadest: rows.reduce((best, r) => Math.max(best, r.insiders), 0),
  };
}

/** The row's own words for how broad its buying was, used on the stage, in
 *  the tooltip and in the aria-label so all three agree. */
export function breadthWords(row: CompanyActivity): string {
  if (row.insiders === 0) return "filer not named";
  if (row.insiders === 1) return "all by one insider";

  return `${row.insiders} different insiders`;
}

function companyName(row: CompanyActivity): string {
  return cleanCompanyName(row.company) || displayTicker(row.ticker);
}

/** SVG has no ellipsis, so the name is cut to what the gutter holds. */
function fitLabel(text: string, maxW: number, perChar: number): string {
  const max = Math.floor(maxW / perChar);

  if (max < 2) return "";
  if (text.length <= max) return text;

  return `${text.slice(0, max - 1).trimEnd()}…`;
}

interface Lane {
  row: CompanyActivity;
  /** Board position, which travels with the row into the second mode. */
  rank: number;
  y: number;
  pips: Pip[];
  endX: number;
}

interface Bracket {
  insiders: number;
  count: number;
  y0: number;
  y1: number;
  labelY: number;
}

/** The marks, inside the panel's svg.
 *
 *  A component rather than the render prop run inline: the two orders, the
 *  runs and every row's pip positions are memoised, and none of it should be
 *  redone because a pointer crossed a row. */
function StageBody({
  ctx,
  rows,
}: {
  ctx: StageContext<Mode>;
  rows: CompanyActivity[];
}) {
  const { W, H, pad, mode } = ctx;
  const gutter = gutterWidth(W);
  const gutterX = pad.l + gutter;
  const plotX1 = W - pad.r;

  const geom = useMemo(() => {
    const n = rows.length;
    const plotTop = pad.t;
    const plotH = H - pad.b - pad.t;

    // Second order: most different insiders first, then the busiest, then the
    // ticker so the arrangement is stable between renders.
    const orderB = rows
      .map((_, i) => i)
      .sort(
        (a, b) =>
          rows[b].insiders - rows[a].insiders ||
          rows[b].filings - rows[a].filings ||
          rows[a].ticker.localeCompare(rows[b].ticker),
      );

    const runs: Array<{ insiders: number; from: number; to: number }> = [];

    orderB.forEach((idx, j) => {
      const last = runs[runs.length - 1];

      if (last && last.insiders === rows[idx].insiders) last.to = j;
      else runs.push({ insiders: rows[idx].insiders, from: j, to: j });
    });

    const gap = runs.length > 1 ? (W < 520 ? 10 : 16) : 0;
    const laneH = (plotH - gap * (runs.length - 1)) / Math.max(1, n);
    const offsetA = (plotH - laneH * n) / 2;

    const posB: number[] = new Array(n).fill(0);
    const runB: number[] = new Array(n).fill(0);

    runs.forEach((run, gi) => {
      for (let j = run.from; j <= run.to; j++) {
        posB[orderB[j]] = j;
        runB[orderB[j]] = gi;
      }
    });

    // The step shrinks before a run does. Every purchase keeps a pip.
    const field = plotX1 - gutterX - 6;
    const widest = Math.max(1, ...rows.map(slotSpan));
    const step = Math.max(4.2, Math.min(PIP_STEP, field / widest));
    const pipW = Math.min(PIP_W, Math.max(1.8, step - 1.6));
    const pipH = Math.min(PIP_H, Math.max(5, laneH - 6));
    const logoR = Math.min(10, Math.max(5, laneH / 2 - 2.5));

    const pips = rows.map((r) => pipSlots(r.insiderFilings, r.unattributed));

    const lanesA: Lane[] = rows.map((row, i) => ({
      row,
      rank: i + 1,
      y: plotTop + offsetA + laneH * (i + 0.5),
      pips: pips[i],
      endX: gutter + (pips[i][pips[i].length - 1]?.at ?? 0) * step + pipW,
    }));

    const lanesB: Lane[] = lanesA.map((lane, i) => ({
      ...lane,
      y: plotTop + laneH * (posB[i] + 0.5) + gap * runB[i],
    }));

    const brackets: Bracket[] = runs.map((run, gi) => {
      const first = plotTop + laneH * (run.from + 0.5) + gap * gi;
      const last = plotTop + laneH * (run.to + 0.5) + gap * gi;

      return {
        insiders: run.insiders,
        count: run.to - run.from + 1,
        y0: first - laneH / 2 + 1,
        y1: last + laneH / 2 - 1,
        labelY: first - laneH / 2 - 4,
      };
    });

    // Count rules every five purchases, dropped where they would collide with
    // the "purchases →" kicker in the same band.
    const maxFilings = Math.max(...rows.map((r) => r.filings));
    const ticks: Array<{ at: number; label: string }> = [];

    for (let c = 5; c <= maxFilings; c += 5) {
      const at = gutterX + c * step;

      if (at < plotX1 - 78) ticks.push({ at, label: String(c) });
    }

    return {
      brackets,
      lanesA,
      lanesB,
      laneH,
      logoR,
      pipH,
      pipW,
      plotTop,
      step,
      ticks,
    };
  }, [rows, W, H, pad, gutter, gutterX, plotX1]);

  const lanes = mode === "purchases" ? geom.lanesA : geom.lanesB;
  const nameW = gutter - NAME_X - 14;
  const anyHollow = rows.some((r) => r.unattributed > 0);
  const plot = {
    x0: pad.l,
    x1: plotX1,
    y0: geom.plotTop,
    y1: H - pad.b,
  };

  return (
    <>
      {/* Mode A furniture: the ruler the runs are read against. */}
      <g
        className="transition-opacity duration-500"
        style={{ opacity: mode === "purchases" ? 1 : 0 }}
      >
        <StageAxis
          plot={plot}
          x={geom.ticks}
          xLabel="purchases →"
          xLabelsAt="top"
        />
      </g>

      {/* Mode B furniture: the runs, bracketed and counted in words. */}
      <g
        className="transition-opacity duration-500"
        style={{ opacity: mode === "people" ? 1 : 0 }}
      >
        {geom.brackets.map((b) => (
          <g key={b.insiders}>
            <line
              stroke="rgba(255,255,255,0.22)"
              x1={gutterX - 6}
              x2={gutterX - 6}
              y1={b.y0}
              y2={b.y1}
            />
            <text
              className="font-mono uppercase"
              fill="rgba(255,255,255,0.45)"
              fontSize={10}
              letterSpacing="0.12em"
              x={gutterX - 6}
              y={b.labelY}
            >
              {b.insiders === 0
                ? `no filer named · ${b.count}`
                : `${numberWord(b.insiders)} ${
                    b.insiders === 1 ? "insider" : "insiders"
                  } · ${b.count}`}
            </text>
          </g>
        ))}
      </g>

      {/* The rows. One mark per company, never a person and never a filing. */}
      <g>
        {lanes.map((lane) => (
          <StageMark
            key={lane.row.ticker}
            anchor={{ x: pad.l + lane.endX, y: lane.y, r: 6 }}
            ariaLabel={`${companyName(lane.row)}, ${lane.row.filings} purchases from ${breadthWords(lane.row)}`}
            hit={{
              shape: "rect",
              x: 0,
              y: -geom.laneH / 2,
              w: plotX1 - pad.l,
              h: geom.laneH,
            }}
            href={companyPath(lane.row.ticker)}
            id={lane.row.ticker}
            x={pad.l}
            y={lane.y}
          >
            <text
              className="font-mono tabular-nums"
              dy="0.35em"
              fill={
                lane.rank <= 3
                  ? "rgba(255,255,255,0.92)"
                  : "rgba(255,255,255,0.35)"
              }
              fontSize={11}
              x={RANK_X}
            >
              {String(lane.rank).padStart(2, "0")}
            </text>

            <g style={{ transform: `translate(${LOGO_CX}px, 0px)` }}>
              <LogoDisc
                clipId={`ma-${lane.row.ticker}`}
                edge="rgba(255,255,255,0.35)"
                r={geom.logoR}
                ticker={lane.row.ticker}
              />
            </g>

            <text
              dy="0.35em"
              fill="rgba(255,255,255,0.9)"
              fontSize={13}
              fontWeight={600}
              x={NAME_X}
            >
              {fitLabel(
                W < 520
                  ? displayTicker(lane.row.ticker)
                  : companyName(lane.row),
                nameW,
                W < 520 ? 7.4 : 6.9,
              )}
            </text>

            <g style={{ color: "rgba(255,255,255,0.82)" }}>
              <PipRects
                pipH={geom.pipH}
                pipW={geom.pipW}
                pips={lane.pips}
                step={geom.step}
                y={-geom.pipH / 2}
              />
            </g>
          </StageMark>
        ))}
      </g>

      {/* Hollow pips are drawn in both arrangements, so their key is too. */}
      {anyHollow ? (
        <text
          className="font-mono"
          fill="rgba(255,255,255,0.4)"
          fontSize={10}
          x={pad.l}
          y={H - 9}
        >
          {HOLLOW_LEGEND}
        </text>
      ) : null}
    </>
  );
}

export function ActivityStage({
  benchmark,
  header,
  linking,
  locale,
  rows,
  symbol,
}: {
  /** "the FTSE All-Share" / "the S&P 500". */
  benchmark: string;
  /** The page's message layer — eyebrow, h1, standfirst, figures. */
  header?: ReactNode;
  linking: Linking;
  locale: string;
  /** Null while the board is loading. */
  rows: CompanyActivity[] | null;
  symbol: string;
}) {
  const board = rows && rows.length ? rows : null;
  const totals = useMemo(() => (board ? activityTotals(board) : null), [board]);
  const byTicker = useMemo(
    () => new Map((board ?? []).map((r) => [r.ticker, r] as const)),
    [board],
  );

  const n = board?.length ?? 0;

  return (
    <BoardStagePanel<Mode>
      caption={(ctx) => {
        if (!board || !totals) return null;

        if (ctx.mode === "purchases") {
          return (
            <p>
              <span className="font-semibold text-white">
                {totals.filings} purchases across {n} companies
              </span>
              , one pip each; {companyName(board[0])} the busiest at{" "}
              {board[0].filings}.{" "}
              <button
                className="text-white/80 underline decoration-white/30 underline-offset-4 hover:text-white"
                type="button"
                onClick={() => ctx.choose("people")}
              >
                See how many people that was →
              </button>
            </p>
          );
        }

        if (totals.broadest === 0) {
          return <p>We don’t have the filer named on these purchases yet.</p>;
        }

        const broad = board.filter((r) => r.insiders >= 4).length;
        const solo = board.filter((r) => r.insiders === 1);
        const widest = board.reduce((best, r) =>
          r.insiders > best.insiders ? r : best,
        );
        const deepestSolo = [...solo].sort((a, b) => b.filings - a.filings)[0];

        if (broad > 0) {
          return (
            <p>
              <span className="font-semibold text-white">
                {broad} of the {n} had four or more different insiders buying
              </span>
              {solo.length > 0
                ? `; ${solo.length} were one person buying repeatedly`
                : ""}
              . {companyName(widest)} is the broadest at {totals.broadest}{" "}
              people over {widest.filings} purchases
              {deepestSolo
                ? `, and ${companyName(deepestSolo)}’s ${deepestSolo.filings} are all one insider`
                : ""}
              .
            </p>
          );
        }

        if (solo.length === 0) {
          return (
            <p>
              The broadest, {companyName(widest)}, had {totals.broadest}{" "}
              different insiders over {widest.filings} purchases.
            </p>
          );
        }

        return (
          <p>
            <span className="font-semibold text-white">
              {solo.length} of the {n} are one person buying repeatedly
            </span>
            ; the broadest, {companyName(widest)}, had {totals.broadest}{" "}
            different insiders over {widest.filings} purchases.
          </p>
        );
      }}
      header={header}
      height={stageHeight}
      linking={linking}
      loading={board === null}
      modes={MODES}
      pad={PAD}
      renderTip={(id) => {
        const tip = byTicker.get(id);

        if (!tip) return null;

        return (
          <>
            <div className="font-semibold">
              {companyName(tip)}{" "}
              <span className="font-mono text-[10px] font-normal text-white/50">
                {displayTicker(tip.ticker)}
              </span>
            </div>
            <div className="text-[11px] text-white/55">
              {tip.filings} purchases · {breadthWords(tip)}
            </div>
            {tip.value >= 500 ? (
              <div className="mt-1 tabular-nums">
                {formatMoney(tip.value, symbol)}
                {tip.lastDate
                  ? ` · last ${shortDate(tip.lastDate, locale)}`
                  : ""}
              </div>
            ) : null}
            {tip.alphaCount > 0 ? (
              <div className="mt-1 text-[11px] text-white/55">
                median {signedPp(tip.medianAlpha)} vs {benchmark}, on{" "}
                {tip.alphaCount} of {tip.filings} with a mark
              </div>
            ) : null}
          </>
        );
      }}
      svgLabel={(mode) =>
        mode === "purchases"
          ? `${n} companies ranked by disclosed purchases, one pip per purchase, grouped by the insider who made it`
          : `The same ${n} companies ordered by how many different insiders bought`
      }
    >
      {(ctx) => (board ? <StageBody ctx={ctx} rows={board} /> : null)}
    </BoardStagePanel>
  );
}
