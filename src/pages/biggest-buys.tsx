/** Biggest insider buys — /biggest-buys (rolling) and /biggest-buys/:year.
 *
 *  The ranking rules and the published methodology both live in
 *  shared/leaderboard.js so the crawler pre-render and the hydrated page can't
 *  disagree about the order, and so the words describing the rules sit next to
 *  the code enforcing them.
 *
 *  Note on people: this ranks TRANSACTIONS and names whoever filed each one,
 *  which is what the disclosure itself is. It deliberately does not rank
 *  PEOPLE — an "most active directors" board would be a persistent profile of
 *  an individual assembled by us, which is the surface the plan defers until
 *  the privacy handling is thought through.
 *
 *  The rolling board is canonical and the year boards are the archive, not the
 *  other way round: if /biggest-buys/2026 were canonical, the canonical target
 *  would move every January.
 *
 *  Drawn, not just listed (2026-09-05). The page used to be a well-typeset
 *  list with a 3px meter bar under each row that read as a divider. Now the
 *  hero carries the board as one object — the 25 purchases packed to scale,
 *  re-sorting into amount-against-outcome — the timeline shows when the
 *  buying happened, and every row draws the price since the buy. The
 *  headline figures moved into the message column beside the stage; the
 *  stat tiles with their unlabelled marks went. Composition is still
 *  SeoPageShell's, which keeps the app band after the last content section.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";
import type { RelatedCard } from "@/components/seo/related-cards";
import type { BoardRow, Linking } from "@/components/boards/board-model";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/20/solid";

import { fetchDealingsWindow } from "../../shared/dealings-feed.js";
import { filingPath } from "../../shared/filings.js";
import {
  archiveYears,
  leaderboardPath,
  moneyDelta,
  moneyPair,
  rankBuys,
  rollingAxisStart,
  rollingPeriodLabel,
  yearBounds,
  BOARD_EARLIEST_YEAR,
  METHODOLOGY,
  TOP_N,
} from "../../shared/leaderboard.js";
import { windowStart } from "../../shared/sectors.js";

import { money, R, useSectorMarket } from "@/components/sector-ui";
import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { RelatedCards } from "@/components/seo/related-cards";
import { API_BASE } from "@/lib/api";
import { companyPath, displayTicker } from "@/lib/company";
import { ClusterChip } from "@/components/cluster-chip";
import { CompanyLogo, LogoDevAttribution } from "@/components/company-logo";
import { DeltaBadge } from "@/components/market/market-row";
import { TickerPill } from "@/components/ticker-pill";
import { leaderboardCta } from "@/components/seo/cta-copy";
import { TrackingNotice } from "@/components/seo/tracking-notice";
import { BoardStage } from "@/components/boards/board-stage";
import {
  BoardTimeline,
  timelineFinding,
} from "@/components/boards/board-timeline";
import { BuySparkline } from "@/components/boards/buy-sparkline";
import { BENCHMARK, useBoardPrices } from "@/components/boards/board-prices";
import {
  dateLabel,
  signedPp,
  summarise,
  toBoardRows,
} from "@/components/boards/board-model";

/** Caveats are risk-amber wells rather than another line of grey small print.
 *  A truncated window and a held-back company both change how the ranking
 *  should be read, and they were set in the same 11px grey as the row meta —
 *  which is to say, invisible. */
const CAVEAT =
  "rounded-xl bg-risk/[0.08] px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-foreground/70";

/** The whole row is the link, not the company name inside it. */
const ROW_LINK =
  "-mx-2 block rounded-xl px-2 py-4 outline-none transition-colors hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:hover:bg-white/[0.03]";

/** Rank gutter, detail, the price since the buy, figures. The sparkline has
 *  its own column from `md`; on a phone it drops beneath the detail so the
 *  figures keep their width. */
const ROW_GRID =
  "grid grid-cols-[1.5rem_minmax(0,1fr)_6.5rem] items-center gap-x-3 md:grid-cols-[2rem_minmax(0,1fr)_12rem_15rem] md:gap-x-6 lg:grid-cols-[2.25rem_minmax(0,1fr)_14rem_17rem]";

