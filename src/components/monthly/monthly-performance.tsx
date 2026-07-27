import type {
  MonthlyPerformance as Performance,
  MonthlyPerfSeries,
  MonthlyPerfUniverse,
  PortfolioPoint as WirePoint,
} from "@/types/ddbx";
import type {
  PerformanceResult,
  PerformanceViewMode,
  PortfolioPoint,
} from "@/lib/performance/types";

import { useMemo, useState } from "react";

import { returnTextClass } from "./monthly-utils";

import { PerformanceChart } from "@/components/performance/performance-chart";
import { BUTTON_SELECTED } from "@/components/button";
import { StatTiles } from "@/components/seo/stat-tiles";
import { formatSignedPct } from "@/lib/performance/format";

/** Per-universe alpha for the month. Reuses the backtest PerformanceChart by
 *  adapting a MonthlyPerfSeries (£ major, `value_gbp`) into the chart's
 *  PerformanceResult shape (`value`). A capsule control switches universe; a
 *  real-vs-market toggle switches the chart mode. Renders nothing when the
 *  server returned no computable series. */
export function MonthlyPerformanceSection({
  performance,
  heading = true,
  defaultUniverse,
  statVariant = "inline",
}: {
  performance: Performance;
  /** Off when the caller already sets a section heading above this block. */
  heading?: boolean;
  /** Opening universe, overriding the server's. The server defaults to the
   *  highest-alpha series, which on a published page means the report opens on
   *  whichever slice happened to flatter us; the archive page asks for
   *  `every_buy` instead and leaves the switch there. Ignored when the series
   *  isn't in the payload. */
  defaultUniverse?: MonthlyPerfUniverse;
  /** "tiles" states the three results as house StatTiles — for the page, where
   *  there is width for them. The modal's narrow column keeps "inline". */
  statVariant?: "inline" | "tiles";
}) {
  const series = performance.series;
  const [universe, setUniverse] = useState<MonthlyPerfUniverse>(
    defaultUniverse != null &&
      performance.series.some((s) => s.universe === defaultUniverse)
      ? defaultUniverse
      : performance.default_universe,
  );
  const [viewMode, setViewMode] = useState<PerformanceViewMode>("vs_market");

  const active = useMemo<MonthlyPerfSeries | undefined>(
    () => series.find((s) => s.universe === universe) ?? series[0],
    [series, universe],
  );

  const result = useMemo<PerformanceResult | null>(
    () => (active ? toResult(active) : null),
    [active],
  );

  if (!active || !result) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* TODO(us-reports): "£100 per buy" and the "FTSE All-Share" label
            below are the UK benchmark and currency, hardcoded. They are wrong
            on day one of a US report — `moneyShort(value, currency)` in
            @/lib/company-format takes a currency, but the benchmark's name
            isn't in the wire format at all, so this is a cross-repo fix. */}
        {heading ? (
          <h3 className="text-sm font-semibold">£100 per buy vs the market</h3>
        ) : (
          <span />
        )}
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Five universes do not fit one 375px line. The track wraps rather than
          overflowing, so its radius softens from a capsule to a corner — a
          rounded-full track two rows deep reads as a mistake. */}
      {series.length > 1 && (
        <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-separator bg-surface/40 p-1">
          {series.map((s) => (
            <button
              key={s.universe}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                s.universe === active.universe
                  ? BUTTON_SELECTED
                  : "text-muted hover:text-foreground"
              }`}
              type="button"
              onClick={() => setUniverse(s.universe)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <PerformanceChart result={result} viewMode={viewMode} />

      {statVariant === "tiles" ? (
        <StatTiles
          cols={3}
          note={`Across ${active.buy_count} ${active.buy_count === 1 ? "buy" : "buys"} in the ${active.label.toLowerCase()} universe.`}
          stats={[
            {
              label: "Picks",
              value: formatSignedPct(active.final_return),
              primary: true,
              tone: statTone(active.final_return),
            },
            {
              label: "FTSE All-Share",
              value: formatSignedPct(active.benchmark_return),
              tone: statTone(active.benchmark_return),
            },
            {
              label: "Alpha",
              value: formatSignedPct(active.alpha),
              tone: statTone(active.alpha),
            },
          ]}
        />
      ) : (
        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
          <Badge
            colorClass={returnTextClass(active.final_return)}
            label="Picks"
            value={formatSignedPct(active.final_return)}
          />
          <Badge
            colorClass={returnTextClass(active.benchmark_return)}
            label="FTSE All-Share"
            value={formatSignedPct(active.benchmark_return)}
          />
          <Badge
            colorClass={returnTextClass(active.alpha)}
            label="Alpha"
            value={formatSignedPct(active.alpha)}
          />
          <span className="text-xs text-muted">
            {active.buy_count} {active.buy_count === 1 ? "buy" : "buys"}
          </span>
        </div>
      )}
    </section>
  );
}

/** StatTiles tone from a ratio. Exactly 0 is untoned. */
function statTone(ratio: number): "positive" | "negative" | undefined {
  if (!Number.isFinite(ratio) || ratio === 0) return undefined;

  return ratio > 0 ? "positive" : "negative";
}

function mapPoints(points: WirePoint[]): PortfolioPoint[] {
  return points.map((p) => ({ date: p.date, value: p.value_gbp }));
}

function toResult(s: MonthlyPerfSeries): PerformanceResult {
  // The chart derives its % labels from `totalDeployed` + the value series, so
  // mark deployed to the final cumulative-capital point. The headline
  // final/benchmark/alpha returns come straight off the series in the badges
  // below, not from this result.
  return {
    strategy: mapPoints(s.strategy),
    benchmark: mapPoints(s.benchmark),
    deployed: mapPoints(s.deployed),
    contributors: [],
    totalDeployed: s.deployed.at(-1)?.value_gbp ?? 0,
    excludedForDataCount: 0,
    dealCount: s.buy_count,
  };
}

function ViewToggle({
  value,
  onChange,
}: {
  value: PerformanceViewMode;
  onChange: (v: PerformanceViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-separator bg-surface/40 p-1 text-xs">
      {(
        [
          { key: "real_terms", label: "Real terms" },
          { key: "vs_market", label: "vs Market" },
        ] as const
      ).map((opt) => (
        <button
          key={opt.key}
          className={`rounded-full px-3 py-1 font-medium transition-colors ${
            value === opt.key
              ? BUTTON_SELECTED
              : "text-muted hover:text-foreground"
          }`}
          type="button"
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Badge({
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
