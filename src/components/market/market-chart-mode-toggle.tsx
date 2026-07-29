import type { ChartAnchor, ChartAxis, ChartMode } from "@/lib/markets/types";

interface MarketChartModeToggleProps {
  mode: ChartMode;
  onChange: (mode: ChartMode) => void;
  /** Short benchmark label rendered inside the "vs Market" pill so the
   *  user can see which index they're comparing against. */
  benchmarkLabel: string;
  /** Drawer layout: the two axes stacked vertically, each a full-width
   *  segmented control under its own question + explanation. The compact inline
   *  pills (default) are kept for any non-drawer use. */
  stacked?: boolean;
}

/** Two pill groups that drive the per-row sparkline + Performance cell. Mirrors
 *  the iOS `DashboardMetricMode` segmented control. */
export function MarketChartModeToggle({
  mode,
  onChange,
  benchmarkLabel,
  stacked = false,
}: MarketChartModeToggleProps) {
  const axisPills: { id: ChartAxis; label: string }[] = [
    { id: "raw", label: "Raw" },
    { id: "market", label: `vs ${benchmarkLabel}` },
  ];
  const anchorPills: { id: ChartAnchor; label: string }[] = [
    { id: "trade", label: "From trade" },
    { id: "disclosure", label: "From disclosure" },
  ];

  if (stacked) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="text-[13px] font-semibold text-foreground/90">
            How is performance compared?
          </div>
          <PillGroup
            block
            items={axisPills}
            selected={mode.axis}
            onChange={(axis) => onChange({ ...mode, axis })}
          />
          <p className="text-[12px] leading-snug text-muted">
            Raw is the stock&apos;s own move. vs {benchmarkLabel} is alpha — the
            move minus the index, so you see whether the pick actually beat the
            market.
          </p>
        </div>
        <div className="space-y-2">
          <div className="text-[13px] font-semibold text-foreground/90">
            Measured from when?
          </div>
          <PillGroup
            block
            items={anchorPills}
            selected={mode.anchor}
            onChange={(anchor) => onChange({ ...mode, anchor })}
          />
          <p className="text-[12px] leading-snug text-muted">
            From trade counts from the day the member traded. From disclosure
            counts from when it became public — often weeks later, after the
            early move.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <PillGroup
        items={axisPills}
        selected={mode.axis}
        onChange={(axis) => onChange({ ...mode, axis })}
      />
      <PillGroup
        items={anchorPills}
        selected={mode.anchor}
        onChange={(anchor) => onChange({ ...mode, anchor })}
      />
    </div>
  );
}

function PillGroup<T extends string>({
  items,
  selected,
  onChange,
  block = false,
}: {
  items: { id: T; label: string }[];
  selected: T;
  onChange: (id: T) => void;
  /** Full-width segmented control (drawer) vs compact inline pills (default). */
  block?: boolean;
}) {
  return (
    <div
      className={`${block ? "flex w-full p-1" : "inline-flex p-0.5"} rounded-full border border-separator bg-surface/40`}
    >
      {items.map((item) => (
        <button
          key={item.id}
          aria-pressed={selected === item.id}
          className={`rounded-full font-medium transition-colors whitespace-nowrap ${
            block ? "flex-1 px-3 py-2 text-sm" : "px-2.5 py-0.5 text-[11px]"
          } ${
            selected === item.id
              ? "bg-brand-brown/15 text-[#3d2b1a] dark:text-brand-tan"
              : "text-muted hover:text-foreground"
          }`}
          type="button"
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
