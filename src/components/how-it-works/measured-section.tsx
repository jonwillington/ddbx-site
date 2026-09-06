/** Section 5 of /how-it-works — "What we can measure, and how much of it there
 *  is" — assembled.
 *
 *  The argument, in order: the pipeline scores rated buys against the index;
 *  here is how much of that evidence exists at each horizon (the rail); here
 *  are two of the measurements at their live values (the rows); and here is
 *  what the two together license you to conclude, which is less than a reader
 *  wants.
 *
 *  The mechanics fold is passed in as `children` rather than owned here,
 *  because it uses the page's own `Disclosure` and there is no reason for a
 *  section component to grow a second collapsible.
 */
import type { MethodologyExamples } from "@/lib/methodology-examples";
import type { CoverageResponse } from "@/types/ddbx";
import type { ReactNode } from "react";

import { HorizonRail } from "./measured-rail";
import { MeasuredExamples } from "./measured-tracked";

import { count } from "@/lib/coverage";

export function MeasuredSection({
  coverage,
  examples,
  marketId,
  children,
}: {
  coverage: CoverageResponse;
  /** Null outside UK/US — those are the markets with an analysis layer, so
   *  they are the only ones with a curated specimen or a tracked pair. The
   *  rail is still the honest picture of the corpus without them. */
  examples: MethodologyExamples | null;
  marketId: string;
  /** The "How the measuring is done" fold. */
  children?: ReactNode;
}) {
  const { prices } = coverage;
  const priceFrom = prices.first_date?.slice(0, 4);

  return (
    <>
      {/* "Every open-market buy", not "every rated buy": the outcomes table
          (ddbx-data worker/pipeline/outcomes.ts) scores every confirmed
          open-market purchase on the two markets, read in full or not, which
          is why the count here is larger than the hero's "read in full". A
          reader holding the two figures side by side needs that said. */}
      <p className="max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80">
        The last stage of the pipeline scores buys against the index. On the two
        rated markets, the United Kingdom and the United States, every
        open-market buy gets a figure whether or not it was read in full, which
        is how a rating gets checked against the buys it passed over as well as
        the ones it kept. The figures come off a price history of{" "}
        {count(prices.observations)} daily closes across {count(prices.tickers)}{" "}
        tickers{priceFrom ? ` going back to ${priceFrom}` : ""}. How much of
        that evidence exists depends entirely on how long you are willing to
        wait:
      </p>

      <HorizonRail data={coverage} specimen={examples?.specimen} />

      {examples ? (
        <MeasuredExamples examples={examples} marketId={marketId} />
      ) : null}

      {/* The sentence a reader must not scroll past stays visible; the
          mechanics fold under it. */}
      <p className="mt-7 max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80">
        Read honestly, the panel says the short-horizon evidence is real and the
        long-horizon evidence barely exists yet. That is the whole reason
        performance figures on this site are described as a small sample rather
        than as a track record.
      </p>

      {children}
    </>
  );
}
