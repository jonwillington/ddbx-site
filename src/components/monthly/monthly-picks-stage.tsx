/** The monthly report's proof object: our own previous picks, re-marked.
 *
 *  Every other board on the site draws the market. This one draws us. The
 *  report card grades the picks we published a month ago against the latest
 *  close and prints the misses beside the hits, which is the strongest thing
 *  on the site and, until now, an eleven-row list of small grey percentages
 *  three screens down the page. Drawn, it is the only hero the report could
 *  honestly have: the h1 sits over a picture of how the last set of calls
 *  actually went, above the fold, before a word of this month's writing.
 *
 *  Two marks per pick, which is the whole point. The logo disc sits at the
 *  return NOW, ringed in the direction that return went; the hollow ring above
 *  or below it is where the same pick stood when we published it, and the stem
 *  between them is the re-marking (`StageTravel`). A pick published at +27%
 *  and now −8% is a long fall, and nobody has to subtract anything.
 *
 *  The horizontal axis is an ordinal, not a quantity: picks sorted by return
 *  now, best at the left. There is no second thing to plot them against — the
 *  wire format's report-card item carries a ticker, a company, an entry price
 *  and two returns, and nothing else (MonthlyReportCardItem in types/ddbx.ts).
 *  So the picture makes exactly one claim, which the axis label states in
 *  words, rather than borrowing a spare dimension to look busier.
 *
 *  Page-only. It must never be mounted inside `MonthlyRecapModal`: the modal
 *  is a narrow read over the market home, the panel measures its own width and
 *  reserves 440-660px of height for the drawing, and the recap already carries
 *  this month's numbers in the container-query card grid. The only importer is
 *  `src/pages/report.tsx`.
 */
import type { ReactNode } from "react";
import type {
  StageContext,
  StageMode,
  StagePad,
} from "@/components/boards/stage-panel";

import { useMemo } from "react";
import { Link } from "react-router-dom";

import { direction } from "@/components/boards/board-model";
import { BoardStagePanel } from "@/components/boards/stage-panel";
import {
  alphaTicks,
  LogoDisc,
  placeLabels,
  SignedAxis,
  StageLabel,
  StageMark,
  stageTone,
  StageTravel,
} from "@/components/boards/stage-marks";
import { displayTicker } from "@/lib/company";
import { formatSignedPct } from "@/lib/performance/format";

/** One graded pick. `then` and `now` are ratios, as the wire format carries
 *  them: 0.12 is +12%. */
export interface Pick {
  id: string;
  ticker: string;
  company: string;
  /** Where the pick stood when we published it. Null on the fallback stage,
   *  which grades this month's own featured buys and so has no earlier mark to
   *  travel from. */
  then: number | null;
  /** Where it stands at `asOf`. Null when the price series is too thin to
   *  mark — such a pick is not drawn, and the caption says how many. */
  now: number | null;
  href: string;
}

type Mode = "picks";

/** One arrangement, so the panel renders no toggle. There is no second way to
 *  lay a set of graded returns out that says anything the first doesn't. */
const MODES: ReadonlyArray<StageMode<Mode>> = [
  { id: "picks", label: "How they did" },
];

const PAD: StagePad = { l: 56, r: 24, t: 68, b: 44 };

/** Ratio → "+20%". The rows under this stage print percentages and so does
 *  every figure in the report, so the axis does too; "pp" on the chart and "%"
 *  in the list is one page speaking two languages about one number. The
 *  precedent is `pctTick` on the sectors stage. */
function pctTick(v: number): string {
  return v === 0 ? "level" : `${v > 0 ? "+" : ""}${Math.round(v * 100)}%`;
}

interface Placed extends Pick {
  /** Never null: only marked picks reach here. */
  mark: number;
  x: number;
  y: number;
  r: number;
  /** Offset from the disc to the publication ring, or null with no earlier
   *  mark. */
  dy: number | null;
}

