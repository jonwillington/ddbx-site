// Shared helpers used by the multi-market shell. Anything that's pure
// computation and doesn't render JSX lives here so adapters and shell
// components can both reach it.

import type {
  ChartMode,
  MarketDealing,
  MarketExtraFilter,
} from "@/lib/markets/types";
import type { LivePerformance } from "@/types/ddbx";

export interface DayBucket<W> {
  weekday: string; // "MON"
  day: string; // "4th"
  key: string; // ISO disclosed date
  dealings: MarketDealing<W>[];
  /** Split of `dealings` per the market's isSkipped predicate. When the
   *  market doesn't supply one, `suggested === dealings` and `skipped`
   *  is empty. */
  suggested: MarketDealing<W>[];
  skipped: MarketDealing<W>[];
}

export interface MonthBucket<W> {
  label: string; // "May"
  year: number;
  key: string; // "May-2026"
  days: DayBucket<W>[];
  count: number;
  suggestedCount: number;
  skippedCount: number;
}

/** Group dealings into month → day buckets keyed on disclosed_date. Excludes
 *  rows whose disclosed_date equals todayIso — those belong to the dedicated
 *  Today section above the month list. When `isSkipped` is provided, each
 *  day's dealings are split into suggested + skipped so the shell can render
 *  the skipped rows under a collapsible cluster. */
export function bucketByMonth<W>(
  dealings: MarketDealing<W>[],
  todayIso: string,
  options?: {
    locale?: string;
    isSkipped?: (d: MarketDealing<W>) => boolean;
    /** Current price (in the entry-price unit) for a dealing, when known.
     *  When provided, each day's skipped cluster gets a secondary sort by
     *  mark-to-market return (biggest gainers first); unpriced rows and
     *  non-market buys keep their importance order at the tail. */
    currentPriceOf?: (d: MarketDealing<W>) => number | undefined;
  },
): MonthBucket<W>[] {
  const locale = options?.locale ?? "en-US";
  const isSkipped = options?.isSkipped;
  const currentPriceOf = options?.currentPriceOf;
  const months: MonthBucket<W>[] = [];

  for (const d of dealings) {
    const iso = d.disclosedDate.slice(0, 10);

    if (iso === todayIso) continue;
    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) continue;
    const monthLabel = date.toLocaleString(locale, { month: "long" });
    const year = date.getFullYear();
    const monthKey = `${monthLabel}-${year}`;
    let bucket = months.find((m) => m.key === monthKey);

    if (!bucket) {
      bucket = {
        label: monthLabel,
        year,
        key: monthKey,
        days: [],
        count: 0,
        suggestedCount: 0,
        skippedCount: 0,
      };
      months.push(bucket);
    }
    let day = bucket.days.find((db) => db.key === iso);

    if (!day) {
      const weekday = date
        .toLocaleString(locale, { weekday: "short" })
        .toUpperCase();

      day = {
        weekday,
        day: ordinal(date.getDate()),
        key: iso,
        dealings: [],
        suggested: [],
        skipped: [],
      };
      bucket.days.push(day);
    }
    day.dealings.push(d);
    const skipped = isSkipped ? isSkipped(d) : false;

    if (skipped) {
      day.skipped.push(d);
      bucket.skippedCount++;
    } else {
      day.suggested.push(d);
      bucket.suggestedCount++;
    }
    bucket.count++;
  }

  // Rank each day's rows by importance — most significant first — so the
  // chronological table leads with what matters rather than raw API order.
  // Skipped rows stay a separate cluster (the shell renders them after
  // suggested) but are ranked among themselves too.
  for (const month of months) {
    for (const day of month.days) {
      day.suggested.sort(compareDealingImportance);
      day.skipped.sort(compareDealingImportance);
      // Secondary sort for the skipped cluster: when we can price the rows,
      // lead with the biggest gainers. Stable over the importance sort above,
      // so unpriced rows (and awards/schemes, whose return is N/A) keep their
      // importance order at the tail.
      if (currentPriceOf) day.skipped.sort(compareByReturnDesc(currentPriceOf));
    }
  }

  return months;
}

/** Comparator factory: order by mark-to-market return, biggest gainers first.
 *  Yields 0 for rows we can't price (or non-market buys — awards / schemes,
 *  whose return is N/A) so a stable sort leaves them in their prior order. */
