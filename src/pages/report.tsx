/** A month's insider-buying report as a real, archived page — /reports/:month.
 *
 *  The report itself already existed and was already generated every month:
 *  headline, written intro, macro note, the metrics band, an 11-row sector
 *  table with median return and alpha per sector, the style split, featured
 *  buys, clusters, a benchmark chart, five backtested performance universes,
 *  and a report card grading the PREVIOUS month's featured picks with hits and
 *  misses. All of it reachable only as a modal over the market home at
 *  /report/<slug>, which meant the single richest thing we publish had no URL
 *  of its own, no place in the sitemap, and nothing for anyone to link to.
 *
 *  This is the same content as a page. The modal keeps working and keeps its
 *  URL; that route now canonicalises here (see shared/seo.js) so the two don't
 *  compete. Everything the page needs that the modal doesn't — headings it
 *  doesn't duplicate, a first featured card already open, the broad `every_buy`
 *  performance universe rather than the flattering one — is a prop on the
 *  shared component, never a fork.
 *
 *  Worth being explicit about the report card, because it's unusual: it scores
 *  our own previous month's picks and publishes the misses alongside the hits.
 *  That is the strongest trust signal on the site, and it's the reason this
 *  page is the one most likely to be cited rather than merely read. It states
 *  both marks — what the pick looked like when we published it and what it
 *  looks like now — because a scorecard that quietly reprices its own entries
 *  is not a scorecard.
 *
 *  Drawn, not just listed (2026-09-06). Every board page since 2026-09-05 puts
 *  its h1 inside a dark stage panel over the object that makes its argument,
 *  and this page's object was always obvious: the report card. So the hero is
 *  `MonthlyPicksStage` — last month's picks, each drawn at where it stands now
 *  with a stem back to where it stood when we published it — and the h1, the
 *  standfirst and the month's five headline figures sit inside it. The
 *  standfirst up there is FIXED and derivable from the slug, which is what
 *  lets the object be its own loading state: the top of the page is complete
 *  before the fetch lands, and `summary.headline` becomes the lede underneath.
 *
 *  Two things this page deliberately does not draw yet, both blocked on the
 *  data side rather than on taste:
 *
 *  - The sector table stays a table. `SectorsStage` needs a `SectorRollupRow[]`
 *    AND the individual buys behind each lane; `MonthlySectorSlice` carries
 *    neither, and there is no month-scoped dealings feed to derive them from.
 *  - The cluster roster stays a roster. `clusterEpisodes(cited, market)` looks
 *    like the way in, and it isn't: `cited` holds only the representative
 *    filings behind each cluster, so on the July UK report it derives 2 named
 *    insiders where the summary says 3, and 1 where the summary says 4. A
 *    board that under-counts its own headline is the exact credibility failure
 *    /cluster-buys was rebuilt to avoid.
 */
import type {
  MonthlySummary,
  MonthlySummaryListItem,
  MonthlySummaryResponse,
} from "@/types/ddbx";
import type { RelatedCard } from "@/components/seo/related-cards";
import type { Pick } from "@/components/monthly/monthly-picks-stage";
import type { ReactNode } from "react";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { monthLabel, reportPath, slugToMonth } from "../../shared/months.js";

import { MonthlyClusters } from "@/components/monthly/monthly-clusters";
import { MonthlyFeatured } from "@/components/monthly/monthly-featured";
import { MonthlyPerformanceSection } from "@/components/monthly/monthly-performance";
import { MonthlyPicksStage } from "@/components/monthly/monthly-picks-stage";
import {
  headlineFigures,
  returnTiles,
} from "@/components/monthly/monthly-metrics";
import { Prose } from "@/components/monthly/monthly-prose";
import DefaultLayout from "@/layouts/default";
import { MeterBar } from "@/components/seo/meter-bar";
import { RelatedCards } from "@/components/seo/related-cards";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { Skeleton } from "@/components/skeleton";
import { StageFigures } from "@/components/boards/stage-figures";
import { StageNotice } from "@/components/boards/stage-notice";
import { StatTiles } from "@/components/seo/stat-tiles";
import { TickerPill } from "@/components/ticker-pill";
import { TrackingNotice } from "@/components/seo/tracking-notice";
import {
  BoardRow,
  BoardRowHeader,
  BoardRowList,
} from "@/components/boards/board-row";
import { CompanyLogo, LogoDevAttribution } from "@/components/company-logo";
import { DeltaBadge } from "@/components/market/market-row";
import { api } from "@/lib/api";
import { cleanCompanyName, companyPath, displayTicker } from "@/lib/company";
import { marketForPath } from "@/lib/markets/registry";
import { reportsCta } from "@/components/seo/cta-copy";
import { formatGbp, formatSignedPct } from "@/lib/performance/format";

