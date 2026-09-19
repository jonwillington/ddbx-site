/** Living studies — /research and /us/research, each an index and /:slug.
 *
 *  Evergreen research questions recomputed from the record on every load,
 *  written to be cited. The questions, the cells, the thresholds, the
 *  statistics and every sentence that states a number live in
 *  shared/studies.js, which shared/research-prerender.js renders for crawlers
 *  from the same fetch: a study whose pre-rendered verdict differs from its
 *  hydrated one is worse than no study.
 *
 *  Path-based, not host-based: the market is a prop from the route (/research
 *  is UK, /us/research is US, on any host), because a study is cited by URL
 *  and a URL whose meaning depends on the domain it was pasted under is not a
 *  citation.
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
  floorLine,
  indexRules,
  measurementLine,
  num,
  pct,
  studyBySlug,
  studyPath,
  verdictHeadline,
  ARRIVAL_WEEKS,
  HORIZON_DAYS,
  METHODOLOGY,
  MIN_CELL,
  MIN_COMPANIES,
  SHARED_LIMITS,
  STUDIES,
  STUDY_FLOOR,
} from "../../shared/studies.js";

import { R, type SectorMarket } from "@/components/sector-ui";
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
import { MARKETS, marketHref } from "@/lib/markets/registry";
import { useStudyInputs, type StudyInputs } from "@/lib/study-inputs";
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
import { NOTICE } from "@/components/ui/notice";

const EYEBROW = "Living study";
const CAVEAT = NOTICE;

/** The number the index and the study pages both call the room: purchases
 *  per week entering the studies’ universe, from the last ARRIVAL_WEEKS. */
const perWeek = (n: number) => (n >= 10 ? Math.round(n) : n.toFixed(1));

type StudyMarketId = "UK" | "US";

const MARKET: Record<StudyMarketId, SectorMarket> = {
  UK: { id: "UK", label: "UK", noun: "directors", symbol: "£" },
  US: { id: "US", label: "US", noun: "insiders", symbol: "$" },
};

/** A board or explainer in the study's market. Boards are host-based, so on
 *  a host that is not the market's own this is an absolute URL to its domain;
 *  on localhost and previews it stays relative. */
function marketPath(market: StudyMarketId, path: string): string {
  const entry = MARKETS.find((m) => m.id === market.toLowerCase());

  return entry
    ? marketHref(
        entry,
        path,
        typeof window === "undefined" ? undefined : window.location.hostname,
      )
    : path;
}

function useStudyResults(
  inputs: StudyInputs,
  market: StudyMarketId,
): StudyResult[] | null {
  const { rows, outcomes } = inputs;

  return useMemo(
    () =>
      rows === null || outcomes === null
        ? null
        : STUDIES.map((s) =>
            computeStudy(s, rows, outcomes, market, new Date()),
          ),
    [rows, outcomes, market],
  );
}

/** The failed-fetch state, which is not an empty one. */
function CouldNotLoad() {
  return (
    <p className={`mt-10 max-w-measure ${R.body}`}>
      We couldn’t load the filings or their outcomes just now. It’s a network
      problem rather than a finding about the market. Try a refresh in a moment.
    </p>
  );
}

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

