import type { ComponentType } from "react";
import type { MarketDealing } from "@/lib/markets/types";
import type { PriceFormat } from "@/components/position-card";
import type { MarketSession, MarketStatus } from "@/lib/market-status";
import type { HolidaySource } from "@/lib/bank-holidays";

import { useEffect, useState } from "react";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";

import { CompanyLogo } from "@/components/company-logo";
import { RatingBadge } from "@/components/rating-badge";
import { Skeleton } from "@/components/skeleton";
import { useExchangeHolidays } from "@/lib/bank-holidays";
import {
  formatCloseTime,
  formatCountdown,
  marketStatus,
} from "@/lib/market-status";

interface MarketTodayHeroProps<W> {
  todayDealings: MarketDealing<W>[];
  todayIso: string;
  locale?: string;
  loading: boolean;
  fmt: PriceFormat;
  showLogo: boolean;
  formatTickerDisplay?: (ticker: string) => string;
  isMuted?: (d: MarketDealing<W>) => boolean;
  selectedKey?: string | null;
  onSelect: (d: MarketDealing<W>) => void;
  TodayEmpty?: ComponentType;
  /** Trading session for the market — drives the live status card pinned
   *  at the end of the "Also today" grid. */
  session?: MarketSession;
  /** Exchange-holiday source so the status card can switch to "Closed for
   *  X" copy on bank holidays. */
  holidays?: HolidaySource;
}

/** Today surface — one section heading + a row of cards. Deliberately
 *  spartan: no outer container, no inset tray, no internal card dividers.
 *  Each card carries the data in a single flowing block. Mobile collapses
 *  to a snap carousel; desktop spreads to a two/three-up grid. Skipped
 *  rows are reachable in the table below, so they don't surface up here. */
