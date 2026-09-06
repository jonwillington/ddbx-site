/** The cluster board's proof object: 25 buying episodes drawn as
 *  constellations.
 *
 *  A cluster is not a company and not a purchase — it is an event with two
 *  facts about it, how many insiders were in it and how tightly it happened.
 *  So each mark is the company's logo with one dot per NAMED insider ringed
 *  around it, filed into a column per insider count, which makes the shape of
 *  the year legible in one look: a wide base of pairs, a handful of fours, one
 *  board that all bought together.
 *
 *  ONE arrangement, since 2026-09-06. There was a second — a scatter of when
 *  each episode started against how many days it covered — and it answered a
 *  question the page never asks. Nothing above it or below it is ordered by
 *  date, its caption's fallback branch ("every one of these clusters took more
 *  than a day") is a non-finding, and the tightness it drew is one clause of
 *  prose rather than a picture. The fact survives in the caption; the axis
 *  does not.
 *
 *  MONOCHROME, deliberately. Every other board on the site colours a mark by
 *  how the purchase performed; this one must not. The published methodology
 *  ends by saying that several insiders agreeing says nothing about whether
 *  they were right, and a green disc would contradict that sentence from
 *  eighty pixels above it. The only outcome figure on the page is the median
 *  in the tooltip, uncoloured, and only when there is one.
 *
 *  The count on a mark is `named` and never `episode.count`. The pipeline's
 *  own figure disagrees with the names we can list in both directions (QNT
 *  asserts ten against eight, CC seven against four), and a headline the
 *  reader cannot check against the row below it reads as a defect. Dots are
 *  insiders, not filings: Savills is seven purchases by six people, and it
 *  gets six dots. The purchases are stated in the tooltip and on the row.
 */
import type { ClusterEpisode } from "../../../../shared/boards";
import type { Linking } from "../board-model";
import type { StageContext, StageMode, StagePad } from "../stage-panel";
import type { ReactNode } from "react";

import { useMemo } from "react";

import { formatMoney } from "../../../../shared/sectors.js";
import { dateLabel, numberWord, signedPp } from "../board-model";
import { BoardStagePanel } from "../stage-panel";
import { LogoDisc, StageAxis, StageLabel, StageMark } from "../stage-marks";

import { cleanCompanyName, companyPath, displayTicker } from "@/lib/company";

type Mode = "many";

const MODES: ReadonlyArray<StageMode<Mode>> = [
  { id: "many", label: "How many" },
];

/** Deeper at the foot than the panel default: the column labels are two
 *  lines, "6 insiders" over "three clusters". */
const PAD: StagePad = { l: 56, r: 24, t: 68, b: 52 };

/** The edge ring on every disc. One value, because a cluster has no
 *  direction. */
const EDGE = "rgba(255,255,255,0.28)";

/** Gap between two marks in a column, and between two files of one. */
const GAP = 8;

/** A phone gets a taller panel. The columns are the picture, and at 440px
 *  they wrap into files the width cannot hold. */
function stageHeight(W: number): number {
  return W < 520 ? 520 : Math.round(Math.min(660, Math.max(440, W * 0.56)));
}

/** "over 11 days", or "on one day" when every filing landed together — which
 *  is the strongest version of the signal and deserves saying rather than
 *  rendering as "over 0 days". */
