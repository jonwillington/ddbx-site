import type { CompanyPage as CompanyPageData } from "@/lib/api";
import type { Dealing, GovDealing, UsDealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

import { BrokerAside } from "@/components/brokers/broker-aside";
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
import { cleanCompanyName, displayTicker, slugToKey } from "@/lib/company";
import { marketForPath } from "@/lib/markets/registry";

/**
 * Company page layout.
 *
 *  Related to the broker reviews — same palette, same hairlines, same quiet
 *  sentence case — but not the same page. A review is an argument, so it runs
 *  as a narrow document with its headings railed off to the left. This is a
 *  record: the data is the point, so it runs the full width of the site with
 *  section labels sitting ON their rules and content using every pixel
 *  beneath them. Numbers get room; prose keeps a measure.
 */
const C = {
  /** Section label, sitting on its own rule. */
  eyebrow:
    "text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/45",
  rule: "border-[#e8e0d5] dark:border-separator",
  /** The one raised surface — tables and the app CTA, nothing else. */
  panel:
    "rounded-2xl border border-[#e8e0d5] bg-[#faf7f2] dark:border-white/[0.07] dark:bg-surface",
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

/** Full-width section: a label sitting on its own rule, content beneath. */
function Section({
  id,
  label,
  aside,
  children,
}: {
  id?: string;
  label: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 scroll-mt-24" id={id}>
      <div
        className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b ${C.rule} pb-2.5`}
      >
        <h2 className={C.eyebrow}>{label}</h2>
        {aside && <p className={C.note}>{aside}</p>}
      </div>
      <div className="pt-5">{children}</div>
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
    // drawerRight reserves lg:mr-80 for the fixed broker rail, the same
    // pairing the broker reviews use.
    <DefaultLayout drawerRight>
      <div className="w-full pb-4">
        {/* Masthead — identity left, the one-sentence summary right. */}
        <header className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-12">
          <div className="flex items-start gap-4">
            <CompanyLogo className="mt-1" size={54} ticker={data.key} />
            <div className="min-w-0">
              <h1 className="text-[28px] font-semibold leading-[1.1] tracking-tight text-foreground md:text-[38px]">
                {name}
              </h1>
              <p className="mt-1.5 text-[15px] text-foreground/45">
                <span className="font-mono tracking-tight">{ticker}</span> ·{" "}
                {noun}
              </p>
            </div>
          </div>
          <p className={`max-w-[54ch] md:pt-2 ${C.prose}`}>
            {summary.people} {people} {summary.people === 1 ? "has" : "have"}{" "}
            bought {moneyShort(summary.total_value, summary.currency)} of {name}{" "}
            shares across {summary.deals}{" "}
            {summary.deals === 1 ? "disclosed dealing" : "disclosed dealings"}
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
        </header>

        {/* Metric strip — divided rather than boxed, so it reads as one object. */}
        <dl
          className={`mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border ${C.rule} bg-[#e8e0d5] dark:bg-separator sm:grid-cols-3 lg:grid-cols-5`}
        >
          {metrics.map(([k, v]) => (
            <div key={k} className="bg-[#f7f3ec] px-4 py-3.5 dark:bg-surface">
              <dt className={`${C.eyebrow} text-[10px]`}>{k}</dt>
              <dd className="mt-1.5 text-[20px] font-semibold leading-none tracking-tight text-foreground">
                {v}
              </dd>
            </div>
          ))}
        </dl>

        <Section
          aside={`Every ${market === "UK" ? "PDMR disclosure" : "SEC Form 4"} we've surfaced. Ratings are ours, not the company's.`}
          id="buys"
          label={market === "UK" ? "Director buys" : "Insider buys"}
        >
          <div className={`${C.panel} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-[13.5px]">
                <thead>
                  <tr className={`border-b ${C.rule}`}>
                    <th className={`px-5 py-3 text-left font-normal ${C.note}`}>
                      Date
                    </th>
                    <th className={`px-5 py-3 text-left font-normal ${C.note}`}>
                      {market === "UK" ? "Director" : "Insider"}
                    </th>
                    <th
                      className={`px-5 py-3 text-right font-normal ${C.note}`}
                    >
                      Shares
                    </th>
                    <th
                      className={`px-5 py-3 text-right font-normal ${C.note}`}
                    >
                      Value
                    </th>
                    <th
                      className={`px-5 py-3 text-right font-normal ${C.note}`}
                    >
                      Rating
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.deals.map((deal, i) => (
                    <tr
                      key={deal.id ?? i}
                      className={`border-b last:border-b-0 ${C.rule}`}
                    >
                      <td className="whitespace-nowrap px-5 py-3.5 text-foreground/60">
                        {fmtDate(deal.trade_date, market)}
                      </td>
                      {/* Names and long role titles stay on one line — the
                          table scrolls horizontally on narrow screens, which
                          reads far better than a row wrapping to six lines. */}
                      <td className="px-5 py-3.5">
                        <span className="block whitespace-nowrap font-medium text-foreground">
                          {personName(deal)}
                        </span>
                        {personRole(deal) && (
                          <span
                            className={`mt-0.5 block whitespace-nowrap ${C.note}`}
                          >
                            {personRole(deal)}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-foreground/60">
                        {Number(deal.shares).toLocaleString("en-GB")}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums font-medium text-foreground">
                        {money(
                          dealValue(deal),
                          market === "UK" ? "GBP" : "USD",
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
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
          </div>
          <p className={`mt-3 ${C.note}`}>
            The full thesis, supporting evidence and price history for each buy
            live in the app.
          </p>
        </Section>

        {/* Mobile twin of the rail — the rail is hidden below lg, and this is
            the high-intent moment: they've just read who bought and how much. */}
        <BrokerInline
          broker={broker}
          className="mt-10 lg:hidden"
          company={name}
        />

        {data.stats && (
          <div className="grid gap-x-12 lg:grid-cols-2">
            {data.stats.description && (
              <Section id="about" label={`About ${name}`}>
                <p className={C.prose}>{data.stats.description}</p>
              </Section>
            )}
            <StatsSection stats={data.stats} />
          </div>
        )}

        {market === "US" && data.gov.length > 0 && (
          <Section
            aside="Disclosed under the STOCK Act — members report a range, not an exact figure."
            id="congress"
            label="Congressional trades in this ticker"
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
            <ul className="grid gap-x-12 md:grid-cols-2">
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
                    <span className={`mt-1 block ${C.note}`}>{n.source}</span>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* App CTA — the page's other conversion path, alongside the broker. */}
        <div
          className={`${C.panel} mt-12 flex flex-col gap-5 p-7 md:flex-row md:items-center md:justify-between`}
        >
          <div>
            <p className="text-[17px] font-semibold leading-snug tracking-tight text-foreground">
              Follow {name} in the app
            </p>
            <p className={`mt-1.5 max-w-[62ch] ${C.prose}`}>
              Get a push the moment{" "}
              {market === "UK" ? "a director" : "an insider"} files, with the
              full analysis attached — plus alerts when the price moves after a
              buy you&apos;re following.
            </p>
          </div>
          <div className="shrink-0">
            <StoreButtons
              buttonClassName={`inline-flex items-center gap-2 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-5 py-3 text-sm font-semibold`}
              gaEvent="cta_company_download"
              gaLabel="Company page"
              marketId={market.toLowerCase()}
            />
            <p className={`mt-2 ${C.note}`}>
              Free for 7 days, cancel any time.
            </p>
          </div>
        </div>

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

      <BrokerAside heading={`Invest in ${ticker}`} placement="company_rail" />
    </DefaultLayout>
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
    <div className={`${C.panel} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className={`border-b ${C.rule}`}>
              <th className={`px-5 py-3 text-left font-normal ${C.note}`}>
                Date
              </th>
              <th className={`px-5 py-3 text-left font-normal ${C.note}`}>
                Member
              </th>
              <th className={`px-5 py-3 text-right font-normal ${C.note}`}>
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
                <td className="whitespace-nowrap px-5 py-3.5 text-foreground/60">
                  {fmtDate(g.trade_date, market)}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 font-medium text-foreground">
                  {g.reporter?.name ?? "—"}
                  {g.reporter?.chamber && (
                    <span className={`mt-0.5 block ${C.note}`}>
                      {g.reporter.chamber}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-foreground/60">
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