export function MarketTodayHero<W>({
  todayDealings,
  todayIso,
  locale,
  loading,
  fmt,
  showLogo,
  formatTickerDisplay,
  isMuted,
  selectedKey,
  onSelect,
  TodayEmpty,
  session,
  holidays: holidaySource,
}: MarketTodayHeroProps<W>) {
  const { title: todayTitle, meta: todayMeta } = formatToday(todayIso, locale);
  const sortedDealings = [...todayDealings].sort(compareTodayDealings);
  const primaryDealings = sortedDealings.filter((d) =>
    isMuted ? !isMuted(d) : d.isPurchase,
  );
  const skippedDealings = sortedDealings.filter((d) =>
    isMuted ? isMuted(d) : !d.isPurchase,
  );
  // Only split when there's at least one of each — if everything's been
  // skipped we still want to show those as the main row of cards so the
  // section never empties out for no reason.
  const splitDay = primaryDealings.length > 0 && skippedDealings.length > 0;
  const mainDealings = splitDay
    ? primaryDealings
    : primaryDealings.length > 0
      ? primaryDealings
      : sortedDealings;
  // Cap how many skipped cards we surface — US Form 4 days can run to
  // dozens of skipped tranches and shouldn't be allowed to push the table
  // off the page. The remainder is still reachable in the chronological
  // table below, so this is purely a visual cap.
  const SKIPPED_VISIBLE_CAP = 9;
  const allSkipped = splitDay ? skippedDealings : [];
  const skippedRows = allSkipped.slice(0, SKIPPED_VISIBLE_CAP);
  const skippedOverflow = allSkipped.length - skippedRows.length;
  const countLabel =
    todayDealings.length === 0
      ? ""
      : todayDealings.length === 1
        ? "1 filing"
        : `${todayDealings.length} filings`;

  return (
    <section className="relative z-10">
      <header className="mb-4 flex items-end justify-between gap-4 md:mb-5">
        <div className="min-w-0">
          <h2
            className="animate-today-hero-item text-[30px] font-semibold leading-none tracking-[-0.035em] md:text-[34px]"
            style={{ animationDelay: todayHeroDelay(0) }}
          >
            {todayTitle}
          </h2>
          {todayMeta && (
            <div
              className="animate-today-hero-item mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted md:text-[11px]"
              style={{ animationDelay: todayHeroDelay(0, 25) }}
            >
              {todayMeta}
            </div>
          )}
        </div>
        {countLabel && (
          <div
            className="animate-today-hero-item shrink-0 text-xs text-muted tabular-nums"
            style={{ animationDelay: todayHeroDelay(0, 50) }}
          >
            {countLabel}
          </div>
        )}
      </header>

      {todayDealings.length > 0 ? (
        <>
          {/* Mobile: snap carousel so a busy day doesn't push the table
              1800px down the page — peek the next card at the right edge to
              signal swipe. lg+: spreads to a tidy two/three-up grid. */}
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mx-6 md:px-6 lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:overflow-visible lg:px-0 lg:pb-0 2xl:grid-cols-3">
            {mainDealings.map((d, index) => (
              <div
                key={d.key}
                className="w-[80%] shrink-0 snap-start lg:w-auto lg:shrink"
              >
                <TodayCard
                  animationDelay={todayHeroDelay(index + 1)}
                  dealing={d}
                  fmt={fmt}
                  formatTickerDisplay={formatTickerDisplay}
                  isMuted={isMuted}
                  selected={selectedKey === d.key}
                  showLogo={showLogo}
                  onSelect={() => onSelect(d)}
                />
              </div>
            ))}
          </div>

          <div
            className="animate-today-hero-item mt-5"
            style={{ animationDelay: todayHeroDelay(mainDealings.length + 1) }}
          >
            {allSkipped.length > 0 && (
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Also today · {allSkipped.length} skipped
                {skippedOverflow > 0 && ` · +${skippedOverflow} in table below`}
              </div>
            )}
            {/* Interconnected grid — one outer border, cells separated only
                by a 1px gap that lets the container's bg show through. The
                status cell at the end is always present so the user knows
                whether the market is still scanning or has shut. */}
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-black/[0.08] bg-black/[0.08] dark:border-white/[0.08] dark:bg-white/[0.08] md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {skippedRows.map((d) => (
                <SkippedCard
                  key={d.key}
                  dealing={d}
                  fmt={fmt}
                  formatTickerDisplay={formatTickerDisplay}
                  selected={selectedKey === d.key}
                  onSelect={() => onSelect(d)}
                />
              ))}
              {session && holidaySource && (
                <MarketStatusCard
                  alone={skippedRows.length === 0}
                  holidaySource={holidaySource}
                  session={session}
                />
              )}
            </div>
          </div>
        </>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-today-hero-item"
              style={{ animationDelay: todayHeroDelay(i + 1) }}
            >
              <TodayCardSkeleton />
            </div>
          ))}
        </div>
      ) : TodayEmpty ? (
        <TodayEmpty />
      ) : (
        <div className="rounded-xl border border-black/[0.08] bg-[#faf7f2] px-6 py-10 text-center text-sm text-muted dark:border-white/[0.08] dark:bg-surface">
          No filings disclosed today yet.
        </div>
      )}
    </section>
  );
}

function compareTodayDealings<W>(
  a: MarketDealing<W>,
  b: MarketDealing<W>,
): number {
  const ratingRank = (d: MarketDealing<W>) => {
    if (d.rating === "significant") return 0;
    if (d.rating === "noteworthy") return 1;
    if (d.rating === "routine") return 2;

    return 3;
  };
  const rankDiff = ratingRank(a) - ratingRank(b);

  if (rankDiff !== 0) return rankDiff;

  return (b.value ?? 0) - (a.value ?? 0);
}

