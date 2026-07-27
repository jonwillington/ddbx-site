/** The blurred "there's an article under here" silhouette for gated drawers.
 *
 *  This used to be the real article body rendered with DUMMY_ANALYSIS — a
 *  fabricated write-up ("Margin recovery is tracking ahead of plan…")
 *  attached to a real named issuer. The blur made it illegible on screen,
 *  but the words were still in the DOM: reader modes, crawlers and anyone in
 *  devtools got invented financial claims under a real company's name.
 *
 *  So the stand-in is now shape, not text: grey bars in the article's
 *  silhouette (headline, standfirst, paragraphs, a subhead, bullets). Under
 *  the existing 6px blur at 25% opacity it reads identically — a page of
 *  writing you can't quite see — and carries no words at all. `aria-hidden`
 *  plus zero text means there is nothing to expose anywhere.
 */

/** One grey bar. Width via className so the silhouette looks ragged-right. */
function Bar({ className = "" }: { className?: string }) {
  return <div className={`h-[13px] rounded bg-foreground/20 ${className}`} />;
}

function Para({ widths }: { widths: string[] }) {
  return (
    <div className="space-y-2">
      {widths.map((w, i) => (
        <Bar key={i} className={w} />
      ))}
    </div>
  );
}

export function GatedAnalysisShape() {
  return (
    <div aria-hidden className="space-y-6">
      {/* Header: logo bubble + headline */}
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 shrink-0 rounded-2xl bg-foreground/20" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-[22px] w-3/4 rounded bg-foreground/25" />
          <Bar className="w-2/5" />
        </div>
      </div>

      {/* Standfirst */}
      <Para widths={["w-full", "w-11/12", "w-4/6"]} />

      {/* Thesis paragraphs */}
      <Para widths={["w-full", "w-full", "w-10/12", "w-5/6", "w-1/2"]} />
      <Para widths={["w-full", "w-11/12", "w-3/4"]} />

      {/* Subhead + bullets */}
      <div className="space-y-3">
        <div className="h-[16px] w-1/3 rounded bg-foreground/25" />
        {["w-10/12", "w-9/12", "w-11/12"].map((w, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-foreground/25" />
            <Bar className={w} />
          </div>
        ))}
      </div>

      {/* Another prose block so tall drawers stay filled */}
      <Para widths={["w-full", "w-10/12", "w-full", "w-2/3"]} />
      <Para widths={["w-11/12", "w-full", "w-3/5"]} />
    </div>
  );
}
