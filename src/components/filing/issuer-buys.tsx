/** The issuer's other filings, below the argument.
 *
 *  The deal drawer carried an "Other recent buys on {ticker}" list, and it was
 *  how a reader moved sideways from one purchase to the next at the same
 *  company. With the drawer retired for markets that have a filing page, that
 *  movement has to live here, or the page becomes the dead end the drawer
 *  used to be.
 *
 *  Excludes whatever the cluster panel already drew: a co-buyer inside the
 *  window is on screen once, in the section that says why they matter. What
 *  is left is the issuer's wider record, newest first. Renders nothing while
 *  loading, on failure, or when there is nothing left to list — the section
 *  is a route onward, and an empty route is not worth a heading.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";

import type { SparkBar } from "@/components/market/market-row-spark";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/20/solid";

import { filingFamily } from "../../../shared/filing-family.js";

import { CalendarDayChip, chipParts } from "@/components/calendar-day-chip";
import { MarketRowSpark } from "@/components/market/market-row-spark";
import { SeoSection } from "@/components/seo/section";
import { Skeleton } from "@/components/skeleton";
import { Delta } from "@/components/ui/delta";
import { api } from "@/lib/api";
import { companyPath } from "@/lib/company";
import { useIssuerDeals } from "@/lib/issuer-deals";

const monthAbbr = (iso: string) =>
  new Date(`${iso}T00:00:00Z`)
    .toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })
    .toUpperCase();

/** One year of closes for the issuer, for the rows' sparklines. The sparkline
 *  rebases at each row's own disclosure date, so the raw unit (pence, cents)
 *  never matters. `null` while loading, `[]` on failure. */
function useIssuerBars(ticker: string): SparkBar[] | null {
  const [bars, setBars] = useState<SparkBar[] | null>(null);

  useEffect(() => {
    let live = true;

    setBars(null);
    api
      .priceHistory(ticker, 365)
      .then((b) =>
        live && setBars(b.map((x) => ({ date: x.date, close: x.close_pence }))),
      )
      .catch(() => live && setBars([]));

    return () => {
      live = false;
    };
  }, [ticker]);

  return bars;
}

const SPARK_MODE = { axis: "raw", anchor: "disclosure" } as const;

const SHOWN = 5;

export function IssuerBuys({
  deal,
  market,
  company,
}: {
  deal: Dealing | UsDealing;
  market: "UK" | "US";
  /** The clean issuer name the page already uses. */
  company: string;
}) {
  const fam = filingFamily(market);
  const deals = useIssuerDeals(market, deal.ticker);
  const bars = useIssuerBars(deal.ticker);
  const clusterDays =
    deal.cluster?.count && deal.cluster.count >= 2
      ? (deal.cluster.window_days ?? 14)
      : null;

  const others = useMemo(() => {
    if (!deals) return [];
    const anchor = Date.parse(`${deal.trade_date}T00:00:00Z`);

    return deals
      .filter((d) => d.id !== deal.id)
      .filter((d) => fam.transactionLabel(d) !== "Disposal")
      .filter((d) => {
        if (clusterDays == null) return true;
        const t = Date.parse(`${d.trade_date}T00:00:00Z`);

        return Math.abs(t - anchor) > clusterDays * 86_400_000;
      })
      .sort((a, b) => (a.trade_date < b.trade_date ? 1 : -1));
  }, [deals, deal.id, deal.trade_date, clusterDays, fam]);

  if (others.length === 0) return null;

  const shown = others.slice(0, SHOWN);

  return (
    <SeoSection
      aside={
        clusterDays != null
          ? `The rest of the insider record at ${company}, outside the cluster above.`
          : `The rest of the insider record at ${company}, newest first.`
      }
      title={`Other buys at ${company}`}
    >
      {/* Each row shows how the buy has done since it was disclosed: the
          price path as a sparkline and the return as plain coloured text
          (Jon, 2026-09-19: "need to see performance"). Returns are never
          chips — see <Delta>. */}
      <ul className="mt-4 border-t border-rule">
        {shown.map((d) => {
          const who = fam.insider(d);
          const ret = d.live_performance?.return_pct_disclosed ?? null;

          return (
            <li key={d.id} className="border-b border-rule">
              <Link
                className="group -mx-2 flex items-center gap-3 rounded-control px-2 py-3 outline-none transition-colors hover:bg-foreground/3 focus-visible:ring-2 focus-visible:ring-brand-brown/40 sm:gap-5"
                to={fam.path(d.id)}
              >
                <span className="flex shrink-0 flex-col items-center gap-1">
                  <CalendarDayChip {...chipParts(d.trade_date)} muted size="sm" />
                  <span className="micro text-foreground/40">
                    {monthAbbr(d.trade_date)}
                  </span>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body text-foreground/85">
                    {who.name || "Insider"}
                  </span>
                  <span className="mt-0.5 block truncate text-small text-foreground/45">
                    {who.role || "Insider"} · {fam.money(Number(fam.value(d) ?? 0))}
                  </span>
                </span>

                <span className="hidden shrink-0 sm:block">
                  {bars == null ? (
                    <Skeleton className="h-7 w-24 rounded-mark" />
                  ) : bars.length > 0 ? (
                    <MarketRowSpark
                      bars={bars}
                      chartMode={SPARK_MODE}
                      disclosedDate={d.disclosed_date}
                      height={28}
                      tradeDate={d.trade_date}
                      width={96}
                    />
                  ) : null}
                </span>

                <span className="w-24 shrink-0 text-right">
                  <Delta size="title" className="font-semibold" value={ret} />
                  {ret != null ? (
                    <span className="block text-caption text-foreground/40">
                      since disclosed
                    </span>
                  ) : null}
                </span>

                <ArrowRightIcon
                  aria-hidden
                  className="h-4 w-4 shrink-0 text-foreground/25 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground/60"
                />
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        className="group mt-4 inline-flex items-center gap-1.5 text-small font-medium text-foreground/70 underline-offset-4 hover:text-foreground hover:underline"
        to={companyPath(deal.ticker)}
      >
        {others.length > SHOWN
          ? `All ${others.length + 1} filings at ${company}`
          : `The company page for ${company}`}
        <ArrowRightIcon
          aria-hidden
          className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
        />
      </Link>
    </SeoSection>
  );
}
