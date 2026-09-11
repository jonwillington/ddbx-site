import type { BrokerOffer, CompanyPage as CompanyPageData } from "@/lib/api";
import type { Dealing, GovDealing, UsDealing } from "@/types/ddbx";
import type { StatTile } from "@/components/seo/stat-tiles";
import type { LatestBuyFact } from "@/components/company/latest-buy";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

import { filingPath } from "../../shared/filings.js";
import { usFilingPath } from "../../shared/filings-us.js";
import { buyAlpha, buyReturn } from "../../shared/leaderboard.js";
import { sectorPath } from "../../shared/sectors.js";
import {
  cadence,
  cadenceSentence,
  sectorStanding,
  standingSentence,
} from "../../shared/company-context.js";
import {
  buysOutcome,
  INDEX_LABEL,
  outcomeSentence,
  shortMoney,
} from "../../shared/company-verdict.js";

import {
  BoardRow,
  BoardRowHeader,
  BoardRowList,
} from "@/components/boards/board-row";
import {
  direction,
  signedPp,
  toBoardRows,
} from "@/components/boards/board-model";
import { PaidWorthNow } from "@/components/boards/paid-worth-now";
import { BrokerVisitLink } from "@/components/brokers/broker-ui";
import {
  BrokerInline,
  usePromotedBroker,
} from "@/components/brokers/broker-inline";
import { CompanyLogo } from "@/components/company-logo";
import { CompanyAppPitch } from "@/components/company/company-app-pitch";
import { LatestBuyCard } from "@/components/company/latest-buy";
import { MoreCompanies } from "@/components/company/more-companies";
import {
  CompanyPriceChart,
  useCompanyPriceBars,
} from "@/components/company/price-chart";
import { MarketFaq } from "@/components/market/market-faq";
import { DeltaBadge } from "@/components/market/market-row";
import { NewsSourceLogo } from "@/components/news-source-logo";
import { RatingBadge } from "@/components/rating-badge";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoSection } from "@/components/seo/section";
import { StatTiles } from "@/components/seo/stat-tiles";
import { Skeleton } from "@/components/skeleton";
import { StoreButtons } from "@/components/store-buttons";
import { BUTTON_RADIUS } from "@/components/button";
import DefaultLayout from "@/layouts/default";
import { api } from "@/lib/api";
import {
  loadDealingsWindow,
  peekDealingsWindow,
  rollingWindow,
} from "@/lib/dealings-window";
import { isAffiliateLink } from "@/lib/brokers";
import {
  cleanCompanyName,
  companyPath,
  displayTicker,
  slugToKey,
} from "@/lib/company";
import { localeFor, moneyShort, SYMBOL } from "@/lib/company-format";
import { marketForPath } from "@/lib/markets/registry";

/** Company page layout — the broker-review composition, applied to a company.
 *
 *  Same skeleton as /brokers/:slug so the two read as one section of the site:
 *  breadcrumb on the cream page, the document itself on a single sheet, a
 *  sticky conversion panel beside the sheet, and the fixed broker rail beyond
 *  that. What changes is the payload — a review argues, this one records.
 *
 *  ---------------------------------------------------------------------------
 *  Record page, board grammar (2026-09-11)
 *  ---------------------------------------------------------------------------
 *
 *  The boards and /how-it-works had moved on from this page's first draft —
 *  17px section labels in a 10rem rail, a 13.5px table, a standfirst that
 *  counted rather than concluded — and the question a searcher arrives with,
 *  "did the insiders' buying work?", went unanswered on a page whose every row
 *  carried the server's performance mark. So:
 *
 *  - The verdict is said up top, in the tiles and in the standfirst, from
 *    `shared/company-verdict.js` so the crawler pre-render says the same.
 *  - The latest purchase is stated in full as a card (the specimen card's
 *    grammar), which is what makes a one-filing page — most of them — a page.
 *  - The record is `BoardRow`s: the date leading where a board puts its rank,
 *    the person at 18/20px, paid → worth now in the money track, alpha under
 *    the role.
 *  - The argument (price, record, context) is numbered `SeoSection`s at display
 *    scale; the reference material (about, stats, news) keeps the rail.
 *
 *  The rows carry no sparkline. On a board each row is a different company and
 *  the line is news; here every row would be the same price line cropped at a
 *  different point, and the chart above already draws all of them on it.
 *
 *  The sticky panel waits for `xl`, not `lg`. At 1024–1279 the fixed rail and
 *  the panel between them left the sheet a 280px column, too narrow for a row
 *  with a money pair in it; the rail beside it carries the same broker there.
 */
const C = {
  sheet:
    "rounded-2xl border border-hairline bg-sheet shadow-[0_1px_2px_rgba(90,65,40,0.03)] dark:border-white/[0.07] dark:bg-surface",
  rule: "border-hairline dark:border-separator",
  note: "text-[12px] leading-[1.6] text-foreground/45",
  /** Prose in the argued sections: 16px, per the /how-it-works review. */
  prose: "text-[16px] leading-[1.65] text-foreground/75",
  /** Prose in the reference sections, a step down at the rail's measure. */
  reference: "text-[14.5px] leading-[1.65] text-foreground/70",
} as const;

function money(
  value: number | null | undefined,
  currency = "GBP",
  market = "UK",
): string {
  const n = Number(value);

  if (!isFinite(n) || n === 0) return "—";

  return `${SYMBOL[currency] ?? ""}${Math.round(n).toLocaleString(localeFor(market))}`;
}

