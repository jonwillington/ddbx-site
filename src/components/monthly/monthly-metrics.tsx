import type { MonthlyMetrics as Metrics } from "@/types/ddbx";
import type { StatTile } from "@/components/seo/stat-tiles";
import type { StageFigure } from "@/components/boards/stage-figures";

import { returnTextClass } from "./monthly-utils";

import { StatTiles } from "@/components/seo/stat-tiles";
import { formatGbp, formatSignedPct } from "@/lib/performance/format";

/** Deterministic month-level metrics. The headline cards plus an optional
 *  secondary row for median return vs the benchmark when the price series is
 *  thick enough to be honest about it.
 *
 *  Two variants, same facts. "modal" is the recap's original container-query
 *  card grid, unchanged. "page" is the archived report at /reports/:month,
 *  where the numbers are set as the site's house `StatTiles` — and where the
 *  count of distinct directors is stated rather than dropped, because the
 *  crawler pre-render quotes it and the page has to say what the pre-render
 *  says. */
export function MonthlyMetrics({
  metrics,
  variant = "modal",
}: {
  metrics: Metrics;
  variant?: "modal" | "page";
}) {
  if (variant === "page") return <PageMetrics metrics={metrics} />;

  return (
    <section className="@container space-y-3">
      {/* Container-query, not viewport: this block lives in the recap modal's
          narrow overview column on desktop, so it sizes off its own width —
          2-up there, 4-up only when given a wide container. */}
      <div className="grid grid-cols-2 gap-3 @lg:grid-cols-4">
        <Card label="Buys disclosed" value={String(metrics.total_buys)} />
        <Card
          label="Total value"
          value={formatGbp(metrics.total_value_gbp, { compact: true })}
        />
        <Card label="Companies" value={String(metrics.distinct_companies)} />
        <Card label="Clusters" value={String(metrics.cluster_count)} />
      </div>

      {(metrics.median_return != null || metrics.benchmark_return != null) && (
        <div className="flex flex-wrap gap-x-6 gap-y-1.5 rounded-xl border border-black/[0.06] bg-surface/40 px-4 py-3 text-sm dark:border-white/[0.08]">
          {metrics.median_return != null && (
            <Stat
              colorClass={returnTextClass(metrics.median_return)}
              label="Median buy"
              value={formatSignedPct(metrics.median_return)}
            />
          )}
          {metrics.best_return != null && (
            <Stat
              colorClass={returnTextClass(metrics.best_return)}
              label="Best"
              value={formatSignedPct(metrics.best_return)}
            />
          )}
          {metrics.worst_return != null && (
            <Stat
              colorClass={returnTextClass(metrics.worst_return)}
              label="Worst"
              value={formatSignedPct(metrics.worst_return)}
            />
          )}
          {metrics.benchmark_return != null && (
            <Stat
              colorClass={returnTextClass(metrics.benchmark_return)}
              label="FTSE All-Share"
              value={formatSignedPct(metrics.benchmark_return)}
            />
          )}
        </div>
      )}
    </section>
  );
}

/** `tone` from a ratio, for a StatTiles figure. Exactly 0 is untoned — a flat
 *  month is neither. */
function tone(ratio: number | null | undefined): StatTile["tone"] {
  if (ratio == null || ratio === 0) return undefined;

  return ratio > 0 ? "positive" : "negative";
}

/** The one figure the report is actually about, set a size larger wherever
 *  these are drawn as tiles. */
const PRIMARY = "Committed";

/** The month's five headline counts, as stage figures.
 *
 *  A selector rather than a block, because /reports/:month states them inside
 *  its hero panel now (beside the drawing, on the dark ground) while the recap
 *  and any composed page form state them as tiles. One list, two dressings —
 *  the alternative was a second hand-typed copy of the same four labels, which
 *  is how a page and its own pre-render come to disagree about a number.
 *
 *  Committed is omitted, not placeheld, when the month committed nothing:
 *  `formatGbp` renders zero as "£0.0k" and `StageFigures` throws on it in
 *  development, which is the second static-page rule made mechanical. A month
 *  with no money in it says so in prose. */