const RULE = "border-hairline dark:border-separator";
const LABEL = "text-[11px] leading-none text-foreground/50";
const BODY = "text-[14px] leading-[1.65] text-foreground/70";
const LINK = "underline underline-offset-4";

const STYLE_LABEL: Record<string, string> = {
  contrarian: "Contrarian",
  momentum: "Momentum",
  neutral: "Neutral",
};

export default function ReportPage() {
  const { month: slug } = useParams<{ month: string }>();
  const month = useMemo(() => slugToMonth(slug ?? ""), [slug]);

  // Reports are per-market and the market comes from the domain, exactly as it
  // does for company pages.
  const marketId = useMemo<"uk" | "us">(() => {
    const id = marketForPath(
      "/",
      typeof window === "undefined" ? undefined : window.location.hostname,
    ).id;

    return id === "us" || id === "usg" || id === "djt" ? "us" : "uk";
  }, []);
  const marketParam = marketId === "us" ? "US" : undefined;
  const marketWord = marketId === "us" ? "US" : "UK";

  const [data, setData] = useState<MonthlySummaryResponse | null>(null);
  const [months, setMonths] = useState<MonthlySummaryListItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing">(
    "loading",
  );

  useEffect(() => {
    if (!month) {
      setState("missing");

      return;
    }
    let live = true;

    setState("loading");
    api
      .monthlySummary(month, marketParam)
      .then((r) => {
        if (!live) return;
        // A 200 carrying `{summary: null}` is the API's way of saying "no
        // report for that month" — treating it as ready rendered a page whose
        // every section was falsy, which is a blank document, not a 404.
        if (!r?.summary) {
          setState("missing");

          return;
        }
        setData(r);
        setState("ready");
      })
      .catch(() => live && setState("missing"));

    return () => {
      live = false;
    };
  }, [month, marketParam]);

  useEffect(() => {
    let live = true;

    api
      .monthlySummaries(marketParam)
      .then((r) => live && setMonths(r.summaries))
      .catch(() => live && setMonths([]));

    return () => {
      live = false;
    };
  }, [marketParam]);

  const summary = state === "ready" ? data?.summary : undefined;
  const label = monthLabel(month);

  const neighbours = useMemo(
    () => neighbourCards(months, month),
    [months, month],
  );

  // What the hero draws, and what it says underneath. Two sources, in order of
  // preference: the report card grading last month's picks, and — for a first
  // report, which by definition has nothing earlier to grade — this month's
  // own featured buys marked from their entry. Null while the fetch is in
  // flight, so the panel draws its stand-in at the height the picture arrives
  // at; an empty array when the month has neither, which drops the hero.
  const graded = useMemo(() => gradedPicks(summary), [summary]);

  const hasHero = graded == null || graded.picks.length > 0;
  const figures = summary ? headlineFigures(summary.metrics) : [];
  const returns = summary ? returnTiles(summary.metrics) : [];

  const standfirst = (
    <>
      What {marketWord} insiders bought in {label}, what it was worth, and how
      the previous month’s featured picks have done since.
    </>
  );

  if (state === "missing") {
    return (
      <DefaultLayout drawerRight>
        <SeoRail
          marketId={marketId}
          placement="report_rail"
          ukHeading="Start investing"
        />
        <SeoPageShell
          crumbs={[
            { label: "Reports", to: "/reports" },
            { label: label || "Not found" },
          ]}
          cta={{
            body: reportsCta.body,
            gaLabel: "Monthly report",
            headline: reportsCta.headline,
            marketId,
          }}
          eyebrow="Monthly report"
          standfirst={
            <>
              We haven’t published a report for{" "}
              {label ? `${label}` : "that month"}. Every month we have is listed
              below.
            </>
          }
          title="No report for that month"
        >
          {months.length > 0 ? (
            <SeoSection title="Every report">
              <RelatedCards items={months.map(monthCard)} />
            </SeoSection>
          ) : null}
          <p className={`mt-8 ${BODY}`}>
            <Link className={LINK} to="/reports">
              See the report archive
            </Link>
            .
          </p>
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={marketId}
        placement="report_rail"
        ukHeading="Start investing"
      />
      <SeoPageShell
        crumbs={[{ label: "Reports", to: "/reports" }, { label }]}
        cta={{
          body: reportsCta.body,
          gaLabel: "Monthly report",
          headline: reportsCta.headline,
          marketId,
        }}
        eyebrow="Monthly report"
        hero={
          hasHero ? (
            <MonthlyPicksStage
              asOf={graded?.asOf ?? ""}
              graded={graded?.graded}
              header={
                <>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                    Monthly report
                  </p>
                  {/* Light, not bold: the object is the emphasis, the title
                      names it. */}
                  <h1 className="mt-3 max-w-[20ch] text-balance text-[34px] font-normal leading-[1.02] tracking-[-0.03em] text-white sm:text-[46px] lg:text-[54px]">
                    {label} insider buying report
                  </h1>
                  <p className="mt-5 max-w-[58ch] text-[15px] leading-[1.55] tracking-[-0.004em] text-white/65 sm:text-[16px]">
                    {standfirst}
                  </p>
                  <StageFigures reserve items={figures} />
                  <StageNotice marketId={marketId} />
                </>
              }
              hits={graded?.hits ?? 0}
              misses={graded?.misses ?? 0}
              picks={graded?.picks ?? null}
            />
          ) : undefined
        }
        loading={!summary}
        skeleton={<ReportSkeleton />}
        standfirst={hasHero ? undefined : standfirst}
        standfirstSize="lede"
        title={`${label} insider buying report`}
        titleInHero={hasHero}
        width="wide"
      >
        {summary ? (
          <>
            {/* Under the object: the provenance, then the argument. The byline
                cannot travel in the shell's `notice` slot — the shell renders
                no notice at all under `titleInHero`, so it would be silently
                dropped. */}
            <div className="mt-4 max-w-[62ch]">
              <Byline summary={summary} />
              {/* The stage header carries the tracking line already. With no
                  stage there is no header for it to sit in, and the page still
                  has to say how far back it holds. */}
              {hasHero ? null : (
                <TrackingNotice className="mt-2.5" marketId={marketId} />
              )}
            </div>

            {/* The month's own thesis, in the report's words rather than the
                page's. It was the shell's standfirst until the hero took that
                slot with a sentence a reader can rely on being the same shape
                every month; this one is written fresh and belongs in the
                document. */}
            <p className="mt-7 max-w-[58ch] text-[19px] leading-[1.4] tracking-[-0.012em] text-foreground/90 sm:text-[22px]">
              {summary.headline}
            </p>

            {summary.intro && (
              <div className="mt-5 max-w-[62ch]">
                <Prose text={summary.intro} />
              </div>
            )}

            {returns.length > 0 && (
              <StatTiles
                className="mt-8"
                cols={returns.length >= 4 ? 4 : returns.length === 3 ? 3 : 2}
                note="Measured from each buy’s disclosure-day close to the latest close, so these are short-window figures rather than settled horizon returns."
                stats={returns}
              />
            )}

            {summary.macro_note && (
              <SeoSection title="Market backdrop">
                <div className="max-w-[62ch]">
                  <Prose text={summary.macro_note} />
                </div>
              </SeoSection>
            )}

            {summary.report_card && summary.report_card.items.length > 0 && (
              <SeoSection
                aside="Last month’s featured buys, re-marked against the latest close, misses included. Each row states both marks: what the pick looked like when we published it, and what it looks like now."
                title={`How ${monthLabel(summary.report_card.graded_month)}’s picks did`}
              >
                <ReportCard card={summary.report_card} />
              </SeoSection>
            )}

            {summary.metrics.sector_table &&
              summary.metrics.sector_table.length > 0 && (
                <SeoSection
                  aside="Ranked by money committed; the bar under each figure is that sector’s share of the month’s committed value. Alpha is the median buy’s return less the benchmark over the same window."
                  title="By sector"
                >
                  <SectorTable rows={summary.metrics.sector_table} />
                </SeoSection>
              )}

            {summary.metrics.style_split &&
              summary.metrics.style_split.length > 0 && (
                <SeoSection
                  aside="Contrarian buys land after a fall, momentum buys after a rise."
                  title="By buy style"
                >
                  <StyleSplit rows={summary.metrics.style_split} />
                </SeoSection>
              )}

            {summary.featured?.length > 0 && (
              <SeoSection
                aside="The month’s standouts, written up one by one. Open a row for the price arc, the chart and what we made of it."
                title="Featured buys"
              >
                <MonthlyFeatured
                  openFirst
                  heading={false}
                  items={summary.featured}
                  variant="page"
                />
              </SeoSection>
            )}

            {summary.clusters?.length > 0 && (
              <SeoSection title="Clusters">
                <MonthlyClusters
                  clusters={summary.clusters}
                  heading={false}
                  variant="page"
                />
              </SeoSection>
            )}

            {data?.performance && (
              <SeoSection title="How the month’s buys performed">
                <MonthlyPerformanceSection
                  defaultUniverse="every_buy"
                  heading={false}
                  performance={data.performance}
                  statVariant="tiles"
                />
              </SeoSection>
            )}

            <Terms />

            {neighbours.length > 0 && (
              <SeoSection title="More reports">
                <RelatedCards cols={2} items={neighbours} />
                <p className={`mt-4 ${BODY}`}>
                  <Link className={LINK} to="/reports">
                    See every report
                  </Link>
                  .
                </p>
              </SeoSection>
            )}

            <LogoDevAttribution className="mt-10" />
          </>
        ) : null}
      </SeoPageShell>
    </DefaultLayout>
  );
}

