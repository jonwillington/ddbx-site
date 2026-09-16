/** Living studies — /research (index) and /research/:slug.
 *
 *  Evergreen research questions recomputed from the live corpus on every
 *  load, written to be cited. The questions, the cells, the thresholds, the
 *  statistics and every sentence that states a number live in
 *  shared/studies.js, which functions/research/[[route]].js renders for
 *  crawlers from the same fetch: a study whose pre-rendered verdict differs
 *  from its hydrated one is worse than no study.
 *
 *  The one rule the family is built around: a conclusion is published only
 *  once the sample makes it defensible. Under the floor the page still exists
 *  and says exactly what is missing and when it should exist, from the queue
 *  of purchases already filed and waiting to reach the horizon, or from the
 *  recent rate of arrival when the queue alone is not enough. That is the
 *  second static-page rule ("never state a number you do not have") applied
 *  to a whole page rather than to a tile, and it is why a study has three
 *  states rather than two.
 *
 *  A document, not a dashboard. No dark stage: the verdict is a sentence set
 *  large on a cream sheet, the chart is one contained panel, and the rest is
 *  numbered sections at the document measure. The only contrasting object is
 *  the ask at the foot, which the shell places.
 *
 *  Nothing on these pages names a person. Cells are roles, size bands and
 *  cluster membership; the boards that list the filings behind each cell are
 *  linked from the table.
 */
import type { RelatedCard } from "@/components/seo/related-cards";
import type { Study, StudyResult } from "../../shared/studies";

import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import {
  citation,
  computeStudy,
  datasetSentence,
  longDate,
  pct,
  studyBySlug,
  studyPath,
  verdictHeadline,
  ARRIVAL_WEEKS,
  METHODOLOGY,
  MIN_CELL,
  MIN_HORIZON_DAYS,
  STUDIES,
  STUDY_FLOOR,
} from "../../shared/studies.js";
import { MARKET_HOST_BY_ID } from "../../shared/seo.js";

import { R, useSectorMarket } from "@/components/sector-ui";
import DefaultLayout from "@/layouts/default";
import { BackLink } from "@/components/back-link";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { RelatedCards } from "@/components/seo/related-cards";
import { StatTiles } from "@/components/seo/stat-tiles";
import { TrackingNotice } from "@/components/seo/tracking-notice";
import { studyCta } from "@/components/seo/cta-copy";
import { Skeleton } from "@/components/skeleton";
import { RowList, Row } from "@/components/row-list";
import { useBoardFeed } from "@/components/boards/board-feed";
import { CellChart } from "@/components/research/cell-chart";
import {
  BehindTheCells,
  CellsTable,
  CitationBlock,
  Fact,
  RuleList,
  StateTag,
  VerdictPanel,
} from "@/components/research/study-objects";

const EYEBROW = "Living study";
const CAVEAT =
  "rounded-xl bg-risk/[0.08] px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-foreground/70";

/** The number the index and the study pages both call the room: purchases
 *  per week entering the studies’ universe, from the last ARRIVAL_WEEKS. */
const perWeek = (n: number) => (n >= 10 ? Math.round(n) : n.toFixed(1));

function useStudyResults(
  rows: ReturnType<typeof useBoardFeed>["rows"],
  market: "UK" | "US",
): StudyResult[] | null {
  return useMemo(
    () =>
      rows === null
        ? null
        : STUDIES.map((s) => computeStudy(s, rows, market, new Date())),
    [rows, market],
  );
}

/** The failed-fetch state, which is not an empty one. */
function CouldNotLoad() {
  return (
    <p className={`mt-10 max-w-[62ch] ${R.body}`}>
      We couldn’t load the filings just now. It’s a network problem rather than
      a finding about the market. Try a refresh in a moment.
    </p>
  );
}

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

