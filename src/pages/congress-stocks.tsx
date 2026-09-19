/** The stock index — /congress/stocks.
 *
 *  The hub the ticker pages hang off. Without it a page like
 *  /congress/stocks/nvda is reachable only from a member's issuer list, which
 *  is the crawl-distribution problem the sector hubs were built to solve on
 *  the company side.
 *
 *  It reads /api/gov-stocks, the per-ticker roster the sitemap and every
 *  ticker page's bar also read. Three states from `readStocks`, and failed is
 *  not empty: an outage says so rather than rendering a hub with no stocks.
 *
 *  One live object keeps the page moving: the most recent purchases, from
 *  the feed, each linking to its ticker's page whether or not that page has
 *  crossed the bar (it renders either way). Funds are left out of it, as they
 *  are left out of the index.
 */
import type { StocksRead } from "../../shared/congress-stocks";
import type { GovDealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  band,
  CONGRESS_NOTICE,
  CONGRESS_SOURCE,
} from "../../shared/congress.js";
import {
  cleanIssuer,
  fundCount,
  longDate,
  MIN_STOCK_MEMBERS,
  MIN_STOCK_ROWS,
  PURCHASES_ONLY_NOTE,
  readStocks,
  stockEntry,
  stockPath,
  stocksIndexLead,
} from "../../shared/congress-stocks.js";

import {
  BoardRow,
  BoardRowHeader,
  BoardRowList,
} from "@/components/boards/board-row";
import { dateLabel } from "@/components/boards/board-model";
import { CompanyLogo } from "@/components/company-logo";
import { HowToRead, R } from "@/components/congress/congress-ui";
import { StockCell } from "@/components/congress/stock-ui";
import { TickerPill } from "@/components/ticker-pill";
import DefaultLayout from "@/layouts/default";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { RelatedCards } from "@/components/seo/related-cards";
import { Skeleton } from "@/components/skeleton";
import { StatTiles } from "@/components/seo/stat-tiles";
import { congressIndexCta } from "@/components/seo/cta-copy";
import { api } from "@/lib/api";

const LOCALE = "en-US";
const TOP = 25;
const RECENT = 10;

const TITLE = "The stocks members of Congress buy";

