/** The opening of /how-it-works: what the record actually looks like, and the
 *  one filing that came all the way through it.
 *
 *  ---------------------------------------------------------------------------
 *  Light, not dark (2026-09-07)
 *  ---------------------------------------------------------------------------
 *
 *  This was the page's one dark stage, built on BoardStagePanel so it shared
 *  material with the seven board heroes. Jon's review asked for the inversion,
 *  and the inversion is right for this page specifically: a board hero is a
 *  population of purchases and reads as an instrument panel, whereas this page
 *  is a document about method. Its opening object should read as the top of a
 *  document, on the same ground as everything under it, with one contained
 *  edge around it. So: a light hairline panel (`bg-sheet` on cream, `surface`
 *  in dark), foreground ink, brand brown/tan for the accent. Tenet 1 of the
 *  design language is unchanged — contained, crisp edge, no scrim, no fade.
 *
 *  It deliberately does NOT use BoardStagePanel or StageFigures. Those are the
 *  dark material: fixed white opacities, a #1a140d ground in both themes, a
 *  skeleton keyed to that ground. Reusing them here would have meant a theme
 *  fork inside every one of them.
 *
 *  ---------------------------------------------------------------------------
 *  The parts
 *  ---------------------------------------------------------------------------
 *
 *    header    Eyebrow, the document's h1 (the page passes `titleInHero`, so
 *              the shell renders no header of its own), the standfirst and the
 *              thesis. Two columns from xl: the h1 takes 7fr and the prose 5fr,
 *              top-aligned. Not lg — at 1024 the SEO rail leaves a 560px
 *              content column, and splitting that in two broke the h1 over
 *              four lines. Jon's width note — "we are still not using 100%
 *              of the screen space" — is the reason. Stacked, an h1 held to a
 *              19ch measure leaves a third of a 912px column empty, and there
 *              is nothing to put in it that is not filler.
 *    chart     HeroScaleChart: three counts drawn to one linear scale, the
 *              number on each column, what leaves written in the gap. See that
 *              file for why the old bed of hairlines went.
 *    caption   The ratio in words, then the finding, then the provenance. The
 *              ratio sentence is derived from the same two live counts the
 *              chart draws, rounded, and hedged with "about" — it is a fact
 *              about the drawing, not a second measurement.
 *
 *  Every figure is live. A stage with no number is not drawn and not named
 *  (grammar 7): with no open-market floor reported, the chart falls to two
 *  columns and the middle band's copy absorbs what the missing one said.
 */
import type { ReactNode } from "react";
import type { ScaleStage } from "@/components/how-it-works/hero-scale-chart";

import { useMemo } from "react";

import { HeroScaleChart } from "@/components/how-it-works/hero-scale-chart";
import { count } from "@/lib/coverage";

const PANEL =
  "rounded-[28px] border border-hairline bg-sheet px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12 dark:border-white/[0.07] dark:bg-surface";
const RULE = "border-hairline dark:border-white/[0.09]";

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
  /** "Methodology". */
  eyebrow: string;
  /** The document's h1 — rendered here, so the page passes `titleInHero`. */
  title: ReactNode;
  /** The shell's standfirst, which the shell does not render under
   *  `titleInHero`. */
  standfirst: ReactNode;
  /** The page's one idea, set as the brightest line in the header. Kept as a
   *  node because the market vocabulary ("directors" / "insiders") belongs to
   *  the page. */
  thesis: ReactNode;
  /** The finding in words, for the caption strip under the drawing: why the
   *  sorting is the whole job. */
  finding: ReactNode;
  /** `coverage.totals.disclosures`. */
  disclosures: number;
  /** Open-market buys summed over the markets that report one; 0 when none
   *  does, which withdraws the middle column entirely. */
  openMarketFloor: number;
  /** `coverage.totals.analyses`. */
  analyses: number;
  /** The provenance line the page builds (`funnelCaption`). */
  caption: string;
  /** Company name for the worked example, from `examples.specimen`. Null
   *  outside UK/US, which leaves the survivors column unmarked and silent. */
  specimenCompany?: string | null;
}

export function HeroStage({
  eyebrow,
  title,
  standfirst,
  thesis,
  finding,
  disclosures,
  openMarketFloor,
  analyses,
  caption,
  specimenCompany = null,
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
        sub: "a purchase, not a grant",
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
            "Most of the rest stop at the sort. They are small, routine, or already explained by something public.",
          ]
        : [
            "The gap is grants, vestings, option exercises and sales, plus the buys that stop at the sort: small, routine, or already explained.",
          ];

    return { stages: out, bands: between };
  }, [disclosures, openMarketFloor, analyses]);

  /** The ratio the drawing is about, said once, in words. Rounded and hedged,
   *  because it moves every time the record grows. */
  const ratio = useMemo(() => {
    if (disclosures <= 0 || analyses <= 0) return null;
    const n = Math.round(disclosures / analyses);

    if (n < 2) return null;
    const word = inWords(n);

    return `About one filing in ${word ?? count(n)} gets read in full.`;
  }, [disclosures, analyses]);

  return (
    <section className={PANEL}>
      <div className="grid gap-x-12 gap-y-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:items-start">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-brown dark:text-brand-tan">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-balance text-[34px] font-normal leading-[1.03] tracking-[-0.03em] text-foreground sm:text-[44px] lg:text-[52px]">
            {title}
          </h1>
        </div>
        <div className="xl:pt-1">
          <p className="max-w-[54ch] text-[16px] leading-[1.65] text-foreground/70">
            {standfirst}
          </p>
          <p className="mt-4 max-w-[48ch] text-[18px] font-medium leading-[1.45] tracking-[-0.008em] text-foreground sm:text-[19px]">
            {thesis}
          </p>
        </div>
      </div>

      <div className="mt-10 lg:mt-12">
        <HeroScaleChart
          bands={bands}
          specimenCompany={specimenCompany}
          stages={stages}
        />
      </div>

      <div
        className={`mt-8 flex flex-col gap-x-10 gap-y-2 border-t ${RULE} pt-4 xl:flex-row xl:items-baseline xl:justify-between`}
      >
        <p className="max-w-[76ch] text-[15px] leading-[1.55] text-foreground/70">
          {ratio ? (
            <span className="font-semibold text-foreground">{ratio} </span>
          ) : null}
          {finding}
        </p>
        <p className="shrink-0 text-[13px] leading-[1.5] text-foreground/40">
          {caption}
        </p>
      </div>
    </section>
  );
}
