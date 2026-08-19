/** Insider buying by company size — /market-cap and /market-cap/:band.
 *
 *  The bands, the thresholds and the published methodology live in
 *  shared/cap-bands.js. Read that file's header first: the currency handling is
 *  the whole reason the module exists, and getting it wrong is off by two
 *  orders of magnitude in the direction that looks plausible.
 *
 *  These replace the index-membership hubs specced twice and never built.
 *  "FTSE 250 director dealings" is the better query, but constituent lists are
 *  FTSE Russell's licensed IP and need a quarterly refresh; size bands capture
 *  nearly the same intent from a field the product already has.
 *
 *  One cheap call. Everything here comes from /api/companies, which as of
 *  2026-08-19 carries market_cap and sector_normalized — so unlike the boards
 *  this family never pulls a thousand dealing rows.
 */
import type { Band, IndexedCompany } from "../../shared/cap-bands";
import type { RelatedCard } from "@/components/seo/related-cards";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  bandBySlug,
  bandMeetsBar,
  bandPath,
  bandRollup,
  exclusionSentence,
  thresholdSentence,
  BANDS,
  METHODOLOGY,
  MIN_COMPANIES,
  TOP_COMPANIES,
} from "../../shared/cap-bands.js";

import { money, R, useSectorMarket } from "@/components/sector-ui";
import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { RelatedCards } from "@/components/seo/related-cards";
import { StatTiles } from "@/components/seo/stat-tiles";
import { MeterBar } from "@/components/seo/meter-bar";
import { TrackingNotice } from "@/components/seo/tracking-notice";
import { companiesCta } from "@/components/seo/cta-copy";
import { CompanyLogo, LogoDevAttribution } from "@/components/company-logo";
import { TickerPill } from "@/components/ticker-pill";
import { API_BASE } from "@/lib/api";
import { cleanCompanyName, companyPath, displayTicker } from "@/lib/company";

const CAVEAT =
  "rounded-xl bg-risk/[0.08] px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-foreground/70";

const ROW_LINK =
  "-mx-2 block rounded-lg px-2 py-3 outline-none transition-colors hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:hover:bg-white/[0.03]";

const ROW_GRID =
  "grid grid-cols-[1.5rem_minmax(0,1fr)_5.5rem] items-start gap-x-3 sm:grid-cols-[2rem_minmax(0,1fr)_9rem] sm:gap-x-4";

const CROSS_LINKS: RelatedCard[] = [
  { to: "/sectors", title: "Buying by sector", description: "Where it went" },
  { to: "/roles", title: "Buying by role", description: "Who was buying" },
  {
    to: "/most-active-companies",
    title: "Most-active companies",
    description: "Where buying repeats",
  },
  { to: "/companies", title: "Browse companies", description: "Every issuer" },
];

/** The company index, which is the only call this family makes. */
function useCompanyIndex(market: "UK" | "US") {
  const [rows, setRows] = useState<IndexedCompany[] | null>(null);

  useEffect(() => {
    let live = true;

    fetch(`${API_BASE}/companies?market=${market}`, {
      headers: { accept: "application/json" },
    })
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      )
      .then((b: { companies: IndexedCompany[] }) => {
        if (live) setRows(b.companies ?? []);
      })
      .catch(() => {
        if (live) setRows([]);
      });

    return () => {
      live = false;
    };
  }, [market]);

  return rows;
}

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

