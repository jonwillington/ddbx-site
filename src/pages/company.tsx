import type { CompanyPage as CompanyPageData } from "@/lib/api";
import type { Dealing, GovDealing, UsDealing } from "@/types/ddbx";
import type { StageFigure } from "@/components/boards/stage-figures";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

import { filingPath } from "../../shared/filings.js";
import { usFilingPath } from "../../shared/filings-us.js";
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
import { usePromotedBroker } from "@/components/brokers/broker-inline";
import { CompanyLogo } from "@/components/company-logo";
import { CompanyAppPitch } from "@/components/company/company-app-pitch";
import { CompanyBrokerRow } from "@/components/company/company-broker-row";
import {
  CompanyStage,
  CompanyStageSkeleton,
} from "@/components/company/company-stage";
import { MoreCompanies } from "@/components/company/more-companies";
import { useCompanyPriceBars } from "@/components/company/price-chart";
import { MarketFaq } from "@/components/market/market-faq";
import { DeltaBadge } from "@/components/market/market-row";
import { NewsSourceLogo } from "@/components/news-source-logo";
import { RatingBadge } from "@/components/rating-badge";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { TickerPill } from "@/components/ticker-pill";
import DefaultLayout from "@/layouts/default";
import { api } from "@/lib/api";
import {
  loadDealingsWindow,
  peekDealingsWindow,
  rollingWindow,
} from "@/lib/dealings-window";
import {
  cleanCompanyName,
  companyPath,
  displayTicker,
  slugToKey,
} from "@/lib/company";
import { localeFor, moneyShort, SYMBOL } from "@/lib/company-format";
import { marketForPath } from "@/lib/markets/registry";

/** /company/:key — one issuer's disclosed insider buying.
 *
 *  ---------------------------------------------------------------------------
 *  Stage grammar (2026-09-19)
 *  ---------------------------------------------------------------------------
 *
 *  Moved onto the grammar /insider-index, /reports and the stories share. The
 *  page had been the broker-review composition — the whole record on one white
 *  sheet, a sticky "Buy with …" card beside it, the company's name as the h1
 *  over four cream tiles, a "latest buy" card, and the chart one section down.
 *  Now, in order:
 *
 *  1. The stage. The verdict is the h1 ("Three directors have put £92k into
 *     Domino's since May 2026. It's worth £97k now."), composed from the
 *     summary and `shared/company-verdict.js`, with the four figures under it
 *     and the twelve-month price line, buys ringed on it, inside the panel.
 *  2. The dated basis line: when the page last changed and what "paid",
 *     "worth now" and alpha mean.
 *  3. The broker ask, as a quiet hairline row (UK only; affiliate revenue).
 *  4. Numbered sections, every one of them: the purchases as `BoardRow`s,
 *     the sector context with its peers as rows, about, stats, Congress (US),
 *     news as rows.
 *  5. The app pitch, onward companies, the FAQ.
 *
 *  The "latest buy" card went: it restated the first row of the list under
 *  it. A single-purchase page — most of them — now lists its one row, under
 *  "The purchase", and the stage states everything the card did.
 *
 *  The buy rows carry no sparkline. On a board each row is a different company
 *  and the line is news; here every row would be the same price line cropped
 *  at a different point, and the stage already draws all of them on it.
 */
const C = {
  rule: "border-hairline dark:border-separator",
  note: "text-[12px] leading-[1.6] text-foreground/45",
  prose: "text-[16px] leading-[1.65] text-foreground/75",
} as const;

const LINK =
  "underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground/70";

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

/** The purchase's own page. Both markets have one now: `/dealings/:id` for
 *  the UK pipeline, `/us/dealings/:id` for Form 4 rows (App.tsx). */
function filingHref(deal: Dealing | UsDealing): string | null {
  if (!deal.id) return null;

  return isUk(deal) ? filingPath(deal.id) : usFilingPath(deal.id);
}

/** STOCK Act filings disclose a band, never an exact figure — show the band. */
function govAmount(g: GovDealing): string {
  if (g.amount_min == null && g.amount_max == null) return "—";
  if (g.amount_max == null) return `${moneyShort(g.amount_min, "USD")}+`;
  if (g.amount_min == null) return `up to ${moneyShort(g.amount_max, "USD")}`;

  return `${moneyShort(g.amount_min, "USD")}–${moneyShort(g.amount_max, "USD")}`;
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

const NUMBER_WORDS = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];