export function headlineFigures(metrics: Metrics): StageFigure[] {
  return [
    { k: "Buys disclosed", v: String(metrics.total_buys) },
    ...(metrics.total_value_gbp > 0
      ? [
          {
            k: PRIMARY,
            v: formatGbp(metrics.total_value_gbp, { compact: true }),
          },
        ]
      : []),
    { k: "Companies", v: String(metrics.distinct_companies) },
    { k: "Insiders", v: String(metrics.distinct_directors) },
    // Not the cluster count. Four figures fill the stage header's band; a
    // fifth wraps onto its own line under the other four, which reads as an
    // afterthought rather than a figure. The count is stated where the
    // clusters are, in the Clusters section.
  ];
}

/** The month's returns row: median, best, worst and the benchmark, each stated
 *  only where there is something to state.
 *
 *  A median of exactly 0 is the "not enough priced buys to say" case coming
 *  back as a number, and "Median buy 0.0%" reads as a measured flat month
 *  rather than as a missing one. */
export function returnTiles(metrics: Metrics): StatTile[] {
  const returns: StatTile[] = [];

  if (metrics.median_return != null && metrics.median_return !== 0) {
    returns.push({
      label: "Median buy",
      value: formatSignedPct(metrics.median_return),
      tone: tone(metrics.median_return),
    });
  }
  if (metrics.best_return != null) {
    returns.push({
      label: "Best",
      value: formatSignedPct(metrics.best_return),
      tone: tone(metrics.best_return),
    });
  }
  if (metrics.worst_return != null) {
    returns.push({
      label: "Worst",
      value: formatSignedPct(metrics.worst_return),
      tone: tone(metrics.worst_return),
    });
  }
  if (metrics.benchmark_return != null) {
    returns.push({
      // TODO(us-reports): "FTSE All-Share" is the UK benchmark, hardcoded.
      // The wire format carries no benchmark name, so day one of a US report
      // labels the S&P 500 as the FTSE. Same for the £ in `formatGbp` above —
      // `moneyShort(value, currency)` in @/lib/company-format takes the
      // currency, but the fix is a wire-format change, not a local one.
      label: "FTSE All-Share",
      value: formatSignedPct(metrics.benchmark_return),
      tone: tone(metrics.benchmark_return),
    });
  }

  return returns;
}

/** How many columns a tile row of this length wants. `StatTiles` puts a 5-stat
 *  group in a 4-col grid on a ragged row of its own otherwise. */
function cols(n: number): 2 | 3 | 4 | 5 {
  if (n >= 5) return 5;
  if (n === 4) return 4;
  if (n === 3) return 3;

  return 2;
}

/** Both halves as tiles, one under the other.
 *
 *  /reports/:month composes the two selectors itself now — the headline counts
 *  moved into the stage header, where they sit beside the drawing they belong
 *  to, and only the returns row stays in the document. This stays the composed
 *  form for any page-width surface that wants the whole band in one place. */
function PageMetrics({ metrics }: { metrics: Metrics }) {
  const headline: StatTile[] = headlineFigures(metrics).map((f) => ({
    label: f.k,
    value: f.v,
    primary: f.k === PRIMARY,
  }));
  const returns = returnTiles(metrics);

  return (
    <div className="space-y-2">
      <StatTiles cols={cols(headline.length)} stats={headline} />
      {returns.length > 0 ? (
        <StatTiles cols={cols(returns.length)} stats={returns} />
      ) : null}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-surface/40 px-4 py-3 dark:border-white/[0.08]">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string;
  colorClass: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs text-muted">{label}</span>
      <span className={`font-semibold tabular-nums ${colorClass}`}>
        {value}
      </span>
    </div>
  );
}
