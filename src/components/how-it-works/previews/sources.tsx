/** DEV preview for the `sources` section of /how-it-works.
 *
 *  Rendered by src/pages/lab-how-it-works.tsx at /__lab/how-it-works/sources,
 *  inside the SeoSection wrapper the section will actually live in, with the
 *  real coverage hook and the real UK market copy. Delete with the harness.
 */
import { SeoSection } from "@/components/seo/section";
import { SourcesRegister } from "@/components/how-it-works/sources-register";
import { useCoverage } from "@/lib/coverage";
import { marketCopyFor } from "@/lib/markets/market-copy";

export default function SourcesPreview() {
  const { data, source } = useCoverage();
  const copy = marketCopyFor("uk");

  return (
    <SeoSection
      aside="Built for the United Kingdom."
      id="sources"
      index={4}
      title="Where the filings come from"
      total={6}
    >
      <SourcesRegister copy={copy} data={data} marketId="uk" source={source} />
    </SeoSection>
  );
}
