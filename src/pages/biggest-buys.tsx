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
 *  Composition is SeoPageShell's, which is what fixed this page's worst
 *  structural bug: the app band used to sit in the MIDDLE of the document,
 *  with the methodology and the year archive published below it. The shell
 *  puts the band after the last content section by construction, so the
 *  ordering can't regress by someone adding a section in the wrong place.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";
import type { RelatedCard } from "@/components/seo/related-cards";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/20/solid";

import { fetchDealingsWindow } from "../../shared/dealings-feed.js";
import { filingPath } from "../../shared/filings.js";
import {
  archiveYears,
  buyAlpha,
  buyPerson,
  buyReturn,
  buyValue,
  leaderboardPath,
  rankBuys,
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
import { StatTiles } from "@/components/seo/stat-tiles";
import { API_BASE } from "@/lib/api";
import {
  cleanCompanyName,
  cleanInsiderName,
  companyPath,
  displayTicker,
} from "@/lib/company";
import { ClusterChip } from "@/components/cluster-chip";
import { CompanyLogo, LogoDevAttribution } from "@/components/company-logo";
import { DeltaBadge } from "@/components/market/market-row";
import { shortDate } from "@/components/market/market-utils";
import { TickerPill } from "@/components/ticker-pill";
import { MeterBar } from "@/components/seo/meter-bar";
import { leaderboardCta } from "@/components/seo/cta-copy";
import { TrackingNotice } from "@/components/seo/tracking-notice";

/** Caveats are risk-amber wells rather than another line of grey small print.
 *  A truncated window and a held-back company both change how the ranking
 *  should be read, and they were set in the same 11px grey as the row meta —
 *  which is to say, invisible. */
const CAVEAT =
  "rounded-xl bg-risk/[0.08] px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-foreground/70";

/** The whole row is the link, not the company name inside it: a 14px name was
 *  the only target on a 90px row. Same treatment as the sector index. */
const ROW_LINK =
  "-mx-2 block rounded-lg px-2 py-3.5 outline-none transition-colors hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:hover:bg-white/[0.03]";

/** Rank gutter, detail, figures — and the meter bar spanning all three on its
 *  own grid row, so the bar is a full-width measure rather than a 22rem stub
 *  that stopped short of the numbers it was scaled against.
 *
 *  The figures column is wide because it now carries a PAIR: what was paid and
 *  what it is worth. On a phone that pair stacks and the column stays narrow;
 *  from `sm` it sits on one line with an arrow between, which is the whole
 *  point of showing them together. */
const ROW_GRID =
  "grid grid-cols-[1.5rem_minmax(0,1fr)_5.5rem] items-start gap-x-3 sm:grid-cols-[2rem_minmax(0,1fr)_15rem] sm:gap-x-4";

/** Onward links, shaped as RelatedCards so the page has one card vocabulary
 *  rather than two: these used to be a hand-rolled `R.tile` grid sitting beside
 *  the year archive's RelatedCards. */
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

/** Alpha is a difference between two returns, so its unit is percentage
 *  points, not per cent. Null is a real state — a purchase too recent to have
 *  a mark has no alpha, and 0.0pp would assert a flat result we haven't seen. */
function signedPp(ratio: number | null): string {
  if (ratio == null) return "n/a";

  return `${ratio > 0 ? "+" : ""}${(ratio * 100).toFixed(1)}pp`;
}

/** "12 Jun", with the year added only when it isn't the current one. The
 *  rolling board straddles two calendar years, so a bare day-and-month is
 *  ambiguous on exactly the rows a reader is most likely to misread. */
function dateLabel(iso: string | null | undefined, locale: string): string {
  const raw = String(iso ?? "");

  if (!raw) return "—";
  const label = shortDate(raw, locale);
  const year = raw.slice(0, 4);

  return year && year !== String(new Date().getFullYear())
    ? `${label} ${year}`
    : label;
}

/** 2nd, 3rd — capped by MAX_PER_COMPANY, so it never has to reach further. */
function ordinal(n: number): string {
  return n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}

export default function BiggestBuysPage() {
  const { year } = useParams<{ year?: string }>();
  const market = useSectorMarket();
  const bounds = useMemo(() => (year ? yearBounds(year) : null), [year]);
  const invalidYear = Boolean(year) && !bounds;

  const [rows, setRows] = useState<Array<Dealing | UsDealing> | null>(null);
  const [complete, setComplete] = useState(true);

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

  // Bars scale to rank 1, so the board reads as "how much bigger was the top
  // buy" rather than as a row of near-full bars.
  const topValue = useMemo(
    () => (ranked.length > 0 ? buyValue(ranked[0]) : 0),
    [ranked],
  );

  // What the board adds up to. Stated above it because "the 25 biggest buys"
  // is a shape, and £1.4bn across 19 companies is the fact.
  const summary = useMemo(() => {
    const alphas = ranked
      .map((d) => buyAlpha(d))
      .filter((a): a is number => a != null)
      .sort((a, b) => a - b);
    const mid = Math.floor(alphas.length / 2);

    return {
      total: ranked.reduce((sum, d) => sum + buyValue(d), 0),
      companies: new Set(ranked.map((d) => d.ticker ?? "")).size,
      // The median's denominator. A purchase disclosed last week has no mark
      // yet, so on a 25-row board the median can rest on a handful of the
      // oldest rows — which is the difference between a figure worth reading
      // and a rounding error with a plus sign in front of it.
      alphaCount: alphas.length,
      medianAlpha:
        alphas.length === 0
          ? null
          : alphas.length % 2 === 1
            ? alphas[mid]
            : (alphas[mid - 1] + alphas[mid]) / 2,
    };
  }, [ranked]);

  const marketId = market.id === "US" ? "us" : "uk";
  const locale = market.id === "US" ? "en-US" : "en-GB";

  // Only offer years we actually hold filings for: a "Biggest buys of 2025"
  // link is a promise of an empty board, which is worse than no link at all.
  const years = archiveYears(BOARD_EARLIEST_YEAR, new Date());
  const archiveCards: RelatedCard[] = [
    ...(year
      ? [
          {
            to: "/biggest-buys",
            title: "The last twelve months",
            description: "The rolling board, which is the current one.",
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

  const periodLabel = year ? `in ${year}` : "of the last twelve months";
  const cta = leaderboardCta(year);

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
          screenshotSlot: "cluster",
        }}
        eyebrow="Leaderboard"
        loading={rows === null}
        notice={
          <>
            <a
              className="inline-block text-[12.5px] font-medium leading-[1.5] text-brand-brown underline-offset-4 hover:underline dark:text-brand-tan"
              href="#methodology"
            >
              Only open-market purchases count. How we rank these ↓
            </a>
            <TrackingNotice className="mt-2.5" />
            {!complete && ranked.length > 0 && (
              // Truncation is invisible unless you say so: the board still
              // renders and still looks complete. Better a caveat than a wrong
              // answer presented as a right one. With no rows at all the body
              // states the failure outright, so this would only say it twice.
              <p className={`mt-3 ${CAVEAT}`}>
                We couldn’t load the whole period, so this ranking may be
                missing older purchases.
              </p>
            )}
          </>
        }
        skeleton={
          <>
            <SeoSkeleton rows={4} variant="stat-tiles" />
            <SeoSkeleton rows={TOP_N} variant="ranked-board" />
          </>
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
        title={
          <>
            The biggest {market.label} insider buys {periodLabel}
          </>
        }
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
        ) : (
          <>
            <StatTiles
              className="mt-6"
              cols={4}
              // Same sentence the sector rows state, for the same reason: a
              // median alpha with no denominator hides how few of the 25 rows
              // are old enough to have a mark.
              note={`Totals cover the purchases listed below, not the whole market. ${summary.alphaCount} of ${ranked.length} buys have a performance mark; the median is taken from those.`}
              stats={[
                { label: "Purchases", value: ranked.length },
                {
                  label: "Combined value",
                  primary: true,
                  value: money(summary.total, market.symbol),
                },
                { label: "Companies", value: summary.companies },
                {
                  label: "Median alpha",
                  tone:
                    summary.medianAlpha == null
                      ? undefined
                      : summary.medianAlpha > 0
                        ? "positive"
                        : summary.medianAlpha < 0
                          ? "negative"
                          : undefined,
                  value: signedPp(summary.medianAlpha),
                },
              ]}
            />

            {/* Column headers. The two figures on the right were the reason the
                page exists and carried no labels at all — the crawler
                pre-render named them and the page a reader actually sees did
                not. Decorative for assistive tech: every row states its own. */}
            <div
              aria-hidden
              className={`mt-8 pb-2.5 text-[11px] leading-[1.4] text-foreground/50 ${ROW_GRID}`}
            >
              <span />
              <span>Company and buyer</span>
              <span className="text-right">
                Value bought
                <span className="mt-1 block">Alpha since disclosure</span>
              </span>
            </div>

            <ol className={`border-t ${R.rule}`}>
              {ranked.map((d, i) => (
                <BuyRow
                  key={d.id ?? i}
                  deal={d}
                  entry={
                    ranked.slice(0, i).filter((x) => x.ticker === d.ticker)
                      .length + 1
                  }
                  locale={locale}
                  marketId={market.id}
                  position={i + 1}
                  symbol={market.symbol}
                  topValue={topValue}
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
              ...METHODOLOGY,
              "The bar under each row is drawn relative to the largest purchase on this board, not to any fixed scale. It shows how far ahead the leader is, not how large a buy is in absolute terms.",
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
            it: they used to sit between the board and the methodology, which on
            a phone put "more from ddbx" ahead of how the board was built. Not
            lg:hidden any more either — the rail's link list is a quieter object
            and these tiles are worth having on desktop too. */}
        <nav aria-label="More from ddbx" className="mt-9">
          <RelatedCards cols={2} items={CROSS_LINKS} />
        </nav>

        {/* The logo.dev licence link, which is a condition of using the marks
            rather than small print we chose to write. Same closing position as
            /companies so it sits in one place on every logo-bearing page. */}
        <LogoDevAttribution className="mt-10" />
      </SeoPageShell>
    </DefaultLayout>
  );
}

function BuyRow({
  deal: d,
  entry,
  locale,
  marketId,
  position,
  symbol,
  topValue,
}: {
  deal: Dealing | UsDealing;
  /** Which purchase this is for its issuer on this board — 1 unless the same
   *  ticker appeared higher up. */
  entry: number;
  locale: string;
  /** "UK" | "US" — decides whether the row can reach a filing page. */
  marketId: string;
  position: number;
  symbol: string;
  /** Rank 1's consideration — every bar is drawn relative to it. */
  topValue: number;
}) {
  const alpha = buyAlpha(d);
  const ticker = displayTicker(d.ticker ?? "");
  const value = buyValue(d);
  const person = cleanInsiderName(buyPerson(d) ?? "");
  const repeat = entry > 1;
  // Mark the original consideration to the stock's own move — NOT to `alpha`,
  // which is measured against the benchmark and would misstate the holding.
  // buyReturn() prefers the disclosure-day baseline, which is the one the
  // methodology publishes; the trade-day figure this used to read was a
  // different measurement wearing the same label.
  const ret = buyReturn(d);
  const worthNow = ret != null && value > 0 ? value * (1 + ret) : null;
  const worthUp = (ret ?? 0) >= 0;
  // THE ROW GOES TO THE PURCHASE, NOT THE ISSUER.
  //
  // Every row on this board is one specific disclosure and each one has a
  // permanent page of its own; sending all of them to the company index page
  // instead threw away the thing the reader clicked. Only the UK feed has
  // filing pages (`/dealings/:id` is a UK pipeline route — see
  // functions/dealings/[id].js) and a `UsDealing` carries an `id` of its own,
  // so this gates on the market rather than on the field being present.
  const href =
    marketId === "UK" && d.id ? filingPath(d.id) : companyPath(d.ticker ?? "");

  return (
    <li className={`border-b ${R.rule}`}>
      <Link className={ROW_LINK} to={href}>
        <div className={ROW_GRID}>
          {/* Zero-padded mono rank. The podium carries full ink and everything
              below it drops back — a ranked list where 1 and 17 are set in the
              same grey isn't ranked, it's numbered. */}
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
              {repeat ? (
                // Same company, further down the board. The glyph takes the
                // logo's slot rather than sitting beside it, so a second entry
                // is visibly subordinate and the names still line up.
                <span
                  aria-hidden
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-[15px] leading-none text-foreground/30"
                >
                  &#8627;
                </span>
              ) : (
                <CompanyLogo size={28} ticker={d.ticker ?? ""} />
              )}
              {/* The company is what a reader is scanning for, and at 14.5px
                  medium it was set smaller than the alpha chip beside it and no
                  heavier than the buyer's name underneath. A leaderboard's rows
                  are named things; the name gets the weight. */}
              <span className="min-w-0 truncate text-[16px] font-semibold leading-[1.3] tracking-[-0.012em] text-foreground sm:text-[18px]">
                {cleanCompanyName(d.company ?? "") || ticker}
              </span>
              <TickerPill ticker={ticker} />
            </span>

            <span className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-[1.35] text-foreground/50">
              {person ? (
                <>
                  <span className="max-w-[24ch] truncate">{person}</span>
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                </>
              ) : null}
              <span className="tabular-nums">
                {dateLabel(d.trade_date, locale)}
              </span>
              {repeat ? (
                <>
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  <span>{ordinal(entry)} entry</span>
                </>
              ) : null}
              {d.cluster ? (
                // "of 3" alone leaves the whole framing to the chip's tooltip,
                // which is hover-only; the pre-render says "of 3 insiders" and
                // a cold visitor reading the board should get the same noun.
                <span className="inline-flex items-center gap-1">
                  <ClusterChip cluster={d.cluster} />
                  <span>of {d.cluster.count} insiders</span>
                </span>
              ) : null}
            </span>
          </span>

          <span className="text-right">
            {/* WHAT THEY PAID, AND WHAT IT IS WORTH — AS A PAIR.
                What the stake became was a line of 11.5px grey small print
                under an alpha chip: the single most concrete fact on the row,
                set smaller than the date. The percentage says how it moved;
                this says what it turned into, and it is the thing a reader
                pictures. So it now sits beside the consideration at the same
                scale, in the direction's colour, with an arrow pointing at it —
                the row reads "£3.8m became £5.2m" at a glance.

                Stacked on a phone with the arrow turned down, side by side from
                `sm`, because two 26px figures and an arrow do not fit in a
                narrow column and shrinking them to fit would give back exactly
                the prominence this is here to add. Both labelled: the row
                link's accessible name is long, and a bare "£4.2m" announced in
                the middle of it is the figure the page is about. */}
            <span className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-2.5">
              <span className="text-[19px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-foreground sm:text-[26px]">
                <span className="sr-only">Value bought: </span>
                {money(value, symbol)}
              </span>
              {worthNow != null && worthNow > 0 && (
                <>
                  <ArrowRightIcon
                    aria-hidden
                    className={`h-3.5 w-3.5 shrink-0 rotate-90 sm:h-4 sm:w-4 sm:rotate-0 ${
                      worthUp ? "text-positive/60" : "text-negative/60"
                    }`}
                  />
                  <span
                    className={`text-[19px] font-semibold leading-none tabular-nums tracking-[-0.02em] sm:text-[26px] ${
                      worthUp ? "text-positive" : "text-negative"
                    }`}
                  >
                    <span className="sr-only">Worth now, if still held: </span>
                    {money(worthNow, symbol)}
                  </span>
                </>
              )}
            </span>
            <span className="mt-2 block">
              <span className="sr-only">Alpha since disclosure: </span>
              {alpha == null ? (
                <span className="text-[13px] tabular-nums text-foreground/40">
                  n/a
                </span>
              ) : (
                <DeltaBadge suffix="pp" value={alpha * 100} />
              )}
            </span>
          </span>

          <MeterBar
            className="col-span-3 mt-2.5"
            max={topValue}
            value={value}
          />
        </div>
      </Link>
    </li>
  );
}
