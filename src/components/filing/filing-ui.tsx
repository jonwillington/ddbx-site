/** The filing page's three set pieces: the verdict band, the checklist that
 *  teaches, and the assessment panel that sells.
 *
 *  The first version of this page was a document — a facts table, four grey
 *  stat tiles, a bullet list and a pass/fail column. Every fact was correct and
 *  none of it was persuasive, which is a problem, because a filing page is the
 *  most common way a stranger meets this product. Three specific failures, one
 *  component each:
 *
 *  1. **The outcome was a stat tile.** The single most interesting thing about
 *     a filing is what the shares did afterwards, and it was rendered in the
 *     same grey well as the share count. `VerdictBand` makes the buy and the
 *     outcome the page's largest objects and puts them side by side, because
 *     the interesting thing is the relationship between them.
 *  2. **The checklist asserted instead of explaining.** "Meaningful size for
 *     them — Met" tells a reader nothing about what was tested or why it
 *     matters, so six rows of it read as a badge rather than a method.
 *     `RatingChecks` gives every row the check's own question, its explanation,
 *     and — where it passed — what we actually found for THIS filing. That copy
 *     already existed in shared/methodology.js and was going unused here.
 *  3. **The ask was a sentence in grey.** "The written assessment behind this
 *     rating is in the app" is not an offer, it is a note. `AssessmentPanel`
 *     states what is actually behind it, in counts, which is both honest and a
 *     far stronger claim: "six points, six pieces of evidence for, three
 *     against, five risks, drawn from seven sources".
 *
 *  On that last one, the boundary is unchanged and worth restating because it
 *  is the thing most likely to be eroded by a future edit: counts and the
 *  third-party source URLs are metadata, and both the crawler and the visitor
 *  see exactly this panel. Rendering a word of the analysis here — or blurring
 *  it for one audience and not the other — breaks the rule shared/filings.js
 *  sets out.
 */
import type { Dealing, RatingChecklist } from "@/types/ddbx";
import type { AnalysisShape, CitedSource } from "../../../shared/filings";

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ChevronDownIcon,
  LockClosedIcon,
  MinusIcon,
} from "@heroicons/react/20/solid";

import { CHECKS } from "../../../shared/methodology.js";
import {
  checkContext,
  disclosureLagDays,
  money,
  sharePrice,
  shares as fmtShares,
  signedPct,
} from "../../../shared/filings.js";

import { BUTTON_RADIUS } from "@/components/button";
import { MeterBar } from "@/components/seo/meter-bar";

const RULE = "border-hairline dark:border-separator";

/** The house card, levelled off /api via its light translation in
 *  download/stat-band.tsx and download/pricing-card.tsx: a hairline border over
 *  a near-white fill, rounded-3xl for a page-scale panel. Named rather than
 *  repeated so the three set pieces below cannot drift into three different
 *  cards, which is how the first version ended up with a tinted panel, a
 *  bordered panel and a bare grid on one page. */
const CARD =
  "rounded-3xl border border-hairline bg-white/70 dark:border-border/60 dark:bg-surface-secondary/40";

/** The eyebrow spec, unchanged from every other kicker on the site: mono, 11px,
 *  semibold, uppercase, 0.16em. It was set at 10px here, which is the one size
 *  the house spec does not use outside a dense rail. */
const LABEL =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/45";

/* ─── The verdict band ───────────────────────────────────────────────────── */

/** What was bought, and what it did. The page's headline object.
 *
 *  Two halves rather than one row of four tiles: a purchase and its outcome are
 *  different KINDS of fact — one is fixed at disclosure, the other is still
 *  moving — and setting them as one undifferentiated strip of numbers was what
 *  made the original read as a spreadsheet. The rule between them is the point.
 *
 *  The outcome half has three states and says which it is in words, because
 *  "no return yet" and "we hold no mark" are different, and a dash for both
 *  tells the reader neither. */
