/** The opening of /how-it-works: what the record actually looks like, and the
 *  one filing that came all the way through it.
 *
 *  ---------------------------------------------------------------------------
 *  Dark again (2026-09-19)
 *  ---------------------------------------------------------------------------
 *
 *  2026-09-07 turned this light, on the argument that a methodology page
 *  should open like a document rather than an instrument panel. Jon reversed
 *  that on 2026-09-19: the site's newer pages (/insider-index, /reports, the
 *  stories) all open on the same dark stage, and this page reading as a
 *  different species was the bigger cost. So it is the board-stage material
 *  again (`.board-stage`, #1a140d in both themes, white opacities and the
 *  brand amber inside), built to the insider-index recipe rather than on
 *  BoardStagePanel — that panel owns an SVG plot and a mode toggle, and this
 *  drawing is HTML with neither.
 *
 *  ---------------------------------------------------------------------------
 *  The parts
 *  ---------------------------------------------------------------------------
 *
 *    header    Eyebrow and the document's h1 left (the page passes
 *              `titleInHero`); the verdict — "about one filing in seventeen
 *              gets read in full" — and the standfirst right. Two columns from
 *              xl; not lg, because at 1024 the SEO rail leaves 560px and a
 *              split broke the h1 over four lines.
 *    chart     HeroScaleChart: three counts drawn to one linear scale, the
 *              number on each column, what leaves written in the gap.
 *    footer    SpecimenStrip: the worked example, named in full, as the
 *              stage's last row. It used to be a second hero-sized card under
 *              the stage; one hero object only.
 *
 *  The provenance ("Counted Sep 2026 …") is not in the stage: it is the dated
 *  basis line directly under it, the way the reference pages carry theirs.
 *
 *  Every figure is live. A stage with no number is not drawn and not named
 *  (grammar 7): with no open-market floor reported, the chart falls to two
 *  columns and the middle band's copy absorbs what the missing one said. The
 *  verdict is derived from the same two live counts the chart draws, rounded
 *  and hedged with "about" — it is a reading of the drawing, not a second
 *  measurement — and it is withheld when either count is missing.
 */
import type { ReactNode } from "react";
import type { ScaleStage } from "@/components/how-it-works/hero-scale-chart";
import type { ExampleFiling } from "@/lib/methodology-examples";

import { useMemo } from "react";

import { HeroScaleChart } from "@/components/how-it-works/hero-scale-chart";
import { SpecimenStrip } from "@/components/how-it-works/specimen-card";
import { count } from "@/lib/coverage";
import { Stage } from "@/components/ui/stage";
import { STAGE_DEK, StageHeader } from "@/components/ui/stage-header";

/** The design language's one sub-perceptual wash (tenet 4): a static pool of
 *  amber under the right-hand end of the drawing, where the survivors' block
 *  sits. Radial and masked, so it never presents an edge. */
const WASH =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_58%_55%_at_82%_62%,rgba(238,197,132,0.09)_0%,rgba(238,197,132,0.03)_42%,transparent_72%)]";

/** Cardinals to twenty, then the tens, which is as far as this ratio can
 *  plausibly go before "one in n" stops being a sentence a reader parses. */
const ONES = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

/** `19` → "nineteen". Null outside 2–99, where the caller falls back to the
 *  figure rather than writing a sentence nobody says out loud. */
function inWords(n: number): string | null {
  if (!Number.isFinite(n) || n < 2 || n > 99) return null;
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];

  return o ? `${t}-${o}` : t;
}

export interface HeroStageProps {
  /** "Learn · Methodology". */
  eyebrow: string;
  /** The document's h1 — rendered here, so the page passes `titleInHero`. */
  title: ReactNode;
  /** The shell's standfirst, which the shell does not render under
   *  `titleInHero`. */
  standfirst: ReactNode;
  /** `coverage.totals.disclosures`. */
  disclosures: number;
  /** Open-market buys summed over the markets that report one; 0 when none
   *  does, which withdraws the middle column entirely. */
  openMarketFloor: number;
  /** `coverage.totals.analyses`. */
  analyses: number;
  /** The worked example, from `examples.specimen`. Null outside UK/US, which
   *  leaves the survivors column unmarked and the stage without a footer. */
  specimen?: ExampleFiling | null;
}

export function HeroStage({
  eyebrow,
  title,
  standfirst,
  disclosures,
  openMarketFloor,
  analyses,
  specimen = null,
}: HeroStageProps) {
  const { stages, bands } = useMemo(() => {
    const out: ScaleStage[] = [];

    if (disclosures > 0) {
      out.push({
        key: "disclosed",
        value: disclosures,
        label: "Disclosed",
        sub: "every filing, all five feeds",
      });
    }
    if (openMarketFloor > 0) {
      out.push({
        key: "open",
        value: openMarketFloor,
        prefix: "at least",
        label: "Bought on the open market",
      });
    }
    if (analyses > 0) {
      out.push({
        key: "rated",
        accent: true,
        value: analyses,
        label: "Read in full and rated",
      });
    }

    // One band per gap. With the middle column withdrawn there is one gap, and
    // it has to carry both reasons rather than silently dropping one of them.
    const between =
      out.length === 3
        ? [
            "Everything in this gap is a grant, a vesting, an option exercise or a sale.",
            "Most of the rest stop at the sort: small, routine, or already explained by something public.",
          ]
        : [
            "The gap is grants, vestings, option exercises and sales, plus the buys that stop at the sort: small, routine, or already explained.",
          ];

    return { stages: out, bands: between };
  }, [disclosures, openMarketFloor, analyses]);

  /** The verdict, said once, in words. Rounded and hedged, because it moves
   *  every time the record grows. */
  const ratio = useMemo(() => {
    if (disclosures <= 0 || analyses <= 0) return null;
    const n = Math.round(disclosures / analyses);

    if (n < 2) return null;
    const word = inWords(n);

    return `About one filing in ${word ?? count(n)} gets read in full.`;
  }, [disclosures, analyses]);

  return (
    // The board-stage material, as the insider-index and story stages draw
    // it: dark in both themes, rounded, one hairline, the warm drop.
    <Stage as="section">
      <div aria-hidden className={WASH} />

      <div className="relative grid gap-x-12 gap-y-6 px-6 pt-7 sm:px-8 sm:pt-9 lg:px-10 lg:pt-10 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:items-start">
        <StageHeader eyebrow={eyebrow} title={title} />
        <div className="xl:pt-7">
          {ratio ? (
            <p className="max-w-[24ch] text-balance text-[22px] font-medium leading-tight tracking-[-0.015em] text-brand-amber sm:text-[26px]">
              {ratio}
            </p>
          ) : null}
          <p className={`max-w-[52ch] ${STAGE_DEK} ${ratio ? "mt-4" : ""}`}>
            {standfirst}
          </p>
        </div>
      </div>

      <div className="relative mt-12 px-6 pb-9 sm:px-8 lg:mt-14 lg:px-10 lg:pb-10">
        <HeroScaleChart
          bands={bands}
          specimenCompany={specimen?.company ?? null}
          stages={stages}
        />
      </div>

      {specimen ? (
        <div className="relative">
          <SpecimenStrip specimen={specimen} />
        </div>
      ) : null}
    </Stage>
  );
}
