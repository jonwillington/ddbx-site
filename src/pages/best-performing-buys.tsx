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
 *  be prose under a table; the hero now draws them. The stat tiles moved into
 *  the message column beside the object — where "Ranked from 283" is the
 *  denominator the caption uses rather than a number in a box. Composition is
 *  still SeoPageShell's, which keeps the app band after the last content
 *  section.
 *
 *  The stage draws the FIELD and the list is the BOARD (2026-09-06). The hero
 *  used to redraw the ranking as a rank-ordered curve of logos, which is the
 *  same 25 rows the list below already carries — and then the list turned its
 *  bar off, on the grounds that the picture above it had made the comparison.
 *  Neither surface ended up drawing the quantity the page ranks on. Now the
 *  strip places every eligible purchase at its alpha on one axis, and each row
 *  carries a bar from a shared zero at a scale shared by all 25. Two different
 *  jobs: where the board sits in its field, and how far apart the 25 are.
 */
import type { RelatedCard } from "@/components/seo/related-cards";
import type { StageFigure } from "@/components/boards/stage-figures";
import type { Linking } from "@/components/boards/board-model";

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  median,
  rankByAlpha,
  summarise,
  MIN_BOARD_VALUE,
  PERFORMANCE_METHODOLOGY,
  TOP_N,
} from "../../shared/boards.js";
import { buyAlpha, moneyPair } from "../../shared/leaderboard.js";
import { formatMoney } from "../../shared/sectors.js";
import { filingPath } from "../../shared/filings.js";

import { R, useSectorMarket } from "@/components/sector-ui";
import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { RelatedCards } from "@/components/seo/related-cards";
import { TrackingNotice } from "@/components/seo/tracking-notice";
import { performanceBoardCta } from "@/components/seo/cta-copy";
import { CompanyLogo, LogoDevAttribution } from "@/components/company-logo";
import { TickerPill } from "@/components/ticker-pill";
import { companyPath, displayTicker } from "@/lib/company";
import {
  BoardRow,
  BoardRowHeader,
  BoardRowList,
} from "@/components/boards/board-row";
import { useBoardFeed } from "@/components/boards/board-feed";
import { dateLabel, toBoardRows } from "@/components/boards/board-model";
import { BENCHMARK } from "@/components/boards/board-prices";
import { StageFigures } from "@/components/boards/stage-figures";
import { StageNotice } from "@/components/boards/stage-notice";
import { exactMoney } from "@/components/boards/stage-marks";
import {
  BestPerformingStage,
  eligibleAlphas,
  floorEffect,
} from "@/components/boards/stages/best-performing-stage";

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

/** The board's own scale for the row bars: one origin at zero, one number of
 *  pixels per percentage point, shared by all 25 rows.
 *
 *  This is the rule-9 exemption and it is only an exemption because all three
 *  of its conditions hold. The origin is real — zero is level with the index,
 *  not the smallest row — so a bar twice as long IS twice the margin, which is
 *  the thing a bar scaled to the leader can never say. The scale is shared, so
 *  the rows are comparable with each other rather than each being a picture of
 *  its own rank. And the page publishes that it is a ranking on this quantity.
 *  `/biggest-buys` holds the same exemption on the same three grounds. */