/** The document's own shape while it loads.
 *
 *  The hero is NOT in here. The stage is its own loading state — it draws a
 *  field stand-in at the exact height it will arrive at, and the h1 and the
 *  standfirst above it are derivable from the slug, so the top of the page is
 *  finished before the fetch lands. What this stands in for is everything
 *  under the object: the byline, the lede and the written intro, one row of
 *  returns tiles, and the ruled sections after them. */
function ReportSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading…</span>

      <div className="mt-4 space-y-2">
        <Skeleton className="h-[12.5px] w-full max-w-[420px]" />
        <Skeleton className="h-[12.5px] w-3/5 max-w-[300px]" />
      </div>

      <div className="mt-7 space-y-3">
        <Skeleton className="h-[22px] w-full max-w-[520px]" />
        <Skeleton className="h-[15px] w-full max-w-[600px]" />
        <Skeleton className="h-[15px] w-4/5 max-w-[440px]" />
      </div>

      <SeoSkeleton className="mt-2" rows={4} variant="stat-tiles" />
      <SeoSkeleton className="mt-6" rows={4} variant="doc-sections" />
    </div>
  );
}

/** Every word on this page that a reader arriving from a search has no reason
 *  to already know.
 *
 *  Static-page rule 1: a report is a selling tool, and a document that says
 *  "median alpha" eleven times without once saying what alpha is has told a
 *  stranger nothing they can act on. The rail variant, because these are five
 *  short definitions rather than a section of the argument — and at the foot of
 *  a long read, where they are a reference rather than an interruption.
 *
 *  Only three of the five have glossary entries of their own; the other two are
 *  defined here and nowhere else, which is why the wording is on the page
 *  rather than behind a link. */
