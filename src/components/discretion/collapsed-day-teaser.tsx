import type { PriceFormat } from "@/components/position-card";
import type { MarketDealing } from "@/lib/markets/types";

import { useState } from "react";

import { useAppHandoff } from "@/components/app-handoff-modal";
import { CompanyLogo } from "@/components/company-logo";
import { DayUnlockSheet } from "@/components/discretion/day-unlock-sheet";
import { useMediaQuery } from "@/lib/use-media-query";

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
  marketId = "uk",
  fmt,
  isSignal,
  returnPctOf,
  showLogo = true,
  variant = 0,
  locale = "en-GB",
}: {
  deals: MarketDealing<W>[];
  appHref: string;
  /** Market whose app the teaser sells — drives the desktop handoff modal. */
  marketId?: string;
  fmt: PriceFormat;
  isSignal: (d: MarketDealing<W>) => boolean;
  returnPctOf: (d: MarketDealing<W>) => number | null;
  showLogo?: boolean;
  variant?: number;
  /** Formats the day-unlock sheet's date line. */
  locale?: string;
}) {
  const teaser = pickDayTeaser(deals, { isSignal, returnPctOf });
  // Mobile taps open an explainer sheet (what this day holds, why it's
  // app-only) instead of bouncing cold to the App Store; md+ keeps the
  // direct link, where hover already previews the destination.
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const handoff = useAppHandoff(
    marketId,
    appHref,
    `Collapsed day · ${marketId}`,
  );
  const [sheetOpen, setSheetOpen] = useState(false);

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
  // Stable per-day phrasing pick: a stack of identical "N buys cleared our
  // checks this day" cards reads as a template, so each headline kind keeps a
  // few equivalent phrasings and the day's first deal key chooses one. The
  // hash is deterministic, so a day keeps its wording across renders/visits.
  const seedKey = deals[0]?.key ?? "";
  let seed = deals.length;

  for (let i = 0; i < seedKey.length; i++) seed += seedKey.charCodeAt(i);

  const pctLabel =
    teaser.kind === "performance" ? `+${teaser.pct.toFixed(1)}%` : "";
  const emphasis = "font-semibold text-foreground";
  const pct = <span className="font-semibold text-positive">{pctLabel}</span>;
  const variants: React.ReactNode[] =
    teaser.kind === "performance"
      ? teaser.buyCount === 1
        ? [
            <>This buy is now up {pct} since disclosure</>,
            <>This buy has climbed {pct} since disclosure</>,
            <>Up {pct} since the director bought in</>,
          ]
        : [
            <>One of these buys is now up {pct} since disclosure</>,
            <>The best of these buys is up {pct} since disclosure</>,
            <>A buy from this day is up {pct} and counting</>,
          ]
      : teaser.kind === "value"
        ? [
            <>
              <span className={emphasis}>{formatTotal(teaser.total)}</span>{" "}
              bought across{" "}
              {teaser.companyCount === 1
                ? "one company"
                : `${teaser.companyCount} companies`}
            </>,
            <>
              Directors put{" "}
              <span className={emphasis}>{formatTotal(teaser.total)}</span> into{" "}
              {teaser.companyCount === 1
                ? "one company"
                : `${teaser.companyCount} companies`}
            </>,
            <>
              <span className={emphasis}>{formatTotal(teaser.total)}</span> of
              buying in a single day
            </>,
          ]
        : teaser.kind === "signal"
          ? [
              <>
                <span className={emphasis}>
                  {teaser.count === 1 ? "1 buy" : `${teaser.count} buys`}
                </span>{" "}
                cleared our checks this day
              </>,
              <>
                <span className={emphasis}>
                  {teaser.count === 1 ? "1 buy" : `${teaser.count} buys`}
                </span>{" "}
                made the cut this day
              </>,
              <>
                <span className={emphasis}>
                  {teaser.count === 1 ? "A buy" : `${teaser.count} buys`}
                </span>{" "}
                here passed our checks
              </>,
            ]
          : [
              <>
                <span className={emphasis}>
                  {teaser.count === 1 ? "1 filing" : `${teaser.count} filings`}
                </span>{" "}
                recorded this day
              </>,
              <>
                <span className={emphasis}>
                  {teaser.count === 1 ? "1 filing" : `${teaser.count} filings`}
                </span>{" "}
                hit the register this day
              </>,
              <>
                <span className={emphasis}>
                  {teaser.count === 1 ? "1 filing" : `${teaser.count} filings`}
                </span>{" "}
                landed this day
              </>,
            ];
  const headline = variants[seed % variants.length];

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
    <span className="block min-w-0 flex-1 text-[17px] leading-snug text-foreground/90">
      {headline}
    </span>
  );

  // Hover/focus affordance: a pill that fades and slides in beside the avatar
  // stack. It sits in normal flow (opacity-only reveal) so nothing reflows on
  // hover, and the headline stays vertically centred — the old reveal was a
  // hidden second text line that reserved its own height and pushed the
  // headline off-centre.
  const cta = (
    <span
      aria-hidden
      className="hidden shrink-0 items-center gap-1 rounded-full border border-brand-brown/25 px-3 py-1 text-[11px] font-medium text-brand-brown opacity-0 transition-[transform,opacity] duration-200 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 sm:inline-flex dark:border-brand-tan/25 dark:text-brand-tan"
    >
      Full day in the app <span aria-hidden>→</span>
    </span>
  );

  const ariaLabel = `${deals.length} ${deals.length === 1 ? "filing" : "filings"} recorded on this day — view in the app`;
  const rowClass =
    "group flex w-full items-center gap-4 px-4 py-5 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]";

  if (isDesktop) {
    // Desktop clicks get the handoff modal (pitch + QR + store choice)
    // rather than bouncing cold to a store page a desktop can't install
    // from; the href stays real for open-in-new-tab and crawlers.
    return (
      <>
        <a
          aria-label={ariaLabel}
          className={rowClass}
          data-ga-event="cta_collapsed_day_view_in_app"
          data-ga-label={`${teaser.kind} · ${deals.length} deals`}
          href={handoff.href}
          rel="noreferrer"
          target="_blank"
          onClick={handoff.onClick}
        >
          {text}
          {cta}
          {stack}
        </a>
        {handoff.modal}
      </>
    );
  }

  const isoDay = deals[0]?.disclosedDate?.slice(0, 10);
  const dateLabel = isoDay
    ? new Date(`${isoDay}T00:00:00Z`).toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      })
    : "This day";

  return (
    <>
      <button
        aria-label={ariaLabel}
        className={rowClass}
        data-ga-event="cta_collapsed_day_open_sheet"
        data-ga-label={`${teaser.kind} · ${deals.length} deals`}
        type="button"
        onClick={() => setSheetOpen(true)}
      >
        {text}
        {stack}
      </button>
      <DayUnlockSheet
        appHref={appHref}
        dateLabel={dateLabel}
        dealCount={deals.length}
        open={sheetOpen}
        tickers={uniqueTickers}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