/** A count as a sentence opens with it: words to nine, figures after. */
function countWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

const capitalise = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

type Outcome = ReturnType<typeof buysOutcome>;

/** The h1: what the insiders did, then what it is worth, from the summary.
 *
 *  Three different true sentences rather than one sentence with holes in it —
 *  a single purchase is "put … on <date>", several are "have put … since
 *  <month>", and no price since means the second sentence is not said. */
function headline(
  data: CompanyPageData,
  name: string,
  market: "UK" | "US",
  symbol: string,
  outcome: Outcome,
): string {
  const { summary } = data;
  const person = market === "UK" ? "director" : "insider";

  if (summary.deals === 0) {
    return `No ${person} has disclosed a purchase of ${name} shares yet.`;
  }

  const paid =
    summary.total_value > 0 ? shortMoney(summary.total_value, symbol) : null;
  const into = paid ? `put ${paid} into ${name}` : `bought ${name} shares`;
  let first: string;

  if (summary.deals === 1) {
    const when = summary.last_trade_date ?? summary.first_trade_date;

    first = `${market === "UK" ? "A director" : "An insider"} ${into}${
      when ? ` on ${fmtDate(when, market)}` : ""
    }.`;
  } else {
    const people = summary.people;
    const who =
      people >= 1
        ? `${capitalise(countWord(people))} ${person}${people === 1 ? "" : "s"}`
        : capitalise(`${person}s`);
    const since = summary.first_trade_date
      ? ` since ${monthYear(summary.first_trade_date, market)}`
      : "";

    first = `${who} ${people === 1 ? "has" : "have"} ${into}${since}.`;
  }

  if (!outcome) return first;

  const worth = shortMoney(outcome.worth, symbol);

  if (outcome.measured === outcome.count) {
    return `${first} It’s worth ${worth} now.`;
  }

  return `${first} The ${countWord(outcome.measured)} with a price since ${
    outcome.measured === 1 ? "is" : "are"
  } worth ${worth} now.`;
}

/** The deck under the h1: the count and recency, against the index, and how
 *  many we rated. Each clause only when the page holds its number. */
function deck(
  data: CompanyPageData,
  market: "UK" | "US",
  outcome: Outcome,
): string {
  const { summary } = data;
  const index = INDEX_LABEL[market];
  const parts: string[] = [];

  if (summary.deals > 1 && summary.last_trade_date) {
    parts.push(
      `${summary.deals} disclosed buys, the latest on ${fmtDate(summary.last_trade_date, market)}.`,
    );
  }

  if (!outcome) {
    if (summary.deals > 0) {
      parts.push(
        "Not enough price data yet to say what the shares are worth now.",
      );
    }
  } else if (outcome.compared === 1 && outcome.alpha != null) {
    const pp = Math.abs(outcome.alpha * 100).toFixed(1);
    const dir = direction(outcome.alpha);

    parts.push(
      dir === "flat"
        ? `That is level with ${index} since disclosure.`
        : `That is ${pp} points ${dir === "pos" ? "ahead of" : "behind"} ${index} since disclosure.`,
    );
  } else if (outcome.compared > 1) {
    const { ahead, compared } = outcome;

    parts.push(
      ahead === compared
        ? `All ${compared} are ahead of ${index} since disclosure.`
        : ahead === 0
          ? `None of the ${compared} is ahead of ${index} since disclosure.`
          : `${ahead} of the ${compared} ${ahead === 1 ? "is" : "are"} ahead of ${index} since disclosure.`,
    );
  }

  if (summary.analysed > 0) {
    parts.push(
      summary.deals === 1
        ? "We rated it against our six-point signal check."
        : `${summary.analysed} of the ${summary.deals} ${
            summary.analysed === 1 ? "has" : "have"
          } been rated against our six-point signal check.`,
    );
  }

  return parts.join(" ");
}

const stageTone = (ratio: number | null): StageFigure["tone"] => {
  const dir = direction(ratio);

  return dir === "flat" ? undefined : dir;
};