function Terms() {
  return (
    <SeoSection
      aside={
        <p className="text-[12px] leading-[1.5] text-foreground/45">
          The same five words appear in every month’s report, and they mean the
          same thing in each one.
        </p>
      }
      id="terms"
      title="What this is, and what these words mean"
      variant="rail"
    >
      <p className={`max-w-[62ch] ${BODY}`}>
        Every month we read the month’s disclosed insider purchases, rank them,
        write up the standouts, and then — the following month — mark our own
        picks against the latest close and publish the result. Nothing here is
        advice, and none of it is a prediction.
      </p>

      <dl className={`mt-6 border-t ${RULE}`}>
        <Term title="Alpha">
          A buy’s return less the benchmark’s return over the same window, so a
          purchase up 6% in a month the market rose 6% has an alpha of zero. It
          is what separates a good call from a rising tide.
        </Term>
        <Term
          title={
            <Link className={LINK} to="/learn/cluster-buying">
              Cluster
            </Link>
          }
        >
          Two or more insiders at the same company buying within days of each
          other. One insider buying is a person’s opinion; a cluster is a board
          agreeing with itself, which is a rarer thing.
        </Term>
        <Term title="Buy style">
          Whether a purchase landed after a fall (contrarian) or after a rise
          (momentum), judged from the price ahead of the trade. Neither is
          better; they tend to behave differently, so we split them.
        </Term>
        <Term title="Median return">
          The middle buy of the set, not the average — one holding that trebles
          would drag a mean somewhere no individual purchase went. Measured from
          each buy’s disclosure-day close, which is the earliest a reader could
          realistically have acted.
        </Term>
        <Term title="Report card">
          Our grade on the previous month’s featured picks, published with the
          losers next to the winners. A scorecard that quietly drops its misses
          is not a scorecard.
        </Term>
      </dl>

      <p className="mt-5 max-w-[62ch] text-[13px] leading-[1.6] text-foreground/60">
        More on how the reports are put together in{" "}
        <Link className={LINK} to="/how-it-works">
          how this works
        </Link>
        , and on the terms themselves in{" "}
        <Link className={LINK} to="/learn/open-market-buy">
          open-market buys
        </Link>{" "}
        and{" "}
        <Link className={LINK} to="/learn">
          the rest of the glossary
        </Link>
        .
      </p>
    </SeoSection>
  );
}

