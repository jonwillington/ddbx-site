/** DEV preview: section 5, `measured`, in the SeoSection it will actually
 *  live in, with live coverage and the real UK cast. Delete with the lab
 *  route once the redesign has landed. */
import { MeasuredSection } from "../measured-section";

import { SeoSection } from "@/components/seo/section";
import { useCoverage } from "@/lib/coverage";
import { examplesFor } from "@/lib/methodology-examples";

export default function MeasuredPreview() {
  const { data: coverage } = useCoverage();
  const examples = examplesFor("uk");

  return (
    <SeoSection
      aside="The evidence behind the last stage, at its real size."
      id="measured"
      index={5}
      title="What we can measure, and how much of it there is"
      total={6}
    >
      <MeasuredSection coverage={coverage} examples={examples} marketId="uk" />
    </SeoSection>
  );
}
