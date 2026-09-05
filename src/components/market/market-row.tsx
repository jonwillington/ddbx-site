import type { ComponentType, ReactNode } from "react";
import type { PriceFormat } from "@/components/position-card";
import type {
  ChartMode,
  MarketColumnKey,
  MarketDealing,
} from "@/lib/markets/types";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { InformationCircleIcon } from "@heroicons/react/20/solid";

import { MarketRowSpark, type SparkBar } from "./market-row-spark";
import {
  computeRowMetric,
  deltaStyle,
  livePerfValue,
  shortDate,
} from "./market-utils";

import { CalendarDayChip } from "@/components/calendar-day-chip";
import { Skeleton } from "@/components/skeleton";
import { CompanyLogo } from "@/components/company-logo";
import { chip } from "@/components/chip";
import { BuyStyleChip } from "@/components/buy-style-chip";
import { CommentCountChip } from "@/components/comment-count-chip";
import { commentCountFor } from "@/lib/comment-counts";
import { capitalisedRole } from "@/lib/display-name";
import { PartyChip } from "@/components/party-chip";
import { ChamberChip } from "@/components/chamber-chip";
import { Tooltip } from "@/components/tooltip";
import { ViewAnalysisCta } from "@/components/discretion/view-analysis-cta";
import { DISCRETION_ENABLED } from "@/lib/discretion";

/** Generic fallbacks for the table-header tooltips. A market overrides any of
 *  these via MarketConfig.columnHelp; anything it leaves unset uses these so
 *  every header still explains itself. */
const DEFAULT_COLUMN_HELP: Record<MarketColumnKey, string> = {
  disclosed: "The date this trade was disclosed to the public.",
  ticker: "The stock's exchange ticker symbol.",
  company: "The company traded and the insider who traded it.",
  value: "Approximate size of the purchase.",
  trend:
    "Quantity (the number of buys folded into this row), alongside the share price's recent trend.",
  performance:
    "Price change since the trade, or the return vs the market benchmark when that view is selected.",
  comments:
    "Readers are discussing these trades in the app. Counts shown here; the conversation lives in the app.",
  action: "Our signal rating for this trade.",
};

/** Columns a market may switch off wholesale (MarketConfig.hiddenColumns).
 *  Passed down as a Set so a row does one lookup per cell rather than a
 *  linear scan. `has` on an undefined set is the common case, so callers get
 *  an empty set by default and never branch on null. */
export type HiddenColumns = ReadonlySet<MarketColumnKey>;

const NO_HIDDEN: HiddenColumns = new Set<MarketColumnKey>();

/** A column header label with an info tooltip explaining what the column means
 *  for the active market. */
function HeaderLabel({
  help,
  children,
}: {
  help: string;
  children: ReactNode;
}) {
  return (
    <Tooltip
      className="inline-flex items-center gap-1 cursor-help align-middle"
      content={help}
    >
      {children}
      <InformationCircleIcon className="h-3 w-3 shrink-0 text-muted/40" />
    </Tooltip>
  );
}

/** Column headers above the row list. `hideDate` matches the per-section
 *  Today cluster which gets its own date heading. The Performance column
 *  label flips between "Return" and "vs $benchmarkLabel" depending on the
 *  active chart mode so the column header always names what's shown. */
export function MarketRowHeader({
  hideDate = false,
  benchmarkLabel,
  chartMode,
  inset = false,
  valueColumnClass = "w-24",
  columnHelp,
  hiddenColumns = NO_HIDDEN,
  showLegCount = true,
}: {
  hideDate?: boolean;
  benchmarkLabel: string;
  chartMode: ChartMode;
  /** Columns this market doesn't render — see MarketConfig.hiddenColumns. */
  hiddenColumns?: HiddenColumns;
  /** When true, the header columns are nudged inward by px-3 to align with
   *  the rounded day cards in the chronological view. */
  inset?: boolean;
  /** Tailwind width class for the Value column — wider for SEK. */
  valueColumnClass?: string;
  /** Per-market header tooltip copy; unset columns fall back to defaults. */
  columnHelp?: Partial<Record<MarketColumnKey, string>>;
  /** Mirrors MarketConfig.showLegCount — drops "Qty /" from the label when the
   *  rows aren't rendering a count. */
  showLegCount?: boolean;
}) {
  const perfLabel =
    chartMode.axis === "market" ? `vs ${benchmarkLabel}` : "Return";
  const help = { ...DEFAULT_COLUMN_HELP, ...columnHelp };

  return (
    <div
      className={`hidden md:flex items-center text-[10px] uppercase tracking-wider text-muted/80 font-medium select-none border-b border-black/[0.08] dark:border-white/[0.08] bg-black/[0.04] dark:bg-white/[0.05] ${inset ? "px-3" : ""}`}
    >
      {!hideDate && (
        <div className="w-28 shrink-0 px-3 py-1.5 border-r border-black/[0.06] dark:border-white/[0.06]">
          <HeaderLabel help={help.disclosed}>Disclosed</HeaderLabel>
        </div>
      )}
      <div className="w-20 shrink-0 px-2 py-1.5 text-center border-r border-black/[0.06] dark:border-white/[0.06]">
        <HeaderLabel help={help.ticker}>Ticker</HeaderLabel>
      </div>
      <div className="flex-1 min-w-0 px-3 py-1.5 border-r border-black/[0.06] dark:border-white/[0.06]">
        <HeaderLabel help={help.company}>Company / Insider</HeaderLabel>
      </div>
      <div
        className={`${valueColumnClass} shrink-0 px-3 py-1.5 text-right border-r border-black/[0.06] dark:border-white/[0.06]`}
      >
        <HeaderLabel help={help.value}>Value</HeaderLabel>
      </div>
      {!hiddenColumns.has("trend") && (
        <div className="w-24 shrink-0 px-2 py-1.5 text-center border-r border-black/[0.06] dark:border-white/[0.06]">
          <HeaderLabel help={help.trend}>
            {showLegCount ? "Qty / Trend" : "Trend"}
          </HeaderLabel>
        </div>
      )}
      {!hiddenColumns.has("performance") && (
        <div className="w-24 shrink-0 px-2 py-1.5 text-center border-r border-black/[0.06] dark:border-white/[0.06]">
          <HeaderLabel help={help.performance}>{perfLabel}</HeaderLabel>
        </div>
      )}
      {!hiddenColumns.has("comments") && (
        <div className="w-24 shrink-0 px-2 py-1.5 text-center border-r border-black/[0.06] dark:border-white/[0.06]">
          <HeaderLabel help={help.comments}>Comments</HeaderLabel>
        </div>
      )}
      {!hiddenColumns.has("action") && (
        <div className="w-40 shrink-0 px-2 py-1.5 text-center">
          <HeaderLabel help={help.action}>Action</HeaderLabel>
        </div>
      )}
    </div>
  );
}

