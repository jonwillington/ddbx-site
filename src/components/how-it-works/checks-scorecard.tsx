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
 *     drawn as six discs on a strip. (The filing itself — who, what, when — is
 *     introduced once, in the SpecimenCard under the hero; repeating the logo
 *     and the facts here put the same three lines on screen twice within a
 *     scroll.) All six are filled, because
 *     the specimen is rated significant and significant means all six cleared
 *     (RATING_SCALE, src/lib/methodology.ts) — not a number invented for the
 *     drawing. The strip's job is to teach the code in one glance, so that by
 *     the time the reader reaches row one, a filled disc already means
 *     "cleared" and a hollow ring already means "not cleared". A legend that
 *     only explained the marks would be a key; this one is a real result that
 *     happens to be legible as a key.
 *
 *  2. THE VERDICT PAIR, UNFOLDED. Each row now shows both filings inline: the
 *     specimen's verdict via the check's own `passLine` under a filled disc,
 *     and the filing that failed exactly this check under a hollow ring. Set
 *     small and quiet under the 15px body, so the row still scans as one
 *     question, but visible — the contrast is the argument, and an argument
 *     you have to open is an argument nobody reads. What stays folded is the
 *     long `detail`, which is genuinely depth rather than evidence.
 *
 *  ---------------------------------------------------------------------------
 *  Marks
 *  ---------------------------------------------------------------------------
 *
 *  Verdict is carried by FILL, never by colour: filled ink disc = cleared,
 *  hollow ring = not cleared. The old ✓/✗ in positive-green and negative-red
 *  is gone, because on this page colour is reserved for measured market
 *  outcomes and a pass/fail is not one. The specimen carries the page's
 *  specimen mark (brand disc, 2px ring at 30%, offset 2px); the counters
 *  carry logo discs, and every company name is a link to its filing.
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
  StepNode,
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
    <div className={`mt-8 ${PANEL} px-5 py-5 sm:px-6 sm:py-6`}>
      <div className="flex items-center gap-2.5">
        <SpecimenMark />
        <p className={EYEBROW}>The worked example, scored</p>
        <span className="ml-auto shrink-0">
          <RatingBadge rating={s.rating} />
        </span>
      </div>

      <div className="mt-5 grid gap-x-9 gap-y-5 sm:grid-cols-[minmax(0,auto)_minmax(0,1fr)] sm:items-center">
        {/* The strip. One position per check, in the order they're scored,
            numbered to match the numerals on the rows below. */}
        <ol
          aria-label={`All ${CHECKS.length} checks cleared: ${CHECKS.map((c) => c.label).join(", ")}.`}
          className="flex max-w-[300px] items-end gap-[clamp(14px,5vw,32px)] sm:max-w-none"
        >
          {CHECKS.map((check, i) => (
            <li key={check.key} className="flex flex-col items-center gap-2.5">
              <VerdictDisc cleared delayMs={80 + i * 70} size={15} />
              <span className="font-mono text-[10px] font-semibold tabular-nums leading-none text-foreground/35">
                {i + 1}
              </span>
            </li>
          ))}
        </ol>

        <p className="max-w-[46ch] text-[13.5px] leading-[1.6] text-foreground/70">
          <Link
            className="font-medium text-foreground/90 underline underline-offset-4 hover:text-foreground"
            to={s.path}
          >
            {s.name}’s {s.company} purchase
          </Link>{" "}
          <span className="text-foreground/90">cleared all six</span>, which is
          what a significant rating means. A filled disc{" "}
          <VerdictDisc cleared size={10} /> is a check cleared, a hollow ring{" "}
          <VerdictDisc cleared={false} size={10} /> is one it didn’t. Every
          check below carries both: how this purchase cleared it, and a real
          filing that didn’t.
        </p>
      </div>
    </div>
  );
}

// ── The verdict pair, per row ───────────────────────────────────────────────

/** One filing's verdict on one check: the mark, who it was, and the sentence.
 *  The company is a link every time — on this page anything specific is a
 *  link to the thing itself, so a reader who doubts a verdict can go and read
 *  the filing that produced it. */
function VerdictEntry({
  cleared,
  label,
  filing,
  isSpecimen = false,
  children,
}: {
  cleared: boolean;
  label: string;
  filing: ExampleFiling;
  isSpecimen?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[14px_minmax(0,1fr)] gap-x-3">
      <span className="flex h-[19px] items-center justify-center">
        <VerdictDisc cleared={cleared} />
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span
            className={`${KICKER} ${
              cleared ? "text-foreground/55" : "text-foreground/40"
            }`}
          >
            {label}
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            {isSpecimen ? (
              <SpecimenMark className="h-3.5 w-3.5" />
            ) : (
              <CompanyLogo size={16} ticker={filing.ticker} />
            )}
            <Link
              className="truncate text-[12.5px] font-medium text-foreground/70 underline underline-offset-4 hover:text-foreground"
              to={filing.path}
            >
              {filing.company}
            </Link>
          </span>
        </p>
        <p
          className={`mt-1 text-[13.5px] leading-[1.6] ${
            cleared ? "text-foreground/80" : "text-foreground/60"
          }`}
        >
          {children}
        </p>
      </div>
    </div>
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
    <div className="mt-5 max-w-[58ch] space-y-3.5">
      <VerdictEntry
        cleared
        isSpecimen
        filing={examples.specimen}
        label="Cleared"
      >
        {check.passLine(specimenContext(examples.specimen))}
      </VerdictEntry>
      {counter ? (
        <VerdictEntry cleared={false} filing={counter} label="Not cleared">
          {counter.line}
        </VerdictEntry>
      ) : null}
    </div>
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
              className="mt-5 max-w-[58ch]"
              label="Why this check earns its place"
            >
              <p className="text-[14px] leading-[1.7] text-foreground/65">
                {check.detail}
              </p>
            </Fold>
          }
          title={check.question}
        >
          <>
            <p className="max-w-[58ch] text-[15px] leading-[1.65] text-foreground/75">
              {check.body}
            </p>
            <CheckVerdicts check={check} examples={examples} />
          </>
        </Row>
      ))}
    </RowList>
  );
}
