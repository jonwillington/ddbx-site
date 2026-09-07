/** The four ratings, drawn as the scale they actually are.
 *
 *  What this replaces: a `dl` with one ruled row per rating — the real
 *  RatingBadge on the left, the meaning on the right, a linked filing under
 *  it. Correct, and completely flat. Four definitions stacked in a column
 *  say nothing about the one fact that makes the scale a scale: the rating
 *  is a verdict on the six checks, the top of it needs all six, and missing
 *  even one puts a buy underneath a ceiling it cannot get back through.
 *  That sentence lives in PIPELINE's `rate` stage and in RATING_SCALE's own
 *  wording, and until now the page said it in prose three sections earlier
 *  and never drew it.
 *
 *  So: a ladder. Four rungs in one hairline panel, best first, each carrying
 *  the product's own RatingBadge (its colours are the one sanctioned colour
 *  in this section) and one real filing that earned it. Two things turn the
 *  stack into a scale:
 *
 *  - The CEILING. The top rung carries a six-slot gauge with every slot
 *    filled — the page's cleared/not-cleared vocabulary (filled ink disc =
 *    cleared, hollow ring = not), so a reader who has just come from the
 *    checks section already knows how to read it. Directly beneath it, a
 *    tinted band carries the same gauge one slot short, and the rule in
 *    words. The two gauges sit in the same column, one above the other,
 *    fifteen pixels apart: "all six" against "miss even one" is the whole
 *    lesson, and it is a comparison rather than a caption.
 *  - The EDGE. A 3px brand-brown bar down the left of each rung, stepping
 *    down in opacity from the top rung to the bottom. An axis, not a mark:
 *    it says "ordered, strongest at the top" at a glance and in peripheral
 *    vision, which is what the two-second test asks for.
 *
 *  ---------------------------------------------------------------------------
 *  What is NOT claimed
 *  ---------------------------------------------------------------------------
 *
 *  Only one count is published: all six clear = significant. The pipeline
 *  does not say "five of six = noteworthy", and neither does RATING_SCALE —
 *  the three lower ratings are told apart by what the filing IS (small, or by
 *  someone far from the business, or simply housekeeping), not by a tally. So
 *  the gauge appears exactly twice: full, on the top rung, and one short, in
 *  the cap band, where it is illustrating the stated boundary condition
 *  ("miss one and it is capped below") rather than describing a rating. The
 *  three rungs below the band carry no gauge at all, and the band says in as
 *  many words that how far below is a judgement rather than a count. If a
 *  future reader adds a per-rung count here, they are inventing a rule the
 *  product does not have.
 *
 *  The specimen mark (the page-wide filled brand-brown disc with its offset
 *  ring) sits on whichever rung the worked example actually landed on, read
 *  from `examples.specimen.rating` rather than pinned to significant — the
 *  checklist moves by design, and a hard-coded rung would eventually be
 *  arguing with the filing it links to.
 */
import type { CSSProperties } from "react";
import type { Rating } from "@/types/ddbx";
import type {
  ExampleFiling,
  MethodologyExamples,
} from "@/lib/methodology-examples";

import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { Link } from "react-router-dom";

import { CompanyLogo } from "@/components/company-logo";
import {
  DIVIDE,
  KICKER,
  PANEL as SHEET,
  shortDate,
} from "@/components/how-it-works/shared";
import {
  SpecimenMark,
  VerdictDisc,
} from "@/components/how-it-works/specimen-mark";
import { RatingBadge } from "@/components/rating-badge";
import { CHECK_COUNT, CHECK_COUNT_WORD, RATING_SCALE } from "@/lib/methodology";

const PANEL = `@container overflow-hidden ${SHEET}`;
const MONO = `${KICKER} text-foreground/45`;