export function ResearchIndexPage() {
  const market = useSectorMarket();
  const { rows, complete } = useBoardFeed(market.id);
  const marketId = market.id === "US" ? "us" : "uk";
  const results = useStudyResults(rows, market.id);
  const failed = rows !== null && rows.length === 0 && !complete;

  // The dataset figures on the index come from the widest universe, which is
  // the size study’s (no floor). Every study reads the same fetch, so this is
  // the corpus, not a study’s slice of it.
  const widest = results?.find((r) => r.slug === "does-size-matter") ?? null;

  const standfirst = (
    <>
      Three questions people ask about {market.noun} buying their own shares,
      answered from the disclosures themselves and recomputed on every load.
      Each is published only once there are enough marked purchases to carry it;
      until then the page says what is missing and when it should exist.
    </>
  );

  const related: RelatedCard[] = [
    {
      to: "/how-it-works",
      title: "How the rating works",
      description: "The six checks, and what we can measure",
    },
    {
      to: "/best-performing-buys",
      title: "The best-performing buys",
      description: "Ranked on alpha, not return",
    },
    {
      to: "/roles",
      title: "Buying by role",
      description: "The purchases behind the role cells",
    },
    {
      to: "/cluster-buys",
      title: "Cluster buying",
      description: "Where several insiders bought at once",
    },
  ];

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={marketId}
        placement="research_index_rail"
        ukHeading="Start investing"
      />
      <SeoPageShell
        cta={{
          body: studyCta.body,
          gaLabel: "Research index",
          headline: studyCta.headline,
          marketId,
        }}
        eyebrow="Living studies"
        loading={rows === null}
        notice={<TrackingNotice marketId={market.id} />}
        skeleton={<IndexSkeleton />}
        standfirst={standfirst}
        standfirstSize="lede"
        title={
          <>
            What {market.label} insider buying says, once there is enough of it
          </>
        }
      >
        {failed ? (
          <CouldNotLoad />
        ) : (
          <>
            {!complete && rows && rows.length > 0 ? (
              <p className={`mt-6 ${CAVEAT}`}>
                We couldn’t load the whole period, so today’s counts may be
                missing older purchases. A cell can only be under-counted by
                that, never over.
              </p>
            ) : null}

            <RowList className="mt-8" ordered={false}>
              {STUDIES.map((study) => {
                const result = results?.find((r) => r.slug === study.slug);

                if (!result) return null;

                return (
                  <Row
                    key={study.slug}
                    kicker={<StateTag result={result} />}
                    split="description"
                    title={
                      <Link
                        className="group inline-flex items-start gap-2 outline-none focus-visible:underline"
                        to={studyPath(study.slug)}
                      >
                        <span>{study.title}</span>
                        <span
                          aria-hidden
                          className="mt-[0.2em] text-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/60"
                        >
                          →
                        </span>
                      </Link>
                    }
                  >
                    <p className="text-[14px] leading-[1.65] text-foreground/70">
                      {study.summary}
                    </p>
                    <p className="mt-3 text-[15px] font-medium leading-[1.45] text-foreground">
                      {verdictHeadline(result)}
                    </p>
                    <p className="mt-1.5 font-mono text-[11px] tabular-nums tracking-[0.06em] text-foreground/45">
                      Computed {longDate(result.computedOn)}
                      {result.asOf
                        ? ` · prices to ${longDate(result.asOf)}`
                        : ""}
                    </p>
                  </Row>
                );
              })}
            </RowList>

            <SeoSection
              aside={
                <p className="text-[12px] leading-[1.5] text-foreground/45">
                  The same rules on every study, and they live in the module
                  that computes it.
                </p>
              }
              title="How a living study works"
              variant="rail"
            >
              <RuleList
                lines={[
                  `A study is a question with two cells to compare. Each cell is a kind of purchase, never a person: a role, a size band, whether the purchase was made inside a cluster.`,
                  `A purchase counts once it has a performance mark and at least ${MIN_HORIZON_DAYS} days between the close it is measured from and the latest close on file. Newer purchases are in the queue, not the sample.`,
                  `A cell states its beat rate, the share of its purchases that beat the index, only once it holds ${MIN_CELL} of them. Below that it shows its count and the date it should reach the floor.`,
                  `The two cells are compared with a standard test for two proportions. When the gap is one that chance would produce at this sample, the page says so rather than picking a winner.`,
                  `Everything is recomputed on every load from the live corpus, and each page prints the day it was computed and the day its prices run to, so a citation carries its own date.`,
                ]}
              />
            </SeoSection>

            <SeoSection
              aside="What the three studies are computed from today."
              title="The dataset"
            >
              {widest && widest.universe.scored >= MIN_CELL ? (
                <StatTiles
                  note={datasetSentence(widest, market.id)}
                  stats={[
                    {
                      label: "Purchases in sample",
                      primary: true,
                      value: String(widest.universe.scored),
                    },
                    {
                      label: "Companies",
                      value: String(widest.universe.companies),
                    },
                    {
                      label: "Beat the index",
                      value: pct(widest.universe.beatRate),
                    },
                    {
                      label: "Arriving per week",
                      value: String(perWeek(widest.universe.arrivalsWeekly)),
                    },
                  ]}
                />
              ) : (
                <p className={`max-w-[62ch] ${R.body}`}>
                  Not enough data yet. The sample opens once {MIN_CELL}{" "}
                  purchases have had {MIN_HORIZON_DAYS} days on the clock.
                </p>
              )}
            </SeoSection>

            <SeoSection title="What this is">
              <p
                className={`max-w-[64ch] text-[15px] leading-[1.65] text-foreground/75`}
              >
                ddbx records every disclosed purchase {market.noun} make in
                their own companies, marks each one against the index from the
                day it was disclosed, and rates the ones that clear{" "}
                <Link
                  className="underline underline-offset-4"
                  to="/how-it-works"
                >
                  six checks
                </Link>
                . The boards on this site rank those purchases. These pages ask
                what the whole record says about a kind of purchase, and hold
                the answer back until the record can carry it. The terms are
                defined in{" "}
                <Link className="underline underline-offset-4" to="/learn">
                  the glossary
                </Link>
                .
              </p>
            </SeoSection>

            <nav aria-label="More from ddbx" className="mt-9">
              <RelatedCards cols={2} items={related} />
            </nav>
          </>
        )}
      </SeoPageShell>
    </DefaultLayout>
  );
}

