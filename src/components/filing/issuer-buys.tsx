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

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/20/solid";

import { filingFamily } from "../../../shared/filing-family.js";

import { PeerRow } from "@/components/filing/cluster-panel";
import { SeoSection } from "@/components/seo/section";
import { companyPath } from "@/lib/company";
import { useIssuerDeals } from "@/lib/issuer-deals";

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
      <ul className="mt-4 border-t border-rule">
        {shown.map((d) => {
          const who = fam.insider(d);

          return (
            <PeerRow
              key={d.id}
              market={market}
              p={{
                id: d.id,
                name: who.name || "Insider",
                role: who.role ?? "",
                date: d.trade_date,
                value: Number(fam.value(d) ?? 0),
                isThis: false,
              }}
            />
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