/** One column spec for the rungs and the cap band, keyed on the PANEL'S OWN
 *  width rather than the viewport's.
 *
 *  The page dropped its 860px wrapper, so this section is handed the whole
 *  content column — about 910px at `xl` beside the SEO rail, 1,070px at 1440,
 *  and 656px at `lg`, where the rail claims 320px and the column FALLS across
 *  the breakpoint instead of growing. A viewport gate gets that backwards
 *  twice over; a container gate turns the third column on exactly when there
 *  is room for it, rail or no rail.
 *
 *  The third track is the whole reason for the width. Before it, a rung was a
 *  badge, one sentence and one filing stacked in a 500px column with 500px of
 *  empty sheet beside them. Now the MEANING and the FILING THAT EARNED IT sit
 *  side by side on one line: the definition and its proof, read across, which
 *  is the comparison the section exists to make. */
const COLS =
  "grid gap-x-8 gap-y-5 px-5 py-7 [grid-template-columns:var(--rung-phone)] @min-[540px]:px-7 @min-[540px]:py-8 @min-[540px]:[grid-template-columns:var(--rung-medium)] @min-[840px]:gap-x-9 @min-[840px]:px-8 @min-[840px]:[grid-template-columns:var(--rung-wide)]";

const COL_STYLE = {
  "--rung-phone": "minmax(0,1fr)",
  "--rung-medium": "11rem minmax(0,1fr)",
  "--rung-wide": "11rem minmax(0,1fr) 22rem",
} as CSSProperties;

/** Anything that runs the whole rung: the specimen band. */
const FULL = "@min-[540px]:col-span-2 @min-[840px]:col-span-3";

/** The third track, and where it lives before it exists: under the meaning at
 *  medium, under everything on a phone. Placed rather than duplicated, so the
 *  filing link appears exactly once in the DOM at every width. */
const SIDECAR =
  "min-w-0 @min-[540px]:col-start-2 @min-[840px]:col-start-3 @min-[840px]:row-start-1 @min-[840px]:border-l @min-[840px]:border-black/[0.07] @min-[840px]:pl-9 @min-[840px]:dark:border-white/[0.09]";

/** How loud the left edge bar is, per rung. Not data — the taper IS the
 *  statement, and it has to survive four steps in both themes, so it is
 *  authored rather than computed from the index. */
const EDGE = [1, 0.55, 0.32, 0.18];

/** The cleared-count, in the page's verdict vocabulary: filled ink disc =
 *  the check cleared, hollow ring = it did not. Colour carries nothing; fill
 *  does, which is what lets this sit beside four coloured rating badges
 *  without competing with them. */
function CheckGauge({ cleared, label }: { cleared: number; label: string }) {
  return (
    <span
      aria-label={label}
      className="inline-flex items-center gap-1.5"
      role="img"
    >
      {/* 12px rather than the default 10: the gauge now sits beside 16px
          meanings and 17px filing names, and at 10px it read as punctuation
          instead of as the six checks. */}
      {Array.from({ length: CHECK_COUNT }, (_, i) => (
        <VerdictDisc key={i} cleared={i < cleared} size={12} />
      ))}
    </span>
  );
}

/** One real filing that earned this rating: logo disc, name, the facts, and
 *  the row is the link. The compressed rationale sits under it rather than
 *  inside the link, so the tap target stays the filing and not a paragraph. */
function ExampleRow({ example }: { example: ExampleFiling }) {
  return (
    <div>
      <p className={`${MONO} mb-2.5`}>One that earned it</p>
      <Link
        className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2 outline-none transition-colors hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:hover:bg-white/[0.04]"
        to={example.path}
      >
        <CompanyLogo size={40} ticker={example.ticker} />
        <span className="min-w-0">
          <span className="block text-[17px] font-semibold leading-[1.25] tracking-[-0.015em] text-foreground underline-offset-4 group-hover:underline">
            {example.company}
          </span>
          <span className="mt-1 block text-[14px] leading-[1.45] text-foreground/60">
            {example.name}
            {example.role ? `, ${example.role.toLowerCase()}` : ""} ·{" "}
            {example.value} · {shortDate(example.date)}
          </span>
        </span>
        <ChevronRightIcon
          aria-hidden
          className="ml-auto h-4 w-4 shrink-0 text-foreground/30 transition-colors group-hover:text-foreground/60"
        />
      </Link>
      <p className="mt-2 max-w-[56ch] text-[14px] leading-[1.6] text-foreground/60">
        {example.line}
      </p>
    </div>
  );
}

