import type { MonthlyCluster } from "@/types/ddbx";

import { Link } from "react-router-dom";

import { CompanyLogo } from "@/components/company-logo";
import { companyPath } from "@/lib/company";

/** Same-issuer clusters.
 *
 *  "modal" is the original roster — logos, tickers, a buyer-count badge, no
 *  deep-links: the recap is a read, not a jumping-off point, and a link there
 *  would navigate out from under the modal.
 *
 *  "page" is the archived report, where the opposite is true. Every cluster is
 *  a company we already publish a page for, so each tile is a link, carries the
 *  company's name under its ticker, and the group opens with a sentence saying
 *  what a cluster is — the section was a wall of unlabelled logos otherwise. */
export function MonthlyClusters({
  clusters,
  variant = "modal",
  heading = true,
}: {
  clusters: MonthlyCluster[];
  variant?: "modal" | "page";
  /** Off when the caller already sets a section heading above this block. */
  heading?: boolean;
}) {
  if (clusters.length === 0) return null;

  const sorted = [...clusters].sort(
    (a, b) => b.insider_count - a.insider_count,
  );
  const page = variant === "page";

  return (
    <section className="space-y-3">
      {heading ? <h3 className="text-sm font-semibold">Clusters</h3> : null}

      {page ? (
        <p className="max-w-[62ch] text-[14px] leading-[1.65] text-foreground/70">
          {sorted.length} {sorted.length === 1 ? "company" : "companies"} had
          two or more insiders buying in the same month.
        </p>
      ) : null}

      <div
        className={`flex flex-wrap ${page ? "gap-x-4 gap-y-5" : "gap-x-5 gap-y-4"}`}
      >
        {sorted.map((c) =>
          page ? (
            <Link
              key={c.ticker}
              className="flex w-[76px] flex-col items-center gap-1.5 text-center outline-none"
              title={`${c.company} · ${c.insider_count} buyers`}
              to={companyPath(c.ticker)}
            >
              <Tile cluster={c} />
              <span className="w-full truncate text-[11px] font-medium text-foreground/80">
                {tickerShort(c.ticker)}
              </span>
              <span className="line-clamp-2 w-full text-[10.5px] leading-[1.35] text-foreground/45">
                {c.company}
              </span>
            </Link>
          ) : (
            <div
              key={c.ticker}
              className="flex w-16 flex-col items-center gap-1.5 text-center"
              title={`${c.company} · ${c.insider_count} buyers`}
            >
              <Tile cluster={c} />
              <span className="w-full truncate text-[11px] font-medium text-foreground/80">
                {tickerShort(c.ticker)}
              </span>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

function Tile({ cluster }: { cluster: MonthlyCluster }) {
  return (
    <span className="relative">
      <CompanyLogo size={44} ticker={cluster.ticker} />
      <span className="absolute -right-0.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-brown px-1 text-[10px] font-semibold tabular-nums text-white dark:bg-brand-tan dark:text-ink">
        {cluster.insider_count}
      </span>
    </span>
  );
}

/** Strip the LSE `.L` exchange suffix for a cleaner label. */
function tickerShort(ticker: string): string {
  return ticker.replace(/\.L$/, "");
}
