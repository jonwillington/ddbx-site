/** The opening picture of /how-it-works: three counts, drawn to scale.
 *
 *  ---------------------------------------------------------------------------
 *  What this replaced and why
 *  ---------------------------------------------------------------------------
 *
 *  The first version of this hero drew the record as a bed of ~80 hairlines,
 *  each standing for ~326 disclosure records, thinning left to right. It was
 *  to scale and it was honest, and it failed the only test that matters here:
 *  a first-time reader could not decode it without the caption that published
 *  the scale. Page grammar 8 says that if a caption is needed to read the
 *  drawing, the drawing is wrong. Three further defects came with it: the
 *  counts sat in a figures band above the object rather than on the bands they
 *  described; the 1,407 survivors were three or four hairlines and read as
 *  nothing at all; and a fourth band, "Sorted / not counted", dissolved into a
 *  gradient because it has no honest count, which left the eye watching a
 *  quantity disappear that was never asserted.
 *
 *  This is the plain version. Three solid columns, heights in one linear
 *  scale from a common baseline, each carrying its own count in large figures
 *  directly above it and its name directly below it. Nothing is encoded. The
 *  reader compares three heights, which is the one comparison the page's whole
 *  argument rests on: the last column is about a twentieth of the first.
 *
 *  ---------------------------------------------------------------------------
 *  The gaps do the explaining
 *  ---------------------------------------------------------------------------
 *
 *  Each column's top level continues right as a dashed leader. The empty band
 *  under that line, beside the shorter column that follows, is annotated with
 *  what left. So the reader is told what the missing quantity IS, in the place
 *  where it is missing, rather than in a legend:
 *
 *    band 1  grants, vestings, option exercises and sales
 *    band 2  the sort — buys that are small, routine, or already explained
 *
 *  The sorting step is deliberately not drawn as a fourth column. Its count is
 *  the difference between two numbers we do have, and every triage table it
 *  would need is either empty or a floor, so a column for it would be a figure
 *  the page cannot stand behind (grammar 7). It is named in the band instead,
 *  which asserts nothing about its size that the two columns either side do
 *  not already assert.
 *
 *  ---------------------------------------------------------------------------
 *  Colour leads the eye to the small block (2026-09-07)
 *  ---------------------------------------------------------------------------
 *
 *  Jon's review of the first light version: "makes sense now but doesn't look
 *  good. Maybe it needs some brown in there." It was two grey slabs and a
 *  brown sliver, and the grey was doing nothing — it said "not the accent"
 *  when the drawing needed it to say "before the accent". So the three columns
 *  are one ramp in the brand family: sand, tan, brown (amber on dark), light to
 *  dark left to right, so the eye is led down the drawing to the smallest
 *  and darkest block, which is the one the page is about. The survivors'
 *  figure is set larger and heavier than the other two and in the same brand
 *  colour as its column, and the specimen mark is drawn INTO the block in the
 *  ground colour, so "one of these 1,407" is literal: there it is, inside.
 *
 *  Still no signed colour anywhere here (the page's census greps this folder
 *  for it; this file returns nothing). The hero states no market outcome.
 *
 *  ---------------------------------------------------------------------------
 *  Two arrangements, one scale
 *  ---------------------------------------------------------------------------
 *
 *  Below ~620px of drawing width the columns become rows: bar lengths in the
 *  same linear scale, read top to bottom, with the bands between them. This is
 *  not the "one view" toggle grammar 6 rules out — a reader at a given width
 *  sees exactly one, there is no control, and the numbers and the scale are
 *  identical. It exists because the band copy needs a measure: at 448px, five
 *  vertical tracks leave about fifteen characters per line for a sentence that
 *  has to say "option exercises".
 */
import type { CSSProperties } from "react";

import { useEffect, useState } from "react";

import {
  SpecimenMark,
  SpecimenMarkSvg,
} from "@/components/how-it-works/specimen-mark";
import { useMeasuredWidth } from "@/components/boards/use-measured-width";
import { count } from "@/lib/coverage";

/** One drawn column. `value` is the count; `prefix` is the honesty qualifier
 *  set small before it ("at least" for the open-market floor, which counts an
 *  unreached row the same as a rejected one). */
export interface ScaleStage {
  key: string;
  value: number;
  prefix?: string;
  label: string;
  sub?: string;
  /** The survivors column, drawn in the brand accent. Exactly one stage. */
  accent?: boolean;
}

/** Gap width as a fraction of a column's width. */
const GAP_RATIO = 0.62;
/** Below this drawing width the columns lie down as rows. Set against the
 *  column tracks rather than a breakpoint: at a 1024px viewport the SEO rail
 *  leaves 560px here, which is three 132px columns with a two-line label under
 *  each and a three-line specimen note under the last. */
