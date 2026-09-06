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
 *
 *  The band page's list moved to `BoardRow` (2026-09-06). Purchases, market
 *  value and sector were an 11px dot-string under the name; they are three
 *  labelled, aligned tracks now, which is what lets a reader compare two rows
 *  on size rather than read each one. The proportion bar stayed, spanning the
 *  row: rule 9 forbids a bar that encodes rank within a group, and this one
 *  does not — the page IS a ranking by value bought and says so in its
 *  methodology, which is the same exemption /biggest-buys had.
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
import {
  MarketCapStage,
  placedCount,
} from "@/components/boards/stages/market-cap-stage";
import {
  BoardRow,
  BoardRowHeader,
  BoardRowList,
} from "@/components/boards/board-row";
import { TickerPill } from "@/components/ticker-pill";
import { API_BASE } from "@/lib/api";
import { cleanCompanyName, companyPath, displayTicker } from "@/lib/company";

const CAVEAT =
  "rounded-xl bg-risk/[0.08] px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-foreground/70";

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
  // Empty and failed are different states, and the index arrives at `[]` for
  // both. A page that draws a picture of the market has to be able to say
  // "we couldn't load it" rather than draw an empty one.
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;

    fetch(`${API_BASE}/companies?market=${market}`, {
      headers: { accept: "application/json" },
    })
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      )
      .then((b: { companies: IndexedCompany[] }) => {
        if (!live) return;
        setRows(b.companies ?? []);
        setFailed(false);
      })
      .catch(() => {
        if (!live) return;
        setRows([]);
        setFailed(true);
      });

    return () => {
      live = false;
    };
  }, [market]);

  return { rows, failed };
}

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

