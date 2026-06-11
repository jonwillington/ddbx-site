import type { ReactNode } from "react";
import type { SignalFilterValue } from "@/lib/markets/types";
import type { FilterSelectOption, MarketViewMode } from "./market-filter-bar";

import { Drawer } from "vaul";
import {
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

import { useMediaQuery } from "@/lib/use-media-query";
import { SIGNAL_FILTER_OPTIONS, VIEW_OPTIONS } from "./market-filter-bar";

/** Filter drawer holding every list filter — a side drawer (floats off the
 *  right) on tablet + desktop, a bottom sheet on phones. Trigger is a compact
 *  pill; the panel uses full-width segmented controls with a one-line
 *  explanation under each axis (the room a drawer affords that an inline bar
 *  didn't). The chart-mode toggle is passed through verbatim (`trailing`). */
export function MarketFiltersSheet({
  viewMode,
  onViewMode,
  signalFilter,
  onSignalFilterChange,
  heroFilters,
  heroFilterId,
  onHeroFilterChange,
  showStrength,
  extraFilters,
  extraFilterValues,
  onExtraFilterChange,
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
  extraFilters?: { id: string; label: string; description?: string; options: FilterSelectOption[] }[];
  extraFilterValues?: Record<string, string>;
  onExtraFilterChange?: (filterId: string, value: string) => void;
  trailing?: ReactNode;
}) {
  // Side drawer (floats off the right) on tablet + desktop; bottom sheet on
  // phones. Mirrors the detail drawer so the two read as the same surface.
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const direction = isDesktop ? "right" : "bottom";
  const contentClass = isDesktop
    ? "fixed top-3 bottom-3 right-3 z-50 w-[calc(100vw-1.5rem)] max-w-sm rounded-2xl border border-[#e8e0d5] dark:border-separator bg-[#f5f0e8] dark:bg-background shadow-2xl flex flex-col overflow-hidden outline-none"
    : "fixed bottom-0 inset-x-0 z-50 max-h-[88vh] rounded-t-2xl border-t border-[#e8e0d5] dark:border-separator bg-[#f5f0e8] dark:bg-background flex flex-col outline-none";

  const strengthValue = heroFilterId ?? heroFilters?.[0]?.id ?? "";
  // A subtle dot when any axis differs from its conventional default, so the
  // user knows a filter is active without opening the sheet.
  const hasActiveFilter =
    viewMode !== "chronological" ||
    (signalFilter !== undefined && signalFilter !== "signal") ||
    (showStrength && !!heroFilters && strengthValue !== heroFilters[0]?.id) ||
    (extraFilters ?? []).some(
      (ef) =>
        (extraFilterValues?.[ef.id] ?? ef.options[0]?.id) !== ef.options[0]?.id,
    );

  return (
    <Drawer.Root direction={direction}>
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
        <Drawer.Content className={contentClass}>
          {!isDesktop && (
            <div className="mx-auto mt-3 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-black/15 dark:bg-white/20" />
          )}

          <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 space-y-6 overflow-y-auto">
            <Drawer.Title className="text-base font-semibold">
              Filters
            </Drawer.Title>

            <Field
              description="Order the list by disclosure date, or by the biggest gain since the trade."
              label="What do you want to see?"
            >
              <Segmented
                options={VIEW_OPTIONS}
                value={viewMode}
                onChange={(id) => onViewMode(id as MarketViewMode)}
              />
            </Field>

            {signalFilter !== undefined && onSignalFilterChange && (
              <Field
                description="Signal is the curated, non-routine subset we surface. All shows every disclosed filing, routine and unrated included."
                label="How much should we show?"
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
              <Field
                description="Narrow to one rating tier — significant, noteworthy, or minor."
                label="Which conviction strength?"
              >
                <Select
                  options={heroFilters}
                  value={strengthValue}
                  onChange={onHeroFilterChange}
                />
              </Field>
            )}

            {extraFilters?.map((ef) => (
              <Field
                key={ef.id}
                description={ef.description}
                label={`Which ${ef.label.toLowerCase()}?`}
              >
                <Segmented
                  options={ef.options}
                  value={extraFilterValues?.[ef.id] ?? ef.options[0]?.id ?? ""}
                  onChange={(id) => onExtraFilterChange?.(ef.id, id)}
                />
              </Field>
            ))}

            {trailing && (
              <Field
                description="Raw shows the stock's move; vs S&P 500 shows alpha (the move minus the index). From trade measures since the member traded; From disclosure measures since it became public."
                label="How is performance measured?"
              >
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
  /** Explanatory header — phrased as a question ("What do you want to see?")
   *  so the drawer teaches the axis rather than just naming it. */
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[13px] font-semibold text-foreground/90">{label}</div>
      {children}
      {description && (
        <p className="text-[12px] leading-snug text-muted">{description}</p>
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