function IndexSkeleton() {
  return (
    <div aria-busy="true" className="mt-8">
      <span className="sr-only">Loading…</span>
      <div className="border-t border-hairline dark:border-separator">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="grid gap-x-10 gap-y-3 border-b border-hairline py-7 sm:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] sm:py-9 dark:border-separator"
          >
            <div>
              <Skeleton className="h-[24px] w-4/5" />
              <Skeleton className="mt-2 h-[11px] w-24" />
            </div>
            <div>
              <Skeleton className="h-[14px] w-full" />
              <Skeleton className="mt-2.5 h-[14px] w-11/12" />
              <Skeleton className="mt-4 h-[15px] w-3/4" />
            </div>
          </div>
        ))}
      </div>
      <SeoSkeleton rows={2} variant="doc-sections" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// One study
// ---------------------------------------------------------------------------

const SECTIONS = ["cells", "method", "limits", "dataset", "cite"] as const;

export function StudyPage() {
  const { slug } = useParams<{ slug: string }>();
  const study = studyBySlug(slug);
  const market = useSectorMarket();
  const { rows, complete } = useBoardFeed(market.id);
  const marketId = market.id === "US" ? "us" : "uk";
  const results = useStudyResults(rows, market.id);
  const result = results?.find((r) => r.slug === study?.slug) ?? null;
  const failed = rows !== null && rows.length === 0 && !complete;

  if (!study) {
    return (
      <DefaultLayout drawerRight>
        <SeoRail
          marketId={marketId}
          placement="research_missing_rail"
          ukHeading="Start investing"
        />
        <SeoPageShell
          crumbs={[{ label: "Research", to: "/research" }, { label: "Study" }]}
          eyebrow={EYEBROW}
          standfirst="That study doesn’t exist, or it has been renamed. The three that do are listed below."
          title="We haven’t run that one"
        >
          <RelatedCards
            className="mt-8"
            cols={3}
            items={STUDIES.map((s) => ({
              to: studyPath(s.slug),
              title: s.short,
              description: s.summary,
            }))}
          />
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  return (
    <StudyDocument
      complete={complete}
      failed={failed}
      market={market}
      marketId={marketId}
      result={result}
      rows={rows}
      study={study}
    />
  );
}

function StudyDocument({
  study,
  result,
  rows,
  complete,
  failed,
  market,
  marketId,
}: {
  study: Study;
  result: StudyResult | null;
  rows: ReturnType<typeof useBoardFeed>["rows"];
  complete: boolean;
  failed: boolean;
  market: ReturnType<typeof useSectorMarket>;
  marketId: "uk" | "us";
}) {
  const host = MARKET_HOST_BY_ID[marketId] ?? "ddbx.uk";
  const cite = useMemo(
    () => (result ? citation(study, result, host, new Date()) : null),
    [study, result, host],
  );
  const step = (id: (typeof SECTIONS)[number]) => SECTIONS.indexOf(id) + 1;
  const floor = study.floor ? STUDY_FLOOR[market.id] : null;

  const others: RelatedCard[] = [
    ...STUDIES.filter((s) => s.slug !== study.slug).map((s) => ({
      to: studyPath(s.slug),
      title: s.short,
      description: s.summary,
    })),
    {
      to: "/research",
      title: "All living studies",
      description: "The three questions, and how each is answered",
    },
    {
      to: "/how-it-works",
      title: "How the rating works",
      description: "The six checks, and what we can measure",
    },
  ];

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={marketId}
        placement="research_study_rail"
        ukHeading="Start investing"
      />
      <SeoPageShell
        back={<BackLink />}
        crumbs={[
          { label: "Research", to: "/research" },
          { label: study.short },
        ]}
        cta={{
          body: studyCta.body,
          gaLabel: `Study · ${study.slug}`,
          headline: studyCta.headline,
          marketId,
        }}
        eyebrow={`${EYEBROW} · ${market.label}`}
        loading={rows === null}
        notice={
          <>
            <TrackingNotice marketId={market.id} />
            {!complete && rows && rows.length > 0 ? (
              <p className={`mt-3 ${CAVEAT}`}>
                We couldn’t load the whole period, so today’s cells may be
                missing older purchases. A cell can only be under-counted by
                that, never over.
              </p>
            ) : null}
          </>
        }
        skeleton={<StudySkeleton />}
        standfirst={study.standfirst}
        standfirstSize="lede"
        title={study.title}
      >
        {failed || !result ? (
          <CouldNotLoad />
        ) : (
          <>
            <div className="mt-8">
              <VerdictPanel market={market.id} result={result} />
            </div>

            {/* The contents strip: five numbered sections, the same device
                /how-it-works uses, so a reader arriving for the method or the
                citation can go straight there. Not sticky, for the reason
                given on that page. */}
            <nav
              aria-label="On this page"
              className="mt-8 flex flex-wrap gap-1.5"
            >
              {[
                ["cells", "The cells"],
                ["method", "Method"],
                ["limits", "Limits"],
                ["dataset", "Dataset"],
                ["cite", "Cite"],
              ].map(([id, label], i) => (
                <a
                  key={id}
                  className="rounded-full border border-hairline bg-sheet px-2.5 py-1 text-[11.5px] leading-4 text-foreground/70 transition-colors hover:border-brand-brown/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:border-separator dark:bg-surface dark:hover:border-white/20"
                  href={`#${id}`}
                >
                  <span className="mr-1.5 font-mono text-[10px] tabular-nums text-foreground/40">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {label}
                </a>
              ))}
            </nav>

            <SeoSection
              aside="Each cell is a kind of purchase. The two the verdict compares are marked."
              id="cells"
              index={step("cells")}
              title="The cells"
              total={SECTIONS.length}
            >
              <CellChart
                cells={result.cells}
                compareIds={result.compareIds}
                reference={result.universe.beatRate}
                referenceLabel="All purchases in scope"
              />
              <div className="mt-6">
                <CellsTable result={result} />
              </div>
              <div className="mt-4">
                <BehindTheCells study={study} />
              </div>
            </SeoSection>

            <SeoSection
              aside={
                <p className="text-[12px] leading-[1.5] text-foreground/45">
                  The rules that produce the verdict, in the order they are
                  applied. They live in the module that computes it.
                </p>
              }
              id="method"
              index={step("method")}
              title="How it is measured"
              total={SECTIONS.length}
              variant="rail"
            >
              <RuleList
                lines={[
                  ...(floor != null
                    ? [
                        `Purchases under ${market.symbol}${floor.toLocaleString("en-GB")} are left out. That is the pipeline’s own co-buyer floor, the line under which a purchase does not count toward a cluster anywhere on the site, and the role study uses the same line so the two share a universe.`,
                      ]
                    : []),
                  ...study.method,
                  ...METHODOLOGY,
                ]}
              />
            </SeoSection>

            <SeoSection
              aside="Where this study stops, before a reader carries it further than it goes."
              id="limits"
              index={step("limits")}
              title="What this cannot tell you"
              total={SECTIONS.length}
            >
              <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
                {[
                  ...study.caveats,
                  `The mark runs to the latest close, so purchases in the sample have had anywhere from ${MIN_HORIZON_DAYS} days to the whole record on the clock. A cell whose purchases are older has had more time in whichever direction the market went.`,
                  "Beating the index is a yes or no. A purchase that beat it by half a point counts the same as one that beat it by forty, which is why the median alpha sits beside every rate, and why a rate is not a return.",
                ].map((line) => (
                  <p
                    key={line}
                    className="max-w-[54ch] text-[14.5px] leading-[1.65] text-foreground/75"
                  >
                    {line}
                  </p>
                ))}
              </div>
            </SeoSection>

            <SeoSection
              aside={
                <p className="text-[12px] leading-[1.5] text-foreground/45">
                  What this study was computed from today.
                </p>
              }
              id="dataset"
              index={step("dataset")}
              title="The dataset"
              total={SECTIONS.length}
              variant="rail"
            >
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                <Fact k="In sample" v={result.universe.scored} />
                <Fact k="Companies" v={result.universe.companies} />
                <Fact
                  k="Beat the index"
                  v={
                    result.universe.beatRate != null
                      ? pct(result.universe.beatRate)
                      : "Not yet"
                  }
                />
                <Fact
                  k={`Per week, last ${ARRIVAL_WEEKS}`}
                  v={perWeek(result.universe.arrivalsWeekly)}
                />
              </dl>
              <p className="mt-5 max-w-[62ch] text-[13.5px] leading-[1.65] text-foreground/65">
                {datasetSentence(result, market.id)}
              </p>
            </SeoSection>

            <SeoSection
              aside="A living page needs a dated citation. This one carries its own."
              id="cite"
              index={step("cite")}
              title="Cite this page"
              total={SECTIONS.length}
            >
              {cite ? <CitationBlock cite={cite} /> : null}
              <p className="mt-4 max-w-[62ch] text-[13px] leading-[1.6] text-foreground/55">
                The numbers on this page change as purchases mature and new ones
                are filed, so a citation without the computed date is a citation
                of a page that no longer exists. The line above carries both
                dates.
              </p>
            </SeoSection>

            <SeoSection title="What this is">
              <p className="max-w-[64ch] text-[15px] leading-[1.65] text-foreground/75">
                ddbx records every disclosed purchase {market.noun} make in
                their own companies, marks each against the index from the day
                it was disclosed, and rates the ones that clear{" "}
                <Link
                  className="underline underline-offset-4"
                  to="/how-it-works"
                >
                  six checks
                </Link>
                . A living study asks what the whole record says about one kind
                of purchase, and holds the answer until the record can carry it.
                Alpha, clusters and open-market purchases are defined in{" "}
                <Link className="underline underline-offset-4" to="/learn">
                  the glossary
                </Link>
                .
              </p>
            </SeoSection>

            <nav aria-label="More from ddbx" className="mt-9">
              <RelatedCards cols={2} items={others} />
            </nav>
          </>
        )}
      </SeoPageShell>
    </DefaultLayout>
  );
}

/** Stands at the shape that arrives: the verdict sheet, the contents strip,
 *  then the ruled sections. */
function StudySkeleton() {
  return (
    <div aria-busy="true" className="mt-8">
      <span className="sr-only">Loading…</span>
      <div className="rounded-2xl border border-hairline px-5 py-6 sm:px-8 sm:py-8 dark:border-white/[0.07]">
        <Skeleton className="h-[11px] w-28" />
        <Skeleton className="mt-4 h-[34px] w-4/5" />
        <Skeleton className="mt-3 h-[34px] w-3/5" />
        <Skeleton className="mt-5 h-[14px] w-full max-w-[600px]" />
        <Skeleton className="mt-2.5 h-[14px] w-11/12 max-w-[560px]" />
        <Skeleton className="mt-5 h-[11px] w-64" />
      </div>
      <div className="mt-8 flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[26px] w-20 rounded-full" />
        ))}
      </div>
      <SeoSkeleton rows={4} variant="doc-sections" />
    </div>
  );
}

export default StudyPage;
