import type { BrokerOffer, CompanyPage as CompanyPageData } from "@/lib/api";
import type { Dealing, GovDealing, UsDealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

import { BrokerAside } from "@/components/brokers/broker-aside";
import { BrokerVisitLink } from "@/components/brokers/broker-ui";
import {
  BrokerInline,
  usePromotedBroker,
} from "@/components/brokers/broker-inline";
import { CompanyLogo } from "@/components/company-logo";
import { MarketFaq } from "@/components/market/market-faq";
import { RatingBadge } from "@/components/rating-badge";
import { StoreButtons } from "@/components/store-buttons";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import DefaultLayout from "@/layouts/default";
import { api } from "@/lib/api";
import { isAffiliateLink } from "@/lib/brokers";
import { cleanCompanyName, displayTicker, slugToKey } from "@/lib/company";
import { marketForPath } from "@/lib/markets/registry";

/**
 * Company page layout — the broker-review composition, applied to a company.
 *
 *  Same skeleton as /brokers/:slug so the two read as one section of the site:
 *  breadcrumb on the cream page, the document itself on a single sheet with a
 *  heading-left / content-right grid inside it, a sticky conversion panel
 *  beside the sheet, and the fixed broker rail beyond that. What changes is
 *  the payload — a review argues, this one records — so the sheet carries
 *  tables and stats where the review carries prose.
 */
const C = {
  sheet:
    "rounded-2xl border border-[#e8e0d5] bg-[#faf7f2] shadow-[0_1px_2px_rgba(90,65,40,0.03)] dark:border-white/[0.07] dark:bg-surface",
  rule: "border-[#e8e0d5] dark:border-separator",
  tile: "rounded-xl bg-black/[0.035] dark:bg-white/[0.05]",
  label: "text-[11px] leading-none text-foreground/50",
  note: "text-[12px] leading-[1.6] text-foreground/45",
  prose: "text-[14.5px] leading-[1.7] text-foreground/70",
} as const;

const SYMBOL: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };

function money(value: number | null | undefined, currency = "GBP"): string {
  const n = Number(value);

  if (!isFinite(n) || n === 0) return "—";

  return `${SYMBOL[currency] ?? ""}${Math.round(n).toLocaleString("en-GB")}`;
}

function moneyShort(
  value: number | null | undefined,
  currency = "GBP",
): string {
  const n = Number(value);

  if (!isFinite(n) || n === 0) return "—";
  const sym = SYMBOL[currency] ?? "";

  if (n >= 1_000_000) {
    const m = n / 1_000_000;

    return `${sym}${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}m`;
  }
  if (n >= 1_000) return `${sym}${Math.round(n / 1_000)}k`;

  return `${sym}${Math.round(n)}`;
}

