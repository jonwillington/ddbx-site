/** The company page's hero: the company itself, inside a dark stage over its
 *  last twelve months of price, with the insiders' buys ringed on the line.
 *
 *  The same object /insider-index and the stories open with. The first cut of
 *  it (2026-09-19) led with the buying — "Three directors have put £92k into
 *  Domino's…" as the h1 — and Jon's read was that it made the page about the
 *  last few trades. A company page is visited for the company: so the h1 is
 *  its name, the standfirst says what it does and which sector it sits in, and
 *  the figures are the ones a reader checks first (price, size, valuation or
 *  yield) with ONE insider figure among them. The buying is still on the
 *  chart, and it gets its own section below with the verdict as its lead.
 *
 *  Every figure goes through `StageFigures`, which refuses a slot with nothing
 *  in it, so a thin issuer's hero is its name, its sector and its line rather
 *  than a row of dashes.
 */
import type { ReactNode } from "react";
import type { Dealing, UsDealing } from "@/types/ddbx";
import type { StageFigure } from "@/components/boards/stage-figures";
import type { PriceSeries } from "@/components/company/price-chart";

import { CompanyLogo } from "@/components/company-logo";
import { SectionEyebrow } from "@/components/section-eyebrow";
import { StageFigures } from "@/components/boards/stage-figures";
import { CompanyPriceChart } from "@/components/company/price-chart";
import { Skeleton } from "@/components/skeleton";
import { Stage, StageFooter } from "@/components/ui/stage";
import { STAGE_DEK, StageTitle } from "@/components/ui/stage-header";

const CHART_H = 240;

export function CompanyStage({
  eyebrow,
  logoKey,
  headline,
  deck,
  figures,
  series,
  deals,
  currency,
  market,
  caption,
  captionRight,
}: {
  /** "Company · DOM · LSE". */
  eyebrow: string;
  /** Exchange-qualified storage key, what the logo proxy is keyed on. */
  logoKey: string;
  /** The document's h1: the company's name. */
  headline: ReactNode;
  deck?: ReactNode;
  figures: StageFigure[];
  series: PriceSeries;
  deals: Array<Dealing | UsDealing>;
  currency: string;
  market: "UK" | "US";
  caption: ReactNode;
  captionRight?: ReactNode;
}) {
  return (
    <Stage>
      <div className="px-6 pt-7 sm:px-8 sm:pt-9">
        <SectionEyebrow tone="stage">{eyebrow}</SectionEyebrow>

        {/* The page's own mark: it does not link to the page it is on. */}
        <CompanyLogo className="mt-5" link={false} size={72} ticker={logoKey} />

        {/* data-logo: the shell's sticky header draws the mark beside the
            name once this h1 scrolls away (shell-page-header.tsx). */}
        <StageTitle className="mt-5 max-w-[22ch]" data-logo={logoKey}>
          {headline}
        </StageTitle>

        {deck ? (
          <p className={`mt-4 max-w-[60ch] ${STAGE_DEK}`}>
            {deck}
          </p>
        ) : null}

        <StageFigures items={figures} />
      </div>

      {/* The line the buys were made on. Dropped, not left empty, for an
          issuer with no cached series; the caption says so. */}
      {series.unavailable ? (
        <div className="h-8" />
      ) : (
        <div className="mt-9 px-6 pb-5 sm:px-8">
          <CompanyPriceChart
            currency={currency}
            deals={deals}
            header={false}
            height={CHART_H}
            market={market}
            series={series}
            theme="dark"
            tickerKey={logoKey}
          />
        </div>
      )}

      <StageFooter className="sm:px-8">
        <span>{caption}</span>
        {captionRight ? (
          <span className="text-white/45">{captionRight}</span>
        ) : null}
      </StageFooter>
    </Stage>
  );
}

/** The stage at its arrived geometry, for the page's loading state. */
export function CompanyStageSkeleton() {
  return (
    <Stage aria-hidden>
      <div className="px-6 pt-7 sm:px-8 sm:pt-9">
        <Skeleton className="h-[11px] w-44" />
        <Skeleton circle className="mt-5" h={72} w={72} />
        <Skeleton className="mt-5 h-[40px] w-full max-w-[34rem]" />
        <Skeleton className="mt-3 h-[40px] w-2/3 max-w-[24rem]" />
        <Skeleton className="mt-5 h-[16px] w-full max-w-[36rem]" />
        <StageFigures reserve items={[]} />
      </div>
      <div className="mt-9 px-6 pb-5 sm:px-8">
        <Skeleton className="h-[22px] w-40" />
        <Skeleton className="mt-3 w-full rounded-xl" h={CHART_H} />
      </div>
      <StageFooter className="sm:px-8">
        <Skeleton className="h-[12px] w-64" />
      </StageFooter>
    </Stage>
  );
}
