/** The close of /how-it-works: the five places the method does not reach.
 *
 *  ---------------------------------------------------------------------------
 *  Why this is not a grid of cards
 *  ---------------------------------------------------------------------------
 *
 *  These shipped as five small light cards in a two-column grid — 14px titles,
 *  13.5px bodies, one orphan on the last row. That is the shape of small print,
 *  and the page's own header comment says the opposite about them: they are
 *  "the paragraphs on the page most worth not skimming" and "the cheapest
 *  defence against the page being read as a performance claim". A caveat set
 *  smaller than the claims it qualifies is a caveat the design has already
 *  decided you will skip.
 *
 *  So they get the full document measure and the same title scale as the six
 *  checks (RowList/Row, 21/24px — the page's selling-row species). The argument is that these five are the
 *  equal of the six: the checks say what the method does, these say where it
 *  stops, and a reader who has one without the other has been misled.
 *
 *  ---------------------------------------------------------------------------
 *  Why it is not the checks rows again
 *  ---------------------------------------------------------------------------
 *
 *  Same page, same measure, so the two lists have to be different species at a
 *  glance or the page reads as one long list with a heading in the middle. The
 *  checks are a two-column row (numbered glyph + large question left, quiet
 *  description right) because a check is a step in a sequence applied to a
 *  filing. A caveat is not a step and not applied to anything, so:
 *
 *    - ONE column, not two. The claim runs the full measure and the body sits
 *      under it, which is the shape of a statement rather than a table.
 *    - NO numerals and NO glyph. Numerals would say "first, then second";
 *      these five have no order. (The hollow ring was considered — page-wide
 *      it means "this filing did not clear this check" — and rejected: there
 *      it is a verdict on a filing, here it would be a claim about the method
 *      itself, which is a second meaning for one mark. See the report.)
 *    - A mono word in a left rail instead: the AXIS the limit sits on. That
 *      label is the whole invention. Five paragraphs of caveats read as an
 *      apology list of unknown length; five labelled axes read as a complete
 *      taxonomy — scope, judgement, disclosure, sample, revision — which is
 *      both more honest and easier to hold. The rail is also what stops a
 *      layman having to read all five to find the one they arrived worried
 *      about.
 *
 *  No colour, no panel, no second dark object: the page has one dark stage and
 *  it is the hero. This section is bare on the cream ground between hairlines,
 *  and its weight is entirely type and space.
 */
import type { ReactNode } from "react";

import { EYEBROW_QUIET, RULE } from "@/components/how-it-works/shared";

/** The caveats, stated plainly rather than buried in small print.
 *
 *  A methodology page that only lists strengths is marketing wearing a lab
 *  coat, and every one of these is a question a careful reader arrives with.
 *  Answering them here is also the cheapest defence against the page being
 *  read as a performance claim, which is the one reading we can't afford.
 *
 *  Moved here verbatim from how-it-works.tsx (its `LIMITS` const), with one
 *  sentence changed: the sample caveat's "The section above shows the exact
 *  shape of it" now names the section and links to it, because "the section
 *  above" is a direction rather than a destination and stops being true the
 *  moment anything is reordered. `label` is new — see the file header.
 */
export const LIMITS: { label: string; title: string; body: ReactNode }[] = [
  {
    label: "Scope",
    title: "A rating is a reading, not a recommendation",
    body: "It describes how well a purchase clears six specific tests. It is not advice, not a price target, and carries no view on whether the shares are worth buying at today’s price.",
  },
  {
    label: "Judgement",
    title: "The checks are judgements, and judgements can be wrong",
    body: "Seniority, conviction and context are all assessed rather than measured, and a check can be marked wrongly in either direction. Every rating is published with the reasoning and the sources behind it precisely so you can disagree with it.",
  },
  {
    label: "Disclosure",
    title: "We only see what gets disclosed",
    body: "The pipeline reads filings. An insider who buys through a structure that doesn’t require disclosure, or a market that files late, is invisible to it, and a disclosure can arrive days after the trade it describes.",
  },
  {
    label: "Sample",
    title: "The record behind it is still short",
    body: (
      <>
        Ratings are scored against what the shares did next, but that scoring
        covers a fraction of what we hold and is concentrated at thirty days.{" "}
        <a
          className="font-medium text-foreground underline decoration-foreground/25 underline-offset-4 transition-colors hover:decoration-foreground"
          href="#measured"
        >
          What we can measure
        </a>
        , above, shows the exact shape of it. Treat any performance figure on
        the site as a description of a small sample.
      </>
    ),
  },
  {
    label: "Revision",
    title: "The checklist moves",
    body: "As the record builds, what each check looks for gets adjusted, which means a filing’s rating can change after publication. That is deliberate, a fixed checklist would be easier to describe and worse at its job.",
  },
];

/** One caveat. Single column by design (see the file header); the rail is a
 *  fixed 7rem so all five labels align into a readable column, and collapses
 *  above the title on phones, where it reads as an ordinary eyebrow. */
function LimitRow({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <li
      className={`grid gap-x-8 gap-y-2.5 border-b ${RULE} py-7 sm:grid-cols-[7rem_minmax(0,1fr)] sm:py-9`}
    >
      {/* The house eyebrow spec, quiet: it names the axis, it is not a
          heading, and five brand-coloured labels stacked in a column would
          shout louder than the claims beside them. */}
      <p className={`${EYEBROW_QUIET} leading-[1.4] sm:pt-2`}>{label}</p>

      <div className="min-w-0">
        <h3 className="max-w-[40ch] text-balance text-[21px] font-semibold leading-[1.15] tracking-[-0.022em] text-foreground sm:text-[24px]">
          {title}
        </h3>
        {/* 54ch, not the 58–60 the rest of the page uses: with no right-hand
            column to stop it, a paragraph here would otherwise run the whole
            860px measure and land around 90 characters a line. */}
        <p className="mt-3 max-w-[54ch] text-[15px] leading-[1.7] text-foreground/75">
          {children}
        </p>
      </div>
    </li>
  );
}

/** The section body. Owns its top rule; rows own their bottom rules, so the
 *  ledger closes cleanly whatever follows it. */
export function LimitsLedger({ className = "" }: { className?: string }) {
  return (
    <ol className={`border-t ${RULE} ${className}`}>
      {LIMITS.map((limit) => (
        <LimitRow key={limit.title} label={limit.label} title={limit.title}>
          {limit.body}
        </LimitRow>
      ))}
    </ol>
  );
}
