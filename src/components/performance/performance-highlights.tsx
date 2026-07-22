import type {
  ContributorRow,
  PerformanceTimeWindow,
} from "@/lib/performance/types";

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { TIME_WINDOWS } from "@/lib/performance/types";

interface Props {
  rows: ContributorRow[];
  timeWindow: PerformanceTimeWindow;
  latestDate: string | null;
  isComputing: boolean;
}

function formatPct(value: number): string {
  const x = value * 100;
  const sign = x >= 0 ? "+" : "-";

  return `${sign}${Math.abs(x).toFixed(1)}%`;
}

function formatSignedGbp(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  const abs = Math.abs(value);

  if (abs >= 10_000) return `${sign}£${(abs / 1_000).toFixed(1)}k`;

  return `${sign}£${Math.round(abs)}`;
}

function formatDay(iso: string | null): string {
  if (iso == null) return "today";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(d.getTime())) return iso;

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  });
}

export function PerformanceHighlights({
  rows,
  timeWindow,
  latestDate,
  isComputing,
}: Props) {
  const topPerformers = useMemo(() => {
    return [...rows].sort((a, b) => b.returnPct - a.returnPct).slice(0, 4);
  }, [rows]);

  const bestGain = useMemo(() => {
    return rows.reduce<ContributorRow | null>((best, row) => {
      const pnl = row.currentValue - row.deployed;

      if (best == null) return row;
      const bestPnl = best.currentValue - best.deployed;

      return pnl > bestPnl ? row : best;
    }, null);
  }, [rows]);

  const worstLoss = useMemo(() => {
    return rows.reduce<ContributorRow | null>((worst, row) => {
      const pnl = row.currentValue - row.deployed;

      if (worst == null) return row;
      const worstPnl = worst.currentValue - worst.deployed;

      return pnl < worstPnl ? row : worst;
    }, null);
  }, [rows]);

  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const selected = useMemo(() => {
    if (topPerformers.length === 0) return null;
    if (selectedDealId == null) return topPerformers[0];

    return (
      topPerformers.find((r) => r.dealId === selectedDealId) ?? topPerformers[0]
    );
  }, [selectedDealId, topPerformers]);

  if (rows.length === 0 || selected == null) return null;

  const windowLabel = TIME_WINDOWS[timeWindow].longName;
  const selectedPnl = selected.currentValue - selected.deployed;

  return (
    <section
      className={`space-y-3 ${isComputing ? "opacity-70" : ""} transition-opacity`}
    >
      <div className="text-xs text-muted px-1">
        {windowLabel} · Updated {formatDay(latestDate)}
      </div>

      <div className="rounded-xl border border-separator bg-surface/40 p-4 space-y-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          Top performers
        </div>

        {topPerformers.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {topPerformers.map((row) => (
              <button
                key={row.dealId}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  selected.dealId === row.dealId
                    ? "border-[#5a4128]/40 bg-[#5a4128]/12 text-[#5a4128] dark:text-[#c6a785]"
                    : "border-separator text-muted hover:text-foreground"
                }`}
                type="button"
                onClick={() => setSelectedDealId(row.dealId)}
              >
                {row.ticker.replace(/\.L$/, "")}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-base font-semibold truncate">
              {selected.company}
            </div>
            <div className="text-xs text-muted">
              {selected.state === "open" ? "Open position" : "Closed position"}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div
              className={`text-2xl font-semibold tabular-nums ${selected.returnPct >= 0 ? "text-[#1e6b18] dark:text-[#5cd84a]" : "text-[#8b2020] dark:text-[#e84d4d]"}`}
            >
              {formatPct(selected.returnPct)}
            </div>
            <div className="text-xs text-muted tabular-nums">
              {formatSignedGbp(selectedPnl)}
            </div>
          </div>
        </div>

        <Link
          className="inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:underline"
          to={`/dealings/${selected.dealId}`}
        >
          Learn more
          <span aria-hidden>→</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {bestGain != null && (
          <StatCard
            label="Biggest paper gain"
            row={bestGain}
            value={formatSignedGbp(bestGain.currentValue - bestGain.deployed)}
            valueClass="text-[#1e6b18] dark:text-[#5cd84a]"
          />
        )}
        {worstLoss != null && (
          <StatCard
            label="Biggest drawdown"
            row={worstLoss}
            value={formatSignedGbp(worstLoss.currentValue - worstLoss.deployed)}
            valueClass="text-[#8b2020] dark:text-[#e84d4d]"
          />
        )}
      </div>
    </section>
  );
}

function StatCard({
  label,
  row,
  value,
  valueClass,
}: {
  label: string;
  row: ContributorRow;
  value: string;
  valueClass: string;
}) {
  return (
    <Link
      className="rounded-xl border border-separator bg-surface/40 p-4 space-y-2 hover:bg-surface/60 transition-colors"
      to={`/dealings/${row.dealId}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="text-sm font-semibold truncate">{row.company}</div>
      <div className={`text-xl font-semibold tabular-nums ${valueClass}`}>
        {value}
      </div>
      <div className="text-xs text-muted">
        {formatPct(row.returnPct)} since entry
      </div>
    </Link>
  );
}
