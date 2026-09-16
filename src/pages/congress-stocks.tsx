/** The stock index — /congress/stocks.
 *
 *  The hub the ticker pages hang off. Without it a page like
 *  /congress/stocks/nvda is reachable only from a member's issuer list, which
 *  is the crawl-distribution problem the sector hubs were built to solve on
 *  the company side.
 *
 *  It reads from a generated roster (shared/congress-stocks-roster.js) rather
 *  than the API, and that is a stopgap rather than a preference: the public
 *  feed cannot aggregate by ticker (500-row cap, about eight weeks) and the
 *  only complete per-ticker figures live in 76 member details. The roster is
 *  those details summed, stamped with the date they were summed. The ticker
 *  pages themselves fetch live. The data-side endpoint that replaces the
 *  roster is specified in investigations/2026-09-16-congress-stocks.md.
 *
 *  One live object keeps the page moving: the most recent purchases, from
 *  the feed, each linking to its ticker's page whether or not that page has
 *  crossed the bar (it renders either way).
 */
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
  longDate,
  MIN_STOCK_MEMBERS,
  MIN_STOCK_ROWS,
  publishedRoster,
  PURCHASES_ONLY_NOTE,
  ROSTER_MIN_MEMBERS,
  stockPath,
  stocksIndexLead,
} from "../../shared/congress-stocks.js";
import {
  ROSTER,
  ROSTER_AS_OF,
  ROSTER_CORPUS,
} from "../../shared/congress-stocks-roster.js";

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
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { RelatedCards } from "@/components/seo/related-cards";
import { StatTiles } from "@/components/seo/stat-tiles";
import { congressIndexCta } from "@/components/seo/cta-copy";
import { api } from "@/lib/api";

const LOCALE = "en-US";
const TOP = 25;
const RECENT = 10;

export default function CongressStocksPage() {
  const published = useMemo(() => publishedRoster(ROSTER), []);
  const listed = ROSTER.length - published.length;

  // Live, and allowed to fail quietly: the roster is the page, the feed is
  // the pulse. A feed outage leaves a section absent, not a page broken.
  const [recent, setRecent] = useState<GovDealing[] | null>(null);
  const [recentFailed, setRecentFailed] = useState(false);

  useEffect(() => {
    let live = true;

    api
      .govDealings({ view: "all", limit: 60 })
      .then((r) => {
        if (!live) return;
        // One row per ticker, newest first, so the list reads as ten names
        // rather than one member's forty-line filing.
        const seen = new Set<string>();
        const out: GovDealing[] = [];

        for (const d of r.dealings) {
          if (!d.ticker || seen.has(d.ticker)) continue;
          seen.add(d.ticker);
          out.push(d);
          if (out.length >= RECENT) break;
        }
        setRecent(out);
      })
      .catch(() => live && setRecentFailed(true));

    return () => {
      live = false;
    };
  }, []);

  return (
    <DefaultLayout drawerRight>
      <SeoRail marketId="us" placement="congress_rail" />
      <SeoPageShell
        crumbs={[{ label: "Congress", to: "/congress" }, { label: "Stocks" }]}
        cta={{
          body: congressIndexCta.body,
          gaLabel: "Congress stocks index",
          headline: congressIndexCta.headline,
          marketId: "us",
        }}
        eyebrow="Congress by stock"
        standfirst={stocksIndexLead(ROSTER, ROSTER_CORPUS)}
        standfirstSize="lede"
        title="The stocks members of Congress buy"
      >
        <HowToRead lead={PURCHASES_ONLY_NOTE} notes={[]} />

        <StatTiles
          className="mt-7"
          cols={4}
          note={
            <>
              Counts as of {longDate(ROSTER_AS_OF)}, the latest filing in the
              record when this index was built. {CONGRESS_NOTICE}
            </>
          }
          stats={[
            {
              label: "Stocks with a page",
              value: published.length,
              primary: true,
            },
            { label: "Members", value: ROSTER_CORPUS.members },
            {
              label: "Purchases",
              value: ROSTER_CORPUS.rows.toLocaleString(LOCALE),
            },
            {
              label: "Tickers bought",
              value: ROSTER_CORPUS.tickers.toLocaleString(LOCALE),
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
                key={e.t}
                badge={<TickerPill ticker={e.t} />}
                facts={[
                  { label: "Purchases", value: e.r },
                  {
                    label: "Last filed",
                    value: e.last ? dateLabel(e.last, LOCALE) : "n/a",
                  },
                ]}
                figure={{
                  value: e.m,
                  unit: e.m === 1 ? "member" : "members",
                }}
                logo={<CompanyLogo size={56} ticker={e.t} />}
                name={e.c}
                position={i + 1}
                secondary={
                  e.l > 0
                    ? `${e.s ?? "Sector not held"} · ${e.l} of the ${e.m} sit on a committee that oversees it`
                    : (e.s ?? "Sector not held")
                }
                to={stockPath(e.t)}
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
              <p className={`mt-4 ${R.body}`}>Loading the latest filings.</p>
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
                      badge={d.ticker ? <TickerPill ticker={d.ticker} /> : null}
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
          aside={`${published.length} stocks bought by at least ${MIN_STOCK_MEMBERS} members and ${MIN_STOCK_ROWS} times. Alphabetical.`}
          index={3}
          title="Every stock with a page"
          total={3}
        >
          <ul
            className={`mt-4 grid grid-cols-1 gap-x-8 border-t ${R.body} sm:grid-cols-2 lg:grid-cols-3`}
          >
            {[...published]
              .sort((a, b) => a.c.localeCompare(b.c))
              .map((e) => (
                <StockCell
                  key={e.t}
                  company={e.c}
                  members={e.m}
                  ticker={e.t}
                  to={stockPath(e.t)}
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
          <p className={`mt-4 max-w-[62ch] ${R.label} leading-[1.6]`}>
            Another {listed.toLocaleString(LOCALE)} tickers have been bought by{" "}
            {ROSTER_MIN_MEMBERS} or more members but not by enough, or often
            enough, for a page to say anything. Their pages exist and are linked
            from the members who bought them; they stay out of search until they
            cross the bar.
          </p>
        </SeoSection>

        <SeoSection
          aside="The record these pages are built from."
          title="What this is"
          variant="rail"
        >
          <div className={`space-y-3 ${R.body}`}>
            <p>
              Members of Congress must report stock trades under the STOCK Act
              within 45 days, in a value band rather than an amount. We collect
              those reports from the House Clerk and the Senate, resolve each
              filer against the congressional roster, and keep the purchases.
              The member pages read that record one way; these read it the
              other, by the company bought.
            </p>
            <p>
              Each stock page answers four things: who bought, when, in what
              bands, and whether any buyer sits on a committee whose
              jurisdiction covers the sector. That last fact is stated as
              jurisdiction and nothing more. It is public record, and it is not
              evidence that any purchase was informed by it.{" "}
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

        <p className={`mt-8 max-w-[62ch] ${R.label} leading-[1.6]`}>
          {CONGRESS_SOURCE}
        </p>
      </SeoPageShell>
    </DefaultLayout>
  );
}
