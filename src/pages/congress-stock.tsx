/** One stock, as Congress has bought it — /congress/stocks/nvda.
 *
 *  The Congress family read one way: a member, then what they bought. This
 *  page reverses it for the reader who searched the company first. Same
 *  filings, grouped by issuer, with the one thing the incumbents do not
 *  publish: whether any of the buyers sit on a committee whose jurisdiction
 *  covers the sector.
 *
 *  The order is fixed and the verdict comes first:
 *
 *    identity -> lead -> THE VERDICT -> how to read this -> figures ->
 *    roll call -> members -> lane -> bands -> purchases -> what this is
 *
 *  Every sentence that qualifies something comes from shared/congress-stocks.js,
 *  so the crawler's pre-render and the hydrated page cannot say different
 *  things about the same named people.
 *
 *  Three states, not two: an unknown or empty ticker is "we hold no purchases
 *  of this", an outage is "we could not load them", and only the first is
 *  allowed to render as an empty page. Below the publishing bar the page
 *  still renders (with the members and the rows, which are facts) but withholds
 *  the verdict and the charts, and the pre-render marks it noindex.
 *
 *  Two fetches, both required. The rows say what happened; the ticker's
 *  /api/gov-stocks entry decides the bar (the one the hub and the sitemap
 *  apply) and carries each buyer's committee lane as the rating engine
 *  computed it. Neither is recomputed here, so an outage of either is the
 *  failed state rather than a page that guesses.
 */
import type { CompanyIndexEntry } from "@/lib/api";
import type { StocksRead } from "../../shared/congress-stocks";
import type { GovDealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  bandCompact,
  committeePath,
  committeeSlug,
  CONGRESS_NOTICE,
  CONGRESS_SOURCE,
} from "../../shared/congress.js";
import {
  belowBarSentence,
  cleanIssuer,
  clusterNote,
  laneSentence,
  MIN_STOCK_MEMBERS,
  MIN_STOCK_ROWS,
  optionsNote,
  PURCHASES_ONLY_NOTE,
  readStocks,
  relatedTickers,
  STOCK_FETCH_LIMIT,
  STOCK_ROWS,
  STOCKS_INDEX_PATH,
  stockEntry,
  stockLeadSentence,
  stockMeetsBar,
  stockPath,
  stockRollup,
  stockVerdict,
  tickerFromSlug,
  truncatedNote,
} from "../../shared/congress-stocks.js";
import { sectorByLabel, sectorPath } from "../../shared/sectors.js";

import { BackLink } from "@/components/back-link";
import { CompanyLogo } from "@/components/company-logo";
import { HowToRead, R } from "@/components/congress/congress-ui";
import {
  BandLadder,
  PANEL,
  PurchasesTable,
  RollCall,
  StockLanePanel,
  StockMemberList,
  StockTitle,
} from "@/components/congress/stock-ui";
import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { Skeleton } from "@/components/skeleton";
import { RelatedCards } from "@/components/seo/related-cards";
import { StatTiles } from "@/components/seo/stat-tiles";
import { congressStockCta } from "@/components/seo/cta-copy";
import { api } from "@/lib/api";
import { companyPath } from "@/lib/company";

