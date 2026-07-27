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
 */
import type {
  MonthlySummary,
  MonthlySummaryListItem,
  MonthlySummaryResponse,
} from "@/types/ddbx";
import type { RelatedCard } from "@/components/seo/related-cards";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { monthLabel, reportPath, slugToMonth } from "../../shared/months.js";

import { MonthlyClusters } from "@/components/monthly/monthly-clusters";
import { MonthlyFeatured } from "@/components/monthly/monthly-featured";
import { MonthlyMetrics } from "@/components/monthly/monthly-metrics";
import { MonthlyPerformanceSection } from "@/components/monthly/monthly-performance";
import { Prose } from "@/components/monthly/monthly-prose";
import DefaultLayout from "@/layouts/default";
import { MeterBar } from "@/components/seo/meter-bar";
import { RelatedCards } from "@/components/seo/related-cards";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { Skeleton } from "@/components/skeleton";
import { StatTiles } from "@/components/seo/stat-tiles";
import { TickerPill } from "@/components/ticker-pill";
import { DeltaBadge } from "@/components/market/market-row";
import { api } from "@/lib/api";
import { marketForPath } from "@/lib/markets/registry";
import { reportsCta } from "@/components/seo/cta-copy";
import { formatGbp, formatSignedPct } from "@/lib/performance/format";

const RULE = "border-hairline dark:border-separator";
const LABEL = "text-[11px] leading-none text-foreground/50";
const BODY = "text-[14px] leading-[1.65] text-foreground/70";

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
            screenshotSlot: "recap",
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
            <Link className="underline underline-offset-4" to="/reports">
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
          screenshotSlot: "recap",
        }}
        eyebrow="Monthly report"
        footnote="Reports are generated from disclosed filings and marked against subsequent closing prices — the latest cached close, not live prices. Past performance is not a reliable indicator of future results."
        loading={!summary}
        notice={summary ? <Byline summary={summary} /> : undefined}
        skeleton={<ReportSkeleton />}
        standfirst={summary?.headline}
        standfirstSize="lede"
        title={`${label} insider buying report`}
      >
        {summary ? (
          <>
            {summary.intro && (
              <div className="mt-6">
                <Prose text={summary.intro} />
              </div>
            )}

            <div className="mt-8">
              <MonthlyMetrics metrics={summary.metrics} variant="page" />
            </div>

            {summary.macro_note && (
              <SeoSection title="Market backdrop">
                <Prose text={summary.macro_note} />
              </SeoSection>
            )}

            {summary.report_card && (
              <SeoSection
                aside="Last month’s featured buys, re-marked — misses included."
                title={`How ${monthLabel(summary.report_card.graded_month)}’s picks did`}
              >
                <ReportCard card={summary.report_card} />
              </SeoSection>
            )}

            {summary.metrics.sector_table &&
              summary.metrics.sector_table.length > 0 && (
                <SeoSection
                  aside="Ranked by money committed. Alpha is the median buy’s return less the benchmark over the same window."
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
              <SeoSection title="Featured buys">
                <MonthlyFeatured
                  openFirst
                  heading={false}
                  items={summary.featured}
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

            {neighbours.length > 0 && (
              <SeoSection title="More reports">
                <RelatedCards cols={2} items={neighbours} />
                <p className={`mt-4 ${BODY}`}>
                  <Link className="underline underline-offset-4" to="/reports">
                    See every report
                  </Link>
                  .
                </p>
              </SeoSection>
            )}
          </>
        ) : null}
      </SeoPageShell>
    </DefaultLayout>
  );
}

/** The document's own shape while it loads. The page opens with its written
 *  intro and only then states the figures, and the figures are two tile rows —
 *  five headline stats and the returns row — so a skeleton that led with one
 *  tile row was redrawing the top of the page rather than filling it in.
 *
 *  The negative margins cancel the `stat-tiles` variant's own `mt-6` down to
 *  the gaps the loaded rows actually sit at (`mt-8`, then `space-y-2`). */
function ReportSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading…</span>

      <div className="mt-6 space-y-3">
        <Skeleton className="h-[15px] w-full max-w-[600px]" />
        <Skeleton className="h-[15px] w-full max-w-[580px]" />
        <Skeleton className="h-[15px] w-4/5 max-w-[440px]" />
      </div>

      <SeoSkeleton className="mt-2" rows={5} variant="stat-tiles" />
      <SeoSkeleton className="-mt-4" rows={4} variant="stat-tiles" />
      <SeoSkeleton className="mt-6" rows={4} variant="doc-sections" />
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

/** The scorecard for the previous month's featured picks.
 *
 *  Publishing the misses next to the hits is the point — a report that only
 *  ever showed winners would be marketing. */
function ReportCard({
  card,
}: {
  card: NonNullable<MonthlySummaryResponse["summary"]["report_card"]>;
}) {
  const asOf = localeDate(card.as_of) || card.as_of;

  return (
    <div>
      <StatTiles
        cols={2}
        stats={[
          { label: "Hits", value: String(card.hits), tone: "positive" },
          { label: "Misses", value: String(card.misses), tone: "negative" },
        ]}
      />

      <p className={`mt-4 ${BODY}`}>
        {card.hits} of {card.hits + card.misses} featured buys were up as of{" "}
        {asOf}.
      </p>

      <ul className={`mt-4 border-t ${RULE}`}>
        {card.items.map((item) => (
          <li
            key={item.dealing_id}
            className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b ${RULE} py-2.5`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <TickerPill ticker={item.ticker} />
              <span className="truncate text-[13.5px] text-foreground/85">
                {item.company}
              </span>
            </span>
            {/* Both marks, side by side. `return_now` is the entry→latest-close
                mark taken at grading time and the number the hits/misses count
                is built from; `return_at_publication` is what it looked like
                when we featured it. Showing only the first hides the story the
                page is best at telling — a pick published at +27.2% and now
                −7.8% is the whole reason a scorecard is worth reading. */}
            <span className="flex shrink-0 items-center gap-2.5">
              {item.return_at_publication != null && (
                <span className="font-mono text-[12px] tabular-nums text-foreground/45">
                  {formatSignedPct(item.return_at_publication)} at publication
                </span>
              )}
              {item.return_now == null ? (
                <span className="font-mono text-[13px] tabular-nums text-foreground/45">
                  —
                </span>
              ) : (
                <DeltaBadge value={item.return_now * 100} />
              )}
            </span>
          </li>
        ))}
      </ul>
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
