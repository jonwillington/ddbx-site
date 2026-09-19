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
  disclosureLagDays,
  signedPct,
  shares as fmtShares,
} from "../../../shared/filings.js";
import { moneyPair } from "../../../shared/leaderboard.js";
import { filingFamily } from "../../../shared/filing-family.js";
import { sectorPath } from "../../../shared/sectors.js";

import { CalendarDayChip, chipParts } from "@/components/calendar-day-chip";
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

/** A filing date as a reader says it: "15 September 2026", or with the
 *  weekday, "Tue 15 September 2026". Every date on the filing page goes
 *  through here, so no slot on it prints an ISO string. */
export function longDate(
  iso: string | null | undefined,
  market: string,
  { weekday = false }: { weekday?: boolean } = {},
): string {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);

  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(localeFor(market), {
        ...(weekday ? { weekday: "short" as const } : {}),
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
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
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);

  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(localeFor(market), {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      });
}

/** One date on the dateline: the site's calendar leaf, then what happened on
 *  it and the full date. */
function DateLeaf({
  iso,
  label,
  market,
  muted = false,
}: {
  iso: string;
  label: string;
  market: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <CalendarDayChip {...chipParts(iso)} muted={muted} size="lg" />
      <div className="min-w-0">
        <p className="micro text-white/50">{label}</p>
        <p className="mt-1.5 whitespace-nowrap text-lede text-white">
          {longDate(iso, market)}
        </p>
      </div>
    </div>
  );
}

/** WHEN, stated before WHAT.
 *
 *  The date used to be the third item in the kicker, mono 11px at 55% white,
 *  and the trade date lived only in the caption under the chart. But a filing
 *  is a dated event before it is anything else, and the gap between the trade
 *  and the disclosure is the single most under-appreciated fact about insider
 *  filings, so both dates sit at the top of the stage as calendar leaves with
 *  the gap between them in words. A same-day filing is one leaf. */
export function FilingDateline({
  deal,
  market,
  className = "",
}: {
  deal: Dealing | UsDealing;
  market: string;
  className?: string;
}) {
  const lag = disclosureLagDays(deal);
  const sameDay = lag === 0 || deal.trade_date === deal.disclosed_date;

  if (sameDay || !deal.trade_date) {
    return (
      <div className={className}>
        <DateLeaf
          iso={deal.disclosed_date}
          label={deal.trade_date ? "Traded and disclosed" : "Disclosed"}
          market={market}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 ${className}`.trimEnd()}
    >
      <DateLeaf muted iso={deal.trade_date} label="Traded" market={market} />
      {lag != null && lag > 0 ? (
        <div className="flex items-center gap-2 pl-6 sm:pl-0">
          <span aria-hidden className="h-4 w-px bg-white/20 sm:h-px sm:w-6" />
          <span className="text-small whitespace-nowrap text-brand-amber">
            {lag} {lag === 1 ? "day" : "days"} later
          </span>
          <span aria-hidden className="hidden h-px w-6 bg-white/20 sm:block" />
        </div>
      ) : null}
      <DateLeaf iso={deal.disclosed_date} label="Disclosed" market={market} />
    </div>
  );
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
  // What the insider's own shares are worth at the latest close: the one
  // figure the drawer's position card stated that the stage did not. Measured
  // from the TRADE (their price), not the disclosure, because it is their
  // stake. Buys only: a disposal has no stake left to mark.
  const retTrade = lp?.return_pct_trade ?? null;
  const worthNow =
    value != null &&
    value > 0 &&
    retTrade != null &&
    !dayZero &&
    fam.transactionLabel(deal) !== "Disposal"
      ? value * (1 + retTrade / 100)
      : null;
  const symbol = fam.currency === "USD" ? "$" : "£";
  const [paidLabel, worthLabel] =
    value != null && value > 0 && worthNow != null
      ? moneyPair(value, worthNow, symbol)
      : [value != null && value > 0 ? fam.money(value) : null, null];

  if (paidLabel) {
    figures.push({ k: "Paid", v: paidLabel });
  }
  if (worthLabel && worthNow != null && value != null) {
    figures.push({
      k: "Their stake now",
      v: worthLabel,
      tone: worthNow >= value ? "pos" : "neg",
    });
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
        </Eyebrow>

        <FilingDateline className="mt-5" deal={deal} market={market} />

        <div className="mt-7 border-t border-rule-stage pt-7">
          <CompanyLogo market={market} size={64} ticker={deal.ticker} />
        </div>

        {/* Capped at 44: the headline is a sentence about the trade, and
            54px runs it to four lines. */}
        <StageTitle capped className="mt-5 max-w-[26ch]">
          {filingHeadline(deal, market)}
        </StageTitle>

        {summary ? (
          <figure className="mt-5 max-w-[60ch]">
            <figcaption className="micro text-white/45">
              From the analysis
            </figcaption>
            <blockquote className="mt-1.5 text-lede text-white/70">
              {summary}
            </blockquote>
          </figure>
        ) : (
          <p className="mt-4 max-w-measure text-lede text-white/65">
            {fam.leadSentence(deal)}
          </p>
        )}

        {figures.length > 0 ? <StageFigures items={figures} /> : null}

        {/* No figure is a state with words, never a dash in a figure slot. */}
        {!hasOutcome ? (
          <p className="mt-5 max-w-measure text-body text-white/55">
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
          {/* The dates are the dateline's now; the caption keeps the fill. */}
          {fmtShares(deal.shares)} shares{price ? ` at ${price}` : ""}
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
        <Skeleton className="h-[11px] w-[160px] max-w-full" />
        <Skeleton className="mt-5 h-[52px] w-[420px] max-w-full" />
        <Skeleton circle className="mt-14" h={64} w={64} />
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
