/** One disclosure, one permanent URL — /dealings/d-1825cd96b288f7e1.
 *
 *  The atomic unit of the whole product, and until now a route that rendered
 *  the market dashboard. `GET /api/dealings/:id` has always worked; nothing
 *  joined it to a page.
 *
 *  Two things make this more than a row with a URL on it:
 *
 *  1. **What happened next.** The outcome section is marked to the latest
 *     cached close, so the page keeps changing after it is published. That is
 *     the difference between a filing page and an archive entry, and it is why
 *     the page stays worth re-crawling for years rather than going stale the
 *     week it appears.
 *  2. **The checklist.** The six checks that produced the rating, per filing.
 *     /how-it-works publishes the method; this publishes the method's answer.
 *
 *  WHAT IT DOES NOT SHOW is decided in shared/filings.js — read the header
 *  there before adding anything from `analysis`. The short version: the written
 *  thesis, the evidence detail and the risks stay in the app, because the site
 *  gates them everywhere else and showing a crawler more than a visitor is
 *  cloaking rather than a clever workaround.
 */
import type { Dealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  awaitingOutcome,
  CHECKLIST_LABELS,
  citedSources,
  cleanName,
  clusterSentence,
  disclosureLagDays,
  FILING_NOTICE,
  filingLeadSentence,
  filingMeetsBar,
  money,
  outcomeSentence,
  sharePrice,
  shares,
  signedPct,
  styleSentence,
} from "../../shared/filings.js";
import { sectorByLabel, sectorPath } from "../../shared/sectors.js";

