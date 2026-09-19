/** The worked example, introduced — as the foot of the hero stage.
 *
 *  One real filing (src/lib/methodology-examples.ts) runs through the whole of
 *  /how-it-works: named in the survivors' column of the hero's drawing, scored
 *  in the checks section, measured live near the bottom. This strip is where
 *  the reader meets it, and it is the ONE place the filing's facts (who, role,
 *  value, price, date) are stated in full.
 *
 *  ---------------------------------------------------------------------------
 *  Why a strip and not a card (2026-09-19)
 *  ---------------------------------------------------------------------------
 *
 *  Until this date it was a second hero-sized white card directly under the
 *  stage — 72px logo, 30px name, four ruled fact cells — and the page opened on
 *  two competing objects. The reference pages (/insider-index, the stories)
 *  open on one. So the filing is folded into the stage as its footer row, in
 *  the stage's own material: the drawing says "one of these 1,595", the row
 *  under it says which one. Everything the card said is still here; it is set
 *  as one row rather than as a second hero.
 *
 *  Dark in both themes, because the stage is. Gates on `examplesFor` returning
 *  non-null (UK/US only), so the page still composes for markets without an
 *  analysis layer — the stage simply has no footer row.
 */
import type { ExampleFiling } from "@/lib/methodology-examples";

import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { Link } from "react-router-dom";

import { CompanyLogo } from "@/components/company-logo";
import { shortDate } from "@/components/how-it-works/shared";
import { eyebrow } from "@/components/ui/eyebrow";
import { SpecimenMark } from "@/components/how-it-works/specimen-mark";

export function SpecimenStrip({ specimen }: { specimen: ExampleFiling }) {
  const rating =
    specimen.rating.charAt(0).toUpperCase() + specimen.rating.slice(1);

  return (
    <div className="grid gap-x-8 gap-y-4 border-t border-rule-stage px-6 py-6 sm:px-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
      <div className="flex items-start gap-4">
        <CompanyLogo className="shrink-0" size={56} ticker={specimen.ticker} />
        <div className="min-w-0">
          <p className={`flex items-center gap-2 ${eyebrow("stage")}`}>
            <SpecimenMark onStage />
            The worked example · {rating}
          </p>
          <p className="mt-2 text-[19px] font-medium leading-[1.35] tracking-[-0.01em] text-white sm:text-[21px]">
            {specimen.name}
            {specimen.role ? (
              <span className="text-white/60">, {specimen.role}</span>
            ) : null}
            , bought {specimen.value} of {specimen.company}
            {specimen.price ? ` at ${specimen.price}` : ""} on{" "}
            {shortDate(specimen.date)}.
          </p>
        </div>
      </div>

      <div className="lg:pt-6">
        <p className="max-w-[58ch] text-lede text-white/65">
          {specimen.line} This one purchase runs through the whole page.
        </p>
        <Link
          className="mt-3 inline-flex items-center gap-1.5 text-body font-medium text-white underline decoration-white/30 underline-offset-[5px] transition-colors hover:decoration-white"
          to={specimen.path}
        >
          See the filing
          <ArrowRightIcon aria-hidden className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
