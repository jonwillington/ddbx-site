/** The six checks, with their verdicts brought out of the fold.
 *
 *  The section this replaces was right about its rows and wrong about its
 *  evidence. The rows are tenet 3 of the design language and they read well:
 *  the question set large on the left, the plain answer quiet on the right.
 *  But the thing that actually proves a check — one real filing that cleared
 *  it beside one real filing that didn't — sat behind a `<details>` on every
 *  row, so the page's best material was six clicks away and the visible
 *  section was still six abstract questions.
 *
 *  Two changes, and they depend on each other.
 *
 *  1. THE SCORECARD. Before the rows, one panel: the specimen's six results
 *     drawn as six ticked discs, spread across the full width of the panel and
 *     labelled with the check each one belongs to. (The filing itself — who,
 *     what, when — is introduced once, in the SpecimenCard under the hero;
 *     repeating the logo and the facts here put the same three lines on screen
 *     twice within a scroll.) All six are cleared, because the specimen is
 *     rated significant and significant means all six cleared (RATING_SCALE,
 *     src/lib/methodology.ts) — not a number invented for the drawing. The
 *     strip's job is to teach the code in one glance, so that by the time the
 *     reader reaches row one, a ticked disc already means "cleared" and a
 *     crossed ring already means "not cleared". A legend that only explained
 *     the marks would be a key; this one is a real result that happens to be
 *     legible as a key, and the labels under the numerals make it the map of
 *     the six rows below rather than six anonymous dots.
 *
 *  2. THE VERDICT PAIR, UNFOLDED — AND NAMED AS TRADES. Each row shows both
 *     filings inline: the specimen's verdict via the check's own `passLine`
 *     under a ticked disc, and the filing that failed exactly this check under
 *     a crossed ring. What a check judges is ONE purchase by ONE person on ONE
 *     date, so each verdict names that purchase — buyer, role, amount, company
 *     and trade date — rather than leading with a company name, which read as
 *     a verdict on the company itself. Two rows, one aligned verdict column,
 *     so the contrast is scannable; stacked at phone widths. What stays folded
 *     is the long `detail`, which is genuinely depth rather than evidence.
 *
 *  ---------------------------------------------------------------------------
 *  Marks
 *  ---------------------------------------------------------------------------
 *
 *  Verdict is carried by FILL AND GLYPH, never by colour: a ticked ink disc =
 *  cleared, a crossed hollow ring = not cleared. Both are still ink — the old
 *  ✓/✗ in positive-green and negative-red is gone, because on this page colour
 *  is reserved for measured market outcomes and a pass/fail is not one. Every
 *  verdict line carries the company's logo disc, because both lines are now
 *  trades and a trade is identified by its company; the specimen keeps the
 *  page's specimen mark (brand disc, 2px ring at 30%) beside the buyer's name,
 *  so the reader can see it is the same purchase on all six rows. Every line
 *  is a link to the filing that produced the verdict.
 *
 *  ---------------------------------------------------------------------------
 *  Degrading
 *  ---------------------------------------------------------------------------
 *
 *  `examplesFor` is null on SE and NL, which carry no analysis layer. With no
 *  examples the scorecard doesn't render and the rows carry no verdict pairs —
 *  the section is then six questions, six answers and six folded "why"s, which
 *  is what it was before there were worked examples, and still composes.
 */
import type { MethodologyCheck } from "@/lib/methodology";
import type {
  ExampleFiling,
  MethodologyExamples,
} from "@/lib/methodology-examples";
import type { ReactNode } from "react";

import { Link } from "react-router-dom";

import { CompanyLogo } from "@/components/company-logo";
import {
  EYEBROW,
  Fold,
  KICKER,
  PANEL,
  RULE,
  StepNode,
  shortDate,
} from "@/components/how-it-works/shared";
import {
  SpecimenMark,
  VerdictDisc,
} from "@/components/how-it-works/specimen-mark";
import { RatingBadge } from "@/components/rating-badge";
import { Row, RowList } from "@/components/row-list";
import { CHECKS } from "@/lib/methodology";
import { specimenContext } from "@/lib/methodology-examples";

