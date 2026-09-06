/** Most-active companies — /most-active-companies.
 *
 *  Ranks COMPANIES, which is what lets it exist at all: a "most active
 *  directors" board would be a persistent profile of a named individual
 *  assembled by us, and that is the surface both previous plans deferred until
 *  the privacy handling is settled. Ranking issuers asks a related question and
 *  raises none of it.
 *
 *  The interesting column is the one a filing count alone can't show. Sixteen
 *  purchases from one determined chief executive and sixteen from nine
 *  different people are the same number and different stories, so distinct
 *  insiders sits next to the count and breaks ties ahead of value.
 *
 *  Drawn, not just listed (2026-09-05). The hero carries the board as one
 *  object — 25 rows, one pip per purchase, grouped into a run per insider —
 *  and re-sorts on distinct insiders so the ranks visibly scramble. The stat
 *  tiles went with their unlabelled meter mark, and the meter bar under each
 *  row went with them: it drew the filing count a second time and read as a
 *  divider, where the same pips draw the count AND who made it. The headline
 *  figures moved into the message column beside the stage. Composition is
 *  still SeoPageShell's, which keeps the app band after the last content
 *  section.
 */
import type { CompanyActivity } from "../../shared/boards";
import type { RelatedCard } from "@/components/seo/related-cards";
import type { Linking } from "@/components/boards/board-model";

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  rankCompanies,
  ACTIVITY_METHODOLOGY,
  MIN_COMPANY_FILINGS,
  TOP_N,
} from "../../shared/boards.js";

import { money, R, useSectorMarket } from "@/components/sector-ui";
import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { RelatedCards } from "@/components/seo/related-cards";
import { StageFigures } from "@/components/boards/stage-figures";
import { TrackingNotice } from "@/components/seo/tracking-notice";
import { activityBoardCta } from "@/components/seo/cta-copy";
import { CompanyLogo, LogoDevAttribution } from "@/components/company-logo";
import { TickerPill } from "@/components/ticker-pill";
import { shortDate } from "@/components/market/market-utils";
import { cleanCompanyName, companyPath, displayTicker } from "@/lib/company";
import { AlphaBadge } from "@/components/boards/filing-row";
import { useBoardFeed } from "@/components/boards/board-feed";
import { BENCHMARK } from "@/components/boards/board-prices";
import {
  activityTotals,
  breadthWords,
  ActivityStage,
  PipRun,
} from "@/components/boards/stages/activity-stage";

const CAVEAT =
  "rounded-xl bg-risk/[0.08] px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-foreground/70";

const ROW_LINK =
  "-mx-2 block rounded-lg px-2 py-3.5 outline-none transition-colors hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:hover:bg-white/[0.03]";

const ROW_GRID =
  "grid grid-cols-[1.5rem_minmax(0,1fr)_5.5rem] items-start gap-x-3 sm:grid-cols-[2rem_minmax(0,1fr)_9rem] sm:gap-x-4";

const CROSS_LINKS: RelatedCard[] = [
  {
    to: "/cluster-buys",
    title: "Cluster buying",
    description: "Where several bought at once",
  },
  {
    to: "/biggest-buys",
    title: "The biggest buys",
    description: "Ranked by what was spent",
  },
  { to: "/companies", title: "Browse companies", description: "Every issuer" },
  { to: "/sectors", title: "Buying by sector", description: "Where it went" },
];

