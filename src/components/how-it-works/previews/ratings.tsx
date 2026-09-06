/** DEV preview for the `ratings` section of the /how-it-works redesign.
 *
 *  Two mounts: the real one (UK, with the curated cast) and the branch that
 *  renders for a market with no analysis layer, where `examplesFor` returns
 *  null and the ladder has no filings to point at. Both have to compose.
 */
import { RatingLadder } from "@/components/how-it-works/ratings-ladder";
import { SeoSection } from "@/components/seo/section";
import { examplesFor } from "@/lib/methodology-examples";

export default function RatingsPreview() {
  return (
    <>
      <SeoSection
        aside="What the label on a filing is telling you."
        id="ratings"
        index={3}
        title="The four ratings"
        total={6}
      >
        <RatingLadder examples={examplesFor("uk")} />
      </SeoSection>

      <SeoSection
        aside="Preview only: the no-examples branch (a market with no analysis layer)."
        id="ratings-no-examples"
        title="The four ratings"
      >
        <RatingLadder examples={examplesFor("se")} />
      </SeoSection>
    </>
  );
}
