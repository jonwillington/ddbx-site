/** The cluster board's proof object: 25 buying episodes drawn as
 *  constellations.
 *
 *  A cluster is not a company and not a purchase — it is an event with two
 *  facts about it, how many insiders were in it and how tightly it happened.
 *  So each mark is the company's logo with one dot per NAMED insider ringed
 *  around it, and the two arrangements are the two facts. "How many" files
 *  the marks into a column per insider count, which makes the shape of the
 *  year legible in one look: a wide base of pairs, a handful of fours, one
 *  board that all bought together. "When" sends the same marks to a scatter —
 *  when the buying started across, how many days it covered down — so a
 *  cluster that happened in a single morning sits hard against the top rule
 *  and one that dribbled over four weeks sits at the bottom.
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
import type { Side } from "../stage-marks";
import type { ReactNode } from "react";

import { useMemo } from "react";

import { formatMoney } from "../../../../shared/sectors.js";
import { dateLabel, numberWord, signedPp } from "../board-model";
import { BoardStagePanel } from "../stage-panel";
import {
  LogoDisc,
  placeLabels,
  StageAxis,
  StageLabel,
  StageMark,
} from "../stage-marks";

import { cleanCompanyName, companyPath, displayTicker } from "@/lib/company";

type Mode = "many" | "when";

const MODES: ReadonlyArray<StageMode<Mode>> = [
  { id: "many", label: "How many" },
  { id: "when", label: "When" },
];

/** Deeper at the foot than the panel default: the column labels are two
 *  lines, "6 insiders" over "three clusters". */
const PAD: StagePad = { l: 56, r: 24, t: 68, b: 52 };

/** The span rules are labelled in words — "a fortnight", "three weeks" — and
 *  those do not fit the panel's 56px left gutter. The time view insets its own
 *  plot rather than widening the pad, which would push the column view's
 *  marks off-centre for a gutter it has no labels in. */
const TIME_GUTTER = 30;

/** The edge ring on every disc. One value, because a cluster has no
 *  direction. */
const EDGE = "rgba(255,255,255,0.28)";

const SPAN_RULES: Array<{ days: number; label: string }> = [
  { days: 0, label: "same day" },
  { days: 7, label: "a week" },
  { days: 14, label: "a fortnight" },
  { days: 21, label: "three weeks" },
  { days: 28, label: "four weeks" },
];

const MS_DAY = 86_400_000;

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

function dayOf(iso: string): number {
  const t = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

  return Number.isFinite(t) ? Math.round(t / MS_DAY) : NaN;
}

function monthStartDay(ym: string): number {
  return dayOf(`${ym}-01`);
}

function nextMonth(ym: string): string {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(5, 7));

  return m >= 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

function monthsFrom(firstYm: string, lastYm: string): string[] {
  const out: string[] = [];
  let ym = firstYm;

  // Bounded rather than trusted: two unparseable dates would otherwise spin.
  for (let i = 0; i < 240; i++) {
    out.push(ym);
    if (ym >= lastYm) break;
    ym = nextMonth(ym);
  }

  return out;
}

/** "Mar", with the year added only when it isn't the current one. */
function monthLabel(ym: string, locale: string): string {
  const d = new Date(`${ym}-01T00:00:00Z`);
  const label = d.toLocaleDateString(locale, {
    month: "short",
    timeZone: "UTC",
  });

  return ym.slice(0, 4) !== String(new Date().getFullYear())
    ? `${label} ${ym.slice(0, 4)}`
    : label;
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
  day: number;
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
  ticks: Array<{ at: number; label: string; sub: string }>;
  plot: Plot;
  fits: boolean;
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
      label: `${named} insiders`,
      sub: `${numberWord(inCol.length)} ${
        inCol.length === 1 ? "cluster" : "clusters"
      }`,
    });
  });

  return { placed, ticks, plot, fits };
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

interface TimeView {
  placed: Placed[];
  months: Array<{ at: number; label: string }>;
  spans: Array<{ at: number; label: string }>;
  fortnightY: number;
  plot: Plot;
}

/** When the buying started, and how long it ran.
 *
 *  The day axis is snapped to the containing months of the earliest and latest
 *  episode DRAWN, not to the twelve months the board covers. Drawing the full
 *  window would put empty stretches either side of the marks, and an empty
 *  stretch on a time axis is a claim: it would say no clusters happened then
 *  about the thirty-six qualifying episodes this board does not list. */
