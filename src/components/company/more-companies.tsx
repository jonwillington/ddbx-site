/** "Director buying at other companies" — the onward-link rail at the foot
 *  of a company page.
 *
 *  Company pages are the site's long tail: they rank individually and each one
 *  is an entry point of its own. A visitor who arrives on one ticker and finds
 *  no route to another leaves after a single page, which is both a worse visit
 *  and a worse crawl — the internal links here are how the rest of the index
 *  gets discovered.
 *
 *  Selection is deliberately "most active", not "similar": we don't hold sector
 *  data, and a fabricated similarity ranking would send people somewhere
 *  arbitrary while implying it isn't. Most-disclosed-buys-first is honest about
 *  what it is, and it happens to surface the pages worth reading.
 */
import type { CompanyIndexEntry } from "@/lib/api";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

import { CompanyLogo } from "@/components/company-logo";
import { api } from "@/lib/api";
import { cleanCompanyName, companyPath, displayTicker } from "@/lib/company";

const SHOWN = 8;

export function MoreCompanies({
  currentKey,
  market,
}: {
  /** Storage key of the company being viewed — excluded from the rail. */
  currentKey: string;
  market: string;
}) {
  const [rows, setRows] = useState<CompanyIndexEntry[] | null>(null);

  useEffect(() => {
    let live = true;

    api
      .companies(market)
      .then((all) => {
        if (!live) return;
        const picked = all
          .filter((c) => c.key !== currentKey)
          // Rated first (those pages have something to read), then by how much
          // has actually been disclosed, then most recent.
          .sort(
            (a, b) =>
              b.analysed - a.analysed ||
              b.deals - a.deals ||
              (a.last_trade_date < b.last_trade_date ? 1 : -1),
          )
          .slice(0, SHOWN);

        setRows(picked);
      })
      .catch(() => live && setRows([]));

    return () => {
      live = false;
    };
  }, [market, currentKey]);

  // Silent when there's nothing to link to — an empty "explore more" heading is
  // worse than no heading.
  if (!rows || rows.length === 0) return null;

  const subject = market === "UK" ? "Director buying" : "Insider buying";

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="text-[17px] font-semibold leading-[1.3] tracking-[-0.015em] text-foreground">
          {subject} at other companies
        </h2>
        <Link
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground/70 underline-offset-4 hover:underline"
          to="/companies"
        >
          Browse every company
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((c) => (
          <li key={c.key}>
            <Link
              className="group flex h-full items-center gap-3 rounded-xl border border-hairline bg-sheet px-3.5 py-3 transition-colors hover:border-[#d8cbb8] hover:bg-white dark:border-white/[0.07] dark:bg-surface dark:hover:border-white/15 dark:hover:bg-surface-secondary"
              to={companyPath(c.key)}
            >
              <CompanyLogo size={32} ticker={c.key} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium leading-snug text-foreground">
                  {cleanCompanyName(c.company)}
                </span>
                <span className="mt-0.5 block truncate text-[11.5px] leading-4 text-foreground/50">
                  <span className="font-mono">{displayTicker(c.key)}</span> ·{" "}
                  {c.deals} {c.deals === 1 ? "buy" : "buys"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