function TodayCard<W>({
  dealing,
  selected,
  onSelect,
  fmt,
  showLogo,
  formatTickerDisplay,
  isMuted,
  animationDelay,
}: {
  dealing: MarketDealing<W>;
  selected: boolean;
  onSelect: () => void;
  fmt: PriceFormat;
  showLogo: boolean;
  formatTickerDisplay?: (ticker: string) => string;
  isMuted?: (d: MarketDealing<W>) => boolean;
  animationDelay: string;
}) {
  const tickerLabel = formatTickerDisplay
    ? formatTickerDisplay(dealing.ticker || "—")
    : dealing.ticker || "—";
  const muted = isMuted ? isMuted(dealing) : !dealing.isPurchase;
  const valueLabel =
    dealing.value != null ? fmt.formatValue(dealing.value) : "—";
  const insiderBits = [tickerLabel, dealing.insiderName, dealing.insiderRole]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      className={`group h-full w-full animate-today-hero-item rounded-xl border bg-[#faf7f2] p-5 text-left transition-colors duration-150 dark:bg-surface
        ${
          selected
            ? "border-[#6b5038]/40 bg-[#6b5038]/[0.04] dark:border-[#c4a882]/40 dark:bg-[#6b5038]/[0.18]"
            : "border-black/[0.08] hover:border-black/[0.18] dark:border-white/[0.08] dark:hover:border-white/[0.18]"
        }
        ${muted ? "opacity-75" : ""}`}
      style={{ animationDelay }}
      onClick={onSelect}
    >
      <div className="flex items-start gap-4">
        {showLogo ? (
          <CompanyLogo
            className="ring-1 ring-black/[0.04] dark:ring-white/[0.05] shrink-0"
            size={48}
            ticker={dealing.ticker || ""}
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e8e0d5] font-mono text-xs font-semibold text-muted dark:bg-surface-secondary">
            {tickerLabel.slice(0, 3)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 truncate text-[18px] font-semibold leading-tight tracking-[-0.03em]">
              {dealing.company || "—"}
            </h3>
            {dealing.rating && (
              <RatingBadge
                className="shrink-0 !h-[20px] !w-auto !rounded-sm !px-2 !py-0 !text-[10px] !leading-none"
                rating={dealing.rating}
              />
            )}
          </div>
          <div className="mt-1 truncate text-[12px] text-muted">
            {insiderBits}
          </div>
          <div className="mt-3 text-[22px] font-semibold tabular-nums leading-none tracking-[-0.04em]">
            {valueLabel}
          </div>
        </div>
      </div>
      {dealing.summary && (
        <p className="mt-4 line-clamp-2 text-[13px] leading-relaxed text-foreground/55 dark:text-foreground/60 md:line-clamp-3">
          {dealing.summary}
        </p>
      )}
    </button>
  );
}

function SkippedCard<W>({
  dealing,
  selected,
  onSelect,
  fmt,
  formatTickerDisplay,
}: {
  dealing: MarketDealing<W>;
  selected: boolean;
  onSelect: () => void;
  fmt: PriceFormat;
  formatTickerDisplay?: (ticker: string) => string;
}) {
  const tickerLabel = formatTickerDisplay
    ? formatTickerDisplay(dealing.ticker || "—")
    : dealing.ticker || "—";
  const valueLabel =
    dealing.value != null ? fmt.formatValue(dealing.value) : "—";

  return (
    <button
      className={`group p-3 text-left transition-colors ${
        selected
          ? "bg-[#6b5038]/[0.06] dark:bg-[#6b5038]/[0.20]"
          : "bg-[#faf7f2] hover:bg-[#f1ebe2] dark:bg-surface dark:hover:bg-surface-secondary"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-baseline gap-1">
          <span className="truncate font-mono text-[10px] font-semibold text-muted/70">
            {tickerLabel}
          </span>
          <ArrowUpRightIcon
            aria-hidden
            className="h-3 w-3 shrink-0 self-center text-muted/50 transition-colors group-hover:text-foreground/70"
          />
        </span>
        <span className="shrink-0 text-[13px] font-semibold tabular-nums">
          {valueLabel}
        </span>
      </div>
      <div className="mt-1.5 truncate text-[13px] font-medium leading-tight tracking-[-0.02em]">
        {dealing.company || "—"}
      </div>
      <div className="mt-0.5 truncate text-[11px] text-muted">
        {dealing.insiderName}
      </div>
    </button>
  );
}

function MarketStatusCard({
  session,
  holidaySource,
  alone,
}: {
  session: MarketSession;
  holidaySource: HolidaySource;
  alone?: boolean;
}) {
  const holidays = useExchangeHolidays(holidaySource);
  const now = useTickingNow(60_000);
  const status = marketStatus(session, now, holidays);
  const view = describeStatus(status, session);
  const isLive = status.kind === "open";

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden p-3 transition-colors ${
        isLive
          ? "bg-[#2E7D32]/[0.06] dark:bg-[#2E7D32]/[0.15]"
          : "bg-[#faf7f2] dark:bg-surface"
      } ${alone ? "col-span-full" : ""}`}
    >
      {/* Soft breathing wash so live cards feel alive without being noisy. */}
      {isLive && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-today-live-wash bg-[radial-gradient(circle_at_top_left,rgba(46,125,50,0.18),transparent_70%)]"
        />
      )}
      <div className="relative flex items-center gap-2">
        {isLive ? (
          <span aria-hidden className="relative inline-flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2E7D32] opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2E7D32]" />
          </span>
        ) : (
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${view.dotClass}`}
          />
        )}
        <span
          className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
            isLive ? "text-[#2E7D32] dark:text-[#7BBE7F]" : "text-muted"
          }`}
        >
          {view.eyebrow}
        </span>
      </div>
      <div className="relative mt-1.5 text-[13px] font-medium leading-tight tracking-[-0.02em]">
        {view.headline}
      </div>
      {view.sub && (
        <div className="relative mt-0.5 truncate text-[11px] text-muted">
          {view.sub}
        </div>
      )}
    </div>
  );
}

function describeStatus(
  status: MarketStatus,
  session: MarketSession,
): {
  eyebrow: string;
  headline: string;
  sub: string | null;
  dotClass: string;
} {
  if (status.kind === "open") {
    return {
      eyebrow: "Live",
      headline: "Scanning the market for deals",
      sub: status.earlyCloseToday
        ? `Early close at ${formatCloseTime(session.halfDayCloseMinute ?? session.closeMinute)} (${status.earlyCloseToday})`
        : `Closes at ${formatCloseTime(session.closeMinute)}`,
      dotClass: "bg-[#2E7D32]",
    };
  }
  if (status.kind === "preOpen") {
    return {
      eyebrow: "Pre-open",
      headline: `Market opens in ${formatCountdown(status.opensInMs)}`,
      sub: `Opens at ${formatCloseTime(session.openMinute)}`,
      dotClass: "bg-amber-400",
    };
  }
  const reopens =
    status.reopens.kind === "tomorrow"
      ? "Reopens tomorrow"
      : `Reopens ${status.reopens.day}`;

  if (status.reason.kind === "holiday") {
    return {
      eyebrow: "Closed",
      headline: `Closed for ${status.reason.name}`,
      sub: reopens,
      dotClass: "bg-foreground/30",
    };
  }
  if (status.reason.kind === "weekend") {
    return {
      eyebrow: "Closed",
      headline: "Markets closed for the weekend",
      sub: reopens,
      dotClass: "bg-foreground/30",
    };
  }

  return {
    eyebrow: "Closed",
    headline: "The market has closed",
    sub: reopens,
    dotClass: "bg-foreground/30",
  };
}

/** Returns `new Date()` and re-renders every `intervalMs`. Used to keep the
 *  market-status card honest as the session ticks over. */
function useTickingNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);

    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

