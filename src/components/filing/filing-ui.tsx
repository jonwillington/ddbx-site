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
import type { Dealing, RatingChecklist, UsDealing } from "@/types/ddbx";

import { Link } from "react-router-dom";
import {
  CheckIcon,
  ChevronDownIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import {
  BanknotesIcon,
  CalendarDaysIcon,
  IdentificationIcon,
  NewspaperIcon,
  ScaleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

import { CHECKS } from "../../../shared/methodology.js";
import {
  disclosureLagDays,
  shares as fmtShares,
  signedPct,
} from "../../../shared/filings.js";
import { filingFamily } from "../../../shared/filing-family.js";

import { MeterBar } from "@/components/seo/meter-bar";
import { downloadPagePathForMarketId } from "@/lib/app-store";
import { formatPrice, PRICING } from "@/lib/pricing";

const RULE = "border-hairline dark:border-separator";

/** The house card, levelled off /api via its light translation in
 *  download/stat-band.tsx and download/pricing-card.tsx: a hairline border over
 *  a near-white fill, rounded-3xl for a page-scale panel. Named rather than
 *  repeated so the three set pieces below cannot drift into three different
 *  cards, which is how the first version ended up with a tinted panel, a
 *  bordered panel and a bare grid on one page. */
const CARD =
  "rounded-3xl border border-hairline bg-white/70 dark:border-border/60 dark:bg-surface-secondary/40";

/** One icon per check, keyed on `RatingChecklist`.
 *
 *  Presentation only, so it lives here rather than in shared/methodology.js —
 *  the pre-render has no icons and does not need any, and putting a component
 *  reference in the data module would stop the Pages Functions importing it.
 *
 *  Chosen to be readable at 24px without a legend: money for "did they pay",
 *  a badge for "who are they", scales for "how much relative to them", a
 *  calendar for "was the timing forced", a newspaper for "does the record
 *  agree", a shield for "is anything pointing the other way". Same 24/outline
 *  set and the same 1.4 stroke as the /api feature grid. */
const CHECK_ICON: Record<string, typeof BanknotesIcon> = {
  open_market_buy: BanknotesIcon,
  senior_insider: IdentificationIcon,
  meaningful_conviction: ScaleIcon,
  no_alternative_explanation: CalendarDaysIcon,
  supporting_context_found: NewspaperIcon,
  no_major_counter_signal: ShieldCheckIcon,
};

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
export function VerdictBand({
  deal,
  market = "UK",
}: {
  deal: Dealing | UsDealing;
  market?: string;
}) {
  const fam = filingFamily(market);
  const lp = deal.live_performance;
  const lag = disclosureLagDays(deal);
  const ret = lp?.return_pct_disclosed ?? null;
  const alpha = lp?.alpha_pct_disclosed ?? null;
  const dayZero = !!(lp?.as_of && lp.as_of <= deal.disclosed_date);
  const hasOutcome = ret != null && !dayZero;
  const up = (ret ?? 0) >= 0;

  return (
    // TWO UP ON THE PHONE TOO. Stacked, each half was a near-full screen for
    // one number, so the buy had scrolled off before the outcome arrived —
    // and the relationship between them is the entire point of the band. Side
    // by side at every width, with the type stepped down on mobile so both
    // numbers still land as the largest objects on the page.
    <div className={`mt-6 grid grid-cols-2 overflow-hidden ${CARD}`}>
      {/* The buy */}
      <div className="p-4 sm:p-6">
        <p className={LABEL}>The purchase</p>
        <p className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.028em] tabular-nums text-foreground sm:mt-3 sm:text-[44px]">
          {fam.money(fam.value(deal))}
        </p>
        <p className="mt-2 text-[12.5px] leading-[1.5] text-foreground/60 sm:mt-3 sm:text-[13.5px] sm:leading-[1.6]">
          {fmtShares(deal.shares)} shares
          {fam.sharePrice(deal) ? ` at ${fam.sharePrice(deal)}` : ""}
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
      <div className={`border-l ${RULE} p-4 sm:p-6`}>
        <p className={LABEL}>Since disclosure</p>
        {hasOutcome ? (
          <>
            <p
              className={`mt-2 text-[28px] font-semibold leading-none tracking-[-0.028em] tabular-nums sm:mt-3 sm:text-[44px] ${
                up ? "text-positive" : "text-negative"
              }`}
            >
              {signedPct(ret)}
            </p>
            <p className="mt-2 text-[12.5px] leading-[1.5] text-foreground/60 sm:mt-3 sm:text-[13.5px] sm:leading-[1.6]">
              {alpha == null
                ? "Measured from the disclosure-day close."
                : `${signedPct(alpha)} against the market, from the disclosure-day close.`}
              {lp?.as_of ? ` As of ${lp.as_of}.` : ""}
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.028em] text-foreground/25 sm:mt-3 sm:text-[44px]">
              {dayZero ? "Too soon" : "No mark"}
            </p>
            <p className="mt-2 text-[12.5px] leading-[1.5] text-foreground/60 sm:mt-3 sm:text-[13.5px] sm:leading-[1.6]">
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
  market = "UK",
}: {
  checklist: RatingChecklist;
  deal: Dealing | UsDealing;
  market?: string;
}) {
  const fam = filingFamily(market);
  const ctx = fam.checkContext(deal);
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

      {/* ONE CARD, SIX RULED ROWS — not six cards.
          These are six findings to be read in order, and the answer to each —
          met or not — is the thing a reader is looking for, so the verdict
          stays a filled disc at the head of the row: green tick or red cross,
          knocked-out glyph, the treatment the app's WhatWeLookForView uses and
          a reader can take in from across the room. A grey or tinted disc
          reads as "not assessed" rather than "failed".
          What went is the card-per-check. Six separate cards at phone width
          ran to five screens for one section, and the repeating frame (card,
          disc, chip, toggle, six times) drowned the one thing that varies:
          what we found. A single card with hairline rules carries the same
          hierarchy at half the scroll, and the "Met" chip went with it — a
          green tick beside the word Met said the verdict twice, so only a miss
          gets a written tag now. */}
      <div className={`mt-5 overflow-hidden sm:mt-6 ${CARD}`}>
        {CHECKS.map((c, i) => {
          const ok = Boolean(checklist[c.key]);
          const Icon = CHECK_ICON[c.key];

          return (
            <div
              key={c.key}
              className={`flex items-start gap-3 p-4 sm:gap-4 sm:p-5 ${
                i > 0 ? `border-t ${RULE}` : ""
              }`}
            >
              <span
                aria-hidden
                className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white shadow-sm sm:h-7 sm:w-7 ${
                  ok ? "bg-positive" : "bg-negative"
                }`}
              >
                {ok ? (
                  <CheckIcon
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    strokeWidth={2}
                  />
                ) : (
                  <XMarkIcon
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    strokeWidth={2}
                  />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.015em] text-foreground sm:text-[16.5px]">
                    {c.question}
                  </h3>
                  {ok ? null : (
                    <span className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-negative">
                      Not met
                    </span>
                  )}
                </div>

                <p
                  className={`mt-1 max-w-[62ch] text-[13.5px] leading-[1.55] sm:text-[14px] ${
                    ok ? "text-foreground/75" : "text-foreground/55"
                  }`}
                >
                  {ok ? c.passLine(ctx) : c.body}
                </p>

                <details className="group mt-1.5 sm:mt-2">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[12.5px] text-foreground/45 transition-colors hover:text-foreground/75 [&::-webkit-details-marker]:hidden">
                    {Icon ? (
                      <Icon
                        aria-hidden
                        className="h-4 w-4 text-brand-brown dark:text-brand-tan"
                        strokeWidth={1.6}
                      />
                    ) : null}
                    Why this check matters
                    <ChevronDownIcon
                      aria-hidden
                      className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="mt-2.5 max-w-[62ch] text-[13.5px] leading-[1.65] text-foreground/55">
                    {c.detail}
                  </p>
                </details>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** One line between the page's sections: what they would be buying, what it
 *  costs. Threaded by the filing page between its numbered sections — not
 *  inside any of them: repeated between the checks it read as a third of the
 *  checklist, and a reader mid-argument was being interrupted rather than
 *  offered.
 *
 *  Deliberately not a card — the sections either side carry the cards. A
 *  rule, a sentence and a link.
 *
 *  `lead` is the sentence before the terms, and each slot on the page passes
 *  its own: the same line verbatim three times down one document read as a
 *  banner rotation, not a reminder. What never varies is the tail — the trial
 *  length and the price — because that is the fact the reader is being
 *  reminded of, and it should sound identical every time it appears.
 *
 *  The price is read from `PRICING`, which is the only place on the public web
 *  that states one (mirrored by hand from App Store Connect). Never hard-code
 *  a figure here. */
export function TrialNudge({
  marketId,
  lead = "Don’t miss the next director deal.",
}: {
  marketId: string;
  lead?: string;
}) {
  const p = PRICING[marketId === "us" ? "us" : "uk"];

  return (
    <p
      className={`border-y ${RULE} px-1 py-3 text-[13px] leading-[1.6] text-foreground/55`}
    >
      {lead} {p.trialDays} days free, then {formatPrice(p, p.annual)} for the
      year{p.promotional ? ", a limited-time price" : ""}.{" "}
      <Link
        className="font-semibold text-brand-brown underline-offset-4 hover:underline dark:text-brand-tan"
        data-ga-event="cta_filing_check_nudge"
        data-ga-label={marketId}
        to={downloadPagePathForMarketId(marketId)}
      >
        Download the app
      </Link>
    </p>
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
