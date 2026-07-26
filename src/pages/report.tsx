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
 *  compete.
 *
 *  Worth being explicit about the report card, because it's unusual: it scores
 *  our own previous month's picks and publishes the misses alongside the hits.
 *  That is the strongest trust signal on the site, and it's the reason this
 *  page is the one most likely to be cited rather than merely read.
 */
import type {
  MonthlySummaryListItem,
  MonthlySummaryResponse,
} from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { monthLabel, reportPath, slugToMonth } from "../../shared/months.js";

import { MonthlyClusters } from "@/components/monthly/monthly-clusters";
import { MonthlyFeatured } from "@/components/monthly/monthly-featured";
import { MonthlyMetrics } from "@/components/monthly/monthly-metrics";
import { MonthlyPerformanceSection } from "@/components/monthly/monthly-performance";
import { Prose } from "@/components/monthly/monthly-prose";
import { StoreBadges } from "@/components/app-store-badge";
import DefaultLayout from "@/layouts/default";
import { api } from "@/lib/api";
import { marketForPath } from "@/lib/markets/registry";

const R = {
  rule: "border-[#e8e0d5] dark:border-separator",
  label: "text-[11px] leading-none text-foreground/50",
  body: "text-[14px] leading-[1.65] text-foreground/70",
} as const;

