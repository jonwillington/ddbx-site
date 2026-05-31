import type { ReactNode } from "react";
import type { SignalFilterValue } from "@/lib/markets/types";

import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";

import { MarketFiltersSheet } from "./market-filters-sheet";

export type MarketViewMode = "chronological" | "by-gain";

/** Lean shape MarketFilterBar needs to render its dropdowns. Predicates and
 *  W-typed data stay out — the bar just renders labels, an optional helper
 *  description, and reports the selected id. */
export interface FilterSelectOption {
  id: string;
  label: string;
  /** Optional one-line helper shown under the label inside the dropdown
   *  menu. Used by the Filter dropdown so Signal/All carry their own
   *  explanation; left undefined for plain dropdowns like Strength/View. */
  description?: string;
}

/** Legacy alias kept so older imports compile while callers migrate. */
export type HeroFilterOption = FilterSelectOption;

export const SIGNAL_FILTER_OPTIONS: FilterSelectOption[] = [
  {
    id: "signal",
    label: "Signal",
    description: "Trades the analyst surfaced — high-conviction, non-routine.",
  },
  {
    id: "all",
    label: "All",
    description: "Every disclosed filing, including routine and unrated.",
  },
];

export const VIEW_OPTIONS: FilterSelectOption[] = [
  { id: "chronological", label: "Chronological" },
  { id: "by-gain", label: "By gain" },
];

/** Filter strip rendered above the month list (and inside the by-gain view).
 *  Search sits on the left; list-level filters (view mode, signal/all,
 *  strength) follow as compact dropdowns rather than tab strips so the bar
 *  stays light as the filter axes grow. The Strength dropdown is hidden
 *  whenever Filter=All — picking All means "no rating axis applied", so
 *  surfacing strength buckets there would be misleading. */
export function MarketFilterBar({
  viewMode,
  onViewMode,
  search,
  onSearch,
  searchPlaceholder = "Search ticker, company, insider…",
  signalFilter,
  onSignalFilterChange,
  heroFilters,
  heroFilterId,
  onHeroFilterChange,
  trailing,
}: {
  viewMode: MarketViewMode;
  onViewMode: (v: MarketViewMode) => void;
  search: string;
  onSearch: (s: string) => void;
  searchPlaceholder?: string;
  signalFilter?: SignalFilterValue;
  onSignalFilterChange?: (v: SignalFilterValue) => void;
  heroFilters?: FilterSelectOption[];
  heroFilterId?: string | null;
  onHeroFilterChange?: (id: string) => void;
  /** Optional element rendered ml-auto on the right — currently used for the
   *  chart-mode toggle. */
  trailing?: ReactNode;
}) {
  const showStrength =
    signalFilter !== "all" &&
    !!heroFilters &&
    heroFilters.length > 0 &&
    !!onHeroFilterChange;

  return (
    <div className="flex items-center gap-3 bg-[#faf7f2] dark:bg-surface px-5 py-3.5">
      <input
        className="flex-1 min-w-0 xl:flex-none xl:w-72 rounded-full border border-separator bg-transparent px-4 py-2 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:border-[#5a4128]/50 transition-colors"
        placeholder={searchPlaceholder}
        type="text"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />

      {/* Desktop: filters laid out inline. Below lg they collapse into the
          bottom sheet so the bar stays a single clean row on mobile. */}
      <div className="hidden xl:flex flex-1 min-w-0 items-center gap-3">
        <FilterSelect
          label="View"
          options={VIEW_OPTIONS}
          value={viewMode}
          onChange={(id) => onViewMode(id as MarketViewMode)}
        />
        {signalFilter !== undefined && onSignalFilterChange && (
          <FilterSelect
            label="Filter"
            options={SIGNAL_FILTER_OPTIONS}
            value={signalFilter}
            onChange={(id) => onSignalFilterChange(id as SignalFilterValue)}
          />
        )}
        {showStrength && (
          <FilterSelect
            label="Strength"
            options={heroFilters!}
            value={heroFilterId ?? heroFilters![0]?.id ?? ""}
            onChange={onHeroFilterChange!}
          />
        )}
        {trailing && <div className="ml-auto">{trailing}</div>}
      </div>

      {/* Mobile: one button opens a bottom sheet holding every filter. */}
      <div className="xl:hidden shrink-0">
        <MarketFiltersSheet
          heroFilterId={heroFilterId}
          heroFilters={heroFilters}
          showStrength={showStrength}
          signalFilter={signalFilter}
          trailing={trailing}
          viewMode={viewMode}
          onHeroFilterChange={onHeroFilterChange}
          onSignalFilterChange={onSignalFilterChange}
          onViewMode={onViewMode}
        />
      </div>
    </div>
  );
}

/** Compact labelled dropdown ("Label: Value ▾") matching the styling of the
 *  navbar's MarketSwitcher — borrowed verbatim for consistency so filter
 *  dropdowns and the market switcher feel like the same control family. */
function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterSelectOption[];
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.id === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 rounded-full border border-separator bg-surface/40 px-3 py-1.5 text-xs text-foreground/85 hover:border-[#5a4128]/50 transition-colors"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-muted">{label}:</span>
        <span className="font-medium">{current?.label ?? ""}</span>
        <ChevronDownIcon
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 mt-2 rounded-xl border border-separator bg-[#f5f0e8] dark:bg-background shadow-lg overflow-hidden z-50 py-1 ${
            options.some((o) => o.description) ? "w-72" : "min-w-[180px]"
          }`}
          role="listbox"
        >
          {options.map((opt) => {
            const isCurrent = opt.id === value;

            return (
              <button
                key={opt.id}
                aria-selected={isCurrent}
                className="flex items-start gap-2 w-full px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                role="option"
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium leading-tight">{opt.label}</div>
                  {opt.description && (
                    <div className="text-[11px] text-muted mt-0.5 leading-snug">
                      {opt.description}
                    </div>
                  )}
                </div>
                {isCurrent && (
                  <CheckIcon className="w-3.5 h-3.5 text-foreground/60 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