function fmtDate(iso: string | null | undefined, market: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(market === "US" ? "en-US" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function monthYear(iso: string | null | undefined, market: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(market === "US" ? "en-US" : "en-GB", {
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
          Every row is a public regulatory disclosure — {filing} — collected
          within minutes of being published. We don&apos;t take company
          submissions and we don&apos;t edit the numbers; the only thing we add
          is the rating and the reasoning behind it.
        </>
      ),
    },
    {
      question: `Is a ${insider} buying shares a good signal?`,
      answer: (
        <>
          Sometimes. A {insider} buying with their own money is one of the few
          honest signals in the market, but plenty of purchases are routine —
          small top-ups, scheme allocations, or a well-paid executive rounding
          out a holding. That&apos;s what our six-point check is for: it
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
          disclosure appears here shortly after it&apos;s filed. Company stats
          refresh daily.
        </>
      ),
    },
    {
      question: "Can I get alerted when someone buys?",
      answer: (
        <>
          Yes — that&apos;s what the app is for. Follow {name} and you&apos;ll
          get a push the moment a {insider} files, with the full analysis
          attached, plus alerts if the price moves after a buy you&apos;re
          following.
        </>
      ),
    },
    {
      question: "Is this financial advice?",
      answer: (
        <>
          No. ddbx rates the <em>conviction</em> behind insider buys and shows
          the reasoning. It&apos;s information, never a recommendation, and
          never a guarantee. What you do with it is your call.
        </>
      ),
    },
  ];
}

/** Heading-left / content-right section — the review's one layout unit. */
function Section({
  id,
  label,
  aside,
  children,
}: {
  id?: string;
  label: string;
  /** Sub-line under the heading — provenance, caveats, refresh cadence. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`grid scroll-mt-24 gap-x-10 gap-y-4 border-t ${C.rule} py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:py-9`}
      id={id}
    >
      <div>
        <h2 className="text-[17px] font-semibold leading-[1.3] tracking-[-0.015em] text-foreground">
          {label}
        </h2>
        {aside && <p className={`mt-3 ${C.note}`}>{aside}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
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
      <DefaultLayout>
        <div className="mx-auto max-w-[720px] py-16 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            We don&apos;t have dealings for that company
          </h1>
          <p className={`mt-3 ${C.prose}`}>
            It may not have filed a disclosure we&apos;ve surfaced yet.
          </p>
          <Link
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-4"
            to="/companies"
          >
            Browse every company
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </DefaultLayout>
    );
  }

  if (!data) {
    return (
      <DefaultLayout>
        <div className="w-full animate-pulse py-10">
          <div className="h-9 w-1/2 rounded bg-foreground/10" />
          <div className="mt-3 h-4 w-3/4 rounded bg-foreground/[0.07]" />
          <div className="mt-10 h-20 w-full rounded-xl bg-foreground/[0.05]" />
          <div className="mt-6 h-72 w-full rounded-2xl bg-foreground/[0.05]" />
        </div>
      </DefaultLayout>
    );
  }

  const name = cleanCompanyName(data.company);
  const ticker = displayTicker(data.key);
  const { summary } = data;
  const noun = market === "UK" ? "director dealings" : "insider trading";
  const people =
    market === "UK"
      ? summary.people === 1
        ? "director"
        : "directors"
      : summary.people === 1
        ? "insider"
        : "insiders";

  const metrics: Array<[string, string]> = [
    ["Disclosed buys", String(summary.deals)],
    ["Total value", moneyShort(summary.total_value, summary.currency)],
    [
      market === "UK" ? "Directors buying" : "Insiders buying",
      String(summary.people),
    ],
    ["Most recent", fmtDate(summary.last_trade_date, market)],
    [
      "Rated",
      summary.analysed > 0 ? `${summary.analysed} of ${summary.deals}` : "—",
    ],
  ];

  return (
    // drawerRight reserves lg:mr-80 for the fixed broker rail — the same
    // pairing /brokers/:slug uses.
    <DefaultLayout drawerRight>
      <BrokerAside heading={`Invest in ${ticker}`} placement="company_rail" />

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
            Updated {fmtDate(summary.last_trade_date, market)}
          </p>
        </div>

        <div className="mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
          {/* The record: header + sections on one sheet. */}
          <div className={`min-w-0 px-5 py-6 sm:px-8 sm:py-8 ${C.sheet}`}>
            <header>
              <div className="flex items-start gap-4">
                <CompanyLogo className="mt-0.5" size={48} ticker={data.key} />
                <div className="min-w-0">
                  <h1 className="text-[28px] font-bold leading-[1.05] tracking-[-0.022em] text-foreground sm:text-[34px]">
                    {name}
                  </h1>
                  <p className="mt-1.5 max-w-xl text-[15px] leading-snug text-foreground/65 sm:text-[16px]">
                    <span className="font-mono tracking-tight">{ticker}</span> ·{" "}
                    {noun}
                  </p>
                </div>
              </div>

              <dl className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {metrics.map(([k, v]) => (
                  <div key={k} className={`${C.tile} px-3.5 py-3`}>
                    <dt className={C.label}>{k}</dt>
                    <dd className="mt-1.5 truncate text-[15.5px] font-semibold leading-none tracking-[-0.01em] text-foreground">
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </header>

            <article className="min-w-0">
              <p className="max-w-[44em] py-7 text-[16.5px] font-normal leading-[1.6] tracking-[-0.006em] text-foreground/85">
                {summary.people} {people}{" "}
                {summary.people === 1 ? "has" : "have"} bought{" "}
                {moneyShort(summary.total_value, summary.currency)} of {name}{" "}
                shares across {summary.deals}{" "}
                {summary.deals === 1
                  ? "disclosed dealing"
                  : "disclosed dealings"}
                {summary.first_trade_date
                  ? ` since ${monthYear(summary.first_trade_date, market)}`
                  : ""}
                .
                {summary.analysed > 0 && (
                  <>
                    {" "}
                    {summary.analysed} of those{" "}
                    {summary.analysed === 1 ? "has been" : "have been"} scored
                    against our six-point signal check.
                  </>
                )}
              </p>

              <Section
                aside={`Every ${market === "UK" ? "PDMR disclosure" : "SEC Form 4"} we've surfaced for this issuer. Ratings are ours, not the company's.`}
                id="buys"
                label={market === "UK" ? "Director buys" : "Insider buys"}
              >
                <DealsTable deals={data.deals} market={market} />
                <p className={`mt-3 ${C.note}`}>
                  The full thesis, supporting evidence and price history for
                  each buy live in the app.
                </p>
              </Section>

              {/* Mobile twin of the rail — the rail is hidden below lg, and
                  this is the high-intent moment: they've just read who bought
                  and how much. */}
              <BrokerInline
                broker={broker}
                className="my-8 lg:hidden"
                company={name}
              />

              {data.stats?.description && (
                <Section id="about" label={`About ${name}`}>
                  <p className={`max-w-[42em] ${C.prose}`}>
                    {data.stats.description}
                  </p>
                </Section>
              )}

              {data.stats && <StatsSection stats={data.stats} />}

              {market === "US" && data.gov.length > 0 && (
                <Section
                  aside="Disclosed under the STOCK Act — members report a range, not an exact figure."
                  id="congress"
                  label="Congress"
                >
                  <CongressTable market={market} rows={data.gov} />
                  <Link
                    className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground underline underline-offset-4"
                    to="/congress"
                  >
                    See all congressional trading
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </Link>
                </Section>
              )}

              {data.news.items.length > 0 && (
                <Section
                  aside="Headlines from the wider web, for context."
                  id="news"
                  label="Recent news"
                >
                  <ul className="grid gap-x-10 sm:grid-cols-2">
                    {data.news.items.slice(0, 6).map((n, i) => (
                      <li key={i} className={`border-b ${C.rule} py-3.5`}>
                        <a
                          className="text-[14px] leading-snug text-foreground/80 underline-offset-4 hover:underline"
                          href={n.url}
                          rel="nofollow noopener noreferrer"
                          target="_blank"
                        >
                          {n.title}
                        </a>
                        {n.source && (
                          <span className={`mt-1 block ${C.note}`}>
                            {n.source}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              <Section id="app" label="Get the alerts">
                <p className="max-w-[42em] text-[15.5px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
                  Follow {name} and get a push the moment{" "}
                  {market === "UK" ? "a director" : "an insider"} files.
                </p>
                <p className={`mt-2.5 max-w-[42em] ${C.prose}`}>
                  Every disclosure rated as it lands, with the full thesis,
                  supporting evidence and price history — plus alerts when the
                  price moves after a buy you&apos;re following.
                </p>
                <StoreButtons
                  buttonClassName={`inline-flex items-center gap-2 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-5 py-3 text-sm font-semibold`}
                  className="mt-4"
                  gaEvent="cta_company_download"
                  gaLabel="Company page"
                  marketId={market.toLowerCase()}
                />
                <p className={`mt-2 ${C.note}`}>
                  Free for 7 days, cancel any time.
                </p>
              </Section>
            </article>
          </div>

          {/* Conversion panel, sat beside the sheet and sticky as you scroll —
              the company-page counterpart of the review's buy box. */}
          <CompanyPanel
            broker={broker}
            company={name}
            market={market}
            stats={data.stats}
            ticker={ticker}
          />
        </div>

        {/* FAQ and onward links live on the cream page, below the document. */}
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
          <Link
            className="text-foreground/70 underline-offset-4 hover:underline"
            to="/companies"
          >
            Browse every company
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

/** Sticky conversion panel beside the sheet. Mirrors the review's buy box:
 *  the action first, the compliance line under it, then the facts the header
 *  tiles don't already carry, so the two never repeat each other. */
function CompanyPanel({
  broker,
  company,
  market,
  stats,
  ticker,
}: {
  broker: BrokerOffer | null;
  company: string;
  market: string;
  stats: CompanyPageData["stats"];
  ticker: string;
}) {
  const cur = stats?.currency ?? (market === "UK" ? "GBP" : "USD");
  const facts: Array<[string, string]> = [
    ["Ticker", ticker],
    ["Market cap", stats?.marketCap ? moneyShort(stats.marketCap, cur) : "—"],
    [
      "Previous close",
      stats?.previousClose != null
        ? `${SYMBOL[cur] ?? ""}${stats.previousClose}`
        : "—",
    ],
    ["P/E ratio", stats?.peRatio != null ? stats.peRatio.toFixed(2) : "—"],
  ];

  return (
    <aside className="hidden lg:block lg:sticky lg:top-24">
      <div className="rounded-2xl border border-[#5a4128]/20 bg-white p-4 shadow-[0_8px_24px_rgba(90,65,40,0.08)] dark:border-[#d8c4af]/25 dark:bg-surface-secondary">
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
          <p className="text-center text-[13px] font-semibold text-foreground">
            {company}
          </p>
        )}

        <dl className="mt-4 text-[13px]">
          {facts.map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between gap-4 border-b border-separator/70 py-2 last:border-b-0"
            >
              <dt className="text-foreground/50">{k}</dt>
              <dd className="text-right font-semibold text-foreground/85">
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}

/** The disclosure table. Lives on the sheet with plain rules rather than in a
 *  nested card — a box inside the document sheet reads as two surfaces. */
function DealsTable({
  deals,
  market,
}: {
  deals: Array<Dealing | UsDealing>;
  market: string;
}) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <table className="w-full text-[13.5px]">
        <thead>
          <tr className={`border-b ${C.rule}`}>
            <th className={`py-2.5 pr-4 text-left font-normal ${C.note}`}>
              Date
            </th>
            <th className={`py-2.5 pr-4 text-left font-normal ${C.note}`}>
              {market === "UK" ? "Director" : "Insider"}
            </th>
            <th className={`py-2.5 pr-4 text-right font-normal ${C.note}`}>
              Shares
            </th>
            <th className={`py-2.5 pr-4 text-right font-normal ${C.note}`}>
              Value
            </th>
            <th className={`py-2.5 text-right font-normal ${C.note}`}>
              Rating
            </th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal, i) => (
            <tr
              key={deal.id ?? i}
              className={`border-b last:border-b-0 ${C.rule}`}
            >
              <td className="whitespace-nowrap py-3 pr-4 text-foreground/60">
                {fmtDate(deal.trade_date, market)}
              </td>
              {/* Names and long role titles stay on one line — the table
                  scrolls on narrow screens, which reads far better than a row
                  wrapping to six. */}
              <td className="py-3 pr-4">
                <span className="block whitespace-nowrap font-medium text-foreground">
                  {personName(deal)}
                </span>
                {personRole(deal) && (
                  // Truncated, not wrapped: some titles run to sixty
                  // characters ("Chief Executive Director Renewables & Energy
                  // Transition Platform") and wrapping them pushed the rating
                  // column off the sheet. Full text on hover.
                  <span
                    className={`mt-0.5 block max-w-[24ch] truncate ${C.note}`}
                    title={personRole(deal)}
                  >
                    {personRole(deal)}
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap py-3 pr-4 text-right tabular-nums text-foreground/60">
                {Number(deal.shares).toLocaleString("en-GB")}
              </td>
              <td className="whitespace-nowrap py-3 pr-4 text-right tabular-nums font-medium text-foreground">
                {money(dealValue(deal), market === "UK" ? "GBP" : "USD")}
              </td>
              <td className="py-3 text-right">
                {deal.analysis?.rating ? (
                  <RatingBadge rating={deal.analysis.rating} />
                ) : (
                  <span className={C.note}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatsSection({
  stats,
}: {
  stats: NonNullable<CompanyPageData["stats"]>;
}) {
  const cur = stats.currency ?? "GBP";
  const rows = (
    [
      ["Market cap", stats.marketCap ? moneyShort(stats.marketCap, cur) : null],
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
      [
        "Previous close",
        stats.previousClose != null
          ? `${SYMBOL[cur] ?? ""}${stats.previousClose}`
          : null,
      ],
      ["Open", stats.open != null ? `${SYMBOL[cur] ?? ""}${stats.open}` : null],
    ] as Array<[string, string | null]>
  ).filter((r): r is [string, string] => r[1] !== null);

  if (rows.length === 0) return null;

  return (
    <Section aside="Refreshed daily." id="stats" label="Company stats">
      <dl className="grid gap-x-10 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className={`flex items-baseline justify-between border-b ${C.rule} py-3`}
          >
            <dt className="text-[13.5px] text-foreground/55">{k}</dt>
            <dd className="text-[13.5px] font-semibold tabular-nums text-foreground">
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
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