export function MarketCapIndexPage() {
  const market = useSectorMarket();
  const companies = useCompanyIndex(market.id);
  const marketId = market.id === "US" ? "us" : "uk";

  const rollup = useMemo(
    () => bandRollup(companies ?? [], market.id),
    [companies, market.id],
  );
  const shown = rollup.bands.filter(bandMeetsBar);
  const exclusions = exclusionSentence(rollup, market.id);
  const cta = companiesCta(marketId);

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={marketId}
        placement="market_cap_rail"
        ukHeading="Start investing"
      />
      <SeoPageShell
        cta={{
          body: cta.body,
          gaLabel: "Market cap index",
          headline: cta.headline,
          marketId,
          screenshotSlot: "today",
        }}
        eyebrow="By size"
        loading={companies === null}
        notice={
          <>
            <a
              className="inline-block text-[12.5px] font-medium leading-[1.5] text-brand-brown underline-offset-4 hover:underline dark:text-brand-tan"
              href="#methodology"
            >
              Where the band lines fall, and what sits outside them ↓
            </a>
            <TrackingNotice className="mt-2.5" />
          </>
        }
        skeleton={<SeoSkeleton rows={3} variant="stat-tiles" />}
        standfirst={
          <>
            The same disclosed buying, split by how big the company is. A chief
            executive putting {market.symbol}
            100,000 into a {market.symbol}20bn company and into a{" "}
            {market.symbol}50m one are not the same act, and the size of the
            business is most of the difference.
          </>
        }
        title={<>{market.label} insider buying by company size</>}
      >
        {shown.length === 0 ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            We couldn’t load the company index just now. It’s a network problem
            rather than an empty market — try a refresh in a moment.
          </p>
        ) : (
          <>
            <div className="mt-8 space-y-3">
              {shown.map((row) => (
                <Link
                  key={row.band.slug}
                  className={`block rounded-2xl border p-5 outline-none transition-colors hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:hover:bg-white/[0.03] ${R.rule}`}
                  to={bandPath(row.band.slug)}
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="text-[18px] font-semibold leading-[1.25] tracking-[-0.014em] text-foreground">
                      {row.band.plural}
                    </span>
                    <span className="text-[13px] tabular-nums text-foreground/55">
                      {row.count} companies · {row.deals} purchases ·{" "}
                      {money(row.value, market.symbol)}
                    </span>
                  </span>
                  <span className={`mt-1.5 block ${R.label}`}>
                    {thresholdSentence(row.band, market.id)}
                  </span>
                  <span className={`mt-2.5 block max-w-[70ch] ${R.body}`}>
                    {row.band.blurb}
                  </span>
                </Link>
              ))}
            </div>

            {exclusions && <p className={`mt-5 ${CAVEAT}`}>{exclusions}</p>}
          </>
        )}

        <Methodology />

        <nav aria-label="More from ddbx" className="mt-9">
          <RelatedCards cols={2} items={CROSS_LINKS} />
        </nav>
      </SeoPageShell>
    </DefaultLayout>
  );
}

// ---------------------------------------------------------------------------
// One band
// ---------------------------------------------------------------------------

export default function MarketCapBandPage() {
  const { band: slug } = useParams<{ band: string }>();
  const market = useSectorMarket();
  const companies = useCompanyIndex(market.id);
  const marketId = market.id === "US" ? "us" : "uk";
  const band = bandBySlug(slug ?? "");

  const rollup = useMemo(
    () => bandRollup(companies ?? [], market.id),
    [companies, market.id],
  );
  const row = band
    ? rollup.bands.find((b) => b.band.slug === band.slug)
    : undefined;
  const listed = row ? row.companies.slice(0, TOP_COMPANIES) : [];
  const topValue = listed.length > 0 ? (listed[0].total_value ?? 0) : 0;

  const siblings: RelatedCard[] = BANDS.filter(
    (b: Band) => b.slug !== band?.slug,
  ).map((b: Band) => ({
    to: bandPath(b.slug),
    title: b.plural,
    description: thresholdSentence(b, market.id),
  }));

  if (!band) {
    return (
      <DefaultLayout drawerRight>
        <SeoRail
          marketId={marketId}
          placement="market_cap_rail"
          ukHeading="Start investing"
        />
        <SeoPageShell
          crumbs={[
            { label: "By size", to: "/market-cap" },
            { label: "Not found" },
          ]}
          cta={false}
          eyebrow="By size"
          standfirst="We split the market into three bands. Here they are."
          title="That isn’t a size band we publish"
        >
          <SeoSection title="Bands we publish">
            <RelatedCards cols={3} items={siblings} />
          </SeoSection>
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  const cta = companiesCta(marketId);

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={marketId}
        placement="market_cap_rail"
        ukHeading="Start investing"
      />
      <SeoPageShell
        crumbs={[
          { label: "By size", to: "/market-cap" },
          { label: band.label },
        ]}
        cta={{
          body: cta.body,
          gaLabel: `Market cap · ${band.label}`,
          headline: cta.headline,
          marketId,
          screenshotSlot: "today",
        }}
        eyebrow="By size"
        loading={companies === null}
        notice={
          <>
            <a
              className="inline-block text-[12.5px] font-medium leading-[1.5] text-brand-brown underline-offset-4 hover:underline dark:text-brand-tan"
              href="#methodology"
            >
              {thresholdSentence(band, market.id)} How that line is drawn ↓
            </a>
            <TrackingNotice className="mt-2.5" />
          </>
        }
        skeleton={
          <>
            <SeoSkeleton rows={3} variant="stat-tiles" />
            <SeoSkeleton rows={12} variant="ranked-board" />
          </>
        }
        standfirst={band.blurb}
        title={
          <>
            {band.plural} where {market.label} insiders are buying
          </>
        }
      >
        {!row || row.count === 0 ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            We couldn’t load the company index just now. It’s a network problem
            rather than an empty band — try a refresh in a moment.
          </p>
        ) : row.count < MIN_COMPANIES ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            Only {row.count} {row.count === 1 ? "company" : "companies"} in this
            band have disclosed buying at the moment — too few to rank. Try{" "}
            <Link className="underline underline-offset-4" to="/market-cap">
              the other bands
            </Link>
            .
          </p>
        ) : (
          <>
            <StatTiles
              className="mt-6"
              cols={3}
              note={`${thresholdSentence(band, market.id)} Totals cover every disclosed purchase at these companies; the ${listed.length} with the most bought are listed.`}
              stats={[
                { label: "Companies", value: row.count },
                { label: "Purchases", value: row.deals },
                {
                  label: "Combined value",
                  primary: true,
                  value: money(row.value, market.symbol),
                },
              ]}
            />

            <div
              aria-hidden
              className={`mt-8 pb-2.5 text-[11px] leading-[1.4] text-foreground/50 ${ROW_GRID}`}
            >
              <span />
              <span>Company and what its insiders bought</span>
              <span className="text-right">Value bought</span>
            </div>

            <ol className={`border-t ${R.rule}`}>
              {listed.map((company, i) => (
                <BandRow
                  key={company.key}
                  company={company}
                  position={i + 1}
                  symbol={market.symbol}
                  topValue={topValue}
                />
              ))}
            </ol>

            {row.count > listed.length && (
              <p className={`mt-4 ${CAVEAT}`}>
                {row.count - listed.length} further{" "}
                {row.count - listed.length === 1 ? "company" : "companies"} in
                this band had disclosed buying below the {listed.length} listed
                here.{" "}
                <Link className="underline underline-offset-4" to="/companies">
                  Browse every company
                </Link>
                .
              </p>
            )}
          </>
        )}

        <Methodology />

        {siblings.length > 0 && (
          <SeoSection
            aside="The same market, cut at a different size."
            title="Other bands"
          >
            <RelatedCards cols={2} items={siblings} />
          </SeoSection>
        )}

        <LogoDevAttribution className="mt-10" />
      </SeoPageShell>
    </DefaultLayout>
  );
}

