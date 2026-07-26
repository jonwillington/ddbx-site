import type { CompanyPage as CompanyPageData } from "@/lib/api";
import type { Dealing, GovDealing, UsDealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

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
 * Company page design language — the broker-review system, applied to data.
 *
 *  These pages sit next to /brokers in the information architecture, so they
 *  borrow its editorial grammar rather than inventing one: a single `sheet`
 *  document on the cream page, `tile` for data blocks, one hairline colour,
 *  sentence case throughout, hierarchy from size and ink rather than
 *  decoration. Kept as a local const (same as broker-detail.tsx) because the
 *  two pages evolve together and neither owns the other.
 */
const R = {
  sheet:
    "rounded-2xl border border-[#e8e0d5] bg-[#faf7f2] shadow-[0_1px_2px_rgba(90,65,40,0.03)] dark:border-white/[0.07] dark:bg-surface",
  rule: "border-[#e8e0d5] dark:border-separator",
  tile: "rounded-xl bg-black/[0.035] dark:bg-white/[0.05]",
  label: "text-[11px] leading-none text-foreground/50",
  body: "text-[14px] leading-[1.65] text-foreground/70",
  subhead: "text-[12px] font-semibold text-foreground/55",
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

/** Company-specific FAQ, rendered through the same MarketFaq component the
 *  market homepages use. Deliberately answers the questions a search visitor
 *  arrives with — what the data is, where it comes from, whether it's a
 *  signal — rather than repeating the generic market copy. */
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
          out a holding. That&apos;s exactly what our six-point check is for: it
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

/** Heading-left / content-right row — the broker review's one layout unit. */
function Row({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`grid gap-5 border-t ${R.rule} py-8 md:grid-cols-[minmax(0,0.5fr)_minmax(0,1.5fr)] md:gap-10`}
    >
      <div className="md:sticky md:top-24 md:self-start">
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {note && <p className={`mt-1.5 ${R.label} leading-[1.5]`}>{note}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default function CompanyPage() {
  const { key: slug } = useParams<{ key: string }>();
  // The domain decides the market: ddbx.uk serves UK issuers, ddbx.us US ones.
  // On localhost marketForPath falls back to UK, which is what we want for dev.
  const market = useMemo(() => {
    const id = marketForPath(
      "/",
      typeof window === "undefined" ? undefined : window.location.hostname,
    ).id;

    return id === "us" || id === "usg" || id === "djt" ? "US" : "UK";
  }, []);

  const [data, setData] = useState<CompanyPageData | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          <p className={`mt-3 ${R.body}`}>
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
        <div className="mx-auto max-w-[980px] animate-pulse py-10">
          <div className="h-8 w-2/3 rounded bg-foreground/10" />
          <div className="mt-3 h-4 w-full rounded bg-foreground/[0.07]" />
          <div className="mt-10 h-48 w-full rounded-2xl bg-foreground/[0.05]" />
        </div>
      </DefaultLayout>
    );
  }

  const name = cleanCompanyName(data.company);
  const ticker = displayTicker(data.key);
  const { summary } = data;
  const insiderPlural =
    market === "UK"
      ? summary.people === 1
        ? "director"
        : "directors"
      : summary.people === 1
        ? "insider"
        : "insiders";

  const tiles: Array<[string, string]> = [
    ["Disclosed buys", String(summary.deals)],
    ["Total value", moneyShort(summary.total_value, summary.currency)],
    [market === "UK" ? "Directors" : "Insiders", String(summary.people)],
    ["Most recent", fmtDate(summary.last_trade_date, market)],
  ];

  return (
    <DefaultLayout>
      <div className="mx-auto w-full max-w-[980px] pb-10">
        {/* Masthead */}
        <div className="flex items-start gap-4 pb-8">
          <CompanyLogo className="mt-0.5" size={52} ticker={data.key} />
          <div className="min-w-0">
            <h1 className="text-[26px] font-semibold leading-[1.15] tracking-tight text-foreground md:text-[32px]">
              {name}{" "}
              <span className="text-foreground/40">
                ({ticker}){" "}
                {market === "UK" ? "director dealings" : "insider trading"}
              </span>
            </h1>
            <p className={`mt-3 max-w-[62ch] ${R.body}`}>
              {summary.people} {insiderPlural}{" "}
              {summary.people === 1 ? "has" : "have"} bought{" "}
              {moneyShort(summary.total_value, summary.currency)} of {name}{" "}
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
          </div>
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map(([k, v]) => (
            <div key={k} className={`${R.tile} px-4 py-3.5`}>
              <div className="text-[19px] font-semibold tracking-tight text-foreground">
                {v}
              </div>
              <div className={`mt-1 ${R.label}`}>{k}</div>
            </div>
          ))}
        </div>

        <div className="mt-2">
          <Row
            note={`Every ${market === "UK" ? "PDMR disclosure" : "SEC Form 4"} we've surfaced for this issuer. Ratings come from our analysis of the filing, not from the company.`}
            title={market === "UK" ? "Director buys" : "Insider buys"}
          >
            <div className={`${R.sheet} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-[13.5px]">
                  <thead>
                    <tr className={`border-b ${R.rule}`}>
                      <th
                        className={`px-4 py-3 text-left font-normal ${R.label}`}
                      >
                        Date
                      </th>
                      <th
                        className={`px-4 py-3 text-left font-normal ${R.label}`}
                      >
                        {market === "UK" ? "Director" : "Insider"}
                      </th>
                      <th
                        className={`px-4 py-3 text-right font-normal ${R.label}`}
                      >
                        Shares
                      </th>
                      <th
                        className={`px-4 py-3 text-right font-normal ${R.label}`}
                      >
                        Value
                      </th>
                      <th
                        className={`px-4 py-3 text-left font-normal ${R.label}`}
                      >
                        Rating
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.deals.map((deal, i) => (
                      <tr
                        key={deal.id ?? i}
                        className={`border-b last:border-b-0 ${R.rule}`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-foreground/70">
                          {fmtDate(deal.trade_date, market)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground">
                            {personName(deal)}
                          </span>
                          {personRole(deal) && (
                            <span className={`block ${R.label} mt-1`}>
                              {personRole(deal)}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-foreground/70">
                          {Number(deal.shares).toLocaleString("en-GB")}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium text-foreground">
                          {money(
                            dealValue(deal),
                            market === "UK" ? "GBP" : "USD",
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {deal.analysis?.rating ? (
                            <RatingBadge rating={deal.analysis.rating} />
                          ) : (
                            <span className={R.label}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className={`mt-3 ${R.label} leading-[1.6]`}>
              The full thesis, evidence and price history for each buy live in
              the app.
            </p>
          </Row>

          {data.stats?.description && (
            <Row title={`About ${name}`}>
              <p className={R.body}>{data.stats.description}</p>
            </Row>
          )}

          {data.stats && <StatsRow stats={data.stats} />}

          {market === "US" && data.gov.length > 0 && (
            <Row
              note="Disclosed under the STOCK Act. Members report a value range, not an exact amount."
              title="Congress"
            >
              <CongressTable market={market} rows={data.gov} />
              <Link
                className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground underline underline-offset-4"
                to="/congress"
              >
                See all congressional trading
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </Row>
          )}

          {data.news.items.length > 0 && (
            <Row
              note="Headlines from the wider web, for context."
              title="Recent news"
            >
              <ul className="min-w-0">
                {data.news.items.slice(0, 6).map((n, i) => (
                  <li
                    key={i}
                    className={`border-b last:border-b-0 ${R.rule} py-3`}
                  >
                    <a
                      className="text-[14px] leading-snug text-foreground/80 underline-offset-4 hover:underline"
                      href={n.url}
                      rel="nofollow noopener noreferrer"
                      target="_blank"
                    >
                      {n.title}
                    </a>
                    {n.source && (
                      <span className={`mt-1 block ${R.label}`}>
                        {n.source}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Row>
          )}

          {/* Download CTA — the page's primary action. */}
          <Row
            note="Free for 7 days, then cancel any time."
            title={`Follow ${name}`}
          >
            <div className={`${R.sheet} p-6`}>
              <p className="text-[15px] font-medium leading-snug text-foreground">
                Get a push the moment{" "}
                {market === "UK" ? "a director" : "an insider"} files.
              </p>
              <p className={`mt-2 max-w-[52ch] ${R.body}`}>
                Every disclosure rated as it lands, with the full thesis,
                supporting evidence and price history — plus alerts when the
                price moves after a buy you&apos;re following.
              </p>
              <StoreButtons
                buttonClassName={`inline-flex items-center gap-2 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-5 py-3 text-sm font-semibold`}
                className="mt-5"
                gaEvent="cta_company_download"
                gaLabel="Company page"
                marketId={market.toLowerCase()}
              />
            </div>
          </Row>
        </div>

        <MarketFaq items={companyFaq(name, market)} />

        <nav
          className={`mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t ${R.rule} pt-6 text-[13.5px]`}
        >
          <Link
            className="text-foreground/70 underline-offset-4 hover:underline"
            to="/"
          >
            All {market}{" "}
            {market === "UK" ? "director dealings" : "insider trading"}
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

function StatsRow({ stats }: { stats: NonNullable<CompanyPageData["stats"]> }) {
  const cur = stats.currency ?? "GBP";
  const rows: Array<[string, string]> = (
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
    <Row note="Refreshed daily from market data." title="Company stats">
      <dl className={`${R.tile} grid gap-x-8 px-5 py-1 sm:grid-cols-2`}>
        {rows.map(([k, v]) => (
          <div
            key={k}
            className={`flex items-baseline justify-between border-b last:border-b-0 ${R.rule} py-3`}
          >
            <dt className="text-[13.5px] text-foreground/55">{k}</dt>
            <dd className="text-[13.5px] font-semibold tabular-nums text-foreground">
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </Row>
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
    <div className={`${R.sheet} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className={`border-b ${R.rule}`}>
              <th className={`px-4 py-3 text-left font-normal ${R.label}`}>
                Date
              </th>
              <th className={`px-4 py-3 text-left font-normal ${R.label}`}>
                Member
              </th>
              <th className={`px-4 py-3 text-right font-normal ${R.label}`}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g, i) => (
              <tr
                key={g.id ?? i}
                className={`border-b last:border-b-0 ${R.rule}`}
              >
                <td className="whitespace-nowrap px-4 py-3 text-foreground/70">
                  {fmtDate(g.trade_date, market)}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {g.reporter?.name ?? "—"}
                  {g.reporter?.chamber && (
                    <span className={`block ${R.label} mt-1`}>
                      {g.reporter.chamber}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-foreground/70">
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
