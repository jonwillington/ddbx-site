/** The opening of /how-it-works: the record at its real size, and the one
 *  filing that came all the way through it.
 *
 *  ---------------------------------------------------------------------------
 *  Why this object and not the funnel
 *  ---------------------------------------------------------------------------
 *
 *  PipelineDiagram already draws a narrowing, and says so honestly: its widths
 *  are ILLUSTRATIVE (FUNNEL_WIDTHS = [100, 60, 34, 20]) because a drawn
 *  attrition figure is one a reader is entitled to hold us to. That was the
 *  right call for a diagram whose job is to name six stages. It is the wrong
 *  call for the page's opening, where the load-bearing fact is the RATIO — not
 *  that the pipeline narrows, but by how much. Twenty-three thousand records
 *  in, nine hundred read: a fifth-of-the-width last band understates it by a
 *  factor of five.
 *
 *  So this draws it to scale, from counts we actually have, and earns the
 *  right to by publishing the scale: one hairline per N disclosure records,
 *  stated in the caption strip. The reader can hold us to it.
 *
 *  The object is a bed of hairlines, bottom-aligned on a baseline, each one
 *  standing for the same number of records:
 *
 *    band 1  every disclosure record, all five feeds — the full slab
 *    band 2  the ones a classifier confirmed were bought on the open market
 *    band 3  the sorting step, which has NO honest count — so the doomed
 *            threads are not given ends. The whole group dissolves under an
 *            opacity mask across the span; nothing is asserted about where any
 *            individual one stopped, only that most of them did.
 *    band 4  what was read in full and rated — three or four lines, alone
 *
 *  One of those surviving lines is drawn in brand tan and runs the entire
 *  width: the specimen (Vistry / Adam Daniels on UK). It is the introduction
 *  the rest of the page depends on — every "this filing" further down means
 *  this line. Its end carries THE SPECIMEN MARK (filled tan disc, 2px ring of
 *  the same colour at 30%, offset by 2px), which appears nowhere else on the
 *  page except the sections that show the same filing. It is drawn by the
 *  shared SpecimenMarkSvg so the hero's copy and the HTML copies below it
 *  are the same geometry.
 *
 *  ---------------------------------------------------------------------------
 *  What is measured and what is layout
 *  ---------------------------------------------------------------------------
 *
 *  ONE axis carries quantity: the vertical. Height above the baseline is
 *  records, at a constant scale, in every band. The horizontal is stage order
 *  and carries nothing — the four bands are laid out for their labels, not for
 *  their durations. That is the whole grammar of the drawing, which is why it
 *  needs no key.
 *
 *  The triage stop stays unnumbered in the figures band and in the drawing.
 *  `open_market_buys` is a floor (see src/lib/coverage.ts: an unreached row
 *  counts the same as a rejected one), so it is stated with a "≥" and the
 *  caption repeats why.
 *
 *  No market outcome is stated here, so the stage's signed colour pair is not
 *  used at all (the page-level colour census greps for it; this file is meant
 *  to return nothing). The palette is white at four opacities plus brand tan.
 */
import type { ReactNode } from "react";
import type { StagePad } from "@/components/boards/stage-panel";

import { useMemo } from "react";

import { BoardStagePanel } from "@/components/boards/stage-panel";
import { StageFigures } from "@/components/boards/stage-figures";
import { SpecimenMarkSvg } from "@/components/how-it-works/specimen-mark";
import { count } from "@/lib/coverage";

/** The brand accent, fixed rather than theme-read: the panel is #1a140d in
 *  both themes, so the dark-surface token is the right one in both. */
const TAN = "var(--color-brand-tan)";

/** Band boundaries as fractions of the bed's width. Layout only — see header.
 *  The sorting span is the widest because it is the one the eye has to watch
 *  something happen in. */
const SPANS = [0.26, 0.24, 0.28, 0.22];

/** The gap between the lowest hairline and the rule under the bed. */
const PLINTH = 12;