/** The ceiling, stated once, between the top rung and everything under it. */
function CapBand() {
  return (
    <div
      className={`${COLS} border-t border-black/[0.07] bg-brand-brown/[0.07] dark:border-white/[0.09] dark:bg-brand-tan/[0.10]`}
      style={COL_STYLE}
    >
      <div>
        <CheckGauge
          cleared={CHECK_COUNT - 1}
          label={`A buy that cleared five of the ${CHECK_COUNT_WORD} checks and missed one.`}
        />
        <p className={`mt-3 ${MONO}`}>Any one missed</p>
      </div>
      <p className="min-w-0 max-w-[46ch] text-[16px] leading-[1.65] text-foreground/85">
        Miss even one of the {CHECK_COUNT_WORD} and the buy is capped below
        significant, whatever else is in its favour.
      </p>
      {/* The qualifier takes the third track rather than sitting under the
          claim: it is the answer to the question the claim provokes, and side
          by side it reads as an answer instead of as small print. */}
      <p
        className={`${SIDECAR} max-w-[46ch] text-[14px] leading-[1.6] text-foreground/55`}
      >
        How far below is a judgement about what the filing is, not a tally of
        the checks that did clear.
      </p>
    </div>
  );
}

export function RatingLadder({
  examples,
}: {
  /** Null for markets without an analysis layer — the ladder still composes,
   *  it just has no filings to point at. */
  examples: MethodologyExamples | null;
}) {
  const specimen = examples?.specimen;

  return (
    <>
      <p className="max-w-[68ch] text-[16px] leading-[1.65] text-foreground/80">
        Every buy we read properly comes out with one of four labels. Where it
        lands depends on how the {CHECK_COUNT_WORD} checks went, and the top of
        the scale needs all {CHECK_COUNT_WORD}.
      </p>

      <div className={`mt-7 ${PANEL} divide-y ${DIVIDE}`}>
        {RATING_SCALE.map((r, i) => {
          const rating = r.rating as Rating;
          const example = examples?.ratings[rating];
          const top = i === 0;
          const specimenHere = specimen != null && specimen.rating === rating;

          return (
            <div key={rating}>
              <div className={`relative ${COLS}`} style={COL_STYLE}>
                {/* The scale, in peripheral vision. Decorative: the order is
                    already carried by the reading order and the badges. */}
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-[3px] bg-brand-brown dark:bg-brand-tan"
                  style={{ opacity: EDGE[i] ?? 0.18 }}
                />

                <div>
                  <RatingBadge rating={rating} />
                  {top ? (
                    <div className="mt-5">
                      <CheckGauge
                        cleared={CHECK_COUNT}
                        label={`All ${CHECK_COUNT_WORD} checks cleared.`}
                      />
                      <p className={`mt-3 ${MONO}`}>
                        {CHECK_COUNT_WORD} of {CHECK_COUNT_WORD}
                      </p>
                    </div>
                  ) : null}
                </div>

                <p className="min-w-0 max-w-[46ch] text-[16px] leading-[1.65] text-foreground/85">
                  {r.meaning}
                </p>

                {example ? (
                  <div className={SIDECAR}>
                    <ExampleRow example={example} />
                  </div>
                ) : null}

                {specimenHere && specimen ? (
                  <div
                    className={`${FULL} flex items-start gap-3 rounded-xl border border-hairline bg-brand-brown/[0.05] px-4 py-3.5 dark:border-white/[0.07] dark:bg-brand-tan/[0.07]`}
                  >
                    <SpecimenMark className="mt-[3px]" />
                    <p className="text-[14px] leading-[1.6] text-foreground/70">
                      The worked example at the top of this page,{" "}
                      <Link
                        className="font-medium text-foreground underline underline-offset-4"
                        to={specimen.path}
                      >
                        {specimen.company}
                      </Link>
                      , landed on this rung.
                    </p>
                  </div>
                ) : null}
              </div>

              {top ? <CapBand /> : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