/** Onward links, shaped as RelatedCards so the page has one card vocabulary. */
const CROSS_LINKS: RelatedCard[] = [
  {
    to: "/sectors",
    title: "Buying by sector",
    description: "Where the money went",
  },
  {
    to: "/companies",
    title: "Browse companies",
    description: "Every issuer we track",
  },
  {
    to: "/reports",
    title: "Monthly reports",
    description: "What each month did",
  },
  { to: "/learn", title: "Glossary", description: "The filings explained" },
];

/** 2nd, 3rd — capped by MAX_PER_COMPANY, so it never has to reach further. */
function ordinal(n: number): string {
  return n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function BiggestBuysPage() {
  const { year } = useParams<{ year?: string }>();
  const market = useSectorMarket();
  const bounds = useMemo(() => (year ? yearBounds(year) : null), [year]);
  const invalidYear = Boolean(year) && !bounds;

  const [rows, setRows] = useState<Array<Dealing | UsDealing> | null>(null);
  const [complete, setComplete] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const linking: Linking = useMemo(
    () => ({ activeId, setActiveId }),
    [activeId],
  );

  useEffect(() => {
    if (invalidYear) return;
    let live = true;
    const since = bounds ? bounds.since : windowStart(new Date());

    fetchDealingsWindow({
      apiBase: API_BASE,
      market: market.id,
      since,
      until: bounds ? bounds.until : null,
    })
      .then(
        (r: { dealings: Array<Dealing | UsDealing>; complete: boolean }) => {
          if (!live) return;
          setRows(r.dealings);
          setComplete(r.complete);
        },
      )
      // A rejected fetch used to land on the same state as a genuinely empty
      // board — rows `[]` with `complete` still true — so an outage published
      // "no qualifying open-market purchases in this period" as a fact about
      // the market. `complete: false` is the distinction the feed already draws
      // when it breaks out on a bad response; the catch has to draw it too.
      .catch(() => {
        if (!live) return;
        setRows([]);
        setComplete(false);
      });

    return () => {
      live = false;
    };
  }, [market.id, bounds, invalidYear]);

  const { ranked, suppressed } = useMemo(() => {
    const r = rankBuys(rows ?? [], market.id, TOP_N);

    return { ranked: r.rows, suppressed: r.suppressed };
  }, [rows, market.id]);

  const board = useMemo(
    () => (rows === null ? null : toBoardRows(ranked)),
    [rows, ranked],
  );
  const summary = useMemo(() => (board ? summarise(board) : null), [board]);
  const prices = useBoardPrices(board, market.id);

  const marketId = market.id === "US" ? "us" : "uk";
  const locale = market.id === "US" ? "en-US" : "en-GB";
  const bench = BENCHMARK[market.id];

  // The time axis: a year board runs its calendar year; the rolling board runs
  // from twelve months back or the first tracked month, whichever is later.
  const axisStart = bounds
    ? bounds.since
    : rollingAxisStart(windowStart(new Date()));
  const axisEnd = bounds ? bounds.until : todayIso();

  // Only offer years we actually hold filings for: a "Biggest buys of 2025"
  // link is a promise of an empty board, which is worse than no link at all.
  const years = archiveYears(BOARD_EARLIEST_YEAR, new Date());
  const archiveCards: RelatedCard[] = [
    ...(year
      ? [
          {
            to: "/biggest-buys",
            title: "The rolling board",
            description: "The current one.",
          },
        ]
      : []),
    ...years
      .filter((y) => String(y) !== year)
      .map((y) => ({
        to: leaderboardPath(y),
        title: `Biggest buys of ${y}`,
        description: `The largest disclosed purchases of the ${y} calendar year.`,
      })),
  ];

  // A year segment that isn't a year. It gets the full shell rather than a
  // paragraph on a blank page: the reader typed a URL and deserves to be told
  // where they are and handed the boards that do exist.
  if (invalidYear) {
    return (
      <DefaultLayout drawerRight>
        <SeoRail
          marketId={marketId}
          placement="biggest_buys_rail"
          ukHeading="Start investing"
        />
        <SeoPageShell
          crumbs={[
            { label: "Biggest buys", to: "/biggest-buys" },
            { label: "Not found" },
          ]}
          cta={false}
          eyebrow="Leaderboard"
          standfirst={
            <>
              ddbx has recorded {market.label} disclosures since{" "}
              {BOARD_EARLIEST_YEAR}, so there’s no board for that year. Here are
              the ones there is a board for.
            </>
          }
          title="That isn’t a year we have a board for"
        >
          <SeoSection title="Boards we hold">
            <RelatedCards cols={3} items={archiveCards} />
          </SeoSection>
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  const periodLabel = year ? `in ${year}` : rollingPeriodLabel(new Date());
  const cta = leaderboardCta(year);
  const hasBoard = board !== null && board.length > 0;
  const finding = hasBoard
    ? timelineFinding(board, axisStart, axisEnd, market.symbol, locale)
    : null;

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={marketId}
        placement="biggest_buys_rail"
        ukHeading="Start investing"
      />
      <SeoPageShell
        crumbs={
          year
            ? [{ label: "Biggest buys", to: "/biggest-buys" }, { label: year }]
            : undefined
        }
        cta={{
          body: cta.body,
          gaLabel: year ? `Biggest buys · ${year}` : "Biggest buys",
          headline: cta.headline,
          marketId,
        }}
        eyebrow="Leaderboard"
        loading={rows === null}
        notice={
          <>
            {/* The board's own figures, beside the stage that draws them. */}
            {summary && hasBoard ? (
              <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    k: "Spent",
                    v: money(summary.total, market.symbol),
                    tone: "",
                  },
                  { k: "Purchases", v: String(board!.length), tone: "" },
                  { k: "Companies", v: String(summary.companies), tone: "" },
                  {
                    k: "Median alpha",
                    v: signedPp(summary.medianAlpha),
                    tone:
                      summary.medianAlpha == null
                        ? ""
                        : summary.medianAlpha > 0
                          ? "text-positive"
                          : summary.medianAlpha < 0
                            ? "text-negative"
                            : "",
                  },
                ].map((f) => (
                  <div key={f.k}>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/50">
                      {f.k}
                    </dt>
                    <dd
                      className={`mt-1 text-[24px] font-semibold leading-none tracking-[-0.02em] ${f.tone || "text-foreground"}`}
                    >
                      {f.v}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <a
              className="mt-5 inline-block text-[12.5px] font-medium leading-[1.5] text-brand-brown underline-offset-4 hover:underline dark:text-brand-tan"
              href="#methodology"
            >
              Only open-market purchases count. How we rank these ↓
            </a>
            <TrackingNotice className="mt-2.5" />
            {!complete && ranked.length > 0 && (
              // Truncation is invisible unless you say so: the board still
              // renders and still looks complete. Better a caveat than a wrong
              // answer presented as a right one.
              <p className={`mt-3 ${CAVEAT}`}>
                We couldn’t load the whole period, so this ranking may be
                missing older purchases.
              </p>
            )}
          </>
        }
        skeleton={<SeoSkeleton rows={TOP_N} variant="ranked-board" />}
        stage={
          rows === null || hasBoard ? (
            <BoardStage
              benchmark={bench.label}
              linking={linking}
              locale={locale}
              rows={board}
              symbol={market.symbol}
            />
          ) : undefined
        }
        standfirst={
          <>
            The largest{" "}
            <Link
              className="underline decoration-foreground/25 underline-offset-4 transition-colors hover:decoration-foreground/60"
              to="/learn/open-market-buy"
            >
              open-market purchases
            </Link>{" "}
            {market.noun} made in their own companies, ranked by what they
            spent, with how each has performed against the market since it was
            disclosed.
          </>
        }
        standfirstSize="lede"
        title={
          <>
            The biggest {market.label} insider buys {periodLabel}
          </>
        }
        width="wide"
      >
        {/* An empty board and a board we couldn't fetch are the same shape and
            two different statements. Only one of them is a fact about the
            market, and stating it when the API is down tells a reader there was
            no insider buying this period. */}
        {ranked.length === 0 && !complete ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            We couldn’t load the board just now. It’s a network problem rather
            than an empty period. Try a refresh in a moment.
          </p>
        ) : ranked.length === 0 ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            No qualifying open-market purchases in this period.{" "}
            <a className="underline underline-offset-4" href="#methodology">
              What makes a purchase qualify
            </a>{" "}
            is set out below
            {year ? (
              <>
                , or see{" "}
                <Link
                  className="underline underline-offset-4"
                  to="/biggest-buys"
                >
                  the rolling board
                </Link>
              </>
            ) : null}
            .
          </p>
        ) : board ? (
          <>
            <SeoSection
              aside={
                finding ? (
                  <p className="max-w-[64ch] text-[13.5px] leading-[1.55] text-foreground/70">
                    <span className="font-semibold text-foreground">
                      {finding.text}
                    </span>{" "}
                    The shaded span is the busiest stretch. Hover a dot to find
                    it on the board.
                  </p>
                ) : undefined
              }
              title="When they bought"
            >
              <BoardTimeline
                end={axisEnd}
                linking={linking}
                locale={locale}
                rows={board}
                start={axisStart}
                symbol={market.symbol}
              />
            </SeoSection>

            <SeoSection
              aside={`Ranked by value bought. ${summary?.alphaCount ?? 0} of ${board.length} have a performance mark; the price line runs from the disclosure to the latest close, with ${bench.label} in grey.`}
              title="The board"
            >
              {/* Column headers. Decorative for assistive tech: every row
                  states its own. */}
              <div
                aria-hidden
                className={`pb-2.5 text-[11px] leading-[1.4] text-foreground/50 ${ROW_GRID}`}
              >
                <span />
                <span>Company and buyer</span>
                <span className="hidden md:block">
                  Since the buy, vs the index
                </span>
                <span className="text-right">
                  Paid → worth now
                  <span className="mt-1 block">Alpha since disclosure</span>
                </span>
              </div>

              <ol className={`border-t ${R.rule}`}>
                {board.map((r) => (
                  <BuyRow
                    key={r.id}
                    active={activeId}
                    bars={prices.get(r.ticker)}
                    bench={prices.get(bench.ticker)}
                    linking={linking}
                    locale={locale}
                    marketId={market.id}
                    row={r}
                    symbol={market.symbol}
                  />
                ))}
              </ol>

              {suppressed.size > 0 && (
                <p className={`mt-4 ${CAVEAT}`}>
                  Held back so one company can’t fill the board:{" "}
                  {[...suppressed.entries()]
                    .map(
                      ([ticker, n]) => `${displayTicker(ticker)} (${n} more)`,
                    )
                    .join(", ")}
                  .
                </p>
              )}
            </SeoSection>
          </>
        ) : null}

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
              ...METHODOLOGY,
              "The line beside each row is the share price from shortly before the purchase to the latest close, rebased so the disclosure-day close is 100, with the market index over the same days in grey. The stage in the header draws the same purchases: by amount, each disc's area is what was spent; by outcome, each sits at its amount across and its alpha up, with a stem to the line where it would be level with the index.",
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

        {archiveCards.length > 0 && (
          <SeoSection
            aside="Each board covers one calendar year of disclosures."
            title="Boards by year"
          >
            <RelatedCards cols={3} items={archiveCards} />
          </SeoSection>
        )}

        {/* Last, so the onward links close the document instead of interrupting
            it. */}
        <nav aria-label="More from ddbx" className="mt-9">
          <RelatedCards cols={2} items={CROSS_LINKS} />
        </nav>

        {/* The logo.dev licence link, which is a condition of using the marks
            rather than small print we chose to write. */}
        <LogoDevAttribution className="mt-10" />
      </SeoPageShell>
    </DefaultLayout>
  );
}

function BuyRow({
  row: r,
  bars,
  bench,
  active,
  linking,
  locale,
  marketId,
  symbol,
}: {
  row: BoardRow;
  bars: ReturnType<typeof useBoardPrices> extends Map<string, infer B>
    ? B | undefined
    : never;
  bench: ReturnType<typeof useBoardPrices> extends Map<string, infer B>
    ? B | undefined
    : never;
  active: string | null;
  linking: Linking;
  locale: string;
  /** "UK" | "US" — decides whether the row can reach a filing page. */
  marketId: string;
  symbol: string;
}) {
  const ticker = displayTicker(r.ticker);
  const repeat = r.entry > 1;
  const dim = active != null && active !== r.id;
  // THE ROW GOES TO THE PURCHASE, NOT THE ISSUER. Only the UK feed has filing
  // pages (`/dealings/:id` is a UK pipeline route), so this gates on market.
  const href =
    marketId === "UK" && r.raw.id
      ? filingPath(r.raw.id)
      : companyPath(r.ticker);
  const pair =
    r.worthNow != null ? moneyPair(r.value, r.worthNow, symbol) : null;
  const delta = moneyDelta(r.value, r.worthNow, symbol);
  const tone =
    r.dir === "pos"
      ? "text-positive"
      : r.dir === "neg"
        ? "text-negative"
        : "text-foreground/60";

  return (
    <li
      className={`border-b ${R.rule} transition-opacity ${dim ? "opacity-45" : ""} ${active === r.id ? "bg-black/[0.02] dark:bg-white/[0.03]" : ""}`}
      id={`buy-${r.id}`}
      onMouseEnter={() => linking.setActiveId(r.id)}
      onMouseLeave={() => linking.setActiveId(null)}
    >
      <Link className={ROW_LINK} to={href}>
        <div className={ROW_GRID}>
          <span
            aria-hidden
            className={`self-start font-mono text-[15px] leading-[1.35] tabular-nums ${
              r.rank <= 3 ? "text-foreground" : "text-foreground/35"
            }`}
          >
            {String(r.rank).padStart(2, "0")}
          </span>

          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-2.5">
              {repeat ? (
                <span
                  aria-hidden
                  className="inline-flex w-7 shrink-0 justify-center text-[15px] leading-none text-foreground/30"
                >
                  &#8627;
                </span>
              ) : (
                <CompanyLogo size={28} ticker={r.ticker} />
              )}
              <span className="min-w-0 truncate text-[16px] font-semibold leading-[1.3] tracking-[-0.012em] text-foreground sm:text-[18px]">
                {r.company}
              </span>
              <TickerPill ticker={ticker} />
            </span>

            <span className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-[1.35] text-foreground/50">
              {r.person ? (
                <>
                  <span className="max-w-[24ch] truncate">{r.person}</span>
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                </>
              ) : null}
              <span className="tabular-nums">
                {dateLabel(r.tradeDate, locale)}
              </span>
              {repeat ? (
                <>
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  <span>{ordinal(r.entry)} entry</span>
                </>
              ) : null}
              {r.raw.cluster ? (
                <span className="inline-flex items-center gap-1">
                  <ClusterChip cluster={r.raw.cluster} />
                  <span>of {r.raw.cluster.count} insiders</span>
                </span>
              ) : null}
            </span>

            {/* Phone: the price line sits under the detail. */}
            <span className="mt-3 block max-w-[240px] md:hidden">
              <BuySparkline bars={bars} bench={bench} row={r} />
            </span>
          </span>

          <span className="hidden md:block">
            <BuySparkline bars={bars} bench={bench} row={r} />
          </span>

          <span className="text-right">
            <span className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-2.5">
              <span className="text-[19px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-foreground sm:text-[24px] lg:text-[26px]">
                <span className="sr-only">Value bought: </span>
                {pair ? pair[0] : money(r.value, symbol)}
              </span>
              {pair ? (
                <>
                  <ArrowRightIcon
                    aria-hidden
                    className={`h-3.5 w-3.5 shrink-0 rotate-90 sm:h-4 sm:w-4 sm:rotate-0 ${
                      r.dir === "neg" ? "text-negative/60" : "text-positive/60"
                    }`}
                  />
                  <span
                    className={`text-[19px] font-semibold leading-none tabular-nums tracking-[-0.02em] sm:text-[24px] lg:text-[26px] ${tone}`}
                  >
                    <span className="sr-only">Worth now, if still held: </span>
                    {pair[1]}
                  </span>
                </>
              ) : null}
            </span>
            <span className="mt-2 flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
              {delta ? (
                <span
                  className={`whitespace-nowrap text-[12.5px] font-medium tabular-nums ${tone}`}
                >
                  {delta}
                </span>
              ) : null}
              <span className="sr-only">Alpha since disclosure: </span>
              {r.alpha == null ? (
                <span className="text-[13px] tabular-nums text-foreground/40">
                  no mark yet
                </span>
              ) : (
                <DeltaBadge suffix="pp" value={r.alpha * 100} />
              )}
            </span>
          </span>
        </div>
      </Link>
    </li>
  );
}