function Body({
  ctx,
  picks,
  hits,
  misses,
}: {
  ctx: StageContext<Mode>;
  /** Marked picks only, already sorted best first. */
  picks: Pick[];
  hits: number;
  misses: number;
}) {
  const { W, H, pad, active } = ctx;
  const wide = W >= 520;

  const { layout, amin, amax, plot } = useMemo(() => {
    const box = { x0: pad.l, x1: W - pad.r, y0: pad.t, y1: H - pad.b };
    // Zero is always in the domain, so the level line is always on the
    // picture — a card where every pick went up still has to show the line it
    // beat. Both marks are in it, so the publication ring never sits off the
    // top of the plot with its stem running to nowhere.
    const values = [
      0,
      ...picks.map((p) => p.now ?? 0),
      ...picks.map((p) => p.then).filter((v): v is number => v != null),
    ];
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const span = Math.max(hi - lo, 0.04);
    const lowBound = lo - span * 0.1;
    const highBound = hi + span * 0.1;
    const y = (v: number) =>
      box.y0 + ((highBound - v) / (highBound - lowBound)) * (box.y1 - box.y0);

    const step = (box.x1 - box.x0) / Math.max(1, picks.length);
    // Sized off the column so a card of four discs is not the same picture as
    // a card of twelve overlapping ones.
    const r = Math.max(9, Math.min(wide ? 20 : 13, step / 2 - 5));

    return {
      amin: lowBound,
      amax: highBound,
      plot: box,
      layout: picks.map((p, i): Placed => {
        const mark = p.now as number;
        const cy = y(mark);

        return {
          ...p,
          mark,
          x: box.x0 + (i + 0.5) * step,
          y: cy,
          r,
          dy: p.then == null ? null : y(p.then) - cy,
        };
      }),
    };
  }, [picks, W, H, pad, wide]);

  // Every pick is named where there is room for a name. A report card is a
  // handful of rows, not a board of 25, and a scorecard whose losers are the
  // unlabelled discs would be the exact failure the section exists to avoid —
  // so the candidates are ordered worst first, and the ones that get dropped
  // for want of space are the winners.
  const named = useMemo(() => {
    const cands = [...layout]
      .sort((a, b) => a.mark - b.mark)
      .map((p) => ({
        id: p.id,
        key: p.ticker,
        x: p.x,
        y: p.y,
        r: p.r,
        text: displayTicker(p.ticker),
        sub: formatSignedPct(p.mark),
      }));

    return placeLabels(cands, {
      obstacles: layout,
      xMin: pad.l,
      xMax: W - 6,
      cap: layout.length,
      // No "above" on a phone: the best pick sits a few pixels under the top
      // of the plot, and a label stacked over it lands in the band captions.
      sides: wide ? undefined : ["right", "left"],
      width: (c) =>
        Math.max(c.text.length * 6.7, (c.sub?.length ?? 0) * 6.2) + 6,
    });
  }, [layout, pad, W, wide]);

  return (
    <>
      <SignedAxis
        crossLabel={
          wide
            ? "best → worst since we published"
            : `ranked 1 → ${layout.length}`
        }
        labelGutter={pad.l - 10}
        negLabel={<>down · {misses}</>}
        plot={plot}
        posLabel={<>up · {hits}</>}
        scale={(v) =>
          plot.y0 + ((amax - v) / (amax - amin)) * (plot.y1 - plot.y0)
        }
        tickLabel={pctTick}
        ticks={alphaTicks(amin, amax)}
      />

      <g>
        {layout.map((p) => {
          const side = named.get(p.id);

          return (
            <StageMark
              key={p.id}
              anchor={{ x: p.x, y: p.y, r: p.r }}
              ariaLabel={
                p.then == null
                  ? `${p.company}, ${formatSignedPct(p.mark)} since we featured it`
                  : `${p.company}, ${formatSignedPct(p.then)} when we published it, ${formatSignedPct(p.mark)} now`
              }
              hit={{ shape: "circle", r: p.r + 8 }}
              href={p.href}
              id={p.id}
              x={p.x}
              y={p.y}
            >
              <StageTravel dy={p.dy} r={p.r} />
              <LogoDisc
                active={active === p.id}
                clipId={`pick-${p.id}`}
                edge={stageTone(direction(p.mark))}
                r={p.r}
                ticker={p.ticker}
              />
              {side ? (
                <StageLabel
                  r={p.r}
                  side={side}
                  sub={formatSignedPct(p.mark)}
                  text={displayTicker(p.ticker)}
                />
              ) : null}
            </StageMark>
          );
        })}
      </g>
    </>
  );
}

