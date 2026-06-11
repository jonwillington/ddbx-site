import type { ReactNode } from "react";
import type { SignalFilterValue } from "@/lib/markets/types";
import type { FilterSelectOption, MarketViewMode } from "./market-filter-bar";

import { Drawer } from "vaul";
import { useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

import { useMediaQuery } from "@/lib/use-media-query";
import { SIGNAL_FILTER_OPTIONS, VIEW_OPTIONS } from "./market-filter-bar";

interface ExtraFilter {
  id: string;
  label: string;
  question?: string;
  description?: string;
  kind?: "select" | "multiselect";
  options: FilterSelectOption[];
  defaultValue?: string;
}

/** Filter drawer holding every list filter as a collapsible accordion — a side
 *  drawer (floats off the right) on tablet + desktop, a bottom sheet on phones.
 *  Each accordion shows its current value collapsed and expands to reveal the
 *  control + a one-line explanation, so a many-axis panel stays scannable. The
 *  chart-mode toggle is passed through verbatim (`trailing`). */
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
  onReset,
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
  extraFilters?: ExtraFilter[];
  extraFilterValues?: Record<string, string>;
  onExtraFilterChange?: (filterId: string, value: string) => void;
  /** Reset every drawer filter to its default ("show everything"). */
  onReset?: () => void;
  trailing?: ReactNode;
}) {
  // Side drawer (floats off the right) on tablet + desktop; bottom sheet on
  // phones. Mirrors the detail drawer so the two read as the same surface.
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const direction = isDesktop ? "right" : "bottom";
  const contentClass = isDesktop
    ? "fixed top-3 bottom-3 right-3 z-50 w-[calc(100vw-1.5rem)] max-w-sm rounded-2xl border border-[#e8e0d5] dark:border-separator bg-[#f5f0e8] dark:bg-background shadow-2xl flex flex-col overflow-hidden outline-none"
    : "fixed bottom-0 inset-x-0 z-50 max-h-[88vh] rounded-t-2xl border-t border-[#e8e0d5] dark:border-separator bg-[#f5f0e8] dark:bg-background flex flex-col overflow-hidden outline-none";

  const strengthValue = heroFilterId ?? heroFilters?.[0]?.id ?? "";

  // Which accordions are expanded. Default just "View" open so it's obvious the
  // rows expand; everything else collapses to its current-value summary.
  const [open, setOpen] = useState<Set<string>>(() => new Set(["view"]));
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // A subtle dot when any axis differs from its conventional default, so the
  // user knows a filter is active without opening the sheet.
  const hasActiveFilter =
    viewMode !== "chronological" ||
    (signalFilter !== undefined && signalFilter !== "signal") ||
    (showStrength && !!heroFilters && strengthValue !== heroFilters[0]?.id) ||
    (extraFilters ?? []).some(
      (ef) =>
        (extraFilterValues?.[ef.id] ?? ef.defaultValue ?? ef.options[0]?.id) !==
        (ef.defaultValue ?? ef.options[0]?.id),
    );

  const viewLabel =
    VIEW_OPTIONS.find((o) => o.id === viewMode)?.label ?? viewMode;
  const signalLabel = SIGNAL_FILTER_OPTIONS.find(
    (o) => o.id === signalFilter,
  )?.label;
  const strengthLabel = heroFilters?.find((o) => o.id === strengthValue)?.label;

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

          <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-2.5">
            <Drawer.Title className="px-1 text-base font-semibold">
              Filters
            </Drawer.Title>

            <Accordion
              description="Order the list by disclosure date, or by the biggest gain since the trade."
              open={open.has("view")}
              title="What do you want to see?"
              value={viewLabel}
              onToggle={() => toggle("view")}
            >
              <Segmented
                options={VIEW_OPTIONS}
                value={viewMode}
                onChange={(id) => onViewMode(id as MarketViewMode)}
              />
            </Accordion>

            {signalFilter !== undefined && onSignalFilterChange && (
              <Accordion
                description="Signal is the curated, non-routine subset we surface. All shows every disclosed filing, routine and unrated included."
                open={open.has("signal")}
                title="How much should we show?"
                value={signalLabel}
                onToggle={() => toggle("signal")}
              >
                <Segmented
                  options={SIGNAL_FILTER_OPTIONS}
                  value={signalFilter}
                  onChange={(id) =>
                    onSignalFilterChange(id as SignalFilterValue)
                  }
                />
              </Accordion>
            )}

            {showStrength && heroFilters && onHeroFilterChange && (
              <Accordion
                description="Narrow to one rating tier — significant, noteworthy, or minor."
                open={open.has("strength")}
                title="Which conviction strength?"
                value={strengthLabel}
                onToggle={() => toggle("strength")}
              >
                <Select
                  options={heroFilters}
                  value={strengthValue}
                  onChange={onHeroFilterChange}
                />
              </Accordion>
            )}

            {extraFilters?.map((ef) => {
              const value =
                extraFilterValues?.[ef.id] ?? ef.defaultValue ?? "";
              return (
                <Accordion
                  key={ef.id}
                  description={ef.description}
                  open={open.has(ef.id)}
                  title={ef.question ?? `Which ${ef.label.toLowerCase()}?`}
                  value={summarizeExtra(ef, value)}
                  onToggle={() => toggle(ef.id)}
                >
                  {ef.kind === "multiselect" ? (
                    <MultiSelect
                      options={ef.options}
                      value={value}
                      onChange={(v) => onExtraFilterChange?.(ef.id, v)}
                    />
                  ) : ef.options.length > 3 ? (
                    // 4+ options don't fit a segmented row — use a dropdown.
                    <Select
                      options={ef.options}
                      value={value || ef.options[0]?.id || ""}
                      onChange={(id) => onExtraFilterChange?.(ef.id, id)}
                    />
                  ) : (
                    <Segmented
                      options={ef.options}
                      value={value || ef.options[0]?.id || ""}
                      onChange={(id) => onExtraFilterChange?.(ef.id, id)}
                    />
                  )}
                </Accordion>
              );
            })}

            {trailing && (
              <Accordion
                open={open.has("performance")}
                title="Performance"
                onToggle={() => toggle("performance")}
              >
                {trailing}
              </Accordion>
            )}
          </div>

          {/* Pinned footer — Reset and Done at 50/50, always reachable. */}
          <div className="shrink-0 flex gap-2.5 border-t border-separator/60 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              className="flex-1 rounded-full border border-separator py-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-foreground/5 disabled:opacity-40"
              disabled={!hasActiveFilter}
              type="button"
              onClick={() => onReset?.()}
            >
              Reset
            </button>
            <Drawer.Close asChild>
              <button
                className="flex-1 rounded-full bg-[#5a4128] py-3 text-sm font-medium text-white transition-colors hover:bg-[#49331f]"
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

/** Summary of an extra filter's current value for the collapsed accordion. */
function summarizeExtra(ef: ExtraFilter, value: string): string {
  if (ef.kind === "multiselect") {
    const ids = value.split(",").filter(Boolean);
    if (ids.length === 0) return "All";
    const labels = ids.map(
      (id) => ef.options.find((o) => o.id === id)?.label ?? id,
    );
    return labels.length <= 2
      ? labels.join(", ")
      : `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
  }
  const id = value || ef.defaultValue || ef.options[0]?.id;
  return ef.options.find((o) => o.id === id)?.label ?? "All";
}

/** Collapsible filter row — current value on the right when collapsed; control
 *  + explanation revealed on expand. */
function Accordion({
  title,
  value,
  description,
  open,
  onToggle,
  children,
}: {
  title: string;
  value?: string;
  description?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-separator/70 bg-surface/30">
      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
        type="button"
        onClick={onToggle}
      >
        <span className="text-[13px] font-semibold text-foreground/90">
          {title}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {value && (
            <span className="max-w-[150px] truncate text-[12px] text-muted">
              {value}
            </span>
          )}
          <ChevronDownIcon
            className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {open && (
        <div className="space-y-2 px-3.5 pb-3.5 pt-0.5">
          {children}
          {description && (
            <p className="text-[12px] leading-snug text-muted">{description}</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Native select — for axes with more options than fit as a segmented row. */
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

/** Multi-select chips — any number selected; value is a comma-joined id list
 *  ("" = none = show all). */
function MultiSelect({
  options,
  value,
  onChange,
}: {
  options: FilterSelectOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = new Set(value.split(",").filter(Boolean));
  const flip = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange([...next].join(","));
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const on = selected.has(opt.id);
        return (
          <button
            key={opt.id}
            aria-pressed={on}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              on
                ? "border-[#5a4128]/40 bg-[#5a4128]/15 text-[#3d2b1a] dark:text-[#ad9479]"
                : "border-separator text-muted hover:text-foreground"
            }`}
            type="button"
            onClick={() => flip(opt.id)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