export default function MostActiveCompaniesPage() {
  const market = useSectorMarket();
  const { rows, complete } = useBoardFeed(market.id);
  const [activeId, setActiveId] = useState<string | null>(null);
  const linking: Linking = useMemo(
    () => ({ activeId, setActiveId }),
    [activeId],
  );

  const { ranked, qualifying } = useMemo(() => {
    const r = rankCompanies(rows ?? [], market.id, TOP_N);

    return { ranked: r.rows, qualifying: r.qualifying };
  }, [rows, market.id]);

  const totals = useMemo(() => activityTotals(ranked), [ranked]);

  const marketId = market.id === "US" ? "us" : "uk";
  const locale = market.id === "US" ? "en-US" : "en-GB";
  const hasBoard = ranked.length > 0;

  // Every slot states a number we hold or is left out. "Widest board" is a
  // real 1 when one person did all the buying, and absent when no filer was
  // named at all — the two are different facts and neither is a dash. The
  // value floor is formatMoney's: under 500 it prints "0k", which is a real
  // number formatted into a claim about an empty set.
  const figures = hasBoard
    ? [
        { k: "Companies", v: String(ranked.length) },
        { k: "Purchases", v: String(totals.filings) },
        ...(totals.broadest > 0
          ? [{ k: "Widest board", v: String(totals.broadest) }]
          : []),
        ...(totals.value >= 500
          ? [{ k: "Combined value", v: money(totals.value, market.symbol) }]
          : []),
      ]
    : [];

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={marketId}
        placement="activity_board_rail"
        ukHeading="Start investing"
      />
      <SeoPageShell
        cta={{
          body: activityBoardCta.body,
          gaLabel: "Most-active companies",
          headline: activityBoardCta.headline,
          marketId,
        }}
        eyebrow="Leaderboard"
        hero={
          rows === null || hasBoard ? (
            <ActivityStage
              benchmark={BENCHMARK[market.id].label}
              header={
                <>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                    Leaderboard
                  </p>
                  <h1 className="mt-3 max-w-[22ch] text-balance text-[34px] font-normal leading-[1.02] tracking-[-0.03em] text-white sm:text-[46px] lg:text-[54px]">
                    {market.label} companies with the most insider buying
                  </h1>
                  <p className="mt-5 max-w-[58ch] text-[15px] leading-[1.55] tracking-[-0.004em] text-white/65 sm:text-[16px]">
                    The companies whose own {market.noun} bought most often over
                    the last twelve months, with how many different people were
                    buying, because one person buying twelve times and twelve
                    people buying once are the same number and not the same
                    signal.
                  </p>
                  <StageFigures reserve items={figures} />
                </>
              }
              linking={linking}
              locale={locale}
              rows={rows === null ? null : ranked}
              symbol={market.symbol}
            />
          ) : undefined
        }
        loading={rows === null}
        skeleton={<SeoSkeleton rows={TOP_N} variant="ranked-board" />}
        standfirst={
          rows === null || hasBoard ? undefined : (
            <>
              The companies whose own {market.noun} bought most often over the
              last twelve months, with how many different people were buying.
            </>
          )
        }
        title={<>{market.label} companies with the most insider buying</>}
        titleInHero={rows === null || hasBoard}
        width="wide"
      >
        {/* Under the stage: the rule, the tracking caveat, the truncation
            caveat, and the denominator the totals are drawn from. Small print
            belongs outside the object. */}
        <div className="mt-4 max-w-[62ch]">
          <a
            className="inline-block text-[12.5px] font-medium leading-[1.5] text-brand-brown underline-offset-4 hover:underline dark:text-brand-tan"
            href="#methodology"
          >
            Ranked on purchases, then on how many people made them ↓
          </a>
          <TrackingNotice className="mt-2.5" />
          {!complete && hasBoard && (
            // Truncation is invisible unless you say so: the board still
            // renders and still looks complete.
            <p className={`mt-3 ${CAVEAT}`}>
              We couldn’t load the whole period, so these counts may be missing
              older purchases.
            </p>
          )}
          {hasBoard ? (
            <p className={`mt-3 ${R.body}`}>
              {qualifying} companies reached {MIN_COMPANY_FILINGS} or more
              qualifying purchases in the last twelve months; the{" "}
              {ranked.length} busiest are listed. Totals cover those, not the
              whole market.
            </p>
          ) : null}
        </div>

        {/* An empty board and a board we couldn't fetch are the same shape and
            two different statements. Only one of them is a fact about the
            market. */}
        {!hasBoard && !complete ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            We couldn’t load the board just now. It’s a network problem rather
            than an empty period. Try a refresh in a moment.
          </p>
        ) : !hasBoard ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            No company in this period reached {MIN_COMPANY_FILINGS} qualifying
            purchases.{" "}
            <a className="underline underline-offset-4" href="#methodology">
              What qualifies
            </a>{" "}
            is set out below. The board covers a rolling twelve months and
            rebuilds as new disclosures arrive.
          </p>
        ) : (
          <>
            <div
              aria-hidden
              className={`mt-8 pb-2.5 text-[11px] leading-[1.4] text-foreground/50 ${ROW_GRID}`}
            >
              <span />
              <span>Company, buyers and what they spent</span>
              <span className="text-right">Purchases</span>
            </div>

            <ol className={`border-t ${R.rule}`}>
              {ranked.map((row, i) => (
                <ActivityRow
                  key={row.ticker || i}
                  linking={linking}
                  locale={locale}
                  position={i + 1}
                  row={row}
                  symbol={market.symbol}
                />
              ))}
            </ol>
          </>
        )}

        <SeoSection
          aside={
            <p className="text-[12px] leading-[1.5] text-foreground/45">
              These rules decide the order, and they live in the same module
              that ranks the board.
            </p>
          }
          id="methodology"
          title="How this is put together"
          variant="rail"
        >
          <ul className="space-y-2.5">
            {ACTIVITY_METHODOLOGY.map((line: string) => (
              <li key={line} className={`flex gap-2.5 ${R.body}`}>
                <span
                  aria-hidden
                  className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-foreground/30"
                />
                <span className="max-w-[62ch]">{line}</span>
              </li>
            ))}
          </ul>

          <p className="mt-5 max-w-[62ch] text-[13px] leading-[1.6] text-foreground/60">
            More on the terms used here:{" "}
            <Link
              className="underline underline-offset-4"
              to="/learn/open-market-buy"
            >
              open-market buys
            </Link>
            ,{" "}
            <Link
              className="underline underline-offset-4"
              to="/learn/cluster-buying"
            >
              cluster buying
            </Link>
            , and{" "}
            <Link className="underline underline-offset-4" to="/learn">
              the rest of the glossary
            </Link>
            .
          </p>
        </SeoSection>

        <nav aria-label="More from ddbx" className="mt-9">
          <RelatedCards cols={2} items={CROSS_LINKS} />
        </nav>

        <LogoDevAttribution className="mt-10" />
      </SeoPageShell>
    </DefaultLayout>
  );
}