function fmtDate(iso: string | null | undefined, market: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(localeFor(market), {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** When anything on this page last changed.
 *
 *  This line used to print `summary.last_trade_date`, which is not when the
 *  page was updated — it's when a director last bought. On a company nobody has
 *  filed against in six weeks that rendered as "Updated 16 Jun 2026" under a
 *  page carrying today's price, today's stats and this morning's headlines: an
 *  SEO landing surface telling every visitor, and every crawler, that it had
 *  been abandoned since June.
 *
 *  The three feeds all carry their own timestamp, so the honest answer is the
 *  freshest of them. ISO strings compare lexicographically whether they're a
 *  bare date or a full timestamp, so no parsing is needed to pick the max.
 *
 *  NOTE: the sitemap's <lastmod> for these URLs is computed separately, in
 *  functions/sitemap.xml.js, and still uses the last dealing date. That's a
 *  deliberate different question ("when did this page's *content* change in a
 *  way worth recrawling") and is left alone. */
function lastUpdated(data: CompanyPageData): string | null {
  return (
    [data.summary.last_trade_date, data.stats?.fetchedAt, data.news.fetched_at]
      .filter((d): d is string => !!d)
      .sort()
      .at(-1) ?? null
  );
}

function monthYear(iso: string | null | undefined, market: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(localeFor(market), {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const isUk = (deal: Dealing | UsDealing): deal is Dealing =>
  "value_gbp" in deal;

const personName = (deal: Dealing | UsDealing) =>
  isUk(deal) ? (deal.director?.name ?? "—") : (deal.reporter?.name ?? "—");

function personRole(deal: Dealing | UsDealing): string {
  if (isUk(deal)) return deal.director?.role ?? "";
  const r = deal.reporter;

  if (!r) return "";
  if (r.officer_title) return r.officer_title;

  return (r.roles ?? [])
    .map((x) => (x === "ten_percent_owner" ? "10% owner" : x))
    .join(", ");
}

const dealValue = (deal: Dealing | UsDealing) =>
  isUk(deal) ? deal.value_gbp : deal.value;

/** Profile route for the person on a row, or null when we hold no id for them.
 *
 *  UK rows carry the synthetic `d-…` director key; US rows carry the reporter's
 *  SEC CIK. /directors/:id resolves its market from the PATH rather than the
 *  host (see director.tsx), so a US link has to carry the /us prefix or it
 *  loads a UK profile lookup for a CIK. A row with neither id renders as plain
 *  text — a link to a profile that 404s is worse than no link. */
function directorHref(deal: Dealing | UsDealing): string | null {
  if (isUk(deal)) {
    const id = deal.director?.id;

    return id ? `/directors/${encodeURIComponent(id)}` : null;
  }

  const cik = deal.reporter?.cik;

  return cik ? `/us/directors/${encodeURIComponent(cik)}` : null;
}

/** The purchase's own page. Both markets have one now: `/dealings/:id` for
 *  the UK pipeline, `/us/dealings/:id` for Form 4 rows (App.tsx). */
function filingHref(deal: Dealing | UsDealing): string | null {
  if (!deal.id) return null;

  return isUk(deal) ? filingPath(deal.id) : usFilingPath(deal.id);
}

/** What the insider paid a share. UK in pence, as the filing pages print it
 *  ("260.6p"), promoted to pounds past £10; US in dollars. Null when the
 *  filing states no price, and the card drops the cell (rule 2). */
function pricePaid(deal: Dealing | UsDealing): string | null {
  if (isUk(deal)) {
    const p = Number(deal.price_pence);

    if (!(p > 0)) return null;
    if (p >= 1000) {
      return `£${(p / 100).toLocaleString("en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    return `${p.toLocaleString("en-GB", { maximumFractionDigits: 2 })}p`;
  }

  const p = Number(deal.price);

  return p > 0 ? `$${p.toFixed(2)}` : null;
}

function signedPct(ratio: number): string {
  return `${ratio > 0 ? "+" : ratio < 0 ? "−" : ""}${Math.abs(ratio * 100).toFixed(1)}%`;
}

function toneOf(ratio: number | null): "positive" | "negative" | undefined {
  const dir = direction(ratio);

  return dir === "pos" ? "positive" : dir === "neg" ? "negative" : undefined;
}

/** STOCK Act filings disclose a band, never an exact figure — show the band. */
function govAmount(g: GovDealing): string {
  if (g.amount_min == null && g.amount_max == null) return "—";
  if (g.amount_max == null) return `${moneyShort(g.amount_min, "USD")}+`;
  if (g.amount_min == null) return `up to ${moneyShort(g.amount_max, "USD")}`;

  return `${moneyShort(g.amount_min, "USD")}–${moneyShort(g.amount_max, "USD")}`;
}

/** What a tile says when there is nothing to say. Not an em-dash (rule 2), and
 *  set small because it is a sentence standing in for a number. */
function NotYet() {
  return (
    <span className="text-[13px] font-medium leading-[1.35] tracking-normal text-foreground/40">
      Not enough data yet
    </span>
  );
}

/** Company-level FAQ, rendered through the same component the market
 *  homepages use. Answers what a search visitor actually arrives with — what
 *  the data is, where it comes from, whether it's a signal — rather than
 *  repeating the generic market copy. */
function companyFaq(name: string, market: string) {
  const insider = market === "UK" ? "director" : "insider";
  const filing =
    market === "UK"
      ? "a PDMR notification to the LSE"
      : "a Form 4 filing with the SEC";

  return [
    {
      question: `Where does this ${name} data come from?`,
      answer: (
        <>
          Every row is a public regulatory disclosure, {filing}, collected
          within minutes of being published. We don&rsquo;t take company
          submissions and we don&rsquo;t edit the numbers; the only thing we add
          is the rating and the reasoning behind it.
        </>
      ),
    },
    {
      question: `Is a ${insider} buying shares a good signal?`,
      answer: (
        <>
          Sometimes. A {insider} buying with their own money is one of the few
          honest signals in the market, but plenty of purchases are routine,
          small top-ups, scheme allocations, or a well-paid executive rounding
          out a holding. That&rsquo;s what our six-point check is for: it
          separates the conviction buys from the housekeeping, and shows you
          which is which.
        </>
      ),
    },
    {
      question: "How often is this page updated?",
      answer: (
        <>
          The pipeline runs every 15 minutes through the trading day, so a new
          disclosure appears here shortly after it&rsquo;s filed. Company stats
          refresh daily.
        </>
      ),
    },
    {
      question: "Can I get alerted when someone buys?",
      answer: (
        <>
          Yes, that&rsquo;s what the app is for. Follow {name} and you&rsquo;ll
          get a push the moment a {insider} files, with the full analysis
          attached, plus alerts if the price moves after a buy you&rsquo;re
          following.
        </>
      ),
    },
    {
      question: "Is this financial advice?",
      answer: (
        <>
          No. ddbx rates the <em>conviction</em> behind insider buys and shows
          the reasoning. It&rsquo;s information, never a recommendation, and
          never a guarantee. What you do with it is your call.
        </>
      ),
    },
  ];
}

/** The twelve-month window the sector hubs and the boards read, used here to
 *  place this issuer among its sector peers.
 *
 *  A SECOND fetch on the company page, which needs justifying. It is the same
 *  edge-cached object every sector hub and board already pulls, so it costs one
 *  cached response shared across all 368 company pages rather than one per
 *  page. And it is what makes a single-filing page say something: the context
 *  section is the answer to the thin-content exposure both previous plans
 *  logged and neither resolved.
 *
 *  Failure is silent by design — `null` drops the section. A company page must
 *  not break because a context block could not load. */
function useSectorWindow(market: "UK" | "US") {
  // From memory when a board or sector page already loaded the window (see
  // src/lib/dealings-window.ts), so the context section draws with the page.
  const [rows, setRows] = useState<Array<Dealing | UsDealing> | null>(
    () => peekDealingsWindow(rollingWindow(market))?.dealings ?? null,
  );

  useEffect(() => {
    let live = true;

    loadDealingsWindow(rollingWindow(market))
      .then((r) => {
        if (live) setRows(r.dealings);
      })
      .catch(() => {
        if (live) setRows([]);
      });

    return () => {
      live = false;
    };
  }, [market]);

  return rows;
}

export default function CompanyPage() {
  const { key: slug } = useParams<{ key: string }>();
  // The domain decides the market: ddbx.uk serves UK issuers, ddbx.us US ones.
  // marketForPath falls back to UK on localhost, which is right for dev.
  const market = useMemo(() => {
    const id = marketForPath(
      "/",
      typeof window === "undefined" ? undefined : window.location.hostname,
    ).id;

    return id === "us" || id === "usg" || id === "djt" ? "US" : "UK";
  }, []);

  const [data, setData] = useState<CompanyPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const broker = usePromotedBroker(market);
  const marketId = market === "UK" ? "uk" : "us";
  // Fetched from the slug rather than from the loaded bundle: it starts in
  // parallel with the page fetch, and the section below can only decide whether
  // to render its heading once this has settled.
  const priceSeries = useCompanyPriceBars(
    slug ? slugToKey(slug, market) : null,
  );
  const sectorWindow = useSectorWindow(market);

  useEffect(() => {
    if (!slug) return;
    let live = true;

    setData(null);
    setError(null);
    api
      .companyPage(market, slugToKey(slug, market))
      .then((d) => live && setData(d))
      .catch((reason) => live && setError((reason as Error).message));

    return () => {
      live = false;
    };
  }, [slug, market]);

  if (error) {
    return (
      // Same furniture as the loaded page: `drawerRight` + the rail. Without
      // them the error state rendered 320px wider than every page around it, so
      // a mistyped ticker shunted the whole layout sideways — and it was a dead
      // end besides, which is why the onward rail is mounted below.
      <DefaultLayout drawerRight>
        <SeoRail
          marketId={marketId}
          placement="company_rail"
          ukHeading="Start investing"
        />

        <div className="w-full pb-24 lg:pb-14">
          <div className="mx-auto max-w-[720px] py-16 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              We don&rsquo;t have dealings for that company
            </h1>
            <p className={`mt-3 ${C.reference}`}>
              It may not have filed a disclosure we&rsquo;ve surfaced yet.
            </p>
            <Link
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-4"
              to="/companies"
            >
              Browse every company
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>

          <MoreCompanies
            currentKey={slug ? slugToKey(slug, market) : ""}
            market={market}
          />
        </div>
      </DefaultLayout>
    );
  }

  // The ticker is derivable from the URL, so the rail can carry its real
  // heading while the company itself is still in flight — no relabel on load.
  if (!data)
    return (
      <CompanySkeleton
        ticker={slug ? displayTicker(slugToKey(slug, market)) : undefined}
      />
    );

  const name = cleanCompanyName(data.company);
  const ticker = displayTicker(data.key);
  const { summary } = data;
  const currency = summary.currency ?? (market === "UK" ? "GBP" : "USD");
  const symbol = SYMBOL[currency] ?? "";
  const locale = localeFor(market);
  // Both null until the window lands, and both stay null when there is nothing
  // computable — the section is dropped rather than rendered empty.
  const standing = sectorStanding(data.deals, sectorWindow, market, data.key);
  const cadenceLine = cadenceSentence(cadence(summary), market);
  const outcome = buysOutcome(data.deals);
  const verdict = outcomeSentence(outcome, market, symbol);
  const noun = market === "UK" ? "director dealings" : "insider trading";
  const people =
    market === "UK"
      ? summary.people === 1
        ? "director"
        : "directors"
      : summary.people === 1
        ? "insider"
        : "insiders";

  // The verdict in four figures: how much, what it is worth, and against the
  // market. "Directors buying" and "Rated" were two of the four until
  // 2026-09-11; both are counts the standfirst states in words, and neither
  // answered the question the page is visited with.
  const worthLabel =
    outcome && outcome.measured < outcome.count
      ? `Worth now · ${outcome.measured} of ${outcome.count}`
      : "Worth now";
  const metrics: StatTile[] = [
    { label: "Disclosed buys", value: String(summary.deals) },
    {
      label: "Total paid",
      value: moneyShort(summary.total_value, summary.currency),
      primary: true,
    },
    {
      label: worthLabel,
      value: outcome ? shortMoney(outcome.worth, symbol) : <NotYet />,
      tone: outcome ? toneOf(outcome.worth / outcome.paid - 1) : undefined,
    },
    // One purchase states its alpha; several state how many beat the index,
    // which a reader takes in at a glance where an average would need a
    // footnote about weighting.
    outcome && outcome.compared === 1
      ? {
          label: "Vs the index",
          value: signedPp(outcome.alpha),
          tone: toneOf(outcome.alpha),
        }
      : {
          label: "Ahead of index",
          value:
            outcome && outcome.compared > 0 ? (
              `${outcome.ahead} of ${outcome.compared}`
            ) : (
              <NotYet />
            ),
        },
  ];

  // Whether this company clears the bar the index applies (see companies.tsx).
  // Below it, "Browse every company" points at a list this company isn't on.
  const onIndex = summary.deals >= 2 || summary.analysed > 0;

  // No broker to sell and no stats to state: the panel renders nothing, and
  // the grid drops to one column so the sheet uses the width rather than
  // sitting beside a 17rem gap.
  const hasPanel =
    !!broker || panelFacts(data.stats, market, ticker).length > 0;

  const latest =
    data.deals.length > 0
      ? data.deals.reduce((a, b) => (b.trade_date > a.trade_date ? b : a))
      : null;

  // The numbered run: the sections that make the argument, in order. Only
  // numbered when there are two or more — "01 / 01" counts nothing.
  const run = [
    !priceSeries.unavailable && "price",
    data.deals.length > 1 && "buys",
    (standing || cadenceLine) && "context",
  ].filter((s): s is string => !!s);
  const counter = (id: string) =>
    run.length > 1
      ? { index: run.indexOf(id) + 1, total: run.length }
      : { index: undefined, total: undefined };

  return (
    // drawerRight reserves lg:mr-80 for the fixed broker rail — the same
    // pairing /brokers/:slug uses.
    <DefaultLayout drawerRight>
      {/* Grey CTAs, and the full directory below the picks: this page's one
          filled button is "Buy {ticker} with …" in the sticky panel. Via
          SeoRail so ddbx.us gets the app rail — the broker directory is UK-only
          editorial, and it was selling UK platforms to US readers. */}
      <SeoRail
        marketId={marketId}
        placement="company_rail"
        ukHeading={`Invest in ${ticker}`}
      />

      <div className="w-full pb-24 lg:pb-14">
        {/* Breadcrumb sits on the cream page, outside the document sheet. */}
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <nav
            aria-label="Breadcrumb"
            className="min-w-0 truncate text-foreground/50"
          >
            <Link
              className="transition-colors hover:text-foreground"
              to="/companies"
            >
              Companies
            </Link>
            <span className="mx-2 text-foreground/25">/</span>
            <span className="text-foreground/75">{name}</span>
          </nav>
          <p className="shrink-0 text-xs text-foreground/45">
            Updated {fmtDate(lastUpdated(data), market)}
          </p>
        </div>

        <div
          className={`mt-6 grid items-start gap-10 ${
            hasPanel ? "xl:grid-cols-[minmax(0,1fr)_17rem]" : ""
          }`}
        >
          {/* The record: header + sections on one sheet. */}
          <div className={`min-w-0 px-5 py-6 sm:px-8 sm:py-8 ${C.sheet}`}>
            <header>
              <div className="flex items-start gap-4">
                <CompanyLogo className="mt-0.5" size={56} ticker={data.key} />
                <div className="min-w-0">
                  <h1 className="text-[30px] font-bold leading-[1.05] tracking-[-0.024em] text-foreground sm:text-[40px]">
                    {name}
                  </h1>
                  <p className="mt-2 max-w-xl text-[15px] leading-snug text-foreground/65 sm:text-[16px]">
                    <span className="font-mono">{ticker}</span> · {noun}
                  </p>
                </div>
              </div>

              <StatTiles className="mt-7" cols={4} stats={metrics} />
            </header>

            {/* The standfirst: the count, then the verdict, then the method.
                The verdict sentence is shared with the crawler pre-render. */}
            <p className="max-w-[44em] py-7 text-[17px] font-normal leading-[1.6] tracking-[-0.006em] text-foreground/85">
              {summary.people} {people} {summary.people === 1 ? "has" : "have"}{" "}
              bought {moneyShort(summary.total_value, summary.currency)} of{" "}
              {name} shares across {summary.deals}{" "}
              {summary.deals === 1 ? "disclosed dealing" : "disclosed dealings"}
              {summary.first_trade_date
                ? ` since ${monthYear(summary.first_trade_date, market)}`
                : ""}
              {/* On a single disclosure "most recently" would be restating
                  the only date the sentence has, so it just states it. */}
              {!summary.last_trade_date
                ? ""
                : summary.deals > 1
                  ? `, most recently on ${fmtDate(summary.last_trade_date, market)}`
                  : summary.first_trade_date
                    ? ""
                    : ` on ${fmtDate(summary.last_trade_date, market)}`}
              .{verdict ? ` ${verdict}` : ""}
              {summary.analysed > 0 && (
                <>
                  {" "}
                  {summary.analysed} of the {summary.deals}{" "}
                  {summary.analysed === 1 ? "has been" : "have been"} scored
                  against our six-point signal check.
                </>
              )}
            </p>

            {latest && (
              <LatestBuyCard
                eyebrow={
                  data.deals.length === 1 ? "The purchase" : "The latest buy"
                }
                facts={latestFacts(latest, market, currency)}
                filingHref={filingHref(latest)}
                name={personName(latest)}
                nameHref={directorHref(latest)}
                rating={latest.analysis?.rating ?? null}
                role={personRole(latest)}
                summary={latest.analysis?.summary ?? null}
              />
            )}

            {/* The price, with the buys on it — ABOVE the record. The record
                is the evidence; this is the claim, and a visitor who reads
                nothing else should still leave knowing where the insiders
                bought relative to where it trades now. Suppressed entirely for
                issuers with no cached series (recent listings, suspended
                lines). */}
            {!priceSeries.unavailable && (
              <SeoSection
                aside="Daily closes for the last 12 months. Each marker is a disclosed buy, plotted at the close on the day it was made."
                id="price"
                title="The share price"
                {...counter("price")}
              >
                <CompanyPriceChart
                  currency={currency}
                  deals={data.deals}
                  market={market}
                  series={priceSeries}
                  tickerKey={data.key}
                />
              </SeoSection>
            )}

            {/* The record, as rows. A single purchase has already been stated
                in full by the card, and a one-row list under it would state it
                twice. */}
            {data.deals.length > 1 && (
              <SeoSection
                aside={`Newest first. Paid is what the ${market === "UK" ? "director" : "insider"} spent; worth now is the same stake at the latest close, if still held. Alpha is the gap to ${INDEX_LABEL[market]} since disclosure.${summary.analysed > 0 ? " Ratings are ours, not the company’s." : ""}`}
                id="buys"
                title={
                  market === "UK" ? "Every director buy" : "Every insider buy"
                }
                {...counter("buys")}
              >
                <BuysList
                  deals={data.deals}
                  locale={locale}
                  market={market}
                  symbol={symbol}
                />
              </SeoSection>
            )}

            {/* Mobile twin of the rail — the rail is hidden below lg, and
                this is the high-intent moment: they've just read who bought
                and how much. */}
            <BrokerInline
              broker={broker}
              className="mt-10 lg:hidden"
              company={name}
            />

            {/* CONTEXT — the section that makes a one-filing page a page.
                Placed straight after the record, because it exists to make
                that record legible: a single purchase means little until you
                know it happened in a sector where forty other companies also
                saw buying, and which of them are nearest. Every field is
                nullable and the block is dropped wholesale when there is
                nothing computable, rather than printing a placeholder. */}
            {(standing || cadenceLine) && (
              <SeoSection
                aside="Measured over the last twelve months of disclosed buying, on the same window the sector pages use."
                id="context"
                title="In context"
                {...counter("context")}
              >
                {cadenceLine && (
                  <p className={`max-w-[42em] ${C.prose}`}>{cadenceLine}</p>
                )}
                {standing && (
                  <p
                    className={`max-w-[42em] ${C.prose} ${cadenceLine ? "mt-3" : ""}`}
                  >
                    {name} is classed as{" "}
                    <Link
                      className="underline underline-offset-4"
                      to={sectorPath(standing.sector.slug)}
                    >
                      {standing.sector.label.toLowerCase()}
                    </Link>
                    . {standingSentence(standing, market)}
                  </p>
                )}
                {standing && standing.peers.length > 0 && (
                  <>
                    <p className={`mt-6 ${C.note}`}>
                      {standing.rank == null
                        ? "The most active companies in the sector"
                        : "Companies with a comparable amount of disclosed buying"}
                    </p>
                    {/* Peers as logo discs, not a line of grey names: a logo
                        disc is the family's mark for a named company, and it
                        is always a link (rule 8). */}
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {standing.peers.map((peer) => (
                        <li key={peer.key}>
                          <Link
                            className="group inline-flex items-center gap-2 rounded-full border border-hairline bg-white/70 py-1 pl-1 pr-3 text-[14px] font-medium text-foreground transition-colors hover:border-foreground/25 dark:border-border/60 dark:bg-surface-secondary/40"
                            to={companyPath(peer.ticker)}
                          >
                            <CompanyLogo size={26} ticker={peer.ticker} />
                            {cleanCompanyName(peer.company) ||
                              displayTicker(peer.ticker)}
                            <ArrowRightIcon
                              aria-hidden
                              className="h-3 w-3 text-foreground/30 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground/60"
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {/* Onward into the boards this issuer's filings feed. Real
                    internal links rather than a nav block: the sitemap was
                    doing this work and internal links should be. */}
                <p className={`mt-6 ${C.note}`}>
                  See also{" "}
                  <Link
                    className="underline underline-offset-4"
                    to="/biggest-buys"
                  >
                    the biggest buys
                  </Link>
                  ,{" "}
                  <Link
                    className="underline underline-offset-4"
                    to="/cluster-buys"
                  >
                    cluster buying
                  </Link>{" "}
                  and{" "}
                  <Link
                    className="underline underline-offset-4"
                    to="/most-active-companies"
                  >
                    the most-active companies
                  </Link>
                  .
                </p>
              </SeoSection>
            )}

            {/* Reference material from here: the rail variant, outside the
                numbered run (rule 3). */}
            <div className="mt-12">
              {data.stats?.description && (
                <SeoSection id="about" title={`About ${name}`} variant="rail">
                  <p className={`max-w-[42em] ${C.reference}`}>
                    {data.stats.description}
                  </p>
                </SeoSection>
              )}

              {data.stats && <StatsSection stats={data.stats} />}

              {market === "US" && data.gov.length > 0 && (
                <SeoSection
                  aside={
                    <p className={C.note}>
                      Disclosed under the STOCK Act, members report a range, not
                      an exact figure.
                    </p>
                  }
                  id="congress"
                  title="Congress"
                  variant="rail"
                >
                  <CongressTable market={market} rows={data.gov} />
                  <Link
                    className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground underline underline-offset-4"
                    to="/congress"
                  >
                    See all congressional trading
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </Link>
                </SeoSection>
              )}

              {data.news.items.length > 0 && (
                <SeoSection
                  aside={
                    <p className={C.note}>
                      Headlines from the wider web, for context.
                    </p>
                  }
                  id="news"
                  title="Recent news"
                  variant="rail"
                >
                  {/* The publisher's mark sits on the byline, the same
                      treatment the market channel's news strip uses — six
                      headlines in two columns is a lot of undifferentiated
                      grey text, and the logo is what makes a source scannable
                      before the name is read. */}
                  <ul className="grid gap-x-10 sm:grid-cols-2">
                    {data.news.items.slice(0, 6).map((n, i) => (
                      <li key={i} className={`border-b ${C.rule} py-3.5`}>
                        <a
                          className="text-[14.5px] leading-snug text-foreground/80 underline-offset-4 hover:underline"
                          href={n.url}
                          rel="nofollow noopener noreferrer"
                          target="_blank"
                        >
                          {n.title}
                        </a>
                        {n.source && (
                          <span
                            className={`mt-1.5 flex items-center gap-1.5 ${C.note}`}
                          >
                            <NewsSourceLogo size={13} url={n.url} />
                            {n.source}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </SeoSection>
              )}
            </div>

            {/* There used to be a "Get the alerts" section here: the same
                promise, the same store buttons and the same "Free for 7 days"
                line that `CompanyAppPitch` carries about 200px further down.
                Two identical asks that close together read as a page that
                can't stop selling — and with the mobile floating bar and
                BrokerInline that made four. The pitch band is the one that
                survives; it's the better-designed of the two and it uses this
                company's own disclosures as the alert copy. */}
          </div>

          {/* Conversion panel, sat beside the sheet and sticky as you scroll —
              the company-page counterpart of the review's buy box. */}
          <CompanyPanel
            broker={broker}
            market={market}
            stats={data.stats}
            ticker={ticker}
          />
        </div>

        {/* Conversion, then onward links, then the FAQ — in that order.
            The pitch sat below the FAQ at first, which put five collapsed
            accordion rows between the end of the record and the only part of
            the page that sells the app: a reader has to climb an accordion to
            reach the sell, and most won't. The FAQ is reference material and
            reads fine as the last thing on the page. */}
        <CompanyAppPitch
          company={name}
          deals={data.deals}
          logoKey={data.key}
          market={market}
          ticker={ticker}
        />

        <MoreCompanies currentKey={data.key} market={market} />

        <MarketFaq items={companyFaq(name, market)} />

        <nav
          className={`mt-14 flex flex-wrap gap-x-7 gap-y-2 border-t ${C.rule} pt-6 text-[13.5px]`}
        >
          <Link
            className="text-foreground/70 underline-offset-4 hover:underline"
            to="/"
          >
            All {market} {noun}
          </Link>
          {/* The index only lists companies with repeat buying or a written
              analysis, so on a page below that bar "Browse every company" sent
              a reader to a list their own company is missing from. Same
              destination, honest label. */}
          <Link
            className="text-foreground/70 underline-offset-4 hover:underline"
            to="/companies"
          >
            {onIndex
              ? "Browse every company"
              : "Companies with repeat insider buying"}
          </Link>
          {market === "UK" && (
            <Link
              className="text-foreground/70 underline-offset-4 hover:underline"
              to="/brokers"
            >
              Compare UK trading platforms
            </Link>
          )}
        </nav>
      </div>
    </DefaultLayout>
  );
}

/** The latest purchase's facts, in the card's order: what, at what price,
 *  when, and how it has done. A cell with nothing true to say is dropped. */
function latestFacts(
  deal: Dealing | UsDealing,
  market: "UK" | "US",
  currency: string,
): LatestBuyFact[] {
  const price = pricePaid(deal);
  const ret = buyReturn(deal);
  const alpha = buyAlpha(deal);
  const index = market === "UK" ? "FTSE All-Share" : "S&P 500";

  return [
    { label: "Bought", value: money(dealValue(deal), currency, market) },
    ...(price ? [{ label: "Price paid", value: price }] : []),
    { label: "Trade date", value: fmtDate(deal.trade_date, market) },
    ...(ret != null
      ? [
          {
            label: "Since disclosure",
            value: signedPct(ret),
            tone: toneOf(ret),
            note:
              alpha != null ? `${signedPp(alpha)} vs the ${index}` : undefined,
          },
        ]
      : []),
  ];
}

/** Every purchase, as board rows.
 *
 *  The person is the subject — on a company page the company is the page — so
 *  there is no logo track. The list is newest first, not a ranking, so the
 *  date leads the row where a board puts its rank: it is what a reader runs
 *  down. The money pair takes the tail, and the alpha sits on the line under
 *  the role, beside the person it describes, so the row keeps enough width
 *  for the name inside the sheet. */
function BuysList({
  deals,
  locale,
  market,
  symbol,
}: {
  deals: Array<Dealing | UsDealing>;
  locale: string;
  market: "UK" | "US";
  symbol: string;
}) {
  const rows = useMemo(
    () =>
      toBoardRows(
        [...deals].sort((a, b) => b.trade_date.localeCompare(a.trade_date)),
      ),
    [deals],
  );

  return (
    <>
      <BoardRowHeader
        moneyPair
        className=""
        lead="date"
        leadLabel="Bought"
        logo={false}
        money="Paid → worth now"
        subject={market === "UK" ? "Director" : "Insider"}
      />
      <BoardRowList>
        {rows.map((r) => {
          const role = personRole(r.raw);
          const rating = r.raw.analysis?.rating;

          return (
            <BoardRow
              key={r.id}
              moneyPair
              badge={rating ? <RatingBadge rating={rating} /> : undefined}
              date={{ iso: r.tradeDate, locale }}
              money={<PaidWorthNow row={r} symbol={symbol} />}
              name={personName(r.raw)}
              secondary={
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {role ? (
                    <span className="max-w-[28ch] truncate" title={role}>
                      {role}
                    </span>
                  ) : null}
                  {r.alpha != null ? (
                    <span className="inline-flex items-center gap-1.5">
                      <DeltaBadge suffix="pp" value={r.alpha * 100} />
                      <span className="text-foreground/45">vs the index</span>
                    </span>
                  ) : null}
                </span>
              }
              to={filingHref(r.raw) ?? undefined}
            />
          );
        })}
      </BoardRowList>
    </>
  );
}

/** Loading state.
 *
 *  The real skeleton — the sheet, the logo, the tiles, the standfirst, the
 *  latest-buy card, the first numbered section and the side panel, all at
 *  their true sizes — so the load is a fill rather than a rebuild (rule 6).
 *  Every block is the house `Skeleton`, so the rail and the document pulse in
 *  step.
 */
function CompanySkeleton({ ticker }: { ticker?: string }) {
  const marketId =
    marketForPath(
      "/",
      typeof window === "undefined" ? undefined : window.location.hostname,
    ).id === "us"
      ? "us"
      : "uk";

  return (
    <DefaultLayout drawerRight>
      {/* The rail is mounted during the load too. `drawerRight` reserves its
          320px whether or not anything is in it, so leaving it out left a bare
          cream column beside a fully-drawn skeleton. It self-loads, so it
          fills independently of the company. */}
      <SeoRail
        marketId={marketId}
        placement="company_rail"
        ukHeading={ticker ? `Invest in ${ticker}` : "Invest in this company"}
      />

      <div aria-busy="true" className="w-full pb-24 lg:pb-14">
        <span className="sr-only">Loading company</span>

        {/* Breadcrumb row. */}
        <div className="flex items-baseline justify-between gap-4">
          <Skeleton className="h-[14px] w-48" />
          <Skeleton className="h-[12px] w-32" />
        </div>

        <div className="mt-6 grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_17rem]">
          <div className={`min-w-0 px-5 py-6 sm:px-8 sm:py-8 ${C.sheet}`}>
            {/* Header: logo + name + ticker line. */}
            <div className="flex items-start gap-4">
              <Skeleton circle className="mt-0.5 shrink-0" h={56} w={56} />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-[38px] w-2/3 max-w-[24rem]" />
                <Skeleton className="mt-3 h-[16px] w-40" />
              </div>
            </div>

            {/* The four tiles, at their real height. */}
            <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="w-full rounded-2xl" h={78} />
              ))}
            </div>

            {/* Standfirst: three lines at 17px now it carries the verdict. */}
            <div className="max-w-[44em] py-7">
              <Skeleton className="h-[17px] w-full" />
              <Skeleton className="mt-3 h-[17px] w-full" />
              <Skeleton className="mt-3 h-[17px] w-3/5" />
            </div>

            {/* The latest-buy card. */}
            <div className="rounded-2xl border border-hairline px-5 py-6 dark:border-border/60 sm:px-7 sm:py-7">
              <div className="flex items-center justify-between">
                <Skeleton className="h-[11px] w-28" />
                <Skeleton className="h-[22px] w-24 rounded-full" />
              </div>
              <div className={`mt-5 border-t ${C.rule} pt-5`}>
                <Skeleton className="h-[30px] w-56" />
                <Skeleton className="mt-2.5 h-[16px] w-40" />
              </div>
              <div
                className={`mt-6 grid grid-cols-2 gap-4 border-t ${C.rule} pt-6 sm:grid-cols-4`}
              >
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i}>
                    <Skeleton className="h-[10px] w-16" />
                    <Skeleton className="mt-2.5 h-[22px] w-20" />
                  </div>
                ))}
              </div>
              <div className={`mt-6 border-t ${C.rule} pt-6`}>
                <Skeleton className="h-[16px] w-full" />
                <Skeleton className="mt-2.5 h-[16px] w-4/5" />
              </div>
            </div>

            {/* The first numbered section: rule, counter, title, aside, chart. */}
            <div className={`mt-12 border-t ${C.rule} pt-5`}>
              <div className="flex justify-end">
                <Skeleton className="h-[11px] w-12" />
              </div>
              <Skeleton className="mt-2 h-[34px] w-64" />
              <Skeleton className="mt-3 h-[15px] w-4/5 max-w-[54ch]" />
              <Skeleton className="mt-6 w-full rounded-xl" h={260} />
            </div>

            {/* Below lg the loaded page puts BrokerInline after the record.
                Reserving its height stops the document jumping by a card the
                moment the fetch lands. */}
            <div aria-hidden className="mt-10 h-[104px] lg:hidden" />
          </div>

          {/* Side panel — reserving its width is the point: without it the
              content column loads wide and then snaps. */}
          <aside className="hidden xl:sticky xl:top-24 xl:block">
            <div className="rounded-2xl border border-brand-brown/20 bg-white p-4 dark:border-brand-tan/25 dark:bg-surface-secondary">
              <Skeleton className="w-full rounded-lg" h={44} />
              <Skeleton className="mx-auto mt-2.5 h-[11px] w-2/3" />
              <div className="mt-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between gap-4 border-b ${C.rule} py-2.5 last:border-b-0`}
                  >
                    <Skeleton className="h-[13px] w-20" />
                    <Skeleton className="h-[13px] w-12" />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </DefaultLayout>
  );
}

/** The facts the panel carries, in order.
 *
 *  Stats-derived only. Ticker rides along when there's at least one of them to
 *  ride with — on its own it's a row restating the line under the h1. When the
 *  list comes back empty the panel drops the whole `<dl>`: three rows of em
 *  dashes, sticky down the side of the page, was the page's most persistent
 *  admission that it had nothing.
 *
 *  Market cap and previous close live HERE and are dropped from
 *  `StatsSection`; P/E and the rest live there and are dropped from here. The
 *  two used to print all three of market cap, previous close and P/E within
 *  one screen of each other. */
function panelFacts(
  stats: CompanyPageData["stats"],
  market: string,
  ticker: string,
): Array<[string, string]> {
  const cur = stats?.currency ?? (market === "UK" ? "GBP" : "USD");
  const rows: Array<[string, string]> = [];

  if (stats?.marketCap)
    rows.push(["Market cap", moneyShort(stats.marketCap, cur)]);
  if (stats?.previousClose != null)
    rows.push(["Previous close", `${SYMBOL[cur] ?? ""}${stats.previousClose}`]);

  return rows.length > 0 ? [["Ticker", ticker], ...rows] : [];
}

/** Sticky conversion panel beside the sheet. Mirrors the review's buy box:
 *  the action first, the compliance line under it, then the facts the header
 *  tiles don't already carry, so the two never repeat each other.
 *
 *  Renders nothing when it would hold neither — see `hasPanel` at the call
 *  site, which widens the sheet to the full column in that case rather than
 *  leaving a 17rem hole beside it. From `xl` only: below that the fixed rail
 *  carries the same broker and the sheet needs the width. */
function CompanyPanel({
  broker,
  market,
  stats,
  ticker,
}: {
  broker: BrokerOffer | null;
  market: string;
  stats: CompanyPageData["stats"];
  ticker: string;
}) {
  const facts = panelFacts(stats, market, ticker);

  if (!broker && facts.length === 0) return null;

  return (
    <aside className="hidden xl:sticky xl:top-24 xl:block">
      <div className="rounded-2xl border border-brand-brown/20 bg-white p-4 shadow-[0_8px_24px_rgba(90,65,40,0.08)] dark:border-brand-tan/25 dark:bg-surface-secondary">
        {broker ? (
          <>
            <BrokerVisitLink
              broker={broker}
              className="w-full"
              placement="company_panel"
              size="lg"
            >
              Buy {ticker} with {broker.name}
            </BrokerVisitLink>
            <p className="mt-2 text-center text-[10px] leading-snug text-foreground/45">
              Capital at risk.
              {isAffiliateLink(broker) ? " We may earn a commission." : ""}
            </p>
          </>
        ) : (
          // No affiliate directory for this market (the whole of ddbx.us), so
          // the slot sells the app instead of printing the company name at it.
          // Same claim as the non-UK SeoRail card — completeness, deliberately
          // not the pitch band's "live" claim, which sits further down the same
          // page.
          <>
            <p className="text-[13px] font-semibold text-foreground">
              Every filing, the day it files
            </p>
            <p className="mt-2 text-[12px] leading-[1.6] text-foreground/55">
              The site shows a slice. The app is the whole record, every
              disclosure, every rating, searchable back to the start.
            </p>
            <StoreButtons
              buttonClassName={`inline-flex w-full items-center justify-center gap-2 ${BUTTON_RADIUS} bg-ink px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-ink/90 dark:bg-white dark:text-ink dark:hover:bg-white/90`}
              className="mt-3.5"
              gaEvent="cta_company_download"
              gaLabel="Company panel"
              marketId={market === "UK" ? "uk" : "us"}
            />
            <p className="mt-2.5 text-[11px] text-foreground/45">
              Free for 7 days, cancel any time.
            </p>
          </>
        )}

        {facts.length > 0 && (
          <dl className="mt-4 text-[13px]">
            {facts.map(([k, v]) => (
              <div
                key={k}
                className={`flex justify-between gap-4 border-b ${C.rule} py-2 last:border-b-0`}
              >
                <dt className="text-foreground/50">{k}</dt>
                <dd className="text-right font-semibold tabular-nums text-foreground/85">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </aside>
  );
}

function StatsSection({
  stats,
}: {
  stats: NonNullable<CompanyPageData["stats"]>;
}) {
  const cur = stats.currency ?? "GBP";
  // Market cap and previous close are deliberately absent: the sticky panel
  // beside this section already states both, and the two lists sat close enough
  // together to be read as one repeating itself. See `panelFacts`.
  const rows = (
    [
      ["P/E ratio", stats.peRatio != null ? stats.peRatio.toFixed(2) : null],
      ["P/B ratio", stats.pbRatio != null ? stats.pbRatio.toFixed(2) : null],
      ["PEG ratio", stats.pegRatio != null ? stats.pegRatio.toFixed(2) : null],
      [
        "Dividend yield",
        stats.dividendYield != null
          ? `${(stats.dividendYield * 100).toFixed(2)}%`
          : null,
      ],
      ["Beta", stats.beta != null ? stats.beta.toFixed(2) : null],
      // A zero open is a missing field, not a price the stock opened at: AEG
      // printed "Open 0" beside a live 0.08p price.
      ["Open", stats.open ? `${SYMBOL[cur] ?? ""}${stats.open}` : null],
    ] as Array<[string, string | null]>
  ).filter((r): r is [string, string] => r[1] !== null);

  if (rows.length === 0) return null;

  return (
    <SeoSection
      aside={<p className={C.note}>Refreshed daily.</p>}
      id="stats"
      title="Company stats"
      variant="rail"
    >
      <dl className="grid gap-x-10 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className={`flex items-baseline justify-between border-b ${C.rule} py-3`}
          >
            <dt className="text-[14px] text-foreground/55">{k}</dt>
            <dd className="text-[14px] font-semibold tabular-nums text-foreground">
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </SeoSection>
  );
}

function CongressTable({
  rows,
  market,
}: {
  rows: GovDealing[];
  market: string;
}) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <div>
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className={`border-b ${C.rule}`}>
              <th className={`py-2.5 pr-4 text-left font-normal ${C.note}`}>
                Date
              </th>
              <th className={`py-2.5 pr-4 text-left font-normal ${C.note}`}>
                Member
              </th>
              <th className={`py-2.5 pr-4 text-right font-normal ${C.note}`}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g, i) => (
              <tr
                key={g.id ?? i}
                className={`border-b last:border-b-0 ${C.rule}`}
              >
                <td className="whitespace-nowrap py-3 pr-4 text-foreground/60">
                  {fmtDate(g.trade_date, market)}
                </td>
                <td className="whitespace-nowrap py-3 pr-4 font-medium text-foreground">
                  {g.reporter?.name ?? "—"}
                  {g.reporter?.chamber && (
                    <span className={`mt-0.5 block ${C.note}`}>
                      {g.reporter.chamber}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap py-3 pr-4 text-right tabular-nums text-foreground/60">
                  {govAmount(g)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
