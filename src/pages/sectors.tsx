/** Sector index — /sectors.
 *
 *  Ranks the normalised ICB sectors by insider buying over a rolling year, with
 *  the median alpha of each sector's buys alongside the volume. The ranking is
 *  the page: "where are insiders putting money, and has it worked" is a
 *  question we can answer from our own data and most sources can't.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fetchDealingsWindow } from "../../shared/dealings-feed.js";
import {
  sectorMeetsBar,
  sectorPath,
  sectorRollup,
  windowStart,
  MIN_BUYS,
} from "../../shared/sectors.js";

import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { API_BASE } from "@/lib/api";
import {
  SectorComparisonHeader,
  SectorComparisonRow,
  money,
  useSectorMarket,
  R,
} from "@/components/sector-ui";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { RelatedCards } from "@/components/seo/related-cards";
import { StatTiles } from "@/components/seo/stat-tiles";
import { sectorCta } from "@/components/seo/cta-copy";
import { TrackingNotice } from "@/components/seo/tracking-notice";

export default function SectorsPage() {
  const market = useSectorMarket();
  const [rows, setRows] = useState<Array<Dealing | UsDealing> | null>(null);
  const [complete, setComplete] = useState(true);

  useEffect(() => {
    let live = true;
    const since = windowStart(new Date());

    // One code path, two feeds: UK rows come back as `Dealing`, US as
    // `UsDealing`, and everything downstream reads only the fields both share
    // (ticker, trade_date, sector_normalized, live_performance) plus the
    // value accessor in shared/sectors.js that knows about value_gbp vs value.
    //
    // Paged rather than one capped request: the API returns at most 1,000 rows
    // and the UK window crosses that during 2026, at which point a single call
    // drops the oldest filings and every total on this page understates itself
    // without saying so.
    fetchDealingsWindow({ apiBase: API_BASE, market: market.id, since })
      .then(
        (r: { dealings: Array<Dealing | UsDealing>; complete: boolean }) => {
          if (!live) return;
          setRows(r.dealings);
          setComplete(r.complete);
        },
      )
      .catch(() => live && setRows([]));

    return () => {
      live = false;
    };
  }, [market.id]);

  const rollup = useMemo(() => sectorRollup(rows ?? []), [rows]);
  const publishable = rollup.filter(sectorMeetsBar);
  // Bars scale to the biggest sector on the page — the list is a comparison
  // between these eleven, not against any absolute figure.
  const maxValue = publishable.reduce((m, r) => Math.max(m, r.value), 0);
  const totals = useMemo(
    () => ({
      buys: publishable.reduce((n, r) => n + r.buys, 0),
      value: publishable.reduce((n, r) => n + r.value, 0),
      companies: publishable.reduce((n, r) => n + r.companies, 0),
    }),
    [publishable],
  );

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={market.id === "US" ? "us" : "uk"}
        placement="sectors_rail"
        ukHeading="Start investing"
      />
      <SeoPageShell
        cta={{
          body: sectorCta().body,
          gaLabel: "Sectors index",
          headline: sectorCta().headline,
          marketId: market.id === "US" ? "us" : "uk",
          screenshotSlot: "analysis",
        }}
        eyebrow="Sector hub"
        footnote={
          <>
            Rolling twelve months of disclosed purchases. Sectors with fewer
            than {MIN_BUYS} buys in the window are omitted. Median alpha is the
            middle result once every buy in the sector is measured against the
            market from its disclosure-day close — not from the insider’s own
            entry price — and is marked to the latest cached close. Past
            performance is not a reliable indicator of future results.
          </>
        }
        loading={rows === null}
        notice={
          <>
            <TrackingNotice />
            {!complete && (
              // Truncation is invisible unless you say so: the table still
              // renders and still looks complete.
              <p className={`mt-2 ${R.label} leading-[1.6]`}>
                We couldn’t load the whole period, so these totals may be
                missing older purchases.
              </p>
            )}
          </>
        }
        skeleton={<SeoSkeleton rows={11} variant="ruled-list" />}
        standfirst={
          <>
            Where {market.noun} have been buying their own shares over the last
            twelve months, and how those buys have performed against the market
            since they were disclosed.
          </>
        }
        title={<>{market.label} insider buying by sector</>}
      >
        {publishable.length === 0 ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            No sector has reached {MIN_BUYS} disclosed purchases in the last
            twelve months yet, which is the bar for publishing a breakdown. In
            the meantime,{" "}
            <Link className="underline underline-offset-4" to="/biggest-buys">
              the biggest buys
            </Link>{" "}
            and{" "}
            <Link className="underline underline-offset-4" to="/companies">
              the company index
            </Link>{" "}
            cover the same filings without the aggregation.
          </p>
        ) : (
          <>
            {/* The page's own numbers, before the ranking rather than after it:
                the reader arrives asking how much of this there is, and the
                answer was previously only obtainable by adding up eleven rows. */}
            <StatTiles
              className="mt-8"
              // "Median alpha" heads a column three lines below this and was
              // previously only explained in the footnote, 900px away.
              note="Median alpha, in the column below, is the middle buy’s return against the market since it was disclosed."
              stats={[
                { label: "Buys", value: totals.buys },
                {
                  label: "Value bought",
                  value: money(totals.value, market.symbol),
                  primary: true,
                },
                { label: "Companies", value: totals.companies },
                { label: "Sectors", value: publishable.length },
              ]}
            />

            <div className="mt-10">
              <SectorComparisonHeader />
              <ul className={`border-t ${R.rule}`}>
                {publishable.map((row) => (
                  <li key={row.sector.slug} className={`border-b ${R.rule}`}>
                    {/* The padding belongs to the link, not the list item —
                        with it on the `li` the hover well was a strip through
                        the middle of the row and the tap target stopped short
                        of the rule. */}
                    <Link
                      className="-mx-3 block rounded-lg px-3 py-4 outline-none transition-colors hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:hover:bg-white/[0.03]"
                      to={sectorPath(row.sector.slug)}
                    >
                      <SectorComparisonRow
                        market={market}
                        maxValue={maxValue}
                        row={row}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <SeoSection
          aside="The same filings, cut a different way."
          title="Where to look next"
        >
          <RelatedCards
            cols={4}
            items={[
              {
                to: "/biggest-buys",
                title: "Biggest buys",
                description: `The largest single purchases ${market.noun} made in their own companies.`,
              },
              {
                to: "/companies",
                title: "Every company",
                description:
                  "One page per issuer, with its filings, ratings and price history.",
              },
              // The monthly archive is UK-only today, and a card promising a
              // report the US host doesn't publish is worse than three cards.
              ...(market.id === "UK"
                ? [
                    {
                      to: "/reports",
                      title: "Monthly reports",
                      description:
                        "What each month’s disclosures added up to, written up when it closed.",
                    },
                  ]
                : []),
              {
                to: "/learn",
                title: "Glossary",
                description:
                  "What the filings mean — closed periods, clusters, open-market buys.",
              },
            ]}
          />
        </SeoSection>
      </SeoPageShell>
    </DefaultLayout>
  );
}