export default function CongressStockPage() {
  const { ticker: slug } = useParams<{ ticker: string }>();
  const ticker = useMemo(() => tickerFromSlug(slug ?? ""), [slug]);

  const [rows, setRows] = useState<GovDealing[] | null>(null);
  const [roster, setRoster] = useState<StocksRead | null>(null);
  const [usCompanies, setUsCompanies] = useState<CompanyIndexEntry[] | null>(
    null,
  );
  const [status, setStatus] = useState<"loading" | "ok" | "missing" | "failed">(
    "loading",
  );

  useEffect(() => {
    if (!ticker) {
      setStatus("missing");

      return;
    }
    let live = true;

    setStatus("loading");
    setRows(null);
    setRoster(null);
    api
      .govDealings({ view: "all", ticker, limit: STOCK_FETCH_LIMIT })
      .then((r) => live && setRows(r.dealings))
      .catch(() => live && setStatus("failed"));
    api
      .govStocks()
      .then((body) => live && setRoster(readStocks(body)))
      .catch(() => live && setRoster({ state: "failed" }));
    // The Form 4 company index decides whether a company page exists to
    // link to. Most Congress tickers are not in it (NVDA is not), and a link
    // to a page that noindexes itself is a dead link.
    api
      .companies("US")
      .then((c) => live && setUsCompanies(c))
      .catch(() => {});

    return () => {
      live = false;
    };
  }, [ticker]);

  // Settle the status once both have answered. An empty set of rows is an
  // answer (missing); a roster that failed is not, and neither is guessed.
  useEffect(() => {
    if (status !== "loading" || rows === null || roster === null) return;
    if (roster.state === "failed") setStatus("failed");
    else setStatus(rows.length === 0 ? "missing" : "ok");
  }, [status, rows, roster]);

  const stocks =
    roster && roster.state !== "failed" ? roster.roster.stocks : [];
  const entry = ticker ? stockEntry(stocks, ticker) : null;

  const s = useMemo(
    () =>
      ticker && rows?.length && status === "ok"
        ? stockRollup(ticker, rows, entry)
        : null,
    [ticker, rows, entry, status],
  );

  const related = useMemo(
    () => (ticker ? relatedTickers(stocks, ticker, 4) : []),
    [ticker, stocks],
  );

  const hasCompanyPage =
    !!ticker && !!usCompanies?.some((c) => c.key === ticker);

  if (status === "missing" || status === "failed") {
    return (
      <DefaultLayout drawerRight>
        <SeoRail marketId="us" placement="congress_rail" />
        <SeoPageShell
          back={<BackLink />}
          crumbs={[
            { label: "Congress", to: "/congress" },
            { label: "Stocks", to: STOCKS_INDEX_PATH },
            { label: status === "missing" ? "Not found" : "Unavailable" },
          ]}
          eyebrow="Congress by stock"
          standfirst={
            status === "missing"
              ? `We publish a page for every ticker with a congressional purchase on record. ${ticker ? `${ticker} isn’t one of them` : "That isn’t a ticker"}: either no member has disclosed buying it in the period we hold, or the address is wrong.`
              : "We couldn’t load the purchases for this ticker just now. That’s a fault at our end rather than an empty record."
          }
          title={
            status === "missing"
              ? `We hold no congressional purchases of ${ticker ?? "that"}`
              : "Couldn’t load this stock"
          }
        >
          <SeoSection aside="Where the record is." title="Browse instead">
            <RelatedCards
              cols={2}
              items={[
                {
                  to: STOCKS_INDEX_PATH,
                  title: "Every stock with a page",
                  description:
                    "The names members of Congress have bought most widely, and who bought them.",
                },
                {
                  to: "/congress/members",
                  title: "By member",
                  description:
                    "Every member with a disclosed purchase on record.",
                },
              ]}
            />
          </SeoSection>
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  const publishable = stockMeetsBar(entry);
  const notes = s ? [optionsNote(s), clusterNote(s), truncatedNote(s)] : [];
  const sectorEntry = s?.sector ? sectorByLabel(s.sector) : null;
  const all = rows ?? [];
  const shown = all.slice(0, STOCK_ROWS);

  return (
    <DefaultLayout drawerRight>
      <SeoRail marketId="us" placement="congress_rail" />
      <SeoPageShell
        back={<BackLink />}
        crumbs={[
          { label: "Congress", to: "/congress" },
          { label: "Stocks", to: STOCKS_INDEX_PATH },
          { label: ticker ?? "Stock" },
        ]}
        cta={
          s && publishable
            ? {
                body: congressStockCta(s.company).body,
                gaLabel: `Congress stock · ${s.ticker}`,
                headline: congressStockCta(s.company).headline,
                marketId: "us",
              }
            : false
        }
        eyebrow="Congress by stock"
        loading={status === "loading"}
        skeleton={
          <>
            <div className="mt-6 flex items-center gap-5">
              <Skeleton circle className="h-16 w-16" />
              <Skeleton className="h-[30px] w-2/3 max-w-[18ch]" />
            </div>
            <Skeleton className="mt-5 h-[14px] w-full max-w-[60ch]" />
            <Skeleton className="mt-2 h-[14px] w-3/4 max-w-[48ch]" />
            <SeoSkeleton rows={4} variant="stat-tiles" />
            <SeoSkeleton rows={8} variant="ruled-list" />
          </>
        }
        standfirst={s ? stockLeadSentence(s) : undefined}
        standfirstSize="lede"
        title={
          s ? <StockTitle company={s.company} ticker={s.ticker} /> : "Stock"
        }
      >
        {s ? (
          <>
            {publishable ? (
              // The verdict, before anything it summarises. A reader who
              // came for one answer gets it in the first panel.
              <aside className={`mt-6 ${PANEL} p-5 sm:p-6`}>
                <p className={R.eyebrow}>The verdict</p>
                <p className="mt-3 max-w-[68ch] text-lede text-foreground/85">
                  {stockVerdict(s)}
                </p>
              </aside>
            ) : (
              <aside className={`mt-6 ${PANEL} p-5 sm:p-6`}>
                <p className={R.eyebrow}>Not enough data yet</p>
                <p className="mt-3 max-w-[68ch] text-lede text-foreground/85">
                  {belowBarSentence(s)}
                </p>
              </aside>
            )}

            <HowToRead lead={PURCHASES_ONLY_NOTE} notes={notes} />

            <StatTiles
              className="mt-7"
              cols={4}
              note={CONGRESS_NOTICE}
              stats={[
                { label: "Members", value: s.members.length, primary: true },
                { label: "Purchases", value: s.rows },
                {
                  label: "Disclosed band",
                  value: bandCompact(s.total_min, s.total_max),
                },
                {
                  label: "Median lag",
                  value:
                    s.lag.median == null
                      ? "Not enough data"
                      : `${Math.round(s.lag.median)} ${Math.round(s.lag.median) === 1 ? "day" : "days"}`,
                },
              ]}
            />

            {publishable ? (
              <>
                <SeoSection
                  aside="One row per member, one mark per purchase, on the day it was filed."
                  index={1}
                  title="Who bought, and when"
                  total={5}
                >
                  <RollCall
                    first={s.first_disclosed}
                    members={s.members}
                    rows={all}
                  />
                </SeoSection>

                <SeoSection
                  aside={`${s.members.length} members, ranked by how many purchases each has filed.`}
                  index={2}
                  title="The members"
                  total={5}
                >
                  <StockMemberList members={s.members} />
                </SeoSection>

                <SeoSection
                  aside={
                    sectorEntry ? (
                      <>
                        We hold {s.company} as{" "}
                        <Link
                          className="underline underline-offset-4"
                          to={sectorPath(sectorEntry.slug)}
                        >
                          {s.sector}
                        </Link>
                        .
                      </>
                    ) : (
                      "Whether any buyer sits on a committee whose jurisdiction covers the company."
                    )
                  }
                  index={3}
                  title="Committee jurisdiction"
                  total={5}
                >
                  <StockLanePanel
                    committeeHref={(c) => committeePath(committeeSlug(c))}
                    committees={s.lane.committees}
                    laneLine={laneSentence(s)}
                    out={s.lane.out}
                    pending={s.lane.pending}
                    unmodelled={s.lane.unmodelled}
                  />
                </SeoSection>

                <SeoSection
                  aside="How many purchases were disclosed in each band. Filings state a band, never an amount."
                  index={4}
                  title="Disclosed bands"
                  total={5}
                >
                  <BandLadder tiers={s.bands} />
                </SeoSection>

                <SeoSection
                  aside={
                    all.length > STOCK_ROWS
                      ? `Most recent ${STOCK_ROWS} of ${all.length}. Every figure above covers all ${all.length}.`
                      : "Every purchase on record, newest first."
                  }
                  index={5}
                  title="Purchases on record"
                  total={5}
                >
                  <PurchasesTable rows={shown} />
                  <p className={`mt-3 max-w-measure ${R.label}`}>
                    “Since filing” runs from the close on the day each filing
                    was published, the first price a reader could have paid, to
                    the latest close we hold, and the line beneath each figure
                    gives that span. Every row is measured over its own holding
                    period, so the figures do not compare with each other and do
                    not add up to a track record. “Lag” is the days from the
                    trade to its filing; the STOCK Act allows 45. Past
                    performance is not a reliable indicator of future results.
                  </p>
                </SeoSection>
              </>
            ) : (
              <>
                <SeoSection
                  aside={`${s.members.length} ${s.members.length === 1 ? "member" : "members"} on record.`}
                  title="The members"
                >
                  <StockMemberList members={s.members} />
                </SeoSection>
                <SeoSection
                  aside="Every purchase on record, newest first."
                  title="Purchases on record"
                >
                  <PurchasesTable rows={shown} />
                </SeoSection>
              </>
            )}

            <SeoSection
              aside="The record these pages are built from, and what it can and cannot tell you."
              title="What this is"
              variant="rail"
            >
              <div className={`space-y-3 ${R.body}`}>
                <p>
                  Members of Congress must report stock trades under the STOCK
                  Act within 45 days, on a Periodic Transaction Report that
                  states a value band rather than an amount. We collect those
                  reports from the House Clerk and the Senate, resolve each
                  filer against the congressional roster, and keep the
                  purchases. This page is every purchase of {s.company} we hold,
                  grouped by who filed it.
                </p>
                <p>
                  A stock gets a full page once at least {MIN_STOCK_MEMBERS}{" "}
                  members and {MIN_STOCK_ROWS} purchases are on record. Below
                  that the page lists what exists and says no more, because a
                  verdict on three filings is a guess wearing a paragraph.
                </p>
                <p>
                  “Lane” is committee jurisdiction: we map the industries eleven
                  House committees oversee, by the company’s SEC industry code
                  where we hold one, and check each buyer against them. It is
                  the same check our ratings use, so this page and a member’s
                  page give the same answer. Sitting on such a committee is a
                  matter of public record and is stated as one. It is not
                  evidence that a purchase was informed by it, and nothing here
                  says otherwise.{" "}
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
                  ...related.map((e) => ({
                    to: stockPath(e.ticker),
                    title: cleanIssuer(e.company),
                    description: `${e.members} members, ${e.purchases} purchases. Bought by ${e.shared} of the same members.`,
                    media: <CompanyLogo size={28} ticker={e.ticker} />,
                  })),
                  ...(hasCompanyPage && ticker
                    ? [
                        {
                          to: companyPath(ticker),
                          title: `${s.company} insider filings`,
                          description:
                            "The company’s own officers and directors on SEC Form 4, rated.",
                        },
                      ]
                    : []),
                  {
                    to: STOCKS_INDEX_PATH,
                    title: "Every stock with a page",
                    description:
                      "The names members of Congress have bought most widely.",
                  },
                  {
                    to: "/congress/members",
                    title: "By member",
                    description:
                      "Every member with a disclosed purchase on record, most recently active first.",
                  },
                ]}
              />
            </SeoSection>

            <p className={`mt-8 max-w-measure ${R.label}`}>
              {CONGRESS_SOURCE}{" "}
              <Link className="underline underline-offset-4" to="/how-it-works">
                How we put this together
              </Link>
              .
            </p>
          </>
        ) : null}
      </SeoPageShell>
    </DefaultLayout>
  );
}