function timeView(
  marks: Mark[],
  W: number,
  H: number,
  pad: StagePad,
  r: number,
  locale: string,
): TimeView {
  const plot = {
    x0: pad.l + TIME_GUTTER,
    x1: W - pad.r,
    y0: pad.t,
    y1: H - pad.b,
  };
  const outer = r + 10;
  const usableW = Math.max(1, plot.x1 - plot.x0 - outer * 2);
  const usableH = Math.max(1, plot.y1 - plot.y0 - outer * 2);
  const dated = marks
    .map((m) => m.first)
    .filter(Boolean)
    .sort();
  const firstYm = dated[0]?.slice(0, 7) ?? "";
  const lastYm = dated[dated.length - 1]?.slice(0, 7) ?? firstYm;
  const dayMin = firstYm ? monthStartDay(firstYm) : 0;
  const dayMax = firstYm ? monthStartDay(nextMonth(lastYm)) : 1;
  const days = Math.max(1, dayMax - dayMin);
  const xs = (day: number) =>
    plot.x0 +
    outer +
    ((Number.isFinite(day) ? day - dayMin : 0) / days) * usableW;
  const spanMax = Math.max(28, ...marks.map((m) => m.e.spanDays));
  const ys = (d: number) => plot.y0 + outer + (d / spanMax) * usableH;

  const pts = marks.map((m) => ({
    id: m.id,
    x: xs(m.day),
    y: ys(m.e.spanDays),
  }));

  // Two clusters that started the same week and ran the same length draw as
  // one mark. Ease them apart, then clamp: a mark must not leave the day and
  // the span it sits on, and a picture that reads is worth less than one a
  // reader can trust.
  for (let it = 0; it < 30; it++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i];
        const b = pts[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        const min = outer * 2 + 2;

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
    const ox = xs(marks[i].day);
    const oy = ys(marks[i].e.spanDays);

    p.x = Math.max(ox - 12, Math.min(ox + 12, p.x));
    p.y = Math.max(oy - 8, Math.min(oy + 8, p.y));
  });

  return {
    placed: pts,
    months: firstYm
      ? monthsFrom(firstYm, lastYm).map((ym) => ({
          at: xs(monthStartDay(ym)),
          label: monthLabel(ym, locale),
        }))
      : [],
    spans: SPAN_RULES.filter((s) => s.days <= spanMax).map((s) => ({
      at: ys(s.days),
      label: s.label,
    })),
    fortnightY: ys(14),
    plot,
  };
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
  const { W, H, pad, mode, active } = ctx;

  const r = useMemo(() => solveRadius(marks, W, H, pad), [marks, W, H, pad]);
  const outer = r + 10;
  const count = useMemo(
    () => countView(marks, W, H, pad, r),
    [marks, W, H, pad, r],
  );
  const time = useMemo(
    () => timeView(marks, W, H, pad, r, locale),
    [marks, W, H, pad, r, locale],
  );

  const layout = mode === "many" ? count.placed : time.placed;
  const at = useMemo(
    () => new Map(layout.map((p) => [p.id, p] as const)),
    [layout],
  );

  // Three names in the time view: the widest cluster, the tightest one that
  // still had the most people in it, and the one that took longest. Those are
  // the three the caption talks about, and a picture with three names on it
  // reads where the same picture with twenty-five does not.
  const named = useMemo<Map<string, LabelSpec>>(() => {
    if (mode !== "when") return new Map();
    const sameDay = marks
      .filter((m) => m.e.spanDays === 0)
      .sort((a, b) => b.e.named - a.e.named);
    const spread = [...marks].sort((a, b) => b.e.spanDays - a.e.spanDays);
    const cands = [marks[0], sameDay[0], spread[0]]
      .filter((m): m is Mark => Boolean(m))
      .map((m) => {
        const p = time.placed.find((q) => q.id === m.id);

        if (!p) return null;

        return {
          id: m.id,
          x: p.x,
          y: p.y,
          r: outer,
          text: cleanCompanyName(m.e.company) || displayTicker(m.e.ticker),
          sub: `${m.e.named} insiders, ${spanLabel(m.e.spanDays)}`,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c != null);
    const sides = placeLabels(cands, {
      obstacles: time.placed.map((p) => ({ x: p.x, y: p.y, r: outer })),
      xMin: pad.l,
      xMax: W - 6,
      cap: 3,
      width: (c) => Math.max(c.text.length * 6.6, c.sub.length * 6) + 8,
    });

    return new Map(
      cands
        .filter((c) => sides.has(c.id))
        .map(
          (c) =>
            [
              c.id,
              {
                side: sides.get(c.id) ?? "right",
                text: c.text,
                sub: c.sub,
              },
            ] as const,
        ),
    );
  }, [mode, marks, time, outer, pad, W]);

  const widest = marks[0];

  return (
    <>
      <g
        className="transition-opacity duration-700"
        style={{ opacity: mode === "many" ? 1 : 0 }}
      >
        <StageAxis plot={count.plot} x={count.ticks} />
      </g>

      <g
        className="transition-opacity duration-700"
        style={{ opacity: mode === "when" ? 1 : 0 }}
      >
        <StageAxis
          emphasise={[time.fortnightY]}
          plot={time.plot}
          x={time.months}
          y={time.spans}
        />
        {/* The rule readers ask about: an episode anchored on one filing
            reaches a fortnight either way, so four weeks is inside the rule
            rather than a breach of it. Only where there is room to say it. */}
        {W >= 700 ? (
          <text
            className="font-mono"
            fill="rgba(255,255,255,0.4)"
            fontSize={10}
            textAnchor="end"
            x={time.plot.x1}
            y={time.fortnightY - 7}
          >
            ±14 days from the anchor filing, so an episode can reach four weeks
          </text>
        ) : null}
      </g>

      <g>
        {marks.map((m) => {
          const p = at.get(m.id);

          if (!p) return null;
          const label = named.get(m.id);

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
                  r={outer}
                  side="above"
                  sub={spanLabel(m.e.spanDays)}
                  text={
                    cleanCompanyName(m.e.company) || displayTicker(m.e.ticker)
                  }
                  visible={mode === "many"}
                />
              ) : null}
              {label ? (
                <StageLabel
                  r={outer}
                  side={label.side}
                  sub={label.sub}
                  text={label.text}
                  visible={mode === "when"}
                />
              ) : null}
            </StageMark>
          );
        })}
      </g>
    </>
  );
}