/** The verdict in four figures: how many, how much, what it is worth, and
 *  against the market. A slot with nothing true in it is left out —
 *  `StageFigures` refuses a placeholder, and the deck says "not enough data
 *  yet" in words. */
function stageFigures(
  data: CompanyPageData,
  symbol: string,
  outcome: Outcome,
): StageFigure[] {
  const { summary } = data;
  const out: StageFigure[] = [];

  if (summary.deals > 0) {
    out.push({ k: "Disclosed buys", v: String(summary.deals) });
  }
  if (summary.total_value > 0) {
    out.push({ k: "Total paid", v: shortMoney(summary.total_value, symbol) });
  }
  if (outcome) {
    out.push({
      k:
        outcome.measured < outcome.count
          ? `Worth now · ${outcome.measured} of ${outcome.count}`
          : "Worth now",
      v: shortMoney(outcome.worth, symbol),
      tone: stageTone(outcome.worth / outcome.paid - 1),
    });
    // One purchase states its alpha; several state how many beat the index,
    // which a reader takes in at a glance where an average would need a
    // footnote about weighting.
    if (outcome.compared === 1 && outcome.alpha != null) {
      out.push({
        k: "Vs the index",
        v: signedPp(outcome.alpha),
        tone: stageTone(outcome.alpha),
      });
    } else if (outcome.compared > 1) {
      out.push({
        k: "Ahead of index",
        v: `${outcome.ahead} of ${outcome.compared}`,
      });
    }
  }

  return out;
}

function currentMarket(): "UK" | "US" {
  // The domain decides the market: ddbx.uk serves UK issuers, ddbx.us US ones.
  // marketForPath falls back to UK on localhost, which is right for dev.
  const id = marketForPath(
    "/",
    typeof window === "undefined" ? undefined : window.location.hostname,
  ).id;

  return id === "us" || id === "usg" || id === "djt" ? "US" : "UK";
}