const BANDS: { lines: string[]; sub: string | null }[] = [
  { lines: ["Disclosed"], sub: "all five feeds" },
  { lines: ["Bought on", "the market"], sub: "confirmed" },
  { lines: ["Sorted"], sub: "not counted" },
  { lines: ["Read in full", "and rated"], sub: null },
];

export interface HeroStageProps {
  /** "Methodology". */
  eyebrow: string;
  /** The document's h1 — rendered here, so the page passes `titleInHero`. */
  title: ReactNode;
  /** The shell's standfirst, which the shell does not render under
   *  `titleInHero`. */
  standfirst: ReactNode;
  /** The page's one idea, in the stage's bright line. Kept as a node because
   *  the market vocabulary ("directors" / "insiders") belongs to the page. */
  thesis: ReactNode;
  /** The finding in words, for the caption strip under the drawing: why the
   *  sorting is the whole job. Kept out of the message column, which already
   *  carries a standfirst and a thesis and does not need a third paragraph
   *  saying what the object beneath it draws. */
  finding: ReactNode;
  /** `coverage.totals.disclosures`. */
  disclosures: number;
  /** Open-market buys summed over the markets that report one; 0 when none
   *  does, which withdraws both the figure and the band's step. */
  openMarketFloor: number;
  /** `coverage.totals.analyses`. */
  analyses: number;
  /** The provenance line the page builds (`funnelCaption`). */
  caption: string;
  /** Company name for the worked example, from `examples.specimen`. Null
   *  outside UK/US, which draws the survivors in white and says nothing. */
  specimenCompany?: string | null;
}

interface Bed {
  /** Threads in the full slab. */
  T: number;
  /** Threads still standing after the open-market cut. */
  open: number;
  /** Threads that reach the right-hand edge. */
  rated: number;
  /** Disclosure records per hairline, rounded for the caption. */
  perThread: number;
  pitch: number;
  stroke: number;
  /** Index of the tan thread, or null when there is no specimen. */
  specimenIndex: number | null;
}

/** Threads are sized to the bed rather than fixed, so the hatch keeps the same
 *  density at 470px and at 900px. A thread is only ever a unit of the same
 *  scale in every band — the drawing has no second scale to get wrong. */
function buildBed(
  bedH: number,
  disclosures: number,
  openFloor: number,
  analyses: number,
  hasSpecimen: boolean,
): Bed | null {
  if (disclosures <= 0 || bedH <= 0) return null;

  const T = Math.max(36, Math.min(80, Math.round(bedH / 3.1)));
  const pitch = bedH / T;
  const perThread = disclosures / T;
  // At least one line, or the section that the whole page is about would be
  // drawn as nothing at all. Never more than the slab it came out of.
  const rated =
    analyses > 0
      ? Math.min(T, Math.max(1, Math.round(analyses / perThread)))
      : 0;
  // A floor of 0 means no market reported one; the cut is then not drawn
  // rather than drawn at the full height, which would assert a 100% pass.
  const open =
    openFloor > 0
      ? Math.min(T, Math.max(rated + 1, Math.round(openFloor / perThread)))
      : T;

  return {
    T,
    open,
    rated,
    perThread: Math.round(perThread),
    pitch,
    stroke: Math.max(1, Math.min(2, pitch - 1.25)),
    // The TOP of the surviving cluster, not the bottom. At the bottom the tan
    // line is the lowest thing drawn, and over the first two bands — where it
    // is one hairline in a slab eighty deep — it stops reading as a record and
    // starts reading as a rule underlining the bed.
    specimenIndex: hasSpecimen && rated > 0 ? rated - 1 : null,
  };
}

/** The message column: everything the shell would have rendered above the
 *  page, rendered inside the object instead. Type descends by size, but the
 *  thesis is lifted by weight and brightness rather than by size — a 27px
 *  block under a 54px light h1 fights it. */
