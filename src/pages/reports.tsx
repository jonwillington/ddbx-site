/** The report archive — /reports.
 *
 *  A stable, dated index of every monthly report. The archive is the half of
 *  "recurring original research" that makes it citable: a rolling page that
 *  silently replaces last month's analysis gives anyone linking to it a moving
 *  target, so the index lists months and every month keeps its own URL forever.
 *
 *  Thin today — the API holds two UK months — and that's fine. It grows by
 *  twelve URLs a year per market without anyone writing anything, because the
 *  reports are already generated. This page exists so that accumulation lands
 *  somewhere.
 *
 *  What it can't be, at n=2, is a grid of cards: two tiles and a footer is a
 *  page that looks broken rather than young. So the newest month is promoted
 *  into a proper lead — its month, its headline, its four figures and a real
 *  button — and the rest stay a ruled list. Between the two sits the one piece
 *  of writing this page needs and never had: what is actually in a report.
 *  Someone arriving from a search for "UK director buying report" has no way to
 *  know whether "clusters" and "alpha" are worth a click.
 */
import type { MonthlySummary, MonthlySummaryListItem } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { monthLabel, reportPath } from "../../shared/months.js";

import DefaultLayout from "@/layouts/default";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { StatTiles } from "@/components/seo/stat-tiles";
import { TrackingNotice } from "@/components/seo/tracking-notice";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import { api } from "@/lib/api";
import { marketForPath } from "@/lib/markets/registry";
import { reportsCta } from "@/components/seo/cta-copy";
import { formatGbp } from "@/lib/performance/format";

const RULE = "border-hairline dark:border-separator";
const BODY = "text-[14px] leading-[1.65] text-foreground/70";

/** What a reader gets for the click. Every line names something the report
 *  page actually renders — the metrics band, the report card, the featured
 *  write-ups, the sector and style tables, the cluster roster. */
const CONTENTS: { label: string; description: string }[] = [
  {
    label: "The month in numbers",
    description:
      "How many purchases were disclosed, what they were worth, and how many companies and individual insiders they covered.",
  },
  {
    label: "A report card on the last one",
    description:
      "Every buy we featured the previous month, re-marked against the latest close — the ones that went wrong published beside the ones that didn’t.",
  },
  {
    label: "The standout buys, written up",
    description:
      "A handful of purchases in full: what happened, whether the value has already gone, and whether there is still a case.",
  },
  {
    label: "Where the money went",
    description:
      "The month split by sector and by buy style, with the median return and the median alpha against the benchmark for each slice.",
  },
  {
    label: "Clusters",
    description:
      "The companies where two or more insiders bought in the same month — the pattern that reads least like a one-off.",
  },
];