export default function ReportPage() {
  const { month: slug } = useParams<{ month: string }>();
  const month = useMemo(() => slugToMonth(slug ?? ""), [slug]);

  // Reports are per-market and the market comes from the domain, exactly as it
  // does for company pages.
  const marketParam = useMemo(() => {
    const id = marketForPath(
      "/",
      typeof window === "undefined" ? undefined : window.location.hostname,
    ).id;

    return id === "us" || id === "usg" || id === "djt" ? "US" : undefined;
  }, []);

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

  if (state === "missing") {
    return (
      <DefaultLayout>
        <p className="mx-auto max-w-3xl py-20 text-base text-foreground/65">
          We haven’t published a report for that month.{" "}
          <Link className="underline" to="/reports">
            See every report
          </Link>
          .
        </p>
      </DefaultLayout>
    );
  }

  const summary = data?.summary;
  const label = monthLabel(month);

  return (
    <DefaultLayout>
      <article className="mx-auto w-full max-w-[860px] pb-16">
        <nav className={`${R.label} pt-2`}>
          <Link className="hover:text-foreground/70" to="/reports">
            Reports
          </Link>
          <span className="mx-1.5 opacity-40">/</span>
          <span>{label}</span>
        </nav>

        <h1 className="mt-5 text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-[38px]">
          {label} insider buying report
        </h1>

        {state === "loading" || !summary ? (
          <ReportSkeleton />
        ) : (
          <>
            <p className="mt-4 text-balance text-[19px] font-semibold leading-snug text-foreground/90">
              {summary.headline}
            </p>

            {summary.intro && (
              <div className="mt-5">
                <Prose text={summary.intro} />
              </div>
            )}

            <div className="mt-8">
              <MonthlyMetrics metrics={summary.metrics} />
            </div>

            {summary.macro_note && (
              <Section title="Market backdrop">
                <Prose text={summary.macro_note} />
              </Section>
            )}

            {summary.report_card && (
              <Section
                title={`How ${monthLabel(summary.report_card.graded_month)}’s picks did`}
              >
                <ReportCard card={summary.report_card} />
              </Section>
            )}

            {summary.metrics.sector_table &&
              summary.metrics.sector_table.length > 0 && (
                <Section title="By sector">
                  <SectorTable rows={summary.metrics.sector_table} />
                </Section>
              )}

            {summary.featured?.length > 0 && (
              <Section title="Featured buys">
                <MonthlyFeatured items={summary.featured} />
              </Section>
            )}

            {summary.clusters?.length > 0 && (
              <Section title="Clusters">
                <MonthlyClusters clusters={summary.clusters} />
              </Section>
            )}

            {data?.performance && (
              <Section title="How the month's buys performed">
                <MonthlyPerformanceSection performance={data.performance} />
                <p className={`mt-4 ${R.label} leading-[1.6]`}>
                  Past performance is not a reliable indicator of future
                  results. Returns are measured from the disclosed buy against
                  the latest cached close, not live prices.
                </p>
              </Section>
            )}
          </>
        )}

        {months.length > 1 && (
          <Section title="Other months">
            <ul className="space-y-1.5">
              {months
                .filter((m) => m.month !== month)
                .map((m) => (
                  <li key={m.month}>
                    <Link
                      className="text-[14.5px] text-foreground/85 underline-offset-4 hover:underline"
                      to={reportPath(m.month)}
                    >
                      {monthLabel(m.month)}
                    </Link>
                    <span className={`ml-2 ${R.label}`}>{m.headline}</span>
                  </li>
                ))}
            </ul>
          </Section>
        )}

        <div className={`mt-10 border-t ${R.rule} pt-6`}>
          <p className={R.body}>
            Every buy in this report is tracked live in the app, with the
            analysis and price history attached.
          </p>
          <StoreBadges className="mt-4" />
        </div>
      </article>
    </DefaultLayout>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`mt-10 border-t ${R.rule} pt-7`}>
      <h2 className="text-[17px] font-semibold leading-[1.3] tracking-[-0.015em] text-foreground">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
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
  return (
    <div>
      <p className={R.body}>
        {card.hits} of {card.hits + card.misses} featured buys were up as of{" "}
        {card.as_of}.
      </p>
      <ul className="mt-4 space-y-2">
        {card.items.map((item) => (
          <li
            key={item.dealing_id}
            className={`flex items-baseline justify-between gap-4 border-b ${R.rule} pb-2 last:border-b-0`}
          >
            <span className="min-w-0">
              <span className="text-[14px] font-medium text-foreground">
                {item.ticker}
              </span>
              <span className={`ml-2 ${R.label}`}>{item.company}</span>
            </span>
            {/* return_now is the entry→latest-close mark taken at grading
                time, which is the number the hits/misses count is built from
                — return_at_publication is what it looked like when featured
                and would flatter the scorecard. */}
            <span className="shrink-0 font-mono text-[13px] tabular-nums text-foreground/75">
              {item.return_now == null
                ? "—"
                : `${item.return_now > 0 ? "+" : ""}${(item.return_now * 100).toFixed(1)}%`}
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

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[420px] border-collapse text-left">
        <thead>
          <tr className={`border-b ${R.rule}`}>
            <th
              className={`${R.label} pb-2 pr-4 font-semibold uppercase tracking-[0.1em]`}
            >
              Sector
            </th>
            <th
              className={`${R.label} pb-2 pr-4 font-semibold uppercase tracking-[0.1em]`}
            >
              Buys
            </th>
            <th
              className={`${R.label} pb-2 pr-4 font-semibold uppercase tracking-[0.1em]`}
            >
              Value
            </th>
            <th
              className={`${R.label} pb-2 font-semibold uppercase tracking-[0.1em]`}
            >
              Median alpha
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.sector}
              className={`border-b ${R.rule} last:border-b-0`}
            >
              <th className="py-2.5 pr-4 text-[13.5px] font-medium text-foreground">
                {row.sector}
              </th>
              <td className="py-2.5 pr-4 text-[13.5px] tabular-nums text-foreground/70">
                {row.buy_count}
              </td>
              <td className="py-2.5 pr-4 text-[13.5px] tabular-nums text-foreground/70">
                £
                {Math.round(row.total_value_gbp / 1000).toLocaleString("en-GB")}
                k
              </td>
              <td className="py-2.5 text-[13.5px] tabular-nums text-foreground/70">
                {row.median_alpha == null
                  ? "—"
                  : `${row.median_alpha > 0 ? "+" : ""}${(row.median_alpha * 100).toFixed(1)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="mt-8 animate-pulse space-y-4">
      <div className="h-6 w-2/3 rounded bg-foreground/10" />
      <div className="h-24 rounded bg-foreground/[0.06]" />
      <div className="h-48 rounded bg-foreground/[0.06]" />
    </div>
  );
}
