/** Cluster buying — /cluster-buys.
 *
 *  The grouping rules and the published methodology live in shared/boards.js.
 *  Read the comment above `clusterEpisodes` before changing anything here: the
 *  `cluster` field is a per-row rolling annotation, not a cluster identity, and
 *  the two obvious ways to group it both overstate the result.
 *
 *  What the page states is `named` — the insiders it can actually list — and
 *  not the pipeline's own count, because a headline of six above five listed
 *  names reads as a defect whether or not it is one. `named` is computed with
 *  the same per-market floor the pipeline applies to co-buyers (£10,000 UK,
 *  $25,000 US), so this page and the cluster chip on every filing agree.
 *
 *  Drawn, not just listed (2026-09-05). The hero carries the board as one
 *  object: every episode is its company's logo ringed with one dot per named
 *  insider, filed into a column per insider count and then sent to a scatter
 *  of when the buying started against how many days it took. The four stat
 *  tiles went with it — "most insiders in one" is now the rightmost column,
 *  drawn and named, and the other three are figures in the message column
 *  beside the stage. The meter bar under each row went too: it measured rank
 *  within the board, which the ordinal in the gutter already states.
 *  Composition is still SeoPageShell's, which keeps the app band after the
 *  last content section.
 */
import type { ClusterEpisode } from "../../shared/boards";
import type { RelatedCard } from "@/components/seo/related-cards";
import type { Linking } from "@/components/boards/board-model";
import type { StageFigure } from "@/components/boards/stage-figures";

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  countsTowardCluster,
  rankClusters,
  CLUSTER_METHODOLOGY,
  TOP_N,
} from "../../shared/boards.js";
import { buyPerson } from "../../shared/leaderboard.js";

import { money, R, useSectorMarket } from "@/components/sector-ui";
import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { RelatedCards } from "@/components/seo/related-cards";
import { TrackingNotice } from "@/components/seo/tracking-notice";
import { clusterBoardCta } from "@/components/seo/cta-copy";
import { CompanyLogo, LogoDevAttribution } from "@/components/company-logo";
import { TickerPill } from "@/components/ticker-pill";
import { shortDate } from "@/components/market/market-utils";
import {
  cleanCompanyName,
  cleanInsiderName,
  companyPath,
  displayTicker,
} from "@/lib/company";
import { AlphaBadge } from "@/components/boards/filing-row";
import { useBoardFeed } from "@/components/boards/board-feed";
import { BENCHMARK } from "@/components/boards/board-prices";
import { StageFigures } from "@/components/boards/stage-figures";
import {
  ClusterStage,
  episodeId,
  spanLabel,
} from "@/components/boards/stages/cluster-stage";

const CAVEAT =
  "rounded-xl bg-risk/[0.08] px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-foreground/70";

const ROW_LINK =
  "-mx-2 block rounded-lg px-2 py-3.5 outline-none transition-colors hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:hover:bg-white/[0.03]";

const ROW_GRID =
  "grid grid-cols-[1.5rem_minmax(0,1fr)_5.5rem] items-start gap-x-3 sm:grid-cols-[2rem_minmax(0,1fr)_9rem] sm:gap-x-4";

const CROSS_LINKS: RelatedCard[] = [
  {
    to: "/learn/cluster-buying",
    title: "What a cluster means",
    description: "The concept, explained",
  },
  {
    to: "/biggest-buys",
    title: "The biggest buys",
    description: "Ranked by what was spent",
  },
  {
    to: "/best-performing-buys",
    title: "Best-performing buys",
    description: "Ranked by alpha",
  },
  {
    to: "/most-active-companies",
    title: "Most-active companies",
    description: "Where buying repeats",
  },
];