/** Flat tear-off-calendar chip: weekday strip over a big day number. Drawn
 *  entirely in CSS (no image assets), so repeating it for every day in the
 *  list costs nothing. Brand-toned rather than the classic red so thirty of
 *  them read as structure, not decoration. */
/** Date marker rendered for each day inside an open month. At wide desktop
 *  widths `variant="rail"` sits in a dedicated gutter to the left of the day
 *  card. Below `xl` the default inline variant sits ABOVE the day card on the
 *  well background — same calendar chip laid horizontally with the month and
 *  a hairline running to the right edge, so the scroll still reads as a
 *  dated timeline where the table can't spare a gutter. */
export function MarketDayHeader({
  weekday,
  day,
  isoDate,
  locale = "en-US",
  variant = "inline",
}: {
  weekday: string;
  day: string;
  isoDate: string;
  locale?: string;
  variant?: "inline" | "rail";
}) {
  const dateObj = new Date(isoDate);
  const monthLabel = !Number.isNaN(dateObj.getTime())
    ? dateObj.toLocaleString(locale, { month: "short" })
    : "";
  // `day` arrives as an ordinal ("17th") — the chip wants the bare number.
  const dayNum = day.match(/^\d+/)?.[0] ?? day;

  if (variant === "rail") {
    return (
      <div className="hidden xl:block pt-2 text-left">
        <time className="inline-block" dateTime={isoDate}>
          <CalendarDayChip dayNum={dayNum} weekday={weekday} />
        </time>
      </div>
    );
  }

  return (
    <div className="mb-2 flex items-center gap-3 px-1 xl:hidden">
      <time className="flex items-center gap-2" dateTime={isoDate}>
        <CalendarDayChip dayNum={dayNum} size="sm" weekday={weekday} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/55">
          {monthLabel}
        </span>
      </time>
      <span aria-hidden className="h-px flex-1 bg-foreground/10" />
    </div>
  );
}

/** Separator rendered between two days whose gap straddles a weekend, in
 *  both the xl rail view and the sub-xl stacked timeline — a dashed rule
 *  with a small centred label, so the list reads in trading weeks rather
 *  than one undifferentiated run of days. Purely decorative: the day
 *  headers on either side carry the actual dates. */
export function WeekendBreak() {
  return (
    <div aria-hidden className="flex items-center gap-3 px-1">
      <span className="flex-1 border-t border-dashed border-foreground/15" />
      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/40">
        Weekend
      </span>
      <span className="flex-1 border-t border-dashed border-foreground/15" />
    </div>
  );
}

/** Iridescent gradient bubble used in place of a company logo on the
 *  day-summary row — signals "this is AI-generated context, not a deal". */
