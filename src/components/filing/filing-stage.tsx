/** The filing page's hero: one disclosure inside a dark stage, over the price
 *  line it is about.
 *
 *  The story page's stage (components/stories/story-stage.tsx) is the model,
 *  and for the same reason: every page in the research family since 2026-09-05
 *  puts its h1 inside a dark panel over the object that makes its argument, and
 *  a filing's object is its price path with the trade and the disclosure marked
 *  on it. A variant rather than a reuse, because a story carries a chart spec
 *  and a list of buys where a filing carries one row, and bending StoryStage to
 *  take both would give it two sources of truth for one figure.
 *
 *  What moved in here from the old page header, and why:
 *
 *  - The verdict band's two numbers (what was paid, what it has done since)
 *    are the stage's figures now, alongside the one against the market. They
 *    were the page's largest objects in a white card of their own; set inside
 *    the panel they read as the receipt for the headline above them.
 *  - The rating is the eyebrow's second word rather than a chip. The ticker
 *    and sector chips went to the caption strip, which is where every stage
 *    in the family names its subject's small print.
 *
 *  The headline is always composed from this filing's own fields (who, in
 *  what role, bought how much), never the analysis summary: a summary can
 *  describe an accumulation across several fills and so contradict the Paid
 *  figure directly under it, and as an h1 it loses the attribution that says
 *  whose words it is. Where the page may publish the summary (share route, or
 *  discretion off: the rule shared/filings.js sets and AnalysisPreview
 *  enforces) it is the standfirst, labelled as the analysis. Otherwise the
 *  standfirst is the family's full lead sentence, with the dates and the lag.
 *
 *  Every figure slot is a number we hold. With no mark yet the outcome slots
 *  are omitted and the panel says why in words, including when there will be
 *  one; see the static-page rules on empty versus failed.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";

import { Link } from "react-router-dom";

import {
  cleanName,
  signedPct,
  shares as fmtShares,
} from "../../../shared/filings.js";
import { filingFamily } from "../../../shared/filing-family.js";
import { sectorPath } from "../../../shared/sectors.js";

import { CompanyLogo } from "@/components/company-logo";
import { MiniPriceChart } from "@/components/mini-price-chart";
import { Skeleton } from "@/components/skeleton";
import {
  StageFigures,
  type StageFigure,
} from "@/components/boards/stage-figures";
import { displayTicker } from "@/lib/company";
import { localeFor } from "@/lib/company-format";
import { UkMarket } from "@/lib/markets/uk";
import { UsMarket } from "@/lib/markets/us";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Stage, StageFooter } from "@/components/ui/stage";
import { StageTitle } from "@/components/ui/stage-header";

/* The panel, its eyebrow and its caption strip are the shared stage
   primitives (components/ui/stage.tsx), the same ones the story stage uses,
   so the two heroes cannot drift into two panels. */

function longDate(iso: string | null | undefined, market: string): string {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);

  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(localeFor(market), {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
}

/** "Non-Executive Director" reads as a title in a sentence; lower-case it,
 *  but keep acronyms (CEO, CFO, PDMR) as filed. */
function roleInSentence(role: string): string {
  return role
    .split(" ")
    .map((w) => (/^[A-Z0-9&%]{2,}$/.test(w) ? w : w.toLowerCase()))
    .join(" ");
}

/** The h1: one line of fact built from the row, through the market family so
 *  a US page cannot print a UK sentence. A role long enough to push the line
 *  past three lines at 1440 ("Person Closely Associated with the Chief
 *  Financial Officer") is left to the standfirst, which states it in full. */
export function filingHeadline(
  deal: Dealing | UsDealing,
  market: "UK" | "US",
): string {
  const fam = filingFamily(market);
  const { name, role } = fam.insider(deal);
  const company =
    cleanName(deal.company) || displayTicker(deal.ticker) || "the company";
  const verb = fam.transactionLabel(deal) === "Disposal" ? "sold" : "bought";
  const value = fam.value(deal);
  const what =
    value != null && value > 0
      ? `${fam.money(value)} of shares`
      : `${fmtShares(deal.shares)} shares`;
  const who =
    role && role.length <= 32
      ? `${name}, ${roleInSentence(role)} at ${company},`
      : `${name} at ${company}`;

  return `${who} ${verb} ${what}`;
}

function shortDate(iso: string | null | undefined, market: string): string {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);

  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(localeFor(market), {
        day: "numeric",
        month: "short",
      });
}

