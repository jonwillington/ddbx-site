import type { PriceFormat } from "@/components/position-card";
import type { MarketDealing } from "@/lib/markets/types";

import { CompanyLogo } from "@/components/company-logo";

/** What a collapsed day leads with. Picked by `pickDayTeaser`'s priority
 *  ladder: a winning trade beats money moved beats signal count beats raw
 *  quantity — so the card always makes the strongest true claim available
 *  and never leads with a negative number. */
export type DayTeaser =
  | { kind: "performance"; pct: number; buyCount: number }
  | { kind: "value"; total: number; companyCount: number }
  | { kind: "signal"; count: number }
  | { kind: "quantity"; count: number };

/** Best-return headline only fires from here up — a "+1.2%" boast reads as
 *  noise, not signal. */
const MIN_PERFORMANCE_PCT = 8;
/** Aggregate-value headline threshold, in the market's domestic major unit. */
const MIN_VALUE_TOTAL = 250_000;

export function pickDayTeaser<W>(
  deals: MarketDealing<W>[],
  opts: {
    /** Same return the row badges show (server snapshot first) so the claim
     *  survives someone installing the app and checking. */
    returnPctOf: (d: MarketDealing<W>) => number | null;
    isSignal: (d: MarketDealing<W>) => boolean;
  },
): DayTeaser {
  // Performance and value claims are buys-only: "up 24%" on a row where the
  // insider sold, or "£2M traded" padded with disposals, would be a hollow
  // boast the drawer immediately undercuts.
  const buys = deals.filter((d) => d.isPurchase);
  let best: number | null = null;

  for (const d of buys) {
    const pct = opts.returnPctOf(d);

    if (pct != null && (best == null || pct > best)) best = pct;
  }
  if (best != null && best >= MIN_PERFORMANCE_PCT)
    return { kind: "performance", pct: best, buyCount: buys.length };

  const valued = buys.filter((d) => d.value != null && d.value > 0);
  const total = valued.reduce((sum, d) => sum + (d.value ?? 0), 0);

  if (total >= MIN_VALUE_TOTAL) {
    const companyCount = new Set(valued.map((d) => d.ticker || d.key)).size;

    return { kind: "value", total, companyCount };
  }

  const signalCount = deals.filter(opts.isSignal).length;

  if (signalCount > 0) return { kind: "signal", count: signalCount };

  return { kind: "quantity", count: deals.length };
}

const MAX_AVATARS = 5;

/** Discretion-mode rendering for a day older than the free history window.
 *  Replaces the old "one real row + '+N more deals' link" with a marketing
 *  card: one smart headline (see pickDayTeaser) plus a trailing avatar group
 *  of the day's company logos. The whole card links to the App Store. Text
 *  always leads so headlines and CTAs share one left edge down the scroll;
 *  the alternating `variant` only varies avatar size for rhythm. */
export function CollapsedDayTeaser<W>({
  deals,
  appHref,
  fmt,
  isSignal,
  returnPctOf,
  showLogo = true,
  variant = 0,
}: {
  deals: MarketDealing<W>[];
  appHref: string;
  fmt: PriceFormat;
  isSignal: (d: MarketDealing<W>) => boolean;
  returnPctOf: (d: MarketDealing<W>) => number | null;
  showLogo?: boolean;
  variant?: number;
}) {
  const teaser = pickDayTeaser(deals, { isSignal, returnPctOf });

  // Avatar group: unique companies, the most interesting first (signal buys,
  // then other buys, then the rest), capped with a "+N" chip.
  const score = (d: MarketDealing<W>) =>
    (d.isPurchase ? 2 : 0) + (isSignal(d) ? 1 : 0);
  const uniqueTickers: string[] = [];
  const seen = new Set<string>();

  for (const d of [...deals].sort((a, b) => score(b) - score(a))) {
    const key = d.ticker || d.key;

    if (seen.has(key)) continue;
    seen.add(key);
    if (d.ticker) uniqueTickers.push(d.ticker);
  }
  const shown = uniqueTickers.slice(0, MAX_AVATARS);
  const extra = seen.size - shown.length;

  const formatTotal = fmt.formatValueCompact ?? fmt.formatValue;
  const pctLabel =
    teaser.kind === "performance" ? `+${teaser.pct.toFixed(1)}%` : "";
  const emphasis = "font-semibold text-foreground";
  const headline =
    teaser.kind === "performance" ? (
      <>
        {teaser.buyCount === 1
          ? "This buy is now up "
          : "One of these buys is now up "}
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
          {pctLabel}
        </span>{" "}
        since disclosure
      </>
    ) : teaser.kind === "value" ? (
      <>
        <span className={emphasis}>{formatTotal(teaser.total)}</span> bought
        across{" "}
        {teaser.companyCount === 1
          ? "one company"
          : `${teaser.companyCount} companies`}
      </>
    ) : teaser.kind === "signal" ? (
      <>
        <span className={emphasis}>
          {teaser.count === 1 ? "1 buy" : `${teaser.count} buys`}
        </span>{" "}
        cleared our checks this day
      </>
    ) : (
      <>
        <span className={emphasis}>
          {teaser.count === 1 ? "1 filing" : `${teaser.count} filings`}
        </span>{" "}
        recorded this day
      </>
    );

  const avatarSize = variant === 0 ? 32 : 26;
  const stack = showLogo && shown.length > 0 && (
    <span className="flex shrink-0 -space-x-2.5">
      {shown.map((t) => (
        <CompanyLogo
          key={t}
          className="ring-2 ring-white dark:ring-surface-secondary"
          size={avatarSize}
          ticker={t}
        />
      ))}
      {extra > 0 && (
        <span
          className="inline-flex items-center justify-center rounded-full bg-[#f1ebe2] text-[10px] font-semibold text-[#7a634b] ring-2 ring-white dark:bg-white/[0.08] dark:text-[#c9b49f] dark:ring-surface-secondary"
          style={{ width: avatarSize, height: avatarSize }}
        >
          +{extra}
        </span>
      )}
    </span>
  );

  const text = (
    <span className="min-w-0 flex-1">
      <span className="block text-[13px] leading-snug text-foreground/85">
        {headline}
      </span>
      <span className="mt-0.5 block text-[11px] font-medium text-[#5a4128] transition-colors group-hover:underline dark:text-[#ad9479]">
        See the full day in the app <span aria-hidden>→</span>
      </span>
    </span>
  );

  return (
    <a
      aria-label={`${deals.length} ${deals.length === 1 ? "filing" : "filings"} recorded on this day — view in the app`}
      className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
      data-ga-event="cta_collapsed_day_view_in_app"
      data-ga-label={`${teaser.kind} · ${deals.length} deals`}
      href={appHref}
      rel="noreferrer"
      target="_blank"
    >
      {text}
      {stack}
    </a>
  );
}
