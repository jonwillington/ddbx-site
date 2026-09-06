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

import {
  REPORT_CONTENTS,
  monthLabel,
  reportPath,
} from "../../shared/months.js";

import DefaultLayout from "@/layouts/default";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { Skeleton } from "@/components/skeleton";
import { StatTiles } from "@/components/seo/stat-tiles";
import { TrackingNotice } from "@/components/seo/tracking-notice";
import { Row, RowList } from "@/components/row-list";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import { api } from "@/lib/api";
import { marketForPath } from "@/lib/markets/registry";
import { reportsCta } from "@/components/seo/cta-copy";
import { formatGbp } from "@/lib/performance/format";

const RULE = "border-hairline dark:border-separator";
const BODY = "text-[14px] leading-[1.65] text-foreground/70";

/** The `Row` geometry from row-list.tsx, for the skeleton that stands in for
 *  the "What's in every report" list. Written out rather than imported because
 *  the component keeps its own class string private; kept beside the loaded
 *  list here so the two are read together when either changes. */
const CONTENTS_ROW = `grid gap-x-10 gap-y-3 border-b ${RULE} py-7 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] sm:py-9`;

/** The promoted month's sheet — shared with the skeleton for the same reason.
 *
 *  A contrast panel: a dark object on the cream page, which is the design
 *  language's first tenet naming the exact device for emphasis. It was a
 *  raised cream sheet on a cream page, which is the same shape as every other
 *  block on the archive and so promoted nothing.
 *
 *  The `dark` class does the work rather than a set of overrides. Everything
 *  inside — the eyebrow, the tiles, the filled button, the loading bars — is
 *  already written with a dark-theme form, and the theme is a class the
 *  variant reads off any ancestor (`@custom-variant dark (&:is(.dark *))`), so
 *  scoping it here gets all of them at once and forks none of them. `surface`
 *  rather than `background`, so the panel stays a panel on the dark theme too:
 *  on the cream page it is the contrast, on the dark page it is a step above
 *  the ground. */