export function FilingStage({
  deal,
  market,
  eyebrow,
  summary,
  sector,
}: {
  deal: Dealing | UsDealing;
  market: "UK" | "US";
  /** The family stamp — "Disclosure" or "Shared filing". */
  eyebrow: string;
  /** The analysis summary, passed only where the page may publish it. */
  summary?: string | null;
  sector?: { slug: string; label: string } | null;
}) {
  const fam = filingFamily(market);
  const mkt = market === "US" ? UsMarket : UkMarket;
  const lp = deal.live_performance;
  const ret = lp?.return_pct_disclosed ?? null;
  const alpha = lp?.alpha_pct_disclosed ?? null;
  // A mark on the disclosure day itself is 0.0% against 0.0%: a result where
  // there has not yet been one. Same test as outcomeSentence in filings.js.
  const dayZero = !!(lp?.as_of && lp.as_of <= deal.disclosed_date);
  const hasOutcome = ret != null && !dayZero;
  const value = fam.value(deal);
  const rating = deal.analysis?.rating ?? null;
  const price = fam.sharePrice(deal);

  const figures: StageFigure[] = [];

  if (value != null && value > 0) {
    figures.push({ k: "Paid", v: fam.money(value) });
  }
  if (hasOutcome) {
    figures.push({
      k: "Since disclosure",
      v: signedPct(ret) as string,
      tone: (ret as number) >= 0 ? "pos" : "neg",
    });
    if (alpha != null) {
      figures.push({
        k: "Vs the market",
        v: signedPct(alpha) as string,
        tone: alpha >= 0 ? "pos" : "neg",
      });
    }
  }

  return (
    <Stage>
      <div className="px-6 pt-7 sm:px-8 sm:pt-9">
        <Eyebrow tone="stage">
          {eyebrow}
          {rating ? ` · ${rating}` : ""}
          {` · ${longDate(deal.disclosed_date, market)}`}
        </Eyebrow>

        <CompanyLogo
          className="mt-5"
          market={market}
          size={80}
          ticker={deal.ticker}
        />

        {/* Capped at 44: the headline is a sentence about the trade, and
            54px runs it to four lines. */}
        <StageTitle capped className="mt-5 max-w-[26ch]">
          {filingHeadline(deal, market)}
        </StageTitle>

        {summary ? (
          <figure className="mt-5 max-w-[60ch]">
            <figcaption className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
              From the analysis
            </figcaption>
            <blockquote className="mt-1.5 text-[15px] leading-[1.6] text-white/70">
              {summary}
            </blockquote>
          </figure>
        ) : (
          <p className="mt-4 max-w-[58ch] text-[15px] leading-[1.6] text-white/65">
            {fam.leadSentence(deal)}
          </p>
        )}

        {figures.length > 0 ? <StageFigures items={figures} /> : null}

        {/* No figure is a state with words, never a dash in a figure slot. */}
        {!hasOutcome ? (
          <p className="mt-5 max-w-[58ch] text-[13px] leading-[1.55] text-white/55">
            {dayZero
              ? `Not enough data yet on how it has done. The latest close we hold is the disclosure day, ${shortDate(deal.disclosed_date, market)}, so the return since fills in after the next close.`
              : "Not enough data yet on how it has done: we don’t hold a price mark for this filing. The return since fills in once the price panel covers it."}
          </p>
        ) : null}
      </div>

      {/* Full-bleed under the header, the way every stage puts its object. */}
      <div className="mt-8 px-2 pb-1 sm:px-3">
        <MiniPriceChart
          detailed
          disclosedDate={deal.disclosed_date}
          // UK prices are pence, US are dollars: each market's own unit,
          // matched to its formatter. Reading the wrong one draws the entry
          // level two orders of magnitude off the series.
          entryPrice={
            (market === "US"
              ? (deal as UsDealing).price
              : (deal as Dealing).price_pence) ?? 0
          }
          fmt={mkt.priceFormat}
          muted={deal.is_open_market_buy === false}
          normalizeClose={(close) => mkt.normalizeLivePrice(close)}
          showFigures={false}
          theme="dark"
          tickerForApi={deal.ticker}
          tickerForDisplay={displayTicker(deal.ticker)}
          tradeDate={deal.trade_date}
        />
      </div>

      <StageFooter className="sm:px-8">
        <span>
          {fmtShares(deal.shares)} shares{price ? ` at ${price}` : ""}, traded{" "}
          {shortDate(deal.trade_date, market)}, disclosed{" "}
          {shortDate(deal.disclosed_date, market)}
        </span>
        <span className="text-white/45">
          {displayTicker(deal.ticker)} · {market}
          {sector ? (
            <>
              {" · "}
              <Link
                className="underline-offset-4 transition-colors hover:text-white/80 hover:underline"
                to={sectorPath(sector.slug)}
              >
                {sector.label}
              </Link>
            </>
          ) : null}
        </span>
      </StageFooter>
    </Stage>
  );
}

/** The stage while the row is in flight: the same panel, the same bands, in
 *  the same places, so the arriving record fades up into the geometry it will
 *  occupy rather than pushing the page down. */
export function FilingStageSkeleton() {
  return (
    <Stage aria-hidden>
      <div className="px-6 pt-7 sm:px-8 sm:pt-9">
        <Skeleton className="h-[11px] w-[220px] max-w-full" />
        <Skeleton circle className="mt-5" h={80} w={80} />
        <Skeleton className="mt-5 h-[27px] w-[92%] max-w-[560px] sm:h-[37px]" />
        <Skeleton className="mt-2 h-[27px] w-[86%] max-w-[540px] sm:h-[37px]" />
        <Skeleton className="mt-2 h-[27px] w-[64%] max-w-[420px] sm:h-[37px]" />
        <StageFigures reserve items={[]} />
      </div>
      <div className="mt-8 px-5 pb-4 sm:px-8">
        <Skeleton className="h-[360px] w-full rounded-xl" />
      </div>
      <StageFooter className="sm:px-8">
        <Skeleton className="h-[12px] w-[260px] max-w-full" />
      </StageFooter>
    </Stage>
  );
}
