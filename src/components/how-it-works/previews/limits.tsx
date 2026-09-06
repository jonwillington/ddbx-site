/** DEV preview — section 6 (`limits`) plus the page's tail.
 *
 *  Renders exactly what how-it-works.tsx will render after integration: the
 *  ledger inside its SeoSection, the shared "Read next" cards, and the closing
 *  applied line that hands off to the terminal AppCtaBand (which SeoPageShell
 *  draws and this harness does not). The tail is here because the close has to
 *  be judged as a sequence — a section that ends well and a page that ends
 *  badly are the same bug from the reader's seat.
 */
import type { GlossaryEntry } from "../../../../shared/glossary";

import { Link } from "react-router-dom";

import { entryBySlug, learnPath } from "../../../../shared/glossary.js";

import { LimitsLedger } from "@/components/how-it-works/limits-ledger";
import { RelatedCards } from "@/components/seo/related-cards";
import { SeoSection } from "@/components/seo/section";
import { CHECK_COUNT_WORD } from "@/lib/methodology";

const RELATED_SLUGS = [
  "open-market-buy",
  "what-a-director-buy-signals",
  "rule-10b5-1",
];

export default function LimitsPreview() {
  const related = RELATED_SLUGS.map((s) => entryBySlug(s)).filter(
    (e): e is GlossaryEntry => Boolean(e),
  );

  return (
    <>
      <SeoSection
        aside="The parts worth knowing before you lean on any of it."
        id="limits"
        index={6}
        title="Where the method stops"
        total={6}
      >
        <LimitsLedger />
      </SeoSection>

      {related.length > 0 ? (
        <SeoSection title="Read next">
          <RelatedCards
            items={related.map((e) => ({
              to: learnPath(e.slug),
              title: e.term,
              description: e.description,
            }))}
          />
        </SeoSection>
      ) : null}

      <p className="mt-8 text-[13.5px] leading-[1.6] text-foreground/60">
        Prefer to see it applied?{" "}
        <Link
          className="font-medium text-foreground underline underline-offset-4"
          to="/"
        >
          Open today’s filings
        </Link>{" "}
        and the walkthrough on the homepage runs a real recent purchase through
        all {CHECK_COUNT_WORD} checks, one at a time.
      </p>
    </>
  );
}
