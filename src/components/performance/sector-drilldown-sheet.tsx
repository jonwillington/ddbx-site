// Modal that drills into one sector's backtest. Renders the existing
// PerformanceChart fed by `SectorResult.result` (already computed by the
// view-model for the chosen sector). Mirrors iOS SectorDrilldownSheet.

import type {
  PerformanceViewMode,
  SectorResult,
} from "@/lib/performance/types";

import { useEffect, useState } from "react";

import { AppDrawer } from "@/components/app-drawer";
import {
  PerformanceChart,
  pctAtIndex,
} from "@/components/performance/performance-chart";
import {
  alphaReturnPct,
  benchmarkReturnPct,
  strategyReturnPct,
} from "@/lib/performance/types";

interface Props {
  sector: SectorResult | null;
  viewMode: PerformanceViewMode;
  onClose: () => void;
}

export function SectorDrilldownSheet({ sector, viewMode, onClose }: Props) {
  const open = sector !== null;
  const [scrubIdx, setScrubIdx] = useState<number | null>(null);

  useEffect(() => {
    setScrubIdx(null);
  }, [sector]);

  return (
    <AppDrawer
      open={open}
      subtitle={
        sector
          ? `${sector.result.dealCount} deal${
              sector.result.dealCount === 1 ? "" : "s"
            } backtested`
          : undefined
      }
      title={sector ? sector.sector : "Sector backtest"}
      onClose={onClose}
    >
      {sector && (
        <Body
          scrubIdx={scrubIdx}
          sector={sector}
          setScrubIdx={setScrubIdx}
          viewMode={viewMode}
        />
      )}
    </AppDrawer>
  );
}

function Body({
  sector,
  viewMode,
  scrubIdx,
  setScrubIdx,
}: {
  sector: SectorResult;
  viewMode: PerformanceViewMode;
  scrubIdx: number | null;
  setScrubIdx: (i: number | null) => void;
}) {
  const alpha = alphaReturnPct(sector.result) * 100;
  const stratPct = strategyReturnPct(sector.result);
  const benchPct = benchmarkReturnPct(sector.result);
  const positive = alpha >= 0;

  const scrubPicks =
    scrubIdx != null ? pctAtIndex(sector.result, scrubIdx, "strategy") : null;
  const scrubBench =
    scrubIdx != null ? pctAtIndex(sector.result, scrubIdx, "benchmark") : null;
  const scrubDate =
    scrubIdx != null ? (sector.result.strategy[scrubIdx]?.date ?? null) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Picks" muted={false} value={formatPct(stratPct)} />
          <Stat muted label="Benchmark" value={formatPct(benchPct)} />
          <Stat
            color={positive ? "oklch(36% 0.16 155)" : "oklch(38% 0.16 18)"}
            label="Alpha"
            muted={false}
            value={`${positive ? "+" : "−"}${Math.abs(alpha).toFixed(1)}pp`}
          />
        </div>

        {scrubIdx != null && scrubDate && (
          <div className="text-[11px] text-muted flex items-center gap-3 justify-between border-t border-separator/60 pt-2">
            <span className="font-mono tabular-nums">{scrubDate}</span>
            <span className="flex items-center gap-3">
              {scrubPicks != null && (
                <span className="font-mono tabular-nums">
                  {formatPct(scrubPicks / 100)}
                </span>
              )}
              {scrubBench != null && (
                <span className="font-mono tabular-nums text-muted/70">
                  {formatPct(scrubBench / 100)}
                </span>
              )}
            </span>
          </div>
        )}

        <div className="rounded-xl border border-separator bg-surface/40 p-3">
          <PerformanceChart
            result={sector.result}
            viewMode={viewMode}
            onScrub={setScrubIdx}
          />
        </div>
      </div>
  );
}

function Stat({
  label,
  value,
  muted,
  color,
}: {
  label: string;
  value: string;
  muted: boolean;
  color?: string;
}) {
  return (
    <div className="rounded-lg bg-black/[0.04] dark:bg-white/[0.05] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted mb-1">
        {label}
      </div>
      <div
        className={`text-base font-semibold tabular-nums ${muted ? "text-muted" : ""}`}
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function formatPct(p: number): string {
  const sign = p >= 0 ? "+" : "−";

  return `${sign}${Math.abs(p * 100).toFixed(1)}%`;
}