export function spanLabel(days: number): string {
  if (days <= 0) return "on one day";
  if (days === 1) return "over two days";

  return `over ${days} days`;
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** An episode's identity on this page.
 *
 *  `ClusterEpisode` carries no id, and the ticker alone is not one — an issuer
 *  with a burst in March and another in July is two events, and the board is a
 *  board of events. The stage and the list rows both derive it here so hover
 *  linking cannot drift apart from what it links. */
export function episodeId(e: ClusterEpisode): string {
  return `${e.ticker}-${e.firstDate ?? ""}`;
}

/** The insiders, as dots.
 *
 *  Evenly spaced on a ring from twelve o'clock, one per named buyer, each
 *  punched out of whatever it crosses by a backing disc in the panel's own
 *  ground. Page-local on purpose: no other board draws people as satellites,
 *  and that exclusivity is what stops a dot meaning two things across the
 *  sweep. Anonymous by construction — the names are on the row, in full, where
 *  they can be read rather than counted. */
export function SatelliteRing({ n, radius }: { n: number; radius: number }) {
  return (
    <g>
      {Array.from({ length: Math.max(0, n) }, (_, i) => {
        const a = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;

        return (
          <g key={i}>
            <circle cx={x} cy={y} fill="var(--stage-bg)" r={4.5} />
            <circle cx={x} cy={y} fill="rgba(255,255,255,0.85)" r={3} />
          </g>
        );
      })}
    </g>
  );
}

interface Mark {
  id: string;
  e: ClusterEpisode;
  /** ISO first filing date, or "" when the episode has none to state. */
  first: string;
}

interface Placed {
  id: string;
  x: number;
  y: number;
}

interface Plot {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

interface CountView {
  placed: Placed[];
  ticks: Array<{ at: number; label: string; sub?: string }>;
  plot: Plot;
  fits: boolean;
  /** The columns are narrower than their words, so the ticks are bare counts
   *  and the axis heading has to carry the noun. */
  terse: boolean;
}

/** One column per distinct insider count present, ascending.
 *
 *  The columns are the data's own — UK runs 2 to 6 and US to 10 — so a market
 *  with no five-insider cluster gets no five column rather than an empty one
 *  asserting a gap. A column too tall for the plot wraps into two or three
 *  files; where even one file will not fit, the stack compresses and the marks
 *  overlap like a pile rather than shrinking to illegibility. */
function countView(
  marks: Mark[],
  W: number,
  H: number,
  pad: StagePad,
  r: number,
): CountView {
  const plot = { x0: pad.l, x1: W - pad.r, y0: pad.t, y1: H - pad.b };
  const outer = r + 10;
  const cell = outer * 2 + GAP;
  const plotW = Math.max(1, plot.x1 - plot.x0);
  const plotH = Math.max(1, plot.y1 - plot.y0);
  const values = [...new Set(marks.map((m) => m.e.named))].sort(
    (a, b) => a - b,
  );
  const slot = plotW / Math.max(1, values.length);
  const placed: Placed[] = [];
  const ticks: CountView["ticks"] = [];
  let fits = cell <= slot;
  // "2 insiders" over "ten clusters" needs a column's width to itself. Where
  // the columns are narrower than the words — a phone puts five of them in
  // 250px — the count alone is the label and the axis heading carries the
  // noun. Five two-line labels printed over each other state nothing.
  const terse = slot < 96;

  values.forEach((named, i) => {
    const inCol = marks
      .filter((m) => m.e.named === named)
      .sort((a, b) => b.e.value - a.e.value);
    const maxFiles = Math.max(1, Math.min(3, Math.floor(slot / cell)));
    let files = 1;

    while (files < maxFiles && Math.ceil(inCol.length / files) * cell > plotH) {
      files += 1;
    }
    const rows = Math.max(1, Math.ceil(inCol.length / files));
    const rowStep = rows > 1 ? Math.min(cell, plotH / rows) : cell;

    if (rows * cell > plotH) fits = false;

    const cx = plot.x0 + (i + 0.5) * slot;

    inCol.forEach((m, k) => {
      placed.push({
        id: m.id,
        x: cx + (Math.floor(k / rows) - (files - 1) / 2) * cell,
        y: plot.y1 - outer - (k % rows) * rowStep,
      });
    });

    ticks.push({
      at: cx,
      label: terse ? String(named) : `${named} insiders`,
      sub: terse
        ? undefined
        : `${numberWord(inCol.length)} ${
            inCol.length === 1 ? "cluster" : "clusters"
          }`,
    });
  });

  return { placed, ticks, plot, fits, terse };
}

/** The largest disc that draws the tallest column without compressing it.
 *
 *  Solved rather than chosen because the shape of the columns is the data's:
 *  a year with twelve two-insider clusters needs smaller marks than one with
 *  four. Floored at 16 on a phone, where no radius fits and the honest answer
 *  is an overlapping stack of legible marks rather than a tidy row of dots. */
function solveRadius(
  marks: Mark[],
  W: number,
  H: number,
  pad: StagePad,
): number {
  const floorR = W < 520 ? 16 : 13;

  for (let r = 26; r >= floorR; r -= 0.5) {
    if (countView(marks, W, H, pad, r).fits) return r;
  }

  return floorR;
}

/** The marks, inside the panel's svg.
 *
 *  A component rather than the panel's render prop run inline: the radius is
 *  solved by trying up to twenty-seven column layouts, and that must not
 *  happen again every time a pointer crosses a row. */
function StageBody({
  ctx,
  marks,
  locale,
  symbol,
}: {
  ctx: StageContext<Mode>;
  marks: Mark[];
  locale: string;
  symbol: string;
}) {
  const { W, H, pad, active } = ctx;

  const r = useMemo(() => solveRadius(marks, W, H, pad), [marks, W, H, pad]);
  const outer = r + 10;
  // The satellite ring's outer edge. The dots sit at r + 7 and are 9 across,
  // so they reach r + 11.5 — past `outer`, which is what the marks are placed
  // and hit-tested on. Anything that has to keep clear of a mark keeps clear
  // of this instead, or it lands on the insiders.
  const reach = outer + 5;
  const count = useMemo(
    () => countView(marks, W, H, pad, r),
    [marks, W, H, pad, r],
  );

  const at = useMemo(
    () => new Map(count.placed.map((p) => [p.id, p] as const)),
    [count],
  );

  const widest = marks[0];

  return (
    <>
      <StageAxis
        plot={count.plot}
        x={count.ticks}
        xLabel={count.terse ? "insiders →" : "insiders in the cluster →"}
      />

      <g>
        {marks.map((m) => {
          const p = at.get(m.id);

          if (!p) return null;

          return (
            <StageMark
              key={m.id}
              anchor={{ x: p.x, y: p.y, r: outer }}
              ariaLabel={`${cleanCompanyName(m.e.company) || displayTicker(m.e.ticker)}, ${m.e.named} insiders bought ${spanLabel(m.e.spanDays)}${
                m.first ? ` from ${dateLabel(m.first, locale)}` : ""
              }, ${m.e.filings} ${
                m.e.filings === 1 ? "purchase" : "purchases"
              }, ${formatMoney(m.e.value, symbol)}`}
              hit={{ shape: "circle", r: outer + 4 }}
              href={companyPath(m.e.ticker)}
              id={m.id}
              x={p.x}
              y={p.y}
            >
              <SatelliteRing n={m.e.named} radius={r + 7} />
              <LogoDisc
                active={active === m.id}
                clipId={`cl-${m.id}`}
                edge={EDGE}
                r={r}
                ticker={m.e.ticker}
              />
              {widest && m.id === widest.id ? (
                <StageLabel
                  visible
                  r={reach}
                  side="above"
                  sub={spanLabel(m.e.spanDays)}
                  text={
                    cleanCompanyName(m.e.company) || displayTicker(m.e.ticker)
                  }
                />
              ) : null}
            </StageMark>
          );
        })}
      </g>
    </>
  );
}

export function ClusterStage({
  episodes,
  symbol,
  benchmark,
  locale,
  noun,
  linking,
  header,
}: {
  /** Null while the board is loading. */
  episodes: ClusterEpisode[] | null;
  /** The page's message layer — eyebrow, h1, standfirst, figures — set inside
   *  the object above the chart. The toggle joins its row. */
  header?: ReactNode;
  symbol: string;
  /** "the FTSE All-Share" / "the S&P 500". */
  benchmark: string;
  locale: string;
  /** "directors" / "insiders" — the plural for people on this market. */
  noun: string;
  linking: Linking;
}) {
  const list = episodes && episodes.length ? episodes : null;

  const marks = useMemo<Mark[] | null>(() => {
    if (!list) return null;

    return list.map((e) => ({
      id: episodeId(e),
      e,
      first: e.firstDate ?? "",
    }));
  }, [list]);

  const byId = useMemo(
    () => new Map((list ?? []).map((e) => [episodeId(e), e] as const)),
    [list],
  );

  const facts = useMemo(() => {
    if (!list) return null;
    const sameDay = list.filter((e) => e.spanDays === 0);

    return {
      n: list.length,
      namedTotal: list.reduce((s, e) => s + e.named, 0),
      widest: list[0],
      sameDay,
      tight: [...sameDay].sort((a, b) => b.named - a.named)[0] ?? null,
    };
  }, [list]);

  const name = (e: ClusterEpisode) =>
    cleanCompanyName(e.company) || displayTicker(e.ticker);

  return (
    <BoardStagePanel<Mode>
      caption={() => {
        if (!facts) return null;
        // Two or fewer clusters and the picture has no shape to describe, so
        // the second clause goes rather than being padded out.
        const detail = facts.n >= 3;

        return (
          <p>
            <span className="font-semibold text-white">
              {facts.namedTotal} named insiders across {facts.n} clusters
            </span>
            , one dot each.
            {detail ? (
              <>
                {" "}
                {name(facts.widest)} is the widest, with{" "}
                {numberWord(facts.widest.named)} {noun}{" "}
                {spanLabel(facts.widest.spanDays)}.
              </>
            ) : null}
            {/* Tightness used to be a whole arrangement. It is one fact, and
                one fact belongs in the sentence: the clause appears only when
                there is a same-day cluster to name, so the caption never has
                to fall back on "every one of these took more than a day",
                which states nothing. */}
            {facts.sameDay.length > 0 && facts.tight ? (
              <>
                {" "}
                {facts.sameDay.length === facts.n
                  ? "Every one of them landed"
                  : `${capitalise(numberWord(facts.sameDay.length))} of them landed`}{" "}
                on a single day, the strongest version of the signal:{" "}
                {name(facts.tight)} had {numberWord(facts.tight.named)} {noun}{" "}
                buy
                {facts.tight.firstDate
                  ? ` on ${dateLabel(facts.tight.firstDate, locale)}`
                  : ""}
                .
              </>
            ) : null}
          </p>
        );
      }}
      header={header}
      height={stageHeight}
      linking={linking}
      loading={marks === null}
      modes={MODES}
      pad={PAD}
      renderTip={(id) => {
        const e = byId.get(id);

        if (!e) return null;

        return (
          <>
            <div className="font-semibold">
              {name(e)}{" "}
              <span className="font-mono text-[10px] font-normal text-white/50">
                {displayTicker(e.ticker)}
              </span>
            </div>
            {/* Where the two counts are stated together, because they differ
                and the difference is the honest part: six people, seven
                purchases. */}
            <div className="text-[11px] text-white/55">
              {e.named} insiders · {e.filings}{" "}
              {e.filings === 1 ? "purchase" : "purchases"} ·{" "}
              {spanLabel(e.spanDays)}
            </div>
            <div className="mt-1 tabular-nums">
              {formatMoney(e.value, symbol)}
              {e.firstDate ? (
                e.spanDays === 0 ? (
                  <> · on {dateLabel(e.firstDate, locale)}</>
                ) : (
                  <>
                    {" "}
                    · from {dateLabel(e.firstDate, locale)} to{" "}
                    {dateLabel(e.lastDate ?? e.firstDate, locale)}
                  </>
                )
              ) : null}
            </div>
            {/* Stated, never coloured, and never when there is no mark to
                state it from. The board does not rank on this. */}
            {e.alphaCount > 0 ? (
              <div className="mt-1 text-[11px] text-white/55">
                median {signedPp(e.medianAlpha)} vs {benchmark} since disclosure
              </div>
            ) : null}
          </>
        );
      }}
      svgLabel={() =>
        facts == null
          ? ""
          : `${facts.n} clusters grouped by how many insiders bought, one dot per insider`
      }
    >
      {(ctx) =>
        marks ? (
          <StageBody ctx={ctx} locale={locale} marks={marks} symbol={symbol} />
        ) : null
      }
    </BoardStagePanel>
  );
}