export function VerdictBand({ deal }: { deal: Dealing }) {
  const lp = deal.live_performance;
  const lag = disclosureLagDays(deal);
  const ret = lp?.return_pct_disclosed ?? null;
  const alpha = lp?.alpha_pct_disclosed ?? null;
  const dayZero = !!(lp?.as_of && lp.as_of <= deal.disclosed_date);
  const hasOutcome = ret != null && !dayZero;
  const up = (ret ?? 0) >= 0;

  return (
    <div className={`mt-7 grid overflow-hidden ${CARD} sm:grid-cols-2`}>
      {/* The buy */}
      <div className="p-5 sm:p-6">
        <p className={LABEL}>The purchase</p>
        <p className="mt-3 text-[36px] font-semibold leading-none tracking-[-0.028em] tabular-nums text-foreground sm:text-[44px]">
          {money(deal.value_gbp, deal.currency)}
        </p>
        <p className="mt-3 text-[13.5px] leading-[1.6] text-foreground/60">
          {fmtShares(deal.shares)} shares at {sharePrice(deal)}
          {lag == null
            ? ""
            : lag === 0
              ? ", disclosed the same day"
              : `, disclosed ${lag} ${lag === 1 ? "day" : "days"} later`}
          .
        </p>
      </div>

      {/* The outcome. A rule rather than a second fill: two tints would read as
          two unrelated cards, and these are one comparison. */}
      <div className={`border-t ${RULE} p-5 sm:border-l sm:border-t-0 sm:p-6`}>
        <p className={LABEL}>Since disclosure</p>
        {hasOutcome ? (
          <>
            <p
              className={`mt-3 text-[36px] font-semibold leading-none tracking-[-0.028em] tabular-nums sm:text-[44px] ${
                up ? "text-positive" : "text-negative"
              }`}
            >
              {signedPct(ret)}
            </p>
            <p className="mt-3 text-[13.5px] leading-[1.6] text-foreground/60">
              {alpha == null
                ? "Measured from the disclosure-day close."
                : `${signedPct(alpha)} against the market, from the disclosure-day close.`}
              {lp?.as_of ? ` As of ${lp.as_of}.` : ""}
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 text-[36px] font-semibold leading-none tracking-[-0.028em] text-foreground/25 sm:text-[44px]">
              {dayZero ? "Too soon" : "No mark"}
            </p>
            <p className="mt-3 text-[13.5px] leading-[1.6] text-foreground/60">
              {dayZero
                ? `Disclosed on ${deal.disclosed_date}, which is also the latest close we hold. This fills in as the price moves.`
                : "We don’t hold a price mark for this filing yet."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── The checklist that explains itself ─────────────────────────────────── */

/** The six checks, each answered for this specific filing.
 *
 *  THE FINDING IS ALWAYS VISIBLE. The first version put everything behind a
 *  disclosure triangle and opened only the rows that failed, on the reasoning
 *  that a reader scanning green ticks does not need six expanded rows. On a
 *  filing that clears all six — which is what "significant" means, so it is the
 *  common case on exactly the pages most worth reading — that produced six
 *  identical collapsed rows saying "Met", which is the badge-not-a-method
 *  failure this component exists to fix, reintroduced by the interaction
 *  design.
 *
 *  So each row shows what we actually found ("Gerald Kuehr paid 69.00p a share
 *  on the open market, £860k of their own money") with no interaction at all.
 *  A failed row shows the check's plain description instead, because there is
 *  no honest generated sentence for "why this one missed" and inventing one
 *  would be the only place on the page where the copy outran the data.
 *
 *  What stays behind the toggle is `detail` — why the check earns its place at
 *  all. That is the part a reader wants once rather than six times, and it is
 *  the argument for the method rather than the result of it. */
export function RatingChecks({
  checklist,
  deal,
}: {
  checklist: RatingChecklist;
  deal: Dealing;
}) {
  const ctx = checkContext(deal);
  const met = CHECKS.filter((c) => checklist[c.key]).length;

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[13.5px] text-foreground/70">
          {met} of {CHECKS.length} checks met
        </p>
        <Link
          className="text-[12px] text-foreground/45 underline-offset-4 hover:text-foreground hover:underline"
          to="/how-it-works"
        >
          How the checks work
        </Link>
      </div>
      <MeterBar className="mt-2" max={CHECKS.length} value={met} />

      <ul className={`mt-5 border-t ${RULE}`}>
        {CHECKS.map((c) => {
          const ok = Boolean(checklist[c.key]);

          return (
            <li key={c.key} className={`border-b ${RULE} py-3.5`}>
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    ok
                      ? "bg-positive/12 text-positive"
                      : "bg-foreground/[0.06] text-foreground/35"
                  }`}
                >
                  {ok ? (
                    <CheckIcon className="h-3.5 w-3.5" />
                  ) : (
                    <MinusIcon className="h-3.5 w-3.5" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="min-w-0 text-[14px] font-medium text-foreground">
                      {c.question}
                    </p>
                    <span
                      className={`shrink-0 text-[12px] ${ok ? "text-positive" : "text-foreground/35"}`}
                    >
                      {ok ? "Met" : "Not met"}
                    </span>
                  </div>

                  <p
                    className={`mt-1.5 max-w-[60ch] text-[13.5px] leading-[1.6] ${
                      ok ? "text-foreground/80" : "text-foreground/55"
                    }`}
                  >
                    {ok ? c.passLine(ctx) : c.body}
                  </p>

                  <details className="group mt-1.5">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[12px] text-foreground/40 transition-colors hover:text-foreground/70 [&::-webkit-details-marker]:hidden">
                      Why this check matters
                      <ChevronDownIcon
                        aria-hidden
                        className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
                      />
                    </summary>
                    <p className="mt-2 max-w-[60ch] border-l-2 border-hairline pl-3 text-[13px] leading-[1.65] text-foreground/55 dark:border-separator">
                      {c.detail}
                    </p>
                  </details>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─── The ask ────────────────────────────────────────────────────────────── */

/** What the written assessment contains, and where to read it.
 *
 *  Counts, not content. See this file's header and shared/filings.js for the
 *  boundary; the short version is that "six points for, three against" is a
 *  claim about the analysis rather than the analysis, and it converts better
 *  than the grey sentence it replaced precisely because it is specific.
 *
 *  Deliberately NOT a second dark slab. The shell already terminates the page
 *  with `AppCtaBand`, and the site's grammar is one contrasting object per page
 *  — two filled asks in one document is how a page starts reading as a funnel.
 *  This one is a bordered panel with a quiet link. */
export function AssessmentPanel({
  shape,
  sources,
  rating,
}: {
  shape: AnalysisShape;
  sources: CitedSource[];
  rating: string;
}) {
  const [open, setOpen] = useState(false);
  const items = [
    {
      n: shape.thesis,
      one: "point in the thesis",
      many: "points in the thesis",
    },
    {
      n: shape.for,
      one: "piece of evidence for",
      many: "pieces of evidence for",
    },
    { n: shape.against, one: "piece against", many: "pieces against" },
    { n: shape.risks, one: "key risk", many: "key risks" },
  ].filter((i) => i.n > 0);

  return (
    <div className={`mt-4 overflow-hidden ${CARD}`}>
      <div className="p-5 sm:p-6">
        <p className={`flex items-center gap-2 ${LABEL}`}>
          <LockClosedIcon aria-hidden className="h-3.5 w-3.5" />
          In the app
        </p>
        <p className="mt-3 max-w-[54ch] text-[16.5px] font-semibold leading-[1.35] tracking-[-0.012em] text-foreground">
          The written case for and against this buy, rated {rating}.
        </p>

        <ul className="mt-5 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {items.map((i) => (
            <li
              key={i.many}
              className={`flex items-baseline gap-2.5 border-b ${RULE} pb-2`}
            >
              <span className="text-[17px] font-semibold tabular-nums text-foreground">
                {i.n}
              </span>
              <span className="text-[13px] text-foreground/60">
                {i.n === 1 ? i.one : i.many}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-[13px] leading-[1.6] text-foreground/55">
          {shape.confidence != null
            ? `Written with ${shape.confidence}% stated confidence`
            : "Written with a stated confidence"}
          {shape.window ? `, over a ${shape.window} catalyst window` : ""}
          {shape.sources > 0
            ? `, drawn from ${shape.sources} named ${shape.sources === 1 ? "source" : "sources"}.`
            : "."}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            className={`${BUTTON_RADIUS} bg-foreground/[0.06] px-4 py-2 text-[13.5px] font-medium text-foreground transition-colors hover:bg-foreground/[0.1]`}
            data-ga-event="cta_filing_assessment"
            data-ga-label="Filing assessment panel"
            to="/download"
          >
            Read it in the app
          </Link>
          {sources.length > 0 ? (
            <button
              className="text-[13px] text-foreground/50 underline-offset-4 hover:text-foreground hover:underline"
              type="button"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "Hide sources" : `See the ${sources.length} sources`}
            </button>
          ) : null}
        </div>
      </div>

      {/* The sources are third-party URLs, so they are publishable in full and
          worth publishing: they are the visible evidence that the assessment
          behind the lock was researched rather than generated from the filing
          alone. Collapsed because seven link rows would otherwise outweigh the
          panel they are supporting. */}
      {open && sources.length > 0 ? (
        <ul className={`border-t ${RULE}`}>
          {sources.map((s) => (
            <li key={s.url} className={`border-b ${RULE} px-5 py-3 sm:px-6`}>
              <a
                className="group flex items-start gap-2 text-[13.5px] leading-[1.55] text-foreground/80 hover:text-foreground"
                href={s.url}
                rel="nofollow noopener noreferrer"
                target="_blank"
              >
                <span className="min-w-0">
                  {s.headline}
                  <span className="mt-0.5 block text-[12px] text-foreground/45">
                    {s.label}
                  </span>
                </span>
                <ArrowTopRightOnSquareIcon
                  aria-hidden
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/30 group-hover:text-foreground/60"
                />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* ─── Context ────────────────────────────────────────────────────────────── */

/** Cluster and buy style, as cards rather than bullets.
 *
 *  These are the two derived signals a competitor's filing row does not carry,
 *  so setting them as a two-line unordered list undersold them. A card each,
 *  with the figure that earned the label, does not. */
export function ContextCards({
  items,
}: {
  items: { label: string; value: string; body: string }[];
}) {
  if (items.length === 0) return null;

  return (
    // Columns from the count, not fixed at two: a single card in a 2-col grid
    // leaves half the row empty, which reads as a card that failed to load.
    <div
      className={`mt-4 grid gap-3 ${items.length > 1 ? "sm:grid-cols-2" : ""}`}
    >
      {items.map((i) => (
        <div key={i.label} className={`${CARD} h-full p-5`}>
          <p className={LABEL}>{i.label}</p>
          <p className="mt-2.5 text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground">
            {i.value}
          </p>
          <p className="mt-2 text-[13px] leading-[1.6] text-foreground/60">
            {i.body}
          </p>
        </div>
      ))}
    </div>
  );
}