function Term({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div
      className={`grid gap-x-8 gap-y-1 border-b ${RULE} py-3.5 sm:grid-cols-[10rem_minmax(0,1fr)]`}
    >
      <dt className="text-[13.5px] font-medium text-foreground">{title}</dt>
      <dd className={`max-w-[62ch] ${BODY}`}>{children}</dd>
    </div>
  );
}

/** Who wrote this and when. The modal has carried the AI-assistance line since
 *  it shipped; the page dropped it and never showed the generation date at all,
 *  which for a document that grades its own past calls is the one piece of
 *  provenance a reader is entitled to. */
function Byline({ summary }: { summary: MonthlySummary }) {
  const published = localeDate(summary.created_at);

  return (
    <p className="text-[12.5px] leading-[1.5] text-foreground/45">
      {published ? (
        <>
          <time dateTime={summary.created_at}>Published {published}</time>
          {" · "}
        </>
      ) : null}
      Drafted with AI assistance from disclosed filings. Not investment advice.
    </p>
  );
}

/** The scorecard for the previous month's featured picks, as a list.
 *
 *  The hits/misses tiles and the sentence under them moved into the hero
 *  stage's caption, where they letter the picture that states the same thing.
 *  What is left here is the row per pick, on the boards' shared column spec:
 *  both marks, side by side, in aligned tabular tracks.
 *
 *  Publishing the misses next to the hits is the point — a report that only
 *  ever showed winners would be marketing. */
function ReportCard({
  card,
}: {
  card: NonNullable<MonthlySummaryResponse["summary"]["report_card"]>;
}) {
  // Best first, so the list and the drawing above it read in the same order.
  const sorted = [...card.items].sort(
    (a, b) => (b.return_now ?? -Infinity) - (a.return_now ?? -Infinity),
  );

  return (
    <div>
      <BoardRowHeader
        className="mt-0"
        facts={["At publication"]}
        perf="Now"
        subject="Company"
      />
      <BoardRowList>
        {sorted.map((item, i) => {
          const ticker = displayTicker(item.ticker);

          return (
            <BoardRow
              key={item.dealing_id}
              badge={<TickerPill ticker={ticker} />}
              facts={[
                {
                  label: "At publication",
                  // `formatSignedPct` renders null as an em dash, which in a
                  // figure cell is a number nobody has.
                  value:
                    item.return_at_publication == null
                      ? "not stated"
                      : formatSignedPct(item.return_at_publication),
                },
              ]}
              logo={<CompanyLogo size={56} ticker={item.ticker} />}
              name={cleanCompanyName(item.company) || ticker}
              perf={
                item.return_now == null ? (
                  // Was a bare "," here until 2026-09-06 — a stray glyph
                  // standing where a mark should be. A pick with no usable
                  // price series has no mark, and that is a sentence.
                  <span className="text-[12px] leading-[1.3] text-foreground/45">
                    No mark yet
                  </span>
                ) : (
                  <DeltaBadge value={item.return_now * 100} />
                )
              }
              position={i + 1}
              to={companyPath(item.ticker)}
            />
          );
        })}
      </BoardRowList>
    </div>
  );
}