import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { RelatedCards } from "@/components/seo/related-cards";
import { StatTiles } from "@/components/seo/stat-tiles";
import { RatingBadge } from "@/components/rating-badge";
import { CompanyLogo } from "@/components/company-logo";
import { TickerPill } from "@/components/ticker-pill";
import { api } from "@/lib/api";
import { companyPath, displayTicker } from "@/lib/company";

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
  const lp = deal?.live_performance;

  return (
    <DefaultLayout drawerRight>
      <SeoRail marketId="uk" placement="filing_rail" />
      <SeoPageShell
        crumbs={[
          { label: "Companies", to: "/companies" },
          ...(deal
            ? [
                {
                  label: cleanName(deal.company) || displayTicker(deal.ticker),
                  to: companyPath(deal.ticker),
                },
              ]
            : []),
          { label: deal?.disclosed_date ?? "Filing" },
        ]}
        cta={{
          body: "This page is one filing. The app is the running feed: every disclosure the day it files, with the full written assessment, the evidence on both sides and the price history attached.",
          gaLabel: `Filing · ${id ?? ""}`,
          headline: "Read the full assessment in the app.",
          marketId: "uk",
          screenshotSlot: "analysis",
        }}
        eyebrow="Disclosure"
        loading={status === "loading"}
        skeleton={
          <>
            <SeoSkeleton rows={4} variant="stat-tiles" />
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
              <span>
                {cleanName(deal.company) || displayTicker(deal.ticker)}
              </span>
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

            <StatTiles
              className="mt-7"
              cols={4}
              stats={[
                {
                  label: "Consideration",
                  value: money(deal.value_gbp, deal.currency),
                  primary: true,
                },
                { label: "Shares", value: shares(deal.shares) },
                { label: "Price paid", value: sharePrice(deal) },
                {
                  label: "Disclosure lag",
                  value:
                    lag == null
                      ? "—"
                      : lag === 0
                        ? "Same day"
                        : `${lag} ${lag === 1 ? "day" : "days"}`,
                },
              ]}
            />

            <SeoSection
              aside="The filing, as it was disclosed."
              index={1}
              title="What was bought"
              total={analysed ? 4 : 3}
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
                      {cleanName(deal.company) || displayTicker(deal.ticker)}
                    </Link>
                  }
                />
                <Row label="Traded" value={deal.trade_date} />
                <Row label="Disclosed" value={deal.disclosed_date} />
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

            <SeoSection
              aside={
                awaitingOutcome(deal)
                  ? "Marked from the disclosure-day close, so there is nothing to measure yet."
                  : "Measured from the disclosure-day close, not the insider’s own entry."
              }
              index={2}
              title="What happened next"
              total={analysed ? 4 : 3}
            >
              {awaitingOutcome(deal) ? (
                <p className={`mt-4 max-w-[62ch] ${R.body}`}>
                  This filing was disclosed on {deal.disclosed_date} and the
                  latest close we hold is the same day, so there is no return to
                  report yet. This section fills in as the price moves.
                </p>
              ) : outcomeSentence(deal) ? (
                <>
                  <p className={`mt-4 max-w-[62ch] ${R.body}`}>
                    {outcomeSentence(deal)}
                  </p>
                  <StatTiles
                    className="mt-5"
                    cols={2}
                    stats={[
                      {
                        label: "Since disclosure",
                        value: signedPct(lp?.return_pct_disclosed) ?? "—",
                        primary: true,
                        tone:
                          (lp?.return_pct_disclosed ?? 0) >= 0
                            ? "positive"
                            : "negative",
                      },
                      {
                        label: "Against the market",
                        value: signedPct(lp?.alpha_pct_disclosed) ?? "—",
                        tone:
                          (lp?.alpha_pct_disclosed ?? 0) >= 0
                            ? "positive"
                            : "negative",
                      },
                    ]}
                  />
                </>
              ) : (
                <p className={`mt-4 max-w-[62ch] ${R.body}`}>
                  We don’t hold a price mark for this filing yet, so there is no
                  return to report.
                </p>
              )}
              <p className={`mt-4 max-w-[62ch] ${R.label} leading-[1.6]`}>
                {FILING_NOTICE}
              </p>
            </SeoSection>

            <SeoSection
              aside="What else was happening around this purchase."
              index={3}
              title="Context"
              total={analysed ? 4 : 3}
            >
              <ul className={`mt-4 border-t ${RULE}`}>
                {[clusterSentence(deal), styleSentence(deal)]
                  .filter((x): x is string => !!x)
                  .map((line) => (
                    <li
                      key={line}
                      className={`border-b ${RULE} py-3 ${R.body}`}
                    >
                      {line}
                    </li>
                  ))}
                {!clusterSentence(deal) && !styleSentence(deal) ? (
                  <li className={`border-b ${RULE} py-3 ${R.body}`}>
                    No cluster of other insiders around this purchase, and not
                    enough price history to classify what they were buying into.
                  </li>
                ) : null}
              </ul>
            </SeoSection>

            {analysed && deal.analysis ? (
              <SeoSection
                aside="The six checks every purchase is scored against."
                index={4}
                title={`Rated ${deal.analysis.rating}`}
                total={4}
              >
                {deal.analysis.checklist ? (
                  <ul className={`mt-4 border-t ${RULE}`}>
                    {CHECKLIST_LABELS.map(([key, label]) => {
                      const passed = Boolean(
                        deal.analysis?.checklist?.[
                          key as keyof typeof deal.analysis.checklist
                        ],
                      );

                      return (
                        <li
                          key={key}
                          className={`flex items-center justify-between gap-4 border-b ${RULE} py-2.5`}
                        >
                          <span className="text-[13.5px] text-foreground/80">
                            {label}
                          </span>
                          <span
                            className={`text-[12px] ${passed ? "text-positive" : "text-foreground/30"}`}
                          >
                            {passed ? "Met" : "Not met"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                <p className={`mt-4 max-w-[62ch] ${R.body}`}>
                  Confidence {Math.round((deal.analysis.confidence ?? 0) * 100)}
                  %, over a {deal.analysis.catalyst_window} window. The written
                  assessment behind this rating, with the case for and against
                  and the risks, is in the app.{" "}
                  <Link
                    className="underline underline-offset-4"
                    to="/how-it-works"
                  >
                    How the checks work
                  </Link>
                  .
                </p>

                {sources.length > 0 ? (
                  <div className="mt-6">
                    <p className={R.label}>Sources used ({sources.length})</p>
                    <ul className={`mt-2 border-t ${RULE}`}>
                      {sources.map((s) => (
                        <li key={s.url} className={`border-b ${RULE} py-2.5`}>
                          <a
                            className="text-[13.5px] text-foreground/80 underline-offset-4 hover:underline"
                            href={s.url}
                            rel="nofollow noopener noreferrer"
                            target="_blank"
                          >
                            {s.headline}
                          </a>
                          <span className={`mt-0.5 block ${R.label}`}>
                            {s.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </SeoSection>
            ) : null}

            <SeoSection aside="Where to go from here." title="Read next">
              <RelatedCards
                cols={2}
                items={[
                  {
                    to: companyPath(deal.ticker),
                    title: `Every filing at ${cleanName(deal.company) || displayTicker(deal.ticker)}`,
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
                    to: "/learn/open-market-buy",
                    title: "Open-market buy vs vesting",
                    description:
                      "Why only one of these is a decision, and how to tell them apart in a filing.",
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
