/** Best-performing insider buys — /best-performing-buys.
 *
 *  The ranking rules and the published methodology live in shared/boards.js so
 *  the crawler pre-render and the hydrated page can't disagree about the order,
 *  and so the words describing the rules sit next to the code enforcing them.
 *
 *  Three decisions this page turns on, all of them in shared/boards.js and all
 *  of them stated on the page rather than applied quietly:
 *
 *    - It ranks ALPHA, not return. A board ranked on return in a rising market
 *      is a list of whoever bought earliest.
 *    - It has a £50,000 floor. Without one the top of the board is a £1,958
 *      purchase in an illiquid microcap, because token buys swing furthest.
 *    - It caps entries per company. The UK top twelve by alpha is otherwise
 *      three Hays rows and three Robert Walters rows — a recruitment rally
 *      wearing the clothes of a stock-picking leaderboard.
 *
 *  Rolling twelve months only, with no year archive. A calendar-year board of
 *  performance would freeze a mark taken on 31 December and then keep serving
 *  it as though it were still true.
 *
 *  Drawn, not just listed (2026-09-05). All three of those decisions used to
 *  be prose under a table; the hero now draws them. The board's 25 discs sit
 *  in the field they were picked from, the floor is a wall with the purchases
 *  it holds back behind it, and the four stat tiles moved into the message
 *  column beside the object — where "Ranked from 283" is the denominator the
 *  caption uses rather than a number in a box. Composition is still
 *  SeoPageShell's, which keeps the app band after the last content section.
 */
import type { RelatedCard } from "@/components/seo/related-cards";
import type { StageFigure } from "@/components/boards/stage-figures";
import type { Linking } from "@/components/boards/board-model";

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  rankByAlpha,
  summarise,
  MIN_BOARD_VALUE,
  PERFORMANCE_METHODOLOGY,
  TOP_N,
} from "../../shared/boards.js";
import { buyAlpha } from "../../shared/leaderboard.js";

import { R, useSectorMarket } from "@/components/sector-ui";
import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { RelatedCards } from "@/components/seo/related-cards";
import { TrackingNotice } from "@/components/seo/tracking-notice";
import { performanceBoardCta } from "@/components/seo/cta-copy";
import { LogoDevAttribution } from "@/components/company-logo";
import { displayTicker } from "@/lib/company";
import { FilingRow } from "@/components/boards/filing-row";
import { useBoardFeed } from "@/components/boards/board-feed";
import { toBoardRows } from "@/components/boards/board-model";
import { BENCHMARK } from "@/components/boards/board-prices";
import { StageFigures } from "@/components/boards/stage-figures";
import { exactMoney } from "@/components/boards/stage-marks";
import { BestPerformingStage } from "@/components/boards/stages/best-performing-stage";

const CAVEAT =
  "rounded-xl bg-risk/[0.08] px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-foreground/70";

const CROSS_LINKS: RelatedCard[] = [
  {
    to: "/biggest-buys",
    title: "The biggest buys",
    description: "Ranked by what was spent",
  },
  {
    to: "/cluster-buys",
    title: "Cluster buying",
    description: "Where several bought at once",
  },
  { to: "/sectors", title: "Buying by sector", description: "Where it went" },
  { to: "/learn", title: "Glossary", description: "The filings explained" },
];

function signedPp(ratio: number | null): string {
  if (ratio == null) return "n/a";

  return `${ratio > 0 ? "+" : ""}${(ratio * 100).toFixed(1)}pp`;
}

