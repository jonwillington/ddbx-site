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
 *  A row is a leaderboard row the full width of the plot: rank, logo and name
 *  in a fixed gutter, the tally in the field beside it, the row's own total at
 *  the end of its run, and how many people made it right-aligned at the far
 *  edge. The tally is the picture; the two numerals are there so no reader has
 *  to count pips to reach a figure the page already holds.
 *
 *  One arrangement, since 2026-09-06. There used to be a second, "By who
 *  bought", which re-sorted the same 25 rows on distinct insiders and
 *  bracketed them into labelled runs. It was the same picture twice: the pips
 *  already say how many people bought, so re-ordering the rows restated the
 *  column rather than adding one, and the reader paid for it with a board that
 *  would not hold still. The finding that arrangement carried — how many of
 *  the 25 were broad and how many were one person repeating — is now a clause
 *  in the caption, where it costs no rearrangement to read. The breadth column
 *  on the right of every row is what makes that possible.
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
import { signedPp } from "../board-model";
import { BoardStagePanel } from "../stage-panel";
import { LogoDisc, StageAxis, StageMark } from "../stage-marks";

import { shortDate } from "@/components/market/market-utils";
import { cleanCompanyName, companyPath, displayTicker } from "@/lib/company";

type Mode = "purchases";

const MODES: ReadonlyArray<StageMode<Mode>> = [
  { id: "purchases", label: "By purchases" },
];

/** Rows are the full width of the plot, so the gutters are thin on both
 *  sides and the vertical padding only has to clear the count labels. A
 *  phone gets thinner still — every pixel here is a pixel off the tally. The
 *  bottom reserves two lines: the tally key always, the hollow key under it
 *  when there is an unattributed purchase on the board. */
function stagePad(W: number): StagePad {
  return W < 520
    ? { l: 14, r: 14, t: 36, b: 44 }
    : { l: 24, r: 24, t: 40, b: 46 };
}

/** Height is a function of the row count, not of the width: 25 rows need the
 *  same vertical room on a phone as on a desktop, and a lane thinner than its
 *  own name is what makes a board of rows read as a smear. */
function stageHeight(W: number): number {
  return Math.round(Math.min(860, Math.max(560, W * 0.78)));
}

/** Rank, logo and name, drawn inside the plot so the pips start at a single
 *  x on every row. A phone gets the ticker instead of the name.
 *
 *  Only the rank's own x is fixed. The logo's centre and the name's start are
 *  DERIVED from the logo radius the layout settled on, because the radius is a
 *  function of the lane height and the lane height is a function of how many
 *  rows there are: hardcoding 22 and 38 against a radius that reaches 11 put
 *  the disc's opaque backing circle (r + 2.5, drawn after the text) over the
 *  second digit of every rank, so the board read "0:", "1(", "2:". */
const RANK_X = 0;

/** Two mono digits at 11px, plus a pixel. */
const RANK_W = 15;

/** The gap either side of the disc. */
const RANK_GAP = 6;
const NAME_GAP = 8;

function gutterWidth(W: number): number {
  return W < 520 ? 104 : W < 860 ? 230 : 300;
}

/** The right-hand column: how many people made the row's purchases, which is
 *  the fact the board is really about. A phone has no room for it and says it
 *  in the tooltip instead. */
function breadthWidth(W: number): number {
  return W < 520 ? 0 : W < 860 ? 66 : 78;
}

/** Room for the run's own total, set immediately after the last pip. */
const COUNT_W = 30;

/** A pip is a tally stroke: tall, narrow, and about a third of its own step,
 *  so a run reads as a run at any density the field allows. The step opens up
 *  to fill the field and closes to 4.2 rather than letting a run overflow —
 *  every purchase keeps a pip, whatever it costs the spacing. */
const PIP_STEP_MAX = 20;
const PIP_STEP_MIN = 4.2;
const PIP_W_MAX = 6;
const PIP_H_MAX = 15;

/** The extra advance at a group boundary, in slots: a 1.7x step gap. */
const GROUP_GAP = 0.7;

const HOLLOW_LEGEND = "filer not named on the filing";

/** The grouping is the whole point of the mark and nothing on the board said
 *  so: a reader could see the gaps and had no way to learn what a gap meant.
 *  Drawn with the mark rather than described, in the same key strip as the
 *  hollow pip, once. */
