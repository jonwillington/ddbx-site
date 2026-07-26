/** One sector's insider buying — /sectors/:slug.
 *
 *  The layer between /companies (one flat index of several hundred issuers) and
 *  the company pages themselves. Its job is partly structural — crawl
 *  distribution and a footer destination — and partly editorial: it publishes
 *  the sector's median alpha, which requires holding both the filings and the
 *  benchmark-relative marks, and is therefore the part of this page nobody else
 *  can reproduce.
 *
 *  Deliberately NOT a filtered list of filings with a sector name on top. The
 *  aggregate figures, the concentration disclosure and the ranked companies
 *  are the content; recent buys are the evidence under it.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  dealPerson,
  dealValue,
  sectorBySlug,
  sectorByLabel,
  sectorMeetsBar,
  sectorPath,
  sectorRollup,
  windowStart,
  MIN_BUYS,
  SECTORS,
} from "../../shared/sectors.js";

import {
  money,
  R,
  SectorFigures,
  signedPct,
  alphaClass,
  useSectorMarket,
} from "@/components/sector-ui";
import DefaultLayout from "@/layouts/default";
import { AppCtaBand } from "@/components/seo/app-cta-band";
import { sectorCta } from "@/components/seo/cta-copy";
import { api } from "@/lib/api";
import { companyPath, cleanCompanyName, displayTicker } from "@/lib/company";

export default function SectorPage() {
  const { slug } = useParams<{ slug: string }>();
  const sector = useMemo(() => sectorBySlug(slug ?? ""), [slug]);
  const market = useSectorMarket();
  const [rows, setRows] = useState<Array<Dealing | UsDealing> | null>(null);

  useEffect(() => {
    let live = true;
    const since = windowStart(new Date());

    // One code path, two feeds: UK rows come back as `Dealing`, US as
    // `UsDealing`, and everything downstream reads only the fields both share
    // (ticker, trade_date, sector_normalized, live_performance) plus the
    // value accessor in shared/sectors.js that knows about value_gbp vs value.
    const load: Promise<Array<Dealing | UsDealing>> =
      market.id === "US"
        ? api.usDealings({ since, limit: 1000 }).then((r) => r.dealings)
        : api.dealingsWindow(since, 1000);

    load.then((d) => live && setRows(d)).catch(() => live && setRows([]));

    return () => {
      live = false;
    };
  }, [market.id]);

  const { row, deals } = useMemo(() => {
    if (!sector) return { row: null, deals: [] };
    const mine = (rows ?? []).filter(
      (d) => sectorByLabel(d.sector_normalized ?? "")?.slug === sector.slug,
    );

    return {
      row: sectorRollup(mine)[0] ?? null,
      deals: mine,
    };
  }, [rows, sector]);

  // Companies ranked by the value bought in them, which is the ordering that
  // answers "who in this sector are insiders backing".
  //
  // Above the unknown-sector early return, not below it: hooks have to run in
  // the same order on every render, and `deals` is already empty when `sector`
  // is null so there's nothing to compute anyway.
  const companies = useMemo(() => {
    const byTicker = new Map<
      string,
      { ticker: string; company: string; value: number; buys: number }
    >();

    for (const d of deals) {
      if (!d.ticker) continue;
      const entry = byTicker.get(d.ticker) ?? {
        ticker: d.ticker,
        company: d.company ?? d.ticker,
        value: 0,
        buys: 0,
      };

      entry.value += dealValue(d);
      entry.buys += 1;
      byTicker.set(d.ticker, entry);
    }

    return [...byTicker.values()]
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);
  }, [deals]);

  if (!sector) {
    return (
      <DefaultLayout>
        <p className="mx-auto max-w-3xl py-20 text-base text-foreground/65">
          We don’t track a sector by that name.{" "}
          <Link className="underline" to="/sectors">
            See every sector
          </Link>
          .
        </p>
      </DefaultLayout>
    );
  }

  const recent = [...deals]
    .sort((a, b) => (a.trade_date < b.trade_date ? 1 : -1))
    .slice(0, 12);

  return (
    <DefaultLayout>
      <article className="mx-auto w-full max-w-[860px] pb-16">
        <nav className={`${R.label} pt-2`}>
          <Link className="hover:text-foreground/70" to="/sectors">
            Sectors
          </Link>
          <span className="mx-1.5 opacity-40">/</span>
          <span>{sector.label}</span>
        </nav>

        <h1 className="mt-5 text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-[38px]">
          {sector.label} — {market.label} insider buying
        </h1>

        <p className={`mt-4 max-w-[62ch] ${R.body}`}>{sector.framing}</p>

        {rows === null ? (
          <div className="mt-10 h-40 animate-pulse rounded bg-foreground/[0.06]" />
        ) : !row || !sectorMeetsBar(row) ? (
          <p className={`mt-10 ${R.body}`}>
            Fewer than {MIN_BUYS} disclosed purchases in this sector over the
            last twelve months — not enough to draw anything from.{" "}
            <Link className="underline" to="/sectors">
              See the sectors that are active
            </Link>
            .
          </p>
        ) : (
          <>
            <div className={`mt-8 ${R.tile} px-5 py-4`}>
              <SectorFigures market={market} row={row} />
              <p className={`mt-3 ${R.label} leading-[1.6]`}>
                Rolling twelve months. Median alpha is measured against the
                market from the disclosure-day close — the first price a reader
                could have paid — not from the insider’s own entry.
              </p>
            </div>

            <Section title="Companies insiders backed">
              <ul className={`border-t ${R.rule}`}>
                {companies.map((c) => (
                  <li
                    key={c.ticker}
                    className={`flex items-baseline justify-between gap-4 border-b ${R.rule} py-2.5`}
                  >
                    <span className="min-w-0">
                      <Link
                        className="text-[14.5px] text-foreground/85 underline-offset-4 hover:underline"
                        to={companyPath(c.ticker)}
                      >
                        {cleanCompanyName(c.company) || c.ticker}
                      </Link>
                      <span className={`ml-2 ${R.label} tabular-nums`}>
                        {displayTicker(c.ticker)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-[13px] tabular-nums text-foreground/60">
                      {money(c.value, market.symbol)}
                      <span className="ml-2 text-foreground/40">
                        {c.buys} {c.buys === 1 ? "buy" : "buys"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Recent buys">
              <ul className={`border-t ${R.rule}`}>
                {recent.map((d, i) => {
                  const lp = d.live_performance;
                  const alpha =
                    lp?.alpha_pct_disclosed ?? lp?.alpha_pct_trade ?? null;

                  return (
                    <li
                      key={d.id ?? i}
                      className={`flex items-baseline justify-between gap-4 border-b ${R.rule} py-2.5`}
                    >
                      <span className="min-w-0">
                        <span className="text-[14px] text-foreground/85">
                          {dealPerson(d) ?? "—"}
                        </span>
                        <span className={`ml-2 ${R.label}`}>
                          {displayTicker(d.ticker ?? "")} · {d.trade_date}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-[13px] tabular-nums">
                        <span className="text-foreground/70">
                          {money(dealValue(d), market.symbol)}
                        </span>
                        <span
                          className={`ml-3 ${alphaClass(alpha == null ? null : alpha / 100)}`}
                        >
                          {signedPct(alpha == null ? null : alpha / 100)}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Section>
          </>
        )}

        <Section title="Other sectors">
          <ul className="space-y-1.5">
            {SECTORS.filter((s) => s.slug !== sector.slug).map((s) => (
              <li key={s.slug}>
                <Link
                  className="text-[14.5px] text-foreground/85 underline-offset-4 hover:underline"
                  to={sectorPath(s.slug)}
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        <AppCtaBand
          body={sectorCta(sector.label).body}
          gaLabel={`Sector · ${sector.slug}`}
          headline={sectorCta(sector.label).headline}
          marketId={market.id === "US" ? "us" : "uk"}
          screenshotSlot="today"
        />

        <p className={`mt-10 border-t ${R.rule} pt-6 ${R.label} leading-[1.6]`}>
          Figures cover disclosed purchases over the last twelve months and are
          marked to the latest cached close, not live prices. Past performance
          is not a reliable indicator of future results. This is information,
          not investment advice.
        </p>
      </article>
    </DefaultLayout>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`mt-10 border-t ${R.rule} pt-7`}>
      <h2 className="text-[17px] font-semibold leading-[1.3] tracking-[-0.015em] text-foreground">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
