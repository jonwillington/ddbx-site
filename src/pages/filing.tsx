/** One disclosure, one permanent URL — /dealings/d-1825cd96b288f7e1.
 *
 *  The atomic unit of the product, and the page a stranger is most likely to
 *  arrive on: a filing URL is what gets shared, cited and linked. So it has two
 *  jobs at once — be a complete, honest record of one purchase, and be the best
 *  argument the site makes for the app.
 *
 *  The composition follows from that, and the ORDER is the argument:
 *
 *    what happened  ->  what it did  ->  how we judged it  ->  what's behind it
 *
 *  1. `VerdictBand` — the purchase and its outcome, side by side, as the two
 *     largest objects on the page.
 *  2. The price chart, interactive, with the trade and the disclosure marked.
 *     The gap between those two markers is the single most under-appreciated
 *     fact about insider filings and it is the one thing a static table can
 *     never show.
 *  3. `RatingChecks` — the six checks, each expandable to what it asks and what
 *     we found here. This is the method demonstrated on a real filing rather
 *     than described in the abstract, which is why it sits on this page rather
 *     than being a link to /how-it-works.
 *  4. `AssessmentPanel` — what the written analysis contains, in counts, with
 *     the sources it drew on. The ask.
 *
 *  The reference table comes last, because it is the part a reader consults
 *  rather than reads.
 *
 *  WHAT IS DELIBERATELY ABSENT is decided in shared/filings.js. Read that
 *  header before adding anything from `analysis`: the thesis, the evidence
 *  detail and the risks stay in the app, and showing a crawler more than a
 *  visitor is cloaking rather than a clever workaround.
 */
import type { Dealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  analysisShape,
  citedSources,
  cleanName,
  disclosureLagDays,
  FILING_NOTICE,
  filingLeadSentence,
  filingMeetsBar,
  money,
  sharePrice,
  shares,
} from "../../shared/filings.js";
import { sectorByLabel, sectorPath } from "../../shared/sectors.js";

import {
  AssessmentPanel,
  ContextCards,
  RatingChecks,
  VerdictBand,
} from "@/components/filing/filing-ui";
import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { Skeleton } from "@/components/skeleton";
import { RelatedCards } from "@/components/seo/related-cards";
import { RatingBadge } from "@/components/rating-badge";
import { CompanyLogo } from "@/components/company-logo";
import { MiniPriceChart } from "@/components/mini-price-chart";
import { TickerPill } from "@/components/ticker-pill";
import { api } from "@/lib/api";
import { companyPath, displayTicker } from "@/lib/company";
import { UkMarket } from "@/lib/markets/uk";

const RULE = "border-hairline dark:border-separator";
const R = {
  body: "text-[14px] leading-[1.65] text-foreground/70",
  label: "text-[12px] text-foreground/45",
};