const TALLY_LEGEND = "one stroke = one purchase · a gap = a different insider";
const TALLY_LEGEND_NARROW = "one stroke = one purchase · a gap = a new insider";

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
  x0 = 0,
  y,
}: {
  pipH: number;
  pipW: number;
  pips: Pip[];
  step: number;
  /** Where slot zero sits. On the stage the tally starts after the name
   *  gutter, and a run drawn from the mark's own origin instead is a run
   *  printed straight through the name it belongs to. */
  x0?: number;
  y: number;
}) {
  const rx = Math.min(1.5, pipW / 2);
  const sw = Math.max(0.8, Math.min(1.6, pipW / 4));

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
            x={x0 + p.at * step + sw / 2}
            y={y + sw / 2}
          />
        ) : (
          <rect
            key={p.at}
            fill="currentColor"
            height={pipH}
            rx={rx}
            width={pipW}
            x={x0 + p.at * step}
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

/** The same fact in the width of the right-hand column, in the vocabulary the
 *  mode B brackets use so the column and the bracket agree. */
function breadthTag(row: CompanyActivity): string {
  if (row.insiders === 0) return "not named";

  return `${row.insiders} insider${row.insiders === 1 ? "" : "s"}`;
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
  /** Just past the last pip, in mark-local coordinates: where the run's own
   *  total is set, and what the tooltip hangs off. */
  endX: number;
}

/** The marks, inside the panel's svg.
 *
 *  A component rather than the render prop run inline: the lane geometry and
 *  every row's pip positions are memoised, and none of it should be redone
 *  because a pointer crossed a row. */
function StageBody({
  ctx,
  rows,
}: {
  ctx: StageContext<Mode>;
  rows: CompanyActivity[];
}) {
  const { W, H, pad } = ctx;
  const gutter = gutterWidth(W);
  const gutterX = pad.l + gutter;
  const plotX1 = W - pad.r;
  const breadthW = breadthWidth(W);

  const geom = useMemo(() => {
    const n = rows.length;
    const plotTop = pad.t;
    const plotH = H - pad.b - pad.t;
    const laneH = plotH / Math.max(1, n);

    // The field is what is left once the name gutter, the run's total and the
    // insider column have taken theirs, and the busiest row is sized to fill
    // it. The step shrinks before a run does: every purchase keeps a pip.
    const tail = COUNT_W + (breadthW > 0 ? breadthW + 12 : 0);
    const field = plotX1 - gutterX - tail - 6;
    const widest = Math.max(1, ...rows.map(slotSpan));
    const step = Math.max(PIP_STEP_MIN, Math.min(PIP_STEP_MAX, field / widest));
    const pipW = Math.min(PIP_W_MAX, Math.max(1.8, step * 0.34));
    const pipH = Math.min(PIP_H_MAX, Math.max(6, laneH - 8));
    const logoR = Math.min(11, Math.max(5, laneH / 2 - 3));

    // Everything in the gutter is measured off the disc that is actually
    // drawn. Below 520 the gutter is 104px and the name would start at ~56,
    // so the rank rail is dropped there rather than squeezed: the list under
    // the stage carries the same numbering.
    const rankW = W < 520 ? 0 : RANK_W;
    const logoCx = rankW + (rankW ? RANK_GAP : 0) + (logoR + 2.5);
    const nameX = logoCx + (logoR + 2.5) + NAME_GAP;

    const pips = rows.map((r) => pipSlots(r.insiderFilings, r.unattributed));

    const lanes: Lane[] = rows.map((row, i) => ({
      row,
      rank: i + 1,
      y: plotTop + laneH * (i + 0.5),
      pips: pips[i],
      endX: gutter + (pips[i][pips[i].length - 1]?.at ?? 0) * step + pipW,
    }));

    // Count rules every five purchases, dropped where they would collide with
    // the "purchases →" kicker in the same band.
    const maxFilings = Math.max(...rows.map((r) => r.filings));
    const ticks: Array<{ at: number; label: string }> = [];

    for (let c = 5; c <= maxFilings; c += 5) {
      const at = gutterX + c * step;

      if (at < plotX1 - Math.max(78, tail + 16)) {
        ticks.push({ at, label: String(c) });
      }
    }

    return {
      lanes,
      laneH,
      logoCx,
      logoR,
      nameX,
      pipH,
      pipW,
      plotTop,
      rankW,
      step,
      ticks,
    };
  }, [rows, W, H, pad, gutter, gutterX, plotX1, breadthW]);

  const lanes = geom.lanes;
  const nameW = gutter - geom.nameX - 14;
  const anyHollow = rows.some((r) => r.unattributed > 0);
  const plot = {
    x0: pad.l,
    x1: plotX1,
    y0: geom.plotTop,
    y1: H - pad.b,
  };

  return (
    <>
      {/* The ruler the runs are read against. `StageAxis` keeps its own tones:
          measured on a settled frame they are the same grey as
          /biggest-buys' and clear AA at 5.3:1, and what made them look dim was
          the tally printed across the rows, not the axis. */}
      <StageAxis
        plot={plot}
        x={geom.ticks}
        xLabel="purchases →"
        xLabelsAt="top"
      />

      {/* The rows. One mark per company, never a person and never a filing. */}
      <g>
        {lanes.map((lane) => (
          <StageMark
            key={lane.row.ticker}
            anchor={{ x: pad.l + lane.endX, y: lane.y, r: 24 }}
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
            {geom.rankW > 0 ? (
              <text
                className="font-mono tabular-nums"
                dy="0.35em"
                fill={
                  lane.rank <= 3
                    ? "rgba(255,255,255,0.92)"
                    : "rgba(255,255,255,0.5)"
                }
                fontSize={11}
                x={RANK_X}
              >
                {String(lane.rank).padStart(2, "0")}
              </text>
            ) : null}

            <g style={{ transform: `translate(${geom.logoCx}px, 0px)` }}>
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
              x={geom.nameX}
            >
              {fitLabel(
                W < 520
                  ? displayTicker(lane.row.ticker)
                  : companyName(lane.row),
                nameW,
                W < 520 ? 7.4 : 6.9,
              )}
            </text>

            {/* The tally, starting where the gutter ends so a run never
                crosses the name it belongs to. */}
            <g style={{ color: "rgba(255,255,255,0.94)" }}>
              <PipRects
                pipH={geom.pipH}
                pipW={geom.pipW}
                pips={lane.pips}
                step={geom.step}
                x0={gutter}
                y={-geom.pipH / 2}
              />
            </g>

            {/* The run's own total, set against it rather than counted. */}
            <text
              className="font-mono tabular-nums"
              dy="0.35em"
              fill="rgba(255,255,255,0.72)"
              fontSize={11}
              paintOrder="stroke"
              stroke="var(--stage-bg)"
              strokeLinejoin="round"
              strokeWidth={3}
              x={lane.endX + 9}
            >
              {lane.row.filings}
            </text>

            {breadthW > 0 ? (
              <text
                className="font-mono"
                dy="0.35em"
                fill="rgba(255,255,255,0.6)"
                fontSize={10.5}
                textAnchor="end"
                x={plotX1 - pad.l}
              >
                {breadthTag(lane.row)}
              </text>
            ) : null}
          </StageMark>
        ))}
      </g>

      {/* The key, and it draws the marks rather than describing them: two
          strokes, a gap, one stroke — which is exactly a row that had two
          purchases from one person and one from another. The hollow pip sits
          on the line under it when the board carries any. */}
      <g style={{ color: "rgba(255,255,255,0.78)" }}>
        <PipRects
          pipH={9}
          pipW={2.6}
          pips={pipSlots([2, 1], 0)}
          step={5.5}
          x0={pad.l}
          y={H - 39}
        />
        <text
          className="font-mono"
          fill="rgba(255,255,255,0.6)"
          fontSize={W < 520 ? 9.5 : 10}
          x={pad.l + 26}
          y={H - 31}
        >
          {W < 520 ? TALLY_LEGEND_NARROW : TALLY_LEGEND}
        </text>
      </g>

      {anyHollow ? (
        <g style={{ color: "rgba(255,255,255,0.7)" }}>
          <rect
            fill="none"
            height={9}
            rx={1.2}
            stroke="currentColor"
            strokeWidth={1.2}
            width={Math.max(3, geom.pipW)}
            x={pad.l}
            y={H - 17}
          />
          <text
            className="font-mono"
            fill="rgba(255,255,255,0.6)"
            fontSize={10}
            x={pad.l + Math.max(3, geom.pipW) + 8}
            y={H - 9}
          >
            {HOLLOW_LEGEND}
          </text>
        </g>
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
      caption={() => {
        if (!board || !totals) return null;

        // One sentence carrying both findings, because there is now one
        // arrangement to carry them: the scale of the board, then the thing
        // the second arrangement used to be for — how many of these are a
        // board acting together and how many are one person repeating.
        const lead = (
          <span className="font-semibold text-white">
            {totals.filings} purchases across {n} companies
          </span>
        );

        if (totals.broadest === 0) {
          return (
            <p>
              {lead}, one stroke each. We don’t have the filer named on these
              purchases yet, so the runs are undivided.
            </p>
          );
        }

        const broad = board.filter((r) => r.insiders >= 4).length;
        const solo = board.filter((r) => r.insiders === 1);
        const widest = board.reduce((best, r) =>
          r.insiders > best.insiders ? r : best,
        );

        if (broad > 0) {
          return (
            <p>
              {lead}, one stroke each. {broad} had four or more different
              insiders buying
              {solo.length > 0
                ? `; ${solo.length} ${solo.length === 1 ? "was" : "were"} one person buying repeatedly`
                : ""}
              . {companyName(widest)} is the broadest at {totals.broadest}{" "}
              people over {widest.filings} purchases.
            </p>
          );
        }

        if (solo.length === 0) {
          return (
            <p>
              {lead}, one stroke each. The broadest, {companyName(widest)}, had{" "}
              {totals.broadest} different insiders over {widest.filings}{" "}
              purchases.
            </p>
          );
        }

        return (
          <p>
            {lead}, one stroke each. {solo.length} of the {n} are one person
            buying repeatedly; the broadest, {companyName(widest)}, had{" "}
            {totals.broadest} different insiders over {widest.filings}{" "}
            purchases.
          </p>
        );
      }}
      header={header}
      height={stageHeight}
      linking={linking}
      loading={board === null}
      modes={MODES}
      pad={stagePad}
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
      skeletonRows={25}
      skeletonShape="rows"
      svgLabel={() =>
        `${n} companies ranked by disclosed purchases, one pip per purchase, grouped by the insider who made it`
      }
    >
      {(ctx) => (board ? <StageBody ctx={ctx} rows={board} /> : null)}
    </BoardStagePanel>
  );
}
