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
 *  Each column's top level continues right as a hairline. The empty band under
 *  that line, beside the shorter column that follows, is labelled with what
 *  left. So the reader is told what the missing quantity IS, in the place
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
 *
 *  Colour: foreground ink at two opacities for the first two columns, the
 *  brand accent for the survivors and for the specimen mark. No signed colour
 *  (the page's census greps this folder for it; this file returns nothing).
 */
import type { CSSProperties } from "react";

import { useEffect, useState } from "react";

import { SpecimenMark } from "@/components/how-it-works/specimen-mark";
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
/** How far into the gap the "what leaves" sentence is set. */
const BAND_INSET = 14;
/** The sentence's measure in characters. Must match the `max-w-[44ch]`
 *  on the band paragraph below — Tailwind cannot read a value out of a
 *  template literal, so the two are kept in step by hand. */
const BAND_MEASURE = 44;
/** Clearance kept between that sentence and the figure below it. */
const BAND_SLACK = 20;

const RULE = "border-hairline dark:border-white/[0.09]";

/** Fills for the stages that are not the survivors, darkest last. */
const INK = ["bg-foreground/16", "bg-foreground/32"];
const ACCENT = "bg-brand-brown dark:bg-brand-tan";

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

/** The count, set at the size the drawing is built around. */
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
        <span className="mb-1 block text-[13px] leading-[1.2] text-foreground/50">
          {stage.prefix}
        </span>
      ) : null}
      <span
        className="block font-semibold tabular-nums tracking-[-0.035em] text-foreground"
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
      <p className="text-[16px] font-medium leading-[1.25] text-foreground/85 sm:text-[18px]">
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
      className={`flex items-start gap-1.5 text-[13.5px] leading-[1.45] text-foreground/55 ${className}`}
    >
      <SpecimenMark className="mt-[3px]" />
      <span>
        <span className="font-semibold text-foreground">{company}</span>, one of
        these {count(survivors)}.
      </span>
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
  const figureSize =
    W >= 900 ? 48 : W >= 780 ? 42 : W >= 620 ? 36 : W >= 400 ? 32 : 28;
  const bandSize = W >= 700 ? 14 : 13.5;

  const trackTotal = stages.length + (stages.length - 1) * GAP_RATIO;
  const colW = W / trackTotal;
  const gapW = colW * GAP_RATIO;
  const xOf = (i: number) => i * (colW + gapW);

  // The drawing's height is derived, not chosen. Each band has to hold two
  // things stacked: the next column's figure, sitting on that column's top,
  // and this column's "what leaves" sentence, hanging from this column's
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
    figureSize + (s.prefix ? bandSize * 1.2 + 4 : 0);

  const H = (() => {
    if (W === 0) return 300;
    let need = W * 0.48;

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
          {stages.map((stage, i) => (
            <li key={stage.key}>
              <Figure size={figureSize} stage={stage} style={fade(i)} />
              <div
                aria-hidden
                className={`mt-2.5 w-full border-b ${RULE} pb-0`}
              >
                <div
                  className={`h-[26px] rounded-r-[2px] ${
                    stage.accent ? ACCENT : INK[Math.min(i, INK.length - 1)]
                  }`}
                  style={{
                    width: `${Math.max((stage.value / top) * 100, 0.8)}%`,
                    ...grow(i, "X"),
                  }}
                />
              </div>
              <div className="mt-2.5" style={fade(i)}>
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
                <p
                  className={`my-5 border-l-2 ${RULE} py-0.5 pl-3 text-[13.5px] leading-[1.5] text-foreground/60`}
                  style={fade(i)}
                >
                  {bands[i]}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <>
          <div className="relative" style={{ height: NUM_BAND + H }}>
            <div
              aria-hidden
              className={`absolute inset-x-0 bottom-0 border-b ${RULE}`}
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
                      className={`absolute border-t ${RULE}`}
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
                    size={figureSize}
                    stage={stage}
                    style={{ left: x, bottom: barH + FIG_GAP, ...fade(i) }}
                  />

                  <div
                    aria-hidden
                    className={`absolute rounded-t-[3px] ${
                      stage.accent ? ACCENT : INK[Math.min(i, INK.length - 1)]
                    }`}
                    style={{
                      left: x,
                      width: colW,
                      bottom: 0,
                      height: barH,
                      ...grow(i, "Y"),
                    }}
                  />

                  {/* What left, written in the band it left from: under this
                      column's level line, in the ground the next column does
                      not reach. */}
                  {i < stages.length - 1 ? (
                    <p
                      className="absolute max-w-[44ch] leading-[1.5] text-foreground/60"
                      style={{
                        left: x + colW + BAND_INSET,
                        right: 0,
                        bottom: barH - 12,
                        fontSize: bandSize,
                        transform: "translateY(100%)",
                        ...fade(i),
                      }}
                    >
                      {bands[i]}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-start">
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