export function MarketCapIndexPage() {
  const market = useSectorMarket();
  const { rows: companies, failed } = useCompanyIndex(market.id);
  const marketId = market.id === "US" ? "us" : "uk";
  const locale = market.id === "US" ? "en-US" : "en-GB";

  // The band cards' own hover tint. It used to be shared with the stage —
  // hovering a band header on the ladder lit the card that band links to —
  // but the ladder no longer draws band headers, and a channel whose two ends
  // now speak different id vocabularies (company keys against band slugs)
  // links nothing while looking as though it does.
  const [activeBand, setActiveBand] = useState<string | null>(null);

  const rollup = useMemo(
    () => bandRollup(companies ?? [], market.id),
    [companies, market.id],
  );
  const shown = rollup.bands.filter(bandMeetsBar);
  const exclusions = exclusionSentence(rollup, market.id);
  const cta = companiesCta(marketId);

  // The band split, as figures. It used to be a second arrangement of the
  // stage — the same marks gathered into strips — which drew three totals as
  // three column depths and asked the reader to estimate them. They are
  // numbers, so they are stated as numbers. A band with nothing bought in it
  // is left out rather than tiled as a zero: an empty band and a band we
  // cannot publish yet are different things, and neither is "£0".
  const bandTiles = rollup.bands
    .filter((row) => row.count > 0 && row.value > 0)
    .map((row) => ({
      label: row.band.plural,
      value: money(row.value, market.symbol),
    }));
  const belowBar = rollup.bands.filter(
    (row) => row.count > 0 && !bandMeetsBar(row),
  );

  const loading = companies === null;
  const placed = useMemo(() => placedCount(rollup), [rollup]);
  // No companies to place is not the same as no index: the ladder stands only
  // when there is something on it, and the shell's own header carries the page
  // in both of the other two states.
  const staged = loading || placed > 0;

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
        }}
        eyebrow="By size"
        hero={
          staged ? (
            <MarketCapStage
              loading={loading}
              locale={locale}
              market={market}
              rollup={rollup}
            />
          ) : undefined
        }
        loading={loading}
        skeleton={<SeoSkeleton rows={3} variant="sheet-stack" />}
        standfirst={
          staged ? undefined : (
            <>
              The same disclosed buying, split by how big the company is. A
              chief executive putting {market.symbol}
              100,000 into a {market.symbol}20bn company and into a{" "}
              {market.symbol}50m one are not the same act, and the size of the
              business is most of the difference.
            </>
          )
        }
        title={<>{market.label} insider buying by company size</>}
        titleInHero={staged}
        width="wide"
      >
        {/* The rule sits under the object rather than inside it: small print
            belongs outside the picture it qualifies. The tracking caveat used
            to sit beside it and moved into the stage header, where the reader
            meets it before the figures it qualifies rather than 600px after
            them. */}
        <div className="mt-4 max-w-[62ch]">
          <a
            className="inline-block text-[12.5px] font-medium leading-[1.5] text-brand-brown underline-offset-4 hover:underline dark:text-brand-tan"
            href="#methodology"
          >
            Where the band lines fall, and what sits outside them ↓
          </a>
          {/* The no-index state mounts no stage, so there is no header for the
              in-stage notice to sit in. The page still has to say how far back
              it holds. */}
          {staged ? null : (
            <TrackingNotice className="mt-2.5" marketId={market.id} />
          )}
        </div>

        {bandTiles.length > 0 ? (
          <StatTiles
            className="mt-6"
            cols={bandTiles.length >= 3 ? 3 : 2}
            note={
              belowBar.length > 0
                ? belowBar
                    .map(
                      (row) =>
                        `${row.band.label} has ${row.count}, below the ${MIN_COMPANIES} we publish a page from.`,
                    )
                    .join(" ")
                : undefined
            }
            stats={bandTiles}
          />
        ) : null}

        {failed ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            We couldn’t load the company index just now. It’s a network problem
            rather than an empty market. Try a refresh in a moment.
          </p>
        ) : placed === 0 ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            No company in this market has a market value on file yet, so there
            is nothing to place in a band. Market values are refreshed daily;
            this page will fill in as soon as they land. Meanwhile,{" "}
            <Link className="underline underline-offset-4" to="/companies">
              browse every company
            </Link>
            .
          </p>
        ) : shown.length === 0 ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            No band has the {MIN_COMPANIES} companies we publish a page from
            yet. The ladder above holds every company we can place, and the band
            pages open as more of them disclose.
          </p>
        ) : (
          <>
            <div className="mt-8 space-y-3">
              {shown.map((row) => (
                <Link
                  key={row.band.slug}
                  className={`block rounded-2xl border p-5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-brown/40 ${R.rule} ${
                    activeBand === row.band.slug
                      ? "bg-black/[0.035] dark:bg-white/[0.05]"
                      : "hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                  }`}
                  to={bandPath(row.band.slug)}
                  onMouseEnter={() => setActiveBand(row.band.slug)}
                  onMouseLeave={() => setActiveBand(null)}
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

            {exclusions && (
              <p className={`mt-5 max-w-[70ch] ${CAVEAT}`}>{exclusions}</p>
            )}
          </>
        )}

        <Methodology />

        <nav aria-label="More from ddbx" className="mt-9">
          <RelatedCards cols={2} items={CROSS_LINKS} />
        </nav>

        <LogoDevAttribution className="mt-10" />
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
  const { rows: companies } = useCompanyIndex(market.id);
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
            <TrackingNotice className="mt-2.5" marketId={market.id} />
          </>
        }
        skeleton={
          <>
            <SeoSkeleton rows={3} variant="stat-tiles" />
            <SeoSkeleton
              board={{ facts: 3, logo: 56, meter: true }}
              rows={12}
              variant="ranked-board"
            />
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
            rather than an empty band. Try a refresh in a moment.
          </p>
        ) : row.count < MIN_COMPANIES ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            Only {row.count} {row.count === 1 ? "company" : "companies"} in this
            band have disclosed buying at the moment, too few to rank. Try{" "}
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

            <BoardRowHeader
              facts={["Purchases", "Market value", "Sector"]}
              money="Value bought"
              subject="Company"
            />

            <BoardRowList>
              {listed.map((company, i) => (
                <BandRow
                  key={company.key}
                  company={company}
                  position={i + 1}
                  symbol={market.symbol}
                  topValue={topValue}
                />
              ))}
            </BoardRowList>

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
  const value = company.total_value ?? 0;

  return (
    <BoardRow
      badge={<TickerPill ticker={ticker} />}
      facts={[
        { label: "Purchases", value: company.deals },
        {
          // Both of these are absences we can name. A company with no market
          // value on file is one the daily refresh has not reached; a company
          // with no sector is one the classifier could not place. Neither is a
          // dash, and neither is a zero.
          label: "Market value",
          value: company.market_cap
            ? money(company.market_cap, symbol)
            : "not on file",
        },
        {
          label: "Sector",
          value: company.sector_normalized || "not classified",
        },
      ]}
      logo={<CompanyLogo size={56} ticker={company.key} />}
      // The rank stands in the gutter; this is the quantity the rank is drawn
      // from, so it reads as a figure rather than a caption.
      meter={<MeterBar max={topValue} value={value} />}
      money={
        <>
          <span className="sr-only">Value bought: </span>
          {value >= 500 ? money(value, symbol) : "not stated"}
        </>
      }
      name={cleanCompanyName(company.company) || ticker}
      position={position}
      to={companyPath(company.key)}
    />
  );
}
