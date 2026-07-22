// Info drawer for the Picks % / Benchmark % numbers. Port of
// PerformanceMetricSheet.swift — minimal: title, formula, contextual notes.

import {
  AMOUNTS,
  BENCHMARKS,
  EXIT_RULES,
  type StrategyConfig,
} from "@/lib/performance/types";
import { AppDrawer } from "@/components/app-drawer";

export type MetricKind = "picks" | "benchmark";

interface Props {
  open: boolean;
  kind: MetricKind | null;
  config: StrategyConfig;
  onClose: () => void;
}

export function MetricSheet({ open, kind, config, onClose }: Props) {
  const benchmarkName = BENCHMARKS[config.benchmark].displayName;
  const amount = AMOUNTS[config.amount].displayName;
  const horizon = EXIT_RULES[config.exitRule].horizonDays;
  const heldClause =
    horizon == null
      ? "still held today (mark-to-market)"
      : `held for ${horizon} days`;

  const title = kind === "picks" ? "Picks %" : `${benchmarkName} %`;
  const body =
    kind === "picks"
      ? `Total return on a backtest where ${amount} is deployed into every qualifying director buy on the day it's disclosed and ${heldClause}. Excluded deals are removed from both legs so the comparison stays honest.`
      : `What you'd have made putting the same ${amount} per deal into the ${benchmarkName} on each disclosure date — same capital, same timing, same hold rule. The only thing varying is the asset.`;

  return (
    <AppDrawer
      maxWidthClass="max-w-md"
      open={open}
      title={title}
      onClose={onClose}
    >
      <p className="text-sm leading-relaxed text-muted">{body}</p>
    </AppDrawer>
  );
}
