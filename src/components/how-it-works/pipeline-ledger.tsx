/** The pipeline, as a ledger of six gates.
 *
 *  Replaces PipelineDiagram (an illustrative tapering funnel with live counts,
 *  plus six numbered nodes on a rail with a pulse travelling it) and the six
 *  folded `<details>` rows that restated the same six titles underneath. Three
 *  things were wrong with that pairing and this component is the answer to all
 *  three.
 *
 *  1. The funnel is no longer this section's to draw. The page's hero now
 *     states the live totals — filed, open-market, rated — as its opening
 *     object, and a second counted narrowing halfway down the document is the
 *     same fact drawn twice in two visual languages. What is left for this
 *     section is the part the funnel could never carry: the MECHANICS. What
 *     each stage does, what it removes, what survives it, how often it runs.
 *
 *  2. The bodies were folded. Six `<details>` rows meant six clicks to read
 *     the six paragraphs that ARE the explanation, and a reader who wanted the
 *     method got six headings and a chevron. The bodies are open here.
 *
 *  3. The pulse moved on its own. The page's grammar now forbids anything that
 *     animates without a reader asking for it, and the sequence does not need
 *     a pulse to read as one: a single continuous hairline spine running
 *     behind all six rail marks says it, statically, in one pixel.
 *
 *  ---------------------------------------------------------------------------
 *  The rail mark (2026-09-07)
 *  ---------------------------------------------------------------------------
 *
 *  Each row's rail now carries two marks stacked: the stage's icon above its
 *  sequence numeral. The numeral stays because the numeral is the thing that
 *  says "third of six" — the page's exclusive mark for a stop in a sequence,
 *  and no icon can carry an ordinal. The icon is there because six rows of
 *  identical numbered circles give the eye nothing to tell watch from rate at
 *  a glance, and the six verbs are concrete enough to draw: an eye, a funnel,
 *  a balance, a document under a glass, a badge, a rising line. One icon per
 *  stage, one weight, one colour (the brand accent), all decorative — every
 *  one is `aria-hidden` and the stage's own label carries the meaning.
 *
 *  The spine is drawn per row, in two segments that stop at the marks rather
 *  than running behind them: an occluding background would have to match the
 *  document ground exactly, and `bg-sheet` does not.
 *
 *  ---------------------------------------------------------------------------
 *  The one axis
 *  ---------------------------------------------------------------------------
 *
 *  Down the page is time. Across each row is the gate: the stage on the left,
 *  what leaves the pipe at that stage on the right of a vertical hairline —
 *  the pipe wall, so anything past it has gone. The load-bearing finding falls
 *  out of the geometry without a number anywhere near it: classify's discard
 *  column is six items tall, triage's is one, and the other four stages
 *  discard no filing at all. The narrowing happens in two places, and you can
 *  see which two from across the room.
 *
 *  "What leaves" means FILINGS leaving the pipe — one axis, one meaning. The
 *  analyse stage drops unsourced claims from a read, but the filing itself
 *  goes on, so that rule is stated in the stage's note rather than drawn as a
 *  departure.
 *
 *  Deliberately NOT a second RowList. The checks section (which follows this
 *  one) is the design language's tenet-3 selling row, and two adjacent
 *  sections in the same row family is how a page starts reading as a template.
 *  The titles now match that row's size, because the page's type scale says
 *  22/24px and a ledger of six stages is not the place to run small; what
 *  keeps the two apart is everything else — an illustrated rail with a spine
 *  and a numeral, a second column past a wall, and no `more` link.
 *
 *  ---------------------------------------------------------------------------
 *  Numbers
 *  ---------------------------------------------------------------------------
 *
 *  Two live figures, both of them this section's alone and neither of them on
 *  the hero: `pipeline_runs` on the watch row (the cadence, evidenced) and the
 *  triage decisions split on the triage row (how much of the sorting is a
 *  model and how much is fixed rules). They sit on the stage they describe
 *  rather than in an intro paragraph, which is where the triage split used to
 *  live — a fact about stage three, stated before the reader knew there were
 *  stages. Any total that arrives as zero or missing renders nothing at all
 *  rather than a dash: static-page rule 2.
 */
