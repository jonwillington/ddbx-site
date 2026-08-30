/** The pipeline, drawn.
 *
 *  The site had exactly one explanatory graphic before this — AccumulationChart
 *  on the developer page, written for developers. Everything in the investor
 *  funnel explained itself in prose: the walkthrough is atmosphere and
 *  typography, the download tour is screenshots, the glossary and the FAQs are
 *  paragraphs. So the one thing a reader most wants a picture of — what happens
 *  between a director filing and a rating appearing — had never been drawn.
 *
 *  Two registers, one figure:
 *
 *  1. The funnel. The load-bearing fact about this pipeline is that it throws
 *     almost everything away, and a row of six equal boxes says the opposite —
 *     it reads as a conveyor where everything that goes in comes out. The
 *     tapering band across the top is the correction. Its widths are
 *     illustrative and its stops are labelled in words, because we publish no
 *     attrition percentages and a drawn 4%-survives would be a number the
 *     reader is entitled to hold us to.
 *
 *     Stops CAN carry a counted figure via `counts` — /how-it-works passes
 *     live totals from /api/coverage, which are real counts rather than
 *     invented attrition. A stop with no honest count (triage survivors
 *     aren't counted anywhere) gets null and stays a bare label; the widths
 *     stay illustrative either way and the caption keeps saying so.
 *
 *  2. The stages. Numbered nodes on a rail, each with its own one-line meta.
 *     Horizontal on desktop where the left-to-right reading gives the flow for
 *     free; a vertical rail below `sm` where six columns would be six words
 *     wide. No horizontal scroll at any width — a diagram that scrolls sideways
 *     inside a document is a diagram most readers see a third of.
 *
 *  All CSS, no dependency, no canvas: it has to render inside the crawler
 *  pre-render's static shell and survive `prefers-reduced-motion`, which turns
 *  the one animation — a pulse travelling the rail — off entirely rather than
 *  slowing it down.
 */
import { FUNNEL_STOPS, PIPELINE } from "@/lib/methodology";

/** Illustrative widths for the funnel band, as percentages of the figure.
 *  Deliberately not derived from data — see the header. The floor is set by
 *  legibility rather than by drama: below ~18% the last band can't hold its own
 *  label at the article measure, and a truncated label is a worse figure than a
 *  slightly shallower taper. */
const FUNNEL_WIDTHS = [100, 60, 34, 20];