export default function BestPerformingBuysPage() {
  const market = useSectorMarket();
  const { rows, complete } = useBoardFeed(market.id);
  const [activeId, setActiveId] = useState<string | null>(null);
  const linking: Linking = useMemo(
    () => ({ activeId, setActiveId }),
    [activeId],
  );

  const { ranked, suppressed, considered } = useMemo(() => {
    const r = rankByAlpha(rows ?? [], market.id, TOP_N);

    return {
      ranked: r.rows,
      suppressed: r.suppressed,
      considered: r.considered,
    };
  }, [rows, market.id]);

  const board = useMemo(
    () => (rows === null ? null : toBoardRows(ranked)),
    [rows, ranked],
  );
  const summary = useMemo(() => summarise(ranked), [ranked]);

  // FilingRow still takes the meter's scale even with the bar off: the stage
  // above the list draws the same comparison at a scale a 3px bar can't match.
  const topAlpha = useMemo(
    () => (ranked.length > 0 ? (buyAlpha(ranked[0]) ?? 0) : 0),
    [ranked],
  );

  const marketId = market.id === "US" ? "us" : "uk";
  const locale = market.id === "US" ? "en-US" : "en-GB";
  const bench = BENCHMARK[market.id];
  // The floor in full. "£50k" is the rounded form of a published editorial
  // line a reader is meant to be able to check against the methodology, which
  // states £50,000.
  const floor = exactMoney(MIN_BOARD_VALUE, market.symbol, locale);
  const hasBoard = board !== null && board.length > 0;

  // Omitted, never placeholdered: a slot with nothing in it says nothing here,
  // and the caption below the stage says why in words.
  const figures: StageFigure[] = [];

  if (hasBoard) {
    const best = buyAlpha(ranked[0]);

    if (best != null) {
      figures.push({
        k: "Best on the board",
        v: signedPp(best),
        tone: best > 0 ? "pos" : best < 0 ? "neg" : undefined,
      });
    }
    if (summary.alphaCount > 0 && summary.medianAlpha != null) {
      figures.push({
        k: "Median of the board",
        v: signedPp(summary.medianAlpha),
      });
    }
    figures.push({ k: "Companies", v: String(summary.companies) });
    // Truncated window: the qualifier goes in the label, so the figure stays a
    // figure and still can't be read as a total.
    figures.push({
      k: complete ? "Ranked from" : "Ranked from at least",
      v: String(considered),
    });
  }

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={marketId}
        placement="performance_board_rail"
        ukHeading="Start investing"
      />
      <SeoPageShell
        cta={{
          body: performanceBoardCta.body,
          gaLabel: "Best-performing buys",
          headline: performanceBoardCta.headline,
          marketId,
        }}
        eyebrow="Leaderboard"
        hero={
          rows === null || hasBoard ? (
            <BestPerformingStage
              benchmark={bench.label}
              board={board}
              complete={complete}
              considered={considered}
              dealings={rows}
              header={
                <>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                    Leaderboard
                  </p>
                  {/* Light, not bold: the object is the emphasis, the title
                      names it. */}
                  <h1 className="mt-3 max-w-[22ch] text-balance text-[34px] font-normal leading-[1.02] tracking-[-0.03em] text-white sm:text-[46px] lg:text-[54px]">
                    The best-performing {market.label} insider buys of the last
                    year
                  </h1>
                  <p className="mt-5 max-w-[58ch] text-[15px] leading-[1.55] tracking-[-0.004em] text-white/65 sm:text-[16px]">
                    The purchases {market.noun} made in their own companies that
                    have since beaten the market by the widest margin, measured
                    as{" "}
                    <Link
                      className="text-white/85 underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white/70"
                      to="/learn/what-a-director-buy-signals"
                    >
                      alpha
                    </Link>
                    , the share’s own move minus the index’s over the same
                    period, so a rising market doesn’t flatter the whole board.
                  </p>
                  <StageFigures items={figures} reserve={rows === null} />
                </>
              }
              linking={linking}
              locale={locale}
              marketId={market.id}
              symbol={market.symbol}
            />
          ) : undefined
        }
        loading={rows === null}
        skeleton={<SeoSkeleton rows={TOP_N} variant="ranked-board" />}
        standfirst={
          hasBoard || rows === null ? undefined : (
            <>
              The purchases {market.noun} made in their own companies that have
              since beaten the market by the widest margin, measured as alpha,
              the share’s own move minus the index’s over the same period.
            </>
          )
        }
        title={
          <>The best-performing {market.label} insider buys of the last year</>
        }
        titleInHero={rows === null || hasBoard}
        width="wide"
      >
        {/* Under the stage: the rule, the tracking caveat, the truncation
            caveat. Small print belongs outside the object. */}
        <div className="mt-4 max-w-[62ch]">
          <a
            className="inline-block text-[12.5px] font-medium leading-[1.5] text-brand-brown underline-offset-4 hover:underline dark:text-brand-tan"
            href="#methodology"
          >
            Ranked on alpha, with a {floor} floor. How this is built ↓
          </a>
          <TrackingNotice className="mt-2.5" />
          {!complete && ranked.length > 0 && (
            <p className={`mt-3 ${CAVEAT}`}>
              We couldn’t load the whole period, so this ranking may be missing
              older purchases.
            </p>
          )}
        </div>

        {/* An empty board and a board we couldn't fetch are the same shape and
            two different statements. */}
        {ranked.length === 0 && !complete ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            We couldn’t load the board just now. It’s a network problem rather
            than an empty period. Try a refresh in a moment.
          </p>
        ) : ranked.length === 0 ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            No purchases in this period clear both the {floor} floor and the
            need for a performance mark.{" "}
            <a className="underline underline-offset-4" href="#methodology">
              What qualifies
            </a>{" "}
            is set out below. A purchase appears once it has been priced against
            the index, which takes a few days after disclosure.
          </p>
        ) : (
          <>
            <div
              aria-hidden
              className="mt-8 grid grid-cols-[1.5rem_minmax(0,1fr)_5.5rem] gap-x-3 pb-2.5 text-[11px] leading-[1.4] text-foreground/50 sm:grid-cols-[2rem_minmax(0,1fr)_9rem] sm:gap-x-4"
            >
              <span />
              <span>Company, buyer and what they spent</span>
              <span className="text-right">Alpha since disclosure</span>
            </div>

            <ol className={`border-t ${R.rule}`}>
              {ranked.map((d, i) => (
                <FilingRow
                  key={d.id ?? i}
                  showRole
                  deal={d}
                  linking={linking}
                  locale={locale}
                  marketId={market.id}
                  meter={false}
                  meterMax={topAlpha}
                  meterValue={buyAlpha(d) ?? 0}
                  position={i + 1}
                  symbol={market.symbol}
                />
              ))}
            </ol>

            {suppressed.size > 0 && (
              <p className={`mt-4 ${CAVEAT}`}>
                Held back so one company can’t fill the board:{" "}
                {[...suppressed.entries()]
                  .map(([ticker, n]) => `${displayTicker(ticker)} (${n} more)`)
                  .join(", ")}
                .
              </p>
            )}

            {/* The floor is the single most consequential rule here and it is
                invisible in the table, so it is stated under it as well as in
                the methodology below. */}
            <p className={`mt-4 ${CAVEAT}`}>
              Purchases under {floor} are excluded. A token buy in a thinly
              traded company moves much further than a real one, and without the
              floor this board fills with sums too small for the buyer to
              notice.
            </p>
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
            {[
              ...PERFORMANCE_METHODOLOGY,
              "The stage in the header draws every purchase that qualified, not just the 25 listed. Each dot is one eligible purchase with a mark, set at its alpha; the logos are the board. By amount, the same marks move to what was spent, the floor is drawn as a wall, and the purchases behind it are the ones it holds back.",
            ].map((line: string) => (
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
              to="/learn/what-a-director-buy-signals"
            >
              what a director buy signals
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