import type { CoverageResponse } from "@/types/ddbx";
import type { ComponentType, SVGProps } from "react";

import {
  ArrowTrendingUpIcon,
  CheckBadgeIcon,
  DocumentMagnifyingGlassIcon,
  EyeIcon,
  FunnelIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";

import { StepNode } from "@/components/how-it-works/shared";
import { eyebrow } from "@/components/ui/eyebrow";
import { PIPELINE } from "@/lib/methodology";
import { count } from "@/lib/coverage";

/** One icon per stage, in the order PIPELINE declares them.
 *
 *  Chosen for the VERB, not for the noun: triage is a balance because the
 *  stage weighs a buy against its context, and rate is a badge because the
 *  stage awards a tier. Keyed by stage id rather than by index so a reordered
 *  PIPELINE cannot silently hand "analyse" the eye. A stage with no entry
 *  renders its numeral alone rather than a placeholder glyph. */
const SPINE = "bg-brand-brown/20 dark:bg-brand-tan/25";

const STAGE_ICON: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  watch: EyeIcon,
  classify: FunnelIcon,
  triage: ScaleIcon,
  analyse: DocumentMagnifyingGlassIcon,
  rate: CheckBadgeIcon,
  track: ArrowTrendingUpIcon,
};

/** What leaves the pipe at each stage, and what the stage does instead when
 *  nothing does.
 *
 *  Every item is a compression of that stage's own `body` in
 *  src/lib/methodology.ts, not a new claim: classify's six are the six kinds
 *  the body names ("awards, vestings, option exercises, placings, scheme
 *  releases and disposals"), triage's one is "most filings stop here", and
 *  the four empty stages are empty because no filing leaves the pipe there —
 *  analyse drops evidence but keeps the filing, rate caps a rating, track
 *  revises one. If a stage's body changes meaning in methodology.ts, this
 *  table changes with it in the same cycle.
 *
 *  "Nothing" is rendered as an item rather than as an absence, so the column
 *  is the same object on all six rows and the difference in height is the
 *  finding rather than a formatting accident.
 *
 *  A note is only kept where it says something the stage's body beside it
 *  does not. Until 2026-09-19 classify's, triage's and track's notes restated
 *  their own bodies a few centimetres to the left ("with the buyer’s own
 *  money", "never quietly dropped", "a rating can change"), so they are empty
 *  and not rendered. */
const GATE: Record<string, { leaves: string[]; note: string }> = {
  watch: {
    leaves: [],
    note: "The pipe is at its widest here. Everything a regulator publishes enters, whatever it later turns out to be.",
  },
  classify: {
    leaves: [
      "Awards",
      "Vestings",
      "Option exercises",
      "Placings",
      "Scheme releases",
      "Disposals",
    ],
    note: "",
  },
  triage: {
    leaves: ["Most of the buys that got this far"],
    note: "",
  },
  analyse: {
    leaves: [],
    note: "The filing stays.",
  },
  rate: {
    leaves: [],
    note: "A missed check caps the rating instead of removing the filing.",
  },
  track: {
    leaves: [],
    note: "",
  },
};

/** The quiet trailing line on a stage: a live figure where this section
 *  honestly has one, and null otherwise, so the slot never renders an empty
 *  quantity.
 *
 *  It used to lead with the stage's `meta` ("Every 15 minutes", "Most filings
 *  stop here", "Measured against the index"), and every one of those six
 *  taglines is already said in the stage's own title or body. Cut 2026-09-19;
 *  the explainer walkthrough still uses `meta`. */
function stageFootnote(
  stageId: string,
  totals?: CoverageResponse["totals"] | null,
): string | null {
  if (stageId === "watch" && totals?.pipeline_runs) {
    return `${count(totals.pipeline_runs)} pipeline runs so far`;
  }
  if (stageId === "triage" && totals?.triage_decisions) {
    const llm = totals.triage_llm
      ? `, ${count(totals.triage_llm)} of them by a model and the rest by fixed rules`
      : "";

    return `${count(totals.triage_decisions)} sorting decisions so far${llm}`;
  }

  return null;
}