function ActivityRow({
  linking,
  locale,
  position,
  row,
  symbol,
}: {
  /** Shared with the stage, so hovering a row lights its pip run and the
   *  other way round. Keyed on the ticker: the stage's mark is a company. */
  linking: Linking;
  locale: string;
  position: number;
  row: CompanyActivity;
  symbol: string;
}) {
  const ticker = displayTicker(row.ticker);
  // One person filing repeatedly is a different story from a board acting
  // together, and it is the one thing this page can say that a filing count
  // cannot. So it is said in words, on the row, rather than left to the reader
  // to infer from two numbers.
  const breadth = breadthWords(row);
  const dimmed = linking.activeId != null && linking.activeId !== row.ticker;

  return (
    <li
      className={`border-b transition-opacity ${R.rule} ${dimmed ? "opacity-45" : ""}`}
      onMouseEnter={() => linking.setActiveId(row.ticker)}
      onMouseLeave={() => linking.setActiveId(null)}
    >
      <Link
        className={ROW_LINK}
        to={companyPath(row.ticker)}
        onBlur={() => linking.setActiveId(null)}
        onFocus={() => linking.setActiveId(row.ticker)}
      >
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
              <CompanyLogo size={28} ticker={row.ticker} />
              <span className="min-w-0 truncate text-[16px] font-semibold leading-[1.3] tracking-[-0.012em] text-foreground sm:text-[18px]">
                {cleanCompanyName(row.company) || ticker}
              </span>
              <TickerPill ticker={ticker} />
            </span>

            <span className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-[1.35] text-foreground/50">
              <span>{breadth}</span>
              <span aria-hidden className="opacity-40">
                ·
              </span>
              <span className="tabular-nums">{money(row.value, symbol)}</span>
              {row.lastDate ? (
                <>
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  <span className="tabular-nums">
                    last {shortDate(row.lastDate, locale)}
                  </span>
                </>
              ) : null}
              {row.peakCluster > 1 ? (
                <>
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  <span>clustered</span>
                </>
              ) : null}
              {row.alphaCount > 0 && (
                <>
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <AlphaBadge ratio={row.medianAlpha} />
                    <span>median since</span>
                  </span>
                </>
              )}
            </span>

            {/* One pip per purchase, grouped by insider — the same run the
                stage draws, at the row's scale. It belongs inside the content
                column, under the line that describes it: spanning the whole
                grid started the run under the rank numeral instead, which is
                a tally measured from a column it has nothing to do with. */}
            <PipRun className="mt-2 block text-foreground/55" row={row} />
          </span>

          <span className="text-right">
            <span className="text-[19px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-foreground sm:text-[26px]">
              <span className="sr-only">Purchases: </span>
              {row.filings}
            </span>
            <span className="mt-1.5 block text-[11px] leading-[1.3] text-foreground/45">
              {row.filings === 1 ? "purchase" : "purchases"}
            </span>
          </span>
        </div>
      </Link>
    </li>
  );
}
