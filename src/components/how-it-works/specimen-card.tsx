/** The worked example, introduced.
 *
 *  One real filing (src/lib/methodology-examples.ts) runs through the whole of
 *  /how-it-works: named at the end of the hero's tan hairline, scored in the
 *  checks section, placed on its rung in the ratings, measured live at the
 *  bottom. This card is where the reader meets it — between the hero and the
 *  contents strip, before the machinery that judges it — and it is the ONE
 *  place the filing's facts (who, role, value, price, date) are stated in
 *  full. Every later appearance names the company and links back to the
 *  filing rather than repeating the facts.
 *
 *  ---------------------------------------------------------------------------
 *  Why it is a grid and not a sentence (2026-09-07)
 *  ---------------------------------------------------------------------------
 *
 *  The first version wrote the trade as prose — "Bought £99,997 of Vistry
 *  Group shares at 260.6p on 15 Jul 2026" — at 13.5px under a 15.5px name and
 *  a 36px logo. Read cold, the card was a caption: the four facts that make
 *  the filing a specific event were the smallest type in the panel, and the
 *  reader had to parse a sentence to find the price.
 *
 *  So the card is now laid out the way a specimen label is: one strong grid,
 *  flush left, hairline rules and nothing else. Four bands, top to bottom —
 *  what this is (eyebrow + the rating it ended up with), who did it (72px
 *  mark, 26/30px name, role beneath), what they did (four labelled cells,
 *  mono kicker over a 20/22px tabular value, separated by vertical hairlines),
 *  and why it is here (one measured paragraph and the link to the filing).
 *  Each fact is stated once and in one place: the company is the COMPANY cell,
 *  not also the role line; the rating is the badge, not also a sentence.
 *
 *  The card spans the full content column. The four cells are what want the
 *  width — they are the reason the 860px document wrapper went — and at 520
 *  they fold to two columns while the rest of the card becomes one.
 *
 *  Gates on `examplesFor` returning non-null (UK/US only), so the page still
 *  composes for markets without an analysis layer.
 */
import type { ExampleFiling } from "@/lib/methodology-examples";

import { Link } from "react-router-dom";

import { CompanyLogo } from "@/components/company-logo";
import {
  EYEBROW,
  KICKER,
  PANEL,
  RULE,
  shortDate,
} from "@/components/how-it-works/shared";
import { SpecimenMark } from "@/components/how-it-works/specimen-mark";
import { RatingBadge } from "@/components/rating-badge";

/** The trade, as facts rather than as a clause.
 *
 *  Price is omitted rather than dashed when the filing is unpriced (static-page
 *  rule 2), which is why the cell count is 3 or 4 and the grid is told which. */
function tradeFacts(s: ExampleFiling): Array<{ label: string; value: string }> {
  return [
    { label: "Bought", value: s.value },
    { label: "Company", value: s.company },
    ...(s.price ? [{ label: "Price paid", value: s.price }] : []),
    { label: "Trade date", value: shortDate(s.date) },
  ];
}

/** The vertical hairlines between cells. Two columns on a phone, so the right
 *  column is ruled; three or four from `sm`, where every cell but the first
 *  is. Written as whole class literals because Tailwind cannot see a string
 *  assembled at runtime. */
function cellRule(index: number): string {
  const across =
    index === 0
      ? ""
      : index % 2 === 1
        ? `border-l ${RULE} pl-4 sm:pl-6`
        : `sm:border-l ${RULE} sm:pl-6`;
  // The phone's second row of cells is ruled off from the first, the way the
  // card's other bands are. At `sm` there is only one row and the rule goes.
  const down =
    index > 1 ? `mt-6 border-t ${RULE} pt-6 sm:mt-0 sm:border-t-0 sm:pt-0` : "";

  return `${across} ${down}`.trim();
}

export function SpecimenCard({ specimen }: { specimen: ExampleFiling }) {
  const facts = tradeFacts(specimen);

  return (
    <div className={`mt-8 ${PANEL} px-5 py-6 sm:px-8 sm:py-7`}>
      {/* What this is, and what it ended up rated. The badge is the card's one
          piece of colour and it sits opposite the eyebrow, on the label band,
          because it is the verdict of everything below rather than a fifth
          fact about the trade. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex items-center gap-2.5">
          <SpecimenMark />
          <p className={EYEBROW}>The worked example</p>
        </div>
        <RatingBadge rating={specimen.rating} />
      </div>

      {/* Who. The mark at 72px and the name at 26/30px are the card's lead:
          a person made this decision, and the page is about to spend six
          sections judging it. */}
      <div
        className={`mt-5 flex items-center gap-4 border-t ${RULE} pt-6 sm:gap-6`}
      >
        <CompanyLogo size={72} ticker={specimen.ticker} />
        <div className="min-w-0">
          <p className="text-[26px] font-semibold leading-[1.1] tracking-[-0.025em] text-foreground sm:text-[30px]">
            {specimen.name}
          </p>
          {specimen.role ? (
            <p className="mt-1.5 text-[16px] leading-[1.4] text-foreground/60">
              {specimen.role}
            </p>
          ) : null}
        </div>
      </div>

      {/* What. Aligned cells, one fact each, tabular figures so the values sit
          on a common rhythm across the row. */}
      <div
        className={`mt-6 grid grid-cols-2 gap-x-4 border-t ${RULE} pt-6 sm:gap-x-6 ${
          facts.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"
        }`}
      >
        {facts.map((fact, i) => (
          <div key={fact.label} className={`min-w-0 ${cellRule(i)}`}>
            <p className={`${KICKER} text-foreground/45`}>{fact.label}</p>
            <p className="mt-2 text-[20px] font-medium leading-[1.2] tracking-[-0.01em] tabular-nums text-foreground sm:text-[22px]">
              {fact.value}
            </p>
          </div>
        ))}
      </div>

      {/* Why. The one paragraph keeps a measure while the cells above take the
          full column — the "indent for effect" the page's width rule allows. */}
      <div className={`mt-6 border-t ${RULE} pt-6`}>
        <p className="max-w-[66ch] text-[16px] leading-[1.65] text-foreground/80">
          {specimen.line} This one purchase runs through the whole page: each
          check below shows how it was judged, and the last section shows how it
          has actually done since.
        </p>
        <Link
          className="mt-4 inline-block text-[16px] font-medium text-foreground underline decoration-foreground/30 underline-offset-[5px] transition-colors hover:decoration-foreground"
          to={specimen.path}
        >
          See the filing
        </Link>
      </div>
    </div>
  );
}