export function ResearchIndexPage({
  market: marketKey = "UK",
}: {
  market?: StudyMarketId;
}) {
  const market = MARKET[marketKey];
  const inputs = useStudyInputs(market.id);
  const { rows, complete, failed } = inputs;
  const marketId = market.id === "US" ? "us" : "uk";
  const results = useStudyResults(inputs, market.id);

  // The dataset figures on the index come from the widest universe, which is
  // the size study’s (no floor). Every study reads the same fetch, so this is
  // the corpus, not a study’s slice of it.
  const widest = results?.find((r) => r.slug === "does-size-matter") ?? null;

  const standfirst = (
    <>
      Three questions people ask about {market.noun} buying their own shares,
      answered from the disclosures themselves and recomputed on every load.
      Each is published only once there are enough resolved purchases, from
      enough companies, to carry it; until then the page says what is missing
      and when it should exist.
    </>
  );

  const related: RelatedCard[] = [
    {
      to: marketPath(market.id, "/how-it-works"),
      title: "How the rating works",
      description: "The six checks, and what we can measure",
    },
    {
      to: marketPath(market.id, "/best-performing-buys"),
      title: "The best-performing buys",
      description: "Ranked on alpha, not return",
    },
    {
      to: marketPath(market.id, "/roles"),
      title: "Buying by role",
      description: "The purchases behind the role cells",
    },
    {
      to: marketPath(market.id, "/cluster-buys"),
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
        loading={rows === null && !failed}
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
                        to={studyPath(study.slug, market.id)}
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
                    <p className="text-body text-foreground/70">
                      {study.summary}
                    </p>
                    <p className="mt-3 text-lede font-medium text-foreground">
                      {verdictHeadline(result)}
                    </p>
                    <p className="mt-1.5 font-mono text-caption tabular-nums text-foreground/45">
                      {measurementLine(result)}
                    </p>
                  </Row>
                );
              })}
            </RowList>

            <SeoSection
              aside={
                <p className="text-small text-foreground/45">
                  The same rules on every study, and they live in the module
                  that computes it.
                </p>
              }
              title="How a living study works"
              variant="rail"
            >
              <RuleList lines={indexRules()} />
            </SeoSection>

            <SeoSection
              aside="What the three studies are computed from today."
              title="The dataset"
            >
              {widest &&
              widest.universe.scored >= MIN_CELL &&
              widest.universe.companies >= MIN_COMPANIES ? (
                <StatTiles
                  note={datasetSentence(widest, market.id)}
                  stats={[
                    {
                      label: "Purchases in sample",
                      primary: true,
                      value: num(widest.universe.scored),
                    },
                    {
                      label: "Companies",
                      value: num(widest.universe.companies),
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
                <p className={`max-w-measure ${R.body}`}>
                  Not enough data yet. The sample opens once {MIN_CELL}{" "}
                  purchases across {MIN_COMPANIES} companies have had their{" "}
                  {HORIZON_DAYS} days.
                </p>
              )}
            </SeoSection>

            <SeoSection title="What this is">
              <p className={`max-w-[64ch] text-lede text-foreground/75`}>
                ddbx records every disclosed purchase {market.noun} make in
                their own companies, marks each one against the index from the
                day it was disclosed, and rates the ones that clear{" "}
                <Link
                  className="underline underline-offset-4"
                  to={marketPath(market.id, "/how-it-works")}
                >
                  six checks
                </Link>
                . The boards on this site rank those purchases. These pages ask
                what the whole record says about a kind of purchase, and hold
                the answer back until the record can carry it. The terms are
                defined in{" "}
                <Link
                  className="underline underline-offset-4"
                  to={marketPath(market.id, "/learn")}
                >
                  the glossary
                </Link>
                .
              </p>
            </SeoSection>

            <nav aria-label="More from ddbx" className="mt-10">
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
      <div className="border-t border-rule">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="grid gap-x-10 gap-y-3 border-b border-rule py-7 sm:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] sm:py-9"
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

export function StudyPage({
  market: marketKey = "UK",
}: {
  market?: StudyMarketId;
}) {
  const { slug } = useParams<{ slug: string }>();
  const study = studyBySlug(slug);
  const market = MARKET[marketKey];
  const inputs = useStudyInputs(market.id);
  const { rows, complete, failed } = inputs;
  const marketId = market.id === "US" ? "us" : "uk";
  const results = useStudyResults(inputs, market.id);
  const result = results?.find((r) => r.slug === study?.slug) ?? null;

  if (!study) {
    return (
      <DefaultLayout drawerRight>
        <SeoRail
          marketId={marketId}
          placement="research_missing_rail"
          ukHeading="Start investing"
        />
        <SeoPageShell
          crumbs={[
            { label: "Research", to: studyPath(null, market.id) },
            { label: "Study" },
          ]}
          eyebrow={EYEBROW}
          standfirst="That study doesn’t exist, or it has been renamed. The three that do are listed below."
          title="We haven’t run that one"
        >
          <RelatedCards
            className="mt-8"
            cols={3}
            items={STUDIES.map((s) => ({
              to: studyPath(s.slug, market.id),
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
  rows: StudyInputs["rows"];
  complete: boolean;
  failed: boolean;
  market: SectorMarket;
  marketId: "uk" | "us";
}) {
  const cite = useMemo(
    () => (result ? citation(study, result, new Date()) : null),
    [study, result],
  );
  const step = (id: (typeof SECTIONS)[number]) => SECTIONS.indexOf(id) + 1;
  const floor = study.floor ? STUDY_FLOOR[market.id] : null;

  const others: RelatedCard[] = [
    ...STUDIES.filter((s) => s.slug !== study.slug).map((s) => ({
      to: studyPath(s.slug, market.id),
      title: s.short,
      description: s.summary,
    })),
    {
      to: studyPath(null, market.id),
      title: "All living studies",
      description: "The three questions, and how each is answered",
    },
    {
      to: marketPath(market.id, "/how-it-works"),
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
          { label: "Research", to: studyPath(null, market.id) },
          { label: study.short },
        ]}
        cta={{
          body: studyCta.body,
          gaLabel: `Study · ${study.slug}`,
          headline: studyCta.headline,
          marketId,
        }}
        eyebrow={`${EYEBROW} · ${market.label}`}
        loading={rows === null && !failed}
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
                  className="rounded-full border border-rule bg-sheet px-2.5 py-1 text-caption leading-4 text-foreground/70 transition-colors hover:border-brand-brown/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:bg-surface dark:hover:border-white/20"
                  href={`#${id}`}
                >
                  <span className="mr-1.5 micro tabular-nums text-foreground/40">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {label}
                </a>
              ))}
            </nav>

            <SeoSection
              aside={
                result.kind === "trend"
                  ? "Each cell is a kind of purchase. The verdict tests the trend across every band marked."
                  : "Each cell is a kind of purchase. The two the verdict compares are marked."
              }
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
                <BehindTheCells
                  hrefFor={(path) => marketPath(market.id, path)}
                  study={study}
                />
              </div>
            </SeoSection>

            <SeoSection
              aside={
                <p className="text-small text-foreground/45">
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
                  ...(floor != null ? [floorLine(market.id, floor)] : []),
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
                {[...study.caveats, ...SHARED_LIMITS].map((line) => (
                  <p
                    key={line}
                    className="max-w-[54ch] text-body text-foreground/75"
                  >
                    {line}
                  </p>
                ))}
              </div>
            </SeoSection>

            <SeoSection
              aside={
                <p className="text-small text-foreground/45">
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
                <Fact k="In sample" v={num(result.universe.scored)} />
                <Fact k="Companies" v={num(result.universe.companies)} />
                <Fact
                  k="Beat the index"
                  v={
                    result.universe.beatRate != null
                      ? pct(result.universe.beatRate)
                      : "Not yet"
                  }
                />
                <Fact
                  k={`Waiting for ${HORIZON_DAYS} days`}
                  v={num(result.universe.pending)}
                />
              </dl>
              <p className="mt-5 max-w-measure text-body text-foreground/65">
                {datasetSentence(result, market.id)} Purchases arriving in scope
                over the last {ARRIVAL_WEEKS} weeks:{" "}
                {perWeek(result.universe.arrivalsWeekly)} a week.
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
              <p className="mt-4 max-w-measure text-small text-foreground/55">
                The numbers on this page change as purchases reach their{" "}
                {HORIZON_DAYS} days and new ones are filed, so a citation
                without a version is a citation of a page that no longer exists.
                The dataset version above is the date the outcomes run to and a
                fingerprint of exactly which purchases and outcomes were
                counted: a reader who later sees the same version is looking at
                the same study.
              </p>
            </SeoSection>

            <SeoSection title="What this is">
              <p className="max-w-[64ch] text-lede text-foreground/75">
                ddbx records every disclosed purchase {market.noun} make in
                their own companies, marks each against the index from the day
                it was disclosed, and rates the ones that clear{" "}
                <Link
                  className="underline underline-offset-4"
                  to={marketPath(market.id, "/how-it-works")}
                >
                  six checks
                </Link>
                . A living study asks what the whole record says about one kind
                of purchase, and holds the answer until the record can carry it.
                Abnormal return, clusters and open-market purchases are defined
                in{" "}
                <Link
                  className="underline underline-offset-4"
                  to={marketPath(market.id, "/learn")}
                >
                  the glossary
                </Link>
                .
              </p>
            </SeoSection>

            <nav aria-label="More from ddbx" className="mt-10">
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
      <div className="rounded-card border border-rule px-5 py-6 sm:px-8 sm:py-8">
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
