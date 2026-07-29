import type { CompanyIndexEntry } from "@/lib/api";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

import { CompanyLogo, LogoDevAttribution } from "@/components/company-logo";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoRail } from "@/components/seo/seo-rail";
import { companiesCta } from "@/components/seo/cta-copy";
import { Skeleton } from "@/components/skeleton";
import { TickerPill } from "@/components/ticker-pill";
import DefaultLayout from "@/layouts/default";
import { api } from "@/lib/api";
import { cleanCompanyName, companyPath, displayTicker } from "@/lib/company";
import { moneyShort } from "@/lib/company-format";
import { marketForPath } from "@/lib/markets/registry";

/** Shared with company.tsx — see the note there. */
const R = {
  rule: "border-hairline dark:border-separator",
  label: "text-[11px] leading-none text-foreground/50",
} as const;

/** The bar a company clears to appear here, mirroring the one in
 *  functions/sitemap.xml.js: repeat insider activity, or a written analysis.
 *  A page holding one table row is a thin page, and a few hundred of them
 *  would drag down the ones that deserve to rank. */
const meetsContentBar = (c: CompanyIndexEntry) =>
  c.deals >= 2 || c.analysed > 0;

/** A–Z bucket, everything else under #. */
function initial(name: string): string {
  const ch = name.trim().charAt(0).toUpperCase();

  return ch >= "A" && ch <= "Z" ? ch : "#";
}

/** This page's own skeleton, not a shared variant.
 *
 *  It used to pass `SeoSkeleton variant="ruled-list"`: one column of ten rows,
 *  each with a subtitle and a 3px meter bar. What arrives is a search field, a
 *  one-line alphabet rail, then letter sections of logo rows in a 2/3-column
 *  grid and no meter bars anywhere — a different layout, not a different row
 *  count, so the data redrew the page instead of filling it. None of the shared
 *  variants describe an A–Z index, and the shared module isn't the right place
 *  to add a shape only this route has.
 *
 *  Counts are stand-ins (the real ones need the fetch), but the geometry is the
 *  page's: same grid, same rules, same 22px circle leading each row. */
