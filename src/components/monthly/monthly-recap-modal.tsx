import type {
  MonthlySummaryListItem,
  MonthlySummaryResponse,
} from "@/types/ddbx";

import { useEffect, useRef, useState } from "react";

import { MonthlyClusters } from "./monthly-clusters";
import { MonthlyFeatured } from "./monthly-featured";
import { MonthlyMetrics } from "./monthly-metrics";
import { MonthlyNarrative } from "./monthly-narrative";
import { MonthlyPerformanceSection } from "./monthly-performance";
import { Prose } from "./monthly-prose";
import { MonthlySection } from "./monthly-section";
import { monthLabel } from "./monthly-utils";

import { api } from "@/lib/api";
import { AppModal } from "@/components/app-modal";
import { AppStoreBadge } from "@/components/app-store-badge";

/** The monthly recap report. Opened from the hero's "View {month} Report" CTA
 *  or a month header's "View Report" link. Fetches the full article for the
 *  selected month and lets the reader switch months. Fully public — no
 *  discretion gating, just a "Get the app" nudge in the footer. */
export function MonthlyRecapModal({
  open,
  onClose,
  market,
  month,
}: {
  open: boolean;
  onClose: () => void;
  /** API market param; omit for UK. */
  market?: string;
  /** The month to open at — the latest from the hero CTA, or a specific month
   *  when launched from a month header's "View Report" link. */
  month: string | null;
}) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(month);
  const [data, setData] = useState<MonthlySummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState<MonthlySummaryListItem[]>([]);
  const cache = useRef<Map<string, MonthlySummaryResponse>>(new Map());

  // Snap to the requested month each time the modal opens (or the caller asks
  // for a different one). While it stays open the reader's own month-chooser
  // picks win — this only fires on open / `month` change, not on every render.
  useEffect(() => {
    if (open && month) setSelectedMonth(month);
  }, [open, month]);

  // Load the chooser index once the modal first opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    api
      .monthlySummaries(market)
      .then((r) => {
        if (!cancelled) setMonths(r.summaries);
      })
      .catch(() => {
        if (!cancelled) setMonths([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, market]);

  // Fetch the selected month's article (cached per month).
  useEffect(() => {
    if (!open || !selectedMonth) return;
    const cached = cache.current.get(selectedMonth);

    if (cached) {
      setData(cached);
      setError(null);

      return;
    }
    let cancelled = false;

    setLoading(true);
    setError(null);
    api
      .monthlySummary(selectedMonth, market)
      .then((r) => {
        if (cancelled) return;
        cache.current.set(selectedMonth, r);
        setData(r);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, selectedMonth, market]);

  const summary = data?.summary;

  return (
    <AppModal
      fill
      bodyClassName="p-5 md:p-6"
      headerRight={
        months.length > 1 ? (
          <MonthChooser
            months={months}
            value={selectedMonth}
            onChange={setSelectedMonth}
          />
        ) : undefined
      }
      maxWidthClass="max-w-7xl"
      open={open}
      subtitle="A look back at the month"
      title={`${monthLabel(selectedMonth)} Recap`}
      titleClassName="truncate text-xl font-bold tracking-tight md:text-2xl"
      onClose={onClose}
    >
      {loading && !summary && (
        <div className="py-16 text-center text-sm text-muted">Loading…</div>
      )}

      {error && !summary && (
        <div className="py-16 text-center text-sm text-muted">
          Couldn&apos;t load this report.
        </div>
      )}

      {summary && (
        <div className="flex flex-col lg:min-h-0 lg:flex-1">
          {/* Two columns on desktop (lg+); a single stack below that. Source
              order matches the mobile reading order — overview first, then the
              detail — so the small-screen layout is unchanged. The left
              "overview" column is the narrower 2/5; prose reads better in a
              tighter measure and the metrics/chart sit comfortably there. The
              detail (featured + clusters) takes the wider 3/5 for its charts
              and grids.

              On lg+ the grid is flex-1 with a single full-height row
              (grid-rows-1 → minmax(0,1fr)), so each column gets a bounded
              height and scrolls independently while the footer stays pinned.
              Below lg the whole modal body scrolls as one (see AppModal
              `fill`). */}
          <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:min-h-0 lg:flex-1 lg:grid-cols-5 lg:grid-rows-1 lg:gap-y-0">
            <div className="space-y-6 lg:col-span-2 lg:min-h-0 lg:space-y-8 lg:overflow-y-auto lg:overscroll-contain lg:pr-4">
              {/* Metrics lead the column. The narrative, macro and performance
                  collapse into accordions on mobile to keep the single-column
                  page light (mirrors iOS); on lg+ they render plainly. */}
              <MonthlyMetrics metrics={summary.metrics} />
              <MonthlySection title="Overview">
                <MonthlyNarrative summary={summary} />
              </MonthlySection>
              {summary.macro_note && (
                <MonthlySection title="Macro backdrop">
                  <div className="space-y-2">
                    <h4 className="hidden text-xs font-semibold uppercase tracking-wide text-muted lg:block">
                      Macro backdrop
                    </h4>
                    <Prose text={summary.macro_note} />
                  </div>
                </MonthlySection>
              )}
              {data?.performance && (
                <MonthlySection title="Performance">
                  <MonthlyPerformanceSection performance={data.performance} />
                </MonthlySection>
              )}
            </div>

            <div className="space-y-8 lg:col-span-3 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pl-1">
              <MonthlyFeatured items={summary.featured} />
              <MonthlyClusters clusters={summary.clusters} />
            </div>
          </div>

          <footer className="mt-5 flex shrink-0 items-center justify-between gap-4 border-t border-black/[0.06] pt-5 dark:border-white/[0.08] md:pt-6">
            <p className="text-[11px] leading-snug text-muted">
              A look back at the month, drafted with AI assistance. Not
              investment advice.
            </p>
            <AppStoreBadge className="shrink-0" placement="Monthly recap" size="md" />
          </footer>
        </div>
      )}
    </AppModal>
  );
}

function MonthChooser({
  months,
  value,
  onChange,
}: {
  months: MonthlySummaryListItem[];
  value: string | null;
  onChange: (month: string) => void;
}) {
  return (
    <select
      aria-label="Choose month"
      className="rounded-full border border-separator bg-surface/40 px-3 py-1 text-xs font-medium text-foreground outline-none"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    >
      {months.map((m) => (
        <option key={m.month} value={m.month}>
          {monthLabel(m.month)}
        </option>
      ))}
    </select>
  );
}