const ROWS_BELOW = 620;
/** Headroom above the tallest column, for its figure. */
const NUM_BAND = 64;
/** Gap between a column's top and the figure standing on it. */
const FIG_GAP = 14;
/** How far into the gap the "what leaves" annotation is set. */
const BAND_INSET = 16;
/** The annotation's measure in characters. Must match the `max-w-[38ch]`
 *  on the band paragraph below — Tailwind cannot read a value out of a
 *  template literal, so the two are kept in step by hand. */
const BAND_MEASURE = 38;
/** Clearance kept between that annotation and the figure below it. */
const BAND_SLACK = 22;
/** The survivors' figure, as a multiple of the others. */
const ACCENT_SCALE = 1.3;
/** The specimen mark is drawn inside the survivors' block only when the block
 *  reads as a bar: at least MARK_MIN across (the mark is 16px, plus 2px of
 *  block showing either side) and at least MARK_RUN along. A 24px-by-28px
 *  block on a phone with the mark filling it read as a checkbox, so there the
 *  mark stays in the label line only. */
const MARK_MIN = 20;
const MARK_RUN = 48;

const BASELINE = "border-hairline dark:border-white/[0.12]";
/** A column's level, carried across the gap it drops into. Dashed and in the
 *  brand colour so it reads as a leader for the annotation hanging from it,
 *  not as a grid rule. */
const LEVEL = "border-dashed border-brand-brown/30 dark:border-brand-tan/35";

/** The ramp. One family, light to dark, in the order the reader meets them;
 *  the last is the one every other element points at. */
const RAMP = [
  "bg-brand-tan/35 dark:bg-brand-tan/22",
  "bg-brand-tan dark:bg-brand-tan/55",
];
const ACCENT = "bg-brand-brown dark:bg-brand-amber";
/** The survivors' figure and the mark-in-block, in the column's own colour
 *  and the ground colour respectively. */
const ACCENT_TEXT = "text-brand-brown dark:text-brand-amber";
const GROUND_ON_ACCENT = "text-sheet dark:text-ink";

/** Mount-in: the columns grow from the baseline once, then nothing on this
 *  page moves again (grammar 5). Reduced motion skips straight to the end. */
function useDrawn(ready: boolean): boolean {
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    if (!ready || drawn) return;
    if (
      typeof window === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setDrawn(true);

      return;
    }
    const id = window.requestAnimationFrame(() => setDrawn(true));

    return () => window.cancelAnimationFrame(id);
  }, [ready, drawn]);

  return drawn;
}

/** The count, set at the size the drawing is built around. The survivors'
 *  count is the heaviest thing in the panel after the h1: larger, semibold,
 *  and in the colour of its block. */
function Figure({
  stage,
  size,
  className = "",
  style,
}: {
  stage: ScaleStage;
  size: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <p className={className} style={style}>
      {/* The qualifier sits ABOVE the figure rather than before it: set
          inline, it pushed the figure 50px right of the column it belongs to
          and broke the one alignment the drawing depends on. */}
      {stage.prefix ? (
        <span className="mb-1.5 block font-mono text-[11px] font-semibold uppercase leading-[1.2] tracking-[0.14em] text-foreground/45">
          {stage.prefix}
        </span>
      ) : null}
      <span
        className={`block tabular-nums ${
          stage.accent
            ? `font-semibold tracking-[-0.045em] ${ACCENT_TEXT}`
            : "font-medium tracking-[-0.035em] text-foreground/80"
        }`}
        style={{ fontSize: size, lineHeight: 1 }}
      >
        {count(stage.value)}
      </span>
    </p>
  );
}

/** The name under a column or bar, plus its one-line gloss. */
function StageLabel({ stage }: { stage: ScaleStage }) {
  return (
    <div>
      <p
        className={`text-[16px] leading-[1.25] sm:text-[18px] ${
          stage.accent
            ? "font-semibold text-foreground"
            : "font-medium text-foreground/80"
        }`}
      >
        {stage.label}
      </p>
      {stage.sub ? (
        <p className="mt-1 text-[14px] leading-[1.35] text-foreground/45">
          {stage.sub}
        </p>
      ) : null}
    </div>
  );
}

/** The worked example, at the foot of the column it survived into. */
function SpecimenLine({
  company,
  survivors,
  className = "",
}: {
  company: string;
  survivors: number;
  className?: string;
}) {
  return (
    <p
      className={`flex items-start gap-2 text-[13.5px] leading-[1.45] text-foreground/55 ${className}`}
    >
      <SpecimenMark className="mt-[2px]" />
      <span>
        <span className="font-semibold text-foreground">{company}</span>, one of
        these {count(survivors)}.
      </span>
    </p>
  );
}

