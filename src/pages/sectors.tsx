/** Sector index — /sectors.
 *
 *  Ranks the normalised ICB sectors by insider buying over a rolling year, with
 *  the median alpha of each sector's buys alongside the volume. The ranking is
 *  the page: "where are insiders putting money, and has it worked" is a
 *  question we can answer from our own data and most sources can't.
 *
 *  Drawn, not just tallied (2026-09-05). The page used to open with four stat
 *  tiles over an eleven-row table, which states the totals and shows none of
 *  the shape: a reader could not see that one sector's buys are two dozen large
 *  purchases and another's are three hundred small ones, or that the medians
 *  either side of the market are a close-run thing. The hero now carries every
 *  disclosed purchase of the year as one dot in a lane per sector, re-sorting
 *  from value to outcome, with the h1 and the figures inside it. The tiles
 *  went; their note moved under the stage, where the ranked list it explains
 *  begins. Composition is still SeoPageShell's, which keeps the app band after
 *  the last content section.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";
import type { StageFigure } from "@/components/boards/stage-figures";
import type { Linking } from "@/components/boards/board-model";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fetchDealingsWindow } from "../../shared/dealings-feed.js";
import {
  cleanCompanyName,
  indexLeadSentence,
  sectorMeetsBar,
  sectorPath,
  sectorRollup,
  windowStart,
  CONCENTRATION_THRESHOLD,
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
import { StageFigures } from "@/components/boards/stage-figures";
import { StageNotice } from "@/components/boards/stage-notice";
import {
  SectorsStage,
  toSectorBuys,
} from "@/components/boards/stages/sectors-stage";
import { sectorCta } from "@/components/seo/cta-copy";
import { TrackingNotice } from "@/components/seo/tracking-notice";

/** Caveats are risk-amber wells rather than another line of grey small print.
 *  A truncated window changes how every total above it should be read, and set
 *  in the same grey as the row meta it was, in practice, invisible. */
const CAVEAT =
  "rounded-xl bg-risk/[0.08] px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-foreground/70";

