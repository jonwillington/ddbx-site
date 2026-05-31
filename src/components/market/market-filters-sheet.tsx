import type { ReactNode } from "react";
import type { SignalFilterValue } from "@/lib/markets/types";
import type { FilterSelectOption, MarketViewMode } from "./market-filter-bar";

import { Drawer } from "vaul";
import {
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

import { SIGNAL_FILTER_OPTIONS, VIEW_OPTIONS } from "./market-filter-bar";

/** Mobile-only bottom sheet that holds the list filters the desktop bar
 *  shows inline. Trigger is a compact pill matching the FilterSelect look;
 *  the sheet itself uses full-width segmented controls so every option is a
 *  comfortable tap target. The chart-mode toggle is passed through verbatim
 *  (`trailing`) so there's a single source of truth for that control. */
export function MarketFiltersSheet({
  viewMode,
  onViewMode,
  signalFilter,
  onSignalFilterChange,
  heroFilters,
  heroFilterId,
  onHeroFilterChange,
  showStrength,
  trailing,
}: {
  viewMode: MarketViewMode;
  onViewMode: (v: MarketViewMode) => void;
  signalFilter?: SignalFilterValue;
  onSignalFilterChange?: (v: SignalFilterValue) => void;
  heroFilters?: FilterSelectOption[];
  heroFilterId?: string | null;
  onHeroFilterChange?: (id: string) => void;
  showStrength: boolean;
  trailing?: ReactNode;
}) {
  const strengthValue = heroFilterId ?? heroFilters?.[0]?.id ?? "";
  // A subtle dot when any axis differs from its conventional default, so the
  // user knows a filter is active without opening the sheet.
  const hasActiveFilter =
    viewMode !== "chronological" ||
    (signalFilter !== undefined && signalFilter !== "signal") ||
    (showStrength && !!heroFilters && strengthValue !== heroFilters[0]?.id);

  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>
        <button
          className="relative flex items-center gap-1.5 rounded-full border border-separator bg-surface/40 px-3 py-2 text-xs text-foreground/85 hover:border-[#5a4128]/50 transition-colors"
          type="button"
        >
          <AdjustmentsHorizontalIcon className="w-4 h-4" />
          <span className="font-medium">Filters</span>
          {hasActiveFilter && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#5a4128] dark:bg-[#ad9479]" />
          )}
        </button>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Drawer.Content className="fixed bottom-0 inset-x-0 z-50 flex flex-col rounded-t-2xl border-t border-[#e8e0d5] dark:border-separator bg-[#f5f0e8] dark:bg-background outline-none">
          <div className="mx-auto mt-3 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-black/15 dark:bg-white/20" />

          <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 space-y-6 overflow-y-auto">
            <Drawer.Title className="text-base font-semibold">
              Filters
            </Drawer.Title>

            <Field label="View">
              <Segmented
                options={VIEW_OPTIONS}
                value={viewMode}
                onChange={(id) => onViewMode(id as MarketViewMode)}
              />
            </Field>

            {signalFilter !== undefined && onSignalFilterChange && (
              <Field
                description={
                  SIGNAL_FILTER_OPTIONS.find((o) => o.id === signalFilter)
                    ?.description
                }
                label="Filter"
              >
                <Segmented
                  options={SIGNAL_FILTER_OPTIONS}
                  value={signalFilter}
                  onChange={(id) =>
                    onSignalFilterChange(id as SignalFilterValue)
                  }
                />
              </Field>
            )}

            {showStrength && heroFilters && onHeroFilterChange && (
              <Field label="Strength">
                <Select
                  options={heroFilters}
                  value={strengthValue}
                  onChange={onHeroFilterChange}
                />
              </Field>
            )}

            {trailing && (
              <Field label="Performance">
                <div className="flex flex-wrap gap-2">{trailing}</div>
              </Field>
            )}

            <Drawer.Close asChild>
              <button
                className="w-full rounded-full bg-[#5a4128] py-3 text-sm font-medium text-white transition-colors hover:bg-[#49331f]"
                type="button"
              >
                Done
              </button>
            </Drawer.Close>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
      {children}
      {description && (
        <p className="text-[11px] leading-snug text-muted">{description}</p>
      )}
    </div>
  );
}

/** Native select — used for axes with more options than fit comfortably as
 *  a segmented row (e.g. Strength's four buckets). The OS picker is the best
 *  touch target on mobile and never wraps. */
function Select({
  options,
  value,
  onChange,
}: {
  options: FilterSelectOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="relative">
      <select
        className="w-full appearance-none rounded-full border border-separator bg-surface/40 px-4 py-2.5 pr-10 text-sm font-medium text-foreground focus:border-[#5a4128]/50 focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: FilterSelectOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex w-full rounded-full border border-separator bg-surface/40 p-1">
      {options.map((opt) => {
        const isCurrent = opt.id === value;

        return (
          <button
            key={opt.id}
            aria-pressed={isCurrent}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              isCurrent
                ? "bg-[#5a4128]/15 text-[#3d2b1a] dark:text-[#ad9479]"
                : "text-muted hover:text-foreground"
            }`}
            type="button"
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
