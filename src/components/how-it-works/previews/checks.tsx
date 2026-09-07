/** Preview for section 2 (`checks`) of the /how-it-works redesign.
 *
 *  Renders the section exactly as it will sit in the page — the same
 *  SeoSection wrapper, counter and intro paragraph — with real UK examples,
 *  and then again with `examples={null}` to prove the SE/NL branch still
 *  composes. Dev-only; deleted with the lab route once the redesign lands.
 *
 *  The intro paragraph is at the page-wide body scale (16px / 1.65). The real
 *  page still sets 15px inline at how-it-works.tsx:295 — that line is outside
 *  this agent's remit and is listed in the report.
 */
import {
  ChecksRowList,
  ChecksScorecard,
} from "@/components/how-it-works/checks-scorecard";
import { SeoSection } from "@/components/seo/section";
import { CHECK_COUNT_WORD } from "@/lib/methodology";
import { examplesFor } from "@/lib/methodology-examples";

const INTRO =
  "Each check is a yes or no. There is no score to average: a purchase clears them or it doesn’t, and the count of what it cleared is published on the filing itself, so you can see which ones it missed rather than taking the rating on trust.";

export default function ChecksPreview() {
  const examples = examplesFor("uk");

  return (
    <>
      <SeoSection
        aside="Applied one at a time, in this order."
        id="checks"
        index={2}
        title={`The ${CHECK_COUNT_WORD} checks`}
        total={6}
      >
        <p className="max-w-[64ch] text-[16px] leading-[1.65] text-foreground/80">
          {INTRO}
        </p>
        <ChecksScorecard examples={examples} />
        <ChecksRowList examples={examples} />
      </SeoSection>

      <div className="mt-20 border-t-4 border-dashed border-hairline pt-6 dark:border-separator">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-foreground/35">
          Below: the same section with examples = null (SE / NL)
        </p>
      </div>

      <SeoSection
        aside="Applied one at a time, in this order."
        index={2}
        title={`The ${CHECK_COUNT_WORD} checks`}
        total={6}
      >
        <p className="max-w-[64ch] text-[16px] leading-[1.65] text-foreground/80">
          {INTRO}
        </p>
        <ChecksScorecard examples={null} />
        <ChecksRowList examples={null} />
      </SeoSection>
    </>
  );
}
