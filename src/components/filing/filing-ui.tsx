/** The filing page's set pieces below the stage: the checklist that teaches,
 *  the trial nudge threaded between sections, and the context rows.
 *
 *  The verdict band that used to open this file (the purchase and its outcome
 *  as two 44px figures in a white card) went into the dark stage on 2026-09-19
 *  as its figure band; see components/filing/filing-stage.tsx.
 *
 *  The checklist exists because "Meaningful size for them — Met" tells a
 *  reader nothing about what was tested or why it matters, so six rows of it
 *  read as a badge rather than a method. `RatingChecks` gives every row the
 *  check's own question, what we found for THIS filing, and the reason the
 *  check earns its place. That copy lives in shared/methodology.js.
 */
import type { ReactNode } from "react";
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
import { filingFamily } from "../../../shared/filing-family.js";

import { Row, RowList } from "@/components/row-list";
import { downloadPagePathForMarketId } from "@/lib/app-store";
import { formatPrice, PRICING } from "@/lib/pricing";

const RULE = "border-hairline dark:border-separator";

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
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/45">
          {met} of {CHECKS.length} met
        </p>
        <Link
          className="text-[12.5px] text-foreground/50 underline-offset-4 hover:text-foreground hover:underline"
          to="/how-it-works"
        >
          How the checks work
        </Link>
      </div>

      {/* SIX HAIRLINE ROWS, the /how-it-works checks' shape (RowList) one
          step down in scale, so the method reads the same on the page that
          teaches it and the filing that applies it. The question is the row's claim on the left; what
          we found for THIS filing is the description on the right.
          The verdict used to be a filled green or red disc at the head of
          each row inside a white card. The discs went with the card: the
          house boolean is a small check in the positive ink for yes, and a
          miss is the only row that also says so in words, in the negative
          ink, because a failed check is the one fact here a reader must not
          skim past. Colour carries that meaning and nothing else. */}
      <RowList className="mt-4">
        {CHECKS.map((c, i) => {
          const ok = Boolean(checklist[c.key]);
          const Icon = CHECK_ICON[c.key];

          return (
            <CheckRow
              key={c.key}
              glyph={
                ok ? (
                  <CheckIcon
                    aria-label="Met"
                    className="h-5 w-5 text-positive"
                  />
                ) : (
                  <XMarkIcon
                    aria-label="Not met"
                    className="h-5 w-5 text-negative"
                  />
                )
              }
              kicker={
                <>
                  Check {i + 1}
                  {ok ? null : (
                    <span className="text-negative"> · Not met</span>
                  )}
                </>
              }
              more={
                <details className="group mt-3">
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
                  <p className="mt-2.5 max-w-[58ch] text-[13.5px] leading-[1.65] text-foreground/55">
                    {c.detail}
                  </p>
                </details>
              }
              title={c.question}
            >
              <p
                className={`max-w-[58ch] text-[15px] leading-[1.65] ${
                  ok ? "text-foreground/80" : "text-foreground/55"
                }`}
              >
                {ok ? c.passLine(ctx) : c.body}
              </p>
            </CheckRow>
          );
        })}
      </RowList>
    </div>
  );
}

/** One check as a hairline row. `Row` from row-list.tsx at 24px wrapped
 *  every question to three lines in its left column ("Was it an open- /
 *  market buy?"); a filing is where the answer is the content, so the claim
 *  steps down to 18px and keeps its line. */
function CheckRow({
  glyph,
  title,
  kicker,
  more,
  children,
}: {
  glyph: ReactNode;
  title: string;
  kicker: ReactNode;
  more?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li
      className={`grid gap-x-10 gap-y-2 border-b ${RULE} py-6 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] sm:py-7`}
    >
      <div className="flex gap-3">
        <span className="mt-0.5 shrink-0">{glyph}</span>
        <div className="min-w-0">
          <h3 className="text-balance text-[17px] font-semibold leading-[1.25] tracking-[-0.015em] text-foreground sm:text-[19px]">
            {title}
          </h3>
          <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-foreground/40">
            {kicker}
          </p>
        </div>
      </div>
      <div className="min-w-0 pl-8 sm:pl-0 sm:pt-0.5">
        {children}
        {more}
      </div>
    </li>
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

/** The derived signals a competitor's filing row does not carry (buy style,
 *  today), as hairline rows: the label and its figure as the claim on the
 *  left, what earned it on the right. They were cards on a white fill until
 *  2026-09-19; the page ground is flat now and lists are rows. */
export function ContextCards({
  items,
}: {
  /** `value` is a ReactNode so a row can carry a direction glyph beside its
   *  figure (the buy-style arrow) without this component knowing about it. */
  items: { label: string; value: ReactNode; body: string }[];
}) {
  if (items.length === 0) return null;

  return (
    <RowList className="mt-6" ordered={false}>
      {items.map((i) => (
        <Row key={i.label} kicker={i.label} title={i.value}>
          {i.body}
        </Row>
      ))}
    </RowList>
  );
}