interface LabelSpec {
  side: Side;
  text: string;
  sub: string;
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

    return list.map((e) => {
      const first = e.firstDate ?? "";

      return { id: episodeId(e), e, first, day: dayOf(first) };
    });
  }, [list]);

  const byId = useMemo(
    () => new Map((list ?? []).map((e) => [episodeId(e), e] as const)),
    [list],
  );

  const facts = useMemo(() => {
    if (!list) return null;
    const sameDay = list.filter((e) => e.spanDays === 0);
    const bySpan = [...list].sort((a, b) => a.spanDays - b.spanDays);

    return {
      n: list.length,
      namedTotal: list.reduce((s, e) => s + e.named, 0),
      widest: list[0],
      sameDay,
      tight: [...sameDay].sort((a, b) => b.named - a.named)[0] ?? null,
      tightest: bySpan[0] ?? null,
      spread: bySpan[bySpan.length - 1] ?? null,
    };
  }, [list]);

  const name = (e: ClusterEpisode) =>
    cleanCompanyName(e.company) || displayTicker(e.ticker);

  return (
    <BoardStagePanel<Mode>
      caption={(ctx) => {
        if (!facts) return null;
        // Two or fewer clusters and the picture has no shape to describe, so
        // the second clause goes rather than being padded out.
        const detail = facts.n >= 3;

        if (ctx.mode === "many") {
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
              ) : null}{" "}
              <button
                className="text-white/80 underline decoration-white/30 underline-offset-4 hover:text-white"
                type="button"
                onClick={() => ctx.choose("when")}
              >
                See when they happened →
              </button>
            </p>
          );
        }

        if (facts.sameDay.length > 0 && facts.tight) {
          return (
            <p>
              <span className="font-semibold text-white">
                {capitalise(numberWord(facts.sameDay.length))} of these{" "}
                {facts.n} clusters happened on a single day
              </span>
              , the strongest version of the signal: {name(facts.tight)} had{" "}
              {numberWord(facts.tight.named)} {noun} buy
              {facts.tight.firstDate
                ? ` on ${dateLabel(facts.tight.firstDate, locale)}`
                : ""}
              .
              {detail && facts.spread ? (
                <>
                  {" "}
                  The most spread out, {name(facts.spread)}, took{" "}
                  {facts.spread.spanDays} days.
                </>
              ) : null}
            </p>
          );
        }

        return (
          <p>
            <span className="font-semibold text-white">
              Every one of these {facts.n} clusters took more than a day.
            </span>
            {detail && facts.tightest && facts.spread ? (
              <>
                {" "}
                The tightest, {name(facts.tightest)}, covered{" "}
                {facts.tightest.spanDays}{" "}
                {facts.tightest.spanDays === 1 ? "day" : "days"}; the most
                spread out, {name(facts.spread)}, took {facts.spread.spanDays}.
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
      svgLabel={(mode) =>
        facts == null
          ? ""
          : mode === "many"
            ? `${facts.n} clusters grouped by how many insiders bought, one dot per insider`
            : `${facts.n} clusters placed by when the buying started and how many days each covered`
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
