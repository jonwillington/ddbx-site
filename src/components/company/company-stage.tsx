/** The company page's hero: the verdict, said as the headline, inside a dark
 *  stage over the price line the buys were made on.
 *
 *  The same object /insider-index and the stories open with (2026-09-19
 *  uplift). Until then the page opened on a white sheet — logo, the company's
 *  name as the h1, four cream tiles, a counted standfirst and a "latest buy"
 *  card — and the chart that makes the argument sat one section down, on
 *  white, under a numbered heading of its own. Here the order is the
 *  argument's: what the insiders did and what it is worth now, in words and in
 *  figures, then the line it happened on, then the basis in the caption.
 *
 *  The headline is composed from the summary, never written: every number in
 *  it is one the page holds, and the cases with less to say (one purchase, no
 *  price since) say less rather than borrowing a template's holes. The
 *  figures go through `StageFigures`, which refuses a slot with nothing in it.
 */
import type { ReactNode } from "react";
import type { Dealing, UsDealing } from "@/types/ddbx";
import type { StageFigure } from "@/components/boards/stage-figures";
import type { PriceSeries } from "@/components/company/price-chart";

import { CompanyLogo } from "@/components/company-logo";
import { StageFigures } from "@/components/boards/stage-figures";
import { CompanyPriceChart } from "@/components/company/price-chart";
import { Skeleton } from "@/components/skeleton";

const PANEL =
  "board-stage relative overflow-hidden rounded-[28px] border border-white/10 text-white shadow-[0_24px_60px_-30px_rgba(40,25,10,0.55)]";

const KICKER =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55";

const CAPTION =
  "flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-white/10 px-5 py-3.5 text-[12.5px] leading-[1.5] text-white/65 sm:px-8";

const H1 =
  "mt-5 max-w-[26ch] text-balance text-[28px] font-normal leading-[1.1] tracking-[-0.025em] text-white sm:text-[38px] lg:text-[44px]";

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
  /** The document's h1. */
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
    <div className={PANEL}>
      <div className="px-6 pt-7 sm:px-8 sm:pt-9">
        <p className={KICKER}>{eyebrow}</p>

        {/* The page's own mark: it does not link to the page it is on. */}
        <CompanyLogo className="mt-5" link={false} size={72} ticker={logoKey} />

        <h1 className={H1}>{headline}</h1>

        {deck ? (
          <p className="mt-4 max-w-[60ch] text-[15px] leading-[1.6] text-white/65 sm:text-[16px]">
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
            height={CHART_H}
            market={market}
            series={series}
            theme="dark"
            tickerKey={logoKey}
          />
        </div>
      )}

      <div className={CAPTION}>
        <span>{caption}</span>
        {captionRight ? (
          <span className="text-white/45">{captionRight}</span>
        ) : null}
      </div>
    </div>
  );
}

/** The stage at its arrived geometry, for the page's loading state. */
export function CompanyStageSkeleton() {
  return (
    <div aria-hidden className={PANEL}>
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
      <div className={CAPTION}>
        <Skeleton className="h-[12px] w-64" />
      </div>
    </div>
  );
}