export default function FilingPage() {
  const { id } = useParams<{ id: string }>();
  const [deal, setDeal] = useState<Dealing | null>(null);
  // "missing" and "failed" are different pages: an outage must not render as
  // "this filing does not exist".
  const [status, setStatus] = useState<"loading" | "ok" | "missing" | "failed">(
    "loading",
  );

  useEffect(() => {
    if (!id) {
      setStatus("missing");

      return;
    }

    let live = true;

    setStatus("loading");
    api
      .dealing(id)
      .then((d) => {
        if (!live) return;
        setDeal(d);
        setStatus("ok");
      })
      .catch((err: Error) => {
        if (!live) return;
        setStatus(/\b404\b/.test(err.message) ? "missing" : "failed");
      });

    return () => {
      live = false;
    };
  }, [id]);

  const sources = useMemo(() => (deal ? citedSources(deal) : []), [deal]);
  const shape = useMemo(() => (deal ? analysisShape(deal) : null), [deal]);

  const context = useMemo(() => {
    if (!deal) return [];
    const out: { label: string; value: string; body: string }[] = [];
    const c = deal.cluster;
    const b = deal.buy_style;

    if (c?.count && c.count >= 2) {
      out.push({
        label: "Cluster",
        value: `${c.count} insiders`,
        body: `Bought this company inside a ${c.window_days}-day window. A ${c.tier} cluster: breadth is a signal one purchase on its own cannot give you.`,
      });
    }
    if (b?.kind && b.kind !== "neutral") {
      const off = Math.abs(Math.round((b.drawdown_from_high_pct || 0) * 100));

      out.push({
        label: "Buy style",
        value: b.kind === "contrarian" ? "Into weakness" : "Into strength",
        body:
          b.kind === "contrarian"
            ? `Bought ${off}% below the trailing ${b.window_days}-day high. Leaning into a drawdown rather than chasing one.`
            : `Bought at or near the trailing ${b.window_days}-day high, with the price already running.`,
      });
    }

    return out;
  }, [deal]);

  if (status === "missing" || status === "failed") {
    return (
      <DefaultLayout drawerRight>
        <SeoRail marketId="uk" placement="filing_rail" />
        <SeoPageShell
          crumbs={[{ label: "Filings" }, { label: "Not found" }]}
          eyebrow="Disclosure"
          standfirst={
            status === "missing"
              ? "Every disclosure we hold has a permanent address. This isn’t one of them, so the link is either wrong or points at a filing from before we started recording."
              : "We couldn’t load this filing just now. That’s a fault at our end rather than a missing record."
          }
          title={
            status === "missing"
              ? "We don’t hold that filing"
              : "Couldn’t load this filing"
          }
        >
          <SeoSection aside="Where to go instead." title="Browse the record">
            <RelatedCards
              cols={2}
              items={[
                {
                  to: "/companies",
                  title: "Every company",
                  description:
                    "Each issuer with disclosed insider buying, and the filings behind it.",
                },
                {
                  to: "/biggest-buys",
                  title: "The biggest buys",
                  description:
                    "The largest open-market purchases insiders have made in their own companies.",
                },
              ]}
            />
          </SeoSection>
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  const lag = deal ? disclosureLagDays(deal) : null;
  const sector = deal?.sector_normalized
    ? sectorByLabel(deal.sector_normalized)
    : null;
  const analysed = filingMeetsBar(deal);
  const name = deal
    ? cleanName(deal.company) || displayTicker(deal.ticker)
    : "Filing";
  // Numbered run over the sections that make the argument. The reference table
  // and "read next" sit outside it — a counter on an appendix suggests it is
  // part of the read.
  const total = analysed ? 4 : 2;

  return (
    <DefaultLayout drawerRight>
      <SeoRail marketId="uk" placement="filing_rail" />
      <SeoPageShell
        crumbs={[
          { label: "Companies", to: "/companies" },
          ...(deal ? [{ label: name, to: companyPath(deal.ticker) }] : []),
          { label: deal?.disclosed_date ?? "Filing" },
        ]}
        cta={{
          body: "This page is one filing. The app is the running feed: every disclosure the day it files, already rated, with the written case attached and an alert when the price moves after a buy you’re following.",
          gaLabel: `Filing · ${id ?? ""}`,
          headline: "Every filing, the day it files.",
          marketId: "uk",
          screenshotSlot: "analysis",
        }}
        eyebrow="Disclosure"
        loading={status === "loading"}
        skeleton={
          <>
            <Skeleton className="mt-7 h-[168px] w-full rounded-2xl" />
            <Skeleton className="mt-6 h-[220px] w-full rounded-2xl" />
            <SeoSkeleton rows={6} variant="ruled-list" />
          </>
        }
        standfirst={deal ? filingLeadSentence(deal) : undefined}
        standfirstSize="lede"
        title={
          deal ? (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <CompanyLogo
                className="shrink-0"
                size={40}
                ticker={deal.ticker}
              />
              <span>{name}</span>
            </span>
          ) : (
            "Filing"
          )
        }
      >
        {deal ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <TickerPill ticker={displayTicker(deal.ticker)} />
              {deal.analysis?.rating ? (
                <RatingBadge rating={deal.analysis.rating} />
              ) : null}
              {sector ? (
                <Link
                  className={`${R.label} underline-offset-4 hover:underline`}
                  to={sectorPath(sector.slug)}
                >
                  {sector.label}
                </Link>
              ) : null}
            </div>

            <VerdictBand deal={deal} />

            {/* The chart carries its own period switcher and crosshair, so it
                is the one genuinely interactive object on an otherwise static
                document. Markers on both the trade and the disclosure make the
                lag visible instead of merely stated. */}
            <SeoSection
              aside="Trade and disclosure are marked. Drag or hover to scrub the price."
              index={1}
              title="The price around the buy"
              total={total}
            >
              <div className="mt-4">
                <MiniPriceChart
                  disclosedDate={deal.disclosed_date}
                  entryPrice={deal.price_pence}
                  fmt={UkMarket.priceFormat}
                  muted={deal.is_open_market_buy === false}
                  tickerForApi={deal.ticker}
                  tickerForDisplay={displayTicker(deal.ticker)}
                  tradeDate={deal.trade_date}
                />
              </div>
              <p className={`mt-4 max-w-[62ch] ${R.label} leading-[1.6]`}>
                {FILING_NOTICE}
              </p>
            </SeoSection>

            {context.length > 0 ? (
              <SeoSection
                aside="What else was happening around this purchase."
                index={2}
                title="Context"
                total={total}
              >
                <ContextCards items={context} />
              </SeoSection>
            ) : (
              <SeoSection
                aside="What else was happening around this purchase."
                index={2}
                title="Context"
                total={total}
              >
                <p className={`mt-4 max-w-[62ch] ${R.body}`}>
                  No other insiders bought this company inside the cluster
                  window, and there isn’t enough price history to classify what
                  this one was buying into.
                </p>
              </SeoSection>
            )}

            {analysed && deal.analysis?.checklist ? (
              <SeoSection
                aside="The same six checks every purchase is scored against, answered for this one."
                index={3}
                title={`Why this was rated ${deal.analysis.rating}`}
                total={total}
              >
                <RatingChecks checklist={deal.analysis.checklist} deal={deal} />
              </SeoSection>
            ) : null}

            {analysed && shape ? (
              <SeoSection
                aside="What the written assessment covers, and what it drew on."
                index={4}
                title="The case, in full"
                total={total}
              >
                <AssessmentPanel
                  rating={deal.analysis?.rating ?? "significant"}
                  shape={shape}
                  sources={sources}
                />
              </SeoSection>
            ) : null}

            {/* Reference, not narrative — so it sits below the argument and
                outside the numbered run. */}
            <SeoSection
              aside="The filing, as it was disclosed."
              title="The record"
            >
              <dl className={`mt-4 border-t ${RULE}`}>
                <Row label="Insider" value={deal.director.name} />
                <Row label="Role" value={deal.director.role} />
                <Row
                  label="Company"
                  value={
                    <Link
                      className="underline underline-offset-4"
                      to={companyPath(deal.ticker)}
                    >
                      {name}
                    </Link>
                  }
                />
                <Row label="Shares" value={shares(deal.shares)} />
                <Row label="Price paid" value={sharePrice(deal)} />
                <Row
                  label="Consideration"
                  value={money(deal.value_gbp, deal.currency)}
                />
                <Row label="Traded" value={deal.trade_date} />
                <Row label="Disclosed" value={deal.disclosed_date} />
                <Row
                  label="Disclosure lag"
                  value={
                    lag == null
                      ? "—"
                      : lag === 0
                        ? "Same day"
                        : `${lag} ${lag === 1 ? "day" : "days"}`
                  }
                />
                <Row
                  label="Transaction"
                  value={
                    deal.is_open_market_buy
                      ? "Open-market purchase"
                      : deal.tx_type === "buy"
                        ? "Purchase"
                        : "Disposal"
                  }
                />
              </dl>
            </SeoSection>

            <SeoSection aside="Where to go from here." title="Read next">
              <RelatedCards
                cols={2}
                items={[
                  {
                    to: companyPath(deal.ticker),
                    title: `Every filing at ${name}`,
                    description:
                      "The issuer's full record: who has bought, how much, and how those purchases have done.",
                  },
                  ...(sector
                    ? [
                        {
                          to: sectorPath(sector.slug),
                          title: `${sector.label} insider buying`,
                          description:
                            "The sector's twelve-month picture, and how its buys have performed against the market.",
                        },
                      ]
                    : []),
                  {
                    to: "/how-it-works",
                    title: "How a filing becomes a rating",
                    description:
                      "The six checks in full, what each rating means, and where the method stops.",
                  },
                  {
                    to: "/biggest-buys",
                    title: "The biggest buys",
                    description:
                      "The largest purchases insiders have made in their own companies.",
                  },
                ]}
              />
            </SeoSection>
          </>
        ) : null}
      </SeoPageShell>
    </DefaultLayout>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={`flex justify-between gap-6 border-b ${RULE} py-2.5`}>
      <dt className="text-[13px] text-foreground/50">{label}</dt>
      <dd className="text-right text-[13.5px] text-foreground/85">{value}</dd>
    </div>
  );
}