export default function ClusterBuysPage() {
  const market = useSectorMarket();
  const { rows, complete } = useBoardFeed(market.id);
  const [activeId, setActiveId] = useState<string | null>(null);
  const linking: Linking = useMemo(
    () => ({ activeId, setActiveId }),
    [activeId],
  );

  const { ranked, qualifying, soft, partial } = useMemo(() => {
    const r = rankClusters(rows ?? [], market.id, TOP_N);

    return {
      ranked: r.rows,
      qualifying: r.qualifying,
      soft: r.soft,
      partial: r.partial,
    };
  }, [rows, market.id]);

  const totals = useMemo(
    () => ({
      insiders: ranked.reduce((sum, e) => sum + e.named, 0),
      filings: ranked.reduce((sum, e) => sum + e.filings, 0),
      value: ranked.reduce((sum, e) => sum + e.value, 0),
    }),
    [ranked],
  );

  const marketId = market.id === "US" ? "us" : "uk";
  const locale = market.id === "US" ? "en-US" : "en-GB";
  const hasBoard = ranked.length > 0;
  const inHero = rows === null || hasBoard;

  // "Insiders named" is a sum across episodes and says so: the same director
  // buying in two of them counts in both, which is the right answer for a
  // board of events and the wrong one for a count of people. Combined value is
  // omitted rather than placeheld — formatMoney renders a zero as a dash, and
  // a dash in a figure slot means three different things.
  const figures: StageFigure[] = hasBoard
    ? [
        { k: "Clusters", v: String(ranked.length) },
        { k: "Insiders named", v: String(totals.insiders) },
        { k: "Purchases", v: String(totals.filings) },
        ...(totals.value > 0
          ? [{ k: "Combined value", v: money(totals.value, market.symbol) }]
          : []),
      ]
    : [];

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={marketId}
        placement="cluster_board_rail"
        ukHeading="Start investing"
      />
      <SeoPageShell
        cta={{
          body: clusterBoardCta.body,
          gaLabel: "Cluster buys",
          headline: clusterBoardCta.headline,
          marketId,
        }}
        eyebrow="Leaderboard"
        hero={
          inHero ? (
            <ClusterStage
              benchmark={BENCHMARK[market.id].label}
              episodes={rows === null ? null : ranked}
              header={
                <>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                    Leaderboard
                  </p>
                  {/* Light, not bold: the object is the emphasis, the title
                      names it. */}
                  <h1 className="mt-3 max-w-[24ch] text-balance text-[34px] font-normal leading-[1.02] tracking-[-0.03em] text-white sm:text-[46px] lg:text-[54px]">
                    Cluster buying, where several {market.label} insiders bought
                    at once
                  </h1>
                  <p className="mt-5 max-w-[58ch] text-[15px] leading-[1.55] tracking-[-0.004em] text-white/65 sm:text-[16px]">
                    Where several {market.noun} bought the same company within a
                    fortnight of each other. One insider buying is a person’s
                    opinion;{" "}
                    <Link
                      className="text-white/85 underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white/70"
                      to="/learn/cluster-buying"
                    >
                      a cluster
                    </Link>{" "}
                    is a board agreeing with itself, which is a different and
                    rarer thing.
                  </p>
                  <StageFigures reserve items={figures} />
                </>
              }
              linking={linking}
              locale={locale}
              noun={market.noun}
              symbol={market.symbol}
            />
          ) : undefined
        }
        loading={rows === null}
        skeleton={<SeoSkeleton rows={TOP_N} variant="ranked-board" />}
        standfirst={
          inHero ? undefined : (
            <>
              Where several {market.noun} bought the same company within a
              fortnight of each other. One insider buying is a person’s opinion;
              a cluster is a board agreeing with itself.
            </>
          )
        }
        title={
          <>
            Cluster buying, where several {market.label} insiders bought at once
          </>
        }
        titleInHero={inHero}
        width="wide"
      >
        {/* Under the stage: the rule, the tracking caveat, the truncation
            caveat. Small print belongs outside the object. */}
        <div className="mt-4 max-w-[62ch]">
          <a
            className="inline-block text-[12.5px] font-medium leading-[1.5] text-brand-brown underline-offset-4 hover:underline dark:text-brand-tan"
            href="#methodology"
          >
            A cluster is an event, not a company. How these are grouped ↓
          </a>
          <TrackingNotice className="mt-2.5" />
          {!complete && hasBoard && (
            <p className={`mt-3 ${CAVEAT}`}>
              We couldn’t load the whole period, so this ranking may be missing
              older clusters.
            </p>
          )}
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
            No clusters in this period meet the bar.{" "}
            <a className="underline underline-offset-4" href="#methodology">
              What counts as one
            </a>{" "}
            is set out below. The board covers a rolling twelve months, and a
            new cluster appears as soon as a second insider files within a
            fortnight of a first.
          </p>
        ) : (
          <>
            {/* The denominator, in prose rather than under a tile. "Widest",
                not "largest": rankClusters sorts on how many people bought,
                not on what they spent. */}
            <p className={`mt-6 max-w-[62ch] ${R.body}`}>
              {qualifying} clusters in the last twelve months can be shown in
              full; the {ranked.length} widest are listed. Totals cover those,
              not the whole market.
            </p>

            <div
              aria-hidden
              className={`mt-8 pb-2.5 text-[11px] leading-[1.4] text-foreground/50 ${ROW_GRID}`}
            >
              <span />
              <span>Company, who bought and when</span>
              <span className="text-right">Insiders buying</span>
            </div>

            <ol className={`border-t ${R.rule}`}>
              {ranked.map((episode, i) => (
                <ClusterRow
                  key={episodeId(episode)}
                  episode={episode}
                  linking={linking}
                  locale={locale}
                  marketId={market.id}
                  position={i + 1}
                  symbol={market.symbol}
                />
              ))}
            </ol>

            {(soft > 0 || partial > 0) && (
              <p className={`mt-4 ${CAVEAT}`}>
                {soft > 0 && (
                  <>
                    {soft} further {soft === 1 ? "episode" : "episodes"} met
                    only the softer thirty-day tier and{" "}
                    {soft === 1 ? "is" : "are"} not listed, two people buying a
                    month apart is common enough that ranking it would be
                    ranking coincidence.
                  </>
                )}
                {soft > 0 && partial > 0 ? " " : null}
                {partial > 0 && (
                  <>
                    {partial} more {partial === 1 ? "cluster" : "clusters"} had
                    buyers whose purchases fall outside the twelve months this
                    page covers, so {partial === 1 ? "it is" : "they are"} left
                    off rather than shown with fewer buyers than{" "}
                    {partial === 1 ? "it claims" : "they claim"}.
                  </>
                )}
              </p>
            )}
          </>
        )}

        <SeoSection
          aside={
            <p className="text-[12px] leading-[1.5] text-foreground/45">
              These rules decide what counts as a cluster, and they live in the
              same module that groups the board.
            </p>
          }
          id="methodology"
          title="How this is put together"
          variant="rail"
        >
          <ul className="space-y-2.5">
            {CLUSTER_METHODOLOGY.map((line: string) => (
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
              to="/learn/cluster-buying"
            >
              cluster buying
            </Link>
            ,{" "}
            <Link
              className="underline underline-offset-4"
              to="/learn/open-market-buy"
            >
              open-market buys
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

function ClusterRow({
  episode,
  linking,
  locale,
  marketId,
  position,
  symbol,
}: {
  episode: ClusterEpisode;
  /** Shared highlight with the stage above: hovering the row lights its
   *  constellation, and a row dims while another episode is active. */
  linking: Linking;
  locale: string;
  /** Decides the co-buyer floor — £10,000 UK, $25,000 US. */
  marketId: "UK" | "US";
  position: number;
  symbol: string;
}) {
  const ticker = displayTicker(episode.ticker);
  const id = episodeId(episode);
  // The buyers, in the order they filed. Named on the row rather than hidden
  // behind the count, because the count is only credible if the names are
  // there to check it against — that is the whole reason this page states
  // `named` instead of the pipeline's own figure.
  const buyers = useMemo(() => {
    const seen: string[] = [];

    for (const d of episode.rows) {
      // Only the buyers the headline counts. `episode.rows` holds every
      // purchase in the window including those below the market's co-buyer
      // floor, so listing all of them put seven names under a headline of six
      // at Savills — the same credibility failure as truncating the list, in
      // the opposite direction. The purchase count beside it still covers all
      // of them, which is why "6 insiders · 7 purchases" is a normal row.
      if (!countsTowardCluster(d, marketId)) continue;
      const name = cleanInsiderName(buyPerson(d) ?? "");

      if (name && !seen.includes(name)) seen.push(name);
    }

    return seen;
  }, [episode.rows, marketId]);

  const dimmed = linking.activeId != null && linking.activeId !== id;

  return (
    <li
      className={`border-b transition-opacity ${R.rule}${
        dimmed ? " opacity-45" : ""
      }`}
      onMouseEnter={() => linking.setActiveId(id)}
      onMouseLeave={() => linking.setActiveId(null)}
    >
      <Link className={ROW_LINK} to={companyPath(episode.ticker)}>
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
              <CompanyLogo size={28} ticker={episode.ticker} />
              <span className="min-w-0 truncate text-[16px] font-semibold leading-[1.3] tracking-[-0.012em] text-foreground sm:text-[18px]">
                {cleanCompanyName(episode.company) || ticker}
              </span>
              <TickerPill ticker={ticker} />
            </span>

            {/* The names, then the shape of the episode.
                NOT truncated. The count in the right-hand column is only
                credible because the names are there to check it against — that
                is the whole reason this page states what it can show instead of
                the pipeline's own figure. Truncating to one line gave Savills a
                headline of six above five names and an ellipsis, which is the
                exact impression the design exists to avoid. Six names wrap to
                two lines; that is cheaper than an unverifiable number. */}
            <span className="mt-1.5 block text-[12px] leading-[1.4] text-foreground/60">
              {buyers.join(", ")}
            </span>

            <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-[1.35] text-foreground/50">
              <span>
                {episode.filings}{" "}
                {episode.filings === 1 ? "purchase" : "purchases"}
              </span>
              <span aria-hidden className="opacity-40">
                ·
              </span>
              <span>{spanLabel(episode.spanDays)}</span>
              {episode.firstDate ? (
                <>
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  <span className="tabular-nums">
                    {shortDate(episode.firstDate, locale)}
                  </span>
                </>
              ) : null}
              <span aria-hidden className="opacity-40">
                ·
              </span>
              <span className="tabular-nums">
                {money(episode.value, symbol)}
              </span>
              {episode.alphaCount > 0 && (
                <>
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <AlphaBadge ratio={episode.medianAlpha} />
                    <span>median since</span>
                  </span>
                </>
              )}
            </span>
          </span>

          <span className="text-right">
            <span className="text-[19px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-foreground sm:text-[26px]">
              <span className="sr-only">Insiders buying: </span>
              {episode.named}
            </span>
            <span className="mt-1.5 block text-[11px] leading-[1.3] text-foreground/45">
              {episode.named === 1 ? "insider" : "insiders"}
            </span>
          </span>
        </div>
      </Link>
    </li>
  );
}