export function compareByReturnDesc<W>(
  currentPriceOf: (d: MarketDealing<W>) => number | undefined,
): (a: MarketDealing<W>, b: MarketDealing<W>) => number {
  const returnOf = (d: MarketDealing<W>): number | null => {
    if (d.actionTone === "grant") return null;
    // Prefer the server snapshot's trade-anchor return so the order settles
    // without waiting on the price fetch. It's a percentage; normalise to a
    // fraction so it sorts consistently against the client-computed branch.
    const live = d.livePerformance?.return_pct_trade;

    if (live != null) return live / 100;
    const current = currentPriceOf(d);
    const entry = d.entryPrice;

    if (current == null || entry == null || entry <= 0) return null;

    return (current - entry) / entry;
  };

  return (a, b) => {
    const ra = returnOf(a);
    const rb = returnOf(b);

    if (ra == null && rb == null) return 0;
    if (ra == null) return 1;
    if (rb == null) return -1;

    return rb - ra;
  };
}

/** Order dealings by analyst importance — significant → noteworthy → minor →
 *  routine → unrated — then by deal value within a tier. Shared by the Today
 *  hero (card order) and the chronological day buckets so "most important
 *  first" means the same thing on every surface. */
export function compareDealingImportance<W>(
  a: MarketDealing<W>,
  b: MarketDealing<W>,
): number {
  const rank = (d: MarketDealing<W>) => {
    switch (d.rating) {
      case "significant":
        return 0;
      case "noteworthy":
        return 1;
      case "minor":
        return 2;
      case "routine":
        return 3;
      default:
        return 4;
    }
  };
  const diff = rank(a) - rank(b);

  if (diff !== 0) return diff;

  return (b.value ?? 0) - (a.value ?? 0);
}

/** One company's worth of same-day dealings, folded for display. `count===1`
 *  groups pass through as ordinary single rows; `count>1` render as a
 *  collapsed, expandable cluster. */
export interface CompanyGroup<W> {
  /** Ticker, or the lone dealing's key when the row carries no ticker (so
   *  unticketed rows never collapse into each other). */
  key: string;
  ticker: string;
  company: string;
  /** Member dealings in their original (importance-sorted) order. */
  dealings: MarketDealing<W>[];
  /** First member — highest-importance after the day's sort. Drives the
   *  cluster's logo / company / ticker display. */
  representative: MarketDealing<W>;
  count: number;
  /** Sum of member values; null when every member was unpriced. */
  totalValue: number | null;
}

/** Collapse same-company dealings (already importance-sorted within the day)
 *  into one group per ticker, preserving first-occurrence order so the most
 *  significant buy fixes each group's position. Mirrors the iOS dashboard's
 *  ticker clustering (DashboardView.groupByTicker): multiple insiders or
 *  disclosures on the same company on the same day fold into one expandable
 *  row instead of N near-identical rows. Singletons come back as `count===1`.
 *  Rows without a ticker key on their own dealing key, so they stay distinct. */
export function groupByCompany<W>(
  dealings: MarketDealing<W>[],
): CompanyGroup<W>[] {
  const order: string[] = [];
  const byKey = new Map<string, CompanyGroup<W>>();

  for (const d of dealings) {
    const key = d.ticker || d.key;
    let group = byKey.get(key);

    if (!group) {
      group = {
        key,
        ticker: d.ticker,
        company: d.company,
        dealings: [],
        representative: d,
        count: 0,
        totalValue: null,
      };
      byKey.set(key, group);
      order.push(key);
    }
    group.dealings.push(d);
    group.count++;
    if (d.value != null) group.totalValue = (group.totalValue ?? 0) + d.value;
  }

  return order.map((k) => byKey.get(k)!);
}

/** Filters that apply to EVERY market — they read only shared MarketDealing
 *  fields (sector, cluster, value), so the shell injects them for all markets
 *  ahead of each market's own config.extraFilters. Each is included only when
 *  the loaded data actually supports it (sectors present, some clustered rows,
 *  non-zero values), so a market that doesn't carry a field simply doesn't show
 *  that filter. `formatMoney` renders the size buckets in the market's currency. */