export default function SectorsPage() {
  const market = useSectorMarket();
  const [rows, setRows] = useState<Array<Dealing | UsDealing> | null>(null);
  const [complete, setComplete] = useState(true);
  // Third state, distinct from "no rows": an outage used to land the reader on
  // "no sector has reached 5 disclosed purchases", which is an editorial claim
  // about the market produced by a failed request.
  const [failed, setFailed] = useState(false);
  // The stage and the ranked list highlight the same sector, by slug.
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const linking: Linking = useMemo(
    () => ({ activeId: activeSlug, setActiveId: setActiveSlug }),
    [activeSlug],
  );

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
          setFailed(false);
        },
      )
      .catch(() => {
        if (!live) return;
        setRows([]);
        setFailed(true);
      });

    return () => {
      live = false;
    };
  }, [market.id]);

  const rollup = useMemo(() => sectorRollup(rows ?? []), [rows]);
  const publishable = useMemo(() => rollup.filter(sectorMeetsBar), [rollup]);
  const totals = useMemo(
    () => ({
      buys: publishable.reduce((n, r) => n + r.buys, 0),
      value: publishable.reduce((n, r) => n + r.value, 0),
      companies: publishable.reduce((n, r) => n + r.companies, 0),
      alphaCount: publishable.reduce((n, r) => n + r.alphaCount, 0),
    }),
    [publishable],
  );

  // One dot per disclosed buy, from the same population the rollup counts.
  const buys = useMemo(
    () =>
      toSectorBuys(rows ?? [], new Set(publishable.map((r) => r.sector.slug))),
    [rows, publishable],
  );

  // A page total can be one company wearing eleven sectors' clothes: the US
  // year to 2026-09 is 65% a single waste-management issuer. Same disclosure
  // the sector rows make about themselves, made about the page.
  const issuer = useMemo(() => {
    const byTicker = new Map<string, { value: number; company: string }>();

    for (const b of buys) {
      if (!b.ticker) continue;
      const agg = byTicker.get(b.ticker);

      if (agg) agg.value += b.value;
      else byTicker.set(b.ticker, { value: b.value, company: b.company });
    }
    const top = [...byTicker.values()].sort((a, b) => b.value - a.value)[0];

    if (!top || totals.value <= 0) return null;

    return { company: top.company, share: top.value / totals.value };
  }, [buys, totals.value]);

  const hasData = publishable.length > 0;
  const marketId = market.id === "US" ? "us" : "uk";
  const locale = market.id === "US" ? "en-US" : "en-GB";

  // Omitted rather than placeholdered: a figure slot states a number or it
  // isn't there. `money` renders a zero total as an em dash.
  const figures: StageFigure[] = !hasData
    ? []
    : [
        ...(totals.value > 0
          ? [{ k: "Bought", v: money(totals.value, market.symbol) }]
          : []),
        { k: "Purchases", v: String(totals.buys) },
        { k: "Companies", v: String(totals.companies) },
        // "of 11", never a bare 11: the sectors on this page are the ones that
        // cleared the bar, not a whole anybody can hold.
        { k: "Sectors", v: `${publishable.length} of ${rollup.length}` },
      ];

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={marketId}
        placement="sectors_rail"
        ukHeading="Start investing"
      />
      <SeoPageShell
        cta={{
          body: sectorCta().body,
          gaLabel: "Sectors index",
          headline: sectorCta().headline,
          marketId,
        }}
        eyebrow="Sector hub"
        hero={
          rows === null || hasData ? (
            <SectorsStage
              buys={buys}
              header={
                <>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                    Sector hub
                  </p>
                  {/* Light, not bold: the object is the emphasis, the title
                      names it. */}
                  <h1 className="mt-3 max-w-[22ch] text-balance text-[34px] font-normal leading-[1.02] tracking-[-0.03em] text-white sm:text-[46px] lg:text-[54px]">
                    {market.label} insider buying by sector
                  </h1>
                  <p className="mt-5 max-w-[58ch] text-[15px] leading-[1.55] tracking-[-0.004em] text-white/65 sm:text-[16px]">
                    Where {market.noun} have been{" "}
                    <Link
                      className="text-white/85 underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white/70"
                      to="/learn/open-market-buy"
                    >
                      buying their own shares
                    </Link>{" "}
                    over the last twelve months, and how those buys have
                    performed against the market since they were disclosed.
                  </p>
                  <StageFigures reserve items={figures} />
                  <StageNotice marketId={market.id} />
                  {issuer && issuer.share > CONCENTRATION_THRESHOLD ? (
                    <p className="mt-3 max-w-[48ch] text-[12.5px] leading-[1.5] text-white/60">
                      {Math.round(issuer.share * 100)}% of that is{" "}
                      {cleanCompanyName(issuer.company)} alone.
                    </p>
                  ) : null}
                </>
              }
              linking={linking}
              locale={locale}
              market={market}
              rows={publishable}
            />
          ) : undefined
        }
        loading={rows === null}
        skeleton={<SeoSkeleton rows={11} variant="ruled-list" />}
        standfirst={
          <>
            Where {market.noun} have been buying their own shares over the last
            twelve months, and how those buys have performed against the market
            since they were disclosed.
          </>
        }
        standfirstSize="lede"
        title={<>{market.label} insider buying by sector</>}
        titleInHero={rows === null || hasData}
        width="wide"
      >
        {/* Under the stage: the truncation caveat, which is about this load
            rather than about the archive. The tracking line moved into the
            stage header, directly under the figures it qualifies — at 45%
            opacity below a 600px object nobody was reading it. */}
        <div className="mt-4 max-w-[62ch]">
          {/* The empty and error states mount no stage, so there is no header
              for the in-stage notice to sit in. The page still has to say how
              far back it holds. */}
          {rows === null || hasData ? null : (
            <TrackingNotice marketId={market.id} />
          )}
          {!complete && !failed && (
            <p className={`mt-3 ${CAVEAT}`}>
              We couldn’t load the whole period, so these totals may be missing
              older purchases.
            </p>
          )}
        </div>

        {failed ? (
          // Not "there is nothing here" — we don't know that. The onward cards
          // below still render, so the reader has somewhere to go.
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            We couldn’t load the filings just now, so there’s no breakdown to
            show. That’s a fault at our end rather than a quiet twelve months.
            Try again shortly.
          </p>
        ) : !hasData ? (
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
            <div className="mt-6 max-w-[62ch]">
              {/* "Median alpha" heads a column three lines below this, and
                  this is the only place it is explained. */}
              <p className={R.body}>
                Median alpha, in the column below, is the middle buy’s return
                against the market since it was disclosed.
              </p>
              <p className={`mt-2 ${R.body}`}>
                {totals.alphaCount} of {totals.buys} buys have a performance
                mark; the medians are taken from those.
              </p>
              {/* The index's thesis in numbers, and the page's meta
                  description, from one function in shared/sectors.js. */}
              <p className={`mt-4 ${R.body}`}>
                {indexLeadSentence(publishable, market.id)}
              </p>
            </div>

            <div className="mt-8">
              <SectorComparisonHeader />
              <ul className={`border-t ${R.rule}`}>
                {publishable.map((row) => (
                  <li
                    key={row.sector.slug}
                    className={`border-b ${R.rule} transition-opacity ${
                      activeSlug && activeSlug !== row.sector.slug
                        ? "opacity-45"
                        : ""
                    }`}
                  >
                    {/* The padding belongs to the link, not the list item —
                        with it on the `li` the hover well was a strip through
                        the middle of the row and the tap target stopped short
                        of the rule. */}
                    <Link
                      className="-mx-3 block rounded-lg px-3 py-4 outline-none transition-colors hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:hover:bg-white/[0.03]"
                      to={sectorPath(row.sector.slug)}
                      onBlur={() => setActiveSlug(null)}
                      onFocus={() => setActiveSlug(row.sector.slug)}
                      onMouseEnter={() => setActiveSlug(row.sector.slug)}
                      onMouseLeave={() => setActiveSlug(null)}
                    >
                      <SectorComparisonRow market={market} row={row} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <SeoSection
          aside="What the aggregate is, and what it isn’t."
          title="How to read a sector total"
        >
          <div className="max-w-[62ch]">
            <p className={R.body}>
              Each sector here is an aggregate of individual disclosures: every
              open-market purchase {market.noun} made in their own companies,
              sorted by the sector we classify the issuer into. It isn’t a fund
              or an index. Nobody can buy a sector the way this page adds one
              up.
            </p>
            <p className={`mt-3 ${R.body}`}>
              A sector needs {MIN_BUYS} disclosed purchases in the window before
              it gets a breakdown. Below that one filing moves every figure, so
              the sectors under the bar are counted in the figures above and
              left off the ranking.
            </p>
            <p className={`mt-3 ${R.body}`}>
              Performance is measured from the date a purchase was disclosed,
              not the date it was made, because that is the first moment a
              reader could have acted on it.{" "}
              <Link
                className="underline underline-offset-4"
                to="/learn/open-market-buy"
              >
                What counts as an open-market buy
              </Link>{" "}
              and{" "}
              <Link className="underline underline-offset-4" to="/how-it-works">
                how we track the filings
              </Link>{" "}
              are set out in full.
            </p>
          </div>
        </SeoSection>

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
                  "What the filings mean, closed periods, clusters, open-market buys.",
              },
            ]}
          />
        </SeoSection>
      </SeoPageShell>
    </DefaultLayout>
  );
}
