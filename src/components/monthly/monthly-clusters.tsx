import type { MonthlyCluster } from "@/types/ddbx";

import { CompanyLogo } from "@/components/company-logo";

/** Same-issuer clusters — kept deliberately light. Just the company logos and
 *  tickers as a visual roster, with a small buyer-count badge on each. No
 *  per-trade breakdown or deep-links: the recap is a read, not a jumping-off
 *  point, and the heavier card/drawer treatment made this section noisy. */
export function MonthlyClusters({ clusters }: { clusters: MonthlyCluster[] }) {
  if (clusters.length === 0) return null;

  const sorted = [...clusters].sort(
    (a, b) => b.insider_count - a.insider_count,
  );

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Clusters</h3>
      <div className="flex flex-wrap gap-x-5 gap-y-4">
        {sorted.map((c) => (
          <div
            key={c.ticker}
            className="flex w-16 flex-col items-center gap-1.5 text-center"
            title={`${c.company} · ${c.insider_count} buyers`}
          >
            <div className="relative">
              <CompanyLogo size={44} ticker={c.ticker} />
              <span className="absolute -right-0.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#5a4128] px-1 text-[10px] font-semibold text-white dark:bg-[#ad9479] dark:text-[#1a140d]">
                {c.insider_count}
              </span>
            </div>
            <span className="w-full truncate text-[11px] font-medium text-foreground/80">
              {tickerShort(c.ticker)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Strip the LSE `.L` exchange suffix for a cleaner label. */
function tickerShort(ticker: string): string {
  return ticker.replace(/\.L$/, "");
}