// ── The scorecard ───────────────────────────────────────────────────────────

/** The specimen, scored, above the rows.
 *
 *  Two bands under one hairline: who bought what, then the six results as a
 *  strip beside the sentence that reads the strip. Everything here is a
 *  property of the filing or a consequence of its rating; no attrition,
 *  proportion or count is invented to fill the drawing. */
export function ChecksScorecard({
  examples,
}: {
  examples: MethodologyExamples | null;
}) {
  if (!examples) return null;

  const s = examples.specimen;

  return (
    <div className={`mt-9 ${PANEL} px-5 py-6 sm:px-8 sm:py-7`}>
      <div className="flex items-center gap-2.5">
        <SpecimenMark />
        <p className={EYEBROW}>The worked example, scored</p>
        <span className="ml-auto shrink-0">
          <RatingBadge rating={s.rating} />
        </span>
      </div>

      {/* The strip, full width. One position per check, in the order they are
          scored, numbered and named to match the rows below. */}
      <ol
        aria-label={`All ${CHECKS.length} checks cleared: ${CHECKS.map((c) => c.label).join(", ")}.`}
        className="mt-7 grid grid-cols-3 gap-x-3 gap-y-7 sm:grid-cols-6 sm:gap-x-5"
      >
        {CHECKS.map((check, i) => (
          <li
            key={check.key}
            className="flex flex-col items-center gap-2.5 text-center"
          >
            <VerdictDisc cleared delayMs={80 + i * 70} size={30} />
            <span className="font-mono text-[12px] font-semibold tabular-nums leading-none text-foreground/40">
              {i + 1}
            </span>
            <span className="text-balance text-[12px] leading-[1.35] text-foreground/50">
              {check.label}
            </span>
          </li>
        ))}
      </ol>

      <p
        className={`mt-7 border-t ${RULE} max-w-[72ch] pt-6 text-[16px] leading-[1.65] text-foreground/70`}
      >
        <Link
          className="font-medium text-foreground/90 underline underline-offset-4 hover:text-foreground"
          to={s.path}
        >
          {s.name}’s {s.value} purchase of {s.company}
        </Link>{" "}
        <span className="text-foreground/90">cleared all six</span>, which is
        what a significant rating means. A ticked disc{" "}
        <VerdictDisc cleared size={15} /> is a check this purchase cleared; a
        crossed ring <VerdictDisc cleared={false} size={15} /> is one it did
        not. Every check below shows two real trades: this one clearing it, and
        another that failed it.
      </p>
    </div>
  );
}

// ── The verdict pair, per row ───────────────────────────────────────────────

/** One TRADE's verdict on one check: the mark, the purchase named in full,
 *  and the sentence that explains the verdict.
 *
 *  The thing a check judges is a single purchase — one person, one amount, one
 *  date — so the line names all of it. Leading with the company (the shape
 *  this had before) read as a verdict on the company itself, which is the one
 *  thing the page must not be understood to be saying. The whole line is a
 *  link every time: on this page anything specific is a link to the thing
 *  itself, so a reader who doubts a verdict can go and read the filing that
 *  produced it. Names are never truncated.
 *
 *  No specimen mark here, deliberately. It was tried inline after the buyer's
 *  name and orphaned onto its own line the moment the name and role wrapped,
 *  which at the width this column actually gets is most of the time. The
 *  specimen is already marked once at the head of the section, on the
 *  scorecard panel, and the repeated purchase line does the rest of the work:
 *  the same buyer, the same amount, the same date on all six rows. */
