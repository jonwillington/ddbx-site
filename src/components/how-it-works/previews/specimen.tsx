/** Preview: the worked-example strip, in a bare stage panel (it is the hero
 *  stage's footer row on the real page).
 *  Dev-only harness — see src/pages/lab-how-it-works.tsx.
 *
 *  The card lives in the page's opening block rather than in a SeoSection, so
 *  this preview mounts it bare with the standfirst above it that it actually
 *  follows. `?theme=dark` forces the palette for the render pass, for the same
 *  reason the other previews do it.
 */
import { useEffect } from "react";

import { SpecimenStrip } from "@/components/how-it-works/specimen-card";
import { examplesFor } from "@/lib/methodology-examples";

export default function SpecimenPreview() {
  const examples = examplesFor("uk");

  useEffect(() => {
    const theme = new URLSearchParams(window.location.search).get("theme");

    if (theme === "dark" || theme === "light") {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, []);

  if (!examples) return null;

  return (
    <div className="pt-6">
      <p className="max-w-[64ch] text-[16px] leading-[1.65] text-foreground/80">
        Every rating on this site starts as one disclosure and ends as a number
        that can be checked. Here is the filing the rest of this page follows.
      </p>
      <div className="board-stage mt-8 overflow-hidden rounded-[28px] border border-white/10 text-white">
        <SpecimenStrip specimen={examples.specimen} />
      </div>
    </div>
  );
}