export default function CongressStocksPage() {
  const [read, setRead] = useState<StocksRead | null>(null);

  useEffect(() => {
    let live = true;

    api
      .govStocks()
      .then((body) => live && setRead(readStocks(body)))
      .catch(() => live && setRead({ state: "failed" }));

    return () => {
      live = false;
    };
  }, []);

  // Live, and allowed to fail quietly: the roster is the page, the feed is
  // the pulse. A feed outage leaves a section absent, not a page broken.
  const [feed, setFeed] = useState<GovDealing[] | null>(null);
  const [recentFailed, setRecentFailed] = useState(false);

  useEffect(() => {
    let live = true;

    api
      .govDealings({ view: "all", limit: 60 })
      .then((r) => live && setFeed(r.dealings))
      .catch(() => live && setRecentFailed(true));

    return () => {
      live = false;
    };
  }, []);

  const stocks = read && read.state !== "failed" ? read.roster.stocks : null;

  // One row per ticker, newest first, so the list reads as ten names rather
  // than one member's forty-line filing. Funds out, by the roster's own
  // judgement; a ticker newer than the roster has no entry and stays in.
  const recent = useMemo(() => {
    if (!feed || !stocks) return null;
    const seen = new Set<string>();
    const out: GovDealing[] = [];

    for (const d of feed) {
      if (!d.ticker || seen.has(d.ticker)) continue;
      seen.add(d.ticker);
      if (stockEntry(stocks, d.ticker)?.is_fund) continue;
      out.push(d);
      if (out.length >= RECENT) break;
    }

    return out;
  }, [feed, stocks]);

  const crumbs = [{ label: "Congress", to: "/congress" }, { label: "Stocks" }];

  if (read?.state === "failed" || read?.state === "empty") {
    const failed = read.state === "failed";

    return (
      <DefaultLayout drawerRight>
        <SeoRail marketId="us" placement="congress_rail" />
        <SeoPageShell
          crumbs={crumbs}
          eyebrow="Congress by stock"
          standfirst={
            failed
              ? "We couldn’t load the list of stocks just now. That’s a fault at our end rather than an empty record; try again in a few minutes."
              : `Not enough data yet. A stock gets a page once at least ${MIN_STOCK_MEMBERS} members of Congress and ${MIN_STOCK_ROWS} purchases are on record, and none has crossed that bar. This index fills in on its own as filings arrive.`
          }
          title={failed ? "Couldn’t load the stock list" : TITLE}
        >
          <SeoSection aside="Where the record is." title="Browse instead">
            <RelatedCards
              cols={2}
              items={[
                {
                  to: "/congress/members",
                  title: "By member",
                  description:
                    "Every member with a disclosed purchase on record, most recently active first.",
                },
                {
                  to: "/congress",
                  title: "Latest congressional filings",
                  description:
                    "The live feed of purchases as they are disclosed, rated.",
                },
              ]}
            />
          </SeoSection>
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  const roster = read?.state === "ok" ? read.roster : null;
  const published = read?.state === "ok" ? read.published : [];
  const funds = roster ? fundCount(roster.stocks) : 0;
  const listed = roster ? roster.stocks.length - published.length - funds : 0;

  return (
    <DefaultLayout drawerRight>
      <SeoRail marketId="us" placement="congress_rail" />
      <SeoPageShell
        crumbs={crumbs}
        cta={{
          body: congressIndexCta.body,
          gaLabel: "Congress stocks index",
          headline: congressIndexCta.headline,
          marketId: "us",
        }}
        eyebrow="Congress by stock"
        loading={!roster}
        skeleton={
          <>
            <Skeleton className="mt-5 h-[14px] w-full max-w-[60ch]" />
            <Skeleton className="mt-2 h-[14px] w-3/4 max-w-[48ch]" />
            <SeoSkeleton rows={4} variant="stat-tiles" />
            <SeoSkeleton rows={10} variant="ruled-list" />
          </>
        }
        standfirst={roster ? stocksIndexLead(roster) : undefined}
        standfirstSize="lede"
        title={TITLE}
      >
        {roster ? (
          <>
            <HowToRead lead={PURCHASES_ONLY_NOTE} notes={[]} />

            <StatTiles
              className="mt-7"
              cols={4}
              note={
                <>
                  {roster.as_of
                    ? `Counts to ${longDate(roster.as_of)}, the latest filing in the record. `
                    : null}
                  {CONGRESS_NOTICE}
                </>
              }
              stats={[
                {
                  label: "Stocks with a page",
                  value: published.length,
                  primary: true,
                },
                { label: "Members", value: roster.corpus.members },
                {
                  label: "Purchases",
                  value: roster.corpus.purchases.toLocaleString(LOCALE),
                },
                {
                  label: "Tickers bought",
                  value: roster.corpus.tickers.toLocaleString(LOCALE),
                },
              ]}
            />

            <SeoSection
              aside={`The ${TOP} names bought by the most members. Ranked by members, then purchases.`}
              index={1}
              title="Most widely bought"
              total={3}
            >
              <BoardRowHeader
                className="mt-4"
                facts={["Purchases", "Last filed"]}
                figure="Members"
                subject="Company"
              />
              <BoardRowList>
                {published.slice(0, TOP).map((e, i) => (
                  <BoardRow
                    key={e.ticker}
                    badge={<TickerPill ticker={e.ticker} />}
                    facts={[
                      { label: "Purchases", value: e.purchases },
                      {
                        label: "Last filed",
                        value: dateLabel(e.last_disclosed, LOCALE),
                      },
                    ]}
                    figure={{
                      value: e.members,
                      unit: e.members === 1 ? "member" : "members",
                    }}
                    logo={<CompanyLogo size={56} ticker={e.ticker} />}
                    name={cleanIssuer(e.company)}
                    position={i + 1}
                    secondary={
                      e.in_lane_members > 0
                        ? `${e.sector_normalized ?? "Sector not held"} · ${e.in_lane_members} of the ${e.members} sit on a committee whose jurisdiction covers it`
                        : (e.sector_normalized ?? "Sector not held")
                    }
                    to={stockPath(e.ticker)}
                  />
                ))}
              </BoardRowList>
            </SeoSection>

            {recentFailed ? null : (
              <SeoSection
                aside="Live from the feed: the latest purchases, one row per name."
                index={2}
                title="Filed most recently"
                total={3}
              >
                {recent === null ? (
                  <p className={`mt-4 ${R.body}`}>
                    Loading the latest filings.
                  </p>
                ) : recent.length === 0 ? (
                  <p className={`mt-4 ${R.body}`}>
                    No purchases in the feed just now.
                  </p>
                ) : (
                  <>
                    <BoardRowHeader
                      className="mt-4"
                      facts={["Band"]}
                      lead="date"
                      leadLabel="Filed"
                      subject="Company"
                    />
                    <BoardRowList>
                      {recent.map((d) => (
                        <BoardRow
                          key={d.id}
                          badge={
                            d.ticker ? <TickerPill ticker={d.ticker} /> : null
                          }
                          date={{ iso: d.disclosed_date, locale: LOCALE }}
                          facts={[
                            {
                              label: "Band",
                              value: band(d.amount_min ?? 0, d.amount_max ?? 0),
                            },
                          ]}
                          logo={
                            d.ticker ? (
                              <CompanyLogo size={56} ticker={d.ticker} />
                            ) : (
                              <span className="block h-14 w-14" />
                            )
                          }
                          name={cleanIssuer(d.company)}
                          secondary={`Bought by ${d.reporter.name}${d.owner === "self" ? "" : " (spouse, joint or dependent account)"}`}
                          to={d.ticker ? stockPath(d.ticker) : undefined}
                        />
                      ))}
                    </BoardRowList>
                  </>
                )}
              </SeoSection>
            )}

            <SeoSection
              aside={`${published.length} companies bought by at least ${MIN_STOCK_MEMBERS} members and ${MIN_STOCK_ROWS} times. Alphabetical.`}
              index={3}
              title="Every stock with a page"
              total={3}
            >
              <ul
                className={`mt-4 grid grid-cols-1 gap-x-8 border-t ${R.body} sm:grid-cols-2 lg:grid-cols-3`}
              >
                {[...published]
                  .map((e) => ({ ...e, company: cleanIssuer(e.company) }))
                  .sort((a, b) => a.company.localeCompare(b.company))
                  .map((e) => (
                    <StockCell
                      key={e.ticker}
                      company={e.company}
                      members={e.members}
                      ticker={e.ticker}
                      to={stockPath(e.ticker)}
                    />
                  ))}
                {/* Filler cells so the last row's rules finish (static-page rule
                7). One set per column count; the count is a media query, so
                the two-column filler shows only between sm and lg and the
                three-column set only from lg. */}
                {published.length % 2 === 1 ? (
                  <li
                    aria-hidden
                    className="hidden border-b border-hairline sm:block lg:hidden dark:border-separator"
                  />
                ) : null}
                {Array.from({ length: (3 - (published.length % 3)) % 3 }).map(
                  (_, i) => (
                    <li
                      key={`fill3-${i}`}
                      aria-hidden
                      className="hidden border-b border-hairline lg:block dark:border-separator"
                    />
                  ),
                )}
              </ul>
              <p className={`mt-4 max-w-measure ${R.label}`}>
                Another {listed.toLocaleString(LOCALE)} companies have a
                purchase on record but not from enough members, or often enough,
                for a page to say anything. Their pages exist and are linked
                from the members who bought them; they stay out of search until
                they cross the bar.{" "}
                {funds > 0
                  ? `${funds.toLocaleString(LOCALE)} funds and ETFs are left out of this index altogether: a fund is not a company any committee oversees. Their pages still resolve.`
                  : null}
              </p>
            </SeoSection>

            <SeoSection
              aside="The record these pages are built from."
              title="What this is"
              variant="rail"
            >
              <div className={`space-y-3 ${R.body}`}>
                <p>
                  Members of Congress must report stock trades under the STOCK
                  Act within 45 days, in a value band rather than an amount. We
                  collect those reports from the House Clerk and the Senate,
                  resolve each filer against the congressional roster, and keep
                  the purchases. The member pages read that record one way;
                  these read it the other, by the company bought.
                </p>
                <p>
                  Each stock page answers four things: who bought, when, in what
                  bands, and whether any buyer sits on a committee whose
                  jurisdiction covers the sector. That last fact is stated as
                  jurisdiction and nothing more. It is public record, and it is
                  not evidence that any purchase was informed by it.{" "}
                  <Link
                    className="underline underline-offset-4"
                    to="/learn/stock-act"
                  >
                    What the STOCK Act requires
                  </Link>
                  .
                </p>
              </div>
            </SeoSection>

            <SeoSection aside="Where to go from here." title="Read next">
              <RelatedCards
                cols={2}
                items={[
                  {
                    to: "/congress/members",
                    title: "By member",
                    description:
                      "Every member with a disclosed purchase on record, most recently active first.",
                  },
                  {
                    to: "/congress/committees",
                    title: "By committee",
                    description:
                      "Which committees oversee which sectors, and who on them has been buying.",
                  },
                  {
                    to: "/congress",
                    title: "Latest congressional filings",
                    description:
                      "The live feed of purchases as they are disclosed, rated.",
                  },
                  {
                    to: "/learn/stock-act",
                    title: "What the STOCK Act requires",
                    description:
                      "The 45-day window, what has to be disclosed, and what does not.",
                  },
                ]}
              />
            </SeoSection>

            <p className={`mt-8 max-w-measure ${R.label}`}>
              {CONGRESS_SOURCE}
            </p>
          </>
        ) : null}
      </SeoPageShell>
    </DefaultLayout>
  );
}
