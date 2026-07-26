import type { CompanyIndexEntry } from "@/lib/api";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { BrokerAside } from "@/components/brokers/broker-aside";
import DefaultLayout from "@/layouts/default";
import { api } from "@/lib/api";
import { cleanCompanyName, companyPath, displayTicker } from "@/lib/company";
import { marketForPath } from "@/lib/markets/registry";

/** Shared with company.tsx — see the note there. */
const R = {
  rule: "border-[#e8e0d5] dark:border-separator",
  label: "text-[11px] leading-none text-foreground/50",
  body: "text-[14px] leading-[1.65] text-foreground/70",
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

export default function CompaniesPage() {
  const market = useMemo(() => {
    const id = marketForPath(
      "/",
      typeof window === "undefined" ? undefined : window.location.hostname,
    ).id;

    return id === "us" || id === "usg" || id === "djt" ? "US" : "UK";
  }, []);

  const [companies, setCompanies] = useState<CompanyIndexEntry[] | null>(null);

  useEffect(() => {
    let live = true;

    api
      .companies(market)
      .then((all) => live && setCompanies(all.filter(meetsContentBar)))
      .catch(() => live && setCompanies([]));

    return () => {
      live = false;
    };
  }, [market]);

  const groups = useMemo(() => {
    const map = new Map<string, CompanyIndexEntry[]>();

    for (const c of companies ?? []) {
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
  }, [companies]);

  const noun = market === "UK" ? "director dealings" : "insider trading";

  return (
    // The rail, and the `drawerRight` gutter that reserves room for it, are
    // what /company/:slug and /brokers/:slug use. Without them this index sat
    // at the full 1280px column while every page it links to sat 320px
    // narrower, so clicking a company shunted the whole page sideways. Same
    // furniture, same measure, no jump — and the index stops being the one
    // page in the section with no broker surface on it at all.
    <DefaultLayout drawerRight>
      <BrokerAside
        showAll
        ctaVariant="grey"
        heading="Start investing"
        placement="companies_rail"
      />

      <div className="w-full pb-10">
        <h1 className="text-[26px] font-semibold leading-[1.15] tracking-tight text-foreground md:text-[32px]">
          Every {market} company with {noun}
        </h1>
        <p className={`mt-3 max-w-[62ch] ${R.body}`}>
          {companies === null
            ? "Loading the index…"
            : `${companies.length} companies whose ${market === "UK" ? "directors" : "insiders"} have bought shares, with the filings, ratings and company stats for each.`}
        </p>

        {groups.length > 0 && (
          <nav className="mt-6 flex flex-wrap gap-1.5">
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
        )}

        {groups.map(([letter, list]) => (
          <section key={letter} className="mt-10">
            <h2
              className={`${R.label} border-b ${R.rule} pb-2 font-semibold uppercase tracking-[0.12em]`}
              id={letter === "#" ? "num" : letter}
            >
              {letter}
            </h2>
            {/* One breakpoint later than it looks like it should be at every
                step: the rail takes 320px off the content column, so the old
                lg:3 / xl:4 put four ~220px columns opposite it and wrapped
                half the company names. */}
            <ul className="mt-1 sm:columns-2 sm:gap-x-12 xl:columns-3 2xl:columns-4">
              {list.map((c) => (
                <li key={c.key} className="break-inside-avoid py-2.5">
                  <Link
                    className="text-[14.5px] text-foreground/85 underline-offset-4 hover:underline"
                    to={companyPath(c.key)}
                  >
                    {cleanCompanyName(c.company) || c.key}
                  </Link>{" "}
                  <span className={`${R.label} tabular-nums`}>
                    {displayTicker(c.key)}
                  </span>{" "}
                  <span className="text-[12px] text-foreground/35">
                    · {c.deals} {c.deals === 1 ? "buy" : "buys"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className={`mt-12 border-t ${R.rule} pt-6 ${R.label} leading-[1.6]`}>
          Companies appear here once they have repeat insider activity or a
          written analysis on file.
        </p>
      </div>
    </DefaultLayout>
  );
}