function AiAvatar({ size = 28 }: { size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 shadow-sm bg-[linear-gradient(to_right,#3300FC,#95008A,#EB0000)]"
      style={{ width: size, height: size }}
    >
      <svg
        aria-hidden="true"
        className="text-white"
        fill="none"
        height={size * 0.5}
        viewBox="0 0 16 16"
        width={size * 0.5}
      >
        <path
          d="M8 1.5l1.2 3.3L12.5 6l-3.3 1.2L8 10.5 6.8 7.2 3.5 6l3.3-1.2L8 1.5zM13 10l.6 1.7 1.7.6-1.7.6L13 14.6l-.6-1.7L10.7 12.3l1.7-.6L13 10z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

/** Standalone "Day in review" row, rendered at the top of each day inside
 *  an open month. Mirrors MarketRow's column geometry so it slots into the
 *  same table — no ticker, AI-style avatar in place of the company logo,
 *  headline in the company/insider slot. The whole row is the click target
 *  for opening the daily summary sheet. */
export function MarketDaySummaryRow({
  isToday,
  headline,
  onOpen,
  valueColumnClass = "w-24",
}: {
  isToday?: boolean;
  headline: string;
  onOpen: () => void;
  valueColumnClass?: string;
}) {
  const label = isToday ? "Today's summary" : "Day in review";

  return (
    <button
      className="w-full text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-brown/40 dark:focus-visible:ring-brand-tan/40"
      data-ga-event="open_day_summary"
      data-ga-label={label}
      type="button"
      onClick={onOpen}
    >
      {/* ── Mobile (<md) ── */}
      <div className="md:hidden px-3 py-2.5 flex items-center gap-2.5">
        <AiAvatar />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-brand-brown dark:text-brand-tan leading-tight">
            {label}
          </div>
          <div className="text-[13px] font-medium text-foreground/90 mt-0.5 truncate">
            {headline}
          </div>
        </div>
      </div>

      {/* ── Desktop (md+) ── */}
      <div className="hidden md:flex items-stretch">
        <div className="w-20 shrink-0 px-2 py-2.5 border-r border-black/[0.06] dark:border-white/[0.06]" />
        <div className="flex-1 min-w-0 px-3 py-2.5 flex items-center gap-2.5 border-r border-black/[0.06] dark:border-white/[0.06]">
          <AiAvatar />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-brand-brown dark:text-brand-tan leading-tight">
              {label}
            </div>
            <div className="text-[13px] font-medium text-foreground/90 mt-0.5 truncate">
              {headline}
            </div>
          </div>
        </div>
        <div
          className={`${valueColumnClass} shrink-0 px-3 py-2.5 border-r border-black/[0.06] dark:border-white/[0.06]`}
        />
        <div className="w-24 shrink-0 px-2 py-2.5 border-r border-black/[0.06] dark:border-white/[0.06]" />
        <div className="w-24 shrink-0 px-2 py-2.5 border-r border-black/[0.06] dark:border-white/[0.06]" />
        <div className="w-24 shrink-0 px-2 py-2.5 border-r border-black/[0.06] dark:border-white/[0.06]" />
        <div className="w-40 shrink-0 px-2 py-2.5" />
      </div>
    </button>
  );
}

/** Skeleton placeholder that matches MarketRow's column geometry on both
 *  mobile and desktop. Used while the dealings fetch is in flight so the
 *  layout doesn't jump when data arrives. */
export function MarketRowSkeleton({
  hideDate = false,
  valueColumnClass = "w-24",
  hiddenColumns = NO_HIDDEN,
}: {
  hideDate?: boolean;
  valueColumnClass?: string;
  /** Must match the live table's, or the loading state promises a geometry
   *  the arrived rows don't keep — the thing the static-page rules call a
   *  loading state that doesn't match the arrived shape. */
  hiddenColumns?: HiddenColumns;
}) {
  return (
    <div className="w-full">
      {/* Mobile */}
      <div className="md:hidden px-3 py-3">
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] p-3.5 space-y-3">
          <Skeleton className="h-3 w-32 rounded" />
          <div className="flex items-start gap-3">
            <Skeleton circle className="shrink-0 mt-0.5" h={38} w={38} />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-12 rounded-md" />
                <Skeleton className="h-5 flex-1 rounded" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-[54px] rounded-xl" />
            <Skeleton className="h-[54px] rounded-xl" />
            <Skeleton className="h-[54px] rounded-xl" />
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:flex items-stretch">
        {!hideDate && (
          <div className="w-28 shrink-0 px-3 py-2.5 flex items-center border-r border-black/[0.06] dark:border-white/[0.06]">
            <Skeleton className="h-3.5 w-16 rounded" />
          </div>
        )}
        <div className="w-20 shrink-0 px-2 py-2.5 flex items-center justify-center border-r border-black/[0.06] dark:border-white/[0.06]">
          <Skeleton className="h-4 w-10 rounded" />
        </div>
        <div className="flex-1 min-w-0 px-3 py-2.5 flex items-center gap-2.5 border-r border-black/[0.06] dark:border-white/[0.06]">
          <Skeleton circle className="shrink-0" h={28} w={28} />
          <div className="flex-1 min-w-0 space-y-1">
            <Skeleton className="h-3.5 w-1/2 rounded" />
            <Skeleton className="h-3 w-2/5 rounded" />
          </div>
        </div>
        <div
          className={`${valueColumnClass} shrink-0 px-3 py-2.5 flex flex-col items-end justify-center gap-1 border-r border-black/[0.06] dark:border-white/[0.06]`}
        >
          <Skeleton className="h-4 w-16 rounded" />
        </div>
        {!hiddenColumns.has("trend") && (
          <div className="w-24 shrink-0 px-2 py-2.5 flex items-center justify-center border-r border-black/[0.06] dark:border-white/[0.06]">
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        )}
        {!hiddenColumns.has("performance") && (
          <div className="w-24 shrink-0 px-2 py-2.5 flex items-center justify-center border-r border-black/[0.06] dark:border-white/[0.06]">
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        )}
        {!hiddenColumns.has("comments") && (
          <div className="w-24 shrink-0 px-2 py-2.5 flex items-center justify-center border-r border-black/[0.06] dark:border-white/[0.06]">
            <Skeleton className="h-5 w-10 rounded-md" />
          </div>
        )}
        {!hiddenColumns.has("action") && (
          <div className="w-40 shrink-0 px-2 py-2.5 flex items-center justify-center">
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}

export function DeltaBadge({
  value,
  suffix = "%",
}: {
  value: number;
  suffix?: string;
}) {
  const sign = value >= 0 ? "+" : "";
  const { bg, text } = deltaStyle(value);

  return (
    <span
      className={`${chip("md")} tabular-nums`}
      // border-current/25 in the hairline picks this up, so the edge tracks
      // the magnitude-scaled colour without a second computed value.
      style={{ backgroundColor: bg, color: text }}
    >
      {value >= 0 ? "▲" : "▼"} {sign}
      {value.toFixed(1)}
      {suffix}
    </span>
  );
}

function compactNotation(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: 1,
  })
    .format(value)
    .replaceAll("K", "k")
    .replaceAll("M", "m")
    .replaceAll("B", "b");
}

function formatCompactValue(value: number, fmt: PriceFormat): string {
  const abs = Math.abs(value);

  if (abs < 10_000) return fmt.formatValue(value);

  const sample = fmt.formatValue(abs);
  const firstDigit = sample.search(/\d/);
  const lastDigit = sample.search(/\d(?!.*\d)/);

  if (firstDigit < 0 || lastDigit < firstDigit) return fmt.formatValue(value);

  const prefix = sample.slice(0, firstDigit);
  const suffix = sample.slice(lastDigit + 1);
  const compact = compactNotation(abs);

  return `${value < 0 ? "-" : ""}${prefix}${compact}${suffix}`;
}

interface MarketRowProps<W> {
  dealing: MarketDealing<W>;
  selected: boolean;
  onSelect: () => void;
  /** Live stock price already converted to the major unit used by
   *  `dealing.entryPrice`. Undefined while the latest-prices fetch is in
   *  flight. */
  stockCurrentMajor?: number;
  /** Stock entry price the Return % anchors at. Resolved by the shell:
   *  trade-anchor → execution price (`dealing.entryPrice`); disclosure-
   *  anchor → close on the disclosure date (from stockBars). Falls back to
   *  `dealing.entryPrice` while the per-ticker bars fetch is in flight. */
  stockEntry?: number;
  /** Benchmark close at the chart-mode anchor (trade or disclosure) —
   *  resolved by the shell so the row stays presentational. */
  benchmarkEntry?: number;
  /** Benchmark close right now — same units as benchmarkEntry. */
  benchmarkCurrent?: number;
  /** Per-ticker daily close history for the inline sparkline. Undefined
   *  while the per-ticker fetch is in flight, or when live prices are
   *  disabled for the market. */
  stockBars?: SparkBar[];
  /** Benchmark daily close history (raw bars, sorted by date) used by the
   *  sparkline in `vs Market` axis mode. */
  benchmarkBars?: SparkBar[];
  fmt: PriceFormat;
  benchmarkLabel: string;
  RowActionCell: ComponentType<{ dealing: MarketDealing<W> }>;
  /** Optional badge slotted into the name column — for per-market read-time
   *  signals (e.g. Congress "options"). Should return null when it has
   *  nothing to show. */
  RowNameBadge?: ComponentType<{ dealing: MarketDealing<W> }>;
  hideDate?: boolean;
  /** Columns this market doesn't render at all — see
   *  MarketConfig.hiddenColumns. Must match what MarketRowHeader was given. */
  hiddenColumns?: HiddenColumns;
  /** Suppress the insider name/role subtitle — used for child rows inside a
   *  person-grouped cluster, where every row is the same member shown on the
   *  master above. Cluster + name-badge chips still render. */
  hideInsider?: boolean;
  isMuted?: (dealing: MarketDealing<W>) => boolean;
  formatTickerDisplay?: (ticker: string) => string;
  locale?: string;
  /** When false, the CompanyLogo bubble is suppressed entirely. Default true.
   *  Set from MarketConfig.enableLogos by the shell — used by Sweden where
   *  logo.dev coverage is too thin to bother. */
  showLogo?: boolean;
  /** When false, the trend cell renders the sparkline alone — no leg-count
   *  prefix. Set from MarketConfig.showLegCount. Default true. */
  showLegCount?: boolean;
  /** Drives the right-most Performance cell — raw stock return when
   *  `axis === "raw"`, alpha vs benchmark when `axis === "market"`. */
  chartMode: ChartMode;
  /** True when the disclosure-anchored entry bar is the same date as the
   *  latest live close — no posterior price exists yet (typical on weekends
   *  for Friday's disclosures). Drives a "No data yet" placeholder in the
   *  Return cell instead of a misleading +0.0%. */
  noPosteriorData?: boolean;
  /** When true, the company column's content (logo + name) is nudged right by
   *  one chevron-width so a child row's logo lines up under the parent's
   *  portrait/logo. Set for rows rendered inside a MemberClusterRow, whose
   *  master indents its avatar past an expand chevron. */
  indent?: boolean;
}

/** Collapsed "multiple insiders bought this company today" master row.
 *  Mirrors the iOS dashboard's ticker cluster (DashboardView.clusterMasterRow):
 *  when several insiders — or several disclosures — hit the same ticker on the
 *  same day we fold them into one expandable row instead of N near-identical
 *  rows. Holds its own open/closed state; this is purely a presentation
 *  grouping — the children are ordinary MarketRows that still open their own
 *  drawer on click. Column geometry matches MarketRow's `hideDate` layout so
 *  the master aligns with the table; spark / return / action columns are left
 *  empty (those numbers are per-deal, not per-cluster). */
export function MarketClusterRow<W>({
  representative,
  company,
  count,
  totalValueLabel,
  showLogo = true,
  showLegCount = true,
  formatTickerDisplay,
  valueColumnClass = "w-24",
  children,
}: {
  representative: MarketDealing<W>;
  company: string;
  count: number;
  totalValueLabel: string;
  showLogo?: boolean;
  /** When false the trend cell stays empty rather than repeating the cluster
   *  count that the name column already spells out. See
   *  MarketConfig.showLegCount. */
  showLegCount?: boolean;
  formatTickerDisplay?: (ticker: string) => string;
  valueColumnClass?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rawTicker = representative.ticker || "—";
  const ticker = formatTickerDisplay
    ? formatTickerDisplay(rawTicker)
    : rawTicker;
  const countLabel = `${count} insider buys`;

  return (
    <div className="divide-y divide-black/[0.06] dark:divide-separator">
      <button
        aria-expanded={open}
        className="w-full text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-brown/40 dark:focus-visible:ring-brand-tan/40"
        data-ga-event="toggle_cluster"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        {/* ── Mobile (<md) ── */}
        <div className="md:hidden px-3 py-2.5 flex items-center gap-2.5">
          <ChevronDownIcon
            className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
          {showLogo && <CompanyLogo size={28} ticker={rawTicker} />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] font-semibold px-1.5 py-0 rounded bg-hairline dark:bg-surface-secondary shrink-0">
                {ticker}
              </span>
              <span className="text-[13px] font-medium truncate">
                {company}
              </span>
            </div>
            <div className="text-[11px] text-muted mt-0.5">{countLabel}</div>
          </div>
          <div className="shrink-0 text-sm font-semibold tabular-nums text-right">
            {totalValueLabel}
          </div>
        </div>

        {/* ── Desktop (md+) ── */}
        <div className="hidden md:flex items-stretch">
          <div className="w-20 shrink-0 px-2 py-2.5 flex items-center justify-center border-r border-black/[0.06] dark:border-white/[0.06]">
            <span className="font-mono text-[11px] font-semibold px-1.5 py-0 rounded bg-hairline dark:bg-surface-secondary">
              {ticker}
            </span>
          </div>
          <div className="flex-1 min-w-0 px-3 py-2.5 flex items-center gap-2.5 border-r border-black/[0.06] dark:border-white/[0.06]">
            <ChevronDownIcon
              className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
            {showLogo && <CompanyLogo size={28} ticker={rawTicker} />}
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate leading-tight">
                {company}
              </div>
              <div className="text-[11px] text-muted mt-0.5">{countLabel}</div>
            </div>
          </div>
          <div
            className={`${valueColumnClass} shrink-0 px-3 py-2.5 flex items-center justify-end border-r border-black/[0.06] dark:border-white/[0.06]`}
          >
            <span className="text-sm font-semibold tabular-nums">
              {totalValueLabel}
            </span>
          </div>
          <div className="w-24 shrink-0 px-2 py-2.5 flex items-center justify-center border-r border-black/[0.06] dark:border-white/[0.06]">
            {showLegCount && (
              <span className="text-[11px] font-semibold tabular-nums text-muted/70">
                {count}
              </span>
            )}
          </div>
          <div className="w-24 shrink-0 px-2 py-2.5 border-r border-black/[0.06] dark:border-white/[0.06]" />
          <div className="w-24 shrink-0 px-2 py-2.5 border-r border-black/[0.06] dark:border-white/[0.06]" />
          <div className="w-40 shrink-0 px-2 py-2.5" />
        </div>
      </button>

      {open && (
        <div className="divide-y divide-black/[0.06] dark:divide-separator bg-black/[0.015] dark:bg-white/[0.035]">
          {children}
        </div>
      )}
    </div>
  );
}

/** Round insider avatar — member portrait when present, else initials. */
export function InsiderAvatar({
  name,
  photoUrl,
  size = 28,
}: {
  name: string;
  photoUrl?: string;
  size?: number;
}) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (photoUrl) {
    return (
      <img
        alt=""
        // Explicit square style overrides Tailwind preflight's `height:auto`,
        // which would otherwise let a non-square portrait keep its aspect
        // ratio and render as an oval rather than a true circle.
        className="rounded-full object-cover bg-black/[0.06] dark:bg-white/10 shrink-0"
        height={size}
        loading="lazy"
        src={photoUrl}
        style={{ width: size, height: size }}
        width={size}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-black/[0.06] dark:bg-white/10 shrink-0 flex items-center justify-center text-[10px] font-semibold text-muted"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

/** Hard-gated teaser row for person-clustered markets (Congress, while
 *  discretion gating is on): the member's portrait + name on the left, the
 *  logos of the companies they bought on the right, and the whole row links
 *  straight to the App Store. Deliberately shows no amounts, no performance
 *  and doesn't expand — the web names who bought what, the app has the rest. */
export function MemberAppTeaserRow({
  insiderName,
  insiderRole,
  insiderPhotoUrl,
  party,
  chamber,
  tickers,
  appHref,
}: {
  insiderName: string;
  insiderRole?: string;
  insiderPhotoUrl?: string;
  party?: string;
  chamber?: string;
  /** Unique tickers the member bought this day — rendered as a logo stack. */
  tickers: string[];
  appHref: string;
}) {
  const MAX_LOGOS = 5;
  const shown = tickers.slice(0, MAX_LOGOS);
  const extra = tickers.length - shown.length;
  const countLabel = `${tickers.length} ${tickers.length === 1 ? "buy" : "buys"}${
    insiderRole ? ` · ${capitalisedRole(insiderRole)}` : ""
  }`;

  return (
    <a
      className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-brown/40 dark:focus-visible:ring-brand-tan/40"
      data-ga-event="cta_gated_row_app"
      data-ga-label={insiderName}
      href={appHref}
      rel="noopener noreferrer"
      target="_blank"
    >
      <InsiderAvatar name={insiderName} photoUrl={insiderPhotoUrl} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center">
          <span className="truncate text-[14px] font-semibold leading-tight">
            {insiderName}
          </span>
          <PartyChip className="ml-2" party={party} />
          <ChamberChip chamber={chamber} className="ml-1.5" />
        </div>
        <div className="mt-0.5 text-[11px] text-muted">{countLabel}</div>
      </div>
      {/* Who they bought — overlapping logo stack, newest first. */}
      <div className="flex shrink-0 items-center -space-x-1.5">
        {shown.map((t) => (
          <span
            key={t}
            className="rounded-full ring-2 ring-white dark:ring-surface-secondary"
          >
            <CompanyLogo size={26} ticker={t} />
          </span>
        ))}
        {extra > 0 && (
          <span className="z-10 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-black/[0.06] text-[10px] font-semibold text-muted ring-2 ring-white dark:bg-white/10 dark:ring-surface-secondary">
            +{extra}
          </span>
        )}
      </div>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted/60" />
    </a>
  );
}

/** Person-grouped master row: one INSIDER who traded this day, their portrait
 *  anchored at the top, expanding to the company rows they bought — each
 *  visually tied back to the member by a connector line. The person-view
 *  analogue of MarketClusterRow. Children are ordinary MarketRows that still
 *  open their own drawer. */
export function MemberClusterRow({
  insiderName,
  insiderRole,
  insiderPhotoUrl,
  party,
  chamber,
  count,
  signalCount = 0,
  totalValueLabel,
  aggReturnPct = null,
  aggShowAlpha = false,
  children,
}: {
  insiderName: string;
  insiderRole?: string;
  insiderPhotoUrl?: string;
  /** Political party ("D" | "R" | "I"), shown as a chip beside the name. */
  party?: string;
  /** Chamber ("house" | "senate"), shown as a chip beside the party chip. */
  chamber?: string;
  count: number;
  /** How many of the member's buys cleared the signal floor (promising|maybe) —
   *  shown as a chip so the collapsed row still tells you there's something. */
  signalCount?: number;
  totalValueLabel: string;
  /** Value-weighted cumulative return across the member's trades — the
   *  "whole basket" number shown on the collapsed master row. Null when no
   *  legs have prices yet. */
  aggReturnPct?: number | null;
  /** True when aggReturnPct is alpha vs the benchmark (pp) rather than a raw
   *  stock return — drives the badge suffix. */
  aggShowAlpha?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false); // collapsed → one tidy row per member; expand for the buys + connector
  const countLabel = `${count} ${count === 1 ? "buy" : "buys"}${insiderRole ? ` · ${capitalisedRole(insiderRole)}` : ""}`;
  // Same chip() family as PartyChip / BuyStyleChip.
  // Lives in the Action column (desktop) / right stack (mobile), not by the name.
  // Discretion mode hides the rating-derived signal everywhere in the list (the
  // child rows swap their rating for a "View analysis" nudge — see MarketRow);
  // the member master row must hide its signal count too, or the collapsed
  // cluster leaks the very signal we're gating behind the app.
  const SignalChip = ({ className = "" }: { className?: string }) =>
    !DISCRETION_ENABLED && signalCount > 0 ? (
      <span className={`${chip()} bg-positive/10 text-positive ${className}`}>
        {signalCount} signal
      </span>
    ) : null;

  return (
    <div className="divide-y divide-black/[0.06] dark:divide-separator">
      <button
        aria-expanded={open}
        className="w-full text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-brown/40 dark:focus-visible:ring-brand-tan/40"
        data-ga-event="toggle_cluster"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        {/* ── Mobile (<md) ── */}
        <div className="md:hidden px-3 py-2.5 flex items-center gap-2.5">
          <ChevronDownIcon
            className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
          <InsiderAvatar
            name={insiderName}
            photoUrl={insiderPhotoUrl}
            size={32}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center min-w-0">
              <span className="text-[13px] font-semibold truncate">
                {insiderName}
              </span>
              <PartyChip className="ml-2" party={party} />
              <ChamberChip chamber={chamber} className="ml-1.5" />
            </div>
            <div className="text-[11px] text-muted mt-0.5">{countLabel}</div>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-0.5">
            <span className="text-sm font-semibold tabular-nums">
              {totalValueLabel}
            </span>
            {aggReturnPct != null && (
              <DeltaBadge
                suffix={aggShowAlpha ? "pp" : undefined}
                value={aggReturnPct}
              />
            )}
            <SignalChip />
          </div>
        </div>

        {/* ── Desktop (md+) — geometry matches MarketRow's columns ──
            Ticker column stays empty for the master so it reads as a pure
            ticker column for the child rows; the member photo sits beside the
            name instead. */}
        <div className="hidden md:flex items-stretch">
          <div className="w-20 shrink-0 px-2 py-2.5 border-r border-black/[0.06] dark:border-white/[0.06]" />
          <div className="flex-1 min-w-0 px-3 py-2.5 flex items-center gap-2.5 border-r border-black/[0.06] dark:border-white/[0.06]">
            <ChevronDownIcon
              className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
            <InsiderAvatar
              name={insiderName}
              photoUrl={insiderPhotoUrl}
              size={30}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center min-w-0">
                <span className="text-[13px] font-semibold truncate leading-tight">
                  {insiderName}
                </span>
                <PartyChip className="ml-2" party={party} />
                <ChamberChip chamber={chamber} className="ml-1.5" />
              </div>
              <div className="text-[11px] text-muted mt-0.5">{countLabel}</div>
            </div>
          </div>
          <div className="w-24 shrink-0 px-3 py-2.5 flex items-center justify-end border-r border-black/[0.06] dark:border-white/[0.06]">
            <span className="text-sm font-semibold tabular-nums">
              {totalValueLabel}
            </span>
          </div>
          <div className="w-24 shrink-0 px-2 py-2.5 flex items-center justify-center border-r border-black/[0.06] dark:border-white/[0.06]">
            <span className="text-[11px] font-semibold tabular-nums text-muted/70">
              {count}
            </span>
          </div>
          <div className="w-24 shrink-0 px-2 py-2.5 flex items-center justify-center border-r border-black/[0.06] dark:border-white/[0.06]">
            {aggReturnPct != null ? (
              <DeltaBadge
                suffix={aggShowAlpha ? "pp" : undefined}
                value={aggReturnPct}
              />
            ) : (
              <span className="text-[11px] text-muted/50">—</span>
            )}
          </div>
          <div className="w-24 shrink-0 px-2 py-2.5 border-r border-black/[0.06] dark:border-white/[0.06]" />
          <div className="w-40 shrink-0 px-2 py-2.5 flex items-center justify-center">
            <SignalChip />
          </div>
        </div>
      </button>

      {open && (
        // The member's buys, flush so the ticker column stays aligned/pure.
        // No connector rule — the grouping under the member already conveys
        // they're all the same person.
        <div className="bg-black/[0.015] dark:bg-white/[0.035] divide-y divide-black/[0.06] dark:divide-separator">
          {children}
        </div>
      )}
    </div>
  );
}

/** A single dealing row, shared across all markets. The shell hands in the
 *  computed prices + benchmark closes; this component only does the math
 *  for the return + alpha badges and renders the chrome. Market-specific
 *  chips are slotted via RowActionCell. */
export function MarketRow<W>({
  dealing,
  selected,
  onSelect,
  stockCurrentMajor,
  stockEntry,
  benchmarkEntry,
  benchmarkCurrent,
  stockBars,
  benchmarkBars,
  fmt,
  RowActionCell,
  RowNameBadge,
  hideDate,
  hiddenColumns = NO_HIDDEN,
  isMuted,
  formatTickerDisplay,
  locale,
  showLogo = true,
  showLegCount = true,
  chartMode,
  noPosteriorData = false,
  indent = false,
  hideInsider = false,
}: MarketRowProps<W>) {
  const showAlpha = chartMode.axis === "market";
  // Discretion mode hides the rating from the list (see ViewAnalysisCta). The
  // default muting is rating-derived (dim = unrated/skipped), so leaving it on
  // would leak the very signal we're hiding — keep every row at full weight so
  // the list "shows all trades clearly" and the signal lives only in the app.
  const muted = DISCRETION_ENABLED
    ? false
    : isMuted
      ? isMuted(dealing)
      : !dealing.rating || !dealing.isPurchase;
  const tradeDay = dealing.tradeDate.slice(0, 10);
  const disclosedDay = dealing.disclosedDate.slice(0, 10);
  const tradeDiffers = tradeDay !== disclosedDay;

  const { stockPct, alpha } = computeRowMetric({
    stockEntry: stockEntry ?? dealing.entryPrice ?? undefined,
    stockCurrentMajor,
    benchmarkEntry,
    benchmarkCurrent,
  });

  // Prefer the server-precomputed snapshot for the active chart mode — it's in
  // the dealings payload, so the badge renders on first paint with no price
  // fetch. Fall back to the client computation (off lazily-fetched prices) only
  // when the snapshot is absent (e.g. an uncached ticker). `metricPct` is a raw
  // return when axis=raw, alpha (pp) when axis=market.
  const livePct = livePerfValue(dealing.livePerformance, chartMode);
  // noPosteriorData (entry bar == latest close, e.g. a Friday disclosure seen
  // on the weekend) still wins: the return is a trivial ~0% there, so keep the
  // honest "No data yet" rather than a misleading +0.0%.
  const metricPct = noPosteriorData
    ? null
    : (livePct ?? (showAlpha ? alpha : stockPct));

  const rawTicker = dealing.ticker || "—";
  const ticker = formatTickerDisplay
    ? formatTickerDisplay(rawTicker)
    : rawTicker;
  const company = dealing.company || "—";
  const insiderLine = dealing.insiderRole
    ? `${capitalisedRole(dealing.insiderRole)} · ${dealing.insiderName}`
    : dealing.insiderName;
  const valueLabel =
    dealing.value != null ? fmt.formatValue(dealing.value) : "—";
  const compactValueLabel =
    dealing.value != null ? formatCompactValue(dealing.value, fmt) : "—";
  // Counts are a synthetic install nudge ("N people are discussing this in
  // the app"), so they must not appear on a market that hides the comments
  // column — there is no app for Korea to install, and the chip would be
  // pointing at a conversation that cannot exist.
  const commentCount = hiddenColumns.has("comments")
    ? 0
    : commentCountFor(dealing);

  return (
    <button
      className={`w-full text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-brown/40 dark:focus-visible:ring-brand-tan/40
        ${muted ? "opacity-65" : ""}
        ${muted && !selected ? "bg-black/[0.025] dark:bg-white/[0.04]" : ""}
        ${selected ? "bg-brand-brown/[0.07] dark:bg-brand-brown/[0.20]" : "hover:bg-black/[0.03] dark:hover:bg-white/5"}`}
      data-ga-event="open_deal"
      data-ga-label={rawTicker}
      onClick={onSelect}
    >
      {/* ── Mobile (<md) ──
          One dense line: logo · company · comment count · what they paid.
          The story a phone scroller needs is just "directors bought these
          on this day, this big" — the day header above the card carries the
          date, and the drawer carries insider, ticker, performance and the
          rest. (Performance is deliberately absent: recent deals are always
          a noisy ~0%, so leading with it undersold every fresh day.) */}
      <div className="md:hidden px-3.5 py-2.5 flex items-center gap-2.5">
        {indent && <div aria-hidden className="w-4 shrink-0" />}
        {showLogo && <CompanyLogo size={28} ticker={rawTicker} />}
        <span className="flex-1 min-w-0 truncate text-[15px] font-semibold leading-tight">
          {company}
        </span>
        <CommentCountChip count={commentCount} />
        <span className="shrink-0 text-right leading-tight">
          <span className="block text-[15px] font-semibold tabular-nums">
            {compactValueLabel}
          </span>
          {dealing.valueSecondary && (
            <span className="block text-[10px] tabular-nums text-muted/75">
              {dealing.valueSecondary}
            </span>
          )}
        </span>
      </div>

      {/* ── Desktop (md+) ── */}
      <div className="hidden md:flex items-stretch">
        {!hideDate && (
          <div className="w-28 shrink-0 px-3 py-2.5 flex flex-col justify-center border-r border-black/[0.06] dark:border-white/[0.06]">
            <div className="text-xs text-foreground/90 font-medium leading-tight">
              {shortDate(dealing.disclosedDate, locale)}
            </div>
            {tradeDiffers && (
              <div className="text-[10px] text-muted/75 mt-0.5">
                trade {shortDate(dealing.tradeDate, locale)}
              </div>
            )}
          </div>
        )}
        <div className="w-20 shrink-0 px-2 py-2.5 flex items-center justify-center border-r border-black/[0.06] dark:border-white/[0.06]">
          <span className="font-mono text-[11px] font-semibold px-1.5 py-0 rounded bg-hairline dark:bg-surface-secondary">
            {ticker}
          </span>
        </div>
        <div className="flex-1 min-w-0 px-3 py-2.5 flex items-center gap-2.5 border-r border-black/[0.06] dark:border-white/[0.06]">
          {indent && <div aria-hidden className="w-4 shrink-0" />}
          {showLogo && <CompanyLogo size={28} ticker={rawTicker} />}
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate leading-tight">
              {company}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              {RowNameBadge && <RowNameBadge dealing={dealing} />}
              {!hideInsider && (
                <span className="text-[11px] text-muted truncate">
                  {insiderLine}
                </span>
              )}
            </div>
          </div>
          {/* Signal chips pinned to the right of the cell, vertically centred —
              momentum / contrarian read as a column down the table. The cluster
              chip used to sit here too; it now shows only in the detail drawer. */}
          <div className="shrink-0 flex items-center gap-1.5">
            <BuyStyleChip buyStyle={dealing.buyStyle} />
          </div>
        </div>
        <div
          className={`${fmt.valueColumnClass ?? "w-24"} shrink-0 px-3 py-2.5 flex flex-col items-end justify-center border-r border-black/[0.06] dark:border-white/[0.06]`}
        >
          <div className="text-sm font-semibold tabular-nums">{valueLabel}</div>
          {dealing.valueSecondary && (
            <div className="text-[10px] tabular-nums text-muted/75 leading-tight">
              {dealing.valueSecondary}
            </div>
          )}
        </div>
        {!hiddenColumns.has("trend") && (
          <div className="w-24 shrink-0 px-2 py-2.5 flex items-center justify-center gap-1.5 border-r border-black/[0.06] dark:border-white/[0.06]">
            {showLegCount && dealing.legCount > 1 && (
              <span className="text-[11px] font-semibold tabular-nums text-muted/70">
                {dealing.legCount}
              </span>
            )}
            <MarketRowSpark
              bars={stockBars}
              benchmarkBars={benchmarkBars}
              chartMode={chartMode}
              disclosedDate={dealing.disclosedDate}
              tradeDate={dealing.tradeDate}
              width={52}
            />
          </div>
        )}
        {!hiddenColumns.has("performance") && (
          <div className="w-24 shrink-0 px-2 py-2.5 flex items-center justify-center border-r border-black/[0.06] dark:border-white/[0.06]">
            {metricPct != null ? (
              <span className="animate-content-in">
                <DeltaBadge
                  suffix={showAlpha ? "pp" : undefined}
                  value={metricPct}
                />
              </span>
            ) : noPosteriorData ? (
              <span className="text-[11px] text-muted/60">No data yet</span>
            ) : (
              <span className="text-[11px] text-muted/50">—</span>
            )}
          </div>
        )}
        {!hiddenColumns.has("comments") && (
          <div className="w-24 shrink-0 px-2 py-2.5 flex items-center justify-center border-r border-black/[0.06] dark:border-white/[0.06]">
            {commentCount > 0 ? (
              <CommentCountChip count={commentCount} />
            ) : (
              <span className="text-[11px] text-muted/50">—</span>
            )}
          </div>
        )}
        {!hiddenColumns.has("action") && (
          <div className="w-40 shrink-0 px-2 py-2.5 flex flex-col items-center justify-center gap-1">
            {DISCRETION_ENABLED ? (
              <ViewAnalysisCta />
            ) : (
              <RowActionCell dealing={dealing} />
            )}
          </div>
        )}
      </div>
    </button>
  );
}