/** The specimen mark drawn inside the survivors' block, in the ground colour,
 *  so the block visibly contains the filing the label beneath it names. */
function MarkInBlock({ x, y }: { x: number; y: number }) {
  return (
    <svg
      aria-hidden
      className={`absolute ${GROUND_ON_ACCENT}`}
      height={16}
      style={{ left: x - 8, top: y - 8 }}
      viewBox="0 0 16 16"
      width={16}
    >
      <SpecimenMarkSvg color="currentColor" cx={8} cy={8} />
    </svg>
  );
}

/** What leaves, written in the band it leaves from. Short, quiet, hung from
 *  the level line like an annotation on a drawing rather than set like body
 *  copy. */
function BandNote({
  text,
  size,
  className = "",
  style,
}: {
  text: string;
  size: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <p
      className={`max-w-[38ch] leading-[1.5] text-foreground/60 ${className}`}
      style={{ fontSize: size, ...style }}
    >
      {text}
    </p>
  );
}

export function HeroScaleChart({
  stages,
  bands,
  specimenCompany,
}: {
  /** Two or three stages, largest first. */
  stages: ScaleStage[];
  /** What leaves between one stage and the next. `bands[i]` sits between
   *  `stages[i]` and `stages[i + 1]`, so there is one fewer than stages. */
  bands: string[];
  specimenCompany: string | null;
}) {
  const [ref, W] = useMeasuredWidth<HTMLDivElement>();
  const drawn = useDrawn(W > 0);

  const top = stages[0]?.value ?? 0;
  const survivors = stages[stages.length - 1]?.value ?? 0;

  // A drawing of one column is not a comparison, and a zero denominator has no
  // scale at all. Both are states the page states in words, not in a picture.
  const drawable = stages.length >= 2 && top > 0;

  const rows = W > 0 && W < ROWS_BELOW;
  const baseSize =
    W >= 900 ? 44 : W >= 780 ? 40 : W >= 620 ? 34 : W >= 400 ? 30 : 26;
  const sizeOf = (s: ScaleStage) =>
    s.accent ? Math.round(baseSize * ACCENT_SCALE) : baseSize;
  const bandSize = W >= 700 ? 14 : 13.5;

  const trackTotal = stages.length + (stages.length - 1) * GAP_RATIO;
  const colW = W / trackTotal;
  const gapW = colW * GAP_RATIO;
  const xOf = (i: number) => i * (colW + gapW);

  // The drawing's height is derived, not chosen. Each band has to hold two
  // things stacked: the next column's figure, sitting on that column's top,
  // and this column's "what leaves" annotation, hanging from this column's
  // level line. A height picked from the width alone put the two through each
  // other at 760px, where the band is 34% of a 300px plot and the figure block
  // alone is 56px of it. So: work out what each band needs, divide by the
  // fraction of the plot that band occupies, and take the tallest answer.
  //
  // The clamp assumes the drop at every gap is a real one. Band 1 breaks only
  // if the open-market share climbs past ~0.79 of everything disclosed, which
  // would falsify the page's thesis before it broke its hero.
  const lineH = bandSize * 1.5;
  const figureBlock = (s: ScaleStage) =>
    sizeOf(s) + (s.prefix ? 11 * 1.2 + 6 : 0);

  const H = (() => {
    if (W === 0) return 300;
    let need = W * 0.5;

    for (let i = 0; i < stages.length - 1; i += 1) {
      const drop = (stages[i].value - stages[i + 1].value) / top;

      if (drop <= 0.02) continue;
      const left = xOf(i + 1) + BAND_INSET;
      const chars = Math.max(
        16,
        Math.min(BAND_MEASURE, (W - left) / (bandSize * 0.505)),
      );
      const lines = Math.max(1, Math.ceil((bands[i]?.length ?? 0) / chars));
      const req =
        figureBlock(stages[i + 1]) + FIG_GAP + lines * lineH + BAND_SLACK;

      need = Math.max(need, req / drop);
    }

    return Math.round(Math.min(640, Math.max(300, need)));
  })();

  const barOf = (i: number) =>
    Math.max(4, Math.round((stages[i].value / top) * H));

  const ease = "cubic-bezier(0.2, 0.8, 0.2, 1)";
  const grow = (i: number, axis: "Y" | "X"): CSSProperties => ({
    transform: drawn ? "none" : `scale${axis}(0)`,
    transformOrigin: axis === "Y" ? "bottom" : "left",
    transition: `transform 720ms ${ease} ${i * 120}ms`,
  });
  const fade = (i: number): CSSProperties => ({
    opacity: drawn ? 1 : 0,
    transition: `opacity 520ms ease-out ${i * 120 + 180}ms`,
  });

  if (!drawable) return null;

  return (
    <div ref={ref} className="w-full">
      {W === 0 ? (
        // Holds roughly the arrived geometry rather than collapsing, so the
        // caption below does not jump when the measurement lands.
        <div aria-hidden style={{ height: NUM_BAND + 300 }} />
      ) : rows ? (
        <ol>
          {stages.map((stage, i) => {
            const barW = Math.max((stage.value / top) * W, 4);
            const ROW_H = 28;

            return (
              <li key={stage.key}>
                <Figure size={sizeOf(stage)} stage={stage} style={fade(i)} />
                <div
                  aria-hidden
                  className={`relative mt-3 w-full border-b ${BASELINE}`}
                  style={{ height: ROW_H }}
                >
                  <div
                    className={`absolute inset-y-0 left-0 rounded-r-[3px] ${
                      stage.accent ? ACCENT : RAMP[Math.min(i, RAMP.length - 1)]
                    }`}
                    style={{ width: barW, ...grow(i, "X") }}
                  />
                  {stage.accent &&
                  specimenCompany &&
                  ROW_H >= MARK_MIN &&
                  barW >= MARK_RUN ? (
                    <div style={fade(i)}>
                      <MarkInBlock x={barW / 2} y={ROW_H / 2} />
                    </div>
                  ) : null}
                </div>
                <div className="mt-3" style={fade(i)}>
                  <StageLabel stage={stage} />
                  {stage.accent && specimenCompany ? (
                    <SpecimenLine
                      className="mt-2"
                      company={specimenCompany}
                      survivors={survivors}
                    />
                  ) : null}
                </div>
                {i < stages.length - 1 ? (
                  <BandNote
                    className={`my-6 border-l-2 ${LEVEL} py-0.5 pl-3.5`}
                    size={bandSize}
                    style={fade(i)}
                    text={bands[i]}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <>
          <div className="relative" style={{ height: NUM_BAND + H }}>
            <div
              aria-hidden
              className={`absolute inset-x-0 bottom-0 border-b ${BASELINE}`}
            />

            {stages.map((stage, i) => {
              const barH = barOf(i);
              const x = xOf(i);

              return (
                <div key={stage.key}>
                  {/* This column's level, carried right across the empty
                      ground so the drop to the next one is measurable by eye
                      rather than remembered. */}
                  {i < stages.length - 1 ? (
                    <div
                      aria-hidden
                      className={`absolute border-t ${LEVEL}`}
                      style={{
                        left: x + colW,
                        right: 0,
                        bottom: barH,
                        ...fade(i),
                      }}
                    />
                  ) : null}

                  <Figure
                    className="absolute"
                    size={sizeOf(stage)}
                    stage={stage}
                    style={{ left: x, bottom: barH + FIG_GAP, ...fade(i) }}
                  />

                  <div
                    aria-hidden
                    className={`absolute rounded-t-[4px] ${
                      stage.accent ? ACCENT : RAMP[Math.min(i, RAMP.length - 1)]
                    }`}
                    style={{
                      left: x,
                      width: colW,
                      bottom: 0,
                      height: barH,
                      ...grow(i, "Y"),
                    }}
                  />

                  {stage.accent &&
                  specimenCompany &&
                  barH >= MARK_MIN &&
                  colW >= MARK_RUN ? (
                    <div style={fade(i)}>
                      <MarkInBlock
                        x={x + colW * 0.5}
                        y={NUM_BAND + H - barH / 2}
                      />
                    </div>
                  ) : null}

                  {/* What left, written in the band it left from: under this
                      column's level line, in the ground the next column does
                      not reach. */}
                  {i < stages.length - 1 ? (
                    <BandNote
                      className="absolute"
                      size={bandSize}
                      style={{
                        left: x + colW + BAND_INSET,
                        right: 0,
                        bottom: barH - 12,
                        transform: "translateY(100%)",
                        ...fade(i),
                      }}
                      text={bands[i]}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-3.5 flex items-start">
            {stages.map((stage, i) => (
              <div
                key={stage.key}
                style={{
                  width: colW,
                  marginRight: i < stages.length - 1 ? gapW : 0,
                  ...fade(i),
                }}
              >
                <StageLabel stage={stage} />
                {stage.accent && specimenCompany ? (
                  <SpecimenLine
                    className="mt-2.5"
                    company={specimenCompany}
                    survivors={survivors}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
