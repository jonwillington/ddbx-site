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
 *     behind all six StepNodes says it, statically, in one pixel.
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
 *  one) is the design language's tenet-3 selling row at 24px, and two adjacent
 *  sections in the same row family is how a page starts reading as a template.
 *  This is a ledger: smaller titles, a spine, a discard margin, no `more`.
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
import type { ExampleFiling } from "@/lib/methodology-examples";
import type { CoverageResponse } from "@/types/ddbx";

import { Link } from "react-router-dom";

import {
  EYEBROW,
  EYEBROW_QUIET,
  RULE,
  StepNode,
  shortDate,
} from "@/components/how-it-works/shared";
import { SpecimenMark } from "@/components/how-it-works/specimen-mark";
import { PIPELINE } from "@/lib/methodology";
import { count } from "@/lib/coverage";

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
 *  finding rather than a formatting accident. */
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
    note: "What is left is a purchase on the open market, made with the buyer’s own money.",
  },
  triage: {
    leaves: ["Most of the buys that got this far"],
    note: "Fixed rules can push a filing back up, so a large buy by a chief executive is never quietly dropped.",
  },
  analyse: {
    leaves: [],
    note: "The filing stays. What gets dropped is any claim in the read with no working link to its source: evidence that cannot be checked is removed rather than softened.",
  },
  rate: {
    leaves: [],
    note: "A missed check caps the rating instead of removing the filing.",
  },
  track: {
    leaves: [],
    note: "A rating can change later, as the record it is measured against builds.",
  },
};

/** The quiet trailing line on a stage: its cadence qualifier, and a live
 *  figure where this section honestly has one. Returns the cadence alone when
 *  the count is missing or zero, so the slot never renders an empty quantity. */
function stageFootnote(
  stageId: string,
  meta: string,
  totals?: CoverageResponse["totals"] | null,
): string {
  if (stageId === "watch" && totals?.pipeline_runs) {
    return `${meta} · ${count(totals.pipeline_runs)} pipeline runs so far`;
  }
  if (stageId === "triage" && totals?.triage_decisions) {
    const llm = totals.triage_llm
      ? `, ${count(totals.triage_llm)} of them by a model and the rest by fixed rules`
      : "";

    return `${meta} · ${count(totals.triage_decisions)} sorting decisions so far${llm}`;
  }

  return meta;
}

export function PipelineLedger({
  totals,
  specimen,
}: {
  /** Live counts from `useCoverage()`. Optional: the ledger reads perfectly
   *  without them, it just loses two footnote clauses. */
  totals?: CoverageResponse["totals"] | null;
  /** The filing the page threads through everything. Null on markets with no
   *  analysis layer (SE, NL), where the closing line simply does not render. */
  specimen?: ExampleFiling | null;
}) {
  return (
    <div>
      {/* The verdict first. A reader who stops after this paragraph has the
          shape of the thing: six stages, and only two of them narrow the
          pipe. The feeds and the cadence are the sources section's to state
          and the watch row's own footnote; saying them here too put the same
          fact on screen three times. */}
      <p className="max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80">
        Six stages stand between a filing appearing and a rating existing. Only
        two of them throw filings away; the other four read, score and measure
        what survives.
      </p>

      <ol className={`relative mt-8 border-t ${RULE}`}>
        {/* The spine. One static hairline from the first node's centre to the
            last node's centre, painted behind the nodes (whose sheet fill
            occludes it) so the six read as one sequence rather than six
            entries. Offsets track the rows' own vertical padding: py-7 + half
            a 24px node = 40px, py-9 + the same = 48px. Nothing travels it. */}
        <span
          aria-hidden
          className="absolute bottom-10 left-3 top-10 w-px bg-brand-brown/20 sm:bottom-12 sm:top-12 dark:bg-brand-tan/25"
        />

        {PIPELINE.map((stage, i) => {
          const gate = GATE[stage.id] ?? { leaves: [], note: "" };
          const items = gate.leaves.length > 0 ? gate.leaves : ["Nothing"];

          return (
            <li
              key={stage.id}
              className={`grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-4 gap-y-6 border-b ${RULE} py-7 sm:grid-cols-[1.5rem_minmax(0,5fr)_minmax(0,4fr)] sm:gap-x-6 sm:gap-y-0 sm:py-9`}
            >
              {/* Rail. The numeral is the sequence mark, page-wide. */}
              <div className="col-start-1 row-start-1">
                <StepNode index={i} />
              </div>

              {/* The stage. */}
              <div className="col-start-2 row-start-1 min-w-0">
                <p className={EYEBROW}>{stage.label}</p>
                <h3 className="mt-2 text-balance text-[18px] font-semibold leading-[1.25] tracking-[-0.02em] text-foreground sm:text-[19.5px]">
                  {stage.title}
                </h3>
                <p className="mt-2.5 max-w-[58ch] text-[15px] leading-[1.65] text-foreground/75">
                  {stage.body}
                </p>
                <p className="mt-3 text-[12.5px] leading-[1.5] tabular-nums text-foreground/50">
                  {stageFootnote(stage.id, stage.meta, totals)}
                </p>
              </div>

              {/* The discard margin. Past the vertical rule is out of the
                  pipe. On a phone the rule would be a horizontal one under a
                  paragraph, which reads as a divider rather than as a wall, so
                  below sm the column simply sits underneath with its own
                  eyebrow and the enclosed list carries the edge. */}
              <div
                className={`col-start-2 row-start-2 min-w-0 sm:col-start-3 sm:row-start-1 sm:border-l ${RULE} sm:pl-6`}
              >
                <p className={EYEBROW_QUIET}>What leaves</p>
                <ul
                  className={`mt-2.5 border-y ${RULE} divide-y divide-black/[0.06] dark:divide-white/[0.08]`}
                >
                  {items.map((item) => (
                    <li
                      key={item}
                      className="py-[7px] text-[13.5px] leading-[1.4] text-foreground/70"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 max-w-[42ch] text-[13px] leading-[1.55] text-foreground/55">
                  {gate.note}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* The specimen, taken through the ledger in one sentence. The page
          introduces this filing above the contents strip and narrates its
          verdict under every check below; here it is simply the thing that
          survived all six gates, which is what the ledger is a picture of. */}
      {specimen ? (
        <div className={`mt-7 flex items-start gap-3 border-t ${RULE} pt-5`}>
          <SpecimenMark className="mt-[3px]" />
          <p className="max-w-[68ch] text-[14px] leading-[1.6] text-foreground/70">
            The worked example cleared every gate.{" "}
            <Link
              className="font-medium text-foreground underline underline-offset-4"
              to={specimen.path}
            >
              {specimen.name}’s purchase of {specimen.company} shares
            </Link>{" "}
            on {shortDate(specimen.date)} was classified as an open-market buy,
            kept by triage, read against the record, rated {specimen.rating},
            and is now measured against the index.
          </p>
        </div>
      ) : null}
    </div>
  );
}