function barScale(alphas: Array<number | null>): { lo: number; span: number } {
  const pps = alphas.map((a) => (a ?? 0) * 100);
  const lo = Math.min(0, ...pps);
  const hi = Math.max(0, ...pps);

  return { lo, span: Math.max(hi - lo, 1) };
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

  // The field, measured once. Every population figure this page states — the
  // median beside the object, the ahead/behind counts the stage letters on its
  // axis, the median its caption repeats — comes off this one array, because a
  // statistic printed twice from two computations is a statistic that can
  // print two different numbers. The population is the board's own denominator:
  // eligible, marked, above the floor. Not the 25, which are selected for the
  // very thing the median would be measuring.
  const fieldAlphas = useMemo(
    () => eligibleAlphas(rows ?? [], market.id),
    [rows, market.id],
  );
  // Only over a complete window: the median of a truncated fetch is a fact
  // about the fetch. The figure is omitted rather than qualified, which is the
  // same stance the stage's caption already takes.
  const fieldMedian = useMemo(
    () => (complete ? median(fieldAlphas) : null),
    [complete, fieldAlphas],
  );

  // One scale for the whole list, taken over the rows the list actually draws.
  const bar = useMemo(
    () => barScale((board ?? []).map((r) => r.alpha)),
    [board],
  );

  // What the floor costs this period, in the one place the floor is explained.
  // The board's last place only bounds it when the board is full: with room
  // left on it, every marked purchase under the floor would otherwise rank.
  const floorCost = useMemo(() => {
    const cutoff =
      ranked.length >= TOP_N
        ? (buyAlpha(ranked[ranked.length - 1]) ?? null)
        : null;

    return floorEffect(rows ?? [], market.id, cutoff);
  }, [rows, ranked, market.id]);

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
    // The field's median, not the board's. How far above the market a set
    // chosen for being far above the market sits is not a finding; what the
    // typical eligible purchase did is, and it is the figure the best on the
    // board is worth reading against.
    if (fieldMedian != null) {
      figures.push({
        k: `Median of all ${considered}`,
        v: signedPp(fieldMedian),
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

  // One sentence, two slots. It used to be typed out twice — once inside the
  // stage header and once as the fallback standfirst for the empty state — and
  // the two copies had already drifted apart in wording. "Alpha" is not in it:
  // the word is defined on the rule link under the object and in the published
  // methodology, and a standfirst is not the place to teach a term.
  const standfirst = (
    <>
      The purchases {market.noun} made in their own companies that have beaten
      the market by the most since they were made. Each is measured against{" "}
      {bench.label} over the same period, so a rising market doesn’t flatter the
      board.
    </>
  );

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
              fieldAlphas={fieldAlphas}
              fieldMedian={fieldMedian}
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
                    {standfirst}
                  </p>
                  <StageFigures items={figures} reserve={rows === null} />
                  <StageNotice marketId={market.id} />
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
        skeleton={
          <SeoSkeleton
            board={{ facts: 3, logo: 56, meter: false }}
            rows={TOP_N}
            variant="ranked-board"
          />
        }
        standfirst={hasBoard || rows === null ? undefined : standfirst}
        title={
          <>The best-performing {market.label} insider buys of the last year</>
        }
        titleInHero={rows === null || hasBoard}
        width="wide"
      >
        {/* Under the stage: the rule and the truncation caveat. The tracking
            line moved into the stage header, under the figures it qualifies —
            below a 600px object at 45% opacity it was invisible. */}
        <div className="mt-4 max-w-[62ch]">
          {/* "Alpha" came out of the standfirst, so its definition link lands
              here, on the line that names the rule. Two destinations, one
              sentence: what the word means, and how the board applies it. */}
          <p className="text-[12.5px] font-medium leading-[1.5] text-brand-brown dark:text-brand-tan">
            Ranked on{" "}
            <Link
              className="underline underline-offset-4"
              to="/learn/what-a-director-buy-signals"
            >
              alpha
            </Link>
            , with a {floor} floor.{" "}
            <a
              className="underline-offset-4 hover:underline"
              href="#methodology"
            >
              How this is built ↓
            </a>
          </p>
          {/* The empty and error states mount no stage, so there is no header
              for the in-stage notice to sit in. The page still has to say how
              far back it holds. */}
          {rows === null || hasBoard ? null : (
            <TrackingNotice className="mt-2.5" marketId={market.id} />
          )}
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
            <BoardRowHeader
              facts={["Disclosed", "Paid", "Worth now"]}
              subject="Company and buyer"
              visual="Ahead of the market"
            />

            <BoardRowList>
              {(board ?? []).map((row, i) => (
                <PerformanceRow
                  key={row.id}
                  bar={bar}
                  linking={linking}
                  locale={locale}
                  marketId={market.id}
                  position={i + 1}
                  row={row}
                  symbol={market.symbol}
                />
              ))}
            </BoardRowList>

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
                the methodology below — with what it costs this period, which
                the stage used to draw as a wall in a second arrangement
                nobody had asked for. Three states, and they are three
                different claims: it holds some back, it holds none back
                because they all did worse anyway, or there was nothing under
                it to hold. "Holds back 0" would say none of them. */}
            <p className={`mt-4 ${CAVEAT}`}>
              Purchases under {floor} are excluded. A token buy in a thinly
              traded company moves much further than a real one, and without the
              floor this board fills with sums too small for the buyer to
              notice.{" "}
              {floorCost.below === 0 ? (
                <>
                  No purchase with a mark fell below it this period, so it
                  changes nothing on today’s board.
                </>
              ) : floorCost.heldBack === 0 ? (
                <>
                  {floorCost.below === 1
                    ? "The one marked purchase below it did worse"
                    : `All ${floorCost.below} marked purchases below it did worse`}{" "}
                  than this board’s last place, so it changes nothing here
                  today.
                </>
              ) : (
                <>
                  Today the floor holds back{" "}
                  {complete
                    ? floorCost.heldBack
                    : `at least ${floorCost.heldBack}`}{" "}
                  {floorCost.heldBack === 1 ? "purchase" : "purchases"} that
                  would otherwise rank here.
                </>
              )}
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
              "The strip in the header draws every purchase that qualified, not just the 25 listed. Each dot is one eligible purchase with a mark, placed at its alpha on the one horizontal scale; the logos are the best few of the 25, raised above the band with a hairline back to where their mark really sits. Height carries no meaning, and dots are stacked apart only where they would otherwise be drawn on top of each other.",
              "The bar beside each row starts at the same zero and runs at the same number of pixels per percentage point for all 25 rows, so a bar twice as long is twice the margin over the index. The other boards here draw no bar, because a bar scaled to the row above it encodes rank within the list and nothing a reader can read off it; this page is a ranking on that quantity and says so.",
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

/** The ranked quantity, drawn and stated in one cell.
 *
 *  The figure sits at the bar's own end rather than right-aligned in a column
 *  of its own, because the two are one reading: the bar is where this purchase
 *  landed on the board's scale and the number is what that is. Semibold and
 *  tabular so the column scans down, and 15px against the company's 18/20 —
 *  the ranked figure is never the largest type on its row, which is the
 *  weighting rule the old 26px alpha broke.
 *
 *  `aria-hidden` on the bar: the figure beside it is the accessible value. */
function AlphaBar({ pp, lo, span }: { pp: number; lo: number; span: number }) {
  const zero = ((0 - lo) / span) * 100;
  const at = ((pp - lo) / span) * 100;
  const from = Math.min(zero, at);
  const ahead = pp >= 0;

  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="relative block h-[9px] min-w-0 flex-1 rounded-[3px] bg-black/[0.05] dark:bg-white/[0.07]"
      >
        {/* The origin, drawn. A bar with no visible zero is a bar whose reader
            has to take the scale on trust. */}
        <span
          className="absolute inset-y-[-2px] w-px bg-foreground/30"
          style={{ left: `${zero}%` }}
        />
        <span
          className={`absolute inset-y-0 rounded-[2px] ${
            ahead ? "bg-positive" : "bg-negative"
          }`}
          // A purchase level with the index still gets a visible mark: a bar
          // that renders as nothing reads as missing rather than as zero.
          style={{
            left: `${from}%`,
            width: `max(2px, ${Math.abs(at - zero)}%)`,
          }}
        />
      </span>
      <span
        className={`shrink-0 text-[15px] font-semibold leading-none tabular-nums tracking-[-0.01em] ${
          ahead ? "text-positive" : "text-negative"
        }`}
      >
        {pp > 0 ? "+" : ""}
        {pp.toFixed(1)}pp
      </span>
    </span>
  );
}

function PerformanceRow({
  bar,
  linking,
  locale,
  marketId,
  position,
  row,
  symbol,
}: {
  /** The board's shared bar scale. Passed rather than derived per row: a bar
   *  that picked its own scale would be a picture of nothing. */
  bar: { lo: number; span: number };
  /** Shared with the strip above, so hovering a row lights its logo and the
   *  other way round. Keyed on the filing id, which is what the strip's marks
   *  carry. */
  linking: Linking;
  locale: string;
  marketId: "UK" | "US";
  position: number;
  row: ReturnType<typeof toBoardRows>[number];
  symbol: string;
}) {
  const ticker = displayTicker(row.ticker);
  // Every row on this board has a mark by construction — that is the board's
  // own eligibility rule — but the pair of money figures needs a return as
  // well as an alpha, and those are two fields on the feed.
  const pair =
    row.worthNow == null ? null : moneyPair(row.value, row.worthNow, symbol);
  const href =
    marketId === "UK" && row.raw.id
      ? filingPath(row.raw.id)
      : companyPath(row.ticker);

  return (
    <BoardRow
      badge={<TickerPill ticker={ticker} />}
      facts={[
        {
          label: "Disclosed",
          value: row.disclosedDate
            ? dateLabel(row.disclosedDate, locale)
            : "not dated",
        },
        {
          label: "Paid",
          value: pair ? pair[0] : formatMoney(row.value, symbol),
        },
        { label: "Worth now", value: pair ? pair[1] : "not priced yet" },
      ]}
      linkId={row.id}
      linking={linking}
      logo={<CompanyLogo size={56} ticker={row.ticker} />}
      name={row.company}
      position={position}
      secondary={
        <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span>{row.person ?? "Undisclosed"}</span>
          {row.role ? (
            <>
              <span aria-hidden className="opacity-40">
                ·
              </span>
              <span>{row.role}</span>
            </>
          ) : null}
        </span>
      }
      to={href}
      visual={
        <AlphaBar lo={bar.lo} pp={(row.alpha ?? 0) * 100} span={bar.span} />
      }
    />
  );
}