export function buildUniversalFilters<W>(
  dealings: MarketDealing<W>[],
  formatMoney: (n: number) => string,
): MarketExtraFilter<W>[] {
  const filters: MarketExtraFilter<W>[] = [];

  const sectors = [
    ...new Set(dealings.map((d) => d.sector).filter((s): s is string => !!s)),
  ].sort();

  if (sectors.length >= 2) {
    filters.push({
      id: "industry",
      label: "Industry",
      question: "Which industries?",
      description:
        "Filter to one or more sectors — pick several to compare. None selected shows every industry.",
      kind: "multiselect",
      options: sectors.map((s) => ({ id: s, label: s })),
      defaultValue: "",
      predicate: (value, d) =>
        !!d.sector && value.split(",").includes(d.sector),
    });
  }

  if (dealings.some((d) => d.cluster)) {
    filters.push({
      id: "clustered",
      label: "Clusters",
      question: "Clustered buys only?",
      description:
        "Show only names that 2+ insiders bought in a tight window — a shared read rather than a lone trade.",
      options: [
        { id: "all", label: "All trades" },
        { id: "only", label: "Clustered only" },
      ],
      defaultValue: "all",
      predicate: (_v, d) => !!d.cluster,
    });
  }

  if (dealings.some((d) => (d.value ?? 0) > 0)) {
    filters.push({
      id: "size",
      label: "Trade size",
      question: "How big a trade?",
      description:
        "Filter by the disclosed amount — useful for surfacing the big, high-conviction positions.",
      options: [
        { id: "all", label: "Any size" },
        { id: "50000", label: `≥ ${formatMoney(50_000)}` },
        { id: "250000", label: `≥ ${formatMoney(250_000)}` },
        { id: "1000000", label: `≥ ${formatMoney(1_000_000)}` },
      ],
      defaultValue: "all",
      predicate: (value, d) => (d.value ?? 0) >= Number(value),
    });
  }

  return filters;
}

export interface PersonGroup<W> {
  /** Insider name (the grouping key). */
  key: string;
  insiderName: string;
  insiderRole?: string;
  insiderPhotoUrl?: string;
  /** Political party ("D" | "R" | "I"), when the market carries one. */
  party?: string;
  /** Chamber ("house" | "senate"), for Congress. */
  chamber?: string;
  /** This member's dealings, in importance order. */
  dealings: MarketDealing<W>[];
  /** First (most significant) dealing — fixes the group's position + avatar. */
  representative: MarketDealing<W>;
  count: number;
  /** Sum of this member's values; null when every leg was unpriced. */
  totalValue: number | null;
}

/** Collapse a day's dealings by INSIDER — each member who traded that day folds
 *  into one group, preserving first-occurrence order so their most significant
 *  buy fixes their position. For Congress, where the member is the entity of
 *  interest (one member often buys many tickers the same day). Singletons come
 *  back as `count===1`. */
export function groupByPerson<W>(
  dealings: MarketDealing<W>[],
): PersonGroup<W>[] {
  const order: string[] = [];
  const byKey = new Map<string, PersonGroup<W>>();

  for (const d of dealings) {
    const key = d.insiderName || d.key;
    let group = byKey.get(key);

    if (!group) {
      group = {
        key,
        insiderName: d.insiderName,
        insiderRole: d.insiderRole,
        insiderPhotoUrl: d.insiderPhotoUrl,
        party: d.party,
        chamber: d.chamber,
        dealings: [],
        representative: d,
        count: 0,
        totalValue: null,
      };
      byKey.set(key, group);
      order.push(key);
    }
    group.dealings.push(d);
    group.count++;
    if (d.value != null) group.totalValue = (group.totalValue ?? 0) + d.value;
  }

  return order.map((k) => byKey.get(k)!);
}

export function ordinal(n: number): string {
  const v = n % 100;

  if (v >= 11 && v <= 13) return `${n}th`;

  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"}`;
}

/** ISO `YYYY-MM-DD` for the market's day. `en-CA` gives ISO order without
 *  locale-specific punctuation. */