const LEAD_SHEET =
  "dark mt-8 rounded-[28px] border border-white/10 bg-surface px-5 py-6 text-foreground shadow-[0_24px_60px_-30px_rgba(40,25,10,0.55)] sm:px-8 sm:py-8";

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
  // Separate from `latest === null` so the lead sheet can tell "the figures are
  // coming" from "that request failed" — the first reserves their height, the
  // second closes the gap rather than pulsing at the reader forever.
  const [figuresPending, setFiguresPending] = useState(true);

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
  // Everything the lead sheet doesn't already publish.
  const earlier = useMemo(() => sorted.slice(1), [sorted]);

  // The index endpoint carries headlines but no figures, so the lead needs the
  // newest month's full summary. One extra request, only for the month being
  // promoted — the rest of the archive stays a headline list.
  useEffect(() => {
    if (!newest) return;
    let live = true;

    setLatest(null);
    setFiguresPending(true);
    api
      .monthlySummary(newest, marketParam)
      .then((r) => {
        if (!live) return;
        if (r?.summary) setLatest(r.summary);
        setFiguresPending(false);
      })
      .catch(() => live && setFiguresPending(false));

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
        }}
        eyebrow="Monthly report"
        loading={months === null}
        notice={<TrackingNotice />}
        skeleton={<ArchiveSkeleton />}
        standfirst="A report every month: what insiders bought, what it was worth, which sectors they concentrated in, and how the previous month’s featured buys have actually performed since, including the ones that didn’t work."
        title={`${label} reports`}
      >
        {sorted.length === 0 ? (
          <p className={`mt-10 ${BODY}`}>
            No reports published for this market yet.
          </p>
        ) : (
          <>
            <LatestReport
              figuresPending={figuresPending}
              item={sorted[0]}
              summary={latest}
            />

            {/* The house selling list, not a definition list. These five
                entries are the argument for clicking into a report at all —
                someone arriving from a search for "UK director buying report"
                has no way to know whether "clusters" and "alpha" are worth a
                click — and a 13.5px label in a 13rem rail set them as
                documentation. `RowList` is tenet 3 of the design language and
                exists for exactly this: the heading carries the claim, the
                paragraph beside it earns the claim. */}
            <SeoSection title="What’s in every report">
              <RowList>
                {REPORT_CONTENTS.map(
                  (row: { label: string; description: string }) => (
                    <Row key={row.label} title={row.label}>
                      {row.description}
                    </Row>
                  ),
                )}
              </RowList>
            </SeoSection>

            {/* The promoted month is deliberately absent from this list. It was
                printed twice — the same month name and the identical headline
                string within one scroll — which at n=2 read as a stutter rather
                than as an archive. */}
            {earlier.length > 0 ? (
              <SeoSection
                aside={`Published before ${monthLabel(sorted[0].month)}, newest first. Every month keeps its own URL.`}
                title="Earlier reports"
              >
                <ul className={`border-t ${RULE}`}>
                  {earlier.map((m) => {
                    const published = publishedLabel(m.created_at);

                    return (
                      <li key={m.month} className={`border-b ${RULE} py-4`}>
                        <div className="flex items-baseline justify-between gap-4">
                          <Link
                            className="min-w-0 text-[16px] font-semibold tracking-[-0.01em] text-foreground underline-offset-4 hover:underline"
                            to={reportPath(m.month)}
                          >
                            {monthLabel(m.month)}
                          </Link>
                          {/* Guard on the formatted date, not on `created_at`:
                              an unparseable timestamp is truthy and rendered an
                              empty <time>. */}
                          {published ? (
                            <time
                              className="shrink-0 font-mono text-[11px] tabular-nums text-foreground/45"
                              dateTime={m.created_at}
                            >
                              {published}
                            </time>
                          ) : null}
                        </div>
                        <p className={`mt-1.5 max-w-[62ch] ${BODY}`}>
                          {m.headline}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </SeoSection>
            ) : null}
          </>
        )}
      </SeoPageShell>
    </DefaultLayout>
  );
}

/** The newest month, promoted. The figures arrive a beat after the headline
 *  does, from a second request, so the gap they will fill is held open at the
 *  tiles' own height — otherwise their arrival shoves the button down the page. */
function LatestReport({
  item,
  summary,
  figuresPending,
}: {
  item: MonthlySummaryListItem;
  summary: MonthlySummary | null;
  figuresPending: boolean;
}) {
  const label = monthLabel(item.month);
  const metrics = summary?.metrics;

  return (
    <section className={LEAD_SHEET}>
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
      ) : figuresPending ? (
        // The variant carries its own `mt-6`; `-mt-1` lands it on the loaded
        // tiles' `mt-5`, and its 64px tiles are the height they arrive at.
        <SeoSkeleton className="-mt-1" rows={4} variant="stat-tiles" />
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

/** The loaded archive's own shape while it loads: the promoted sheet with its
 *  four figures, the five-row explainer, then the earlier-months list. The
 *  first two blocks are static editorial, so their row counts are knowable
 *  without the fetch; only the last is a stand-in. */
function ArchiveSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading…</span>

      <div className={LEAD_SHEET}>
        <Skeleton className="h-[11px] w-24" />
        <Skeleton className="mt-2.5 h-[28px] w-44" />
        <Skeleton className="mt-3 h-[17px] w-full max-w-[52ch]" />
        <Skeleton className="mt-2 h-[17px] w-3/5 max-w-[32ch]" />
        <SeoSkeleton className="-mt-1" rows={4} variant="stat-tiles" />
        <Skeleton className={`mt-5 h-[37px] w-52 ${BUTTON_RADIUS}`} />
      </div>

      <section className={`mt-12 border-t ${RULE} pt-5`}>
        <Skeleton className="h-[34px] w-72" />
        <div className={`mt-6 border-t ${RULE}`}>
          {REPORT_CONTENTS.map((row: { label: string }) => (
            <div key={row.label} className={CONTENTS_ROW}>
              <div className="min-w-0">
                <Skeleton className="h-[24px] w-full max-w-[260px]" />
              </div>
              <div className="min-w-0 sm:pt-1">
                <Skeleton className="h-[15px] w-full max-w-[520px]" />
                <Skeleton className="mt-2.5 h-[15px] w-4/5 max-w-[420px]" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`mt-12 border-t ${RULE} pt-5`}>
        <Skeleton className="h-[34px] w-56" />
        <ul className={`mt-6 border-t ${RULE}`}>
          {[0, 1].map((i) => (
            <li key={i} className={`border-b ${RULE} py-4`}>
              <div className="flex items-baseline justify-between gap-4">
                <Skeleton className="h-[16px] w-40" />
                <Skeleton className="h-[11px] w-16 shrink-0" />
              </div>
              <Skeleton className="mt-2 h-[14px] w-4/5 max-w-[520px]" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** "2026-07-01T…" → "1 Jul 2026". Empty when unparseable or absent. */
function publishedLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
