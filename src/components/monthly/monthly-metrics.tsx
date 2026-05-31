import type { MonthlyMetrics as Metrics } from "@/types/ddbx";

import { returnTextClass } from "./monthly-utils";

import { formatGbp, formatSignedPct } from "@/lib/performance/format";

/** Deterministic month-level metrics. The four headline cards plus an
 *  optional secondary row for median return vs the benchmark when the price
 *  series is thick enough to be honest about it. */
export function MonthlyMetrics({ metrics }: { metrics: Metrics }) {
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