export function todayKeyIso(timeZone?: string, now = new Date()): string {
  if (timeZone) {
    return now.toLocaleDateString("en-CA", { timeZone });
  }

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function stockReturnPct(entry: number, currentMajor: number): number {
  return ((currentMajor - entry) / entry) * 100;
}

export function benchmarkReturnPct(
  entryClose: number,
  currentClose: number,
): number {
  return ((currentClose - entryClose) / entryClose) * 100;
}

/** Tone ramp used by the delta badge. Magnitude grows up to ~30% before
 *  saturating. Mirrors the UK dashboard styling so all markets get the same
 *  visual language.
 *
 *  Each colour is a light-dark() pair (globals.css sets color-scheme per
 *  mode): light mode darkens ink with magnitude, dark mode brightens it.
 *  Both ramps are anchored on the canonical --positive/--negative hues
 *  (145 green / 25 red) so chips and sparklines land on the same green as
 *  the channel rail and teasers instead of a private emerald. */
export function deltaStyle(delta: number): { bg: string; text: string } {
  const abs = Math.abs(delta);
  const t = Math.min(abs / 30, 1);
  const pos = delta >= 0;
  const hue = pos ? 145 : 25;

  // Light ink: 42→24L green, 45→29L red — deepens as the move grows.
  const lLight = pos ? Math.round(42 - t * 18) : Math.round(45 - t * 16);
  // Dark ink: starts at the token lightness (78/64L) and brightens a touch.
  const lDark = pos ? Math.round(72 + t * 8) : Math.round(62 + t * 8);
  const cLight = (0.1 + t * 0.14).toFixed(3);
  const cDark = (0.12 + t * 0.08).toFixed(3);
  const bgAlphaLight = (0.08 + t * 0.22).toFixed(2);
  // The bright dark-mode ink needs less wash behind it to register.
  const bgAlphaDark = (0.1 + t * 0.14).toFixed(2);

  const inkLight = `oklch(${lLight}% ${cLight} ${hue})`;
  const inkDark = `oklch(${lDark}% ${cDark} ${hue})`;

  return {
    bg: `light-dark(oklch(${lLight}% ${cLight} ${hue} / ${bgAlphaLight}), oklch(${lDark}% ${cDark} ${hue} / ${bgAlphaDark}))`,
    text: `light-dark(${inkLight}, ${inkDark})`,
  };
}

export function shortDate(iso: string, locale = "en-US"): string {
  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return iso;

  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

/** Cached per-row return numbers — derived purely from the inputs the shell
 *  has already computed for the live-price + benchmark fetches. The
 *  sparkline column and the right-most Performance cell both read from
 *  this so they can never disagree. */
export interface RowMetric {
  /** Stock's own return %, anchored at the dealing's entry price. */
  stockPct: number | null;
  /** Benchmark return % over the same window. */
  benchPct: number | null;
  /** stockPct − benchPct, in percentage points. */
  alpha: number | null;
}

export function computeRowMetric({
  stockEntry,
  stockCurrentMajor,
  benchmarkEntry,
  benchmarkCurrent,
}: {
  /** Stock baseline at the chart-mode anchor — trade-day execution price or
   *  disclosure-day close. Resolved by the shell so this helper stays pure. */
  stockEntry: number | undefined;
  stockCurrentMajor: number | undefined;
  benchmarkEntry: number | undefined;
  benchmarkCurrent: number | undefined;
}): RowMetric {
  const stockPct =
    stockEntry != null && stockCurrentMajor != null && stockEntry > 0
      ? stockReturnPct(stockEntry, stockCurrentMajor)
      : null;
  const benchPct =
    benchmarkEntry != null && benchmarkCurrent != null && benchmarkEntry > 0
      ? benchmarkReturnPct(benchmarkEntry, benchmarkCurrent)
      : null;
  const alpha =
    stockPct != null && benchPct != null ? stockPct - benchPct : null;

  return { stockPct, benchPct, alpha };
}

/** Pick the server-precomputed performance number that matches the active
 *  chart mode (raw return vs alpha-vs-benchmark × trade vs disclosure anchor).
 *  Returns null when there's no snapshot or that specific value is missing —
 *  the row then falls back to the client-side computeRowMetric off fetched
 *  prices. This is what lets the badge render with zero price round-trips. */
export function livePerfValue(
  lp: LivePerformance | null | undefined,
  chartMode: ChartMode,
): number | null {
  if (!lp) return null;
  const trade = chartMode.anchor === "trade";

  if (chartMode.axis === "market") {
    return trade ? lp.alpha_pct_trade : lp.alpha_pct_disclosed;
  }

  return trade ? lp.return_pct_trade : lp.return_pct_disclosed;
}

/** Latest "prices as of" ISO date across a set of dealings — the max as_of in
 *  their live-performance snapshots. Null when none carry one. Surfaced as a
 *  "Prices as of …" caption so the reader knows how fresh the badges are. */
export function latestPricesAsOf<W>(
  dealings: MarketDealing<W>[],
): string | null {
  let max: string | null = null;

  for (const d of dealings) {
    const asOf = d.livePerformance?.as_of;

    if (asOf && (max == null || asOf > max)) max = asOf;
  }

  return max;
}