function HeroHeader({
  eyebrow,
  title,
  standfirst,
  thesis,
  figures,
}: {
  eyebrow: string;
  title: ReactNode;
  standfirst: ReactNode;
  thesis: ReactNode;
  figures: { k: string; v: string }[];
}) {
  return (
    <>
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
        {eyebrow}
      </p>
      <h1 className="mt-3 max-w-[19ch] text-balance text-[34px] font-normal leading-[1.02] tracking-[-0.03em] text-white sm:text-[46px] lg:text-[54px]">
        {title}
      </h1>
      <p className="mt-5 max-w-[56ch] text-[15px] leading-[1.55] tracking-[-0.004em] text-white/60 sm:text-[15.5px]">
        {standfirst}
      </p>
      <p className="mt-4 max-w-[46ch] text-[17px] font-medium leading-[1.45] tracking-[-0.012em] text-white/92 sm:text-[18.5px]">
        {thesis}
      </p>
      <StageFigures items={figures} />
    </>
  );
}

export function HeroStage({
  eyebrow,
  title,
  standfirst,
  thesis,
  finding,
  disclosures,
  openMarketFloor,
  analyses,
  caption,
  specimenCompany = null,
}: HeroStageProps) {
  // Every slot states a counted number or is left out. There is no third
  // option here — see StageFigures' dev guard.
  const figures = useMemo(() => {
    const out: { k: string; v: string }[] = [];

    if (disclosures > 0) out.push({ k: "Disclosed", v: count(disclosures) });
    if (openMarketFloor > 0)
      out.push({ k: "Bought on market", v: `≥ ${count(openMarketFloor)}` });
    if (analyses > 0) out.push({ k: "Read in full", v: count(analyses) });

    return out;
  }, [disclosures, openMarketFloor, analyses]);

  return (
    <BoardStagePanel
      // The scale is published, not implied. Drawing the real ratio only
      // earns its keep if the reader can check it, so the strip states what
      // one hairline stands for at the width they are actually looking at.
      caption={({ H, pad }) => {
        // The SAME bed height RecordBed derives, PLINTH included. Computing it
        // from the pad alone put a scale in the caption that the drawing was
        // not using — 326 against a drawn 335 at 1440, 443 against 475 at 520.
        const bed = buildBed(
          H - pad.t - pad.b - PLINTH,
          disclosures,
          openMarketFloor,
          analyses,
          false,
        );

        // The finding first, as words, the way every stage caption on the
        // boards reads; then the provenance and the scale, quieter.
        return (
          <>
            <span className="max-w-[58ch] text-white/80">{finding}</span>
            <span className="text-white/45">
              {caption}
              {bed ? (
                <> · One hairline ≈ {count(bed.perThread)} records</>
              ) : null}
            </span>
          </>
        );
      }}
      header={
        <HeroHeader
          eyebrow={eyebrow}
          figures={figures}
          standfirst={standfirst}
          thesis={thesis}
          title={title}
        />
      }
      height={(W) => Math.round(Math.min(400, Math.max(292, W * 0.34)))}
      // The snapshot in src/lib/coverage.ts is a dated measurement, already
      // on screen at first paint, so there is nothing to wait for and a
      // skeleton would replace real figures with grey bars.
      loading={false}
      modes={[{ id: "record", label: "The record" }]}
      pad={(W): StagePad => ({
        l: W < 560 ? 16 : 30,
        r: W < 560 ? 16 : 30,
        t: 34,
        b: 74,
      })}
      svgLabel={() =>
        `Of ${count(disclosures)} disclosure records${
          openMarketFloor > 0
            ? `, at least ${count(openMarketFloor)} confirmed bought on the open market`
            : ""
        }, ${count(
          analyses,
        )} were read in full and rated. Drawn as a bed of hairlines at one scale, bottom-aligned, thinning left to right.`
      }
    >
      {({ W, H, pad }) => (
        <RecordBed
          H={H}
          W={W}
          analyses={analyses}
          disclosures={disclosures}
          openMarketFloor={openMarketFloor}
          pad={pad}
          specimenCompany={specimenCompany}
        />
      )}
    </BoardStagePanel>
  );
}

/** The drawn object. Everything below this line is geometry; the words it
 *  places are the four band labels and the specimen's company name. */