/** The precomputed sector slice — buy count, value, median return and median
 *  alpha per ICB sector. This is the table the /sectors hubs read from too. */
function SectorTable({
  rows,
}: {
  rows: NonNullable<
    MonthlySummaryResponse["summary"]["metrics"]["sector_table"]
  >;
}) {
  const sorted = [...rows].sort(
    (a, b) => b.total_value_gbp - a.total_value_gbp,
  );
  const max = sorted[0]?.total_value_gbp ?? 0;

  const head = `${LABEL} pb-2 pr-4 font-semibold uppercase tracking-[0.16em]`;

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[520px] border-collapse text-left">
        <thead>
          <tr className={`border-b ${RULE}`}>
            <th className={head}>Sector</th>
            <th className={head}>Buys</th>
            <th className={`${head} w-[26%]`}>Value</th>
            <th className={head}>Median return</th>
            <th
              className={`${LABEL} pb-2 font-semibold uppercase tracking-[0.16em]`}
            >
              Median alpha
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.sector} className={`border-b ${RULE} last:border-b-0`}>
              <th className="py-2.5 pr-4 text-[13.5px] font-medium text-foreground">
                {row.sector}
              </th>
              <td className="py-2.5 pr-4 text-[13.5px] tabular-nums text-foreground/70">
                {row.buy_count}
              </td>
              <td className="py-2.5 pr-4 align-middle text-[13.5px] tabular-nums text-foreground/70">
                {/* TODO(us-reports): `formatGbp` hardcodes £ — a US report
                    would state dollars as pounds on day one.
                    `moneyShort(value, currency)` in @/lib/company-format is the
                    currency-aware form; threading the market's currency through
                    every monthly surface is a wider change than this page. */}
                {formatGbp(row.total_value_gbp, { compact: true })}
                <MeterBar
                  className="mt-1.5"
                  max={max}
                  value={row.total_value_gbp}
                />
              </td>
              <td
                className={`py-2.5 pr-4 text-[13.5px] tabular-nums ${returnClass(row.median_return)}`}
              >
                {formatSignedPct(row.median_return)}
              </td>
              <td
                className={`py-2.5 text-[13.5px] tabular-nums ${returnClass(row.median_alpha)}`}
              >
                {formatSignedPct(row.median_alpha)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The month's buys split by how they were timed. Generated and stored with
 *  every summary since the field shipped, and until now rendered nowhere — on
 *  the page, in the modal or in the pre-render. */
function StyleSplit({
  rows,
}: {
  rows: NonNullable<
    MonthlySummaryResponse["summary"]["metrics"]["style_split"]
  >;
}) {
  const sorted = [...rows].sort(
    (a, b) => b.total_value_gbp - a.total_value_gbp,
  );
  const max = sorted[0]?.total_value_gbp ?? 0;

  return (
    <ul className={`border-t ${RULE}`}>
      {sorted.map((row) => (
        <li key={row.style} className={`border-b ${RULE} py-3.5`}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="min-w-0">
              <span className="text-[14px] font-medium text-foreground">
                {STYLE_LABEL[row.style] ?? row.style}
              </span>
              <span className={`ml-2 ${LABEL}`}>
                {row.buy_count} {row.buy_count === 1 ? "buy" : "buys"}
              </span>
            </span>
            <span className="shrink-0 font-mono text-[13px] tabular-nums text-foreground/75">
              {formatGbp(row.total_value_gbp, { compact: true })}
            </span>
          </div>
          <MeterBar className="mt-2" max={max} value={row.total_value_gbp} />
          <p className={`mt-2 ${LABEL} leading-[1.6]`}>
            Median return{" "}
            <span className={`tabular-nums ${returnClass(row.median_return)}`}>
              {formatSignedPct(row.median_return)}
            </span>{" "}
            · median alpha{" "}
            <span className={`tabular-nums ${returnClass(row.median_alpha)}`}>
              {formatSignedPct(row.median_alpha)}
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
}

interface GradedPicks {
  picks: Pick[];
  hits: number;
  misses: number;
  asOf: string;
  /** Present only when these are last month's picks rather than this one's. */
  graded?: { label: string; href: string };
}

/** What the hero draws, from whichever of the two sources the month has.
 *
 *  The report card first: it is the stronger object, because it grades calls we
 *  had already published and could not revise. A month with no card — the first
 *  report for a market, or one generated before the field shipped — falls back
 *  to its own featured buys marked from entry, which makes the same picture out
 *  of a weaker claim, and the caption says which claim it is.
 *
 *  `hits` and `misses` come from the API on the card path rather than being
 *  recounted here: those are the figures the rest of the page quotes, and a
 *  second count is a second chance to print a different number. On the fallback
 *  there is nothing to defer to, so they are counted from the marks drawn.
 *
 *  Rows link to the company rather than to the filing. The claim the picture
 *  makes is about a price since a date, which is the company page's subject;
 *  a filing page for a purchase a month or more old is the narrower answer to
 *  a question the reader did not ask. */
function gradedPicks(summary: MonthlySummary | undefined): GradedPicks | null {
  if (!summary) return null;
  const card = summary.report_card;

  if (card && card.items.length > 0) {
    return {
      picks: card.items.map((it) => ({
        id: it.dealing_id,
        ticker: it.ticker,
        company: cleanCompanyName(it.company) || displayTicker(it.ticker),
        then: it.return_at_publication,
        now: it.return_now,
        href: companyPath(it.ticker),
      })),
      hits: card.hits,
      misses: card.misses,
      asOf: localeDate(card.as_of) || card.as_of,
      graded: {
        label: monthLabel(card.graded_month),
        href: reportPath(card.graded_month),
      },
    };
  }

  const featured = summary.featured ?? [];
  let hits = 0;
  let misses = 0;

  for (const f of featured) {
    if (f.return_since_entry == null) continue;
    if (f.return_since_entry > 0) hits += 1;
    if (f.return_since_entry < 0) misses += 1;
  }

  return {
    picks: featured.map((f) => ({
      id: f.dealing_id,
      ticker: f.ticker,
      company: cleanCompanyName(f.company) || displayTicker(f.ticker),
      then: null,
      now: f.return_since_entry,
      href: companyPath(f.ticker),
    })),
    hits,
    misses,
    asOf: localeDate(summary.created_at) || summary.created_at,
  };
}

/** Positive / negative token for a ratio. Exactly 0 and null stay grey. */
function returnClass(ratio: number | null | undefined): string {
  if (ratio == null || ratio === 0) return "text-foreground/70";

  return ratio > 0 ? "text-positive" : "text-negative";
}

/** ISO date or datetime → "1 July 2026". Empty string when unparseable, so
 *  callers can fall back to the raw value. */
function localeDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function monthCard(m: MonthlySummaryListItem): RelatedCard {
  return {
    to: reportPath(m.month),
    title: monthLabel(m.month),
    description: m.headline,
  };
}

/** The month either side of this one, newest first — the two links a reader at
 *  the bottom of a dated document actually wants. The old "Other months" list
 *  printed every month we have, which stops being a navigation aid the first
 *  time the archive passes a dozen entries. */
function neighbourCards(
  months: MonthlySummaryListItem[],
  month: string | null,
): RelatedCard[] {
  if (!month || months.length === 0) return [];
  const sorted = [...months].sort((a, b) => b.month.localeCompare(a.month));
  const i = sorted.findIndex((m) => m.month === month);

  if (i < 0) return sorted.slice(0, 2).map(monthCard);

  const out: RelatedCard[] = [];
  const newer = sorted[i - 1];
  const older = sorted[i + 1];

  if (newer) {
    out.push({
      ...monthCard(newer),
      title: `Newer · ${monthLabel(newer.month)}`,
    });
  }
  if (older) {
    out.push({
      ...monthCard(older),
      title: `Older · ${monthLabel(older.month)}`,
    });
  }

  return out;
}