export default function ReportsPage() {
  const { marketId, marketParam, label } = useMemo(() => {
    const id = marketForPath(
      "/",
      typeof window === "undefined" ? undefined : window.location.hostname,
    ).id;
    const us = id === "us" || id === "usg" || id === "djt";

    return {
      marketId: (us ? "us" : "uk") as "uk" | "us",
      marketParam: us ? "US" : undefined,
      label: us ? "US insider buying" : "UK director buying",
    };
  }, []);

  const [months, setMonths] = useState<MonthlySummaryListItem[] | null>(null);
  const [latest, setLatest] = useState<MonthlySummary | null>(null);

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

  const sorted = useMemo(
    () => [...(months ?? [])].sort((a, b) => b.month.localeCompare(a.month)),
    [months],
  );
  const newest = sorted[0]?.month;

  // The index endpoint carries headlines but no figures, so the lead needs the
  // newest month's full summary. One extra request, only for the month being
  // promoted — the rest of the archive stays a headline list.
  useEffect(() => {
    if (!newest) return;
    let live = true;

    setLatest(null);
    api
      .monthlySummary(newest, marketParam)
      .then((r) => live && r?.summary && setLatest(r.summary))
      .catch(() => live && setLatest(null));

    return () => {
      live = false;
    };
  }, [newest, marketParam]);

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={marketId}
        placement="reports_rail"
        ukHeading="Start investing"
      />
      <SeoPageShell
        cta={{
          body: reportsCta.body,
          gaLabel: "Reports archive",
          headline: reportsCta.headline,
          marketId,
          screenshotSlot: "recap",
        }}
        eyebrow="Monthly report"
        footnote="Reports are generated from disclosed filings and marked against subsequent closing prices. Past performance is not a reliable indicator of future results."
        loading={months === null}
        notice={<TrackingNotice />}
        skeleton={<SeoSkeleton rows={3} variant="ruled-list" />}
        standfirst="A report every month: what insiders bought, what it was worth, which sectors they concentrated in, and how the previous month’s featured buys have actually performed since — including the ones that didn’t work."
        title={`${label} reports`}
      >
        {sorted.length === 0 ? (
          <p className={`mt-10 ${BODY}`}>
            No reports published for this market yet.
          </p>
        ) : (
          <>
            <LatestReport item={sorted[0]} summary={latest} />

            <SeoSection title="What’s in every report">
              <dl className={`border-t ${RULE}`}>
                {CONTENTS.map((row) => (
                  <div
                    key={row.label}
                    className={`grid gap-x-8 gap-y-1 border-b ${RULE} py-3.5 sm:grid-cols-[13rem_minmax(0,1fr)]`}
                  >
                    <dt className="text-[13.5px] font-medium text-foreground">
                      {row.label}
                    </dt>
                    <dd className={`max-w-[62ch] ${BODY}`}>
                      {row.description}
                    </dd>
                  </div>
                ))}
              </dl>
            </SeoSection>

            <SeoSection
              aside={`${sorted.length} ${sorted.length === 1 ? "month" : "months"}, newest first. Every month keeps its own URL.`}
              title="Every report"
            >
              <ul className={`border-t ${RULE}`}>
                {sorted.map((m) => (
                  <li key={m.month} className={`border-b ${RULE} py-4`}>
                    <div className="flex items-baseline justify-between gap-4">
                      <Link
                        className="min-w-0 text-[16px] font-semibold tracking-[-0.01em] text-foreground underline-offset-4 hover:underline"
                        to={reportPath(m.month)}
                      >
                        {monthLabel(m.month)}
                      </Link>
                      {m.created_at ? (
                        <time
                          className="shrink-0 font-mono text-[11px] tabular-nums text-foreground/45"
                          dateTime={m.created_at}
                        >
                          {publishedLabel(m.created_at)}
                        </time>
                      ) : null}
                    </div>
                    <p className={`mt-1.5 max-w-[62ch] ${BODY}`}>
                      {m.headline}
                    </p>
                  </li>
                ))}
              </ul>
            </SeoSection>
          </>
        )}
      </SeoPageShell>
    </DefaultLayout>
  );
}

/** The newest month, promoted. The figures arrive a beat after the headline
 *  does; the sheet is laid out so their arrival fills a gap rather than pushing
 *  the button down the page. */
function LatestReport({
  item,
  summary,
}: {
  item: MonthlySummaryListItem;
  summary: MonthlySummary | null;
}) {
  const label = monthLabel(item.month);
  const metrics = summary?.metrics;

  return (
    <section
      className={`mt-8 rounded-2xl border ${RULE} bg-sheet px-5 py-5 dark:bg-surface sm:px-6 sm:py-6`}
    >
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-brown dark:text-brand-tan">
        Latest report
      </p>
      <h2 className="mt-2 text-[24px] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground">
        {label}
      </h2>
      <p className="mt-2 max-w-[58ch] text-[16.5px] leading-[1.5] tracking-[-0.006em] text-foreground/85">
        {item.headline}
      </p>

      {metrics ? (
        <StatTiles
          className="mt-5"
          cols={4}
          stats={[
            { label: "Buys disclosed", value: String(metrics.total_buys) },
            {
              label: "Committed",
              value: formatGbp(metrics.total_value_gbp, { compact: true }),
              primary: true,
            },
            { label: "Companies", value: String(metrics.distinct_companies) },
            { label: "Insiders", value: String(metrics.distinct_directors) },
          ]}
        />
      ) : null}

      <Link
        className={`mt-5 inline-flex items-center ${BUTTON_FILLED} ${BUTTON_RADIUS} px-4 py-2 text-[14px] font-medium`}
        to={reportPath(item.month)}
      >
        Read the {label} report
      </Link>
    </section>
  );
}

/** "2026-07-01T…" → "1 Jul 2026". Empty when unparseable. */
function publishedLabel(iso: string): string {
  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