function Methodology() {
  return (
    <SeoSection
      aside={
        <p className="text-[12px] leading-[1.5] text-foreground/45">
          These rules decide which band a company lands in, and they live in the
          same module that sorts them.
        </p>
      }
      id="methodology"
      title="How the bands are drawn"
      variant="rail"
    >
      <ul className="space-y-2.5">
        {METHODOLOGY.map((line: string) => (
          <li key={line} className={`flex gap-2.5 ${R.body}`}>
            <span
              aria-hidden
              className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-foreground/30"
            />
            <span className="max-w-[62ch]">{line}</span>
          </li>
        ))}
      </ul>
    </SeoSection>
  );
}

function BandRow({
  company,
  position,
  symbol,
  topValue,
}: {
  company: IndexedCompany;
  position: number;
  symbol: string;
  topValue: number;
}) {
  const ticker = displayTicker(company.key);

  return (
    <li className={`border-b ${R.rule}`}>
      <Link className={ROW_LINK} to={companyPath(company.key)}>
        <div className={ROW_GRID}>
          <span
            aria-hidden
            className={`font-mono text-[15px] leading-[1.35] tabular-nums ${
              position <= 3 ? "text-foreground" : "text-foreground/35"
            }`}
          >
            {String(position).padStart(2, "0")}
          </span>

          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-2">
              <CompanyLogo size={26} ticker={company.key} />
              <span className="min-w-0 truncate text-[15.5px] font-semibold leading-[1.3] tracking-[-0.012em] text-foreground sm:text-[17px]">
                {cleanCompanyName(company.company) || ticker}
              </span>
              <TickerPill ticker={ticker} />
            </span>

            <span className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-[1.35] text-foreground/50">
              <span>
                {company.deals} {company.deals === 1 ? "purchase" : "purchases"}
              </span>
              {company.market_cap ? (
                <>
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  <span className="tabular-nums">
                    {money(company.market_cap, symbol)} market value
                  </span>
                </>
              ) : null}
              {company.sector_normalized ? (
                <>
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  <span className="truncate">{company.sector_normalized}</span>
                </>
              ) : null}
            </span>
          </span>

          <span className="text-right">
            <span className="text-[17px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-foreground sm:text-[22px]">
              <span className="sr-only">Value bought: </span>
              {money(company.total_value ?? 0, symbol)}
            </span>
          </span>

          <MeterBar
            className="col-span-3 mt-2.5"
            max={topValue}
            value={company.total_value ?? 0}
          />
        </div>
      </Link>
    </li>
  );
}