export function MonthlyPicksStage({
  picks,
  hits,
  misses,
  asOf,
  graded,
  header,
}: {
  /** Null while the report is in flight — the panel draws its field stand-in
   *  at the height the picture will arrive at. */
  picks: Pick[] | null;
  /** Counted by the caller, not here. On a report card these are the API's own
   *  `hits` and `misses`, which are the figures the rest of the page quotes;
   *  recomputing them would be a second chance to print a different number. */
  hits: number;
  misses: number;
  /** "1 August 2026" — the date the current marks were taken. */
  asOf: string;
  /** The month being graded and its own report, when this is a report card.
   *  Absent on the fallback, where the picks are this month's own featured
   *  buys and there is nothing earlier to link to. */
  graded?: { label: string; href: string };
  /** Eyebrow, h1, standfirst and figures, set inside the object. */
  header: ReactNode;
}) {
  // Sorted best first, and only the picks that have a mark. A pick with no
  // return now has no height on this axis; drawing it at zero would state a
  // flat month we did not measure, which is the second static-page rule.
  const marked = useMemo(
    () =>
      picks == null
        ? null
        : picks
            .filter((p) => p.now != null)
            .sort((a, b) => (b.now as number) - (a.now as number)),
    [picks],
  );
  const unmarked =
    picks == null || marked == null ? 0 : picks.length - marked.length;
  const rows = marked && marked.length > 0 ? marked : null;
  const total = hits + misses;

  return (
    <BoardStagePanel<Mode>
      caption={() =>
        rows == null ? null : (
          <p>
            <span className="font-semibold text-white">
              {hits} of {total} featured buys were up as of {asOf}
            </span>
            {graded ? (
              <>
                {". Those are the picks we published in "}
                <Link
                  className="text-white/80 underline decoration-white/30 underline-offset-4 hover:text-white"
                  to={graded.href}
                >
                  {graded.label}
                </Link>
                {", re-marked against the latest close."}
              </>
            ) : (
              ", marked from each buy’s disclosure-day close."
            )}
            {unmarked > 0 ? (
              <>
                {" "}
                {unmarked === 1
                  ? "One more has no mark yet"
                  : `${unmarked} more have no mark yet`}
                , so {unmarked === 1 ? "it is" : "they are"} not on the picture.
              </>
            ) : null}
          </p>
        )
      }
      header={header}
      loading={picks === null}
      modes={MODES}
      pad={PAD}
      renderTip={(id) => {
        const p = rows?.find((r) => r.id === id);

        if (!p) return null;

        return (
          <>
            <div className="font-semibold">
              {p.company}{" "}
              <span className="font-mono text-[10px] font-normal text-white/50">
                {displayTicker(p.ticker)}
              </span>
            </div>
            <div className="mt-1 tabular-nums">
              <span style={{ color: stageTone(direction(p.now)) }}>
                {formatSignedPct(p.now)} now
              </span>
            </div>
            {p.then != null ? (
              <div className="text-[11px] tabular-nums text-white/55">
                {formatSignedPct(p.then)} when we published it
              </div>
            ) : null}
          </>
        );
      }}
      skeletonShape="field"
      svgLabel={() =>
        rows == null
          ? ""
          : graded
            ? `The ${total} buys featured in ${graded.label}, ranked by how they stand as of ${asOf}, each drawn beside where it stood when we published it`
            : `This month’s ${total} featured buys, ranked by how they stand as of ${asOf}`
      }
    >
      {(ctx) =>
        rows == null ? null : (
          <Body ctx={ctx} hits={hits} misses={misses} picks={rows} />
        )
      }
    </BoardStagePanel>
  );
}