export function PipelineDiagram({
  counts,
  caption,
}: {
  /** Optional counted figure per FUNNEL_STOPS entry ("25,457", "≥ 16,904");
   *  null leaves that stop as a bare label. */
  counts?: (string | null)[];
  /** Provenance line under the funnel. Defaults to the width disclaimer. */
  caption?: string;
} = {}) {
  return (
    <figure className="mt-6">
      <style>{`
        /* One pulse travelling the rail, so the figure reads as a flow rather
           than as six labelled boxes. Slow and low-contrast on purpose: this
           sits inside a document, not a hero. */
        @keyframes ddbx-flow {
          0%   { transform: translateX(-8%); opacity: 0; }
          12%  { opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translateX(108%); opacity: 0; }
        }
        .ddbx-flow-pulse {
          animation: ddbx-flow 7s cubic-bezier(0.42, 0, 0.58, 1) infinite;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .ddbx-flow-pulse { animation: none; opacity: 0; }
        }
      `}</style>

      {/* ── The funnel ───────────────────────────────────────────────────
          Presentational: the same attrition is stated in words in the stage
          bodies underneath, so a screen reader loses nothing by skipping it. */}
      <div aria-hidden className="hidden sm:block">
        <div className="flex flex-col items-center gap-[3px]">
          {FUNNEL_STOPS.map((stop, i) => (
            <div
              key={stop}
              className="flex w-full items-center justify-center"
              style={{ width: `${FUNNEL_WIDTHS[i]}%` }}
            >
              <div
                className={`flex h-7 w-full items-center justify-center overflow-hidden rounded-[3px] border px-2 ${
                  i === FUNNEL_STOPS.length - 1
                    ? "border-brand-brown/25 bg-brand-brown/[0.10] dark:border-brand-tan/30 dark:bg-brand-tan/[0.14]"
                    : "border-hairline bg-sheet dark:border-separator dark:bg-surface"
                }`}
              >
                <span
                  className={`truncate font-mono text-[10px] uppercase tracking-[0.14em] ${
                    i === FUNNEL_STOPS.length - 1
                      ? "text-brand-brown dark:text-brand-tan"
                      : "text-foreground/45"
                  }`}
                >
                  {stop}
                  {counts?.[i] ? (
                    <span className="tabular-nums"> · {counts[i]}</span>
                  ) : null}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/35">
          {caption ?? "Widths illustrative"}
        </p>
      </div>

      {/* ── The stages ───────────────────────────────────────────────────
          An ordered list, because that is what it is: six steps in a fixed
          sequence. The rail and the nodes are drawn around the list rather
          than instead of it, so the pre-rendered and unstyled versions still
          read as "1. Watch … 6. Track". */}
      <ol className="mt-8 grid gap-0 sm:mt-9 sm:grid-cols-6 sm:gap-x-2">
        {PIPELINE.map((stage, i) => {
          const first = i === 0;
          const last = i === PIPELINE.length - 1;

          return (
            <li key={stage.id} className="relative flex gap-4 sm:block">
              {/* Vertical rail (mobile): a continuous line down the gutter,
                  broken only after the last node so the list doesn't trail
                  into nothing. */}
              <div
                aria-hidden
                className="relative flex w-6 shrink-0 flex-col items-center sm:hidden"
              >
                {/* Deliberately a hair rather than a gap: the node has to sit
                    on the same line as the label beside it, and an 8px lead-in
                    pushed it ~11px below the label's centre — close enough to
                    look like a mistake rather than a rhythm. */}
                <span
                  className={`h-0.5 w-px ${first ? "bg-transparent" : "bg-hairline dark:bg-separator"}`}
                />
                <StepNode index={i} />
                {!last && (
                  <span className="w-px flex-1 bg-hairline dark:bg-separator" />
                )}
              </div>

              {/* Horizontal rail (desktop): the node sits on a full-width
                  line, with the travelling pulse layered over it. */}
              <div
                aria-hidden
                className="relative hidden h-6 items-center sm:flex"
              >
                <span
                  className={`absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-hairline dark:bg-separator ${
                    first ? "left-1/2" : ""
                  } ${last ? "right-1/2" : ""}`}
                />
                {!last && (
                  <span className="ddbx-flow-pulse absolute left-1/2 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-brand-brown/60 dark:bg-brand-amber/70" />
                )}
                <span className="relative">
                  <StepNode index={i} />
                </span>
              </div>

              <div className="min-w-0 pb-7 sm:pb-0 sm:pt-3">
                <p className="text-[13.5px] font-semibold leading-[1.3] tracking-[-0.01em] text-foreground">
                  {stage.label}
                </p>
                <p className="mt-1 text-[11.5px] leading-[1.45] text-foreground/50">
                  {stage.meta}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <figcaption className="sr-only">
        The six stages a disclosure passes through:{" "}
        {PIPELINE.map((s) => s.label).join(", ")}. Each is described in full
        below.
      </figcaption>
    </figure>
  );
}

/** A numbered stop on the rail. Mono figures so the six read as a sequence
 *  rather than as six unrelated badges.
 *
 *  Exported because /how-it-works draws the same badge beside each of the six
 *  checks, and for a while did it by holding a byte-identical copy of this
 *  class string in the page. Two copies of a token is how a page starts
 *  reading as generated: one of them gets tuned, and the reader sees two
 *  slightly different objects doing the same job. */
export function StepNode({ index }: { index: number }) {
  return (
    <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand-brown/25 bg-sheet font-mono text-[10.5px] font-semibold text-brand-brown dark:border-brand-tan/30 dark:bg-surface dark:text-brand-tan">
      {index + 1}
    </span>
  );
}