function TodayCardSkeleton() {
  return (
    <div className="rounded-xl border border-black/[0.08] bg-[#faf7f2] p-5 dark:border-white/[0.08] dark:bg-surface">
      <div className="flex items-start gap-4">
        <Skeleton circle h={48} w={48} />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
          <Skeleton className="h-6 w-28 rounded" />
        </div>
      </div>
      <div className="mt-4 space-y-1.5">
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-5/6 rounded" />
      </div>
    </div>
  );
}

/** Stagger delays for the Today hero cascade — header first, then cards. */
function todayHeroDelay(index: number, extraMs = 0): string {
  return `${50 + index * 75 + extraMs}ms`;
}

/** Split into a big "Today" anchor and a smaller all-caps date meta so the
 *  masthead can stack cleanly on narrow viewports. */
function formatToday(
  iso: string,
  locale = "en-GB",
): { title: string; meta: string } {
  const d = new Date(`${iso}T12:00:00`);

  if (Number.isNaN(d.getTime())) return { title: "Today", meta: "" };
  const weekday = d.toLocaleDateString(locale, { weekday: "long" });
  const day = d.toLocaleDateString(locale, { day: "numeric" });
  const month = d.toLocaleDateString(locale, { month: "long" });
  const year = d.toLocaleDateString(locale, { year: "numeric" });

  return { title: "Today", meta: `${weekday} · ${day} ${month} ${year}` };
}