export default function CompanyPage() {
  const { key: slug } = useParams<{ key: string }>();
  const market = useMemo(currentMarket, []);

  const [data, setData] = useState<CompanyPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const broker = usePromotedBroker(market);
  const marketId = market === "UK" ? "uk" : "us";
  // Fetched from the slug rather than from the loaded bundle: it starts in
  // parallel with the page fetch, so the stage's chart can draw with it.
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

  // The ticker is derivable from the URL, so the rail and the crumb can carry
  // it while the company itself is still in flight — no relabel on load.
  const slugTicker = slug ? displayTicker(slugToKey(slug, market)) : "";

  if (error) {
    return (
      // Same furniture as the loaded page: `drawerRight` + the rail. Without
      // them a mistyped ticker shunted the whole layout sideways — and it was
      // a dead end besides, which is why the onward rail is mounted below.
      <DefaultLayout drawerRight shellRail={false}>
        <SeoRail
          marketId={marketId}
          placement="company_rail"
          ukHeading="Start investing"
        />
        <SeoPageShell
          crumbs={[
            { label: "Companies", to: "/companies" },
            { label: slugTicker || "Not found" },
          ]}
          cta={false}
          eyebrow="Company"
          standfirst="It may not have filed a disclosure we’ve surfaced yet."
          title="We don’t have dealings for that company"
          width="wide"
        >
          <Link
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-4"
            to="/companies"
          >
            Browse every company
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
          <MoreCompanies
            currentKey={slug ? slugToKey(slug, market) : ""}
            market={market}
          />
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  const name = data ? cleanCompanyName(data.company) : "";
  const ticker = data ? displayTicker(data.key) : slugTicker;

  return (
    // drawerRight reserves lg:mr-80 for the fixed broker rail.
    <DefaultLayout drawerRight shellRail={false}>
      {/* Via SeoRail so ddbx.us gets the app rail — the broker directory is
          UK-only editorial. */}
      <SeoRail
        marketId={marketId}
        placement="company_rail"
        ukHeading={ticker ? `Invest in ${ticker}` : "Invest in this company"}
      />

      <SeoPageShell
        crumbs={[
          { label: "Companies", to: "/companies" },
          { label: name || ticker || "Company" },
        ]}
        cta={false}
        eyebrow="Company"
        hero={
          data ? (
            <LoadedHero
              data={data}
              market={market}
              name={name}
              priceSeries={priceSeries}
            />
          ) : (
            <CompanyStageSkeleton />
          )
        }
        loading={!data}
        skeleton={
          <div className="mt-8">
            <SeoSkeleton rows={4} variant="ranked-board" />
          </div>
        }
        title={name}
        titleInHero={true}
        width="wide"
      >
        {data ? (
          <CompanyBody
            broker={broker}
            data={data}
            market={market}
            name={name}
            sectorWindow={sectorWindow}
          />
        ) : null}
      </SeoPageShell>
    </DefaultLayout>
  );
}

/** The stage and the dated basis line under it. */
function LoadedHero({
  data,
  market,
  name,
  priceSeries,
}: {
  data: CompanyPageData;
  market: "UK" | "US";
  name: string;
  priceSeries: ReturnType<typeof useCompanyPriceBars>;
}) {
  const { summary } = data;
  const ticker = displayTicker(data.key);
  const currency = summary.currency ?? (market === "UK" ? "GBP" : "USD");
  const symbol = SYMBOL[currency] ?? "";
  const outcome = buysOutcome(data.deals);
  const person = market === "UK" ? "director" : "insider";
  const updated = lastUpdated(data);

  return (
    <>
      <CompanyStage
        caption={
          priceSeries.unavailable
            ? `No price history on file for ${ticker} yet, so there is no chart to draw the buys on.`
            : `Daily closes over the last 12 months. Each ring is a disclosed ${person} buy at that day’s close; a heavier ring is one we rated.`
        }
        captionRight={`${ticker} · ${market === "UK" ? "LSE" : "US"}`}
        currency={currency}
        deals={data.deals}
        deck={deck(data, market, outcome) || undefined}
        eyebrow={`Company · ${ticker} · ${market === "UK" ? "LSE" : "US-listed"}`}
        figures={stageFigures(data, symbol, outcome)}
        headline={headline(data, name, market, symbol, outcome)}
        logoKey={data.key}
        market={market}
        series={priceSeries}
      />
      <p className="mt-4 max-w-[80ch] text-[12.5px] leading-[1.6] text-foreground/45">
        {updated ? `Updated ${fmtDate(updated, market)}. ` : ""}
        Paid is what the {person}
        {summary.people === 1 ? "" : "s"} disclosed; worth now is the same
        shares at the latest close, if still held. Index comparisons are against{" "}
        {INDEX_LABEL[market]} from the day each buy was disclosed. Ratings are
        ours, not the company’s. Not investment advice.
      </p>
    </>
  );
}

function CompanyBody({
  data,
  market,
  name,
  broker,
  sectorWindow,
}: {
  data: CompanyPageData;
  market: "UK" | "US";
  name: string;
  broker: ReturnType<typeof usePromotedBroker>;
  sectorWindow: Array<Dealing | UsDealing> | null;
}) {
  const ticker = displayTicker(data.key);
  const { summary } = data;
  const currency = summary.currency ?? (market === "UK" ? "GBP" : "USD");
  const symbol = SYMBOL[currency] ?? "";
  const locale = localeFor(market);
  const noun = market === "UK" ? "director dealings" : "insider trading";
  // Both null until the window lands, and both stay null when there is nothing
  // computable — the section is dropped rather than rendered empty.
  const standing = sectorStanding(data.deals, sectorWindow, market, data.key);
  const cadenceLine = cadenceSentence(cadence(summary), market);
  const stats = statRows(data.stats, market, ticker);
  const news = data.news.items.slice(0, 6);

  // Whether this company clears the bar the index applies (see companies.tsx).
  // Below it, "Browse every company" points at a list this company isn't on.
  const onIndex = summary.deals >= 2 || summary.analysed > 0;

  // Every section is numbered, in the order they render.
  const run = [
    data.deals.length > 0 && "buys",
    (standing || cadenceLine) && "context",
    data.stats?.description && "about",
    stats.length > 0 && "stats",
    market === "US" && data.gov.length > 0 && "congress",
    news.length > 0 && "news",
  ].filter((s): s is string => !!s);
  const counter = (id: string) =>
    run.length > 1
      ? { index: run.indexOf(id) + 1, total: run.length }
      : { index: undefined, total: undefined };

  return (
    <>
      <CompanyBrokerRow
        broker={broker}
        className="mt-8"
        company={name}
        ticker={ticker}
      />

      {data.deals.length > 0 && (
        <SeoSection
          aside={
            data.deals.length === 1
              ? "The filing, with its rating and the reasoning behind it one click away."
              : "Newest first. Each row opens the filing, with its rating and the reasoning behind it."
          }
          id="buys"
          title={
            data.deals.length === 1
              ? "The purchase"
              : market === "UK"
                ? "Every director buy"
                : "Every insider buy"
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

      {/* The section that makes a one-filing page a page: a single purchase
          means little until you know it happened in a sector where forty
          other companies also saw buying, and which of them are nearest. */}
      {(standing || cadenceLine) && (
        <SeoSection
          aside="Measured over the last twelve months of disclosed buying, on the same window the sector pages use."
          id="context"
          title="In context"
          {...counter("context")}
        >
          {cadenceLine && (
            <p className={`max-w-[46em] ${C.prose}`}>{cadenceLine}</p>
          )}
          {standing && (
            <p
              className={`max-w-[46em] ${C.prose} ${cadenceLine ? "mt-3" : ""}`}
            >
              {name} is classed as{" "}
              <Link className={LINK} to={sectorPath(standing.sector.slug)}>
                {standing.sector.label.toLowerCase()}
              </Link>
              . {standingSentence(standing, market)}
            </p>
          )}
          {standing && standing.peers.length > 0 && (
            <PeerRows
              heading={
                standing.rank == null
                  ? "The most active companies in the sector"
                  : "Companies with a comparable amount of disclosed buying"
              }
              market={market}
              peers={standing.peers}
              symbol={symbol}
            />
          )}
          <p className={`mt-6 ${C.note}`}>
            See also{" "}
            <Link className={LINK} to="/biggest-buys">
              the biggest buys
            </Link>
            ,{" "}
            <Link className={LINK} to="/cluster-buys">
              cluster buying
            </Link>{" "}
            and{" "}
            <Link className={LINK} to="/most-active-companies">
              the most-active companies
            </Link>
            .
          </p>
        </SeoSection>
      )}

      {data.stats?.description && (
        <SeoSection
          aside="The company’s own description, as its data provider carries it."
          id="about"
          title={`About ${name}`}
          {...counter("about")}
        >
          <p className={`max-w-[62ch] ${C.prose}`}>{data.stats.description}</p>
        </SeoSection>
      )}

      {stats.length > 0 && (
        <SeoSection
          aside="Market data, refreshed daily."
          id="stats"
          title="Company stats"
          {...counter("stats")}
        >
          <dl className="grid gap-x-10 border-t border-hairline dark:border-separator sm:grid-cols-2">
            {stats.map(([k, v]) => (
              <div
                key={k}
                className={`flex items-baseline justify-between border-b ${C.rule} py-3.5`}
              >
                <dt className="text-[15px] text-foreground/55">{k}</dt>
                <dd className="text-[15px] font-semibold tabular-nums text-foreground">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </SeoSection>
      )}

      {market === "US" && data.gov.length > 0 && (
        <SeoSection
          aside="Disclosed under the STOCK Act. Members report a range, not an exact figure."
          id="congress"
          title="Congress"
          {...counter("congress")}
        >
          <CongressTable market={market} rows={data.gov} />
          <Link
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground underline underline-offset-4"
            to="/congress"
          >
            See all congressional trading
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </SeoSection>
      )}

      {news.length > 0 && (
        <SeoSection
          aside="Headlines from the wider web, for context. They open on the publisher’s site."
          id="news"
          title="Recent news"
          {...counter("news")}
        >
          <NewsRows items={news} market={market} />
        </SeoSection>
      )}

      {/* Conversion, then onward links, then the FAQ — in that order. The FAQ
          is reference material and reads fine as the last thing on the page;
          the pitch below it would sit behind five accordion rows. */}
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
            a reader to a list their own company is missing from. */}
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
    </>
  );
}

/** Every purchase, as board rows.
 *
 *  The person is the subject — on a company page the company is the page — so
 *  there is no logo track. The list is newest first, not a ranking, so the
 *  date leads the row where a board puts its rank: it is what a reader runs
 *  down. The money pair takes the tail, and the alpha sits on the line under
 *  the role, beside the person it describes. */
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

type Peer = NonNullable<ReturnType<typeof sectorStanding>>["peers"][number];

/** The sector neighbours, as board rows: the logo disc is the family's mark for
 *  a named company and the whole row opens its page. */
function PeerRows({
  peers,
  heading,
  market,
  symbol,
}: {
  peers: Peer[];
  heading: string;
  market: "UK" | "US";
  symbol: string;
}) {
  return (
    <div className="mt-8">
      <p className="text-[13px] font-medium text-foreground/60">{heading}</p>
      <BoardRowHeader
        className="mt-3"
        facts={["Buys", "Disclosed"]}
        lead="none"
        subject="Company"
      />
      <BoardRowList>
        {peers.map((peer) => {
          const t = displayTicker(peer.ticker);

          return (
            <BoardRow
              key={peer.key}
              badge={<TickerPill ticker={t} />}
              facts={[
                { label: "Buys", value: peer.filings },
                {
                  label: "Disclosed",
                  // Under 500 the short form rounds to a figure we do not hold.
                  value:
                    peer.value >= 500
                      ? shortMoney(peer.value, symbol)
                      : "not stated",
                },
              ]}
              logo={
                <CompanyLogo market={market} size={56} ticker={peer.ticker} />
              }
              name={cleanCompanyName(peer.company) || t}
              to={companyPath(peer.ticker)}
            />
          );
        })}
      </BoardRowList>
    </div>
  );
}

function newsDate(iso: string | null, market: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return null;

  return new Intl.DateTimeFormat(localeFor(market), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}

/** Headlines as full-width hairline rows: the headline carries the row, the
 *  publisher's mark and name sit under it, the date at the tail. */
function NewsRows({
  items,
  market,
}: {
  items: CompanyPageData["news"]["items"];
  market: string;
}) {
  return (
    <ul className={`border-t ${C.rule}`}>
      {items.map((n, i) => {
        const when = newsDate(n.published_at, market);

        return (
          <li key={`${n.url}-${i}`} className={`border-b ${C.rule}`}>
            <a
              className="group grid gap-x-8 gap-y-1.5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline"
              href={n.url}
              rel="nofollow noopener noreferrer"
              target="_blank"
            >
              <span className="text-[17px] font-medium leading-[1.35] tracking-[-0.01em] text-foreground/90 underline-offset-4 group-hover:underline">
                {n.title}
              </span>
              <span className="flex items-center gap-1.5 text-[12.5px] text-foreground/45 sm:justify-end">
                {n.source ? (
                  <>
                    <NewsSourceLogo size={14} url={n.url} />
                    {n.source}
                  </>
                ) : null}
                {n.source && when ? <span aria-hidden>·</span> : null}
                {when ? <span className="tabular-nums">{when}</span> : null}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** Market data, in one list. Market cap and previous close used to live in a
 *  sticky panel beside the sheet and the rest here; with the panel gone they
 *  are one list again. A zero open is a missing field, not a price the stock
 *  opened at: AEG printed "Open 0" beside a live 0.08p price. */
function statRows(
  stats: CompanyPageData["stats"],
  market: string,
  ticker: string,
): Array<[string, string]> {
  if (!stats) return [];
  const cur = stats.currency ?? (market === "UK" ? "GBP" : "USD");
  const sym = SYMBOL[cur] ?? "";
  const rows = (
    [
      ["Market cap", stats.marketCap ? moneyShort(stats.marketCap, cur) : null],
      [
        "Previous close",
        stats.previousClose != null ? `${sym}${stats.previousClose}` : null,
      ],
      ["Open", stats.open ? `${sym}${stats.open}` : null],
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
    ] as Array<[string, string | null]>
  ).filter((r): r is [string, string] => r[1] !== null);

  // The ticker rides along only with something to ride with.
  return rows.length > 0 ? [["Ticker", ticker], ...rows] : [];
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