function VerdictEntry({
  cleared,
  filing,
  children,
}: {
  cleared: boolean;
  filing: ExampleFiling;
  children: ReactNode;
}) {
  return (
    <li>
      {/* A white card per trade, on Jon's 2026-09-07 note: "make these
          larger, the two buys, the yes and the no, with white BG and a green
          check and red x". White rather than the sheet tint so the pair lifts
          off the cream row it sits in; the verdict column takes the colour. */}
      <Link
        className="group grid gap-x-6 gap-y-3 rounded-2xl border border-hairline bg-white px-5 py-4 outline-none transition-colors @xl:grid-cols-[150px_minmax(0,1fr)] hover:border-brand-brown/30 focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:border-white/20 sm:px-6 sm:py-5"
        to={filing.path}
      >
        {/* The verdict, as its own column once the card is wide enough to
            spare 150px — a CONTAINER query, not a viewport one: at 1440 with
            the SEO rail this column is about 560px wide. Below the threshold
            the verdict stacks above the trade. */}
        <span className="flex items-center gap-2.5 @xl:items-start @xl:pt-[6px]">
          <VerdictDisc cleared={cleared} size={26} />
          <span
            className={`${KICKER} whitespace-nowrap text-[11.5px] @xl:pt-[6px] ${
              cleared ? "text-positive" : "text-negative"
            }`}
          >
            {cleared ? "Cleared" : "Not cleared"}
          </span>
        </span>

        <span className="block min-w-0">
          <span className="flex items-start gap-3.5">
            <CompanyLogo size={44} ticker={filing.ticker} />
            <span className="min-w-0">
              <span className="block text-[19px] font-semibold leading-[1.25] tracking-[-0.015em] text-foreground underline-offset-4 group-hover:underline sm:text-[20px]">
                {filing.name}
                {filing.role ? (
                  <span className="font-normal text-foreground/60">
                    , {filing.role}
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block text-[15px] leading-[1.45] text-foreground/60">
                bought {filing.value} of {filing.company} ·{" "}
                {shortDate(filing.date)}
              </span>
            </span>
          </span>
          {/* Indented to the name, so logo + name + facts + explanation read
              as one block hanging off the verdict beside them. 58px = the
              44px logo plus the 14px gap beside it. */}
          <span
            className={`mt-3 block text-[16px] leading-[1.6] sm:pl-[58px] ${
              cleared ? "text-foreground/85" : "text-foreground/65"
            }`}
          >
            {children}
          </span>
        </span>
      </Link>
    </li>
  );
}

/** The pair under one check. The counter is optional by design: a check with
 *  no clean, honest counter-example in the corpus (US supporting-context) is
 *  simply absent, and absent beats forced. */
export function CheckVerdicts({
  check,
  examples,
}: {
  check: MethodologyCheck;
  examples: MethodologyExamples | null;
}) {
  if (!examples) return null;

  const counter = examples.counters[check.key];

  return (
    <ul className="@container mt-6 space-y-3">
      <VerdictEntry cleared filing={examples.specimen}>
        {check.passLine(specimenContext(examples.specimen))}
      </VerdictEntry>
      {counter ? (
        <VerdictEntry cleared={false} filing={counter}>
          {counter.line}
        </VerdictEntry>
      ) : null}
    </ul>
  );
}

// ── The rows ────────────────────────────────────────────────────────────────

/** The six rows. Question large, label as the kicker, body as the quiet
 *  description, the verdict pair visible beneath it, the long why folded. */
export function ChecksRowList({
  examples,
}: {
  examples: MethodologyExamples | null;
}) {
  return (
    <RowList className="mt-10">
      {CHECKS.map((check, i) => (
        <Row
          key={check.key}
          glyph={<StepNode index={i} />}
          kicker={check.label}
          more={
            <Fold
              className="mt-6 max-w-[64ch]"
              label="Why this check earns its place"
            >
              <p className="text-[15px] leading-[1.7] text-foreground/65">
                {check.detail}
              </p>
            </Fold>
          }
          split="description"
          title={
            /* The page's selling-row scale is 24/26px; RowList's own h3 is
             * 21/24px and is shared with every other page, so the size is
             * lifted here rather than in the shared component. */
            <span className="text-[24px] sm:text-[26px]">{check.question}</span>
          }
        >
          <>
            <p className="max-w-[62ch] text-[16px] leading-[1.65] text-foreground/75">
              {check.body}
            </p>
            <CheckVerdicts check={check} examples={examples} />
          </>
        </Row>
      ))}
    </RowList>
  );
}