function CompaniesSkeleton() {
  const blocks = [0, 1, 2];
  const rows = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div aria-busy="true">
      <span className="sr-only">Loading…</span>

      <div className="mt-6">
        <Skeleton className="h-[39px] w-full rounded-lg sm:max-w-[22rem]" />
      </div>

      <div className="-mx-2 mt-6 flex gap-1.5 overflow-hidden px-2 py-2">
        {Array.from({ length: 14 }, (_, i) => (
          <Skeleton key={i} className="h-[29px] w-9 shrink-0 rounded-lg" />
        ))}
      </div>

      {blocks.map((b) => (
        <section key={b} className="mt-10">
          <div className={`border-b ${R.rule} pb-2`}>
            <Skeleton className="h-[11px] w-3" />
          </div>
          <ul className="grid sm:grid-cols-2 sm:gap-x-10 xl:grid-cols-3">
            {rows.map((i) => (
              <li
                key={i}
                className={`flex items-center gap-2.5 border-b ${R.rule} py-2.5`}
              >
                <Skeleton circle className="shrink-0" h={22} w={22} />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-[18px] w-4/5 max-w-[200px]" />
                  <Skeleton className="mt-1 h-[13px] w-1/2 max-w-[120px]" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function CompaniesPage() {
  const market = useMemo(() => {
    const id = marketForPath(
      "/",
      typeof window === "undefined" ? undefined : window.location.hostname,
    ).id;

    return id === "us" || id === "usg" || id === "djt" ? "US" : "UK";
  }, []);

  const [companies, setCompanies] = useState<CompanyIndexEntry[] | null>(null);
  // Distinct from `companies === null`. The old code caught the fetch into an
  // empty array, which rendered "0 companies whose directors have bought
  // shares" — a false claim about the data, published whenever the API blinked.
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let live = true;

    setFailed(false);
    api
      .companies(market)
      .then((all) => live && setCompanies(all.filter(meetsContentBar)))
      .catch(() => {
        if (!live) return;
        setCompanies([]);
        setFailed(true);
      });

    return () => {
      live = false;
    };
  }, [market]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q || !companies) return companies ?? [];

    return companies.filter(
      (c) =>
        cleanCompanyName(c.company).toLowerCase().includes(q) ||
        displayTicker(c.key).toLowerCase().includes(q),
    );
  }, [companies, query]);

  const groups = useMemo(() => {
    const map = new Map<string, CompanyIndexEntry[]>();

    for (const c of matches) {
      const g = initial(cleanCompanyName(c.company) || c.key);

      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(c);
    }
    for (const list of map.values()) {
      list.sort((a, b) =>
        cleanCompanyName(a.company).localeCompare(cleanCompanyName(b.company)),
      );
    }

    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [matches]);

  const noun = market === "UK" ? "director dealings" : "insider trading";
  const insiders = market === "UK" ? "directors" : "insiders";
  const marketId = market === "UK" ? "uk" : "us";

  // Stated without the count while loading rather than left undefined: the
  // standfirst sits ABOVE the skeleton boundary, so an absent paragraph that
  // arrives with the data is the one shift the shell can't absorb — it pushes
  // the whole page down. Same sentence either way, the count appended once
  // it's a fact.
  const standfirst = failed
    ? "We couldn’t load the index just now. It’s a network hiccup rather than an empty market — try a refresh in a moment."
    : companies
      ? `${companies.length} companies whose ${insiders} have bought shares, with the filings, ratings and company stats for each.`
      : `Companies whose ${insiders} have bought shares, with the filings, ratings and company stats for each.`;

  return (
    // The rail, and the `drawerRight` gutter that reserves room for it, are
    // what /company/:slug and /brokers/:slug use. Without them this index sat
    // at the full 1280px column while every page it links to sat 320px
    // narrower, so clicking a company shunted the whole page sideways. Same
    // furniture, same measure, no jump — and the index stops being the one
    // page in the section with no broker surface on it at all.
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={marketId}
        placement="companies_rail"
        ukHeading="Start investing"
      />

      <SeoPageShell
        cta={{
          ...companiesCta(marketId),
          gaLabel: "Company index",
          marketId,
        }}
        eyebrow="Company index"
        footnote={
          <>
            <p>
              Companies appear here once they have repeat insider activity or a
              written analysis on file.
            </p>
            <LogoDevAttribution className="mt-2 text-[11px] leading-[1.6] text-foreground/50" />
          </>
        }
        loading={companies === null}
        skeleton={<CompaniesSkeleton />}
        standfirst={standfirst}
        title={`Every ${market} company with ${noun}`}
        width="wide"
      >
        {failed ? null : (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <label className="relative min-w-0 flex-1 sm:max-w-[22rem]">
                <span className="sr-only">Search companies</span>
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
                <input
                  className={`w-full rounded-lg border ${R.rule} bg-sheet py-2 pl-9 pr-3 text-base sm:text-[14px] text-foreground outline-none transition-colors placeholder:text-foreground/35 focus-visible:border-brand-brown/40 dark:bg-surface`}
                  placeholder="Search name or ticker"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              {query.trim() ? (
                <p className="text-[12.5px] text-foreground/50">
                  {matches.length}{" "}
                  {matches.length === 1 ? "company" : "companies"}
                </p>
              ) : null}
            </div>

            {groups.length > 0 ? (
              // Sticky under the 64px navbar: on a 368-company index the
              // alphabet is the only navigation there is, and scrolling past it
              // meant scrolling back to the top to use it.
              <nav className="sticky top-16 z-10 -mx-2 mt-6 flex flex-wrap gap-1.5 bg-background/80 px-2 py-2 backdrop-blur">
                {groups.map(([letter]) => (
                  <a
                    key={letter}
                    className={`rounded-lg border ${R.rule} bg-black/[0.02] px-2.5 py-1 text-[12.5px] font-semibold text-foreground/70 hover:text-foreground dark:bg-white/[0.04]`}
                    href={`#${letter === "#" ? "num" : letter}`}
                  >
                    {letter}
                  </a>
                ))}
              </nav>
            ) : null}

            {groups.length === 0 && query.trim() ? (
              <p className="mt-10 text-[14px] leading-[1.65] text-foreground/70">
                No company matches “{query.trim()}”. Try the ticker instead —
                the index is named as each issuer files.
              </p>
            ) : null}

            {groups.map(([letter, list]) => (
              <section key={letter} className="mt-10 scroll-mt-28">
                <h2
                  className={`${R.label} border-b ${R.rule} pb-2 font-semibold uppercase tracking-[0.12em]`}
                  id={letter === "#" ? "num" : letter}
                >
                  {letter}
                </h2>
                {/* A grid rather than CSS columns: each row now carries a logo,
                    a pill and a right-aligned figure, and multi-column flow
                    can't keep those columns aligned across the break. */}
                <ul className="grid sm:grid-cols-2 sm:gap-x-10 xl:grid-cols-3">
                  {list.map((c) => (
                    <li key={c.key} className={`border-b ${R.rule}`}>
                      <Link
                        className="group flex items-center gap-2.5 py-2.5"
                        to={companyPath(c.key)}
                      >
                        <CompanyLogo
                          className="shrink-0"
                          size={22}
                          ticker={c.key}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14.5px] text-foreground/85 underline-offset-4 group-hover:underline">
                            {cleanCompanyName(c.company) || c.key}
                          </span>
                          <span className="mt-1 flex items-center gap-1.5 text-[11.5px] leading-none text-foreground/45">
                            <TickerPill ticker={displayTicker(c.key)} />
                            <span className="truncate">
                              {c.deals} {c.deals === 1 ? "buy" : "buys"}
                              {c.analysed > 0 ? ` · ${c.analysed} rated` : ""}
                            </span>
                          </span>
                        </span>
                        {c.total_value ? (
                          <span className="shrink-0 text-right text-[13.5px] font-semibold tabular-nums text-foreground">
                            {moneyShort(
                              c.total_value,
                              market === "UK" ? "GBP" : "USD",
                            )}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </SeoPageShell>
    </DefaultLayout>
  );
}