function RecordBed({
  W,
  H,
  pad,
  disclosures,
  openMarketFloor,
  analyses,
  specimenCompany,
}: {
  W: number;
  H: number;
  pad: StagePad;
  disclosures: number;
  openMarketFloor: number;
  analyses: number;
  specimenCompany: string | null;
}) {
  const x0 = pad.l;
  const x3 = W - pad.r;
  const span = Math.max(1, x3 - x0);
  const y0 = pad.t;
  const y1 = H - pad.b;
  const bedH = Math.max(1, y1 - y0 - PLINTH);
  const narrow = W < 560;

  const bed = useMemo(
    () =>
      buildBed(
        bedH,
        disclosures,
        openMarketFloor,
        analyses,
        Boolean(specimenCompany),
      ),
    [bedH, disclosures, openMarketFloor, analyses, specimenCompany],
  );

  if (!bed) return null;

  // Band edges, left to right.
  const a = x0 + span * SPANS[0];
  const b = a + span * SPANS[1];
  const c = b + span * SPANS[2];
  const edges = [x0, a, b, c, x3];

  /** The centre of thread i, counting up from the baseline. The plinth gap
   *  is load-bearing: with four survivors at a ~3px pitch the last band is a
   *  13px slab, and sitting it directly on the rule made it read as part of
   *  the rule rather than as the records that got through. */
  const yOf = (i: number) => y1 - PLINTH - (i + 0.5) * bed.pitch;

  const doomed: number[] = [];

  for (let i = bed.rated; i < bed.open; i += 1) doomed.push(i);
  const survivors: number[] = [];

  for (let i = 0; i < bed.rated; i += 1) survivors.push(i);
  const cutOnly: number[] = [];

  for (let i = bed.open; i < bed.T; i += 1) cutOnly.push(i);

  const sy = bed.specimenIndex === null ? null : yOf(bed.specimenIndex);

  return (
    <>
      <defs>
        {/* The sorting step has no honest count, so the threads that stop in
            it are given no ends. The group dissolves; no individual line is
            ever asserted to have stopped anywhere. */}
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="hiw-sortFade"
          x1={b}
          x2={c}
          y1={0}
          y2={0}
        >
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.18" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask
          height={bedH + 4}
          id="hiw-sortMask"
          maskUnits="userSpaceOnUse"
          width={c - b}
          x={b}
          y={y0 - 2}
        >
          <rect
            fill="url(#hiw-sortFade)"
            height={bedH + 4}
            width={c - b}
            x={b}
            y={y0 - 2}
          />
        </mask>
      </defs>

      {/* Band guides and the baseline the bed stands on. */}
      {edges.slice(1, 4).map((x) => (
        <line
          key={x}
          stroke="#fff"
          strokeOpacity={0.07}
          x1={x}
          x2={x}
          y1={y0 - 2}
          y2={y1 + 7}
        />
      ))}
      <line
        stroke="#fff"
        strokeOpacity={0.12}
        x1={x0}
        x2={x3}
        y1={y1}
        y2={y1}
      />

      <g strokeLinecap="butt" strokeWidth={bed.stroke}>
        {/* Band 1 — everything disclosed. */}
        {Array.from({ length: bed.T }, (_, i) =>
          i === bed.specimenIndex ? null : (
            <line
              key={`d${i}`}
              stroke="#fff"
              strokeOpacity={0.3}
              x1={x0}
              x2={a}
              y1={yOf(i)}
              y2={yOf(i)}
            />
          ),
        )}

        {/* Band 2 — what a classifier confirmed was bought on the market. */}
        {[...survivors, ...doomed].map((i) =>
          i === bed.specimenIndex ? null : (
            <line
              key={`o${i}`}
              stroke="#fff"
              strokeOpacity={0.42}
              x1={a}
              x2={b}
              y1={yOf(i)}
              y2={yOf(i)}
            />
          ),
        )}

        {/* Band 3 — the sort. Masked, so the group fades and no line ends. */}
        <g mask="url(#hiw-sortMask)">
          {doomed.map((i) => (
            <line
              key={`s${i}`}
              stroke="#fff"
              strokeOpacity={0.44}
              x1={b}
              x2={c}
              y1={yOf(i)}
              y2={yOf(i)}
            />
          ))}
        </g>

        {/* Bands 3 and 4 for the survivors: one run, bright, to the edge. */}
        {survivors.map((i) =>
          i === bed.specimenIndex ? null : (
            <line
              key={`r${i}`}
              stroke="#fff"
              strokeOpacity={0.92}
              x1={b}
              x2={x3 - 2}
              y1={yOf(i)}
              y2={yOf(i)}
            />
          ),
        )}

        {/* The specimen: one filing, drawn the whole way across.
            Through the first two bands it is one hairline among thousands, at
            a warmer colour: findable, not announced. From the sorting step on
            it is cut clear of its neighbours by a panel-coloured line under
            it, because at a 3px pitch the four survivors otherwise merge into
            one bright rule and the specimen stops being a separate thing —
            which is the one reading this drawing cannot afford to lose. */}
        {sy === null ? null : (
          <>
            <line
              stroke="#1a140d"
              strokeWidth={bed.pitch + 1.4}
              x1={b}
              x2={x3 - 2}
              y1={sy}
              y2={sy}
            />
            <line
              stroke={TAN}
              strokeOpacity={0.6}
              strokeWidth={Math.max(bed.stroke, 1.4)}
              x1={x0}
              x2={b}
              y1={sy}
              y2={sy}
            />
            <line
              stroke={TAN}
              strokeWidth={Math.max(bed.stroke, 2)}
              x1={b}
              x2={x3 - 2}
              y1={sy}
              y2={sy}
            />
          </>
        )}
      </g>

      {/* THE SPECIMEN MARK, at the end of the line that carried it. */}
      {sy === null ? null : (
        <g>
          <SpecimenMarkSvg color={TAN} cx={x3 - 2} cy={sy} />
          <line
            stroke={TAN}
            strokeOpacity={0.35}
            x1={x3 - 2}
            x2={x3 - 2}
            y1={sy - 24}
            y2={sy - 12}
          />
          <text
            fill="#fff"
            fillOpacity={0.92}
            fontSize={narrow ? 12 : 13}
            fontWeight={600}
            textAnchor="end"
            x={x3}
            y={sy - 28}
          >
            {specimenCompany}
          </text>
          {/* Dropped on a phone: it is 150px of mono set across the tail of
              the sorting haze, and the card directly under the stage carries
              the same three words on clean ground. */}
          {narrow ? null : (
            <text
              fill="#fff"
              fillOpacity={0.42}
              fontSize={10}
              letterSpacing="0.13em"
              style={{
                fontFamily: "var(--font-mono, ui-monospace, monospace)",
              }}
              textAnchor="end"
              x={x3}
              y={sy - 43}
            >
              THE WORKED EXAMPLE
            </text>
          )}
        </g>
      )}

      {/* The four bands, named in words under the baseline. No numbers here:
          the figures band above states them once. */}
      {BANDS.map((band, i) => {
        const mid = (edges[i] + edges[i + 1]) / 2;

        return (
          <g key={band.lines.join(" ")}>
            {band.lines.map((line, j) => (
              <text
                key={line}
                fill="#fff"
                fillOpacity={0.7}
                fontSize={narrow ? 11.5 : 12.5}
                textAnchor="middle"
                x={mid}
                y={y1 + 22 + j * 15}
              >
                {line}
              </text>
            ))}
            {band.sub ? (
              <text
                fill="#fff"
                fillOpacity={0.36}
                fontSize={narrow ? 9.5 : 10.5}
                letterSpacing="0.08em"
                style={{
                  fontFamily: "var(--font-mono, ui-monospace, monospace)",
                }}
                textAnchor="middle"
                x={mid}
                y={y1 + 24 + band.lines.length * 15}
              >
                {band.sub}
              </text>
            ) : null}
          </g>
        );
      })}
    </>
  );
}