export function PipelineLedger({
  totals,
}: {
  /** Live counts from `useCoverage()`. Optional: the ledger reads perfectly
   *  without them, it just loses two footnotes. */
  totals?: CoverageResponse["totals"] | null;
}) {
  return (
    <div>
      {/* The verdict first. A reader who stops after this paragraph has the
          shape of the thing: six stages, and only two of them narrow the
          pipe. The feeds and the cadence are the sources section's to state
          and the watch row's own footnote; saying them here too put the same
          fact on screen three times. */}
      <p className="max-w-[64ch] text-lede text-foreground/80">
        Only two of the six throw filings away; the other four read, score and
        measure what survives.
      </p>

      <ol className={`relative mt-8 border-t border-rule`}>
        {PIPELINE.map((stage, i) => {
          const gate = GATE[stage.id] ?? { leaves: [], note: "" };
          const items = gate.leaves.length > 0 ? gate.leaves : ["Nothing"];
          const Icon = STAGE_ICON[stage.id];
          const footnote = stageFootnote(stage.id, totals);

          return (
            <li
              key={stage.id}
              className={`relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-4 gap-y-7 border-b border-rule py-7 sm:grid-cols-[1.75rem_minmax(0,5fr)_minmax(0,4fr)] sm:gap-x-7 sm:gap-y-0 sm:py-9 lg:grid-cols-[1.75rem_minmax(0,6fr)_minmax(0,4.5fr)] lg:gap-x-12`}
            >
              {/* The spine, in two segments per row so it never crosses a
                  mark: one through the row's top padding (absent on the first
                  row, which has nothing above it) and one growing from under
                  the numeral to the row's bottom edge (absent on the last).
                  Drawn from the rows' own padding tokens rather than from
                  measured offsets, so changing py cannot strand it. */}
              {i > 0 ? (
                <span
                  aria-hidden
                  className={`absolute left-[13.5px] top-0 h-7 w-px ${SPINE} sm:h-9`}
                />
              ) : null}
              {/* Rail. The stage's icon over its sequence numeral, then the
                  spine down to the next row. The numeral is the page's
                  sequence mark and stays; the icon is decoration that tells
                  the six rows apart at a glance. */}
              <div className="col-start-1 row-start-1 flex h-full w-7 flex-col items-center gap-2.5">
                {Icon ? (
                  <Icon
                    aria-hidden
                    className="h-7 w-7 shrink-0 text-brand-brown dark:text-brand-tan"
                    strokeWidth={1.5}
                  />
                ) : null}
                <StepNode index={i} />
                {i < PIPELINE.length - 1 ? (
                  <span aria-hidden className={`w-px flex-1 ${SPINE}`} />
                ) : null}
              </div>

              {/* The stage. */}
              <div className="col-start-2 row-start-1 min-w-0">
                <p className={eyebrow()}>{stage.label}</p>
                <h3 className="mt-2 text-balance text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] text-foreground sm:text-[24px]">
                  {stage.title}
                </h3>
                <p className="mt-3 max-w-measure text-lede text-foreground/75">
                  {stage.body}
                </p>
                {footnote ? (
                  <p className="mt-3.5 text-body tabular-nums text-foreground/50">
                    {footnote}
                  </p>
                ) : null}
              </div>

              {/* The discard margin. Past the vertical rule is out of the
                  pipe. On a phone the rule would be a horizontal one under a
                  paragraph, which reads as a divider rather than as a wall, so
                  below sm the column simply sits underneath with its own
                  eyebrow and the enclosed list carries the edge. */}
              <div
                className={`col-start-2 row-start-2 min-w-0 sm:col-start-3 sm:row-start-1 sm:border-l border-rule sm:pl-6`}
              >
                <p className={eyebrow("quiet")}>What leaves</p>
                <ul className="mt-3 divide-y divide-hairline border-y border-rule dark:divide-separator">
                  {items.map((item) => (
                    <li
                      key={item}
                      className="py-2.5 text-lede leading-snug text-foreground/70"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
                {gate.note ? (
                  <p className="mt-3.5 max-w-[46ch] text-body text-foreground/55">
                    {gate.note}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
