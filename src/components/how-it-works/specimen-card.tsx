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
 *  Gates on `examplesFor` returning non-null (UK/US only), so the page still
 *  composes for markets without an analysis layer.
 */
import type { ExampleFiling } from "@/lib/methodology-examples";

import { Link } from "react-router-dom";

import { CompanyLogo } from "@/components/company-logo";
import { EYEBROW, PANEL, shortDate } from "@/components/how-it-works/shared";
import { SpecimenMark } from "@/components/how-it-works/specimen-mark";
import { RatingBadge } from "@/components/rating-badge";

export function SpecimenCard({ specimen }: { specimen: ExampleFiling }) {
  return (
    <div className={`mt-6 ${PANEL} px-5 py-4`}>
      <div className="flex items-center gap-2.5">
        <SpecimenMark />
        <p className={EYEBROW}>The worked example</p>
      </div>
      <div className="mt-3 flex items-start gap-3.5">
        <CompanyLogo size={36} ticker={specimen.ticker} />
        <div className="min-w-0">
          <p className="text-[15.5px] font-semibold leading-[1.35] tracking-[-0.01em] text-foreground">
            {specimen.name}
            {specimen.role ? (
              <span className="font-normal text-foreground/60">
                {" "}
                · {specimen.role}
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-[13.5px] leading-[1.5] text-foreground/70">
            Bought {specimen.value} of {specimen.company} shares
            {specimen.price ? ` at ${specimen.price}` : ""} on{" "}
            {shortDate(specimen.date)}.
          </p>
        </div>
        <span className="ml-auto shrink-0">
          <RatingBadge rating={specimen.rating} />
        </span>
      </div>
      <p className="mt-3 max-w-[62ch] text-[14px] leading-[1.65] text-foreground/75">
        {specimen.line} This one purchase runs through the whole page: each
        check below shows how it was judged, and the last section shows how it
        has actually done since.{" "}
        <Link
          className="font-medium text-foreground underline underline-offset-4"
          to={specimen.path}
        >
          See the filing
        </Link>
      </p>
    </div>
  );
}
