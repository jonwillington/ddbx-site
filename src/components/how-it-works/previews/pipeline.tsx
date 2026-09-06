/** Preview: section 1, `pipeline`, in the SeoSection it actually lives in.
 *  Dev-only harness — see src/pages/lab-how-it-works.tsx.
 *
 *  `?theme=dark` forces the palette for the render pass. The site's theme is
 *  `.dark` on <html> driven by localStorage (src/lib/theme.ts), which headless
 *  Chrome has no way to seed from the command line, and Chrome's own
 *  --force-dark-mode is its auto-darkener rather than the app's palette. */
import { useEffect } from "react";

import { PipelineLedger } from "@/components/how-it-works/pipeline-ledger";
import { SeoSection } from "@/components/seo/section";
import { useCoverage } from "@/lib/coverage";
import { examplesFor } from "@/lib/methodology-examples";

export default function PipelinePreview() {
  const { data: coverage } = useCoverage();
  const examples = examplesFor("uk");

  useEffect(() => {
    const theme = new URLSearchParams(window.location.search).get("theme");

    if (theme === "dark" || theme === "light") {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, []);

  return (
    <div className="pt-6">
      <SeoSection
        aside="Filing to rating, in six stages, and where the pipe narrows."
        id="pipeline"
        index={1}
        title="What happens to a disclosure"
        total={6}
      >
        <PipelineLedger
          specimen={examples?.specimen ?? null}
          totals={coverage.totals}
        />
      </SeoSection>
    </div>
  );
}
